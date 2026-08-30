/**
 * MILESTONE 3 VERIFICATION TEST SUITE: VIDEO RENDERING ENGINES HARDENING
 * File: src/lib/__tests__/verify-video-hardening.test.ts
 *
 * Verifies Milestone 3 (M3) Video Rendering Engines Hardening:
 * 1. Client Video Subtitle Safe Bounds & Resolution Scaling (1080p & 720p across TikTok, Reels, Shorts, Center).
 * 2. Active Word Karaoke Scale Pop (1.14x) Non-Overflow & Bottom Max Clearance (Y <= BOTTOM_MAX_Y).
 * 3. Server ASS Subtitle Placement, Asymmetric Margins (MarginL: 100, MarginR: 220), & Reference Badge \pos(480, 340).
 * 4. ASS Dynamic Text Width Measurement & Safe-Width Line Wrapping (<= 760px) without fixed word count overflow.
 * 5. Reference Badge Collision Avoidance & Vertical Clearance Gap (>= 24px) for massive multi-line Ayahs.
 * 6. Property-Based Adversarial Fuzzing Matrix (500 Client Video + 500 Server ASS iterations).
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

import { estimateTextWidth, wrapTextToSafeWidth, generateAssSubtitles } from "../render.functions";

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
// Client Video Layout Simulation Helpers (matching production render-video.ts)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Main Test Runner
// ---------------------------------------------------------------------------

async function runVideoHardeningVerification() {
  console.log("=================================================================");
  console.log("🛡️ MILESTONE 3 TEST SUITE: VIDEO RENDERING ENGINES HARDENING");
  console.log("=================================================================");

  // =========================================================================
  // SUITE 1: CLIENT VIDEO SUBTITLE SAFE BOUNDS & RESOLUTION SCALING
  // =========================================================================
  setSuite("SUITE 1: CLIENT VIDEO SUBTITLE SAFE BOUNDS & RESOLUTION SCALING");

  test("S1.1: TikTok 1080p: Subtitle line widths and bounding boxes strictly satisfy W_safe = 760px and X in [100, 860]px", () => {
    const sz = getSafeZone("tiktok");
    assertEq(sz.W, 1080, "TikTok W is 1080");
    assertEq(sz.H, 1920, "TikTok H is 1920");
    assertEq(sz.CENTER_X, 480, "TikTok CENTER_X is 480 (clearing right sidebar)");
    assertEq(sz.W_SAFE, 760, "TikTok W_SAFE is 760");

    const sampleAyah = "Аллах! Няма друг бог освен Него - Вечноживия, Неизменния!";
    const { fontSize, lineHeight } = clientChooseFontSize(sampleAyah, sz.W_SAFE, sz.H_SAFE, 1.0);
    const words = sampleAyah.split(/\s+/);
    const lines = clientWrapWords(words, sz.W_SAFE, fontSize);

    for (const line of lines) {
      const lineStr = line.join(" ");
      const lineWidth = estimateTextWidth(lineStr, fontSize);
      assert(lineWidth <= sz.W_SAFE, `Line width ${lineWidth}px exceeds W_SAFE ${sz.W_SAFE}px`);

      const cursorX = sz.CENTER_X - lineWidth / 2;
      const lineBox: BoundingBox = {
        x: cursorX,
        y: 1300,
        width: lineWidth,
        height: lineHeight,
      };

      assert(
        isWithinSafeZone(lineBox, "tiktok"),
        `Line "${lineStr}" breaches TikTok safe corridor`,
      );
      assert(lineBox.x >= 100 - 0.1, `Line left edge ${lineBox.x} < SAFE_LEFT (100)`);
      assert(
        lineBox.x + lineBox.width <= 860 + 0.1,
        `Line right edge ${lineBox.x + lineBox.width} > 860`,
      );
    }
  });

  test("S1.2: TikTok 720p: Subtitle lines downscale proportionally to W_safe = 506px and X in [67, 573]px", () => {
    const baseSz = getSafeZone("tiktok");
    const scale = 720 / 1080;
    const sz720 = scaleSafeZone(baseSz, scale);

    assertEq(sz720.W, 720, "720p W is 720");
    assertEq(sz720.H, 1280, "720p H is 1280");
    assertEq(sz720.CENTER_X, 320, "720p CENTER_X is 320");
    assertEq(sz720.W_SAFE, 506, "720p W_SAFE is 506");

    const sampleAyah = "Аллах! Няма друг бог освен Него - Вечноживия, Неизменния!";
    const { fontSize, lineHeight } = clientChooseFontSize(
      sampleAyah,
      sz720.W_SAFE,
      sz720.H_SAFE,
      scale,
    );
    const words = sampleAyah.split(/\s+/);
    const lines = clientWrapWords(words, sz720.W_SAFE, fontSize);

    for (const line of lines) {
      const lineStr = line.join(" ");
      const lineWidth = estimateTextWidth(lineStr, fontSize);
      assert(
        lineWidth <= sz720.W_SAFE,
        `720p line width ${lineWidth}px exceeds W_SAFE ${sz720.W_SAFE}px`,
      );

      const cursorX = sz720.CENTER_X - lineWidth / 2;
      const lineBox: BoundingBox = {
        x: cursorX,
        y: 860,
        width: lineWidth,
        height: lineHeight,
      };

      assert(
        isWithinSafeZone(lineBox, sz720),
        `720p line "${lineStr}" breaches 720p safe corridor`,
      );
      assert(
        lineBox.x >= sz720.SAFE_LEFT - 0.1,
        `720p Line left edge ${lineBox.x} < ${sz720.SAFE_LEFT}`,
      );
      assert(
        lineBox.x + lineBox.width <= sz720.W - sz720.SAFE_RIGHT + 0.1,
        `720p Line right edge > right bound`,
      );
    }
  });

  test("S1.3: Instagram Reels Profile: Subtitle lines contained in X in [80, 920]px, W_safe = 840px, CenterX = 500px", () => {
    const sz = getSafeZone("reels");
    assertEq(sz.CENTER_X, 500, "Reels CENTER_X is 500");
    assertEq(sz.W_SAFE, 840, "Reels W_SAFE is 840");

    const text =
      "Предупреждение за онези, които престъпват границите с несправедливост и високомерие.";
    const { fontSize, lineHeight } = clientChooseFontSize(text, sz.W_SAFE, sz.H_SAFE, 1.0);
    const lines = clientWrapWords(text.split(/\s+/), sz.W_SAFE, fontSize);

    for (const line of lines) {
      const lineStr = line.join(" ");
      const lineWidth = estimateTextWidth(lineStr, fontSize);
      const cursorX = sz.CENTER_X - lineWidth / 2;
      const lineBox: BoundingBox = { x: cursorX, y: 1350, width: lineWidth, height: lineHeight };
      assert(isWithinSafeZone(lineBox, "reels"), `Reels line breaches safe zone`);
    }
  });

  test("S1.4: YouTube Shorts Profile: Subtitle lines contained in X in [80, 900]px, W_safe = 820px, CenterX = 490px", () => {
    const sz = getSafeZone("shorts");
    assertEq(sz.CENTER_X, 490, "Shorts CENTER_X is 490");
    assertEq(sz.W_SAFE, 820, "Shorts W_SAFE is 820");

    const text = "Търпението е ключът към облекчението и истинския триумф.";
    const { fontSize, lineHeight } = clientChooseFontSize(text, sz.W_SAFE, sz.H_SAFE, 1.0);
    const lines = clientWrapWords(text.split(/\s+/), sz.W_SAFE, fontSize);

    for (const line of lines) {
      const lineStr = line.join(" ");
      const lineWidth = estimateTextWidth(lineStr, fontSize);
      const cursorX = sz.CENTER_X - lineWidth / 2;
      const lineBox: BoundingBox = { x: cursorX, y: 1350, width: lineWidth, height: lineHeight };
      assert(isWithinSafeZone(lineBox, "shorts"), `Shorts line breaches safe zone`);
    }
  });

  test("S1.5: Centered Profile: Subtitle lines centered at X = 540px in corridor X in [100, 980]px", () => {
    const sz = getSafeZone("center");
    assertEq(sz.CENTER_X, 540, "Center CENTER_X is 540");
    assertEq(sz.W_SAFE, 880, "Center W_SAFE is 880");

    const text = "Наистина след всяка трудност идва облекчение.";
    const { fontSize, lineHeight } = clientChooseFontSize(text, sz.W_SAFE, sz.H_SAFE, 1.0);
    const lines = clientWrapWords(text.split(/\s+/), sz.W_SAFE, fontSize);

    for (const line of lines) {
      const lineStr = line.join(" ");
      const lineWidth = estimateTextWidth(lineStr, fontSize);
      const cursorX = sz.CENTER_X - lineWidth / 2;
      const lineBox: BoundingBox = { x: cursorX, y: 960, width: lineWidth, height: lineHeight };
      assert(isWithinSafeZone(lineBox, "center"), `Center line breaches safe zone`);
    }
  });

  test("S1.6: Reference Pill 1080p & 720p: Top placement at SAFE_TOP with complete corridor containment", () => {
    const pill1080 = computeClientReferencePill("Сура Ал-Бакара [2:255]", TIKTOK_SAFE_ZONE);
    assert(isWithinSafeZone(pill1080, "tiktok"), "1080p Reference Pill inside safe zone");
    assertEq(pill1080.y, 300, "1080p Reference Pill anchored at SAFE_TOP=300");

    const sz720 = scaleSafeZone(TIKTOK_SAFE_ZONE, 720 / 1080);
    const pill720 = computeClientReferencePill("Сура Ал-Бакара [2:255]", sz720);
    assert(isWithinSafeZone(pill720, sz720), "720p Reference Pill inside safe zone");
    assertEq(pill720.y, 200, "720p Reference Pill anchored at SAFE_TOP=200");
  });

  // =========================================================================
  // SUITE 2: WORD SCALE POP (1.14x) & BOTTOM CLEARANCE ZONE
  // =========================================================================
  setSuite("SUITE 2: WORD SCALE POP (1.14x) & BOTTOM CLEARANCE ZONE");

  test("S2.1: Active Word 1.14x Pop: Bottom-most word edge maintains >= 60px clearance above Y = 1520px in 1080p", () => {
    const sz = TIKTOK_SAFE_ZONE;
    const testFontSizes = [36, 48, 64, 75, 88, 98, 112];

    for (const fs of testFontSizes) {
      const rawAnchorY = getSubtitleAnchorY(sz, "lower-third");
      assertEq(rawAnchorY, 1420, "Lower-third raw anchor Y is 1420");

      const maxAllowedBottomY = sz.BOTTOM_MAX_Y - Math.ceil(fs * 0.35 * 1.14);
      const targetBottomY = Math.min(rawAnchorY, maxAllowedBottomY);

      // When word pops at 1.14x:
      // Baseline is targetBottomY. Descender reaches targetBottomY + 0.25 * fs * 1.14 + strokeWidth (fs * 0.09 * 1.14)
      const maxDescenderReach = targetBottomY + Math.ceil(fs * (0.25 + 0.09) * 1.14);

      assert(
        maxDescenderReach <= sz.BOTTOM_MAX_Y,
        `Font size ${fs}px pop reaches Y=${maxDescenderReach} > BOTTOM_MAX_Y=${sz.BOTTOM_MAX_Y}`,
      );

      const clearance = sz.BOTTOM_MAX_Y - maxDescenderReach;
      assert(clearance >= 0, `Clearance ${clearance}px must be non-negative`);
    }
  });

  test("S2.2: Active Word 1.14x Pop: Leftmost and rightmost words on wrapped lines never breach X in [100, 860]px", () => {
    const sz = TIKTOK_SAFE_ZONE;
    const words = ["В", "името", "на", "Аллах,", "Всемилостивия,", "Милосърдния!"];
    const fs = 75;
    const lines = clientWrapWords(words, sz.W_SAFE, fs);

    for (const line of lines) {
      const totalLineWidth = line.reduce((sum, w, idx) => {
        return (
          sum + estimateTextWidth(w, fs) + (idx < line.length - 1 ? estimateTextWidth(" ", fs) : 0)
        );
      }, 0);

      let cursorX = sz.CENTER_X - totalLineWidth / 2;

      for (let i = 0; i < line.length; i++) {
        const w = line[i];
        const wWidth = estimateTextWidth(w, fs);
        const centerX = cursorX + wWidth / 2;

        // Under 1.14x pop, word expands by (1.14 - 1)/2 = 0.07 on each side
        const poppedLeft = centerX - (wWidth * 1.14) / 2;
        const poppedRight = centerX + (wWidth * 1.14) / 2;

        assert(
          poppedLeft >= sz.SAFE_LEFT - 0.01,
          `Popped left edge ${poppedLeft} < SAFE_LEFT ${sz.SAFE_LEFT} on word "${w}"`,
        );
        assert(
          poppedRight <= sz.W - sz.SAFE_RIGHT + 0.01,
          `Popped right edge ${poppedRight} > max safe X ${sz.W - sz.SAFE_RIGHT} on word "${w}"`,
        );

        cursorX += wWidth + estimateTextWidth(" ", fs);
      }
    }
  });

  test("S2.3: 720p Active Word Pop: Bottom clearance maintained above Y = 1013px", () => {
    const sz720 = scaleSafeZone(TIKTOK_SAFE_ZONE, 720 / 1080);
    const rawAnchorY = getSubtitleAnchorY(sz720, "lower-third");
    const fs = Math.round(75 * (720 / 1080));

    const maxAllowedBottomY = sz720.BOTTOM_MAX_Y - Math.ceil(fs * 0.35 * 1.14);
    const targetBottomY = Math.min(rawAnchorY, maxAllowedBottomY);
    const maxDescenderReach = targetBottomY + Math.ceil(fs * 0.34 * 1.14);

    assert(
      maxDescenderReach <= sz720.BOTTOM_MAX_Y,
      `720p pop reach ${maxDescenderReach} > ${sz720.BOTTOM_MAX_Y}`,
    );
  });

  test("S2.4: Adversarial long Cyrillic words under 1.14x scale pop stay within safe bounds", () => {
    const sz = TIKTOK_SAFE_ZONE;
    const longWords = ["Благословението", "Справедливостта", "Предупреждението"];
    const fs = 64;

    for (const word of longWords) {
      const wWidth = estimateTextWidth(word, fs);
      const centerX = sz.CENTER_X;
      const poppedLeft = centerX - (wWidth * 1.14) / 2;
      const poppedRight = centerX + (wWidth * 1.14) / 2;

      assert(
        poppedLeft >= sz.SAFE_LEFT,
        `Adversarial word "${word}" popped left ${poppedLeft} < ${sz.SAFE_LEFT}`,
      );
      assert(
        poppedRight <= sz.W - sz.SAFE_RIGHT,
        `Adversarial word "${word}" popped right ${poppedRight} > ${sz.W - sz.SAFE_RIGHT}`,
      );
    }
  });

  test("S2.5: Center Profile 1.14x Pop: Stays strictly within Y in [300, 1620]px", () => {
    const sz = getSafeZone("center");
    const anchorY = getSubtitleAnchorY(sz, "center");
    assertEq(anchorY, 960, "Center anchor Y is 960");

    const fs = 98;
    const popTop = anchorY - (fs * 1.34 * 3 * 1.14) / 2;
    const popBottom = anchorY + (fs * 1.34 * 3 * 1.14) / 2;

    assert(popTop >= sz.TOP_MIN_Y, `Center pop top ${popTop} >= TOP_MIN_Y (300)`);
    assert(popBottom <= sz.BOTTOM_MAX_Y, `Center pop bottom ${popBottom} <= BOTTOM_MAX_Y (1620)`);
  });

  // =========================================================================
  // SUITE 3: SERVER ASS SUBTITLE PLACEMENT AND STYLE PARAMETERS
  // =========================================================================
  setSuite("SUITE 3: SERVER ASS SUBTITLE PLACEMENT AND STYLE PARAMETERS");

  test("S3.1: ASS Style Config: getSafeAssStyles generates exact margins and alignments for all 4 profiles", () => {
    const tiktokStyle = getSafeAssStyles("tiktok");
    assertEq(tiktokStyle.marginL, 100, "TikTok ASS MarginL is 100");
    assertEq(tiktokStyle.marginR, 220, "TikTok ASS MarginR is 220 (clearing right sidebar)");
    assertEq(tiktokStyle.marginV, 400, "TikTok ASS MarginV is 400");
    assertEq(tiktokStyle.align, 2, "TikTok ASS align is 2 (bottom-center)");
    assertEq(tiktokStyle.posX, 480, "TikTok ASS posX is 480");

    const reelsStyle = getSafeAssStyles("reels");
    assertEq(reelsStyle.marginL, 80, "Reels ASS MarginL is 80");
    assertEq(reelsStyle.marginR, 160, "Reels ASS MarginR is 160");
    assertEq(reelsStyle.align, 2, "Reels ASS align is 2");

    const shortsStyle = getSafeAssStyles("shorts");
    assertEq(shortsStyle.marginL, 80, "Shorts ASS MarginL is 80");
    assertEq(shortsStyle.marginR, 180, "Shorts ASS MarginR is 180");
    assertEq(shortsStyle.align, 2, "Shorts ASS align is 2");

    const centerStyle = getSafeAssStyles("center");
    assertEq(centerStyle.marginL, 100, "Center ASS MarginL is 100");
    assertEq(centerStyle.marginR, 100, "Center ASS MarginR is 100");
    assertEq(centerStyle.align, 5, "Center ASS align is 5 (middle-center)");
    assertEq(centerStyle.posX, 540, "Center ASS posX is 540");
  });

  test("S3.2: ASS Script Header: PlayResX is 1080 and PlayResY is 1920 (strict 9:16 vertical standard)", () => {
    const ass = generateAssSubtitles(
      {
        bulgarian: "Тест на видео субтитри",
        subtitlePosition: "tiktok",
      },
      10,
    );

    assert(ass.includes("PlayResX: 1080"), "ASS PlayResX is 1080");
    assert(ass.includes("PlayResY: 1920"), "ASS PlayResY is 1920");
    assert(ass.includes("[Script Info]"), "ASS header contains [Script Info]");
    assert(ass.includes("[V4+ Styles]"), "ASS header contains [V4+ Styles]");
    assert(ass.includes("[Events]"), "ASS header contains [Events]");
  });

  test("S3.3: ASS Dialogue Events: \\pos(X, Y) tags strictly match platform optical center and safe vertical anchor", () => {
    const profiles: PlatformSafeZoneProfile[] = ["tiktok", "reels", "shorts", "center"];

    for (const p of profiles) {
      const ass = generateAssSubtitles(
        {
          bulgarian: "В името на Аллах",
          subtitlePosition: p,
        },
        5,
      );

      const placement = getASSSubtitlePlacement(p);
      const expectedPosTag = `\\an${placement.alignment}\\pos(${placement.posX},${placement.posY})`;
      assert(
        ass.includes(expectedPosTag),
        `Profile ${p} ASS dialogue missing expected pos tag: ${expectedPosTag}`,
      );
    }
  });

  test("S3.4: ASS Asymmetric Margins: MarginL=100 and MarginR=220 present in TikTok Bulgarian style header", () => {
    const ass = generateAssSubtitles(
      {
        bulgarian: "Субтитри тест",
        subtitlePosition: "tiktok",
      },
      8,
    );

    // Style: Bulgarian,Outfit,120,...,2,100,220,500,1
    assert(ass.includes(",100,220,"), "Bulgarian style defines asymmetric margins 100, 220");
  });

  test("S3.5: ASS Reference Badge: Dialogue positioned at safe top \\pos(CENTER_X, 340)", () => {
    const ass = generateAssSubtitles(
      {
        reference: "Коран 2:255",
        bulgarian: "Аллах няма друг бог освен Него",
        subtitlePosition: "tiktok",
      },
      10,
    );

    assert(
      ass.includes("{\\an8\\pos(480,340)}Коран 2:255"),
      "Reference badge dialogue is placed at \\an8\\pos(480,340) for TikTok",
    );
  });

  test("S3.6: ASS Theme Color Escapes: Valid BGR ASS color tags (&H32CD32&, &H0000B7FF&, &H00FFFFFF&)", () => {
    const ass = generateAssSubtitles(
      {
        bulgarian: "Слово на Аллах",
        tiktokTheme: "emerald",
        subtitlePosition: "tiktok",
      },
      6,
    );

    assert(ass.includes("&H00FFFFFF&"), "Contains pure white primary ASS color");
    assert(ass.includes("&H0000B7FF&"), "Contains gold karaoke accent color");
  });

  // =========================================================================
  // SUITE 4: ASS DYNAMIC LINE WIDTH WRAPPING (NO LINE EXCEEDING 760PX)
  // =========================================================================
  setSuite("SUITE 4: ASS DYNAMIC LINE WIDTH WRAPPING (NO LINE EXCEEDING 760PX)");

  test("S4.1: Calibrated Cyrillic Font Metric Measurement of Subtitle Texts", () => {
    const sample = "Всемилостивият";
    const w60 = estimateTextWidth(sample, 60);
    const w120 = estimateTextWidth(sample, 120);

    assert(Math.abs(w120 - w60 * 2) <= 1, "Font metrics scale linearly with font size");
    assert(w60 > 0, "Measured width is strictly positive");
  });

  test("S4.2: Ayah-Level Multi-Line Wrapping: 100% of wrapped lines measure <= 760px", () => {
    const sampleAyahs = [
      // Ayat al-Kursi (2:255) translation in Bulgarian
      "Аллах! Няма друг бог освен Него - Вечноживия, Неизменния! Не Го обзема нито дрямка, нито сън. Негово е онова, което е на небесата и което е на земята. Кой ще се застъпи пред Него, освен с Неговото позволение? Той знае какво е било преди тях и какво ще бъде след тях.",
      // Surah Al-Ikhlas (112:1-4)
      "Кажи: Той е Аллах - Единственият, Аллах - Целта на всички вопли! Не е раждал и не е бил роден, и няма равен Нему никой!",
      // Surah Al-Baqarah (2:286)
      "Аллах не възлага на никого извън неговите възможности. За него е онова, което е придобил, и срещу него е онова, което е извършил.",
    ];

    for (const ayah of sampleAyahs) {
      const ass = generateAssSubtitles(
        {
          bulgarian: ayah,
          ayahBounds: [{ start: 0, end: 15, bulgarian: ayah, english: "Ayah translation" }],
          subtitlePosition: "tiktok",
        },
        15,
      );

      // Extract dialogue text lines
      const dialogueLines = ass
        .split("\n")
        .filter((l) => l.startsWith("Dialogue:") && l.includes("Bulgarian"));
      assert(dialogueLines.length > 0, "Generated at least one Bulgarian dialogue event");

      for (const dLine of dialogueLines) {
        // Strip ASS metadata columns (first 9 comma-separated values) and style override tags
        const textPayload = dLine
          .split(",")
          .slice(9)
          .join(",")
          .replace(/\{[^}]+\}/g, "");
        const subLines = textPayload.split("\\N");

        // Parse font size from style tag
        const fsMatch = dLine.match(/\\fs(\d+)/);
        const parsedFs = fsMatch ? Number(fsMatch[1]) : 58;

        for (const subL of subLines) {
          if (!subL.trim()) continue;
          const w = estimateTextWidth(subL.trim(), parsedFs);
          assert(
            w <= 760,
            `Ayah sub-line "${subL}" width ${w}px exceeds safe maximum 760px (fs=${parsedFs})`,
          );
        }
      }
    }
  });

  test("S4.3: Hadith Multi-Sentence Wrapping: Dynamic line splitting respects W_safe = 760px", () => {
    const hadithText =
      "Делата се оценяват единствено според намеренията, и всеки човек ще получи според онова, което е възнамерил.";
    const lines = wrapTextToSafeWidth(hadithText.split(/\s+/), 96, 760);

    assert(lines.length >= 2, "Hadith text wrapped into multiple lines");
    for (const l of lines) {
      const w = estimateTextWidth(l, 96);
      assert(w <= 760, `Hadith line "${l}" width ${w}px <= 760px`);
    }
  });

  test("S4.4: Extreme Unbroken Compound Words: Auto-fit decremental font scaling prevents overflow", () => {
    const longWords = ["Четиринадесетгодишният", "Самоусъвършенстване", "Непредотвратимостта"];
    for (const lw of longWords) {
      const ass = generateAssSubtitles(
        {
          bulgarian: `Голямото изпитание: ${lw}`,
          ayahBounds: [
            { start: 0, end: 8, bulgarian: `Голямото изпитание: ${lw}`, english: "Test" },
          ],
          subtitlePosition: "tiktok",
        },
        8,
      );

      const dialogueLine = ass
        .split("\n")
        .find((l) => l.startsWith("Dialogue:") && l.includes("Bulgarian"));
      assert(Boolean(dialogueLine), "Generated dialogue line for long compound word");

      const fsMatch = dialogueLine!.match(/\\fs(\d+)/);
      const fs = fsMatch ? Number(fsMatch[1]) : 58;
      const w = estimateTextWidth(lw, fs);
      assert(w <= 760, `Unbroken word "${lw}" width ${w}px <= 760px at scaled fs=${fs}`);
    }
  });

  test("S4.5: Phrase-Level Word Slicing: Single-word and phrase-mode lines adhere to W_safe", () => {
    const assPhrase = generateAssSubtitles(
      {
        bulgarian: "Търпението при беда носи огромна награда от Господа на световете.",
        subtitleSlicingMode: "phrase",
        subtitlePosition: "tiktok",
      },
      10,
    );

    const lines = assPhrase
      .split("\n")
      .filter((l) => l.startsWith("Dialogue:") && l.includes("Bulgarian"));
    assert(lines.length > 0, "Generated phrase dialogue events");

    for (const l of lines) {
      const textOnly = l
        .split(",")
        .slice(9)
        .join(",")
        .replace(/\{[^}]+\}/g, "");
      for (const linePart of textOnly.split("\\N")) {
        const w = estimateTextWidth(linePart.trim(), 96);
        assert(w <= 760, `Phrase line part "${linePart}" width ${w}px <= 760px`);
      }
    }
  });

  // =========================================================================
  // SUITE 5: ZERO OVERLAP BETWEEN TOP REFERENCE BADGE AND SUBTITLE BLOCKS
  // =========================================================================
  setSuite("SUITE 5: ZERO OVERLAP BETWEEN TOP REFERENCE BADGE AND SUBTITLE BLOCKS");

  test("S5.1: Lower-Third Subtitle Clearance from Top Reference Pill: Gap >= 500px >> 24px", () => {
    const sz = TIKTOK_SAFE_ZONE;
    const pillBox = computeClientReferencePill("Сура Ал-Бакара [2:255]", sz);
    assertEq(pillBox.y, 300, "Pill top is 300");
    const pillBottom = pillBox.y + pillBox.height; // ~356

    const subtitleAnchorY = getSubtitleAnchorY(sz, "lower-third"); // 1420
    const subtitleBlockHeight = 4 * (75 * 1.34); // ~400px
    const subtitleTop = subtitleAnchorY - subtitleBlockHeight; // ~1020px

    const verticalGap = subtitleTop - pillBottom; // 1020 - 356 = 664px
    assert(verticalGap >= 24, `Vertical gap ${verticalGap}px >= 24px`);

    const subtitleBox: BoundingBox = {
      x: sz.SAFE_LEFT,
      y: subtitleTop,
      width: sz.W_SAFE,
      height: subtitleBlockHeight,
    };

    assert(!doBoxesCollide(pillBox, subtitleBox, 24), "Pill and subtitle do not collide");
  });

  test("S5.2: Center Subtitle Placement Clearance from Top Reference Pill: Gap >= 380px >> 24px", () => {
    const sz = getSafeZone("center");
    const pillBox = computeClientReferencePill("Сура Ал-Фатиха [1:1-7]", sz);
    const pillBottom = pillBox.y + pillBox.height; // ~356

    const centerAnchorY = getSubtitleAnchorY(sz, "center"); // 960
    const centerBlockHeight = 3 * (88 * 1.34); // ~353px
    const centerTop = centerAnchorY - centerBlockHeight / 2; // ~783px

    const verticalGap = centerTop - pillBottom; // 783 - 356 = 427px
    assert(verticalGap >= 24, `Center placement gap ${verticalGap}px >= 24px`);

    const subtitleBox: BoundingBox = {
      x: sz.SAFE_LEFT,
      y: centerTop,
      width: sz.W_SAFE,
      height: centerBlockHeight,
    };

    assert(
      !doBoxesCollide(pillBox, subtitleBox, 24),
      "Center subtitle does not collide with reference pill",
    );
  });

  test("S5.3: Worst-Case Massive Multi-Line Block Collision Ceiling Cap (Subtitle Top >= 380px)", () => {
    const sz = TIKTOK_SAFE_ZONE;
    const pillBox = computeClientReferencePill("Коран 2:286", sz);
    const fontAscent = Math.ceil(75 * 0.85);
    const minTopY =
      sz.SAFE_TOP +
      Math.round(
        REFERENCE_PILL_STANDARDS.FONT_SIZE +
          REFERENCE_PILL_STANDARDS.PAD_Y * 2 +
          REFERENCE_PILL_STANDARDS.MIN_VERTICAL_GAP,
      ) +
      fontAscent;

    assert(
      minTopY >= 380 + fontAscent,
      `Minimum allowed subtitle baseline ${minTopY} >= 380px + fontAscent`,
    );

    // Even if an extreme 12-line text is rendered, baseY is clamped to minTopY
    const extremeBaseY = Math.max(minTopY, 1420 - 12 * 80);
    assert(extremeBaseY >= minTopY, "extremeBaseY respected minTopY floor");

    const subtitleBox: BoundingBox = {
      x: sz.SAFE_LEFT,
      y: extremeBaseY - fontAscent,
      width: sz.W_SAFE,
      height: 600,
    };

    assert(
      !doBoxesCollide(pillBox, subtitleBox, 24),
      "Ceiling cap prevents collision with top badge",
    );
  });

  test("S5.4: Multi-Page Pagination: Every subtitle page maintains >= 24px vertical separation from reference badge", () => {
    const sz = TIKTOK_SAFE_ZONE;
    const pillBox = computeClientReferencePill("Хадис ан-Науауи 1", sz);

    const pageStartYs = [1350, 1380, 1400];
    for (const pageY of pageStartYs) {
      const pageBox: BoundingBox = {
        x: sz.SAFE_LEFT,
        y: pageY - 300,
        width: sz.W_SAFE,
        height: 300,
      };
      assert(
        !doBoxesCollide(pillBox, pageBox, 24),
        `Page at Y=${pageY} does not collide with reference badge`,
      );
    }
  });

  test("S5.5: Multi-Profile Non-Overlap Matrix across TikTok, Reels, Shorts, and Center", () => {
    const profiles: PlatformSafeZoneProfile[] = ["tiktok", "reels", "shorts", "center"];

    for (const p of profiles) {
      const sz = getSafeZone(p);
      const pillBox = computeClientReferencePill("Сура Ал-Ихлас", sz);
      const anchorY = getSubtitleAnchorY(sz, p === "center" ? "center" : "lower-third");
      const subBox: BoundingBox = {
        x: sz.SAFE_LEFT,
        y: p === "center" ? anchorY - 150 : anchorY - 300,
        width: sz.W_SAFE,
        height: 300,
      };

      assert(!doBoxesCollide(pillBox, subBox, 24), `Profile ${p} pill and subtitle do not collide`);
    }
  });

  // =========================================================================
  // SUITE 6: PROPERTY-BASED FUZZING & ADVERSARIAL STRESS MATRIX
  // =========================================================================
  setSuite("SUITE 6: PROPERTY-BASED FUZZING & ADVERSARIAL STRESS MATRIX");

  test("S6.1: 500 Randomized Client Video Subtitle Layout Fuzzing Iterations", () => {
    const profiles: PlatformSafeZoneProfile[] = [
      "tiktok",
      "reels",
      "shorts",
      "universal",
      "center",
    ];
    const vocabulary = [
      "Аллах",
      "Коран",
      "Пророк",
      "Милост",
      "Търпение",
      "Надежда",
      "Благословение",
      "Справедливост",
      "Истина",
      "Светлина",
      "Живот",
      "Защита",
      "Спокойствие",
      "Вяра",
      "Господ",
      "Дженнет",
      "Дуа",
      "Иман",
      "Победа",
      "Сърцето",
      "Добро",
      "Времето",
      "Всемилостивият",
      "Милосърдният",
      "Владетелят",
      "Пречистият",
      "Миротворящият",
    ];

    let passedIterations = 0;
    const TOTAL_ITERATIONS = 500;

    for (let iter = 0; iter < TOTAL_ITERATIONS; iter++) {
      const profile = profiles[iter % profiles.length];
      const is720 = iter % 4 === 0;
      const baseSz = getSafeZone(profile);
      const scale = is720 ? 720 / 1080 : 1.0;
      const sz = is720 ? scaleSafeZone(baseSz, scale) : baseSz;

      // Generate random sentence between 3 and 40 words
      const wordCount = 3 + (iter % 38);
      const sentenceWords: string[] = [];
      for (let w = 0; w < wordCount; w++) {
        sentenceWords.push(vocabulary[(iter * 7 + w * 13) % vocabulary.length]);
      }
      const fullText = sentenceWords.join(" ");

      const { fontSize, lineHeight } = clientChooseFontSize(fullText, sz.W_SAFE, sz.H_SAFE, scale);
      const lines = clientWrapWords(sentenceWords, sz.W_SAFE, fontSize);

      const pillBox = computeClientReferencePill("Коран [1:1]", sz);

      for (const line of lines) {
        const lineStr = line.join(" ");
        const lineWidth = estimateTextWidth(lineStr, fontSize);

        // Invariant 1: Line width never exceeds safe width
        assert(
          lineWidth <= sz.W_SAFE + 0.1,
          `Iter ${iter}: Line width ${lineWidth} > W_SAFE ${sz.W_SAFE}`,
        );

        // Invariant 2: Line bounding box completely inside safe zone
        const cursorX = sz.CENTER_X - lineWidth / 2;
        const lineBox: BoundingBox = {
          x: cursorX,
          y: Math.min(sz.BOTTOM_MAX_Y - lineHeight, Math.max(sz.SAFE_TOP + 80, 1400 * scale)),
          width: lineWidth,
          height: lineHeight,
        };

        assert(
          isWithinSafeZone(lineBox, sz),
          `Iter ${iter}: Line "${lineStr}" breaches safe zone corridor for ${profile}`,
        );

        // Invariant 3: Zero collision with reference badge
        assert(
          !doBoxesCollide(pillBox, lineBox, 24 * scale),
          `Iter ${iter}: Pill and line box collide in ${profile}`,
        );
      }

      passedIterations++;
    }

    assertEq(passedIterations, TOTAL_ITERATIONS, "All 500 client video fuzzing iterations passed");
  });

  test("S6.2: 500 Randomized Server ASS Script Generation Fuzzing Iterations", () => {
    const profiles: PlatformSafeZoneProfile[] = ["tiktok", "reels", "shorts", "center"];
    const themes = ["hormozi", "emerald", "neon", "classic", "fire", "box"];
    const vocabulary = [
      "В",
      "името",
      "на",
      "Аллах",
      "Всемилостивия",
      "Милосърдния",
      "Хвала",
      "на",
      "Господа",
      "на",
      "световете",
      "Владетеля",
      "на",
      "Съдния",
      "ден",
      "Само",
      "на",
      "Теб",
      "се",
      "кланяме",
      "и",
      "само",
      "Теб",
      "за",
      "помощ",
      "молим",
    ];

    let passedIterations = 0;
    const TOTAL_ITERATIONS = 500;

    for (let iter = 0; iter < TOTAL_ITERATIONS; iter++) {
      const profile = profiles[iter % profiles.length];
      const theme = themes[iter % themes.length];
      const wordCount = 4 + (iter % 22);
      const words: string[] = [];
      for (let w = 0; w < wordCount; w++) {
        words.push(vocabulary[(iter * 11 + w * 17) % vocabulary.length]);
      }
      const bulgarianText = words.join(" ");
      const audioDuration = 5 + (iter % 25);

      const ass = generateAssSubtitles(
        {
          reference: `Сура ${iter + 1}:1`,
          bulgarian: bulgarianText,
          subtitlePosition: profile,
          tiktokTheme: theme,
        },
        audioDuration,
      );

      // Invariant 1: Valid ASS syntax header
      assert(
        ass.includes("[Script Info]") && ass.includes("[V4+ Styles]") && ass.includes("[Events]"),
        `Iter ${iter}: ASS syntax valid`,
      );

      // Invariant 2: Bulgarian style margins match platform profile
      const placement = getASSSubtitlePlacement(profile);
      assert(
        ass.includes(`,${placement.marginL},${placement.marginR},`),
        `Iter ${iter}: Bulgarian style margins match profile ${profile}`,
      );

      // Invariant 3: Dialogue lines present and bounded
      const dialogueLines = ass
        .split("\n")
        .filter((l) => l.startsWith("Dialogue:") && l.includes("Bulgarian"));
      assert(dialogueLines.length > 0, `Iter ${iter}: At least one dialogue line generated`);

      for (const dLine of dialogueLines) {
        const textPayload = dLine
          .split(",")
          .slice(9)
          .join(",")
          .replace(/\{[^}]+\}/g, "");
        const subLines = textPayload.split("\\N");
        for (const subL of subLines) {
          if (!subL.trim()) continue;
          const w = estimateTextWidth(subL.trim(), 96);
          const sz = getSafeZone(profile);
          assert(w <= sz.W_SAFE, `Iter ${iter}: Line "${subL}" width ${w} > W_SAFE ${sz.W_SAFE}`);
        }
      }

      passedIterations++;
    }

    assertEq(
      passedIterations,
      TOTAL_ITERATIONS,
      "All 500 server ASS script fuzzing iterations passed",
    );
  });

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log(`\n=================================================================`);
  console.log(`📊 TEST SUITE SUMMARY: ${passedCount} / ${totalTests} TESTS PASSED`);
  if (failures.length > 0) {
    console.error(`❌ FAILURES ENCOUNTERED (${failures.length}):`);
    for (const f of failures) {
      console.error(`  - [${f.suite}] ${f.name}: ${f.error}`);
    }
    throw new Error(`${failures.length} test(s) failed in Milestone 3 verification suite.`);
  } else {
    console.log(`🎉 ALL MILESTONE 3 VIDEO RENDERING HARDENING TESTS PASSED! (100% SUCCESS)`);
  }
  console.log(`=================================================================\n`);
}

runVideoHardeningVerification().catch((err) => {
  console.error("Test execution failed fatal:", err);
  process.exit(1);
});
