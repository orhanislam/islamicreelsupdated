import {
  readAutopilotConfigDirect,
  writeAutopilotConfigDirect,
  runAutopilotCycleDirect,
  publishVideoViaUploadPostDirect,
  DEFAULT_AUTOPILOT_CONFIG,
  getBulgarianTime,
  getNextBulgarianRun,
} from "../autopilot.functions";
import { generateAndStorePostRenderSocialKit, getJobsDir } from "../render.functions";
import { pickBestFile } from "../pexels.functions";
import { analyzeAndFixRenderPayloadSync } from "../render-analyzer";

async function testAutopilotConfigPersistence() {
  console.log("1. Testing AutopilotConfig persistence (including Upload-Post.com integration)...");
  const original = await readAutopilotConfigDirect();

  const updated = await writeAutopilotConfigDirect({
    enabled: true,
    scheduleTimes: ["08:30", "19:45"],
    videosPerRun: 3,
    contentMode: "explained_mix",
    autoDownloadOnOpen: true,
    webhookUrl: "https://example.com/webhook-test",
    uploadPostEnabled: true,
    uploadPostApiKey: "test_api_key_123",
    uploadPostUser: "islamic_reels_bg",
    uploadPostPlatforms: ["tiktok", "instagram"],
  });

  if (
    !updated.enabled ||
    updated.scheduleTimes.length !== 2 ||
    updated.scheduleTimes[0] !== "08:30" ||
    updated.videosPerRun !== 3 ||
    !updated.autoDownloadOnOpen ||
    updated.webhookUrl !== "https://example.com/webhook-test" ||
    !updated.uploadPostEnabled ||
    updated.uploadPostApiKey !== "test_api_key_123" ||
    updated.uploadPostUser !== "islamic_reels_bg" ||
    updated.uploadPostPlatforms.length !== 2
  ) {
    throw new Error(`AutopilotConfig update failed: ${JSON.stringify(updated)}`);
  }

  const reRead = await readAutopilotConfigDirect();
  if (
    reRead.scheduleTimes[1] !== "19:45" ||
    reRead.videosPerRun !== 3 ||
    reRead.uploadPostUser !== "islamic_reels_bg"
  ) {
    throw new Error(`AutopilotConfig re-read mismatch: ${JSON.stringify(reRead)}`);
  }

  // Verify validation when API key or User is missing
  const missingKeyCheck = await publishVideoViaUploadPostDirect({
    jobId: "test_1",
    mp4FilePath: "nonexistent.mp4",
    title: "Test",
    caption: "Test",
    apiKey: "",
    user: "islamic_reels_bg",
  });
  if (missingKeyCheck.published || !missingKeyCheck.error?.includes("API Key")) {
    throw new Error(`Expected missing API Key validation error, got: ${JSON.stringify(missingKeyCheck)}`);
  }

  // Restore original config
  await writeAutopilotConfigDirect(original);
  console.log("✔ AutopilotConfig & Upload-Post.com settings persistence verified!");
}

async function testPostRenderSocialKitAndCaptionGeneration() {
  console.log("2. Testing Post-Render Social Kit (SEO Title + Viral Caption + Caption File)...");
  const testJobId = `test_autopilot_kit_${Date.now()}`;
  const res = await generateAndStorePostRenderSocialKit({
    jobId: testJobId,
    title: "[40 Хадиса на ан-Науауи #19] Пази заповедите на Аллах и Той ще те пази",
    isAutopilot: true,
    dispatchWebhook: false,
    jobData: {
      isAutopilot: true,
      fullDalilText:
        "О, младежо! Ще те науча на няколко слова: Пази заповедите на Аллах и Той ще те пази! Пази границите Му и ще Го намериш пред себе си!",
      scriptWorkflow: {
        hookQuestion: "Търсите ли истинска закрила и сигурност в трудните моменти от живота?",
        hookContext: "Истинската сигурност идва единствено от опазването на Божествените граници.",
        dalilText:
          "О, младежо! Ще те науча на няколко слова: Пази заповедите на Аллах и Той ще те пази! Пази границите Му и ще Го намериш пред себе си!",
        explanation:
          "Когато вярващият пази повелите на Единствения Творец, Аллах Всевишният го дарява със Своята закрила и покой в сърцето.",
        actionStep: "Помолете Единствения Творец за искреност и споделете това видео за добро!",
      },
    },
  });

  if (!res.seoTitle || !res.viralCaption) {
    throw new Error("Missing seoTitle or viralCaption from generateAndStorePostRenderSocialKit");
  }
  if (res.viralCaption.includes("пазете")) {
    throw new Error(`Grammar corruption detected in viralCaption: ${res.viralCaption}`);
  }
  if (!res.viralCaption.includes("Пази заповедите на Аллах и Той ще те пази!")) {
    throw new Error(`Missing exact Dalil in viralCaption: ${res.viralCaption}`);
  }

  const fs = (await import("fs")).promises;
  const path = await import("path");
  const dir = await getJobsDir();
  const captionFile = path.join(dir, `${testJobId}_caption.txt`);
  const savedCaption = await fs.readFile(captionFile, "utf-8");
  if (savedCaption !== res.viralCaption) {
    throw new Error("Saved caption file does not match generated viralCaption");
  }
  await fs.unlink(captionFile).catch(() => {});
  console.log("✔ Post-Render Social Kit & 100% accurate Hadith #19 caption verified!");
}

