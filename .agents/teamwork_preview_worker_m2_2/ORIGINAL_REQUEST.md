## 2026-07-26T09:21:10Z

You are Worker 3 for Islamic Reels Studio.
Your assigned working directory: C:\Users\admin\Downloads\Islamic Reels Studio\.agents\teamwork_preview_worker_m2_2
Project root directory: C:\Users\admin\Downloads\Islamic Reels Studio

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

OBJECTIVE:
Implement 3 critical concurrency and exception-handling hardening fixes for Milestone 2, then run `npm run build` to verify compilation.

SPECIFIC IMPLEMENTATION REQUIREMENTS:
1. `src/lib/sunnah.functions.ts`:
   - Store in-flight Promises in `HADITH_COLLECTION_CACHE` (`Map<string, Promise<any>>`) rather than only resolved values. When `fetchHadithCollectionJson(url)` is called for an uncached URL, check if a promise is already in the map. If so, return/await it; if not, create the fetch promise, store it in `HADITH_COLLECTION_CACHE`, and return it. This eliminates the Thundering Herd vulnerability under concurrent requests.
2. `src/lib/render.functions.ts` & `src/lib/tasks-engine.ts`:
   - Implement an in-memory queue / mutex lock (e.g. `let jobsWriteLock = Promise.resolve()`) around read-modify-write file operations on `jobs.json` and `background_tasks.json` to serialize concurrent updates and prevent data loss.
   - Wrap temporary file writing and renaming (`fs.writeFile` + `fs.rename`) in a `try...catch...finally` block. If `rename` or `writeFile` fails, delete the `.tmp` file using `fs.unlink(tmpPath).catch(() => {})` in the `catch`/`finally` handler to prevent orphan `.tmp` files.
3. `src/lib/render-video.ts`:
   - Wrap `renderVideo()` body in a top-level `try...finally` block to guarantee that `detachCanvas()` and `createdObjectUrl` cleanup (`URL.revokeObjectURL`) execute even if an unexpected exception is thrown during setup or rendering.

VERIFICATION:
After making the code changes, run `npm run build` in the project root. Ensure the build completes cleanly with exit code 0.
Document your changes and build output in `C:\Users\admin\Downloads\Islamic Reels Studio\.agents\teamwork_preview_worker_m2_2\changes.md` and `handoff.md`.
Send a completion message back to the orchestrator when finished.
