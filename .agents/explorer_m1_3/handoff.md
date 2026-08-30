# Handoff Report: Milestone 1 — Unit Testing & Validation Strategy for `src/lib/safe-zone.ts`

**Agent**: Explorer 3 (`explorer_m1_3`)  
**Target Module**: `src/lib/safe-zone.ts` & `src/lib/__tests__/verify-safe-zone.test.ts`  
**Milestone**: M1 (Unified Safe Zone Geometry Registry)  
**Date**: 2026-08-30  
**Status**: COMPLETE (Hard Handoff)

---

## 1. Observation

### 1.1 Codebase Test Infrastructure & Execution Patterns
- **Test Runner**: The repository uses `jiti` for native TypeScript and ESM test execution without requiring pre-compilation steps.
- **Existing Test Suites**:
  - `src/lib/__tests__/verify-sync.test.ts` (Subtitle synchronization verification)
  - `src/lib/__tests__/verify-tawheed-carousel.test.ts` (Taxonomy & carousel verification)
  - `src/lib/__tests__/verify-carousel-upgrade.test.ts` (49 assertions across 4 tiers)
  - `src/lib/__tests__/adversarial-r1-r2-challenger.test.ts` (Adversarial stress testing)
- **Execution Script**:
  - Commands are run via `npx jiti <path_to_test_file>` or `npm test`.
  - Execution completes in sub-second timeframes with structured assertion reporting.

### 1.2 Fragmented Geometry & Inconsistent Boundary Checking
Prior to Milestone 1, geometry constants and boundary assertions were fragmented across multiple modules with conflicting values:
1. **`src/lib/render-carousel.ts` (Lines 1–17)**:
   - Implements `TIKTOK_SAFE_ZONE` with `W: 1080, H: 1920, SAFE_TOP: 300, SAFE_BOTTOM: 400, SAFE_LEFT: 100, SAFE_RIGHT: 220`.
   - Computes `W_SAFE = 760`, `H_SAFE = 1220`, `CENTER_X = 480`.
2. **`src/lib/render-photo.ts` (Line 24)**:
   - Uses hardcoded `SAFE = { top: 320, bottom: 280, side: 180 }` (symmetric margins, insufficient bottom clearance of 280px vs 400px needed for TikTok).
3. **`src/lib/render-video.ts` (Line 32, 949)**:
   - Uses `SAFE = { top: 320, bottom: 280, side: 180 }` and centers subtitles at `W / 2 = 540px` instead of `CENTER_X = 480px`.
4. **`src/lib/render.functions.ts` (Lines 355, 363)**:
   - Sets ASS style `MarginL: 100, MarginR: 100` and `\pos(540, 1350)`, which breaches TikTok right sidebar button margin (`MarginR: 220`).
5. **`src/lib/thumbnail.functions.ts` (Line 53)**:
   - Renders SVG viral titles centered at `x="540"` with wide font spans (>900px), violating the `760px` safe corridor.

### 1.3 Target Registry Module (`src/lib/safe-zone.ts`)
The new centralized registry must export:
- Platform Profiles: `tiktok`, `reels`, `shorts`, `universal`, `center`
- Geometries: `TIKTOK_SAFE_ZONE`, `REELS_SAFE_ZONE`, `SHORTS_SAFE_ZONE`, `UNIVERSAL_SAFE_ZONE`, `CENTER_SAFE_ZONE`, `SOCIAL_SAFE_ZONES`
- Layout Standards: `REFERENCE_PILL_STANDARDS`
- Helper Functions:
  - `getSafeZone(platform?: PlatformSafeZoneProfile | string | null): SafeZoneGeometry`
  - `createSafeZone(options: SafeZoneOptions): SafeZoneGeometry`
  - `scaleSafeZone(geometry: SafeZoneGeometry, scale: number | { width: number; height: number }): SafeZoneGeometry`
  - `getNormalizedSafeZone(platform?: PlatformSafeZoneProfile | string | null): NormalizedSafeZone`
  - `isWithinSafeZone(box: BoundingBox, platformOrGeometry?: PlatformSafeZoneProfile | SafeZoneGeometry | string | null): boolean`
  - `clampToSafeZone(box: BoundingBox, platformOrGeometry?: PlatformSafeZoneProfile | SafeZoneGeometry | string | null): BoundingBox`
  - `doBoxesCollide(boxA: BoundingBox, boxB: BoundingBox, minGap?: number): boolean`
  - `getASSSubtitlePlacement(platform?: PlatformSafeZoneProfile | string | null, style?: string): ASSSubtitlePlacement`
  - `getSubtitleAnchorY(platformOrGeometry?: PlatformSafeZoneProfile | SafeZoneGeometry | string | null, style?: string): number`

---

## 2. Logic Chain

1. **R1 (Prevent Text Overflow) & R2 (Respect Safe Zones)** demand that all rendered content remains strictly within platform safe corridors.
2. If `src/lib/safe-zone.ts` is the single source of truth for the entire application, any subtle math error, floating-point inaccuracy, off-by-one boundary bug, or incorrect profile resolution will propagate to all canvas renderers, FFmpeg ASS subtitle generators, SVG thumbnail builders, and Live UI previews.
3. Therefore, `src/lib/safe-zone.ts` requires an exhaustive, deterministic Unit Test Suite (`src/lib/__tests__/verify-safe-zone.test.ts`) that validates:
   - Exact numerical constants and immutable freezing of all profile records.
   - Mathematical invariants (conservation of dimensions, optical centering, vertical bounds).
   - Coordinate boundary checking (`isWithinSafeZone`) with sub-pixel and tolerance validation.
   - Coordinate clamping (`clampToSafeZone`) guaranteeing that any arbitrary out-of-bounds input is safely constrained.
   - Spatial collision detection (`doBoxesCollide`) verifying clearance between reference pills and text blocks.
   - Resolution scaling (`scaleSafeZone`) preserving geometric proportionality for 720p/1080p.
   - Normalized coordinate fractions (`getNormalizedSafeZone`) for CSS/SVG rendering.
   - ASS subtitle parameter generation (`getASSSubtitlePlacement`) matching video engine specifications.
   - Randomized property-based fuzzing over 1,000 extreme coordinate bounding boxes.