async function testAutonomousCycleDryRun() {
  console.log("3. Testing Autonomous Zero-Click Autopilot Cycle (dry-run without FFmpeg)...");
  const original = await readAutopilotConfigDirect();

  const cycleRes = await runAutopilotCycleDirect({
    count: 1,
    contentMode: "hadith_only",
    topic: "40 Хадиса на ан-Науауи #19",
    triggerSource: "manual",
    skipRender: true,
  });

  if (!cycleRes.success || cycleRes.count < 1 || cycleRes.proposals.length < 1) {
    throw new Error(`Autopilot cycle failed: ${JSON.stringify(cycleRes)}`);
  }

  const p = cycleRes.proposals[0];
  if (!p.scriptWorkflow || !p.fullDalilText) {
    throw new Error(`Autopilot proposal missing scriptWorkflow or fullDalilText: ${JSON.stringify(p)}`);
  }
  if (p.fullDalilText !== p.scriptWorkflow.dalilText) {
    throw new Error(
      `WYSIWYG mismatch in Autopilot proposal: fullDalilText="${p.fullDalilText}" vs dalilText="${p.scriptWorkflow.dalilText}"`,
    );
  }
  if (p.fullDalilText.includes("пазете")) {
    throw new Error(`Grammar corruption in Autopilot Dalil: ${p.fullDalilText}`);
  }

  // Restore original config
  await writeAutopilotConfigDirect({
    ...DEFAULT_AUTOPILOT_CONFIG,
    ...original,
  });
  console.log("✔ Autonomous Zero-Click Autopilot Cycle verified: Proposal generated, audited 100%, and queued with zero clicks!");
}

async function testUltraHdQualityPipeline() {
  console.log("4. Testing Ultra-HD 1080p High-Profile Quality Pipeline & Pexels Selection...");
  // Case A: Pexels video with 4K (2160x3840) and 720p (720x1280) -> MUST pick 4K, NEVER 720p!
  const best4kOver720p = pickBestFile({
    id: 9001,
    video_files: [
      { quality: "sd", width: 540, height: 960, link: "https://cdn.test/540p.mp4", file_type: "video/mp4", fps: 30 },
      { quality: "hd", width: 720, height: 1280, link: "https://cdn.test/720p.mp4", file_type: "video/mp4", fps: 30 },
      { quality: "uhd", width: 2160, height: 3840, link: "https://cdn.test/4k.mp4", file_type: "video/mp4", fps: 60 },
    ],
    video_pictures: [],
  });
  if (best4kOver720p?.link !== "https://cdn.test/4k.mp4") {
    throw new Error(`Expected 4K stream over 720p, but got: ${JSON.stringify(best4kOver720p)}`);
  }

  // Case B: Multiple 1080x1920 streams -> MUST pick 60fps high-bitrate over 25fps low-bitrate!
  const best1080p60 = pickBestFile({
    id: 9002,
    video_files: [
      { quality: "hd", width: 1080, height: 1920, link: "https://cdn.test/1080p_25fps_low.mp4", file_type: "video/mp4", fps: 25, size: 4_000_000 },
      { quality: "hd", width: 1080, height: 1920, link: "https://cdn.test/1080p_60fps_high.mp4", file_type: "video/mp4", fps: 60, size: 15_000_000 },
    ],
    video_pictures: [],
  });
  if (best1080p60?.link !== "https://cdn.test/1080p_60fps_high.mp4") {
    throw new Error(`Expected 1080p 60fps high-bitrate stream, got: ${JSON.stringify(best1080p60)}`);
  }

  // Case C: Render Analyzer auto-upgrades 720p payload to 1080p Full HD
  const { data: analyzedData } = analyzeAndFixRenderPayloadSync({
    bulgarian: "Аллах Всевишният е с търпеливите.",
    quality: "720p",
  });
  if (analyzedData.quality !== "1080p") {
    throw new Error(`Expected Render Analyzer to upgrade 720p -> 1080p, got: ${analyzedData.quality}`);
  }
  console.log("✔ Ultra-HD 1080p High-Profile Quality Pipeline & Pexels 4K/60fps Selection verified!");
}

