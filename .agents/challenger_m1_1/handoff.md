# Empirical Challenger Report: Milestone 1 (M1) — Unified Safe Zone Geometry Registry

**Agent**: Challenger 1 (`challenger_m1_1`)  
**Milestone**: M1 (Unified Safe Zone Geometry Registry)  
**Target Code**: `src/lib/safe-zone.ts`  
**Date**: 2026-08-30  
**Verdict**: **APPROVE**  

---

## 1. Observation

### 1.1 Direct Source Observations
1. **`src/lib/safe-zone.ts:153-160` — `TIKTOK_SAFE_ZONE` Definition**:
   ```ts
   export const TIKTOK_SAFE_ZONE: SafeZoneGeometry = createSafeZone({
     W: 1080,
     H: 1920,
     SAFE_TOP: 300,
     SAFE_BOTTOM: 400,
     SAFE_LEFT: 100,
     SAFE_RIGHT: 220,
   });
   ```
   Derived metrics in `createSafeZone` (`src/lib/safe-zone.ts:121-143`):
   - $W_{\text{safe}} = \max(0, 1080 - 100 - 220) = 760\text{px}$
   - $H_{\text{safe}} = \max(0, 1920 - 300 - 400) = 1220\text{px}$
   - $\text{CENTER\_X} = 100 + 760 / 2 = 480\text{px}$
   - $\text{BOTTOM\_MAX\_Y} = 1920 - 400 = 1520\text{px}$
   - $\text{TOP\_MIN\_Y} = 300\text{px}$

2. **`src/lib/safe-zone.ts:333-376` — `isWithinSafeZone` Boundary Checker**:
   Calculates:
   $$\text{minX} = \text{SAFE\_LEFT} = 100, \quad \text{maxX} = W - \text{SAFE\_RIGHT} = 860$$
   $$\text{minY} = \text{TOP\_MIN\_Y} = 300, \quad \text{maxY} = \text{BOTTOM\_MAX\_Y} = 1520$$
   Evaluates:
   ```ts
   return (
     box.x >= minX - 0.001 &&
     boxRight <= maxX + 0.001 &&
     box.y >= minY - 0.001 &&
     boxBottom <= maxY + 0.001
   );
   ```

3. **`src/lib/safe-zone.ts:381-408` — `clampToSafeZone` Coordinate Clamping**:
   - Clamps width to $\min(\text{box.width}, 760)$ and height to $\min(\text{box.height}, 1220)$.
   - Clamps $X$ to $[100, 860 - \text{width}]$ and $Y$ to $[300, 1520 - \text{height}]$.
   - Guarantees $X \ge 100$, $X + \text{width} \le 860$, $Y \ge 300$, $Y + \text{height} \le 1520$.

4. **`src/lib/safe-zone.ts:413-420` — `doBoxesCollide` Collision Engine**:
   - Implements separating axis test with configurable `minGap`:
   ```ts
   return !(
     boxA.x + boxA.width + minGap <= boxB.x ||
     boxB.x + boxB.width + minGap <= boxA.x ||
     boxA.y + boxA.height + minGap <= boxB.y ||
     boxB.y + boxB.height + minGap <= boxA.y
   );
   ```

### 1.2 Empirical Test Execution & Results
1. **Adversarial Stress Test Suite (`src/lib/__tests__/adversarial-m1-challenger.test.ts`)**:
   - Command: `npx jiti src/lib/__tests__/adversarial-m1-challenger.test.ts`
   - Output: `27 / 27 TESTS PASSED (100% Success, Exit Code 0)`.
   - Executed 20,000 property-based random bounding box fuzzing iterations across all profiles.

2. **Worker Unit Test Suite (`src/lib/__tests__/verify-safe-zone.test.ts`)**:
   - Command: `npx jiti src/lib/__tests__/verify-safe-zone.test.ts`
   - Output: `53 / 53 SUITES PASSED (100% Success, Exit Code 0)`.

3. **Carousel Upgrade E2E Suite (`src/lib/__tests__/verify-carousel-upgrade.test.ts`)**:
   - Command: `npx jiti src/lib/__tests__/verify-carousel-upgrade.test.ts`
   - Output: `49 / 49 ASSERTIONS PASSED (100% Success, Exit Code 0)`.

4. **Project Test Suite (`npm test`)**:
   - Output: `All Tawheed Carousel & Subtitle Sync Tests Passed (Exit Code 0)`.

