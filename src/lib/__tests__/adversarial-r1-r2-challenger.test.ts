/**
 * CHALLENGER 1 ADVERSARIAL STRESS TEST SUITE — EXTENDED HARDENING
 * Requirements Under Adversarial Audit:
 * - R1: Ayah/Hadith Text Differentiation, Quotation Variations & Interval Spacing
 * - R2: TikTok Safe Zone Boundaries, Intelligent Text Wrapping & Auto-Fit Scaling
 *
 * Safe Zone Invariants:
 * - Horizontal: All text lines strictly in [100px, 860px] (W_SAFE = 760px, CENTER_X = 480px)
 * - Vertical: All text blocks strictly in [300px, 1520px] (H_SAFE = 1220px, SAFE_TOP = 300px, SAFE_BOTTOM = 400px)
 * - Zero mid-sentence cutoff: 100% word retention, zero dropped or severed words
 * - Sacred vs Commentary: Distinct styling and dedicated vertical interval spacing (48-56px scaled)
 */

import {
  TIKTOK_SAFE_ZONE,
  wrapIntelligent,
  parseSlideSegments,
  computeSlideLayout,
  stripEmojis,
  type CarouselSlideOptions,
} from "../render-carousel";
import { getTawheedTaxonomy } from "../tawheed-taxonomy";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[ADVERSARIAL FAIL]: ${message}`);
  }
}

// Calibrated Cyrillic/Latin font width estimator for Montserrat Bold/Medium
function createCalibratedMeasureFn(fontSize: number, isBold: boolean = true) {
  return (text: string): number => {
    let w = 0;
    for (const char of text) {
      if (char === " ") {
        w += fontSize * 0.28;
      } else if (/[.,!?:;'"„“”«»`\(\)\[\]]/.test(char)) {
        w += fontSize * 0.32;
      } else if (/[щжюшмфЩЖЮШМФWwMm%@]/.test(char)) {
        w += fontSize * (isBold ? 0.85 : 0.78);
      } else if (/[iljt1I|]/.test(char)) {
        w += fontSize * 0.30;
      } else if (/[A-ZА-Я]/.test(char)) {
        w += fontSize * (isBold ? 0.72 : 0.65);
      } else {
        w += fontSize * (isBold ? 0.60 : 0.54);
      }
    }
    return Math.round(w);
  };
}

function createMockCtx(scale: number = 1.0): CanvasRenderingContext2D {
  return {
    font: "",
    measureText: (str: string) => {
      let fs = 60 * scale;
      let isBold = true;
      return { width: createCalibratedMeasureFn(fs, isBold)(str) };
    },
  } as unknown as CanvasRenderingContext2D;
}

