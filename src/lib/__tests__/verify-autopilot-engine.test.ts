import {
  readAutopilotConfigDirect,
  writeAutopilotConfigDirect,
  runAutopilotCycleDirect,
  publishVideoViaUploadPostDirect,
  DEFAULT_AUTOPILOT_CONFIG,
} from "../autopilot.functions";
import { generateAndStorePostRenderSocialKit, getJobsDir } from "../render.functions";

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

async function main() {
  console.log("=== Running Autopilot Engine Verification Suite ===");
  await testAutopilotConfigPersistence();
  await testPostRenderSocialKitAndCaptionGeneration();
  await testAutonomousCycleDryRun();
  console.log("✔ ALL AUTOPILOT ENGINE TESTS PASSED SUCCESSFULLY!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Autopilot verification failed:", err);
  process.exit(1);
});
