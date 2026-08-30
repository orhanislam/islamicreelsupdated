/**
 * MILESTONE 2 VERIFICATION TEST SUITE: PHOTO & THUMBNAIL HARDENING
 * File: src/lib/__tests__/verify-photo-hardening.test.ts
 *
 * Verifies Milestone 2 (M2) Single Photo & Thumbnail Layout Hardening:
 * 1. Safe Zone Containment: X in [100, 860]px, Y in [300, 1520]px (W_SAFE=760, H_SAFE=1220).
 * 2. Zero Overlap: Reference pill, Arabic text, and Bulgarian translation blocks maintain >= 24px/32px vertical gap.
 * 3. Zero Overflow: Dynamic auto-fit scaling (down to 24px) without artificial Math.max(420, ...) clamp.
 * 4. Thumbnail SVG text containment & dynamic font scaling within safe corridor.
 * 5. Adversarial fuzzing harness (1,000 photo layout iterations + 500 thumbnail iterations).
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
  console.log(`🚀 ${suite}`);
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

function assertInRange(value: number, min: number, max: number, message: string) {
  if (value < min || value > max) {
    throw new Error(`${message} | Value ${value} out of range [${min}, ${max}]`);
  }
}

// ---------------------------------------------------------------------------
// Calibrated Font Metrics Engine (matching production typefaces)
// ---------------------------------------------------------------------------
export function createCalibratedMeasure(
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
        width: createCalibratedMeasure(fs, fontStyle)(str),
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

export interface PhotoLayoutResult {
  geom: SafeZoneGeometry;
  pill: BoundingBox;
  arabic: {
    lines: string[];
    fontSize: number;
    lineHeight: number;
    height: number;
    box: BoundingBox;
  } | null;
  bulgarian: {
    lines: string[];
    fontSize: number;
    lineHeight: number;
    height: number;
    box: BoundingBox;
  };
  isContained: boolean;
  hasZeroCollisions: boolean;
}

/**
 * Deterministic math simulation of hardened photo layout logic.
 */
