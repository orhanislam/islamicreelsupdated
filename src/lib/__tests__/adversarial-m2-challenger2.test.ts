/**
 * ADVERSARIAL CHALLENGER 2 TEST SUITE: MILESTONE 2 (PHOTO & VIRAL THUMBNAIL)
 * File: src/lib/__tests__/adversarial-m2-challenger2.test.ts
 *
 * Empirical adversarial stress testing for Milestone 2:
 * 1. Style x Platform Profile Matrix: (lower-third, centered, minimal, bottom) x (tiktok, reels, shorts, universal, center)
 * 2. Canvas wrap & autoFit boundary stress (unbroken tokens, zero height, huge texts, orphan heuristics)
 * 3. SVG Thumbnail: optical centering (X=480/500/490/540), line wrapping, font downscaling (76->54px), XML escaping
 * 4. High-volume Property Fuzzing (3,000 iterations total)
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
  isWithinSafeZone,
  clampToSafeZone,
  doBoxesCollide,
  type BoundingBox,
  type SafeZoneGeometry,
  type PlatformSafeZoneProfile,
} from "../safe-zone";

import { wrap as photoWrap, autoFit as photoAutoFit } from "../render-photo";

import {
  escapeXml,
  estimateTitleWidth,
  wrapTitleText,
  fitThumbnailTitle,
  buildViralThumbnailSvg,
} from "../thumbnail.functions";

import {
  createCalibratedMeasure,
  createMockCanvasContext,
  computeHardenedPhotoLayout,
  type PhotoLayoutResult,
} from "./verify-photo-hardening.test";

let passedCount = 0;
let totalTests = 0;
const failures: { name: string; error: string; suite: string }[] = [];
let currentSuite = "";

function setSuite(suite: string) {
  currentSuite = suite;
  console.log(`\n=================================================================`);
  console.log(`⚡ [CHALLENGER 2] ${suite}`);
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

async function runAdversarialChallengerSuite() {
  console.log("=================================================================");
  console.log("🔥 ADVERSARIAL CHALLENGER 2: EMPIRICAL VERIFICATION HARNESS");
  console.log("=================================================================");

  // =========================================================================
  // SUITE 1: COMPLETE MATRIX (STYLES x PROFILES x REFERENCES x ARABIC)
  // =========================================================================
  setSuite("SUITE 1: 4 STYLES x 5 PROFILES FULL MATRIX (1,600 COMBINATIONS)");

  const styles: ("lower-third" | "centered" | "minimal" | "bottom")[] = [
    "lower-third",
    "centered",
    "minimal",
    "bottom",
  ];

  const profiles: PlatformSafeZoneProfile[] = ["tiktok", "reels", "shorts", "universal", "center"];

  const references = [
    undefined,
    "Коран 1:1",
    "Сахих ал-Бухари #6018 • За добротата към съседа",
    "Сура Ал-Бакара 2:255 • Аят ал-Курси (Върховното знамение)",
  ];

  const arabics = [
    undefined,
    "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
    "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ",
    "يَا أَيُّهَا الَّذِينَ آمَنُوا اسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ إِنَّ اللَّهَ مَعَ الصَّابِرِينَ وَلَا تَقُولُوا لِمَن يُقْتَلُ فِي سَبِيلِ اللَّهِ أَمْوَاتٌ بَلْ أَحْيَاءٌ وَلَٰكِن لَّا تَشْعُرُونَ",
  ];

  const bulgarianTexts = [
    "Мир и благодат.",
    "Аллах е Светлината на небесата и на земята. Неговата светлина има пример като ниша, в която има светилник.",
    "О, вие, които повярвахте, търсете помощ чрез търпението и молитвата! Наистина Аллах е с търпеливите. И не казвайте за онези, които са убити по пътя на Аллах: Мъртви са! Не, живи са, ала вие не съзнавате.",
    Array(12).fill("Поискайте опрощение от вашия Господ, защото Той е Многоопрощаващ.").join(" "),
    "Думи с <special> & 'кавички' \"quote\" и много-дълго-изречение-без-прекъсване-за-проверка-на-пренасянето.",
  ];

  test("S1.1: Comprehensive Exhaustive Grid (4 styles x 5 profiles x 4 refs x 4 arabics x 5 texts = 1,600 runs)", () => {
    let testedCombos = 0;
    let collisionFailures = 0;
    let containmentFailures = 0;

    for (const st of styles) {
      for (const pr of profiles) {
        const sz = getSafeZone(pr);
        for (const ref of references) {
          for (const ar of arabics) {
            for (const bg of bulgarianTexts) {
              testedCombos++;
              const layout = computeHardenedPhotoLayout({
                reference: ref,
                arabic: ar,
                bulgarian: bg,
                style: st,
                profile: pr,
              });

              if (!layout.isContained) {
                containmentFailures++;
                console.error(
                  `Containment violation in style=${st}, profile=${pr}, ref=${ref?.slice(0, 10)}, ar=${Boolean(ar)}`,
                  {
                    pill: layout.pill,
                    arabic: layout.arabic?.box,
                    bg: layout.bulgarian.box,
                    sz: {
                      left: sz.SAFE_LEFT,
                      right: sz.W - sz.SAFE_RIGHT,
                      top: sz.SAFE_TOP,
                      bottom: sz.BOTTOM_MAX_Y,
                    },
                  },
                );
              }

              const hasZeroCollisions =
                (ref && layout.arabic
                  ? !doBoxesCollide(layout.pill, layout.arabic.box, 24)
                  : true) &&
                (ref && !layout.arabic
                  ? !doBoxesCollide(layout.pill, layout.bulgarian.box, 24)
                  : true) &&
                (layout.arabic
                  ? !doBoxesCollide(layout.arabic.box, layout.bulgarian.box, 32)
                  : true);

              if (!hasZeroCollisions) {
                collisionFailures++;
                console.error(
                  `Collision detected in style=${st}, profile=${pr}, ref=${ref?.slice(0, 10)}, ar=${Boolean(ar)}`,
                );
              }
            }
          }
        }
      }
    }

    assertEq(testedCombos, 1600, "Must test exactly 1,600 combinations");
    assertEq(
      containmentFailures,
      0,
      `Containment failures must be 0, found ${containmentFailures}`,
    );
    assertEq(collisionFailures, 0, `Collision failures must be 0, found ${collisionFailures}`);
  });

  // =========================================================================
  // SUITE 2: CANVAS WRAP & AUTOFIT ADVERSARIAL BOUNDARIES
  // =========================================================================
  setSuite("SUITE 2: CANVAS WRAP & AUTOFIT ADVERSARIAL BOUNDARIES");

  test("S2.1: Empty and whitespace strings produce 0 lines safely", () => {
    const ctx = createMockCanvasContext(60);
    assertEq(photoWrap(ctx, "", 760).length, 0, "Empty string -> 0 lines");
    assertEq(photoWrap(ctx, "   \n\t  ", 760).length, 0, "Whitespace string -> 0 lines");
  });

  test("S2.2: Extreme single unbreakable string (200 chars) wraps without throwing and stays <= maxWidth", () => {
    const ctx = createMockCanvasContext(60);
    const extremeWord = "A".repeat(200);
    const lines = photoWrap(ctx, extremeWord, 760);
    assert(lines.length > 5, "200-char unbroken token must chunk across multiple lines");
    for (const l of lines) {
      assert(ctx.measureText(l).width <= 760, `Line width (${ctx.measureText(l).width}) <= 760`);
    }
  });

  test("S2.3: autoFit with 0 available height clamps to min font size safely", () => {
    const ctx = createMockCanvasContext(60);
    const fit = photoAutoFit(
      ctx,
      "Кратък текст",
      "'Cormorant Garamond'",
      700,
      760,
      0, // 0 height budget
      { min: 24, max: 84 },
      1.32,
    );
    assertEq(fit.fontSize, 24, "Must clamp to min fontSize (24px)");
    assert(fit.lines.length >= 1, "Must produce lines");
  });

  test("S2.4: autoFit decremental search monotonically chooses fitting size", () => {
    const ctx = createMockCanvasContext(60);
    const text = "Търпението е ключът към всяка благодат и напътствие в живота.";
    const fit1 = photoAutoFit(
      ctx,
      text,
      "'Cormorant Garamond'",
      700,
      760,
      400,
      { min: 24, max: 84 },
      1.32,
    );
    const fit2 = photoAutoFit(
      ctx,
      text,
      "'Cormorant Garamond'",
      700,
      760,
      200,
      { min: 24, max: 84 },
      1.32,
    );
    const fit3 = photoAutoFit(
      ctx,
      text,
      "'Cormorant Garamond'",
      700,
      760,
      100,
      { min: 24, max: 84 },
      1.32,
    );

    assert(fit1.fontSize >= fit2.fontSize, "Larger height budget must yield >= fontSize");
    assert(fit2.fontSize >= fit3.fontSize, "Medium height budget must yield >= fontSize");
    assert(fit1.totalHeight <= 400, "Fit 1 height <= 400");
    assert(fit2.totalHeight <= 200, "Fit 2 height <= 200");
  });

  test("S2.5: HTML tags stripped cleanly before rendering", () => {
    const layout = computeHardenedPhotoLayout({
      bulgarian: "<p>Първи абзац <b>удебелен</b></p><br/><span>Втори <i>курсив</i></span>",
      style: "centered",
    });
    for (const l of layout.bulgarian.lines) {
      assert(!l.includes("<p>"), "Must strip <p>");
      assert(!l.includes("<b>"), "Must strip <b>");
      assert(!l.includes("<span>"), "Must strip <span>");
    }
  });

  // =========================================================================
  // SUITE 3: SVG THUMBNAIL ENGINE & XML ENTITY ESCAPING
  // =========================================================================
  setSuite("SUITE 3: SVG THUMBNAIL HARDENING & OPTICAL CENTERING");

  test("S3.1: Optical Centering across all 5 profiles", () => {
    const expectations: Record<PlatformSafeZoneProfile, { centerX: number; wSafe: number }> = {
      tiktok: { centerX: 480, wSafe: 760 },
      reels: { centerX: 500, wSafe: 840 },
      shorts: { centerX: 490, wSafe: 820 },
      universal: { centerX: 480, wSafe: 760 },
      center: { centerX: 540, wSafe: 880 },
    };

    for (const [prof, exp] of Object.entries(expectations)) {
      const res = buildViralThumbnailSvg({
        title: "ЗАЩО АЛЛАХ НИ ИЗПИТВА",
        profile: prof,
      });

      assertEq(res.centerX, exp.centerX, `Profile ${prof} optical centerX must be ${exp.centerX}`);
      assert(
        res.svg.includes(`x="${exp.centerX}"`),
        `SVG must include x="${exp.centerX}" for ${prof}`,
      );
      assert(res.svg.includes(`text-anchor="middle"`), "SVG must have text-anchor=middle");

      // Verify right edge does not exceed W - SAFE_RIGHT
      const sz = getSafeZone(prof);
      const halfW = res.maxLineWidth / 2;
      const rightEdge = res.centerX + halfW;
      assert(
        rightEdge <= sz.W - sz.SAFE_RIGHT + 1,
        `Right edge (${rightEdge}) must not exceed ${sz.W - sz.SAFE_RIGHT} on ${prof}`,
      );
    }
  });

  test("S3.2: XML Entity Escaping Comprehensive Coverage", () => {
    const raw = `Hadith & Sunnah <5:2> "Quotes" 'Apostrophes' & <tag>`;
    const esc = escapeXml(raw);

    assertEq(
      esc,
      `Hadith &amp; Sunnah &lt;5:2&gt; &quot;Quotes&quot; &apos;Apostrophes&apos; &amp; &lt;tag&gt;`,
      "All 5 standard XML entities must be correctly escaped",
    );

    // Verify SVG generated with malicious input is well-formed XML
    const res = buildViralThumbnailSvg({
      title: `<script>alert("XSS & Exploit")</script>`,
    });

    assert(!res.svg.includes("<script>"), "Raw <script> must never exist in SVG output");
    assert(!res.svg.includes("</script>"), "Raw </script> must never exist in SVG output");
    assert(res.svg.includes("&lt;SCRIPT&gt;"), "Escaped &lt;SCRIPT&gt; must exist in SVG output");
    assert(res.svg.includes("&amp;"), "Escaped &amp; must exist in SVG output");
  });

  test("S3.3: Font Auto-Downscaling Range (76px down to 54px)", () => {
    const t1 = fitThumbnailTitle("АЯТ");
    assertEq(t1.fontSize, 76, "Short title -> 76px");

    const t2 = fitThumbnailTitle("КАК ДА ПОСТИГНЕМ ИСТИНСКО СПОКОЙСТВИЕ И ЩАСТИЕ");
    assertInRange(t2.fontSize, 62, 74, "Medium title -> 62-74px");

    const t3 = fitThumbnailTitle(
      "ТОВА Е НАЙ-ГОЛЯМАТА ТАЙНА ЗА СПАСЕНИЕТО НА ВСЕКИ ВЯРВАЩ МЮСЮЛМАНИН В СВЕТА И В ЗЕМНИЯ ЖИВОТ",
    );
    assertInRange(t3.fontSize, 54, 60, "Long title -> 54-60px");
    assert(t3.lines.length <= 4, "Lines <= 4");
  });

  test("S3.4: Max Line Clamping and Unbroken Title Chunks", () => {
    const hugeTitle = Array(40).fill("НАПОМНЯНЕ").join(" ");
    const fit = fitThumbnailTitle(hugeTitle, 760, 4);
    assertEq(fit.lines.length, 4, "Max lines must clamp strictly to 4");
    assertEq(fit.fontSize, 54, "Must clamp to minimum 54px");
  });

  // =========================================================================
  // SUITE 4: HIGH VOLUME RANDOMIZED ADVERSARIAL FUZZING (3,000 ITERATIONS)
  // =========================================================================
  setSuite("SUITE 4: 3,000 ITERATIONS ADVERSARIAL FUZZING");

  test("S4.1: 2,000 Randomized Photo Canvas Layout Invariant Stress Runs", () => {
    const sampleWords = [
      "Аллах",
      "Коран",
      "Хадис",
      "търпение",
      "молитва",
      "душа",
      "светлина",
      "небеса",
      "земя",
      "прошка",
      "милост",
      "спасение",
      "Рай",
      "знание",
      "мъдрост",
      "благодат",
      "напътствие",
      "добро",
      "сърце",
      "истина",
      "ALLAH",
      "QURAN",
      "12345",
      "СУРА:АЯТ",
      "„Цитат“",
      "съединение-слово",
      "СВРЪХДЪЛГАДУМАБЕЗПРЕКЪСВАНЕЗАПРОВЕРКАНАПРЕНАСЯНЕТО",
    ];

    const arWords = [
      "اللَّهُ",
      "الرَّحْمَٰنُ",
      "الرَّحِيمُ",
      "الْحَمْدُ",
      "رَبِّ",
      "الْعَالَمِينَ",
      "مَالِكِ",
      "يَوْمِ",
      "الدِّينِ",
      "إِيَّاكَ",
      "نَعْبُدُ",
      "الصِّرَاطَ",
    ];

    let passedRuns = 0;

    for (let i = 0; i < 2000; i++) {
      // 1 to 65 words (encompassing full Ayat al-Kursi)
      const numBgWords = 1 + Math.floor(Math.random() * 65);
      const bgWords = Array.from(
        { length: numBgWords },
        () => sampleWords[Math.floor(Math.random() * sampleWords.length)],
      );
      const bgText = bgWords.join(" ");

      const hasRef = Math.random() > 0.2;
      const refText = hasRef
        ? `Коран ${1 + Math.floor(Math.random() * 114)}:${1 + Math.floor(Math.random() * 100)}`
        : undefined;

      const hasAr = Math.random() > 0.3;
      const numArWords = 1 + Math.floor(Math.random() * 20);
      const arText = hasAr
        ? Array.from(
            { length: numArWords },
            () => arWords[Math.floor(Math.random() * arWords.length)],
          ).join(" ")
        : undefined;

      const st = styles[Math.floor(Math.random() * styles.length)];
      const pr = profiles[Math.floor(Math.random() * profiles.length)];

      const layout = computeHardenedPhotoLayout({
        reference: refText,
        arabic: arText,
        bulgarian: bgText,
        style: st,
        profile: pr,
      });

      const zeroCollision =
        (refText && layout.arabic ? !doBoxesCollide(layout.pill, layout.arabic.box, 24) : true) &&
        (refText && !layout.arabic
          ? !doBoxesCollide(layout.pill, layout.bulgarian.box, 24)
          : true) &&
        (layout.arabic ? !doBoxesCollide(layout.arabic.box, layout.bulgarian.box, 32) : true);

      if (!layout.isContained || !zeroCollision) {
        throw new Error(
          `Fuzz failure at iteration ${i}: contained=${layout.isContained}, zeroCollision=${zeroCollision}, style=${st}, profile=${pr}`,
        );
      }
      passedRuns++;
    }

    assertEq(passedRuns, 2000, "All 2,000 photo fuzzing iterations must pass 100%");
  });

  test("S4.2: 1,000 Randomized Viral Thumbnail SVG Invariant Stress Runs", () => {
    const vocab = [
      "АЛЛАХ",
      "КОРАН",
      "РАЙ",
      "МОЛИТВА",
      "СМЪРТ",
      "ВЪЗКРЕСЕНИЕ",
      "СЪДЕН ДЕН",
      "ТАЙНАТА",
      "НА",
      "УСПЕХА",
      "В",
      "ИСЛЯМА",
      "И",
      "ДУАТА",
      "СПАСЕНИЕ",
      "СВРЪХДЪЛГАЗАГЛАВНАЧАСТБЕЗСПАЦИИ",
      "<ТАГ>",
      '"КАВИЧКИ"',
      "&АМПЕРСАНД",
      "ALLAH",
      "QURAN",
      "VIRAL",
      "TIKTOK",
      "100%",
      "СВЕТЛИНА",
      "МЪДРОСТ",
    ];

    let passedSvgRuns = 0;

    for (let i = 0; i < 1000; i++) {
      const numWords = 1 + Math.floor(Math.random() * 20);
      const titleWords = Array.from(
        { length: numWords },
        () => vocab[Math.floor(Math.random() * vocab.length)],
      );
      const rawTitle = titleWords.join(" ");
      const pr = profiles[Math.floor(Math.random() * profiles.length)];

      const res = buildViralThumbnailSvg({
        title: rawTitle,
        profile: pr,
      });

      const sz = getSafeZone(pr);
      const halfW = res.maxLineWidth / 2;
      const rightEdge = res.centerX + halfW;
      const leftEdge = res.centerX - halfW;

      if (rightEdge > sz.W - sz.SAFE_RIGHT + 1) {
        throw new Error(
          `SVG right corridor breach at fuzz iteration ${i}: rightEdge=${rightEdge} > max=${sz.W - sz.SAFE_RIGHT} on ${pr}`,
        );
      }

      if (leftEdge < sz.SAFE_LEFT - 1) {
        throw new Error(
          `SVG left corridor breach at fuzz iteration ${i}: leftEdge=${leftEdge} < min=${sz.SAFE_LEFT} on ${pr}`,
        );
      }

      if (res.lines.length > 4) {
        throw new Error(`SVG lines exceeded 4 at fuzz iteration ${i}: ${res.lines.length}`);
      }

      if (res.svg.includes("<script>") || res.svg.includes("</script>")) {
        throw new Error(`Unescaped script tag in SVG at fuzz iteration ${i}`);
      }

      passedSvgRuns++;
    }

    assertEq(passedSvgRuns, 1000, "All 1,000 thumbnail SVG fuzzing iterations must pass 100%");
  });

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log(`\n=================================================================`);
  console.log(`📊 ADVERSARIAL CHALLENGER 2 SUMMARY: ${passedCount} / ${totalTests} TESTS PASSED`);
  if (failures.length > 0) {
    console.error(`❌ FAILURES DETECTED (${failures.length}):`);
    failures.forEach((f) => console.error(`  - [${f.suite}] ${f.name}: ${f.error}`));
    throw new Error(`${failures.length} test(s) failed in Challenger 2 suite`);
  } else {
    console.log(`🎉 ALL ADVERSARIAL CHALLENGE TESTS PASSED EMPIRICALLY! (100% SUCCESS)`);
  }
  console.log(`=================================================================\n`);
}

runAdversarialChallengerSuite().catch((err) => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