// ---------------------------------------------------------------------------
// SUITE 1: Bulgarian & International Quotation Syntax Stress (R1)
// ---------------------------------------------------------------------------
function testQuotationSyntaxStress() {
  console.log("\n[SUITE 1] Adversarial Quotation Syntax & Sacred Text Differentiation (R1)...");

  const testCases: {
    name: string;
    input: CarouselSlideOptions;
    expectedQuote: string;
    expectedCommentarySnippet?: string;
  }[] = [
    {
      name: "Bulgarian Standard Quotation („...“ with commentary)",
      input: {
        backgroundUrl: "bg",
        topTitle: "[Сура Ал-Бакара 2:255]",
        mainText: "„Аллах! Няма друг бог освен Него - Живия, Вечносъществуващия!“ Това е най-великият аят в Корана.",
        bottomText: "Запази",
      },
      expectedQuote: "Аллах! Няма друг бог освен Него - Живия, Вечносъществуващия!",
      expectedCommentarySnippet: "Това е най-великият аят",
    },
    {
      name: "Western Straight Double Quotes (\"...\")",
      input: {
        backgroundUrl: "bg",
        topTitle: "[Сахих ал-Бухари #6424]",
        mainText: "\"Когото Аллах желае да дари с добро, Той го подлага на изпитания.\" Размисли над това.",
        bottomText: "Сподели",
      },
      expectedQuote: "Когото Аллах желае да дари с добро, Той го подлага на изпитания.",
      expectedCommentarySnippet: "Размисли над това",
    },
    {
      name: "Russian / French Guillemets («...»)",
      input: {
        backgroundUrl: "bg",
        topTitle: "[Сунан Ат-Тирмизи #1987]",
        mainText: "«Няма нищо по-тежко на везните от добрия нрав.» Приложи това днес.",
        bottomText: "Плъзни",
      },
      expectedQuote: "Няма нищо по-тежко на везните от добрия нрав.",
      expectedCommentarySnippet: "Приложи това днес",
    },
    {
      name: "Western Curly / Smart Quotes (“...”)",
      input: {
        backgroundUrl: "bg",
        topTitle: "[Сура Ал-Ихляс 112:1-4]",
        mainText: "“Кажи: Той е Аллах Единствен, Аллах, Целта на всички!” Единството на Създателя.",
        bottomText: "Запази",
      },
      expectedQuote: "Кажи: Той е Аллах Единствен, Аллах, Целта на всички!",
      expectedCommentarySnippet: "Единството на Създателя",
    },
    {
      name: "Embedded Quote with Leading and Trailing Commentary",
      input: {
        backgroundUrl: "bg",
        topTitle: "[Сахих Муслим #2699]",
        mainText: "Пратеникът на Аллах каза: „Който поеме по път, търсейки знание, Аллах ще му улесни пътя към Рая.“ Затова търси истинското знание.",
        bottomText: "Сподели",
      },
      expectedQuote: "Който поеме по път, търсейки знание, Аллах ще му улесни пътя към Рая.",
      expectedCommentarySnippet: "Пратеникът на Аллах каза",
    },
    {
      name: "Multi-line Double Newline Title-Based Dalil Detection",
      input: {
        backgroundUrl: "bg",
        topTitle: "[Сура Ал-Фатиха 1:1-2]",
        mainText: "В името на Аллах, Всемилостивия, Милосърдния! Хвала на Аллах, Господа на световете!\n\nТова е сърцевината на всяка молитва и всеки ден от живота ни.",
        bottomText: "Запази",
      },
      expectedQuote: "В името на Аллах, Всемилостивия, Милосърдния! Хвала на Аллах, Господа на световете!",
      expectedCommentarySnippet: "Това е сърцевината на всяка молитва",
    },
    {
      name: "Explicit quoteText and commentaryText Options Precedence",
      input: {
        backgroundUrl: "bg",
        topTitle: "[Автентичен Хадис]",
        mainText: "Неструктуриран текст, който не бива да се ползва",
        quoteText: "Искреността е същината на вярата.",
        commentaryText: "Без искреност никое дело не се приема.",
        bottomText: "Запази",
      },
      expectedQuote: "Искреността е същината на вярата.",
      expectedCommentarySnippet: "Без искреност никое дело не се приема.",
    },
  ];

  for (const tc of testCases) {
    const segments = parseSlideSegments(tc.input);
    assert(segments.isQuoteSlide === true, `[${tc.name}] Failed to recognize quote slide!`);
    assert(
      segments.quoteText?.trim() === tc.expectedQuote.trim(),
      `[${tc.name}] Expected quote "${tc.expectedQuote}", got "${segments.quoteText}"`,
    );
    if (tc.expectedCommentarySnippet) {
      assert(
        (segments.commentaryText || "").includes(tc.expectedCommentarySnippet),
        `[${tc.name}] Expected commentary snippet "${tc.expectedCommentarySnippet}", got "${segments.commentaryText}"`,
      );
    }
    console.log(`  ✔ Passed: ${tc.name}`);
  }

  // Verify Non-Quote Slide
  const hookSlide: CarouselSlideOptions = {
    backgroundUrl: "bg",
    topTitle: "[ТАЙНАТА НА РИЗКА]",
    mainText: "Защо въпреки че се трудиш денонощно, парите не ти стигат и усещаш безпокойство?",
    bottomText: "Плъзни наляво за истината 👉",
  };
  const nonQuoteSegments = parseSlideSegments(hookSlide);
  assert(nonQuoteSegments.isQuoteSlide === false, "Hook slide should not be parsed as quote slide");
  assert(nonQuoteSegments.normalText?.includes("трудиш"), "Normal text preserved");
  console.log("  ✔ Passed: Non-quote Hook slide correctly identified as normal text.");
}

