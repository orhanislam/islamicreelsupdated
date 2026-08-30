## 2026-08-30T07:52:45Z
You are Explorer 2 for Milestone 3 (Server Video ASS Subtitles Hardening).
Your working directory is: c:\Users\admin\Downloads\Islamic Reels Studio\.agents\explorer_m3_2
The project workspace is: c:\Users\admin\Downloads\Islamic Reels Studio

Read ORIGINAL_REQUEST.md at:
c:\Users\admin\Downloads\Islamic Reels Studio\.agents\ORIGINAL_REQUEST.md

Read PROJECT.md at:
c:\Users\admin\Downloads\Islamic Reels Studio\PROJECT.md

Scope: `src/lib/render.functions.ts` hardening.
Inspect `src/lib/render.functions.ts` and `src/lib/safe-zone.ts`.
Analyze how `render.functions.ts` must be modified to:
1. Import `getSafeZone`, `getASSSubtitlePlacement`, `getSafeAssStyles`, and `TIKTOK_SAFE_ZONE` from `./safe-zone.ts`.
2. In ASS Script V4+ Styles:
   - Use `getASSSubtitlePlacement(data.subtitlePosition || 'tiktok')` to set dynamic `MarginL`, `MarginR` (`MarginR: 220` for TikTok to clear right sidebar buttons), and `MarginV`.
   - Set Reference style position at `\pos(sz.CENTER_X, sz.SAFE_TOP + 40)` ($Y \approx 340\text{px}$).
3. Replace naive `wpl` fixed word-count line slicing with dynamic text width measurement / character estimation ($\le 760\text{px}$ line width) to prevent long words from overflowing off the screen.
4. Position subtitle dialogue events using `posTag` derived from `getASSSubtitlePlacement` (`\pos(480, 1420)` for TikTok lower-third, `\pos(540, 960)` for center).
5. For multi-line Ayahs (8-12 lines), cap font size and total height so subtitle block growing upwards never collides with the Reference badge at $Y=340\text{px}$.

Write your report to:
c:\Users\admin\Downloads\Islamic Reels Studio\.agents\explorer_m3_2\handoff.md

Send a message back when complete.
