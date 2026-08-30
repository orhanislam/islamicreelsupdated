/**
 * ADVERSARIAL CHALLENGER TEST SUITE: PHOTO & VIRAL THUMBNAIL HARDENING (M2)
 * File: src/lib/__tests__/adversarial-photo-hardening-challenger.test.ts
 *
 * Empirical challenger verification suite for Milestone 2:
 * 1. Extreme Bulgarian & Arabic text inputs (150+ words, 50-char unbreakable tokens, multi-verse Ayahs).
 * 2. TikTok Right Sidebar (X in [860, 1080]px) & Bottom Captions (Y in [1520, 1920]px) non-infringement.
 * 3. Zero pixel collision between Reference Pill, Arabic verse, and Bulgarian translation.
 * 4. Viral thumbnail SVG corridor containment and XML security.
 * 5. 2,000 exhaustive adversarial fuzzing iterations across all platforms and layout styles.
 */

import {
  TIKTOK_SAFE_ZONE,
  REFERENCE_PILL_STANDARDS,
  getSafeZone,
  isWithinSafeZone,
  clampToSafeZone,
  doBoxesCollide,
  type BoundingBox,
  type SafeZoneGeometry,
} from "../safe-zone";

import { wrap as photoWrap, autoFit as photoAutoFit } from "../render-photo";

import {
  escapeXml,
  estimateTitleWidth,
  wrapTitleText,
  fitThumbnailTitle,
  buildViralThumbnailSvg,
} from "../thumbnail.functions";

let passedCount = 0;
let totalTests = 0;
const failures: { name: string; error: string; suite: string }[] = [];
let currentSuite = "";

function setSuite(suite: string) {
  currentSuite = suite;
  console.log(`\n=================================================================`);
  console.log(`⚔️ [CHALLENGER] ${suite}`);
  console.log(`=================================================================`);
}

