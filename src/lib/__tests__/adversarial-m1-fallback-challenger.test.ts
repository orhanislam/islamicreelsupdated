/**
 * ADVERSARIAL STRESS TEST HARNESS — CHALLENGER M1.2
 * File: src/lib/__tests__/adversarial-m1-fallback-challenger.test.ts
 *
 * Empirical Challenge Dimensions:
 * 1. Missing / Empty / Whitespace PEXELS_API_KEY:
 *    - Seamless fallback to LOCAL_HALAL_VIDEO_POOL
 *    - Valid 1080x1920 MP4 loops, duration >= 8s
 *    - Cross-slide deduplication and pool exhaustion resilience (> 8 slides)
 * 2. HTTP 429 Rate-Limit & Network Fault Simulation:
 *    - Simulated HTTP 429 Too Many Requests
 *    - HTTP 500, 502, 503 Server Errors
 *    - Network timeouts, AbortError, ECONNRESET
 *    - Malformed HTML/Garbage API responses
 *    - Zero unhandled exceptions and seamless fallback
 * 3. Empty / Whitespace / Malformed / Extreme Slide Inputs:
 *    - Empty slide array []
 *    - Empty string & whitespace-only slide text
 *    - 10,000-character extreme length slides (Regex & ReDoS safety)
 *    - Injection vectors: SQL, HTML/XSS, unicode, emojis, Arabic tashkeel, null bytes
 *    - Partial property permutations (missing titles, prompts, bodies)
 * 4. Modulo Arithmetic & Asset Pool Bounds Resilience:
 *    - Restored LOCAL_BACKGROUND_POOL integrity (8 verified physical JPEG assets)
 *    - Integer fuzzing across extreme intervals [-999999, 999999]
 *    - Non-integer / Float / Infinity modulo robustness analysis
 *    - getLocalHalalVideoFallback resilience across negative and float indices
 * 5. Disk Cache Corruption & Self-Healing:
 *    - Corrupted non-JSON garbage in halal_verified_videos.json
 *    - Empty 0-byte file and malformed schema (strings/arrays/nulls)
 *    - Self-healing recovery: writing after corruption restores valid JSON
 *    - Concurrent write stress (20 simultaneous async writes under cache lock)
 */

import fs from "node:fs";
import path from "node:path";

import {
  fetchCarouselSlideVideos,
  sanitizeSearchQuery,
  detectSlideRole,
  matchTheologicalConcept,
  getCachedHalalStatus,
  setCachedHalalStatus,
  loadHalalDiskCache,
  getHalalCacheFilePath,
  ensureHalalCacheDir,
  type SlideVideoResult,
  type CarouselSlideInput,
} from "../pexels.functions";

