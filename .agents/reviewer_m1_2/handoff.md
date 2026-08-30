# Reviewer Report: Milestone 1 (M1) — Unified Safe Zone Geometry Registry

**Reviewer**: Reviewer 2 (`reviewer_m1_2`)  
**Roles**: Reviewer, Adversarial Critic  
**Milestone**: M1 (Unified Safe Zone Geometry Registry)  
**Date**: 2026-08-30  
**Verdict**: **APPROVE**

---

## 1. Observation

### 1.1 Scope & Inspected Work Products
1. **Registry Implementation (`src/lib/safe-zone.ts`)**:
   - Centralized geometry registry defining standard 9:16 safe bounds across platforms:
     - `TIKTOK_SAFE_ZONE`: $W=1080, H=1920, \text{SAFE\_TOP}=300, \text{SAFE\_BOTTOM}=400, \text{SAFE\_LEFT}=100, \text{SAFE\_RIGHT}=220, W_{\text{safe}}=760, H_{\text{safe}}=1220, \text{CENTER\_X}=480, \text{BOTTOM\_MAX\_Y}=1520, \text{TOP\_MIN\_Y}=300$.
     - `REELS_SAFE_ZONE`: $W=1080, H=1920, \text{SAFE\_TOP}=240, \text{SAFE\_BOTTOM}=340, \text{SAFE\_LEFT}=80, \text{SAFE\_RIGHT}=160, W_{\text{safe}}=840, H_{\text{safe}}=1340, \text{CENTER\_X}=500, \text{BOTTOM\_MAX\_Y}=1580, \text{TOP\_MIN\_Y}=240$.
     - `SHORTS_SAFE_ZONE`: $W=1080, H=1920, \text{SAFE\_TOP}=220, \text{SAFE\_BOTTOM}=380, \text{SAFE\_LEFT}=80, \text{SAFE\_RIGHT}=180, W_{\text{safe}}=820, H_{\text{safe}}=1320, \text{CENTER\_X}=490, \text{BOTTOM\_MAX\_Y}=1540, \text{TOP\_MIN\_Y}=220$.
     - `UNIVERSAL_SAFE_ZONE`: Strictest intersection bounding corridor ($W=1080, H=1920, \text{SAFE\_TOP}=300, \text{SAFE\_BOTTOM}=400, \text{SAFE\_LEFT}=100, \text{SAFE\_RIGHT}=220$).
     - `CENTER_SAFE_ZONE`: True-center symmetrical corridor ($W=1080, H=1920, \text{SAFE\_TOP}=300, \text{SAFE\_BOTTOM}=300, \text{SAFE\_LEFT}=100, \text{SAFE\_RIGHT}=100, \text{CENTER\_X}=540$).
     - `REFERENCE_PILL_STANDARDS`: Standardized geometry constants (`DEFAULT_Y: 300, FONT_SIZE: 28, PAD_X: 28, PAD_Y: 14, MIN_VERTICAL_GAP: 24`).
   - Implemented geometric utility functions:
     - `createSafeZone(options)`: Factory for custom geometry objects with non-negative clamp protection via `Math.max(0, ...)`.
     - `getSafeZone(platform)`: Case-insensitive resolver with fallback to `TIKTOK_SAFE_ZONE`.
     - `scaleSafeZone(geomOrProfile, scale)`: Resolution scaling using `Math.round` for integer pixel stability.
     - `getNormalizedSafeZone(platform)`: Fractional coordinates $[0.0 - 1.0]$ with strict sum conservation.
     - `getSafeOverlayCss(platform)`: Formatted percentage strings for UI overlay guides.
     - `getSafeCorridor(platform)`: Absolute boundary metrics container.
     - `isWithinSafeZone(boxOrX, platformOrY, width, height, platform)`: Polymorphic boundary containment checker with `0.001` sub-pixel float tolerance.
     - `clampToSafeZone(box, platformOrGeometry)`: Bounding box clamper ensuring strict safe containment postcondition.
     - `doBoxesCollide(boxA, boxB, minGap)`: 2D AABB collision checker with configurable minimum clearance gap.
     - `getASSSubtitlePlacement(platform, style)` & `getSafeAssStyles(platform, style)`: ASS script styling & optical centering calculator.
     - `getSubtitleAnchorY(platformOrGeometry, style)`: Subtitle vertical anchor resolver.

2. **Downstream Compatibility (`src/lib/render-carousel.ts`)**:
   - Cleanly replaced local geometry definition with re-exports:
     ```ts
     import { TIKTOK_SAFE_ZONE, type SafeZoneGeometry } from "./safe-zone";
     export { TIKTOK_SAFE_ZONE, type SafeZoneGeometry };
     ```
   - No breaking changes introduced to legacy carousel consumers or test suites.

