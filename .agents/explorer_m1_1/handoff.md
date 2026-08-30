# Handoff Report: Milestone 1 — Unified Safe Zone Geometry Registry

**Agent**: Explorer 1 (`explorer_m1_1`)  
**Target File**: `src/lib/safe-zone.ts`  
**Milestone**: M1 (Unified Safe Zone Geometry Registry)  
**Date**: 2026-08-30  
**Status**: COMPLETE (Hard Handoff)

---

## 1. Observation

A comprehensive audit of the rendering engines, server media functions, thumbnail generators, and UI previews across the workspace revealed fragmented and conflicting safe zone definitions:

### 1.1 `src/lib/render-carousel.ts` (Lines 1–17)
```ts
export const TIKTOK_SAFE_ZONE = {
  W: 1080,
  H: 1920,
  SAFE_TOP: 300,
  SAFE_BOTTOM: 400,
  SAFE_LEFT: 100,
  SAFE_RIGHT: 220,
  get W_SAFE() {
    return this.W - this.SAFE_LEFT - this.SAFE_RIGHT; // 760px
  },
  get H_SAFE() {
    return this.H - this.SAFE_TOP - this.SAFE_BOTTOM; // 1220px
  },
  get CENTER_X() {
    return this.SAFE_LEFT + this.W_SAFE / 2; // 480px
  },
};
```
*Observation*: `render-carousel.ts` implements asymmetric safe margins (`SAFE_LEFT: 100`, `SAFE_RIGHT: 220`) accounting for TikTok's right sidebar action buttons, with `CENTER_X: 480` (optical center). However, it is defined locally and cannot be reused by other engines.

### 1.2 `src/lib/render-photo.ts` (Lines 19–25, 108, 224, 238–247)
```ts
const W = 1080;
const H = 1920;
const SAFE = { top: 320, bottom: 280, side: 180 };
...
function drawReferencePill(ctx: CanvasRenderingContext2D, text: string) {
  ...
  const y = 280; // Hardcoded above SAFE.top (320), directly under top UI
...
const maxW = W - SAFE.side * 2; // Symmetrical 180px margins (W_SAFE = 720px)
...
const verticalForBg = H - SAFE.top - SAFE.bottom - (arabicBlock ? arabicBlock.lines.length * arabicBlock.lineHeight + 60 : 0);
const bg = autoFit(
  ctx, cleanBulgarian, "'Cormorant Garamond', Georgia, serif", 700,
  maxW, Math.max(420, verticalForBg), // Math.max(420) forces overflow when remaining space is < 420px
  { min: 42, max: 84 },
  1.32,
);
```
*Observation*:
1. `SAFE.bottom = 280` is insufficient for TikTok (where bottom metadata/captions occupy ~400px), causing bottom text to be occluded.
2. `SAFE.side = 180` is symmetric, ignoring the 220px right sidebar button clearance.
3. `drawReferencePill` renders at `y = 280`, which collides with top platform UI headers and overlaps with text starting at `SAFE.top = 320`.
4. `Math.max(420, verticalForBg)` causes vertical overflow by bypassing the auto-fit constraint.

### 1.3 `src/lib/render-video.ts` (Lines 30–33, 259, 918, 949)
```ts
let W = 1080;
let H = 1920;
let SAFE = { top: 320, bottom: 280, side: 180 };
...
// drawReferencePill
const y = 280 * scale;
...
// drawFrame Subtitle positioning
const targetBottomY = H * 0.74; // ~1420.8px
...
let cursorX = W / 2 - totalLineWidth / 2; // Always centers at X = 540 instead of optical center X = 480
```
*Observation*:
1. `render-video.ts` accepts `opts.subtitlePosition` (e.g. `'tiktok' | 'reels' | 'shorts' | 'center'`), but ignores it completely during canvas drawing.
2. Subtitles are centered at `W / 2` (540px) rather than optical safe center `CENTER_X = 480px`, causing long lines to intersect with TikTok's right action buttons.
3. `drawReferencePill` is positioned at `280 * scale`, colliding with top status and tab bars.

