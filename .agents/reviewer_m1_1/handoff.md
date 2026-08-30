# Milestone 1 (M1) Quality & Adversarial Review Report

**Reviewer**: Reviewer M1 (`reviewer_m1_1`)  
**Roles**: reviewer, critic  
**Target**: Milestone 1 (M1: Unified Safe Zone Geometry Registry)  
**Date**: 2026-08-30  
**Verdict**: **APPROVE**  

---

## 1. Observation

1. **Codebase Inspection**:
   - `src/lib/safe-zone.ts` defines complete typed safe zone specifications for `tiktok`, `reels`, `shorts`, `universal`, and `center` platform profiles.
   - All constant objects (`TIKTOK_SAFE_ZONE`, `REELS_SAFE_ZONE`, `SHORTS_SAFE_ZONE`, `UNIVERSAL_SAFE_ZONE`, `CENTER_SAFE_ZONE`, `SOCIAL_SAFE_ZONES`, `REFERENCE_PILL_STANDARDS`) are protected against runtime mutation using `Object.freeze`.
   - Core invariants strictly hold:
     - TikTok: $W = 1080, H = 1920, \text{SAFE\_TOP} = 300, \text{SAFE\_BOTTOM} = 400, \text{SAFE\_LEFT} = 100, \text{SAFE\_RIGHT} = 220, W_{\text{safe}} = 760, H_{\text{safe}} = 1220, \text{CENTER\_X} = 480, \text{BOTTOM\_MAX\_Y} = 1520, \text{TOP\_MIN\_Y} = 300$.
     - Reels: $W = 1080, H = 1920, \text{SAFE\_TOP} = 240, \text{SAFE\_BOTTOM} = 340, \text{SAFE\_LEFT} = 80, \text{SAFE\_RIGHT} = 160, W_{\text{safe}} = 840, H_{\text{safe}} = 1340, \text{CENTER\_X} = 500, \text{BOTTOM\_MAX\_Y} = 1580, \text{TOP\_MIN\_Y} = 240$.
     - Shorts: $W = 1080, H = 1920, \text{SAFE\_TOP} = 220, \text{SAFE\_BOTTOM} = 380, \text{SAFE\_LEFT} = 80, \text{SAFE\_RIGHT} = 180, W_{\text{safe}} = 820, H_{\text{safe}} = 1320, \text{CENTER\_X} = 490, \text{BOTTOM\_MAX\_Y} = 1540, \text{TOP\_MIN\_Y} = 220$.
     - Universal: $W = 1080, H = 1920, \text{SAFE\_TOP} = 300, \text{SAFE\_BOTTOM} = 400, \text{SAFE\_LEFT} = 100, \text{SAFE\_RIGHT} = 220, W_{\text{safe}} = 760, H_{\text{safe}} = 1220, \text{CENTER\_X} = 480, \text{BOTTOM\_MAX\_Y} = 1520$.
     - Center: $W = 1080, H = 1920, \text{SAFE\_TOP} = 300, \text{SAFE\_BOTTOM} = 300, \text{SAFE\_LEFT} = 100, \text{SAFE\_RIGHT} = 100, W_{\text{safe}} = 880, H_{\text{safe}} = 1320, \text{CENTER\_X} = 540, \text{BOTTOM\_MAX\_Y} = 1620$.
     - Reference Pill: $\text{DEFAULT\_Y} = 300, \text{FONT\_SIZE} = 28, \text{PAD\_X} = 28, \text{PAD\_Y} = 14, \text{MIN\_VERTICAL\_GAP} = 24$.
   - Helper methods implemented:
     - `createSafeZone(options)`: Instantiates frozen custom geometry with derived attributes.
     - `getSafeZone(platform)`: Case-insensitive resolver with fallback to `TIKTOK_SAFE_ZONE`.
     - `scaleSafeZone(geomOrProfile, scale)`: Resolution scaling (e.g. 1080p to 720p or responsive canvas) with integer rounding.
     - `getNormalizedSafeZone(platform)`: Fractional coordinates $[0.0 - 1.0]$ for SVG and CSS overlays.
     - `getSafeOverlayCss(platform)`: Percentage strings for Live UI preview overlays.
     - `getSafeCorridor(platform)`: Explicit bounding box coordinate ranges.
     - `isWithinSafeZone(...)`: Polymorphic bounds checker supporting both `BoundingBox` and `(x, y, w, h)`.
     - `clampToSafeZone(box, platform)`: Constrains bounding boxes to safe bounds and max dimensions ($W_{\text{safe}}, H_{\text{safe}}$).
     - `doBoxesCollide(boxA, boxB, minGap)`: Spatial AABB collision checker with configurable minimum gap.
     - `getASSSubtitlePlacement(platform, style)` & `getSafeAssStyles(platform, style)`: Subtitle anchor and styling generator for server-side FFmpeg rendering.
     - `getSubtitleAnchorY(platformOrGeometry, style)`: Subtitle anchor $Y$ coordinate for client video and canvas renderers.

2. **Backward Compatibility**:
   - `src/lib/render-carousel.ts` imports and re-exports `TIKTOK_SAFE_ZONE` and `SafeZoneGeometry` directly from `src/lib/safe-zone.ts`. All existing carousel suites execute seamlessly without modification.

3. **Integrity Audit**:
   - No hardcoded test responses or facade implementations detected.
   - All helper functions perform genuine mathematical calculations and boundary clamping.
   - Zero integrity violations found.

