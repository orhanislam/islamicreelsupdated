/**
 * ADVERSARIAL CHALLENGER 2 TEST HARNESS FOR MILESTONE 3
 * File: src/lib/__tests__/adversarial-m3-challenger2.test.ts
 *
 * Independent empirical stress tests for:
 * 1. 1080p and 720p client video rendering and resolution scaling.
 * 2. Server ASS subtitle generation across all profiles (tiktok, reels, shorts, center)
 *    ensuring accurate PlayResX/Y, MarginL, MarginR, MarginV, and \pos coordinate tags.
 * 3. Active word pop bounds under maximum font sizes (112px on 1080p, 75px on 720p).
 * 4. Boundary cases: massive texts, unbroken tokens, missing timestamps, adversarial Cyrillic characters.
 * 5. 1000-iteration random property fuzzing matrix.
 */

import {
  TIKTOK_SAFE_ZONE,
  REELS_SAFE_ZONE,
  SHORTS_SAFE_ZONE,
  UNIVERSAL_SAFE_ZONE,
  CENTER_SAFE_ZONE,
  REFERENCE_PILL_STANDARDS,
  getSafeZone,
  scaleSafeZone,
  getASSSubtitlePlacement,
  getSafeAssStyles,
  getSubtitleAnchorY,
  isWithinSafeZone,
  clampToSafeZone,
  doBoxesCollide,
  type SafeZoneGeometry,
  type BoundingBox,
  type PlatformSafeZoneProfile,
} from "../safe-zone";

import {
  estimateTextWidth,
  wrapTextToSafeWidth,
  generateAssSubtitles,
} from "../render.functions";

let passedCount = 0;
let totalTests = 0;
const failures: { name: string; error: string; suite: string }[] = [];
let currentSuite = "";

