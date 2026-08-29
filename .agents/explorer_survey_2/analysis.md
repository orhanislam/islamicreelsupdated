# Comprehensive Analysis: R2 TikTok Safe Zone, Typography Layout & Intelligent Text Wrapping

## 1. Executive Summary
This analysis details the architectural investigation of **Requirement R2 (TikTok Safe Zone & Intelligent Text Wrapping)** and its interplay with **R1 (Text Formatting & Differentiation)** for the Islamic Reels Studio TikTok Photo Carousel generation engine.

Currently, `src/lib/render-carousel.ts` uses static font sizes, an overly wide text box (`maxW = 820px`), an off-center X coordinate (`centerX = 500px`), and an unclamped vertical centering formula (`currentY = (1920 - totalH)/2 - 50`). This causes:
1. **Horizontal Collision**: Text extends to `X = 910px`, overlapping directly with TikTok's right action rail (Like, Comment, Share, Bookmark buttons, Avatar).
2. **Vertical Collision / Bleed**: Longer Ayah/Hadith texts cause total text height to exceed 1200–1500px, pushing top lines under the TikTok header/status bar (`Y < 280px`) and bottom lines under the creator caption/audio bar (`Y > 1540px`).
3. **Typography Flaws**: Naive space-splitting produces orphan lines and has no word-break fallback for long tokens.
4. **Lack of Dynamic Scaling**: Zero auto-fit logic exists to scale font sizes based on text volume.

---

## 2. Deep Codebase Architecture Review

### 2.1 File Map & Responsibilities
- **`src/lib/render-carousel.ts`**: Single source of truth for 1080x1920 2D Canvas rendering of carousel slides (`renderCarouselSlide`).
- **`src/components/CarouselRendererButton.tsx`**: Client component orchestrating slide rendering, ZIP generation via `JSZip`, and webhook dispatch to Make.com.
- **`src/lib/assistant.functions.ts` & `src/lib/carousel.functions.ts`**: Prompting engine & Tawheed topic injector generating 4-slide payloads (`topTitle`, `mainText`, `bottomText`, `footerText`, `imagePrompt`).
- **`src/lib/render-photo.ts`**: Reference implementation of TikTok-safe photo rendering featuring `SAFE = { top: 320, bottom: 280, side: 180 }` and `autoFit()` typography loops.

---

## 3. TikTok Mobile UI Safe Zone Geometry (1080 x 1920 Portrait)

### 3.1 Overlay Region Breakdown
```
0px ──────────────────────────────────────────────────────── 1080px
 │   TOP UNSAFE ZONE (Y: 0 -> 280-300px)                          │
 │   • System Status Bar (Time, Battery, Wi-Fi, Notch/Island)     │
 │   • TikTok Top Navigation ("Following", "For You", Search)     │
300px ┌──────────────────────────────────────────────┐ 860px      │
 │    │                                              │ │ RIGHT    │
 │    │              TIKTOK SAFE AREA                │ │ UNSAFE   │
 │    │                                              │ │ ZONE     │
 │    │   Safe Width : 760px                         │ │ (X: 860- │
 │    │   Safe Height: 1220px                        │ │  1080px) │
 │    │   Center X   : 480px                         │ │ • Avatar │
 │    │   Range Y    : [300px, 1520px]               │ │ • Like   │
 │    │                                              │ │ • Comment│
 │    │                                              │ │ • Save   │
 │    │                                              │ │ • Share  │
1520px└──────────────────────────────────────────────┘ │ • Music  │
 │   BOTTOM UNSAFE ZONE (Y: 1520 -> 1920px)                       │
 │   • Creator Username & Expandable Description                  │
 │   • Audio Track Title & Moving Marquee                         │
 │   • System Navigation Bar & Video Scrubber Bar                 │
1920px─────────────────────────────────────────────────────────────
```

### 3.2 Quantitative Comparison: Current vs. Proposed Safe Layout

| Parameter | Current `render-carousel.ts` | Proposed TikTok-Safe Specification | Impact / Defect Fixed |
|---|---|---|---|
| **Canvas Dimensions** | 1080 × 1920 (9:16) | 1080 × 1920 (9:16) | Standard vertical HD |
| **Max Text Width (`maxW`)** | `820px` | `760px` (or `780px` max) | Eliminates right-edge overflow into action buttons |
| **Center X Position (`centerX`)** | `500px` (`W/2 - 40`) | `480px` (`SAFE_LEFT + W_SAFE/2`) | Centers text within visible safe corridor `[100px, 860px]` |
| **Left Inset (`SAFE_LEFT`)** | `90px` (`500 - 410`) | `100px` | Adequate bezel margin |
| **Right Inset (`SAFE_RIGHT`)** | `170px` (Right edge = `910px`) | `220px` (Right edge = `860px`) | **Fixed**: Action rail (X: 870–1080) is completely avoided |
| **Top Inset (`SAFE_TOP`)** | None (computed from center) | `300px` minimum clamp | **Fixed**: Top title never collides with status bar/search |
| **Bottom Inset (`SAFE_BOTTOM`)** | None (computed from center) | `400px` minimum clamp (Max Y = `1520px`) | **Fixed**: Text never collides with creator caption & music disc |
| **Usable Safe Height (`H_SAFE`)** | Unbounded | `1220px` (`1920 - 300 - 400`) | Provides strict height budget for dynamic scaling |

---

## 4. Analysis of Current Implementation Flaws

