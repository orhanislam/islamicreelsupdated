# Survey Explorer 1: Codebase Structure & UI Component Analysis Report

**Target Workspace**: `c:\Users\admin\Downloads\Islamic Reels Studio`  
**Report Date**: 2026-08-30  
**Archetype**: Teamwork Explorer (Read-Only Investigation)  

---

## 1. Observation

A systematic survey of the entire codebase was conducted to identify all components, layout systems, rendering engines, preview containers, and safe zone configurations involved in generating, previewing, and exporting Islamic Reels, photos, carousels, and videos.

### 1.1 Project Structure & Tech Stack
- **Framework & Runtime**: React 19.2.0, TanStack Start 1.168.26 (`@tanstack/react-start`), TanStack React Router 1.170.16, Vite 8.0.16.
- **Styling**: Tailwind CSS v4.2.1 (`@tailwindcss/vite`, `@import "tailwindcss"` in `src/styles.css`), Radix UI primitives (`@radix-ui/*`), `tw-animate-css`, `lucide-react` icons.
- **Media & Processing**: Fluent-FFmpeg 2.1.3 (`@ffmpeg-installer/ffmpeg`), Sharp 0.35.3, JSZip 3.10.1, Canvas Confetti.
- **Entry Points & Routing**:
  - `src/router.tsx` & `src/routeTree.gen.ts`: Route tree configuration.
  - `src/routes/__root.tsx`: Root HTML layout with font imports (`Outfit`, `Amiri`, `Cormorant Garamond`, `Inter`).
  - `src/routes/_app/route.tsx`: Application shell containing top navigation bar (`/assistant`, `/create`, `/downloads`).
  - `src/routes/_app/create.tsx`: Main studio interface for 1-click reel generation, single photo creation, audio selection, live preview player, and server/client render triggers.
  - `src/routes/_app/assistant.tsx`: AI chat assistant producing video proposals and 4-slide photo carousel workflows.
  - `src/routes/_app/downloads.tsx`: Download manager, media queue, server job tracking, and batch zip exporter.
  - `src/routes/internal/render.tsx`: Headless render endpoint for background canvas capture.

---

### 1.2 Inventory of Media Creation & Rendering Engines

| # | File Path | Type | Function / Component | Output Dimensions | Primary Responsibility |
|---|-----------|------|-----------------------|-------------------|------------------------|
| 1 | `src/lib/render-photo.ts` | Canvas 2D (Client) | `renderPhoto(opts: RenderOptions)` | 1080x1920 PNG Blob | Single photo composition (Arabic, Bulgarian, Reference Pill). |
| 2 | `src/lib/render-video.ts` | Canvas 2D + MediaRecorder (Client) | `renderVideo(opts: VideoOptions)` | 1080x1920 / 720x1280 MP4/WebM | Client-side video generation with word-synced animated captions. |
| 3 | `src/lib/render.functions.ts` | FFmpeg + ASS Subtitles (Server) | `executeRenderTask(opts: any)` / `runServerRender` | 1080x1920 / 720x1280 MP4 | Server-side video rendering with ASS subtitle overlay and audio mastering. |
| 4 | `src/routes/_app/create.tsx` | React DOM / CSS | `CreatePage` (lines 1420–1563) | CSS 9:16 aspect ratio | Live interactive preview player in browser. |
| 5 | `src/lib/thumbnail.functions.ts` | Sharp + SVG (Server) | `generateViralThumbnail(input)` | 1080x1920 JPEG | Cover/Thumbnail generator for TikTok posts. |
| 6 | `src/lib/render-carousel.ts` | Canvas 2D (Client/Server) | `renderCarouselSlide`, `fitSlideLayout` | 1080x1920 PNG Blob | 4-slide carousel generator with `TIKTOK_SAFE_ZONE`. |
| 7 | `src/components/CarouselRendererButton.tsx` | React Client Component | `CarouselRendererButton` | N/A (UI trigger) | Orchestrates multi-slide background fetching, ZIP export, and Make.com webhooks. |

---

### 1.3 Exact Code Locations of Layout, Safe Zone, Overflow, and Overlap Issues

