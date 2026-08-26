# Detailed State & Persistence Architecture Analysis

## 1. Executive Summary

This report delivers an in-depth audit of the state management, local/browser storage, server persistence, and database layers in **Islamic Reels Studio**. It outlines the root causes of repetitive AI carousel generations (such as the persistent *"Защо си тук?"* hook) and provides a concrete architectural design for session-spanning generation history tracking, dynamic Tawheed taxonomy rotation, and anti-duplication prompt integration.

---

## 2. Current State & Persistence Mechanisms in the Codebase

Our audit of `src/`, `supabase/`, and root scripts revealed how state and persistence are currently distributed across client and server:

### A. Client-Side React State & Component Lifecycle
- **`src/routes/_app/assistant.tsx`**:
  - `messages: ChatMsg[]`: Holds the active chat stream, updated when user or AI posts messages.
  - `usedQuranKeys: string[]` / `usedHadithKeys: string[]`: In-memory state tracking preset keys already served by quick-action buttons.
  - `memory: AiMemory | null`: React state fetched via `getAiMemory()`.
  - `activeTasks: BackgroundTaskRecord[]`: Polled every 3,000ms via `checkActiveBackgroundTasks()`.
- **`src/routes/_app/create.tsx`**:
  - Manages studio canvas state (captions, background video, TTS audio, subtitle positioning, B-Roll intervals).
- **`src/routes/_app/downloads.tsx`**:
  - Manages list of completed downloads and rendering jobs.

### B. Browser `localStorage`
| Key | Location | Purpose | Behavior & Cycling |
|---|---|---|---|
| `islamic_used_quran_keys` | `src/routes/_app/assistant.tsx:89, 123` | Tracks clicked Quran quick-action presets | Cycles through `VIRAL_QURAN_PRESETS`. When `unpicked.length === 1`, resets to prevent consecutive repeats while allowing infinite cycling. |
| `islamic_used_hadith_keys` | `src/routes/_app/assistant.tsx:101, 143` | Tracks clicked Hadith quick-action presets | Cycles through `VIRAL_HADITH_PRESETS` with the same single-item reset logic. |
| `islamic_assistant_chat_history_v3` | `src/routes/_app/assistant.tsx:202, 210, 234, 254` | Client-side cache of chat messages | Synchronized bi-directionally with server file `assistant_chat_history.json`. |
| `edit_proposal` | `src/routes/_app/assistant.tsx:1057, 1178` & `src/routes/_app/create.tsx:145` | Inter-route payload transfer | Written in `assistant.tsx` when clicking "Редактирай в студиото", read and removed (`removeItem`) on mount in `create.tsx`. |

### C. Browser `sessionStorage`
- **Current usage**: **None** (0 occurrences in `src/`).

### D. Browser `IndexedDB`
- **`src/lib/downloads-queue.ts`**:
  - Database: `nur_studio_downloads_db`, object store: `downloads`.
  - Stores `DownloadItem` records (`id`, `title`, `blob`, `ext`, `mimeType`, `createdAt`) for rendered video blobs in the browser.

### E. Server-Side File-System Persistence (`~/.islamicreels_jobs/`)
The application executes full-stack server functions via TanStack Start (`createServerFn`). Server-side state is stored in `path.join(os.homedir(), ".islamicreels_jobs")` (resolved by `getJobsDir()` in `src/lib/render.functions.ts:968`):

1. **`assistant_memory.json`** (`src/lib/memory.functions.ts:22`):
   - Stores `AiMemory`:
     ```ts
     export type UsageHistoryEntry = {
       type: "quran" | "hadith";
       identifier: string; // e.g. "quran:2:255" or "hadith:nawawi40:1"
       timestamp: number;
     };

     export type AiMemory = {
       userName?: string;
       preferredStyle?: "hormozi" | "emerald" | "neon" | "classic";
       customInstructions: string[];
       learnedFacts: string[];
       usageHistory?: UsageHistoryEntry[];
     };
     ```
   - Auto-pruning: `updateAiMemory` automatically removes entries older than 30 days.
2. **`assistant_chat_history.json`** (`src/lib/assistant.functions.ts:716`):
   - Stores the complete assistant message history.