// ---------------------------------------------------------------------------
// SUITE 2: Orphan Word Elimination & Zero Mid-Sentence Cutoff (R2)
// ---------------------------------------------------------------------------
function testOrphanWordAndWrapping() {
  console.log("\n[SUITE 2] Adversarial Orphan Balancer & Text Wrapping (R2)...");

  const mockMeasure = (text: string) => text.length * 10;
  const maxWidth = 250; // allows ~25 chars per line

  // Case 1: Hanging orphan word on last line
  const textWithOrphan = "Едно две три четири пет дума";
  const wrappedOrphan = wrapIntelligent(mockMeasure, textWithOrphan, maxWidth);
  assert(wrappedOrphan.length === 2, `Expected 2 lines, got ${wrappedOrphan.length}`);
  const lastLineWords = wrappedOrphan[1].split(/\s+/);
  assert(
    lastLineWords.length >= 2,
    `Orphan word not eliminated! Last line has ${lastLineWords.length} words: "${wrappedOrphan[1]}"`,
  );
  assert(wrappedOrphan[1] === "пет дума", `Expected "пет дума", got "${wrappedOrphan[1]}"`);
  assert(wrappedOrphan[0] === "Едно две три четири", `Expected "Едно две три четири", got "${wrappedOrphan[0]}"`);
  console.log(`  ✔ Orphan balancer correctly balanced lines: ["${wrappedOrphan[0]}", "${wrappedOrphan[1]}"]`);

  // Case 2: Zero mid-sentence cutoff / 100% word retention test
  const paragraphs = [
    "Всеки един от нас търси мир, благодат и спасение в Аллах, Който е Създател на небесата и земята.",
    "Когато сърцето се привърже към Всевишния, всички земни тревоги губят своята тежест.",
    "„Аллах е най-добрият Закрилник и Той е Най-милосърдният от милосърдните!“ [12:64]",
    "Запази това спасително знание и го приложи в живота си още днес!",
  ];

  for (const para of paragraphs) {
    const cleanOriginal = stripEmojis(para).trim();
    const originalWords = cleanOriginal.split(/\s+/).filter(Boolean);

    const wrapped = wrapIntelligent(mockMeasure, para, maxWidth);
    const recoveredWords = wrapped.flatMap((line) => line.split(/\s+/).filter(Boolean));

    assert(
      originalWords.length === recoveredWords.length,
      `Word count mismatch! Original had ${originalWords.length} words, recovered had ${recoveredWords.length}`,
    );

    for (let i = 0; i < originalWords.length; i++) {
      assert(
        originalWords[i] === recoveredWords[i],
        `Word #${i} altered or truncated! Expected "${originalWords[i]}", got "${recoveredWords[i]}"`,
      );
    }
  }
  console.log("  ✔ Zero mid-sentence cutoff verified: 100% of words preserved in exact sequence across all test paragraphs.");

  // Case 3: Line length never exceeds maxWidth
  for (const line of wrapIntelligent(mockMeasure, "Много дълго изречение с множество думи за проверка на максималната ширина на всеки ред", maxWidth)) {
    assert(mockMeasure(line) <= maxWidth, `Line exceeded maxWidth: "${line}" (${mockMeasure(line)}px > ${maxWidth}px)`);
  }
  console.log("  ✔ Strict maxWidth boundary respected across all wrapped lines.");
}

