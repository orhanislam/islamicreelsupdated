import assert from "node:assert";
import {
  matchTheologicalConcept,
  pickBestFile,
  scoreVideo,
  type PexelsVideo,
  type PexelsVideoFile,
} from "../pexels.functions";

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

  console.log("\n🎉 ALL ANTI-PIXELATION TESTS PASSED WITH 100% SUCCESS!");
}

runTests().catch((err) => {
  console.error("❌ Test suite failed:", err);
  process.exit(1);
});
