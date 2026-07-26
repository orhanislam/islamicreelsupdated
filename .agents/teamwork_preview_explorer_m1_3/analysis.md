# Islamic Reels Studio — Codebase Analysis Report

## Executive Summary
This document provides a comprehensive, read-only analysis of the Islamic Reels Studio application logic, API/Supabase integrations, video rendering engine, input validation, state management, and edge cases. The codebase is built with TanStack Start, React 19, FFmpeg, Gemini AI, and Supabase. While the system incorporates advanced features like multi-scene B-Roll, viral AI proposals, and automated TTS/subtitle synchronization, several critical issues were identified regarding security credentials, concurrent state persistence, memory/disk management, network fetching efficiency, and fallback handling.

---

## Findings & Detailed Audit

### Finding 1: Hardcoded Plaintext Credentials & API Keys in Source Control
- **Target File & Logic Routine**: `deploy-node.cjs` (line 31) and `src/lib/gemini.ts` (line 17)
- **Observation**: 
  - `deploy-node.cjs` contains a hardcoded plaintext SSH password (`j20022002j!`) for the remote root account at IP `93.189.88.228`.
  - `src/lib/gemini.ts` contains a hardcoded fallback Google Gemini API key concatenated in inline code (`["AQ.Ab8RN6LhLDhb6BjZPD", "UkiNwLpxnxZ7Y6-i_9pcfetDTB69M7cg"].join("")`).
- **Impact**: Security vulnerability exposing server root SSH credentials and API quotas if repository is shared or pushed to public/remote origins.
- **Proposed Fix / Refactoring**:
  - Remove all hardcoded credentials from source code.
  - Pass SSH credentials via environment variables (e.g. `process.env.SSH_PASSWORD`) or SSH public keys.
  - Rely strictly on `.env` file configuration for `GEMINI_API_KEY`.
- **Priority**: High

---

### Finding 2: Unsafe Concurrent File Writes in Task & Render Engine (`jobs.json` & `background_tasks.json`)
- **Target File & Logic Routine**: `src/lib/render.functions.ts` (`loadJobs`, `saveJobs`) and `src/lib/tasks-engine.ts` (`listTasks`, `saveTasksList`, `updateTask`)
- **Observation**:
  - Background workers and API handlers read, mutate, and write `jobs.json` and `background_tasks.json` using raw `fs.readFile` and `fs.writeFile` without mutex locks or atomic transactions.
  - Concurrent incoming HTTP requests or simultaneous background updates (e.g., rendering progress updates) overwrite each other's changes, leading to lost job state or corrupted JSON syntax.
- **Impact**: Inconsistent rendering status, missing video job records, or JSON syntax errors on high-concurrency usage.
- **Proposed Fix / Refactoring**:
  - Implement an in-memory queue or atomic file-writing pattern (`fs.writeFile(tmp) -> fs.rename(tmp, target)`).
  - Migrate job status and background task tracking from local JSON files to Supabase DB tables (`public.posts` / `public.batch_jobs`).
- **Priority**: High

---

### Finding 3: Over-Aggressive System-Wide Disk Cleanup Logic
- **Target File & Logic Routine**: `src/lib/render.functions.ts` (`aggressivelyCleanServerDisk`, line 825-868)
- **Observation**:
  - When `forceAll = true`, `aggressivelyCleanServerDisk` evaluates `matchesPrefix` to `true` for all files and uses a age threshold of `0`.
  - It recursively deletes files in `/tmp` and `/var/tmp`.
- **Impact**: Deleting all files in shared OS temporary directories (`/tmp`) risks terminating or corrupting concurrent renders, active TTS generation sessions, or non-related OS processes running on the server.
- **Proposed Fix / Refactoring**:
  - Restrict temp cleanup strictly to a dedicated app subdirectory (e.g. `path.join(os.tmpdir(), "islamic-reels-jobs")`).
  - Maintain a safety margin (e.g., delete files older than 5–10 minutes) rather than wiping `/tmp` instantly with a 0ms threshold.
- **Priority**: High

---

### Finding 4: Excessive Network & Memory Overhead in Hadith Scraping
- **Target File & Logic Routine**: `src/lib/sunnah.functions.ts` (`scrape`, lines 68–87)
- **Observation**:
  - Every call to `scrape()` downloads two fullHadith collection JSON files (`ara-<collection>.min.json` and `eng-<collection>.min.json`) directly from GitHub CDN (`cdn.jsdelivr.net`).
  - Collections like Sahih al-Bukhari are 20–30MB each. Downloading and parsing 30MB JSON files on every single Hadith request creates huge request latency (5–10s), network bandwidth usage, and high Node.js memory pressure.
- **Impact**: Slow response times, potential rate limits from CDN, and server OOM (Out Of Memory) crashes under load.
- **Proposed Fix / Refactoring**:
  - Cache downloaded collection JSON files in memory (`Map`) or on local disk (`.cache/hadiths/`).
  - Retrieve single hadith entries on-demand or pre-pack indexed hadith datasets.
- **Priority**: High

---

### Finding 5: High Latency & Unhandled Errors in Visual Haram Filtering
- **Target File & Logic Routine**: `src/lib/pexels.functions.ts` (`getHalalVideos`, `checkVideoForHaram`, lines 235–299)
- **Observation**:
  - `getHalalVideos` sequentially fetches 3 preview images per Pexels video candidate, converts them to Base64, and calls `geminiImageAnalysis`.
  - Sequential HTTP downloads + Gemini Vision API calls for multiple candidate videos increase total search latency to 30–60+ seconds.
  - If `PEXELS_API_KEY` is not defined in environment variables, `searchPexelsVideos` throws an unhandled error: `"Pexels не е конфигуриран"`.