---

## 3. Caveats

1. **Default Aspect Ratio**: The primary coordinate system is 9:16 vertical (1080x1920). Scaling functions correctly handle 720x1280 or custom viewports.
2. **Platform Insets**: TikTok insets (Top 300px, Bottom 400px, Left 100px, Right 220px) represent conservative, field-tested safe areas. Instagram Reels and YouTube Shorts have slightly different insets as specified.
3. **Read-Only Investigation**: As Explorer 3, this report specifies the unit test architecture and validation requirements. The test implementation file `src/lib/__tests__/verify-safe-zone.test.ts` should be created alongside `src/lib/safe-zone.ts` in Milestone 1.

---

## 4. Conclusion: Complete Unit Testing & Validation Specification

### 4.1 Formal Mathematical Invariant Matrix

For every `SafeZoneGeometry` instance $G = \langle W, H, \text{SAFE\_TOP}, \text{SAFE\_BOTTOM}, \text{SAFE\_LEFT}, \text{SAFE\_RIGHT} \rangle$:

$$\begin{aligned}
W_{safe} &= W - \text{SAFE\_LEFT} - \text{SAFE\_RIGHT} > 0 \\
H_{safe} &= H - \text{SAFE\_TOP} - \text{SAFE\_BOTTOM} > 0 \\
\text{CENTER\_X} &= \text{SAFE\_LEFT} + \frac{W_{safe}}{2} \\
\text{BOTTOM\_MAX\_Y} &= H - \text{SAFE\_BOTTOM} \\
\text{TOP\_MIN\_Y} &= \text{SAFE\_TOP} \\
\text{BOTTOM\_MAX\_Y} - \text{TOP\_MIN\_Y} &= H_{safe}
\end{aligned}$$

For TikTok ($W=1080, H=1920$):
- $\text{SAFE\_LEFT} = 100\text{px}$, $\text{SAFE\_RIGHT} = 220\text{px} \implies W_{safe} = 760\text{px}$
- $\text{CENTER\_X} = 100 + \frac{760}{2} = 480\text{px}$ (Optical shift of $-60\text{px}$ relative to canvas center $540\text{px}$)
- $\text{SAFE\_TOP} = 300\text{px}$, $\text{SAFE\_BOTTOM} = 400\text{px} \implies H_{safe} = 1220\text{px}$
- $\text{BOTTOM\_MAX\_Y} = 1920 - 400 = 1520\text{px}$

---

### 4.2 Comprehensive Unit Test Suite Specification (`verify-safe-zone.test.ts`)

The test suite is organized into **10 distinct test categories** comprising **50+ test assertions**:

```ts
/**
 * UNIFIED SAFE ZONE GEOMETRY REGISTRY VERIFICATION SUITE
 * File: src/lib/__tests__/verify-safe-zone.test.ts
 * 
 * Verifies Milestone 1 (M1) Safe Zone Geometry Registry invariants, constants,
 * boundary checkers, clamping engines, collision checkers, scaling utilities,
 * and ASS subtitle styling configurations.
 */

import {
  TIKTOK_SAFE_ZONE,
  REELS_SAFE_ZONE,
  SHORTS_SAFE_ZONE,
  UNIVERSAL_SAFE_ZONE,
  CENTER_SAFE_ZONE,
  SOCIAL_SAFE_ZONES,
  REFERENCE_PILL_STANDARDS,
  getSafeZone,
  createSafeZone,
  scaleSafeZone,
  getNormalizedSafeZone,
  isWithinSafeZone,
  clampToSafeZone,
  doBoxesCollide,
  getASSSubtitlePlacement,
  getSubtitleAnchorY,
  type SafeZoneGeometry,
  type BoundingBox,
} from "../safe-zone";
```

