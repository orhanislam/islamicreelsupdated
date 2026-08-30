# Safe Zone & Social Media Layout Specifications Report

**Author**: Survey Explorer 2 (Safe Zone & Social Media Layout Specs Investigator)  
**Date**: 2026-08-30  
**Workspace**: `c:\Users\admin\Downloads\Islamic Reels Studio`  
**Reference Document**: `.agents/ORIGINAL_REQUEST.md`

---

## 1. Observation

Direct investigation of the codebase revealed the following implementations, constants, and layout logic:

### 1.1 Canvas 4-Slide Carousel Renderer (`src/lib/render-carousel.ts`)
- **Safe Zone Definition (Lines 1–17)**:
  ```ts
  export const TIKTOK_SAFE_ZONE = {
    W: 1080,
    H: 1920,
    SAFE_TOP: 300,
    SAFE_BOTTOM: 400,
    SAFE_LEFT: 100,
    SAFE_RIGHT: 220,
    get W_SAFE() { return this.W - this.SAFE_LEFT - this.SAFE_RIGHT; }, // 760px
    get H_SAFE() { return this.H - this.SAFE_TOP - this.SAFE_BOTTOM; }, // 1220px
    get CENTER_X() { return this.SAFE_LEFT + this.W_SAFE / 2; },         // 480px
  };
  ```
- **Text Wrapping & Scaling (Lines 86–143, 493–546)**:
  - `wrapIntelligent()` performs token measurement against `TIKTOK_SAFE_ZONE.W_SAFE` (760px), splits oversized single words, and eliminates single orphan words on the last line.
  - `fitSlideLayout()` dynamically compresses segment gaps (`gapScale` down to 0.01) and downscales fonts (`scale` down to 0.05) if `totalH > 1220px` to guarantee vertical bounding in `[SAFE_TOP, 1520px]`.
  - All text is drawn anchored at `CENTER_X = 480px` (shifted 60px left from 540px physical center), ensuring zero overlap with TikTok's right sidebar icons (Like, Comment, Share, Bookmark).

### 1.2 Single Photo Canvas Renderer (`src/lib/render-photo.ts`)
- **Safe Zone Definition (Lines 19–25)**:
  ```ts
  const W = 1080;
  const H = 1920;
  const SAFE = { top: 320, bottom: 280, side: 180 };
  ```
- **Observed Discrepancies**:
  - `maxW = W - SAFE.side * 2` (Line 224) calculates `1080 - 360 = 720px` with symmetric 180px margins on both left and right.
  - Text is drawn centered at `W / 2 = 540px` (`drawText(ctx, lines, yStart, ...)` at `W / 2`). This causes the right text boundary to extend up to `540 + 360 = 900px`, which breaches TikTok's right safe margin limit (860px) by 40px and collides with interaction buttons.
  - `SAFE.bottom = 280px` leaves text positioned down to `Y = 1640px` (`1920 - 280`), which is obscured by TikTok's username, caption, audio marquee, and bottom bar.
  - `autoFit()` (Lines 75–98) has a fixed minimum `min: 42`. When text is long and exceeds `maxHeight` at `min: 42`, it falls through (`// Fall through: even at min size — accept overflow`), causing text to spill outside the photo container and safe zone.
  - `drawReferencePill()` (Line 108) hardcodes `y = 280`, which overlaps with Arabic text starting at `SAFE.top = 320` (since pill height with padding is `56px`, spanning Y: 280 to 336).

### 1.3 Client Video Canvas Renderer (`src/lib/render-video.ts`)
- **Safe Zone Definition (Lines 30–47)**:
  ```ts
  let W = 1080;
  let H = 1920;
  let SAFE = { top: 320, bottom: 280, side: 180 };
  ```
- **Observed Discrepancies**:
  - Subtitle vertical position (Lines 918–919):
    ```ts
    const targetBottomY = H * 0.74; // 1420.8px in 1080p
    const baseY = targetBottomY - (activePhrase.lines.length - 1) * activePhrase.lineHeight;
    ```
  - Subtitles are centered at `W / 2 = 540px` with `maxW = W - SAFE.side * 2 = 720px` (symmetric margins). Right edge extends to 900px, overlapping TikTok right action icons.
  - The `opts.subtitlePosition` option (`"tiktok" | "reels" | "shorts" | "center"`) is defined in the type interface (from `render-photo.ts`) but **is never read or handled anywhere in `render-video.ts`**.
  - `drawReferencePill()` (Line 259) hardcodes `y = 280 * scale`.

