import { performance } from "perf_hooks";

// Mock PexelsVideo structures
function makeMockVideo(id, duration = 35, haramFlag = false, delayMs = 100) {
  return {
    id,
    duration,
    video_files: [
      { file_type: "video/mp4", width: 1080, height: 1920, link: `https://example.com/video_${id}.mp4`, fps: 30 }
    ],
    video_pictures: [
      { picture: `https://example.com/pic_${id}_1.jpg` },
      { picture: `https://example.com/pic_${id}_2.jpg` }
    ],
    user: { name: `Photographer ${id}` },
    _haramFlag: haramFlag,
    _delayMs: delayMs,
  };
}

// Replicate buildOut & getHalalVideos with Promise.all and simulated checkVideoForHaram
function scoreVideo(v, file, targetMin = 30) {
  let s = 100 - v.id; // give predictable score order by ID (smaller ID = higher score)
  const d = v.duration ?? 10;
  if (d >= targetMin) s += 20;
  return s;
}

function pickBestFile(v) {
  return v.video_files[0];
}

function buildOut(vs, targetMin = 30) {
  const all = vs
    .map((v) => {
      const file = pickBestFile(v);
      if (!file?.link) return null;
      return {
        id: v.id,
        link: file.link,
        poster: v.video_pictures?.[0]?.picture ?? "",
        photographer: v.user?.name ?? "",
        duration: v.duration ?? 0,
        score: scoreVideo(v, file, targetMin),
      };
    })
    .filter((x) => !!x);

  const matchingDuration = all.filter((x) => x.duration >= targetMin);
  if (targetMin >= 60 && matchingDuration.length === 0) {
    return [];
  }

  const pool = matchingDuration.length > 0 ? matchingDuration : [];
  pool.sort((a, b) => b.score - a.score);
  return pool;
}

// Simulated checkVideoForHaram with delay and error injection support
async function mockCheckVideoForHaram(video, throwError = false) {
  if (throwError) {
    throw new Error("Simulated network timeout/error during haram check");
  }
  await new Promise((r) => setTimeout(r, video._delayMs || 100));
  return !!video._haramFlag;
}

// Safe check with try...catch matching pexels.functions.ts
async function checkVideoForHaramSafe(video, throwError = false) {
  try {
    return await mockCheckVideoForHaram(video, throwError);
  } catch (e) {
    console.log(`[mock-check] Error caught safely for video ${video.id}: ${e.message}`);
    return false; // Fallback per pexels.functions.ts
  }
}

async function getHalalVideosTest(vs, targetMin, neededCount = 3, errorVideoId = null) {
  const built = buildOut(vs, targetMin);
  const candidates = built.slice(0, Math.max(neededCount * 3, 8));

  const results = await Promise.all(
    candidates.map(async (outVid) => {
      const originalPexelsVideo = vs.find((v) => v.id === outVid.id);
      if (!originalPexelsVideo) return { outVid, isHaram: false };
      const shouldError = originalPexelsVideo.id === errorVideoId;
      const isHaram = await checkVideoForHaramSafe(originalPexelsVideo, shouldError);
      return { outVid, isHaram };
    })
  );

  const safeVideos = results
    .filter((r) => !r.isHaram)
    .map((r) => r.outVid);

  return safeVideos.slice(0, neededCount);
}

async function runEmpiricalAsyncTests() {
  console.log("=== EMPIRICAL TEST: Promise.all Async Mapping in Pexels Video Checking ===");

  // TEST 1: Speed & Parallel Concurrency Test
  console.log("\n--- TEST 1: Parallel Concurrency vs Sequential Execution Speed ---");
  const sampleVideos = Array.from({ length: 8 }, (_, i) => 
    makeMockVideo(i + 1, 35, i % 3 === 0, 150) // 150ms delay each, video 1, 4, 7 are haram
  );

  const startParallel = performance.now();
  const safeParallel = await getHalalVideosTest(sampleVideos, 30, 3);
  const durationParallel = performance.now() - startParallel;

  console.log(`Parallel Promise.all execution time: ${durationParallel.toFixed(2)} ms`);
  console.log(`Safe videos returned (${safeParallel.length}):`, safeParallel.map((v) => v.id));

  // Verify parallel speedup: 8 videos * 150ms = 1200ms if sequential. Parallel should take ~150-250ms.
  if (durationParallel > 600) {
    console.error(`FAIL: Parallel execution was too slow (${durationParallel.toFixed(2)} ms)`);
    process.exit(1);
  } else {
    console.log(`PASS: Parallel execution completed in ${durationParallel.toFixed(2)} ms (vs ~1200ms sequential theoretical)`);
  }

  // TEST 2: Order Preservation & Haram Filtering
  console.log("\n--- TEST 2: Order Preservation & Haram Filtering ---");
  // candidate scores: id 1 (haram, filtered out), id 2 (safe, kept), id 3 (safe, kept), id 4 (haram, filtered out), id 5 (safe, kept)
  if (safeParallel.length === 3 && safeParallel[0].id === 2 && safeParallel[1].id === 3 && safeParallel[2].id === 5) {
    console.log("PASS: Order preserved after filtering haram candidates! Result IDs:", safeParallel.map(v => v.id));
  } else {
    console.error("FAIL: Incorrect videos or ordering returned:", safeParallel);
    process.exit(1);
  }

  // TEST 3: Exception / Error Resilience
  console.log("\n--- TEST 3: Exception Handling inside Promise.all ---");
  // Video 2 throws error during haram check. System should catch error, treat as false (safe), and continue Promise.all without unhandled rejection.
  const safeWithError = await getHalalVideosTest(sampleVideos, 30, 3, 2);
  console.log("Safe videos when video 2 throws error:", safeWithError.map((v) => v.id));
  if (safeWithError.length === 3) {
    console.log("PASS: Promise.all survived thrown error in individual candidate check!");
  } else {
    console.error("FAIL: Promise.all failed on candidate error");
    process.exit(1);
  }

  // TEST 4: Empty input resilience
  console.log("\n--- TEST 4: Empty / Edge Case Inputs ---");
  const emptyRes = await getHalalVideosTest([], 30, 3);
  if (Array.isArray(emptyRes) && emptyRes.length === 0) {
    console.log("PASS: Empty video input handled safely!");
  } else {
    console.error("FAIL: Empty video input failed");
    process.exit(1);
  }

  console.log("\n>>> ALL PEXELS ASYNC PROMISE.ALL TESTS PASSED! <<<");
}

runEmpiricalAsyncTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