3. **Test Suites & Verification Results**:
   - `npx jiti src/lib/__tests__/verify-safe-zone.test.ts`: **53 / 53 Suites Passed (100%)**.
   - `npx jiti src/lib/__tests__/verify-carousel-upgrade.test.ts`: **49 / 49 Assertions Passed (100%)**.
   - `npm test`: **All Tawheed and Subtitle Sync tests Passed**.
   - `npx jiti src/lib/__tests__/adversarial-r1-r2-challenger.test.ts`: **5 / 5 Suites Passed**.
   - `npx eslint src/lib/safe-zone.ts src/lib/__tests__/verify-safe-zone.test.ts`: **0 Lint Errors**.

### 1.2 Adversarial & Integrity Audit
- **Integrity Violations Check**:
  - No hardcoded test outputs or synthetic cheats detected in `safe-zone.ts`.
  - No dummy or facade implementations; all functions contain genuine mathematical algorithms.
  - No bypass shortcuts; full multi-platform geometry support is implemented.
  - Verification test executions were independently triggered and observed directly in the shell environment.
- **Edge Case & Stress Testing**:
  - 10,000-iteration randomized bounding box fuzzing confirmed that `clampToSafeZone` guarantees `isWithinSafeZone === true` in 100% of cases.
  - Over-constrained custom configurations (where margins exceed canvas dimensions) cleanly clamp `W_SAFE` and `H_SAFE` to 0.
  - Zero-margin custom dimensions correctly yield full-canvas safe dimensions.
  - Normalized fraction sum conservation ($top + height + bottom = 1.0$ and $left + width + right = 1.0$) was confirmed across all profiles within $10^{-6}$ precision.
  - Case insensitivity, untrimmed whitespace, uppercase strings, and unrecognized profile strings gracefully resolve to target profiles or fallback to `TIKTOK_SAFE_ZONE`.

---

## 2. Logic Chain

1. **R1 (Prevent Text Overflow) & R2 (Respect Safe Zones)**:
   - For all text and visual overlays to avoid clipping by platform UI (TikTok right-side interaction sidebar and bottom caption/sound zone), content must be bounded by $X \in [100, 860]\text{px}$ and $Y \in [300, 1520]\text{px}$.
   - The optical horizontal center for TikTok is $\text{CENTER\_X} = \text{SAFE\_LEFT} + W_{\text{safe}} / 2 = 100 + 760 / 2 = 480\text{px}$.
   - By calculating horizontal margins symmetrically around $\text{CENTER\_X} = 480\text{px}$ with maximum line width $\le 760\text{px}$, text is mathematically guaranteed not to exceed $X = 860\text{px}$.
2. **R3 (Prevent Text Overlap)**:
   - `REFERENCE_PILL_STANDARDS` specifies `DEFAULT_Y = 300` and `MIN_VERTICAL_GAP = 24`.
   - `doBoxesCollide(boxA, boxB, minGap)` correctly implements 2D Axis-Aligned Separating Axis Theorem with buffer distance $minGap$, enabling canvas renderers to detect and prevent element overlaps.
3. **Architecture & Contract Compliance**:
   - `src/lib/safe-zone.ts` implements the exact interface contracts specified in `PROJECT.md`.
   - Re-exporting `TIKTOK_SAFE_ZONE` from `src/lib/render-carousel.ts` preserves backwards compatibility for all existing tests and consumers.

---

## 3. Caveats

1. **Native 1080x1920 Base**: Coordinate constants are defined on the standard 1080x1920 frame. For 720p or responsive canvas containers, callers must use `scaleSafeZone` or `getNormalizedSafeZone`.
2. **Subsequent Milestone Implementation**:
   - M1 provides the registry and geometric foundation. Downstream milestones (M2: Single Photo & Thumbnail, M3: Video & Subtitles, M4: Live UI Preview) must import and utilize `src/lib/safe-zone.ts`.

---

## 4. Conclusion

Milestone 1 is **approved without reservations**:
- Mathematical and architectural correctness verified.
- 100% test pass rate across unit, integration, and adversarial fuzzing suites.
- Zero integrity violations or regressions.
- **Verdict: APPROVE**.

---

## 5. Verification Method

To independently verify the Milestone 1 implementation:

```powershell
# 1. Run M1 Safe Zone Unit Test Suite (53 suites)
npx jiti src/lib/__tests__/verify-safe-zone.test.ts

# 2. Run Carousel Upgrade Test Suite (49 assertions)
npx jiti src/lib/__tests__/verify-carousel-upgrade.test.ts

# 3. Run Project Test Suite
npm test

# 4. Run Adversarial Stress Test Suite
npx jiti src/lib/__tests__/adversarial-r1-r2-challenger.test.ts

# 5. Run ESLint on Registry and Tests
npx eslint src/lib/safe-zone.ts src/lib/__tests__/verify-safe-zone.test.ts
```

### Invalidation Conditions
- Modification of TikTok constants away from $W=1080, H=1920, \text{SAFE\_TOP}=300, \text{SAFE\_BOTTOM}=400, \text{SAFE\_LEFT}=100, \text{SAFE\_RIGHT}=220$.
- Any formula deviation where $\text{CENTER\_X} \neq \text{SAFE\_LEFT} + W_{\text{safe}} / 2$.
- Failure of bounding box clamping to satisfy $\text{isWithinSafeZone} = \text{true}$.
