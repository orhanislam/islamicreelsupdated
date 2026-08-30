# Handoff Report: Client Video Renderer Hardening (`src/lib/render-video.ts`)

## 1. Observation

Direct inspection of `src/lib/render-video.ts` and `src/lib/safe-zone.ts` revealed the following critical layout, safe zone, and typography integration gaps:

1. **Symmetric Legacy `SAFE` Area & Dimension Scaling**:
   - `src/lib/render-video.ts:32` & `36-47`:
     ```ts
     let W = 1080;
     let H = 1920;
     let SAFE = { top: 320, bottom: 280, side: 180 };

     function configureCanvasSize(ios: boolean, quality?: "1080p" | "720p") {
       const is1080p = quality !== "720p"; // Strictly 1080p (1080x1920) by default
       const scale = is1080p ? 1 : 720 / 1080;
       W = is1080p ? 1080 : 720;
       H = is1080p ? 1920 : 1280;
       SAFE = {
         top: Math.round(320 * scale),
         bottom: Math.round(280 * scale),
         side: Math.round(180 * scale),
       };
       return scale;
     }
     ```
   - **Flaw**: Hardcoded symmetric `SAFE.side = 180` and `SAFE.bottom = 280` ignore standard social media asymmetric UI geometries. On TikTok (1080p), the right sidebar occupies $220\text{px}$, left is $100\text{px}$, bottom caption area is $400\text{px}$, and top is $300\text{px}$.

2. **Reference Pill Positioning & Center Breach**:
   - `src/lib/render-video.ts:249-282`:
     ```ts
     function drawReferencePill(ctx: CanvasRenderingContext2D, text: string) {
       ctx.save();
       const scale = W / 1080;
       const fontPx = Math.round(28 * scale);
       ctx.font = `500 ${fontPx}px 'Inter', system-ui, sans-serif`;
       const tw = ctx.measureText(text).width;
       const padX = 28 * scale, padY = 14 * scale;
       const pillW = tw + padX * 2;
       const pillH = fontPx + padY * 2;
       const x = (W - pillW) / 2;
       const y = 280 * scale;
       ...
       ctx.fillText(text, W / 2, y + pillH / 2 + 1);
       ctx.restore();
     }
     ```
   - **Flaw**:
     - Hardcoded $Y = 280 \times \text{scale}$ places the pill at $Y=280\text{px}$ on 1080p, violating `SAFE_TOP = 300px` (invades TikTok search/tab header overlay).
     - Centered at $(W - \text{pillW}) / 2$ ($X=540\text{px}$) instead of `sz.CENTER_X` ($480\text{px}$ for TikTok).
     - Does not enforce `clampToSafeZone` or width bounds against `sz.W_SAFE`.

3. **Subtitle Width & Height Constraints**:
   - `src/lib/render-video.ts:523-524`:
     ```ts
     const maxW = W - SAFE.side * 2;
     const verticalForText = H - SAFE.top - SAFE.bottom;
     ```
   - **Flaw**: Yields `maxW = 720px` (instead of `sz.W_SAFE = 760px`) and `verticalForText = 1320px` (instead of `sz.H_SAFE = 1220px`).

4. **Subtitle Centering & Bottom Anchor Clamping**:
   - `src/lib/render-video.ts:918-950`:
     ```ts
     const targetBottomY = H * 0.74;
     const baseY = targetBottomY - (activePhrase.lines.length - 1) * activePhrase.lineHeight;

     ctx.save();
     const centerY = baseY + blockH / 2 - activePhrase.lineHeight * 0.75;
     ctx.translate(W / 2, centerY);
     ...
     let cursorX = W / 2 - totalLineWidth / 2;
     ```
   - **Flaw**:
     - `targetBottomY = H * 0.74` is fixed and does not respond to `opts.subtitlePosition === 'center'` or `opts.style === 'center'`.
     - Subtitles are centered at screen center $W / 2 = 540\text{px}$. A $760\text{px}$ line centered at $540\text{px}$ spans $[160\text{px}, 920\text{px}]$, which exceeds $X_{\text{max}} = 860\text{px}$ by $60\text{px}$, overlapping TikTok's right sidebar buttons!
     - Active word pop with `ctx.scale(1.14, 1.14)` and drop shadows is not clamped against `sz.BOTTOM_MAX_Y = 1520px` ($1013\text{px}$ on 720p).

