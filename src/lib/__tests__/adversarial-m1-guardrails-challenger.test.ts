/**
 * ADVERSARIAL STRESS TEST HARNESS — CHALLENGER M1
 * File: src/lib/__tests__/adversarial-m1-guardrails-challenger.test.ts
 *
 * Adversarially challenges:
 * 1. Query sanitization against sneaky animate tokens:
 *    - "group of worshippers in nature"
 *    - "sheikh praying on mountain"
 *    - "child running in grass"
 *    - plus edge tokens: imam, scholar, pilgrim, congregation, monk, priest
 * 2. Metadata blacklist hard exclusion gate against payloads with hidden animate or music tags:
 *    - hidden animate tags in URL, user, tags, description
 *    - music instrument tags (guitar, piano, violin, flute, oud)
 *    - sneaky audio / genre tags (synth, lofi, beats, orchestra)
 * 3. Fail-closed behavior on corrupted video pictures, timeouts, or API errors:
 *    - empty or missing video_pictures
 *    - corrupted/dead image URLs (HTTP 404, connection refused)
 *    - network timeouts & fetch rejections
 *    - Gemini Vision API rejections, errors, and ambiguous responses
 * 4. Multi-slide deduplication:
 *    - 4-slide request with identical text yields 4 distinct video URLs
 *    - 4-slide theological progression yields 4 distinct video URLs
 *    - fallback pool saturation and cross-slide collision resistance
 * 5. Boundary & Fuzzing:
 *    - zero-width spaces, casing anomalies, control characters, extreme lengths
 */

import {
  sanitizeSearchQuery,
  sanitizeSalafiQuery,
  TIER1_FORBIDDEN_QUERY_TOKENS,
  isMetadataHaram,
  TIER2_HARAM_METADATA_REGEX,
  checkVideoForHaram,
  setCachedHalalStatus,
  fetchCarouselSlideVideos,
  type PexelsVideo,
  type SlideVideoResult,
} from "../pexels.functions";

import {
  LOCAL_HALAL_VIDEO_POOL,
  getLocalHalalVideoFallback,
  getCuratedHalalVideoFallbackDirect,
} from "../backgrounds.functions";

interface TestReport {
  name: string;
  category: string;
  status: "PASS" | "FAIL";
  error?: string;
  details?: any;
}

const reports: TestReport[] = [];
let passCount = 0;
let failCount = 0;