#### A. Single Photo Rendering (`src/lib/render-photo.ts`)

1. **Safe Zone Definition & Symmetrical Padding**:
   - `src/lib/render-photo.ts:24`:
     ```ts
     const SAFE = { top: 320, bottom: 280, side: 180 };
     ```
   - **Observation**: `side: 180` and `bottom: 280` do not match TikTok's asymmetric layout. TikTok right interaction sidebar requires `220px` clearance (`x: 860` to `1080`), and the bottom caption area requires `400px` clearance (`y: 1520` to `1920`). A bottom margin of `280px` leaves text between `y: 1520` and `1640` directly behind TikTok's user handle, sound tag, and caption text.

2. **Reference Pill Overlap with Arabic Verse**:
   - `src/lib/render-photo.ts:108`:
     ```ts
     const x = (W - pillW) / 2;
     const y = 280;
     ```
   - `src/lib/render-photo.ts:253, 268`:
     ```ts
     drawText(ctx, arabicBlock.lines, SAFE.top, arabicBlock.lineHeight, "#fff"); // SAFE.top = 320
     ```
   - **Observation**: The Reference Pill begins at `y = 280` with height `pillH = 56px`, covering the interval `[280px, 336px]`. The Arabic verse is drawn starting at `SAFE.top = 320px`. The Arabic text and Reference Pill overlap by `16px` at the baseline.

3. **Auto-Fit Overflow Fallback**:
   - `src/lib/render-photo.ts:84-98`:
     ```ts
     for (let size = range.max; size >= range.min; size -= 2) {
       ctx.font = `${weight} ${size}px ${family}`;
       const lines = wrap(ctx, text, maxWidth);
       const lh = Math.round(size * lineHeightRatio);
       if (lines.length * lh <= maxHeight) {
         return { fontSize: size, lines, lineHeight: lh };
       }
     }
     // Fall through: even at min size — accept overflow but keep min legible size.
     const size = range.min;
     ctx.font = `${weight} ${size}px ${family}`;
     const lines = wrap(ctx, text, maxWidth);
     return { fontSize: size, lines, lineHeight: Math.round(size * lineHeightRatio) };
     ```
   - **Observation**: Minimum font size is clamped at `42px` (line 244). When text is long (e.g. multi-verse Ayahs or Hadiths), `autoFit` returns lines exceeding `maxHeight`, causing text lines to draw below `y = 1920px` and spill outside the canvas.

4. **Artificial Available Height Override**:
   - `src/lib/render-photo.ts:238-246`:
     ```ts
     const verticalForBg =
       H - SAFE.top - SAFE.bottom - (arabicBlock ? arabicBlock.lines.length * arabicBlock.lineHeight + 60 : 0);
     const cleanBulgarian = opts.bulgarian.replace(/<[^>]+>/g, "").trim();
     const bg = autoFit(
       ctx, cleanBulgarian, "'Cormorant Garamond', Georgia, serif", 700,
       maxW, Math.max(420, verticalForBg),
       { min: 42, max: 84 },
       1.32,
     );
     ```
   - **Observation**: `Math.max(420, verticalForBg)` enforces a minimum target height of `420px` even when `verticalForBg` is significantly smaller (e.g., `200px` after a 4-line Arabic verse). This guarantees that the Bulgarian translation will overflow the available space and collide with the Arabic text or bottom safe zone.

5. **Collision in `lower-third` Mode**:
   - `src/lib/render-photo.ts:249-258`:
     ```ts
     if (opts.style === "lower-third") {
       if (arabicBlock) {
         ctx.font = `600 ${arabicBlock.fontSize}px 'Amiri', 'Scheherazade New', serif`;
         ctx.direction = "rtl";
         drawText(ctx, arabicBlock.lines, SAFE.top, arabicBlock.lineHeight, "#fff");
         ctx.direction = "ltr";
       }
       ctx.font = `700 ${bg.fontSize}px 'Cormorant Garamond', Georgia, serif`;
       const block = bg.lines.length * bg.lineHeight;
       drawText(ctx, bg.lines, H - SAFE.bottom - block + bg.lineHeight * 0.75, bg.lineHeight, "#fff");
     }
     ```
   - **Observation**: The Arabic block extends downwards from `y = 320px`, while the Bulgarian translation is anchored upwards from `H - SAFE.bottom = 1640px`. There is no collision boundary or vertical constraint between them; when Arabic is 4 lines (~450px) and Bulgarian is 8 lines (~850px), `320 + 450 = 770px` and `1640 - 850 = 790px`, causing elements to collide and overlap in the center.