#### Suite 1: Geometry Constant & Mathematical Invariant Tests
| Test ID | Test Description | Input / Entity | Expected Value / Assertion |
|---|---|---|---|
| **T1.1** | TikTok Safe Zone Exact Constants | `TIKTOK_SAFE_ZONE` | `W=1080, H=1920, SAFE_TOP=300, SAFE_BOTTOM=400, SAFE_LEFT=100, SAFE_RIGHT=220, W_SAFE=760, H_SAFE=1220, CENTER_X=480, BOTTOM_MAX_Y=1520, TOP_MIN_Y=300` |
| **T1.2** | Instagram Reels Exact Constants | `REELS_SAFE_ZONE` | `W=1080, H=1920, SAFE_TOP=240, SAFE_BOTTOM=340, SAFE_LEFT=80, SAFE_RIGHT=160, W_SAFE=840, H_SAFE=1340, CENTER_X=500, BOTTOM_MAX_Y=1580, TOP_MIN_Y=240` |
| **T1.3** | YouTube Shorts Exact Constants | `SHORTS_SAFE_ZONE` | `W=1080, H=1920, SAFE_TOP=220, SAFE_BOTTOM=380, SAFE_LEFT=80, SAFE_RIGHT=180, W_SAFE=820, H_SAFE=1320, CENTER_X=490, BOTTOM_MAX_Y=1540, TOP_MIN_Y=220` |
| **T1.4** | Universal Corridor Constants | `UNIVERSAL_SAFE_ZONE` | `W=1080, H=1920, SAFE_TOP=300, SAFE_BOTTOM=400, SAFE_LEFT=100, SAFE_RIGHT=220, W_SAFE=760, H_SAFE=1220, CENTER_X=480, BOTTOM_MAX_Y=1520, TOP_MIN_Y=300` |
| **T1.5** | Symmetrical Center Constants | `CENTER_SAFE_ZONE` | `W=1080, H=1920, SAFE_TOP=300, SAFE_BOTTOM=300, SAFE_LEFT=100, SAFE_RIGHT=100, W_SAFE=880, H_SAFE=1320, CENTER_X=540, BOTTOM_MAX_Y=1620, TOP_MIN_Y=300` |
| **T1.6** | Reference Pill Standards | `REFERENCE_PILL_STANDARDS` | `DEFAULT_Y=300, FONT_SIZE=28, PAD_X=28, PAD_Y=14, MIN_VERTICAL_GAP=24` |
| **T1.7** | Mathematical Invariant Verification | All 5 Profiles | For each profile: `W_SAFE === W - SAFE_LEFT - SAFE_RIGHT`, `H_SAFE === H - SAFE_TOP - SAFE_BOTTOM`, `CENTER_X === SAFE_LEFT + W_SAFE / 2`, `BOTTOM_MAX_Y === H - SAFE_BOTTOM` |
| **T1.8** | Universal Subsumption Invariant | Universal vs All | Universal corridor box `{x: 100, y: 300, width: 760, height: 1220}` is valid under TikTok, Reels, and Shorts |
| **T1.9** | Object Immutability (Freeze) | All 5 Profiles & Dictionaries | `Object.isFrozen(TIKTOK_SAFE_ZONE) === true`, `Object.isFrozen(SOCIAL_SAFE_ZONES) === true` |

#### Suite 2: Profile Resolution & Factory Functions (`getSafeZone`, `createSafeZone`)
| Test ID | Test Description | Input | Expected Output |
|---|---|---|---|
| **T2.1** | Default Fallback (no arg / undefined / null / empty) | `getSafeZone()`, `getSafeZone(undefined)`, `getSafeZone(null)`, `getSafeZone("")` | Returns `TIKTOK_SAFE_ZONE` |
| **T2.2** | Case-Insensitive Profile Lookup | `getSafeZone("tiktok")`, `getSafeZone("TIKTOK")`, `getSafeZone("  Reels  ")`, `getSafeZone("SHORTS")` | Returns respective geometry objects correctly |
| **T2.3** | Unknown Profile Fallback | `getSafeZone("snapchat")`, `getSafeZone("invalid_123")` | Returns `TIKTOK_SAFE_ZONE` |
| **T2.4** | Custom Geometry Creation | `createSafeZone({ SAFE_TOP: 250, SAFE_BOTTOM: 350, SAFE_LEFT: 90, SAFE_RIGHT: 190 })` | `W_SAFE=800, H_SAFE=1320, CENTER_X=490, BOTTOM_MAX_Y=1570` |
| **T2.5** | Over-Constrained Custom Geometry Clamping | `createSafeZone({ SAFE_LEFT: 600, SAFE_RIGHT: 600, SAFE_TOP: 1000, SAFE_BOTTOM: 1000 })` | `W_SAFE=0, H_SAFE=0` (no negative dimensions) |

#### Suite 3: Coordinate Containment & Boundary Checking (`isWithinSafeZone`)
| Test ID | Test Description | Bounding Box Input | Profile | Expected |
|---|---|---|---|---|
| **T3.1** | Standard In-Bounds Box | `{ x: 200, y: 500, width: 400, height: 600 }` | `tiktok` | `true` |
| **T3.2** | Exact Safe Corridor Box | `{ x: 100, y: 300, width: 760, height: 1220 }` | `tiktok` | `true` |
| **T3.3** | Left Boundary Violation | `{ x: 99, y: 300, width: 700, height: 500 }` | `tiktok` | `false` |
| **T3.4** | Negative X Coordinate | `{ x: -10, y: 400, width: 200, height: 200 }` | `tiktok` | `false` |
| **T3.5** | Right Boundary Violation | `{ x: 100, y: 300, width: 761, height: 500 }` (Right = 861 > 860) | `tiktok` | `false` |
| **T3.6** | Right Sidebar Overlap | `{ x: 500, y: 500, width: 400, height: 200 }` (Right = 900 > 860) | `tiktok` | `false` |
| **T3.7** | Top Boundary Violation | `{ x: 100, y: 299, width: 500, height: 500 }` | `tiktok` | `false` |
| **T3.8** | Top Status Bar Breach | `{ x: 100, y: 50, width: 500, height: 200 }` | `tiktok` | `false` |
| **T3.9** | Bottom Boundary Violation | `{ x: 100, y: 300, width: 500, height: 1221 }` (Bottom = 1521 > 1520) | `tiktok` | `false` |
| **T3.10** | Bottom Caption Overlap | `{ x: 100, y: 1450, width: 500, height: 100 }` (Bottom = 1550 > 1520) | `tiktok` | `false` |
| **T3.11** | Sub-Pixel Epsilon Tolerance | `{ x: 100.0001, y: 300.0001, width: 759.9998, height: 1219.9998 }` | `tiktok` | `true` |
| **T3.12** | Direct Geometry Object vs String | Passes `TIKTOK_SAFE_ZONE` vs `"tiktok"` | Both | Identical results |
| **T3.13** | Reels Boundary Validation | `{ x: 80, y: 240, width: 840, height: 1340 }` | `reels` | `true` |

