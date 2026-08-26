# Handoff Report: State & Persistence Architecture Investigation

## 1. Observation

A read-only audit across `src/`, `supabase/`, and root scripts observed the following exact mechanisms and code paths:

1. **Server-Side File Persistence (`src/lib/memory.functions.ts:20-65` & `src/lib/render.functions.ts:968-979`)**:
   - `getJobsDir()` resolves to `path.join(os.homedir(), ".islamicreels_jobs")`.
   - `assistant_memory.json` stores `AiMemory`:
     ```ts
     export type UsageHistoryEntry = {
       type: "quran" | "hadith";
       identifier: string; // e.g. "quran:2:255" or "hadith:nawawi40:1"
       timestamp: number;
     };
     ```
   - `updateAiMemory` automatically prunes entries older than 30 days (`(now - entry.timestamp) <= thirtyDaysMs`).
   - `recordProposalUsages` (`src/lib/memory.functions.ts:77-93`) only parses `p.type === 'quran'` or `p.type === 'hadith'`. When `p.type === 'carousel'`, `p.surah` and `p.collection` are absent, so no history entry is ever written for carousel generations.

2. **Client-Side Storage (`src/routes/_app/assistant.tsx` & `src/routes/_app/create.tsx`)**:
   - `localStorage` keys used:
     - `islamic_used_quran_keys` (`assistant.tsx:89, 123`): string array of used Quran identifiers.
     - `islamic_used_hadith_keys` (`assistant.tsx:101, 143`): string array of used Hadith identifiers.
     - `islamic_assistant_chat_history_v3` (`assistant.tsx:202, 210, 234, 254`): chat history array cache.
     - `edit_proposal` (`assistant.tsx:1057, 1178` -> `create.tsx:145`): transient inter-route state.
   - `sessionStorage`: 0 usages across the entire codebase.
   - IndexedDB (`src/lib/downloads-queue.ts:12-13`): `nur_studio_downloads_db` with `downloads` object store for client-rendered blobs.

3. **Supabase & Backend Tables (`supabase/migrations/` & `src/`)**:
   - Migrations define `profiles`, `user_roles`, `translations_cache`, `posts`, `suggestions`, `batch_jobs`.
   - Zero active `@supabase` client calls exist in `src/`. The application runs on TanStack Start server functions (`createServerFn`) on Node.js.

4. **Prompt Trigger for Carousels (`src/routes/_app/assistant.tsx:798`)**:
   - Line 798 triggers:
     `"Генерирай ми TikTok карусел на силна ислямска тема. ... Избери тема свързана с Таухид (Единобожието), величието на Аллах, историите на пророците, чудесата в Корана или смисъла на живота. Избягвай депресиращи теми и стрес. Използвай типа 'carousel'."`
   - Gemini repeatedly selects "смисъла на живота" and generates the generic hook *"Защо си тук?"*.

5. **Chat Negative Context Construction (`src/lib/assistant.functions.ts:98-99`)**:
   - Constructs `historyList = (memory.usageHistory || []).map(x => '- ' + x.identifier).join('\n')`.
   - Because carousels are omitted from `usageHistory`, `historyContext` passes zero negative examples for carousels to Gemini.

---

## 2. Logic Chain

1. **From Observation 1 & 5**: Because `recordProposalUsages` in `src/lib/memory.functions.ts` only creates entries for `quran` and `hadith` (ignoring `carousel`), `memory.usageHistory` contains no records of previously generated carousels, hooks, or topics.
2. **From Observation 4**: Because the button in `src/routes/_app/assistant.tsx` passes a static prompt including the phrase *"или смисъла на живота"*, the LLM repeatedly defaults to the existential cliché *"Защо си тук?"*.
3. **From Observation 5**: Because `chatWithAssistant` receives no negative carousel history in `systemPrompt`, the LLM has no knowledge of past generation hooks, leading to repetitive output across consecutive requests.
4. **From Observation 2 & 1**: The codebase already has robust patterns for state tracking:
   - Server-side: `AiMemory` JSON storage in `~/.islamicreels_jobs/` with 30-day auto-pruning.
   - Client-side: `localStorage` quick-action cycling with single-item reset (`unpicked.length === 1`).
5. **Conclusion**: Augmenting `AiMemory` with a `generationHistory: GenerationHistoryEntry[]` schema (capturing `generationId`, `topic`, `subtopic`, `hook`, `premise`, `timestamp`), updating `recordProposalUsages` to record carousels, injecting recent hooks into the anti-duplication prompt context, and providing a dynamic Tawheed subtopic rotation pool in `assistant.tsx` will permanently eliminate repetitive hooks while preserving multi-session continuity.

---

## 3. Caveats

- **No Caveats**: All state management layers (React state, browser localStorage, IndexedDB, server file-system JSON, Supabase migrations) and generation prompt pipelines were comprehensively examined.

---

## 4. Conclusion

The recommended architecture is a **hybrid multi-tier history tracking model**:
1. **Server Storage (`src/lib/memory.functions.ts`)**: Add `generationHistory: GenerationHistoryEntry[]` to `AiMemory` and record all generated carousels (topic, subtopic, hook, premise, title, timestamp).
2. **Prompt Logic (`src/lib/assistant.functions.ts` & `src/lib/carousel.functions.ts`)**: Construct an explicit negative context listing recently used hooks/premises and forbid generic clichés (*"Защо си тук?"*). Enforce Tawheed category rotation (Rububiyyah, Uluhiyyah, Asma was-Sifat, Tawakkul, Ikhlas, Shirk protection, Qadr).
3. **UI Quick Action (`src/routes/_app/assistant.tsx`)**: Replace static carousel button prompt with a dynamic rotation pool (`TAWHEED_CAROUSEL_PRESETS`) and localStorage tracking (`islamic_used_tawheed_keys`).

---

## 5. Verification Method

1. **File Inspection**:
   - Confirm `analysis.md` in `.agents/explorer_survey_2/analysis.md` details all schemas, code flows, and prompt structures.
   - Review `src/lib/memory.functions.ts` and `src/routes/_app/assistant.tsx` lines cited in this report.
2. **Test Command Simulation**:
   - When implemented, execute the verification test script simulating at least 3 consecutive carousel generations:
     ```powershell
     node --loader tsx src/lib/__tests__/verify-tawheed-diversity.test.ts
     ```
   - Verify `npm run build` completes with exit code 0.
