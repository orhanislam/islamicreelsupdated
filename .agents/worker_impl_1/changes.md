# Changes Report — worker_impl_1

## Objective
Implement diverse Tawheed topic generation, state-tracking memory mechanism, prompt anti-repetition engine, dynamic UI quick action rotation, and automated multi-cycle verification test suite.

---

## 1. Files Modified and Created

### A. `src/lib/tawheed-taxonomy.ts` (Created)
- **Role**: Authentic Tawheed domain taxonomy and rotation engine.
- **Pillars Defined**:
  - `rububiyyah`: Tawheed Ar-Rububiyyah (Oneness of Lordship & Creation).
  - `uluhiyyah`: Tawheed Al-Uluhiyyah / Al-Ibadah (Oneness of Worship).
  - `asma_was_sifat`: Tawheed Al-Asma was-Sifat (Oneness of Names and Attributes).
- **Sub-Topics Catalog (23 authentic topics)**:
  - *Rububiyyah*: `qadr` (Divine Decree), `rizq` (Provision from Ar-Razzaq), `khalq` (Grandeur of Creation), `tadbeer` (Divine Providence), `mulk` (Absolute Sovereignty), `naf_darr` (Sole Source of Harm/Benefit).
  - *Uluhiyyah*: `ikhlas` (Sincerity & Riya avoidance), `tawakkul` (Reliance on Allah), `khawf_raja` (Fear & Hope balance), `mahabbah` (Transcendent Love), `dua` (Direct Supplication without Intermediaries), `tawbah` (Repentance), `shukr` (Gratitude), `anti_shirk` (Rejecting Amulets & Superstition), `sabr` (Patience for Allah's Sake).
  - *Asma was-Sifat*: `hayy_qayyum`, `rahman_rahim`, `sami_basir`, `hakim_alim`, `wadud`, `jabbar_aziz`, `qarib_mujib`, `ghaffar_tawwab`.
- **Exported Utilities**:
  - `getTawheedTaxonomy()`: Returns full 23-topic catalog.
  - `getNextTawheedTopic(recentTopicIds)`: Dynamic non-repeating picker with pillar balancing (`rububiyyah` -> `uluhiyyah` -> `asma_was_sifat`) and single-item pool reset.
  - `formatNegativeExclusionPrompt(recentEntries)`: Formats strict exclusion ban list and bans existential clichés ("Защо си тук?", "Защо сме на този свят?", "Какъв е смисълът на живота?").

### B. `src/lib/memory.functions.ts` (Modified)
- **Data Structures**:
  - Added `CarouselHistoryEntry` interface (`id`, `type: "carousel"`, `pillar`, `subtopicId`, `title`, `hook`, `premise`, `timestamp`).
  - Extended `AiMemory` with `carouselHistory?: CarouselHistoryEntry[]`.
  - Extended `UsageHistoryEntry` with `type: "quran" | "hadith" | "carousel"`.
- **Persistence & Operations**:
  - Implemented pure async core functions: `readAiMemory()`, `writeAiMemory()`, `recordCarouselProposalUsageDirect()`, `getRecentCarouselHistoryDirect()`, `recordProposalUsagesDirect()`.
  - Exported matching TanStack Start server functions (`createServerFn`): `getAiMemory`, `updateAiMemory`, `recordCarouselProposalUsage`, `getRecentCarouselHistory`, `recordProposalUsages`.
  - Added auto-pruning in `writeAiMemory` (keeps entries within 30 days and latest 100 entries).
  - Updated `recordProposalUsages` to detect proposals where `p.type === "carousel"`, extract Slide 1 hook and title, match with `TAWHEED_TAXONOMY`, and persist to `assistant_memory.json`.

### C. `src/lib/assistant.functions.ts` (Modified)
- **Integration**:
  - Imported `getNextTawheedTopic`, `formatNegativeExclusionPrompt`, `getTawheedTaxonomy` from `tawheed-taxonomy`.
  - In `chatWithAssistant`:
    - Loaded `memory.carouselHistory` (last 15 entries).
    - Injected `formatNegativeExclusionPrompt` into system prompt.
    - Added mandatory fresh Tawheed sub-topic rotation and dalil guidance.
    - Banned repetitive existential clichés in Slide 1 ("Защо си тук?", "Защо сме на този свят?", "смисъла на живота").
    - Enforced Salafi Halal visual prompt rules: `imagePrompt` across all slides strictly avoids human faces, figures, people, men, women, or animals.

### D. `src/lib/carousel.functions.ts` (Modified)
- **Enhancement**:
  - Updated `generateCarouselScript` and added `generateCarouselScriptDirect`.
  - Reads recent carousel history from `assistant_memory.json` to prevent repeats.
  - Dynamically rotates Tawheed topics and applies negative constraints.
  - Validates and returns 4-slide structure with photorealistic Halal landscape visual prompts.
  - Automatically records generated script into memory state via `recordCarouselProposalUsageDirect`.

### E. `src/routes/_app/assistant.tsx` (Modified)
- **Client State**:
  - Added `usedCarouselTopics: string[]` state backed by browser `localStorage` (`islamic_used_carousel_topics`).
  - Added `handleNextCarouselQuickAction`:
    - Dynamically selects next Tawheed topic via `getNextTawheedTopic(usedCarouselTopics)`.
    - Updates `usedCarouselTopics` in React state and `localStorage`.
    - Shows toast with chosen topic name.
    - Sends targeted Tawheed carousel prompt with negative constraints to `chatWithAssistant`.
  - Updated the "ГЕНЕРАТОР НА TIKTOK КАРУСЕЛИ" Quick Action button to trigger `handleNextCarouselQuickAction`.

### F. `src/lib/__tests__/verify-tawheed-carousel.test.ts` (Created)
- **Automated Verification Suite (5 Test Suites)**:
  1. `testTaxonomyCompleteness`: Asserts $\ge 20$ topics across all 3 authentic pillars.
  2. `testTopicRotationAndPillarBalancing`: Asserts consecutive selection rotates pillars and never immediately repeats.
  3. `testNegativeExclusionPrompt`: Asserts exclusion formatting and explicit bans on existential clichés.
  4. `testMultiCycleCarouselGeneration`: Simulates 5 consecutive cycles with real state progression ($N \to N+1$), 0% duplicate hooks, full pillar rotation, 4-slide structure validation, and Salafi Halal visual prompt compliance.
  5. `testMemoryHelpers`: Verifies direct memory persistence and history retrieval.

### G. `package.json` (Modified)
- Added scripts:
  - `"test:carousel": "jiti src/lib/__tests__/verify-tawheed-carousel.test.ts"`
  - `"test": "jiti src/lib/__tests__/verify-tawheed-carousel.test.ts && jiti src/lib/__tests__/verify-sync.test.ts"`

---

## 2. Verification Results

| Command | Status | Details |
|---|---|---|
| `npm run test:carousel` | **PASSED** (0) | All 5 test suites passed (23 topics, 5 consecutive cycles, 0% duplicate hooks, $N \to N+1$ state updates). |
| `npm run test` | **PASSED** (0) | Ran both `verify-tawheed-carousel.test.ts` and `verify-sync.test.ts` successfully. |
| `npx eslint ...` | **PASSED** (0) | 0 lint errors or warnings on all modified files. |
| `npm run build` | **PASSED** (0) | Vite/Nitro build succeeded cleanly with 0 TypeScript compilation errors in 2.94s. |