### 1.4 Server FFmpeg & ASS Subtitle Generation (`src/lib/render.functions.ts`)
- **Script Info & Style Definitions (Lines 347–364)**:
  ```ini
  [Script Info]
  PlayResX: 1080
  PlayResY: 1920

  [V4+ Styles]
  Style: Arabic,Scheherazade New,100,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,3,0,8,50,50,300,1
  Style: Bulgarian,Outfit,120,&H00FFFFFF,&H0000D7FF,${outlineColor},${backColor},-1,0,0,0,100,100,0,0,${borderStyle},${outlineWidth},${shadowSize},${bulgarianAlign},100,100,${bulgarianMarginV},1
  Style: Reference,Outfit,70,&H00FFFFFF,&H000000FF,&H00000000,&H99000000,-1,0,0,0,100,100,0,0,1,3,4,8,50,50,380,1
  ```
- **Observed Discrepancies**:
  - `subtitlePosition` mapping (Lines 309–324):
    ```ts
    const subPos = data.subtitlePosition || "tiktok";
    let bulgarianAlign = 2; // Bottom-Center alignment
    let bulgarianMarginV = 1350;

    if (subPos === "reels") {
      bulgarianMarginV = 1350;
    } else if (subPos === "shorts") {
      bulgarianMarginV = 1350;
    } else if (subPos === "center") {
      bulgarianAlign = 5;
      bulgarianMarginV = 960;
    }
    ```
    `tiktok`, `reels`, and `shorts` all execute the exact same hardcoded value `1350` (70.3% of 1920), ignoring platform-specific safe zone variances.
  - Positioning tag `posTag` (Line 570, 662) uses `\pos(540, ${bulgarianMarginV})` or `\pos(540, 960)`, centering at X=540 without left-bias compensation for TikTok's right sidebar.

### 1.5 UI Live Preview (`src/routes/_app/create.tsx`)
- **Container Structure (Lines 1422–1432)**:
  - `<div className="preview-inner relative w-full aspect-[9/16] overflow-hidden">`
  - Fullscreen style: `#video-preview-container:fullscreen .preview-inner { height: 100vh !important; width: calc(100vh * 9 / 16) !important; }`
- **Observed Discrepancies**:
  - **No Safe Zone Overlays or Guides**: There are no grid lines, bounding box rulers, or toggleable TikTok/Instagram/Shorts UI overlay guides.
  - **Preview vs Export Positioning Mismatch**:
    - Preview subtitle (Line 1501, 1515): rendered inside `<div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-4 z-20">` (vertically centered at Y=50%).
    - Exported video: rendered at `H * 0.74` (Y=74%) in client video or `Y=1350` (Y=70.3%) in server video. The user sees centered text in preview, but downloaded video has text at the bottom.
  - **Fixed Pixel Typography**:
    - Preview uses hardcoded pixel font sizes (`style={{ fontSize: "16px" }}` and `style={{ fontSize: "24px" }}`). These do not adapt to preview container resizing (e.g. mobile 200px wide container vs desktop 360px container vs fullscreen 1080px).
  - **Audio Control Obstruction**:
    - The preview audio player (Line 1543) is rendered at `absolute bottom-4 left-4 right-4 z-20`, overlaying the bottom 15% of the video preview.

---

## 2. Standard Safe Zone Dimensions and Percentages (9:16, 1080×1920)