5. **Code Style & Linter (`npx eslint`)**:
   - Command: `npx eslint src/lib/safe-zone.ts src/lib/__tests__/adversarial-m1-challenger.test.ts`
   - Output: `0 errors, 0 warnings (Exit Code 0)`.

---

## 2. Logic Chain

1. **R2 Requirement & Right/Bottom Margin Inviolability ($X \le 860$, $Y \le 1520$)**:
   - TikTok 9:16 layout reserves the right 220px ($X \in (860, 1080]$) for interaction buttons (Like, Comment, Share, Favorites) and bottom 400px ($Y \in (1520, 1920]$) for usernames, captions, and audio discs.
   - Observation 1.1 shows $\text{SAFE\_LEFT} = 100\text{px}$ and $\text{SAFE\_RIGHT} = 220\text{px}$, which leaves a usable horizontal corridor of $[100, 860]\text{px}$ ($W_{\text{safe}} = 760\text{px}$).
   - The optical horizontal center is $\text{CENTER\_X} = 100 + 760 / 2 = 480\text{px}$.
   - Any text block of maximum width $760\text{px}$ centered at $\text{CENTER\_X} = 480\text{px}$ spans exactly $[480 - 380, 480 + 380] = [100, 860]\text{px}$, ensuring 0px encroachment into the forbidden right 220px.
   - S1.5 empirically demonstrated that symmetrical centering at $X = 540\text{px}$ pushes a $760\text{px}$ text block to $X \in [160, 920]\text{px}$, causing a 60px collision with TikTok buttons. `src/lib/safe-zone.ts` correctly establishes $X = 480\text{px}$ as the true optical center.

2. **Mathematical Robustness Under Boundary & Floating Point Conditions**:
   - Boundary tests in S2.1 confirm that sub-pixel float variations within $\pm 0.001\text{px}$ pass gracefully without false positive rejections.
   - Extreme floats ($10^{10}$, $-10^{10}$) and out-of-bound coordinates are strictly rejected without numeric overflow.
   - Corner points of zero size (`width: 0, height: 0`) at $(100, 300)$ and $(860, 1520)$ correctly register as within safe bounds, while points at $(99.9, 300)$ and $(860.1, 300)$ are rejected.

3. **Input Sanitization & Safe Defaults**:
   - `getSafeZone` safely handles `undefined`, `null`, `""`, whitespace-only strings, unrecognized platform names, numbers, and object types by defaulting to `TIKTOK_SAFE_ZONE`.
   - `isWithinSafeZone` returns `false` when presented with `NaN` coordinates without crashing.

4. **Coordinate Clamping Invariants**:
   - S4.1–S4.5 and S7.1–S7.2 fuzzed 20,000 arbitrary bounding boxes with coordinates in $[-5000, 5000]$ and dimensions up to $5000\text{px}$.
   - In 100.00% of cases, the clamped box satisfied:
     $$X \ge 100, \quad X + \text{width} \le 860, \quad Y \ge 300, \quad Y + \text{height} \le 1520$$
     $$\text{width} \le 760, \quad \text{height} \le 1220$$
     $$\text{isWithinSafeZone}(\text{clampedBox}, \text{"tiktok"}) \equiv \text{true}$$

5. **Collision Engine Accuracy**:
   - S5.1–S5.4 verified AABB collision detection: non-overlapping boxes return `false`, intersecting boxes return `true`, touching boxes at boundary (0px gap) return `false`, and vertical gap threshold (24px for `REFERENCE_PILL_STANDARDS`) accurately detects collisions for gaps $< 24\text{px}$ and clears for gaps $\ge 24\text{px}$.

---

## 3. Challenge Report

### 3.1 Challenge Summary
- **Overall Risk Assessment**: **LOW**
- **Target Module**: `src/lib/safe-zone.ts`
- **Result**: All 27 stress test suites passed without a single failure or regression.

### 3.2 Challenges Evaluated

#### Challenge 1: Right Sidebar & Bottom Caption Breach under Centered Layouts
- **Assumption Challenged**: Text centered horizontally might encroach on TikTok's right sidebar if using $X = 540\text{px}$.
- **Attack Scenario**: Render $760\text{px}$ full-width text centered at $X = 540\text{px}$.
- **Empirical Finding**: $X = 540\text{px}$ causes right edge to reach $920\text{px}$ ($> 860\text{px}$), which `isWithinSafeZone` properly flags as invalid (`false`). `src/lib/safe-zone.ts` uses optical center $\text{CENTER\_X} = 480\text{px}$, anchoring text within $[100, 860]\text{px}$.
- **Status**: PASSED / MITIGATED.