5. **Word Wrapping and Token Overflow**:
   - `src/lib/render-video.ts:131-143`:
     ```ts
     function wrapWords(ctx: CanvasRenderingContext2D, words: string[], maxWidth: number): string[][] {
       const lines: string[][] = [];
       let cur: string[] = [];
       for (const w of words) {
         const test = [...cur, w].join(" ");
         if (ctx.measureText(test).width > maxWidth && cur.length) {
           lines.push(cur);
           cur = [w];
         } else cur.push(w);
       }
       if (cur.length) lines.push(cur);
       return lines;
     }
     ```
   - **Flaw**: If an individual token exceeds `maxWidth`, `wrapWords` fails to break it into character chunks, overflowing `maxWidth`.

---

## 2. Logic Chain

1. **Geometry Registry Integration (`safe-zone.ts`)**:
   - Social platforms impose asymmetric insets:
     - **TikTok**: `SAFE_TOP: 300`, `SAFE_BOTTOM: 400`, `SAFE_LEFT: 100`, `SAFE_RIGHT: 220`, `W_SAFE: 760`, `CENTER_X: 480`, `BOTTOM_MAX_Y: 1520`.
     - **Reels**: `SAFE_TOP: 240`, `SAFE_BOTTOM: 340`, `SAFE_LEFT: 80`, `SAFE_RIGHT: 160`, `W_SAFE: 840`, `CENTER_X: 500`, `BOTTOM_MAX_Y: 1580`.
     - **Shorts**: `SAFE_TOP: 220`, `SAFE_BOTTOM: 380`, `SAFE_LEFT: 80`, `SAFE_RIGHT: 180`, `W_SAFE: 820`, `CENTER_X: 490`, `BOTTOM_MAX_Y: 1540`.
     - **Center**: `SAFE_TOP: 300`, `SAFE_BOTTOM: 300`, `SAFE_LEFT: 100`, `SAFE_RIGHT: 100`, `W_SAFE: 880`, `CENTER_X: 540`, `BOTTOM_MAX_Y: 1620`.
   - By resolving `sz = getSafeZone(opts.subtitlePosition || 'tiktok')` and scaling via `scaleSafeZone(sz, scale)` for 720p (`scale = 720 / 1080`), all canvas operations receive precise platform-calibrated dimensions.

2. **Reference Pill Hardening**:
   - Setting `rawY = sz.SAFE_TOP` ($300\text{px}$ scaled to $200\text{px}$ for 720p) and `rawX = sz.CENTER_X - pillW / 2` places the badge inside the guaranteed safe top zone.
   - Clamping with `clampToSafeZone({ x: rawX, y: rawY, width: pillW, height: pillH }, sz)` prevents horizontal or vertical boundary breaches.
   - Text rendering centered at `clamped.x + clamped.width / 2` ensures perfect alignment regardless of capsule expansion.

3. **Subtitle Horizontal Centering**:
   - Setting `cursorX = sz.CENTER_X - totalLineWidth / 2` guarantees that for any line where $\text{width} \le W_{\text{safe}}$:
     $$\text{Line Left} = \text{CENTER\_X} - \frac{\text{width}}{2} \ge (\text{SAFE\_LEFT} + \frac{W_{\text{safe}}}{2}) - \frac{W_{\text{safe}}}{2} = \text{SAFE\_LEFT}$$
     $$\text{Line Right} = \text{CENTER\_X} + \frac{\text{width}}{2} \le (\text{SAFE\_LEFT} + \frac{W_{\text{safe}}}{2}) + \frac{W_{\text{safe}}}{2} = W - \text{SAFE\_RIGHT}$$
   - This prevents text from colliding with TikTok's right sidebar action buttons.

