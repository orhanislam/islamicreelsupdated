/**
 * Adversarial Challenger 2 Stress-Test Harness: R3 & R4
 *
 * Requirements Challenged:
 * - R3: Title Sanitizer (cleanProposalTitle)
 * - R4: Dynamic Background Pool & Rotation (getCarouselBackgrounds / LOCAL_BACKGROUND_POOL)
 */

import * as fs from "fs";
import * as path from "path";
import { cleanProposalTitle } from "../assistant.functions";
import { LOCAL_BACKGROUND_POOL, getCarouselBackgroundsDirect } from "../backgrounds.functions";

let passedCount = 0;
let failedCount = 0;
const failures: string[] = [];

function challenge(name: string, fn: () => void | Promise<void>) {
  return (async () => {
    try {
      await fn();
      passedCount++;
      console.log(`  [PASS] ${name}`);
    } catch (err: any) {
      failedCount++;
      const msg = `  [FAIL] ${name}: ${err?.message || String(err)}`;
      failures.push(msg);
      console.error(msg);
    }
  })();
}

function assertEq<T>(actual: T, expected: T, msg: string) {
  if (actual !== expected) {
    throw new Error(`${msg} -> Expected: "${expected}", Received: "${actual}"`);
  }
}

function assertTrue(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function runAdversarialSuite() {
  console.log("=================================================================");
  console.log("⚔️ STARTING ADVERSARIAL STRESS-TESTS: R3 & R4");
  console.log("=================================================================\n");

  // =========================================================================
  // SECTION 1: Adversarial Stress-Testing for cleanProposalTitle (R3)
  // =========================================================================
  console.log("--- SECTION 1: Adversarial Stress-Testing `cleanProposalTitle` (R3) ---");

  // 1.1 Non-string and pathological falsy inputs
  await challenge("1.1.1 null input -> empty string", () => {
    assertEq(cleanProposalTitle(null as any), "", "null must return empty string");
  });

  await challenge("1.1.2 undefined input -> empty string", () => {
    assertEq(cleanProposalTitle(undefined as any), "", "undefined must return empty string");
  });

  await challenge("1.1.3 number input (42) -> empty string", () => {
    assertEq(cleanProposalTitle(42 as any), "", "numeric input must return empty string");
  });

  await challenge("1.1.4 object input ({}) -> empty string", () => {
    assertEq(cleanProposalTitle({} as any), "", "object input must return empty string");
  });

  await challenge("1.1.5 array input ([]) -> empty string", () => {
    assertEq(cleanProposalTitle([] as any), "", "array input must return empty string");
  });

  await challenge("1.1.6 boolean input (true/false) -> empty string", () => {
    assertEq(cleanProposalTitle(true as any), "", "boolean input must return empty string");
    assertEq(cleanProposalTitle(false as any), "", "boolean input must return empty string");
  });

  // 1.2 Whitespace and Empty Strings
  await challenge("1.2.1 Empty string -> empty string", () => {
    assertEq(cleanProposalTitle(""), "", "empty string must return empty string");
  });

  await challenge("1.2.2 Only spaces/tabs/newlines -> empty string", () => {
    assertEq(cleanProposalTitle("     "), "", "spaces only must return empty string");
    assertEq(cleanProposalTitle("\t\n  \r\n\t "), "", "whitespace mix must return empty string");
  });

  // 1.3 Case Variations & Internal Spacing in Meta Tags
  await challenge("1.3.1 Uppercase [TIKTOK CAROUSELS]", () => {
    assertEq(
      cleanProposalTitle("[TIKTOK CAROUSELS] [Коран 2:255] Аят ал-Курси"),
      "[Коран 2:255] Аят ал-Курси",
      "Uppercase [TIKTOK CAROUSELS] must be stripped",
    );
  });

  await challenge("1.3.2 Mixed case [tIkToK cArOuSeL]", () => {
    assertEq(
      cleanProposalTitle("[tIkToK cArOuSeL] 5 стълба на Исляма"),
      "5 стълба на Исляма",
      "Mixed case [tIkToK cArOuSeL] must be stripped",
    );
  });

  await challenge("1.3.3 Cyrillic variations [КАРУСЕЛИ], [КаРуСеЛ]", () => {
    assertEq(
      cleanProposalTitle("[КАРУСЕЛИ] Тайната на успеха"),
      "Тайната на успеха",
      "Cyrillic [КАРУСЕЛИ] must be stripped",
    );
    assertEq(
      cleanProposalTitle("[КаРуСеЛ] [Сахих ал-Бухари #1] Намеренията"),
      "[Сахих ал-Бухари #1] Намеренията",
      "Cyrillic mixed case [КаРуСеЛ] must be stripped",
    );
  });

  await challenge("1.3.4 Spacing variations inside brackets: [  tiktok   carousels  ]", () => {
    assertEq(
      cleanProposalTitle("[  tiktok   carousels  ] Упование в Аллах"),
      "Упование в Аллах",
      "Extra spaces inside brackets must be handled",
    );
    assertEq(
      cleanProposalTitle("[   карусел   ] Търпение"),
      "Търпение",
      "Extra spaces inside Cyrillic brackets must be handled",
    );
  });

  await challenge("1.3.5 [Коран / TikTok] and [tiktok / коран] case & space variations", () => {
    assertEq(
      cleanProposalTitle("[КОРАН / TIKTOK] Сура Ал-Мулк"),
      "Сура Ал-Мулк",
      "Upper [КОРАН / TIKTOK] must be stripped",
    );
    assertEq(
      cleanProposalTitle("[ tiktok / коран ] [Коран 67:1] Благословеният"),
      "[Коран 67:1] Благословеният",
      "Spaces [ tiktok / коран ] must be stripped while preserving Quran tag",
    );
  });

  // 1.4 Trailing/Leading Punctuation & Separators
  await challenge("1.4.1 Colon and dash separators after tag", () => {
    assertEq(
      cleanProposalTitle("[tiktok carousels]: Заглавие на видеото"),
      "Заглавие на видеото",
      "Colon after meta tag must be stripped",
    );
    assertEq(
      cleanProposalTitle("[tiktok carousels] - [Коран 2:255] Аят ал-Курси"),
      "[Коран 2:255] Аят ал-Курси",
      "Dash after meta tag must be stripped",
    );
    assertEq(
      cleanProposalTitle("tiktok carousels: Търпението (Сабр)"),
      "Търпението (Сабр)",
      "Unbracketed 'tiktok carousels:' must be stripped",
    );
    assertEq(
      cleanProposalTitle("tiktok - Мъдростта"),
      "Мъдростта",
      "Unbracketed 'tiktok -' must be stripped",
    );
    assertEq(
      cleanProposalTitle("карусел: 3 съвета за молитвата"),
      "3 съвета за молитвата",
      "Unbracketed 'карусел:' must be stripped",
    );
  });

  // 1.5 Mixed Citations & Multi-Tag Stacking
  await challenge("1.5.1 Stacked meta tags before citation", () => {
    assertEq(
      cleanProposalTitle("[tiktok carousels] [карусели] [tiktok] [Коран 3:103] Обединението"),
      "[Коран 3:103] Обединението",
      "Multiple stacked meta tags must all be stripped",
    );
  });

  await challenge("1.5.2 Meta tag placed after citation", () => {
    assertEq(
      cleanProposalTitle("[Коран 2:255] [tiktok carousels] Аят ал-Курси"),
      "[Коран 2:255] Аят ал-Курси",
      "Embedded meta tag after Quran citation must be stripped",
    );
    assertEq(
      cleanProposalTitle("[Сахих ал-Бухари #6424] [карусел] Скритата милост"),
      "[Сахих ал-Бухари #6424] Скритата милост",
      "Embedded [карусел] tag after Hadith citation must be stripped",
    );
  });

  await challenge("1.5.3 Meta tag at the end of title", () => {
    assertEq(
      cleanProposalTitle("[Коран 112:1-4] Единството на Аллах [tiktok carousels]"),
      "[Коран 112:1-4] Единството на Аллах",
      "Trailing meta tag at end of title must be stripped",
    );
  });

  // 1.5.4 Nested bracket stress testing
  await challenge("1.5.4 Nested bracket scenarios: [[tiktok carousels]], [[tiktok carousels] [Коран 2:255]]", () => {
    // Single nested bracket: inner tag is stripped
    const resSingle = cleanProposalTitle("[[tiktok carousels]]");
    assertTrue(!resSingle.toLowerCase().includes("tiktok"), "Nested tag 'tiktok' must be eliminated");

    // Nested tag combined with Dalil citation
    const resWithDalil = cleanProposalTitle("[[tiktok carousels] [Коран 2:255]]");
    assertTrue(!resWithDalil.toLowerCase().includes("tiktok"), "Nested tag 'tiktok' must be eliminated");
    assertTrue(resWithDalil.includes("Коран 2:255"), "Dalil citation must remain intact");

    // Nested tag with title text
    const resWithText = cleanProposalTitle("[[tiktok carousels] [Коран 2:255]] Аят ал-Курси");
    assertTrue(!resWithText.toLowerCase().includes("tiktok"), "Nested tag 'tiktok' must be eliminated");
    assertTrue(resWithText.includes("Коран 2:255"), "Dalil citation must remain intact");
    assertTrue(resWithText.includes("Аят ал-Курси"), "Title text must remain intact");
  });

  // 1.6 Authentic Citations & Sacred Name Invariance
  await challenge("1.6.1 Preservation of authentic Quran tags with various brackets", () => {
    assertEq(
      cleanProposalTitle("[Коран 2:255] Аят ал-Курси • Тронът на Аллах"),
      "[Коран 2:255] Аят ал-Курси • Тронът на Аллах",
      "Quran reference must be 100% preserved",
    );
    assertEq(
      cleanProposalTitle("[Сура Ал-Фатиха (1:1-7)] Откриващата"),
      "[Сура Ал-Фатиха (1:1-7)] Откриващата",
      "Surah name with parentheses must be preserved",
    );
    assertEq(
      cleanProposalTitle("[Коран 18:10] Младежите от пещерата"),
      "[Коран 18:10] Младежите от пещерата",
      "Surah reference must be preserved",
    );
  });

  await challenge("1.6.2 Preservation of authentic Hadith collections and numbers", () => {
    assertEq(
      cleanProposalTitle("[Сахих ал-Бухари #6424] Изпитанията"),
      "[Сахих ал-Бухари #6424] Изпитанията",
      "Bukhari reference must be preserved",
    );
    assertEq(
      cleanProposalTitle("[Сахих Муслим #2699] Търсенето на знание"),
      "[Сахих Муслим #2699] Търсенето на знание",
      "Muslim reference must be preserved",
    );
    assertEq(
      cleanProposalTitle("[Сунан Ат-Тирмизи #1987] Добрият нрав"),
      "[Сунан Ат-Тирмизи #1987] Добрият нрав",
      "Tirmidhi reference must be preserved",
    );
    assertEq(
      cleanProposalTitle("[40 Хадиса на Ан-Науауи #1] Намеренията (Нийя)"),
      "[40 Хадиса на Ан-Науауи #1] Намеренията (Нийя)",
      "Nawawi reference must be preserved",
    );
  });

  // 1.7 Pathological & Boundary Strings
  await challenge("1.7.1 Extremely long title with repeated spaces", () => {
    const long = "[tiktok carousels]     " + "Дуа за защита ".repeat(20) + "    ";
    const cleaned = cleanProposalTitle(long);
    assertTrue(!cleaned.includes("tiktok"), "Must not contain 'tiktok'");
    assertTrue(cleaned.startsWith("Дуа за защита"), "Must start cleanly with content");
    assertTrue(!cleaned.includes("  "), "Must normalize multiple consecutive spaces");
  });

  await challenge("1.7.2 Title with emojis and special symbols", () => {
    assertEq(
      cleanProposalTitle("[tiktok carousels] ✨ [Коран 55:13] Кое от благата на вашия Господ ще отречете? 🌟"),
      "✨ [Коран 55:13] Кое от благата на вашия Господ ще отречете? 🌟",
      "Emojis around title must be preserved while meta tag is stripped",
    );
  });

  await challenge("1.7.3 Unicode Arabic characters in title", () => {
    assertEq(
      cleanProposalTitle("[tiktok carousels] [Коран 2:255] اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ"),
      "[Коран 2:255] اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ",
      "Arabic script and harakat must remain intact",
    );
  });

  // =========================================================================
  // SECTION 2: Adversarial Stress-Testing for Dynamic Backgrounds (R4)
  // =========================================================================
  console.log("\n--- SECTION 2: Adversarial Stress-Testing `getCarouselBackgrounds` (R4) ---");

  // 2.1 LOCAL_BACKGROUND_POOL Static Analysis & Physical Asset Integrity
  await challenge("2.1.1 Verify LOCAL_BACKGROUND_POOL contains exactly 8 assets", () => {
    assertTrue(Array.isArray(LOCAL_BACKGROUND_POOL), "Pool must be an array");
    assertEq(LOCAL_BACKGROUND_POOL.length, 8, "Pool must contain exactly 8 background assets");
  });

  await challenge("2.1.2 Verify every asset in LOCAL_BACKGROUND_POOL exists physically on disk", () => {
    for (const relPath of LOCAL_BACKGROUND_POOL) {
      const absPath = path.resolve(process.cwd(), relPath);
      assertTrue(fs.existsSync(absPath), `Asset file must exist on disk: ${relPath} (${absPath})`);
      const stat = fs.statSync(absPath);
      assertTrue(stat.size > 10_000, `Asset ${relPath} size must be > 10KB, got ${stat.size} bytes`);
    }
  });

  await challenge("2.1.3 Verify every asset has valid JPEG magic bytes (FF D8 FF)", () => {
    for (const relPath of LOCAL_BACKGROUND_POOL) {
      const absPath = path.resolve(process.cwd(), relPath);
      const buf = fs.readFileSync(absPath);
      assertTrue(buf.length >= 3, `Asset ${relPath} too short`);
      assertTrue(
        buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff,
        `Asset ${relPath} must have JPEG magic bytes 0xFF 0xD8 0xFF (found: ${buf[0]?.toString(16)} ${buf[1]?.toString(16)} ${buf[2]?.toString(16)})`,
      );
    }
  });

  // 2.2 100 Consecutive Cycle Indices Stress-Test
  await challenge("2.2.1 100 consecutive cycles (0..99) return valid 4-slide Data URLs", async () => {
    for (let cycle = 0; cycle < 100; cycle++) {
      const res = await getCarouselBackgroundsDirect({ count: 4, cycleIndex: cycle });
      assertTrue(Array.isArray(res.backgrounds), `Cycle ${cycle}: backgrounds must be an array`);
      assertEq(res.backgrounds.length, 4, `Cycle ${cycle}: must return exactly 4 backgrounds`);

      // All 4 backgrounds in a 4-slide carousel must be unique
      const uniqueInSlide = new Set(res.backgrounds);
      assertEq(uniqueInSlide.size, 4, `Cycle ${cycle}: all 4 slide backgrounds must be distinct`);

      // Each must be a valid non-empty Data URL
      for (let i = 0; i < res.backgrounds.length; i++) {
        const bg = res.backgrounds[i];
        assertTrue(
          bg.startsWith("data:image/jpeg;base64,") || bg.startsWith("data:image/"),
          `Cycle ${cycle} slide ${i}: must start with data:image/`,
        );
        assertTrue(bg.length > 1000, `Cycle ${cycle} slide ${i}: base64 data too short (${bg.length} chars)`);
      }
    }
  });

  // 2.3 Modulo Wrap-Around & Deterministic Cycling
  await challenge("2.3.1 Modulo wrap-around period is exactly 2 for count=4, pool=8", async () => {
    // With pool=8 and count=4:
    // Cycle 0: assets 0,1,2,3
    // Cycle 1: assets 4,5,6,7
    // Cycle 2: assets 0,1,2,3 (identical to Cycle 0)
    // Cycle 3: assets 4,5,6,7 (identical to Cycle 1)
    const c0 = await getCarouselBackgroundsDirect({ count: 4, cycleIndex: 0 });
    const c1 = await getCarouselBackgroundsDirect({ count: 4, cycleIndex: 1 });
    const c2 = await getCarouselBackgroundsDirect({ count: 4, cycleIndex: 2 });
    const c3 = await getCarouselBackgroundsDirect({ count: 4, cycleIndex: 3 });
    const c100 = await getCarouselBackgroundsDirect({ count: 4, cycleIndex: 100 });
    const c101 = await getCarouselBackgroundsDirect({ count: 4, cycleIndex: 101 });

    // c0 and c1 must be disjoint
    const overlap01 = c0.backgrounds.filter((bg) => c1.backgrounds.includes(bg));
    assertEq(overlap01.length, 0, "Cycle 0 and Cycle 1 must have 0 overlapping backgrounds");

    // c0 and c2 must be identical
    for (let i = 0; i < 4; i++) {
      assertEq(c0.backgrounds[i], c2.backgrounds[i], `c0[${i}] must match c2[${i}]`);
    }

    // c1 and c3 must be identical
    for (let i = 0; i < 4; i++) {
      assertEq(c1.backgrounds[i], c3.backgrounds[i], `c1[${i}] must match c3[${i}]`);
    }

    // c100 (even) matches c0, c101 (odd) matches c1
    for (let i = 0; i < 4; i++) {
      assertEq(c0.backgrounds[i], c100.backgrounds[i], `c0[${i}] must match c100[${i}]`);
      assertEq(c1.backgrounds[i], c101.backgrounds[i], `c1[${i}] must match c101[${i}]`);
    }
  });

  // 2.4 Uniformity & Asset Pool Distribution over 100 Cycles
  await challenge("2.4.1 Asset pool usage across 100 cycles is perfectly uniform", async () => {
    const assetHits = new Map<string, number>();

    for (let cycle = 0; cycle < 100; cycle++) {
      const res = await getCarouselBackgroundsDirect({ count: 4, cycleIndex: cycle });
      for (const bg of res.backgrounds) {
        assetHits.set(bg, (assetHits.get(bg) || 0) + 1);
      }
    }

    assertEq(assetHits.size, 8, "All 8 unique assets in pool must be served over 100 cycles");

    // In 100 cycles of count=4, total slides = 400. 400 / 8 = 50 hits each.
    for (const [bg, count] of assetHits.entries()) {
      assertEq(count, 50, `Each of the 8 assets must be served exactly 50 times across 100 cycles (got ${count})`);
    }
  });

  // 2.5 Variable Slide Count & Boundary Clamping
  await challenge("2.5.1 Variable count parameter (count = 1, 3, 5, 8, 10)", async () => {
    for (const c of [1, 3, 5, 8, 10]) {
      const res = await getCarouselBackgroundsDirect({ count: c, cycleIndex: 0 });
      assertEq(res.backgrounds.length, c, `Requesting count=${c} must return ${c} backgrounds`);
    }
  });

  await challenge("2.5.2 Clamping edge cases: count = 0, count = -5, count = 100, undefined", async () => {
    // count = 0 -> falsy in JS (0 || 4), defaults safely to standard 4 slides
    const res0 = await getCarouselBackgroundsDirect({ count: 0 });
    assertEq(res0.backgrounds.length, 4, "count=0 defaults safely to standard carousel count of 4");

    // count = -5 -> truthy number clamped by Math.max(1, ...) to 1
    const resNeg = await getCarouselBackgroundsDirect({ count: -5 });
    assertEq(resNeg.backgrounds.length, 1, "negative count clamped to min 1");

    // count = 100 -> clamped to max 20
    const resOver = await getCarouselBackgroundsDirect({ count: 100 });
    assertEq(resOver.backgrounds.length, 20, "count=100 clamped to max 20");

    // undefined data -> defaults to 4
    const resDef = await getCarouselBackgroundsDirect(undefined);
    assertEq(resDef.backgrounds.length, 4, "undefined data defaults to count=4");

    // negative cycleIndex -> clamped to 0
    const resNegCycle = await getCarouselBackgroundsDirect({ count: 4, cycleIndex: -10 });
    const resZeroCycle = await getCarouselBackgroundsDirect({ count: 4, cycleIndex: 0 });
    for (let i = 0; i < 4; i++) {
      assertEq(resNegCycle.backgrounds[i], resZeroCycle.backgrounds[i], `negative cycleIndex clamped to 0`);
    }
  });

  // 2.6 Fault Tolerance & Fallback Gracefulness on Missing Asset Files
  await challenge("2.6.1 Graceful fallback to SVG placeholder when asset is unreadable", async () => {
    // Temporarily point LOCAL_BACKGROUND_POOL to a nonexistent file
    const originalPool = [...LOCAL_BACKGROUND_POOL];
    try {
      (LOCAL_BACKGROUND_POOL as any)[0] = "tiktok_images/NON_EXISTENT_GHOST_FILE_12345.jpg";

      const res = await getCarouselBackgroundsDirect({ count: 4, cycleIndex: 0 });
      assertEq(res.backgrounds.length, 4, "Must still return 4 items even when one asset is missing");

      // Slide 0 should be the fallback SVG Data URL
      const slide0 = res.backgrounds[0];
      assertTrue(
        slide0.startsWith("data:image/svg+xml;utf8,"),
        `Missing file must gracefully fallback to SVG Data URL, got: ${slide0.substring(0, 40)}`,
      );
      assertTrue(slide0.includes("<svg"), "SVG fallback must contain valid SVG tag");
      assertTrue(slide0.includes("1080") && slide0.includes("1920"), "SVG fallback must match 1080x1920 dimensions");

      // Slides 1, 2, 3 should still be valid JPEG Data URLs from existing files
      for (let i = 1; i < 4; i++) {
        assertTrue(
          res.backgrounds[i].startsWith("data:image/jpeg;base64,"),
          `Slide ${i} must still succeed with valid JPEG data`,
        );
      }
    } finally {
      // Restore pool
      for (let i = 0; i < originalPool.length; i++) {
        LOCAL_BACKGROUND_POOL[i] = originalPool[i];
      }
    }
  });

  // 2.7 Concurrency Stress Test
  await challenge("2.7.1 20 concurrent background fetches with randomized cycle indices", async () => {
    const promises = Array.from({ length: 20 }, (_, idx) =>
      getCarouselBackgroundsDirect({ count: 4, cycleIndex: idx * 3 }),
    );
    const results = await Promise.all(promises);
    assertEq(results.length, 20, "All 20 concurrent requests must resolve");
    for (let i = 0; i < results.length; i++) {
      assertEq(results[i].backgrounds.length, 4, `Concurrent request ${i} must return 4 backgrounds`);
    }
  });

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log("\n=================================================================");
  console.log(`🏁 ADVERSARIAL STRESS-TEST RESULTS`);
  console.log(`Passed: ${passedCount}`);
  console.log(`Failed: ${failedCount}`);
  console.log(`Total:  ${passedCount + failedCount}`);
  console.log("=================================================================");

  if (failedCount > 0) {
    console.error("\n❌ FAILED CHALLENGES:");
    failures.forEach((f) => console.error(f));
    throw new Error(`${failedCount} adversarial challenge(s) failed!`);
  } else {
    console.log("\n🎉 ALL ADVERSARIAL CHALLENGES PASSED EMPIRICALLY! (100% SUCCESS)\n");
  }
}

runAdversarialSuite().catch((err) => {
  console.error("Critical test execution failure:", err);
  process.exit(1);
});
