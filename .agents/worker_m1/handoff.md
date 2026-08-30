# Handoff Report: Milestone 1 (M1) — Unified Safe Zone Geometry Registry

**Agent**: Worker M1 (`worker_m1`)  
**Milestone**: M1 (Unified Safe Zone Geometry Registry)  
**Date**: 2026-08-30  
**Status**: COMPLETE (Hard Handoff)  

---

## 1. Observation

### 1.1 Initial State & Problem Space
1. Prior to Milestone 1, safe zone layout metrics were fragmented, duplicated, or conflicting across rendering engines:
   - `src/lib/render-carousel.ts` defined `TIKTOK_SAFE_ZONE` locally (`W: 1080, H: 1920, SAFE_TOP: 300, SAFE_BOTTOM: 400, SAFE_LEFT: 100, SAFE_RIGHT: 220`).
   - `src/lib/render-photo.ts` and `src/lib/render-video.ts` defined local symmetric margins (`top: 320, bottom: 280, side: 180`), which lacked sufficient bottom clearance (280px vs 400px required for TikTok captions/sounds) and right clearance (180px vs 220px required for TikTok sidebar interaction buttons).
   - `src/lib/render.functions.ts` used symmetric ASS margins (`MarginL: 100, MarginR: 100`) and centered at $X = 540\text{px}$ instead of optical center $X = 480\text{px}$.
   - Tests across `src/lib/__tests__/` relied on `TIKTOK_SAFE_ZONE` exported from `render-carousel.ts`.

2. The Milestone 1 objective was to create a centralized single source of truth (`src/lib/safe-zone.ts`), update `src/lib/render-carousel.ts` to re-export from the registry to prevent breaking downstream test suites, and provide an exhaustive unit test suite (`src/lib/__tests__/verify-safe-zone.test.ts`).

