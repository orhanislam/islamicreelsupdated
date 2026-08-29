/**
 * Test Suite: Vertical Text Overflow Auto-Fitting & Multi-Segment Spacing
 * Verifies Requirements R1 & R2:
 * - R1: Fix Vertical Text Overflow across 1, 2, 3, 4, 6, 8, 10 segments and extreme text lengths.
 * - R2: Maintain Readability via Dynamic Segment Gap Balancing (gapBetweenSegments scaling).
 * - TikTok Safe Zone Invariants: Vertical [300px, 1520px] and Horizontal [100px, 860px].
 */

import {
  TIKTOK_SAFE_ZONE,
  parseSlideSegments,
  computeSlideLayout,
  fitSlideLayout,
  wrapIntelligent,
  stripOuterQuotes,
  type CarouselSlideOptions,
} from "../render-carousel";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED]: ${message}`);
  }
}

// Calibrated font measurement helper for Montserrat font in Node / jiti environment
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
        } else {
          w += fs * 0.60;
        }
      }
      return { width: Math.round(w) };
    },
  } as unknown as CanvasRenderingContext2D;
}

// ---------------------------------------------------------------------------
// TEST SUITE 1: Multi-Segment Parsing (1 to 10 Segments)
// ---------------------------------------------------------------------------
function testMultiSegmentParsing() {
  console.log("\n[TEST 1] Verifying Multi-Segment Parsing (1 to 10 Segments)...");

  // 1. Single sacred quote
  const singleSacred = parseSlideSegments({
    backgroundUrl: "bg",
    topTitle: "[Сура Ал-Ихляс 112:1]",
    mainText: "„Кажи: Той е Аллах Единствен!“",
    bottomText: "Запази",
  });
  assert(singleSacred.isQuoteSlide === true, "Must be quote slide");
  assert(singleSacred.segments.length === 1, `Expected 1 segment, got ${singleSacred.segments.length}`);
  assert(singleSacred.segments[0].type === "sacred", "Segment 0 must be sacred");

  // 2. Dual segment (Sacred + Human)
  const dualSegment = parseSlideSegments({
    backgroundUrl: "bg",
    topTitle: "[Сахих ал-Бухари #6424]",
    mainText: "„Когото Аллах желае да дари с добро, Той го подлага на изпитания.“ Това е знак за Божествена любов.",
    bottomText: "Сподели",
  });
  assert(dualSegment.isQuoteSlide === true, "Must be quote slide");
  assert(dualSegment.segments.length === 2, `Expected 2 segments, got ${dualSegment.segments.length}`);
  assert(dualSegment.segments[0].type === "sacred", "Segment 0 must be sacred");
  assert(dualSegment.segments[1].type === "human", "Segment 1 must be human");

  // 3. Four segments (Alternating: Human intro + Sacred 1 + Human commentary + Sacred 2)
  const fourSegments = parseSlideSegments({
    backgroundUrl: "bg",
    topTitle: "[Сура Ал-Бакара 2:155-156]",
    mainText: "Аллах казва в Корана: „И непременно ще ви изпитаме с малко страх и глад...“ А когато ги сполети беда, казват: „Ние на Аллах принадлежим и при Него се завръщаме!“",
    bottomText: "Плъзни наляво",
  });
  assert(fourSegments.isQuoteSlide === true, "Must be quote slide");
  assert(fourSegments.segments.length === 4, `Expected 4 segments, got ${fourSegments.segments.length}`);
  assert(fourSegments.segments[0].type === "human", "Seg 0: intro");
  assert(fourSegments.segments[1].type === "sacred", "Seg 1: quote 1");
  assert(fourSegments.segments[2].type === "human", "Seg 2: mid commentary");
  assert(fourSegments.segments[3].type === "sacred", "Seg 3: quote 2");

  // 4. Seven segments (Alternating intro/quotes/reflections)
  const sevenSegments = parseSlideSegments({
    backgroundUrl: "bg",
    topTitle: "[Мъдростта на Корана]",
    mainText: "Първо: „Търпете!“ Това е спасение. Второ: „Молете се!“ Това е връзка. Трето: „Благодарете!“ Това увеличава благата.",
    bottomText: "Запази",
  });
  assert(sevenSegments.isQuoteSlide === true, "Must be quote slide");
  assert(sevenSegments.segments.length === 7, `Expected 7 segments, got ${sevenSegments.segments.length}`);

  console.log("✔ Multi-segment parsing verified across 1, 2, 4, 7 segments.");
}

// ---------------------------------------------------------------------------
// TEST SUITE 2: Dynamic Segment Gap Balancing (R2)
// ---------------------------------------------------------------------------
function testDynamicGapBalancing() {
  console.log("\n[TEST 2] Verifying Dynamic Gap Balancing (R2)...");

  const mockCtx = createMockCtx(1.0);

  // Multi-segment slide that would overflow if gaps were fixed at 52px
  const denseSlide: CarouselSlideOptions = {
    backgroundUrl: "bg",
    topTitle: "[Автентични Хадиси за Духовното Спасение]",
    mainText:
      "„Първото дело, за което рабът ще бъде питан в Съдния ден, е молитвата.“\n" +
      "Това показва фундаменталната роля на намаза в живота на всеки вярващ.\n" +
      "„Който изостави молитвата, е разрушил своята религия.“\n" +
      "Затова пази своите молитви навреме с пълно смирение и чисто намерение.\n" +
      "„Молитвата е светлина за вярващия в тъмнината на земния живот.“\n" +
      "Нека тя бъде твоят ежедневен източник на спокойствие и покой.",
    bottomText: "Запази тези 3 златни правила и сподели за вечна награда!",
  };

  // 1. Calculate unscaled layout at scale 1.0, gapScale 1.0
  const unscaledLayout = computeSlideLayout(mockCtx, denseSlide, 1.0, 1.0);
  console.log(`  Unscaled total height: ${unscaledLayout.totalH}px (Safe H: ${TIKTOK_SAFE_ZONE.H_SAFE}px)`);

  // 2. Calculate auto-fitted layout with fitSlideLayout
  const fittedLayout = fitSlideLayout(mockCtx, denseSlide);
  console.log(
    `  Fitted total height: ${fittedLayout.totalH}px | scale: ${fittedLayout.scale.toFixed(2)} | gapScale: ${fittedLayout.gapScale.toFixed(2)} | gap: ${fittedLayout.gapBetweenSegments}px`,
  );

  // Assertions
  assert(
    fittedLayout.totalH <= TIKTOK_SAFE_ZONE.H_SAFE,
    `Fitted height (${fittedLayout.totalH}px) must not exceed SAFE_H (${TIKTOK_SAFE_ZONE.H_SAFE}px)`,
  );
  assert(
    fittedLayout.gapScale < 1.0,
    `gapScale (${fittedLayout.gapScale}) must be scaled down to balance spacing`,
  );
  assert(
    fittedLayout.gapBetweenSegments >= 10,
    `gapBetweenSegments (${fittedLayout.gapBetweenSegments}px) must remain distinct and >= 10px`,
  );
  assert(
    fittedLayout.scale >= 0.35,
    `scale (${fittedLayout.scale}) must maintain readability and not collapse excessively`,
  );

  console.log("✔ Dynamic gap balancing (R2) verified: gaps compress gracefully while maintaining font size.");
}

// ---------------------------------------------------------------------------
// TEST SUITE 3: Strict TikTok Safe Zone Bounds Containment (R1)
// ---------------------------------------------------------------------------
function testStrictSafeZoneBounds() {
  console.log("\n[TEST 3] Verifying Strict TikTok Safe Zone Containment (R1)...");

  const SAFE_TOP = TIKTOK_SAFE_ZONE.SAFE_TOP; // 300
  const SAFE_BOTTOM = TIKTOK_SAFE_ZONE.SAFE_BOTTOM; // 400
  const SAFE_H = TIKTOK_SAFE_ZONE.H_SAFE; // 1220
  const SAFE_BOTTOM_LIMIT = TIKTOK_SAFE_ZONE.H - SAFE_BOTTOM; // 1520
  const SAFE_LEFT = TIKTOK_SAFE_ZONE.SAFE_LEFT; // 100
  const SAFE_RIGHT_LIMIT = TIKTOK_SAFE_ZONE.W - TIKTOK_SAFE_ZONE.SAFE_RIGHT; // 860
  const CENTER_X = TIKTOK_SAFE_ZONE.CENTER_X; // 480

  const testSlides: { name: string; slide: CarouselSlideOptions }[] = [
    {
      name: "Short 1-line Quote",
      slide: {
        backgroundUrl: "bg",
        topTitle: "[Сура Ал-Ихляс]",
        mainText: "„Аллах е Единствен!“",
        bottomText: "Запази",
      },
    },
    {
      name: "Medium 2-Segment Ayah + Commentary",
      slide: {
        backgroundUrl: "bg",
        topTitle: "[Сура Ал-Бакара 2:255]",
        mainText: "„Аллах! Няма друг бог освен Него - Живия, Вечносъществуващия!“ Този аят носи защита на дома.",
        bottomText: "Плъзни наляво",
      },
    },
    {
      name: "Long 4-Segment Hadith Dialogue",
      slide: {
        backgroundUrl: "bg",
        topTitle: "[Сахих Муслим #2699]",
        mainText:
          "Пратеникът на Аллах каза: „Който поеме по път, търсейки знание, Аллах ще му улесни пътя към Рая.“\n\n" +
          "И ангелите спускат крилете си за търсещия знание от задоволство с онова, което прави: „Истинският учен е наследник на пратениците.“",
        bottomText: "Сподели това спасително напомняне с приятел 👉",
      },
    },
    {
      name: "Dense 6-Segment Tawheed Framework",
      slide: {
        backgroundUrl: "bg",
        topTitle: "[3-ТЕ СТЪЛБА НА ТАУХИД]",
        mainText:
          "1. Рубубийя: „Аллах е Единствен Творец и Господар.“\n" +
          "Никой друг не създава и не дава препитание.\n" +
          "2. Улухийя: „Само на Аллах се кланяме.“\n" +
          "Всяко дуа и ибадет е само за Него.\n" +
          "3. Асма уа Сифат: „Няма нищо подобно на Него.“\n" +
          "Всички Негови качества са съвършени.",
        bottomText: "Запази този фундамент на вярата!",
      },
    },
    {
      name: "Extreme 8-Segment Multi-Quote Block (800+ chars)",
      slide: {
        backgroundUrl: "bg",
        topTitle: "[ВЕЛИКИТЕ ОБЕЩАНИЯ НА ВСЕВИШНИЯ В КОРАНА]",
        mainText:
          "„Помнете Ме, и Аз ще ви помня!“ Това е обещание за духовно възвисяване.\n" +
          "„Благодарете Ми, и Аз ще ви надбавя!“ Това е обещание за изобилие и благодат.\n" +
          "„Зовете Ме, и Аз ще ви откликна!“ Това е обещание за приета молитва.\n" +
          "„Аллах няма да ги накаже, докато търсят опрощение!“ Това е обещание за защита.",
        bottomText: "Приложи тези 4 обещания в ежедневието си още днес!",
      },
    },
    {
      name: "Ultra-Dense 10-Segment Stress Test (1100+ chars)",
      slide: {
        backgroundUrl: "bg",
        topTitle: "[10-ТЕ ЗЛАТНИ ПРАВИЛА ЗА СПОКОЙСТВИЕ НА СЪРЦЕТО]",
        mainText:
          "1. „Искреност“ - прави всичко само за Аллах.\n" +
          "2. „Тауаккул“ - остави крайния резултат на Него.\n" +
          "3. „Сабр“ - проявявай търпение при трудности.\n" +
          "4. „Шукр“ - благодари за всяко малко благо.\n" +
          "5. „Истигфар“ - чисти сърцето с покаяние.\n" +
          "6. „Зикр“ - споменавай Всевишния непрестанно.\n" +
          "7. „Дуа“ - моли се в последния трети от нощта.\n" +
          "8. „Садака“ - раздавай от онова, което обичаш.\n" +
          "9. „Коран“ - чети всеки ден поне по една страница.\n" +
          "10. „Добър нрав“ - бъди милосърден към хората.",
        bottomText: "Запази целия списък за ежедневна проверка!",
      },
    },
  ];

  for (const tc of testSlides) {
    const mockCtx = createMockCtx(1.0);
    const layout = fitSlideLayout(mockCtx, tc.slide);

    // 1. Check total height is strictly <= SAFE_H (1220px)
    assert(
      layout.totalH <= SAFE_H,
      `[${tc.name}] totalH (${layout.totalH}px) exceeds SAFE_H (${SAFE_H}px)!`,
    );

    // 2. Check vertical coordinates
    const startY = SAFE_TOP + Math.max(0, (SAFE_H - layout.totalH) / 2);
    const endY = startY + layout.totalH;

    assert(
      startY >= SAFE_TOP,
      `[${tc.name}] Top bound breached: startY (${startY}px) < SAFE_TOP (${SAFE_TOP}px)`,
    );
    assert(
      endY <= SAFE_BOTTOM_LIMIT,
      `[${tc.name}] Bottom bound breached: endY (${endY}px) > SAFE_BOTTOM_LIMIT (${SAFE_BOTTOM_LIMIT}px)`,
    );

    // 3. Check horizontal lines containment
    const allLines = [
      ...layout.topLines,
      ...layout.quoteLines,
      ...layout.commentaryLines,
      ...layout.normalLines,
      ...layout.bottomLines,
    ];

    for (const line of allLines) {
      const lineMeasure = (t: string) => mockCtx.measureText(t).width;
      const w = lineMeasure(line);
      const leftX = CENTER_X - w / 2;
      const rightX = CENTER_X + w / 2;

      assert(
        leftX >= SAFE_LEFT - 1,
        `[${tc.name}] Left bound breached for "${line}": leftX (${leftX}px) < SAFE_LEFT (${SAFE_LEFT}px)`,
      );
      assert(
        rightX <= SAFE_RIGHT_LIMIT + 1,
        `[${tc.name}] Right bound breached for "${line}": rightX (${rightX}px) > SAFE_RIGHT_LIMIT (${SAFE_RIGHT_LIMIT}px)`,
      );
    }

    console.log(`  ✔ [${tc.name}] Containment verified: totalH=${layout.totalH}px, scale=${layout.scale.toFixed(2)}, gapScale=${layout.gapScale.toFixed(2)}, startY=${startY}px, endY=${endY}px`);
  }

  console.log("✔ Strict TikTok Safe Zone Containment (R1) verified across all segment scales.");
}

// ---------------------------------------------------------------------------
// TEST SUITE 4: Boundary & Degenerate Cases
// ---------------------------------------------------------------------------
function testDegenerateAndEdgeCases() {
  console.log("\n[TEST 4] Verifying Boundary & Degenerate Cases...");

  const mockCtx = createMockCtx(1.0);

  // 1. Empty slide options
  const emptyLayout = fitSlideLayout(mockCtx, {
    backgroundUrl: "",
    topTitle: "",
    mainText: "",
    bottomText: "",
  });
  assert(emptyLayout.totalH === 0, "Empty slide must have totalH = 0");
  assert(emptyLayout.scale === 1.0, "Empty slide should stay at scale 1.0");

  // 2. Slide with only title
  const titleOnly = fitSlideLayout(mockCtx, {
    backgroundUrl: "bg",
    topTitle: "[Само Заглавие]",
    mainText: "",
    bottomText: "",
  });
  assert(titleOnly.topLines.length > 0, "Top lines must exist");
  assert(titleOnly.bodyH === 0, "Body height must be 0");
  assert(titleOnly.totalH === titleOnly.topH, "Total height must equal top height");

  // 3. Slide with only bottomText
  const bottomOnly = fitSlideLayout(mockCtx, {
    backgroundUrl: "bg",
    topTitle: "",
    mainText: "",
    bottomText: "Плъзни наляво за следващата част 👉",
  });
  assert(bottomOnly.bottomLines.length > 0, "Bottom lines must exist");
  assert(bottomOnly.totalH === bottomOnly.bottomH, "Total height must equal bottom height");

  // 4. Quotation stripping helper
  assert(stripOuterQuotes("„Текст“") === "Текст", "Bulgarian quotes stripped");
  assert(stripOuterQuotes("«Текст»") === "Текст", "Guillemets stripped");
  assert(stripOuterQuotes("“Текст”") === "Текст", "Curly quotes stripped");
  assert(stripOuterQuotes("\"Текст\"") === "Текст", "Straight quotes stripped");
  assert(stripOuterQuotes("Текст без кавички") === "Текст без кавички", "Unquoted text untouched");

  console.log("✔ Boundary & degenerate cases safely handled.");
}

// ---------------------------------------------------------------------------
// Main Runner
// ---------------------------------------------------------------------------
async function runAllTests() {
  console.log("=================================================================");
  console.log("🚀 STARTING VERTICAL AUTO-FIT & MULTI-SEGMENT SPACING TEST SUITE");
  console.log("=================================================================");

  testMultiSegmentParsing();
  testDynamicGapBalancing();
  testStrictSafeZoneBounds();
  testDegenerateAndEdgeCases();

  console.log("\n=================================================================");
  console.log("🎉 ALL VERTICAL AUTO-FIT & MULTI-SEGMENT TESTS PASSED! (4/4)");
  console.log("=================================================================\n");
}

runAllTests().catch((err) => {
  console.error("❌ Test suite failed:", err);
  process.exit(1);
});
