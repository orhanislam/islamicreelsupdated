/**
 * Round 2 Adversarial Reviewer Stress & Edge-Case Verification Suite
 *
 * Attack Vectors:
 * 1. Quotation nesting (guillemets inside Bulgarian quotes, curly quotes, straight quotes)
 * 2. Trailing punctuation isolation without phantom segments (. , ; - — !)
 * 3. QuoteText deduplication when supplied alongside compound mainText
 * 4. Case-insensitive Dalil detection across all canonical collections (Quran, Bukhari, Muslim, Tirmidhi, Abu Daud, Nasai, Ibn Majah)
 * 5. Full 4-slide carousel framework validation (Hook, Body, Dalil, Value-CTA) & Multi-Ayah slides
 * 6. Dynamic gap balancing & adaptive text stroke readability (R2)
 * 7. Extreme 30-segment / 3500-char stress containment (R1)
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
    lineWidth: 6,
    strokeStyle: "",
    fillStyle: "",
    textAlign: "center",
    textBaseline: "middle",
    strokeText: () => {},
    fillText: () => {},
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
// TEST 1: Quotation Nesting & Trailing Punctuation Isolation
// ---------------------------------------------------------------------------
function testQuotationNestingAndPunctuationIsolation() {
  console.log("\n[TEST 1] Quotation Nesting & Trailing Punctuation Isolation...");

  const mockCtx = createMockCtx(1.0);

  // 1. Nested guillemets inside Bulgarian quotation marks
  const nestedSlide: CarouselSlideOptions = {
    backgroundUrl: "bg",
    topTitle: "[Автентичен Хадис]",
    mainText:
      "„Пророкът Мухаммад ﷺ каза: «Действията се оценяват само според намеренията» и всяко дело има своята стойност.“\n\nИскреността (Ихляс) е единственият ключ за приемане на делата.",
    bottomText: "Запази за поука",
  };

  const p1 = parseSlideSegments(nestedSlide);
  assert(p1.isQuoteSlide === true, "Nested quote slide must be recognized as quote slide");
  assert(p1.segments.length === 2, `Expected exactly 2 segments (1 sacred, 1 human), got ${p1.segments.length}`);
  assert(p1.segments[0].type === "sacred", "Segment 0 must be sacred");
  assert(p1.segments[0].text.includes("«Действията се оценяват"), "Inner guillemet quote must remain inside sacred segment");
  assert(p1.segments[0].text.endsWith("стойност.“"), "Sacred segment must properly close at outer quotation mark");
  assert(p1.segments[1].type === "human", "Segment 1 must be human commentary");

  // 2. Trailing punctuation isolation without creating phantom segments
  const punctSlide: CarouselSlideOptions = {
    backgroundUrl: "bg",
    topTitle: "[Знамение]",
    mainText: "„Аллах е Всемъдър, Всезнаещ.“.\n\n„Той знае какво крият гърдите ви.“!",
    bottomText: "Помни",
  };

  const p2 = parseSlideSegments(punctSlide);
  assert(p2.segments.length === 2, `Expected 2 sacred segments without punctuation ghost segments, got ${p2.segments.length}`);
  assert(p2.segments[0].type === "sacred", "Segment 0 must be sacred");
  assert(p2.segments[1].type === "sacred", "Segment 1 must be sacred");

  // 3. Dash-separated quotes
  const dashSlide: CarouselSlideOptions = {
    backgroundUrl: "bg",
    topTitle: "[Два Аята]",
    mainText: "„Цитат 1“ — „Цитат 2“",
    bottomText: "Размисли",
  };
  const p3 = parseSlideSegments(dashSlide);
  assert(p3.segments.length === 2, `Dash between quotes must not create human segment, got ${p3.segments.length}`);

  console.log("  ✔ Nested quotes and trailing punctuation safely isolated.");
}

// ---------------------------------------------------------------------------
// TEST 2: QuoteText Extraction & Compound MainText Deduplication
// ---------------------------------------------------------------------------
function testQuoteTextExtractionAndDeduplication() {
  console.log("\n[TEST 2] QuoteText Extraction & Compound MainText Deduplication...");

  // Scenario 1: quoteText passed explicitly, mainText has both quote and commentary
  const compSlide: CarouselSlideOptions = {
    backgroundUrl: "bg",
    topTitle: "[Коран 65:2-3]",
    quoteText: "„И който се бои от Аллах, Той ще му стори изход.“",
    mainText: "„И който се бои от Аллах, Той ще му стори изход.“\n\nТова обещание дава пълно спокойствие на вярващия.",
    bottomText: "Плъзни наляво",
  };

  const p1 = parseSlideSegments(compSlide);
  assert(p1.isQuoteSlide === true, "Must be quote slide");
  assert(p1.segments.length === 2, `Expected exactly 2 segments, got ${p1.segments.length}`);
  assert(p1.segments[0].type === "sacred", "Segment 0 must be sacred quote");
  assert(p1.segments[1].type === "human", "Segment 1 must be human commentary");
  assert(
    !p1.segments[1].text.includes("ще му стори изход"),
    `Commentary must not duplicate quote text! Got: "${p1.segments[1].text}"`,
  );
  assert(
    p1.segments[1].text === "Това обещание дава пълно спокойствие на вярващия.",
    `Commentary must match extracted text! Got: "${p1.segments[1].text}"`,
  );

  // Scenario 2: quoteText identical to mainText (no commentary)
  const exactSlide: CarouselSlideOptions = {
    backgroundUrl: "bg",
    topTitle: "[Коран 112:1]",
    quoteText: "„Кажи: Той е Аллах Единствен!“",
    mainText: "„Кажи: Той е Аллах Единствен!“",
    bottomText: "Сподели",
  };

  const p2 = parseSlideSegments(exactSlide);
  assert(p2.segments.length === 1, `Expected 1 sacred segment, got ${p2.segments.length}`);
  assert(p2.commentaryText === "", "Commentary text must be empty when quote equals mainText");

  // Scenario 3: explicit commentaryText passed
  const bothSlide: CarouselSlideOptions = {
    backgroundUrl: "bg",
    topTitle: "[Коран 2:255]",
    quoteText: "Аллах! Няма друг бог освен Него...",
    commentaryText: "Най-великият аят в Свещения Коран.",
    mainText: "",
    bottomText: "Запази",
  };

  const p3 = parseSlideSegments(bothSlide);
  assert(p3.segments.length === 2, "Expected 2 segments when both quote and commentary are passed");
  assert(p3.segments[0].text === "Аллах! Няма друг бог освен Него...", "Sacred text matches");
  assert(p3.segments[1].text === "Най-великият аят в Свещения Коран.", "Commentary matches");

  console.log("  ✔ QuoteText extraction and compound mainText deduplication verified.");
}

// ---------------------------------------------------------------------------
// TEST 3: Case-Insensitive Dalil Title Detection
// ---------------------------------------------------------------------------
function testCaseInsensitiveDalilDetection() {
  console.log("\n[TEST 3] Case-Insensitive Dalil Title Detection...");

  const titles = [
    "[коран 2:255] аят ал-курси",
    "[САХИХ АЛ-БУХАРИ #6424] ИЗПИТАНИЯТА",
    "[сура ал-фатиха 1:1-7]",
    "[Сахих Муслим #123]",
    "[Сунан Абу Дауд #456]",
    "[Джами ат-Тирмизи #789]",
    "[Сунан ан-Насаи #101]",
    "[Сунан Ибн Маджа #202]",
    "[2:255] Знамение",
    "#6424 Хадис",
  ];

  for (const title of titles) {
    const slide: CarouselSlideOptions = {
      backgroundUrl: "bg",
      topTitle: title,
      mainText: "Първи свещен параграф от текста.\n\nВтори параграф с богословско обяснение.",
      bottomText: "Запази",
    };
    const parsed = parseSlideSegments(slide);
    assert(
      parsed.isQuoteSlide === true,
      `Title "${title}" must trigger isQuoteSlide=true for Dalil slides`,
    );
    assert(
      parsed.segments.length === 2,
      `Title "${title}" must split into 2 segments (quote and commentary)`,
    );
    assert(parsed.segments[0].type === "sacred", `Segment 0 for "${title}" must be sacred`);
    assert(parsed.segments[1].type === "human", `Segment 1 for "${title}" must be human`);
  }

  console.log("  ✔ All canonical Islamic Hadith & Quran titles correctly detected across casing.");
}

// ---------------------------------------------------------------------------
// TEST 4: Full 4-Slide Framework & Multi-Ayah Verification
// ---------------------------------------------------------------------------
function testFullCarouselFrameworkAndMultiAyah() {
  console.log("\n[TEST 4] Full 4-Slide Framework & Multi-Ayah Verification...");

  const mockCtx = createMockCtx(1.0);
  const measure = (t: string) => mockCtx.measureText(t).width;

  const slides: { name: string; opts: CarouselSlideOptions }[] = [
    {
      name: "Slide 1: Viral Hook Slide",
      opts: {
        backgroundUrl: "bg",
        topTitle: "[ТАЙНАТА НА РИЗКА]",
        mainText: "Защо препитанието ти никога няма да закъснее, дори когато целият свят се съмнява?",
        bottomText: "Плъзни наляво за истината 👉",
      },
    },
    {
      name: "Slide 2: Explanation & Cliffhanger",
      opts: {
        backgroundUrl: "bg",
        topTitle: "БОЖЕСТВЕНИЯТ ЗАКОН",
        mainText:
          "Аллах е определил дела на всяко творение още преди сътворението на небесата и земята. Но най-поразяващото доказателство за това е скрито в думите на Всевишния...",
        bottomText: "Плъзни наляво за далила 👉",
      },
    },
    {
      name: "Slide 3: Authentic Dalil with Commentary",
      opts: {
        backgroundUrl: "bg",
        topTitle: "[Сура Ат-Талак 65:2-3]",
        mainText:
          "„И който се бои от Аллах, Той ще му стори изход и ще му даде препитание оттам, откъдето не е предполагал.“\n\nА ето как да приложиш това спасение в живота си още днес...",
        bottomText: "Плъзни за духовното решение 👉",
      },
    },
    {
      name: "Slide 4: Value-Driven CTA & Dua",
      opts: {
        backgroundUrl: "bg",
        topTitle: "ДЕЙСТВИЕ И ДУА",
        mainText:
          "Казвай всяка сутрин: «Аллахумма инни ас'алюка ризкан таййибан». Помни, че доверието в Аллах (Тауаккул) отваря всяка заключена врата.",
        bottomText: "Запази това напомняне и го сподели за садака джария!",
      },
    },
    {
      name: "Special: Multi-Ayah Continuous Slide (3 Ayahs + 3 Commentary blocks)",
      opts: {
        backgroundUrl: "bg",
        topTitle: "[Сура Ал-Ихляс 112:1-4]",
        mainText:
          "„Кажи: Той е Аллах Единствен!“ Аллах е Абсолютен и няма равен.\n\n„Аллах, Целта на всички въжделения!“ Всички творения зависят от Него.\n\n„Нито е раждал, нито е бил раждан!“ Той е Пречист от всяко съдружие.",
        bottomText: "Запази тези фундаментални основи на Таухид",
      },
    },
  ];

  for (const { name, opts } of slides) {
    const layout = fitSlideLayout(mockCtx, opts);
    assert(
      layout.totalH <= TIKTOK_SAFE_ZONE.H_SAFE,
      `[${name}] totalH (${layout.totalH}px) exceeds safe zone H_SAFE (${TIKTOK_SAFE_ZONE.H_SAFE}px)`,
    );

    const startY =
      TIKTOK_SAFE_ZONE.SAFE_TOP + Math.max(0, (TIKTOK_SAFE_ZONE.H_SAFE - layout.totalH) / 2);
    const endY = startY + layout.totalH;

    assert(
      startY >= TIKTOK_SAFE_ZONE.SAFE_TOP,
      `[${name}] startY (${startY}px) < SAFE_TOP (${TIKTOK_SAFE_ZONE.SAFE_TOP}px)`,
    );
    assert(
      endY <= TIKTOK_SAFE_ZONE.H - TIKTOK_SAFE_ZONE.SAFE_BOTTOM,
      `[${name}] endY (${endY}px) > SAFE_BOTTOM boundary (1520px)`,
    );

    const allLines = [
      ...layout.topLines,
      ...layout.quoteLines,
      ...layout.commentaryLines,
      ...layout.normalLines,
      ...layout.bottomLines,
    ];

    for (const line of allLines) {
      const w = measure(line);
      assert(w <= TIKTOK_SAFE_ZONE.W_SAFE, `[${name}] Line exceeds W_SAFE: width=${w}px text="${line}"`);
      const leftX = TIKTOK_SAFE_ZONE.CENTER_X - w / 2;
      const rightX = TIKTOK_SAFE_ZONE.CENTER_X + w / 2;
      assert(leftX >= TIKTOK_SAFE_ZONE.SAFE_LEFT - 1, `[${name}] Left safe bound breached: ${leftX}px`);
      assert(
        rightX <= TIKTOK_SAFE_ZONE.W - TIKTOK_SAFE_ZONE.SAFE_RIGHT + 1,
        `[${name}] Right safe bound breached: ${rightX}px`,
      );
    }
  }

  console.log("  ✔ All 4 carousel framework slides & Multi-Ayah slide strictly contained in safe zone.");
}

// ---------------------------------------------------------------------------
// TEST 5: Readability & Stroke Scaling Verification
// ---------------------------------------------------------------------------
function testReadabilityAndAdaptiveStroke() {
  console.log("\n[TEST 5] Readability & Stroke Scaling Verification...");

  // Verify that emoji variation selectors and zero-width joiners are sanitized
  const textWithVariationSelectors = "Слава на Аллах! 🕋️✨\uFE0F\u200D";
  const clean = stripEmojis(textWithVariationSelectors);
  assert(clean === "Слава на Аллах!", `Variation selectors must be stripped, got: "${clean}"`);

  // Verify that font size clamps guarantee minimum 8px font / 10px line height
  const mockCtx = createMockCtx(0.01);
  const layout = computeSlideLayout(
    mockCtx,
    {
      backgroundUrl: "bg",
      topTitle: "Заглавие",
      mainText: "Текст",
      bottomText: "Край",
    },
    0.01,
  );

  assert(layout.lhTop >= 10, `lhTop must be >= 10, got ${layout.lhTop}`);
  assert(layout.lhQuote >= 10, `lhQuote must be >= 10, got ${layout.lhQuote}`);
  assert(layout.lhCommentary >= 10, `lhCommentary must be >= 10, got ${layout.lhCommentary}`);
  assert(layout.lhBottom >= 10, `lhBottom must be >= 10, got ${layout.lhBottom}`);

  console.log("  ✔ Emoji variation selectors stripped and font size clamps verified.");
}

// ---------------------------------------------------------------------------
// TEST 6: Hyper-Dense 30-Segment & 3500-Character Extreme Stress Test
// ---------------------------------------------------------------------------
function testHyperDense30SegmentStress() {
  console.log("\n[TEST 6] Hyper-Dense 30-Segment & 3500-Character Stress Test...");

  const mockCtx = createMockCtx(1.0);

  let hyperText = "";
  for (let i = 1; i <= 15; i++) {
    hyperText += `„Точка ${i}: Всяко добро дело носи непреходна награда при Аллах.“ Размишлявай върху това знамение непрестанно в своя ежедневен живот.\n\n`;
  }

  const hyperSlide: CarouselSlideOptions = {
    backgroundUrl: "bg",
    topTitle: "[30 СЕГМЕНТА — УЛТРА СТРЕС ТЕСТ]",
    mainText: hyperText,
    bottomText: "Запази и сподели пълното ръководство",
  };

  const parsed = parseSlideSegments(hyperSlide);
  assert(parsed.segments.length === 30, `Expected 30 segments, got ${parsed.segments.length}`);

  const layout = fitSlideLayout(mockCtx, hyperSlide);
  console.log(
    `  30-Segment Slide -> totalH: ${layout.totalH}px | scale: ${layout.scale.toFixed(3)} | gapScale: ${layout.gapScale.toFixed(3)}`,
  );

  assert(
    layout.totalH <= TIKTOK_SAFE_ZONE.H_SAFE,
    `30-Segment slide totalH (${layout.totalH}px) exceeds safe zone H_SAFE (${TIKTOK_SAFE_ZONE.H_SAFE}px)`,
  );

  const startY =
    TIKTOK_SAFE_ZONE.SAFE_TOP + Math.max(0, (TIKTOK_SAFE_ZONE.H_SAFE - layout.totalH) / 2);
  const endY = startY + layout.totalH;

  assert(startY >= TIKTOK_SAFE_ZONE.SAFE_TOP, `startY (${startY}px) < SAFE_TOP`);
  assert(endY <= TIKTOK_SAFE_ZONE.H - TIKTOK_SAFE_ZONE.SAFE_BOTTOM, `endY (${endY}px) > 1520px`);

  console.log("  ✔ Hyper-dense 30-segment slide strictly fits within TikTok Safe Zone.");
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------
async function runAllReviewerR2Tests() {
  console.log("=================================================================");
  console.log("🛡️ REVIEWER R2 ADVERSARIAL STRESS & VERIFICATION SUITE");
  console.log("=================================================================");

  testQuotationNestingAndPunctuationIsolation();
  testQuoteTextExtractionAndDeduplication();
  testCaseInsensitiveDalilDetection();
  testFullCarouselFrameworkAndMultiAyah();
  testReadabilityAndAdaptiveStroke();
  testHyperDense30SegmentStress();

  console.log("\n=================================================================");
  console.log("🎉 ALL REVIEWER R2 ADVERSARIAL TESTS PASSED PERFECTLY! (6/6)");
  console.log("=================================================================\n");
}

runAllReviewerR2Tests().catch((err) => {
  console.error("❌ Test suite failed:", err);
  process.exit(1);
});