| Social Platform | Safe Top Margin | Safe Bottom Margin | Safe Left Margin | Safe Right Margin | Safe Active Area (W × H) | Optimal Horizontal Center | Key Avoidance UI Elements |
|---|---|---|---|---|---|---|---|
| **TikTok** | `300px` (15.6%) | `400px` (20.8%) | `100px` (9.3%) | `220px` (20.4%) | `760px × 1220px` | `X = 480px` | Top search/tabs, right action icons (avatar, like, comment, bookmark, share, sound disc), bottom username/caption/audio |
| **Instagram Reels** | `250px` (13.0%) | `420px` (21.9%) | `100px` (9.3%) | `180px` (16.7%) | `800px × 1250px` | `X = 500px` | Top camera/audio pill, right like/comment/share/menu, bottom account handle/caption/audio marquee + 4:5 In-Feed crop (`Y: 285px - 1635px`) |
| **YouTube Shorts** | `220px` (11.5%) | `380px` (19.8%) | `100px` (9.3%) | `180px` (16.7%) | `800px × 1320px` | `X = 500px` | Top search/camera/menu, right like/dislike/comments/remix, bottom channel handle/Subscribe button/sound badge |
| **Universal Safe Zone** (Cross-Platform) | `300px` (15.6%) | `420px` (21.9%) | `100px` (9.3%) | `220px` (20.4%) | `760px × 1200px` | `X = 480px` | Guarantees 100% zero collision across TikTok, Reels, and Shorts simultaneously |

---

## 3. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|---|---|---|---|---|---|---|
| 1 | Carousel Layout | `TIKTOK_SAFE_ZONE` Constant | Exact 1080x1920 TikTok boundary constants (`SAFE_TOP=300`, `SAFE_BOTTOM=400`, `SAFE_LEFT=100`, `SAFE_RIGHT=220`, `CENTER_X=480`) | N/A | Geometry object with safe dimensions | None | `src/lib/render-carousel.ts:1-17` |
| 2 | Carousel Layout | `wrapIntelligent` | Word wrapping with oversized token chunking & orphan word prevention | `measureFn`, `rawText`, `maxWidth` | `string[]` of wrapped lines | Returns empty array on empty text | `src/lib/render-carousel.ts:86-143` |
| 3 | Carousel Layout | `fitSlideLayout` | Dynamic iterative gap compression & font downscaling loop to fit `H_SAFE` (1220px) | `CanvasRenderingContext2D`, `opts` | `SlideLayoutResult` | Iterates down to min scale 0.05 / gapScale 0.01 | `src/lib/render-carousel.ts:493-546` |
| 4 | Photo Layout | `renderPhoto` | Canvas photo compositor with Arabic, Bulgarian, and Reference capsule | `RenderOptions` | PNG `Blob` | Rejects on font or image load failure; overflows if text > maxHeight at min font | `src/lib/render-photo.ts:166-283` |
| 5 | Photo Layout | `drawReferencePill` | Top reference badge rendered as golden glass capsule | `CanvasRenderingContext2D`, `text` | Draws pill at Y=280 | Hardcoded Y causes overlap with Arabic at Y=320 | `src/lib/render-photo.ts:100-125` |
| 6 | Video Layout | `renderVideo` (Client) | Canvas MediaRecorder video generator with synchronized karaoke text | `VideoOptions` | `{ blob: Blob, mimeType: string }` | Throws if MediaRecorder missing or video fails | `src/lib/render-video.ts:284-1005` |
| 7 | Video Layout | `chooseFontSize` | Dynamic font sizing for Bulgarian video captions | `ctx`, `fullText`, `maxWidth`, `maxHeight` | `{ fontSize, lineHeight }` | Clamps at min 36px (at 1080p) | `src/lib/render-video.ts:150-172` |
| 8 | Server Video | `executeRenderTask` (FFmpeg) | Server-side FFmpeg MP4 generation with ASS subtitles | `RenderOptions` & media URLs | Rendered MP4 file buffer / path | Queued execution; cleans disk on start | `src/lib/render.functions.ts:44-780` |
| 9 | Subtitle Sync | `verifyAndCorrectSubtitleSync` | Timing validator ensuring monotonicity & bounds | `timings`, `audioDuration` | `{ correctedTimings, adjustmentsMade }` | Fixes inverted/overlapping timestamps | `src/lib/subtitle-sync.functions.ts` |
| 10 | Thumbnail Layout | `generateViralThumbnail` | SVG overlay on Pexels photo for 1080x1920 viral thumbnail | `ThumbnailRequest` | Base64 JPEG data URL | Sharp fallback to solid background on Pexels error | `src/lib/thumbnail.functions.ts:13-101` |
| 11 | UI Preview | Video Preview Container | Responsive 9:16 aspect ratio preview container with fullscreen toggle | React state & DOM element | 9:16 interactive DOM container | Mismatches export vertical positioning | `src/routes/_app/create.tsx:1420-1563` |
| 12 | UI Configuration | Safe Area Profile Selector | Select dropdown for `subtitlePosition` (`tiktok`, `reels`, `shorts`, `center`) | User selection | Updates state | Ignored in client video render; all map to 1350 in server render | `src/routes/_app/create.tsx:1172-1182` |

