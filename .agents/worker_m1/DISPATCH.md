## 2026-08-30T07:07:15Z

You are the Worker for Milestone 1 (M1: Unified Safe Zone Geometry Registry).
Your working directory is: c:\Users\admin\Downloads\Islamic Reels Studio\.agents\worker_m1
The project workspace is: c:\Users\admin\Downloads\Islamic Reels Studio

Read ORIGINAL_REQUEST.md at:
c:\Users\admin\Downloads\Islamic Reels Studio\.agents\ORIGINAL_REQUEST.md

Read PROJECT.md at:
c:\Users\admin\Downloads\Islamic Reels Studio\PROJECT.md

Read M1 Explorer reports at:
- c:\Users\admin\Downloads\Islamic Reels Studio\.agents\explorer_m1_1\handoff.md
- c:\Users\admin\Downloads\Islamic Reels Studio\.agents\explorer_m1_2\handoff.md
- c:\Users\admin\Downloads\Islamic Reels Studio\.agents\explorer_m1_3\handoff.md

Your exclusive write ownership for this milestone:
- `src/lib/safe-zone.ts`
- `src/lib/__tests__/verify-safe-zone.test.ts`
- `src/lib/render-carousel.ts` (import/re-export TIKTOK_SAFE_ZONE from `./safe-zone` to preserve backward compatibility without breaking existing carousel tests)

Task Instructions:
1. Implement `src/lib/safe-zone.ts` with complete types, immutable constants (`TIKTOK_SAFE_ZONE`, `REELS_SAFE_ZONE`, `SHORTS_SAFE_ZONE`, `UNIVERSAL_SAFE_ZONE`, `CENTER_SAFE_ZONE`, `SOCIAL_SAFE_ZONES`, `REFERENCE_PILL_STANDARDS`), and all helper functions:
   - `getSafeZone(platform)`
   - `createSafeZone(options)`
   - `scaleSafeZone(geometry, scale)`
   - `getNormalizedSafeZone(platform)`
   - `isWithinSafeZone(box, platformOrGeometry)`
   - `clampToSafeZone(box, platformOrGeometry)`
   - `doBoxesCollide(boxA, boxB, minGap)`
   - `getASSSubtitlePlacement(platform, style)`
   - `getSubtitleAnchorY(platformOrGeometry, style)`
2. Update `src/lib/render-carousel.ts` to import or re-export `TIKTOK_SAFE_ZONE` from `./safe-zone.ts` cleanly.
3. Implement `src/lib/__tests__/verify-safe-zone.test.ts` containing all 10 unit test suites (50+ assertions) specified in Explorer 3's report.
4. Run the unit tests and verification commands:
   - `npx jiti src/lib/__tests__/verify-safe-zone.test.ts`
   - `npx jiti src/lib/__tests__/verify-carousel-upgrade.test.ts`
   - `npm test`
5. Ensure all tests pass with exit code 0.
6. Write your complete handoff report to:
   c:\Users\admin\Downloads\Islamic Reels Studio\.agents\worker_m1\handoff.md