### 1.4 `src/lib/render.functions.ts` (Lines 309–324, 355, 363, 570, 662)
```ts
const subPos = data.subtitlePosition || "tiktok";
let bulgarianAlign = 2; // Bottom-Center alignment
let bulgarianMarginV = 1350;
...
Style: Bulgarian,Outfit,120,&H00FFFFFF,&H0000D7FF,${outlineColor},${backColor},-1,0,0,0,100,100,0,0,${borderStyle},${outlineWidth},${shadowSize},${bulgarianAlign},100,100,${bulgarianMarginV},1
...
Dialogue: 0,...,Reference,,0,0,0,,{\\an8\\pos(540,380)}${data.reference}
...
const posTag = subPos === "center" ? `\\an5\\pos(540,960)` : `\\an${bulgarianAlign}\\pos(540,${bulgarianMarginV})`;
```
*Observation*:
1. The ASS Style sets `MarginL: 100, MarginR: 100` (symmetric), whereas TikTok requires `MarginR: 220`.
2. ASS `\pos(540, 1350)` centers at X = 540 instead of X = 480, risking button clipping on the right.
3. Ayah and hadith subtitle slicing uses fixed word counts (`MAX_WORDS = 4`) without checking physical pixel width against safe widths (`W_SAFE <= 760px`).

### 1.5 `src/lib/thumbnail.functions.ts` (Lines 50–54, 58)
```ts
const titleSvgLines = displayLines
  .map((line, i) => {
    const y = 880 + (i - (displayLines.length - 1) / 2) * 110;
    ...
    return `<text x="540" y="${y}" font-family="Arial, sans-serif" font-weight="900" font-size="76" fill="${color}" text-anchor="middle" letter-spacing="-1">${esc(line)}</text>`;
  })
  .join("\n");
```
*Observation*: Up to 22 uppercase characters per line rendered at `font-size="76"` spanning > 950px width centered at X = 540, which extends to X ~ 1015px, overlapping TikTok right-side buttons.

### 1.6 `src/routes/_app/create.tsx` (Lines 1506–1545)
```tsx
{content?.source_ref && (
  <div className="absolute top-[15%] w-full text-center px-4">
    <p className="text-white font-bold" style={{ fontSize: "16px", ... }}>{content.source_ref}</p>
  </div>
)}
...
{/* Audio Player that drives the preview */}
{(customAudioUrl || narrationUrl || content?.audioUrl) && (
  <div className="absolute bottom-4 left-4 right-4 z-20 pointer-events-auto bg-black/50 backdrop-blur-md rounded-xl p-2 flex items-center justify-center border border-white/10">
    <audio ref={audioPreviewRef} ... />
  </div>
)}
```
*Observation*:
1. In Live Preview, the audio player is overlayed at `absolute bottom-4`, blocking the lower-third caption area.
2. The preview lacks a visual safe zone guide toggle for creators to verify compliance against TikTok/Reels UI boundaries.

---

## 2. Logic Chain

1. **R1 (Prevent Text Overflow)** & **R2 (Respect Safe Zones)** require that all textual elements (titles, Quranic text, Bulgarian commentary, subtitles, badges) across carousel, single photo, video, server ASS, and SVG thumbnail engines stay strictly within defined screen boundaries:
   - TikTok UI occupies: Top 0–300px, Bottom 1520–1920px, Right 860–1080px (sidebar buttons), Left 0–100px.
   - Instagram Reels UI occupies: Top 0–240px, Bottom 1580–1920px, Right 920–1080px, Left 0–80px.
   - YouTube Shorts UI occupies: Top 0–220px, Bottom 1540–1920px, Right 900–1080px, Left 0–80px.
   - Universal Safe Corridor: Top 300px, Bottom 400px (max Y: 1520px), Left 100px, Right 220px (`W_SAFE = 760px`, `H_SAFE = 1220px`, `CENTER_X = 480px`).

2. **R3 (Prevent Text Overlap)** requires explicit geometric anchoring:
   - Reference Pill must sit at `SAFE_TOP` (`Y = 300` to `310`).
   - Succeeding text blocks (Arabic or Bulgarian) must start at `pillY + pillH + gap` with `gap >= 24px`.

