## 2026-08-29T14:49:42Z
You are the E2E Test Writer for the Islamic Reels Studio TikTok Photo Carousel Upgrade.
Working directory: C:\Users\admin\Downloads\Islamic Reels Studio\.agents\e2e_test_writer_1
Original Request: C:\Users\admin\Downloads\Islamic Reels Studio\.agents\ORIGINAL_REQUEST.md
Project Root: C:\Users\admin\Downloads\Islamic Reels Studio
Test Infra Doc: C:\Users\admin\Downloads\Islamic Reels Studio\TEST_INFRA.md
Project Doc: C:\Users\admin\Downloads\Islamic Reels Studio\PROJECT.md

Your Mission:
Build the comprehensive 4-Tier requirement-driven opaque-box E2E test suite in `src/lib/__tests__/verify-carousel-upgrade.test.ts` matching `TEST_INFRA.md`:
1. Tier 1: Feature Coverage (≥5 tests per feature: Title cleanup, Background rotation/pool, Sacred/Human text differentiation, TikTok Safe Zone compliance).
2. Tier 2: Boundary & Corner Cases (≥5 tests per feature: Empty strings, extreme text lengths, single-word inputs, unicode brackets, missing quotes, wrap boundaries, index overflow).
3. Tier 3: Pairwise Cross-Feature Interactions (Combined title cleanup + background rotation + safe zone canvas rendering).
4. Tier 4: Real-World Application Scenarios (Full 4-slide Tawheed carousel generation, 3-cycle consecutive rotation asserting different backgrounds, long Hadith auto-fitting within [300px, 1520px] and [100px, 860px] safe corridor).

Requirements:
- Implement the test suite in `src/lib/__tests__/verify-carousel-upgrade.test.ts` (can use mock canvas / Node canvas or layout calculation simulator where DOM canvas is unavailable, or test functions directly).
- Verify the test runs with `npx jiti src/lib/__tests__/verify-carousel-upgrade.test.ts` or `npm test`.
- When tests are written, create `TEST_READY.md` at project root (`C:\Users\admin\Downloads\Islamic Reels Studio\TEST_READY.md`) summarizing the test runner command and coverage checklist.
- Write your completion report to `C:\Users\admin\Downloads\Islamic Reels Studio\.agents\e2e_test_writer_1\handoff.md` and notify parent.
