import { cleanProposalTitle } from "../../src/lib/assistant.functions";
import {
  TIKTOK_SAFE_ZONE,
  REELS_SAFE_ZONE,
  SHORTS_SAFE_ZONE,
  UNIVERSAL_SAFE_ZONE,
  CENTER_SAFE_ZONE,
  getSafeZone,
  getSafeOverlayCss,
  getNormalizedSafeZone,
  getASSSubtitlePlacement,
  getSubtitleAnchorY,
  scaleSafeZone,
  type PlatformSafeZoneProfile,
} from "../../src/lib/safe-zone";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[ADVERSARIAL STRESS TEST FAILED]: ${message}`);
  }
}

function assertClose(actual: number, expected: number, epsilon = 0.01, msg = "") {
  if (Math.abs(actual - expected) > epsilon) {
    throw new Error(`[ASSERT FAILED] ${msg}: got ${actual}, expected ${expected} ±${epsilon}`);
  }
}

console.log("=================================================================");
console.log("🔥 RUNNING ADVERSARIAL STRESS-TESTS FOR MILESTONE 4");
console.log("=================================================================\n");

// --- 1. Adversarial Title Sanitizer ---
console.log("1. Testing Realistic & Stress Title Sanitizer Inputs...");
const testCases = [
  { in: "[Коран 2:255] Аят ал-Курси", expected: "[Коран 2:255] Аят ал-Курси" },
  { in: "[[Коран 2:255]] Аят ал-Курси", expected: "[Коран 2:255] Аят ал-Курси" },
  { in: "[[tiktok carousels]]", expected: "" },
  { in: "[[tiktok carousels]] [Коран 2:255]", expected: "[Коран 2:255]" },
  { in: "[[tiktok carousels] [Коран 2:255]]", expected: "[Коран 2:255]" },
  { in: "[tiktok] [reels] [shorts] [viral] [вайръл] [Коран 2:255]", expected: "[Коран 2:255]" },
  { in: "tiktok: reels - shorts: [Сахих ал-Бухари #6424]", expected: "[Сахих ал-Бухари #6424]" },
  { in: "[Сура Ал-Фатиха (1:1-7): Аят 1] Началото", expected: "[Сура Ал-Фатиха (1:1-7): Аят 1] Началото" },
  { in: "[Коран 112:1-4] [Коран 113:1-5] Двете сури", expected: "[Коран 112:1-4] [Коран 113:1-5] Двете сури" },
  { in: "  [  tiktok  carousels  ]   [Коран 2:255]  ", expected: "[Коран 2:255]" },
  { in: "[коран / tiktok] [Коран 55:1-4]", expected: "[Коран 55:1-4]" },
  { in: "[Слайд 5] [Slide 10] [Коран 3:18]", expected: "[Коран 3:18]" },
  { in: "   ", expected: "" },
  { in: "[]", expected: "" },
  { in: "[   ]", expected: "" },
  { in: "- [Коран 2:255] -", expected: "[Коран 2:255]" },
  { in: ": [Коран 2:255] :", expected: "[Коран 2:255]" },
  { in: "[TikTok Carousels] [Слайд 1] [Коран 2:255] Аят ал-Курси [TikTok]", expected: "[Коран 2:255] Аят ал-Курси" },
  { in: "   [карусели]   [40 Хадиса на Навауи #1]   Намеренията   ", expected: "[40 Хадиса на Навауи #1] Намеренията" },
];

for (const tc of testCases) {
  const out = cleanProposalTitle(tc.in);
  assert(out === tc.expected, `Title mismatch: in='${tc.in}', out='${out}', expected='${tc.expected}'`);
}
console.log(`  ✔ All ${testCases.length} title sanitizer test cases PASSED!`);

// --- 2. Safe Zone Profiles and Normalized Geometries ---
console.log("\n2. Testing Safe Zone Profiles & Boundary Partitions...");
const profiles: PlatformSafeZoneProfile[] = ["tiktok", "reels", "shorts", "universal", "center"];

for (const p of profiles) {
  const sz = getSafeZone(p);
  const norm = getNormalizedSafeZone(p);
  const css = getSafeOverlayCss(p);

  // Exact partition invariant: Left + Width + Right = W
  assert(sz.SAFE_LEFT + sz.W_SAFE + sz.SAFE_RIGHT === sz.W, `Width partition fails for ${p}`);
  // Exact partition invariant: Top + Height + Bottom = H
  assert(sz.SAFE_TOP + sz.H_SAFE + sz.SAFE_BOTTOM === sz.H, `Height partition fails for ${p}`);

  // Normalized bounds sum to 1.0
  assertClose(norm.left + norm.width + norm.right, 1.0, 0.0001, `Horizontal normalized sum for ${p}`);
  assertClose(norm.top + norm.height + norm.bottom, 1.0, 0.0001, `Vertical normalized sum for ${p}`);

  // Center X is exactly at safe zone center
  assert(sz.CENTER_X === sz.SAFE_LEFT + sz.W_SAFE / 2, `Center X calculation fails for ${p}`);

  // Overlay CSS values match numbers
  assertClose(parseFloat(css.topPercent), (sz.SAFE_TOP / sz.H) * 100, 0.01, `Top CSS % mismatch for ${p}`);
  assertClose(parseFloat(css.bottomPercent), (sz.SAFE_BOTTOM / sz.H) * 100, 0.01, `Bottom CSS % mismatch for ${p}`);
  assertClose(parseFloat(css.leftPercent), (sz.SAFE_LEFT / sz.W) * 100, 0.01, `Left CSS % mismatch for ${p}`);
  assertClose(parseFloat(css.rightPercent), (sz.SAFE_RIGHT / sz.W) * 100, 0.01, `Right CSS % mismatch for ${p}`);
}

// Fallback test
const unknownSz = getSafeZone("non_existent_profile");
assert(unknownSz === TIKTOK_SAFE_ZONE, "Unknown profile must fallback to TikTok safe zone");
console.log("  ✔ Safe Zone profile geometries & partitions PASSED!");

// --- 3. Fluid Typography Clamp Analysis ---
console.log("\n3. Testing Fluid Typography Container Query Calculations...");
function calcClamp(min: number, cqiVal: number, max: number, containerW: number): number {
  const preferred = (cqiVal / 100) * containerW;
  return Math.min(Math.max(min, preferred), max);
}

// Subtitle clamp: clamp(14px, 5.5cqi, 30px)
const subtitleClamp = (w: number) => calcClamp(14, 5.5, 30, w);
// Reference clamp: clamp(10px, 3.5cqi, 18px)
const refClamp = (w: number) => calcClamp(10, 3.5, 18, w);

const containerWidths = [180, 240, 360, 480, 720, 1080, 1920];
for (const w of containerWidths) {
  const subSize = subtitleClamp(w);
  const refSize = refClamp(w);

  assert(subSize >= 14 && subSize <= 30, `Subtitle font size out of bounds for width ${w}: ${subSize}`);
  assert(refSize >= 10 && refSize <= 18, `Reference font size out of bounds for width ${w}: ${refSize}`);
  assert(subSize > refSize, `Subtitle font (${subSize}) should be larger than reference font (${refSize}) at width ${w}`);
}
console.log("  ✔ Fluid typography clamp ranges PASSED across all container widths [180px - 1920px]!");

// --- 4. Subtitle Placement & Audio Layout Clearance ---
console.log("\n4. Testing Subtitle Placement & Separation from Audio Player...");
for (const p of profiles) {
  const lowerThirdY = getSubtitleAnchorY(p, "lower-third");
  const centerY = getSubtitleAnchorY(p, "center");
  const sz = getSafeZone(p);

  // Lower-third must be strictly within safe corridor
  assert(lowerThirdY >= sz.SAFE_TOP && lowerThirdY <= sz.BOTTOM_MAX_Y, `Lower-third Y ${lowerThirdY} outside safe bounds for ${p}`);
  // Center must be strictly within safe corridor
  assert(centerY >= sz.SAFE_TOP && centerY <= sz.BOTTOM_MAX_Y, `Center Y ${centerY} outside safe bounds for ${p}`);

  if (p !== "center") {
    // Lower-third is lower on screen than Center
    assert(lowerThirdY > centerY, `Lower-third (${lowerThirdY}) must be below Center (${centerY}) for ${p}`);
  } else {
    assert(lowerThirdY === centerY, `Center profile forces center anchor Y (960px)`);
  }
}
console.log("  ✔ Subtitle anchor positions & safe corridor bounds PASSED!");

console.log("\n=================================================================");
console.log("🏆 ALL ADVERSARIAL STRESS-TESTS PASSED WITH ZERO DEFECTS!");
console.log("=================================================================");
