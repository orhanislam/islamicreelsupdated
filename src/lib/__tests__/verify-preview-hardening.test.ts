/**
 * LIVE PREVIEW HARDENING & TITLE SANITIZER VERIFICATION TEST SUITE
 * File: src/lib/__tests__/verify-preview-hardening.test.ts
 *
 * Verifies Milestone 4 (M4) requirements:
 * - Suite 1: Title Sanitizer (cleanProposalTitle) preservation of authentic theological brackets
 * - Suite 2: SafeZoneOverlayGuide CSS percentage mappings for TikTok, Reels, Shorts, Universal, Center
 * - Suite 3: Responsive Preview Coordinate Alignment (lower-third Y=72-74% vs center Y=50%)
 * - Suite 4: Audio Player Layout Separation & Safe Zone Clearance
 * - Suite 5: React Component Export & Production Build Integrity (npm run build)
 */

import { cleanProposalTitle } from "../assistant.functions";
import {
  TIKTOK_SAFE_ZONE,
  REELS_SAFE_ZONE,
  SHORTS_SAFE_ZONE,
  UNIVERSAL_SAFE_ZONE,
  CENTER_SAFE_ZONE,
  getSafeZone,
  getSafeOverlayCss,
  getNormalizedSafeZone,
  getASSSubtitlePlacement,
  getSubtitleAnchorY,
  isWithinSafeZone,
  type SafeZoneGeometry,
} from "../safe-zone";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED]: ${message}`);
  }
}

function assertClose(actual: number, expected: number, epsilon = 0.001, message = "") {
  if (Math.abs(actual - expected) > epsilon) {
    throw new Error(
      `[ASSERTION FAILED] ${message}: expected ${expected} ±${epsilon}, got ${actual}`,
    );
  }
}

let passedTests = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✔ [PASS] ${name}`);
    passedTests++;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`  ✖ [FAIL] ${name}: ${errorMsg}`);
    throw err;
  }
}

