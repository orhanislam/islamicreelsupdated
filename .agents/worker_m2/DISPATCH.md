## 2026-08-30T07:23:42Z
You are the Worker for Milestone 2 (Single Photo & Viral Thumbnail Hardening).
Your working directory is: c:\Users\admin\Downloads\Islamic Reels Studio\.agents\worker_m2
The project workspace is: c:\Users\admin\Downloads\Islamic Reels Studio

Read ORIGINAL_REQUEST.md at:
c:\Users\admin\Downloads\Islamic Reels Studio\.agents\ORIGINAL_REQUEST.md

Read PROJECT.md at:
c:\Users\admin\Downloads\Islamic Reels Studio\PROJECT.md

Read Milestone 2 Explorer handoff reports at:
- c:\Users\admin\Downloads\Islamic Reels Studio\.agents\explorer_m2_1\handoff.md
- c:\Users\admin\Downloads\Islamic Reels Studio\.agents\explorer_m2_2\handoff.md
- c:\Users\admin\Downloads\Islamic Reels Studio\.agents\explorer_m2_3\handoff.md

Your exclusive write ownership for this milestone:
- `src/lib/render-photo.ts`
- `src/lib/thumbnail.functions.ts`
- `src/lib/__tests__/verify-photo-hardening.test.ts`

Task Instructions:
1. Implement the hardened `src/lib/render-photo.ts`:
   - Import `getSafeZone`, `REFERENCE_PILL_STANDARDS`, `clampToSafeZone`, `isWithinSafeZone`, and `doBoxesCollide` from `./safe-zone.ts`.
   - Replace static `SAFE` with dynamic safe zone resolution: `const sz = getSafeZone(opts.subtitlePosition || 'tiktok')`.
   - Draw text centered at `sz.CENTER_X` (480px for TikTok) with max width `sz.W_SAFE` (760px), strictly bounded in [100, 860]px.
   - Position Reference Pill at `sz.SAFE_TOP` (300px) with height 56px (Y in [300, 356]px) and anchor Arabic verse at Y = 380px (300 + 56 + 24px gap) with zero overlap.
   - Remove `Math.max(420, verticalForBg)` and implement dynamic decremental auto-fit scaling down to 24px within the true remaining vertical budget, eliminating text overflow.
   - Refactor `lower-third` and `centered` styles with dynamic vertical budgeting and guaranteed >= 32px separation between Arabic and Bulgarian text blocks.
2. Implement the hardened `src/lib/thumbnail.functions.ts`:
   - Import `TIKTOK_SAFE_ZONE` from `./safe-zone.ts`.
   - Center SVG text lines at `x="${TIKTOK_SAFE_ZONE.CENTER_X}"` (480px) with `text-anchor="middle"`, bounded by max line width 760px (X in [100, 860]px).
   - Implement dynamic font scaling (`fitThumbnailTitle`) from 76px down to 54px-60px for long titles so SVG text never encroaches into TikTok's right button corridor (X > 860px).
   - Export helper functions (`escapeXml`, `estimateTitleWidth`, `wrapTitleText`, `fitThumbnailTitle`, `buildViralThumbnailSvg`) for direct unit testability.
3. Implement `src/lib/__tests__/verify-photo-hardening.test.ts` containing all 5 test suites from `explorer_m2_3`'s report (Safe Zone containment, zero overlap, dynamic auto-fit down to 24px, thumbnail SVG containment, 1,000-iteration random fuzzing).
4. Run all verification and regression tests:
   - `npx jiti src/lib/__tests__/verify-photo-hardening.test.ts`
   - `npx jiti src/lib/__tests__/verify-safe-zone.test.ts`
   - `npx jiti src/lib/__tests__/e2e-safe-zones-and-layout.test.ts`
   - `npm test`
   - `npx eslint src/lib/render-photo.ts src/lib/thumbnail.functions.ts src/lib/__tests__/verify-photo-hardening.test.ts`
5. Ensure 100% tests pass with exit code 0.
6. Write your complete handoff report to:
   c:\Users\admin\Downloads\Islamic Reels Studio\.agents\worker_m2\handoff.md
