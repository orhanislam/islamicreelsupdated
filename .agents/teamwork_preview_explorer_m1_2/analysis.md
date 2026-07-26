# Islamic Reels Studio — Performance & Video/Canvas Rendering Analysis Report

## Executive Summary
This read-only investigation evaluated the Islamic Reels Studio codebase across six key domains:
1. **Video/Canvas Rendering Efficiency**
2. **Memory Leaks & Buffer Retention**
3. **Audio/Video Synchronization**
4. **State Re-renders & Component Architecture**
5. **Server Task Queue & Disk Efficiency**
6. **Bundle & Asset Optimization**

The codebase demonstrates strong algorithmic features (such as acoustic karaoke timing alignment, server-side FFmpeg rendering, and multi-scene B-Roll generation). However, several critical performance bottlenecks, memory leaks, and unnecessary state re-renders were identified in client canvas loops, React component structures, and server payload handling.

---

## Detailed Findings Matrix

| ID | Target File & Function | Category | Issue / Inefficiency | Priority | Proposed Fix / Optimization |
|---|---|---|---|---|---|
| **PERF-01** | `src/lib/render-video.ts` <br> `drawFrame()` | Canvas Rendering | Per-frame allocation of Canvas Gradients (`createLinearGradient`, `createRadialGradient`), RegExp instances (`highlightKeywords`), and array helpers in 30 FPS draw loop. | **High** | Hoist static regular expressions and font metrics. Cache gradient objects based on canvas dimensions so they are re-used across frames. |
| **PERF-02** | `src/lib/render-video.ts` <br> `renderVideo()` | Timer Leak | iOS frame loop uses `window.setTimeout`, but cleanup calls `cancelAnimationFrame(rafId)` which fails to stop `setTimeout` IDs, leaving drawing loops running in the background. | **High** | Store timer handle type explicitly; use `clearTimeout()` for `setTimeout` handles on iOS. |
| **PERF-03** | `src/routes/_app/downloads.tsx` <br> `DownloadsPage()` | Memory Leak | Inline `URL.createObjectURL(item.blob)` inside JSX render body creates new Blob Object URLs on every render/poll cycle without revoking existing ones. | **High** | Manage Object URLs inside `useMemo` or `useEffect` hooks and revoke them via `URL.revokeObjectURL()` on unmount/update. |
| **PERF-04** | `src/lib/render-video.ts` <br> `renderVideo()` | Memory Leak | Preloaded background MP4 video Blob URL (`videoSrc = URL.createObjectURL(b)`) is never revoked. Canvas container wrapper is leaked on unhandled exceptions. | **High** | Wrap `renderVideo()` body in a `try...finally` block that guarantees `URL.revokeObjectURL(videoSrc)` and `detachCanvas()` execution. |
| **PERF-05** | `src/lib/render.functions.ts` <br> `getServerRenderJobBase64()` | Server Memory | Reads full 1080p MP4 files into memory and converts them to ~133MB Base64 strings, triggering large V8 heap allocations and GC pauses. | **High** | Deprecate Base64 buffer transfers; enforce streaming HTTP downloads via `/api/download/:id`. |
| **PERF-06** | `src/routes/_app/create.tsx` <br> `CreatePage()` | Re-renders | 1357-line single monolithic component with 50+ state hooks and zero `useCallback` wrappers on handlers. Any keystroke forces full tree re-evaluation. | **High** | Refactor `CreatePage` into sub-components (`SourceSelector`, `SubtitleConfigPanel`, `PexelsPicker`) and memoize handlers with `useCallback`. |
| **PERF-07** | `src/routes/_app/create.tsx` <br> Audio upload / TTS | Memory Retention | Custom audio uploads and TTS audio are stored as Base64 data URIs directly in React state, maintaining tens of MBs in memory. | **Medium** | Store raw binary `Blob`s and use object URLs (`URL.createObjectURL`) cleaned up on state reset. |
| **PERF-08** | `src/routes/_app/create.tsx` <br> `useEffect([content?.english])` | Logic / Race | `onPexelsVideoSearch` fires on `content?.english` change before `bulgarian` translation state finishes, executing Pexels search with empty Bulgarian text. | **Medium** | Trigger Pexels video search after translation completes or pass explicit parameters to a memoized search function. |
| **PERF-09** | `src/lib/render-video.ts` <br> Audio timeline sync | Audio/Video Sync | Subtitle timing reveal calculations use padded audio duration, which can drift from `audioCtx.currentTime` during real-time MediaRecorder capture. | **Medium** | Lock subtitle progression directly to `audioCtx.currentTime` when audio is present, clamping progress against actual non-padded audio length. |
| **PERF-10** | `src/routes/_app/downloads.tsx` <br> `DownloadsPage()` | Unthrottled Polling | `setInterval` polls server jobs every 3 seconds unconditionally even when no jobs are active or rendering. | **Medium** | Poll dynamically only when active jobs exist (`rendering` / `queued`), increasing interval to 10s when idle. |
| **PERF-11** | `src/routes/_app/assistant.tsx` <br> `AssistantPage()` | CPU Churn | 3-second polling loop executes `JSON.stringify(prev) !== JSON.stringify(serverMsgs)` on full chat history arrays containing nested proposals. | **Medium** | Compare message count or latest job status IDs instead of deep stringifying full chat history objects every 3s. |
| **PERF-12** | `src/lib/render.functions.ts` <br> `executeRenderTask()` | Server Render | FFmpeg filter graph applies linear software chain (`crop`, `scale`, `eq`, `vignette`, `drawbox`, `subtitles`) on CPU without pre-scaling background inputs. | **Medium** | Pre-scale background inputs before complex filters and streamline subtitle overlay ordering. |
| **PERF-13** | `src/lib/pexels.functions.ts` <br> `checkVideoForHaram()` | Latency / Memory | Sequentially downloads 3 frame pictures per candidate Pexels video, converts them to Base64 in RAM, and calls Gemini Vision API. | **Medium** | Cache visual verification results by Pexels video ID and run frame fetches in parallel (`Promise.all`). |
| **PERF-14** | `src/routes/_app/downloads.tsx` <br> `handleDownloadAllZip` | Client Memory | Downloads all completed server MP4 videos into memory simultaneously to build a single ZIP, allocating 500MB–1GB+ RAM in browser tab. | **Medium** | Process and append videos to ZIP stream sequentially or use chunks to limit concurrent memory allocation. |
| **PERF-15** | `package.json` | Bundle Size | Heavy client/server libraries (`jszip`, `canvas-confetti`) imported synchronously on route load. | **Low** | Use dynamic `import()` for `jszip` and `canvas-confetti` on user action. |