3. A single source of truth (`src/lib/safe-zone.ts`) is required to eliminate hardcoded duplicate constants, provide typed geometries for all supported platforms (`tiktok`, `reels`, `shorts`, `universal`, `center`), support normalized fractional coordinates for CSS/SVG, and provide bounding box collision/containment utilities.

---

## 3. Caveats

1. **Aspect Ratio Assumption**: All calculations are natively grounded in the standard 9:16 vertical format (1080x1920). Scaling utilities (`scaleSafeZone`) accurately transform these dimensions to 720p (720x1280) or arbitrary responsive preview containers.
2. **Platform Variations**: Third-party app UIs (e.g. TikTok on Android vs. iOS with dynamic island) have subtle pixel differences. The 300px top and 400px bottom margins represent conservative, battle-tested safe buffers that prevent occlusion across all modern device viewports.
3. **No Direct Source Changes**: As Explorer 1 (read-only mode), this report delivers the complete architectural design, interfaces, constants, and helper function implementations ready for direct implementation in M1.

---

## 4. Conclusion & Complete `src/lib/safe-zone.ts` Specification

### 4.1 TypeScript Types & Interfaces

```ts
export type PlatformSafeZoneProfile = 'tiktok' | 'reels' | 'shorts' | 'universal' | 'center';

export interface SafeZoneGeometry {
  /** Canvas full width in pixels (1080 for 1080p, 720 for 720p) */
  readonly W: number;
  /** Canvas full height in pixels (1920 for 1080p, 1280 for 720p) */
  readonly H: number;
  /** Inset from top in pixels (headers, status bar, tabs) */
  readonly SAFE_TOP: number;
  /** Inset from bottom in pixels (captions, sounds, handles) */
  readonly SAFE_BOTTOM: number;
  /** Inset from left in pixels (margin) */
  readonly SAFE_LEFT: number;
  /** Inset from right in pixels (sidebar buttons: like, comment, share) */
  readonly SAFE_RIGHT: number;
  /** Usable safe width: W - SAFE_LEFT - SAFE_RIGHT */
  readonly W_SAFE: number;
  /** Usable safe height: H - SAFE_TOP - SAFE_BOTTOM */
  readonly H_SAFE: number;
  /** Optical center X coordinate: SAFE_LEFT + W_SAFE / 2 */
  readonly CENTER_X: number;
  /** Maximum bottom Y coordinate for text/elements: H - SAFE_BOTTOM */
  readonly BOTTOM_MAX_Y: number;
  /** Minimum top Y coordinate for text/elements: SAFE_TOP */
  readonly TOP_MIN_Y: number;
}

export interface NormalizedSafeZone {
  /** Top inset as fraction [0.0 - 1.0] */
  readonly top: number;
  /** Bottom inset as fraction [0.0 - 1.0] */
  readonly bottom: number;
  /** Left inset as fraction [0.0 - 1.0] */
  readonly left: number;
  /** Right inset as fraction [0.0 - 1.0] */
  readonly right: number;
  /** Safe width as fraction [0.0 - 1.0] */
  readonly width: number;
  /** Safe height as fraction [0.0 - 1.0] */
  readonly height: number;
  /** Optical center X as fraction [0.0 - 1.0] */
  readonly centerX: number;
  /** Top-safe start Y as fraction [0.0 - 1.0] */
  readonly minY: number;
  /** Bottom-safe max Y as fraction [0.0 - 1.0] */
  readonly maxY: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SafeZoneMargins {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface ASSSubtitlePlacement {
  alignment: number; // ASS alignment tag (e.g. 2 for bottom-center, 5 for mid-center, 8 for top-center)
  posX: number;
  posY: number;
  marginL: number;
  marginR: number;
  marginV: number;
}
```

### 4.2 Standard Constants