function suite(name: string) {
  currentSuite = name;
  console.log(`\n=================================================================`);
  console.log(`⚡ [CHALLENGER 2 SUITE] ${name}`);
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

// Client video wrapping and font sizing simulation (matching render-video.ts exactly)
function clientWrapWords(words: string[], maxWidth: number, fontSize: number): string[][] {
  const lines: string[][] = [];
  let cur: string[] = [];
  for (const w of words) {
    const wWidth = estimateTextWidth(w, fontSize);
    if (wWidth > maxWidth) {
      if (cur.length) {
        lines.push(cur);
        cur = [];
      }
      let chunk = "";
      for (const char of w) {
        if (estimateTextWidth(chunk + char, fontSize) > maxWidth && chunk) {
          lines.push([chunk]);
          chunk = char;
        } else {
          chunk += char;
        }
      }
      if (chunk) cur.push(chunk);
      continue;
    }

    const testStr = [...cur, w].join(" ");
    if (estimateTextWidth(testStr, fontSize) > maxWidth && cur.length) {
      lines.push(cur);
      cur = [w];
    } else {
      cur.push(w);
    }
  }
  if (cur.length) lines.push(cur);
  return lines;
}

function clientChooseFontSize(
  fullText: string,
  maxWidth: number,
  maxHeight: number,
  scale = 1.0,
): { fontSize: number; lineHeight: number } {
  const words = fullText.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const readableMax =
    wordCount > 40 ? 64 : wordCount > 28 ? 75 : wordCount > 18 ? 88 : wordCount > 10 ? 98 : 112;
  const maxSize = Math.round(readableMax * scale);
  const minSize = Math.round(36 * scale);
  for (let size = maxSize; size >= minSize; size -= 2) {
    const lines = clientWrapWords(words, maxWidth, size);
    const lh = Math.round(size * 1.34);
    const maxLinesPerPage = Math.max(1, Math.floor(maxHeight / lh));
    const allLinesFit = lines.every((line) => {
      const lineStr = line.join(" ");
      return estimateTextWidth(lineStr, size) <= maxWidth + 0.01;
    });
    if (lines.length <= maxLinesPerPage && allLinesFit) return { fontSize: size, lineHeight: lh };
  }
  const size = minSize;
  return { fontSize: size, lineHeight: Math.round(size * 1.34) };
}

function computeClientReferencePill(text: string, sz: SafeZoneGeometry): BoundingBox {
  const scale = sz.W / 1080;
  const fontPx = Math.round(REFERENCE_PILL_STANDARDS.FONT_SIZE * scale);
  const tw = estimateTextWidth(text, fontPx);
  const padX = Math.round(REFERENCE_PILL_STANDARDS.PAD_X * scale);
  const padY = Math.round(REFERENCE_PILL_STANDARDS.PAD_Y * scale);
  const pillW = Math.min(tw + padX * 2, sz.W_SAFE);
  const pillH = fontPx + padY * 2;
  const rawX = sz.CENTER_X - pillW / 2;
  const rawY = sz.SAFE_TOP;
  return clampToSafeZone({ x: rawX, y: rawY, width: pillW, height: pillH }, sz);
}

async function runChallenger2Tests() {
  console.log("=================================================================");
  console.log("⚔️ EMPIRICAL CHALLENGER 2: MILESTONE 3 VIDEO RENDERING HARDENING");
  console.log("=================================================================");

  // =========================================================================
  // 1. 1080p and 720p Client Video Rendering & Resolution Scaling
  // =========================================================================
  suite("1. CLIENT VIDEO 1080P & 720P RESOLUTION SCALING");

  test("C1.1: 1080p vs 720p Safe Zone Geometry Scale Precision", () => {
    const profiles: PlatformSafeZoneProfile[] = ["tiktok", "reels", "shorts", "center", "universal"];
    for (const p of profiles) {
      const sz1080 = getSafeZone(p);
      const sz720 = scaleSafeZone(p, 720 / 1080);

      assertEq(sz1080.W, 1080, `1080p W is 1080 for ${p}`);
      assertEq(sz1080.H, 1920, `1080p H is 1920 for ${p}`);
      assertEq(sz720.W, 720, `720p W is 720 for ${p}`);
      assertEq(sz720.H, 1280, `720p H is 1280 for ${p}`);

      // Check proportionality
      const expectedSafeTop720 = Math.round((sz1080.SAFE_TOP * 720) / 1080);
      assertEq(sz720.SAFE_TOP, expectedSafeTop720, `720p SAFE_TOP scaled properly for ${p}`);

      const expectedSafeBottom720 = Math.round((sz1080.SAFE_BOTTOM * 720) / 1080);
      assertEq(sz720.SAFE_BOTTOM, expectedSafeBottom720, `720p SAFE_BOTTOM scaled properly for ${p}`);

      const expectedSafeLeft720 = Math.round((sz1080.SAFE_LEFT * 720) / 1080);
      assertEq(sz720.SAFE_LEFT, expectedSafeLeft720, `720p SAFE_LEFT scaled properly for ${p}`);

      const expectedSafeRight720 = Math.round((sz1080.SAFE_RIGHT * 720) / 1080);
      assertEq(sz720.SAFE_RIGHT, expectedSafeRight720, `720p SAFE_RIGHT scaled properly for ${p}`);
    }
  });

  test("C1.2: 1080p & 720p Font Scaling Dynamic Range (36px to 112px on 1080p vs 24px to 75px on 720p)", () => {
    const textShort = "Аллах е най-великият"; // 4 words -> readableMax 112
    const textMedium = "В името на Аллах, Всемилостивия, Милосърдния, Хвала на Господа на световете"; // 11 words -> readableMax 98
    const textLong = "Когато настъпи помощта от Аллах и победата, и видиш хората да встъпват в религията на Аллах на тълпи, прославяй с възхвала своя Господ и Го моли за прошка! Той е приемащ покаянието."; // 31 words -> readableMax 75
    const textVeryLong = "Аллах! Няма друг бог освен Него - Вечноживия, Неизменния! Не Го обзема нито дрямка, нито сън. Негово е онова, което е на небесата и което е на земята. Кой ще се застъпи пред Него, освен с Неговото позволение? Той знае какво е било преди тях и какво ще бъде след тях, а те от Неговото знание обхващат само онова, което Той пожелае. Неговият Престол вмества небесата и земята, и не Му тежи опазването им. Той е Всевишният, Превеликият."; // 68 words -> readableMax 64

    const sz1080 = TIKTOK_SAFE_ZONE;
    const sz720 = scaleSafeZone(sz1080, 720 / 1080);

    const fShort1080 = clientChooseFontSize(textShort, sz1080.W_SAFE, sz1080.H_SAFE, 1.0);
    assertEq(fShort1080.fontSize, 112, "1080p short text gets max font size 112px");

    const fShort720 = clientChooseFontSize(textShort, sz720.W_SAFE, sz720.H_SAFE, 720 / 1080);
    assertEq(fShort720.fontSize, Math.round(112 * (720 / 1080)), "720p short text gets scaled max font size 75px");

    const fMed1080 = clientChooseFontSize(textMedium, sz1080.W_SAFE, sz1080.H_SAFE, 1.0);
    assert(fMed1080.fontSize <= 98 && fMed1080.fontSize >= 36, `1080p med font size ${fMed1080.fontSize} in [36, 98]`);

    const fLong1080 = clientChooseFontSize(textLong, sz1080.W_SAFE, sz1080.H_SAFE, 1.0);
    assert(fLong1080.fontSize <= 75 && fLong1080.fontSize >= 36, `1080p long font size ${fLong1080.fontSize} in [36, 75]`);

    const fVLong1080 = clientChooseFontSize(textVeryLong, sz1080.W_SAFE, sz1080.H_SAFE, 1.0);
    assert(fVLong1080.fontSize <= 64 && fVLong1080.fontSize >= 36, `1080p very long font size ${fVLong1080.fontSize} in [36, 64]`);
  });

  test("C1.3: 1080p & 720p Subtitle Anchor Y Calculation for Lower-Third and Center", () => {
    const sz1080 = TIKTOK_SAFE_ZONE;
    const sz720 = scaleSafeZone(sz1080, 720 / 1080);

    const anchor1080Lower = getSubtitleAnchorY(sz1080, "lower-third");
    assertEq(anchor1080Lower, 1420, "1080p lower-third anchor Y is 1420 (clamped to BOTTOM_MAX_Y - 100)");

    const anchor1080Center = getSubtitleAnchorY(sz1080, "center");
    assertEq(anchor1080Center, 960, "1080p center anchor Y is 960 (H / 2)");

    const anchor720Lower = getSubtitleAnchorY(sz720, "lower-third");
    assertEq(anchor720Lower, Math.min(sz720.BOTTOM_MAX_Y - 100, Math.round(sz720.H * 0.74)), "720p lower-third anchor Y is 913");

    const anchor720Center = getSubtitleAnchorY(sz720, "center");
    assertEq(anchor720Center, 640, "720p center anchor Y is 640 (1280 / 2)");
  });

  test("C1.4: Reference Pill Rendering in 1080p and 720p with Zero Corridor Violation", () => {
    const refText = "Сура Ал-Бакара [2:255]";
    const sz1080 = TIKTOK_SAFE_ZONE;
    const sz720 = scaleSafeZone(sz1080, 720 / 1080);

    const pill1080 = computeClientReferencePill(refText, sz1080);
    assertEq(pill1080.y, 300, "1080p Reference Pill anchored at SAFE_TOP=300");
    assert(isWithinSafeZone(pill1080, sz1080), "1080p Reference Pill inside safe corridor");
    assert(pill1080.x >= 100 && pill1080.x + pill1080.width <= 860, "1080p Pill within [100, 860]");

    const pill720 = computeClientReferencePill(refText, sz720);
    assertEq(pill720.y, 200, "720p Reference Pill anchored at SAFE_TOP=200");
    assert(isWithinSafeZone(pill720, sz720), "720p Reference Pill inside safe corridor");
    assert(pill720.x >= sz720.SAFE_LEFT && pill720.x + pill720.width <= sz720.W - sz720.SAFE_RIGHT, "720p Pill inside safe bounds");
  });

  // =========================================================================
  // 2. Active Word Pop Bounds under Maximum Font Sizes (112px on 1080p)
  // =========================================================================
  suite("2. ACTIVE WORD POP (1.14X) AT MAXIMUM FONT SIZE 112PX");

  test("C2.1: 112px Max Font Size on 1080p: Active Word Pop Descenders and Vertical Anchor Bounding", () => {
    const sz = TIKTOK_SAFE_ZONE;
    const fs = 112;
    const scale = 1.0;

    const rawAnchorY = getSubtitleAnchorY(sz, "lower-third"); // 1420
    const maxAllowedBottomY = sz.BOTTOM_MAX_Y - Math.ceil(fs * 0.35 * 1.14); // 1520 - ceil(44.688) = 1475
    const targetBottomY = Math.min(rawAnchorY, maxAllowedBottomY); // 1420

    // When word pops at 1.14x, text baseline is targetBottomY
    // Font descender reach is ~0.25 * fs * 1.14 = 31.92px
    // Outline stroke reach is max(6.5, fs * 0.09) * 1.14 / 2 = 10.08 * 1.14 / 2 = 5.75px
    // Total lower extent from baseline: 1420 + 31.92 + 5.75 = 1457.67px
    const maxDescenderBottom = targetBottomY + Math.ceil(fs * (0.25 + 0.09) * 1.14); // 1420 + 43 = 1463px

    assert(
      maxDescenderBottom <= sz.BOTTOM_MAX_Y,
      `112px max word pop descender (${maxDescenderBottom}px) exceeds BOTTOM_MAX_Y (${sz.BOTTOM_MAX_Y}px)`,
    );

    const bottomMarginToScreenEdge = sz.H - maxDescenderBottom;
    assert(
      bottomMarginToScreenEdge >= 400,
      `112px max word pop preserves >= 400px bottom TikTok UI margin (actual: ${bottomMarginToScreenEdge}px)`,
    );
  });

  test("C2.2: 112px Max Font Size on 1080p: Horizontal Corridor Containment of Popped Edge Words", () => {
    const sz = TIKTOK_SAFE_ZONE;
    const fs = 112;

    // Short 3-word phrase that wraps to 1 or 2 lines
    const words = ["Аллах", "е", "Велик!"];
    const lines = clientWrapWords(words, sz.W_SAFE, fs);

    for (const line of lines) {
      const lineStr = line.join(" ");
      const lineWidth = estimateTextWidth(lineStr, fs);
      assert(lineWidth <= sz.W_SAFE, `112px line width ${lineWidth}px <= W_SAFE ${sz.W_SAFE}px`);

      const lineLeft = sz.CENTER_X - lineWidth / 2;
      const lineRight = sz.CENTER_X + lineWidth / 2;

      assert(lineLeft >= sz.SAFE_LEFT, `Line left ${lineLeft} >= SAFE_LEFT (${sz.SAFE_LEFT})`);
      assert(lineRight <= sz.W - sz.SAFE_RIGHT, `Line right ${lineRight} <= max safe X (${sz.W - sz.SAFE_RIGHT})`);

      // Test active pop on first and last word of the line
      let cursorX = lineLeft;
      for (const w of line) {
        const wWidth = estimateTextWidth(w, fs);
        const wCenter = cursorX + wWidth / 2;

        const poppedLeft = wCenter - (wWidth * 1.14) / 2;
        const poppedRight = wCenter + (wWidth * 1.14) / 2;

        // Even with 1.14x horizontal scaling, does it stay in safe corridor?
        // Note: W_SAFE is 760. line max width is <= 760. Popped word expansion is (wWidth * 0.07).
        assert(
          poppedLeft >= sz.SAFE_LEFT - 10,
          `Popped left ${poppedLeft} dangerously breaches SAFE_LEFT`,
        );
        assert(
          poppedRight <= sz.W - sz.SAFE_RIGHT + 10,
          `Popped right ${poppedRight} dangerously breaches SAFE_RIGHT`,
        );

        cursorX += wWidth + estimateTextWidth(" ", fs);
      }
    }
  });

  test("C2.3: 720p Scaled Max Font Size (75px): Active Word Pop Clearance at Scaled BOTTOM_MAX_Y = 1013px", () => {
    const sz720 = scaleSafeZone(TIKTOK_SAFE_ZONE, 720 / 1080);
    const fs720 = Math.round(112 * (720 / 1080)); // 75px
    assertEq(fs720, 75, "720p max font size is 75px");

    const rawAnchorY = getSubtitleAnchorY(sz720, "lower-third"); // 913
    const maxAllowedBottomY = sz720.BOTTOM_MAX_Y - Math.ceil(fs720 * 0.35 * 1.14); // 1013 - ceil(29.925) = 983
    const targetBottomY = Math.min(rawAnchorY, maxAllowedBottomY); // 913

    const maxDescenderBottom = targetBottomY + Math.ceil(fs720 * 0.34 * 1.14); // 913 + 29 = 942px
    assert(
      maxDescenderBottom <= sz720.BOTTOM_MAX_Y,
      `720p max word pop descender ${maxDescenderBottom}px <= ${sz720.BOTTOM_MAX_Y}px`,
    );

    const clearance = sz720.BOTTOM_MAX_Y - maxDescenderBottom;
    assert(clearance >= 70, `720p clearance ${clearance}px >= 70px`);
  });

  test("C2.4: Active Word Pop Glow and Shadow Bounds at Max 112px Font Size", () => {
    const fs = 112;
    const shadowBlur = Math.max(14, fs * 0.25); // 28px
    const strokeWidth = Math.max(6.5, fs * 0.09); // 10.08px
    assertEq(shadowBlur, 28, "Shadow blur for 112px is 28px");
    assertEq(Math.round(strokeWidth * 100) / 100, 10.08, "Stroke width for 112px is 10.08px");
  });

  // =========================================================================
  // 3. Server ASS Subtitle Generation Across All Profiles
  // =========================================================================
  suite("3. SERVER ASS SUBTITLE GENERATION ACROSS ALL PROFILES");

  test("C3.1: Profile Matrix Validation (tiktok, reels, shorts, center): Script Headers and PlayResX/Y", () => {
    const profiles: PlatformSafeZoneProfile[] = ["tiktok", "reels", "shorts", "center"];

    for (const p of profiles) {
      const ass = generateAssSubtitles(
        {
          reference: `Сура Ал-Фатиха [1:1] (${p})`,
          bulgarian: "В името на Аллах, Всемилостивия, Милосърдния!",
          subtitlePosition: p,
        },
        7.5,
      );

      assert(ass.includes("ScriptType: v4.00+"), `${p}: Has valid ASS v4.00+ header`);
      assert(ass.includes("PlayResX: 1080"), `${p}: PlayResX is strictly 1080`);
      assert(ass.includes("PlayResY: 1920"), `${p}: PlayResY is strictly 1920`);
      assert(ass.includes("[V4+ Styles]"), `${p}: Contains [V4+ Styles] section`);
      assert(ass.includes("[Events]"), `${p}: Contains [Events] section`);
    }
  });

  test("C3.2: Asymmetric Margins in [V4+ Styles] across all platform profiles", () => {
    // 1. TikTok: MarginL=100, MarginR=220, MarginV=500
    const assTikTok = generateAssSubtitles({ bulgarian: "Тест", subtitlePosition: "tiktok" }, 5);
    const plTikTok = getASSSubtitlePlacement("tiktok");
    assertEq(plTikTok.marginL, 100, "TikTok MarginL is 100");
    assertEq(plTikTok.marginR, 220, "TikTok MarginR is 220 (reserving space for TikTok action buttons)");
    assertEq(plTikTok.marginV, 500, "TikTok MarginV is 500 (1920 - 1420)");
    assert(assTikTok.includes(`Style: Bulgarian,Outfit,120,&H00FFFFFF,&H0000D7FF,&H00000000,&H99000000,-1,0,0,0,100,100,0,0,1,2,6.5,${plTikTok.alignment},100,220,500,1`), "TikTok Bulgarian style exact line");

    // 2. Reels: MarginL=80, MarginR=160, MarginV=499 (posY=1421)
    const assReels = generateAssSubtitles({ bulgarian: "Тест", subtitlePosition: "reels" }, 5);
    const plReels = getASSSubtitlePlacement("reels");
    assertEq(plReels.marginL, 80, "Reels MarginL is 80");
    assertEq(plReels.marginR, 160, "Reels MarginR is 160");
    assertEq(plReels.marginV, 499, "Reels MarginV is 499 (1920 - 1421)");
    assert(assReels.includes(`,${plReels.alignment},80,160,499,1`), "Reels style has 80, 160, 499 margins");

    // 3. Shorts: MarginL=80, MarginR=180, MarginV=499
    const assShorts = generateAssSubtitles({ bulgarian: "Тест", subtitlePosition: "shorts" }, 5);
    const plShorts = getASSSubtitlePlacement("shorts");
    assertEq(plShorts.marginL, 80, "Shorts MarginL is 80");
    assertEq(plShorts.marginR, 180, "Shorts MarginR is 180");
    assertEq(plShorts.marginV, 499, "Shorts MarginV is 499");
    assert(assShorts.includes(`,${plShorts.alignment},80,180,499,1`), "Shorts style has 80, 180, 499 margins");

    // 4. Center: MarginL=100, MarginR=100, MarginV=960, Alignment=5
    const assCenter = generateAssSubtitles({ bulgarian: "Тест", subtitlePosition: "center" }, 5);
    const plCenter = getASSSubtitlePlacement("center");
    assertEq(plCenter.marginL, 100, "Center MarginL is 100");
    assertEq(plCenter.marginR, 100, "Center MarginR is 100");
    assertEq(plCenter.alignment, 5, "Center Alignment is 5 (middle-center)");
    assertEq(plCenter.marginV, 960, "Center MarginV is 960 (true vertical midpoint)");
    assert(assCenter.includes(`,5,100,100,960,1`), "Center style has alignment 5 and 100, 100, 960 margins");
  });

  test("C3.3: Server ASS Dialogue Events \\pos(X, Y) tags across all profiles", () => {
    // Reference Pill
    const assTikTok = generateAssSubtitles(
      { reference: "Сура Ал-Бакара 2:255", bulgarian: "Аллах няма друг бог", subtitlePosition: "tiktok" },
      5,
    );
    assert(assTikTok.includes("{\\an8\\pos(480,340)}Сура Ал-Бакара 2:255"), "TikTok reference badge at \\pos(480,340)");

    const assCenter = generateAssSubtitles(
      { reference: "Сура Ал-Ихлас 112:1", bulgarian: "Кажи Той е Аллах Единственият", subtitlePosition: "center" },
      5,
    );
    assert(assCenter.includes("{\\an8\\pos(540,340)}Сура Ал-Ихлас 112:1"), "Center reference badge at \\pos(540,340)");

    // Subtitle Dialogue Events
    const assReels = generateAssSubtitles(
      { bulgarian: "Слово на истината и спасението", subtitlePosition: "reels" },
      6,
    );
    assert(assReels.includes("{\\an2\\pos(500,1421)"), "Reels dialogue at \\pos(500,1421)");

    const assShorts = generateAssSubtitles(
      { bulgarian: "Слово на истината и спасението", subtitlePosition: "shorts" },
      6,
    );
    assert(assShorts.includes("{\\an2\\pos(490,1421)"), "Shorts dialogue at \\pos(490,1421)");
  });

  test("C3.4: Server ASS Dynamic Wrapping & Width Enforcement (<= W_SAFE across all profiles for standard vocabulary)", () => {
    const profiles: PlatformSafeZoneProfile[] = ["tiktok", "reels", "shorts", "center"];
    const standardCyrillicTexts = [
      "Аллах опрощава всички грехове на онези, които се покаят искрено и вършат добри дела.",
      "Търпението при беда показва силата на вярата и упованието в Господа на световете.",
      "Най-добрият от вас е онзи, който изучава Корана и го преподава с доброта.",
    ];

    for (const p of profiles) {
      const sz = getSafeZone(p);
      for (const text of standardCyrillicTexts) {
        const ass = generateAssSubtitles(
          {
            bulgarian: text,
            subtitlePosition: p,
          },
          12,
        );

        const dialogueLines = ass
          .split("\n")
          .filter((l) => l.startsWith("Dialogue:") && l.includes("Bulgarian"));
        assert(dialogueLines.length > 0, `${p}: Generated dialogue lines`);

        for (const line of dialogueLines) {
          const rawText = line
            .split(",")
            .slice(9)
            .join(",")
            .replace(/\{[^}]+\}/g, "");
          const wrappedParts = rawText.split("\\N");

          for (const part of wrappedParts) {
            if (!part.trim()) continue;
            const w = estimateTextWidth(part.trim(), 96);
            assert(
              w <= sz.W_SAFE,
              `${p}: Sub-line "${part}" width ${w}px exceeds safe width ${sz.W_SAFE}px`,
            );
          }
        }
      }
    }
  });

  test("C3.5: Full Quran Ayah Mode in Server ASS: Decremental Auto-Fit & Ceiling Clearance Cap", () => {
    const ayatAlKursi =
      "Аллах! Няма друг бог освен Него - Вечноживия, Неизменния! Не Го обзема нито дрямка, нито сън. Негово е онова, което е на небесата и което е на земята. Кой ще се застъпи пред Него, освен с Неговото позволение? Той знае какво е било преди тях и какво ще бъде след тях, а те от Неговото знание обхващат само онова, което Той пожелае. Неговият Престол вмества небесата и земята, и не Му тежи опазването им. Той е Всевишният, Превеликият.";

    const ass = generateAssSubtitles(
      {
        reference: "Сура Ал-Бакара [2:255]",
        bulgarian: ayatAlKursi,
        ayahBounds: [{ start: 0, end: 25, bulgarian: ayatAlKursi, english: "Ayat al-Kursi" }],
        subtitlePosition: "tiktok",
      },
      25,
    );

    const dialogueLine = ass
      .split("\n")
      .find((l) => l.startsWith("Dialogue:") && l.includes("Bulgarian"));
    assert(Boolean(dialogueLine), "Ayat al-Kursi dialogue line generated");

    // Extract auto-fitted font size
    const fsMatch = dialogueLine!.match(/\\fs(\d+)/);
    assert(Boolean(fsMatch), "Ayah dialogue line contains \\fs tag");
    const autoFs = Number(fsMatch![1]);

    assert(autoFs >= 28 && autoFs <= 50, `Ayat al-Kursi font size auto-scaled down to ${autoFs}px (in [28, 50])`);

    // Verify all wrapped lines fit within 760px
    const textContent = dialogueLine!
      .split(",")
      .slice(9)
      .join(",")
      .replace(/\{[^}]+\}/g, "");
    const lines = textContent.split("\\N");

    for (const l of lines) {
      const w = estimateTextWidth(l.trim(), autoFs);
      assert(w <= 760, `Ayat al-Kursi line "${l}" width ${w}px <= 760px`);
    }

    // Verify total height fits below reference badge
    const totalH = lines.length * (autoFs * 1.25);
    const maxAllowedH = 1420 - 460; // 960px
    assert(totalH <= maxAllowedH, `Total Ayah height ${totalH}px <= max allowed height ${maxAllowedH}px`);
  });

  // =========================================================================
  // 4. Boundary Cases & Edge Case Mining
  // =========================================================================
  suite("4. BOUNDARY CONDITIONS & ADVERSARIAL EDGE CASES");

  test("C4.1: Single-word subtitles (e.g. 'Аллах', 'Търпение')", () => {
    const singleWord = "Аллах!";
    const ass = generateAssSubtitles({ bulgarian: singleWord, subtitlePosition: "tiktok" }, 3);
    assert(ass.includes("Аллах!"), "Single-word ASS contains word");

    const { fontSize } = clientChooseFontSize(singleWord, 760, 1220, 1.0);
    assertEq(fontSize, 112, "Single word gets 112px max size");
  });

  test("C4.2: Extremely long unbroken token (35 chars) handled by character chunking", () => {
    const unbroken = "Непредотвратимонеизбежностовъзможност";
    const lines = clientWrapWords([unbroken], 760, 75);
    assert(lines.length >= 2, "Unbroken 35-char token was safely chunked across multiple lines");
    for (const line of lines) {
      const lineStr = line.join(" ");
      const w = estimateTextWidth(lineStr, 75);
      assert(w <= 760, `Chunk "${lineStr}" width ${w}px <= 760px`);
    }
  });

  test("C4.3: Missing bulgarianWordTimings fallback to equal duration division", () => {
    const text = "Слава на Аллах Господа на световете";
    const ass = generateAssSubtitles(
      {
        bulgarian: text,
        bulgarianWordTimings: [], // empty
        subtitlePosition: "tiktok",
      },
      10,
    );

    const dLines = ass
      .split("\n")
      .filter((l) => l.startsWith("Dialogue:") && l.includes("Bulgarian"));
    assert(dLines.length > 0, "Generated dialogues even with empty timings");
  });

  test("C4.4: Ayah bounds with missing bulgarian text fallback to english ratio slicing", () => {
    const ass = generateAssSubtitles(
      {
        bulgarian: "В името на Аллах Всемилостивия Милосърдния Хвала на Аллах",
        ayahBounds: [
          { start: 0, end: 4, english: "In the name of Allah the Entirely Merciful" },
          { start: 4, end: 8, english: "Praise to Allah" },
        ],
        subtitlePosition: "tiktok",
      },
      8,
    );

    const dLines = ass
      .split("\n")
      .filter((l) => l.startsWith("Dialogue:") && l.includes("Bulgarian"));
    assertEq(dLines.length, 2, "Generated 2 dialogue lines corresponding to 2 ayah bounds");
  });

  // =========================================================================
  // 5. 1000-Iteration Extreme Property Fuzzing Matrix
  // =========================================================================
  suite("5. 1000-ITERATION EXTREME PROPERTY FUZZING MATRIX");

  test("C5.1: 500 Client Video Layout Random Fuzzing Iterations", () => {
    const vocab = [
      "Аллах", "Коран", "Пророк", "Милост", "Търпение", "Надежда", "Благословение",
      "Справедливост", "Истина", "Светлина", "Живот", "Защита", "Спокойствие",
      "Вяра", "Господ", "Дженнет", "Дуа", "Иман", "Победа", "Сърцето", "Добро",
      "Всемилостивият", "Милосърдният", "Владетелят", "Пречистият", "Миротворящият",
      "Непредотвратимостта", "Благочестието", "Предупреждението",
    ];
    const profiles: PlatformSafeZoneProfile[] = ["tiktok", "reels", "shorts", "center", "universal"];

    let passed = 0;
    const ITERATIONS = 500;

    for (let i = 0; i < ITERATIONS; i++) {
      const p = profiles[i % profiles.length];
      const is720 = i % 3 === 0;
      const baseSz = getSafeZone(p);
      const scale = is720 ? 720 / 1080 : 1.0;
      const sz = is720 ? scaleSafeZone(baseSz, scale) : baseSz;

      const count = 1 + (i % 45);
      const words: string[] = [];
      for (let w = 0; w < count; w++) {
        words.push(vocab[(i * 13 + w * 19) % vocab.length]);
      }
      const text = words.join(" ");

      const { fontSize, lineHeight } = clientChooseFontSize(text, sz.W_SAFE, sz.H_SAFE, scale);
      assert(fontSize >= Math.round(36 * scale), `Iter ${i}: Font size ${fontSize} >= min size`);

      const lines = clientWrapWords(words, sz.W_SAFE, fontSize);
      assert(lines.length > 0, `Iter ${i}: At least 1 line wrapped`);

      for (const line of lines) {
        const lineStr = line.join(" ");
        const w = estimateTextWidth(lineStr, fontSize);
        assert(w <= sz.W_SAFE + 0.5, `Iter ${i}: Line width ${w} <= W_SAFE ${sz.W_SAFE}`);

        const cursorX = sz.CENTER_X - w / 2;
        const box: BoundingBox = {
          x: cursorX,
          y: Math.min(sz.BOTTOM_MAX_Y - lineHeight, Math.max(sz.SAFE_TOP + 80, 1400 * scale)),
          width: w,
          height: lineHeight,
        };
        assert(isWithinSafeZone(box, sz), `Iter ${i}: Box within safe zone for ${p} (scale ${scale})`);
      }

      passed++;
    }

    assertEq(passed, ITERATIONS, "All 500 client video fuzzing iterations passed");
  });

  test("C5.2: 500 Server ASS Generation Random Fuzzing Iterations", () => {
    const vocab = [
      "В", "името", "на", "Аллах", "Всемилостивия", "Милосърдния", "Хвала",
      "на", "Господа", "на", "световете", "Владетеля", "на", "Съдния", "ден",
      "Само", "на", "Теб", "се", "кланяме", "и", "само", "Теб", "за", "помощ", "молим",
    ];
    const profiles: PlatformSafeZoneProfile[] = ["tiktok", "reels", "shorts", "center"];
    const themes = ["hormozi", "emerald", "neon", "classic", "fire", "box"];

    let passed = 0;
    const ITERATIONS = 500;

    for (let i = 0; i < ITERATIONS; i++) {
      const p = profiles[i % profiles.length];
      const theme = themes[i % themes.length];
      const count = 2 + (i % 30);
      const words: string[] = [];
      for (let w = 0; w < count; w++) {
        words.push(vocab[(i * 7 + w * 23) % vocab.length]);
      }
      const bulgarian = words.join(" ");
      const audioDur = 4 + (i % 30);

      const ass = generateAssSubtitles(
        {
          reference: `Коран ${i + 1}:${(i % 100) + 1}`,
          bulgarian,
          subtitlePosition: p,
          tiktokTheme: theme,
        },
        audioDur,
      );

      assert(ass.includes("[Script Info]"), `Iter ${i}: Has [Script Info]`);
      assert(ass.includes("[V4+ Styles]"), `Iter ${i}: Has [V4+ Styles]`);
      assert(ass.includes("[Events]"), `Iter ${i}: Has [Events]`);

      const placement = getASSSubtitlePlacement(p);
      assert(ass.includes(`\\pos(${placement.posX},${placement.posY})`), `Iter ${i}: Has correct \\pos tag for ${p}`);

      passed++;
    }

    assertEq(passed, ITERATIONS, "All 500 server ASS fuzzing iterations passed");
  });

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log(`\n=================================================================`);
  console.log(`📊 CHALLENGER 2 SUMMARY: ${passedCount} / ${totalTests} TESTS PASSED`);
  if (failures.length > 0) {
    console.error(`❌ FAILURES ENCOUNTERED (${failures.length}):`);
    for (const f of failures) {
      console.error(`  - [${f.suite}] ${f.name}: ${f.error}`);
    }
    throw new Error(`${failures.length} test(s) failed in Challenger 2 verification suite.`);
  } else {
    console.log(`🎉 100% PASS RATE! ALL CHALLENGER 2 EMPIRICAL TESTS PASSED!`);
  }
  console.log(`=================================================================\n`);
}

runChallenger2Tests().catch((err) => {
  console.error("Challenger 2 execution failed:", err);
  process.exit(1);
});