### 4.1 Text Measurement & Wrapping Flaws
In `src/lib/render-carousel.ts` lines 13–30:
```ts
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = words[0] || "";

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + " " + word).width;
    if (width < maxWidth) {
      currentLine += " " + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}
```
**Defects**:
1. Splits only by literal single space `" "`. Consecutive whitespace, tabs, or non-breaking spaces cause blank words or incorrect wrapping.
2. If a single word/reference exceeds `maxWidth` (e.g. `[Ал-Бакара:255]`), `currentLine = word` draws beyond `maxWidth` with zero clipping or word-breaking.
3. Orphan lines (a single trailing word on line N) are frequent because no line-balancing heuristic exists.

### 4.2 Vertical Layout & Collision Calculations
In `src/lib/render-carousel.ts` lines 143–155:
```ts
const titleH = titleLines.length * lhTitle;
const mainH = mainLines.length * lhMain;
const bottomH = bottomLines.length * lhBottom;

let totalH = titleH + mainH + bottomH;
if (titleH > 0 && mainH > 0) totalH += gapTitleMain;
if (mainH > 0 && bottomH > 0) totalH += gapMainBottom;

let currentY = (H - totalH) / 2 - 50;
```
**Failure Scenario**:
- In Slide 3 (Authentic Dalil + Commentary), `mainText` contains ~250–350 characters.
- `mainLines`: 8 lines @ 85px = 680px.
- `titleLines`: 2 lines @ 95px = 190px.
- `bottomLines`: 2 lines @ 65px = 130px.
- Gaps: 80px + 60px = 140px.
- `totalH = 190 + 680 + 130 + 140 = 1140px`.
- `currentY = (1920 - 1140)/2 - 50 = 340px`.
- Bottom text finishes at `340 + 1140 = 1480px`.
- When `mainText` has 10 lines (longer Hadith / Surah):
  - `totalH = 1310px`.
  - `currentY = (1920 - 1310)/2 - 50 = 255px` (overlaps Top Bar @ Y < 280px).
  - Bottom text finishes at `255 + 1310 = 1565px` (overlaps Bottom Caption @ Y > 1520px).

---

## 5. Recommended Technical Design for R2 (and R1 Synergy)

### 5.1 Multi-Section Block Parsing
To support R1 differentiation (sacred text vs. human commentary) inside the safe zone layout:
```ts
export type TextBlock = {
  text: string;
  type: "title" | "dalil" | "commentary" | "cta";
  baseFontSize: number;
  minFontSize: number;
  baseLineHeightRatio: number;
  color: string;
  fontFamily: string;
  fontWeight: number | string;
  gapAfter: number;
};
```
When `mainText` contains quoted Dalil followed by human commentary (e.g. `„Не сполита земята...“ А ето как да приложиш...`), the parser splits `mainText` into:
1. `dalil`: The quoted string (in radiant gold `#fde047`, slightly larger font).
2. `commentary`: The human application text (in crisp white `#f8fafc`).
3. Inter-block spacing: 36px interval separating the Word of Allah / Hadith from human words.

### 5.2 Intelligent Word Wrapping with Orphan Elimination
```ts
function wrapIntelligent(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];

  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      currentLine = candidate;
    } else {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        // Word itself exceeds maxWidth — break token character by character
        let partial = "";
        for (const char of word) {
          if (ctx.measureText(partial + char).width > maxWidth) {
            lines.push(partial);
            partial = char;
          } else {
            partial += char;
          }
        }
        currentLine = partial;
      }
    }
  }
  if (currentLine) lines.push(currentLine);

  // Eliminate orphan last line (<35% width of previous line)
  if (lines.length >= 2) {
    const last = lines[lines.length - 1];
    const prev = lines[lines.length - 2];
    if (ctx.measureText(last).width < ctx.measureText(prev).width * 0.35) {
      const prevWords = prev.split(" ");
      if (prevWords.length > 2) {
        const moved = prevWords.pop()!;
        lines[lines.length - 2] = prevWords.join(" ");
        lines[lines.length - 1] = `${moved} ${last}`;
      }
    }
  }

  return lines;
}
```

### 5.3 Dynamic Font Scaling Algorithm
To fit any slide content strictly within `H_SAFE = 1220px`:
1. **Define base and minimum font scales**:
   - `scale = 1.0`, stepping down by `0.05` to `minScale = 0.65`.
2. **Layout Simulation**:
   - For a given `scale`, compute:
     `fontSize = Math.round(block.baseFontSize * scale)`
     `lineHeight = Math.round(fontSize * block.baseLineHeightRatio)`
     `lines = wrapIntelligent(ctx, block.text, W_SAFE)`
     `blockHeight = lines.length * lineHeight`
   - `totalHeight = sum(blockHeight) + sum(gapAfter * scale)`
3. **Convergence**:
   - Select the largest `scale` where `totalHeight <= H_SAFE`.
4. **Vertical Centering**:
   - `startY = SAFE_TOP + Math.max(0, (H_SAFE - totalHeight) / 2)`
   - Every line drawn satisfies `Y >= 300px` and `Y + lineH <= 1520px`.
5. **Horizontal Centering**:
   - `centerX = 480px`. Every line drawn satisfies `X >= 100px` and `X <= 860px`.

---

## 6. Synergy with Other Requirements
- **R1 (Differentiated Text & Spacing)**: Handled directly in block decomposition with distinct color styling (`#fde047` gold for Dalil vs `#ffffff` for commentary) and 36px spacing interval.
- **R3 (Title Prefix Cleanup)**: CarouselRendererButton copies title cleanly; cleanup in prompt/parser ensures title has no `[tiktok carousels]`.
- **R4 (Dynamic Background Images)**: `renderCarouselSlide` accepts any `backgroundUrl` (whether from Imagen, local assets, or Pexels) and scales it cleanly with cover aspect ratio and dark gradient overlay.