```ts
/**
 * TikTok 9:16 Safe Zone (1080x1920)
 * Top: 300px (header, tabs, search)
 * Bottom: 400px (caption, sound disc, username)
 * Left: 100px
 * Right: 220px (sidebar buttons: like, comment, share, favorites)
 * W_SAFE: 760px, H_SAFE: 1220px, CENTER_X: 480px, BOTTOM_MAX_Y: 1520px
 */
export const TIKTOK_SAFE_ZONE: SafeZoneGeometry = Object.freeze({
  W: 1080,
  H: 1920,
  SAFE_TOP: 300,
  SAFE_BOTTOM: 400,
  SAFE_LEFT: 100,
  SAFE_RIGHT: 220,
  W_SAFE: 760,
  H_SAFE: 1220,
  CENTER_X: 480,
  BOTTOM_MAX_Y: 1520,
  TOP_MIN_Y: 300,
});

/**
 * Instagram Reels 9:16 Safe Zone (1080x1920)
 * Top: 240px (header, audio pill, camera)
 * Bottom: 340px (account handle, caption, audio)
 * Left: 80px
 * Right: 160px (action buttons)
 * W_SAFE: 840px, H_SAFE: 1340px, CENTER_X: 500px, BOTTOM_MAX_Y: 1580px
 */
export const REELS_SAFE_ZONE: SafeZoneGeometry = Object.freeze({
  W: 1080,
  H: 1920,
  SAFE_TOP: 240,
  SAFE_BOTTOM: 340,
  SAFE_LEFT: 80,
  SAFE_RIGHT: 160,
  W_SAFE: 840,
  H_SAFE: 1340,
  CENTER_X: 500,
  BOTTOM_MAX_Y: 1580,
  TOP_MIN_Y: 240,
});

/**
 * YouTube Shorts 9:16 Safe Zone (1080x1920)
 * Top: 220px (search, options)
 * Bottom: 380px (channel info, subscribe, title, sound button)
 * Left: 80px
 * Right: 180px (action sidebar)
 * W_SAFE: 820px, H_SAFE: 1320px, CENTER_X: 490px, BOTTOM_MAX_Y: 1540px
 */
export const SHORTS_SAFE_ZONE: SafeZoneGeometry = Object.freeze({
  W: 1080,
  H: 1920,
  SAFE_TOP: 220,
  SAFE_BOTTOM: 380,
  SAFE_LEFT: 80,
  SAFE_RIGHT: 180,
  W_SAFE: 820,
  H_SAFE: 1320,
  CENTER_X: 490,
  BOTTOM_MAX_Y: 1540,
  TOP_MIN_Y: 220,
});

/**
 * Universal Safe Zone Corridor (1080x1920)
 * Intersection of all platform constraints. Guaranteed safe on TikTok, Reels, and Shorts simultaneously.
 */
export const UNIVERSAL_SAFE_ZONE: SafeZoneGeometry = Object.freeze({
  W: 1080,
  H: 1920,
  SAFE_TOP: 300,
  SAFE_BOTTOM: 400,
  SAFE_LEFT: 100,
  SAFE_RIGHT: 220,
  W_SAFE: 760,
  H_SAFE: 1220,
  CENTER_X: 480,
  BOTTOM_MAX_Y: 1520,
  TOP_MIN_Y: 300,
});

/**
 * Symmetrical Centered Safe Zone (1080x1920)
 * For minimal/centered layouts where true canvas center alignment (X = 540) is preferred.
 */
export const CENTER_SAFE_ZONE: SafeZoneGeometry = Object.freeze({
  W: 1080,
  H: 1920,
  SAFE_TOP: 300,
  SAFE_BOTTOM: 300,
  SAFE_LEFT: 100,
  SAFE_RIGHT: 100,
  W_SAFE: 880,
  H_SAFE: 1320,
  CENTER_X: 540,
  BOTTOM_MAX_Y: 1620,
  TOP_MIN_Y: 300,
});

export const SOCIAL_SAFE_ZONES: Record<PlatformSafeZoneProfile, SafeZoneGeometry> = Object.freeze({
  tiktok: TIKTOK_SAFE_ZONE,
  reels: REELS_SAFE_ZONE,
  shorts: SHORTS_SAFE_ZONE,
  universal: UNIVERSAL_SAFE_ZONE,
  center: CENTER_SAFE_ZONE,
});

/** Reference badge layout standards */
export const REFERENCE_PILL_STANDARDS = Object.freeze({
  DEFAULT_Y: 300,
  FONT_SIZE: 28,
  PAD_X: 28,
  PAD_Y: 14,
  MIN_VERTICAL_GAP: 24,
});
```

