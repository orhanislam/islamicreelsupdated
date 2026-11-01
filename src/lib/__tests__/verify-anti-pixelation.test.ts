import assert from "node:assert";
import { pickBestFile, scoreVideo, type PexelsVideo, type PexelsVideoFile } from "../pexels.functions";

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
  assert.ok(score1080 > score720 + 80, `1080p score (${score1080}) must drastically exceed 720p score (${score720})`);
  console.log("✔ TEST 1 PASSED: SD files (< 720p) rejected, 1080p+ vertical files strongly prioritized.");

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

  console.log("\n🎉 ALL ANTI-PIXELATION TESTS PASSED WITH 100% SUCCESS!");
}

runTests().catch((err) => {
  console.error("❌ Test suite failed:", err);
  process.exit(1);
});