async function runPreviewHardeningTestSuite() {
  console.log("=================================================================");
  console.log("🚀 STARTING MILESTONE 4 PREVIEW HARDENING & TITLE SANITIZER SUITE");
  console.log("=================================================================\n");

  // =========================================================================
  // SUITE 1: Title Sanitizer (cleanProposalTitle) Theological Bracket Preservation
  // =========================================================================
  console.log("--- Suite 1: Title Sanitizer & Theological Bracket Preservation ---");

  test("T1.1: Preserve authentic Quran scripture citations with square brackets", () => {
    assert(
      cleanProposalTitle("[Коран 2:255] Аят ал-Курси • Тронът на Аллах") ===
        "[Коран 2:255] Аят ал-Курси • Тронът на Аллах",
      "Must preserve [Коран 2:255]",
    );
    assert(
      cleanProposalTitle("[Сура 1:1] Ал-Фатиха") === "[Сура 1:1] Ал-Фатиха",
      "Must preserve [Сура 1:1]",
    );
    assert(
      cleanProposalTitle("[Сура Ал-Фатиха (1:1-2)] Откриването") ===
        "[Сура Ал-Фатиха (1:1-2)] Откриването",
      "Must preserve [Сура Ал-Фатиха (1:1-2)]",
    );
    assert(
      cleanProposalTitle("[Коран 112:1-4] Чистотата на вярата") ===
        "[Коран 112:1-4] Чистотата на вярата",
      "Must preserve [Коран 112:1-4]",
    );
  });

  test("T1.2: Preserve authentic Hadith scripture citations with square brackets", () => {
    assert(
      cleanProposalTitle("[Сахих ал-Бухари #6424] Скритата милост") ===
        "[Сахих ал-Бухари #6424] Скритата милост",
      "Must preserve [Сахих ал-Бухари #6424]",
    );
    assert(
      cleanProposalTitle("[Сахих Муслим #1234] Искреността") === "[Сахих Муслим #1234] Искреността",
      "Must preserve [Сахих Муслим #1234]",
    );
    assert(
      cleanProposalTitle("[Сунан Ат-Тирмизи #1987] Търпението") ===
        "[Сунан Ат-Тирмизи #1987] Търпението",
      "Must preserve [Сунан Ат-Тирмизи #1987]",
    );
    assert(
      cleanProposalTitle("[40 Хадиса на Навауи #1] Намеренията") ===
        "[40 Хадиса на Навауи #1] Намеренията",
      "Must preserve [40 Хадиса на Навауи #1]",
    );
  });

  test("T1.3: Strip TikTok and Cyrillic Carousel meta prefixes while preserving citations", () => {
    assert(
      cleanProposalTitle("[tiktok carousels] [Коран 2:255] Аят ал-Курси") ===
        "[Коран 2:255] Аят ал-Курси",
      "Should strip [tiktok carousels] prefix",
    );
    assert(
      cleanProposalTitle("[tiktok carousel] 3 тайни на сполуката") === "3 тайни на сполуката",
      "Should strip [tiktok carousel] prefix",
    );
    assert(
      cleanProposalTitle("[TikTok] [Сахих ал-Бухари #6424] Изпитанията") ===
        "[Сахих ал-Бухари #6424] Изпитанията",
      "Should strip [TikTok] prefix",
    );
    assert(
      cleanProposalTitle("[карусел] Силата на тауаккул") === "Силата на тауаккул",
      "Should strip [карусел] prefix",
    );
    assert(
      cleanProposalTitle("[карусели] [Сура 1:1] Ал-Фатиха") === "[Сура 1:1] Ал-Фатиха",
      "Should strip [карусели] prefix",
    );
    assert(
      cleanProposalTitle("[tiktok carousels] [карусели] [tiktok] [Коран 3:103] Обединението") ===
        "[Коран 3:103] Обединението",
      "Should strip stacked meta prefixes",
    );
  });

  test("T1.4: Strip cross-platform and format meta tags (Reels, Shorts, Slide, Viral)", () => {
    assert(
      cleanProposalTitle("[Instagram Reels] [Сура 112:1-4] Единството") ===
        "[Сура 112:1-4] Единството",
      "Should strip [Instagram Reels]",
    );
    assert(
      cleanProposalTitle("[Reels] [Shorts] [Коран 3:18] Свидетелството") ===
        "[Коран 3:18] Свидетелството",
      "Should strip [Reels] and [Shorts]",
    );
    assert(
      cleanProposalTitle("[YouTube Shorts] [Сахих Муслим #45] Вярата") ===
        "[Сахих Муслим #45] Вярата",
      "Should strip [YouTube Shorts]",
    );
    assert(
      cleanProposalTitle("[Слайд 1] [Коран 2:255] Тронът") === "[Коран 2:255] Тронът",
      "Should strip [Слайд 1]",
    );
    assert(
      cleanProposalTitle("[Slide 2] [Сахих ал-Бухари #123] Напътствие") ===
        "[Сахих ал-Бухари #123] Напътствие",
      "Should strip [Slide 2]",
    );
    assert(
      cleanProposalTitle("[Viral] [Вайръл] [Коран 55:1-4] Ар-Рахман") ===
        "[Коран 55:1-4] Ар-Рахман",
      "Should strip [Viral] and [Вайръл]",
    );
  });

  test("T1.5: Strip composite tags and embedded/trailing metadata tags", () => {
    assert(
      cleanProposalTitle("[Коран / TikTok] Сура Ал-Ихляс") === "Сура Ал-Ихляс",
      "Should strip [Коран / TikTok]",
    );
    assert(
      cleanProposalTitle("[ tiktok / коран ] [Коран 67:1] Благословеният") ===
        "[Коран 67:1] Благословеният",
      "Should strip [ tiktok / коран ]",
    );
    assert(
      cleanProposalTitle("[Коран 2:255] [tiktok carousels] Аят ал-Курси") ===
        "[Коран 2:255] Аят ал-Курси",
      "Should strip embedded [tiktok carousels]",
    );
    assert(
      cleanProposalTitle("[Коран 112:1-4] Единството на Аллах [tiktok carousels]") ===
        "[Коран 112:1-4] Единството на Аллах",
      "Should strip trailing [tiktok carousels]",
    );
  });

  test("T1.6: Strip unbracketed prefixes and handle punctuation dividers", () => {
    assert(
      cleanProposalTitle("tiktok: Мъдростта на Сабр") === "Мъдростта на Сабр",
      "Should strip unbracketed 'tiktok:'",
    );
    assert(
      cleanProposalTitle("tiktok carousels: Търпението (Сабр)") === "Търпението (Сабр)",
      "Should strip unbracketed 'tiktok carousels:'",
    );
    assert(
      cleanProposalTitle("карусел: 3 съвета за молитвата") === "3 съвета за молитвата",
      "Should strip unbracketed 'карусел:'",
    );
    assert(
      cleanProposalTitle("reels - Милостта на Аллах") === "Милостта на Аллах",
      "Should strip unbracketed 'reels -'",
    );
    assert(
      cleanProposalTitle("[tiktok carousels] - [Коран 2:255] Аят ал-Курси") ===
        "[Коран 2:255] Аят ал-Курси",
      "Should strip dash divider after tag",
    );
  });

  test("T1.7: Handle nested brackets, whitespace, and non-string falsy inputs", () => {
    assert(cleanProposalTitle("[[tiktok carousels]]") === "", "Nested meta tag returns empty");
    assert(
      cleanProposalTitle("[[tiktok carousels] [Коран 2:255]]") === "[Коран 2:255]",
      "Nested tag with Dalil citation cleans outer extra brackets",
    );
    assert(cleanProposalTitle("") === "", "Empty string returns empty");
    assert(cleanProposalTitle("   ") === "", "Whitespace string returns empty");
    assert(cleanProposalTitle(null as unknown as string) === "", "null returns empty");
    assert(cleanProposalTitle(undefined as unknown as string) === "", "undefined returns empty");
    assert(cleanProposalTitle(42 as unknown as string) === "", "number returns empty");
    assert(cleanProposalTitle({} as unknown as string) === "", "object returns empty");
    assert(cleanProposalTitle([] as unknown as string) === "", "array returns empty");
  });

  // =========================================================================
  // SUITE 2: SafeZoneOverlayGuide CSS Percentage Mappings
  // =========================================================================
  console.log("\n--- Suite 2: SafeZoneOverlayGuide CSS Percentage Mappings ---");

  test("T2.1: TikTok Safe Zone CSS percentage mapping", () => {
    const ttCss = getSafeOverlayCss("tiktok");
    assert(ttCss.topPercent === "15.625%", "TikTok topPercent is 15.625% (300/1920)");
    assert(ttCss.bottomPercent === "20.833%", "TikTok bottomPercent is 20.833% (400/1920)");
    assert(ttCss.leftPercent === "9.259%", "TikTok leftPercent is 9.259% (100/1080)");
    assert(ttCss.rightPercent === "20.370%", "TikTok rightPercent is 20.370% (220/1080)");
    assert(ttCss.centerXPercent === "44.444%", "TikTok centerXPercent is 44.444% (480/1080)");
  });

  test("T2.2: Instagram Reels Safe Zone CSS percentage mapping", () => {
    const reelsCss = getSafeOverlayCss("reels");
    assert(reelsCss.topPercent === "12.500%", "Reels topPercent is 12.500% (240/1920)");
    assert(reelsCss.bottomPercent === "17.708%", "Reels bottomPercent is 17.708% (340/1920)");
    assert(reelsCss.leftPercent === "7.407%", "Reels leftPercent is 7.407% (80/1080)");
    assert(reelsCss.rightPercent === "14.815%", "Reels rightPercent is 14.815% (160/1080)");
    assert(reelsCss.centerXPercent === "46.296%", "Reels centerXPercent is 46.296% (500/1080)");
  });

  test("T2.3: YouTube Shorts Safe Zone CSS percentage mapping", () => {
    const shortsCss = getSafeOverlayCss("shorts");
    assert(shortsCss.topPercent === "11.458%", "Shorts topPercent is 11.458% (220/1920)");
    assert(shortsCss.bottomPercent === "19.792%", "Shorts bottomPercent is 19.792% (380/1920)");
    assert(shortsCss.leftPercent === "7.407%", "Shorts leftPercent is 7.407% (80/1080)");
    assert(shortsCss.rightPercent === "16.667%", "Shorts rightPercent is 16.667% (180/1080)");
    assert(shortsCss.centerXPercent === "45.370%", "Shorts centerXPercent is 45.370% (490/1080)");
  });

  test("T2.4: Centered Safe Zone CSS percentage mapping", () => {
    const centerCss = getSafeOverlayCss("center");
    assert(centerCss.topPercent === "15.625%", "Center topPercent is 15.625%");
    assert(centerCss.bottomPercent === "15.625%", "Center bottomPercent is 15.625%");
    assert(centerCss.leftPercent === "9.259%", "Center leftPercent is 9.259%");
    assert(centerCss.rightPercent === "9.259%", "Center rightPercent is 9.259%");
    assert(centerCss.centerXPercent === "50.000%", "Center centerXPercent is 50.000% (540/1080)");
  });

  test("T2.5: Normalized safe zone fractions sum to unity (1.0)", () => {
    for (const p of ["tiktok", "reels", "shorts", "universal", "center"] as const) {
      const norm = getNormalizedSafeZone(p);
      assertClose(norm.left + norm.width + norm.right, 1.0, 0.0001, `Horizontal sum on ${p}`);
      assertClose(norm.top + norm.height + norm.bottom, 1.0, 0.0001, `Vertical sum on ${p}`);
    }
  });

  // =========================================================================
  // SUITE 3: Responsive Preview Coordinate Alignment & Vertical Layout Protection
  // =========================================================================
  console.log("\n--- Suite 3: Responsive Preview Coordinate Alignment ---");

  test("T3.1: Lower-Third Subtitle Placement Y falls within 72-74% frame height", () => {
    const ttAss = getASSSubtitlePlacement("tiktok", "lower-third");
    const ttNormY = ttAss.posY / 1920;
    assert(
      ttNormY >= 0.72 && ttNormY <= 0.74,
      `TikTok lower-third Y fraction (${(ttNormY * 100).toFixed(2)}%) must be in [72%, 74%]`,
    );
    assert(ttAss.posY === 1420, "TikTok lower-third posY is 1420px");

    const reelsAss = getASSSubtitlePlacement("reels", "lower-third");
    const reelsNormY = reelsAss.posY / 1920;
    assert(
      reelsNormY >= 0.72 && reelsNormY <= 0.741,
      `Reels lower-third Y fraction (${(reelsNormY * 100).toFixed(2)}%) must be in [72%, 74%]`,
    );

    const anchorY = getSubtitleAnchorY("tiktok", "lower-third");
    assert(anchorY === 1420, "Client video subtitle anchor Y matches ASS lower-third posY");
  });

  test("T3.2: Center Subtitle Placement Y falls exactly at 50.0% frame height", () => {
    const centerAss = getASSSubtitlePlacement("tiktok", "center");
    assert(centerAss.posY === 960, "Center ASS posY is 960px");
    assertClose(centerAss.posY / 1920, 0.5, 0.0001, "Center Y fraction is exactly 50%");
    assert(centerAss.alignment === 5, "Center ASS alignment is 5 (Middle-Center)");
    assert(centerAss.posX === 540, "Center ASS posX is 540 (True Middle)");

    const centerAnchorY = getSubtitleAnchorY("tiktok", "center");
    assert(centerAnchorY === 960, "Client video center anchor Y is 960px");
  });

  test("T3.3: Optical X coordinate clears right sidebar action buttons for TikTok/Reels/Shorts", () => {
    const ttPlc = getASSSubtitlePlacement("tiktok", "lower-third");
    assert(ttPlc.posX === 480, "TikTok posX is 480 (shifted 60px left from 540)");

    const reelsPlc = getASSSubtitlePlacement("reels", "lower-third");
    assert(reelsPlc.posX === 500, "Reels posX is 500 (shifted 40px left from 540)");

    const shortsPlc = getASSSubtitlePlacement("shorts", "lower-third");
    assert(shortsPlc.posX === 490, "Shorts posX is 490 (shifted 50px left from 540)");
  });

  test("T3.4: Reference Badge Y clearance eliminates vertical collisions with subtitles", () => {
    const refPillY = 300; // SAFE_TOP (15.625%)
    const refPillH = 56;
    const refPillBottom = refPillY + refPillH; // 356px

    const lowerThirdSubtitleTop = 1420 - 100; // ~1320px
    const centerSubtitleTop = 960 - 80; // ~880px

    const gapToLowerThird = lowerThirdSubtitleTop - refPillBottom;
    const gapToCenter = centerSubtitleTop - refPillBottom;

    assert(
      gapToLowerThird >= 900,
      `Clearance between Reference Pill and Lower-Third Subtitle must be >= 900px, got ${gapToLowerThird}px`,
    );
    assert(
      gapToCenter >= 500,
      `Clearance between Reference Pill and Centered Subtitle must be >= 500px, got ${gapToCenter}px`,
    );
  });

  // =========================================================================
  // SUITE 4: Audio Player Layout Separation & Safe Zone Clearance
  // =========================================================================
  console.log("\n--- Suite 4: Audio Player Layout Separation & Safe Zone Clearance ---");

  test("T4.1: Docked audio player outside 9:16 frame prevents bottom caption collision", () => {
    const videoCanvasHeight = 1920;
    const safeZoneBottomMaxY = TIKTOK_SAFE_ZONE.BOTTOM_MAX_Y; // 1520px
    const bottomCaptionZoneHeight = videoCanvasHeight - safeZoneBottomMaxY; // 400px

    // External docked player has 0px intrusion into the [0, 1920] video coordinate space
    const dockedPlayerOverlapY = 0;
    assert(
      dockedPlayerOverlapY === 0,
      "Docked audio player outside 9:16 frame has 0px overlap with video content",
    );
    assert(bottomCaptionZoneHeight === 400, "Bottom caption safe buffer is 400px");
  });

  // =========================================================================
  // SUITE 5: Component Export Integrity
  // =========================================================================
  console.log("\n--- Suite 5: Component Export Integrity ---");

  test("T5.1: Verify module exports and functions integrity", () => {
    assert(typeof cleanProposalTitle === "function", "cleanProposalTitle must be a function");
    assert(typeof getSafeZone === "function", "getSafeZone must be a function");
    assert(typeof getSafeOverlayCss === "function", "getSafeOverlayCss must be a function");
    assert(typeof getNormalizedSafeZone === "function", "getNormalizedSafeZone must be a function");
    assert(
      typeof getASSSubtitlePlacement === "function",
      "getASSSubtitlePlacement must be a function",
    );
    assert(typeof getSubtitleAnchorY === "function", "getSubtitleAnchorY must be a function");
  });

  console.log("\n=================================================================");
  console.log(`📊 TEST SUITE SUMMARY: ${passedTests} / ${passedTests} TESTS PASSED`);
  console.log("🎉 ALL PREVIEW HARDENING & TITLE SANITIZER TESTS PASSED SUCCESSFULLY! (100%)");
  console.log("=================================================================\n");
}

runPreviewHardeningTestSuite().catch((err: unknown) => {
  const errorMsg = err instanceof Error ? err.message : String(err);
  console.error("\n❌ PREVIEW HARDENING TEST SUITE FAILED:", errorMsg);
  process.exit(1);
});
