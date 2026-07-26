# Code Changes Summary - Milestone 2 Hardening

## Overview
Implemented 3 critical concurrency and exception-handling hardening fixes in Islamic Reels Studio to eliminate race conditions, Thundering Herd vulnerabilities, orphan temporary files, and resource leaks.

---

## 1. `src/lib/sunnah.functions.ts`
- **Problem**: Previously, `HADITH_COLLECTION_CACHE` (`Map<string, any>`) only cached fully resolved responses. Concurrent requests for an uncached Hadith collection URL would trigger multiple duplicate network fetches simultaneously (Thundering Herd vulnerability).
- **Fix**: Updated `HADITH_COLLECTION_CACHE` type to `Map<string, Promise<any>>`.
- **Implementation**:
  - `fetchHadithCollectionJson(url)` checks if a promise for the given `url` exists in `HADITH_COLLECTION_CACHE`. If found, it returns the in-flight Promise immediately.
  - If not found, it creates the fetch promise, synchronously sets it into `HADITH_COLLECTION_CACHE` before any `await`, and returns the promise.
  - Added `.catch()` handler on the cached promise so failed requests remove the entry from `HADITH_COLLECTION_CACHE`, allowing subsequent calls to retry.

---

## 2. `src/lib/render.functions.ts` & `src/lib/tasks-engine.ts`
- **Problem**: Concurrent read-modify-write operations on `jobs.json` and `background_tasks.json` suffered from race conditions leading to data loss. In addition, temporary `.tmp` files created during atomic file replacement could be left orphaned on disk if `writeFile` or `rename` threw an error.
- **Fix**:
  - **Mutex Lock**: Implemented in-memory promise-chain mutex locks (`jobsWriteLock` in `render.functions.ts` and `tasksWriteLock` in `tasks-engine.ts`).
  - Wrapped read-modify-write operations (`createTask`, `updateTask`, `deleteTask`, `clearCompletedTasks`, `clearAllTasks`, `startServerRenderJob`, `retryServerRenderJob`, `listServerRenderJobs`, `deleteServerRenderJob`, `recoverInterruptedJobs`, `processRenderQueue`) in `withJobsLock` / `withTasksLock` to serialize all concurrent updates.
  - **`.tmp` File Cleanup**: Wrapped `fs.writeFile` + `fs.rename` in `try...catch...finally` blocks (`writeJobsFile` and `writeTasksFile`). In case of write or rename failure, `fs.unlink(tmpPath).catch(() => {})` in the `finally` block cleans up the `.tmp` file immediately.

---

## 3. `src/lib/render-video.ts`
- **Problem**: `renderVideo()` allocated canvas resources (`attachedCanvas` DOM element, `createdObjectUrl` via `URL.createObjectURL`), `HTMLVideoElement` background elements, and `AudioContext` nodes. If an unexpected error was thrown during setup or recording, cleanup routines like `detachCanvas()` and `URL.revokeObjectURL` were skipped, causing memory leaks and DOM pollution.
- **Fix**: Wrapped the entire body of `renderVideo()` in a top-level `try...finally` block.
- **Implementation**:
  - Declared `bgVideo`, `audioCtx`, `audioSource`, `audioEndedAtWall`, `attachedCanvas`, `createdObjectUrl`, and `detachCanvas` in scope prior to entering the `try` block.
  - Placed resource teardown (`detachCanvas()`, `URL.revokeObjectURL`, `bgVideo.pause()`, `audioCtx.close()`, `audioSource.stop()`) inside the `finally` block.
  - Guaranteed execution of cleanup regardless of whether `renderVideo()` resolves normally or throws an exception.
