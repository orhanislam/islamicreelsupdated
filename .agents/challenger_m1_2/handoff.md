# Empirical Challenge Report: Milestone 1 (M1) — Unified Safe Zone Geometry Registry

**Agent**: Challenger 2 (`challenger_m1_2`)  
**Role**: critic, specialist (Empirical Challenger)  
**Milestone**: M1 (Unified Safe Zone Geometry Registry)  
**Verdict**: **APPROVE**  
**Date**: 2026-08-30  

---

## 1. Observation

### 1.1 Evaluated Files & Invariants
Directly inspected and verified implementation artifacts in `src/lib/safe-zone.ts`, `src/lib/render-carousel.ts`, `src/lib/__tests__/verify-safe-zone.test.ts`, and `PROJECT.md`:

1. **Platform Profile Constants & Geometric Derivations (`src/lib/safe-zone.ts:153-228`)**:
   - **TikTok (`TIKTOK_SAFE_ZONE`)**:
     - Dimensions: $W=1080, H=1920$
     - Margins: $\text{SAFE\_TOP}=300, \text{SAFE\_BOTTOM}=400, \text{SAFE\_LEFT}=100, \text{SAFE\_RIGHT}=220$
     - Derived: $W_{\text{safe}}=760, H_{\text{safe}}=1220, \text{CENTER\_X}=480, \text{BOTTOM\_MAX\_Y}=1520, \text{TOP\_MIN\_Y}=300$
   - **Instagram Reels (`REELS_SAFE_ZONE`)**:
     - Dimensions: $W=1080, H=1920$
     - Margins: $\text{SAFE\_TOP}=240, \text{SAFE\_BOTTOM}=340, \text{SAFE\_LEFT}=80, \text{SAFE\_RIGHT}=160$
     - Derived: $W_{\text{safe}}=840, H_{\text{safe}}=1340, \text{CENTER\_X}=500, \text{BOTTOM\_MAX\_Y}=1580, \text{TOP\_MIN\_Y}=240$
   - **YouTube Shorts (`SHORTS_SAFE_ZONE`)**:
     - Dimensions: $W=1080, H=1920$
     - Margins: $\text{SAFE\_TOP}=220, \text{SAFE\_BOTTOM}=380, \text{SAFE\_LEFT}=80, \text{SAFE\_RIGHT}=180$
     - Derived: $W_{\text{safe}}=820, H_{\text{safe}}=1320, \text{CENTER\_X}=490, \text{BOTTOM\_MAX\_Y}=1540, \text{TOP\_MIN\_Y}=220$
   - **Universal Safe Corridor (`UNIVERSAL_SAFE_ZONE`)**:
     - Bounds: $\text{SAFE\_TOP}=300, \text{SAFE\_BOTTOM}=400, \text{SAFE\_LEFT}=100, \text{SAFE\_RIGHT}=220, W_{\text{safe}}=760, H_{\text{safe}}=1220, \text{CENTER\_X}=480$
   - **Symmetrical Center Safe Zone (`CENTER_SAFE_ZONE`)**:
     - Bounds: $\text{SAFE\_TOP}=300, \text{SAFE\_BOTTOM}=300, \text{SAFE\_LEFT}=100, \text{SAFE\_RIGHT}=100, W_{\text{safe}}=880, H_{\text{safe}}=1320, \text{CENTER\_X}=540$

2. **ASS Subtitle Alignment & Margins (`src/lib/safe-zone.ts:431-484`)**:
   - `getASSSubtitlePlacement("tiktok", "lower-third")`: `alignment: 2, posX: 480, posY: 1420, marginL: 100, marginR: 220, marginV: 500`
   - `getASSSubtitlePlacement("reels", "lower-third")`: `alignment: 2, posX: 500, posY: 1421, marginL: 80, marginR: 160, marginV: 499`
   - `getASSSubtitlePlacement("shorts", "lower-third")`: `alignment: 2, posX: 490, posY: 1421, marginL: 80, marginR: 180, marginV: 499`
   - `getASSSubtitlePlacement("center", "center")`: `alignment: 5, posX: 540, posY: 960, marginL: 100, marginR: 100, marginV: 960`

3. **Resolution Scaling & Precision Functions (`src/lib/safe-zone.ts:271-325`)**:
   - `scaleSafeZone(profile, scale)` properly rounds dimensions and recalculates all derived safe coordinates without NaN, Inf, or precision leakage.
   - `getNormalizedSafeZone(profile)` satisfies exact identity $\text{left} + \text{width} + \text{right} = 1.0$ and $\text{top} + \text{height} + \text{bottom} = 1.0$ within sub-picometer epsilon ($10^{-12}$).
   - `getSafeOverlayCss(profile)` outputs well-formed percentage strings matching normalized boundaries within $\pm 0.005\%$.

