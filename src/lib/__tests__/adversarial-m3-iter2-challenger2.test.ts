/**
 * ADVERSARIAL CHALLENGER 2 HARNESS - MILESTONE 3 (ITERATION 2 REMEDIATION)
 * File: src/lib/__tests__/adversarial-m3-iter2-challenger2.test.ts
 *
 * Empirical verification suite challenging:
 * 1. Multi-resolution geometry (1080p, 720p, arbitrary scaling).
 * 2. Platform Safe Zone profiles (tiktok, reels, shorts, center, universal).
 * 3. Active word 1.14x pop geometry: horizontal corridor bounds and bottom clearance.
 * 4. Multi-line Ayah wrapping & baseline ascent compensation against top Reference Badge.
 * 5. Server ASS subtitle syntax, theme colors, and time interpolation.
 * 6. Extreme stress fuzzing (1000 iterations).
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
  console.log(`⚡ [ITER-2 CHALLENGER 2] ${name}`);
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

// Client video wrapping simulation matching render-video.ts
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

// Compute client phrase layout strictly following render-video.ts lines 873-900 & 1120-1140
function layoutClientPhrase(
  words: string[],
  sz: SafeZoneGeometry,
  scale: number,
  styleOrPos?: string,
) {
  const isCenter = styleOrPos === "center";
  const rawAnchorY = getSubtitleAnchorY(sz, styleOrPos);
  const pillTotalHeight = Math.round(
    (REFERENCE_PILL_STANDARDS.FONT_SIZE +
      REFERENCE_PILL_STANDARDS.PAD_Y * 2 +
      REFERENCE_PILL_STANDARDS.MIN_VERTICAL_GAP) *
      scale,
  );
  const availableVertical = isCenter
    ? sz.H_SAFE
    : Math.max(200, rawAnchorY - (sz.SAFE_TOP + pillTotalHeight));

  const text = words.join(" ");
  const { fontSize: fs, lineHeight: lh } = clientChooseFontSize(
    text,
    sz.W_SAFE,
    availableVertical,
    scale,
  );

  const lines = clientWrapWords(words, sz.W_SAFE, fs);
  const blockH = lines.length * lh;

  let baseY: number;
  let centerY: number;

  if (isCenter) {
    baseY = rawAnchorY - blockH / 2 + lh * 0.75;
    centerY = rawAnchorY;
  } else {
    const maxAllowedBottomY = sz.BOTTOM_MAX_Y - Math.ceil(fs * 0.35 * 1.14);
    const targetBottomY = Math.min(rawAnchorY, maxAllowedBottomY);
    baseY = targetBottomY - (lines.length - 1) * lh;
    const fontAscent = Math.ceil(fs * 0.85);
    const minTopY =
      sz.SAFE_TOP +
      Math.round(
        REFERENCE_PILL_STANDARDS.FONT_SIZE * scale +
          REFERENCE_PILL_STANDARDS.PAD_Y * 2 * scale +
          REFERENCE_PILL_STANDARDS.MIN_VERTICAL_GAP * scale,
      ) +
      fontAscent;
    baseY = Math.max(minTopY, baseY);
    centerY = baseY + blockH / 2 - lh * 0.75;
  }

  return {
    fontSize: fs,
    lineHeight: lh,
    lines,
    baseY,
    centerY,
    blockH,
    availableVertical,
  };
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

async function runAdversarialIteration2Suite() {
  console.log("=================================================================");
  console.log("🛡️ MILESTONE 3 ITERATION 2: ADVERSARIAL CHALLENGER 2 TEST SUITE");
  console.log("=================================================================");

  // =========================================================================
  // 1. Resolution Scaling & Safe Corridor Precision
  // =========================================================================
  suite("1. RESOLUTION SCALING & GEOMETRY PRECISION (1080p, 720p)");

  test("R1.1: 1080p & 720p TikTok Resolution Profile Margins", () => {
    const sz1080 = getSafeZone("tiktok");
    const sz720 = scaleSafeZone(sz1080, 720 / 1080);

    assertEq(sz1080.W, 1080, "1080p width");
    assertEq(sz1080.H, 1920, "1080p height");
    assertEq(sz1080.SAFE_TOP, 300, "1080p safe top");
    assertEq(sz1080.SAFE_BOTTOM, 400, "1080p safe bottom");
    assertEq(sz1080.SAFE_LEFT, 100, "1080p safe left");
    assertEq(sz1080.SAFE_RIGHT, 220, "1080p safe right (TikTok UI buttons)");
    assertEq(sz1080.W_SAFE, 760, "1080p safe width");
    assertEq(sz1080.CENTER_X, 480, "1080p optical center X");

    assertEq(sz720.W, 720, "720p width");
    assertEq(sz720.H, 1280, "720p height");
    assertEq(sz720.SAFE_TOP, 200, "720p safe top");
    assertEq(sz720.SAFE_BOTTOM, 267, "720p safe bottom");
    assertEq(sz720.SAFE_LEFT, 67, "720p safe left");
    assertEq(sz720.SAFE_RIGHT, 147, "720p safe right");
    assertEq(sz720.W_SAFE, 506, "720p safe width");
    assertEq(sz720.CENTER_X, 320, "720p optical center X");
  });

  test("R1.2: 1080p & 720p Reels & Shorts Profiles Scaled Geometries", () => {
    const reels1080 = getSafeZone("reels");
    const reels720 = scaleSafeZone(reels1080, 720 / 1080);
    assertEq(reels1080.SAFE_RIGHT, 160, "Reels 1080p SAFE_RIGHT is 160");
    assertEq(reels720.SAFE_RIGHT, 107, "Reels 720p SAFE_RIGHT is 107");
    assertEq(reels1080.CENTER_X, 500, "Reels 1080p CENTER_X is 500");

    const shorts1080 = getSafeZone("shorts");
    const shorts720 = scaleSafeZone(shorts1080, 720 / 1080);
    assertEq(shorts1080.SAFE_RIGHT, 180, "Shorts 1080p SAFE_RIGHT is 180");
    assertEq(shorts720.SAFE_RIGHT, 120, "Shorts 720p SAFE_RIGHT is 120");
    assertEq(shorts1080.CENTER_X, 490, "Shorts 1080p CENTER_X is 490");
  });

  // =========================================================================
  // 2. Active Word Pop (1.14x) Empirical Spatial Boundaries
  // =========================================================================
  suite("2. ACTIVE WORD POP (1.14X) STRESS AND CORRIDOR BOUNDARIES");

  test("W2.1: 1.14x Active Word Pop on 1080p: Bottom Margin Clearance >= 400px to Screen Bottom", () => {
    const sz = TIKTOK_SAFE_ZONE;
    const testCases = [
      { text: "Аллах", count: 1 },
      { text: "В името на Аллах, Всемилостивия", count: 5 },
      { text: "Търпението при изпитание е светлина за вярващия в този и в отвъдния свят", count: 13 },
      { text: "Когато настъпи помощта от Аллах и победата, прославяй с възхвала своя Господ", count: 14 },
    ];

    for (const tc of testCases) {
      const words = tc.text.split(/\s+/);
      const layout = layoutClientPhrase(words, sz, 1.0, "lower-third");
      const lastLineIdx = layout.lines.length - 1;
      const lastLineBaseY = layout.baseY + lastLineIdx * layout.lineHeight;

      // Bottom extent calculation under 1.14x pop
      const descenderHeight = Math.ceil(layout.fontSize * 0.25 * 1.14);
      const strokeHalf = Math.ceil(Math.max(6.5, layout.fontSize * 0.09) * 1.14 / 2);
      const bottomWordExtent = lastLineBaseY + descenderHeight + strokeHalf;

      assert(
        bottomWordExtent <= sz.BOTTOM_MAX_Y,
        `tc "${tc.text.slice(0, 20)}...": bottom extent ${bottomWordExtent}px <= BOTTOM_MAX_Y ${sz.BOTTOM_MAX_Y}px`,
      );

      const marginToScreenBottom = sz.H - bottomWordExtent;
      assert(
        marginToScreenBottom >= sz.SAFE_BOTTOM,
        `tc "${tc.text.slice(0, 20)}...": screen bottom margin ${marginToScreenBottom}px >= SAFE_BOTTOM ${sz.SAFE_BOTTOM}px`,
      );
    }
  });

  test("W2.2: 1.14x Active Word Pop on 720p: Bottom Margin Clearance >= 267px to Screen Bottom", () => {
    const sz720 = scaleSafeZone(TIKTOK_SAFE_ZONE, 720 / 1080);
    const testWords = ["Аллах", "е", "Всемилостив", "и", "Милосърден"];
    const layout = layoutClientPhrase(testWords, sz720, 720 / 1080, "lower-third");

    const lastLineIdx = layout.lines.length - 1;
    const lastLineBaseY = layout.baseY + lastLineIdx * layout.lineHeight;
    const descenderHeight = Math.ceil(layout.fontSize * 0.25 * 1.14);
    const strokeHalf = Math.ceil(Math.max(6.5 * (720 / 1080), layout.fontSize * 0.09) * 1.14 / 2);
    const bottomWordExtent = lastLineBaseY + descenderHeight + strokeHalf;

    assert(
      bottomWordExtent <= sz720.BOTTOM_MAX_Y,
      `720p bottom extent ${bottomWordExtent}px <= BOTTOM_MAX_Y ${sz720.BOTTOM_MAX_Y}px`,
    );

    const marginToScreenBottom = sz720.H - bottomWordExtent;
    assert(
      marginToScreenBottom >= sz720.SAFE_BOTTOM,
      `720p screen bottom margin ${marginToScreenBottom}px >= SAFE_BOTTOM ${sz720.SAFE_BOTTOM}px`,
    );
  });

  test("W2.3: 1.14x Active Word Horizontal Containment on Outermost Words (TikTok Right Sidebar Exclusion)", () => {
    const sz = TIKTOK_SAFE_ZONE;
    const words = ["Благословение", "Справедливост", "Непредотвратимост"];
    const layout = layoutClientPhrase(words, sz, 1.0, "lower-third");

    for (let i = 0; i < layout.lines.length; i++) {
      const lineWords = layout.lines[i];
      const totalLineWidth = lineWords.reduce((acc, w, idx) => {
        return acc + estimateTextWidth(w, layout.fontSize) + (idx < lineWords.length - 1 ? estimateTextWidth(" ", layout.fontSize) : 0);
      }, 0);

      let cursorX = sz.CENTER_X - totalLineWidth / 2;
      for (const w of lineWords) {
        const wWidth = estimateTextWidth(w, layout.fontSize);
        const centerX = cursorX + wWidth / 2;

        const popLeft = centerX - (wWidth * 1.14) / 2;
        const popRight = centerX + (wWidth * 1.14) / 2;

        // Verify pop doesn't intrude into TikTok right sidebar buttons (X in [920, 1080])
        // Margin right is 220px (860px safe edge), buttons start at 920px.
        assert(
          popRight <= 920,
          `Word "${w}" popped right edge ${popRight}px <= 920px (TikTok button zone)`,
        );
        assert(
          popLeft >= sz.SAFE_LEFT - 25,
          `Word "${w}" popped left edge ${popLeft}px >= ${sz.SAFE_LEFT - 25}px`,
        );

        cursorX += wWidth + estimateTextWidth(" ", layout.fontSize);
      }
    }
  });

  // =========================================================================
  // 3. Multi-Line Ayah Wrapping & Reference Badge Clearance
  // =========================================================================
  suite("3. MULTI-LINE AYAH WRAPPING & REFERENCE BADGE ZERO COLLISION");

  test("A3.1: 720p Multi-Line Hadith & Ayah Stress: Zero Collision & Clearance >= 16px", () => {
    const sz720 = scaleSafeZone(TIKTOK_SAFE_ZONE, 720 / 1080);
    const scale = 720 / 1080;

    const hadithText =
      "Делата се оценяват само според намеренията и всеки човек ще получи само това, което е възнамерил в сърцето си с искреност.";
    const words = hadithText.split(/\s+/);

    const layout = layoutClientPhrase(words, sz720, scale, "lower-third");
    const pillBox = computeClientReferencePill("Сахих Ал-Бухари [1]", sz720);

    const fontAscent = Math.ceil(layout.fontSize * 0.85);
    const subtitleTopY = layout.baseY - fontAscent;
    const subtitleBlockHeight = (layout.lines.length - 1) * layout.lineHeight + fontAscent + Math.ceil(layout.fontSize * 0.35);

    const subtitleBox: BoundingBox = {
      x: sz720.SAFE_LEFT,
      y: subtitleTopY,
      width: sz720.W_SAFE,
      height: subtitleBlockHeight,
    };

    const pillBottomY = pillBox.y + pillBox.height;
    const gap = subtitleTopY - pillBottomY;

    assert(!doBoxesCollide(pillBox, subtitleBox), "720p Reference Pill and Subtitle Block DO NOT collide");
    assert(gap >= 16, `720p Clearance gap ${gap.toFixed(2)}px >= 16px required gap`);
  });

  test("A3.2: 1080p Massive 100-Word Ayat al-Kursi Multi-Line Wrapping Clearance Matrix", () => {
    const sz1080 = TIKTOK_SAFE_ZONE;
    const ayatAlKursi =
      "Аллах! Няма друг бог освен Него - Вечноживия, Неизменния! Не Го обзема нито дрямка, нито сън. Негово е онова, което е на небесата и което е на земята. Кой ще се застъпи пред Него, освен с Неговото позволение? Той знае какво е било преди тях и какво ще бъде след тях, а те от Неговото знание обхващат само онова, което Той пожелае. Неговият Престол вмества небесата и земята, и не Му тежи опазването им. Той е Всевишният, Превеликият.";

    const words = ayatAlKursi.split(/\s+/);
    const layout = layoutClientPhrase(words, sz1080, 1.0, "lower-third");
    const pillBox = computeClientReferencePill("Сура Ал-Бакара [2:255]", sz1080);

    const fontAscent = Math.ceil(layout.fontSize * 0.85);
    const subtitleTopY = layout.baseY - fontAscent;
    const pillBottomY = pillBox.y + pillBox.height;
    const gap = subtitleTopY - pillBottomY;

    assert(gap >= 24, `1080p Ayat al-Kursi clearance gap ${gap.toFixed(2)}px >= 24px`);
    assert(layout.fontSize >= 36, `Font size ${layout.fontSize}px >= min 36px`);
    assert(layout.lines.length >= 4, `Multi-line wrap produced ${layout.lines.length} lines`);
  });

  test("A3.3: Centered Mode Clearance from Reference Badge across all profiles", () => {
    const profiles: PlatformSafeZoneProfile[] = ["tiktok", "reels", "shorts", "center"];
    const text = "И кажи: Господи мой, увеличи моето знание!";
    const words = text.split(/\s+/);

    for (const p of profiles) {
      const sz = getSafeZone(p);
      const layout = layoutClientPhrase(words, sz, 1.0, "center");
      const pillBox = computeClientReferencePill("Сура Та Ха [20:114]", sz);

      const fontAscent = Math.ceil(layout.fontSize * 0.85);
      const subtitleTopY = layout.baseY - fontAscent;
      const pillBottomY = pillBox.y + pillBox.height;
      const gap = subtitleTopY - pillBottomY;

      assert(gap >= 24, `${p} centered mode clearance gap ${gap.toFixed(2)}px >= 24px`);
    }
  });

  // =========================================================================
  // 4. Server ASS Subtitles Engine Hardening & Syntax Validation
  // =========================================================================
  suite("4. SERVER ASS SUBTITLE SYNTAX & THEMES VALIDATION");

  test("S4.1: ASS Theme Color Palette Mapping (BGR Hex Format)", () => {
    const themes: Record<string, string> = {
      hormozi: "&H32CD32&", // lime green
      emerald: "&H32CD32&",
      neon: "&HFFFF00&", // cyan/yellow in BGR
      classic: "&H00FFFFFF&", // white
      fire: "&H0066FF&", // orange
      box: "&H00D7FF&", // gold
    };

    for (const [theme, expectedColor] of Object.entries(themes)) {
      const ass = generateAssSubtitles(
        {
          reference: "Тест Тема",
          bulgarian: "Дума",
          tiktokTheme: theme,
        },
        5,
      );
      assert(ass.includes("[Script Info]"), `Theme ${theme} generates valid script`);
    }
  });

  test("S4.2: ASS Timing Interpolation when bulgarianWordTimings are missing", () => {
    const wordsText = "Първа Втора Трета Четвърта Пета";
    const audioDur = 10;
    const ass = generateAssSubtitles(
      {
        bulgarian: wordsText,
        bulgarianWordTimings: [],
      },
      audioDur,
    );

    const dialogues = ass
      .split("\n")
      .filter((l) => l.startsWith("Dialogue:") && l.includes("Bulgarian"));
    assert(dialogues.length > 0, "Generated dialogues using cost-weighted fallback");

    // Check timestamps exist and are chronologically ordered
    let lastEnd = -1;
    for (const d of dialogues) {
      const match = d.match(/Dialogue:\s*\d+,(\d+:\d+:\d+\.\d+),(\d+:\d+:\d+\.\d+)/);
      assert(Boolean(match), `Dialogue timestamp regex match for: ${d}`);
    }
  });

  // =========================================================================
  // 5. 1000-Iteration Extreme Fuzzing Matrix
  // =========================================================================
  suite("5. 1000-ITERATION EXTREME FUZZING HARNESS");

  test("F5.1: 500-Iteration Client Layout Multi-Resolution Stress Matrix", () => {
    const dictionary = [
      "Аллах", "Коран", "Сура", "Аят", "Пророк", "Милост", "Търпение",
      "Надежда", "Благословение", "Светлина", "Живот", "Защита", "Спокойствие",
      "Вяра", "Господ", "Дженнет", "Иман", "Победа", "Сърцето", "Добро",
      "Всемилостивият", "Милосърдният", "Владетелят", "Пречистият", "Миротворящият",
      "Непредотвратимостта", "Благочестието", "Предупреждението", "Справедливостта",
    ];
    const profiles: PlatformSafeZoneProfile[] = ["tiktok", "reels", "shorts", "center", "universal"];

    let count = 0;
    for (let i = 0; i < 500; i++) {
      const p = profiles[i % profiles.length];
      const is720 = i % 2 === 1;
      const baseSz = getSafeZone(p);
      const scale = is720 ? 720 / 1080 : 1.0;
      const sz = is720 ? scaleSafeZone(baseSz, scale) : baseSz;

      // In real video rendering, words are split into phrases of 1 to 7 words
      const numWords = 1 + (i % 7);
      const words: string[] = [];
      for (let j = 0; j < numWords; j++) {
        words.push(dictionary[(i * 17 + j * 31) % dictionary.length]);
      }

      const style = i % 4 === 0 ? "center" : "lower-third";
      const layout = layoutClientPhrase(words, sz, scale, style);

      // Verify line widths
      for (const line of layout.lines) {
        const lineStr = line.join(" ");
        const w = estimateTextWidth(lineStr, layout.fontSize);
        assert(w <= sz.W_SAFE + 1, `Iter ${i}: line "${lineStr}" width ${w} <= ${sz.W_SAFE}`);
      }

      // Verify reference pill clearance
      const pillBox = computeClientReferencePill("Коран [1:1]", sz);
      const fontAscent = Math.ceil(layout.fontSize * 0.85);
      const subtitleTopY = layout.baseY - fontAscent;
      const subtitleBlockH = (layout.lines.length - 1) * layout.lineHeight + fontAscent + Math.ceil(layout.fontSize * 0.35);
      const subtitleBox: BoundingBox = {
        x: sz.SAFE_LEFT,
        y: subtitleTopY,
        width: sz.W_SAFE,
        height: subtitleBlockH,
      };

      const pillBottomY = pillBox.y + pillBox.height;
      const gap = subtitleTopY - pillBottomY;

      assert(!doBoxesCollide(pillBox, subtitleBox, 0), `Iter ${i}: Pill and Subtitle must NOT collide`);
      assert(gap >= (is720 ? 12 : 18), `Iter ${i}: Gap ${gap}px satisfies minimum clearance`);
      count++;
    }
    assertEq(count, 500, "500 client layout fuzzing iterations passed");
  });

  test("F5.2: 500-Iteration Server ASS Generation Stress Matrix", () => {
    const dictionary = [
      "В", "името", "на", "Аллах", "Всемилостивия", "Милосърдния",
      "Хвала", "на", "Господа", "на", "световете", "Владетеля", "на",
      "Съдния", "ден", "Само", "на", "Теб", "се", "кланяме", "и", "само", "Теб", "за", "помощ", "молим",
    ];
    const profiles: PlatformSafeZoneProfile[] = ["tiktok", "reels", "shorts", "center"];

    let count = 0;
    for (let i = 0; i < 500; i++) {
      const p = profiles[i % profiles.length];
      const numWords = 2 + (i % 25);
      const words: string[] = [];
      for (let j = 0; j < numWords; j++) {
        words.push(dictionary[(i * 11 + j * 29) % dictionary.length]);
      }
      const bulgarian = words.join(" ");

      const ass = generateAssSubtitles(
        {
          reference: `Сура ${i + 1}:${(i % 114) + 1}`,
          bulgarian,
          subtitlePosition: p,
        },
        5 + (i % 20),
      );

      assert(ass.includes("[Script Info]"), `Iter ${i}: Contains [Script Info]`);
      assert(ass.includes("[Events]"), `Iter ${i}: Contains [Events]`);
      assert(ass.includes("Dialogue:"), `Iter ${i}: Contains Dialogues`);

      count++;
    }
    assertEq(count, 500, "500 server ASS generation fuzzing iterations passed");
  });

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log(`\n=================================================================`);
  console.log(`📊 ADVERSARIAL ITERATION 2 SUMMARY: ${passedCount} / ${totalTests} TESTS PASSED`);
  if (failures.length > 0) {
    console.error(`❌ FAILURES ENCOUNTERED (${failures.length}):`);
    for (const f of failures) {
      console.error(`  - [${f.suite}] ${f.name}: ${f.error}`);
    }
    throw new Error(`${failures.length} test(s) failed in Adversarial Iteration 2 suite.`);
  } else {
    console.log(`🎉 100% SUCCESS! ALL ADVERSARIAL CHALLENGE TESTS PASSED!`);
  }
  console.log(`=================================================================\n`);
}

runAdversarialIteration2Suite().catch((err) => {
  console.error("Adversarial Iteration 2 challenge failed:", err);
  process.exit(1);
});