### 1.2 Implemented Changes
1. **`src/lib/safe-zone.ts`**:
   - Created with complete TypeScript type declarations: `PlatformSafeZoneProfile`, `SafeZoneGeometry`, `NormalizedSafeZone`, `BoundingBox`, `SafeZoneMargins`, `ASSSubtitlePlacement`, `SafeCorridor`, `SafeOverlayCss`, `SafeAssStyleConfig`.
   - Immutable constants defined via `Object.freeze`:
     - `TIKTOK_SAFE_ZONE`: $W=1080, H=1920, \text{SAFE\_TOP}=300, \text{SAFE\_BOTTOM}=400, \text{SAFE\_LEFT}=100, \text{SAFE\_RIGHT}=220, W_{\text{safe}}=760, H_{\text{safe}}=1220, \text{CENTER\_X}=480, \text{BOTTOM\_MAX\_Y}=1520, \text{TOP\_MIN\_Y}=300$.
     - `REELS_SAFE_ZONE`: $W=1080, H=1920, \text{SAFE\_TOP}=240, \text{SAFE\_BOTTOM}=340, \text{SAFE\_LEFT}=80, \text{SAFE\_RIGHT}=160, W_{\text{safe}}=840, H_{\text{safe}}=1340, \text{CENTER\_X}=500, \text{BOTTOM\_MAX\_Y}=1580, \text{TOP\_MIN\_Y}=240$.
     - `SHORTS_SAFE_ZONE`: $W=1080, H=1920, \text{SAFE\_TOP}=220, \text{SAFE\_BOTTOM}=380, \text{SAFE\_LEFT}=80, \text{SAFE\_RIGHT}=180, W_{\text{safe}}=820, H_{\text{safe}}=1320, \text{CENTER\_X}=490, \text{BOTTOM\_MAX\_Y}=1540, \text{TOP\_MIN\_Y}=220$.
     - `UNIVERSAL_SAFE_ZONE`: Intersection corridor ($W=1080, H=1920, \text{SAFE\_TOP}=300, \text{SAFE\_BOTTOM}=400, \text{SAFE\_LEFT}=100, \text{SAFE\_RIGHT}=220, W_{\text{safe}}=760, H_{\text{safe}}=1220, \text{CENTER\_X}=480, \text{BOTTOM\_MAX\_Y}=1520$).
     - `CENTER_SAFE_ZONE`: Symmetrical centered corridor ($W=1080, H=1920, \text{SAFE\_TOP}=300, \text{SAFE\_BOTTOM}=300, \text{SAFE\_LEFT}=100, \text{SAFE\_RIGHT}=100, W_{\text{safe}}=880, H_{\text{safe}}=1320, \text{CENTER\_X}=540, \text{BOTTOM\_MAX\_Y}=1620$).
     - `SOCIAL_SAFE_ZONES`: Frozen dictionary index.
     - `REFERENCE_PILL_STANDARDS`: Frozen standard layout constants (`DEFAULT_Y: 300, FONT_SIZE: 28, PAD_X: 28, PAD_Y: 14, MIN_VERTICAL_GAP: 24`).
   - Geometric helper functions implemented:
     - `getSafeZone(platform)`: Case-insensitive resolver with graceful fallback to `TIKTOK_SAFE_ZONE`.
     - `createSafeZone(options)`: Factory for custom geometry objects with derived metrics.
     - `scaleSafeZone(geomOrProfile, scale)`: Resolution scaling (e.g. 1080p to 720p) with integer rounding.
     - `getNormalizedSafeZone(platform)`: Returns fractional coordinates $[0.0 - 1.0]$ for CSS/SVG layouts.
     - `getSafeOverlayCss(platform)`: Percentage strings for interactive UI overlay components.
     - `getSafeCorridor(platform)`: Bounding corridor coordinate container.
     - `isWithinSafeZone(boxOrX, platformOrY, width, height, platform)`: Polymorphic boundary checker supporting both bounding box objects and coordinate argument lists.
     - `clampToSafeZone(box, platformOrGeometry)`: Clamps arbitrary bounding boxes to safe bounds while constraining dimensions to $W_{\text{safe}}$ and $H_{\text{safe}}$.
     - `doBoxesCollide(boxA, boxB, minGap)`: Spatial AABB collision checker with configurable minimum gap.
     - `getASSSubtitlePlacement(platform, style)`: Computes ASS alignment, optical $X/Y$ positions, and margins for server FFmpeg rendering.
     - `getSafeAssStyles(platform, style)`: Style configuration generator for ASS subtitles and reference badges.
     - `getSubtitleAnchorY(platformOrGeometry, style)`: Optical anchor $Y$ coordinate for canvas rendering.

2. **`src/lib/render-carousel.ts`**:
   - Replaced inline `TIKTOK_SAFE_ZONE` definition with:
     ```ts
     import { TIKTOK_SAFE_ZONE, type SafeZoneGeometry } from "./safe-zone";
     export { TIKTOK_SAFE_ZONE, type SafeZoneGeometry };
     ```
   - Maintains 100% backward compatibility for all existing carousel and stress test suites.

3. **`src/lib/__tests__/verify-safe-zone.test.ts`**:
   - Implemented 10 distinct test suites comprising 53 individual test cases and 1,000 randomized property-based fuzzing iterations.

---

## 2. Logic Chain

1. **R1 (Prevent Text Overflow) & R2 (Respect Safe Zones)**:
   - For content to never overflow screens or be obscured by platform interaction elements, all rendering engines must compute boundaries from the same mathematical formulation:
     $$W_{\text{safe}} = W - \text{SAFE\_LEFT} - \text{SAFE\_RIGHT}$$
     $$H_{\text{safe}} = H - \text{SAFE\_TOP} - \text{SAFE\_BOTTOM}$$
     $$\text{CENTER\_X} = \text{SAFE\_LEFT} + \frac{W_{\text{safe}}}{2}$$
     $$\text{BOTTOM\_MAX\_Y} = H - \text{SAFE\_BOTTOM}$$
