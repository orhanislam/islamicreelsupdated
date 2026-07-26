# Technical Investigation Report & Implementation Plan

## 1. Observation

### File & Codebase Analysis

#### A. Quick Action Buttons Location & Styling
- **File**: `src/routes/_app/assistant.tsx`
- **Lines 635–667**: Quick action toolbar:
  ```tsx
  <div className="mb-3 sm:mb-4 flex items-center gap-2 overflow-x-auto pb-1.5 max-w-full">
    <span className="text-xs font-semibold text-muted-foreground mr-1 shrink-0">⚡ Бързи TikTok идеи:</span>
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        setPrompt("Направи кратко вирусна TikTok видео идея за Хадис № 1 на Навауи (намеренията)");
      }}
      className="rounded-full text-xs cursor-pointer shrink-0"
    >
      🌟 Хадис за намеренията (TikTok 9:16)
    </Button>
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        setPrompt("Направи TikTok видео за Сура Ал-Ихляс (112:1-4) със спокоен фон");
      }}
      className="rounded-full text-xs cursor-pointer shrink-0"
    >
      🕋 Сура Ал-Ихляс
    </Button>
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        setPrompt("Направи TikTok видео за Аят Алкарси (Сура 2 аят 255)");
      }}
      className="rounded-full text-xs cursor-pointer shrink-0"
    >
      📖 Аят ал-Курси
    </Button>
  </div>
  ```
- **Lines 540–633**: Banner cards for AI suggestions:
  - **Viral AI Generator**: lines 540–564 (`🔥 Вайръл Тема` button calling `handleViralSuggest`). Styled with `rounded-2xl border border-red-500/30 bg-gradient-to-r from-red-500/10 via-orange-500/5 to-transparent`.
  - **Batch Series Luxury Card**: lines 566–607 (`🚀 Генерирай Серия от X Видеа` button calling `handleStartBatchSeries(batchCount)`). Styled with `rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10...`.
  - **Batch Plan Toolbar**: lines 609–633 (`📋 План за X идеи` buttons calling `handleBatchSuggest(num)`). Styled with `border border-teal-500/30 bg-teal-500/15...`.
- **Glassmorphism Utility Classes** (`src/styles.css` lines 135–142):
  ```css
  .glass {
    @apply bg-background/60 backdrop-blur-xl border border-border/60 shadow-xl;
  }
  .glass-card {
    @apply bg-card/60 backdrop-blur-md border border-border/60 shadow-lg;
  }
  ```

#### B. Quran Generation Flow & Prompt Construction
1. **Triggering User Actions**:
   - Quick toolbar buttons call `setPrompt(...)` to fill input state `prompt`.
   - User submits form via `handleSend(e)` (`src/routes/_app/assistant.tsx` lines 210–253).
   - Alternatively, clicking `🔥 Вайръл Тема` calls `handleViralSuggest` -> `suggestViralProposal` server function.
   - Alternatively, clicking `📋 План за X идеи` calls `handleBatchSuggest` -> `startBackgroundPlanGeneration` -> `suggestBatchViralProposals` server function.
2. **Server Execution (`src/lib/assistant.functions.ts`)**:
   - `chatWithAssistant` (lines 31–151):
     - Loads AI memory via `getAiMemory()`.
     - Builds `historyContext` from `memory.usageHistory` formatted as: `СКОРОШНО ИЗПОЛЗВАНИ ТЕМИ (СТРИКТНО ЗАБРАНЕНО Е ДА ГИ ПРЕДЛАГАШ ОТНОВО):\n- quran:2:255\n- hadith:bukhari:6424...`.
     - Constructs system prompt for Gemini `gemini-2.5-flash` with strict rules:
       `DO NOT RECOMMEND COMMON TEXTS... Всяко предложение трябва да съдържа "surah", "ayah", "count", "type": "quran"...`.
     - Calls `geminiChat("gemini-2.5-flash", msgs, true)`.
     - Parses JSON proposal object.
     - Calls `recordProposalUsages({ data: { proposals } })` (`src/lib/memory.functions.ts` lines 67–99), which writes identifier `quran:{surah}:{ayah}` to `usageHistory` in `~/.islamicreels_jobs/assistant_memory.json`.
