## 2026-07-26T09:14:54Z
You are Worker 2 for Islamic Reels Studio.
Your assigned working directory: C:\Users\admin\Downloads\Islamic Reels Studio\.agents\teamwork_preview_worker_m2_1
Project root directory: C:\Users\admin\Downloads\Islamic Reels Studio

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

OBJECTIVE:
Implement Milestone 2 (Performance, Logic, Caching & Server Safety) as specified in `PROJECT.md`, then run `npm run build` to verify compilation.

SPECIFIC IMPLEMENTATION REQUIREMENTS:
1. `src/lib/render-video.ts`:
   - Move `highlightKeywords` RegExp definition outside `drawFrame` to top-level/file-scope so it isn't instantiated 30 times per second.
   - Cache static linear/radial gradient instances where dimensions don't change, or reuse cached gradient helpers to avoid per-frame GC pressure in `drawFrame`.
   - Fix iOS timer cancellation bug around line 1015-1024: if `rafId` was created via `window.setTimeout`, cancel it using `clearTimeout(rafId)` rather than `cancelAnimationFrame(rafId)`.
   - Ensure preloaded video Blob URLs (`videoSrc = URL.createObjectURL(b)`) are properly revoked with `URL.revokeObjectURL(videoSrc)` in `detachCanvas()` / cleanup blocks.
2. `src/routes/_app/downloads.tsx`:
   - Fix inline `URL.createObjectURL(item.blob)` memory leak in JSX video rendering by managing preview object URLs via `useEffect` with cleanup `URL.revokeObjectURL(url)`.
3. `src/lib/sunnah.functions.ts`:
   - Add in-memory caching (`const HADITH_COLLECTION_CACHE = new Map<string, any>()`) for Hadith JSON collection fetches from `cdn.jsdelivr.net`. Return cached data on subsequent requests for the same collection to eliminate 20-30MB network payloads.
4. `src/lib/render.functions.ts` & `src/lib/tasks-engine.ts`:
   - Implement safe atomic JSON file writes for `jobs.json` and `background_tasks.json`: Write JSON string to a `.tmp` file first, then `await fs.rename(tmpPath, targetPath)` to guarantee atomic updates and prevent JSON corruption during concurrent operations.
5. `src/lib/render.functions.ts`:
   - Fix `aggressivelyCleanServerDisk` (lines 849-868). Ensure file deletion is scoped strictly to app-specific temp file prefixes (`reel_`, `render_`, `audio_`, `frame_`, `bg_`, `export_`) and enforces a minimum age threshold (e.g. `age > 30 * 60 * 1000`) so active FFmpeg rendering temp files in OS `/tmp` are never wiped prematurely.
6. `src/lib/pexels.functions.ts`:
   - In `getHalalVideos` / candidate video checking: replace sequential `for` loop image downloads and Gemini Vision API checks with parallel execution using `Promise.all` to reduce request latency.

VERIFICATION:
After making the code changes, run `npm run build` in the project root. Ensure the build completes cleanly with exit code 0.
Document your changes and build output in `C:\Users\admin\Downloads\Islamic Reels Studio\.agents\teamwork_preview_worker_m2_1\changes.md` and `handoff.md`.
Send a completion message back to the orchestrator when finished.