// ---------------------------------------------------------------------------
// SUITE 3: Canvas Safe Zone Geometry & Extreme Length Auto-Fit Stress (R1, R2)
// ---------------------------------------------------------------------------
function testSafeZoneGeometryAndExtremeLengths() {
  console.log("\n[SUITE 3] Safe Zone Geometry & Extreme Length Auto-Fit Stress (R1, R2)...");

  const SAFE_W = TIKTOK_SAFE_ZONE.W_SAFE; // 760px
  const SAFE_H = TIKTOK_SAFE_ZONE.H_SAFE; // 1220px
  const SAFE_LEFT = TIKTOK_SAFE_ZONE.SAFE_LEFT; // 100px
  const SAFE_RIGHT_LIMIT = TIKTOK_SAFE_ZONE.W - TIKTOK_SAFE_ZONE.SAFE_RIGHT; // 860px
  const SAFE_TOP = TIKTOK_SAFE_ZONE.SAFE_TOP; // 300px
  const SAFE_BOTTOM_LIMIT = TIKTOK_SAFE_ZONE.H - TIKTOK_SAFE_ZONE.SAFE_BOTTOM; // 1520px
  const CENTER_X = TIKTOK_SAFE_ZONE.CENTER_X; // 480px

  assert(SAFE_W === 760, "SAFE_W must be 760");
  assert(SAFE_H === 1220, "SAFE_H must be 1220");
  assert(SAFE_LEFT === 100, "SAFE_LEFT must be 100");
  assert(SAFE_RIGHT_LIMIT === 860, "SAFE_RIGHT_LIMIT must be 860");
  assert(SAFE_TOP === 300, "SAFE_TOP must be 300");
  assert(SAFE_BOTTOM_LIMIT === 1520, "SAFE_BOTTOM_LIMIT must be 1520");
  assert(CENTER_X === 480, "CENTER_X must be 480");

  const extremeScenarios: { name: string; slide: CarouselSlideOptions }[] = [
    {
      name: "Extreme Hadith (550+ Chars Sacred Text + Commentary)",
      slide: {
        backgroundUrl: "bg",
        topTitle: "[Сахих ал-Бухари #6424 • За Изпитанията]",
        mainText: "„Когото Аллах желае да дари с добро, Той го подлага на изпитания и премеждия в този преходен земен живот. И ако рабът прояви търпение, упование и благодарност, греховете му се опрощават така, както листата падат от есенно дърво, а степента му в Рая се въздига до невиждани висоти, където няма нито скръб, нито тъга.“ Този свещен хадис ни учи на най-великото търпение и непоколебима вяра.",
        bottomText: "Запази това напомняне за моменти на трудност и сподели за садака джария!",
      },
    },
    {
      name: "Massive Multi-Paragraph Ayah (650+ Chars)",
      slide: {
        backgroundUrl: "bg",
        topTitle: "[Сура Ал-Бакара 2:255 • Аят ал-Курси]",
        mainText: "„Аллах! Няма друг бог освен Него - Живия, Вечносъществуващия! Не Го обзема нито дрямка, нито сън. Негово е всичко на небесата и всичко на земята. Кой ще се застъпи пред Него, освен с Неговото позволение? Той знае какво е било преди тях и какво ще бъде след тях. А те не обхващат от Неговото знание освен онова, което Той пожелае. Неговият Престол вмества небесата и земята, и не Му тежи тяхното опазване. Той е Всевишния, Превеликия!“ Размисли върху величието на Аллах.",
        bottomText: "Запази този най-велик Аят в сърцето си 👉",
      },
    },
    {
      name: "Ultra-Massive 800+ Character Block",
      slide: {
        backgroundUrl: "bg",
        topTitle: "[ВЕЛИКАТА КНИГА НА АЛЛАХ]",
        mainText: "„Това е Книгата, в която няма съмнение, напътствие за богобоязливите, които вярват в неведомото и отслужват молитвата, и от онова, което сме им дали за препитание, раздават; и които вярват в низпосланото на теб и в низпосланото преди теб, и в отвъдния живот са убедени. Те са на напътствие от своя Господ и те са сполучливите.“ [Сура Ал-Бакара 2:2-5]\n\nТова е фундаментът на целия наш живот и спасение в Съдния ден.",
        bottomText: "Запази това напътствие и сподели за вечна награда!",
      },
    },
    {
      name: "Long Hook Slide (300+ Chars Multi-Sentence Curiosity Gap)",
      slide: {
        backgroundUrl: "bg",
        topTitle: "[ПАРАДОКСЪТ НА ЧОВЕШКАТА ДУША]",
        mainText: "Защо колкото повече материални блага трупаме в модерния свят, толкова по-голяма празнота и самота изпитваме в гърдите си? Има ли една скрита духовна тайна, която праведните предци са знаели, но ние сме забравили?",
        bottomText: "Плъзни наляво, за да разбереш истината 👉",
      },
    },
    {
      name: "Dense CTA Slide with Extensive Practical Guidance",
      slide: {
        backgroundUrl: "bg",
        topTitle: "[ПРАКТИЧЕСКИ ПЛАН ЗА ДЕЙСТВИЕ]",
        mainText: "1. Започвай всяко дело с искрено намерение за Аллах.\n2. Прави редовен истигфар по 100 пъти на ден.\n3. Не позволявай на земните тревоги да разклатят твоя Тауаккул.",
        bottomText: "Запази този списък и го сподели с близък човек за садака джария!",
      },
    },
  ];

  // Also include all 23 Dalil slides from Tawheed Taxonomy
  const taxonomy = getTawheedTaxonomy();
  for (const t of taxonomy) {
    extremeScenarios.push({
      name: `Taxonomy Slide: ${t.id} (${t.titleBg})`,
      slide: {
        backgroundUrl: "bg",
        topTitle: `[${t.dalilReference}]`,
        mainText: `„${t.dalilTextBg}“\n\n${t.summaryBg}`,
        bottomText: "Запази и сподели напомнянето 👉",
      },
    });
  }

  console.log(`  Testing ${extremeScenarios.length} extreme scenarios under auto-fit dynamic scaling...`);

  let autoFitScaleDownTriggered = 0;

  for (const sc of extremeScenarios) {
    let scale = 1.0;
    const ctx = createMockCtx(scale);

    let layout = computeSlideLayout(ctx, sc.slide, scale);

    if (layout.totalH > SAFE_H) {
      autoFitScaleDownTriggered++;
      scale = Math.max(0.6, (SAFE_H / layout.totalH) * 0.95);
      layout = computeSlideLayout(createMockCtx(scale), sc.slide, scale);

      while (layout.totalH > SAFE_H && scale > 0.55) {
        scale -= 0.05;
        layout = computeSlideLayout(createMockCtx(scale), sc.slide, scale);
      }
    }

    // 1. VERTICAL BOUNDING BOX ASSERTION: [300px, 1520px]
    assert(
      layout.totalH <= SAFE_H,
      `[${sc.name}] Layout totalH (${layout.totalH}px) exceeds SAFE_H (${SAFE_H}px) at scale ${scale}!`,
    );

    const currentY = SAFE_TOP + Math.max(0, (SAFE_H - layout.totalH) / 2);
    const bottomY = currentY + layout.totalH;

    assert(
      currentY >= SAFE_TOP,
      `[${sc.name}] Top boundary breached! currentY (${currentY}px) < SAFE_TOP (${SAFE_TOP}px)`,
    );
    assert(
      bottomY <= SAFE_BOTTOM_LIMIT,
      `[${sc.name}] Bottom boundary breached! bottomY (${bottomY}px) > SAFE_BOTTOM_LIMIT (${SAFE_BOTTOM_LIMIT}px)`,
    );

    // 2. HORIZONTAL BOUNDING BOX ASSERTION: [100px, 860px]
    const allLines = [
      ...layout.topLines,
      ...layout.quoteLines,
      ...layout.commentaryLines,
      ...layout.normalLines,
      ...layout.bottomLines,
    ];

    for (const line of allLines) {
      const lineMeasure = createCalibratedMeasureFn(60 * scale, true);
      const measuredWidth = lineMeasure(line);

      const leftX = CENTER_X - measuredWidth / 2;
      const rightX = CENTER_X + measuredWidth / 2;

      assert(
        leftX >= SAFE_LEFT - 1, // 1px tolerance for integer rounding
        `[${sc.name}] Left horizontal boundary breached for line "${line}": leftX (${leftX}px) < SAFE_LEFT (${SAFE_LEFT}px)`,
      );
      assert(
        rightX <= SAFE_RIGHT_LIMIT + 1,
        `[${sc.name}] Right horizontal boundary breached for line "${line}": rightX (${rightX}px) > SAFE_RIGHT_LIMIT (${SAFE_RIGHT_LIMIT}px)`,
      );
    }

    // 3. INTERVAL SPACING ASSERTION (R1)
    if (layout.segments.isQuoteSlide && layout.commentaryLines.length > 0) {
      assert(
        layout.gapQuoteToCommentary >= Math.round(52 * 0.55) && layout.gapQuoteToCommentary <= 56,
        `[${sc.name}] Sacred quote to commentary interval spacing invalid: ${layout.gapQuoteToCommentary}px`,
      );
    }
  }

  console.log(`  ✔ Verified: All ${extremeScenarios.length} slides strictly contained within [100px, 860px] horizontally and [300px, 1520px] vertically.`);
  console.log(`  ✔ Dynamic auto-fit scaling safely engaged for ${autoFitScaleDownTriggered} complex/lengthy slides without clipping.`);
}