4. **Subtitle Vertical Anchoring & Karaoke Pop Clamping**:
   - `rawAnchorY = getSubtitleAnchorY(sz, opts.style || opts.subtitlePosition)` returns $1420\text{px}$ for TikTok lower-third and $960\text{px}$ for Center mode.
   - In lower-third mode:
     - For the bottom line $i = \text{lines.length} - 1$, the baseline is $y_{\text{last}} = \text{baseY} + (\text{lines.length} - 1) \times \text{lineHeight}$.
     - When active words pop at $1.14\times$ scale with drop shadow, descenders reach $y_{\text{last}} + \text{fontSize} \times 0.35 \times 1.14$.
     - Clamping `targetBottomY = Math.min(rawAnchorY, sz.BOTTOM_MAX_Y - Math.ceil(activePhrase.fontSize * 0.35 * 1.14))` guarantees zero breach of `sz.BOTTOM_MAX_Y` ($1520\text{px}$ at 1080p, $1013\text{px}$ at 720p).
     - Setting `minTopY = sz.SAFE_TOP + pillH + MIN_VERTICAL_GAP` prevents multi-line subtitle blocks from overlapping the reference badge.

5. **Token Chunking & Auto-Fit Font Scaling**:
   - Chunking tokens in `wrapWords` when $\text{measureText}(w) > W_{\text{safe}}$ ensures unbreakable long words do not overflow.
   - Iterating font sizes in `chooseFontSize` from `maxSize` to `minSize` checking `lines.length <= maxLinesPerPage && allLinesFit` ensures deterministic containment.

---

## 3. Caveats

1. **Browser Video Codec Constraints**: `renderVideo` relies on browser `MediaRecorder`. On iOS Safari, VP9 WebM is not supported, and MP4 container fallback is required.
2. **Decorative Corner Accents**: Ornamental border strokes at $m = 80\text{px}$ are background framing elements outside safe zones, rendered only when `opts.style !== "minimal"`.
3. **No Direct Production Edits**: In accordance with the Explorer read-only protocol, changes have been fully drafted and tested in memory/simulations without directly overwriting `src/lib/render-video.ts`.

---

## 4. Conclusion & Proposed Implementation

### 4.1 Required Modifications Summary
| Target Item | Current Implementation | Proposed Hardened Implementation |
|---|---|---|
| Safe Zone Imports | None | Import `getSafeZone`, `scaleSafeZone`, `REFERENCE_PILL_STANDARDS`, `getSubtitleAnchorY`, `isWithinSafeZone`, `clampToSafeZone`, `type SafeZoneGeometry`, `type PlatformSafeZoneProfile` |
| Safe Boundary Model | Local symmetric `SAFE = { top: 320, bottom: 280, side: 180 }` | Derived `sz = is1080p ? baseSz : scaleSafeZone(baseSz, scale)` using `opts.subtitlePosition` |
| Usable Safe Width | `maxW = W - SAFE.side * 2` ($720\text{px}$) | `maxW = sz.W_SAFE` ($760\text{px}$ for TikTok, $840\text{px}$ for Reels, $506\text{px}$ for 720p) |
| Reference Pill Y | $Y = 280 \times \text{scale}$ | $Y = \text{sz.SAFE\_TOP}$ ($300\text{px}$ on 1080p, $200\text{px}$ on 720p) with `clampToSafeZone` |
| Reference Pill X | $X = (W - \text{pillW}) / 2$ ($540\text{px}$) | $X = \text{sz.CENTER\_X} - \text{pillW} / 2$ ($480\text{px}$ on TikTok) |
| Subtitle Center X | $W / 2 = 540\text{px}$ | `sz.CENTER_X` ($480\text{px}$ TikTok, $500\text{px}$ Reels, $490\text{px}$ Shorts, $320\text{px}$ 720p) |
| Subtitle Bottom Anchor | Fixed $H \times 0.74$ | `getSubtitleAnchorY(sz, opts.style \|\| opts.subtitlePosition)` clamped against `sz.BOTTOM_MAX_Y` with 1.14 pop headroom |
| Center Profile Support | Not supported | Centered vertically at `sz.H / 2` ($960\text{px}$) and horizontally at `sz.CENTER_X` ($540\text{px}$) |
| Word Wrapping | Simple space-split | Chunk long tokens > $W_{\text{safe}}$, check `allLinesFit` with Outfit font |

---

### 4.2 Proposed Code Replacement for `src/lib/render-video.ts`