---

#### B. Client-Side Video Rendering (`src/lib/render-video.ts`)

1. **Symmetrical Margins & Centering vs TikTok UI**:
   - `src/lib/render-video.ts:32, 41-45`:
     ```ts
     let SAFE = { top: 320, bottom: 280, side: 180 };
     ```
   - `src/lib/render-video.ts:949`:
     ```ts
     let cursorX = W / 2 - totalLineWidth / 2; // Centers around 540px
     ```
   - **Observation**: Centering text at `x = 540px` with `side: 180` allows text lines to extend up to `x = 900px`. The TikTok right action buttons (Like, Comment, Share) occupy `x: 860px` to `1080px`. Words extending past `860px` are covered by UI icons.

2. **Vertical Anchor Pushing Text into Bottom Safe Zone**:
   - `src/lib/render-video.ts:918-919`:
     ```ts
     const targetBottomY = H * 0.74; // 1420.8px
     const baseY = targetBottomY - (activePhrase.lines.length - 1) * activePhrase.lineHeight;
     ```
   - `src/lib/render-video.ts:965`: Active karaoke word uses `ctx.scale(1.14, 1.14)`.
   - **Observation**: For 2-3 line subtitle blocks with font size 80-112px and 1.14x active word scaling, the bottom bounds of the words extend to `1420 + 100 + 40 = 1560px`, breaching the 1520px TikTok bottom safe zone boundary.

3. **Top Reference Badge Position**:
   - `src/lib/render-video.ts:259`:
     ```ts
     const y = 280 * scale; // 280px on 1080p
     ```
   - **Observation**: Placed at `y = 280px`, colliding with the TikTok top search bar and "Following / For You" tabs (which extend down to `y = 300px`).

---

#### C. Server-Side FFmpeg ASS Subtitles (`src/lib/render.functions.ts`)

1. **Horizontal Alignment & Dead Center Anchor**:
   - `src/lib/render.functions.ts:355, 570, 662`:
     ```ts
     Style: Bulgarian,Outfit,120,&H00FFFFFF,&H0000D7FF,${outlineColor},${backColor},-1,0,0,0,100,100,0,0,${borderStyle},${outlineWidth},${shadowSize},${bulgarianAlign},100,100,${bulgarianMarginV},1
     const posTag = subPos === "center" ? `\\an5\\pos(540,960)` : `\\an${bulgarianAlign}\\pos(540,${bulgarianMarginV})`;
     ```
   - **Observation**: Subtitle lines are positioned with `\pos(540, 1350)`. Anchoring at `x = 540` does not shift text left to clear the TikTok right sidebar (`CENTER_X = 480`).

2. **Naive Word-Count Line Slicing (`wpl`) Causing Horizontal Overflow**:
   - `src/lib/render.functions.ts:548-550, 561-565`:
     ```ts
     const fs = wordCount > 40 ? 58 : wordCount > 28 ? 68 : wordCount > 18 ? 80 : wordCount > 10 ? 92 : 105;
     const wpl = wordCount > 40 ? 5 : wordCount > 28 ? 4 : wordCount > 18 ? 4 : wordCount > 10 ? 3 : 2;
     for (let i = 0; i < ayahWords.length; i += wpl) {
       lines.push(ayahWords.slice(i, i + wpl).join(" "));
     }
     formattedText = lines.join("\\N");
     ```
   - **Observation**: Slicing lines purely by word count (`wpl`) without measuring character count or pixel width causes long Bulgarian words (12-16 letters each) to create lines exceeding `1200px` width at `fs = 68-105`, spilling past the 1080px video frame boundaries.