import {
  LOCAL_BACKGROUND_POOL,
  LOCAL_HALAL_VIDEO_POOL,
  getLocalHalalVideoFallback,
  getCuratedHalalVideoFallbackDirect,
  getCarouselBackgroundsDirect,
} from "../backgrounds.functions";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures: string[] = [];

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED]: ${message}`);
  }
}

async function runTest(name: string, fn: () => Promise<void> | void) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  ✔ [PASS] ${name}`);
  } catch (err: unknown) {
    failedTests++;
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  ✖ [FAIL] ${name}: ${msg}`);
    failures.push(`${name}: ${msg}`);
  }
}

async function runAdversarialM1ChallengerSuite() {
  console.log("================================================================================");
  console.log("⚡ ADVERSARIAL CHALLENGER M1: FALLBACK POOL, CACHING & FAULT TOLERANCE HARNESS");
  console.log("================================================================================\n");

  const originalEnvKey = process.env.PEXELS_API_KEY;
  const originalFetch = global.fetch;

  // ============================================================================
  // SECTION 1: MISSING, EMPTY, AND WHITESPACE PEXELS_API_KEY CHALLENGE
  // ============================================================================
  console.log("--- Section 1: Missing / Empty / Whitespace PEXELS_API_KEY ---");

  const standardTestSlides: CarouselSlideInput[] = [
    {
      topTitle: "[ТАЙНАТА НА РИЗКА]",
      text: "Защо работиш неуморно, но парите все не стигат? Ето скритият закон.",
    },
    {
      topTitle: "БОЖЕСТВЕНИЯТ ЗАКОН",
      text: "Ризкът (препитанието) е начертан. Твоята грижа е да положиш усилия и тауаккул.",
    },
    {
      topTitle: "СВЕЩЕН ДАЛИЛ",
      text: "„И който се бои от Аллах, Той ще му стори изход и ще му даде препитание...“ (Ат-Талак: 2-3)",
    },
    {
      topTitle: "ПЛАН ЗА ДЕЙСТВИЕ",
      text: "Запази този рийл, направи истигфар и напиши 'Алхамдулиллах' за берекет.",
    },
  ];

  await runTest("1.1: Empty PEXELS_API_KEY ('') triggers seamless local fallback", async () => {
    process.env.PEXELS_API_KEY = "";
    const results = await fetchCarouselSlideVideos(standardTestSlides);

    assert(results.length === 4, `Expected 4 slides, got ${results.length}`);
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      assert(r.slideIndex === i, `Slide index mismatch at ${i}`);
      assert(r.source === "local_fallback", `Expected source 'local_fallback', got '${r.source}'`);
      assert(r.width === 1080, `Width must be 1080, got ${r.width}`);
      assert(r.height === 1920, `Height must be 1920, got ${r.height}`);
      assert(r.duration >= 8, `Duration must be >= 8s, got ${r.duration}`);
      assert(typeof r.videoUrl === "string" && r.videoUrl.length > 10, "videoUrl must be valid");
      assert(typeof r.theme === "string" && r.theme.length > 0, "theme must be populated");
    }

    // Cross-slide deduplication
    const distinctUrls = new Set(results.map((r) => r.videoUrl));
    assert(distinctUrls.size === 4, `Expected 4 distinct video URLs, got ${distinctUrls.size}`);
  });

  await runTest("1.2: Undefined PEXELS_API_KEY triggers seamless fallback", async () => {
    delete process.env.PEXELS_API_KEY;
    const results = await fetchCarouselSlideVideos(standardTestSlides);

    assert(results.length === 4, `Expected 4 slides, got ${results.length}`);
    assert(results.every((r) => r.source === "local_fallback"), "All sources must be local_fallback");
    assert(results.every((r) => r.width === 1080 && r.height === 1920), "All must be 1080x1920");
  });

  await runTest("1.3: Whitespace-only PEXELS_API_KEY ('  \\t\\n  ') safely treated as empty", async () => {
    process.env.PEXELS_API_KEY = "   \t\n  ";
    let fetchCalled = false;
    global.fetch = async (..._args: unknown[]) => {
      fetchCalled = true;
      throw new Error("fetch should not be called with whitespace API key!");
    };

    try {
      const results = await fetchCarouselSlideVideos(standardTestSlides);
      assert(!fetchCalled, "Pexels fetch must NOT be invoked when key is whitespace");
      assert(results.length === 4, "Must return 4 slides");
      assert(results.every((r) => r.source === "local_fallback"), "All sources local_fallback");
    } finally {
      global.fetch = originalFetch;
    }
  });

  await runTest("1.4: LOCAL_HALAL_VIDEO_POOL structural integrity & physical reference assets", () => {
    assert(LOCAL_HALAL_VIDEO_POOL.length >= 8, `Pool size must be >= 8, got ${LOCAL_HALAL_VIDEO_POOL.length}`);

    for (let i = 0; i < LOCAL_HALAL_VIDEO_POOL.length; i++) {
      const asset = LOCAL_HALAL_VIDEO_POOL[i];
      assert(typeof asset.id === "string" && asset.id.length > 0, `Asset ${i} id missing`);
      assert(asset.width === 1080, `Asset ${asset.id} width must be 1080, got ${asset.width}`);
      assert(asset.height === 1920, `Asset ${asset.id} height must be 1920, got ${asset.height}`);
      assert(asset.duration >= 8, `Asset ${asset.id} duration must be >= 8, got ${asset.duration}`);
      assert(asset.url.startsWith("http"), `Asset ${asset.id} url must start with http`);
      assert(asset.fallbackRemoteUrl.startsWith("http"), `Asset ${asset.id} fallbackRemoteUrl invalid`);

      // Verify physical image source reference exists on disk
      const sourcePath = path.resolve(process.cwd(), asset.sourceImageRef);
      assert(
        fs.existsSync(sourcePath),
        `Asset ${asset.id} sourceImageRef '${asset.sourceImageRef}' does not exist on disk!`,
      );
      const stat = fs.statSync(sourcePath);
      assert(stat.size > 1000, `Asset ${asset.id} source image is too small (${stat.size} bytes)`);
    }
  });

  await runTest("1.5: Fallback pool exhaustion resilience (12 slides requested, 8 pool assets)", async () => {
    process.env.PEXELS_API_KEY = "";
    const twelveSlides: CarouselSlideInput[] = Array.from({ length: 12 }, (_, i) => ({
      topTitle: `Слайд ${i + 1}`,
      text: `Тестово съдържание за ризк и берекет слайд номер ${i + 1}.`,
    }));

    const results = await fetchCarouselSlideVideos(twelveSlides);
    assert(results.length === 12, `Expected 12 results, got ${results.length}`);
    for (let i = 0; i < results.length; i++) {
      assert(results[i].slideIndex === i, `Slide index mismatch at ${i}`);
      assert(results[i].source === "local_fallback", `Slide ${i} must be local_fallback`);
      assert(results[i].width === 1080 && results[i].height === 1920, `Slide ${i} must be 1080x1920`);
      assert(results[i].duration >= 8, `Slide ${i} duration must be >= 8`);
      assert(typeof results[i].videoUrl === "string", `Slide ${i} videoUrl must be valid string`);
    }

    // The first 8 slides must have completely unique URLs (exhausting the 8 assets)
    const first8Urls = new Set(results.slice(0, 8).map((r) => r.videoUrl));
    assert(first8Urls.size === 8, `Expected 8 distinct URLs for first 8 slides, got ${first8Urls.size}`);
  });

  // ============================================================================
  // SECTION 2: HTTP 429 RATE-LIMIT & NETWORK FAULT SIMULATION
  // ============================================================================
  console.log("\n--- Section 2: HTTP 429 Rate-Limit & Network Fault Simulation ---");

  await runTest("2.1: HTTP 429 Rate-Limit Simulation (zero unhandled exceptions, smooth fallback)", async () => {
    process.env.PEXELS_API_KEY = "simulated_rate_limited_api_key_xyz";

    let callsTo429 = 0;
    global.fetch = async (input: RequestInfo | URL, _init?: RequestInit) => {
      const urlStr = String(input);
      if (urlStr.includes("api.pexels.com")) {
        callsTo429++;
        return new Response(
          JSON.stringify({
            status: 429,
            code: "Rate limit exceeded",
            message: "You have exceeded your request limit of 200 requests per hour.",
          }),
          {
            status: 429,
            statusText: "Too Many Requests",
            headers: { "Content-Type": "application/json" },
          },
        );
      }
      return originalFetch(input, _init);
    };

    try {
      const results = await fetchCarouselSlideVideos(standardTestSlides);
      assert(callsTo429 > 0, "Simulated Pexels 429 endpoint must have been called");
      assert(results.length === 4, `Expected 4 results under rate limit, got ${results.length}`);
      for (const r of results) {
        assert(r.source === "local_fallback", `Expected 'local_fallback' under 429, got '${r.source}'`);
        assert(r.width === 1080 && r.height === 1920, "Resolution must be 1080x1920");
        assert(r.duration >= 8, "Duration must be >= 8s");
      }
    } finally {
      global.fetch = originalFetch;
    }
  });

  await runTest("2.2: HTTP 500 & 503 Server Error Simulation", async () => {
    process.env.PEXELS_API_KEY = "simulated_server_error_key";

    let errorCount = 0;
    global.fetch = async (input: RequestInfo | URL, _init?: RequestInit) => {
      const urlStr = String(input);
      if (urlStr.includes("api.pexels.com")) {
        errorCount++;
        const status = errorCount % 2 === 0 ? 503 : 500;
        return new Response(`<html><body>Pexels ${status} Gateway Outage</body></html>`, {
          status,
          statusText: status === 503 ? "Service Unavailable" : "Internal Server Error",
          headers: { "Content-Type": "text/html" },
        });
      }
      return originalFetch(input, _init);
    };

    try {
      const results = await fetchCarouselSlideVideos(standardTestSlides);
      assert(results.length === 4, "Must return 4 slides despite upstream 500/503 errors");
      assert(results.every((r) => r.source === "local_fallback"), "All fall back to local");
    } finally {
      global.fetch = originalFetch;
    }
  });

  await runTest("2.3: Upstream Network Drop / Timeout / ECONNRESET Simulation", async () => {
    process.env.PEXELS_API_KEY = "simulated_network_drop_key";

    global.fetch = async (input: RequestInfo | URL, _init?: RequestInit) => {
      const urlStr = String(input);
      if (urlStr.includes("api.pexels.com")) {
        throw new TypeError("fetch failed: connect ECONNRESET 104.18.2.14:443");
      }
      return originalFetch(input, _init);
    };

    try {
      const results = await fetchCarouselSlideVideos(standardTestSlides);
      assert(results.length === 4, "Must survive network crash and return 4 slides");
      assert(results.every((r) => r.source === "local_fallback"), "All fall back to local pool");
    } finally {
      global.fetch = originalFetch;
    }
  });

  await runTest("2.4: Malformed HTML Response from API Simulation", async () => {
    process.env.PEXELS_API_KEY = "simulated_bad_json_key";

    global.fetch = async (input: RequestInfo | URL, _init?: RequestInit) => {
      const urlStr = String(input);
      if (urlStr.includes("api.pexels.com")) {
        return new Response("<!DOCTYPE html><html><head><title>Cloudflare 1020 Access Denied</title></head>", {
          status: 200, // Misconfigured proxy returning 200 with HTML
          headers: { "Content-Type": "text/html" },
        });
      }
      return originalFetch(input, _init);
    };

    try {
      const results = await fetchCarouselSlideVideos(standardTestSlides);
      assert(results.length === 4, "Must gracefully handle invalid JSON and return 4 slides");
      assert(results.every((r) => r.source === "local_fallback"), "Gracefully falls back to local pool");
    } finally {
      global.fetch = originalFetch;
    }
  });

  await runTest("2.5: API returns videos with empty video_files (candidate filtering)", async () => {
    process.env.PEXELS_API_KEY = "simulated_empty_files_key";

    global.fetch = async (input: RequestInfo | URL, _init?: RequestInit) => {
      const urlStr = String(input);
      if (urlStr.includes("api.pexels.com/videos/search")) {
        return new Response(
          JSON.stringify({
            page: 1,
            per_page: 20,
            total_results: 1,
            videos: [
              {
                id: 888111,
                width: 1080,
                height: 1920,
                duration: 15,
                url: "https://www.pexels.com/video/empty-files-888111/",
                video_files: [], // EMPTY FILES
                video_pictures: [{ picture: "https://images.pexels.com/photos/888111.jpg" }],
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return originalFetch(input, _init);
    };

    try {
      const results = await fetchCarouselSlideVideos(standardTestSlides);
      assert(results.length === 4, "Returns 4 slides");
      assert(results.every((r) => r.source === "local_fallback"), "Empty files safely trigger fallback");
    } finally {
      global.fetch = originalFetch;
    }
  });

  // ============================================================================
  // SECTION 3: EMPTY, WHITESPACE & WEIRD SLIDE INPUTS CHALLENGE
  // ============================================================================
  console.log("\n--- Section 3: Empty / Whitespace / Malformed / Weird Slide Inputs ---");

  await runTest("3.1: Empty slide input array ([]) returns empty array without throwing", async () => {
    process.env.PEXELS_API_KEY = "";
    const results = await fetchCarouselSlideVideos([]);
    assert(Array.isArray(results), "Must return array");
    assert(results.length === 0, "Must return 0 items");
  });

  await runTest("3.2: Empty string and whitespace-only slides", async () => {
    process.env.PEXELS_API_KEY = "";
    const weirdSlides: CarouselSlideInput[] = [
      { text: "" },
      { text: "   \t\n   " },
      { topTitle: "   ", text: "" },
      { topTitle: "   \n\t  ", text: "   " },
    ];

    const results = await fetchCarouselSlideVideos(weirdSlides);
    assert(results.length === 4, `Expected 4 slides, got ${results.length}`);
    for (let i = 0; i < results.length; i++) {
      assert(results[i].slideIndex === i, `slideIndex ${i}`);
      assert(results[i].source === "local_fallback", `source local_fallback at ${i}`);
      assert(results[i].width === 1080 && results[i].height === 1920, `1080x1920 at ${i}`);
      assert(typeof results[i].theme === "string" && results[i].theme.length > 0, `theme at ${i}`);
    }
  });

  await runTest("3.3: Extreme text length (10,000 characters) ReDoS & sanitization bounds", () => {
    const massiveText = "Слава на Аллах, Господаря на световете. ".repeat(250) + " ризк и берекет ";
    const startTime = Date.now();

    // Test direct dictionary concept matching with huge text
    const concept = matchTheologicalConcept(massiveText);
    assert(concept?.id === "rizq", `Expected 'rizq', got '${concept?.id}'`);

    // Test query sanitization with huge text
    const sanitized = sanitizeSearchQuery(massiveText);
    const elapsed = Date.now() - startTime;

    assert(elapsed < 100, `Text processing took ${elapsed}ms (should be < 100ms, no ReDoS)`);
    assert(sanitized.includes("vertical"), "Sanitized query contains 'vertical'");
  });

  await runTest("3.4: Adversarial Injection Vectors (SQL, HTML, Unicode, Emojis, Diacritics, Null Bytes)", async () => {
    process.env.PEXELS_API_KEY = "";
    const injectionSlides: CarouselSlideInput[] = [
      { text: "'; DROP TABLE users; SELECT * FROM credentials WHERE '1'='1" },
      { text: "<script>alert('xss');</script><iframe src='javascript:void(0)'></iframe>" },
      { text: "﷽ قُلْ هُوَ اللَّهُ أَحَدٌ اللَّهُ الصَّمَدُ" },
      { text: "✨🔥💎 🕋 🕌 🤲 🌙 ⭐ \u0000\u0001\u0002" },
    ];

    const results = await fetchCarouselSlideVideos(injectionSlides);
    assert(results.length === 4, `Must return 4 slides, got ${results.length}`);
    for (const r of results) {
      assert(r.source === "local_fallback", "Safe fallback on injection slides");
      assert(r.width === 1080 && r.height === 1920, "1080x1920 preserved");
    }

    // Also verify sanitizeSearchQuery directly against injection strings
    for (const s of injectionSlides) {
      const clean = sanitizeSearchQuery(s.text);
      assert(typeof clean === "string" && clean.length > 0, "Sanitized query must be valid string");
      assert(clean.includes("vertical"), "Sanitized query must include vertical anchor");
    }
  });

  await runTest("3.5: Partial property permutations (all slide input interfaces)", async () => {
    process.env.PEXELS_API_KEY = "";
    const permutedSlides: CarouselSlideInput[] = [
      { text: "", topTitle: "Само заглавие" },
      { text: "", imagePrompt: "beautiful mountain landscape vertical" },
      { text: "", mainText: "Основен текст в slide" },
      { text: "", quoteText: "„Цитат от хадис“" },
      { text: "", commentaryText: "Коментар от автор" },
      { text: "", bottomText: "Долен текст / футер" },
    ];

    const results = await fetchCarouselSlideVideos(permutedSlides);
    assert(results.length === 6, `Expected 6 slides, got ${results.length}`);
    for (let i = 0; i < results.length; i++) {
      assert(results[i].slideIndex === i, `slideIndex ${i}`);
      assert(results[i].source === "local_fallback", `local_fallback at ${i}`);
    }
  });

  // ============================================================================
  // SECTION 4: MODULO ARITHMETIC & ASSET POOL BOUNDS RESILIENCE
  // ============================================================================
  console.log("\n--- Section 4: Modulo Arithmetic & Asset Pool Bounds Resilience ---");

  await runTest("4.1: Restored LOCAL_BACKGROUND_POOL exact length & physical files", () => {
    assert(
      LOCAL_BACKGROUND_POOL.length === 8,
      `LOCAL_BACKGROUND_POOL must have exactly 8 assets, got ${LOCAL_BACKGROUND_POOL.length}`,
    );

    for (const relPath of LOCAL_BACKGROUND_POOL) {
      const absPath = path.resolve(process.cwd(), relPath);
      assert(fs.existsSync(absPath), `Background asset file missing: ${relPath}`);
      const stat = fs.statSync(absPath);
      assert(stat.size > 2000, `Background file ${relPath} is corrupt or empty (${stat.size} bytes)`);
    }
  });

  await runTest("4.2: Integer fuzzing across extreme intervals on getCarouselBackgroundsDirect", async () => {
    const extremeIntegers = [
      0, 1, 2, 3, 4, 7, 8, 9, 15, 20, 50, 100, 1000, 999999,
      -1, -2, -5, -8, -100, -999999,
      undefined, null, "4" as unknown as number, "-10" as unknown as number,
    ];

    for (let i = 0; i < 200; i++) {
      const countVal = extremeIntegers[Math.floor(Math.random() * extremeIntegers.length)];
      const cycleVal = extremeIntegers[Math.floor(Math.random() * extremeIntegers.length)];

      const res = await getCarouselBackgroundsDirect({
        count: countVal,
        cycleIndex: cycleVal,
      });

      assert(Array.isArray(res.backgrounds), `res.backgrounds must be array at iteration ${i}`);
      assert(
        res.backgrounds.length >= 1 && res.backgrounds.length <= 20,
        `Count must be clamped [1, 20], got ${res.backgrounds.length} at iteration ${i}`,
      );

      for (let b = 0; b < res.backgrounds.length; b++) {
        const bg = res.backgrounds[b];
        assert(
          typeof bg === "string" && (bg.startsWith("data:image/jpeg;base64,") || bg.startsWith("data:image/svg+xml")),
          `Background at index ${b} must be valid data URI`,
        );
      }
    }
  });

  await runTest("4.3: [CHALLENGE] Non-integer / Float / Infinity modulo robustness in getCarouselBackgroundsDirect", async () => {
    // Challenge: what happens if cycleIndex is float (e.g. 3.14159) or Infinity?
    // In backgrounds.functions.ts: (cycleIndex * count + i) % pool.length
    // If cycleIndex is not floored, (3.14159 * 4 + 0) % 8 = 4.56636 -> pool[4.56636] is undefined!
    try {
      await getCarouselBackgroundsDirect({ count: 4, cycleIndex: 3.14159 });
      await getCarouselBackgroundsDirect({ count: 4, cycleIndex: Infinity });
    } catch (err: unknown) {
      throw new Error(
        `BUG CONFIRMED: getCarouselBackgroundsDirect crashes on non-integer/Infinity cycleIndex: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  });

  await runTest("4.4: getLocalHalalVideoFallback with integer indices (positive & negative)", () => {
    const indicesToTest = [
      0, 1, 7, 8, 9, 15, 100, 99999,
      -0, -1, -2, -7, -8, -9, -100, -99999,
    ];

    for (const idx of indicesToTest) {
      const asset = getLocalHalalVideoFallback(idx);
      assert(asset !== undefined && asset !== null, `Asset for idx ${idx} must not be null/undefined`);
      assert(asset.width === 1080 && asset.height === 1920, `Asset ${idx} must be 1080x1920`);
      assert(typeof asset.url === "string" && asset.url.length > 0, `Asset ${idx} URL missing`);
    }

    // Object signature overload
    const objAsset1 = getLocalHalalVideoFallback({ slideIndex: -5, mood: "calm" });
    assert(objAsset1 && objAsset1.width === 1080, "Object signature with negative index works");
    const objAsset2 = getLocalHalalVideoFallback({});
    assert(objAsset2 && objAsset2.width === 1080, "Empty object signature defaults cleanly");
  });

  await runTest("4.5: [CHALLENGE] getLocalHalalVideoFallback with float/NaN indices", () => {
    // Challenge: Math.abs(1.5) % pool.length = 1.5 -> pool[1.5] is undefined!
    const assetFloat = getLocalHalalVideoFallback(1.5);
    if (!assetFloat) {
      throw new Error(
        "BUG CONFIRMED: getLocalHalalVideoFallback(1.5) returns undefined because Math.abs(idx) % pool.length is not integer-floored!",
      );
    }
    const assetNaN = getLocalHalalVideoFallback(NaN);
    if (!assetNaN) {
      throw new Error(
        "BUG CONFIRMED: getLocalHalalVideoFallback(NaN) returns undefined because Math.abs(NaN) % pool.length is NaN!",
      );
    }
  });

  await runTest("4.6: detectSlideRole bounds resilience (negative, extreme, non-integer indices)", () => {
    // Normal indices
    assert(detectSlideRole(0, "текст") === "hook", "Index 0 is hook");
    assert(detectSlideRole(1, "текст") === "context", "Index 1 is context");
    assert(detectSlideRole(2, "текст") === "dalil", "Index 2 is dalil");
    assert(detectSlideRole(3, "текст") === "cta", "Index 3 is cta");

    // Extreme positive indices
    const role100 = detectSlideRole(100, "нормален текст");
    assert(["hook", "context", "dalil", "cta"].includes(role100), `Index 100 gave ${role100}`);

    const role999 = detectSlideRole(999, "нормален текст");
    assert(["hook", "context", "dalil", "cta"].includes(role999), `Index 999 gave ${role999}`);

    // Negative indices
    for (let neg = -1; neg >= -10; neg--) {
      const role = detectSlideRole(neg, "текст");
      assert(typeof role === "string" || role === undefined, `Negative role at ${neg} handled`);
    }
  });

  await runTest("4.7: getCuratedHalalVideoFallbackDirect with negative & large slide indices", async () => {
    const indices = [-5, -1, 0, 1, 7, 8, 15, 9999];
    for (const idx of indices) {
      const fb = await getCuratedHalalVideoFallbackDirect(idx, "Ислямска природа");
      assert(fb.slideIndex === idx, `slideIndex must match requested (${idx})`);
      assert(fb.source === "local_fallback", "source must be local_fallback");
      assert(fb.width === 1080 && fb.height === 1920, "1080x1920 vertical");
      assert(fb.duration >= 8, "duration >= 8");
      assert(typeof fb.videoUrl === "string" && fb.videoUrl.startsWith("http"), "videoUrl valid");
    }
  });

  // ============================================================================
  // SECTION 5: DISK CACHE CORRUPTION & RESILIENCE CHALLENGE
  // ============================================================================
  console.log("\n--- Section 5: Disk Cache Corruption & Self-Healing Resilience ---");

  const cacheFilePath = getHalalCacheFilePath();
  let backupCacheContent: string | null = null;

  try {
    if (fs.existsSync(cacheFilePath)) {
      backupCacheContent = fs.readFileSync(cacheFilePath, "utf-8");
    }
  } catch {
    // No backup needed if missing
  }

  try {
    await runTest("5.1: Non-existent cache directory and file handled gracefully", async () => {
      // getCachedHalalStatus on arbitrary unknown video ID
      const status = await getCachedHalalStatus(888899999);
      assert(status === null, `Status for unknown video must be null, got '${status}'`);
    });

    await runTest("5.2: Corrupted non-JSON garbage in halal_verified_videos.json does not crash", async () => {
      await ensureHalalCacheDir();
      fs.writeFileSync(
        cacheFilePath,
        "<<<< MALFORMED SYNTAX ERROR GARBAGE TEXT {{{{ :: [[[ NOT A JSON >>>",
        "utf-8",
      );

      // Verify that loadHalalDiskCache catches SyntaxError internally
      await loadHalalDiskCache();
      const status = await getCachedHalalStatus(1234567);
      assert(status === null, `Must return null on corrupted cache, got ${status}`);
    });

    await runTest("5.3: Empty 0-byte cache file does not crash JSON parser", async () => {
      await ensureHalalCacheDir();
      fs.writeFileSync(cacheFilePath, "", "utf-8");

      await loadHalalDiskCache();
      const status = await getCachedHalalStatus(2345678);
      assert(status === null, `Must return null on empty cache file, got ${status}`);
    });

    await runTest("5.4: Malformed JSON schemas (string, array, null records) handled safely", async () => {
      const badSchemas = [
        JSON.stringify("just a string"),
        JSON.stringify([1, 2, 3, "array"]),
        JSON.stringify({ version: 1, records: null }),
        JSON.stringify({ version: 1, records: "records is not an object" }),
        JSON.stringify({ unexpected: { deeply: { nested: true } } }),
      ];

      for (let i = 0; i < badSchemas.length; i++) {
        fs.writeFileSync(cacheFilePath, badSchemas[i], "utf-8");
        await loadHalalDiskCache();
        const status = await getCachedHalalStatus(3456789 + i);
        assert(status === null, `Bad schema #${i} must safely evaluate to null status`);
      }
    });

    await runTest("5.5: Disk Cache Self-Healing: writing restores clean valid JSON schema", async () => {
      // Step 1: Corrupt file
      fs.writeFileSync(cacheFilePath, "### TOTALLY CORRUPTED DISK DATA ###", "utf-8");

      // Step 2: Set status -> should heal the file
      const healId = 7770001;
      await setCachedHalalStatus(healId, "HALAL", "Self-healing test recovery", {
        duration: 12,
        width: 1080,
        height: 1920,
      });

      // Step 3: Verify file on disk is now valid JSON
      const rawContent = fs.readFileSync(cacheFilePath, "utf-8");
      let parsed: unknown;
      try {
        parsed = JSON.parse(rawContent);
      } catch (err) {
        throw new Error(`Self-healing failed, cache file still corrupted: ${err}`);
      }

      assert(typeof parsed === "object" && parsed !== null, "Restored cache must be object");
      const obj = parsed as { version?: number; records?: Record<string, { status?: string }> };
      assert(obj.version === 1, "Restored cache has version 1");
      assert(obj.records !== undefined, "Restored cache has records dictionary");
      assert(obj.records[String(healId)]?.status === "HALAL", "Healed cache contains the saved record");

      // Step 4: Verify read matches
      const readBack = await getCachedHalalStatus(healId);
      assert(readBack === "HALAL", `Expected 'HALAL', got '${readBack}'`);
    });

    await runTest("5.6: Concurrent write operations (20 simultaneous async writes with cache lock)", async () => {
      const baseId = 880000;
      const tasks = Array.from({ length: 20 }, async (_, i) => {
        const testId = baseId + i;
        const status = i % 2 === 0 ? "HALAL" : "HARAM";
        await setCachedHalalStatus(testId, status, `Concurrent write #${i}`, {
          duration: 10 + i,
        });
      });

      await Promise.all(tasks);

      // Verify file on disk is valid JSON and contains all 20 records
      const rawContent = fs.readFileSync(cacheFilePath, "utf-8");
      const parsed = JSON.parse(rawContent) as { records: Record<string, { status: string }> };

      for (let i = 0; i < 20; i++) {
        const testId = baseId + i;
        const expectedStatus = i % 2 === 0 ? "HALAL" : "HARAM";
        assert(
          parsed.records[String(testId)]?.status === expectedStatus,
          `Record ${testId} missing or mismatched in concurrent cache!`,
        );

        const readStatus = await getCachedHalalStatus(testId);
        assert(readStatus === expectedStatus, `Direct getCachedHalalStatus mismatch for ${testId}`);
      }
    });
  } finally {
    // Restore original cache file if it existed
    try {
      if (backupCacheContent !== null) {
        fs.writeFileSync(cacheFilePath, backupCacheContent, "utf-8");
      }
    } catch {
      // Ignore cleanup error
    }
  }

  // Restore original environment
  if (originalEnvKey !== undefined) {
    process.env.PEXELS_API_KEY = originalEnvKey;
  } else {
    delete process.env.PEXELS_API_KEY;
  }

  // ============================================================================
  // SUMMARY & EMPIRICAL VERDICT
  // ============================================================================
  console.log("\n================================================================================");
  console.log(`📊 ADVERSARIAL CHALLENGER TEST RESULTS:`);
  console.log(`   - Tests Run:    ${totalTests}`);
  console.log(`   - Tests Passed: ${passedTests}`);
  console.log(`   - Tests Failed: ${failedTests}`);

  if (failedTests === 0) {
    console.log("🏆 VERDICT: APPROVE");
    console.log("   Zero unhandled exceptions, resilient fallbacks, robust cache & modulo math.");
    console.log("================================================================================\n");
  } else {
    console.error("💥 VERDICT: REJECT");
    console.error("   Failures observed:");
    for (const f of failures) {
      console.error(`   - ${f}`);
    }
    console.log("================================================================================\n");
    process.exit(1);
  }
}

runAdversarialM1ChallengerSuite().catch((err) => {
  console.error("Fatal suite crash:", err);
  process.exit(1);
});