```diff
--- a/src/lib/render-video.ts
+++ b/src/lib/render-video.ts
@@ -7,6 +7,16 @@
 
 import type { RenderOptions } from "./render-photo";
+import {
+  getSafeZone,
+  scaleSafeZone,
+  REFERENCE_PILL_STANDARDS,
+  getSubtitleAnchorY,
+  isWithinSafeZone,
+  clampToSafeZone,
+  type SafeZoneGeometry,
+  type PlatformSafeZoneProfile,
+} from "./safe-zone";
 
 export type WordSegment = { start: number; end: number };
 
@@ -33,14 +43,18 @@
 let SAFE = { top: 320, bottom: 280, side: 180 };
 
-function configureCanvasSize(ios: boolean, quality?: "1080p" | "720p") {
+function configureCanvasSize(
+  ios: boolean,
+  quality?: "1080p" | "720p",
+  platformProfile?: PlatformSafeZoneProfile | string,
+): { scale: number; sz: SafeZoneGeometry } {
   const is1080p = quality !== "720p"; // Strictly 1080p (1080x1920) by default
   const scale = is1080p ? 1 : 720 / 1080;
   W = is1080p ? 1080 : 720;
   H = is1080p ? 1920 : 1280;
+  const baseSz = getSafeZone(platformProfile || "tiktok");
+  const sz = is1080p ? baseSz : scaleSafeZone(baseSz, scale);
   SAFE = {
-    top: Math.round(320 * scale),
-    bottom: Math.round(280 * scale),
-    side: Math.round(180 * scale),
+    top: sz.SAFE_TOP,
+    bottom: sz.SAFE_BOTTOM,
+    side: sz.SAFE_LEFT,
   };
-  return scale;
+  return { scale, sz };
 }
 
@@ -131,14 +145,29 @@
 function wrapWords(ctx: CanvasRenderingContext2D, words: string[], maxWidth: number): string[][] {
   const lines: string[][] = [];
   let cur: string[] = [];
   for (const w of words) {
+    // If a single unbroken word exceeds maxWidth, break it into character chunks
+    if (ctx.measureText(w).width > maxWidth) {
+      if (cur.length) {
+        lines.push(cur);
+        cur = [];
+      }
+      let chunk = "";
+      for (const char of w) {
+        if (ctx.measureText(chunk + char).width > maxWidth && chunk) {
+          lines.push([chunk]);
+          chunk = char;
+        } else {
+          chunk += char;
+        }
+      }
+      if (chunk) cur.push(chunk);
+      continue;
+    }
+
     const test = [...cur, w].join(" ");
     if (ctx.measureText(test).width > maxWidth && cur.length) {
       lines.push(cur);
       cur = [w];
     } else cur.push(w);
   }
   if (cur.length) lines.push(cur);
   return lines;
 }
@@ -154,16 +183,21 @@
 function chooseFontSize(
   ctx: CanvasRenderingContext2D,
   fullText: string,
   maxWidth: number,
   maxHeight: number,
+  scale: number = 1.0,
 ): { fontSize: number; lineHeight: number } {
   const words = fullText.split(/\s+/).filter(Boolean);
   const wordCount = words.length;
   const readableMax = wordCount > 40 ? 64 : wordCount > 28 ? 75 : wordCount > 18 ? 88 : wordCount > 10 ? 98 : 112;
-  const maxSize = Math.round(readableMax * (W / 1080));
-  const minSize = Math.round(36 * (W / 1080));
+  const maxSize = Math.round(readableMax * scale);
+  const minSize = Math.round(36 * scale);
   for (let size = maxSize; size >= minSize; size -= 2) {
-    ctx.font = `900 ${size}px 'Inter', 'Outfit', 'Roboto', sans-serif`;
+    ctx.font = `700 ${size}px 'Outfit', 'Inter', sans-serif`;
     const lines = wrapWords(ctx, words, maxWidth);
     const lh = Math.round(size * 1.34);
     const maxLinesPerPage = Math.max(1, Math.floor(maxHeight / lh));
-    if (lines.length <= maxLinesPerPage) return { fontSize: size, lineHeight: lh };
+    const allLinesFit = lines.every((line) => {
+      const lineStr = line.join(" ");
+      return ctx.measureText(lineStr).width <= maxWidth + 0.01;
+    });
+    if (lines.length <= maxLinesPerPage && allLinesFit) return { fontSize: size, lineHeight: lh };
   }
   const size = minSize;
   return { fontSize: size, lineHeight: Math.round(size * 1.34) };
 }
 
@@ -249,33 +283,37 @@
-function drawReferencePill(ctx: CanvasRenderingContext2D, text: string) {
+function drawReferencePill(ctx: CanvasRenderingContext2D, text: string, sz: SafeZoneGeometry) {
+  if (!text || !text.trim()) return;
   ctx.save();
-  const scale = W / 1080;
-  const fontPx = Math.round(28 * scale);
+  const scale = sz.W / 1080;
+  const fontPx = Math.round(REFERENCE_PILL_STANDARDS.FONT_SIZE * scale);
   ctx.font = `500 ${fontPx}px 'Inter', system-ui, sans-serif`;
   const tw = ctx.measureText(text).width;
-  const padX = 28 * scale, padY = 14 * scale;
-  const pillW = tw + padX * 2;
+  const padX = Math.round(REFERENCE_PILL_STANDARDS.PAD_X * scale);
+  const padY = Math.round(REFERENCE_PILL_STANDARDS.PAD_Y * scale);
+  const pillW = Math.min(tw + padX * 2, sz.W_SAFE);
   const pillH = fontPx + padY * 2;
-  const x = (W - pillW) / 2;
-  const y = 280 * scale;
+  const rawX = sz.CENTER_X - pillW / 2;
+  const rawY = sz.SAFE_TOP;
+  const clamped = clampToSafeZone({ x: rawX, y: rawY, width: pillW, height: pillH }, sz);
+
   ctx.shadowBlur = 15;
   ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
   ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
-  roundRect(ctx, x, y, pillW, pillH, pillH / 2);
+  roundRect(ctx, clamped.x, clamped.y, clamped.width, clamped.height, clamped.height / 2);
   ctx.fill();
   
   // Glowing golden border
   ctx.shadowBlur = 10;
   ctx.shadowColor = "rgba(212, 175, 55, 0.4)";
   ctx.strokeStyle = "rgba(212, 175, 55, 0.8)";
   ctx.lineWidth = 2.0;
-  roundRect(ctx, x, y, pillW, pillH, pillH / 2);
+  roundRect(ctx, clamped.x, clamped.y, clamped.width, clamped.height, clamped.height / 2);
   ctx.stroke();
   
   // Premium typography for the reference
   ctx.shadowBlur = 0;
   ctx.fillStyle = "#f4c95d";
-  ctx.font = `bold ${24 * scale}px 'Inter', 'Roboto', sans-serif`;
+  ctx.font = `bold ${Math.round(24 * scale)}px 'Inter', 'Roboto', sans-serif`;
   ctx.textAlign = "center";
   ctx.textBaseline = "middle";
-  ctx.fillText(text, W / 2, y + pillH / 2 + 1);
+  ctx.fillText(text, clamped.x + clamped.width / 2, clamped.y + clamped.height / 2 + 1);
   ctx.restore();
 }
 
@@ -288,3 +326,3 @@
   const ios = isIOSDevice();
-  const scale = configureCanvasSize(ios, opts.quality);
+  const { scale, sz } = configureCanvasSize(ios, opts.quality, opts.subtitlePosition);
   const videoBitsPerSecond = opts.quality === "720p" ? 14_000_000 : 28_000_000;
@@ -523,4 +561,4 @@
   const allWords = opts.bulgarian.split(/\s+/).filter(Boolean);
-  const maxW = W - SAFE.side * 2;
-  const verticalForText = H - SAFE.top - SAFE.bottom;
+  const maxW = sz.W_SAFE;
+  const verticalForText = sz.H_SAFE;
 
@@ -724,3 +762,3 @@
     const text = p.words.join(" ");
-    const { fontSize: fs, lineHeight: lh } = chooseFontSize(ctx, text, maxW, verticalForText);
+    const { fontSize: fs, lineHeight: lh } = chooseFontSize(ctx, text, maxW, verticalForText, scale);
     ctx.font = `700 ${fs}px 'Outfit', 'Inter', sans-serif`;
@@ -916,7 +954,16 @@
       const blockH = activePhrase.lines.length * activePhrase.lineHeight;
-      // Position vertically lower down the screen (~74% down).
-      // As text gets bigger or has multiple lines, anchor downward vertically.
-      const targetBottomY = H * 0.74;
-      const baseY = targetBottomY - (activePhrase.lines.length - 1) * activePhrase.lineHeight;
+      const isCenter = opts.subtitlePosition === "center" || opts.style === "center";
+      const rawAnchorY = getSubtitleAnchorY(sz, opts.style || opts.subtitlePosition);
+      let baseY: number;
+      let centerY: number;
+
+      if (isCenter) {
+        baseY = rawAnchorY - blockH / 2 + activePhrase.lineHeight * 0.75;
+        centerY = rawAnchorY;
+      } else {
+        const maxAllowedBottomY = sz.BOTTOM_MAX_Y - Math.ceil(activePhrase.fontSize * 0.35 * 1.14);
+        const targetBottomY = Math.min(rawAnchorY, maxAllowedBottomY);
+        baseY = targetBottomY - (activePhrase.lines.length - 1) * activePhrase.lineHeight;
+        const minTopY = sz.SAFE_TOP + Math.round(REFERENCE_PILL_STANDARDS.FONT_SIZE * scale + REFERENCE_PILL_STANDARDS.PAD_Y * 2 * scale + REFERENCE_PILL_STANDARDS.MIN_VERTICAL_GAP * scale);
+        baseY = Math.max(minTopY, baseY);
+        centerY = baseY + blockH / 2 - activePhrase.lineHeight * 0.75;
+      }
 
       ctx.save();
-      const centerY = baseY + blockH / 2 - activePhrase.lineHeight * 0.75;
-      ctx.translate(W / 2, centerY);
+      ctx.translate(sz.CENTER_X, centerY);
       ctx.scale(popScale, popScale);
-      ctx.translate(-W / 2, -centerY);
+      ctx.translate(-sz.CENTER_X, -centerY);
 
@@ -947,3 +994,3 @@
         }, 0);
-        let cursorX = W / 2 - totalLineWidth / 2;
+        let cursorX = sz.CENTER_X - totalLineWidth / 2;
 
@@ -992,3 +1039,3 @@
     ctx.textAlign = "center";
 
-    drawReferencePill(ctx, opts.reference);
+    drawReferencePill(ctx, opts.reference, sz);
```

