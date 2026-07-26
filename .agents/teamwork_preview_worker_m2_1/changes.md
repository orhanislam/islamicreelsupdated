# Changes Document — Milestone 2

## Summary of Modifications

### 1. `src/lib/render-video.ts`
- **File-scope RegExp**: Moved `highlightKeywords` RegExp to file-scope `HIGHLIGHT_KEYWORDS` to prevent repeated RegExp creation 30 times per second during frame rendering.
- **Gradient Caching**: Added `cachedBgGrad`, `cachedOvGrad`, and `cachedVigGrad` lazy-cached helpers in `renderVideo` to reuse `CanvasGradient` instances across frames in `drawFrame`, eliminating per-frame GC pressure.
- **iOS Timer Cancellation Fix**: Fixed bug in `finish()` where `cancelAnimationFrame(rafId)` was called on an iOS timer instantiated via `window.setTimeout`. Changed to `window.clearTimeout(rafId)` when `ios` is true.
- **Object URL Cleanup**: Added `createdObjectUrl` state and `URL.revokeObjectURL(createdObjectUrl)` inside `detachCanvas()` to ensure preloaded video Blob URLs are released upon canvas detachment/cleanup.

### 2. `src/routes/_app/downloads.tsx`
- **Memory Leak Fix**: Created dedicated `VideoPreview` component managing `URL.createObjectURL(blob)` inside a `useEffect` hook with proper cleanup `URL.revokeObjectURL(objectUrl)`. Replaced inline `URL.createObjectURL(item.blob)` inside JSX `<video>` tag.

### 3. `src/lib/sunnah.functions.ts`
- **In-Memory Collection Caching**: Defined top-level `const HADITH_COLLECTION_CACHE = new Map<string, any>()` and `fetchHadithCollectionJson` helper. Hadith collection JSON payloads fetched from `cdn.jsdelivr.net` are cached in memory so subsequent requests return instantly without downloading 20-30MB network payloads.

### 4. `src/lib/render.functions.ts` & `src/lib/tasks-engine.ts`
- **Atomic File Writes**: Updated `saveJobs` in `render.functions.ts` and `saveTasksList` in `tasks-engine.ts` to write JSON content to a temporary file (`.tmp`) first, followed by `await fs.rename(tmpPath, targetPath)`. This guarantees atomic file updates for `jobs.json` and `background_tasks.json`, preventing corruption during concurrent writes.

### 5. `src/lib/render.functions.ts`
- **Server Disk Cleanup Safety**: Fixed `aggressivelyCleanServerDisk`. Removed blanket `/tmp/*` shell removal and updated Node.js temp file cleanup loop to strictly match app-specific prefixes (`reel_`, `render_`, `audio_`, `frame_`, `bg_`, `export_`) with a minimum age threshold of 30 minutes (`30 * 60 * 1000`), protecting active FFmpeg rendering temp files in OS `/tmp`.

### 6. `src/lib/pexels.functions.ts`
- **Parallel Candidate & Frame Checking**: Refactored `checkVideoForHaram` to download sample video frame images concurrently with `Promise.all`. Refactored `getHalalVideos` to evaluate candidate Pexels videos in parallel using `Promise.all`, drastically reducing API request latency.