export function computeHardenedPhotoLayout(opts: {
  arabic?: string;
  bulgarian: string;
  reference?: string;
  style?: "minimal" | "centered" | "lower-third" | "bottom";
  profile?: string;
}): PhotoLayoutResult {
  const geom = getSafeZone(opts.profile || "tiktok");
  const H = geom.H;
  const W_SAFE = geom.W_SAFE;
  const style = opts.style || "centered";
  const refText = opts.reference || "";

  // 1. Reference Pill Bounding Box at SAFE_TOP
  const refFont = REFERENCE_PILL_STANDARDS.FONT_SIZE; // 28
  const refMeasure = createCalibratedMeasure(refFont, "medium");
  const refTw = refMeasure(refText);
  const pillW = Math.min(W_SAFE, refTw + REFERENCE_PILL_STANDARDS.PAD_X * 2);
  const pillH = refFont + REFERENCE_PILL_STANDARDS.PAD_Y * 2; // 56
  const rawPillX = geom.CENTER_X - pillW / 2;
  const rawPillY = geom.SAFE_TOP; // 300
  const pillBox: BoundingBox = clampToSafeZone(
    { x: rawPillX, y: rawPillY, width: pillW, height: pillH },
    geom,
  );

  // Content start Y coordinate below Reference Pill
  const contentTopMinY = opts.reference
    ? geom.SAFE_TOP + 56 + REFERENCE_PILL_STANDARDS.MIN_VERTICAL_GAP
    : geom.SAFE_TOP; // 380px if reference present

  // 2. Arabic Block
  let arabicBlock: PhotoLayoutResult["arabic"] = null;
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

    const arH = arLines.length * arLh;
    const arW = Math.max(...arLines.map((l) => createCalibratedMeasure(arFs, "arabic")(l)), 0);
    const arX = geom.CENTER_X - arW / 2;
    const arBox: BoundingBox = { x: arX, y: contentTopMinY, width: arW, height: arH };
    arabicBlock = { lines: arLines, fontSize: arFs, lineHeight: arLh, height: arH, box: arBox };
  }

  const arabicBottomY = arabicBlock ? contentTopMinY + arabicBlock.height : contentTopMinY;

  // 3. Bulgarian Block
  const minGapBetweenArabicAndBg = 32;
  const bgStartMinY = arabicBlock ? arabicBottomY + minGapBetweenArabicAndBg : contentTopMinY;
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
    if (arabicBlock && bgTopY < arabicBottomY + minGapBetweenArabicAndBg) {
      bgTopY = arabicBottomY + minGapBetweenArabicAndBg;
    }
  } else if (style === "minimal") {
    bgTopY = bgStartMinY + Math.max(0, Math.round((availableBgHeight - bgFit.totalHeight) / 2));
  } else {
    // Centered style
    if (arabicBlock) {
      const remHeight = geom.BOTTOM_MAX_Y - arabicBottomY;
      const idealGap = Math.round((remHeight - bgFit.totalHeight) / 2);
      const extraGap = Math.max(minGapBetweenArabicAndBg, idealGap);
      bgTopY = Math.min(arabicBottomY + extraGap, geom.BOTTOM_MAX_Y - bgFit.totalHeight);
    } else {
      bgTopY = bgStartMinY + Math.max(0, Math.round((availableBgHeight - bgFit.totalHeight) / 2));
    }
  }

  const bgW = Math.max(
    ...bgFit.lines.map((l) => createCalibratedMeasure(bgFit.fontSize, "bold")(l)),
    0,
  );
  const bgX = geom.CENTER_X - bgW / 2;
  const bgBox: BoundingBox = {
    x: bgX,
    y: bgTopY,
    width: bgW,
    height: bgFit.totalHeight,
  };

  const isContained =
    isWithinSafeZone(pillBox, geom) &&
    (arabicBlock ? isWithinSafeZone(arabicBlock.box, geom) : true) &&
    isWithinSafeZone(bgBox, geom);

  const hasZeroCollisions =
    (arabicBlock ? !doBoxesCollide(pillBox, arabicBlock.box, 24) : true) &&
    (arabicBlock
      ? !doBoxesCollide(arabicBlock.box, bgBox, minGapBetweenArabicAndBg)
      : opts.reference
        ? !doBoxesCollide(pillBox, bgBox, 24)
        : true);

  return {
    geom,
    pill: pillBox,
    arabic: arabicBlock,
    bulgarian: {
      lines: bgFit.lines,
      fontSize: bgFit.fontSize,
      lineHeight: bgFit.lineHeight,
      height: bgFit.totalHeight,
      box: bgBox,
    },
    isContained,
    hasZeroCollisions,
  };
}

