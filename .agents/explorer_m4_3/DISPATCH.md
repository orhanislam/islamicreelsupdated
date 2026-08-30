## 2026-08-30T12:30:40Z
<USER_REQUEST>
You are Explorer 3 for Milestone 4 (Title Sanitizer & Preview Hardening Test Strategy).
Your working directory is: c:\Users\admin\Downloads\Islamic Reels Studio\.agents\explorer_m4_3
The project workspace is: c:\Users\admin\Downloads\Islamic Reels Studio

Read ORIGINAL_REQUEST.md at:
c:\Users\admin\Downloads\Islamic Reels Studio\.agents\ORIGINAL_REQUEST.md

Read PROJECT.md at:
c:\Users\admin\Downloads\Islamic Reels Studio\PROJECT.md

Scope: `src/lib/assistant.functions.ts` and Milestone 4 test suite specification.
Inspect `src/lib/assistant.functions.ts` lines 50–80 and `src/lib/__tests__/verify-photo-carousel-upgrade.test.ts`.
Analyze:
1. `cleanProposalTitle` in `assistant.functions.ts`:
   - Identify why `cleanProposalTitle` was stripping scripture reference brackets (`[Коран 2:255]` -> `Коран 2:255`).
   - Fix the regex so it strips only unwanted metadata tags (e.g. `[TikTok Carousel]`, `[Карусел]`, `[Слайд 1]`) while strictly preserving theological scripture brackets (`[Коран 2:255]`, `[Сахих ал-Бухари #6424]`, `(112:1-4)`).
2. Specify the test suites for `src/lib/__tests__/verify-preview-hardening.test.ts`:
   - Test `cleanProposalTitle` preservation of authentic theological brackets.
   - Test SafeZoneOverlayGuide CSS percentage mappings for TikTok, Reels, Shorts.
   - Test responsive preview coordinate alignment (lower-third Y=72-74% vs center Y=50%).
   - Verify `npm run build` succeeds with all React components.

Write your report to:
c:\Users\admin\Downloads\Islamic Reels Studio\.agents\explorer_m4_3\handoff.md

Send a message back when complete.
</USER_REQUEST>