#### Suite 4: Coordinate Clamping & Fitting (`clampToSafeZone`)
| Test ID | Test Description | Input Box | Profile | Expected Clamped Box |
|---|---|---|---|---|
| **T4.1** | In-Bounds Box (No-op) | `{ x: 200, y: 500, width: 400, height: 600 }` | `tiktok` | `{ x: 200, y: 500, width: 400, height: 600 }` |
| **T4.2** | Left & Top Clamping | `{ x: 20, y: 100, width: 400, height: 300 }` | `tiktok` | `{ x: 100, y: 300, width: 400, height: 300 }` |
| **T4.3** | Right & Bottom Clamping | `{ x: 600, y: 1400, width: 400, height: 300 }` | `tiktok` | `{ x: 460, y: 1220, width: 400, height: 300 }` |
| **T4.4** | Oversized Width Clamping | `{ x: 50, y: 400, width: 900, height: 300 }` | `tiktok` | `{ x: 100, y: 400, width: 760, height: 300 }` |
| **T4.5** | Oversized Height Clamping | `{ x: 100, y: 100, width: 500, height: 1500 }` | `tiktok` | `{ x: 100, y: 300, width: 500, height: 1220 }` |
| **T4.6** | Post-Clamp Containment Guarantee | Any clamped box $B'$ | `tiktok` | `isWithinSafeZone(B', 'tiktok') === true` |

#### Suite 5: Collision Detection & Gap Enforcing (`doBoxesCollide`)
| Test ID | Test Description | Box A | Box B | minGap | Expected |
|---|---|---|---|---|---|
| **T5.1** | Non-Overlapping Vertical Boxes | `{ x: 100, y: 300, width: 760, height: 56 }` | `{ x: 100, y: 400, width: 760, height: 200 }` | `0` | `false` |
| **T5.2** | Directly Overlapping Boxes | `{ x: 100, y: 300, width: 760, height: 56 }` | `{ x: 100, y: 330, width: 760, height: 200 }` | `0` | `true` |
| **T5.3** | Minimum Gap Violation (24px) | `{ x: 100, y: 300, width: 760, height: 56 }` (Ends 356) | `{ x: 100, y: 360, width: 760, height: 200 }` (Gap = 4) | `24` | `true` |
| **T5.4** | Exactly Satisfied Gap (24px) | `{ x: 100, y: 300, width: 760, height: 56 }` (Ends 356) | `{ x: 100, y: 380, width: 760, height: 200 }` (Gap = 24) | `24` | `false` |
| **T5.5** | Horizontal Separation (Vertical Overlap) | `{ x: 100, y: 400, width: 200, height: 200 }` | `{ x: 350, y: 400, width: 200, height: 200 }` | `20` | `false` |

#### Suite 6: Resolution Scaling (`scaleSafeZone`)
| Test ID | Test Description | Base Geometry | Scale Parameter | Expected Scaled Constants |
|---|---|---|---|---|
| **T6.1** | 1080p to 720p Proportional Scale | `TIKTOK_SAFE_ZONE` | `720 / 1080` (factor = 0.6667) | `W=720, H=1280, SAFE_TOP=200, SAFE_BOTTOM=267, SAFE_LEFT=67, SAFE_RIGHT=147, W_SAFE=506, H_SAFE=813, CENTER_X=320` |
| **T6.2** | Custom Width/Height Object | `TIKTOK_SAFE_ZONE` | `{ width: 540, height: 960 }` | `W=540, H=960, SAFE_TOP=150, SAFE_BOTTOM=200, SAFE_LEFT=50, SAFE_RIGHT=110, W_SAFE=380, H_SAFE=610, CENTER_X=240` |
| **T6.3** | Identity Scale (1.0) | `TIKTOK_SAFE_ZONE` | `1.0` | Exact match with original `TIKTOK_SAFE_ZONE` |

#### Suite 7: Normalized Safe Zone Fractions (`getNormalizedSafeZone`)
| Test ID | Test Description | Profile | Expected Normalized Values |
|---|---|---|---|
| **T7.1** | TikTok Normalized Dimensions | `tiktok` | `top = 300/1920 = 0.15625`, `bottom = 400/1920 = 0.208333...`, `left = 100/1080 = 0.092592...`, `right = 220/1080 = 0.203703...`, `width = 760/1080 = 0.703703...`, `height = 1220/1920 = 0.635416...`, `centerX = 480/1080 = 0.444444...` |
| **T7.2** | Horizontal Fraction Sum | `tiktok`, `reels`, `shorts` | `left + width + right === 1.0` ($\pm 10^{-6}$) |
| **T7.3** | Vertical Fraction Sum | `tiktok`, `reels`, `shorts` | `top + height + bottom === 1.0` ($\pm 10^{-6}$) |

#### Suite 8: ASS Subtitle Layout Parameters (`getASSSubtitlePlacement`)
| Test ID | Test Description | Profile | Style | Expected ASS Placement Output |
|---|---|---|---|---|
| **T8.1** | TikTok Lower-Third Subtitle | `tiktok` | `lower-third` | `alignment: 2, posX: 480, posY: 1420, marginL: 100, marginR: 220, marginV: 500` |
| **T8.2** | Instagram Reels Lower-Third Subtitle | `reels` | `lower-third` | `alignment: 2, posX: 500, posY: 1421, marginL: 80, marginR: 160, marginV: 499` |
| **T8.3** | Centered Subtitle Style | `tiktok` | `center` | `alignment: 5, posX: 540, posY: 960, marginL: 100, marginR: 220, marginV: 960` |

#### Suite 9: Optical Subtitle Anchor Y Calculation (`getSubtitleAnchorY`)
| Test ID | Test Description | Parameters | Expected Value |
|---|---|---|---|
| **T9.1** | TikTok Lower-Third Anchor | `getSubtitleAnchorY('tiktok', 'lower-third')` | `1420px` |
| **T9.2** | Reels Lower-Third Anchor | `getSubtitleAnchorY('reels', 'lower-third')` | `1421px` |
| **T9.3** | Center Anchor | `getSubtitleAnchorY('tiktok', 'center')` | `960px` |

#### Suite 10: Randomized Property-Based Fuzzing (1,000 Iterations)
| Test ID | Test Description | Methodology | Invariant Asserted |
|---|---|---|---|
| **T10.1** | 1,000 Random Box Fuzzing & Clamping | Generate random $x \in [-500, 1500]$, $y \in [-500, 2500]$, $w \in [0, 2000]$, $h \in [0, 3000]$. | For 100% of generated boxes, `isWithinSafeZone(clampToSafeZone(box, profile), profile) === true`, and clamped dimensions never exceed `W_SAFE` or `H_SAFE`. |

---

### 4.3 Proposed Executable Test File Code (`src/lib/__tests__/verify-safe-zone.test.ts`)

```ts
import {
  TIKTOK_SAFE_ZONE,
  REELS_SAFE_ZONE,
  SHORTS_SAFE_ZONE,
  UNIVERSAL_SAFE_ZONE,
  CENTER_SAFE_ZONE,
  SOCIAL_SAFE_ZONES,
  REFERENCE_PILL_STANDARDS,
  getSafeZone,
  createSafeZone,
  scaleSafeZone,
  getNormalizedSafeZone,
  isWithinSafeZone,
  clampToSafeZone,
  doBoxesCollide,
  getASSSubtitlePlacement,
  getSubtitleAnchorY,
  type SafeZoneGeometry,
  type BoundingBox,
} from "../safe-zone";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[FAIL] ${message}`);
  }
}

function assertClose(actual: number, expected: number, epsilon = 0.001, message = "") {
  if (Math.abs(actual - expected) > epsilon) {
    throw new Error(`[FAIL] ${message}: expected ${expected} ±${epsilon}, got ${actual}`);
  }
}

let passedCount = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✔ [PASS] ${name}`);
    passedCount++;
  } catch (err: any) {
    console.error(`  ✖ [FAIL] ${name}: ${err.message}`);
    throw err;
  }
}

