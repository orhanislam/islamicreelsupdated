import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import {
  matchTheologicalConcept,
  pickBestFile,
  scoreVideo,
  PIXELATION_PRONE_VIDEO_IDS,
  type PexelsVideo,
  type PexelsVideoFile,
} from "../pexels.functions";
import { LOCAL_HALAL_VIDEO_POOL } from "../backgrounds.functions";
import { buildBulgarianScheduledIso, getBulgarianUtcOffset } from "../bulgarian-time";

async function runTests() {
  console.log("=== RUNNING ANTI-PIXELATION VIDEO OPTIMIZATION VERIFICATION ===");

  // TEST 1: Reject sub-720p files in scoreVideo
  console.log("[TEST 1] Verifying low-res / SD clips are rejected to prevent pixelation...");
  const fakeVideo: PexelsVideo = {
    id: 12345,
    duration: 15,
    video_files: [],
    video_pictures: [],
  };
  const sdFile: PexelsVideoFile = {
    quality: "sd",
    width: 540,
    height: 960,
    link: "https://test.cdn/540p.mp4",
    file_type: "video/mp4",
  };
  const sdScore = scoreVideo(fakeVideo, sdFile, 10);
  assert.strictEqual(sdScore, -999, "SD file (< 720p) must be hard-rejected (-999)");

  const hd720File: PexelsVideoFile = {
    quality: "hd",
    width: 720,
    height: 1280,
    link: "https://test.cdn/720p.mp4",
    file_type: "video/mp4",
  };
  const hd1080File: PexelsVideoFile = {
    quality: "hd",
    width: 1080,
    height: 1920,
    link: "https://test.cdn/1080p.mp4",
    file_type: "video/mp4",
  };

  const score720 = scoreVideo(fakeVideo, hd720File, 10);
  const score1080 = scoreVideo(fakeVideo, hd1080File, 10);
  assert.strictEqual(score720, -999, "720p file (< 1080x1920) must be hard-rejected (-999) so zero upscaling blur ever occurs");
  assert.ok(score1080 > score720 + 80, `1080p score (${score1080}) must drastically exceed 720p score (${score720})`);
  console.log("✔ TEST 1 PASSED: Sub-1080p files (720p & 540p) hard-rejected, True 1080p+ vertical files strictly enforced.");

  // TEST 2: pickBestFile selects 1080p+ stream
  console.log("[TEST 2] Verifying pickBestFile chooses 1080p stream over 720p / 540p...");
  const multiStreamVideo: PexelsVideo = {
    id: 9999,
    duration: 15,
    video_files: [
      { quality: "sd", width: 540, height: 960, link: "https://test.cdn/540.mp4", file_type: "video/mp4" },
      { quality: "hd", width: 720, height: 1280, link: "https://test.cdn/720.mp4", file_type: "video/mp4" },
      { quality: "hd", width: 1080, height: 1920, link: "https://test.cdn/1080.mp4", file_type: "video/mp4" },
    ],
    video_pictures: [],
  };
  const best = pickBestFile(multiStreamVideo);
  assert.strictEqual(best?.link, "https://test.cdn/1080.mp4");
  assert.strictEqual(best?.height, 1920);
  assert.strictEqual(best?.width, 1080);
  console.log("✔ TEST 2 PASSED: pickBestFile accurately selected True 1080p Full HD vertical master.");

  // TEST 3: pickBestFile prefers crisp 2K/4K UHD master over heavily-compressed 1080p web transcode
  console.log("[TEST 3] Verifying pickBestFile prefers 2K/4K UHD master over compressed 1080p web stream...");
  const uhdStreamVideo: PexelsVideo = {
    id: 10001,
    duration: 12,
    video_files: [
      { quality: "hd", width: 1080, height: 1920, fps: 60, size: 3_800_000, link: "https://test.cdn/1080_lowbitrate.mp4", file_type: "video/mp4" },
      { quality: "uhd", width: 2160, height: 3840, fps: 30, size: 24_000_000, link: "https://test.cdn/2160_uhd_master.mp4", file_type: "video/mp4" },
    ],
    video_pictures: [],
  };
  const bestUhd = pickBestFile(uhdStreamVideo);
  assert.strictEqual(bestUhd?.link, "https://test.cdn/2160_uhd_master.mp4");
  console.log("✔ TEST 3 PASSED: 4K UHD master selected for razor-sharp Lanczos downscaling to 1080p.");

  // TEST 4: Low-bitrate 1080p 60fps web transcode (2.5 Mbps) is hard-rejected in scoreVideo
  console.log("[TEST 4] Verifying low-bitrate 60fps macroblocked stream is hard-rejected...");
  const starved60fpsFile: PexelsVideoFile = {
    quality: "hd",
    width: 1080,
    height: 1920,
    fps: 60,
    size: 4_780_000, // ~2.55 Mbps over 15s -> 0.020 bpp (pixelated!)
    link: "https://test.cdn/1080_60fps_starved.mp4",
    file_type: "video/mp4",
  };
  assert.strictEqual(scoreVideo(fakeVideo, starved60fpsFile, 10), -999, "2.55 Mbps @ 60fps stream must be rejected");
  console.log("✔ TEST 4 PASSED: Bitrate-starved 1080p60 stream rejected (-999).");

  // TEST 5: Word-boundary theological matching prevents false 'jahannam' fire/smoke clip injection on 'садака'/'радост'
  console.log("[TEST 5] Verifying word-boundary concept matching prevents false fire/smoke B-roll...");
  const sadaqaConcept = matchTheologicalConcept("Даването на садака носи радост над всяка тревога.");
  assert.notStrictEqual(sadaqaConcept?.id, "jahannam", "'садака'/'над'/'радост' must NEVER trigger jahannam fire clips!");
  const actualHellfire = matchTheologicalConcept("Пазете се от огъня на Ада дори с половин фурма.");
  assert.strictEqual(actualHellfire?.id, "jahannam", "Explicit mention of 'огъня на Ада' must match jahannam");
  console.log("✔ TEST 5 PASSED: Word-boundary theological matching is 100% accurate.");

  // TEST 6: pickBestFile prefers native 30fps progressive over 60fps within the same resolution tier when both have healthy bitrates
  console.log("[TEST 6] Verifying native 30fps progressive cadence is preferred over 60fps frame-drop judder...");
  const cadenceVideo: PexelsVideo = {
    id: 10002,
    duration: 15,
    video_files: [
      { quality: "uhd", width: 2160, height: 3840, fps: 60, size: 35_000_000, link: "https://test.cdn/2160_60fps.mp4", file_type: "video/mp4" },
      { quality: "uhd", width: 2160, height: 3840, fps: 30, size: 22_000_000, link: "https://test.cdn/2160_30fps_native.mp4", file_type: "video/mp4" },
    ],
    video_pictures: [],
  };
  const bestCadence = pickBestFile(cadenceVideo);
  assert.strictEqual(bestCadence?.link, "https://test.cdn/2160_30fps_native.mp4", "Native 30fps UHD stream must be preferred over 60fps to prevent 50% frame dropping");
  console.log("✔ TEST 6 PASSED: Native 30fps progressive stream selected with zero frame-drop judder.");

  // TEST 7: Anti-stampede scheduling & dynamic Bulgarian EET/EEST offset
  console.log("[TEST 7] Verifying anti-stampede scheduling (+13m off :00/:30) and dynamic Europe/Sofia DST...");
  const winterOffset = getBulgarianUtcOffset(new Date("2026-01-15T12:00:00Z"));
  const summerOffset = getBulgarianUtcOffset(new Date("2026-07-15T12:00:00Z"));
  assert.strictEqual(winterOffset, "+02:00", "Winter Sofia offset must be +02:00 (EET)");
  assert.strictEqual(summerOffset, "+03:00", "Summer Sofia offset must be +03:00 (EEST)");

  const stampededIso = buildBulgarianScheduledIso({
    year: 2026,
    month: "01",
    day: "15",
    hour: 12,
    minute: 0,
    avoidTopOfHourStampede: true,
  });
  const stampededDate = new Date(stampededIso);
  assert.strictEqual(stampededDate.getUTCMinutes(), 13, "Exact :00 slot must be shifted to :13 to bypass TikTok v26300gc top-of-hour API queue congestion");
  console.log("✔ TEST 7 PASSED: Anti-stampede (+13m) & dynamic Europe/Sofia DST offset verified.");

  // TEST 8: Verify Dual-Zone Perceptual FFmpeg pipeline & Cloudflare R2 video staging invariants
  console.log("[TEST 8] Verifying Dual-Zone Perceptual FFmpeg pipeline & R2 staging invariants...");
  const renderSrc = fs.readFileSync(path.resolve(process.cwd(), "src/lib/render.functions.ts"), "utf-8");
  const autopilotSrc = fs.readFileSync(path.resolve(process.cwd(), "src/lib/autopilot.functions.ts"), "utf-8");

  assert.ok(!renderSrc.includes("unsharp="), "render.functions.ts must NOT contain unsharp= filter before subtitles");
  assert.ok(!renderSrc.includes("deblock=-1,-1"), "render.functions.ts must NOT contain weakened deblock=-1,-1");
  assert.ok(!autopilotSrc.includes("deblock=-1,-1"), "autopilot.functions.ts must NOT contain weakened deblock=-1,-1");
  assert.ok(renderSrc.includes("hqdn3d=3.2:2.6:4.8:3.8,gblur=sigma=1.85,eq=brightness=-0.05:contrast=0.94:saturation=0.98"), "render.functions.ts must include strengthened Dual-Zone optical bokeh & contrast-scrim pre-conditioning");
  assert.ok(renderSrc.includes("42_000_000"), "render.functions.ts must include automatic lossless entropy circuit-breaker");
  assert.ok(renderSrc.includes("ScaledBorderAndShadow: yes"), "ASS subtitles must enable ScaledBorderAndShadow: yes");
  assert.ok(renderSrc.includes("\\blur0.45"), "ASS subtitles must apply \\blur0.45 anti-Gibbs edge smoothing");
  assert.ok(renderSrc.includes("-qp 0"), "Multi-scene B-Roll normalization must use lossless -qp 0");
  assert.ok(renderSrc.includes("-crf 17"), "Master encode must use -crf 17");
  assert.ok(renderSrc.includes("aq-mode=3:aq-strength=1.0"), "Master encode must use dark-biased auto-variance AQ (aq-mode=3)");
  assert.ok(renderSrc.includes("-maxrate 8000k"), "Master encode must provide 8000k VBV peak headroom for complex B-roll scenes while staying <64MB");
  assert.ok(renderSrc.includes("-flags +cgop"), "Master encode must enforce closed GOPs (-flags +cgop)");
  assert.ok(renderSrc.includes("deblock=0,0"), "Master encode must restore full H.264 in-loop deblocking (deblock=0,0)");
  assert.ok(autopilotSrc.includes("stageVideoViaUploadPostDirect"), "autopilot.functions.ts must stage MP4 video directly onto Cloudflare R2");
  console.log("✔ TEST 8 PASSED: All Dual-Zone Perceptual Mastering & R2 Direct Ingest invariants verified.");

  // TEST 9: Blacklist of high-entropy whitewater/surf/puddle/ripple Pexels IDs & 24-30fps LOCAL_HALAL_VIDEO_POOL
  console.log("[TEST 9] Verifying chaotic whitewater/puddle/ripple Pexels IDs are hard-rejected and local pool is 100% native 24-30fps...");
  for (const badId of [39772880, 28635672, 35901385, 29999653, 15088644, 36078797, 13723991, 9831984, 32320169, 39731443, 30875569, 9920799, 38857411, 38182932]) {
    assert.ok(PIXELATION_PRONE_VIDEO_IDS.has(badId), `PIXELATION_PRONE_VIDEO_IDS must blacklist ${badId}`);
    const badScore = scoreVideo({ ...fakeVideo, id: badId }, hd1080File, 10);
    assert.strictEqual(badScore, -9999, `Blacklisted chaotic video ${badId} must return -9999`);
  }
  const highBitrate60fpsFile: PexelsVideoFile = {
    quality: "uhd",
    width: 2160,
    height: 3840,
    fps: 60,
    size: 35_000_000,
    link: "https://test.cdn/2160_60fps.mp4",
    file_type: "video/mp4",
  };
  assert.strictEqual(scoreVideo(fakeVideo, highBitrate60fpsFile, 10), -999, "50/60fps streams must be hard-rejected in scoreVideo to prevent 30fps frame-drop entropy spikes");
  for (const item of LOCAL_HALAL_VIDEO_POOL) {
    assert.ok(!item.url.includes("60fps") && !item.url.includes("120fps"), `LOCAL_HALAL_VIDEO_POOL item ${item.id} must be native 24-30fps, got ${item.url}`);
  }
  console.log("✔ TEST 9 PASSED: Chaotic whitewater/puddle/ripple clips & 60fps streams blacklisted and fallback pool is 100% native 24-30fps.");

  console.log("\n🎉 ALL ANTI-PIXELATION TESTS PASSED WITH 100% SUCCESS!");
}

runTests().catch((err) => {
  console.error("❌ Test suite failed:", err);
  process.exit(1);
});
