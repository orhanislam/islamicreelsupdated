## 2026-08-30T07:52:45Z
You are Explorer 1 for Milestone 3 (Client Video Renderer Hardening).
Your working directory is: c:\Users\admin\Downloads\Islamic Reels Studio\.agents\explorer_m3_1
The project workspace is: c:\Users\admin\Downloads\Islamic Reels Studio

Read ORIGINAL_REQUEST.md at:
c:\Users\admin\Downloads\Islamic Reels Studio\.agents\ORIGINAL_REQUEST.md

Read PROJECT.md at:
c:\Users\admin\Downloads\Islamic Reels Studio\PROJECT.md

Scope: `src/lib/render-video.ts` hardening.
Inspect `src/lib/render-video.ts` and `src/lib/safe-zone.ts`.
Analyze how `render-video.ts` must be modified to:
1. Import `getSafeZone`, `scaleSafeZone`, `REFERENCE_PILL_STANDARDS`, `getSubtitleAnchorY`, and `isWithinSafeZone` from `./safe-zone.ts`.
2. Replace local symmetric `SAFE` with `getSafeZone(opts.subtitlePosition || 'tiktok')` (and scaled for 720p resolution).
3. Move `drawReferencePill` from Y=280 to `sz.SAFE_TOP` (300px scaled) with proper safe padding and bounds.
4. Wire `opts.subtitlePosition` (`tiktok`, `reels`, `shorts`, `center`) into canvas phrase positioning:
   - Center subtitle lines at `sz.CENTER_X` (480px for TikTok at 1080p, 320px at 720p) with max width `sz.W_SAFE` (760px at 1080p).
   - Use `getSubtitleAnchorY` for `targetBottomY` (clamped so active words with 1.14 scale pop never cross `sz.BOTTOM_MAX_Y = 1520px` on 1080p / 1013px on 720p).
5. Ensure word wrapping and line widths strictly respect W_safe.

Write your report to:
c:\Users\admin\Downloads\Islamic Reels Studio\.agents\explorer_m3_1\handoff.md

Send a message back when complete.