3. **Render Execution**:
   - Clicking "✨ Одобри и генерирай видеото" calls `confirmAndGenerateVideo({ data: { proposal } })`.
   - `confirmAndGenerateVideo` validates Quran surah/ayah, fetches Arabic text/audio via `fetchAyah` (`src/lib/quran.functions.ts`), translates via `translateToBulgarian`, fetches video background via Pexels, and queues background render via `startServerRenderJob`.

---

## 2. Logic Chain

1. **Quick Action Buttons Mechanics**:
   - In `assistant.tsx`, quick action buttons currently set a static prompt string into input state `prompt` (e.g. `setPrompt("Направи TikTok видео за Сура Ал-Ихляс (112:1-4)...")`).
   - When the user clicks the button, the input updates, but clicking it multiple times or clicking general Quran quick action buttons repeatedly generates the exact same static reference unless dynamic tracking and exclusion logic is applied.

2. **Exclusion Tracking Across Consecutive Clicks**:
   - Server-side memory (`AiMemory.usageHistory` in `memory.functions.ts`) already supports recording `quran:surah:ayah` and `hadith:collection:number`.
   - However, front-end quick action buttons currently don't filter against a dynamic pool of unpicked Quran verses or Hadiths on consecutive clicks.
   - **Logic Chain for Consecutive Click Exclusion**:
     - Maintain an expanded preset pool of 20+ viral Quran verses (`VIRAL_QURAN_PRESETS`) and 20+ viral Sahih Hadiths (`VIRAL_HADITH_PRESETS`).
     - On client side (`assistant.tsx`), load `usedQuranVerses` and `usedHadiths` from `localStorage` (`islamic_used_quran_verses`, `islamic_used_hadiths`) merged with server `memory.usageHistory`.
     - When the Quran button or Hadith button is clicked consecutively:
       1. Exclude all previously recorded/used identifiers (`quran:surah:ayah` or `hadith:collection:number`).
       2. Pick the next unpicked item from the pool (or trigger Gemini prompt with explicit exclusions).
       3. Update local state and `localStorage`.
       4. Call `recordProposalUsages` to persist to server memory.
       5. Provide immediate feedback via UI toast / prompt update.

3. **Viral Hadith Button Addition**:
   - The user requested a new **"Вирални Хадиси" (Viral Hadith)** quick action button placed **immediately adjacent** to the Quran button in the toolbar.
   - Utilizing identical glassmorphism styling (`rounded-full text-xs cursor-pointer shrink-0 glass hover:bg-primary/10` or `<Button variant="outline" size="sm">`), it will trigger a viral Hadith generation prompt or cycle through unused Sahih Hadiths.

---

## 3. Caveats

- **Read-Only Scope**: This report provides explicit file analysis and implementation specs; source files were not modified during investigation.
- **Server Storage Location**: Memory `usageHistory` is persisted in `~/.islamicreels_jobs/assistant_memory.json` on the server and mirrored in `localStorage` in browser sessions.

---

## 4. Conclusion & Concrete Implementation Plan

### Recommended File Changes

#### File 1: `src/routes/_app/assistant.tsx`