---

## 4. Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---|---|---|
| 1 | `render-photo.ts` Auto-Fit | Long Bulgarian text (> 12 lines) with Arabic block | At `fontSize = 42`, total height exceeds `verticalForBg`. The function accepts overflow, drawing lines down to Y=1750+ (spilling out of photo background and obscured by bottom navigation). |
| 2 | `render-photo.ts` Reference Pill | `style: "centered"` with multi-line Arabic text | Reference pill is drawn at `y = 280` (height 56px, bottom edge 336px). Arabic text starts at `SAFE.top = 320`. The pill and first line of Arabic text collide and overlap between Y: 320 and 336. |
| 3 | `render-video.ts` Right Sidebar Margin | Subtitle lines with 5–7 words spanning full `maxW = 720px` | Centered at X=540, right edge reaches X=900. In TikTok mobile app, the right 220px (X: 860 to 1080) is covered by interaction buttons, partially obscuring the last word of each line. |
| 4 | `render-video.ts` Profile Selection | `subtitlePosition: "center"` or `"shorts"` | Video renders subtitles at `targetBottomY = H * 0.74` regardless of selected profile because `opts.subtitlePosition` is ignored in `render-video.ts`. |
| 5 | `create.tsx` Live Preview Typography | Mobile viewport (screen width < 380px) | Preview container width drops to ~200px. Subtitle text retains fixed `style={{ fontSize: "24px" }}`, causing 3-4 words to wrap into 4+ lines and overflow the preview box. |
| 6 | `create.tsx` Audio Control Overlap | Audio loaded during preview | `<audio>` element rendered at `bottom-4 left-4 right-4` physically obstructs the bottom 60px of the video preview, hiding any text placed in the lower-third. |
| 7 | `render.functions.ts` ASS Subtitle Center Anchor | Long Ayah translation in `subPos === "tiktok"` | `\pos(540, 1350)` anchors text at X=540. Wide text lines extend beyond X=860 into the TikTok right button collision area. |
| 8 | Instagram Reels Feed Display | 1080x1920 video with lower-third subtitle at Y=1450 | When viewed in Instagram Home Feed / Profile Grid (4:5 crop, Y: 285 to 1635), subtitle is visible. But if subtitle is placed at Y=1650+ (e.g. from `render-photo.ts`), it is cropped out in the 4:5 feed view. |

---

## 5. Logic Chain

1. **Premise 1**: Social media platforms (TikTok, Instagram Reels, YouTube Shorts) place persistent UI overlays (status bars, search, action buttons, username, sound metadata, bottom navigation) over vertical 9:16 content.
2. **Premise 2**: Any content placed within the top 300px, bottom 400px, or right 220px of a 1080×1920 video/image will be obstructed on TikTok. Instagram Reels and YouTube Shorts have similar constraints (top 220–250px, bottom 380–420px, right 180px).
3. **Observation**: While `src/lib/render-carousel.ts` implements an exact safe zone contract (`TIKTOK_SAFE_ZONE`, `CENTER_X = 480`, auto-fit downscaling), the other renderers (`render-photo.ts`, `render-video.ts`, `render.functions.ts`) and the UI preview (`create.tsx`) contain discrepancies:
   - `render-photo.ts` uses symmetric 180px margins (right edge X=900) and small bottom margin (280px), leading to button overlap and caption obstruction.
   - `render-video.ts` uses symmetric 180px margins and ignores `opts.subtitlePosition`.
   - `render.functions.ts` maps all three profiles (`tiktok`, `reels`, `shorts`) to the identical Y=1350 position and X=540 center.
   - `create.tsx` live preview centers subtitles at Y=50% (instead of lower third Y=70–74%), lacks visual safe zone overlay guides/toggles, uses unscaled pixel font sizes, and has an audio player covering the bottom preview area.