async function runSafeZoneVerification() {
  console.log("=================================================================");
  console.log("🚀 STARTING UNIFIED SAFE ZONE REGISTRY UNIT TEST SUITE");
  console.log("=================================================================\n");

  console.log("--- Suite 1: Geometry Constants & Mathematical Invariants ---");
  test("T1.1: TikTok Safe Zone exact constants compliance", () => {
    assert(TIKTOK_SAFE_ZONE.W === 1080, "TikTok W must be 1080");
    assert(TIKTOK_SAFE_ZONE.H === 1920, "TikTok H must be 1920");
    assert(TIKTOK_SAFE_ZONE.SAFE_TOP === 300, "TikTok SAFE_TOP must be 300");
    assert(TIKTOK_SAFE_ZONE.SAFE_BOTTOM === 400, "TikTok SAFE_BOTTOM must be 400");
    assert(TIKTOK_SAFE_ZONE.SAFE_LEFT === 100, "TikTok SAFE_LEFT must be 100");
    assert(TIKTOK_SAFE_ZONE.SAFE_RIGHT === 220, "TikTok SAFE_RIGHT must be 220");
    assert(TIKTOK_SAFE_ZONE.W_SAFE === 760, "TikTok W_SAFE must be 760");
    assert(TIKTOK_SAFE_ZONE.H_SAFE === 1220, "TikTok H_SAFE must be 1220");
    assert(TIKTOK_SAFE_ZONE.CENTER_X === 480, "TikTok CENTER_X must be 480");
    assert(TIKTOK_SAFE_ZONE.BOTTOM_MAX_Y === 1520, "TikTok BOTTOM_MAX_Y must be 1520");
    assert(TIKTOK_SAFE_ZONE.TOP_MIN_Y === 300, "TikTok TOP_MIN_Y must be 300");
  });

  test("T1.2: Instagram Reels Safe Zone exact constants compliance", () => {
    assert(REELS_SAFE_ZONE.W === 1080, "Reels W must be 1080");
    assert(REELS_SAFE_ZONE.H === 1920, "Reels H must be 1920");
    assert(REELS_SAFE_ZONE.SAFE_TOP === 240, "Reels SAFE_TOP must be 240");
    assert(REELS_SAFE_ZONE.SAFE_BOTTOM === 340, "Reels SAFE_BOTTOM must be 340");
    assert(REELS_SAFE_ZONE.SAFE_LEFT === 80, "Reels SAFE_LEFT must be 80");
    assert(REELS_SAFE_ZONE.SAFE_RIGHT === 160, "Reels SAFE_RIGHT must be 160");
    assert(REELS_SAFE_ZONE.W_SAFE === 840, "Reels W_SAFE must be 840");
    assert(REELS_SAFE_ZONE.H_SAFE === 1340, "Reels H_SAFE must be 1340");
    assert(REELS_SAFE_ZONE.CENTER_X === 500, "Reels CENTER_X must be 500");
    assert(REELS_SAFE_ZONE.BOTTOM_MAX_Y === 1580, "Reels BOTTOM_MAX_Y must be 1580");
  });

  test("T1.3: YouTube Shorts Safe Zone exact constants compliance", () => {
    assert(SHORTS_SAFE_ZONE.W === 1080, "Shorts W must be 1080");
    assert(SHORTS_SAFE_ZONE.H === 1920, "Shorts H must be 1920");
    assert(SHORTS_SAFE_ZONE.SAFE_TOP === 220, "Shorts SAFE_TOP must be 220");
    assert(SHORTS_SAFE_ZONE.SAFE_BOTTOM === 380, "Shorts SAFE_BOTTOM must be 380");
    assert(SHORTS_SAFE_ZONE.SAFE_LEFT === 80, "Shorts SAFE_LEFT must be 80");
    assert(SHORTS_SAFE_ZONE.SAFE_RIGHT === 180, "Shorts SAFE_RIGHT must be 180");
    assert(SHORTS_SAFE_ZONE.W_SAFE === 820, "Shorts W_SAFE must be 820");
    assert(SHORTS_SAFE_ZONE.H_SAFE === 1320, "Shorts H_SAFE must be 1320");
    assert(SHORTS_SAFE_ZONE.CENTER_X === 490, "Shorts CENTER_X must be 490");
    assert(SHORTS_SAFE_ZONE.BOTTOM_MAX_Y === 1540, "Shorts BOTTOM_MAX_Y must be 1540");
  });

  test("T1.4: Universal & Center Safe Zone profiles compliance", () => {
    assert(UNIVERSAL_SAFE_ZONE.W_SAFE === 760, "Universal W_SAFE must be 760");
    assert(UNIVERSAL_SAFE_ZONE.H_SAFE === 1220, "Universal H_SAFE must be 1220");
    assert(CENTER_SAFE_ZONE.CENTER_X === 540, "Center profile CENTER_X must be 540");
    assert(REFERENCE_PILL_STANDARDS.DEFAULT_Y === 300, "Pill DEFAULT_Y must be 300");
    assert(REFERENCE_PILL_STANDARDS.MIN_VERTICAL_GAP === 24, "Pill MIN_VERTICAL_GAP must be 24");
  });

  test("T1.5: Mathematical invariants verified across all profiles", () => {
    const profiles = [TIKTOK_SAFE_ZONE, REELS_SAFE_ZONE, SHORTS_SAFE_ZONE, UNIVERSAL_SAFE_ZONE, CENTER_SAFE_ZONE];
    for (const p of profiles) {
      assert(p.W_SAFE === p.W - p.SAFE_LEFT - p.SAFE_RIGHT, "Invariant: W_SAFE calculation");
      assert(p.H_SAFE === p.H - p.SAFE_TOP - p.SAFE_BOTTOM, "Invariant: H_SAFE calculation");
      assert(p.CENTER_X === p.SAFE_LEFT + p.W_SAFE / 2, "Invariant: CENTER_X calculation");
      assert(p.BOTTOM_MAX_Y === p.H - p.SAFE_BOTTOM, "Invariant: BOTTOM_MAX_Y calculation");
      assert(p.TOP_MIN_Y === p.SAFE_TOP, "Invariant: TOP_MIN_Y calculation");
      assert(Object.isFrozen(p), "Profile object must be frozen");
    }
  });

  console.log("\n--- Suite 2: Profile Resolution & Custom Factory ---");
  test("T2.1: getSafeZone fallback and case-insensitivity", () => {
    assert(getSafeZone() === TIKTOK_SAFE_ZONE, "Default must be TikTok");
    assert(getSafeZone(undefined) === TIKTOK_SAFE_ZONE, "Undefined must fallback to TikTok");
    assert(getSafeZone(null) === TIKTOK_SAFE_ZONE, "Null must fallback to TikTok");
    assert(getSafeZone("") === TIKTOK_SAFE_ZONE, "Empty string must fallback to TikTok");
    assert(getSafeZone("tiktok") === TIKTOK_SAFE_ZONE, "tiktok lookup");
    assert(getSafeZone("  TIKTOK  ") === TIKTOK_SAFE_ZONE, "TIKTOK uppercase and trimmed");
    assert(getSafeZone("reels") === REELS_SAFE_ZONE, "reels lookup");
    assert(getSafeZone("shorts") === SHORTS_SAFE_ZONE, "shorts lookup");
    assert(getSafeZone("universal") === UNIVERSAL_SAFE_ZONE, "universal lookup");
    assert(getSafeZone("unknown_custom_app") === TIKTOK_SAFE_ZONE, "Unknown platform falls back to TikTok");
  });

  test("T2.2: createSafeZone calculates derived metrics cleanly", () => {
    const custom = createSafeZone({ SAFE_TOP: 250, SAFE_BOTTOM: 350, SAFE_LEFT: 90, SAFE_RIGHT: 190 });
    assert(custom.W === 1080 && custom.H === 1920, "Default dimensions 1080x1920");
    assert(custom.W_SAFE === 800, "Derived W_SAFE");
    assert(custom.H_SAFE === 1320, "Derived H_SAFE");
    assert(custom.CENTER_X === 490, "Derived CENTER_X");
    assert(custom.BOTTOM_MAX_Y === 1570, "Derived BOTTOM_MAX_Y");
    assert(Object.isFrozen(custom), "Custom instance is frozen");
  });

  console.log("\n--- Suite 3: Coordinate Containment & Boundary Checking ---");
  test("T3.1: Nominal inside box returns true", () => {
    const box: BoundingBox = { x: 200, y: 500, width: 400, height: 600 };
    assert(isWithinSafeZone(box, "tiktok") === true, "Nominal box inside");
  });

  test("T3.2: Exact corridor bounding box returns true", () => {
    const box: BoundingBox = { x: 100, y: 300, width: 760, height: 1220 };
    assert(isWithinSafeZone(box, "tiktok") === true, "Full corridor box inside");
  });

  test("T3.3: Left boundary breaches return false", () => {
    assert(isWithinSafeZone({ x: 99, y: 300, width: 700, height: 500 }, "tiktok") === false, "x < 100 fails");
    assert(isWithinSafeZone({ x: -10, y: 400, width: 200, height: 200 }, "tiktok") === false, "negative x fails");
  });

  test("T3.4: Right boundary breaches return false", () => {
    assert(isWithinSafeZone({ x: 100, y: 300, width: 761, height: 500 }, "tiktok") === false, "right = 861 > 860 fails");
    assert(isWithinSafeZone({ x: 500, y: 500, width: 400, height: 200 }, "tiktok") === false, "right = 900 > 860 fails");
  });

  test("T3.5: Top & Bottom boundary breaches return false", () => {
    assert(isWithinSafeZone({ x: 100, y: 299, width: 500, height: 500 }, "tiktok") === false, "y < 300 fails");
    assert(isWithinSafeZone({ x: 100, y: 300, width: 500, height: 1221 }, "tiktok") === false, "bottom = 1521 > 1520 fails");
  });

  test("T3.6: Reels and Shorts profile specific boundary checking", () => {
    assert(isWithinSafeZone({ x: 80, y: 240, width: 840, height: 1340 }, "reels") === true, "Valid in Reels");
    assert(isWithinSafeZone({ x: 80, y: 240, width: 840, height: 1340 }, "tiktok") === false, "Fails in TikTok (exceeds TikTok safe margins)");
  });

  console.log("\n--- Suite 4: Coordinate Clamping & Containment Guarantee ---");
  test("T4.1: clampToSafeZone preserves already valid boxes", () => {
    const box: BoundingBox = { x: 200, y: 500, width: 400, height: 600 };
    const clamped = clampToSafeZone(box, "tiktok");
    assert(clamped.x === 200 && clamped.y === 500 && clamped.width === 400 && clamped.height === 600, "Preserves valid box");
  });

  test("T4.2: clampToSafeZone adjusts out-of-bounds positions and oversized dimensions", () => {
    const outBox: BoundingBox = { x: 20, y: 100, width: 900, height: 1400 };
    const clamped = clampToSafeZone(outBox, "tiktok");
    assert(clamped.x === 100, "Clamped X to SAFE_LEFT (100)");
    assert(clamped.y === 300, "Clamped Y to SAFE_TOP (300)");
    assert(clamped.width === 760, "Clamped width to W_SAFE (760)");
    assert(clamped.height === 1220, "Clamped height to H_SAFE (1220)");
    assert(isWithinSafeZone(clamped, "tiktok") === true, "Clamped result is strictly within safe zone");
  });

  console.log("\n--- Suite 5: Collision Detection & Gap Enforcing ---");
  test("T5.1: doBoxesCollide detects overlap and gap violations", () => {
    const pill: BoundingBox = { x: 400, y: 300, width: 280, height: 56 }; // Y: 300 to 356
    const arabicTextViolating: BoundingBox = { x: 100, y: 360, width: 760, height: 200 }; // Gap = 4px (< 24px)
    const arabicTextValid: BoundingBox = { x: 100, y: 380, width: 760, height: 200 }; // Gap = 24px (>= 24px)

    assert(doBoxesCollide(pill, arabicTextViolating, 24) === true, "Collides when gap < 24px");
    assert(doBoxesCollide(pill, arabicTextValid, 24) === false, "Clears when gap >= 24px");
  });

  console.log("\n--- Suite 6: Resolution Scaling (1080p -> 720p) ---");
  test("T6.1: scaleSafeZone scales proportionally to 720p", () => {
    const scaled = scaleSafeZone(TIKTOK_SAFE_ZONE, 720 / 1080);
    assert(scaled.W === 720, "Scaled W is 720");
    assert(scaled.H === 1280, "Scaled H is 1280");
    assert(scaled.SAFE_TOP === 200, "Scaled SAFE_TOP is 200");
    assert(scaled.SAFE_BOTTOM === 267, "Scaled SAFE_BOTTOM is 267");
    assert(scaled.SAFE_LEFT === 67, "Scaled SAFE_LEFT is 67");
    assert(scaled.SAFE_RIGHT === 147, "Scaled SAFE_RIGHT is 147");
    assert(scaled.W_SAFE === 506, "Scaled W_SAFE is 506");
    assert(scaled.CENTER_X === 320, "Scaled CENTER_X is 320");
  });

  console.log("\n--- Suite 7: Normalized Safe Zone Coordinates ---");
  test("T7.1: getNormalizedSafeZone returns accurate fractions and sum invariants", () => {
    const norm = getNormalizedSafeZone("tiktok");
    assertClose(norm.top, 300 / 1920, 0.0001, "Normalized top");
    assertClose(norm.bottom, 400 / 1920, 0.0001, "Normalized bottom");
    assertClose(norm.left, 100 / 1080, 0.0001, "Normalized left");
    assertClose(norm.right, 220 / 1080, 0.0001, "Normalized right");
    assertClose(norm.width, 760 / 1080, 0.0001, "Normalized width");
    assertClose(norm.height, 1220 / 1920, 0.0001, "Normalized height");
    assertClose(norm.centerX, 480 / 1080, 0.0001, "Normalized centerX");

    assertClose(norm.left + norm.width + norm.right, 1.0, 0.0001, "Horizontal fraction conservation");
    assertClose(norm.top + norm.height + norm.bottom, 1.0, 0.0001, "Vertical fraction conservation");
  });

  console.log("\n--- Suite 8: ASS Subtitle Layout Parameters ---");
  test("T8.1: getASSSubtitlePlacement generates correct optical positions & margins", () => {
    const ttAss = getASSSubtitlePlacement("tiktok", "lower-third");
    assert(ttAss.alignment === 2, "ASS lower-third alignment is 2");
    assert(ttAss.posX === 480, "TikTok ASS posX is 480 (clearing right buttons)");
    assert(ttAss.posY === 1420, "TikTok ASS posY is 1420");
    assert(ttAss.marginL === 100, "TikTok ASS marginL is 100");
    assert(ttAss.marginR === 220, "TikTok ASS marginR is 220");
    assert(ttAss.marginV === 500, "TikTok ASS marginV is 500");

    const centerAss = getASSSubtitlePlacement("tiktok", "center");
    assert(centerAss.alignment === 5, "ASS center alignment is 5");
    assert(centerAss.posX === 540 && centerAss.posY === 960, "Center ASS posX/posY is 540/960");
  });

  console.log("\n--- Suite 9: Subtitle Anchor Y Calculation ---");
  test("T9.1: getSubtitleAnchorY calculations", () => {
    assert(getSubtitleAnchorY("tiktok", "lower-third") === 1420, "TikTok lower-third anchor");
    assert(getSubtitleAnchorY("tiktok", "center") === 960, "TikTok center anchor");
  });

  console.log("\n--- Suite 10: Randomized Property-Based Fuzzing ---");
  test("T10.1: 1,000 Random Bounding Boxes clamped and guaranteed within safe zone", () => {
    for (let i = 0; i < 1000; i++) {
      const rx = (Math.random() * 2000) - 500;
      const ry = (Math.random() * 3000) - 500;
      const rw = Math.random() * 2000;
      const rh = Math.random() * 3000;
      const rawBox: BoundingBox = { x: rx, y: ry, width: rw, height: rh };
      const clamped = clampToSafeZone(rawBox, "tiktok");

      assert(isWithinSafeZone(clamped, "tiktok"), `Fuzzed iteration ${i} clamped box must be inside safe zone`);
      assert(clamped.width <= TIKTOK_SAFE_ZONE.W_SAFE, `Width <= W_SAFE at ${i}`);
      assert(clamped.height <= TIKTOK_SAFE_ZONE.H_SAFE, `Height <= H_SAFE at ${i}`);
    }
  });

  console.log("\n=================================================================");
  console.log(`📊 TEST SUITE SUMMARY: ${passedCount} / ${passedCount} ASSERTIONS PASSED`);
  console.log("🎉 ALL SAFE ZONE REGISTRY UNIT TESTS PASSED SUCCESSFULLY! (100% SUCCESS)");
  console.log("=================================================================");
}