3. **`background_tasks.json`** (`src/lib/tasks-engine.ts:20`):
   - Stores `BackgroundTaskRecord[]` using an asynchronous promise lock (`withTasksLock`) and temporary `.tmp` atomic file renaming.
4. **`jobs.json`** (`src/lib/render.functions.ts:1003`):
   - Stores server video render queue records (`ServerJobRecord[]`).

### F. Backend / Supabase Layer Status
- Supabase migrations exist under `supabase/migrations/` defining tables (`profiles`, `user_roles`, `translations_cache`, `posts`, `suggestions`, `batch_jobs`).
- **Key Finding**: The active application code in `src/` does **not** call Supabase directly. All data flow, AI operations, and state persistence operate through TanStack Start server functions (`createServerFn`), local file storage in `~/.islamicreels_jobs/`, and direct API clients for Gemini (`src/lib/gemini.ts`), ElevenLabs (`src/lib/tts.functions.ts`), and Pexels (`src/lib/pexels.functions.ts`).

---

## 3. Why Duplicate Carousel Topics Occur (Root Cause Analysis)

### Defect 1: `recordProposalUsages` Ignores Carousel Proposals
In `src/lib/memory.functions.ts:67-99`:
```ts
export const recordProposalUsages = createServerFn({ method: "POST" })
  .validator((input: { proposals: Array<any> }) => input)
  .handler(async ({ data: { proposals } }): Promise<void> => {
    ...
    for (const p of proposals) {
      if (!p) continue;
      let identifier = "";
      if (p.type === "quran" && p.surah && p.ayah) {
        identifier = `quran:${p.surah}:${p.ayah}`;
      } else if (p.type === "hadith" && p.collection && p.number) {
        identifier = `hadith:${p.collection}:${p.number}`;
      }
      if (identifier) { ... }
    }
  });
```
When `p.type === 'carousel'`, `p.surah` and `p.collection` are often not set or secondary. **No carousel identifier, topic, subtopic, hook, or premise is ever saved to `usageHistory`!**

### Defect 2: Prompt Trigger in `assistant.tsx` Contains Trigger Cliché
In `src/routes/_app/assistant.tsx:798`:
```ts
const carouselPrompt = "Генерирай ми TikTok карусел на силна ислямска тема. ... Избери тема свързана с Таухид (Единобожието), величието на Аллах, историите на пророците, чудесата в Корана или смисъла на живота. Избягвай депресиращи теми и стрес. Използвай типа 'carousel'.";
```
The keyword phrase *"или смисъла на живота"* (or the meaning of life) directly causes Gemini to fall back to the generic existential hook *"Защо си тук? / Защо си на този свят?"* ("Why are you here?").

### Defect 3: Negative Context in `chatWithAssistant` Only Checks Quran/Hadith Keys
In `src/lib/assistant.functions.ts:98-99`:
```ts
const historyList = (memory.usageHistory || []).map(x => `- ${x.identifier}`).join("\n");
const historyContext = historyList ? `\n\nСКОРОШНО ИЗПОЛЗВАНИ ТЕМИ (СТРИКТНО ЗАБРАНЕНО Е ДА ГИ ПРЕДЛАГАШ ОТНОВО):\n${historyList}` : "";
```
Because carousel hooks and topics are never stored in `usageHistory`, `historyContext` contains zero negative examples for carousels, allowing Gemini to repeatedly generate identical hooks across sessions.

---

## 4. Best Architecture for Generation History Tracking

To guarantee variety across sessions, devices, and requests, we design a **Hybrid Multi-Tier History Tracking Architecture**:

```
┌────────────────────────────────────────────────────────┐
│               Client Tier (React / Browser)            │
│  - localStorage: "islamic_used_tawheed_subtopics"      │
│  - Dynamic quick action cycle with single-item reset   │
│  - Optimistic UI updates                               │
└─────────────────────────┬──────────────────────────────┘
                          │ createServerFn (IPC)
┌─────────────────────────▼──────────────────────────────┐
│           Server Memory Tier (TanStack Start)          │
│  - ~/.islamicreels_jobs/assistant_memory.json           │
│  - GenerationHistoryEntry[] (with 30-day auto-pruning) │
│  - Atomic mutex write-lock (withJobsLock / tmp rename) │
└─────────────────────────┬──────────────────────────────┘
                          │ Injected into Prompt
┌─────────────────────────▼──────────────────────────────┐
│               AI Pipeline (Gemini 3.6 Flash)           │
│  - Negative Context: Banned hooks & used subtopics     │
│  - Positive Context: Targeted Tawheed sub-dimension    │
│  - Post-gen extraction & auto-recording into memory    │
└────────────────────────────────────────────────────────┘
```

