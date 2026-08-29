/**
 * Automated Verification Test Suite for TikTok Photo Carousel Upgrade
 * Requirements Covered:
 * - R1: Quran/Hadith Text Formatting & Differentiation (Dual-color & Interval spacing)
 * - R2: TikTok Safe Zone & Intelligent Wrapping (Auto-fit scaling, orphan elimination, exact safe box)
 * - R3: Title Generation Cleanup & Sanitization (cleanProposalTitle stripping meta tags while preserving Dalil citations)
 * - R4: Dynamic Background Images (LOCAL_BACKGROUND_POOL 8 assets, sequential rotation, distinct slide backgrounds)
 */

import { cleanProposalTitle } from "../assistant.functions";
import { LOCAL_BACKGROUND_POOL, getCarouselBackgroundsDirect } from "../backgrounds.functions";
import {
  TIKTOK_SAFE_ZONE,
  wrapIntelligent,
  parseSlideSegments,
  computeSlideLayout,
  stripEmojis,
} from "../render-carousel";
import { getNextTawheedTopic } from "../tawheed-taxonomy";
import { generateCarouselScriptDirect } from "../carousel.functions";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED]: ${message}`);
  }
}

// ---------------------------------------------------------------------------
// TEST SUITE 1: Title Sanitizer (R3)
// ---------------------------------------------------------------------------
function testTitleSanitizer() {
  console.log("\n[TEST 1] Verifying cleanProposalTitle (R3)...");

  // 1. Must strip meta prefixes
  assert(
    cleanProposalTitle("[tiktok carousels] [Коран 2:255] Аят ал-Курси") === "[Коран 2:255] Аят ал-Курси",
    "Should strip [tiktok carousels] prefix",
  );
  assert(
    cleanProposalTitle("[tiktok carousel] 3 тайни на сполуката") === "3 тайни на сполуката",
    "Should strip [tiktok carousel] prefix",
  );
  assert(
    cleanProposalTitle("[TikTok] [Сахих ал-Бухари #6424] Изпитанията") === "[Сахих ал-Бухари #6424] Изпитанията",
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
    cleanProposalTitle("[Коран / TikTok] Сура Ал-Ихляс") === "Сура Ал-Ихляс",
    "Should strip [Коран / TikTok] prefix",
  );
  assert(
    cleanProposalTitle("tiktok: Мъдростта на Сабр") === "Мъдростта на Сабр",
    "Should strip unbracketed 'tiktok:' prefix",
  );
  assert(
    cleanProposalTitle("[tiktok carousels] [карусел] [Коран 2:255] Тронът") === "[Коран 2:255] Тронът",
    "Should strip stacked meta prefixes",
  );

  // 2. Must strictly preserve authentic Quran/Hadith citations
  assert(
    cleanProposalTitle("[Коран 2:255] Аят ал-Курси • Тронът на Аллах") === "[Коран 2:255] Аят ал-Курси • Тронът на Аллах",
    "Must preserve authentic Quran reference",
  );
  assert(
    cleanProposalTitle("[Сахих ал-Бухари #6424] Скритата милост") === "[Сахих ал-Бухари #6424] Скритата милост",
    "Must preserve authentic Hadith reference",
  );
  assert(
    cleanProposalTitle("[Сунан Ат-Тирмизи #1987] Търпението") === "[Сунан Ат-Тирмизи #1987] Търпението",
    "Must preserve Sunan Tirmidhi reference",
  );
  assert(
    cleanProposalTitle("[Сура Ал-Фатиха (1:1-2)]") === "[Сура Ал-Фатиха (1:1-2)]",
    "Must preserve Surah name reference",
  );

  // 3. Edge cases
  assert(cleanProposalTitle("") === "", "Empty string should return empty");
  assert(cleanProposalTitle(null as any) === "", "Null should return empty");
  assert(cleanProposalTitle("   ") === "", "Whitespace string should return empty");

  console.log("✔ Title sanitizer (R3) verified across all test vectors.");
}

// ---------------------------------------------------------------------------
// TEST SUITE 2: Dynamic Background Images (R4)
// ---------------------------------------------------------------------------
async function testDynamicBackgrounds() {
  console.log("\n[TEST 2] Verifying Dynamic Background Pool & Rotation (R4)...");

  // 1. Assert LOCAL_BACKGROUND_POOL contains 8 distinct local images
  assert(Array.isArray(LOCAL_BACKGROUND_POOL), "LOCAL_BACKGROUND_POOL must be an array");
  assert(
    LOCAL_BACKGROUND_POOL.length === 8,
    `LOCAL_BACKGROUND_POOL must have exactly 8 images, got ${LOCAL_BACKGROUND_POOL.length}`,
  );
  assert(
    LOCAL_BACKGROUND_POOL.includes("tiktok_images/img0.jpg") &&
      LOCAL_BACKGROUND_POOL.includes("tiktok_images/img3.jpg") &&
      LOCAL_BACKGROUND_POOL.includes("tiktok_output/bg1.jpg") &&
      LOCAL_BACKGROUND_POOL.includes("tiktok_output/bg4.jpg"),
    "LOCAL_BACKGROUND_POOL must contain both tiktok_images and tiktok_output assets",
  );

  // 2. Fetch backgrounds for a 4-slide carousel (Cycle 0)
  const res0 = await getCarouselBackgroundsDirect({ count: 4, cycleIndex: 0 });
  assert(Array.isArray(res0.backgrounds), "getCarouselBackgrounds must return backgrounds array");
  assert(res0.backgrounds.length === 4, `Expected 4 backgrounds, got ${res0.backgrounds.length}`);
  // Each slide in the 4-slide carousel must have a distinct background
  assert(
    new Set(res0.backgrounds).size === 4,
    "Each slide in a 4-slide carousel must receive a distinct background",
  );

  // 3. Fetch backgrounds for next generation (Cycle 1)
  const res1 = await getCarouselBackgroundsDirect({ count: 4, cycleIndex: 1 });
  assert(res1.backgrounds.length === 4, "Cycle 1 must return 4 backgrounds");
  assert(
    new Set(res1.backgrounds).size === 4,
    "Cycle 1 must have 4 distinct backgrounds",
  );

  // 4. Inter-generation rotation: Cycle 0 and Cycle 1 should have disjoint background subsets
  const overlap = res0.backgrounds.filter((bg) => res1.backgrounds.includes(bg));
  assert(
    overlap.length === 0,
    "Cycle 0 and Cycle 1 must use different background sets from the 8-asset pool",
  );

  // 5. Verify base64 Data URL format
  for (const bg of res0.backgrounds) {
    assert(
      bg.startsWith("data:image/jpeg;base64,") || bg.startsWith("data:image/"),
      "Background must be a valid Data URL",
    );
    assert(bg.length > 500, "Background Data URL must contain valid non-empty base64 data");
  }

  console.log("✔ Dynamic background pool and rotation (R4) verified.");
}

// ---------------------------------------------------------------------------
// TEST SUITE 3: Safe Zone Metrics, Intelligent Wrapping & Auto-Fit Scaling (R1, R2)
// ---------------------------------------------------------------------------
function testSafeZoneAndWrapping() {
  console.log("\n[TEST 3] Verifying TikTok Safe Zone & Intelligent Wrapping (R1, R2)...");

  // 1. Safe Zone Metrics Contract
  assert(TIKTOK_SAFE_ZONE.W === 1080, "Canvas width must be 1080");
  assert(TIKTOK_SAFE_ZONE.H === 1920, "Canvas height must be 1920");
  assert(TIKTOK_SAFE_ZONE.SAFE_TOP === 300, "SAFE_TOP must be 300");
  assert(TIKTOK_SAFE_ZONE.SAFE_BOTTOM === 400, "SAFE_BOTTOM must be 400");
  assert(TIKTOK_SAFE_ZONE.SAFE_LEFT === 100, "SAFE_LEFT must be 100");
  assert(TIKTOK_SAFE_ZONE.SAFE_RIGHT === 220, "SAFE_RIGHT must be 220");
  assert(TIKTOK_SAFE_ZONE.W_SAFE === 760, `W_SAFE must be 760, got ${TIKTOK_SAFE_ZONE.W_SAFE}`);
  assert(TIKTOK_SAFE_ZONE.H_SAFE === 1220, `H_SAFE must be 1220, got ${TIKTOK_SAFE_ZONE.H_SAFE}`);
  assert(TIKTOK_SAFE_ZONE.CENTER_X === 480, `CENTER_X must be 480, got ${TIKTOK_SAFE_ZONE.CENTER_X}`);

  // 2. Intelligent Wrapping & Orphan Word Elimination
  // Mock measure function: 1 char = 10px
  const mockMeasure = (text: string) => text.length * 10;
  const longText = "Всеки един от нас търси мир и спасение в Аллах";
  const wrapped = wrapIntelligent(mockMeasure, longText, 250);
  assert(wrapped.length >= 2, "Long text should wrap to multiple lines");
  for (const line of wrapped) {
    assert(mockMeasure(line) <= 250, `Line exceeds max width: "${line}"`);
  }

  // Orphan elimination test: "едно две три четири пет дума"
  // If line 1 has "едно две три четири" and line 2 has "дума" (1 word),
  // orphan balancer moves "четири" to line 2.
  const orphanTestText = "едно две три четири дума";
  const orphanWrapped = wrapIntelligent(mockMeasure, orphanTestText, 220);
  if (orphanWrapped.length > 1) {
    const lastLineWords = orphanWrapped[orphanWrapped.length - 1].split(" ");
    assert(
      lastLineWords.length >= 2,
      `Orphan word elimination should prevent single hanging word on last line: "${orphanWrapped.join(" | ")}"`,
    );
  }

  // 3. Emoji Stripping
  assert(
    stripEmojis("Плъзни наляво 👉✨🌟🕋") === "Плъзни наляво",
    "Should strip emojis cleanly",
  );

  // 4. Slide Segment Parsing (Quran/Hadith vs Human Commentary)
  const dalilSlideData = {
    backgroundUrl: "test",
    topTitle: "[Сура Ал-Бакара 2:255]",
    mainText: "„Аллах! Няма друг бог освен Него - Живия, Вечносъществуващия!“\n\nА ето как да приложиш това спасение в живота си още днес...",
    bottomText: "Плъзни за духовното решение 👉",
    quoteText: "Аллах! Няма друг бог освен Него - Живия, Вечносъществуващия!",
    commentaryText: "А ето как да приложиш това спасение в живота си още днес...",
  };

  const segments = parseSlideSegments(dalilSlideData);
  assert(segments.isQuoteSlide === true, "Should identify quote slide");
  assert(
    segments.quoteText?.includes("Живия"),
    "Should extract sacred quote text",
  );
  assert(
    segments.commentaryText?.includes("приложиш"),
    "Should extract commentary text",
  );

  // Automatic quote detection from quotes in mainText when quoteText is not explicitly passed
  const autoSegments = parseSlideSegments({
    backgroundUrl: "test",
    topTitle: "[Сахих ал-Бухари #6424]",
    mainText: "„Когото Аллах желае да дари с добро, Той го подлага на изпитания.“ Това е знак за любов.",
    bottomText: "Запази",
  });
  assert(autoSegments.isQuoteSlide === true, "Should automatically detect quotes in mainText");
  assert(autoSegments.quoteText?.includes("изпитания"), "Should extract quote text automatically");
  assert(autoSegments.commentaryText?.includes("знак за любов"), "Should extract human commentary automatically");

  // 5. Layout Calculation & Safe Zone Bounding (Mock canvas measure)
  // Mock canvas context
  const mockCtx = {
    font: "",
    measureText: (str: string) => ({ width: str.length * 12 }),
  } as unknown as CanvasRenderingContext2D;

  const layout = computeSlideLayout(mockCtx, dalilSlideData, 1.0);
  assert(layout.topLines.length > 0, "Top lines must be measured");
  assert(layout.quoteLines.length > 0, "Quote lines must be measured");
  assert(layout.commentaryLines.length > 0, "Commentary lines must be measured");
  assert(layout.bottomLines.length > 0, "Bottom lines must be measured");
  assert(layout.gapQuoteToCommentary >= 48 && layout.gapQuoteToCommentary <= 56, "Interval spacing gap must be 48-56px");

  // Verify total height fits within safe zone
  assert(layout.totalH <= TIKTOK_SAFE_ZONE.H_SAFE, "Slide layout must fit inside safe zone height (1220px)");

  console.log("✔ TikTok Safe Zone & Intelligent Wrapping (R1, R2) verified.");
}

// ---------------------------------------------------------------------------
// TEST SUITE 4: End-to-End Carousel Script Generation Integration
// ---------------------------------------------------------------------------
async function testCarouselScriptIntegration() {
  console.log("\n[TEST 4] Verifying End-to-End Carousel Script Generation Integration...");

  const topic = getNextTawheedTopic([]);
  const slides = await generateCarouselScriptDirect({ topic: topic.titleBg });

  assert(Array.isArray(slides) && slides.length === 4, "Must generate exactly 4 slides");

  // Slide 3 must contain quote separation & Dalil
  const slide3 = slides[2];
  assert(!!slide3.topTitle, "Slide 3 must have topTitle");
  assert(
    slide3.mainText.includes("„") || slide3.mainText.includes("\"") || !!slide3.quoteText,
    "Slide 3 must contain formatted quoted Dalil",
  );

  // Slide 4 must contain CTA keywords
  const slide4 = slides[3];
  const ctaCombined = `${slide4.bottomText} ${slide4.mainText}`.toLowerCase();
  assert(
    ctaCombined.includes("запази") || ctaCombined.includes("сподели") || ctaCombined.includes("коментирай"),
    "Slide 4 must contain value-driven CTA keyword",
  );

  console.log("✔ End-to-End Carousel Script Generation verified.");
}

// ---------------------------------------------------------------------------
// Main Test Runner
// ---------------------------------------------------------------------------
async function runUpgradeVerificationSuite() {
  console.log("=================================================================");
  console.log("🚀 STARTING PHOTO CAROUSEL UPGRADE COMPREHENSIVE TEST SUITE");
  console.log("=================================================================");

  testTitleSanitizer();
  await testDynamicBackgrounds();
  testSafeZoneAndWrapping();
  await testCarouselScriptIntegration();

  console.log("\n=================================================================");
  console.log("🎉 ALL PHOTO CAROUSEL UPGRADE TESTS PASSED SUCCESSFULLY! (4/4)");
  console.log("=================================================================\n");
}

runUpgradeVerificationSuite().catch((err) => {
  console.error("\n❌ PHOTO CAROUSEL UPGRADE TESTS FAILED:", err);
  process.exit(1);
});
