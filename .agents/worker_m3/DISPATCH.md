## 2026-08-30T11:56:32Z
You are the Worker for Milestone 3 (Video Rendering Engines Hardening).
Your working directory is: c:\Users\admin\Downloads\Islamic Reels Studio\.agents\worker_m3
The project workspace is: c:\Users\admin\Downloads\Islamic Reels Studio

Read ORIGINAL_REQUEST.md at:
c:\Users\admin\Downloads\Islamic Reels Studio\.agents\ORIGINAL_REQUEST.md

Read PROJECT.md at:
c:\Users\admin\Downloads\Islamic Reels Studio\PROJECT.md

Read Milestone 3 Explorer handoff reports at:
- c:\Users\admin\Downloads\Islamic Reels Studio\.agents\explorer_m3_1\handoff.md
- c:\Users\admin\Downloads\Islamic Reels Studio\.agents\explorer_m3_2\handoff.md
- c:\Users\admin\Downloads\Islamic Reels Studio\.agents\explorer_m3_3\handoff.md

Your exclusive write ownership for this milestone:
- `src/lib/render-video.ts`
- `src/lib/render.functions.ts`
- `src/lib/__tests__/verify-video-hardening.test.ts`

Task Instructions:
1. Implement the hardened `src/lib/render-video.ts`:
   - Import `getSafeZone`, `scaleSafeZone`, `REFERENCE_PILL_STANDARDS`, `getSubtitleAnchorY`, and `isWithinSafeZone` from `./safe-zone.ts`.
   - In `drawReferencePill`: anchor at `sz.SAFE_TOP` ($300\text{px}$ scaled), height $56\text{px}$ scaled, width bounded to `sz.W_SAFE`, centered at `sz.CENTER_X`.
   - Wire `opts.subtitlePosition` (`tiktok`, `reels`, `shorts`, `center`):
     - Center subtitle lines at `sz.CENTER_X` ($480\text{px}$ for TikTok at 1080p, $320\text{px}$ at 720p) with max width `sz.W_SAFE` ($760\text{px}$ at 1080p).
     - Calculate `targetBottomY` using `getSubtitleAnchorY(sz, opts.subtitlePosition)` clamped so active words with 1.14 scale pop never cross `sz.BOTTOM_MAX_Y` ($1520\text{px}$ on 1080p / $1013\text{px}$ on 720p).
     - Ensure line wrapping strictly respects $W_{\text{safe}}$.
2. Implement the hardened `src/lib/render.functions.ts`:
   - Import `getSafeZone`, `getASSSubtitlePlacement`, `getSafeAssStyles`, and `TIKTOK_SAFE_ZONE` from `./safe-zone.ts`.
   - In ASS Script V4+ Styles:
     - Use `getASSSubtitlePlacement(data.subtitlePosition || 'tiktok')` to set dynamic `MarginL`, `MarginR` (`MarginR: 220` for TikTok to clear right sidebar buttons), and `MarginV`.
     - Set Reference style position at `\pos(sz.CENTER_X, sz.SAFE_TOP + 40)` ($X=480, Y=340\text{px}$ for TikTok).
   - Replace naive `wpl` slicing with dynamic text width measurement ($\le 760\text{px}$ line width) to prevent long words from overflowing off the screen.
   - Position subtitle dialogue events using `posTag` derived from `getASSSubtitlePlacement` (`\pos(480, 1420)` for TikTok lower-third, `\pos(540, 960)` for center).
   - For multi-line Ayahs (8-12 lines), cap font size and total height so subtitle block growing upwards never collides with the Reference badge at $Y=340\text{px}$.
3. Implement `src/lib/__tests__/verify-video-hardening.test.ts` containing all 6 test suites from `explorer_m3_3`'s report (client subtitle bounds, active word pop non-overflow, ASS styles & placement across profiles, ASS dynamic width wrapping, reference badge collision avoidance, 1,000 property fuzz iterations).
4. Run all verification and regression tests:
   - `npx jiti src/lib/__tests__/verify-video-hardening.test.ts`
   - `npx jiti src/lib/__tests__/verify-photo-hardening.test.ts`
   - `npx jiti src/lib/__tests__/verify-safe-zone.test.ts`
   - `npx jiti src/lib/__tests__/e2e-safe-zones-and-layout.test.ts`
   - `npm test`
   - `npx eslint src/lib/render-video.ts src/lib/render.functions.ts src/lib/__tests__/verify-video-hardening.test.ts`
5. Ensure 100% tests pass with exit code 0.
6. Write your complete handoff report to:
   c:\Users\admin\Downloads\Islamic Reels Studio\.agents\worker_m3\handoff.md