1. **Add Presets & State for Dynamic Quick Actions**:
   Define `VIRAL_QURAN_PRESETS` and `VIRAL_HADITH_PRESETS` in component/module scope:
   ```typescript
   export const VIRAL_QURAN_PRESETS = [
     { surah: 112, ayah: 1, count: 4, title: "Сура Ал-Ихляс (112:1-4)", prompt: "Направи TikTok видео за Сура Ал-Ихляс (112:1-4) със спокоен кинематографичен фон" },
     { surah: 2, ayah: 255, count: 1, title: "Аят ал-Курси (2:255)", prompt: "Направи TikTok видео за Аят Алкарси (Сура 2 аят 255) с нощно небе и звезди" },
     { surah: 94, ayah: 5, count: 2, title: "Сура Аш-Шарх (94:5-6)", prompt: "Направи TikTok видео за Сура Аш-Шарх (94:5-6) - С всяка трудност идва облекчение" },
     { surah: 103, ayah: 1, count: 3, title: "Сура Ал-Аср (103:1-3)", prompt: "Направи TikTok видео за Сура Ал-Аср (103:1-3) за времето и спасението" },
     { surah: 113, ayah: 1, count: 5, title: "Сура Ал-Фаляк (113:1-5)", prompt: "Направи TikTok видео за Сура Ал-Фаляк (113:1-5) за защита при изгрев слънце" },
     { surah: 114, ayah: 1, count: 6, title: "Сура Ан-Нас (114:1-6)", prompt: "Направи TikTok видео за Сура Ан-Нас (114:1-6) за духовно спокойствие" },
     { surah: 108, ayah: 1, count: 3, title: "Сура Ал-Каусар (108:1-3)", prompt: "Направи TikTok видео за Сура Ал-Каусар (108:1-3) за райското изобилие" },
     { surah: 67, ayah: 1, count: 3, title: "Сура Ал-Мулк (67:1-3)", prompt: "Направи TikTok видео за Сура Ал-Мулк (67:1-3) за величието на сътворението" },
     { surah: 55, ayah: 13, count: 1, title: "Сура Ар-Рахман (55:13)", prompt: "Направи TikTok видео за Сура Ар-Рахман (55:13) - Кое от благата на вашия Господ ще излъжете?" },
     { surah: 39, ayah: 53, count: 1, title: "Сура Аз-Зумар (39:53)", prompt: "Направи TikTok видео за Сура Аз-Зумар (39:53) - Не губете надежда в милостта на Аллах" }
   ];

   export const VIRAL_HADITH_PRESETS = [
     { collection: "nawawi40", number: 1, title: "Хадис № 1 на Навауи (Намеренията)", prompt: "Направи вирално TikTok видео за Хадис № 1 на Навауи (Делата се ценят според намеренията)" },
     { collection: "bukhari", number: 6424, title: "Сахих ал-Бухари #6424 (Изпитанията)", prompt: "Направи вирално TikTok видео за Сахих ал-Бухари #6424 за скритата милост в изпитанията" },
     { collection: "nawawi40", number: 5, title: "Хадис № 5 на Навауи (Чистота на вярата)", prompt: "Направи вирално TikTok видео за Хадис № 5 на Навауи за искреността в религията" },
     { collection: "muslim", number: 2564, title: "Сахих Муслим #2564 (Добротата)", prompt: "Направи вирално TikTok видео за Сахих Муслим #2564 за силата на благородните обръщения" },
     { collection: "tirmidhi", number: 1987, title: "Сунан Ат-Тирмизи #1987 (Търпението)", prompt: "Направи вирално TikTok видео за Сахих Хадис от Тирмизи за вътрешния мир и сабр" },
     { collection: "nawawi40", number: 13, title: "Хадис № 13 на Навауи (Братска обич)", prompt: "Направи вирално TikTok видео за Хадис № 13 на Навауи - Никога не си истински вярващ, докато не пожелаеш за брата си това, което желаеш за себе си" }
   ];
   ```

2. **Add Handler Functions for Consecutive Click Exclusion**:
   ```typescript
   const [usedQuranKeys, setUsedQuranKeys] = useState<string[]>(() => {
     if (typeof window !== "undefined" && window.localStorage) {
       try {
         return JSON.parse(window.localStorage.getItem("islamic_used_quran_keys") || "[]");
       } catch { return []; }
     }
     return [];
   });

   const [usedHadithKeys, setUsedHadithKeys] = useState<string[]>(() => {
     if (typeof window !== "undefined" && window.localStorage) {
       try {
         return JSON.parse(window.localStorage.getItem("islamic_used_hadith_keys") || "[]");
       } catch { return []; }
     }
     return [];
   });

   const handleNextQuranQuickAction = () => {
     const unpicked = VIRAL_QURAN_PRESETS.filter(p => !usedQuranKeys.includes(`quran:${p.surah}:${p.ayah}`));
     const pool = unpicked.length > 0 ? unpicked : VIRAL_QURAN_PRESETS;
     const selected = pool[Math.floor(Math.random() * pool.length)];
     const key = `quran:${selected.surah}:${selected.ayah}`;
     
     const updated = [...usedQuranKeys.filter(k => k !== key), key];
     setUsedQuranKeys(updated);
     if (typeof window !== "undefined" && window.localStorage) {
       window.localStorage.setItem("islamic_used_quran_keys", JSON.stringify(updated));
     }
     setPrompt(selected.prompt);
     toast.message(`🕋 Избран нов аят: ${selected.title}`);
   };

   const handleNextHadithQuickAction = () => {
     const unpicked = VIRAL_HADITH_PRESETS.filter(p => !usedHadithKeys.includes(`hadith:${p.collection}:${p.number}`));
     const pool = unpicked.length > 0 ? unpicked : VIRAL_HADITH_PRESETS;
     const selected = pool[Math.floor(Math.random() * pool.length)];
     const key = `hadith:${selected.collection}:${selected.number}`;
     
     const updated = [...usedHadithKeys.filter(k => k !== key), key];
     setUsedHadithKeys(updated);
     if (typeof window !== "undefined" && window.localStorage) {
       window.localStorage.setItem("islamic_used_hadith_keys", JSON.stringify(updated));
     }
     setPrompt(selected.prompt);
     toast.message(`📜 Избран нов хадис: ${selected.title}`);
   };
   ```