#### Challenge 2: Floating Point Precision & Sub-Pixel Arithmetic
- **Assumption Challenged**: Sub-pixel canvas rendering (e.g. $100.0001\text{px}$) could trigger false rejections due to strict inequality checks.
- **Attack Scenario**: Pass coordinates with sub-pixel offsets near boundary thresholds.
- **Empirical Finding**: `isWithinSafeZone` incorporates a $0.001\text{px}$ epsilon margin, allowing valid sub-pixel measurements while strictly rejecting deviations $\ge 0.005\text{px}$.
- **Status**: PASSED.

#### Challenge 3: Malformed & NaN Inputs
- **Assumption Challenged**: Passing `NaN` or invalid types could cause unexpected truthy checks or unhandled exceptions.
- **Attack Scenario**: Pass `NaN` coordinates, `null`, `undefined`, numeric or object platform profiles.
- **Empirical Finding**: `NaN` checks cleanly evaluate to `false` in `isWithinSafeZone`; invalid platform arguments cleanly fall back to `TIKTOK_SAFE_ZONE`.
- **Status**: PASSED.

#### Challenge 4: Clamping Oversized / Negative Coordinates
- **Assumption Challenged**: Negative sizes or oversized boxes ($> 1000\text{px}$) might produce negative coordinates or overflow right/bottom bounds.
- **Attack Scenario**: 20,000 randomized boxes with coordinates $[-5000, 5000]$ and sizes up to $5000\text{px}$.
- **Empirical Finding**: `clampToSafeZone` clamps dimensions to $(W_{\text{safe}}, H_{\text{safe}})$ first, then clamps positions to $([\text{minX}, \text{maxX} - \text{width}], [\text{minY}, \text{maxY} - \text{height}])$. 100% of clamped boxes strictly satisfied containment.
- **Status**: PASSED.

### 3.3 Unchallenged Areas
- Downstream canvas font rendering and dynamic auto-fit engines in `render-photo.ts` and `render-video.ts` belong to Milestones 2 and 3 and will be challenged in their respective milestone reviews.

---

## 4. Caveats

1. **Resolution Scaling**: `src/lib/safe-zone.ts` defaults to 1080x1920 native coordinates. Renderers operating in 720p or responsive UI components must call `scaleSafeZone` or `getNormalizedSafeZone`.
2. **Subsequent Milestones**: Renderers in M2 (`render-photo.ts`, `thumbnail.functions.ts`) and M3 (`render-video.ts`, `render.functions.ts`) must import and use the registry utilities correctly to maintain layout guarantees.

---

## 5. Conclusion

**Verdict: APPROVE**

Milestone 1 implementation `src/lib/safe-zone.ts` is mathematically rigorous, type-safe, immutable, and fully resistant to adversarial boundary, floating-point, and malformed input scenarios. It strictly enforces the TikTok safe zone boundary conditions ($X \le 860\text{px}$, $Y \le 1520\text{px}$), guarantees complete containment under clamping, and provides accurate collision detection.

---

## 6. Verification Method

To independently verify all claims in this report, run:

```powershell
# 1. Run Challenger 1 Adversarial Stress Test Suite (27 suites, 20k fuzz iterations)
npx jiti src/lib/__tests__/adversarial-m1-challenger.test.ts

# 2. Run Unified Safe Zone Registry Unit Test Suite (53 suites)
npx jiti src/lib/__tests__/verify-safe-zone.test.ts

# 3. Run TikTok Carousel Upgrade E2E Test Suite (49 assertions)
npx jiti src/lib/__tests__/verify-carousel-upgrade.test.ts

# 4. Run Full Project Test Suite
npm test

# 5. Run ESLint on Registry and Challenger Suite
npx eslint src/lib/safe-zone.ts src/lib/__tests__/adversarial-m1-challenger.test.ts
```

### Invalidation Conditions
- Any regression where `TIKTOK_SAFE_ZONE.SAFE_RIGHT !== 220` or `TIKTOK_SAFE_ZONE.SAFE_BOTTOM !== 400`.
- Any modification that allows text bounding boxes with $X + \text{width} > 860$ or $Y + \text{height} > 1520$ to return `true` from `isWithinSafeZone(box, "tiktok")`.
- Any failure in `adversarial-m1-challenger.test.ts` or `verify-safe-zone.test.ts`.