### Data Schema Specification
```ts
export interface GenerationHistoryEntry {
  id: string;                    // e.g. "gen_1724701234_a8f9"
  type: "carousel" | "video" | "quran" | "hadith" | "general";
  category: "tawheed" | "hadith" | "quran" | "general";
  topic: string;                 // e.g. "Таухид (Единобожие)"
  subtopic: string;              // e.g. "Таухид ар-Рубубийя: Вседържителството на Аллах"
  hook: string;                  // e.g. "Кой управлява ударите на сърцето ти, докато спиш?"
  premise: string;               // e.g. "Само Аллах поддържа живота без съдружници и умора"
  title: string;                 // e.g. "[Таухид] Скритият контрол над всяка секунда"
  timestamp: number;             // Date.now()
  scriptureRef?: string;         // e.g. "Коран 67:1-3" or "Сахих Муслим #2699"
  keyPhrases?: string[];         // Normalized key terms for deduplication filtering
}

export type AiMemory = {
  userName?: string;
  preferredStyle?: "hormozi" | "emerald" | "neon" | "classic";
  customInstructions: string[];
  learnedFacts: string[];
  usageHistory?: UsageHistoryEntry[];
  generationHistory?: GenerationHistoryEntry[]; // New field
};
```

---

## 5. Pipeline Integration for Anti-Duplication & Prompt Logic

### Phase 1: Tawheed Taxonomy Subtopic Rotation
A structured Tawheed sub-topic taxonomy ensures that the generator cycles through rich dimensions:

1. **Таухид ар-Рубубийя (Oneness of Lordship & Creation)**:
   - Creation of the universe, continuous sustenance (Rizq), control over life/death, perfection of natural laws, supreme sovereignty.
2. **Таухид ал-Улюхийя / ал-Ибада (Oneness of Worship)**:
   - Pure Du'a, sincere repentance (Tawbah), reliance on Allah alone (Tawakkul), fearing only Allah (Khawf) and placing hope only in Him (Raja), devotion (Inabah).
3. **Таухид ал-Асма вас-Сифат (Names & Attributes)**:
   - Contemplating names like *Al-Qayyum* (The Self-Sustaining), *Al-Mujib* (The Responsive), *Ar-Razzaq* (The Provider), *Al-Wadud* (The Loving), *As-Samad* (The Eternal Refuge), *Al-Latif* (The Subtle).
