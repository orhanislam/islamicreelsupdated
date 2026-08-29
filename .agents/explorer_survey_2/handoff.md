# 5-Component Handoff Report: R2 TikTok Safe Zone, Layout Typography & Intelligent Text Wrapping

## 1. Observation

### 1.1 Carousel Canvas Rendering Engine
- **File**: `src/lib/render-carousel.ts` (lines 1–180)
- **Canvas Resolution**: `W = 1080`, `H = 1920` (9:16 vertical HD).
- **Current Typography Parameters**:
  - `fontTop = "800 85px 'Montserrat', sans-serif"` (line 110, `lhTitle = 95`)
  - `fontMain = "700 65px 'Montserrat', sans-serif"` (line 111, `lhMain = 85`)
  - `fontBottom = "700 50px 'Montserrat', sans-serif"` (line 112, `lhBottom = 65`)
  - `fontFooter = "500 40px 'Montserrat', sans-serif"` (line 113)
  - `gapTitleMain = 80`, `gapMainBottom = 60` (lines 140–141)
- **Current Horizontal Layout**:
  - `maxW = 820` (line 115)
  - `const centerX = (W / 2) - 40;` (line 152 => `centerX = 500px`)
  - Horizontal bounds of centered text: `[centerX - maxW/2, centerX + maxW/2] = [500 - 410, 500 + 410] = [90px, 910px]`.
- **Current Vertical Layout**:
  - `let currentY = (H - totalH) / 2 - 50;` (line 155)
  - No min/max bounds clamping. No check against top status bar or bottom caption.
- **Current Text Wrapping Function**:
  ```ts
  // src/lib/render-carousel.ts:13-30
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

### 1.2 Frontend Carousel Integration
- **File**: `src/components/CarouselRendererButton.tsx` (lines 23–68)
  - Receives `slides: { topTitle, mainText, bottomText, footerText, imagePrompt }[]`.
  - Invokes `renderCarouselSlide(...)` per slide, bundles PNG Blobs into `.zip` via `JSZip`, and offers direct download and Make.com webhook dispatch.
- **File**: `src/routes/_app/assistant.tsx` (lines 1010–1012)
  - Renders `<CarouselRendererButton slides={m.proposal.carouselSlides} title={m.proposal.title} />`.

### 1.3 Reference Safe Zone Pattern in Codebase
- **File**: `src/lib/render-photo.ts` (lines 24, 75–98)
  - Defines `const SAFE = { top: 320, bottom: 280, side: 180 };`
  - Implements `autoFit(ctx, text, family, weight, maxWidth, maxHeight, range, lineHeightRatio)` which loops from `range.max` down to `range.min` to guarantee text fits within available vertical pixels.

---

## 2. Logic Chain

### Step 1: Right-Rail Collision (Horizontal Safe Zone Defect)
- **Observation**: `render-carousel.ts:115, 152` sets `centerX = 500` and `maxW = 820`. Text spans from `X = 90px` to `X = 910px`.
- **TikTok UI Reality**: On the mobile client, the right action rail (creator profile avatar, Like heart & counter, Comment bubble & counter, Bookmark/Save star & counter, Share arrow & counter) spans horizontally from `X = 870px` to `X = 1080px` (a 210px band).
- **Inference**: Any line approaching full width extends into `X = 870..910px`, positioning text directly underneath the interactive Like and Comment buttons. Users cannot read the rightmost words.

### Step 2: Top & Bottom UI Clipping (Vertical Safe Zone Defect)
- **Observation**: `render-carousel.ts:155` calculates `currentY = (1920 - totalH)/2 - 50`.
- **TikTok UI Reality**:
  - The top status bar, camera notch, and TikTok tab header ("Following", "For You", Search) occupy `Y = 0` to `Y = 280-300px`.
  - The bottom creator username, expandable caption (2–4 lines), sound title, and navigation tabs occupy `Y = 1520` to `Y = 1920px` (a 400px band).
- **Calculation on Long Slides**:
  - In Slide 3 (Ayah/Hadith Dalil + commentary transition) or Slide 2 (Tawheed explanation + cliffhanger), `mainText` contains 250–350 characters (6–10 wrapped lines @ 85px = 510–850px).
  - With `titleH = 190px`, `bottomH = 130px`, and gaps = 140px, `totalH` reaches `1100–1350px`.
  - For `totalH = 1350px`: `currentY = (1920 - 1350)/2 - 50 = 235px`.
  - Top title starts at `Y = 235px` (obscured by top navigation header).
  - Bottom CTA ends at `235 + 1350 = 1585px` (obscured by bottom caption and music player).
- **Inference**: Long texts are visually clipped and rendered illegible on mobile devices.

### Step 3: Naive Text Wrapping Deficiencies
- **Observation**: `wrap()` splits only on `" "` (single space) without handling consecutive whitespace, tabs, or newlines, and lacks orphan balancing or token break fallback.
- **Inference**: Long references (e.g. `[Ал-Бакара:255]`) cannot be broken safely, and trailing orphan words create poor visual balance.

### Step 4: Absence of Multi-Block Formatting for R1
- **Observation**: `renderCarouselSlide` treats `mainText` as a single homogeneous string drawn in `#ffedb3` with a single font size.
- **Inference**: In Slide 3, the sacred Dalil cannot be visually distinguished from the human commentary/transition without splitting `mainText` into structured sub-blocks with distinct colors, font sizes, and spacing intervals.

