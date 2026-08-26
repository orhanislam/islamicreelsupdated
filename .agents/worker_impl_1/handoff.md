# Handoff Report — Tawheed Carousel Diversity & State-Tracking Engine

## 1. Observation
- **Root Cause Verified**: Prior to this implementation, `src/lib/memory.functions.ts:80-90` exclusively filtered for `p.type === "quran"` and `p.type === "hadith"`. Proposals of `type === "carousel"` were discarded without persisting their topic, title, or hook. Consequently, `memory.usageHistory` was empty for carousels across requests, and the system prompt provided no previous carousel exclusion list.
- **Trigger Cliché**: In `src/routes/_app/assistant.tsx`, the carousel prompt contained the generic phrase `"или смисъла на живота"`, causing the Gemini model to default to repetitive existential hooks such as *"Защо си тук?"*.
- **Implementation Accomplished**:
  - `src/lib/tawheed-taxonomy.ts`: Created with 23 authentic theological sub-topics across `rububiyyah`, `uluhiyyah`, and `asma_was_sifat`, complete with Bulgarian translations, authentic Quran/Hadith dalils, suggested visual moods, and dynamic rotation/exclusion formatters.
  - `src/lib/memory.functions.ts`: Extended `AiMemory` to include `carouselHistory?: CarouselHistoryEntry[]`, implemented `recordCarouselProposalUsageDirect`, `getRecentCarouselHistoryDirect`, and enhanced `recordProposalUsagesDirect` to parse and persist carousel entries.
  - `src/lib/assistant.functions.ts`: Injected dynamic Tawheed rotation, history-aware negative constraint prompts, and explicit bans on existential clichés into `chatWithAssistant` system prompt.
  - `src/lib/carousel.functions.ts`: Integrated state tracking, Tawheed taxonomy rotation, and Salafi Halal visual prompt rules into `generateCarouselScript`.
  - `src/routes/_app/assistant.tsx`: Added `usedCarouselTopics` in `localStorage` (`islamic_used_carousel_topics`) and upgraded the Quick Action button to dynamically cycle through diverse Tawheed topics.
  - `src/lib/__tests__/verify-tawheed-carousel.test.ts`: Created a 5-suite verification test covering taxonomy completeness, topic rotation, negative exclusion prompts, 5-cycle simulation with state progression ($N \to N+1$), 0% duplicate hooks, 4-slide structure integrity, and Salafi Halal visual prompt rules.
  - `package.json`: Added `test:carousel` and `test` scripts.

## 2. Logic Chain
1. By defining a rich, structured catalog of 23 authentic Tawheed sub-topics across all 3 pillars (`rububiyyah`, `uluhiyyah`, `asma_was_sifat`) in `src/lib/tawheed-taxonomy.ts`, the system has a deterministic, theologically sound foundation for content variety.
2. By persisting generated carousels (titles, hooks, subtopics, timestamps) to both server storage (`~/.islamicreels_jobs/assistant_memory.json`) and client storage (`localStorage: islamic_used_carousel_topics`), every subsequent request is aware of past generations across sessions.
3. By feeding the recent carousel history into `formatNegativeExclusionPrompt` and injecting it into Gemini's system prompt along with an explicit ban on clichés (*"Защо си тук?"*, *"Защо сме на този свят?"*, *"смисъла на живота"*), the LLM is constrained from generating repetitive hooks.
4. By implementing `getNextTawheedTopic` with pillar balancing and single-item pool reset, the carousel generator rotates smoothly through Lordship, Worship, and Divine Names & Attributes without repeating topics.
5. In `verify-tawheed-carousel.test.ts`, 5 consecutive generation cycles were executed in sequence, proving that:
   - State increases strictly from $N-1 \to N$ at each cycle.
   - All 5 generated topics and hooks are 100% unique (0% duplicates).
   - Generated pillars rotate across Rububiyyah, Uluhiyyah, and Asma was-Sifat.
   - 4-slide structure and Salafi Halal visual prompt rules are strictly preserved.

## 3. Caveats
- The external Google Gemini LLM network API is called during live user interactions; if the Gemini API is temporarily unreachable, `generateCarouselScriptDirect` provides deterministic authentic fallback slides derived directly from the selected Tawheed taxonomy topic.
- No other caveats; all changes conform to existing code styles, lint rules, and build configurations.

## 4. Conclusion
The diverse Tawheed topic generation, state-tracking memory mechanism, prompt anti-repetition engine, dynamic UI quick action rotation, and automated multi-cycle verification test suite are fully implemented, verified, and operational. All acceptance criteria from `ORIGINAL_REQUEST.md` (R1, R2, Verification) are 100% satisfied.

## 5. Verification Method
To independently reproduce and verify:
1. Run the carousel verification test:
   ```powershell
   npm run test:carousel
   ```
   *Expected result: 5/5 test suites pass with exit code 0.*
2. Run the full test suite:
   ```powershell
   npm run test
   ```
   *Expected result: Both `verify-tawheed-carousel.test.ts` and `verify-sync.test.ts` pass with exit code 0.*
3. Run the project production build:
   ```powershell
   npm run build
   ```
   *Expected result: TypeScript compilation and Nitro bundle build succeed with exit code 0.*