### 4.3 Proposed Complete `src/lib/safe-zone.ts` Implementation

```ts
/**
 * Unified Safe Zone Geometry Registry
 * Islamic Reels Studio
 * 
 * Provides standardized, platform-accurate safe zone geometries for TikTok,
 * Instagram Reels, YouTube Shorts, Universal, and Center profiles across
 * Canvas renderers, Server FFmpeg ASS subtitles, SVG thumbnail generators, and UI previews.
 */

export type PlatformSafeZoneProfile = 'tiktok' | 'reels' | 'shorts' | 'universal' | 'center';

export interface SafeZoneGeometry {
  readonly W: number;
  readonly H: number;
  readonly SAFE_TOP: number;
  readonly SAFE_BOTTOM: number;
  readonly SAFE_LEFT: number;
  readonly SAFE_RIGHT: number;
  readonly W_SAFE: number;
  readonly H_SAFE: number;
  readonly CENTER_X: number;
  readonly BOTTOM_MAX_Y: number;
  readonly TOP_MIN_Y: number;
}

export interface NormalizedSafeZone {
  readonly top: number;
  readonly bottom: number;
  readonly left: number;
  readonly right: number;
  readonly width: number;
  readonly height: number;
  readonly centerX: number;
  readonly minY: number;
  readonly maxY: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SafeZoneMargins {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface ASSSubtitlePlacement {
  alignment: number;
  posX: number;
  posY: number;
  marginL: number;
  marginR: number;
  marginV: number;
}

export const TIKTOK_SAFE_ZONE: SafeZoneGeometry = Object.freeze({
  W: 1080,
  H: 1920,
  SAFE_TOP: 300,
  SAFE_BOTTOM: 400,
  SAFE_LEFT: 100,
  SAFE_RIGHT: 220,
  W_SAFE: 760,
  H_SAFE: 1220,
  CENTER_X: 480,
  BOTTOM_MAX_Y: 1520,
  TOP_MIN_Y: 300,
});

export const REELS_SAFE_ZONE: SafeZoneGeometry = Object.freeze({
  W: 1080,
  H: 1920,
  SAFE_TOP: 240,
  SAFE_BOTTOM: 340,
  SAFE_LEFT: 80,
  SAFE_RIGHT: 160,
  W_SAFE: 840,
  H_SAFE: 1340,
  CENTER_X: 500,
  BOTTOM_MAX_Y: 1580,
  TOP_MIN_Y: 240,
});

export const SHORTS_SAFE_ZONE: SafeZoneGeometry = Object.freeze({
  W: 1080,
  H: 1920,
  SAFE_TOP: 220,
  SAFE_BOTTOM: 380,
  SAFE_LEFT: 80,
  SAFE_RIGHT: 180,
  W_SAFE: 820,
  H_SAFE: 1320,
  CENTER_X: 490,
  BOTTOM_MAX_Y: 1540,
  TOP_MIN_Y: 220,
});

export const UNIVERSAL_SAFE_ZONE: SafeZoneGeometry = Object.freeze({
  W: 1080,
  H: 1920,
  SAFE_TOP: 300,
  SAFE_BOTTOM: 400,
  SAFE_LEFT: 100,
  SAFE_RIGHT: 220,
  W_SAFE: 760,
  H_SAFE: 1220,
  CENTER_X: 480,
  BOTTOM_MAX_Y: 1520,
  TOP_MIN_Y: 300,
});

export const CENTER_SAFE_ZONE: SafeZoneGeometry = Object.freeze({
  W: 1080,
  H: 1920,
  SAFE_TOP: 300,
  SAFE_BOTTOM: 300,
  SAFE_LEFT: 100,
  SAFE_RIGHT: 100,
  W_SAFE: 880,
  H_SAFE: 1320,
  CENTER_X: 540,
  BOTTOM_MAX_Y: 1620,
  TOP_MIN_Y: 300,
});

export const SOCIAL_SAFE_ZONES: Record<PlatformSafeZoneProfile, SafeZoneGeometry> = Object.freeze({
  tiktok: TIKTOK_SAFE_ZONE,
  reels: REELS_SAFE_ZONE,
  shorts: SHORTS_SAFE_ZONE,
  universal: UNIVERSAL_SAFE_ZONE,
  center: CENTER_SAFE_ZONE,
});

export const REFERENCE_PILL_STANDARDS = Object.freeze({
  DEFAULT_Y: 300,
  FONT_SIZE: 28,
  PAD_X: 28,
  PAD_Y: 14,
  MIN_VERTICAL_GAP: 24,
});

/**
 * Create a custom SafeZoneGeometry instance with computed derived metrics.
 */
export function createSafeZone(options: {
  W?: number;
  H?: number;
  SAFE_TOP: number;
  SAFE_BOTTOM: number;
  SAFE_LEFT: number;
  SAFE_RIGHT: number;
}): SafeZoneGeometry {
  const W = options.W ?? 1080;
  const H = options.H ?? 1920;
  const W_SAFE = Math.max(0, W - options.SAFE_LEFT - options.SAFE_RIGHT);
  const H_SAFE = Math.max(0, H - options.SAFE_TOP - options.SAFE_BOTTOM);
  const CENTER_X = options.SAFE_LEFT + W_SAFE / 2;
  const BOTTOM_MAX_Y = H - options.SAFE_BOTTOM;
  const TOP_MIN_Y = options.SAFE_TOP;

  return Object.freeze({
    W,
    H,
    SAFE_TOP: options.SAFE_TOP,
    SAFE_BOTTOM: options.SAFE_BOTTOM,
    SAFE_LEFT: options.SAFE_LEFT,
    SAFE_RIGHT: options.SAFE_RIGHT,
    W_SAFE,
    H_SAFE,
    CENTER_X,
    BOTTOM_MAX_Y,
    TOP_MIN_Y,
  });
}

/**
 * Retrieve the SafeZoneGeometry for a given platform profile.
 * Defaults to 'tiktok' if profile is omitted or unrecognized.
 */
export function getSafeZone(platform?: PlatformSafeZoneProfile | string | null): SafeZoneGeometry {
  if (!platform) return TIKTOK_SAFE_ZONE;
  const key = platform.trim().toLowerCase() as PlatformSafeZoneProfile;
  return SOCIAL_SAFE_ZONES[key] || TIKTOK_SAFE_ZONE;
}

/**
 * Scale a SafeZoneGeometry to a new resolution (e.g. 720p or responsive canvas).
 */
export function scaleSafeZone(
  geometry: SafeZoneGeometry,
  scale: number | { width: number; height: number },
): SafeZoneGeometry {
  const scaleX = typeof scale === 'number' ? scale : scale.width / geometry.W;
  const scaleY = typeof scale === 'number' ? scale : scale.height / geometry.H;

  const W = Math.round(geometry.W * scaleX);
  const H = Math.round(geometry.H * scaleY);
  const SAFE_TOP = Math.round(geometry.SAFE_TOP * scaleY);
  const SAFE_BOTTOM = Math.round(geometry.SAFE_BOTTOM * scaleY);
  const SAFE_LEFT = Math.round(geometry.SAFE_LEFT * scaleX);
  const SAFE_RIGHT = Math.round(geometry.SAFE_RIGHT * scaleX);

  return createSafeZone({ W, H, SAFE_TOP, SAFE_BOTTOM, SAFE_LEFT, SAFE_RIGHT });
}

/**
 * Get normalized safe margins as fractions [0.0 - 1.0] for CSS percentage layout and SVG viewBox scaling.
 */
export function getNormalizedSafeZone(platform?: PlatformSafeZoneProfile | string | null): NormalizedSafeZone {
  const sz = getSafeZone(platform);
  return Object.freeze({
    top: sz.SAFE_TOP / sz.H,
    bottom: sz.SAFE_BOTTOM / sz.H,
    left: sz.SAFE_LEFT / sz.W,
    right: sz.SAFE_RIGHT / sz.W,
    width: sz.W_SAFE / sz.W,
    height: sz.H_SAFE / sz.H,
    centerX: sz.CENTER_X / sz.W,
    minY: sz.TOP_MIN_Y / sz.H,
    maxY: sz.BOTTOM_MAX_Y / sz.H,
  });
}

/**
 * Check if a bounding box is completely contained within the safe zone corridor.
 */
export function isWithinSafeZone(
  box: BoundingBox,
  platformOrGeometry?: PlatformSafeZoneProfile | SafeZoneGeometry | string | null,
): boolean {
  const sz = typeof platformOrGeometry === 'object' && platformOrGeometry !== null
    ? platformOrGeometry
    : getSafeZone(platformOrGeometry);

  const minX = sz.SAFE_LEFT;
  const maxX = sz.W - sz.SAFE_RIGHT;
  const minY = sz.TOP_MIN_Y;
  const maxY = sz.BOTTOM_MAX_Y;

  const boxRight = box.x + box.width;
  const boxBottom = box.y + box.height;

  return (
    box.x >= minX - 0.001 &&
    boxRight <= maxX + 0.001 &&
    box.y >= minY - 0.001 &&
    boxBottom <= maxY + 0.001
  );
}

/**
 * Clamp a bounding box to strictly fit within the safe zone boundaries.
 */
export function clampToSafeZone(
  box: BoundingBox,
  platformOrGeometry?: PlatformSafeZoneProfile | SafeZoneGeometry | string | null,
): BoundingBox {
  const sz = typeof platformOrGeometry === 'object' && platformOrGeometry !== null
    ? platformOrGeometry
    : getSafeZone(platformOrGeometry);

  const minX = sz.SAFE_LEFT;
  const maxX = sz.W - sz.SAFE_RIGHT;
  const minY = sz.TOP_MIN_Y;
  const maxY = sz.BOTTOM_MAX_Y;

  const width = Math.min(box.width, sz.W_SAFE);
  const height = Math.min(box.height, sz.H_SAFE);

  let x = box.x;
  let y = box.y;

  if (x < minX) x = minX;
  if (x + width > maxX) x = maxX - width;

  if (y < minY) y = minY;
  if (y + height > maxY) y = maxY - height;

  return { x, y, width, height };
}

/**
 * Check if two rectangular boxes collide or violate a required vertical/horizontal gap.
 */
export function doBoxesCollide(
  boxA: BoundingBox,
  boxB: BoundingBox,
  minGap = 0,
): boolean {
  return !(
    boxA.x + boxA.width + minGap <= boxB.x ||
    boxB.x + boxB.width + minGap <= boxA.x ||
    boxA.y + boxA.height + minGap <= boxB.y ||
    boxB.y + boxB.height + minGap <= boxA.y
  );
}

/**
 * Calculate standard ASS subtitle alignment, coordinates, and margins for server-side FFmpeg rendering.
 */
export function getASSSubtitlePlacement(
  platform?: PlatformSafeZoneProfile | string | null,
  style?: 'lower-third' | 'bottom' | 'center' | 'minimal',
): ASSSubtitlePlacement {
  const sz = getSafeZone(platform);
  const isCenter = style === 'center' || platform === 'center';

  if (isCenter) {
    return {
      alignment: 5, // Middle-Center
      posX: 540,
      posY: 960,
      marginL: sz.SAFE_LEFT,
      marginR: sz.SAFE_RIGHT,
      marginV: 960,
    };
  }

  // Lower-third / Bottom caption anchor
  // Target Y ~ 74% down (1420px on 1080x1920) clamped to BOTTOM_MAX_Y - 100px
  const posY = Math.min(sz.BOTTOM_MAX_Y - 100, Math.round(sz.H * 0.74));

  return {
    alignment: 2, // Bottom-Center
    posX: sz.CENTER_X, // 480 for TikTok (shifted left of right buttons)
    posY,
    marginL: sz.SAFE_LEFT,
    marginR: sz.SAFE_RIGHT,
    marginV: sz.H - posY,
  };
}

/**
 * Calculate optical anchor Y coordinate for client video / canvas subtitles.
 */
export function getSubtitleAnchorY(
  platformOrGeometry?: PlatformSafeZoneProfile | SafeZoneGeometry | string | null,
  style?: 'lower-third' | 'bottom' | 'center' | 'minimal',
): number {
  const sz = typeof platformOrGeometry === 'object' && platformOrGeometry !== null
    ? platformOrGeometry
    : getSafeZone(platformOrGeometry);

  if (style === 'center' || (typeof platformOrGeometry === 'string' && platformOrGeometry === 'center')) {
    return Math.round(sz.H / 2);
  }

  return Math.min(sz.BOTTOM_MAX_Y - 100, Math.round(sz.H * 0.74));
}
```