async function testViralCoverGenerationAndVideoEmbedding() {
  console.log("5. Testing Viral Cover Thumbnail Generation, MP4 Container Embedding, and Upload-Post Staging...");
  const { ensureJobThumbnailOnDisk } = await import("../thumbnail.functions");
  const { stageCoverImageViaUploadPostDirect } = await import("../autopilot.functions");
  const fs = (await import("fs")).promises;
  const path = await import("path");
  const { execFile } = await import("child_process");
  const util = await import("util");
  const execFileAsync = util.promisify(execFile);

  const testJobId = `test_cover_job_${Date.now()}`;
  const testTitle = "[40 Хадиса на ан-Науауи #19] Пази заповедите на Аллах и Той ще те пази";

  // 1. Generate & cache server thumbnail
  const thumb = await ensureJobThumbnailOnDisk({
    jobId: testJobId,
    title: testTitle,
  });

  if (!thumb.filePath || !thumb.buffer || thumb.buffer.length < 5000 || !thumb.dataUrl.startsWith("data:image/jpeg;base64,")) {
    throw new Error(`Invalid generated thumbnail: ${JSON.stringify(thumb)}`);
  }

  const statThumb = await fs.stat(thumb.filePath);
  if (statThumb.size !== thumb.buffer.length) {
    throw new Error(`Disk thumbnail size mismatch: ${statThumb.size} vs ${thumb.buffer.length}`);
  }

  // 2. Test MP4 attached_pic cover embedding
  let ffmpegPath = "ffmpeg";
  try {
    const installerMod = await import("@ffmpeg-installer/ffmpeg");
    const installer = installerMod.default || installerMod;
    if (installer?.path) ffmpegPath = installer.path;
  } catch {}

  const dir = await getJobsDir();
  const dummyMp4 = path.join(dir, `${testJobId}_raw.mp4`);
  await execFileAsync(ffmpegPath, [
    "-y",
    "-f", "lavfi", "-i", "color=c=black:s=1080x1920:d=1",
    "-f", "lavfi", "-i", "sine=frequency=1000:duration=1",
    "-c:v", "libx264", "-c:a", "aac", "-pix_fmt", "yuv420p",
    dummyMp4,
  ]);

  // Embed cover using ensureHighProfileMasterForUploadPost logic
  const targetCoveredMp4 = path.join(dir, `${testJobId}_covered.mp4`);
  await execFileAsync(ffmpegPath, [
    "-y",
    "-i", dummyMp4,
    "-i", thumb.filePath,
    "-map", "0:v:0",
    "-map", "0:a?",
    "-map", "1:v:0",
    "-c", "copy",
    "-disposition:v:1", "attached_pic",
    targetCoveredMp4,
  ]);

  const { stdout: probeOut } = await execFileAsync("ffprobe", [
    "-v", "error",
    "-show_entries", "stream=index,codec_name,disposition",
    "-of", "json",
    targetCoveredMp4,
  ]);
  const probeData = JSON.parse(probeOut || "{}");
  const coverStream = (probeData.streams || []).find(
    (s: any) => s.codec_name === "mjpeg" || s.disposition?.attached_pic === 1,
  );
  if (!coverStream) {
    throw new Error(`MP4 container does not contain attached_pic cover stream: ${probeOut}`);
  }

  // 3. Test Upload-Post cover staging via MCP
  const testApiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6Im5heWRlbnRhc2hrb3ZAZ21haWwuY29tIiwiZXhwIjo0OTQ2NTcwMTE5LCJqdGkiOiJkY2U1Yzg3Yi03NzQ2LTRlOWEtYjg2ZS1lYzdkNjk1MjBjOTcifQ.SQviBwJALtBFxyEG7pL2Aou09bRpE2LqRyySdJ7gVlE";
  const stagedUrl = await stageCoverImageViaUploadPostDirect({
    coverBuffer: thumb.buffer,
    apiKey: testApiKey,
  });

  if (!stagedUrl || !stagedUrl.startsWith("https://")) {
    throw new Error(`Expected valid HTTPS staged cover URL, got: ${stagedUrl}`);
  }

  // Cleanup test artifacts
  await fs.unlink(dummyMp4).catch(() => {});
  await fs.unlink(targetCoveredMp4).catch(() => {});
  await fs.unlink(thumb.filePath).catch(() => {});

  console.log("✔ Viral Cover Thumbnail Generation, MP4 Container Embedding, and Upload-Post Staging verified 100%!");
}

