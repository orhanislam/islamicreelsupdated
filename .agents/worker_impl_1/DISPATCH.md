# DISPATCH — 2026-08-26T19:41:26Z

## 2026-08-26T19:41:26Z
Read the authoritative user request at C:\Users\admin\Downloads\Islamic Reels Studio\.agents\ORIGINAL_REQUEST.md.
Also read C:\Users\admin\Downloads\Islamic Reels Studio\PROJECT.md, C:\Users\admin\Downloads\Islamic Reels Studio\TEST_INFRA.md, and the explorer survey analyses at:
- C:\Users\admin\Downloads\Islamic Reels Studio\.agents\explorer_survey_1\analysis.md
- C:\Users\admin\Downloads\Islamic Reels Studio\.agents\explorer_survey_2\analysis.md
- C:\Users\admin\Downloads\Islamic Reels Studio\.agents\explorer_survey_3\analysis.md

Your working directory is C:\Users\admin\Downloads\Islamic Reels Studio\.agents\worker_impl_1.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your task is to implement the complete diverse Tawheed topic generation, state-tracking memory mechanism, prompt anti-repetition engine, and automated multi-cycle verification test:

1. Create `src/lib/tawheed-taxonomy.ts`:
   - Define the 3 authentic Tawheed pillars: `rububiyyah`, `uluhiyyah`, and `asma_was_sifat`.
   - Implement at least 20+ rich sub-topics across these pillars (e.g. Qadr/Divine Decree, Rizq/Sustenance, Grandeur of Creation, Providence/Tadbeer, Mulk/Sovereignty, Benefit & Harm, Sincerity/Ikhlas, Reliance/Tawakkul, Fear & Hope/Khawf & Raja, Love of Allah/Mahabbah, Du'a without intermediaries, Repentance/Tawbah, Gratitude/Shukr, Avoiding Shirk & Amulets, Sabr, Al-Hayy & Al-Qayyum, Ar-Rahman & Ar-Rahim, As-Sami' & Al-Basir, Al-Hakim & Al-Alim, Al-Wadud, Al-Jabbar & Al-Aziz, Al-Qarib & Al-Mujib, Al-Ghaffar & At-Tawwab).
   - Each topic must include: `id`, `pillar`, `titleBg`, `titleAr`, `summaryBg`, `hookAngleBg`, `dalilReference`, `dalilTextBg`, `suggestedVisualMood`.
   - Export helper functions: `getTawheedTaxonomy()`, `getNextTawheedTopic(recentTopicIds: string[])`, `formatNegativeExclusionPrompt(recentEntries: Array<{ topic?: string; hook?: string; title?: string }>)`.

2. Update `src/lib/memory.functions.ts`:
   - Expand `AiMemory` interface to include `carouselHistory?: CarouselHistoryEntry[]`.
   - Define `CarouselHistoryEntry` (id, type: "carousel", pillar, subtopicId, title, hook, premise, timestamp).
   - Update `recordProposalUsages` and add `recordCarouselProposalUsage` so that when a proposal with `type === "carousel"` is processed, its hook (Slide 1 mainText), title (topTitle), subtopic/pillar, and timestamp are persisted to `assistant_memory.json` (server) and returned for client tracking.
   - Implement `getRecentCarouselHistory(limit?: number)` to retrieve the most recent carousel generations.

3. Update `src/lib/assistant.functions.ts`, `src/lib/carousel.functions.ts`, and `src/routes/_app/assistant.tsx`:
   - In `assistant.functions.ts` (`chatWithAssistant` & prompt builders), read recent carousel history from memory and select the next rotated Tawheed topic if none explicitly chosen. Inject an explicit negative constraint prompt listing recently used carousel hooks and topics, and ban repetitive existential clichés ("Защо си тук?", "Защо сме на този свят?", "смисъла на живота").
   - In `carousel.functions.ts` (`generateCarouselScript`), integrate with the Tawheed taxonomy and memory history tracking.
   - In `src/routes/_app/assistant.tsx`, update state management and localStorage sync (`islamic_used_carousel_topics` / `usedCarouselHistory`) and update the Quick Action button to dynamically cycle through diverse Tawheed topics instead of a static generic string.

4. Create `src/lib/__tests__/verify-tawheed-carousel.test.ts` and update `package.json`:
   - Build a comprehensive simulation test that executes >= 3 consecutive carousel generations.
   - Assert:
     a) State progression: `carouselHistory` size increases by 1 on each generation (N -> N+1).
     b) Distinct Tawheed topics: Consecutive generations select distinct pillars and sub-topics.
     c) 0% duplicate hooks: Every generated hook is strictly unique.
     d) 4-slide structure integrity: Valid topTitle, mainText, authentic Quran/Hadith dalil, and CTA/Du'a.
     e) Salafi Halal visual prompt rules: `imagePrompt` strictly avoids human faces, figures, and animals.
   - Add `"test:carousel": "jiti src/lib/__tests__/verify-tawheed-carousel.test.ts"` and `"test": "jiti src/lib/__tests__/verify-tawheed-carousel.test.ts && jiti src/lib/__tests__/verify-sync.test.ts"` to `package.json`.
   - Run `npm run test:carousel` (or `./node_modules/.bin/jiti src/lib/__tests__/verify-tawheed-carousel.test.ts`) and `npm run build` to verify that all tests pass and the build succeeds.