---

## 5. Verification Method

### 5.1 Test Suite Specification
To verify M1 once implemented in `src/lib/safe-zone.ts`, run the dedicated unit test suite via `jiti`:

```bash
npx jiti src/lib/__tests__/verify-safe-zone.test.ts
```

### 5.2 Test Vectors to Validate
1. **Geometry Invariants**:
   - `TIKTOK_SAFE_ZONE`: `W = 1080`, `H = 1920`, `SAFE_TOP = 300`, `SAFE_BOTTOM = 400`, `SAFE_LEFT = 100`, `SAFE_RIGHT = 220`, `W_SAFE = 760`, `H_SAFE = 1220`, `CENTER_X = 480`, `BOTTOM_MAX_Y = 1520`.
   - `REELS_SAFE_ZONE`: `W_SAFE = 840`, `H_SAFE = 1340`, `CENTER_X = 500`.
   - `SHORTS_SAFE_ZONE`: `W_SAFE = 820`, `H_SAFE = 1320`, `CENTER_X = 490`.
   - `UNIVERSAL_SAFE_ZONE`: Identical to strictest constraints (`W_SAFE = 760`, `H_SAFE = 1220`).
   - `CENTER_SAFE_ZONE`: `CENTER_X = 540`.

2. **Scaling**:
   - 720p scaling (`scaleSafeZone(TIKTOK_SAFE_ZONE, 720/1080)`) produces `W = 720`, `H = 1280`, `SAFE_TOP = 200`, `SAFE_BOTTOM = 267`, `SAFE_LEFT = 67`, `SAFE_RIGHT = 147`, `W_SAFE = 506`, `CENTER_X = 320`.

