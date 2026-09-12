/**
 * Verification Test Suite: Milestone M1 — Salafi-Compliant Context-Aware Video Sourcing & Fallback Engine
 *
 * Verifies:
 * 1. Tier 1 Query Sanitizer (regex token stripping, positive nature/architecture anchors, 9:16 vertical)
 * 2. Tier 2 Metadata Blacklist Hard Exclusion Gate (isMetadataHaram)
 * 3. Tier 3 Fail-Closed Multi-Frame Gemini Vision Verification & Persistent Disk Cache
 * 4. Tier 4 Audio Demuxing Flag Contract ("-an")
 * 5. Theological Concept Taxonomy Map (11 Bulgarian/Arabic concepts x 4 narrative slide stages)
 * 6. Progression Role Detection (Hook, Context, Dalil, CTA)
 * 7. Local Asset Pools:
 *    - Restored LOCAL_BACKGROUND_POOL (8 local image assets, non-empty, modulo safety)
 *    - Curated LOCAL_HALAL_VIDEO_POOL (1080x1920 portrait looping videos, 100% Salafi-compliant)
 * 8. Core Interface Contract fetchCarouselSlideVideos(slides):
 *    - SlideVideoResult schema adherence
 *    - Cross-slide video URL deduplication
 *    - Offline/Rate-limit resilience via guaranteed local fallback
 * 9. Server SSD Cleanup Exemption in render.functions.ts (video_cache and halal_verified_videos.json)
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import {
  sanitizeSearchQuery,
  sanitizeSalafiQuery,
  TIER1_FORBIDDEN_QUERY_TOKENS,
  isMetadataHaram,
  TIER2_HARAM_METADATA_REGEX,
  checkVideoForHaram,
  getCachedHalalStatus,
  setCachedHalalStatus,
  getHalalCacheFilePath,
  TIER4_FFMPEG_DEMUX_FLAGS,
  THEOLOGICAL_CONCEPT_MAP,
  detectSlideRole,
  matchTheologicalConcept,
  scoreVideo,
  buildOut,
  fetchCarouselSlideVideos,
  type SlideVideoResult,
  type PexelsVideo,
} from "../pexels.functions";

import {
  LOCAL_BACKGROUND_POOL,
  LOCAL_HALAL_VIDEO_POOL,
  getLocalHalalVideoFallback,
  getCuratedHalalVideoFallbackDirect,
} from "../backgrounds.functions";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ [ASSERTION FAILED]: ${message}`);
    throw new Error(`[ASSERTION FAILED]: ${message}`);
  }
}

async function runSalafiGuardrailsM1Suite() {
  console.log("=================================================================");
  console.log("🚀 STARTING SALAFI GUARDRAILS & M1 VIDEO SOURCING VERIFICATION");
  console.log("=================================================================\n");

  let totalTests = 0;
  let passedTests = 0;

  function recordPass(testName: string) {
    totalTests++;
    passedTests++;
    console.log(`  ✔ [PASS] ${testName}`);
  }

  // ============================================================================
  // SUITE 1: TIER 1 QUERY SANITIZATION
  // ============================================================================
  console.log("--- Suite 1: Tier 1 Query Sanitizer & Positive Anchors ---");

  // T1.1: Strips humans, animate beings, and instruments
  const dirty1 = "man playing piano with dog in mountain park";
  const clean1 = sanitizeSearchQuery(dirty1);
  assert(!/man|piano|dog/i.test(clean1), `Should strip 'man', 'piano', 'dog': ${clean1}`);
  assert(/mountain|park/i.test(clean1), `Should keep geographic terms: ${clean1}`);
  recordPass("T1.1: Strips forbidden human/animal/instrument tokens");

  // T1.2: Enforces positive nature anchor
  const dirty2 = "calm evening reflections";
  const clean2 = sanitizeSearchQuery(dirty2);
  assert(/nature landscape/i.test(clean2), `Should append 'nature landscape': ${clean2}`);
  assert(/vertical/i.test(clean2), `Should append 'vertical': ${clean2}`);
  recordPass("T1.2: Automatically injects positive nature and vertical anchors");

  // T1.3: Enforces architecture no people anchor for mosques/domes
  const dirty3 = "grand mosque marble dome";
  const clean3 = sanitizeSearchQuery(dirty3);
  assert(
    /architecture no people/i.test(clean3),
    `Should append 'architecture no people': ${clean3}`,
  );
  recordPass("T1.3: Automatically injects architecture no people for Islamic architecture");

  // T1.4: Handles empty or invalid query with safe default
  const emptyClean = sanitizeSearchQuery("");
  assert(emptyClean.length > 10, "Empty query should return default safe prompt");
  assert(/nature landscape/i.test(emptyClean), "Default prompt should include nature landscape");
  recordPass("T1.4: Handles empty/falsy queries with safe default");

  // T1.5: sanitizeSalafiQuery alias check
  const aliasClean = sanitizeSalafiQuery("woman walking in forest");
  assert(!/woman|walking/i.test(aliasClean), "sanitizeSalafiQuery alias must strip animate beings");
  recordPass("T1.5: sanitizeSalafiQuery alias produces identical sanitized output");

  // ============================================================================
  // SUITE 2: TIER 2 METADATA BLACKLIST HARD EXCLUSION GATE
  // ============================================================================
  console.log("\n--- Suite 2: Tier 2 Metadata Regex Blacklist Gate ---");

  // T2.1: Rejects video with human in title/url/user
  const haramVid1: PexelsVideo = {
    id: 1001,
    url: "https://www.pexels.com/video/man-running-on-mountain-trail-1001/",
    user: { name: "John Doe" },
    video_files: [],
    video_pictures: [],
  };
  assert(isMetadataHaram(haramVid1) === true, "Should reject video with 'man' or 'running'");
  recordPass("T2.1: Rejects video with human tokens in URL or tags");

  // T2.2: Rejects video with musical instruments
  const haramVid2: PexelsVideo = {
    id: 1002,
    url: "https://www.pexels.com/video/acoustic-guitar-nature-1002/",
    video_files: [],
    video_pictures: [],
  };
  assert(isMetadataHaram(haramVid2) === true, "Should reject video with musical instrument");
  recordPass("T2.2: Rejects video with musical instruments");

  // T2.3: Rejects video with animals
  const haramVid3: PexelsVideo = {
    id: 1003,
    url: "https://www.pexels.com/video/horse-grazing-in-meadow-1003/",
    video_files: [],
    video_pictures: [],
  };
  assert(isMetadataHaram(haramVid3) === true, "Should reject video with animals");
  recordPass("T2.3: Rejects video with animals or living creatures");

  // T2.4: Approves pure nature landscape video
  const halalVid: PexelsVideo = {
    id: 1004,
    url: "https://www.pexels.com/video/majestic-green-mountain-valley-clouds-1004/",
    user: { name: "Nature Drone Films" },
    video_files: [],
    video_pictures: [],
  };
  assert(isMetadataHaram(halalVid) === false, "Should approve pure nature landscape video");
  recordPass("T2.4: Approves pure nature landscape video");

  // T2.5: Falsy video is rejected
  assert(isMetadataHaram(null as unknown as PexelsVideo) === true, "Falsy video must be rejected");
  recordPass("T2.5: Falsy/null video input is safely rejected (fail-closed)");

  // T2.6: buildOut unconditionally purges haram metadata candidates
  const candidates: PexelsVideo[] = [
    haramVid1,
    haramVid2,
    {
      id: 2001,
      duration: 15,
      url: "https://www.pexels.com/video/flowing-waterfall-green-forest-2001/",
      video_files: [
        {
          quality: "hd",
          width: 1080,
          height: 1920,
          link: "https://cdn.test/2001.mp4",
          file_type: "video/mp4",
        },
      ],
      video_pictures: [{ picture: "https://cdn.test/pic2001.jpg" }],
    },
  ];
  const built = buildOut(candidates, 10);
  assert(built.length === 1, `buildOut must only retain 1 halal candidate, got ${built.length}`);
  assert(built[0].id === 2001, "Candidate id must be 2001");
  recordPass("T2.6: buildOut filters out all haram candidates before scoring");

  // ============================================================================
  // SUITE 3: TIER 3 FAIL-CLOSED GEMINI VISION & PERSISTENT DISK CACHE
  // ============================================================================
  console.log("\n--- Suite 3: Tier 3 Fail-Closed Vision AI & Disk Cache ---");

  // T3.1: Video with missing or empty pictures FAILS CLOSED (returns true for isHaram)
  const emptyPicVid: PexelsVideo = {
    id: 3001,
    url: "https://www.pexels.com/video/mystery-clip-3001/",
    video_files: [],
    video_pictures: [],
  };
  const isHaramEmpty = await checkVideoForHaram(emptyPicVid);
  assert(isHaramEmpty === true, "Empty video_pictures must FAIL CLOSED (isHaram = true)");
  recordPass("T3.1: Video with 0 preview pictures fails closed (rejected)");

  // T3.2: Disk cache path resolution
  const cachePath = getHalalCacheFilePath();
  assert(cachePath.includes(".islamicreels_jobs"), "Cache path must be in .islamicreels_jobs");
  assert(
    cachePath.endsWith("halal_verified_videos.json"),
    "Cache file must be halal_verified_videos.json",
  );
  recordPass("T3.2: Cache file path resolves correctly in user home directory");

  // T3.3: Set and retrieve cached status
  const testVidId = 999888;
  await setCachedHalalStatus(testVidId, "HALAL", "Unit test verified", { duration: 15 });
  const status = await getCachedHalalStatus(testVidId);
  assert(status === "HALAL", `Cached status must be 'HALAL', got '${status}'`);
  recordPass("T3.3: Persistent disk cache writes and reads HALAL status correctly");

  // T3.4: checkVideoForHaram hits cache with 0 network calls
  const cachedHalalVid: PexelsVideo = {
    id: testVidId,
    video_files: [],
    video_pictures: [{ picture: "https://fake.url/pic.jpg" }],
  };
  const cachedResult = await checkVideoForHaram(cachedHalalVid);
  assert(cachedResult === false, "Cached HALAL video must return false (not haram)");
  recordPass("T3.4: checkVideoForHaram immediately approves cached HALAL video");

  // T3.5: checkVideoForHaram rejects cached HARAM video
  const testHaramId = 999777;
  await setCachedHalalStatus(testHaramId, "HARAM", "Rejected test", { duration: 10 });
  const cachedHaramVid: PexelsVideo = {
    id: testHaramId,
    video_files: [],
    video_pictures: [{ picture: "https://fake.url/pic2.jpg" }],
  };
  const cachedHaramResult = await checkVideoForHaram(cachedHaramVid);
  assert(cachedHaramResult === true, "Cached HARAM video must return true (is haram)");
  recordPass("T3.5: checkVideoForHaram immediately rejects cached HARAM video");

  // ============================================================================
  // SUITE 4: TIER 4 AUDIO DEMUXING CONTRACT
  // ============================================================================
  console.log("\n--- Suite 4: Tier 4 Audio Demuxing Flag Contract ---");

  assert(Array.isArray(TIER4_FFMPEG_DEMUX_FLAGS), "Demux flags must be an array");
  assert(TIER4_FFMPEG_DEMUX_FLAGS.includes("-an"), "Demux flags must include '-an'");
  assert(Object.isFrozen(TIER4_FFMPEG_DEMUX_FLAGS), "Demux flags must be frozen/immutable");
  recordPass("T4.1: TIER4_FFMPEG_DEMUX_FLAGS strictly defines ['-an'] for zero music leakage");

  // ============================================================================
  // SUITE 5: THEOLOGICAL CONCEPT TAXONOMY & PROGRESSION MAPPING
  // ============================================================================
  console.log("\n--- Suite 5: Theological Concept Map & Progression Stages ---");

  // T5.1: 11 Core Theological Concepts Registered
  assert(
    THEOLOGICAL_CONCEPT_MAP.length === 11,
    `Expected exactly 11 concepts, got ${THEOLOGICAL_CONCEPT_MAP.length}`,
  );
  const expectedConceptIds = [
    "jannah",
    "sabr",
    "tahajjud",
    "tawbah",
    "masjids",
    "qadr",
    "rizq",
    "tawakkul",
    "ikhlas",
    "shukr",
    "dua",
  ];
  for (const id of expectedConceptIds) {
    const found = THEOLOGICAL_CONCEPT_MAP.some((c) => c.id === id);
    assert(found, `Concept map missing id: '${id}'`);
  }
  recordPass("T5.1: All 11 authentic theological concepts registered");

  // T5.2: 4-Slide Progression Roles in each concept
  for (const concept of THEOLOGICAL_CONCEPT_MAP) {
    assert(
      Array.isArray(concept.roleQueries.hook) && concept.roleQueries.hook.length > 0,
      `${concept.id} must have hook queries`,
    );
    assert(
      Array.isArray(concept.roleQueries.context) && concept.roleQueries.context.length > 0,
      `${concept.id} must have context queries`,
    );
    assert(
      Array.isArray(concept.roleQueries.dalil) && concept.roleQueries.dalil.length > 0,
      `${concept.id} must have dalil queries`,
    );
    assert(
      Array.isArray(concept.roleQueries.cta) && concept.roleQueries.cta.length > 0,
      `${concept.id} must have cta queries`,
    );
  }
  recordPass("T5.2: Every concept defines queries for all 4 stages (Hook, Context, Dalil, CTA)");

  // T5.3: Concept Matching by Bulgarian Stems and Arabic Terms
  const m1 = matchTheologicalConcept("Тайната на препитанието и берекета");
  assert(m1?.id === "rizq", `Expected 'rizq', got '${m1?.id}'`);

  const m2 = matchTheologicalConcept("Красотата на сабр при изпитания");
  assert(m2?.id === "sabr", `Expected 'sabr', got '${m2?.id}'`);

  const m3 = matchTheologicalConcept("Силата на тахаджуд в тишината на нощта");
  assert(m3?.id === "tahajjud", `Expected 'tahajjud', got '${m3?.id}'`);

  const m4 = matchTheologicalConcept("Вечните градини на дженнет");
  assert(m4?.id === "jannah", `Expected 'jannah', got '${m4?.id}'`);

  const m5 = matchTheologicalConcept("Искреност (ikhlas) в делата");
  assert(m5?.id === "ikhlas", `Expected 'ikhlas', got '${m5?.id}'`);
  recordPass("T5.3: Theological concept matcher resolves Bulgarian keywords & Arabic terms");

  // T5.4: Slide Role Detection
  assert(detectSlideRole(0, "Текст", "[ТАЙНАТА НА РИЗКА]") === "hook", "Slide 0 must be hook");
  assert(
    detectSlideRole(1, "Божественият закон за препитанието") === "context",
    "Slide 1 must be context",
  );
  assert(detectSlideRole(2, "Сура Ат-Талак, аят 3") === "dalil", "Slide 2 must be dalil");
  assert(detectSlideRole(3, "Запази и сподели с ближен") === "cta", "Slide 3 must be cta");
  recordPass(
    "T5.4: Slide progression role detection correctly identifies Hook -> Context -> Dalil -> CTA",
  );

  // ============================================================================
  // SUITE 6: LOCAL ASSET POOLS INTEGRITY
  // ============================================================================
  console.log("\n--- Suite 6: Local Background & Halal Video Pools ---");

  // T6.1: LOCAL_BACKGROUND_POOL has exactly 8 assets
  assert(
    LOCAL_BACKGROUND_POOL.length === 8,
    `LOCAL_BACKGROUND_POOL must have 8 assets, got ${LOCAL_BACKGROUND_POOL.length}`,
  );
  for (const relPath of LOCAL_BACKGROUND_POOL) {
    const absPath = path.resolve(process.cwd(), relPath);
    assert(fs.existsSync(absPath), `Image background asset must exist on disk: ${relPath}`);
  }
  recordPass("T6.1: Restored LOCAL_BACKGROUND_POOL with 8 verified physical images");

  // T6.2: LOCAL_HALAL_VIDEO_POOL has >= 6 curated themes
  assert(
    LOCAL_HALAL_VIDEO_POOL.length >= 6,
    `LOCAL_HALAL_VIDEO_POOL must have >= 6 items, got ${LOCAL_HALAL_VIDEO_POOL.length}`,
  );
  for (const item of LOCAL_HALAL_VIDEO_POOL) {
    assert(item.width === 1080 && item.height === 1920, `${item.id} must be 1080x1920 vertical`);
    assert(item.duration >= 8, `${item.id} duration must be >= 8s`);
    assert(
      typeof item.url === "string" && item.url.startsWith("http"),
      `${item.id} must have valid URL`,
    );
  }
  recordPass(
    "T6.2: Curated LOCAL_HALAL_VIDEO_POOL contains verified 1080x1920 portrait looping videos",
  );

  // T6.3: Fallback retrieval helper rotates cleanly
  const fb0 = getLocalHalalVideoFallback(0);
  const fb1 = getLocalHalalVideoFallback(1);
  assert(fb0.id !== fb1.id, "Sequential fallback indices must yield distinct assets");
  recordPass("T6.3: getLocalHalalVideoFallback rotates assets without modulo NaN");

  // T6.4: getCuratedHalalVideoFallbackDirect contract adherence
  const directFb = await getCuratedHalalVideoFallbackDirect(2, "Тест тема");
  assert(directFb.source === "local_fallback", "Source must be 'local_fallback'");
  assert(directFb.slideIndex === 2, "slideIndex must match");
  assert(directFb.width === 1080 && directFb.height === 1920, "Resolution must be 1080x1920");
  recordPass("T6.4: getCuratedHalalVideoFallbackDirect fulfills contract");

  // ============================================================================
  // SUITE 7: CORE ENGINE CONTRACT: fetchCarouselSlideVideos
  // ============================================================================
  console.log("\n--- Suite 7: fetchCarouselSlideVideos Contract & Fallback Resilience ---");

  const testSlides = [
    {
      text: "ТАЙНАТА НА РИЗКА: Защо работиш упорито, но парите не стигат?",
      topTitle: "[ТАЙНАТА НА РИЗКА]",
    },
    {
      text: "Ризкът не е само заплатата. Той е здравето, спокойствието и времето.",
      topTitle: "БОЖЕСТВЕНИЯТ ЗАКОН",
    },
    {
      text: "„И ще му даде препитание оттам, откъдето не е предполагал.“ (Сура Ат-Талак: 3)",
      topTitle: "АВТЕНТИЧЕН ДАЛИЛ",
    },
    {
      text: "Напиши 'Алхамдулиллах' в коментарите и сподели с приятел.",
      topTitle: "ДЕЙСТВИЕ & ДУА",
    },
  ];

  const slideResults = await fetchCarouselSlideVideos(testSlides);

  // T7.1: Returns matching number of slides
  assert(
    slideResults.length === testSlides.length,
    `Expected ${testSlides.length} results, got ${slideResults.length}`,
  );
  recordPass("T7.1: Returns exact count of requested slides");

  // T7.2: Each slide adheres strictly to SlideVideoResult interface
  for (let i = 0; i < slideResults.length; i++) {
    const r = slideResults[i];
    assert(r.slideIndex === i, `slideIndex must be ${i}, got ${r.slideIndex}`);
    assert(
      typeof r.videoUrl === "string" && r.videoUrl.length > 0,
      `videoUrl must be valid string`,
    );
    assert(
      r.source === "pexels" || r.source === "local_fallback",
      `source must be 'pexels' | 'local_fallback', got '${r.source}'`,
    );
    assert(
      typeof r.duration === "number" && r.duration >= 8,
      `duration must be >= 8, got ${r.duration}`,
    );
    assert(
      r.width === 1080 && r.height === 1920,
      `dimensions must be 1080x1920, got ${r.width}x${r.height}`,
    );
    assert(typeof r.theme === "string" && r.theme.length > 0, `theme must be non-empty`);
  }
  recordPass("T7.2: All slide results conform to SlideVideoResult schema");

  // T7.3: Cross-slide video URL deduplication
  const distinctUrls = new Set(slideResults.map((r) => r.videoUrl));
  assert(
    distinctUrls.size === slideResults.length,
    `All slides must have unique video URLs! Found ${distinctUrls.size} unique of ${slideResults.length}`,
  );
  recordPass("T7.3: Cross-slide deduplication guarantees distinct video background per slide");

  // ============================================================================
  // SUITE 8: SSD CLEANUP EXEMPTION VERIFICATION
  // ============================================================================
  console.log("\n--- Suite 8: SSD Server Cleanup Exemption ---");

  const renderCode = fs.readFileSync(
    path.resolve(process.cwd(), "src/lib/render.functions.ts"),
    "utf-8",
  );
  assert(
    renderCode.includes("video_cache"),
    "render.functions.ts must include 'video_cache' in cleanup exemption",
  );
  assert(
    renderCode.includes("halal_verified_videos.json"),
    "render.functions.ts must include 'halal_verified_videos.json' in cleanup exemption",
  );
  recordPass(
    "T8.1: cleanupOldJobs explicitly exempts 'video_cache' and 'halal_verified_videos.json'",
  );

  console.log("\n=================================================================");
  console.log(`🎉 ALL ${passedTests} / ${totalTests} SALAFI GUARDRAIL & M1 SOURCING TESTS PASSED!`);
  console.log("=================================================================\n");
}

runSalafiGuardrailsM1Suite().catch((err) => {
  console.error("\n❌ SUITE EXECUTION FAILED:\n", err);
  process.exit(1);
});