---

## 3. Caveats
1. **Read-Only Mode**: No source code was modified during this survey phase.
2. **Font Loading Asynchrony**: `document.fonts.load(...)` is best-effort. If `'Montserrat'` web font is not loaded before render, canvas falls back to system sans-serif (`Arial`, `system-ui`). Sizing calculations must handle slight metric variance.
3. **External Integrations**: Make.com webhook payload expectations (`base64` PNG strings) remain unchanged; safe zone improvements preserve full compatibility with downstream automations.

---

## 4. Conclusion

### Root Cause Assessment
`render-carousel.ts` lacks:
1. Safe horizontal insets for TikTok's right action rail (`SAFE_RIGHT = 220px`).
2. Safe vertical insets for TikTok's top bar (`SAFE_TOP = 300px`) and bottom overlay (`SAFE_BOTTOM = 400px`).
3. An iterative dynamic auto-fit font scaling algorithm to accommodate variable text lengths within the `1220px` safe vertical window.
4. Block-level parsing to format sacred Dalil quotations separately from human commentary.

### Prescribed Technical Solution

#### 1. Safe Zone Metric Constants (1080 × 1920 Canvas)
```ts
const W = 1080;
const H = 1920;

const SAFE_TOP = 300;       // Clears status bar, notch, and TikTok top navigation
const SAFE_BOTTOM = 400;    // Clears username, caption, audio marquee, and bottom tabs
const SAFE_LEFT = 100;      // Clean bezel breathing room
const SAFE_RIGHT = 220;     // Strictly avoids right-side action buttons (avatar, like, comment, bookmark, share)

const W_SAFE = W - SAFE_LEFT - SAFE_RIGHT; // 760px usable width
const H_SAFE = H - SAFE_TOP - SAFE_BOTTOM; // 1220px usable height
const CENTER_X = SAFE_LEFT + W_SAFE / 2;   // 480px (perfect center of safe corridor)
```

#### 2. Multi-Section Block Parsing (R1 + R2 Synergy)
In `renderCarouselSlide`, parse slide input into structured blocks:
- **Title Block (`topTitle`)**: Badge font (`52–60px`, bold, `#f3d179` gold).
- **Dalil / Sacred Block**: Extracted quote `„...“` (`50–58px`, semi-bold, radiant `#fde047` / `#fef08a` gold).
- **Human Commentary Block**: Trailing transition text (`42–48px`, regular/medium, crisp `#ffffff` / `#f8fafc`).
- **Interval Gap**: `36–44px` separation between sacred text and human commentary.
- **Bottom CTA Block (`bottomText`)**: CTA font (`38–44px`, bold, `#fcd34d` / `#34d399` accent).

#### 3. Dynamic Font Scaling & Auto-Fit Engine
```ts
function computeFittedLayout(ctx: CanvasRenderingContext2D, blocks: RenderBlock[], maxW: number, maxH: number) {
  for (let scale = 1.0; scale >= 0.60; scale -= 0.05) {
    let totalH = 0;
    const layoutBlocks = blocks.map(b => {
      const fontSize = Math.round(b.baseFontSize * scale);
      const lineHeight = Math.round(fontSize * b.lineHeightRatio);
      ctx.font = `${b.fontWeight} ${fontSize}px ${b.fontFamily}`;
      const lines = wrapIntelligent(ctx, b.text, maxW);
      const height = lines.length * lineHeight;
      totalH += height + (b.gapAfter * scale);
      return { ...b, fontSize, lineHeight, lines, height };
    });

    if (totalH <= maxH || scale <= 0.60) {
      return { layoutBlocks, totalH, scale };
    }
  }
}
```

#### 4. Safe Vertical Positioning
```ts
// Center strictly within safe vertical window [SAFE_TOP, SAFE_TOP + H_SAFE]
let currentY = SAFE_TOP + Math.max(0, (H_SAFE - totalH) / 2);
```
- Guarantees `startY >= 300px` and `endY <= 1520px` for all slides regardless of text length.

---

## 5. Verification Method

### 5.1 Inspection Checklist
1. Inspect `src/lib/render-carousel.ts`:
   - Verify `W_SAFE = 760` (or `780`), `SAFE_RIGHT >= 210`, `CENTER_X = 480`.
   - Verify `SAFE_TOP >= 300` and `SAFE_BOTTOM >= 400`.
   - Verify presence of `wrapIntelligent` with orphan elimination and token breaking.
   - Verify presence of dynamic auto-fit downscaling for long texts.
   - Verify distinct color and vertical spacing between sacred Dalil and human commentary.

### 5.2 Automated Canvas Geometry Test
Create/run a verification test (e.g. `src/lib/__tests__/verify-carousel-safezone.test.ts` or standalone simulator):
- Test with short text (Hook slide, 50 chars).
- Test with average text (Explanation slide, 150 chars).
- Test with maximum stress text (Long Hadith translation, 400+ chars).
- Assertions:
  - `min(X_coord) >= 100` and `max(X_coord) <= 860` for all text lines.
  - `min(Y_coord) >= 300` and `max(Y_coord) <= 1520` for all text lines.
  - Zero text truncation mid-sentence or mid-word.

### 5.3 Project Build & Test Execution
Run the standard validation commands:
- `npm run build` or `bun run build` — must succeed with 0 errors.
- `npm run lint` — must pass cleanly.