// ---------------------------------------------------------------------------
// TEST SUITE EXECUTION
// ---------------------------------------------------------------------------
async function runAllMilestone2Tests() {
  console.log("=================================================================");
  console.log("🛡️ MILESTONE 2 TEST SUITE: PHOTO & VIRAL THUMBNAIL HARDENING");
  console.log("=================================================================");

  // =========================================================================
  // SUITE 1: SAFE ZONE GEOMETRY CONTAINMENT (X: [100, 860], Y: [300, 1520])
  // =========================================================================
  setSuite("SUITE 1: SAFE ZONE GEOMETRY CONTAINMENT");

  test("S1.1: TikTok Safe Zone Nominal Containment for standard Ayah", () => {
    const layout = computeHardenedPhotoLayout({
      reference: "Коран 2:255 • Аят ал-Курси",
      arabic: "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ",
      bulgarian: "Аллах! Няма друг бог освен Него - Вечноживия, Неизменния!",
      style: "centered",
      profile: "tiktok",
    });

    assert(layout.isContained, "All layout boxes must be contained in TikTok safe zone");
    assert(layout.pill.x >= 100, `Pill X (${layout.pill.x}) >= 100`);
    assert(layout.pill.x + layout.pill.width <= 860, `Pill Right <= 860`);
    assert(layout.pill.y >= 300, `Pill Y >= 300`);
    assert(layout.pill.y + layout.pill.height <= 1520, `Pill Bottom <= 1520`);

    assert(layout.arabic !== null, "Arabic block must exist");
    assert(layout.arabic!.box.x >= 100, `Arabic X >= 100`);
    assert(layout.arabic!.box.x + layout.arabic!.box.width <= 860, `Arabic Right <= 860`);
    assert(layout.arabic!.box.y >= 300, `Arabic Y >= 300`);
    assert(layout.arabic!.box.y + layout.arabic!.box.height <= 1520, `Arabic Bottom <= 1520`);

    assert(layout.bulgarian.box.x >= 100, `Bulgarian X >= 100`);
    assert(layout.bulgarian.box.x + layout.bulgarian.box.width <= 860, `Bulgarian Right <= 860`);
    assert(layout.bulgarian.box.y >= 300, `Bulgarian Y >= 300`);
    assert(
      layout.bulgarian.box.y + layout.bulgarian.box.height <= 1520,
      `Bulgarian Bottom <= 1520`,
    );
  });

  test("S1.2: Right Boundary Clearance (X <= 860px) when centered at CENTER_X (480px)", () => {
    const maxSafeW = TIKTOK_SAFE_ZONE.W_SAFE; // 760px
    const halfW = maxSafeW / 2; // 380px
    const leftEdge = TIKTOK_SAFE_ZONE.CENTER_X - halfW;
    const rightEdge = TIKTOK_SAFE_ZONE.CENTER_X + halfW;

    assertEq(leftEdge, 100, "Left edge at max width must equal SAFE_LEFT (100px)");
    assertEq(rightEdge, 860, "Right edge at max width must equal 860px (W - SAFE_RIGHT)");
    assert(rightEdge <= 860, "Must never encroach into TikTok right sidebar buttons (X > 860)");
  });

  test("S1.3: Top Boundary Clearance (Y >= 300px)", () => {
    const layout = computeHardenedPhotoLayout({
      reference: "Сахих ал-Бухари #1",
      bulgarian: "Делата се съдят само според намеренията.",
      style: "minimal",
    });
    assertEq(layout.pill.y, 300, "Reference pill must start exactly at SAFE_TOP = 300px");
    assert(layout.bulgarian.box.y >= 300, "Bulgarian text must start >= 300px");
  });

  test("S1.4: Bottom Boundary Clearance (Y <= 1520px) in lower-third mode", () => {
    const layout = computeHardenedPhotoLayout({
      reference: "Коран 94:5-6",
      arabic: "فَإِنَّ مَعَ الْعُسْرِ يُسْرًا إِنَّ مَعَ الْعُسْرِ يُسْرًا",
      bulgarian: "Наистина с трудността има и улеснение! Наистина с трудността има и улеснение!",
      style: "lower-third",
    });

    const bgBottom = layout.bulgarian.box.y + layout.bulgarian.box.height;
    assert(bgBottom <= 1520, `Bulgarian bottom (${bgBottom}) must be <= 1520px`);
    assert(layout.isContained, "Layout must be fully contained");
  });

  test("S1.5: All 4 Layout Style Modes (centered, lower-third, bottom, minimal) respect safe bounds", () => {
    const styles: ("centered" | "lower-third" | "bottom" | "minimal")[] = [
      "centered",
      "lower-third",
      "bottom",
      "minimal",
    ];
    for (const st of styles) {
      const layout = computeHardenedPhotoLayout({
        reference: "Коран 2:286",
        arabic: "لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا",
        bulgarian: "Аллах не възлага на никой човек товар над възможностите му.",
        style: st,
      });
      assert(layout.isContained, `Style mode '${st}' must be strictly contained in safe zone`);
      assert(layout.hasZeroCollisions, `Style mode '${st}' must have zero collisions`);
    }
  });

  test("S1.6: Multi-Platform Geometry Adaptability (tiktok, reels, shorts, universal, center)", () => {
    const profiles = ["tiktok", "reels", "shorts", "universal", "center"];
    for (const p of profiles) {
      const layout = computeHardenedPhotoLayout({
        reference: "Коран 3:103",
        bulgarian: "И се дръжте здраво за въжето на Аллах всички заедно!",
        profile: p,
      });
      const sz = getSafeZone(p);
      assert(layout.pill.x >= sz.SAFE_LEFT, `Pill X >= SAFE_LEFT on ${p}`);
      assert(
        layout.pill.x + layout.pill.width <= sz.W - sz.SAFE_RIGHT,
        `Pill Right <= W_MAX on ${p}`,
      );
      assert(
        layout.bulgarian.box.y + layout.bulgarian.box.height <= sz.BOTTOM_MAX_Y,
        `Bulgarian Bottom <= BOTTOM_MAX_Y on ${p}`,
      );
      assert(layout.isContained, `Layout must be contained on ${p}`);
    }
  });

  // =========================================================================
  // SUITE 2: ZERO COLLISION & VERTICAL GAP ENFORCING (Pill vs Arabic vs Bulgarian)
  // =========================================================================
  setSuite("SUITE 2: ZERO COLLISION & VERTICAL GAP ENFORCING");

  test("S2.1: Reference Pill Vertical Placement exact span [300, 356]px", () => {
    const layout = computeHardenedPhotoLayout({
      reference: "Коран 1:1",
      bulgarian: "В името на Аллах, Всемилостивия, Милосърдния!",
    });
    assertEq(layout.pill.y, 300, "Pill top must be 300px");
    assertEq(layout.pill.height, 56, "Pill height must be 56px (28 + 2*14)");
    assertEq(layout.pill.y + layout.pill.height, 356, "Pill bottom must be exactly 356px");
  });

  test("S2.2: Pill to Arabic Vertical Gap (>= 24px) eliminates overlap", () => {
    const layout = computeHardenedPhotoLayout({
      reference: "Коран 112:1-4",
      arabic: "قُلْ هُوَ اللَّهُ أَحَدٌ اللَّهُ الصَّمَدُ",
      bulgarian: "Кажи: Той е Аллах - Единственият, Целта на всички въжделения!",
      style: "centered",
    });

    assert(layout.arabic !== null, "Arabic block must be present");
    const pillBottom = layout.pill.y + layout.pill.height; // 356
    const arabicTop = layout.arabic!.box.y; // 380
    const gap = arabicTop - pillBottom;

    assertEq(arabicTop, 380, "Arabic top must anchor at 380px");
    assertEq(gap, 24, "Gap between Pill and Arabic must be exactly 24px");
    assert(gap >= REFERENCE_PILL_STANDARDS.MIN_VERTICAL_GAP, "Gap must be >= 24px");
    assert(!doBoxesCollide(layout.pill, layout.arabic!.box, 24), "Collision checker returns false");
  });

  test("S2.3: Arabic to Bulgarian Vertical Gap (>= 32px)", () => {
    const layout = computeHardenedPhotoLayout({
      reference: "Коран 55:1-4",
      arabic: "الرَّحْمَٰنُ عَلَّمَ الْقُرْآنَ خَلَقَ الْإِنسَانَ عَلَّمَهُ الْبَيَانَ",
      bulgarian: "Всемилостивия научи на Корана, сътвори човека, научи го на ясна реч.",
      style: "centered",
    });

    const arBottom = layout.arabic!.box.y + layout.arabic!.box.height;
    const bgTop = layout.bulgarian.box.y;
    const gap = bgTop - arBottom;

    assert(gap >= 32, `Gap between Arabic and Bulgarian (${gap}px) must be >= 32px`);
    assert(
      !doBoxesCollide(layout.arabic!.box, layout.bulgarian.box, 32),
      "Arabic and Bulgarian do not collide",
    );
  });

  test("S2.4: Lower-Third Mode guaranteed clearance between Arabic and Bulgarian", () => {
    const layout = computeHardenedPhotoLayout({
      reference: "Хадис",
      arabic: "إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ",
      bulgarian: "Наистина делата се съдят само според намеренията.",
      style: "lower-third",
    });

    const arBottom = layout.arabic!.box.y + layout.arabic!.box.height;
    const bgTop = layout.bulgarian.box.y;
    assert(
      bgTop >= arBottom + 32,
      `Lower-third Bulgarian top (${bgTop}) must be >= Arabic bottom + 32 (${arBottom + 32})`,
    );
    assert(layout.hasZeroCollisions, "Zero collision in lower-third mode");
  });

  test("S2.5: Pairwise AABB Disjointness across all 3 visual elements", () => {
    const layout = computeHardenedPhotoLayout({
      reference: "Коран 24:35 • Аят ан-Нур",
      arabic: "اللَّهُ نُورُ السَّمَاوَاتِ وَالْأَرْضِ",
      bulgarian: "Аллах е Светлината на небесата и на земята.",
      style: "centered",
    });

    assert(!doBoxesCollide(layout.pill, layout.arabic!.box, 24), "Pill and Arabic disjoint");
    assert(
      !doBoxesCollide(layout.arabic!.box, layout.bulgarian.box, 32),
      "Arabic and Bulgarian disjoint",
    );
    assert(!doBoxesCollide(layout.pill, layout.bulgarian.box, 24), "Pill and Bulgarian disjoint");
    assert(layout.hasZeroCollisions, "All elements have verified zero collision");
  });

  // =========================================================================
  // SUITE 3: DYNAMIC AUTO-FIT SCALING & LONG MULTI-VERSE STRESS (R1 OVERFLOW FIX)
  // =========================================================================
  setSuite("SUITE 3: DYNAMIC AUTO-FIT SCALING & OVERFLOW FIX");

  test("S3.1: Short Ayah (10-20 words) selects large font size (70-84px)", () => {
    const layout = computeHardenedPhotoLayout({
      reference: "Коран 108:1",
      bulgarian: "Наистина Ние ти дарихме изобилието.",
      style: "centered",
    });
    assertInRange(layout.bulgarian.fontSize, 70, 84, "Short text should use large font");
    assert(
      layout.bulgarian.box.y + layout.bulgarian.box.height <= 1520,
      "Must not overflow bottom",
    );
  });

  test("S3.2: Medium Hadith (30-50 words) scales smoothly to 46-74px", () => {
    const mediumText =
      "Който вярва в Аллах и в Сетния ден, нека говори добро или да мълчи. Който вярва в Аллах и в Сетния ден, нека почита своя съсед и да бъде щедър към своя гост във всяко добро дело.";
    const layout = computeHardenedPhotoLayout({
      reference: "Сахих ал-Бухари #6018",
      arabic:
        "مَنْ كَانَ يُؤْمِنُ بِاللَّهِ وَالْيَوْمِ الْآخِرِ فَلْيَقُلْ خَيْرًا أَوْ لِيَصْمُتْ",
      bulgarian: mediumText,
      style: "centered",
    });
    assertInRange(layout.bulgarian.fontSize, 46, 74, "Medium text font scaling");
    assert(layout.bulgarian.box.y + layout.bulgarian.box.height <= 1520, "No overflow");
  });

  test("S3.3: Long Multi-Verse Ayah (60-100 words) scales down to 28-48px", () => {
    const longText =
      "О, вие, които повярвахте, когато пристъпвате към молитва, измийте лицата си и ръцете си до лактите, и обтрийте главите си, и измийте краката си до глезените! А ако сте осквернени, почистете се! А ако сте болни или на път, или някой от вас е дошъл от нужника, или сте се докосвали до жените и не намерите вода, потърсете чиста земя!";
    const layout = computeHardenedPhotoLayout({
      reference: "Коран 5:6",
      arabic:
        "يَا أَيُّهَا الَّذِينَ آمَنُوا إِذَا قُمْتُمْ إِلَى الصَّلَاةِ فَاغْسِلُوا وُجُوهَكُمْ",
      bulgarian: longText,
      style: "centered",
    });
    assertInRange(layout.bulgarian.fontSize, 28, 48, "Long text font scaling");
    assert(
      layout.bulgarian.box.y + layout.bulgarian.box.height <= 1520,
      "Must strictly fit <= 1520",
    );
  });

  test("S3.4: Massive Scripture (150+ words) decremental scaling down to 24px without overflow", () => {
    const massiveText = Array(15)
      .fill(
        "Искреността, търпението и покаянието са стълбовете на спасението в земния и вечния живот.",
      )
      .join(" ");
    const layout = computeHardenedPhotoLayout({
      reference: "Ан-Науауи",
      arabic:
        "إِنَّ اللَّهَ لَا يَنْظُرُ إِلَى صُوَرِكُمْ وَأَمْوَالِكُمْ وَلَكِنْ يَنْظُرُ إِلَى قُلُوبِكُمْ وَأَعْمَالِكُمْ",
      bulgarian: massiveText,
      style: "centered",
    });
    assert(layout.bulgarian.fontSize >= 24, "Font size must clamp at minimum readable 24px");
    assert(
      layout.bulgarian.box.y + layout.bulgarian.box.height <= 1520,
      `Massive text bottom (${layout.bulgarian.box.y + layout.bulgarian.box.height}) must not exceed 1520px`,
    );
    assert(layout.isContained, "Massive layout must remain contained");
  });

  test("S3.5: Elimination of Math.max(420, ...) clamp prevents artificial overflow", () => {
    const ctx = createMockCanvasContext(60);
    // When remaining available height is small (e.g. 200px), autoFit must fit into 200px, not 420px!
    const res = photoAutoFit(
      ctx,
      "Кратко напомняне за важността на добрия нрав в исляма.",
      "'Cormorant Garamond', Georgia, serif",
      700,
      760,
      200, // strictly 200px available
      { min: 24, max: 84 },
      1.32,
    );
    assert(
      res.totalHeight <= 200,
      `Total height (${res.totalHeight}px) must respect exact max budget of 200px`,
    );
  });

  test("S3.6: 100% Token Retention / Zero Word Loss in wrap", () => {
    const ctx = createMockCanvasContext(40);
    ctx.font = "700 40px 'Cormorant Garamond'";
    const originalText =
      "Наистина делата се съдят само според намеренията и всеки човек получава това за което е възнамерил.";
    const wrappedLines = photoWrap(ctx, originalText, 760);
    const recoveredTokens = wrappedLines.join(" ").split(/\s+/).filter(Boolean);
    const originalTokens = originalText.split(/\s+/).filter(Boolean);

    assertEq(
      recoveredTokens.length,
      originalTokens.length,
      "Recovered word count must match original exactly",
    );
    assertEq(
      recoveredTokens.join(" "),
      originalTokens.join(" "),
      "Recovered text must match original verbatim",
    );
  });

  test("S3.7: Unbreakable 50+ Character Token is cleanly chunked without horizontal overflow", () => {
    const ctx = createMockCanvasContext(40);
    ctx.font = "700 40px 'Cormorant Garamond'";
    const longToken = "Allahuakbarulailahailallahualahuakbaruvalillahilhamdverylongtoken";
    const lines = photoWrap(ctx, longToken, 760);

    assert(lines.length >= 2, "Long token must be chunked into multiple lines");
    for (const ln of lines) {
      const w = ctx.measureText(ln).width;
      assert(w <= 760, `Line width (${w}px) must be <= 760px`);
    }
  });

  // =========================================================================
  // SUITE 4: VIRAL THUMBNAIL SVG TEXT CONTAINMENT & ENTITY SANITIZATION
  // =========================================================================
  setSuite("SUITE 4: VIRAL THUMBNAIL SVG HARDENING");

  test("S4.1: Thumbnail Title centered at X=480 (CENTER_X) for TikTok", () => {
    const res = buildViralThumbnailSvg({
      title: "АЯТ АЛ-КУРСИ",
      profile: "tiktok",
    });
    assertEq(res.centerX, 480, "TikTok center X must be 480");
    assert(res.svg.includes(`x="480"`), 'SVG markup must include x="480"');
    assert(
      res.svg.includes(`text-anchor="middle"`),
      'SVG markup must include text-anchor="middle"',
    );
  });

  test("S4.2: Right Corridor Inviolability (X_right <= 860px)", () => {
    const res = buildViralThumbnailSvg({
      title: "ТАЙНАТА НА УСПЕХА В ИСЛЯМА И ВЯРАТА В АЛЛАХ",
      profile: "tiktok",
    });
    const halfW = res.maxLineWidth / 2;
    const rightEdge = res.centerX + halfW;
    assert(
      rightEdge <= 860,
      `Thumbnail right edge (${rightEdge}px) must not exceed 860px (TikTok sidebar buttons buffer)`,
    );
    assert(res.maxLineWidth <= 760, `Max line width (${res.maxLineWidth}px) must be <= 760px`);
  });

  test("S4.3: Dynamic Font Scaling from 76px down to 54px for Long Titles", () => {
    const shortTitle = fitThumbnailTitle("АЯТ АЛ-КУРСИ");
    assertEq(shortTitle.fontSize, 76, "Short title should use maximum 76px font");

    const mediumTitle = fitThumbnailTitle("ТАЙНАТА НА УСПЕХА В ИСЛЯМА И ДУАТА");
    assertInRange(mediumTitle.fontSize, 62, 76, "Medium title font scale");

    const longTitle = fitThumbnailTitle(
      "КАК ДА ПОСТИГНЕШ ИСТИНСКИ ВЪТРЕШЕН МИР СПОКОЙСТВИЕ И БЛАГОДАТ В ТРУДНИТЕ МОМЕНТИ НА ЗЕМНИЯ ЖИВОТ",
    );
    assertInRange(longTitle.fontSize, 54, 60, "Long title scales down to 54-60px");
    assert(longTitle.lines.length <= 4, "Lines clamped to <= 4");
  });

  test("S4.4: XML Entity Escaping Security against injection", () => {
    const maliciousTitle = "Хадис < \"Светлина\" & 'Мир'>";
    const escaped = escapeXml(maliciousTitle);
    assert(!escaped.includes("<"), "Must not contain raw <");
    assert(!escaped.includes(">"), "Must not contain raw >");
    assert(!escaped.includes('"'), 'Must not contain raw "');
    assert(!escaped.includes("'"), "Must not contain raw '");
    assert(escaped.includes("&lt;"), "Must contain &lt;");
    assert(escaped.includes("&gt;"), "Must contain &gt;");
    assert(escaped.includes("&quot;"), "Must contain &quot;");
    assert(escaped.includes("&apos;"), "Must contain &apos;");
    assert(escaped.includes("&amp;"), "Must contain &amp;");

    const res = buildViralThumbnailSvg({ title: maliciousTitle });
    assert(res.svg.includes("&lt;"), "Rendered SVG must contain escaped entity");
  });

  test("S4.5: Keyword Highlighting with Accent Color", () => {
    const res = buildViralThumbnailSvg({
      title: "ВЯРАТА В АЛЛАХ И КОРАН",
      accentColor: "#00FFCC",
    });
    assert(res.svg.includes("#00FFCC"), "Must apply accent color to highlight keywords");
  });

  test("S4.6: Unbroken 40+ char token chunking in wrapTitleText", () => {
    const longToken = "НЕИЗБЕЖНОТООБЕДИНЕНИЕНАВСИЧКИВЯРВАЩИХОРАПОСВЕТА";
    const lines = wrapTitleText(longToken, 60, 760);
    assert(lines.length >= 2, "Unbroken title token must wrap into multiple lines");
    for (const l of lines) {
      assert(estimateTitleWidth(l, 60) <= 760, "Wrapped line width must be <= 760px");
    }
  });

  // =========================================================================
  // SUITE 5: ADVERSARIAL BOUNDARY & RANDOMIZED PROPERTY FUZZING (1,000 ITERATIONS)
  // =========================================================================
  setSuite("SUITE 5: ADVERSARIAL FUZZING (1,000 ITERATIONS)");

  test("S5.1: 1,000 Randomized Photo Layout Configurations satisfy 100% containment and zero collisions", () => {
    const bgDictionary = [
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
    ];

    const arDictionary = [
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
    ];

    const styles: ("minimal" | "centered" | "lower-third" | "bottom")[] = [
      "minimal",
      "centered",
      "lower-third",
      "bottom",
    ];
    const profiles = ["tiktok", "reels", "shorts", "universal", "center"];

    for (let iter = 1; iter <= 1000; iter++) {
      const wordCount = Math.floor(Math.random() * 80) + 1; // 1 to 80 words
      const arWordCount = Math.random() > 0.3 ? Math.floor(Math.random() * 25) + 1 : 0; // 0 to 25 words
      const style = styles[Math.floor(Math.random() * styles.length)];
      const profile = profiles[Math.floor(Math.random() * profiles.length)];

      const bulgarian = Array.from(
        { length: wordCount },
        () => bgDictionary[Math.floor(Math.random() * bgDictionary.length)],
      ).join(" ");

      const arabic =
        arWordCount > 0
          ? Array.from(
              { length: arWordCount },
              () => arDictionary[Math.floor(Math.random() * arDictionary.length)],
            ).join(" ")
          : undefined;

      const reference = `[Коран ${Math.floor(Math.random() * 114) + 1}:${Math.floor(Math.random() * 200) + 1}]`;

      const layout = computeHardenedPhotoLayout({
        reference,
        arabic,
        bulgarian,
        style,
        profile,
      });

      assert(
        layout.isContained,
        `Fuzz iter ${iter} failed containment: profile=${profile}, style=${style}, words=${wordCount}`,
      );
      assert(
        layout.hasZeroCollisions,
        `Fuzz iter ${iter} detected collision: profile=${profile}, style=${style}, words=${wordCount}`,
      );
    }
  });

  test("S5.2: 500 Randomized Viral Thumbnail Configurations satisfy width <= 760px and lines <= 4", () => {
    const words = [
      "ТАЙНАТА",
      "НА",
      "УСПЕХА",
      "В",
      "ИСЛЯМА",
      "И",
      "ВЯРАТА",
      "В",
      "АЛЛАХ",
      "СПАСЕНИЕТО",
      "ОТ",
      "ИЗПИТАНИЯТА",
      "ПОСТИГАНЕ",
      "НА",
      "ВЪТРЕШЕН",
      "МИР",
      "СИЛАТА",
      "НА",
      "ДУАТА",
      "И",
      "ТЪРПЕНИЕТО",
      "ПЪТЯТ",
      "КЪМ",
      "РАЯ",
    ];

    for (let iter = 1; iter <= 500; iter++) {
      const len = Math.floor(Math.random() * 12) + 1;
      const title = Array.from(
        { length: len },
        () => words[Math.floor(Math.random() * words.length)],
      ).join(" ");

      const res = buildViralThumbnailSvg({
        title,
        profile: "tiktok",
      });

      assert(
        res.maxLineWidth <= 760,
        `Thumbnail fuzz iter ${iter} exceeded maxLineWidth: ${res.maxLineWidth}px (title: "${title}")`,
      );
      assert(
        res.lines.length <= 4,
        `Thumbnail fuzz iter ${iter} exceeded max lines: ${res.lines.length}`,
      );
      assert(
        res.centerX + res.maxLineWidth / 2 <= 860,
        `Thumbnail fuzz iter ${iter} breached right safe border: ${res.centerX + res.maxLineWidth / 2}px`,
      );
    }
  });

  console.log("\n=================================================================");
  console.log(`📊 TEST SUITE SUMMARY: ${passedCount} / ${totalTests} TESTS PASSED`);
  if (failures.length > 0) {
    console.error(`❌ ${failures.length} FAILURES OCCURRED:`);
    for (const f of failures) {
      console.error(`   - [${f.suite}] ${f.name}: ${f.error}`);
    }
    process.exit(1);
  } else {
    console.log("🎉 ALL MILESTONE 2 PHOTO & THUMBNAIL HARDENING TESTS PASSED! (100% SUCCESS)");
    console.log("=================================================================");
  }
}

runAllMilestone2Tests().catch((err) => {
  console.error("FATAL TEST RUNNER ERROR:", err);
  process.exit(1);
});