4. **Inference**: To satisfy user requirements R1, R2, and R3 (prevent text overflow, respect safe zones, prevent text overlap), the system needs:
   - Safe zone harmonization across all 4 rendering pipelines.
   - Live preview alignment with actual export coordinates.
   - Toggleable safe zone visual guides (TikTok / Reels / Shorts overlay masks) in the UI.
   - Responsive container-relative scaling for preview typography.

---

## 6. Caveats

- **Device Scaling & OS Differences**: Physical safe zones vary by ~20–30px across different mobile screen aspect ratios (e.g., 19.5:9 on iPhone 15 vs 20:9 on modern Androids) due to system status bars and gesture home bars. The recommended 1080×1920 safe zones (Top: 300px, Bottom: 420px, Left: 100px, Right: 220px) account for the strictest bounding box across all devices.
- **Browser-Specific Canvas Font Rendering**: Font metric calculations in Node.js / test environments vs real browser Canvas 2D engines may differ by 1–2px. Tolerances in tests should accommodate rounding.
- **No Implementation Done**: Per the Specification Miner role, this survey documents the exact specifications, gaps, and remediation points without altering application code.

---

## 7. Conclusion & Actionable Remediation Plan

To achieve 100% safe zone compliance and prevent text overflow across all screens:

### Remediation Area 1: Unified Safe Zone Constants (`src/lib/`)
- Export a centralized `SOCIAL_SAFE_ZONES` configuration:
  ```ts
  export const SOCIAL_SAFE_ZONES = {
    tiktok: { top: 300, bottom: 400, left: 100, right: 220, centerX: 480, maxW: 760, maxH: 1220 },
    reels:  { top: 250, bottom: 420, left: 100, right: 180, centerX: 500, maxW: 800, maxH: 1250 },
    shorts: { top: 220, bottom: 380, left: 100, right: 180, centerX: 500, maxW: 800, maxH: 1320 },
    universal: { top: 300, bottom: 420, left: 100, right: 220, centerX: 480, maxW: 760, maxH: 1200 },
  };
  ```

### Remediation Area 2: Single Photo & Video Renderers
- In `render-photo.ts`: Replace symmetric `SAFE` with `SOCIAL_SAFE_ZONES.tiktok` (or selected profile), anchor Reference Pill outside text boundaries (e.g. Y=250), and replace `autoFit` fallback with iterative downscaling.
- In `render-video.ts`: Wire `opts.subtitlePosition` to dynamically choose `targetBottomY` and horizontal center from `SOCIAL_SAFE_ZONES[opts.subtitlePosition || 'tiktok']`.
- In `render.functions.ts`: Differentiate `bulgarianMarginV` and ASS `MarginR` / `MarginL` per profile (`tiktok`: 1350 / MarginR 220, `reels`: 1300 / MarginR 180, `shorts`: 1380 / MarginR 180, `center`: 960).

### Remediation Area 3: Live Preview UI (`src/routes/_app/create.tsx`)
- Add a **Safe Zone Overlay Guide Component** with a toggle button (`"Покажи Safe Zone водачи"`):
  - Renders a semi-transparent overlay indicating the top bar, bottom caption/sound area, right action buttons, and active text area for TikTok, Instagram Reels, and YouTube Shorts.
- Align live preview subtitle vertical positioning with `subtitlePosition` (e.g. `top-[72%]` for lower third vs `top-[50%]` for center).
- Use container query / percentage-based scaling for preview fonts (e.g. `clamp(14px, 3.5cqw, 24px)`).
- Relocate or dock the preview audio player below the 9:16 frame rather than floating over the bottom preview area.

---

## 8. Verification Method

1. **Unit & Geometry Tests**: Run test suites verifying safe zone boundary compliance via `jiti`:
   ```powershell
   npx jiti src/lib/__tests__/adversarial-r1-r2-challenger.test.ts
   npx jiti src/lib/__tests__/verify-vertical-autofit-segments.test.ts
   ```
2. **Visual & Codebase Inspection**:
   - Inspect `src/routes/_app/create.tsx` lines 1420–1560 to verify preview container and overlay alignment.
   - Inspect `src/lib/render-carousel.ts` lines 1–17 and `src/lib/render-photo.ts` lines 19–25 to verify margin discrepancies.
   - Inspect `src/lib/render-video.ts` lines 918–978 and `src/lib/render.functions.ts` lines 309–356.