### 1.2 Empirical Execution Logs
Authored and executed exhaustive challenge suite `src/lib/__tests__/adversarial-m1-challenger2.test.ts`:
```powershell
npx jiti src/lib/__tests__/adversarial-m1-challenger2.test.ts
```
**Output**:
```
=================================================================
🛡️ RUNNING CHALLENGER 2 EMPIRICAL TEST SUITE (MILESTONE 1)
=================================================================

--- Section 1: Multi-Platform Variance (TikTok vs Reels vs Shorts) ---
  ✔ [PASS] 1.1: Platform Profiles distinct geometry & center point verification
  ✔ [PASS] 1.2: Cross-platform differential boundary discrimination
  ✔ [PASS] 1.3: ASS Subtitle Placement across all platform profiles
  ✔ [PASS] 1.4: Safe ASS Style configurations for FFmpeg & Reference Badges

--- Section 2: Resolution Scaling (720p, 1080p, 4K, 8K, Arbitrary) ---
  ✔ [PASS] 2.1: 720p Scaling (720x1280) precision and invariant preservation
  ✔ [PASS] 2.2: 4K UHD Scaling (2160x3840) scale=2.0 exact calculation
  ✔ [PASS] 2.3: 8K Ultra HD Scaling (4320x7680) scale=4.0
  ✔ [PASS] 2.4: Mobile & Responsive Preview Viewports (360x640, 393x852, 414x896)
  ✔ [PASS] 2.5: Extreme Floating Point & Fractional Scales (Irrational fractions, small scales)
  ✔ [PASS] 2.6: Normalized Safe Zone high precision & sum-to-one validation
  ✔ [PASS] 2.7: SafeOverlayCss formatting and percentage precision

--- Section 3: Boundary Stress, Clamping Idempotence & Fuzzing ---
  ✔ [PASS] 3.1: Clamping Idempotence (clamp(clamp(B)) === clamp(B)) across 5,000 randomized boxes
  ✔ [PASS] 3.2: 5,000 Randomized Viewport Scaling Fuzzing
  ✔ [PASS] 3.3: Reference Pill Collision Clearance & Gap Enforcing Verification

=================================================================
📊 ADVERSARIAL CHALLENGER 2 SUMMARY:
   - Test Suites Passed: 14 / 14
   - Total Assertions Verified: 110328
🏆 ALL ADVERSARIAL CHALLENGER TESTS PASSED (100% EMPIRICAL SUCCESS)
=================================================================
```

Worker unit test verification:
```powershell
npx jiti src/lib/__tests__/verify-safe-zone.test.ts
# 53 / 53 Suites Passed (Exit code 0)

npm test
# All Tawheed and Subtitle Sync tests Passed (Exit code 0)

npx eslint src/lib/safe-zone.ts src/lib/__tests__/adversarial-m1-challenger2.test.ts
# 0 problems (0 errors, 0 warnings) (Exit code 0)
```

---

## 2. Logic Chain

1. **Multi-Platform Variance Verification**:
   - Observations 1.1.1 and 1.2 demonstrate that TikTok ($X_{\text{center}}=480, W_{\text{safe}}=760$), Instagram Reels ($X_{\text{center}}=500, W_{\text{safe}}=840$), and YouTube Shorts ($X_{\text{center}}=490, W_{\text{safe}}=820$) are correctly differentiated.
   - Cross-platform boundary discrimination tests confirmed that elements valid in Reels ($X \in [80, 920]$) or Shorts ($X \in [80, 900]$) fail strict TikTok boundary checks when they exceed $X > 860$, properly guarding against right-sidebar UI clipping on TikTok while allowing maximum canvas real estate on Reels and Shorts.
   - ASS subtitle placement correctly reflects optical centers: TikTok at $X=480$, Reels at $X=500$, Shorts at $X=490$, and centered layouts at $X=540$.

