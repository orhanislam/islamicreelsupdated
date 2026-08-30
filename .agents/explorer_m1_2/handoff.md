# M1 Unified Safe Zone Geometry Registry Analysis & Architecture Specification

**Role**: Explorer 2 (Milestone 1 — Unified Safe Zone Geometry Registry)  
**Target File**: `src/lib/safe-zone.ts`  
**Working Directory**: `.agents/explorer_m1_2`  
**Date**: 2026-08-30  

---

## 1. Observation

Direct examination of the codebase across rendering and preview modules revealed redundant, inconsistent, and conflicting layout constants and safe zone dimensions:

### A. Existing Safe Zone Definitions & Redundancies
1. **`src/lib/render-carousel.ts` (Lines 1–17)**:
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
     get CENTER_X() { return this.SAFE_LEFT + this.W_SAFE / 2; }, // 480px
   };
   ```
   *Observed*: `TIKTOK_SAFE_ZONE` is currently isolated to `render-carousel.ts`. All test suites in `src/lib/__tests__/` (`adversarial-r1-r2-challenger.test.ts`, `adversarial-r2-reviewer-stress.test.ts`, `verify-carousel-upgrade.test.ts`, etc.) import `TIKTOK_SAFE_ZONE` directly from `render-carousel.ts`.

2. **`src/lib/render-photo.ts` (Lines 19–25, 108, 224, 243)**:
   - Line 19–20: `const W = 1080; const H = 1920;`
   - Line 24: `const SAFE = { top: 320, bottom: 280, side: 180 };` (symmetric side margin 180px gives `maxW = 720px`, but renders at $X = W / 2 = 540\text{px}$, causing text to intrude into TikTok right-side UI buttons at $X > 860\text{px}$).
   - Line 108: `drawReferencePill`: `const y = 280;` and pill height is $56\text{px}$, ending at $Y=336\text{px}$.
   - Line 253, 268, 273: `drawText(ctx, ..., SAFE.top, ...)` where `SAFE.top = 320px`, causing Arabic text to overlap the reference pill ($Y \in [280, 336]\text{px}$).
   - Line 243: `Math.max(420, verticalForBg)` overrides available vertical space, allowing text to overflow past $Y=1520\text{px}$.

3. **`src/lib/render-video.ts` (Lines 30–47, 259, 918, 949)**:
   - Line 30–32: `let W = 1080; let H = 1920; let SAFE = { top: 320, bottom: 280, side: 180 };`
   - Line 41–45: `SAFE = { top: Math.round(320 * scale), bottom: Math.round(280 * scale), side: Math.round(180 * scale) };`
   - Line 259: `drawReferencePill`: `const y = 280 * scale;`
   - Line 918: `const targetBottomY = H * 0.74;` (hardcoded $1420.8\text{px}$).
   - Line 949: `let cursorX = W / 2 - totalLineWidth / 2;` (centered at $X=540\text{px}$ instead of TikTok safe center $X=480\text{px}$).

4. **`src/lib/render.functions.ts` (Lines 310–356, 363, 570, 662)**:
   - Line 311: `let bulgarianMarginV = 1350;`
   - Line 354: `Style: Arabic,Scheherazade New,100,...,MarginL: 50, MarginR: 50, MarginV: 300, 1`
   - Line 355: `Style: Bulgarian,Outfit,120,...,MarginL: 100, MarginR: 100, MarginV: ${bulgarianMarginV}, 1` (symmetric margins 100/100 allow text to reach $X=980\text{px}$, well into TikTok's right sidebar button zone).
   - Line 356: `Style: Reference,Outfit,70,...,MarginV: 380, 1`
   - Line 363: `{\\an8\\pos(540,380)}`
   - Line 570, 662: `\pos(540, 960)` or `\pos(540, ${bulgarianMarginV})`

5. **`src/lib/thumbnail.functions.ts` (Lines 38, 50, 53)**:
   - Line 38: `(current + " " + w).length > 22`
   - Line 53: `<text x="540" y="${y}" font-family="Arial, sans-serif" font-weight="900" font-size="76" fill="${color}" text-anchor="middle" letter-spacing="-1">` (centered at $X=540\text{px}$, breaching TikTok right sidebar at $X > 860\text{px}$).

6. **`src/routes/_app/create.tsx` (Lines 1507, 1515, 1543)**:
   - Line 1507: Reference text placed at `top-[15%]` ($288\text{px}$) instead of safe top ($300\text{px}$ / $15.625\%$).
   - Line 1515: Subtitle preview centered vertically regardless of `subtitlePosition` profile.
   - Line 1543: `<audio>` player element docked inside the 9:16 frame at `bottom-4 left-4 right-4`, obscuring lower-third subtitles.

---

## 2. Logic Chain

### Step 1: Geometric Derivation of Platform Safe Zones
A standard 9:16 vertical canvas has resolution $1080 \times 1920\text{px}$. Social media platforms render persistent UI overlays (top navigation, right interaction column, bottom captions/metadata) that obstruct content unless constrained within platform-specific bounding corridors:

$$\begin{aligned}
W_{safe} &= W - SAFE\_LEFT - SAFE\_RIGHT \\
H_{safe} &= H - SAFE\_TOP - SAFE\_BOTTOM \\
CENTER\_X &= SAFE\_LEFT + \frac{W_{safe}}{2} = SAFE\_LEFT + \frac{W - SAFE\_LEFT - SAFE\_RIGHT}{2} = \frac{W + SAFE\_LEFT - SAFE\_RIGHT}{2} \\
BOTTOM\_MAX\_Y &= H - SAFE\_BOTTOM
\end{aligned}$$

#### Exact Profile Calculations:
1. **TikTok (`tiktok`)**:
   - $W=1080, H=1920$
   - $SAFE\_TOP = 300\text{px}$ (clears header tabs, search icon, live badge)
   - $SAFE\_BOTTOM = 400\text{px}$ (clears user handle, caption text, sound marquee, progress bar)
   - $SAFE\_LEFT = 100\text{px}$ (clears left screen margin)
   - $SAFE\_RIGHT = 220\text{px}$ (clears avatar, like, comment, bookmark, share, rotating vinyl disc)
   - **$W_{safe} = 1080 - 100 - 220 = 760\text{px}$**
   - **$H_{safe} = 1920 - 300 - 400 = 1220\text{px}$**
   - **$CENTER\_X = 100 + \frac{760}{2} = 480\text{px}$**
   - **$BOTTOM\_MAX\_Y = 1920 - 400 = 1520\text{px}$**
   - Safe Horizontal Span: $X \in [100, 860]\text{px}$
   - Safe Vertical Span: $Y \in [300, 1520]\text{px}$

2. **Instagram Reels (`reels`)**:
   - $W=1080, H=1920$
   - $SAFE\_TOP = 280\text{px}$ (clears Reels header/camera controls)
   - $SAFE\_BOTTOM = 360\text{px}$ (clears username, audio track, caption preview)
   - $SAFE\_LEFT = 80\text{px}$ (left margin)
   - $SAFE\_RIGHT = 160\text{px}$ (clears like, comment, send, remix icons)
   - **$W_{safe} = 1080 - 80 - 160 = 840\text{px}$**
   - **$H_{safe} = 1920 - 280 - 360 = 1280\text{px}$**
   - **$CENTER\_X = 80 + \frac{840}{2} = 500\text{px}$**
   - **$BOTTOM\_MAX\_Y = 1920 - 360 = 1560\text{px}$**
   - Safe Horizontal Span: $X \in [80, 920]\text{px}$
   - Safe Vertical Span: $Y \in [280, 1560]\text{px}$

3. **YouTube Shorts (`shorts`)**:
   - $W=1080, H=1920$
   - $SAFE\_TOP = 280\text{px}$ (clears search, 3 dots menu)
   - $SAFE\_BOTTOM = 380\text{px}$ (clears subscribe button, sound title, scrubber bar)
   - $SAFE\_LEFT = 80\text{px}$
   - $SAFE\_RIGHT = 160\text{px}$ (clears like/dislike, comments, share, remix)
   - **$W_{safe} = 1080 - 80 - 160 = 840\text{px}$**
   - **$H_{safe} = 1920 - 280 - 380 = 1260\text{px}$**
   - **$CENTER\_X = 80 + \frac{840}{2} = 500\text{px}$**
   - **$BOTTOM\_MAX\_Y = 1920 - 380 = 1540\text{px}$**
   - Safe Horizontal Span: $X \in [80, 920]\text{px}$
   - Safe Vertical Span: $Y \in [280, 1540]\text{px}$

4. **Universal Corridor (`universal`)**:
   - Strictest bounding intersection across all platforms:
   - $SAFE\_TOP = \max(300, 280, 280) = 300\text{px}$
   - $SAFE\_BOTTOM = \max(400, 360, 380) = 400\text{px}$
   - $SAFE\_LEFT = \max(100, 80, 80) = 100\text{px}$
   - $SAFE\_RIGHT = \max(220, 160, 160) = 220\text{px}$
   - **$W_{safe} = 760\text{px}$**, **$H_{safe} = 1220\text{px}$**, **$CENTER\_X = 480\text{px}$**, **$BOTTOM\_MAX\_Y = 1520\text{px}$**

5. **Center / Minimal Profile (`center`)**:
   - Symmetric centering for uncluttered presentation:
   - $SAFE\_TOP = 300\text{px}$, $SAFE\_BOTTOM = 300\text{px}$, $SAFE\_LEFT = 100\text{px}$, $SAFE\_RIGHT = 100\text{px}$
   - **$W_{safe} = 880\text{px}$**, **$H_{safe} = 1320\text{px}$**, **$CENTER\_X = 540\text{px}$**, **$BOTTOM\_MAX\_Y = 1620\text{px}$**

---

### Step 2: Architecture of `src/lib/safe-zone.ts`

To guarantee 100% type safety, immutability, zero-dependency calculation, and seamless integration across canvas, SVG, ASS, and CSS preview engines, `src/lib/safe-zone.ts` should be structured as follows:

```ts
/**
 * src/lib/safe-zone.ts
 *
 * Centralized Safe Zone Geometry Registry for 9:16 vertical video & carousel compositions.
 * Defines standard safe corridors for TikTok, Instagram Reels, YouTube Shorts, and Universal layouts.
 */