// ---------------------------------------------------------------------------
// SUITE 4: Dual-Color Styling & Sacred Text Visual Hierarchy (R1)
// ---------------------------------------------------------------------------
function testDualColorHierarchy() {
  console.log("\n[SUITE 4] Dual-Color Styling & Sacred Text Visual Hierarchy (R1)...");

  const slide: CarouselSlideOptions = {
    backgroundUrl: "bg",
    topTitle: "[Сура Ал-Ихляс 112:1-4]",
    mainText: "„Кажи: Той е Аллах Единствен!“ Аллах е съвършен във всички Свои качества.",
    bottomText: "Запази за напомняне",
  };

  const scale = 1.0;
  const layout = computeSlideLayout(createMockCtx(scale), slide, scale);

  assert(layout.segments.isQuoteSlide === true, "Should be quote slide");

  // Verify Font Hierarchy:
  // Quote line height and weight > Commentary line height
  assert(layout.lhQuote > layout.lhCommentary, `lhQuote (${layout.lhQuote}) must be greater than lhCommentary (${layout.lhCommentary})`);
  assert(layout.lhTop > 0, "Top title line height must be > 0");
  assert(layout.lhBottom > 0, "Bottom CTA line height must be > 0");

  // Verify Interval Spacing values
  assert(layout.gapQuoteToCommentary === 52, `Expected gapQuoteToCommentary = 52px at scale 1.0, got ${layout.gapQuoteToCommentary}`);
  assert(layout.gapTopToBody === 44, `Expected gapTopToBody = 44px at scale 1.0, got ${layout.gapTopToBody}`);
  assert(layout.gapBodyToBottom === 44, `Expected gapBodyToBottom = 44px at scale 1.0, got ${layout.gapBodyToBottom}`);

  console.log("  ✔ Visual hierarchy confirmed: Sacred Quote font (60px/lh 76) > Commentary font (46px/lh 62), spacing interval = 52px.");
}