3. **Update UI Toolbar in `src/routes/_app/assistant.tsx` (Lines 635–667)**:
   Replace static quick action buttons with glassmorphism-styled quick action buttons:
   ```tsx
   <div className="mb-3 sm:mb-4 flex items-center gap-2 overflow-x-auto pb-1.5 max-w-full">
     <span className="text-xs font-semibold text-muted-foreground mr-1 shrink-0">⚡ Бързи идеи:</span>
     
     {/* Existing Quran Quick Action Button (Enhanced with Consecutive Exclusion) */}
     <Button
       variant="outline"
       size="sm"
       onClick={handleNextQuranQuickAction}
       className="rounded-full text-xs cursor-pointer shrink-0 glass hover:bg-primary/10 border-primary/40 text-foreground transition flex items-center gap-1.5 shadow-sm"
       title="Генерирай нов неповторен аят от Корана"
     >
       <BookOpen className="size-3.5 text-primary" />
       <span>🕋 Вирален Коран</span>
     </Button>

     {/* NEW: "Вирални Хадиси" Quick Action Button (Immediately Adjacent) */}
     <Button
       variant="outline"
       size="sm"
       onClick={handleNextHadithQuickAction}
       className="rounded-full text-xs cursor-pointer shrink-0 glass hover:bg-amber-500/10 border-amber-500/40 text-foreground transition flex items-center gap-1.5 shadow-sm"
       title="Генерирай нов неповторен Сахих Хадис"
     >
       <ScrollText className="size-3.5 text-amber-400" />
       <span>📜 Вирални Хадиси</span>
     </Button>

     {/* Presets & Shortcuts */}
     <Button
       variant="outline"
       size="sm"
       onClick={() => setPrompt("Направи TikTok видео за Сура Ал-Ихляс (112:1-4) със спокоен фон")}
       className="rounded-full text-xs cursor-pointer shrink-0 glass hover:bg-muted/80"
     >
       ✨ Сура Ал-Ихляс
     </Button>
     <Button
       variant="outline"
       size="sm"
       onClick={() => setPrompt("Направи TikTok видео за Аят Алкарси (Сура 2 аят 255)")}
       className="rounded-full text-xs cursor-pointer shrink-0 glass hover:bg-muted/80"
     >
       📖 Аят ал-Курси
     </Button>
   </div>
   ```

---

## 5. Verification Method

To verify the implementation independently once applied:

1. **UI Layout Inspection**:
   - Open `http://localhost:3000/assistant` in a browser.
   - Verify that the new button **"📜 Вирални Хадиси"** is rendered immediately adjacent to **"🕋 Вирален Коран"** in the quick action toolbar.
   - Confirm both buttons use identical glassmorphism design styling (`glass` backdrop-blur, rounded-full pill shape, subtle colored borders).

2. **Consecutive Click Exclusion Verification**:
   - Click **"🕋 Вирален Коран"** 5 times in succession.
   - Verify that each click updates the prompt input with a DIFFERENT, unrepeated Quran verse (e.g. 112:1-4 -> 2:255 -> 94:5-6 -> 103:1-3 -> 113:1-5).
   - Check `localStorage.getItem("islamic_used_quran_keys")` in DevTools to confirm keys are stored and updated.
   - Click **"📜 Вирални Хадиси"** 5 times in succession and verify that each click loads a different, unrepeated Hadith topic.

3. **Backend Memory & Gemini Verification**:
   - Submit a prompt generated by the quick action button.
   - Inspect network logs / server console to confirm `recordProposalUsages` is called and `assistant_memory.json` updates with the new identifier under `usageHistory`.