export type PlatformSafeZoneProfile = "tiktok" | "reels" | "shorts" | "universal" | "center";

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
}

export interface SafeCorridor {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export interface SafeOverlayCss {
  topPercent: string;
  bottomPercent: string;
  leftPercent: string;
  rightPercent: string;
  centerXPercent: string;
}

export interface SafeAssStyleConfig {
  marginL: number;
  marginR: number;
  marginV: number;
  align: number;
  posX: number;
  posY: number;
  refPosX: number;
  refPosY: number;
}

function createGeometry(
  W: number,
  H: number,
  SAFE_TOP: number,
  SAFE_BOTTOM: number,
  SAFE_LEFT: number,
  SAFE_RIGHT: number,
): SafeZoneGeometry {
  const W_SAFE = W - SAFE_LEFT - SAFE_RIGHT;
  const H_SAFE = H - SAFE_TOP - SAFE_BOTTOM;
  const CENTER_X = SAFE_LEFT + Math.round(W_SAFE / 2);
  const BOTTOM_MAX_Y = H - SAFE_BOTTOM;
  return Object.freeze({
    W,
    H,
    SAFE_TOP,
    SAFE_BOTTOM,
    SAFE_LEFT,
    SAFE_RIGHT,
    W_SAFE,
    H_SAFE,
    CENTER_X,
    BOTTOM_MAX_Y,
  });
}

export const TIKTOK_SAFE_ZONE: SafeZoneGeometry = createGeometry(1080, 1920, 300, 400, 100, 220);
export const REELS_SAFE_ZONE: SafeZoneGeometry = createGeometry(1080, 1920, 280, 360, 80, 160);
export const SHORTS_SAFE_ZONE: SafeZoneGeometry = createGeometry(1080, 1920, 280, 380, 80, 160);
export const UNIVERSAL_SAFE_ZONE: SafeZoneGeometry = createGeometry(1080, 1920, 300, 400, 100, 220);
export const CENTER_SAFE_ZONE: SafeZoneGeometry = createGeometry(1080, 1920, 300, 300, 100, 100);

export const SOCIAL_SAFE_ZONES: Record<PlatformSafeZoneProfile, SafeZoneGeometry> = Object.freeze({
  tiktok: TIKTOK_SAFE_ZONE,
  reels: REELS_SAFE_ZONE,
  shorts: SHORTS_SAFE_ZONE,
  universal: UNIVERSAL_SAFE_ZONE,
  center: CENTER_SAFE_ZONE,
});

/**
 * Retrieve safe zone geometry for a given platform profile.
 * Defaults gracefully to 'tiktok' for undefined/unknown profiles.
 */
export function getSafeZone(profile?: PlatformSafeZoneProfile | string | null): SafeZoneGeometry {
  if (profile && profile in SOCIAL_SAFE_ZONES) {
    return SOCIAL_SAFE_ZONES[profile as PlatformSafeZoneProfile];
  }
  return TIKTOK_SAFE_ZONE;
}

/**
 * Retrieve the bounding corridor coordinates.
 */
export function getSafeCorridor(profile?: PlatformSafeZoneProfile | string | null): SafeCorridor {
  const g = getSafeZone(profile);
  return {
    left: g.SAFE_LEFT,
    right: g.W - g.SAFE_RIGHT,
    top: g.SAFE_TOP,
    bottom: g.BOTTOM_MAX_Y,
    width: g.W_SAFE,
    height: g.H_SAFE,
    centerX: g.CENTER_X,
    centerY: g.SAFE_TOP + Math.round(g.H_SAFE / 2),
  };
}

/**
 * Scale geometry for lower-resolution rendering (e.g. 720x1280 mobile canvas rendering).
 */
export function scaleSafeZone(geomOrProfile: SafeZoneGeometry | PlatformSafeZoneProfile | string, scale: number): SafeZoneGeometry {
  const g = typeof geomOrProfile === "string" ? getSafeZone(geomOrProfile) : geomOrProfile;
  return createGeometry(
    Math.round(g.W * scale),
    Math.round(g.H * scale),
    Math.round(g.SAFE_TOP * scale),
    Math.round(g.SAFE_BOTTOM * scale),
    Math.round(g.SAFE_LEFT * scale),
    Math.round(g.SAFE_RIGHT * scale),
  );
}

/**
 * Verify whether a bounding box [x, x + width] x [y, y + height] falls strictly within safe bounds.
 */
export function isWithinSafeZone(
  x: number,
  y: number,
  width: number,
  height: number,
  profile?: PlatformSafeZoneProfile | string,
  tolerance = 1.0,
): boolean {
  const c = getSafeCorridor(profile);
  const right = x + width;
  const bottom = y + height;
  return (
    x >= c.left - tolerance &&
    right <= c.right + tolerance &&
    y >= c.top - tolerance &&
    bottom <= c.bottom + tolerance
  );
}

/**
 * Calculate ASS subtitle style parameters and coordinates for FFmpeg rendering.
 */
export function getSafeAssStyles(
  profile?: PlatformSafeZoneProfile | string,
  style?: "minimal" | "centered" | "lower-third" | "bottom",
): SafeAssStyleConfig {
  const g = getSafeZone(profile);
  const isCenter = profile === "center" || style === "centered" || style === "minimal";
  const align = isCenter ? 5 : 2; // 5 = middle-center, 2 = bottom-center
  const posY = isCenter ? g.SAFE_TOP + Math.round(g.H_SAFE / 2) : g.BOTTOM_MAX_Y;
  
  return {
    marginL: g.SAFE_LEFT,
    marginR: g.SAFE_RIGHT,
    marginV: isCenter ? Math.round(g.H / 2) : g.SAFE_BOTTOM,
    align,
    posX: g.CENTER_X,
    posY,
    refPosX: g.CENTER_X,
    refPosY: g.SAFE_TOP + 40,
  };
}

/**
 * Generate CSS percentage strings for interactive Live Preview UI overlays.
 */
export function getSafeOverlayCss(profile?: PlatformSafeZoneProfile | string): SafeOverlayCss {
  const g = getSafeZone(profile);
  return {
    topPercent: `${((g.SAFE_TOP / g.H) * 100).toFixed(3)}%`,
    bottomPercent: `${((g.SAFE_BOTTOM / g.H) * 100).toFixed(3)}%`,
    leftPercent: `${((g.SAFE_LEFT / g.W) * 100).toFixed(3)}%`,
    rightPercent: `${((g.SAFE_RIGHT / g.W) * 100).toFixed(3)}%`,
    centerXPercent: `${((g.CENTER_X / g.W) * 100).toFixed(3)}%`,
  };
}
```

---

### Step 3: Backward Compatibility Preservation Strategy

1. **Re-export from `src/lib/render-carousel.ts`**:
   ```ts
   import { TIKTOK_SAFE_ZONE, type SafeZoneGeometry } from "./safe-zone";
   export { TIKTOK_SAFE_ZONE };
   ```
   *Rationale*: Tests in `src/lib/__tests__/` currently import `TIKTOK_SAFE_ZONE` from `render-carousel.ts`. Re-exporting guarantees that every existing test passes without breaking imports or requiring multi-file refactoring before M1 is completed.

2. **Property Compatibility**:
   `W_SAFE`, `H_SAFE`, `CENTER_X`, `BOTTOM_MAX_Y`, `SAFE_TOP`, `SAFE_BOTTOM`, `SAFE_LEFT`, `SAFE_RIGHT`, `W`, `H` are precomputed numeric properties on the frozen object. Accessing `TIKTOK_SAFE_ZONE.W_SAFE` evaluates to numeric `760`, exactly matching property access expectations.

---

### Step 4: Module-by-Module Migration Map

| File | Existing Hardcoded Constants | Migration to `src/lib/safe-zone.ts` |
|---|---|---|
| `src/lib/render-carousel.ts` | `const TIKTOK_SAFE_ZONE = { ... }` | Import and re-export `TIKTOK_SAFE_ZONE` from `./safe-zone`. |
| `src/lib/render-photo.ts` | `const SAFE = { top: 320, bottom: 280, side: 180 }`<br>`W / 2 = 540`<br>`y = 280` (pill)<br>`Math.max(420, verticalForBg)` | `const safe = getSafeZone(opts.subtitlePosition)`<br>Text centered at `safe.CENTER_X` ($480\text{px}$)<br>Pill at `safe.SAFE_TOP` ($300\text{px}$)<br>Arabic at `safe.SAFE_TOP + pillH + 24px`<br>Max width `safe.W_SAFE` ($760\text{px}$)<br>Vertical space `safe.BOTTOM_MAX_Y - currentY`. |
| `src/lib/render-video.ts` | `let SAFE = { top: 320, bottom: 280, side: 180 }`<br>`cursorX = W / 2 - ...`<br>`targetBottomY = H * 0.74`<br>`y = 280 * scale` | `const safe = scaleSafeZone(getSafeZone(opts.subtitlePosition), scale)`<br>Text centered at `safe.CENTER_X`<br>Pill at `safe.SAFE_TOP`<br>Subtitles anchored at `Math.min(safe.BOTTOM_MAX_Y, H * 0.74)`. |
| `src/lib/render.functions.ts` | `bulgarianMarginV = 1350`<br>`\pos(540, 1350)`<br>`MarginL: 100, MarginR: 100` | `const safe = getSafeZone(data.subtitlePosition)`<br>Asymmetric ASS margins: `MarginL: safe.SAFE_LEFT`, `MarginR: safe.SAFE_RIGHT`<br>`\pos(safe.CENTER_X, safe.BOTTOM_MAX_Y)`. |
| `src/lib/thumbnail.functions.ts` | `<text x="540" ...>`<br>Line length `> 22` | `<text x="${TIKTOK_SAFE_ZONE.CENTER_X}" ...>` ($480\text{px}$)<br>Wrap to `TIKTOK_SAFE_ZONE.W_SAFE` ($760\text{px}$) with dynamic downscaling. |
| `src/routes/_app/create.tsx` | `top-[15%]`<br>Centered subtitle preview<br>Audio player at `bottom-4` | Safe Zone guide using `getSafeOverlayCss(subtitlePosition)`<br>Reference pill at `safe.SAFE_TOP` ($15.625\%$)<br>Dock audio player outside 9:16 frame. |

---

## 3. Caveats

1. **Font Metrics**: Bounding box calculations assume standard OpenType/TrueType metric behavior. When rendering canvas text with custom fonts (Montserrat, Amiri, Cormorant Garamond, Outfit), font loading (`document.fonts.load`) must be awaited to avoid fallback font metric mismatch.
2. **720p Scaling in Video**: `render-video.ts` allows a `720p` quality option where the canvas is $720 \times 1280$. The scaling factor is $720 / 1080 \approx 0.6667$. `scaleSafeZone` handles this by rounding all coordinates to nearest integer pixels.
3. **No Direct `src/` Code Modifications in this Agent**: In accordance with the Teamwork Explorer read-only protocol, this report provides the complete architecture and proposed file contents without making unauthorized changes to `src/`.

---

## 4. Conclusion

1. **`src/lib/safe-zone.ts` Architecture**: The single registry provides immutable, frozen `SafeZoneGeometry` definitions for `'tiktok'`, `'reels'`, `'shorts'`, `'universal'`, and `'center'`.
2. **Key Geometric Values**:
   - **TikTok**: $W=1080$, $H=1920$, $SAFE\_TOP=300$, $SAFE\_BOTTOM=400$, $SAFE\_LEFT=100$, $SAFE\_RIGHT=220$, **$W_{safe}=760\text{px}$**, **$H_{safe}=1220\text{px}$**, **$CENTER\_X=480\text{px}$**, **$BOTTOM\_MAX\_Y=1520\text{px}$**.
   - **Reels & Shorts**: $SAFE\_LEFT=80$, $SAFE\_RIGHT=160$, **$W_{safe}=840\text{px}$**, **$CENTER\_X=500\text{px}$**.
   - **Universal**: $W_{safe}=760\text{px}$, $CENTER\_X=480\text{px}$, $Y \in [300, 1520]\text{px}$.
3. **Backward Compatibility**: Re-exporting `TIKTOK_SAFE_ZONE` from `render-carousel.ts` ensures that 100% of existing unit and E2E tests pass without regressions.
4. **Ready for Implementation**: Implementers for M1, M2, M3, and M4 can adopt this unified contract immediately.

---

## 5. Verification Method

To independently verify the recommendations and implementation of M1:

1. **Compile & Type Check**:
   ```bash
   npx tsc --noEmit
   ```
2. **Execute Existing Safe Zone Test Suites**:
   ```bash
   npx jiti src/lib/__tests__/verify-carousel-upgrade.test.ts
   npx jiti src/lib/__tests__/adversarial-r1-r2-challenger.test.ts
   npx jiti src/lib/__tests__/adversarial-r2-reviewer-stress.test.ts
   npx jiti src/lib/__tests__/adversarial-r3-reviewer-stress.test.ts
   ```
3. **Dedicated M1 Registry Unit Test**:
   Create and execute `src/lib/__tests__/verify-safe-zone.test.ts` verifying:
   - `TIKTOK_SAFE_ZONE.W_SAFE === 760`
   - `TIKTOK_SAFE_ZONE.CENTER_X === 480`
   - `TIKTOK_SAFE_ZONE.BOTTOM_MAX_Y === 1520`
   - `REELS_SAFE_ZONE.CENTER_X === 500`
   - `SHORTS_SAFE_ZONE.CENTER_X === 500`
   - `UNIVERSAL_SAFE_ZONE.W_SAFE === 760`
   - `scaleSafeZone(TIKTOK_SAFE_ZONE, 720 / 1080).W === 720`
   - `isWithinSafeZone(100, 300, 760, 1220, 'tiktok') === true`
   - `isWithinSafeZone(90, 300, 760, 1220, 'tiktok') === false` (breaches left bound)
   - `isWithinSafeZone(100, 300, 780, 1220, 'tiktok') === false` (breaches right bound)

4. **Invalidation Conditions**:
   - Any test expecting $CENTER\_X = 540$ on TikTok profiles (invalidates right UI clearance).
   - Any rendered line width exceeding $760\text{px}$ on TikTok (invalidates $W_{safe}$).
   - Any text drawn above $Y=300\text{px}$ or below $Y=1520\text{px}$ on TikTok (invalidates vertical safe span).
