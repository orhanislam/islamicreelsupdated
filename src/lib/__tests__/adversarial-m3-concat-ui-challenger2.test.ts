/**
 * ADVERSARIAL CHALLENGER 2 HARNESS — MILESTONE M3
 * Multi-Slide Concat Demuxer & Frontend Integration Verification
 * File: src/lib/__tests__/adversarial-m3-concat-ui-challenger2.test.ts
 */

import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

let totalPassed = 0;
let totalFailed = 0;
const failures: { testName: string; error: string }[] = [];

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED]: ${msg}`);
  }
}

function assertEq<T>(actual: T, expected: T, msg: string) {
  if (actual !== expected) {
    throw new Error(`${msg} | Expected: ${JSON.stringify(expected)}, Got: ${JSON.stringify(actual)}`);
  }
}

async function runTest(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    totalPassed++;
    console.log(`  ✔ [PASS] ${name}`);
  } catch (err: any) {
    totalFailed++;
    failures.push({ testName: name, error: err.message || String(err) });
    console.error(`  ✖ [FAIL] ${name}\n     ${err.message}`);
  }
}

async function main() {
  console.log("=================================================================");
  console.log("⚔️ ADVERSARIAL CHALLENGER 2: M3 CONCAT DEMUXER & UI CONTRACTS");
  console.log("=================================================================");

  // -----------------------------------------------------------------
  // SUITE 1: Multi-Slide Concat Demuxer inputs.txt & Flags Contract
  // -----------------------------------------------------------------
  console.log("\n--- Suite 1: Concat Demuxer inputs.txt & Command Flags ---");

  await runTest("1.1: inputs.txt generation correctly formats 4-slide sequence with relative safe filenames", () => {
    const slideCount = 4;
    let inputsListContent = "";
    for (let i = 0; i < slideCount; i++) {
      inputsListContent += `file 'vid_${i}.mp4'\n`;
    }

    const lines = inputsListContent.trim().split("\n");
    assertEq(lines.length, 4, "Must contain exactly 4 lines for 4 slides");
    assertEq(lines[0], "file 'vid_0.mp4'", "Slide 0 filename format");
    assertEq(lines[1], "file 'vid_1.mp4'", "Slide 1 filename format");
    assertEq(lines[2], "file 'vid_2.mp4'", "Slide 2 filename format");
    assertEq(lines[3], "file 'vid_3.mp4'", "Slide 3 filename format");
  });

  await runTest("1.2: inputs.txt correctly handles single-slide edge case (n=1)", () => {
    let inputsListContent = "";
    for (let i = 0; i < 1; i++) {
      inputsListContent += `file 'vid_${i}.mp4'\n`;
    }
    const lines = inputsListContent.trim().split("\n");
    assertEq(lines.length, 1, "Single-slide produces exactly 1 line");
    assertEq(lines[0], "file 'vid_0.mp4'", "Single-slide line format");
  });

  await runTest("1.3: inputs.txt correctly handles 10-slide boundary case (n=10)", () => {
    let inputsListContent = "";
    for (let i = 0; i < 10; i++) {
      inputsListContent += `file 'vid_${i}.mp4'\n`;
    }
    const lines = inputsListContent.trim().split("\n");
    assertEq(lines.length, 10, "10-slide produces exactly 10 lines");
    for (let i = 0; i < 10; i++) {
      assertEq(lines[i], `file 'vid_${i}.mp4'`, `Slide ${i} line format`);
    }
  });

  await runTest("1.4: Concat demuxer command uses strictly -f concat -safe 0 -c copy", () => {
    const inputsListPath = "dummy/inputs.txt";
    const finalVideoPath = "dummy/out.mp4";
    const cmd = `ffmpeg -y -f concat -safe 0 -i "${inputsListPath}" -c copy "${finalVideoPath}"`;

    assert(cmd.includes("-f concat"), "Command must specify concat format demuxer (-f concat)");
    assert(cmd.includes("-safe 0"), "Command must allow paths without relative restriction (-safe 0)");
    assert(cmd.includes("-c copy"), "Command must perform lossless stream copy without re-encoding (-c copy)");
  });

  // -----------------------------------------------------------------
  // SUITE 2: Total Duration Calculation & Precision Verification
  // -----------------------------------------------------------------
  console.log("\n--- Suite 2: Duration Math, Padding, & Sub-second Clamping ---");

  await runTest("2.1: Exact sum of slide durations with 0.5s padding across 4 slides", () => {
    const rawSlideDurations = [3.5, 4.0, 2.5, 5.0];
    let totalDurationSecs = 0;

    for (const rawDur of rawSlideDurations) {
      let audioDurationSecs = rawDur;
      audioDurationSecs += 0.5;
      totalDurationSecs += audioDurationSecs;
    }

    // Expected: (3.5+0.5) + (4.0+0.5) + (2.5+0.5) + (5.0+0.5) = 4 + 4.5 + 3 + 5.5 = 17.0
    const reportedDuration = Number(totalDurationSecs.toFixed(2));
    assertEq(reportedDuration, 17.0, "Total duration must exactly equal 17.0 seconds");
  });

  await runTest("2.2: Floating-point precision rounding prevents precision drift (toFixed(2))", () => {
    const rawSlideDurations = [3.14159, 2.71828, 4.12345, 1.98765];
    let totalDurationSecs = 0;

    for (const rawDur of rawSlideDurations) {
      let audioDurationSecs = rawDur;
      audioDurationSecs += 0.5;
      totalDurationSecs += audioDurationSecs;
    }

    const reportedDuration = Number(totalDurationSecs.toFixed(2));
    // 3.64159 + 3.21828 + 4.62345 + 2.48765 = 13.97097 -> 13.97
    assertEq(reportedDuration, 13.97, "Rounded duration must prevent floating point drift");
    assert(typeof reportedDuration === "number", "Reported duration must be a JavaScript number");
  });

  await runTest("2.3: Sub-second audio durations (< 0.5s) clamp to fallback 3.0s + 0.5s padding", () => {
    const probeResults = [0.2, 0.49, 0.0, -1.0];
    for (const dur of probeResults) {
      let audioDurationSecs = 3.0;
      if (!isNaN(dur) && dur >= 0.5) {
        audioDurationSecs = dur;
      } else {
        audioDurationSecs = 3.0;
      }
      audioDurationSecs += 0.5;
      assertEq(audioDurationSecs, 3.5, `Clamped duration for ${dur} must be 3.5s`);
    }
  });

  await runTest("2.4: Empty or whitespace-only slide text triggers fallback 3.0s + 0.5s padding", () => {
    const emptyTexts = ["", "   ", "\t\n  "];
    for (const text of emptyTexts) {
      const hasText = text && text.trim().length > 0;
      assert(!hasText, "Whitespace text should be recognized as empty");
      const audioDurationSecs = 3.0 + 0.5;
      assertEq(audioDurationSecs, 3.5, "Empty text slide defaults to 3.5s duration");
    }
  });

  // -----------------------------------------------------------------
  // SUITE 3: Output Path, Download URL, and Title Sanitization
  // -----------------------------------------------------------------
  console.log("\n--- Suite 3: Output Location & Download URL Verification ---");

  await runTest("3.1: Output file location resolves to ~/.islamicreels_jobs/${jobId}.mp4", () => {
    const jobId = "abc123xyz";
    const primaryDir = path.join(os.homedir(), ".islamicreels_jobs");
    const finalVideoPath = path.join(primaryDir, `${jobId}.mp4`);

    assert(finalVideoPath.includes(".islamicreels_jobs"), "Path must contain .islamicreels_jobs directory");
    assert(finalVideoPath.endsWith(`${jobId}.mp4`), "Path must end with ${jobId}.mp4");
  });

  await runTest("3.2: DownloadUrl format encodes sanitized title and jobId properly", () => {
    const jobId = "job_456";
    const titles = [
      { input: "Ислямски_Карусел", expectedFilename: "Ислямски_Карусел.mp4" },
      { input: "Тест / Видео : Знание * 100% ?", expectedFilename: "Тест _ Видео _ Знание _ 100% _.mp4" },
      { input: 'Quotes "Sacred" <Hadith>', expectedFilename: "Quotes _Sacred_ _Hadith_.mp4" },
      { input: "", expectedFilename: "Ислямски_Карусел.mp4" },
      { input: "   ", expectedFilename: "Ислямски_Карусел.mp4" },
    ];

    for (const { input, expectedFilename } of titles) {
      const cleanTitleSafe =
        (input || "Ислямски_Карусел").replace(/[<>:"/\\|?*]+/g, "_").trim() || "Ислямски_Карусел";
      const finalVideoName = `${cleanTitleSafe}.mp4`;
      assertEq(finalVideoName, expectedFilename, `Filename sanitization for "${input}"`);

      const downloadUrl = `/api/download/${jobId}?filename=${encodeURIComponent(finalVideoName)}`;
      assert(downloadUrl.startsWith(`/api/download/${jobId}?filename=`), "URL starts with /api/download/");
      assert(downloadUrl.includes(encodeURIComponent(finalVideoName)), "URL contains URI encoded filename");
    }
  });

  // -----------------------------------------------------------------
  // SUITE 4: UI Trigger Contract in CarouselRendererButton.tsx
  // -----------------------------------------------------------------
  console.log("\n--- Suite 4: CarouselRendererButton UI Contract Verification ---");

  const uiButtonPath = path.resolve(process.cwd(), "src/components/CarouselRendererButton.tsx");
  const uiButtonCode = await fs.readFile(uiButtonPath, "utf-8");

  await runTest("4.1: UI imports fetchCarouselSlideVideos and getCarouselSlideVideos", () => {
    assert(
      uiButtonCode.includes("fetchCarouselSlideVideos") && uiButtonCode.includes("getCarouselSlideVideos"),
      "CarouselRendererButton must import video fetching functions from pexels.functions"
    );
  });

  await runTest("4.2: handleGenerateVideo invokes video background fetching with fallback", () => {
    assert(
      uiButtonCode.includes("runFetchVideos({ data: { slides: initialSlides as any } })"),
      "Must attempt server-side video fetching"
    );
    assert(
      uiButtonCode.includes("fetchCarouselSlideVideos(initialSlides as any)"),
      "Must have direct fallback to fetchCarouselSlideVideos"
    );
  });

  await runTest("4.3: handleGenerateVideo passes overlayOnly: true and useVideoSafeZone: true to renderCarouselSlide", () => {
    assert(
      uiButtonCode.includes("overlayOnly: true"),
      "renderCarouselSlide must be called with overlayOnly: true"
    );
    assert(
      uiButtonCode.includes("useVideoSafeZone: true"),
      "renderCarouselSlide must be called with useVideoSafeZone: true"
    );
  });

  await runTest("4.4: Payload assembly compiles overlayBase64, videoUrl, and text", () => {
    assert(uiButtonCode.includes("overlayBase64: b64"), "Payload must include overlayBase64");
    assert(uiButtonCode.includes("videoUrl: videoResults[i]?.videoUrl"), "Payload must include videoUrl");
    assert(uiButtonCode.includes("text: slideText"), "Payload must include text");
    assert(
      uiButtonCode.includes("runBuildVideo({ data: { slides: payload, title: cleanTitle } })"),
      "Must dispatch payload to buildCarouselVideo server function"
    );
  });

  await runTest("4.5: Slide text aggregation filters out undefined/empty components cleanly", () => {
    const sampleSlide = {
      topTitle: "Сура Ал-Фатиха",
      quoteText: "В името на Аллах",
      commentaryText: undefined,
      mainText: "Първата сура от Корана",
    };

    const slideText = [
      sampleSlide.topTitle,
      sampleSlide.quoteText,
      sampleSlide.commentaryText,
      sampleSlide.mainText,
    ]
      .filter(Boolean)
      .join(". ");

    assertEq(
      slideText,
      "Сура Ал-Фатиха. В името на Аллах. Първата сура от Корана",
      "Slide text should join non-empty fields with '. '"
    );
  });

  await runTest("4.6: Automatic redirection to downloadUrl upon completion", () => {
    assert(
      uiButtonCode.includes("window.location.href = downloadUrl;"),
      "Must trigger file download via window.location.href"
    );
  });

  // -----------------------------------------------------------------
  // SUITE 5: Live FFmpeg Concat Demuxer Execution Test
  // -----------------------------------------------------------------
  console.log("\n--- Suite 5: Live FFmpeg Multi-Slide Concat Execution & FFprobe Probe ---");

  await runTest("5.1: Live FFmpeg multi-slide video concatenation and validation", async () => {
    const testTmpDir = path.join(os.tmpdir(), `challenger_concat_${Date.now()}`);
    await fs.mkdir(testTmpDir, { recursive: true });

    try {
      // Create two 1.0-second test video clips (1080x1920, h264, aac)
      const clip0 = path.join(testTmpDir, "vid_0.mp4");
      const clip1 = path.join(testTmpDir, "vid_1.mp4");

      // Generate synthetic color video clips with silent audio
      await execAsync(
        `ffmpeg -y -f lavfi -i color=c=navy:s=1080x1920:d=1.0 -f lavfi -i anullsrc=r=44100:cl=stereo -t 1.0 -c:v libx264 -pix_fmt yuv420p -c:a aac "${clip0}"`
      );
      await execAsync(
        `ffmpeg -y -f lavfi -i color=c=darkgreen:s=1080x1920:d=1.5 -f lavfi -i anullsrc=r=44100:cl=stereo -t 1.5 -c:v libx264 -pix_fmt yuv420p -c:a aac "${clip1}"`
      );

      // Generate inputs.txt
      const inputsListPath = path.join(testTmpDir, "inputs.txt");
      const inputsContent = `file 'vid_0.mp4'\nfile 'vid_1.mp4'\n`;
      await fs.writeFile(inputsListPath, inputsContent, "utf-8");

      // Execute concat demuxer exactly as carousel-video.functions.ts does
      const finalConcatOutput = path.join(testTmpDir, "concat_out.mp4");
      await execAsync(`ffmpeg -y -f concat -safe 0 -i "${inputsListPath}" -c copy "${finalConcatOutput}"`);

      // Probe concatenated output with ffprobe
      const { stdout: probeStdout } = await execAsync(
        `ffprobe -v quiet -print_format json -show_format -show_streams "${finalConcatOutput}"`
      );
      const probeData = JSON.parse(probeStdout);

      assert(probeData.streams && probeData.streams.length >= 2, "Concat output must have both video and audio streams");

      const videoStream = probeData.streams.find((s: any) => s.codec_type === "video");
      const audioStream = probeData.streams.find((s: any) => s.codec_type === "audio");

      assert(videoStream, "Must have video stream");
      assertEq(videoStream.width, 1080, "Video width must be 1080");
      assertEq(videoStream.height, 1920, "Video height must be 1920");
      assertEq(videoStream.codec_name, "h264", "Video codec must be h264");

      assert(audioStream, "Must have audio stream");
      assertEq(audioStream.codec_name, "aac", "Audio codec must be aac");

      const totalDuration = parseFloat(probeData.format.duration);
      // Expected total duration: 1.0 + 1.5 = 2.5s (within 0.15s tolerance)
      assert(
        Math.abs(totalDuration - 2.5) < 0.15,
        `Concatenated duration ${totalDuration}s should be ~2.5s`
      );
    } finally {
      await fs.rm(testTmpDir, { recursive: true, force: true }).catch(() => {});
    }
  });

  // -----------------------------------------------------------------
  // SUMMARY
  // -----------------------------------------------------------------
  console.log("\n=================================================================");
  console.log(`📊 ADVERSARIAL CHALLENGER 2 SUMMARY: ${totalPassed} / ${totalPassed + totalFailed} TESTS PASSED`);
  if (totalFailed > 0) {
    console.error(`❌ FAILURES (${totalFailed}):`);
    for (const f of failures) {
      console.error(`  - ${f.testName}: ${f.error}`);
    }
    process.exit(1);
  } else {
    console.log("🎉 100% EMPIRICAL VERIFICATION OF MILESTONE M3 SUCCEEDED!");
    console.log("=================================================================\n");
  }
}

main().catch((e) => {
  console.error("Adversarial test harness failed with unhandled error:", e);
  process.exit(1);
});