---

## Detailed Analysis by Category

### 1. Canvas & Video Rendering Efficiency (`src/lib/render-video.ts`, `src/lib/render-photo.ts`)

#### Finding PERF-01: Per-Frame Object Allocation in Canvas Render Loop
- **File**: `src/lib/render-video.ts`
- **Function**: `drawFrame(elapsed: number)`
- **Observation**:
  - In lines 830-845, linear and radial gradient objects are instantiated every single frame:
    ```ts
    const g = ctx.createLinearGradient(0, 0, 0, H);
    // ...
    const ov = ctx.createLinearGradient(0, 0, 0, H);
    // ...
    const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.7);
    ```
  - In line 901, `const highlightKeywords = /.../i;` is declared inside `drawFrame`, compiling a 200-character regular expression on every frame (30 times per second).
  - Text width calculations (`lineWords.reduce(...)`, `ctx.measureText(" ")`) run inside nested loops per frame.
- **Impact**: At 30 FPS for a 60-second video, over 5,400 gradient instances and 1,800 RegExp objects are allocated and discarded, triggering frequent Garbage Collection pauses that cause frame stuttering during `MediaRecorder` capture.
- **Proposed Optimization**:
  - Move `highlightKeywords` regular expression out of `drawFrame` to top-level module scope.
  - Instantiate canvas linear/radial gradients once during canvas initialization and reuse them across frames.
  - Pre-calculate word metrics (`ctx.measureText`) once when building phrase render data rather than inside the per-frame draw loop.

#### Finding PERF-02: iOS Frame Loop Timer Leak
- **File**: `src/lib/render-video.ts`
- **Function**: `renderVideo(opts: VideoOptions)`
- **Observation**:
  - On iOS devices, line 1015 schedules the draw loop via `window.setTimeout`:
    ```ts
    rafId = window.setTimeout(draw, 15) as any;
    ```
  - However, line 1024 cancels frame requests with:
    ```ts
    if (rafId !== null) cancelAnimationFrame(rafId);
    ```
  - `cancelAnimationFrame` does NOT clear timers scheduled via `setTimeout`.
- **Impact**: When a video render finishes or times out, the `setTimeout` loop continues executing `draw()` in the background, consuming CPU and attempting canvas operations on closed contexts.
- **Proposed Optimization**: Track whether `rafId` was created via `setTimeout` or `requestAnimationFrame`, and call `clearTimeout(rafId)` when running on iOS.

---

### 2. Memory Leaks & Memory Retention

#### Finding PERF-03: Leaking Object URLs in JSX Render Body
- **File**: `src/routes/_app/downloads.tsx`
- **Function**: `DownloadsPage()`
- **Observation**:
  - Line 678 renders local download items using:
    ```tsx
    <video src={URL.createObjectURL(item.blob)} controls playsInline className="w-full h-full object-contain" />
    ```
  - Every time `DownloadsPage` re-renders (including during the 3-second polling interval), a new Object URL is created for `item.blob` without revoking the previous URL.
- **Impact**: Viewing local downloaded items for 30 seconds can leak dozens of video Blob URLs in browser memory, wasting hundreds of megabytes of RAM.
- **Proposed Optimization**: Store generated Object URLs in state using `useMemo` or `useEffect`, and revoke them via `URL.revokeObjectURL(url)` when items change or unmount.