4. **Test Suite Execution**:
   - `npx jiti src/lib/__tests__/verify-safe-zone.test.ts`: 53/53 test suites passed (100% success).
   - `npx jiti src/lib/__tests__/verify-carousel-upgrade.test.ts`: 49/49 assertions passed (100% success).
   - `npm test`: Tawheed carousel rotation and Subtitle Sync suites passed cleanly.
   - `npx jiti src/lib/__tests__/adversarial-r1-r2-challenger.test.ts`: 5/5 suites passed.
   - `npx jiti src/lib/__tests__/adversarial-r2-reviewer-stress.test.ts`: 6/6 suites passed.
   - `npx jiti src/lib/__tests__/adversarial-r3-reviewer-stress.test.ts`: 6/6 suites passed.
   - `npx eslint src/lib/safe-zone.ts`: 0 errors / 0 warnings.

---

## 2. Logic Chain

1. **R1 (Prevent Text Overflow) & R2 (Respect Safe Zones)**:
   - For all renderers (canvas, SVG, video, ASS subtitles, UI preview) to eliminate text overflow and avoid overlapping social media UI elements, there must be a unified mathematical definition of safe corridors.
   - By standardizing $W_{\text{safe}} = W - \text{SAFE\_LEFT} - \text{SAFE\_RIGHT}$ and $\text{CENTER\_X} = \text{SAFE\_LEFT} + W_{\text{safe}} / 2$, TikTok's asymmetric right margin ($\text{SAFE\_RIGHT} = 220\text{px}$) shifts the optical center from $X = 540\text{px}$ to $X = 480\text{px}$. Any text line bounded by $W_{\text{safe}} = 760\text{px}$ rendered at $\text{CENTER\_X} = 480\text{px}$ spans $X \in [100\text{px}, 860\text{px}]$, preventing overlap with TikTok's right sidebar action buttons ($X > 860\text{px}$).
   - By constraining the bottom anchor to $\text{BOTTOM\_MAX\_Y} = H - \text{SAFE\_BOTTOM} = 1520\text{px}$, subtitles and CTA text never collide with bottom captions, usernames, or sound discs ($Y > 1520\text{px}$).

2. **R3 (Prevent Text Overlap)**:
   - Defining `REFERENCE_PILL_STANDARDS` with $\text{DEFAULT\_Y} = 300\text{px}$ and $\text{MIN\_VERTICAL\_GAP} = 24\text{px}$ guarantees that reference pills and following scripture/commentary text maintain sufficient vertical separation, avoiding visual collisions.
   - `doBoxesCollide` with configurable `minGap` provides a shared predicate for verifying spacing in automated tests and dynamic layout engines.

3. **Immutability & Concurrency Safety**:
   - Freezing all registry constants ensures that multiple rendering workers or downstream components cannot inadvertently modify geometry parameters during runtime.

---

## 3. Caveats

1. **Downstream Milestone Integration**:
   - Milestone 2 (`render-photo.ts`, `thumbnail.functions.ts`) must consume `getSafeZone`, `REFERENCE_PILL_STANDARDS`, and `clampToSafeZone`.
   - Milestone 3 (`render-video.ts`, `render.functions.ts`) must consume `scaleSafeZone`, `getASSSubtitlePlacement`, and `getSubtitleAnchorY`.
   - Milestone 4 (`create.tsx`) must consume `getSafeOverlayCss` and `getNormalizedSafeZone`.
2. **Independent Test File Note**:
   - `src/lib/__tests__/e2e-safe-zones-and-layout.test.ts` is currently being authored as part of the parallel E2E testing track. A syntax error on its unclosed line 423 is expected during authoring and does not affect the Milestone 1 registry or its dedicated unit and E2E verification suites.

---

## 4. Conclusion & Review Verdict

- **Verdict**: **APPROVE**
- **Quality Assessment**: The implementation is mathematically rigorous, fully type-safe, immutable, backward-compatible, and thoroughly verified by unit tests, E2E tests, and randomized fuzzing.
- **Milestone 1 is ready for merge and unblocks Milestones M2, M3, and M4.**

---

## 5. Verification Method

### 5.1 Verification Commands

```powershell
# 1. Execute Unified Safe Zone Unit Test Suite (53 suites, 1000 fuzz iterations)
npx jiti src/lib/__tests__/verify-safe-zone.test.ts

# 2. Execute Carousel Upgrade E2E Verification Suite (49 assertions across 4 tiers)
npx jiti src/lib/__tests__/verify-carousel-upgrade.test.ts

# 3. Execute Project Core Test Suite (Tawheed diversity + Subtitle synchronization)
npm test

# 4. Execute Adversarial Challenger & Reviewer Stress Test Suites
npx jiti src/lib/__tests__/adversarial-r1-r2-challenger.test.ts
npx jiti src/lib/__tests__/adversarial-r2-reviewer-stress.test.ts
npx jiti src/lib/__tests__/adversarial-r3-reviewer-stress.test.ts

# 5. ESLint Code Conformance
npx eslint src/lib/safe-zone.ts
```

### 5.2 Invalidation Conditions
- Any change that alters TikTok geometric constants away from $W=1080, H=1920, \text{SAFE\_TOP}=300, \text{SAFE\_BOTTOM}=400, \text{SAFE\_LEFT}=100, \text{SAFE\_RIGHT}=220$.
- Any modification where `CENTER_X !== SAFE_LEFT + W_SAFE / 2` or `W_SAFE !== W - SAFE_LEFT - SAFE_RIGHT`.
- Any regression breaking the re-export of `TIKTOK_SAFE_ZONE` from `src/lib/render-carousel.ts`.
