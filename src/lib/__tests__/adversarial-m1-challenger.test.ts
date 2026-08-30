/**
 * ADVERSARIAL STRESS TEST SUITE — CHALLENGER M1
 * File: src/lib/__tests__/adversarial-m1-challenger.test.ts
 *
 * Exhaustively stress-tests:
 * 1. TikTok safe zone right margin (X <= 860) & bottom margin (Y <= 1520) inviolability
 * 2. Boundary conditions, sub-pixel floats, IEEE 754 precision, extreme floats
 * 3. NaN, undefined, null, negative, and malformed input handling
 * 4. Coordinate clamping across all 4 corner quadrants & extreme intervals
 * 5. AABB collision detection accuracy & precision across gap boundaries
 * 6. Multi-platform profile invariant integrity (TikTok, Reels, Shorts, Universal, Center)
 * 7. 10,000-iteration randomized fuzzing harness
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
  getSafeOverlayCss,
  getSafeCorridor,
  isWithinSafeZone,
  clampToSafeZone,
  doBoxesCollide,
  getASSSubtitlePlacement,
  getSafeAssStyles,
  getSubtitleAnchorY,
  type SafeZoneGeometry,
  type BoundingBox,
} from "../safe-zone";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED] ${message}`);
  }
}

function assertClose(actual: number, expected: number, epsilon = 0.0001, message = "") {
  if (Math.abs(actual - expected) > epsilon) {
    throw new Error(
      `[ASSERTION FAILED] ${message}: expected ${expected} ±${epsilon}, got ${actual}`,
    );
  }
}

function runTest(name: string, fn: () => void) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✔ [PASS] ${name}`);
  } catch (err: unknown) {
    failedTests++;
    const message = err instanceof Error ? err.message : String(err);
    console.error(`  ✖ [FAIL] ${name}: ${message}`);
    throw err;
  }
}

console.log("================================================================================");
console.log("⚡ ADVERSARIAL CHALLENGER M1: SAFE ZONE REGISTRY STRESS TEST HARNESS");
console.log("================================================================================\n");

// ============================================================================
// SECTION 1: TIKTOK SAFE ZONE RIGHT (X <= 860) & BOTTOM (Y <= 1520) INVIOLABILITY
// ============================================================================
console.log("--- Section 1: TikTok Safe Zone Strict Margin Constraints ---");

runTest("S1.1: Exact TikTok coordinate boundaries", () => {
  assert(TIKTOK_SAFE_ZONE.W === 1080, "TikTok W === 1080");
  assert(TIKTOK_SAFE_ZONE.H === 1920, "TikTok H === 1920");
  assert(TIKTOK_SAFE_ZONE.SAFE_LEFT === 100, "SAFE_LEFT === 100");
  assert(TIKTOK_SAFE_ZONE.SAFE_RIGHT === 220, "SAFE_RIGHT === 220 (clears sidebar)");
  assert(TIKTOK_SAFE_ZONE.SAFE_TOP === 300, "SAFE_TOP === 300 (clears header)");
  assert(TIKTOK_SAFE_ZONE.SAFE_BOTTOM === 400, "SAFE_BOTTOM === 400 (clears captions/sound)");
  assert(TIKTOK_SAFE_ZONE.W_SAFE === 760, "W_SAFE === 760 (1080 - 100 - 220)");
  assert(TIKTOK_SAFE_ZONE.H_SAFE === 1220, "H_SAFE === 1220 (1920 - 300 - 400)");
  assert(TIKTOK_SAFE_ZONE.CENTER_X === 480, "CENTER_X === 480 (100 + 760/2)");
  assert(TIKTOK_SAFE_ZONE.BOTTOM_MAX_Y === 1520, "BOTTOM_MAX_Y === 1520 (1920 - 400)");
  assert(TIKTOK_SAFE_ZONE.TOP_MIN_Y === 300, "TOP_MIN_Y === 300");
});

runTest("S1.2: Strict right margin prevention (X <= 860)", () => {
  // Rightmost allowed pixel for text right edge is 860
  const maxRightBox: BoundingBox = { x: 100, y: 300, width: 760, height: 100 };
  assert(
    isWithinSafeZone(maxRightBox, "tiktok"),
    "Box extending to exactly X=860 is inside safe zone",
  );

  // Encroaching right margin by even 0.01px must be rejected
  const encroachingRightBox: BoundingBox = { x: 100.01, y: 300, width: 760, height: 100 }; // right = 860.01
  assert(
    !isWithinSafeZone(encroachingRightBox, "tiktok"),
    "Box extending to X=860.01 must be REJECTED",
  );

  // Button sidebar area (X > 860) must be completely forbidden
  for (let x = 861; x <= 1080; x += 10) {
    assert(
      !isWithinSafeZone({ x, y: 500, width: 10, height: 10 }, "tiktok"),
      `Point at X=${x} must be outside safe zone`,
    );
  }
});

runTest("S1.3: Strict bottom margin prevention (Y <= 1520)", () => {
  // Bottommost allowed pixel for text bottom edge is 1520
  const maxBottomBox: BoundingBox = { x: 100, y: 1420, width: 760, height: 100 };
  assert(
    isWithinSafeZone(maxBottomBox, "tiktok"),
    "Box extending to exactly Y=1520 is inside safe zone",
  );

  // Encroaching bottom margin by even 0.01px must be rejected
  const encroachingBottomBox: BoundingBox = { x: 100, y: 1420.01, width: 760, height: 100 }; // bottom = 1520.01
  assert(
    !isWithinSafeZone(encroachingBottomBox, "tiktok"),
    "Box extending to Y=1520.01 must be REJECTED",
  );

  // Bottom caption/sound area (Y > 1520) must be completely forbidden
  for (let y = 1521; y <= 1920; y += 10) {
    assert(
      !isWithinSafeZone({ x: 200, y, width: 10, height: 10 }, "tiktok"),
      `Point at Y=${y} must be outside safe zone`,
    );
  }
});

runTest("S1.4: Centered text with W_SAFE = 760 at CENTER_X = 480 stays within [100, 860]", () => {
  const centerX = TIKTOK_SAFE_ZONE.CENTER_X; // 480
  const width = TIKTOK_SAFE_ZONE.W_SAFE; // 760
  const leftX = centerX - width / 2; // 480 - 380 = 100
  const rightX = centerX + width / 2; // 480 + 380 = 860

  assert(leftX === 100, "Left edge exactly matches SAFE_LEFT (100)");
  assert(rightX === 860, "Right edge exactly matches 1080 - SAFE_RIGHT (860)");
  assert(
    isWithinSafeZone({ x: leftX, y: 500, width, height: 200 }, "tiktok"),
    "Full-width centered text is perfectly valid",
  );
});

runTest("S1.5: Symmetrical center X=540 with W=760 breaches right margin", () => {
  const symCenterX = 540;
  const width = 760;
  const leftX = symCenterX - width / 2; // 160
  const rightX = symCenterX + width / 2; // 920 (> 860!)

  assert(rightX === 920, "Symmetric center pushes right edge to 920px");
  assert(rightX > 860, "920px encroaches 60px into TikTok right sidebar!");
  assert(
    !isWithinSafeZone({ x: leftX, y: 500, width, height: 200 }, "tiktok"),
    "Symmetrical center with full width fails TikTok check",
  );
});

runTest("S1.6: Server ASS subtitle parameters respect TikTok bounds", () => {
  const ass = getASSSubtitlePlacement("tiktok", "lower-third");
  assert(ass.alignment === 2, "ASS alignment is 2 (bottom-center)");
  assert(ass.posX === 480, "ASS posX is optical center 480");
  assert(ass.posY <= 1520, `ASS posY ${ass.posY} <= 1520`);
  assert(ass.marginL === 100, "ASS marginL is 100");
  assert(ass.marginR === 220, "ASS marginR is 220");
  assert(ass.marginV === 1920 - ass.posY, "ASS marginV matches bottom offset");
});

// ============================================================================
// SECTION 2: BOUNDARY CONDITIONS, EXTREME FLOATS & IEEE 754 PRECISION
// ============================================================================
console.log("\n--- Section 2: Boundary Conditions & Float Precision ---");

runTest("S2.1: Sub-pixel epsilon tolerance (±0.001px)", () => {
  // Boundary is 100 to 860, 300 to 1520
  // Inside within 0.0009px epsilon
  assert(
    isWithinSafeZone({ x: 99.9995, y: 299.9995, width: 760.0008, height: 1220.0008 }, "tiktok"),
    "Accepts floats within epsilon tolerance",
  );

  // Outside beyond 0.002px
  assert(
    !isWithinSafeZone({ x: 99.995, y: 300, width: 760, height: 100 }, "tiktok"),
    "Rejects floats outside epsilon tolerance on left",
  );
  assert(
    !isWithinSafeZone({ x: 100, y: 300, width: 760.005, height: 100 }, "tiktok"),
    "Rejects floats outside epsilon tolerance on right",
  );
  assert(
    !isWithinSafeZone({ x: 100, y: 299.995, width: 760, height: 100 }, "tiktok"),
    "Rejects floats outside epsilon tolerance on top",
  );
  assert(
    !isWithinSafeZone({ x: 100, y: 300, width: 760, height: 1220.005 }, "tiktok"),
    "Rejects floats outside epsilon tolerance on bottom",
  );
});

runTest("S2.2: Extreme coordinates & floating point values", () => {
  assert(
    !isWithinSafeZone({ x: -1e10, y: 500, width: 100, height: 100 }, "tiktok"),
    "Negative huge X rejected",
  );
  assert(
    !isWithinSafeZone({ x: 100, y: -1e10, width: 100, height: 100 }, "tiktok"),
    "Negative huge Y rejected",
  );
  assert(
    !isWithinSafeZone({ x: 1e10, y: 500, width: 100, height: 100 }, "tiktok"),
    "Positive huge X rejected",
  );
  assert(
    !isWithinSafeZone({ x: 100, y: 1e10, width: 100, height: 100 }, "tiktok"),
    "Positive huge Y rejected",
  );
  assert(
    !isWithinSafeZone({ x: 100, y: 300, width: 1e10, height: 100 }, "tiktok"),
    "Positive huge width rejected",
  );
  assert(
    !isWithinSafeZone({ x: 100, y: 300, width: 100, height: 1e10 }, "tiktok"),
    "Positive huge height rejected",
  );
});

runTest("S2.3: Zero-size elements at boundary corners", () => {
  // Zero-width/height points exactly on corners
  assert(
    isWithinSafeZone({ x: 100, y: 300, width: 0, height: 0 }, "tiktok"),
    "Top-left corner point valid",
  );
  assert(
    isWithinSafeZone({ x: 860, y: 300, width: 0, height: 0 }, "tiktok"),
    "Top-right corner point valid",
  );
  assert(
    isWithinSafeZone({ x: 100, y: 1520, width: 0, height: 0 }, "tiktok"),
    "Bottom-left corner point valid",
  );
  assert(
    isWithinSafeZone({ x: 860, y: 1520, width: 0, height: 0 }, "tiktok"),
    "Bottom-right corner point valid",
  );

  // Zero-size points just outside corners
  assert(
    !isWithinSafeZone({ x: 99.9, y: 300, width: 0, height: 0 }, "tiktok"),
    "Point left of corner invalid",
  );
  assert(
    !isWithinSafeZone({ x: 860.1, y: 300, width: 0, height: 0 }, "tiktok"),
    "Point right of corner invalid",
  );
  assert(
    !isWithinSafeZone({ x: 100, y: 299.9, width: 0, height: 0 }, "tiktok"),
    "Point above corner invalid",
  );
  assert(
    !isWithinSafeZone({ x: 100, y: 1520.1, width: 0, height: 0 }, "tiktok"),
    "Point below corner invalid",
  );
});

// ============================================================================
// SECTION 3: NAN, NULL, UNDEFINED & MALFORMED INPUT HANDLING
// ============================================================================
console.log("\n--- Section 3: NaN, Undefined & Malformed Inputs ---");

runTest("S3.1: NaN in bounding box coordinates", () => {
  assert(
    isWithinSafeZone({ x: NaN, y: 300, width: 100, height: 100 }, "tiktok") === false,
    "NaN x returns false",
  );
  assert(
    isWithinSafeZone({ x: 100, y: NaN, width: 100, height: 100 }, "tiktok") === false,
    "NaN y returns false",
  );
  assert(
    isWithinSafeZone({ x: 100, y: 300, width: NaN, height: 100 }, "tiktok") === false,
    "NaN width returns false",
  );
  assert(
    isWithinSafeZone({ x: 100, y: 300, width: 100, height: NaN }, "tiktok") === false,
    "NaN height returns false",
  );
  assert(
    isWithinSafeZone(NaN, 300, 100, 100, "tiktok") === false,
    "Numeric NaN x signature returns false",
  );
});

runTest("S3.2: Null, undefined, empty, and invalid platform strings fallback gracefully", () => {
  const fallbackGeom = getSafeZone(undefined);
  assert(fallbackGeom === TIKTOK_SAFE_ZONE, "undefined profile defaults to TikTok");
  assert(getSafeZone(null) === TIKTOK_SAFE_ZONE, "null profile defaults to TikTok");
  assert(getSafeZone("") === TIKTOK_SAFE_ZONE, "empty profile defaults to TikTok");
  assert(getSafeZone("   \n\t  ") === TIKTOK_SAFE_ZONE, "whitespace profile defaults to TikTok");
  assert(
    getSafeZone("non_existent_profile_xyz") === TIKTOK_SAFE_ZONE,
    "unknown profile defaults to TikTok",
  );
  assert(
    getSafeZone(12345 as unknown as string) === TIKTOK_SAFE_ZONE,
    "number profile defaults to TikTok",
  );
  assert(
    getSafeZone({} as unknown as string) === TIKTOK_SAFE_ZONE,
    "object profile defaults to TikTok",
  );
});

runTest("S3.3: Polymorphic signature equivalence in isWithinSafeZone", () => {
  const box: BoundingBox = { x: 200, y: 400, width: 300, height: 500 };
  const res1 = isWithinSafeZone(box, "tiktok");
  const res2 = isWithinSafeZone(box, TIKTOK_SAFE_ZONE);
  const res3 = isWithinSafeZone(200, 400, 300, 500, "tiktok");
  const res4 = isWithinSafeZone(200, 400, 300, 500, TIKTOK_SAFE_ZONE);

  assert(
    res1 === true && res2 === true && res3 === true && res4 === true,
    "All polymorphic overloads return true",
  );

  const oobBox: BoundingBox = { x: 50, y: 400, width: 300, height: 500 };
  assert(!isWithinSafeZone(oobBox, "tiktok"), "Overload 1 oob returns false");
  assert(!isWithinSafeZone(oobBox, TIKTOK_SAFE_ZONE), "Overload 2 oob returns false");
  assert(!isWithinSafeZone(50, 400, 300, 500, "tiktok"), "Overload 3 oob returns false");
  assert(!isWithinSafeZone(50, 400, 300, 500, TIKTOK_SAFE_ZONE), "Overload 4 oob returns false");
});

// ============================================================================
// SECTION 4: COORDINATE CLAMPING ACROSS EDGE INTERVALS & ALL QUADRANTS
// ============================================================================
console.log("\n--- Section 4: Clamping Across Quadrants & Edge Intervals ---");

runTest("S4.1: Quadrant 1 (Top-Left out of bounds)", () => {
  const raw: BoundingBox = { x: -50, y: -20, width: 400, height: 300 };
  const clamped = clampToSafeZone(raw, "tiktok");
  assert(clamped.x === 100, "Q1 clamped x === 100");
  assert(clamped.y === 300, "Q1 clamped y === 300");
  assert(clamped.width === 400, "Q1 width preserved");
  assert(clamped.height === 300, "Q1 height preserved");
  assert(isWithinSafeZone(clamped, "tiktok"), "Q1 clamped result strictly inside");
});

runTest("S4.2: Quadrant 2 (Top-Right out of bounds)", () => {
  const raw: BoundingBox = { x: 700, y: -50, width: 400, height: 300 }; // right = 1100 > 860
  const clamped = clampToSafeZone(raw, "tiktok");
  assert(clamped.x === 460, "Q2 clamped x === 460 (860 - 400)");
  assert(clamped.y === 300, "Q2 clamped y === 300");
  assert(clamped.x + clamped.width <= 860, "Q2 right edge <= 860");
  assert(isWithinSafeZone(clamped, "tiktok"), "Q2 clamped result strictly inside");
});

runTest("S4.3: Quadrant 3 (Bottom-Left out of bounds)", () => {
  const raw: BoundingBox = { x: -100, y: 1400, width: 400, height: 300 }; // bottom = 1700 > 1520
  const clamped = clampToSafeZone(raw, "tiktok");
  assert(clamped.x === 100, "Q3 clamped x === 100");
  assert(clamped.y === 1220, "Q3 clamped y === 1220 (1520 - 300)");
  assert(clamped.y + clamped.height <= 1520, "Q3 bottom edge <= 1520");
  assert(isWithinSafeZone(clamped, "tiktok"), "Q3 clamped result strictly inside");
});

runTest("S4.4: Quadrant 4 (Bottom-Right out of bounds)", () => {
  const raw: BoundingBox = { x: 800, y: 1500, width: 400, height: 300 };
  const clamped = clampToSafeZone(raw, "tiktok");
  assert(clamped.x === 460, "Q4 clamped x === 460 (860 - 400)");
  assert(clamped.y === 1220, "Q4 clamped y === 1220 (1520 - 300)");
  assert(clamped.x + clamped.width <= 860, "Q4 right edge <= 860");
  assert(clamped.y + clamped.height <= 1520, "Q4 bottom edge <= 1520");
  assert(isWithinSafeZone(clamped, "tiktok"), "Q4 clamped result strictly inside");
});

runTest("S4.5: Extreme oversized box clamping (width > 760, height > 1220)", () => {
  const massive: BoundingBox = { x: -9999, y: -9999, width: 99999, height: 99999 };
  const clamped = clampToSafeZone(massive, "tiktok");
  assert(clamped.x === 100, "Massive box x clamped to 100");
  assert(clamped.y === 300, "Massive box y clamped to 300");
  assert(clamped.width === 760, "Massive box width clamped to W_SAFE 760");
  assert(clamped.height === 1220, "Massive box height clamped to H_SAFE 1220");
  assert(clamped.x + clamped.width === 860, "Massive box right edge exactly 860");
  assert(clamped.y + clamped.height === 1520, "Massive box bottom edge exactly 1520");
  assert(isWithinSafeZone(clamped, "tiktok"), "Massive box clamped result strictly inside");
});

// ============================================================================
// SECTION 5: COLLISION CHECKER ACCURACY & GAP DETECTION
// ============================================================================
console.log("\n--- Section 5: Collision Checker Accuracy ---");

runTest("S5.1: AABB Disjoint in 4 directions", () => {
  const base: BoundingBox = { x: 500, y: 500, width: 100, height: 100 };

  // Left
  assert(!doBoxesCollide(base, { x: 300, y: 500, width: 100, height: 100 }, 0), "Left disjoint");
  // Right
  assert(!doBoxesCollide(base, { x: 700, y: 500, width: 100, height: 100 }, 0), "Right disjoint");
  // Above
  assert(!doBoxesCollide(base, { x: 500, y: 300, width: 100, height: 100 }, 0), "Above disjoint");
  // Below
  assert(!doBoxesCollide(base, { x: 500, y: 700, width: 100, height: 100 }, 0), "Below disjoint");
});

runTest("S5.2: AABB Touching Edges with minGap = 0", () => {
  const base: BoundingBox = { x: 100, y: 100, width: 100, height: 100 }; // X: 100-200, Y: 100-200

  // Touching right edge exactly at X=200
  assert(
    !doBoxesCollide(base, { x: 200, y: 100, width: 100, height: 100 }, 0),
    "Touching right edge returns false",
  );
  // Touching bottom edge exactly at Y=200
  assert(
    !doBoxesCollide(base, { x: 100, y: 200, width: 100, height: 100 }, 0),
    "Touching bottom edge returns false",
  );

  // Overlapping by 1px at X=199
  assert(
    doBoxesCollide(base, { x: 199, y: 100, width: 100, height: 100 }, 0),
    "1px overlap returns true",
  );
  // Overlapping by 1px at Y=199
  assert(
    doBoxesCollide(base, { x: 100, y: 199, width: 100, height: 100 }, 0),
    "1px bottom overlap returns true",
  );
});

runTest("S5.3: Exact Gap Thresholds (minGap = 24)", () => {
  const pill: BoundingBox = { x: 400, y: 300, width: 280, height: 56 }; // Y: [300, 356]

  // Gap = 24 (Y = 356 + 24 = 380)
  const validText: BoundingBox = { x: 100, y: 380, width: 760, height: 200 };
  assert(!doBoxesCollide(pill, validText, 24), "Gap === 24 returns false (cleared)");

  // Gap = 24.001
  const extraValidText: BoundingBox = { x: 100, y: 380.001, width: 760, height: 200 };
  assert(!doBoxesCollide(pill, extraValidText, 24), "Gap > 24 returns false (cleared)");

  // Gap = 23.999 (violates 24px requirement)
  const violatingText: BoundingBox = { x: 100, y: 379.999, width: 760, height: 200 };
  assert(doBoxesCollide(pill, violatingText, 24), "Gap < 24 returns true (collision detected)");
});

runTest("S5.4: Containment & Cross-Intersection", () => {
  const outer: BoundingBox = { x: 100, y: 100, width: 500, height: 500 };
  const inner: BoundingBox = { x: 200, y: 200, width: 100, height: 100 };
  assert(doBoxesCollide(outer, inner, 0), "Contained box collides");
  assert(doBoxesCollide(inner, outer, 0), "Commutative collision check");

  // Plus-cross intersection
  const horiz: BoundingBox = { x: 100, y: 250, width: 400, height: 50 };
  const vert: BoundingBox = { x: 250, y: 100, width: 50, height: 400 };
  assert(doBoxesCollide(horiz, vert, 0), "Cross-intersecting boxes collide");
});

// ============================================================================
// SECTION 6: MULTI-PLATFORM PROFILES & UNIVERSAL SUBSUMPTION
// ============================================================================
console.log("\n--- Section 6: Multi-Platform Profiles & Subsumption ---");

runTest("S6.1: Reels safe zone invariants", () => {
  assert(REELS_SAFE_ZONE.SAFE_TOP === 240, "Reels SAFE_TOP === 240");
  assert(REELS_SAFE_ZONE.SAFE_BOTTOM === 340, "Reels SAFE_BOTTOM === 340");
  assert(REELS_SAFE_ZONE.SAFE_LEFT === 80, "Reels SAFE_LEFT === 80");
  assert(REELS_SAFE_ZONE.SAFE_RIGHT === 160, "Reels SAFE_RIGHT === 160");
  assert(REELS_SAFE_ZONE.W_SAFE === 840, "Reels W_SAFE === 840");
  assert(REELS_SAFE_ZONE.H_SAFE === 1340, "Reels H_SAFE === 1340");
  assert(REELS_SAFE_ZONE.CENTER_X === 500, "Reels CENTER_X === 500");
  assert(REELS_SAFE_ZONE.BOTTOM_MAX_Y === 1580, "Reels BOTTOM_MAX_Y === 1580");
});

runTest("S6.2: Shorts safe zone invariants", () => {
  assert(SHORTS_SAFE_ZONE.SAFE_TOP === 220, "Shorts SAFE_TOP === 220");
  assert(SHORTS_SAFE_ZONE.SAFE_BOTTOM === 380, "Shorts SAFE_BOTTOM === 380");
  assert(SHORTS_SAFE_ZONE.SAFE_LEFT === 80, "Shorts SAFE_LEFT === 80");
  assert(SHORTS_SAFE_ZONE.SAFE_RIGHT === 180, "Shorts SAFE_RIGHT === 180");
  assert(SHORTS_SAFE_ZONE.W_SAFE === 820, "Shorts W_SAFE === 820");
  assert(SHORTS_SAFE_ZONE.H_SAFE === 1320, "Shorts H_SAFE === 1320");
  assert(SHORTS_SAFE_ZONE.CENTER_X === 490, "Shorts CENTER_X === 490");
  assert(SHORTS_SAFE_ZONE.BOTTOM_MAX_Y === 1540, "Shorts BOTTOM_MAX_Y === 1540");
});

runTest("S6.3: Universal corridor subsumption (Guaranteed safe on ALL platforms)", () => {
  const universalBox: BoundingBox = {
    x: UNIVERSAL_SAFE_ZONE.SAFE_LEFT,
    y: UNIVERSAL_SAFE_ZONE.SAFE_TOP,
    width: UNIVERSAL_SAFE_ZONE.W_SAFE,
    height: UNIVERSAL_SAFE_ZONE.H_SAFE,
  };

  assert(isWithinSafeZone(universalBox, "tiktok"), "Universal box is safe in TikTok");
  assert(isWithinSafeZone(universalBox, "reels"), "Universal box is safe in Reels");
  assert(isWithinSafeZone(universalBox, "shorts"), "Universal box is safe in Shorts");
  assert(isWithinSafeZone(universalBox, "universal"), "Universal box is safe in Universal");
});

runTest("S6.4: Platform asymmetry contrast", () => {
  // A box fitted for Reels max bounds (x=80, width=840 -> right=920) must FAIL in TikTok (right > 860)
  const reelsFullBox: BoundingBox = { x: 80, y: 240, width: 840, height: 1340 };
  assert(isWithinSafeZone(reelsFullBox, "reels"), "Reels full box is valid in Reels");
  assert(
    !isWithinSafeZone(reelsFullBox, "tiktok"),
    "Reels full box is INVALID in TikTok (proves strict separation)",
  );
});

// ============================================================================
// SECTION 7: RANDOMIZED ADVERSARIAL FUZZING (10,000 ITERATIONS)
// ============================================================================
console.log("\n--- Section 7: 10,000-Iteration Randomized Adversarial Fuzzing ---");

runTest("S7.1: 10,000 Random Bounding Boxes clamped and guaranteed within TikTok bounds", () => {
  for (let i = 0; i < 10000; i++) {
    // Generate extreme random coordinates: [-5000, 5000]
    const rx = (Math.random() - 0.5) * 10000;
    const ry = (Math.random() - 0.5) * 10000;
    const rw = Math.random() * 5000;
    const rh = Math.random() * 5000;

    const rawBox: BoundingBox = { x: rx, y: ry, width: rw, height: rh };
    const clamped = clampToSafeZone(rawBox, "tiktok");

    // Invariant 1: Result MUST pass isWithinSafeZone
    if (!isWithinSafeZone(clamped, "tiktok")) {
      throw new Error(
        `Fuzzing failure at iteration ${i}: raw=${JSON.stringify(rawBox)}, clamped=${JSON.stringify(clamped)}`,
      );
    }

    // Invariant 2: Result MUST NOT encroach right 220px (X <= 860)
    if (clamped.x + clamped.width > 860.0001) {
      throw new Error(
        `Right encroachment at iteration ${i}: right=${clamped.x + clamped.width} > 860`,
      );
    }

    // Invariant 3: Result MUST NOT encroach bottom 400px (Y <= 1520)
    if (clamped.y + clamped.height > 1520.0001) {
      throw new Error(
        `Bottom encroachment at iteration ${i}: bottom=${clamped.y + clamped.height} > 1520`,
      );
    }

    // Invariant 4: Dimensions must not exceed safe dimensions
    if (clamped.width > 760.0001 || clamped.height > 1220.0001) {
      throw new Error(`Dimension violation at iteration ${i}: ${clamped.width}x${clamped.height}`);
    }

    // Invariant 5: Top and Left bounds satisfied
    if (clamped.x < 99.9999 || clamped.y < 299.9999) {
      throw new Error(`Top-left breach at iteration ${i}: (${clamped.x}, ${clamped.y})`);
    }
  }
});

runTest("S7.2: 10,000 Random Clamped Boxes across all 5 Platform Profiles", () => {
  const profiles = ["tiktok", "reels", "shorts", "universal", "center"] as const;
  for (const prof of profiles) {
    const geom = getSafeZone(prof);
    for (let i = 0; i < 2000; i++) {
      const rx = (Math.random() - 0.5) * 8000;
      const ry = (Math.random() - 0.5) * 8000;
      const rw = Math.random() * 4000;
      const rh = Math.random() * 4000;

      const rawBox: BoundingBox = { x: rx, y: ry, width: rw, height: rh };
      const clamped = clampToSafeZone(rawBox, prof);

      assert(
        isWithinSafeZone(clamped, prof),
        `Profile ${prof} iteration ${i} clamped box must be inside`,
      );
      assert(clamped.x >= geom.SAFE_LEFT - 0.001, `Profile ${prof} left edge invariant`);
      assert(
        clamped.x + clamped.width <= geom.W - geom.SAFE_RIGHT + 0.001,
        `Profile ${prof} right edge invariant`,
      );
      assert(clamped.y >= geom.SAFE_TOP - 0.001, `Profile ${prof} top edge invariant`);
      assert(
        clamped.y + clamped.height <= geom.BOTTOM_MAX_Y + 0.001,
        `Profile ${prof} bottom edge invariant`,
      );
    }
  }
});

console.log("\n================================================================================");
console.log(`📊 ADVERSARIAL TEST SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED`);
if (failedTests === 0) {
  console.log("🎉 ALL ADVERSARIAL STRESS TESTS PASSED WITH ZERO FAILURES! (100% SUCCESS)");
} else {
  console.error(`💥 FAILED: ${failedTests} tests failed.`);
  process.exit(1);
}
console.log("================================================================================");