3. **Vertical Growth Collision with Top Reference Badge**:
   - `src/lib/render.functions.ts:363`:
     ```ts
     ass += `Dialogue: 0,0:00:00.00,${formatTime(audioDur)},Reference,,0,0,0,,{\\an8\\pos(540,380)}${data.reference}\n`;
     ```
   - `src/lib/render.functions.ts:570`:
     ```ts
     const posTag = `\\an2\\pos(540,1350)`;
     ```
   - **Observation**: For multi-line Ayah blocks (8–12 lines), text grows upwards from `y = 1350px`. With line height ~90px, 12 lines span `1080px` (`1350 - 1080 = 270px`), crossing the Reference badge at `y = 380px` and causing severe text-over-text collision.

---

#### D. Interactive Live Preview Player (`src/routes/_app/create.tsx`)

1. **Hardcoded Inline Font Sizes and Coordinates**:
   - `src/routes/_app/create.tsx:1506-1512`:
     ```tsx
     {content?.source_ref && (
       <div className="absolute top-[15%] w-full text-center px-4">
         <p className="text-white font-bold" style={{ fontSize: "16px", ... }}>
           {content.source_ref}
         </p>
       </div>
     )}
     ```
   - `src/routes/_app/create.tsx:1515-1517`:
     ```tsx
     <div className="relative z-10 text-center">
       <p className="text-white font-bold" style={{ fontSize: "24px", ... }}>
     ```
   - **Observation**: The DOM preview uses fixed `fontSize: "24px"` and `fontSize: "16px"` regardless of container scaling, desktop viewport, mobile viewport, or fullscreen mode.
   - **Observation**: Subtitle is placed in a center flex container (`absolute inset-0 flex flex-col items-center justify-center`), rendering at 50% screen height, whereas actual generated video captions render at ~74% screen height. The live preview fails to represent what the user will actually export.
   - **Observation**: Audio player at line 1543 (`absolute bottom-4 left-4 right-4 z-20`) directly obstructs the bottom preview area.

---

#### E. Viral Thumbnail Generator (`src/lib/thumbnail.functions.ts`)

1. **Unconstrained SVG Text Width & Safe Zone Breach**:
   - `src/lib/thumbnail.functions.ts:37-55`:
     ```ts
     for (const w of words) {
       if ((current + " " + w).length > 22 && current) {
         lines.push(current.trim());
         current = w;
       } else {
         current += " " + w;
       }
     }
     ...
     return `<text x="540" y="${y}" font-family="Arial, sans-serif" font-weight="900" font-size="76" fill="${color}" text-anchor="middle" letter-spacing="-1">${esc(line)}</text>`;
     ```
   - **Observation**: Hardcoded `font-size="76"` with line breaking at `22` characters produces lines up to `950px` wide. Centered at `x = 540`, text extends from `x = 65` to `x = 1015`, extending 155px into the TikTok right button zone (`x: 860` to `1080`).

---

## 2. Logic Chain

### 2.1 The Root Cause of Safe Zone Breaches (R2)
1. In TikTok/Reels vertical format (1080x1920 9:16), the interactive UI elements are not symmetrically distributed:
   - Top area (`y: 0` to `300px`): Header navigation, search, and sound tabs.
   - Bottom area (`y: 1520` to `1920px`): Account name, full caption, music disc, and hashtags.
   - Right sidebar (`x: 860` to `1080px`, width `220px`): Profile icon, Like button, Comments button, Bookmark button, and Share button.
   - Left side (`x: 0` to `100px`): Safe buffer.
2. The carousel engine (`src/lib/render-carousel.ts:1-17`) correctly modeled this safe box:
   - `TIKTOK_SAFE_ZONE = { W: 1080, H: 1920, SAFE_TOP: 300, SAFE_BOTTOM: 400, SAFE_LEFT: 100, SAFE_RIGHT: 220, W_SAFE: 760, H_SAFE: 1220, CENTER_X: 480 }`.
3. However, `render-photo.ts`, `render-video.ts`, and `render.functions.ts` were built with obsolete symmetrical assumptions:
   - `SAFE = { top: 320, bottom: 280, side: 180 }` and horizontal center `x = 540`.