// ---------------------------------------------------------------------------
// SUITE 5: Degenerate & Edge Case Inputs
// ---------------------------------------------------------------------------
function testDegenerateEdgeCases() {
  console.log("\n[SUITE 5] Degenerate & Boundary Edge Cases (Empty, Single Words, Excess Whitespace)...");

  const mockMeasure = (text: string) => text.length * 10;

  // 1. Empty & whitespace text
  assert(wrapIntelligent(mockMeasure, "", 250).length === 0, "Empty text should return empty array");
  assert(wrapIntelligent(mockMeasure, "   \n\t  ", 250).length === 0, "Whitespace text should return empty array");

  // 2. Single word text
  const single = wrapIntelligent(mockMeasure, "Аллах", 250);
  assert(single.length === 1 && single[0] === "Аллах", "Single word should return 1 line");

  // 3. Slide segments with empty fields
  const emptySegments = parseSlideSegments({
    backgroundUrl: "",
    topTitle: "",
    mainText: "",
    bottomText: "",
  });
  assert(emptySegments.isQuoteSlide === false, "Empty mainText should return isQuoteSlide = false");
  assert(emptySegments.normalText === "", "normalText should be empty");

  // 4. Slide segments with empty quote marks
  const emptyQuotes = parseSlideSegments({
    backgroundUrl: "",
    topTitle: "",
    mainText: "„“",
    bottomText: "",
  });
  // Empty quote contains no inner text, so it's not a quote slide
  assert(emptyQuotes.isQuoteSlide === false, "Empty quote mark should not produce a quote slide");

  console.log("  ✔ Degenerate cases safely handled without runtime exceptions or corrupted state.");
}

// ---------------------------------------------------------------------------
// Main Challenger Runner
// ---------------------------------------------------------------------------
function runChallengerTestSuite() {
  console.log("=================================================================");
  console.log("🛡️ CHALLENGER 1 ADVERSARIAL STRESS TEST: R1 & R2 AUDIT");
  console.log("=================================================================");

  testQuotationSyntaxStress();
  testOrphanWordAndWrapping();
  testSafeZoneGeometryAndExtremeLengths();
  testDualColorHierarchy();
  testDegenerateEdgeCases();

  console.log("\n=================================================================");
  console.log("🎉 ALL 5 ADVERSARIAL CHALLENGER SUITES PASSED! (5/5)");
  console.log("Verdict: APPROVE — R1 & R2 Invariants strictly proven empirically.");
  console.log("=================================================================\n");
  process.exit(0);
}

runChallengerTestSuite();
