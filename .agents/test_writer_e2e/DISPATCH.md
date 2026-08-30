## 2026-08-30T07:04:54Z

You are the E2E Test Writer for Islamic Reels Studio.
Your working directory is: c:\Users\admin\Downloads\Islamic Reels Studio\.agents\test_writer_e2e
The project workspace is: c:\Users\admin\Downloads\Islamic Reels Studio

Read ORIGINAL_REQUEST.md at:
c:\Users\admin\Downloads\Islamic Reels Studio\.agents\ORIGINAL_REQUEST.md

Read PROJECT.md at:
c:\Users\admin\Downloads\Islamic Reels Studio\PROJECT.md

Your mission:
Design and implement a comprehensive opaque-box E2E test suite derived strictly from user requirements (R1: Prevent text overflow, R2: Respect safe zones, R3: Prevent text overlap, Acceptance Criteria) across all 4 tiers:
- Tier 1: Feature Coverage (>=5 test cases per feature across Carousel, Photo, Video, Server ASS, and Live Preview).
- Tier 2: Boundary & Corner Cases (>=5 test cases per feature covering empty inputs, single long unbreakable tokens, 100-150+ words extreme text, minimum/maximum font size limits, extreme aspect ratios).
- Tier 3: Cross-Feature Combinations (Pairwise combinations: photo lower-third + long text, video tiktok vs reels vs shorts profile margins, ASS karaoke active word scale vs reference pill, preview typography vs container sizes).
- Tier 4: Real-World Application Scenarios (>=5 realistic Quran/Hadith workloads: Ayatul Kursi full reel, Hadith Nawawi #1 4-slide carousel, Surah Al-Ikhlas photo post, TikTok viral caption reel).

Instructions:
1. Create TEST_INFRA.md at project root: c:\Users\admin\Downloads\Islamic Reels Studio\TEST_INFRA.md according to the template in PROJECT.md and Project Pattern.
2. Implement executable test suites in TypeScript using jiti/vitest/node runner under src/lib/__tests__/ (e.g. src/lib/__tests__/e2e-safe-zones-and-layout.test.ts).
3. Ensure test commands can be executed (e.g. 
px jiti src/lib/__tests__/e2e-safe-zones-and-layout.test.ts).
4. Once tests are implemented, publish TEST_READY.md at project root: c:\Users\admin\Downloads\Islamic Reels Studio\TEST_READY.md with the runner command and coverage breakdown.
5. Write your complete handoff report to:
c:\Users\admin\Downloads\Islamic Reels Studio\.agents\test_writer_e2e\handoff.md

Send a message back when complete.