runSafeZoneVerification().catch((err) => {
  console.error("\n❌ SAFE ZONE REGISTRY VERIFICATION SUITE FAILED:", err);
  process.exit(1);
});
```

---

## 5. Verification Method

### 5.1 Independent Verification Command
The complete unit test suite can be run via:
```powershell
npx jiti src/lib/__tests__/verify-safe-zone.test.ts
```

### 5.2 Verification Checklist for Reviewer & Implementer
1. **Source File**: `src/lib/safe-zone.ts` exists and implements all types, constants, and helper functions specified in Section 4.
2. **Test File**: `src/lib/__tests__/verify-safe-zone.test.ts` executes and passes all 10 test suites (100% pass rate).
3. **Immutability**: All geometries and dictionary records are frozen (`Object.isFrozen`).
4. **Asymmetry**: TikTok profile explicitly enforces `SAFE_RIGHT = 220` and `CENTER_X = 480`.
5. **No Redundant Inlines**: Downstream modules in M2, M3, M4 import exclusively from `src/lib/safe-zone.ts`.

### 5.3 Invalidation Conditions
- Any changes that alter TikTok constants away from `W: 1080, H: 1920, SAFE_TOP: 300, SAFE_BOTTOM: 400, SAFE_LEFT: 100, SAFE_RIGHT: 220`.
- Any coordinate check that permits text rendering in $X > 860\text{px}$ or $Y > 1520\text{px}$ on TikTok profile.
- Any regression breaking `W_SAFE = W - SAFE_LEFT - SAFE_RIGHT` or `CENTER_X = SAFE_LEFT + W_SAFE / 2`.