4. As a direct consequence, text placed between `x: 860` and `x: 900` is obscured by right sidebar icons, and text placed between `y: 1520` and `y: 1640` is obscured by bottom captions.

### 2.2 The Root Cause of Text Overflow (R1)
1. In `render-photo.ts`, `autoFit` has a hard lower bound of `range.min = 42px`. When content exceeds the vertical budget, `autoFit` does not reduce font size further, does not split into slides, and does not truncate.
2. Furthermore, `Math.max(420, verticalForBg)` in `render-photo.ts:243` overrides actual remaining vertical space, falsely instructing `autoFit` that `420px` is available when only `150-250px` remains.
3. In `render.functions.ts:548-565`, line wrapping uses fixed word count (`wpl`) instead of measuring character or pixel widths. Long words produce lines wider than 1080px, spilling off the video edges.

### 2.3 The Root Cause of Text Overlap (R3)
1. In `render-photo.ts:108` vs `render-photo.ts:253`, the Reference Pill is placed at `y = 280` (height 56px -> `y: 280-336`), while Arabic text is drawn at `SAFE.top = 320`, creating an unavoidable 16px collision.
2. In `render-photo.ts:249-258` (`lower-third`), Arabic text is anchored from the top (`320px` downwards) while Bulgarian text is anchored from the bottom (`1640px` upwards) without any shared collision boundary or interval constraint.
3. In `render.functions.ts`, the Reference badge is fixed at `y = 380px`, while Ayah text is anchored at `\pos(540, 1350)` (`\an2`). As line count increases to 8-12 lines, the text block grows upward past `y = 380px`, directly colliding with the badge.

### 2.4 The Root Cause of Brittle Layout & Inconsistent Previews
1. `create.tsx` uses static Tailwind classes (`top-[15%]`, `text-center`, inline `fontSize: "24px"`) and centers subtitles at 50% height, completely detached from the coordinate models of `render-video.ts` (74% height), `render.functions.ts` (ASS `1350px`), and `render-photo.ts` (dynamic multi-tier layout).
2. The preview container lacks visual safe zone indicators, making it impossible for users to know whether text will be safe before exporting.

---

## 3. Caveats

1. **Read-Only Investigation**: No source code files in `src/` were modified during this investigation. All findings are derived through static analysis, AST inspection, coordinate tracing, and existing test suite execution.
2. **Carousel Engine Exception**: The 4-slide carousel engine (`src/lib/render-carousel.ts`) already implements the correct `TIKTOK_SAFE_ZONE` geometry (`760x1220` safe corridor, `CENTER_X = 480px`) and has 49 passing automated E2E tests (`src/lib/__tests__/verify-carousel-upgrade.test.ts`). The issues identified in this report reside primarily in the **Photo**, **Video**, **Server ASS**, **Thumbnail**, and **Live Preview** rendering pipelines.
3. **Hardware / Device Variance**: Screen dimensions on physical mobile devices vary slightly between iOS (iPhone Dynamic Island / Home Indicator) and Android (navigation bar). The standard TikTok 1080x1920 safe zone standard (`SAFE_TOP: 300`, `SAFE_BOTTOM: 400`, `SAFE_LEFT: 100`, `SAFE_RIGHT: 220`) provides maximum cross-platform safety.

---

## 4. Conclusion & Actionable Recommendations

To fully resolve the layout issues and satisfy all requirements (R1, R2, R3, and Acceptance Criteria), the following architectural changes and component updates must be implemented:

### 4.1 Unified Safe Zone Module
Create or extract a single shared safe zone layout specification (e.g. `src/lib/safe-zone.ts` or export from `src/lib/render-carousel.ts`):
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
  get BOTTOM_MAX_Y() { return this.H - this.SAFE_BOTTOM; },           // 1520px
};
```

### 4.2 Comprehensive Component Modification Plan

| Component / File | Proposed Fix / Action | Lines Affected | Rationale |
|------------------|----------------------|----------------|-----------|
| `src/lib/render-photo.ts` | 1. Adopt `TIKTOK_SAFE_ZONE` (`W_SAFE: 760`, `H_SAFE: 1220`, `CENTER_X: 480`).<br>2. Position Reference Pill inside safe top (`y = 310-360`) and position Arabic verse strictly below pill (`y = pillY + pillH + gap`).<br>3. Remove `Math.max(420, verticalForBg)` and calculate dynamic font scaling down to 24px so text never overflows.<br>4. Implement top-to-bottom sequential layout with collision prevention for `lower-third` and `centered`. | Lines 24–28, 84–98, 108–124, 224–279 | Prevents photo text overflow, resolves pill/Arabic overlap, clears TikTok UI elements. |
| `src/lib/render-video.ts` | 1. Update `SAFE` to match `TIKTOK_SAFE_ZONE`.<br>2. Center subtitles horizontally at `CENTER_X = 480px` with `maxWidth = 760px`.<br>3. Clamp `targetBottomY` so active scaled words never cross `y = 1520px`.<br>4. Move Reference Pill to `y = 310-340px`. | Lines 30–47, 181–200, 250–282, 915–985 | Prevents video captions from being hidden by TikTok right buttons and bottom captions. |
| `src/lib/render.functions.ts` | 1. Update ASS styles: `MarginL: 100`, `MarginR: 220`, `\pos(480, 1420)` for `\an2`.<br>2. Replace fixed `wpl` slicing with dynamic text width measurement (`measureText` or proportional char-width estimation <= 760px).<br>3. Calculate Ayah font size dynamically and enforce max total height <= 1000px so text never reaches `y = 380px` Reference badge. | Lines 308–365, 545–578, 660–685 | Prevents text spilling off video edges and eliminates collision with Reference badge. |
| `src/routes/_app/create.tsx` | 1. Update live preview overlay to match exact video subtitle positioning (lower third, 74% anchor, centered around safe corridor).<br>2. Use responsive `%` / `em` / `cqw` units instead of hardcoded `24px` font sizes.<br>3. Add an optional toggleable "Safe Zone Overlay Guide" showing TikTok right sidebar and bottom caption boundaries in real-time. | Lines 1432–1560 | Ensures what users see in preview matches the exact generated output. |
| `src/lib/thumbnail.functions.ts` | 1. Restrict SVG title max width to `760px` centered at `x = 480` or `x = 540` with 760px max width.<br>2. Implement dynamic SVG font sizing (reduce from 76px to 54-60px for long titles). | Lines 33–65 | Keeps thumbnail titles readable and unclipped by TikTok interaction buttons. |

---

## 5. Verification Method

### 5.1 Automated Test Execution
Run the following test commands from the project root:
```bash
# 1. Verify Tawheed and Subtitle Synchronization Baselines
npm test

# 2. Verify Carousel Safe Zone & Wrapping Engine
npx jiti src/lib/__tests__/verify-carousel-upgrade.test.ts

# 3. Verify Adversarial Safe Zone Corridor Containment ([100px, 860px] X, [300px, 1520px] Y)
npx jiti src/lib/__tests__/adversarial-r1-r2-challenger.test.ts
npx jiti src/lib/__tests__/adversarial-r2-reviewer-stress.test.ts
npx jiti src/lib/__tests__/adversarial-r3-reviewer-stress.test.ts
```

### 5.2 Independent Agent-as-Judge Rubric
When changes are implemented, the independent reviewer can inspect and verify:
1. **No Text Overflow**: Confirm that in `render-photo.ts`, `render-video.ts`, and `render.functions.ts`, all rendered lines and paragraphs strictly stay within canvas boundaries (width <= 760px, height within safe corridor).
2. **Safe Zone Clearance**: Confirm all text is contained horizontally between `x = 100px` and `x = 860px` (avoiding the 220px right sidebar), and vertically between `y = 300px` and `y = 1520px` (avoiding top navigation and bottom captions).
3. **No Overlap**: Confirm Reference badge and Arabic verse / translation have explicit spacing intervals (>= 30px gap) with zero geometric overlap.
4. **Dynamic Adaptation**: Confirm font sizes scale down gracefully under extreme long-text inputs (150+ words) without hardcoded breakage.
