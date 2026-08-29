/**
 * Adversarial Verification Test Suite for Vertical Auto-Fit & Multi-Segment Scaling
 *
 * Attack Vectors:
 * 1. Oversized unbroken tokens (>60-150 chars, URLs, long unbroken words)
 * 2. Extreme multi-segment density (12, 16, 20, 25 segments & 2000+ chars)
 * 3. Arabic Tashkeel diacritics + mixed Cyrillic commentary
 * 4. Windows CRLF (\r\n\r\n) multi-paragraph Dalil detection
 * 5. Ghost segment elimination (emojis-only, whitespace-only, empty quotes)
 * 6. Title-only and CTA-only edge cases with vertical spacing integrity
 */

import {
  TIKTOK_SAFE_ZONE,
  parseSlideSegments,
  computeSlideLayout,
  fitSlideLayout,
  wrapIntelligent,
  stripOuterQuotes,
  stripEmojis,
  type CarouselSlideOptions,
} from "../render-carousel";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED]: ${message}`);
  }
}

function createMockCtx(scale: number = 1.0): CanvasRenderingContext2D {
  return {
    font: "",
    measureText: (str: string) => {
      let fs = 60 * scale;
      let w = 0;
      for (const char of str) {
        if (char === " ") {
          w += fs * 0.28;
        } else if (/[.,!?:;'"„“”«»`\(\)\[\]]/.test(char)) {
          w += fs * 0.32;
        } else if (/[щжюшмфЩЖЮШМФWwMm%@]/.test(char)) {
          w += fs * 0.85;
        } else if (/[iljt1I|]/.test(char)) {
          w += fs * 0.30;
        } else if (/[A-ZА-Я]/.test(char)) {
          w += fs * 0.72;
        } else if (/[\u0600-\u06FF]/.test(char)) {
          // Arabic script width
          w += fs * 0.55;
        } else {
          w += fs * 0.60;
        }
      }
      return { width: Math.round(w) };
    },
  } as unknown as CanvasRenderingContext2D;
}

// ---------------------------------------------------------------------------
// TEST 1: Oversized Unbroken Token Splitting & Horizontal Containment
// ---------------------------------------------------------------------------
function testOversizedTokenSplitting() {
  console.log("\n[TEST 1] Testing Oversized Unbroken Token Splitting & Horizontal Containment...");

  const mockCtx = createMockCtx(1.0);
  const measure = (t: string) => mockCtx.measureText(t).width;
  const maxWidth = TIKTOK_SAFE_ZONE.W_SAFE; // 760

  // 1. Single massive unbroken word (120 chars)
  const hugeWord = "НЕПОКОЛЕБИМОСТТА_НА_ВЯРАТА_ПРЕЗ_ВЕКОВЕТЕ_И_ДУХОВНИТЕ_ИЗПИТАНИЯ_В_СВЕТА_НА_ИЗКУШЕНИЯТА_И_СПАСЕНИЕТО";
  const wrapped = wrapIntelligent(measure, hugeWord, maxWidth);

  assert(wrapped.length >= 2, `Oversized word must be split into multiple lines, got ${wrapped.length}`);
  for (const line of wrapped) {
    const w = measure(line);
    assert(w <= maxWidth, `Line exceeds maxWidth (${maxWidth}px): width=${w}px, text="${line}"`);
  }

  // 2. Full slide with long unbroken URL and hashtags
  const urlSlide: CarouselSlideOptions = {
    backgroundUrl: "bg",
    topTitle: "[ВАЖНО СЪОБЩЕНИЕ]",
    mainText: "Посети https://islamic-reels-studio.internal.app/resources/download/full-tawheed-guide-2026-edition-v2 #ИслямскоОбразование2026 #ТаухидФундаменти",
    bottomText: "Запази",
  };

  const layout = fitSlideLayout(mockCtx, urlSlide);
  assert(layout.totalH <= TIKTOK_SAFE_ZONE.H_SAFE, "URL slide must fit vertically");

  const allLines = [
    ...layout.topLines,
    ...layout.quoteLines,
    ...layout.commentaryLines,
    ...layout.normalLines,
    ...layout.bottomLines,
  ];

  for (const line of allLines) {
    const w = measure(line);
    const leftX = TIKTOK_SAFE_ZONE.CENTER_X - w / 2;
    const rightX = TIKTOK_SAFE_ZONE.CENTER_X + w / 2;
    assert(leftX >= TIKTOK_SAFE_ZONE.SAFE_LEFT - 1, `Left bound breached for "${line}": ${leftX}px`);
    assert(rightX <= TIKTOK_SAFE_ZONE.W - TIKTOK_SAFE_ZONE.SAFE_RIGHT + 1, `Right bound breached for "${line}": ${rightX}px`);
  }

  console.log("  ✔ Oversized unbroken words correctly split without horizontal safe-zone breach.");
}

