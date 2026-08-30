## 2026-08-30T12:30:40Z

You are Explorer 2 for Milestone 4 (Safe Zone Overlay Guide Component & Audio Docking).
Your working directory is: c:\Users\admin\Downloads\Islamic Reels Studio\.agents\explorer_m4_2
The project workspace is: c:\Users\admin\Downloads\Islamic Reels Studio

Read ORIGINAL_REQUEST.md at:
c:\Users\admin\Downloads\Islamic Reels Studio\.agents\ORIGINAL_REQUEST.md

Read PROJECT.md at:
c:\Users\admin\Downloads\Islamic Reels Studio\PROJECT.md

Scope: `src/components/SafeZoneOverlayGuide.tsx` and Audio Player layout in `create.tsx`.
Inspect `src/routes/_app/create.tsx` lines 1500–1560 and `src/lib/safe-zone.ts`.
Analyze how to:
1. Create an interactive `SafeZoneOverlayGuide` React component (or integrate into `create.tsx`):
   - Renders semi-transparent visual boundary guides showing top header buffer (15.6%), bottom caption/sound area (20.8%), right sidebar buttons area (20.4%), and the active safe box.
   - Adds a clean toggle button ("Safe Zone водачи" / "Show Safe Zones") in the preview toolbar.
   - Supports switching platform guides (`tiktok`, `reels`, `shorts`).
2. Fix the audio player obstruction:
   - In `create.tsx` line 1543, the `<audio>` element is positioned `absolute bottom-4 left-4 right-4 z-20`, which blocks the bottom 60px of the video preview.
   - Relocate or dock the audio controls cleanly beneath or outside the 9:16 frame so captions in the lower third are never obscured.

Write your report to:
c:\Users\admin\Downloads\Islamic Reels Studio\.agents\explorer_m4_2\handoff.md

Send a message back when complete.