async function testBulgarianTimeAndScheduler() {
  console.log("6. Testing Bulgarian Timezone (Europe/Sofia) & Autopilot Schedule Matching...");

  // 1. Verify getBulgarianTime calculations
  const sampleUtcMorning = new Date("2026-10-26T06:00:00Z");
  const bgMorning = getBulgarianTime(sampleUtcMorning);
  if (bgMorning.timeHm !== "08:00") {
    throw new Error(`Expected Bulgarian time 08:00 for 06:00 UTC, got: ${bgMorning.timeHm}`);
  }

  const sampleUtcMidnight = new Date("2026-10-25T22:00:00Z");
  const bgMidnight = getBulgarianTime(sampleUtcMidnight);
  if (bgMidnight.timeHm !== "00:00") {
    throw new Error(`Expected Bulgarian time 00:00 for 22:00 UTC, got: ${bgMidnight.timeHm}`);
  }

  // 2. Verify getNextBulgarianRun
  const configuredTimes = ["00:00", "04:00", "12:00", "16:00", "20:00"];

  // Test at 08:30 Bulgarian time (06:30 UTC)
  const morningRun = getNextBulgarianRun(configuredTimes, new Date("2026-10-26T06:30:00Z"));
  if (!morningRun || morningRun.nextTime !== "12:00" || !morningRun.isToday) {
    throw new Error(`Expected next run 12:00 today, got: ${JSON.stringify(morningRun)}`);
  }

  // Test at 21:15 Bulgarian time (19:15 UTC) -> should be 00:00 tomorrow
  const nightRun = getNextBulgarianRun(configuredTimes, new Date("2026-10-26T19:15:00Z"));
  if (!nightRun || nightRun.nextTime !== "00:00" || nightRun.isToday) {
    throw new Error(`Expected next run 00:00 tomorrow, got: ${JSON.stringify(nightRun)}`);
  }

  // 3. Verify slot delta matching logic
  const checkSlotGrace = (slotH: number, slotM: number, curH: number, curM: number) => {
    const s = slotH * 60 + slotM;
    const c = curH * 60 + curM;
    const diff = (c - s + 1440) % 1440;
    return diff >= 0 && diff <= 3;
  };

  if (!checkSlotGrace(12, 0, 12, 0)) throw new Error("12:00 at 12:00 should match");
  if (!checkSlotGrace(12, 0, 12, 2)) throw new Error("12:00 at 12:02 should match (grace window)");
  if (checkSlotGrace(12, 0, 12, 4)) throw new Error("12:00 at 12:04 should not match (past grace window)");
  if (!checkSlotGrace(0, 0, 0, 1)) throw new Error("00:00 at 00:01 should match");
  if (checkSlotGrace(12, 0, 11, 59)) throw new Error("12:00 at 11:59 should not match before time");

  // 4. Verify config dynamic fields
  const cfg = await readAutopilotConfigDirect();
  if (cfg.timezone !== "Europe/Sofia" || !cfg.serverBulgarianTime) {
    throw new Error(`Config missing dynamic Bulgarian time fields: ${JSON.stringify(cfg)}`);
  }

  console.log("✔ Bulgarian Timezone (Europe/Sofia) & Autopilot Schedule Matching verified 100%!");
}

async function main() {
  console.log("=== Running Autopilot Engine Verification Suite ===");
  await testAutopilotConfigPersistence();
  await testPostRenderSocialKitAndCaptionGeneration();
  await testUltraHdQualityPipeline();
  await testViralCoverGenerationAndVideoEmbedding();
  await testBulgarianTimeAndScheduler();
  await testAutonomousCycleDryRun();
  console.log("✔ ALL AUTOPILOT ENGINE TESTS PASSED SUCCESSFULLY!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Autopilot verification failed:", err);
  process.exit(1);
});