2. For TikTok, having $\text{SAFE\_LEFT} = 100\text{px}$ and $\text{SAFE\_RIGHT} = 220\text{px}$ creates an optical center at $\text{CENTER\_X} = 480\text{px}$. Centering text at $X = 540\text{px}$ causes rightward overflow into TikTok's action buttons at $X > 860\text{px}$. By centering at $X = 480\text{px}$ and constraining maximum line width to $W_{\text{safe}} = 760\text{px}$, text is guaranteed to remain in $X \in [100, 860]\text{px}$.
3. **R3 (Prevent Text Overlap)**:
   - With `REFERENCE_PILL_STANDARDS.DEFAULT_Y = 300` and `MIN_VERTICAL_GAP = 24`, the pill occupies $Y \in [300, 356]\text{px}$. Subsequent Arabic text anchored at $Y \ge 380\text{px}$ satisfies $380 - 356 = 24\text{px} \ge \text{MIN\_VERTICAL\_GAP}$, preventing overlaps.
4. **Backward Compatibility**:
   - Re-exporting `TIKTOK_SAFE_ZONE` from `render-carousel.ts` ensures that existing test suites importing from `render-carousel` continue to pass without modification.

---

## 3. Caveats

1. **Native 9:16 Coordinate Frame**: Native coordinate values are grounded in 1080x1920. When rendering in 720x1280 or responsive preview containers, callers should use `scaleSafeZone` or `getNormalizedSafeZone`.
2. **Subsequent Milestone Dependencies**:
   - Milestone 2 (`render-photo.ts` and `thumbnail.functions.ts`) must import `getSafeZone`, `REFERENCE_PILL_STANDARDS`, and `clampToSafeZone` from `src/lib/safe-zone.ts`.
   - Milestone 3 (`render-video.ts` and `render.functions.ts`) must import `getSafeZone`, `scaleSafeZone`, `getASSSubtitlePlacement`, and `getSubtitleAnchorY` from `src/lib/safe-zone.ts`.
   - Milestone 4 (`create.tsx`) must import `getSafeOverlayCss` and `getNormalizedSafeZone` for interactive overlay guides.

---

## 4. Conclusion

1. Milestone 1 is **100% complete and fully verified**.
2. `src/lib/safe-zone.ts` provides a complete, immutable, type-safe registry supporting `tiktok`, `reels`, `shorts`, `universal`, and `center` platform profiles.
3. All 10 verification test suites in `src/lib/__tests__/verify-safe-zone.test.ts` pass with 53/53 passed suites (100% success).
4. All existing carousel and tawheed test suites continue to pass with 0 regressions.

---

## 5. Verification Method

### 5.1 Verification Commands & Results

1. **M1 Safe Zone Unit Test Suite**:
   ```powershell
   npx jiti src/lib/__tests__/verify-safe-zone.test.ts
   ```
   *Result*: **53 / 53 Suites Passed (100% Success, Exit Code 0)**.

2. **Carousel Upgrade E2E Test Suite**:
   ```powershell
   npx jiti src/lib/__tests__/verify-carousel-upgrade.test.ts
   ```
   *Result*: **49 / 49 Assertions Passed (100% Success, Exit Code 0)**.

3. **Project Test Suite**:
   ```powershell
   npm test
   ```
   *Result*: **All Tawheed and Subtitle Sync tests Passed (Exit Code 0)**.

4. **Adversarial Stress Test Suites**:
   ```powershell
   npx jiti src/lib/__tests__/adversarial-r1-r2-challenger.test.ts
   npx jiti src/lib/__tests__/adversarial-r2-reviewer-stress.test.ts
   npx jiti src/lib/__tests__/adversarial-r3-reviewer-stress.test.ts
   ```
   *Result*: **All Passed (Exit Code 0)**.

5. **Lint Check**:
   ```powershell
   npx eslint src/lib/safe-zone.ts src/lib/render-carousel.ts src/lib/__tests__/verify-safe-zone.test.ts
   ```
   *Result*: **0 Lint Errors (Exit Code 0)**.

### 5.2 Invalidation Conditions
- Any change that modifies TikTok constants away from $W=1080, H=1920, \text{SAFE\_TOP}=300, \text{SAFE\_BOTTOM}=400, \text{SAFE\_LEFT}=100, \text{SAFE\_RIGHT}=220$.
- Any change where `CENTER_X !== SAFE_LEFT + W_SAFE / 2` or `W_SAFE !== W - SAFE_LEFT - SAFE_RIGHT`.