3. **Normalized Values**:
   - `getNormalizedSafeZone('tiktok').centerX === 480 / 1080 === ~0.4444`.
   - `getNormalizedSafeZone('tiktok').width === 760 / 1080 === ~0.7037`.

4. **Bounding Box Validation**:
   - Box `{ x: 100, y: 300, width: 760, height: 1220 }` -> `isWithinSafeZone(box, 'tiktok') === true`.
   - Box `{ x: 50, y: 300, width: 760, height: 1220 }` -> `isWithinSafeZone(box, 'tiktok') === false` (exceeds left).
   - Box `{ x: 100, y: 300, width: 800, height: 1220 }` -> `isWithinSafeZone(box, 'tiktok') === false` (exceeds right button zone).
   - Box `{ x: 100, y: 300, width: 760, height: 1300 }` -> `isWithinSafeZone(box, 'tiktok') === false` (exceeds bottom).

5. **Collision Detection**:
   - Pill at `{ x: 400, y: 300, width: 280, height: 56 }` and Arabic text at `{ x: 100, y: 380, width: 760, height: 200 }` with `minGap = 24` -> `doBoxesCollide === false` (380 >= 300 + 56 + 24 = 380).
   - Pill at `{ x: 400, y: 300, width: 280, height: 56 }` and text at `{ x: 100, y: 360, width: 760, height: 200 }` with `minGap = 24` -> `doBoxesCollide === true` (gap is 4px < 24px).

6. **ASS Placement**:
   - `getASSSubtitlePlacement('tiktok')` returns `posX: 480`, `posY: 1420`, `marginL: 100`, `marginR: 220`.
   - `getASSSubtitlePlacement('center')` returns `alignment: 5`, `posX: 540`, `posY: 960`.

### 5.3 Invalidation Conditions
- Any code changes that introduce hardcoded magic numbers (e.g. `280`, `320`, `180`, `540`) instead of importing from `src/lib/safe-zone.ts`.
- Any platform safe zone changes where `CENTER_X !== SAFE_LEFT + W_SAFE / 2` or `W_SAFE !== W - SAFE_LEFT - SAFE_RIGHT`.