2. **Resolution Scaling & Precision Invariance**:
   - In 720p scaling ($720 \times 1280$), integer rounding produces valid geometries ($W_{\text{safe}}=506, H_{\text{safe}}=813, X_{\text{center}}=320$ for TikTok; $W_{\text{safe}}=560, H_{\text{safe}}=893, X_{\text{center}}=333$ for Reels).
   - In 4K UHD scaling ($2160 \times 3840$), dimensions scale with exact $2.0 \times$ multipliers ($W_{\text{safe}}=1520, H_{\text{safe}}=2440, X_{\text{center}}=960$ for TikTok; $W_{\text{safe}}=1680, X_{\text{center}}=1000$ for Reels).
   - Across 5,000 fuzzed viewport resolutions, all invariant equations $W_{\text{safe}} = W - \text{SAFE\_LEFT} - \text{SAFE\_RIGHT}$, $\text{CENTER\_X} = \text{SAFE\_LEFT} + W_{\text{safe}}/2$, and $\text{BOTTOM\_MAX\_Y} = H - \text{SAFE\_BOTTOM}$ held without exception.
   - Normalized coordinate calculations showed zero precision breakdown ($|(\text{left} + \text{width} + \text{right}) - 1.0| < 10^{-12}$).

3. **Clamping & Spatial Collision Guarantee**:
   - Clamping was proven strictly idempotent ($\text{clamp}(\text{clamp}(B)) \equiv \text{clamp}(B)$) across 5,000 randomized bounding boxes.
   - `doBoxesCollide` with $\text{minGap} = 24$ accurately differentiated valid clearances from collisions.

---

## 3. Caveats

No caveats. All platform geometries, mathematical scaling functions, ASS coordinates, and edge cases have been empirically tested and proven stable.

---

## 4. Conclusion

The implementation of `src/lib/safe-zone.ts` meets all architectural specifications in `PROJECT.md` and fulfills the requirements of Milestone 1.

**Verdict: APPROVE**

---

## 5. Verification Method

To independently verify these results:

```powershell
# 1. Run Challenger 2 Adversarial Stress Test Suite
npx jiti src/lib/__tests__/adversarial-m1-challenger2.test.ts

# 2. Run Milestone 1 Safe Zone Unit Test Suite
npx jiti src/lib/__tests__/verify-safe-zone.test.ts

# 3. Run Project Regression Tests
npm test

# 4. Run ESLint Conformance Check
npx eslint src/lib/safe-zone.ts src/lib/__tests__/adversarial-m1-challenger2.test.ts
```

### Invalidation Conditions
- Any drift where `CENTER_X !== SAFE_LEFT + W_SAFE / 2`.
- Any modification to Reels center ($X \neq 500$) or Shorts center ($X \neq 490$) in 1080p base geometry.
- Any floating point scaling regression yielding NaN, negative safe corridors, or unrounded canvas pixel dimensions.

---

## 6. Adversarial Challenge Report

### Challenge Summary
- **Overall risk assessment**: **LOW**
- The registry is mathematically solid, strictly typed, frozen against runtime mutation, and cleanly decoupled from rendering side effects.

### Challenges Evaluated

#### Challenge 1: Center Point & Safe Width Discrepancy between TikTok, Reels, and Shorts
- **Assumption challenged**: Whether Reels ($X=500, W=840$) and Shorts ($X=490, W=820$) correctly account for asymmetrical action buttons and avoid standard TikTok right-edge clipping ($X > 860$).
- **Attack scenario**: Subtitles or cards rendered with Reels margins evaluated against TikTok safe corridor and vice versa.
- **Stress Test Result**: **PASS**. Cross-platform boundary checker accurately rejects Reels-sized cards on TikTok profiles while approving them on Reels.

#### Challenge 2: Floating-Point Precision Breakdown in Resolution Scaling & Normalization
- **Assumption challenged**: Whether fractional scaling factors (e.g. $720/1080 = 0.666...$, $1/3$, irrational numbers) introduce sub-pixel rounding drift, NaN coordinates, or unaligned ASS margins.
- **Attack scenario**: Tested 5,000 randomized viewport dimensions $[100..3840] \times [100..7680]$ and extreme fractional scaling factors.
- **Stress Test Result**: **PASS**. All derived integer boundaries and normalized float sums satisfied invariants with zero precision breakdown.

#### Challenge 3: Clamping Non-Idempotence & Edge Case Escape
- **Assumption challenged**: Whether out-of-bounds boxes with extreme negative offsets or oversized dimensions could escape the safe corridor after clamping.
- **Attack scenario**: Fuzzed 5,000 arbitrary bounding boxes with offsets up to $\pm 5000\text{px}$ and sizes up to $3000\text{px}$.
- **Stress Test Result**: **PASS**. Clamping was 100% idempotent and guaranteed strictly in-bounds boxes in 100% of cases.

### Unchallenged Areas
- Downstream rendering integration in `render-photo.ts` and `render-video.ts` belongs to Milestones 2 and 3 and was not challenged here as it is out of Milestone 1 scope.
