/**
 * ADVERSARIAL STRESS TEST: CAROUSEL VIDEO SAFE ZONE CORRIDOR & BOUNDARIES
 * File: src/lib/__tests__/adversarial-carousel-safezone.test.ts
 */

import {
  TIKTOK_SAFE_ZONE,
  CAROUSEL_SAFE_ZONE,
  getSlideSafeZone,
  wrapIntelligent,
  parseSlideSegments,
  computeSlideLayout,
  fitSlideLayout,
  stripEmojis,
  stripOuterQuotes,
  type CarouselSlideOptions,
  type SlideLayoutResult,
} from "../render-carousel";

import {
  REFERENCE_PILL_STANDARDS,
  isWithinSafeZone,
  type BoundingBox,
} from "../safe-zone";

// Calibrated measurement mock for headless Node.js
function createCalibratedMeasure(fontSize: number, fontStyle: "bold" | "medium" | "arabic" = "bold") {
  return (text: string): number => {
    let w = 0;
    for (const char of text) {
      if (char === " ") {
        w += fontSize * 0.28;
      } else if (/[.,!?:;'"„“”«»`()[\]]/.test(char)) {
        w += fontSize * 0.32;
      } else if (fontStyle === "arabic" || /[\u0600-\u06FF]/.test(char)) {
        w += fontSize * 0.55;
      } else if (/[\u0449\u0436\u044e\u0448\u043c\u0444\u0429\u0416\u042e\u0428\u041c\u0424WwMm%@]/.test(char)) {
        w += fontSize * (fontStyle === "bold" ? 0.85 : 0.78);
      } else if (/[iljt1I|]/.test(char)) {
        w += fontSize * 0.30;
      } else if (/[A-Z\u0410-\u042F]/.test(char)) {
        w += fontSize * (fontStyle === "bold" ? 0.72 : 0.65);
      } else {
        w += fontSize * (fontStyle === "bold" ? 0.60 : 0.54);
      }
    }
    return Math.round(w);
  };
}

function createMockCanvasContext(fontSize: number = 60) {
  let currentFont = `${fontSize}px Inter`;
  return {
    get font() {
      return currentFont;
    },
    set font(val: string) {
      currentFont = val;
    },
    measureText: (str: string) => {
      const match = currentFont.match(/(\d+)px/);
      const fs = match ? parseInt(match[1], 10) : fontSize;
      const isBold = currentFont.includes("800") || currentFont.includes("700") || currentFont.includes("bold");
      const isArabic = /[\u0600-\u06FF]/.test(str);
      const style = isArabic ? "arabic" : isBold ? "bold" : "medium";
      return {
        width: createCalibratedMeasure(fs, style)(str),
      };
    },
  } as unknown as CanvasRenderingContext2D;
}

// Bounding box simulation matching render-carousel.ts
interface RenderedElementBox {
  name: string;
  box: BoundingBox;
}

function simulateRenderBoundingBoxes(
  ctx: CanvasRenderingContext2D,
  opts: CarouselSlideOptions,
  layout: SlideLayoutResult
): RenderedElementBox[] {
  const safeZone = getSlideSafeZone(opts);
  const centerX = safeZone.CENTER_X;
  const boxes: RenderedElementBox[] = [];

  // 1. Footer text
  const FOOTER_LH = 64;
  const footerClean = stripEmojis((opts.footerText || "").trim());
  const footerBaselineY = safeZone.BOTTOM_MAX_Y - 10;

  if (footerClean) {
    ctx.font = `500 52px 'Montserrat', sans-serif`;
    const w = ctx.measureText(footerClean).width;
    boxes.push({
      name: "footerText",
      box: {
        x: centerX - w / 2,
        y: footerBaselineY - FOOTER_LH,
        width: w,
        height: FOOTER_LH,
      },
    });
  }

  // 2. Bottom CTA text
  const GAP_FOOTER_TO_BOTTOM = 20;
  const bottomAnchorBaselineY = footerClean
    ? footerBaselineY - FOOTER_LH - GAP_FOOTER_TO_BOTTOM
    : safeZone.BOTTOM_MAX_Y - 10;

  if (layout.bottomLines.length > 0) {
    const totalBottomH = layout.bottomLines.length * layout.lhBottom;
    const bottomStartY = bottomAnchorBaselineY - totalBottomH;
    layout.bottomLines.forEach((line, i) => {
      ctx.font = layout.fontBottom;
      const w = ctx.measureText(line).width;
      boxes.push({
        name: `bottomLine_${i}`,
        box: {
          x: centerX - w / 2,
          y: bottomStartY + i * layout.lhBottom,
          width: w,
          height: layout.lhBottom,
        },
      });
    });
  }

  // 3. Source badge
  const badgeClean = stripEmojis((opts.sourceBadge || "").trim());
  const BADGE_HEIGHT = REFERENCE_PILL_STANDARDS.FONT_SIZE + REFERENCE_PILL_STANDARDS.PAD_Y * 2;
  const BADGE_GAP = REFERENCE_PILL_STANDARDS.MIN_VERTICAL_GAP;
  const totalBadgeH = badgeClean ? BADGE_HEIGHT + BADGE_GAP : 0;
  const bodyAreaTop = safeZone.SAFE_TOP + totalBadgeH;

  if (badgeClean) {
    const badgeFont = `600 ${REFERENCE_PILL_STANDARDS.FONT_SIZE}px 'Montserrat', sans-serif`;
    ctx.font = badgeFont;
    const textW = ctx.measureText(badgeClean).width;
    const pillW = Math.min(safeZone.W_SAFE, textW + REFERENCE_PILL_STANDARDS.PAD_X * 2);
    boxes.push({
      name: "sourceBadge",
      box: {
        x: centerX - pillW / 2,
        y: safeZone.SAFE_TOP,
        width: pillW,
        height: BADGE_HEIGHT,
      },
    });
  }

  // 4. Flowing body content
  const bottomBlockTop = layout.bottomLines.length > 0
    ? (bottomAnchorBaselineY - layout.bottomH - GAP_FOOTER_TO_BOTTOM)
    : (footerClean ? footerBaselineY - FOOTER_LH - GAP_FOOTER_TO_BOTTOM : safeZone.BOTTOM_MAX_Y);

  const bodyAreaHeight = bottomBlockTop - bodyAreaTop;
  let currentY =
    bodyAreaTop +
    Math.max(0, Math.round((bodyAreaHeight - layout.totalH) / 2));

  // Top title
  layout.topLines.forEach((line, i) => {
    ctx.font = layout.fontTop;
    const w = ctx.measureText(line).width;
    boxes.push({
      name: `topLine_${i}`,
      box: {
        x: centerX - w / 2,
        y: currentY,
        width: w,
        height: layout.lhTop,
      },
    });
    currentY += layout.lhTop;
  });

  if (layout.topH > 0 && layout.bodyH > 0) {
    currentY += layout.gapTopToBody;
  }

  // Body segments
  for (let sIdx = 0; sIdx < layout.layoutSegments.length; sIdx++) {
    const seg = layout.layoutSegments[sIdx];
    seg.lines.forEach((line, lIdx) => {
      ctx.font = seg.font;
      const w = ctx.measureText(line).width;
      boxes.push({
        name: `segment_${sIdx}_line_${lIdx}`,
        box: {
          x: centerX - w / 2,
          y: currentY,
          width: w,
          height: seg.lh,
        },
      });
      currentY += seg.lh;
    });
    if (sIdx < layout.layoutSegments.length - 1) {
      currentY += layout.gapBetweenSegments;
    }
  }

  return boxes;
}

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✔ [PASS] ${name}`);
  } catch (err: any) {
    failed++;
    failures.push(`${name}: ${err.message}`);
    console.error(`  ✖ [FAIL] ${name}: ${err.message}`);
  }
}

async function run() {
  console.log("\n=================================================================");
  console.log("🔥 EMPIRICAL CHALLENGER M2-2: SAFE ZONE CORRIDOR STRESS HARNESS");
  console.log("=================================================================\n");

  const ctx = createMockCanvasContext(60);

  // --- TEST SUITE 1: TikTok Safe Zone Dimensions & Derived Geometry ---
  test("T1.1 TIKTOK_SAFE_ZONE exact bounds match platform requirements", () => {
    assert(TIKTOK_SAFE_ZONE.W === 1080, "W must be 1080");
    assert(TIKTOK_SAFE_ZONE.H === 1920, "H must be 1920");
    assert(TIKTOK_SAFE_ZONE.SAFE_TOP === 300, "SAFE_TOP must be 300");
    assert(TIKTOK_SAFE_ZONE.SAFE_BOTTOM === 400, "SAFE_BOTTOM must be 400");
    assert(TIKTOK_SAFE_ZONE.SAFE_LEFT === 100, "SAFE_LEFT must be 100");
    assert(TIKTOK_SAFE_ZONE.SAFE_RIGHT === 220, "SAFE_RIGHT must be 220");
    assert(TIKTOK_SAFE_ZONE.W_SAFE === 760, "W_SAFE must be 760 (1080 - 100 - 220)");
    assert(TIKTOK_SAFE_ZONE.H_SAFE === 1220, "H_SAFE must be 1220 (1920 - 300 - 400)");
    assert(TIKTOK_SAFE_ZONE.CENTER_X === 480, "CENTER_X must be 480 (100 + 760/2)");
    assert(TIKTOK_SAFE_ZONE.BOTTOM_MAX_Y === 1520, "BOTTOM_MAX_Y must be 1520 (1920 - 400)");
    assert(TIKTOK_SAFE_ZONE.TOP_MIN_Y === 300, "TOP_MIN_Y must be 300");
  });

  test("T1.2 getSlideSafeZone switches correctly based on useVideoSafeZone", () => {
    const videoSafe = getSlideSafeZone({ topTitle: "", mainText: "", bottomText: "", useVideoSafeZone: true });
    assert(videoSafe === TIKTOK_SAFE_ZONE, "Must return TIKTOK_SAFE_ZONE when useVideoSafeZone is true");
    assert(videoSafe.W_SAFE === 760, "Video safe zone width must be 760px");
    assert(videoSafe.BOTTOM_MAX_Y === 1520, "Video safe zone bottom must be 1520px");

    const carouselSafe = getSlideSafeZone({ topTitle: "", mainText: "", bottomText: "", useVideoSafeZone: false });
    assert(carouselSafe === CAROUSEL_SAFE_ZONE, "Must return CAROUSEL_SAFE_ZONE when useVideoSafeZone is false");
    assert(carouselSafe.W_SAFE === 900, "Carousel safe zone width must be 900px");
    assert(carouselSafe.BOTTOM_MAX_Y === 1700, "Carousel safe zone bottom must be 1700px");
  });

  // --- TEST SUITE 2: Line Width Invariant (No line > 760px) ---
  test("T2.1 wrapIntelligent strictly bounds line width <= 760px on regular text", () => {
    const text = "Това е прекрасно ислямско напомняне за важността на търпението в трудни моменти.";
    const lines = wrapIntelligent((t) => ctx.measureText(t).width, text, 760);
    for (const line of lines) {
      const w = ctx.measureText(line).width;
      assert(w <= 760, `Line "${line}" width ${w}px exceeds 760px`);
    }
  });

  test("T2.2 wrapIntelligent chunks extreme unbreakable words so all chunks <= 760px", () => {
    const unbreakable = "A".repeat(120);
    const lines = wrapIntelligent((t) => ctx.measureText(t).width, unbreakable, 760);
    assert(lines.length >= 3, `Must split 120-char unbreakable token into multiple lines (got ${lines.length})`);
    for (const line of lines) {
      const w = ctx.measureText(line).width;
      assert(w <= 760, `Chunk "${line}" width ${w}px exceeds 760px`);
    }
  });

  test("T2.3 Arabic script lines strictly fit within 760px corridor", () => {
    const arabic = "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ";
    const lines = wrapIntelligent((t) => ctx.measureText(t).width, arabic, 760);
    for (const line of lines) {
      const w = ctx.measureText(line).width;
      assert(w <= 760, `Arabic line width ${w}px exceeds 760px`);
    }
  });

  // --- TEST SUITE 3: Comprehensive Element Boundary Verification (X in [100, 860], Y in [300, 1520]) ---
  const testCases: { name: string; opts: CarouselSlideOptions }[] = [
    {
      name: "Standard Short Slide (Title + Quote + CTA + Footer + Badge)",
      opts: {
        useVideoSafeZone: true,
        sourceBadge: "Коран 2:255",
        topTitle: "СУРА АЛ-БАКАРА",
        mainText: "„Аллах! Няма друг бог освен Него – Вечноживия, Неизменния!“",
        bottomText: "Плъзнете наляво",
        footerText: "1 / 4",
      },
    },
    {
      name: "Long Scripture & Commentary (Dual Segments)",
      opts: {
        useVideoSafeZone: true,
        sourceBadge: "Хадис на Ан-Науауи #1",
        topTitle: "ДЕЙСТВИЯТА И НАМЕРЕНИЯТА",
        quoteText: "„Наистина делата се съдят според намеренията и всеки получава според това, което е възнамерил.“",
        commentaryText: "Този велик хадис е една трета от цялото ислямско знание според имам Шафии.",
        bottomText: "Споделете за награда",
        footerText: "2 / 4",
      },
    },
    {
      name: "High-Volume Text (350+ Chars)",
      opts: {
        useVideoSafeZone: true,
        sourceBadge: "Ислямска мъдрост",
        topTitle: "НАГРАДАТА НА ТЪРПЕНИЕТО",
        mainText:
          "Когато вярващият се изправи пред трудно изпитание на този свят, той трябва да знае, " +
          "че всяко страдание, всяка болка и всяка тревога, дори убождането от трън, " +
          "му се опрощават греховете заради това. Търпението е светлина в мрака.",
        bottomText: "Последвайте за още",
        footerText: "3 / 4",
      },
    },
    {
      name: "No Badge, No Footer, Only Title & Body & BottomText",
      opts: {
        useVideoSafeZone: true,
        topTitle: "ПОМНЕТЕ АЛЛАХ",
        mainText: "„Тези, които вярват и сърцата им се успокояват при споменаването на Аллах.“",
        bottomText: "Кажете Субханаллах",
      },
    },
    {
      name: "Only MainText (Minimalist Quote)",
      opts: {
        useVideoSafeZone: true,
        topTitle: "",
        mainText: "„И търпението ти е само с помощта на Аллах.“",
        bottomText: "",
        footerText: "",
      },
    },
    {
      name: "Multi-line CTA and Multi-line Top Title",
      opts: {
        useVideoSafeZone: true,
        sourceBadge: "Сура Юсуф 12:86",
        topTitle: "ОПЛАКВАНЕТО САМО ПРЕД АЛЛАХ В ТЕЖКИ И ТЪЖНИ МОМЕНТИ",
        mainText: "„Той каза: 'Оплаквам своята скръб и печал единствено пред Аллах.'“",
        bottomText: "Плъзнете наляво за следващия айят от красивата сура",
        footerText: "← Плъзнете наляво (4 / 4)",
      },
    },
  ];

  for (const tc of testCases) {
    test(`T3 [Element Boundaries] ${tc.name}`, () => {
      const layout = fitSlideLayout(ctx, tc.opts);
      const boxes = simulateRenderBoundingBoxes(ctx, tc.opts, layout);

      assert(boxes.length > 0, "Must produce rendered element boxes");

      for (const el of boxes) {
        const left = el.box.x;
        const right = el.box.x + el.box.width;
        const top = el.box.y;
        const bottom = el.box.y + el.box.height;

        // X corridor check: [100, 860]
        assert(
          left >= 100 - 0.5,
          `Element ${el.name} breaches left corridor (left=${left} < 100)`
        );
        assert(
          right <= 860 + 0.5,
          `Element ${el.name} breaches right corridor (right=${right} > 860)`
        );

        // Y corridor check: [300, 1520]
        assert(
          top >= 300 - 0.5,
          `Element ${el.name} breaches top safe boundary (top=${top} < 300)`
        );
        assert(
          bottom <= 1520 + 0.5,
          `Element ${el.name} breaches bottom safe boundary (bottom=${bottom} > 1520). 400px bottom clearance violated!`
        );

        // TikTok safe zone validator
        assert(
          isWithinSafeZone(el.box, "tiktok"),
          `Element ${el.name} failed isWithinSafeZone(box, 'tiktok'): box=${JSON.stringify(el.box)}`
        );
      }
    });
  }

  // --- TEST SUITE 4: Stress Testing Extreme Character Volumes & Gap Compression ---
  test("T4.1 Massive 600-char text fits safe zone with gap compression and scale down", () => {
    const monolithic =
      "Пратеникът на Аллах (с.а.с.) каза: „Чудно е делото на вярващия! Всяко негово дело е добро за него. " +
      "Ако го сполети радост, той благодари, и това е добро за него. Ако го сполети беда, той търпи, и това е добро за него. " +
      "И това не важи за никой друг, освен за вярващия.“ Този хадис ни учи, че вярващият никога не губи, " +
      "независимо през какви бури преминава. Всяко изпитание е пречистване, всяка радост е повод за благодарност.";

    const opts: CarouselSlideOptions = {
      useVideoSafeZone: true,
      topTitle: "ЧУДОТО НА ВЯРАТА",
      mainText: monolithic,
      bottomText: "Амин",
      footerText: "1 / 4",
    };

    const layout = fitSlideLayout(ctx, opts);
    const boxes = simulateRenderBoundingBoxes(ctx, opts, layout);

    for (const el of boxes) {
      assert(el.box.x >= 100 - 0.5, `${el.name} left >= 100`);
      assert(el.box.x + el.box.width <= 860 + 0.5, `${el.name} right <= 860`);
      assert(el.box.y >= 300 - 0.5, `${el.name} top >= 300`);
      assert(el.box.y + el.box.height <= 1520 + 0.5, `${el.name} bottom <= 1520 (actual: ${el.box.y + el.box.height})`);
    }
  });

  test("T4.2 12-repetition extreme text (400+ chars) with useVideoSafeZone: true fits strictly in TIKTOK_SAFE_ZONE.H_SAFE", () => {
    const massiveText = Array(12).fill("Търпението е светлина и спасение.").join(" ");
    const opts: CarouselSlideOptions = {
      useVideoSafeZone: true,
      topTitle: "ИЗПИТАНИЯ",
      mainText: massiveText,
      bottomText: "Край",
    };
    const fitted = fitSlideLayout(ctx, opts);
    assert(fitted.totalH <= TIKTOK_SAFE_ZONE.H_SAFE, `Total height (${fitted.totalH}) must fit within TIKTOK_SAFE_ZONE.H_SAFE (${TIKTOK_SAFE_ZONE.H_SAFE})`);
    const boxes = simulateRenderBoundingBoxes(ctx, opts, fitted);
    for (const el of boxes) {
      assert(el.box.y >= 300 - 0.5, `top >= 300`);
      assert(el.box.y + el.box.height <= 1520 + 0.5, `bottom <= 1520 (actual: ${el.box.y + el.box.height})`);
    }
  });

  // --- TEST SUITE 5: Boundary Pathological Text Size: What is the maximum text capacity? ---
  test("T5.1 Boundary search for maximum text capacity before safe corridor limit", () => {
    const sentence = "Търпението при беда носи опрощение и вечна награда в Дженнет. ";
    let count = 1;
    let maxSafeCount = 1;
    let maxSafeChars = 0;

    while (count <= 25) {
      const text = sentence.repeat(count);
      const opts: CarouselSlideOptions = {
        useVideoSafeZone: true,
        sourceBadge: "Напомняне",
        topTitle: "ИЗПИТАНИЯ",
        mainText: text,
        bottomText: "Последвайте ни",
        footerText: "1 / 4",
      };
      const layout = fitSlideLayout(ctx, opts);
      const boxes = simulateRenderBoundingBoxes(ctx, opts, layout);

      let overflowed = false;
      for (const el of boxes) {
        if (el.box.y + el.box.height > 1520.5 || el.box.y < 299.5) {
          overflowed = true;
          break;
        }
      }

      if (!overflowed) {
        maxSafeCount = count;
        maxSafeChars = text.length;
      } else {
        break;
      }
      count++;
    }

    console.log(`     [CAPACITY METRIC] Safe text capacity: ${maxSafeCount} repetitions (${maxSafeChars} chars) fit 100% within corridor`);
    assert(maxSafeChars >= 500, `Safe corridor must accommodate at least 500 characters (accommodates ${maxSafeChars})`);
  });

  // Summary
  console.log("\n=================================================================");
  console.log(`📊 ADVERSARIAL STRESS TEST SUMMARY`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log("=================================================================\n");

  if (failed > 0) {
    console.error("Failures:\n", failures.join("\n"));
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("FATAL ERROR IN HARNESS:", err);
  process.exit(1);
});