---

## 5. Verification Method

To verify the modifications:

1. **Unit & Registry Invariant Tests**:
   ```bash
   npx jiti src/lib/__tests__/verify-safe-zone.test.ts
   ```
   *Expectation: 53/53 tests pass.*

2. **E2E Layout & Safe Zones Suite**:
   ```bash
   npx jiti src/lib/__tests__/e2e-safe-zones-and-layout.test.ts
   ```
   *Expectation: 63/63 test assertions across Tiers 1-4 pass with 100% success.*

3. **Challenger Hardening Suites**:
   ```bash
   npx jiti src/lib/__tests__/adversarial-r1-r2-challenger.test.ts
   npx jiti src/lib/__tests__/adversarial-m2-challenger2.test.ts
   ```
   *Expectation: All adversarial layout tests and fuzzing iterations pass.*

4. **Geometry Invalidation Checks**:
   - TikTok 1080p: All rendered text lines satisfy $X_{\text{start}} \ge 100\text{px}$, $X_{\text{end}} \le 860\text{px}$, $Y_{\text{pill}} \ge 300\text{px}$, $Y_{\text{text,bottom}} \le 1520\text{px}$.
   - TikTok 720p: All text lines satisfy $X_{\text{start}} \ge 67\text{px}$, $X_{\text{end}} \le 573\text{px}$, $Y_{\text{pill}} \ge 200\text{px}$, $Y_{\text{text,bottom}} \le 1013\text{px}$.
   - Reference pill bottom and subtitle top maintain vertical clearance gap $\ge 24\text{px} \times \text{scale}$.