// ---------------------------------------------------------------------------
// TEST 2: Extreme Multi-Segment Density (12, 16, 20 Segments)
// ---------------------------------------------------------------------------
function testExtremeMultiSegmentScaling() {
  console.log("\n[TEST 2] Testing Extreme Multi-Segment Density (12 to 20 Segments)...");

  const mockCtx = createMockCtx(1.0);

  // Generate a slide with 16 alternating quote & commentary segments
  let denseText = "";
  for (let i = 1; i <= 8; i++) {
    denseText += `„Стъпка ${i}: Вярвай в Аллах и Неговото предопределение.“ Това е съществено правило за душата.\n`;
  }

  const denseSlide: CarouselSlideOptions = {
    backgroundUrl: "bg",
    topTitle: "[16-ТЕ СТЪПКИ КЪМ ДУХОВНО СПАСЕНИЕ]",
    mainText: denseText,
    bottomText: "Запази всички стъпки за ежедневна практика!",
  };

  const parsed = parseSlideSegments(denseSlide);
  assert(parsed.segments.length === 16, `Expected 16 segments, got ${parsed.segments.length}`);

  const layout = fitSlideLayout(mockCtx, denseSlide);
  console.log(
    `  16-Segment Slide -> totalH: ${layout.totalH}px | scale: ${layout.scale.toFixed(2)} | gapScale: ${layout.gapScale.toFixed(2)} | gap: ${layout.gapBetweenSegments}px`,
  );

  assert(
    layout.totalH <= TIKTOK_SAFE_ZONE.H_SAFE,
    `16-Segment slide totalH (${layout.totalH}px) exceeds safe zone H_SAFE (${TIKTOK_SAFE_ZONE.H_SAFE}px)`,
  );

  const startY = TIKTOK_SAFE_ZONE.SAFE_TOP + Math.max(0, (TIKTOK_SAFE_ZONE.H_SAFE - layout.totalH) / 2);
  const endY = startY + layout.totalH;

  assert(startY >= TIKTOK_SAFE_ZONE.SAFE_TOP, `startY (${startY}px) < SAFE_TOP (300px)`);
  assert(endY <= TIKTOK_SAFE_ZONE.H - TIKTOK_SAFE_ZONE.SAFE_BOTTOM, `endY (${endY}px) > 1520px`);

  // 20 segments stress test
  let ultraDenseText = "";
  for (let i = 1; i <= 10; i++) {
    ultraDenseText += `„Аят ${i}: Аллах е Всезнаещ и Всечуващ.“ Помни това във всеки миг от своя земен път.\n`;
  }

  const ultraSlide: CarouselSlideOptions = {
    backgroundUrl: "bg",
    topTitle: "[20 СЕГМЕНТА — СТРЕС ТЕСТ]",
    mainText: ultraDenseText,
    bottomText: "Сподели",
  };

  const ultraLayout = fitSlideLayout(mockCtx, ultraSlide);
  console.log(
    `  20-Segment Slide -> totalH: ${ultraLayout.totalH}px | scale: ${ultraLayout.scale.toFixed(2)} | gapScale: ${ultraLayout.gapScale.toFixed(2)}`,
  );

  assert(
    ultraLayout.totalH <= TIKTOK_SAFE_ZONE.H_SAFE,
    `20-Segment slide totalH (${ultraLayout.totalH}px) must strictly fit in safe zone`,
  );

  console.log("  ✔ Extreme multi-segment slides (16-20 segments) strictly fit within safe zone.");
}

// ---------------------------------------------------------------------------
// TEST 3: Arabic Tashkeel Diacritics & Mixed Cyrillic Scripts
// ---------------------------------------------------------------------------
function testArabicTashkeelAndMixedScripts() {
  console.log("\n[TEST 3] Testing Arabic Tashkeel Diacritics & Mixed Cyrillic Scripts...");

  const mockCtx = createMockCtx(1.0);

  const arabicSlide: CarouselSlideOptions = {
    backgroundUrl: "bg",
    topTitle: "[Сура Ал-Ихляс 112:1-4]",
    mainText:
      "«قُلْ هُوَ اللَّهُ أَحَدٌ • اللَّهُ الصَّمَدُ • لَمْ يَلِدْ وَلَمْ يُولَدْ • وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ»\n\n" +
      "Превод и поука: Кажи: Той е Аллах Единствен, Аллах Целта на всички въжделения! Не е раждал и не е бил раждан, и няма равен Нему!",
    bottomText: "Запази това знамение в сърцето си",
  };

  const parsed = parseSlideSegments(arabicSlide);
  assert(parsed.isQuoteSlide === true, "Arabic quote slide must be recognized");
  assert(parsed.segments.length === 2, `Expected 2 segments, got ${parsed.segments.length}`);
  assert(parsed.segments[0].type === "sacred", "Segment 0 must be sacred Arabic text");
  assert(parsed.segments[1].type === "human", "Segment 1 must be human Cyrillic translation");

  const layout = fitSlideLayout(mockCtx, arabicSlide);
  assert(layout.totalH <= TIKTOK_SAFE_ZONE.H_SAFE, "Arabic slide must fit inside safe zone");
  assert(layout.layoutSegments[0].color === "#F3D179", "Arabic quote must be styled in gold");
  assert(layout.layoutSegments[1].color === "#FFFFFF", "Translation must be styled in white");

  console.log("  ✔ Arabic Tashkeel diacritics & mixed Cyrillic correctly parsed, styled, and bounded.");
}