4. **Очистване от Ширк (Purification from Polytheism & Superstition)**:
   - Avoiding minor shirk (Riya' / showing off in worship), rejecting talismans/superstitions/evil-eye charms in favor of pure Quranic refuge, reliance on the Creator rather than secondary causes.
5. **Таухид при изпитания и Предопределение (Qadr & Submission)**:
   - Contentment with Allah's decree (Rida bil-Qada), seeing divine wisdom behind unanswered prayers or delays, serenity in hardship.

### Phase 2: Dynamic Negative Context Construction
When constructing the prompt for `chatWithAssistant` or `generateCarouselScript`, the system reads the last 15 `generationHistory` entries:

```ts
const recentGenerations = (memory.generationHistory || []).slice(-15);
const bannedHooks = recentGenerations.map(g => `- [${g.subtopic || g.topic}] "${g.hook}" (${g.premise})`).join("\n");

const antiDuplicateContext = `
=== СТРИКТНО ЗАБРАНЕНИ ПРЕДИШНИ ТЕМИ И КУКИ (ВЕЧЕ ИЗПОЛЗВАНИ) ===
Следните теми, хукове (hooks) и послания са ВЕЧЕ генерирани наскоро.
СТРИКТНО ЗАБРАНЕНО Е да повтаряш или перифразираш тези идеи:
${bannedHooks}

ИЗРИЧНО ЗАБРАНЕНИ КЛИШИРАНИ ХУКОВЕ:
- "Защо си тук?" / "Замислял ли си се защо съществуваш?" / "Какъв е смисълът на живота?" (КЛИШЕ — ЗАБРАНЕНО!)
- Банални въпроси за смъртта или стреса без конкретен богословски фокус.

=== ИЗБЕРИ КОНКРЕТНА СВЕЖА ПОДТЕМА НА ТАУХИД ===
Задължително избери РАЗЛИЧНА и дълбока подтема на Таухид (напр. Таухид ар-Рубубийя, Таухид ал-Улюхийя, Таухид ал-Асма вас-Сифат, Ихляс или Тауаккул), различна от горните!
`;
```

### Phase 3: Post-Generation Hook Extraction & Recording
When a proposal is received from Gemini:
```ts
if (parsed.proposal && parsed.proposal.type === "carousel") {
  const slides = parsed.proposal.carouselSlides || [];
  const hookSlide = slides[0];
  const hook = hookSlide ? (hookSlide.mainText || hookSlide.topTitle || "") : "";
  const premise = parsed.proposal.summaryBg || (slides[1]?.mainText ?? "");
  const subtopic = parsed.proposal.themeBg || parsed.proposal.title;

  const newEntry: GenerationHistoryEntry = {
    id: `gen_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    type: "carousel",
    category: "tawheed",
    topic: "Таухид",
    subtopic,
    hook,
    premise,
    title: parsed.proposal.title,
    timestamp: Date.now(),
  };

  if (!memory.generationHistory) memory.generationHistory = [];
  memory.generationHistory.push(newEntry);
  await updateAiMemory({ data: { memory } });
}
```

### Phase 4: Local Quick-Action Preset Rotation in `assistant.tsx`
Replace the single hardcoded prompt in `src/routes/_app/assistant.tsx` with a curated dynamic rotation pool of Tawheed subtopic prompts (e.g. `TAWHEED_CAROUSEL_PRESETS` featuring 10+ distinct sub-topics), leveraging the proven `islamic_used_tawheed_keys` pattern to guarantee that consecutive button clicks cycle through distinct sub-topics without repetition.

---

## 6. Inventory of Helpers, Schemas, and Hooks to Leverage or Update

| File | Target Function / Schema | Proposed Update |
|---|---|---|
| `src/lib/memory.functions.ts` | `AiMemory`, `GenerationHistoryEntry` | Add `generationHistory?: GenerationHistoryEntry[]` to type. |
| `src/lib/memory.functions.ts` | `recordProposalUsages`, `recordGenerationEntry` | Enhance to extract carousel topic, subtopic, hook, and premise. Add auto-pruning (30 days / max 50 entries). |
| `src/lib/memory.functions.ts` | `getAiMemory`, `updateAiMemory` | Ensure backwards compatibility for existing `assistant_memory.json`. |
| `src/lib/assistant.functions.ts` | `chatWithAssistant` | Inject `bannedHooks` and `antiDuplicateContext` into system prompt. |
| `src/lib/assistant.functions.ts` | `suggestBatchViralProposals` | Inject Tawheed subtopic taxonomy and negative history context when `targetType === 'carousel'`. |
| `src/lib/carousel.functions.ts` | `PROMPT_SYSTEM`, `generateCarouselScript` | Pass history context and banned hooks to avoid duplicate slides. |
| `src/routes/_app/assistant.tsx` | Carousel Button Handler (lines 793-840) | Remove cliché prompt phrase; integrate `TAWHEED_CAROUSEL_PRESETS` and dynamic subtopic rotation. |
| `src/lib/render.functions.ts` | `withJobsLock`, `getJobsDir` | Reuse file lock mechanism for thread-safe concurrent writes. |

---

## 7. Verification Method

1. **Automated Verification Script**:
   - Create a test script (e.g. `src/lib/__tests__/verify-tawheed-diversity.test.ts` or executable runner) that simulates at least 3 consecutive carousel generation requests.
   - Assert that:
     a) `memory.generationHistory` is sequentially updated with 3 distinct entries.
     b) Each generation produces a distinct Tawheed subtopic (e.g. Rububiyyah vs Uluhiyyah vs Asma was-Sifat).
     c) Hook text similarity across consecutive runs is below 30% (zero identical hooks, strictly avoiding "Защо си тук?").
2. **Build Verification**:
   - Run `npm run build` to confirm zero TypeScript compilation errors.
