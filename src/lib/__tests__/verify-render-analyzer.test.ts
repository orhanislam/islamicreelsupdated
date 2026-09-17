/**
 * Comprehensive Verification Suite for Video Render Quality & Halal Compliance Analyzer
 *
 * Verifies:
 * 1. TTS & Theological Respect (Tawheed titles, phonetics normalization, adab)
 * 2. Zero Dead Air ("след като свърши последната дума да няма пауза")
 * 3. Subtitles & Safe Zones (TikTok 760px boundary, wrapping, monotonic sync)
 * 4. Background & Salafi Halal Compliance (faces/humans/music exclusion & verified fallback)
 * 5. Full Self-Healing End-to-End Execution
 */

import {
  analyzeAndFixRenderPayloadSync,
  estimateTextWidth,
  wrapTextToSafeWidth,
  isBackgroundUrlOrMetadataHaram,
  cleanContentArtifacts,
} from "../render-analyzer";
import { LOCAL_HALAL_VIDEO_POOL } from "../backgrounds.functions";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
}

async function runTests() {
  console.log("=================================================================");
  console.log("🛡️ STARTING RENDER ANALYZER & HALAL COMPLIANCE VERIFICATION SUITE");
  console.log("=================================================================\n");

  // ---------------------------------------------------------------------------
  // TEST 1: Theological Sanitization & Respectful Phrasing for Allah
  // ---------------------------------------------------------------------------
  console.log("[TEST 1] Verifying Theological Sanitization & Adab Enforcement...");
  {
    const payload = {
      bulgarian: "Когато оня изпитва вярата на човека, единичкият творец показва своята милост.",
      topic: "[tiktok carousels] **Защо единичкия творец ни напътва**",
      reference: "Сура Ал-Бакара • 2:155",
    };

    const { data, report } = analyzeAndFixRenderPayloadSync(payload);

    assert(
      !data.bulgarian.includes("оня"),
      "Must eliminate casual 'оня' when referring to Allah!",
    );
    assert(
      data.bulgarian.includes("Аллах Всевишният") || data.bulgarian.includes("своя Създател"),
      "Must replace 'оня' with dignified Islamic title!",
    );
    assert(
      !data.bulgarian.includes("единичкият творец"),
      "Must eliminate diminutive 'единичкият творец'!",
    );
    assert(
      data.bulgarian.includes("Единственият Творец"),
      "Must replace with authentic 'Единственият Творец'!",
    );
    assert(
      !data.topic.includes("[tiktok carousels]"),
      "Must strip unwanted [tiktok carousels] prefix!",
    );
    assert(!data.topic.includes("**"), "Must strip Markdown asterisks from topic!");
    assert(
      data.topic.includes("Единствения Творец"),
      "Must sanitize topic to 'Единствения Творец'!",
    );

    assert(
      report.details.tts.theologicalSanitizations >= 2,
      `Expected at least 2 theological sanitizations, got ${report.details.tts.theologicalSanitizations}`,
    );
    assert(
      report.details.haramCompliance.shirkOrDisrespectCleaned >= 2,
      "Expected shirk/disrespect cleaned count >= 2",
    );
    console.log("✔ [TEST 1] Passed: Theological respect and clean adab 100% verified.");
  }

  // ---------------------------------------------------------------------------
  // TEST 2: Zero Dead Air ("след като свърши последната дума да няма пауза")
  // ---------------------------------------------------------------------------
  console.log("\n[TEST 2] Verifying Zero Dead Air (No trailing pause after last word finishes)...");
  {
    const payload = {
      bulgarian: "Аллах обича търпеливите",
      audioDur: 25.0, // Long probed duration or default from TTS
      bulgarianWordTimings: [
        { word: "Аллах", start: 0.1, end: 0.8 },
        { word: "обича", start: 0.85, end: 1.6 },
        { word: "търпеливите", start: 1.65, end: 2.85 }, // Last word finishes at 2.85s!
      ],
    };

    const { data, report } = analyzeAndFixRenderPayloadSync(payload);

    assert(
      report.details.tts.speechEndSec === 2.85,
      `Expected speechEndSec to be exactly 2.85, got ${report.details.tts.speechEndSec}`,
    );
    assert(
      report.details.tts.tightDurationSec === 3.0, // 2.85 + 0.15 = 3.00s!
      `Expected tightDurationSec to be 3.0s (2.85 + 0.15), got ${report.details.tts.tightDurationSec}`,
    );
    assert(
      report.details.tts.zeroDeadAirEnforced === true,
      "Zero dead air flag must be true!",
    );
    assert(
      data.audioDur === 3.0,
      `data.audioDur must be clamped down from 25.0s to exactly 3.0s, got ${data.audioDur}`,
    );
    assert(
      report.actionsTaken.some((a) => a.includes("Премахната мъртва пауза")),
      "Actions taken must log trailing dead pause removal!",
    );
    console.log("✔ [TEST 2] Passed: Zero Dead Air tightly ends video at 3.00s (no trailing silence).");
  }

  // ---------------------------------------------------------------------------
  // TEST 3: Subtitles & TikTok Safe Zone Line Width
  // ---------------------------------------------------------------------------
  console.log("\n[TEST 3] Verifying Subtitles & Safe Zone Line Width Auto-Wrapping...");
  {
    const words = ["Това", "е", "изключително", "важно", "напътствие", "за", "всеки", "мюсюлманин"];
    const fontSize = 80;
    const maxSafeWidth = 760; // TikTok safe horizontal corridor
    const lines = wrapTextToSafeWidth(words, fontSize, maxSafeWidth);

    for (const line of lines) {
      const w = estimateTextWidth(line, fontSize);
      assert(
        w <= maxSafeWidth,
        `Line '${line}' width ${w}px exceeds safe width ${maxSafeWidth}px!`,
      );
    }
    assert(lines.length > 1, "Expected text to wrap into multiple safe lines");

    // Test timing overlap correction and display word normalization
    const messyPayload = {
      bulgarian: "Астагфируллаах",
      bulgarianWordTimings: [
        { word: "Астагфируллаах", start: 0.0, end: 1.2 },
      ],
    };
    const { data: cleanedData } = analyzeAndFixRenderPayloadSync(messyPayload);
    assert(
      cleanedData.bulgarianWordTimings[0].word === "Астагфируллах",
      `Expected display word to normalize from phonetic 'Астагфируллаах' to readable 'Астагфируллах', got '${cleanedData.bulgarianWordTimings[0].word}'`,
    );
    console.log("✔ [TEST 3] Passed: Subtitle text strictly wrapped within 760px and normalized.");
  }

  // ---------------------------------------------------------------------------
  // TEST 4: Background & Halal Visual Compliance (Exclusion of Haram & Fallback)
  // ---------------------------------------------------------------------------
  console.log("\n[TEST 4] Verifying Background & Salafi Halal Compliance...");
  {
    // 4a. Check that haram tokens are caught
    const haramCheck = isBackgroundUrlOrMetadataHaram(
      "https://example.com/videos/portrait_woman_model_face_party_beer.mp4",
    );
    assert(haramCheck.isHaram === true, "Must flag woman/face/party/beer as haram!");
    assert(
      haramCheck.detectedTokens.includes("woman"),
      "Must detect forbidden token 'woman'",
    );
    assert(
      haramCheck.detectedTokens.includes("face"),
      "Must detect forbidden token 'face'",
    );

    // 4b. Check that analyzer automatically swaps haram background with 100% halal asset
    const haramPayload = {
      backgroundVideoUrl: "https://example.com/videos/party_dancing_women.mp4",
      bulgarian: "Напомняне за молитвата",
    };
    const { data, report } = analyzeAndFixRenderPayloadSync(haramPayload);

    assert(
      report.details.background.replacedWithFallback === true,
      "Must auto-replace haram background with fallback!",
    );
    assert(
      !data.backgroundVideoUrl.includes("party"),
      "Cleaned data must not contain haram URL!",
    );
    assert(
      LOCAL_HALAL_VIDEO_POOL.some(
        (asset) =>
          data.backgroundVideoUrl === asset.url ||
          data.backgroundVideoUrl === asset.fallbackRemoteUrl,
      ),
      "Cleaned background must be an authentic asset from LOCAL_HALAL_VIDEO_POOL!",
    );
    assert(
      report.details.background.audioStripped === true,
      "Background video must have audioStripped = true (0% music guarantee)!",
    );
    console.log("✔ [TEST 4] Passed: Haram imagery blocked and replaced with curated Halal video pool.");
  }

  // ---------------------------------------------------------------------------
  // TEST 5: Full Self-Healing End-to-End Simulation
  // ---------------------------------------------------------------------------
  console.log("\n[TEST 5] Full Self-Healing End-to-End Payload Test...");
  {
    const badPayload = {
      title: "[tiktok carousels] Единичкият Създател на световете",
      topic: "[видео] Единичкия Творец",
      bulgarian: "Когато оня напътва човека, кажи (с/у) и астафируллах.",
      backgroundVideoUrl: "https://pexels.com/video/young-woman-drinking-wine-at-concert-with-guitar.mp4",
      audioDur: 30.0,
      bulgarianWordTimings: [
        { word: "Когато", start: 0.1, end: 0.7 },
        { word: "оня", start: 0.72, end: 1.3 },
        { word: "напътва", start: 1.32, end: 2.1 },
        { word: "човека", start: 2.15, end: 2.9 },
        { word: "кажи", start: 2.95, end: 3.5 },
        { word: "астафируллах", start: 3.55, end: 4.8 }, // last word finishes at 4.8s
      ],
      bRollUrls: [
        "https://pexels.com/crowd_of_people_dancing.mp4",
        "https://images.pexels.com/videos/2098989/pexels-video-2098989.mp4",
      ],
    };

    const { data, report } = analyzeAndFixRenderPayloadSync(badPayload);

    // Verify all fixes
    assert(report.issuesFound > 0, "Should detect multiple flaws in payload");
    assert(report.issuesFixed === report.issuesFound, "All detected flaws must be auto-fixed!");
    assert(report.passed === true, "Report status must be passed after self-healing!");

    // TTS & Theology
    assert(!data.bulgarian.includes("оня"), "Disrespectful pronoun eliminated");
    assert(!data.topic.includes("[видео]"), "Prefix eliminated");
    assert(data.topic.includes("Единствения Творец"), "Tawheed title corrected");

    // Zero Dead Air
    assert(
      data.audioDur === 4.95, // 4.8 + 0.15 = 4.95s (instead of 30.0s!)
      `Expected audioDur clamped to 4.95s, got ${data.audioDur}`,
    );

    // Background & Visual Halal
    assert(
      report.details.background.replacedWithFallback === true,
      "Haram background replaced",
    );
    assert(
      !data.bRollUrls.some((u: string) => u.includes("crowd")),
      "Haram b-roll clip eliminated",
    );

    console.log(`✔ [TEST 5] Passed: ${report.issuesFixed}/${report.issuesFound} issues autonomously repaired.`);
  }

  console.log("\n=================================================================");
  console.log("🎉 ALL RENDER ANALYZER TESTS PASSED WITH 100% COMPLIANCE (5/5)!");
  console.log("=================================================================");
}

runTests().catch((err) => {
  console.error("\n❌ TEST SUITE FAILED:", err);
  process.exit(1);
});