// ---------------------------------------------------------------------------
// TEST 4: Windows CRLF Line Endings Resilience
// ---------------------------------------------------------------------------
function testWindowsCRLFResilience() {
  console.log("\n[TEST 4] Testing Windows CRLF (\\r\\n\\r\\n) Dalil Detection...");

  const crlfSlide: CarouselSlideOptions = {
    backgroundUrl: "bg",
    topTitle: "[Коран 2:255] Аят ал-Курси",
    mainText: "Аллах! Няма друг бог освен Него - Живия, Вечносъществуващия!\r\n\r\nТози аят е най-великият в Корана и носи пълна защита от зло.",
    bottomText: "Сподели",
  };

  const parsed = parseSlideSegments(crlfSlide);
  assert(parsed.isQuoteSlide === true, "Must recognize Dalil slide with CRLF");
  assert(parsed.segments.length === 2, `CRLF slide must parse into 2 segments, got ${parsed.segments.length}`);
  assert(parsed.segments[0].type === "sacred", "Segment 0 must be sacred quote");
  assert(parsed.segments[1].type === "human", "Segment 1 must be human commentary");
  assert(parsed.quoteText?.includes("Живия"), "Quote text must be extracted");
  assert(parsed.commentaryText?.includes("най-великият"), "Commentary text must be extracted");

  console.log("  ✔ Windows CRLF (\\r\\n\\r\\n) paragraph separation works seamlessly.");
}

// ---------------------------------------------------------------------------
// TEST 5: Ghost Segment & Degenerate Whitespace Elimination
// ---------------------------------------------------------------------------
function testGhostSegmentElimination() {
  console.log("\n[TEST 5] Testing Ghost Segment & Degenerate Whitespace Elimination...");

  const mockCtx = createMockCtx(1.0);

  // Slide with emoji-only segment that strips to empty string
  const ghostSlide: CarouselSlideOptions = {
    backgroundUrl: "bg",
    topTitle: "[Мъдрост]",
    mainText: "„Първи цитат“\n\n✨🌟🕋\n\n„Втори цитат“",
    bottomText: "Запази",
  };

  const layout = computeSlideLayout(mockCtx, ghostSlide, 1.0);
  // Empty/emoji-only middle segment should not create an empty layoutSegment
  assert(
    layout.layoutSegments.length === 2,
    `Expected exactly 2 valid segments (omitting emoji ghost), got ${layout.layoutSegments.length}`,
  );
  for (const seg of layout.layoutSegments) {
    assert(seg.lines.length > 0, "No layout segment should have 0 lines");
  }

  // Slide with only title and bottomText (no body)
  const noBodySlide: CarouselSlideOptions = {
    backgroundUrl: "bg",
    topTitle: "[Само Заглавие]",
    mainText: "",
    bottomText: "Запази за по-късно",
  };

  const noBodyLayout = computeSlideLayout(mockCtx, noBodySlide, 1.0);
  assert(noBodyLayout.bodyH === 0, "bodyH must be 0");
  assert(
    noBodyLayout.totalH === noBodyLayout.topH + noBodyLayout.bottomH + noBodyLayout.gapTopToBody,
    `totalH should include gap between top and bottom when body is empty`,
  );

  console.log("  ✔ Ghost segments and empty body spacing safely handled.");
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------
async function runAdversarialVerification() {
  console.log("=================================================================");
  console.log("🛡️ ADVERSARIAL VERIFICATION — VERTICAL AUTO-FIT & MULTI-SEGMENT");
  console.log("=================================================================");

  testOversizedTokenSplitting();
  testExtremeMultiSegmentScaling();
  testArabicTashkeelAndMixedScripts();
  testWindowsCRLFResilience();
  testGhostSegmentElimination();

  console.log("\n=================================================================");
  console.log("🎉 ALL ADVERSARIAL AUTO-FIT & MULTI-SEGMENT TESTS PASSED! (5/5)");
  console.log("=================================================================\n");
}

runAdversarialVerification().catch((err) => {
  console.error("❌ Test suite failed:", err);
  process.exit(1);
});