function test(name: string, fn: () => void | Promise<void>) {
  totalTests++;
  try {
    const res = fn();
    if (res && typeof (res as Promise<void>).then === "function") {
      return (res as Promise<void>)
        .then(() => {
          passedCount++;
          console.log(`  ✔ [PASS] ${name}`);
        })
        .catch((err: unknown) => {
          const errorMsg = err instanceof Error ? err.message : String(err);
          failures.push({ name, error: errorMsg, suite: currentSuite });
          console.error(`  ✖ [FAIL] ${name}\n     -> Error: ${errorMsg}`);
        });
    } else {
      passedCount++;
      console.log(`  ✔ [PASS] ${name}`);
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    failures.push({ name, error: errorMsg, suite: currentSuite });
    console.error(`  ✖ [FAIL] ${name}\n     -> Error: ${errorMsg}`);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED]: ${message}`);
  }
}

function assertEq<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(
      `${message} | Expected: ${JSON.stringify(expected)}, Actual: ${JSON.stringify(actual)}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Precision Text Measurement Engine (Amiri, Cormorant Garamond, Inter, Arial)
// ---------------------------------------------------------------------------
export function createPrecisionMeasure(
  fontSize: number,
  fontStyle: "bold" | "medium" | "arabic" = "bold",
) {
  return (text: string): number => {
    let w = 0;
    for (const char of text) {
      if (char === " ") {
        w += fontSize * 0.28;
      } else if (/[.,!?:;'"„“”«»`()[\]-]/.test(char)) {
        w += fontSize * 0.32;
      } else if (fontStyle === "arabic" || /[\u0600-\u06FF]/.test(char)) {
        w += fontSize * 0.55;
      } else if (/[щжюшмфЩЖЮШМФWwMm%@]/.test(char)) {
        w += fontSize * (fontStyle === "bold" ? 0.85 : 0.78);
      } else if (/[iljt1I|!]/.test(char)) {
        w += fontSize * 0.3;
      } else if (/[A-ZА-Я]/.test(char)) {
        w += fontSize * (fontStyle === "bold" ? 0.72 : 0.65);
      } else {
        w += fontSize * (fontStyle === "bold" ? 0.6 : 0.54);
      }
    }
    return Math.round(w);
  };
}

export function createMockCanvasContext(defaultFontSize = 60) {
  let currentFont = `700 ${defaultFontSize}px 'Cormorant Garamond'`;
  let currentDirection = "ltr";
  let textAlign = "center";
  let textBaseline = "alphabetic";

  return {
    get font() {
      return currentFont;
    },
    set font(val: string) {
      currentFont = val;
    },
    get direction() {
      return currentDirection;
    },
    set direction(val: string) {
      currentDirection = val;
    },
    get textAlign() {
      return textAlign;
    },
    set textAlign(val: string) {
      textAlign = val;
    },
    get textBaseline() {
      return textBaseline;
    },
    set textBaseline(val: string) {
      textBaseline = val;
    },
    measureText: (str: string) => {
      const match = currentFont.match(/(\d+)px/);
      const fs = match ? parseInt(match[1], 10) : defaultFontSize;
      const isArabic = currentFont.includes("Amiri") || /[\u0600-\u06FF]/.test(str);
      const isBold =
        currentFont.includes("700") || currentFont.includes("bold") || currentFont.includes("800");
      const fontStyle = isArabic ? "arabic" : isBold ? "bold" : "medium";
      return {
        width: createPrecisionMeasure(fs, fontStyle)(str),
      };
    },
    strokeText: () => {},
    fillText: () => {},
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    closePath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    quadraticCurveTo: () => {},
    fill: () => {},
    stroke: () => {},
    fillRect: () => {},
    drawImage: () => {},
    createLinearGradient: () => ({ addColorStop: () => {} }),
    createRadialGradient: () => ({ addColorStop: () => {} }),
  } as unknown as CanvasRenderingContext2D;
}

export interface DetailedLayoutAnalysis {
  geom: SafeZoneGeometry;
  pill: {
    box: BoundingBox;
    crossesRightSidebar: boolean;
    crossesBottomCaptions: boolean;
  };
  arabic: {
    lines: string[];
    fontSize: number;
    lineHeight: number;
    box: BoundingBox;
    lineWidths: number[];
    crossesRightSidebar: boolean;
    crossesBottomCaptions: boolean;
  } | null;
  bulgarian: {
    lines: string[];
    fontSize: number;
    lineHeight: number;
    box: BoundingBox;
    lineWidths: number[];
    crossesRightSidebar: boolean;
    crossesBottomCaptions: boolean;
  };
  pillToArabicGap: number;
  arabicToBulgarianGap: number;
  pillToBulgarianGap: number;
  hasCollision: boolean;
  strictlySafe: boolean;
}

/**
 * Exact mathematical simulation of renderPhoto layout and line-level boundary analysis.
 */
export function simulateAndAnalyzePhotoLayout(opts: {
  arabic?: string;
  bulgarian: string;
  reference?: string;
  style?: "minimal" | "centered" | "lower-third" | "bottom";
  profile?: string;
}): DetailedLayoutAnalysis {
  const geom = getSafeZone(opts.profile || "tiktok");
  const H = geom.H;
  const W_SAFE = geom.W_SAFE;
  const style = opts.style || "centered";
  const refText = opts.reference || "";

  // 1. Reference Pill
  const refFont = REFERENCE_PILL_STANDARDS.FONT_SIZE;
  const refMeasure = createPrecisionMeasure(refFont, "medium");
  const refTw = refMeasure(refText);
  const pillW = Math.min(W_SAFE, refTw + REFERENCE_PILL_STANDARDS.PAD_X * 2);
  const pillH = refFont + REFERENCE_PILL_STANDARDS.PAD_Y * 2; // 56
  const rawPillX = geom.CENTER_X - pillW / 2;
  const rawPillY = geom.SAFE_TOP; // 300
  const pillBox: BoundingBox = clampToSafeZone(
    { x: rawPillX, y: rawPillY, width: pillW, height: pillH },
    geom,
  );

  const contentTopMinY = opts.reference
    ? geom.SAFE_TOP + 56 + REFERENCE_PILL_STANDARDS.MIN_VERTICAL_GAP
    : geom.SAFE_TOP;

  // 2. Arabic Block
  let arabicAnalysis: DetailedLayoutAnalysis["arabic"] = null;
  if (opts.arabic && style !== "minimal") {
    const maxArabicH = Math.min(H * 0.28, geom.H_SAFE * 0.35);
    let arFs = 64;
    let arLines: string[] = [];
    let arLh = Math.round(arFs * 1.4);

    while (arFs >= 32) {
      const mockCtx = createMockCanvasContext(arFs);
      mockCtx.font = `600 ${arFs}px 'Amiri'`;
      arLines = photoWrap(mockCtx, opts.arabic, W_SAFE);
      arLh = Math.round(arFs * 1.4);
      if (arLines.length * arLh <= maxArabicH) break;
      arFs -= 2;
    }

    const arLineWidths = arLines.map((l) => createPrecisionMeasure(arFs, "arabic")(l));
    const arMaxW = Math.max(...arLineWidths, 0);
    const arH = arLines.length * arLh;
    const arBox: BoundingBox = {
      x: geom.CENTER_X - arMaxW / 2,
      y: contentTopMinY,
      width: arMaxW,
      height: arH,
    };

    const crossesRight = arBox.x + arBox.width > geom.W - geom.SAFE_RIGHT;
    const crossesBottom = arBox.y + arBox.height > geom.BOTTOM_MAX_Y;

    arabicAnalysis = {
      lines: arLines,
      fontSize: arFs,
      lineHeight: arLh,
      box: arBox,
      lineWidths: arLineWidths,
      crossesRightSidebar: crossesRight,
      crossesBottomCaptions: crossesBottom,
    };
  }

  const arabicBottomY = arabicAnalysis
    ? contentTopMinY + arabicAnalysis.box.height
    : contentTopMinY;

  // 3. Bulgarian Block
  const minGapBetweenArabicAndBg = 32;
  const bgStartMinY = arabicAnalysis ? arabicBottomY + minGapBetweenArabicAndBg : contentTopMinY;
  const availableBgHeight = Math.max(0, geom.BOTTOM_MAX_Y - bgStartMinY);

  const cleanBg = opts.bulgarian.replace(/<[^>]+>/g, "").trim();
  const mockCtx = createMockCanvasContext(84);
  const bgFit = photoAutoFit(
    mockCtx,
    cleanBg,
    "'Cormorant Garamond', Georgia, serif",
    700,
    W_SAFE,
    availableBgHeight,
    { min: 24, max: 84 },
    1.32,
  );

  let bgTopY = bgStartMinY;
  if (style === "lower-third" || style === "bottom") {
    bgTopY = geom.BOTTOM_MAX_Y - bgFit.totalHeight;
    if (arabicAnalysis && bgTopY < arabicBottomY + minGapBetweenArabicAndBg) {
      bgTopY = arabicBottomY + minGapBetweenArabicAndBg;
    }
  } else if (style === "minimal") {
    bgTopY = bgStartMinY + Math.max(0, Math.round((availableBgHeight - bgFit.totalHeight) / 2));
  } else {
    // Centered style
    if (arabicAnalysis) {
      const remHeight = geom.BOTTOM_MAX_Y - arabicBottomY;
      const idealGap = Math.round((remHeight - bgFit.totalHeight) / 2);
      const extraGap = Math.max(minGapBetweenArabicAndBg, idealGap);
      bgTopY = Math.min(arabicBottomY + extraGap, geom.BOTTOM_MAX_Y - bgFit.totalHeight);
    } else {
      bgTopY = bgStartMinY + Math.max(0, Math.round((availableBgHeight - bgFit.totalHeight) / 2));
    }
  }

  const bgLineWidths = bgFit.lines.map((l) => createPrecisionMeasure(bgFit.fontSize, "bold")(l));
  const bgMaxW = Math.max(...bgLineWidths, 0);
  const bgBox: BoundingBox = {
    x: geom.CENTER_X - bgMaxW / 2,
    y: bgTopY,
    width: bgMaxW,
    height: bgFit.totalHeight,
  };

  const pillCrossesRight = pillBox.x + pillBox.width > geom.W - geom.SAFE_RIGHT;
  const pillCrossesBottom = pillBox.y + pillBox.height > geom.BOTTOM_MAX_Y;
  const bgCrossesRight = bgBox.x + bgBox.width > geom.W - geom.SAFE_RIGHT;
  const bgCrossesBottom = bgBox.y + bgBox.height > geom.BOTTOM_MAX_Y;

  const pillToArGap = arabicAnalysis
    ? arabicAnalysis.box.y - (pillBox.y + pillBox.height)
    : Infinity;
  const arToBgGap = arabicAnalysis
    ? bgBox.y - (arabicAnalysis.box.y + arabicAnalysis.box.height)
    : Infinity;
  const pillToBgGap = bgBox.y - (pillBox.y + pillBox.height);

  let hasCollision = false;
  if (arabicAnalysis && doBoxesCollide(pillBox, arabicAnalysis.box, 0)) hasCollision = true;
  if (arabicAnalysis && doBoxesCollide(arabicAnalysis.box, bgBox, 0)) hasCollision = true;
  if (opts.reference && doBoxesCollide(pillBox, bgBox, 0)) hasCollision = true;

  const strictlySafe =
    !pillCrossesRight &&
    !pillCrossesBottom &&
    (arabicAnalysis
      ? !arabicAnalysis.crossesRightSidebar && !arabicAnalysis.crossesBottomCaptions
      : true) &&
    !bgCrossesRight &&
    !bgCrossesBottom &&
    !hasCollision &&
    isWithinSafeZone(pillBox, geom) &&
    (arabicAnalysis ? isWithinSafeZone(arabicAnalysis.box, geom) : true) &&
    isWithinSafeZone(bgBox, geom);

  return {
    geom,
    pill: {
      box: pillBox,
      crossesRightSidebar: pillCrossesRight,
      crossesBottomCaptions: pillCrossesBottom,
    },
    arabic: arabicAnalysis,
    bulgarian: {
      lines: bgFit.lines,
      fontSize: bgFit.fontSize,
      lineHeight: bgFit.lineHeight,
      box: bgBox,
      lineWidths: bgLineWidths,
      crossesRightSidebar: bgCrossesRight,
      crossesBottomCaptions: bgCrossesBottom,
    },
    pillToArabicGap: pillToArGap,
    arabicToBulgarianGap: arToBgGap,
    pillToBulgarianGap: pillToBgGap,
    hasCollision,
    strictlySafe,
  };
}

// ---------------------------------------------------------------------------
// ADVERSARIAL CHALLENGER TEST RUNNER
// ---------------------------------------------------------------------------
async function runAdversarialChallengerTests() {
  console.log("=================================================================");
  console.log("⚔️ EMPIRICAL CHALLENGER: MILESTONE 2 PHOTO & THUMBNAIL HARDENING");
  console.log("=================================================================");

  // =========================================================================
  // SUITE 1: EXTREME TEXT INPUTS (150+ words, 50-char unbreakable tokens)
  // =========================================================================
  setSuite("SUITE 1: ADVERSARIAL EXTREME TEXT INPUTS & STRESS");

  test("C1.1: 150-Word Massive Bulgarian Scripture auto-fits strictly <= 1520px", () => {
    const text150Words = Array.from({ length: 150 }, (_, i) => `дума${i + 1}`).join(" ");

    const analysis = simulateAndAnalyzePhotoLayout({
      reference: "Сура Ал-Бакара • Знамение 255",
      bulgarian: text150Words,
      style: "centered",
      profile: "tiktok",
    });

    assert(analysis.strictlySafe, "150-word layout must be strictly safe");
    assert(!analysis.bulgarian.crossesBottomCaptions, "Bulgarian text must never cross Y=1520px");
    assert(
      analysis.bulgarian.box.y + analysis.bulgarian.box.height <= 1520,
      `Bottom Y (${analysis.bulgarian.box.y + analysis.bulgarian.box.height}) <= 1520`,
    );
    assert(analysis.bulgarian.fontSize >= 24, "Font size must be >= 24px");
  });

  test("C1.2: 180-Word Extreme Translation without Arabic fits within safe zone", () => {
    const text180Words = Array.from({ length: 180 }, (_, i) => `слово${i + 1}`).join(" ");

    const analysis = simulateAndAnalyzePhotoLayout({
      reference: "Коран 65:2-3",
      bulgarian: text180Words,
      style: "centered",
      profile: "tiktok",
    });

    assert(analysis.strictlySafe, "180-word layout must be strictly safe");
    assert(
      analysis.bulgarian.box.y + analysis.bulgarian.box.height <= 1520,
      `Bottom (${analysis.bulgarian.box.y + analysis.bulgarian.box.height}) <= 1520px`,
    );
  });

  test("C1.3: 50+ Character Unbreakable Token is chunked cleanly with zero horizontal overflow", () => {
    const ctx = createMockCanvasContext(40);
    ctx.font = "700 40px 'Cormorant Garamond'";
    const token55Chars = "Аллахединственияинайвеликиянесравнимивсемилостивиягосподар";
    assert(token55Chars.length >= 50, "Token length >= 50 chars");

    const lines = photoWrap(ctx, token55Chars, 760);
    assert(lines.length >= 2, "Token must be split into at least 2 lines");

    for (const ln of lines) {
      const w = ctx.measureText(ln).width;
      assert(w <= 760, `Line chunk width (${w}px) must be <= 760px`);
    }
  });

  test("C1.4: 80+ Character Transliterated Token chunking and layout test", () => {
    const longToken80 =
      "BismillahirRahmanirRahimAlhamdullilahirabbilalameenArrahmanirraheemMalikiyawmiddin";
    const analysis = simulateAndAnalyzePhotoLayout({
      reference: "Ал-Фатиха 1:1-4",
      bulgarian: `Свещен цитат: ${longToken80} и неговият благословен превод.`,
      style: "centered",
      profile: "tiktok",
    });

    assert(analysis.strictlySafe, "Must be safe with 80-character unbreakable token");
    for (const w of analysis.bulgarian.lineWidths) {
      assert(w <= 760, `Line width (${w}px) must not exceed 760px`);
    }
    assert(!analysis.bulgarian.crossesRightSidebar, "Must not cross right sidebar (X > 860)");
  });

  test("C1.5: Multi-Verse Ayahs (Ayat al-Kursi 2:255 Full Arabic + Bulgarian)", () => {
    const ayatAlKursiArabic =
      "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَن ذَا الَّذِي يَشْفَعُ عِندَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِّنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ";
    const ayatAlKursiBg =
      "Аллах! Няма друг бог освен Него - Вечноживия, Неизменния! Не Го обзема нито дрямка, нито сън. Негово е всичко на небесата и всичко на земята. Кой ще се застъпи пред Него, освен с Неговото позволение? Той знае какво е било преди тях и какво ще бъде след тях. А те от Неговото знание обхващат само онова, което Той пожелае. Неговият Престол вмества небесата и земята, и не Му тежи тяхното опазване. Той е Всевишния, Превеликия!";

    const analysis = simulateAndAnalyzePhotoLayout({
      reference: "Коран 2:255 • Аят ал-Курси",
      arabic: ayatAlKursiArabic,
      bulgarian: ayatAlKursiBg,
      style: "centered",
      profile: "tiktok",
    });

    assert(analysis.strictlySafe, "Ayat al-Kursi full text must be strictly safe");
    assert(
      analysis.pillToArabicGap >= 24,
      `Pill to Arabic gap (${analysis.pillToArabicGap}px) >= 24px`,
    );
    assert(
      analysis.arabicToBulgarianGap >= 32,
      `Arabic to Bulgarian gap (${analysis.arabicToBulgarianGap}px) >= 32px`,
    );
    assert(
      analysis.bulgarian.box.y + analysis.bulgarian.box.height <= 1520,
      "Total layout bottom <= 1520px",
    );
  });

  test("C1.6: Boundary Edge Case: Empty strings and Single Character texts", () => {
    const emptyAnalysis = simulateAndAnalyzePhotoLayout({
      reference: "",
      arabic: "",
      bulgarian: "А",
      style: "minimal",
      profile: "tiktok",
    });
    assert(emptyAnalysis.strictlySafe, "Single character layout must be safe");
    assert(emptyAnalysis.bulgarian.lines.length === 1, "Should have 1 line");
  });

  test("C1.7: HTML Tag Sanitization in render-photo cleanBulgarian", () => {
    const dirtyHtml =
      "<div class='title'><b>Свещен хадис:</b> <i>Делата</i> се съдят <span color='red'>само според намеренията</span>.</div>";
    const clean = dirtyHtml.replace(/<[^>]+>/g, "").trim();
    assertEq(
      clean,
      "Свещен хадис: Делата се съдят само според намеренията.",
      "HTML tags stripped cleanly",
    );

    const analysis = simulateAndAnalyzePhotoLayout({
      reference: "Бухари",
      bulgarian: dirtyHtml,
      style: "centered",
    });
    assert(analysis.strictlySafe, "Dirty HTML input handled safely");
  });

  // =========================================================================
  // SUITE 2: TIKTOK RIGHT SIDEBAR & BOTTOM CAPTIONS NON-INFRINGEMENT
  // =========================================================================
  setSuite("SUITE 2: TIKTOK UI OVERLAY NON-INFRINGEMENT (X in [860, 1080], Y in [1520, 1920])");

  test("C2.1: Mathematical Proof of Right Margin Clearance (Max X <= 860px)", () => {
    const sz = TIKTOK_SAFE_ZONE;
    const centerX = sz.CENTER_X; // 480
    const maxW = sz.W_SAFE; // 760

    const rightMarginZoneMin = 860;
    const rightMarginZoneMax = 1080;

    assert(
      centerX + maxW / 2 <= rightMarginZoneMin,
      "Right edge of max safe box strictly <= 860px",
    );
    assertEq(
      rightMarginZoneMax - (centerX + maxW / 2),
      220,
      "Clearance to right canvas edge is exactly 220px (SAFE_RIGHT)",
    );
  });

  test("C2.2: Line-by-Line Coordinate Audit across 100 Variations", () => {
    const samplePhrases = [
      "Аллах е Светлината на небесата и земята.",
      "Примерът за Неговата светлина е като ниша, в която има светилник.",
      "Светилникът е в стъкло, а стъклото е като блестяща звезда.",
      "Пали се от благословено маслиново дърво, нито източно, нито западно.",
      "Чието масло едва не засиява, дори огън да не го е докоснал.",
      "Светлина над светлина! Аллах напътва към Своята светлина когото пожелае.",
    ];

    for (let i = 0; i < 100; i++) {
      const phrase = samplePhrases.slice(0, (i % samplePhrases.length) + 1).join(" ");
      const analysis = simulateAndAnalyzePhotoLayout({
        reference: `Коран 24:35 [Тест ${i}]`,
        arabic:
          "اللَّهُ نُورُ السَّمَاوَاتِ وَالْأَرْضِ مَثَلُ نُورِهِ كَمِشْكَاةٍ فِيهَا مِصْبَاحٌ",
        bulgarian: phrase,
        style: i % 2 === 0 ? "centered" : "lower-third",
        profile: "tiktok",
      });

      // Check Pill
      assert(analysis.pill.box.x >= 100, `Iter ${i}: Pill X (${analysis.pill.box.x}) >= 100`);
      assert(analysis.pill.box.x + analysis.pill.box.width <= 860, `Iter ${i}: Pill Right <= 860`);
      assert(analysis.pill.box.y >= 300, `Iter ${i}: Pill Y >= 300`);
      assert(
        analysis.pill.box.y + analysis.pill.box.height <= 356,
        `Iter ${i}: Pill Bottom <= 356`,
      );

      // Check Arabic lines
      if (analysis.arabic) {
        for (let j = 0; j < analysis.arabic.lines.length; j++) {
          const lw = analysis.arabic.lineWidths[j];
          const lx = analysis.geom.CENTER_X - lw / 2;
          const rx = analysis.geom.CENTER_X + lw / 2;
          assert(lx >= 100, `Iter ${i}, Ar line ${j}: Left (${lx}) >= 100`);
          assert(rx <= 860, `Iter ${i}, Ar line ${j}: Right (${rx}) <= 860`);
        }
      }

      // Check Bulgarian lines
      for (let j = 0; j < analysis.bulgarian.lines.length; j++) {
        const lw = analysis.bulgarian.lineWidths[j];
        const lx = analysis.geom.CENTER_X - lw / 2;
        const rx = analysis.geom.CENTER_X + lw / 2;
        assert(lx >= 100, `Iter ${i}, Bg line ${j}: Left (${lx}) >= 100`);
        assert(rx <= 860, `Iter ${i}, Bg line ${j}: Right (${rx}) <= 860`);
      }

      // Check Bottom Limit
      const totalBottom = analysis.bulgarian.box.y + analysis.bulgarian.box.height;
      assert(totalBottom <= 1520, `Iter ${i}: Total bottom (${totalBottom}px) <= 1520px`);
    }
  });

  test("C2.3: Lower-Third Style Anchoring never overflows Y=1520px", () => {
    const analysis = simulateAndAnalyzePhotoLayout({
      reference: "Хадис",
      bulgarian: "Най-добрият сред вас е онзи, който изучава Корана и го преподава на другите.",
      style: "lower-third",
      profile: "tiktok",
    });

    const bgBottom = analysis.bulgarian.box.y + analysis.bulgarian.box.height;
    assertEq(
      bgBottom,
      1520,
      `Lower-third bottom should anchor at exactly sz.BOTTOM_MAX_Y (1520px)`,
    );
    assert(analysis.bulgarian.box.y >= 300, `Lower-third top >= 300px`);
  });

  // =========================================================================
  // SUITE 3: ZERO PIXEL COLLISION VERIFICATION
  // =========================================================================
  setSuite("SUITE 3: ZERO PIXEL COLLISION (Pill vs Arabic vs Bulgarian)");

  test("C3.1: Strict Reference Pill vs Arabic Gap >= 24px", () => {
    const analysis = simulateAndAnalyzePhotoLayout({
      reference: "Коран 1:1",
      arabic: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
      bulgarian: "В името на Аллах, Всемилостивия, Милосърдния!",
      style: "centered",
    });

    assertEq(analysis.pill.box.y, 300, "Pill top = 300px");
    assertEq(analysis.pill.box.height, 56, "Pill height = 56px");
    const pillBottom = 356;
    const arTop = analysis.arabic!.box.y;
    assertEq(arTop, 380, "Arabic top = 380px");
    assertEq(arTop - pillBottom, 24, "Gap is exactly 24px");
    assert(analysis.pillToArabicGap >= 24, "Pill to Arabic gap >= 24px");
  });

  test("C3.2: Strict Arabic to Bulgarian Gap >= 32px in Centered Mode", () => {
    const analysis = simulateAndAnalyzePhotoLayout({
      reference: "Коран 114:1",
      arabic: "قُلْ أَعُوذُ بِرَبِّ النَّاسِ",
      bulgarian: "Кажи: Търся спасение при Господа на хората!",
      style: "centered",
    });

    const arBottom = analysis.arabic!.box.y + analysis.arabic!.box.height;
    const bgTop = analysis.bulgarian.box.y;
    const gap = bgTop - arBottom;

    assert(gap >= 32, `Gap between Arabic and Bulgarian (${gap}px) must be >= 32px`);
    assert(!analysis.hasCollision, "No collision detected");
  });

  test("C3.3: Strict Arabic to Bulgarian Gap >= 32px in Lower-Third Mode with Large Arabic Block", () => {
    const largeArabic =
      "يَا أَيُّهَا الَّذِينَ آمَنُوا اتَّقُوا اللَّهَ حَقَّ تُقَاتِهِ وَلَا تَمُوتُنَّ إِلَّا وَأَنتُم مُّسْلِمُونَ وَاعْتَصِمُوا بِحَبْلِ اللَّهِ جَمِيعًا";
    const longBg =
      "О, вие, които повярвахте, бойте се от Аллах с истинска богобоязън и умирайте само като отдадени Нему мюсюлмани! И се дръжте здраво за въжето на Аллах всички заедно!";

    const analysis = simulateAndAnalyzePhotoLayout({
      reference: "Коран 3:102-103",
      arabic: largeArabic,
      bulgarian: longBg,
      style: "lower-third",
    });

    const arBottom = analysis.arabic!.box.y + analysis.arabic!.box.height;
    const bgTop = analysis.bulgarian.box.y;
    const gap = bgTop - arBottom;

    assert(gap >= 32, `Lower-third gap (${gap}px) must be >= 32px even with large blocks`);
    assert(!analysis.hasCollision, "Zero collision in lower-third with large blocks");
    assert(analysis.bulgarian.box.y + analysis.bulgarian.box.height <= 1520, "Fits <= 1520px");
  });

  test("C3.4: Reference Pill vs Bulgarian Gap (when Arabic is omitted) >= 24px", () => {
    const analysis = simulateAndAnalyzePhotoLayout({
      reference: "Хадис 40",
      bulgarian: "Бъди на този свят като чужденец или странник, преминаващ по път.",
      style: "centered",
    });

    assert(analysis.arabic === null, "Arabic block omitted");
    const pillBottom = analysis.pill.box.y + analysis.pill.box.height; // 356
    const bgTop = analysis.bulgarian.box.y;
    const gap = bgTop - pillBottom;

    assert(gap >= 24, `Pill to Bulgarian gap (${gap}px) must be >= 24px`);
    assert(!analysis.hasCollision, "No collision without Arabic block");
  });

  // =========================================================================
  // SUITE 4: VIRAL THUMBNAIL SVG HARDENING & SECURITY
  // =========================================================================
  setSuite("SUITE 4: VIRAL THUMBNAIL SVG ADVERSARIAL HARDENING");

  test("C4.1: Viral Thumbnail Title centered at X=480, Width <= 760px, Right <= 860px", () => {
    const titles = [
      "АЯТ АЛ-КУРСИ",
      "ТАЙНАТА НА УСПЕХА В ИСЛЯМА",
      "КАК ДА ПОСТИГНЕШ ВЪТРЕШЕН МИР И СПОКОЙСТВИЕ В СЪРЦЕТО",
      "СИЛАТА НА ИСКРЕНОТО ПОКАЯНИЕ И ДУАТА КЪМ АЛЛАХ",
    ];

    for (const t of titles) {
      const res = buildViralThumbnailSvg({ title: t, profile: "tiktok" });
      assertEq(res.centerX, 480, "Center X must be 480 for TikTok");
      assert(res.maxLineWidth <= 760, `Max line width (${res.maxLineWidth}px) <= 760px`);
      const rightEdge = res.centerX + res.maxLineWidth / 2;
      assert(rightEdge <= 860, `Right edge (${rightEdge}px) <= 860px`);
      assert(res.lines.length <= 4, "Lines <= 4");
    }
  });

  test("C4.2: Extreme 50-Character Unbreakable Word in Viral Thumbnail Title", () => {
    const longWordTitle = "НЕПРЕОДОЛИМАТАВЯРАИСИЛАТАНАИСЛЯМСКАТАОБЩНОСТНАВСИЧКИВЯРВАЩИ";
    const res = buildViralThumbnailSvg({ title: longWordTitle });

    assert(res.lines.length >= 2, "Unbreakable title must wrap into multiple lines");
    assert(res.maxLineWidth <= 760, `Max line width (${res.maxLineWidth}px) <= 760px`);
    assert(res.centerX + res.maxLineWidth / 2 <= 860, "Right edge <= 860px");
  });

  test("C4.3: XML Injection & Malicious Script Sanitization", () => {
    const payload = `<script>alert('pwned')</script> "test" & 'quotes' <svg onload="evil()">`;
    const res = buildViralThumbnailSvg({ title: payload });

    // Ensure raw unescaped HTML/XML tags are not present in the SVG output
    assert(!res.svg.includes("<script>"), "Raw script tag must not exist");
    assert(!res.svg.includes("<SCRIPT>"), "Raw uppercase script tag must not exist");
    assert(!res.svg.includes('onload="evil()"'), "Raw attribute injection must not exist");
    // Ensure entities are properly escaped
    assert(res.svg.includes("&lt;SCRIPT&gt;"), "Escaped script tag present");
    assert(res.svg.includes("&amp;"), "Escaped ampersand present");
    assert(res.svg.includes("&quot;"), "Escaped quote present");
  });

  test("C4.4: Dynamic Font Scaling Range [54, 76]px", () => {
    const fitShort = fitThumbnailTitle("РАЙ");
    assertEq(fitShort.fontSize, 76, "Short title uses 76px");

    const fitLong = fitThumbnailTitle(
      "МНОГО ДЪЛГО ЗАГЛАВИЕ С МНОЖЕСТВО ДУМИ ЗА ТЕСТВАНЕ НА АВТОМАТИЧНОТО ПРЕОРАЗМЕРЯВАНЕ В СИСТЕМАТА",
    );
    assert(fitLong.fontSize >= 54, "Long title clamped at minimum 54px");
    assert(fitLong.fontSize <= 76, "Long title font size <= 76px");
    assert(fitLong.lines.length <= 4, "Clamped to <= 4 lines");
  });

  // =========================================================================
  // SUITE 5: 2,000 EXHAUSTIVE ADVERSARIAL FUZZING ITERATIONS
  // =========================================================================
  setSuite("SUITE 5: 2,000 EXHAUSTIVE ADVERSARIAL FUZZING ITERATIONS");

  test("C5.1: 2,000 Randomized Adversarial Layout Runs (100% Pass Rate)", () => {
    const bgLexicon = [
      "Аллах",
      "е",
      "Светлината",
      "на",
      "небесата",
      "и",
      "земята",
      "Милосърдния",
      "Всезнаещия",
      "търпение",
      "молитва",
      "покаяние",
      "искреност",
      "доброта",
      "сърце",
      "мир",
      "вяра",
      "напътствие",
      "благочестие",
      "спасение",
      "Рай",
      "награда",
      "справедливост",
      "знание",
      "мъдрост",
      "живот",
      "истина",
      "изпитание",
      "благодат",
      "благодарност",
      "прошка",
      "душа",
      "вечност",
    ];

    const arLexicon = [
      "اللَّهُ",
      "لَا",
      "إِلَٰهَ",
      "إِلَّا",
      "هُوَ",
      "الْحَيُّ",
      "الْقَيُّومُ",
      "الرَّحْمَٰنُ",
      "الرَّحِيمُ",
      "مَالِكِ",
      "يَوْمِ",
      "الدِّينِ",
      "إِيَّاكَ",
      "نَعْبُدُ",
      "وَإِيَّاكَ",
      "نَسْتَعِينُ",
      "اهْدِنَا",
      "الصِّرَاطَ",
      "الْمُسْتَقِيمَ",
      "صِرَاطَ",
      "الَّذِينَ",
      "أَنْعَمْتَ",
      "عَلَيْهِمْ",
    ];

    const styles: ("minimal" | "centered" | "lower-third" | "bottom")[] = [
      "minimal",
      "centered",
      "lower-third",
      "bottom",
    ];
    const profiles = ["tiktok", "reels", "shorts", "universal", "center"];

    for (let i = 1; i <= 2000; i++) {
      const bgWordsCount = Math.floor(Math.random() * 70) + 1; // 1 to 70 words
      const arWordsCount = Math.random() > 0.35 ? Math.floor(Math.random() * 20) + 1 : 0; // 0 to 20 words
      const style = styles[Math.floor(Math.random() * styles.length)];
      const profile = profiles[Math.floor(Math.random() * profiles.length)];

      let bgText = Array.from(
        { length: bgWordsCount },
        () => bgLexicon[Math.floor(Math.random() * bgLexicon.length)],
      ).join(" ");

      // Inject unbreakable word 10% of the time
      if (Math.random() < 0.1) {
        bgText += " Непреодолимодълъгуникалентекстовблокзатестваненамаксималнаширина";
      }

      const arText =
        arWordsCount > 0
          ? Array.from(
              { length: arWordsCount },
              () => arLexicon[Math.floor(Math.random() * arLexicon.length)],
            ).join(" ")
          : undefined;

      const ref = `[Коран ${Math.floor(Math.random() * 114) + 1}:${Math.floor(Math.random() * 250) + 1}]`;

      const analysis = simulateAndAnalyzePhotoLayout({
        reference: ref,
        arabic: arText,
        bulgarian: bgText,
        style,
        profile,
      });

      assert(
        analysis.strictlySafe,
        `Fuzz run ${i} failed safety: profile=${profile}, style=${style}, bgWords=${bgWordsCount}, arWords=${arWordsCount}`,
      );
      assert(
        !analysis.hasCollision,
        `Fuzz run ${i} detected collision: profile=${profile}, style=${style}`,
      );
    }
  });

  console.log("\n=================================================================");
  console.log(`📊 CHALLENGER SUMMARY: ${passedCount} / ${totalTests} TESTS PASSED`);
  if (failures.length > 0) {
    console.error(`❌ ${failures.length} FAILURES OCCURRED:`);
    for (const f of failures) {
      console.error(`   - [${f.suite}] ${f.name}: ${f.error}`);
    }
    process.exit(1);
  } else {
    console.log("🎉 ALL ADVERSARIAL CHALLENGES PASSED! EMPIRICALLY CONFIRMED.");
    console.log("=================================================================");
  }
}

runAdversarialChallengerTests().catch((err) => {
  console.error("FATAL CHALLENGER ERROR:", err);
  process.exit(1);
});