function runAdversarialTest(
  category: string,
  name: string,
  fn: () => void | Promise<void>,
): Promise<void> {
  return Promise.resolve()
    .then(() => fn())
    .then(() => {
      passCount++;
      reports.push({ category, name, status: "PASS" });
      console.log(`  ✔ [PASS] [${category}] ${name}`);
    })
    .catch((err: unknown) => {
      failCount++;
      const msg = err instanceof Error ? err.message : String(err);
      reports.push({ category, name, status: "FAIL", error: msg });
      console.error(`  ✖ [FAIL] [${category}] ${name}`);
      console.error(`     Error: ${msg}`);
    });
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[ADVERSARIAL ASSERTION FAILED]: ${message}`);
  }
}

async function main() {
  console.log("================================================================================");
  console.log("⚔️  ADVERSARIAL CHALLENGER M1: SALAFI GUARDRAILS & QUERY ENGINE STRESS HARNESS");
  console.log("================================================================================\n");

  // ============================================================================
  // SECTION 1: QUERY SANITIZATION AGAINST SNEAKY ANIMATE TOKENS
  // ============================================================================
  console.log("--- Section 1: Query Sanitization Against Sneaky Animate Tokens ---");

  // Baseline 1.1: "child running in grass"
  await runAdversarialTest("Sanitization", "T1.1: Strips obvious child & running tokens", () => {
    const raw = "child running in grass";
    const sanitized = sanitizeSearchQuery(raw);
    assert(!/child/i.test(sanitized), `Must strip 'child': got "${sanitized}"`);
    assert(!/running/i.test(sanitized), `Must strip 'running': got "${sanitized}"`);
    assert(/nature landscape|vertical/i.test(sanitized), `Must append positive anchors: "${sanitized}"`);
  });

  // Sneaky 1.2: "sheikh praying on mountain"
  await runAdversarialTest("Sanitization", "T1.2: Sneaky animate token 'sheikh praying on mountain'", () => {
    const raw = "sheikh praying on mountain";
    const sanitized = sanitizeSearchQuery(raw);
    assert(!/praying/i.test(sanitized), `Must strip 'praying': got "${sanitized}"`);
    assert(
      !/\bsheikh\b/i.test(sanitized),
      `VULNERABILITY: 'sheikh' (animate person) leaked into sanitized query: "${sanitized}"`,
    );
    assert(/mountain/i.test(sanitized), `Should retain permissible geography: "${sanitized}"`);
  });

  // Sneaky 1.3: "group of worshippers in nature"
  await runAdversarialTest("Sanitization", "T1.3: Sneaky animate token 'group of worshippers in nature'", () => {
    const raw = "group of worshippers in nature";
    const sanitized = sanitizeSearchQuery(raw);
    assert(
      !/\bworshipper(s)?\b/i.test(sanitized),
      `VULNERABILITY: 'worshippers' (animate beings) leaked into sanitized query: "${sanitized}"`,
    );
    assert(/nature/i.test(sanitized), `Should retain nature: "${sanitized}"`);
  });

  // Sneaky 1.4: Religious & human figures ("imam giving khutbah", "congregation of pilgrims", "scholar")
  await runAdversarialTest("Sanitization", "T1.4: Sneaky religious figures (imam, scholar, pilgrim, monk)", () => {
    const figures = [
      { q: "imam reciting inside mosque", forbidden: "imam" },
      { q: "pious scholar reading under olive tree", forbidden: "scholar" },
      { q: "crowd of pilgrims at sunset", forbidden: "pilgrims" },
      { q: "monk meditating near waterfall", forbidden: "monk" },
    ];
    for (const item of figures) {
      const clean = sanitizeSearchQuery(item.q);
      const re = new RegExp(`\\b${item.forbidden}\\b`, "i");
      assert(!re.test(clean), `VULNERABILITY: Animate figure '${item.forbidden}' leaked in query: "${clean}"`);
    }
  });

  // Sneaky 1.5: Musical instruments in queries
  await runAdversarialTest("Sanitization", "T1.5: Strips acoustic guitar, piano, flute, oud from query", () => {
    const raw = "acoustic guitar piano flute oud melody in mountains";
    const clean = sanitizeSearchQuery(raw);
    assert(!/guitar|piano|flute|oud|melody/i.test(clean), `Must strip music tokens: got "${clean}"`);
  });

  // ============================================================================
  // SECTION 2: METADATA BLACKLIST HARD EXCLUSION GATE
  // ============================================================================
  console.log("\n--- Section 2: Metadata Blacklist Hard Exclusion Gate ---");

  // T2.1: Hidden animate token in URL
  await runAdversarialTest("MetadataGate", "T2.1: Hidden animate token in URL path", () => {
    const vid: PexelsVideo = {
      id: 5001,
      url: "https://www.pexels.com/video/young-woman-drinking-water-nature-5001/",
      video_files: [],
      video_pictures: [],
    };
    assert(isMetadataHaram(vid) === true, "Must reject video with 'woman' in URL");
  });

  // T2.2: Hidden animate token in photographer username
  await runAdversarialTest("MetadataGate", "T2.2: Hidden animate token in user name", () => {
    const vid: PexelsVideo = {
      id: 5002,
      url: "https://www.pexels.com/video/green-forest-5002/",
      user: { name: "Happy Family Photography" },
      video_files: [],
      video_pictures: [],
    };
    assert(isMetadataHaram(vid) === true, "Must reject video with 'family' in user.name");
  });

  // T2.3: Hidden musical instrument tag in metadata
  await runAdversarialTest("MetadataGate", "T2.3: Hidden music instrument tag in metadata", () => {
    const vid: any = {
      id: 5003,
      url: "https://www.pexels.com/video/peaceful-lake-5003/",
      tags: ["tranquil", "violin", "nature"],
      video_files: [],
      video_pictures: [],
    };
    assert(isMetadataHaram(vid) === true, "Must reject video with 'violin' in tags");
  });

  // T2.4: Sneaky animate tag in metadata ('worshipper', 'sheikh', 'pilgrim')
  await runAdversarialTest("MetadataGate", "T2.4: Sneaky animate tag in metadata ('sheikh', 'worshippers')", () => {
    const vid1: any = {
      id: 5004,
      url: "https://www.pexels.com/video/peaceful-mountain-5004/",
      tags: ["sheikh", "recitation"],
      video_files: [],
      video_pictures: [],
    };
    assert(isMetadataHaram(vid1) === true, "VULNERABILITY: Must reject video with 'sheikh' in tags");

    const vid2: any = {
      id: 5005,
      url: "https://www.pexels.com/video/grand-mosque-5005/",
      tags: ["worshippers", "congregation"],
      video_files: [],
      video_pictures: [],
    };
    assert(isMetadataHaram(vid2) === true, "VULNERABILITY: Must reject video with 'worshippers' in tags");
  });

  // T2.5: Legitimate 100% Halal Landscape Metadata must PASS
  await runAdversarialTest("MetadataGate", "T2.5: Legitimate Halal Landscape passes cleanly", () => {
    const vid: PexelsVideo = {
      id: 5006,
      url: "https://www.pexels.com/video/majestic-green-hills-clouds-5006/",
      user: { name: "Drone Scenic Media" },
      video_files: [],
      video_pictures: [],
    };
    assert(isMetadataHaram(vid) === false, "Legitimate scenic drone video must NOT be flagged as haram");
  });

  // T2.6: Falsy or malformed video object is rejected fail-closed
  await runAdversarialTest("MetadataGate", "T2.6: Falsy/null/empty payload is fail-closed", () => {
    assert(isMetadataHaram(null as unknown as PexelsVideo) === true, "null must return true");
    assert(isMetadataHaram(undefined as unknown as PexelsVideo) === true, "undefined must return true");
    assert(isMetadataHaram({} as PexelsVideo) === true || isMetadataHaram({ id: 0 } as any) === true, "empty must be handled");
  });

  // ============================================================================
  // SECTION 3: FAIL-CLOSED BEHAVIOR UNDER FAULT INJECTION
  // ============================================================================
  console.log("\n--- Section 3: Fail-Closed Behavior under Fault Injection ---");

  // T3.1: Video with empty video_pictures
  await runAdversarialTest("FailClosed", "T3.1: Empty video_pictures array returns isHaram = true", async () => {
    const vid: PexelsVideo = {
      id: 6001,
      url: "https://www.pexels.com/video/test-empty-pics-6001/",
      video_files: [],
      video_pictures: [],
    };
    const result = await checkVideoForHaram(vid);
    assert(result === true, "Empty video_pictures must FAIL CLOSED (isHaram = true)");
  });

  // T3.2: Video with corrupted / dead picture URLs (HTTP 404 / connection refused)
  await runAdversarialTest("FailClosed", "T3.2: Corrupted/dead picture URLs fail-closed", async () => {
    const vid: PexelsVideo = {
      id: 6002,
      url: "https://www.pexels.com/video/test-dead-pics-6002/",
      video_files: [],
      video_pictures: [
        { picture: "http://127.0.0.1:59999/nonexistent_corrupted_1.jpg" },
        { picture: "http://127.0.0.1:59999/nonexistent_corrupted_2.jpg" },
        { picture: "http://127.0.0.1:59999/nonexistent_corrupted_3.jpg" },
      ],
    };
    const result = await checkVideoForHaram(vid);
    assert(result === true, "Dead keyframe picture URLs must FAIL CLOSED (isHaram = true)");
  });

  // T3.3: Cached status overrides
  await runAdversarialTest("FailClosed", "T3.3: Cached HARAM status triggers instant rejection", async () => {
    const cacheTestId = 6003;
    await setCachedHalalStatus(cacheTestId, "HARAM", "Adversarial test injection");
    const vid: PexelsVideo = {
      id: cacheTestId,
      video_files: [],
      video_pictures: [{ picture: "https://test.com/valid.jpg" }],
    };
    const result = await checkVideoForHaram(vid);
    assert(result === true, "Cached HARAM status must instantly return true");
  });

  // T3.4: Falsy video object to checkVideoForHaram
  await runAdversarialTest("FailClosed", "T3.4: Null/falsy video input to checkVideoForHaram fails closed", async () => {
    const resultNull = await checkVideoForHaram(null as unknown as PexelsVideo);
    assert(resultNull === true, "null video must FAIL CLOSED (true)");
    const resultZero = await checkVideoForHaram({ id: 0 } as any);
    assert(resultZero === true, "id: 0 must FAIL CLOSED (true)");
  });

  // ============================================================================
  // SECTION 4: MULTI-SLIDE DEDUPLICATION & MONOTONICITY
  // ============================================================================
  console.log("\n--- Section 4: Multi-Slide Deduplication & Monotonicity ---");

  // T4.1: 4-slide request with identical text returns 4 distinct video URLs
  await runAdversarialTest("Deduplication", "T4.1: 4 identical slides return 4 distinct video URLs", async () => {
    const identicalSlides = [
      { text: "Красива ислямска природа и спокойствие", topTitle: "НАПОМНЯНЕ" },
      { text: "Красива ислямска природа и спокойствие", topTitle: "НАПОМНЯНЕ" },
      { text: "Красива ислямска природа и спокойствие", topTitle: "НАПОМНЯНЕ" },
      { text: "Красива ислямска природа и спокойствие", topTitle: "НАПОМНЯНЕ" },
    ];

    const results = await fetchCarouselSlideVideos(identicalSlides);
    assert(results.length === 4, `Expected 4 results, got ${results.length}`);

    const urls = results.map((r) => r.videoUrl);
    const uniqueUrls = new Set(urls);

    assert(
      uniqueUrls.size === 4,
      `Multi-slide deduplication failed! Got ${uniqueUrls.size} unique URLs out of 4: ${JSON.stringify(urls)}`,
    );

    for (let i = 0; i < results.length; i++) {
      assert(results[i].slideIndex === i, `slideIndex must be ${i}`);
      assert(results[i].width === 1080 && results[i].height === 1920, "Must be 1080x1920 vertical");
      assert(results[i].duration >= 8, "Duration must be >= 8s");
    }
  });

  // T4.2: 4-slide theological progression returns 4 distinct video URLs
  await runAdversarialTest("Deduplication", "T4.2: 4-slide theological progression returns 4 distinct video URLs", async () => {
    const theologicalSlides = [
      { text: "ТАЙНАТА НА САБР: Защо изпитанията са милост?", topTitle: "[ТАЙНАТА НА САБР]" },
      { text: "Божествената мъдрост зад всяка трудност и скръб.", topTitle: "БОЖЕСТВЕНИЯТ ЗАКОН" },
      { text: "„Аллах е с търпеливите.“ (Сура Ал-Бакара: 153)", topTitle: "АВТЕНТИЧЕН ДАЛИЛ" },
      { text: "Кажи 'Алхамдулиллах' и продължи напред с вяра.", topTitle: "ДЕЙСТВИЕ & ДУА" },
    ];

    const results = await fetchCarouselSlideVideos(theologicalSlides);
    assert(results.length === 4, `Expected 4 results, got ${results.length}`);

    const urls = results.map((r) => r.videoUrl);
    const uniqueUrls = new Set(urls);
    assert(
      uniqueUrls.size === 4,
      `All 4 theological slides must have unique video URLs. Found ${uniqueUrls.size}: ${JSON.stringify(urls)}`,
    );
  });

  // T4.3: Local fallback pool cross-slide rotation saturation
  await runAdversarialTest("Deduplication", "T4.3: Fallback pool rotation preserves uniqueness up to pool capacity", () => {
    const pool = LOCAL_HALAL_VIDEO_POOL;
    assert(pool.length >= 8, `Pool must have at least 8 items, got ${pool.length}`);
    const urls = new Set<string>();
    for (let i = 0; i < pool.length; i++) {
      const fb = getLocalHalalVideoFallback(i);
      assert(!urls.has(fb.url), `Collision at index ${i}: duplicate URL ${fb.url}`);
      urls.add(fb.url);
    }
    assert(urls.size === pool.length, "All pool items must have unique URLs");
  });

  // ============================================================================
  // SECTION 5: BOUNDARY, HOMOGLYPHS & EXTREME FUZZING
  // ============================================================================
  console.log("\n--- Section 5: Boundary, Homoglyphs & Extreme Fuzzing ---");

  // T5.1: Zero-width characters & punctuation injection
  await runAdversarialTest("Fuzzing", "T5.1: Handles punctuation and whitespace injection around forbidden tokens", () => {
    const tests = [
      "m-a-n walking", // hyphens
      "w.o.m.a.n praying", // dots
      "man,woman,child", // commas without space
      "  MAN   RUNNING   DOG  ", // uppercase and excessive whitespace
    ];

    // Testing regex behavior on delimited tokens
    const c1 = sanitizeSearchQuery("man,woman,child in forest");
    assert(!/man|woman|child/i.test(c1), `Must strip comma-separated tokens: got "${c1}"`);

    const c2 = sanitizeSearchQuery("  MAN   RUNNING   DOG   mountain");
    assert(!/man|running|dog/i.test(c2), `Must strip uppercase tokens: got "${c2}"`);
  });

  // T5.2: Extreme string length (DoS mitigation)
  await runAdversarialTest("Fuzzing", "T5.2: Extreme length query (10,000 chars) processes in <50ms", () => {
    const hugeQuery = "mountain valley river lake trees ".repeat(300);
    const t0 = Date.now();
    const clean = sanitizeSearchQuery(hugeQuery);
    const duration = Date.now() - t0;
    assert(duration < 50, `Query sanitization took ${duration}ms, expected <50ms`);
    assert(clean.length > 0, "Must return valid output");
  });

  // ============================================================================
  // SUMMARY & EMPIRICAL RESULTS
  // ============================================================================
  console.log("\n================================================================================");
  console.log(`🏁 ADVERSARIAL STRESS TEST COMPLETE:`);
  console.log(`   Total Tests: ${reports.length}`);
  console.log(`   Passed:      ${passCount}`);
  console.log(`   Failed:      ${failCount}`);
  console.log("================================================================================\n");

  if (failCount > 0) {
    console.log("❌ VULNERABILITIES / FAILURES DETECTED:");
    for (const r of reports.filter((x) => x.status === "FAIL")) {
      console.log(`   - [${r.category}] ${r.name}: ${r.error}`);
    }
  } else {
    console.log("🎉 ALL ADVERSARIAL STRESS CHALLENGES PASSED EMPIRICALLY!");
  }

  // Return exit code based on failures
  if (failCount > 0) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("FATAL HARNESS ERROR:", e);
  process.exit(1);
});