#### Finding PERF-04: Unreleased Background Video Blob URLs & Canvas DOM Elements
- **File**: `src/lib/render-video.ts`
- **Function**: `renderVideo(opts: VideoOptions)`
- **Observation**:
  - Line 356 creates a Blob URL when preloading background video:
    ```ts
    videoSrc = URL.createObjectURL(b);
    ```
  - `URL.revokeObjectURL(videoSrc)` is never called anywhere in `renderVideo`.
  - Line 327 appends a fixed canvas container to `document.body` on iOS. `detachCanvas()` is called at lines 1152, 1157, and 1162, but if an error occurs earlier in `renderVideo` (e.g. font loading, audio fetch failure), `detachCanvas()` is bypassed.
- **Impact**: Leaked video Blob URLs remain in memory for the life of the page session, and failed iOS renders leave invisible wrapper elements in the DOM.
- **Proposed Optimization**: Wrap the entire rendering pipeline in `try ... finally` to ensure `URL.revokeObjectURL(videoSrc)` and `detachCanvas()` are always executed.

#### Finding PERF-05: Server-Side High-Res Video Base64 Memory Retention
- **File**: `src/lib/render.functions.ts`
- **Function**: `getServerRenderJobBase64()`
- **Observation**:
  - `getServerRenderJobBase64` reads full 1080p MP4 files into memory (`fs.readFile(targetMp4)`) and converts them to Base64 strings (`buf.toString("base64")`).
- **Impact**: A 50MB-100MB MP4 file becomes a ~133MB string in Node V8 memory, causing large GC pauses and memory spikes on the server.
- **Proposed Optimization**: Deprecate Base64 video endpoint; direct all clients to stream videos via `/api/download/:id`.

---

### 3. State Re-renders & Component Architecture

#### Finding PERF-06: Monolithic Component with Un-memoized Handlers
- **File**: `src/routes/_app/create.tsx`
- **Function**: `CreatePage()`
- **Observation**:
  - `CreatePage` is 1,357 lines long with 50+ individual `useState` hooks.
  - None of the event handlers (`onRender`, `onPexelsVideoSearch`, `onAutoPickPexelsVideo`, `onOneClickAutoViralStudio`, `handleAutoAlignSync`, etc.) use `useCallback`.
- **Impact**: Changing any state (such as typing in `surah`, `ayah`, `pexelsQuery`, or `bulgarian` text area) forces the entire 1,357-line component tree to re-evaluate, recreating all handlers and inline prop objects on every keystroke.
- **Proposed Optimization**: Decompose `CreatePage` into smaller sub-components (`SourceSelector`, `SubtitleConfigPanel`, `PexelsPicker`, `RenderPreviewPanel`) and wrap callback functions in `useCallback`.

#### Finding PERF-10 & PERF-11: Unthrottled 3-Second Polling
- **File**: `src/routes/_app/downloads.tsx` & `src/routes/_app/assistant.tsx`
- **Function**: `DownloadsPage()` / `AssistantPage()`
- **Observation**:
  - Both pages run `setInterval` polling every 3 seconds.
  - In `assistant.tsx`, every 3 seconds it re-fetches history and performs `JSON.stringify(prev) !== JSON.stringify(serverMsgs)` on full chat message arrays.
- **Impact**: Causes continuous CPU churn and unnecessary re-renders even when idle.
- **Proposed Optimization**: Poll dynamically only when active jobs are processing (`rendering` or `queued`), and compare job IDs/statuses instead of deep stringifying full chat history.

---

### 4. Audio/Video Synchronization Issues

#### Finding PERF-09: Subtitle Timeline Drift Against Padded Audio
- **File**: `src/lib/render-video.ts`
- **Function**: `renderVideo(opts: VideoOptions)`
- **Observation**:
  - Audio buffers are padded with 1 second of silence to prevent iOS Safari audio truncation.
  - In `drawFrame`, `revealDuration` is calculated against full audio duration (`duration - 0.05`). When audio clock and wall clock drift during MediaRecorder capture, subtitles can finish slightly out of sync with spoken narration.
- **Impact**: Word highlight karaoke timing can drift on lower-spec mobile devices.
- **Proposed Optimization**: Lock subtitle progression directly to `audioCtx.currentTime` when audio is present, clamping progress against actual non-padded audio length.

---

### 5. Bundle & Asset Optimization

#### Finding PERF-15: Synchronous Loading of Heavy Utilities
- **File**: `package.json`, `src/routes/_app/downloads.tsx`
- **Observation**:
  - `JSZip` and `canvas-confetti` are imported synchronously at top-level in `downloads.tsx` and `assistant.tsx`.
- **Impact**: Increases initial JavaScript bundle payload size for users visiting the application.
- **Proposed Optimization**: Use dynamic `import()` for `jszip` and `canvas-confetti` when the user clicks specific export buttons.

---

## Verification & Independent Test Instructions
1. **Canvas Draw Loop Verification**: Profile `renderVideo()` in Chrome DevTools Performance panel. Monitor Garbage Collection allocation timeline during MediaRecorder recording.
2. **Memory Leak Verification**: Inspect DevTools Memory tab on `/_app/downloads` while polling runs. Verify Blob Object URL count does not grow monotonically.
3. **Re-render Verification**: Enable React DevTools "Highlight updates when components render" and type into `surah` input on `/_app/create` to measure re-render scope.