- **Impact**: UI video search requests time out or fail when environment variables are missing or when scanning candidate video batches.
- **Proposed Fix / Refactoring**:
  - Parallelize image frame downloads and Vision checks (`Promise.all`).
  - Provide fallback video selection if `PEXELS_API_KEY` is missing or if Vision API times out.
- **Priority**: High

---

### Finding 6: Silent Failures in Multi-Ayah Quran Audio Fetching & Concatenation
- **Target File & Logic Routine**: `src/lib/quran.functions.ts` (`fetchAyah`, `concatCleanMp3s`, lines 295–340)
- **Observation**:
  - If network fetching fails for any single Ayah audio clip in a multi-ayah range, `audioBufs` will be missing segments.
  - `concatCleanMp3s` receives an incomplete or empty buffer array and outputs `data:audio/mp3;base64,`.
- **Impact**: Downstream FFmpeg rendering receives invalid audio data, resulting in silent video output or render task failures.
- **Proposed Fix / Refactoring**:
  - Validate `audioBufs.length === count` before concatenation.
  - Throw an explicit, user-friendly error if audio retrieval fails for any verse in the range.
- **Priority**: Medium

---

### Finding 7: Silent Text Truncation in Google TTS Fallback
- **Target File & Logic Routine**: `src/lib/tts.functions.ts` (`synthesizeHadithNarration`, lines 272–281)
- **Observation**:
  - When ElevenLabs and EdgeTTS fail or are unconfigured, `synthesizeHadithNarration` falls back to `googleTTS.getAudioBase64(cleaned.slice(0, 200), ...)`.
  - Texts longer than 200 characters are truncated to 200 chars.
- **Impact**: The generated audio cuts off abruptly midway through long Hadiths/verses, while subtitles continue displaying full text.
- **Proposed Fix / Refactoring**:
  - Split long text into <= 200 character chunks, fetch Google TTS for each chunk, and concatenate audio buffers.
- **Priority**: Medium

---

### Finding 8: Non-Stop 500ms Active Polling in Background Task Engine
- **Target File & Logic Routine**: `src/lib/assistant.functions.ts` (`triggerBackgroundTaskWorker`, lines 615–711) and `src/lib/tasks-engine.ts` (`listTasks`)
- **Observation**:
  - `triggerBackgroundTaskWorker()` schedules a 500ms `setTimeout` loop that runs continuously in the background.
  - On every 500ms iteration, it executes `listTasks()`, reading `background_tasks.json` from disk continuously.
- **Impact**: Unnecessary continuous disk I/O reads (120 reads/minute) when no tasks are queued.
- **Proposed Fix / Refactoring**:
  - Replace active polling with event-driven notifications (`EventEmitter` / pub-sub) or increase idle polling interval to 5–10 seconds.
- **Priority**: Medium

---

### Finding 9: FFmpeg ASS Subtitle Filter Path Escaping Vulnerability on Windows
- **Target File & Logic Routine**: `src/lib/render.functions.ts` (`executeRenderTask`, line 685 & 719)
- **Observation**:
  - `assPath` escaping logic (`assPath.replace(/\\/g, '/').replace(/:/g, '\\:')`) does not handle paths containing spaces (e.g. `C:\Users\admin\Downloads\Islamic Reels Studio`).
- **Impact**: If temporary directory paths contain spaces or special characters, FFmpeg's `subtitles='...'` complex filter fails during render.
- **Proposed Fix / Refactoring**:
  - Enclose escaped paths in appropriate quotes or use short 8.3 file paths on Windows.
- **Priority**: Medium

---

### Finding 10: Translation Fallback Displaying English Text in Subtitles
- **Target File & Logic Routine**: `src/lib/translate.functions.ts` (`translateToBulgarian`, lines 160–170)
- **Observation**:
  - If Gemini AI translation fails or outputs unrecognized format for Quran Ayahs, fallback code produces: `(${b.ayah}) ${b.english || ""}`.
- **Impact**: English text is displayed in Bulgarian video subtitles without notifying the user.
- **Proposed Fix / Refactoring**:
  - Fall back to offline/pre-fetched Bulgarian translations (e.g. Theophanov Bulgarian translation from AlQuran Cloud API).
- **Priority**: Low

---

## Summary Matrix

| ID | Module / File | Flaw Description | Priority |
|---|---|---|---|
| 1 | `deploy-node.cjs` & `src/lib/gemini.ts` | Hardcoded SSH password and fallback Gemini API key | High |
| 2 | `src/lib/render.functions.ts` & `tasks-engine.ts` | Unsafe concurrent JSON file read/write operations | High |
| 3 | `src/lib/render.functions.ts` | Over-aggressive `/tmp` disk cleanup wiping OS temp files | High |
| 4 | `src/lib/sunnah.functions.ts` | Re-fetching 30MB Hadith collection JSONs on every request | High |
| 5 | `src/lib/pexels.functions.ts` | Slow sequential AI Vision Haram checks & unhandled key errors | High |
| 6 | `src/lib/quran.functions.ts` | Silent empty audio fallback when Quran CDN audio fails | Medium |
| 7 | `src/lib/tts.functions.ts` | Google TTS fallback truncating text at 200 characters | Medium |
| 8 | `src/lib/assistant.functions.ts` | Continuous 500ms active disk polling loop | Medium |
| 9 | `src/lib/render.functions.ts` | FFmpeg ASS subtitle path escaping flaw with spaces on Windows | Medium |
| 10 | `src/lib/translate.functions.ts` | Translation fallback rendering English in Bulgarian subtitles | Low |
