/**
 * ADVERSARIAL CHALLENGER 2 SUITE FOR MILESTONE 1 (M1)
 * File: src/lib/__tests__/adversarial-m1-challenger2.test.ts
 *
 * Comprehensive empirical challenge for src/lib/safe-zone.ts:
 * 1. Multi-platform variance (TikTok vs Instagram Reels vs YouTube Shorts vs Center vs Universal).
 *    Verifies safe widths, exact optical center points (X=480, X=500, X=490, X=540), ASS subtitle placement and styles.
 * 2. Resolution scaling functions (720p, 1080p, 4K, 8K, custom mobile viewports) without floating point breakdown.
 * 3. Normalized coordinates, CSS overlays, mathematical invariants, idempotence, and boundary fuzzing.
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
  type PlatformSafeZoneProfile,
} from "../safe-zone";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[FAIL] ${message}`);
  }
}

function assertClose(actual: number, expected: number, epsilon = 0.0001, message = "") {
  if (Math.abs(actual - expected) > epsilon) {
    throw new Error(`[FAIL] ${message}: expected ${expected} ±${epsilon}, got ${actual}`);
  }
}

let passedCount = 0;
let totalAssertions = 0;

function check(condition: boolean, message: string) {
  totalAssertions++;
  assert(condition, message);
}

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✔ [PASS] ${name}`);
    passedCount++;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  ✖ [FAIL] ${name}: ${msg}`);
    throw err;
  }
}

async function runAdversarialChallenger2Suite() {
  console.log("=================================================================");
  console.log("🛡️ RUNNING CHALLENGER 2 EMPIRICAL TEST SUITE (MILESTONE 1)");
  console.log("=================================================================\n");

  // --------------------------------------------------------------------------
  // SECTION 1: MULTI-PLATFORM VARIANCE & METRIC PRECISION
  // --------------------------------------------------------------------------
  console.log("--- Section 1: Multi-Platform Variance (TikTok vs Reels vs Shorts) ---");

  test("1.1: Platform Profiles distinct geometry & center point verification", () => {
    // 1. TikTok: X=480, W_SAFE=760
    check(TIKTOK_SAFE_ZONE.SAFE_LEFT === 100, "TikTok left 100");
    check(TIKTOK_SAFE_ZONE.SAFE_RIGHT === 220, "TikTok right 220");
    check(TIKTOK_SAFE_ZONE.SAFE_TOP === 300, "TikTok top 300");
    check(TIKTOK_SAFE_ZONE.SAFE_BOTTOM === 400, "TikTok bottom 400");
    check(TIKTOK_SAFE_ZONE.W_SAFE === 760, "TikTok W_SAFE 760");
    check(TIKTOK_SAFE_ZONE.H_SAFE === 1220, "TikTok H_SAFE 1220");
    check(TIKTOK_SAFE_ZONE.CENTER_X === 480, "TikTok CENTER_X 480 (optical center shifted left)");
    check(TIKTOK_SAFE_ZONE.BOTTOM_MAX_Y === 1520, "TikTok BOTTOM_MAX_Y 1520");

    // 2. Instagram Reels: X=500, W_SAFE=840
    check(REELS_SAFE_ZONE.SAFE_LEFT === 80, "Reels left 80");
    check(REELS_SAFE_ZONE.SAFE_RIGHT === 160, "Reels right 160");
    check(REELS_SAFE_ZONE.SAFE_TOP === 240, "Reels top 240");
    check(REELS_SAFE_ZONE.SAFE_BOTTOM === 340, "Reels bottom 340");
    check(REELS_SAFE_ZONE.W_SAFE === 840, "Reels W_SAFE 840 (wider than TikTok)");
    check(REELS_SAFE_ZONE.H_SAFE === 1340, "Reels H_SAFE 1340 (taller than TikTok)");
    check(REELS_SAFE_ZONE.CENTER_X === 500, "Reels CENTER_X MUST be 500 (80 + 840/2)");
    check(REELS_SAFE_ZONE.BOTTOM_MAX_Y === 1580, "Reels BOTTOM_MAX_Y 1580");

    // 3. YouTube Shorts: X=490, W_SAFE=820
    check(SHORTS_SAFE_ZONE.SAFE_LEFT === 80, "Shorts left 80");
    check(SHORTS_SAFE_ZONE.SAFE_RIGHT === 180, "Shorts right 180");
    check(SHORTS_SAFE_ZONE.SAFE_TOP === 220, "Shorts top 220");
    check(SHORTS_SAFE_ZONE.SAFE_BOTTOM === 380, "Shorts bottom 380");
    check(SHORTS_SAFE_ZONE.W_SAFE === 820, "Shorts W_SAFE 820");
    check(SHORTS_SAFE_ZONE.H_SAFE === 1320, "Shorts H_SAFE 1320");
    check(SHORTS_SAFE_ZONE.CENTER_X === 490, "Shorts CENTER_X MUST be 490 (80 + 820/2)");
    check(SHORTS_SAFE_ZONE.BOTTOM_MAX_Y === 1540, "Shorts BOTTOM_MAX_Y 1540");

    // 4. Center Profile: X=540, W_SAFE=880
    check(CENTER_SAFE_ZONE.SAFE_LEFT === 100, "Center left 100");
    check(CENTER_SAFE_ZONE.SAFE_RIGHT === 100, "Center right 100");
    check(CENTER_SAFE_ZONE.CENTER_X === 540, "Center CENTER_X MUST be 540");
    check(CENTER_SAFE_ZONE.W_SAFE === 880, "Center W_SAFE 880");
  });

  test("1.2: Cross-platform differential boundary discrimination", () => {
    // A box that fits within Reels (X in [80, 920]) but exceeds TikTok right limit (860)
    const reelsExclusiveBox: BoundingBox = { x: 80, y: 300, width: 830, height: 500 }; // right edge = 910
    check(
      isWithinSafeZone(reelsExclusiveBox, "reels") === true,
      "Box inside Reels safe corridor [80, 920]",
    );
    check(
      isWithinSafeZone(reelsExclusiveBox, "tiktok") === false,
      "Box overflows TikTok right margin (910 > 860)",
    );

    // A box that fits in Shorts (X in [80, 900]) but overflows TikTok
    const shortsExclusiveBox: BoundingBox = { x: 80, y: 300, width: 800, height: 500 }; // right edge = 880
    check(
      isWithinSafeZone(shortsExclusiveBox, "shorts") === true,
      "Box inside Shorts safe corridor [80, 900]",
    );
    check(
      isWithinSafeZone(shortsExclusiveBox, "tiktok") === false,
      "Box overflows TikTok right margin (880 > 860)",
    );

    // A box that fits top of Shorts (Y=220) but breaches TikTok top (300) and Reels top (240)
    const shortsTopBox: BoundingBox = { x: 100, y: 220, width: 600, height: 400 };
    check(isWithinSafeZone(shortsTopBox, "shorts") === true, "Valid in Shorts at Y=220");
    check(
      isWithinSafeZone(shortsTopBox, "reels") === false,
      "Invalid in Reels at Y=220 (Reels top is 240)",
    );
    check(
      isWithinSafeZone(shortsTopBox, "tiktok") === false,
      "Invalid in TikTok at Y=220 (TikTok top is 300)",
    );

    // A box that fits bottom of Reels (Y=1550, height=25 -> bottom=1575) but breaches TikTok (1520) and Shorts (1540)
    const reelsBottomBox: BoundingBox = { x: 100, y: 1550, width: 600, height: 25 };
    check(
      isWithinSafeZone(reelsBottomBox, "reels") === true,
      "Valid in Reels at bottom=1575 (limit 1580)",
    );
    check(
      isWithinSafeZone(reelsBottomBox, "shorts") === false,
      "Invalid in Shorts at bottom=1575 (limit 1540)",
    );
    check(
      isWithinSafeZone(reelsBottomBox, "tiktok") === false,
      "Invalid in TikTok at bottom=1575 (limit 1520)",
    );
  });

  test("1.3: ASS Subtitle Placement across all platform profiles", () => {
    // 1. TikTok ASS Placement
    const ttPlacement = getASSSubtitlePlacement("tiktok", "lower-third");
    check(ttPlacement.alignment === 2, "TikTok ASS alignment is 2 (bottom-center)");
    check(ttPlacement.posX === 480, "TikTok ASS posX is 480");
    check(
      ttPlacement.posY === 1420,
      "TikTok ASS posY is 1420 (Math.min(1520-100, round(1920*0.74)))",
    );
    check(ttPlacement.marginL === 100, "TikTok ASS marginL is 100");
    check(ttPlacement.marginR === 220, "TikTok ASS marginR is 220");
    check(ttPlacement.marginV === 1920 - 1420, "TikTok ASS marginV is 500");

    // 2. Reels ASS Placement
    const reelsPlacement = getASSSubtitlePlacement("reels", "lower-third");
    check(reelsPlacement.alignment === 2, "Reels ASS alignment is 2");
    check(reelsPlacement.posX === 500, "Reels ASS posX is 500");
    check(
      reelsPlacement.posY === 1421,
      "Reels ASS posY is 1421 (Math.min(1580-100, round(1920*0.74)))",
    );
    check(reelsPlacement.marginL === 80, "Reels ASS marginL is 80");
    check(reelsPlacement.marginR === 160, "Reels ASS marginR is 160");
    check(reelsPlacement.marginV === 1920 - 1421, "Reels ASS marginV is 499");

    // 3. Shorts ASS Placement
    const shortsPlacement = getASSSubtitlePlacement("shorts", "lower-third");
    check(shortsPlacement.alignment === 2, "Shorts ASS alignment is 2");
    check(shortsPlacement.posX === 490, "Shorts ASS posX is 490");
    check(
      shortsPlacement.posY === 1421,
      "Shorts ASS posY is 1421 (Math.min(1540-100, round(1920*0.74)))",
    );
    check(shortsPlacement.marginL === 80, "Shorts ASS marginL is 80");
    check(shortsPlacement.marginR === 180, "Shorts ASS marginR is 180");
    check(shortsPlacement.marginV === 1920 - 1421, "Shorts ASS marginV is 499");

    // 4. Center ASS Placement
    const centerPlacement = getASSSubtitlePlacement("center", "center");
    check(centerPlacement.alignment === 5, "Center ASS alignment is 5 (middle-center)");
    check(centerPlacement.posX === 540, "Center ASS posX is 540");
    check(centerPlacement.posY === 960, "Center ASS posY is 960");
    check(centerPlacement.marginL === 100, "Center ASS marginL is 100");
    check(centerPlacement.marginR === 100, "Center ASS marginR is 100");
    check(centerPlacement.marginV === 960, "Center ASS marginV is 960");
  });

  test("1.4: Safe ASS Style configurations for FFmpeg & Reference Badges", () => {
    // TikTok Safe Ass Styles
    const ttStyles = getSafeAssStyles("tiktok");
    check(ttStyles.marginL === 100, "ttStyles marginL 100");
    check(ttStyles.marginR === 220, "ttStyles marginR 220");
    check(ttStyles.align === 2, "ttStyles align 2");
    check(ttStyles.posX === 480, "ttStyles posX 480");
    check(ttStyles.posY === 1520, "ttStyles posY 1520 (BOTTOM_MAX_Y)");
    check(ttStyles.refPosX === 480, "ttStyles refPosX 480");
    check(ttStyles.refPosY === 340, "ttStyles refPosY 340 (SAFE_TOP + 40)");

    // Reels Safe Ass Styles
    const reelsStyles = getSafeAssStyles("reels");
    check(reelsStyles.marginL === 80, "reelsStyles marginL 80");
    check(reelsStyles.marginR === 160, "reelsStyles marginR 160");
    check(reelsStyles.align === 2, "reelsStyles align 2");
    check(reelsStyles.posX === 500, "reelsStyles posX 500");
    check(reelsStyles.posY === 1580, "reelsStyles posY 1580");
    check(reelsStyles.refPosX === 500, "reelsStyles refPosX 500");
    check(reelsStyles.refPosY === 280, "reelsStyles refPosY 280 (240 + 40)");

    // Shorts Safe Ass Styles
    const shortsStyles = getSafeAssStyles("shorts");
    check(shortsStyles.marginL === 80, "shortsStyles marginL 80");
    check(shortsStyles.marginR === 180, "shortsStyles marginR 180");
    check(shortsStyles.align === 2, "shortsStyles align 2");
    check(shortsStyles.posX === 490, "shortsStyles posX 490");
    check(shortsStyles.posY === 1540, "shortsStyles posY 1540");
    check(shortsStyles.refPosX === 490, "shortsStyles refPosX 490");
    check(shortsStyles.refPosY === 260, "shortsStyles refPosY 260 (220 + 40)");
  });

  // --------------------------------------------------------------------------
  // SECTION 2: RESOLUTION SCALING & FLOATING-POINT PRECISION BREAKDOWN
  // --------------------------------------------------------------------------
  console.log("\n--- Section 2: Resolution Scaling (720p, 1080p, 4K, 8K, Arbitrary) ---");

  test("2.1: 720p Scaling (720x1280) precision and invariant preservation", () => {
    const platforms: PlatformSafeZoneProfile[] = [
      "tiktok",
      "reels",
      "shorts",
      "universal",
      "center",
    ];
    for (const p of platforms) {
      const scaled = scaleSafeZone(p, { width: 720, height: 1280 });
      check(scaled.W === 720, `${p} 720p scaled.W`);
      check(scaled.H === 1280, `${p} 720p scaled.H`);
      check(Number.isInteger(scaled.SAFE_TOP), `${p} 720p SAFE_TOP integer`);
      check(Number.isInteger(scaled.SAFE_BOTTOM), `${p} 720p SAFE_BOTTOM integer`);
      check(Number.isInteger(scaled.SAFE_LEFT), `${p} 720p SAFE_LEFT integer`);
      check(Number.isInteger(scaled.SAFE_RIGHT), `${p} 720p SAFE_RIGHT integer`);

      // Invariants check
      check(
        scaled.W_SAFE === scaled.W - scaled.SAFE_LEFT - scaled.SAFE_RIGHT,
        `${p} 720p W_SAFE invariant`,
      );
      check(
        scaled.H_SAFE === scaled.H - scaled.SAFE_TOP - scaled.SAFE_BOTTOM,
        `${p} 720p H_SAFE invariant`,
      );
      check(
        scaled.CENTER_X === scaled.SAFE_LEFT + scaled.W_SAFE / 2,
        `${p} 720p CENTER_X invariant`,
      );
      check(
        scaled.BOTTOM_MAX_Y === scaled.H - scaled.SAFE_BOTTOM,
        `${p} 720p BOTTOM_MAX_Y invariant`,
      );
      check(scaled.TOP_MIN_Y === scaled.SAFE_TOP, `${p} 720p TOP_MIN_Y invariant`);
    }

    // Specific 720p Reels check
    const reels720 = scaleSafeZone("reels", { width: 720, height: 1280 });
    check(reels720.SAFE_TOP === Math.round(240 * (1280 / 1920)), "reels 720 SAFE_TOP (160)");
    check(reels720.SAFE_BOTTOM === Math.round(340 * (1280 / 1920)), "reels 720 SAFE_BOTTOM (227)");
    check(reels720.SAFE_LEFT === Math.round(80 * (720 / 1080)), "reels 720 SAFE_LEFT (53)");
    check(reels720.SAFE_RIGHT === Math.round(160 * (720 / 1080)), "reels 720 SAFE_RIGHT (107)");
    check(reels720.W_SAFE === 560, "reels 720 W_SAFE (560)");
    check(reels720.CENTER_X === 333, "reels 720 CENTER_X (333)");

    // Specific 720p Shorts check
    const shorts720 = scaleSafeZone("shorts", { width: 720, height: 1280 });
    check(shorts720.SAFE_TOP === Math.round(220 * (1280 / 1920)), "shorts 720 SAFE_TOP (147)");
    check(
      shorts720.SAFE_BOTTOM === Math.round(380 * (1280 / 1920)),
      "shorts 720 SAFE_BOTTOM (253)",
    );
    check(shorts720.SAFE_LEFT === Math.round(80 * (720 / 1080)), "shorts 720 SAFE_LEFT (53)");
    check(shorts720.SAFE_RIGHT === Math.round(180 * (720 / 1080)), "shorts 720 SAFE_RIGHT (120)");
    check(shorts720.W_SAFE === 547, "shorts 720 W_SAFE (547)");
    check(shorts720.CENTER_X === 326.5, "shorts 720 CENTER_X (326.5)");
  });

  test("2.2: 4K UHD Scaling (2160x3840) scale=2.0 exact calculation", () => {
    // TikTok 4K
    const tt4k = scaleSafeZone("tiktok", 2.0);
    check(tt4k.W === 2160, "TikTok 4K W 2160");
    check(tt4k.H === 3840, "TikTok 4K H 3840");
    check(tt4k.SAFE_TOP === 600, "TikTok 4K SAFE_TOP 600");
    check(tt4k.SAFE_BOTTOM === 800, "TikTok 4K SAFE_BOTTOM 800");
    check(tt4k.SAFE_LEFT === 200, "TikTok 4K SAFE_LEFT 200");
    check(tt4k.SAFE_RIGHT === 440, "TikTok 4K SAFE_RIGHT 440");
    check(tt4k.W_SAFE === 1520, "TikTok 4K W_SAFE 1520 (760*2)");
    check(tt4k.H_SAFE === 2440, "TikTok 4K H_SAFE 2440 (1220*2)");
    check(tt4k.CENTER_X === 960, "TikTok 4K CENTER_X 960 (480*2)");
    check(tt4k.BOTTOM_MAX_Y === 3040, "TikTok 4K BOTTOM_MAX_Y 3040");

    // Reels 4K
    const reels4k = scaleSafeZone("reels", 2.0);
    check(reels4k.W === 2160, "Reels 4K W 2160");
    check(reels4k.H === 3840, "Reels 4K H 3840");
    check(reels4k.SAFE_TOP === 480, "Reels 4K SAFE_TOP 480");
    check(reels4k.SAFE_BOTTOM === 680, "Reels 4K SAFE_BOTTOM 680");
    check(reels4k.SAFE_LEFT === 160, "Reels 4K SAFE_LEFT 160");
    check(reels4k.SAFE_RIGHT === 320, "Reels 4K SAFE_RIGHT 320");
    check(reels4k.W_SAFE === 1680, "Reels 4K W_SAFE 1680 (840*2)");
    check(reels4k.H_SAFE === 2680, "Reels 4K H_SAFE 2680 (1340*2)");
    check(reels4k.CENTER_X === 1000, "Reels 4K CENTER_X 1000 (500*2)");

    // Shorts 4K
    const shorts4k = scaleSafeZone("shorts", 2.0);
    check(shorts4k.W === 2160, "Shorts 4K W 2160");
    check(shorts4k.H === 3840, "Shorts 4K H 3840");
    check(shorts4k.SAFE_TOP === 440, "Shorts 4K SAFE_TOP 440");
    check(shorts4k.SAFE_BOTTOM === 760, "Shorts 4K SAFE_BOTTOM 760");
    check(shorts4k.SAFE_LEFT === 160, "Shorts 4K SAFE_LEFT 160");
    check(shorts4k.SAFE_RIGHT === 360, "Shorts 4K SAFE_RIGHT 360");
    check(shorts4k.W_SAFE === 1640, "Shorts 4K W_SAFE 1640 (820*2)");
    check(shorts4k.H_SAFE === 2640, "Shorts 4K H_SAFE 2640 (1320*2)");
    check(shorts4k.CENTER_X === 980, "Shorts 4K CENTER_X 980 (490*2)");
  });

  test("2.3: 8K Ultra HD Scaling (4320x7680) scale=4.0", () => {
    const tt8k = scaleSafeZone("tiktok", 4.0);
    check(tt8k.W === 4320, "TikTok 8K W 4320");
    check(tt8k.H === 7680, "TikTok 8K H 7680");
    check(tt8k.W_SAFE === 3040, "TikTok 8K W_SAFE 3040");
    check(tt8k.CENTER_X === 1920, "TikTok 8K CENTER_X 1920");
    check(tt8k.BOTTOM_MAX_Y === 6080, "TikTok 8K BOTTOM_MAX_Y 6080");
  });

  test("2.4: Mobile & Responsive Preview Viewports (360x640, 393x852, 414x896)", () => {
    const viewports = [
      { width: 360, height: 640 },
      { width: 393, height: 852 }, // iPhone 14/15 Pro
      { width: 414, height: 896 }, // iPhone XR/11
      { width: 320, height: 568 }, // iPhone SE 1st gen
    ];

    for (const vp of viewports) {
      for (const p of ["tiktok", "reels", "shorts"] as PlatformSafeZoneProfile[]) {
        const scaled = scaleSafeZone(p, vp);
        check(scaled.W === vp.width, `${p} on ${vp.width}x${vp.height} W`);
        check(scaled.H === vp.height, `${p} on ${vp.width}x${vp.height} H`);
        check(scaled.W_SAFE > 0, `${p} on ${vp.width}x${vp.height} W_SAFE > 0`);
        check(scaled.H_SAFE > 0, `${p} on ${vp.width}x${vp.height} H_SAFE > 0`);
        check(
          scaled.CENTER_X > scaled.SAFE_LEFT,
          `${p} on ${vp.width}x${vp.height} CENTER_X > SAFE_LEFT`,
        );
        check(
          scaled.CENTER_X < scaled.W - scaled.SAFE_RIGHT,
          `${p} on ${vp.width}x${vp.height} CENTER_X < max right`,
        );
      }
    }
  });

  test("2.5: Extreme Floating Point & Fractional Scales (Irrational fractions, small scales)", () => {
    const fractions = [
      1 / 3, // 0.3333333333333333
      1 / 7, // 0.14285714285714285
      Math.PI / 4, // 0.7853981633974483
      Math.SQRT2, // 1.4142135623730951
      0.05, // 5% micro preview
    ];

    for (const frac of fractions) {
      const scaled = scaleSafeZone("tiktok", frac);
      check(!Number.isNaN(scaled.W), `Scale ${frac} W is not NaN`);
      check(!Number.isNaN(scaled.H), `Scale ${frac} H is not NaN`);
      check(!Number.isNaN(scaled.W_SAFE), `Scale ${frac} W_SAFE is not NaN`);
      check(!Number.isNaN(scaled.CENTER_X), `Scale ${frac} CENTER_X is not NaN`);
      check(Number.isFinite(scaled.CENTER_X), `Scale ${frac} CENTER_X is finite`);

      // Invariants check
      check(
        scaled.W_SAFE === scaled.W - scaled.SAFE_LEFT - scaled.SAFE_RIGHT,
        `Scale ${frac} W_SAFE invariant`,
      );
      check(
        scaled.H_SAFE === scaled.H - scaled.SAFE_TOP - scaled.SAFE_BOTTOM,
        `Scale ${frac} H_SAFE invariant`,
      );
    }
  });

  test("2.6: Normalized Safe Zone high precision & sum-to-one validation", () => {
    const profiles: PlatformSafeZoneProfile[] = [
      "tiktok",
      "reels",
      "shorts",
      "universal",
      "center",
    ];
    for (const p of profiles) {
      const norm = getNormalizedSafeZone(p);
      const sz = getSafeZone(p);

      // Verify exact definitions
      check(norm.top === sz.SAFE_TOP / sz.H, `${p} norm.top exact`);
      check(norm.bottom === sz.SAFE_BOTTOM / sz.H, `${p} norm.bottom exact`);
      check(norm.left === sz.SAFE_LEFT / sz.W, `${p} norm.left exact`);
      check(norm.right === sz.SAFE_RIGHT / sz.W, `${p} norm.right exact`);
      check(norm.width === sz.W_SAFE / sz.W, `${p} norm.width exact`);
      check(norm.height === sz.H_SAFE / sz.H, `${p} norm.height exact`);
      check(norm.centerX === sz.CENTER_X / sz.W, `${p} norm.centerX exact`);

      // Verify horizontal sum = 1.0 (left + width + right)
      assertClose(norm.left + norm.width + norm.right, 1.0, 1e-12, `${p} horizontal sum to 1.0`);

      // Verify vertical sum = 1.0 (top + height + bottom)
      assertClose(norm.top + norm.height + norm.bottom, 1.0, 1e-12, `${p} vertical sum to 1.0`);
    }
  });

  test("2.7: SafeOverlayCss formatting and percentage precision", () => {
    const profiles: PlatformSafeZoneProfile[] = [
      "tiktok",
      "reels",
      "shorts",
      "universal",
      "center",
    ];
    for (const p of profiles) {
      const css = getSafeOverlayCss(p);
      const sz = getSafeZone(p);

      const topPct = parseFloat(css.topPercent);
      const bottomPct = parseFloat(css.bottomPercent);
      const leftPct = parseFloat(css.leftPercent);
      const rightPct = parseFloat(css.rightPercent);
      const centerXPct = parseFloat(css.centerXPercent);

      assertClose(topPct, (sz.SAFE_TOP / sz.H) * 100, 0.005, `${p} topPercent value`);
      assertClose(bottomPct, (sz.SAFE_BOTTOM / sz.H) * 100, 0.005, `${p} bottomPercent value`);
      assertClose(leftPct, (sz.SAFE_LEFT / sz.W) * 100, 0.005, `${p} leftPercent value`);
      assertClose(rightPct, (sz.SAFE_RIGHT / sz.W) * 100, 0.005, `${p} rightPercent value`);
      assertClose(centerXPct, (sz.CENTER_X / sz.W) * 100, 0.005, `${p} centerXPercent value`);
    }
  });

  // --------------------------------------------------------------------------
  // SECTION 3: BOUNDARY STRESS, CLAMPING IDEMPOTENCE & FUZZING
  // --------------------------------------------------------------------------
  console.log("\n--- Section 3: Boundary Stress, Clamping Idempotence & Fuzzing ---");

  test("3.1: Clamping Idempotence (clamp(clamp(B)) === clamp(B)) across 5,000 randomized boxes", () => {
    const platforms: PlatformSafeZoneProfile[] = ["tiktok", "reels", "shorts"];
    for (const p of platforms) {
      for (let i = 0; i < 5000; i++) {
        const rawBox: BoundingBox = {
          x: (Math.random() - 0.5) * 5000,
          y: (Math.random() - 0.5) * 5000,
          width: Math.random() * 3000,
          height: Math.random() * 3000,
        };

        const clampedOnce = clampToSafeZone(rawBox, p);
        const clampedTwice = clampToSafeZone(clampedOnce, p);

        check(clampedOnce.x === clampedTwice.x, `Idempotence X at ${p} #${i}`);
        check(clampedOnce.y === clampedTwice.y, `Idempotence Y at ${p} #${i}`);
        check(clampedOnce.width === clampedTwice.width, `Idempotence width at ${p} #${i}`);
        check(clampedOnce.height === clampedTwice.height, `Idempotence height at ${p} #${i}`);
        check(isWithinSafeZone(clampedOnce, p), `Clamped box strictly within ${p} at #${i}`);
      }
    }
  });

  test("3.2: 5,000 Randomized Viewport Scaling Fuzzing", () => {
    for (let i = 0; i < 5000; i++) {
      const randW = Math.floor(Math.random() * 3840) + 100;
      const randH = Math.floor(Math.random() * 7680) + 100;
      const platform: PlatformSafeZoneProfile = (
        ["tiktok", "reels", "shorts", "universal", "center"] as const
      )[Math.floor(Math.random() * 5)];

      const scaled = scaleSafeZone(platform, { width: randW, height: randH });

      check(scaled.W === randW, `Fuzzed W ${randW} at #${i}`);
      check(scaled.H === randH, `Fuzzed H ${randH} at #${i}`);
      check(
        scaled.W_SAFE === Math.max(0, scaled.W - scaled.SAFE_LEFT - scaled.SAFE_RIGHT),
        `Fuzzed W_SAFE at #${i}`,
      );
      check(
        scaled.H_SAFE === Math.max(0, scaled.H - scaled.SAFE_TOP - scaled.SAFE_BOTTOM),
        `Fuzzed H_SAFE at #${i}`,
      );
      check(scaled.CENTER_X === scaled.SAFE_LEFT + scaled.W_SAFE / 2, `Fuzzed CENTER_X at #${i}`);
      check(scaled.BOTTOM_MAX_Y === scaled.H - scaled.SAFE_BOTTOM, `Fuzzed BOTTOM_MAX_Y at #${i}`);
      check(scaled.TOP_MIN_Y === scaled.SAFE_TOP, `Fuzzed TOP_MIN_Y at #${i}`);
    }
  });

  test("3.3: Reference Pill Collision Clearance & Gap Enforcing Verification", () => {
    const pillY = REFERENCE_PILL_STANDARDS.DEFAULT_Y; // 300
    const pillH = 56; // Standard pill height (28px font + 2*14px pad)
    const minGap = REFERENCE_PILL_STANDARDS.MIN_VERTICAL_GAP; // 24

    const pillBox: BoundingBox = { x: 400, y: pillY, width: 280, height: pillH };

    // 1. Text starting at pillY + pillH + minGap = 300 + 56 + 24 = 380
    const validTextTop: BoundingBox = { x: 100, y: 380, width: 760, height: 300 };
    check(
      doBoxesCollide(pillBox, validTextTop, minGap) === false,
      "Text starting at Y=380 does NOT collide with pill (gap=24px)",
    );

    // 2. Text starting at Y=379 (gap=23px < 24px)
    const collidingTextGap23: BoundingBox = { x: 100, y: 379, width: 760, height: 300 };
    check(
      doBoxesCollide(pillBox, collidingTextGap23, minGap) === true,
      "Text starting at Y=379 COLLIDES with pill (gap=23px < 24px)",
    );

    // 3. Text starting at Y=350 (direct overlap with pill)
    const directOverlapText: BoundingBox = { x: 100, y: 350, width: 760, height: 300 };
    check(
      doBoxesCollide(pillBox, directOverlapText, 0) === true,
      "Direct overlap text collides with pill",
    );
  });

  console.log("\n=================================================================");
  console.log(`📊 ADVERSARIAL CHALLENGER 2 SUMMARY:`);
  console.log(`   - Test Suites Passed: ${passedCount} / ${passedCount}`);
  console.log(`   - Total Assertions Verified: ${totalAssertions}`);
  console.log("🏆 ALL ADVERSARIAL CHALLENGER TESTS PASSED (100% EMPIRICAL SUCCESS)");
  console.log("=================================================================");
}

runAdversarialChallenger2Suite().catch((err) => {
  console.error("\n❌ ADVERSARIAL CHALLENGER 2 FAILED:", err);
  process.exit(1);
});
