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
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`  ✖ [FAIL] ${name}: ${errorMsg}`);
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
    assert(REELS_SAFE_ZONE.TOP_MIN_Y === 240, "Reels TOP_MIN_Y must be 240");
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
    assert(SHORTS_SAFE_ZONE.TOP_MIN_Y === 220, "Shorts TOP_MIN_Y must be 220");
  });

  test("T1.4: Universal Corridor exact constants compliance", () => {
    assert(UNIVERSAL_SAFE_ZONE.W === 1080, "Universal W must be 1080");
    assert(UNIVERSAL_SAFE_ZONE.H === 1920, "Universal H must be 1920");
    assert(UNIVERSAL_SAFE_ZONE.SAFE_TOP === 300, "Universal SAFE_TOP must be 300");
    assert(UNIVERSAL_SAFE_ZONE.SAFE_BOTTOM === 400, "Universal SAFE_BOTTOM must be 400");
    assert(UNIVERSAL_SAFE_ZONE.SAFE_LEFT === 100, "Universal SAFE_LEFT must be 100");
    assert(UNIVERSAL_SAFE_ZONE.SAFE_RIGHT === 220, "Universal SAFE_RIGHT must be 220");
    assert(UNIVERSAL_SAFE_ZONE.W_SAFE === 760, "Universal W_SAFE must be 760");
    assert(UNIVERSAL_SAFE_ZONE.H_SAFE === 1220, "Universal H_SAFE must be 1220");
    assert(UNIVERSAL_SAFE_ZONE.CENTER_X === 480, "Universal CENTER_X must be 480");
    assert(UNIVERSAL_SAFE_ZONE.BOTTOM_MAX_Y === 1520, "Universal BOTTOM_MAX_Y must be 1520");
  });

  test("T1.5: Symmetrical Center Safe Zone constants compliance", () => {
    assert(CENTER_SAFE_ZONE.W === 1080, "Center W must be 1080");
    assert(CENTER_SAFE_ZONE.H === 1920, "Center H must be 1920");
    assert(CENTER_SAFE_ZONE.SAFE_TOP === 300, "Center SAFE_TOP must be 300");
    assert(CENTER_SAFE_ZONE.SAFE_BOTTOM === 300, "Center SAFE_BOTTOM must be 300");
    assert(CENTER_SAFE_ZONE.SAFE_LEFT === 100, "Center SAFE_LEFT must be 100");
    assert(CENTER_SAFE_ZONE.SAFE_RIGHT === 100, "Center SAFE_RIGHT must be 100");
    assert(CENTER_SAFE_ZONE.W_SAFE === 880, "Center W_SAFE must be 880");
    assert(CENTER_SAFE_ZONE.H_SAFE === 1320, "Center H_SAFE must be 1320");
    assert(CENTER_SAFE_ZONE.CENTER_X === 540, "Center profile CENTER_X must be 540");
    assert(CENTER_SAFE_ZONE.BOTTOM_MAX_Y === 1620, "Center BOTTOM_MAX_Y must be 1620");
  });

  test("T1.6: Reference Pill Standards constants compliance", () => {
    assert(REFERENCE_PILL_STANDARDS.DEFAULT_Y === 300, "Pill DEFAULT_Y must be 300");
    assert(REFERENCE_PILL_STANDARDS.MIN_VERTICAL_GAP === 24, "Pill MIN_VERTICAL_GAP must be 24");
    assert(REFERENCE_PILL_STANDARDS.FONT_SIZE === 28, "Pill FONT_SIZE must be 28");
    assert(REFERENCE_PILL_STANDARDS.PAD_X === 28, "Pill PAD_X must be 28");
    assert(REFERENCE_PILL_STANDARDS.PAD_Y === 14, "Pill PAD_Y must be 14");
  });

  test("T1.7: Mathematical Invariant Verification across all profiles", () => {
    const profiles = [
      TIKTOK_SAFE_ZONE,
      REELS_SAFE_ZONE,
      SHORTS_SAFE_ZONE,
      UNIVERSAL_SAFE_ZONE,
      CENTER_SAFE_ZONE,
    ];
    for (const p of profiles) {
      assert(p.W_SAFE === p.W - p.SAFE_LEFT - p.SAFE_RIGHT, "Invariant: W_SAFE calculation");
      assert(p.H_SAFE === p.H - p.SAFE_TOP - p.SAFE_BOTTOM, "Invariant: H_SAFE calculation");
      assert(p.CENTER_X === p.SAFE_LEFT + p.W_SAFE / 2, "Invariant: CENTER_X calculation");
      assert(p.BOTTOM_MAX_Y === p.H - p.SAFE_BOTTOM, "Invariant: BOTTOM_MAX_Y calculation");
      assert(p.TOP_MIN_Y === p.SAFE_TOP, "Invariant: TOP_MIN_Y calculation");
      assert(p.BOTTOM_MAX_Y - p.TOP_MIN_Y === p.H_SAFE, "Invariant: Vertical safe span");
    }
  });

  test("T1.8: Universal Subsumption Invariant across all platforms", () => {
    const universalBox: BoundingBox = {
      x: UNIVERSAL_SAFE_ZONE.SAFE_LEFT,
      y: UNIVERSAL_SAFE_ZONE.SAFE_TOP,
      width: UNIVERSAL_SAFE_ZONE.W_SAFE,
      height: UNIVERSAL_SAFE_ZONE.H_SAFE,
    };
    assert(isWithinSafeZone(universalBox, "tiktok"), "Universal box valid in TikTok");
    assert(isWithinSafeZone(universalBox, "reels"), "Universal box valid in Reels");
    assert(isWithinSafeZone(universalBox, "shorts"), "Universal box valid in Shorts");
    assert(isWithinSafeZone(universalBox, "universal"), "Universal box valid in Universal");
  });

  test("T1.9: Object Immutability (freeze) verification", () => {
    assert(Object.isFrozen(TIKTOK_SAFE_ZONE), "TIKTOK_SAFE_ZONE is frozen");
    assert(Object.isFrozen(REELS_SAFE_ZONE), "REELS_SAFE_ZONE is frozen");
    assert(Object.isFrozen(SHORTS_SAFE_ZONE), "SHORTS_SAFE_ZONE is frozen");
    assert(Object.isFrozen(UNIVERSAL_SAFE_ZONE), "UNIVERSAL_SAFE_ZONE is frozen");
    assert(Object.isFrozen(CENTER_SAFE_ZONE), "CENTER_SAFE_ZONE is frozen");
    assert(Object.isFrozen(SOCIAL_SAFE_ZONES), "SOCIAL_SAFE_ZONES is frozen");
    assert(Object.isFrozen(REFERENCE_PILL_STANDARDS), "REFERENCE_PILL_STANDARDS is frozen");
  });

  console.log("\n--- Suite 2: Profile Resolution & Custom Factory ---");
  test("T2.1: Default Fallback for undefined/null/empty profile", () => {
    assert(getSafeZone() === TIKTOK_SAFE_ZONE, "Default must be TikTok");
    assert(getSafeZone(undefined) === TIKTOK_SAFE_ZONE, "Undefined must fallback to TikTok");
    assert(getSafeZone(null) === TIKTOK_SAFE_ZONE, "Null must fallback to TikTok");
    assert(getSafeZone("") === TIKTOK_SAFE_ZONE, "Empty string must fallback to TikTok");
  });

  test("T2.2: Case-Insensitive Profile Lookup", () => {
    assert(getSafeZone("tiktok") === TIKTOK_SAFE_ZONE, "tiktok lookup");
    assert(getSafeZone("  TIKTOK  ") === TIKTOK_SAFE_ZONE, "TIKTOK uppercase and trimmed");
    assert(getSafeZone("reels") === REELS_SAFE_ZONE, "reels lookup");
    assert(getSafeZone("  Reels ") === REELS_SAFE_ZONE, "Reels mixed case trimmed");
    assert(getSafeZone("shorts") === SHORTS_SAFE_ZONE, "shorts lookup");
    assert(getSafeZone("SHORTS") === SHORTS_SAFE_ZONE, "SHORTS uppercase");
    assert(getSafeZone("universal") === UNIVERSAL_SAFE_ZONE, "universal lookup");
    assert(getSafeZone("center") === CENTER_SAFE_ZONE, "center lookup");
  });

  test("T2.3: Unknown Profile Fallback to TikTok", () => {
    assert(getSafeZone("snapchat") === TIKTOK_SAFE_ZONE, "snapchat fallback");
    assert(getSafeZone("invalid_123") === TIKTOK_SAFE_ZONE, "invalid_123 fallback");
  });

  test("T2.4: Custom Geometry Creation via createSafeZone", () => {
    const custom = createSafeZone({
      SAFE_TOP: 250,
      SAFE_BOTTOM: 350,
      SAFE_LEFT: 90,
      SAFE_RIGHT: 190,
    });
    assert(custom.W === 1080 && custom.H === 1920, "Default dimensions 1080x1920");
    assert(custom.W_SAFE === 800, "Derived W_SAFE");
    assert(custom.H_SAFE === 1320, "Derived H_SAFE");
    assert(custom.CENTER_X === 490, "Derived CENTER_X");
    assert(custom.BOTTOM_MAX_Y === 1570, "Derived BOTTOM_MAX_Y");
    assert(custom.TOP_MIN_Y === 250, "Derived TOP_MIN_Y");
    assert(Object.isFrozen(custom), "Custom instance is frozen");
  });

  test("T2.5: Over-Constrained Custom Geometry Clamping", () => {
    const overConstrained = createSafeZone({
      W: 1080,
      H: 1920,
      SAFE_LEFT: 600,
      SAFE_RIGHT: 600,
      SAFE_TOP: 1000,
      SAFE_BOTTOM: 1000,
    });
    assert(overConstrained.W_SAFE === 0, "Over-constrained W_SAFE clamped to 0");
    assert(overConstrained.H_SAFE === 0, "Over-constrained H_SAFE clamped to 0");
  });

  console.log("\n--- Suite 3: Coordinate Containment & Boundary Checking ---");
  test("T3.1: Nominal inside box returns true", () => {
    const box: BoundingBox = { x: 200, y: 500, width: 400, height: 600 };
    assert(isWithinSafeZone(box, "tiktok") === true, "Nominal box inside");
    assert(isWithinSafeZone(200, 500, 400, 600, "tiktok") === true, "Numeric signature inside");
  });

  test("T3.2: Exact corridor bounding box returns true", () => {
    const box: BoundingBox = { x: 100, y: 300, width: 760, height: 1220 };
    assert(isWithinSafeZone(box, "tiktok") === true, "Full corridor box inside");
  });

  test("T3.3: Left boundary breach returns false", () => {
    assert(
      isWithinSafeZone({ x: 99, y: 300, width: 700, height: 500 }, "tiktok") === false,
      "x < 100 fails",
    );
  });

  test("T3.4: Negative X coordinate returns false", () => {
    assert(
      isWithinSafeZone({ x: -10, y: 400, width: 200, height: 200 }, "tiktok") === false,
      "negative x fails",
    );
  });

  test("T3.5: Right boundary breach returns false", () => {
    assert(
      isWithinSafeZone({ x: 100, y: 300, width: 761, height: 500 }, "tiktok") === false,
      "right = 861 > 860 fails",
    );
  });

  test("T3.6: Right sidebar button overlap returns false", () => {
    assert(
      isWithinSafeZone({ x: 500, y: 500, width: 400, height: 200 }, "tiktok") === false,
      "right = 900 > 860 fails",
    );
  });

  test("T3.7: Top boundary breach returns false", () => {
    assert(
      isWithinSafeZone({ x: 100, y: 299, width: 500, height: 500 }, "tiktok") === false,
      "y < 300 fails",
    );
  });

  test("T3.8: Top status bar breach returns false", () => {
    assert(
      isWithinSafeZone({ x: 100, y: 50, width: 500, height: 200 }, "tiktok") === false,
      "y < 300 status bar breach fails",
    );
  });

  test("T3.9: Bottom boundary breach returns false", () => {
    assert(
      isWithinSafeZone({ x: 100, y: 300, width: 500, height: 1221 }, "tiktok") === false,
      "bottom = 1521 > 1520 fails",
    );
  });

  test("T3.10: Bottom caption overlap returns false", () => {
    assert(
      isWithinSafeZone({ x: 100, y: 1450, width: 500, height: 100 }, "tiktok") === false,
      "bottom = 1550 > 1520 fails",
    );
  });

  test("T3.11: Sub-pixel epsilon tolerance validation", () => {
    const subPixelBox: BoundingBox = {
      x: 100.0001,
      y: 300.0001,
      width: 759.9998,
      height: 1219.9998,
    };
    assert(
      isWithinSafeZone(subPixelBox, "tiktok") === true,
      "Sub-pixel float within epsilon tolerance",
    );
  });

  test("T3.12: Direct Geometry Object vs String lookup equivalence", () => {
    const box: BoundingBox = { x: 150, y: 350, width: 600, height: 1000 };
    assert(
      isWithinSafeZone(box, TIKTOK_SAFE_ZONE) === isWithinSafeZone(box, "tiktok"),
      "Geometry object matches string lookup",
    );
  });

  test("T3.13: Reels and Shorts profile specific boundary checking", () => {
    assert(
      isWithinSafeZone({ x: 80, y: 240, width: 840, height: 1340 }, "reels") === true,
      "Valid in Reels",
    );
    assert(
      isWithinSafeZone({ x: 80, y: 240, width: 840, height: 1340 }, "tiktok") === false,
      "Fails in TikTok (exceeds TikTok safe margins)",
    );
  });

  console.log("\n--- Suite 4: Coordinate Clamping & Containment Guarantee ---");
  test("T4.1: In-Bounds Box preserved without change", () => {
    const box: BoundingBox = { x: 200, y: 500, width: 400, height: 600 };
    const clamped = clampToSafeZone(box, "tiktok");
    assert(
      clamped.x === 200 && clamped.y === 500 && clamped.width === 400 && clamped.height === 600,
      "Preserves valid box",
    );
  });

  test("T4.2: Left & Top Clamping of out-of-bounds box", () => {
    const outBox: BoundingBox = { x: 20, y: 100, width: 400, height: 300 };
    const clamped = clampToSafeZone(outBox, "tiktok");
    assert(clamped.x === 100, "Clamped X to SAFE_LEFT (100)");
    assert(clamped.y === 300, "Clamped Y to SAFE_TOP (300)");
  });

  test("T4.3: Right & Bottom Clamping of overflowing box", () => {
    const brBox: BoundingBox = { x: 600, y: 1400, width: 400, height: 300 };
    const clamped = clampToSafeZone(brBox, "tiktok");
    assert(clamped.x === 460, "Clamped X shifted left so right edge <= 860");
    assert(clamped.y === 1220, "Clamped Y shifted up so bottom edge <= 1520");
    assert(clamped.x + clamped.width <= 860, "Right edge <= 860");
    assert(clamped.y + clamped.height <= 1520, "Bottom edge <= 1520");
  });

  test("T4.4: Oversized Width Clamped to W_SAFE", () => {
    const wideBox: BoundingBox = { x: 50, y: 400, width: 900, height: 300 };
    const clamped = clampToSafeZone(wideBox, "tiktok");
    assert(clamped.width === 760, "Clamped width to W_SAFE (760)");
    assert(clamped.x === 100, "Clamped x to SAFE_LEFT");
  });

  test("T4.5: Oversized Height Clamped to H_SAFE", () => {
    const tallBox: BoundingBox = { x: 100, y: 100, width: 500, height: 1500 };
    const clamped = clampToSafeZone(tallBox, "tiktok");
    assert(clamped.height === 1220, "Clamped height to H_SAFE (1220)");
    assert(clamped.y === 300, "Clamped y to SAFE_TOP");
  });

  test("T4.6: Post-Clamp Containment Guarantee", () => {
    const randomBox: BoundingBox = { x: -300, y: 2000, width: 1500, height: 2500 };
    const clamped = clampToSafeZone(randomBox, "tiktok");
    assert(
      isWithinSafeZone(clamped, "tiktok"),
      "Arbitrary out-of-bounds box is strictly valid after clamping",
    );
  });

  console.log("\n--- Suite 5: Collision Detection & Gap Enforcing ---");
  test("T5.1: Non-Overlapping Vertical Boxes return false", () => {
    const boxA: BoundingBox = { x: 100, y: 300, width: 760, height: 56 };
    const boxB: BoundingBox = { x: 100, y: 400, width: 760, height: 200 };
    assert(doBoxesCollide(boxA, boxB, 0) === false, "Non-overlapping boxes return false");
  });

  test("T5.2: Directly Overlapping Boxes return true", () => {
    const boxA: BoundingBox = { x: 100, y: 300, width: 760, height: 56 };
    const boxB: BoundingBox = { x: 100, y: 330, width: 760, height: 200 };
    assert(doBoxesCollide(boxA, boxB, 0) === true, "Directly overlapping boxes return true");
  });

  test("T5.3: Minimum Gap Violation (24px) returns true", () => {
    const pill: BoundingBox = { x: 400, y: 300, width: 280, height: 56 }; // Y: 300 to 356
    const arabicTextViolating: BoundingBox = { x: 100, y: 360, width: 760, height: 200 }; // Gap = 4px (< 24px)
    assert(doBoxesCollide(pill, arabicTextViolating, 24) === true, "Collides when gap < 24px");
  });

  test("T5.4: Exactly Satisfied Gap (24px) returns false", () => {
    const pill: BoundingBox = { x: 400, y: 300, width: 280, height: 56 }; // Y: 300 to 356
    const arabicTextValid: BoundingBox = { x: 100, y: 380, width: 760, height: 200 }; // Gap = 24px (>= 24px)
    assert(doBoxesCollide(pill, arabicTextValid, 24) === false, "Clears when gap >= 24px");
  });

  test("T5.5: Horizontal Separation returns false", () => {
    const boxA: BoundingBox = { x: 100, y: 400, width: 200, height: 200 };
    const boxB: BoundingBox = { x: 350, y: 400, width: 200, height: 200 };
    assert(doBoxesCollide(boxA, boxB, 20) === false, "Horizontally separated boxes do not collide");
  });

  console.log("\n--- Suite 6: Resolution Scaling (1080p -> 720p) ---");
  test("T6.1: 1080p to 720p Proportional Scale calculation", () => {
    const scaled = scaleSafeZone(TIKTOK_SAFE_ZONE, 720 / 1080);
    assert(scaled.W === 720, "Scaled W is 720");
    assert(scaled.H === 1280, "Scaled H is 1280");
    assert(scaled.SAFE_TOP === 200, "Scaled SAFE_TOP is 200");
    assert(scaled.SAFE_BOTTOM === 267, "Scaled SAFE_BOTTOM is 267");
    assert(scaled.SAFE_LEFT === 67, "Scaled SAFE_LEFT is 67");
    assert(scaled.SAFE_RIGHT === 147, "Scaled SAFE_RIGHT is 147");
    assert(scaled.W_SAFE === 506, "Scaled W_SAFE is 506");
    assert(scaled.H_SAFE === 813, "Scaled H_SAFE is 813");
    assert(scaled.CENTER_X === 320, "Scaled CENTER_X is 320");
  });

  test("T6.2: Custom Width/Height Object scaling", () => {
    const scaled = scaleSafeZone(TIKTOK_SAFE_ZONE, { width: 540, height: 960 });
    assert(scaled.W === 540, "Scaled W is 540");
    assert(scaled.H === 960, "Scaled H is 960");
    assert(scaled.SAFE_TOP === 150, "Scaled SAFE_TOP is 150");
    assert(scaled.SAFE_BOTTOM === 200, "Scaled SAFE_BOTTOM is 200");
    assert(scaled.SAFE_LEFT === 50, "Scaled SAFE_LEFT is 50");
    assert(scaled.SAFE_RIGHT === 110, "Scaled SAFE_RIGHT is 110");
    assert(scaled.W_SAFE === 380, "Scaled W_SAFE is 380");
    assert(scaled.CENTER_X === 240, "Scaled CENTER_X is 240");
  });

  test("T6.3: Identity Scale (1.0) exact match", () => {
    const identity = scaleSafeZone(TIKTOK_SAFE_ZONE, 1.0);
    assert(identity.W === TIKTOK_SAFE_ZONE.W, "Identity W");
    assert(identity.H === TIKTOK_SAFE_ZONE.H, "Identity H");
    assert(identity.W_SAFE === TIKTOK_SAFE_ZONE.W_SAFE, "Identity W_SAFE");
    assert(identity.H_SAFE === TIKTOK_SAFE_ZONE.H_SAFE, "Identity H_SAFE");
    assert(identity.CENTER_X === TIKTOK_SAFE_ZONE.CENTER_X, "Identity CENTER_X");
  });

  console.log("\n--- Suite 7: Normalized Safe Zone Coordinates ---");
  test("T7.1: TikTok Normalized Dimensions calculation", () => {
    const norm = getNormalizedSafeZone("tiktok");
    assertClose(norm.top, 300 / 1920, 0.0001, "Normalized top");
    assertClose(norm.bottom, 400 / 1920, 0.0001, "Normalized bottom");
    assertClose(norm.left, 100 / 1080, 0.0001, "Normalized left");
    assertClose(norm.right, 220 / 1080, 0.0001, "Normalized right");
    assertClose(norm.width, 760 / 1080, 0.0001, "Normalized width");
    assertClose(norm.height, 1220 / 1920, 0.0001, "Normalized height");
    assertClose(norm.centerX, 480 / 1080, 0.0001, "Normalized centerX");
  });

  test("T7.2: Horizontal Fraction Sum equals 1.0", () => {
    for (const p of ["tiktok", "reels", "shorts", "universal", "center"]) {
      const norm = getNormalizedSafeZone(p);
      assertClose(norm.left + norm.width + norm.right, 1.0, 0.0001, `Horizontal sum on ${p}`);
    }
  });

  test("T7.3: Vertical Fraction Sum equals 1.0", () => {
    for (const p of ["tiktok", "reels", "shorts", "universal", "center"]) {
      const norm = getNormalizedSafeZone(p);
      assertClose(norm.top + norm.height + norm.bottom, 1.0, 0.0001, `Vertical sum on ${p}`);
    }
  });

  test("T7.4: SafeOverlayCss and SafeCorridor helper utilities", () => {
    const overlayCss = getSafeOverlayCss("tiktok");
    assert(
      typeof overlayCss.topPercent === "string" && overlayCss.topPercent.includes("%"),
      "CSS topPercent",
    );
    assert(
      typeof overlayCss.bottomPercent === "string" && overlayCss.bottomPercent.includes("%"),
      "CSS bottomPercent",
    );
    assert(
      typeof overlayCss.leftPercent === "string" && overlayCss.leftPercent.includes("%"),
      "CSS leftPercent",
    );
    assert(
      typeof overlayCss.rightPercent === "string" && overlayCss.rightPercent.includes("%"),
      "CSS rightPercent",
    );

    const corridor = getSafeCorridor("tiktok");
    assert(corridor.left === 100, "Corridor left");
    assert(corridor.right === 860, "Corridor right");
    assert(corridor.top === 300, "Corridor top");
    assert(corridor.bottom === 1520, "Corridor bottom");
    assert(corridor.centerX === 480, "Corridor centerX");
  });

  console.log("\n--- Suite 8: ASS Subtitle Layout Parameters ---");
  test("T8.1: TikTok Lower-Third Subtitle placement", () => {
    const ttAss = getASSSubtitlePlacement("tiktok", "lower-third");
    assert(ttAss.alignment === 2, "ASS lower-third alignment is 2");
    assert(ttAss.posX === 480, "TikTok ASS posX is 480 (clearing right buttons)");
    assert(ttAss.posY === 1420, "TikTok ASS posY is 1420");
    assert(ttAss.marginL === 100, "TikTok ASS marginL is 100");
    assert(ttAss.marginR === 220, "TikTok ASS marginR is 220");
    assert(ttAss.marginV === 500, "TikTok ASS marginV is 500");
  });

  test("T8.2: Instagram Reels Lower-Third Subtitle placement", () => {
    const reelsAss = getASSSubtitlePlacement("reels", "lower-third");
    assert(reelsAss.alignment === 2, "Reels ASS alignment is 2");
    assert(reelsAss.posX === 500, "Reels ASS posX is 500");
    assert(reelsAss.posY === 1421, "Reels ASS posY is 1421");
    assert(reelsAss.marginL === 80, "Reels ASS marginL is 80");
    assert(reelsAss.marginR === 160, "Reels ASS marginR is 160");
    assert(reelsAss.marginV === 499, "Reels ASS marginV is 499");
  });

  test("T8.3: Centered Subtitle Style placement", () => {
    const centerAss = getASSSubtitlePlacement("tiktok", "center");
    assert(centerAss.alignment === 5, "ASS center alignment is 5");
    assert(centerAss.posX === 540 && centerAss.posY === 960, "Center ASS posX/posY is 540/960");
  });

  test("T8.4: getSafeAssStyles configuration helper", () => {
    const assStyles = getSafeAssStyles("tiktok", "lower-third");
    assert(assStyles.marginL === 100, "SafeAssStyle marginL");
    assert(assStyles.marginR === 220, "SafeAssStyle marginR");
    assert(assStyles.align === 2, "SafeAssStyle align");
    assert(assStyles.posX === 480, "SafeAssStyle posX");
    assert(assStyles.posY === 1520, "SafeAssStyle posY");
    assert(assStyles.refPosY === 340, "SafeAssStyle refPosY");
  });

  console.log("\n--- Suite 9: Subtitle Anchor Y Calculation ---");
  test("T9.1: TikTok Lower-Third Subtitle Anchor Y", () => {
    assert(getSubtitleAnchorY("tiktok", "lower-third") === 1420, "TikTok lower-third anchor");
  });

  test("T9.2: Reels Lower-Third Subtitle Anchor Y", () => {
    assert(getSubtitleAnchorY("reels", "lower-third") === 1421, "Reels lower-third anchor");
  });

  test("T9.3: Center Subtitle Anchor Y", () => {
    assert(getSubtitleAnchorY("tiktok", "center") === 960, "TikTok center anchor");
  });

  console.log("\n--- Suite 10: Randomized Property-Based Fuzzing ---");
  test("T10.1: 1,000 Random Bounding Boxes clamped and guaranteed within safe zone", () => {
    for (let i = 0; i < 1000; i++) {
      const rx = Math.random() * 2000 - 500;
      const ry = Math.random() * 3000 - 500;
      const rw = Math.random() * 2000;
      const rh = Math.random() * 3000;
      const rawBox: BoundingBox = { x: rx, y: ry, width: rw, height: rh };
      const clamped = clampToSafeZone(rawBox, "tiktok");

      assert(
        isWithinSafeZone(clamped, "tiktok"),
        `Fuzzed iteration ${i} clamped box must be inside safe zone`,
      );
      assert(clamped.width <= TIKTOK_SAFE_ZONE.W_SAFE, `Width <= W_SAFE at ${i}`);
      assert(clamped.height <= TIKTOK_SAFE_ZONE.H_SAFE, `Height <= H_SAFE at ${i}`);
      assert(clamped.x >= TIKTOK_SAFE_ZONE.SAFE_LEFT, `X >= SAFE_LEFT at ${i}`);
      assert(
        clamped.x + clamped.width <= TIKTOK_SAFE_ZONE.W - TIKTOK_SAFE_ZONE.SAFE_RIGHT,
        `Right edge <= 860 at ${i}`,
      );
      assert(clamped.y >= TIKTOK_SAFE_ZONE.SAFE_TOP, `Y >= SAFE_TOP at ${i}`);
      assert(
        clamped.y + clamped.height <= TIKTOK_SAFE_ZONE.BOTTOM_MAX_Y,
        `Bottom edge <= 1520 at ${i}`,
      );
    }
  });

  console.log("\n=================================================================");
  console.log(`📊 TEST SUITE SUMMARY: ${passedCount} / ${passedCount} SUITES PASSED`);
  console.log("🎉 ALL SAFE ZONE REGISTRY UNIT TESTS PASSED SUCCESSFULLY! (100% SUCCESS)");
  console.log("=================================================================");
}

runSafeZoneVerification().catch((err: unknown) => {
  const errorMsg = err instanceof Error ? err.message : String(err);
  console.error("\n❌ SAFE ZONE REGISTRY VERIFICATION SUITE FAILED:", errorMsg);
  process.exit(1);
});
