/**
 * Adversarial Stress Test Suite: Milestone M3
 * Focus: FFmpeg looping video compositing, exact 1080x1920 portrait dimensions,
 * 0% audio leakage (Salafi principle), and fallback mechanisms.
 */

import fs from "fs/promises";
import path from "path";
import os from "os";
import { exec } from "child_process";
import { promisify } from "util";
import sharp from "sharp";
import { buildCarouselVideo } from "../carousel-video.functions";

const execAsync = promisify(exec);

async function runAdversarialM3Tests() {
  console.log("\n============================================================");
  console.log("🔥 STARTING ADVERSARIAL STRESS TEST SUITE: MILESTONE M3");
  console.log("============================================================");

  const tmpDir = path.join(os.tmpdir(), `adversarial_m3_${Date.now()}`);
  await fs.mkdir(tmpDir, { recursive: true });

  let passed = 0;
  let failed = 0;

  async function challenge(name: string, fn: () => Promise<void>) {
    try {
      console.log(`\nTesting: ${name}...`);
      await fn();
      console.log(`  ✔ [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ✖ [FAIL] ${name}\n    Error: ${err.message}\n    Stack: ${err.stack}`);
      failed++;
    }
  }

  try {
    // ------------------------------------------------------------------------
    // CHALLENGE 1: 0% Native Background Video Audio Leakage (Strict Salafi principle)
    // ------------------------------------------------------------------------
    await challenge("Adversarial Audio Isolation: Native background video audio is 100% stripped (-map 2:a)", async () => {
      // Step 1: Create background video with an obnoxiously loud 1000Hz test tone
      const bgVideoPath = path.join(tmpDir, "bg_loud_tone.mp4");
      await execAsync(
        `ffmpeg -y -f lavfi -i testsrc=size=1080x1920:rate=30 -f lavfi -i sine=frequency=1000:duration=2 -c:v libx264 -c:a aac -shortest "${bgVideoPath}"`
      );

      // Verify bg video actually has the 1000Hz audio
      const probeBg = await execAsync(`ffprobe -v error -select_streams a:0 -show_entries stream=codec_name -of default=noprint_wrappers=1:nokey=1 "${bgVideoPath}"`);
      if (!probeBg.stdout.trim().includes("aac")) {
        throw new Error("Failed to create bg video with audio");
      }

      // Step 2: Create TTS voiceover audio with a distinct 300Hz tone
      const ttsAudioPath = path.join(tmpDir, "tts_300hz.mp3");
      await execAsync(
        `ffmpeg -y -f lavfi -i sine=frequency=300:duration=3.0 -c:a libmp3lame "${ttsAudioPath}"`
      );

      // Step 3: Create transparent PNG overlay
      const overlayPngPath = path.join(tmpDir, "overlay1.png");
      const pngBuf = await sharp({
        create: { width: 1080, height: 1920, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0.5 } }
      }).png().toBuffer();
      await fs.writeFile(overlayPngPath, pngBuf);

      // Step 4: Execute the exact compositing command used in carousel-video.functions.ts
      const outputSlidePath = path.join(tmpDir, "slide_audio_test.mp4");
      await execAsync(
        `ffmpeg -y -stream_loop -1 -i "${bgVideoPath}" -i "${overlayPngPath}" -i "${ttsAudioPath}" ` +
        `-filter_complex "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1[bg];[bg][1:v]overlay=0:0[v]" ` +
        `-map "[v]" -map 2:a -c:v libx264 -preset veryfast -pix_fmt yuv420p -c:a aac -b:a 192k ` +
        `-t 3.5 "${outputSlidePath}"`
      );

      // Step 5: Probe output streams
      const probeOutput = await execAsync(`ffprobe -v error -show_entries stream=index,codec_type,codec_name -of json "${outputSlidePath}"`);
      const streams = JSON.parse(probeOutput.stdout).streams;
      if (streams.filter((s: any) => s.codec_type === "audio").length !== 1) {
        throw new Error(`Output video must contain exactly 1 audio stream, found: ${streams.filter((s: any) => s.codec_type === "audio").length}`);
      }

      // Step 6: Perform frequency analysis on the output audio to verify 0% 1000Hz leakage
      const leakageCheck = await execAsync(
        `ffmpeg -i "${outputSlidePath}" -af "bandpass=f=1000:width_type=h:w=50,volumedetect" -f null -`,
        { maxBuffer: 10 * 1024 * 1024 }
      );
      const stderr = leakageCheck.stderr;
      const maxVolMatch = stderr.match(/max_volume:\s*(-?[\d.]+)\s*dB/);
      const maxVol = maxVolMatch ? parseFloat(maxVolMatch[1]) : 0;

      console.log(`    -> Residual energy at 1000Hz (native audio): ${maxVol} dB`);
      if (maxVol > -40) {
        throw new Error(`Audio leakage detected! 1000Hz background energy is ${maxVol} dB (should be < -40dB or -inf)`);
      }
    });

    // ------------------------------------------------------------------------
    // CHALLENGE 2: -stream_loop -1 Smooth Video Looping Without Freeze
    // ------------------------------------------------------------------------
    await challenge("Loop Continuity: -stream_loop -1 loops 0.6s video into 3.0s without frame freeze", async () => {
      const shortVideoPath = path.join(tmpDir, "short_counter.mp4");
      await execAsync(
        `ffmpeg -y -f lavfi -i testsrc=size=1080x1920:rate=30 -t 0.6 -c:v libx264 -preset ultrafast "${shortVideoPath}"`
      );

      const overlayPngPath = path.join(tmpDir, "overlay_blank.png");
      const pngBuf = await sharp({
        create: { width: 1080, height: 1920, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
      }).png().toBuffer();
      await fs.writeFile(overlayPngPath, pngBuf);

      const silenceAudioPath = path.join(tmpDir, "silence.mp3");
      await execAsync(`ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=stereo -t 3.0 -c:a libmp3lame "${silenceAudioPath}"`);

      const loopedVideoPath = path.join(tmpDir, "looped_3s.mp4");
      await execAsync(
        `ffmpeg -y -stream_loop -1 -i "${shortVideoPath}" -i "${overlayPngPath}" -i "${silenceAudioPath}" ` +
        `-filter_complex "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1[bg];[bg][1:v]overlay=0:0[v]" ` +
        `-map "[v]" -map 2:a -c:v libx264 -preset veryfast -pix_fmt yuv420p -c:a aac -b:a 192k ` +
        `-t 3.0 "${loopedVideoPath}"`
      );

      const probeData = await execAsync(
        `ffprobe -v error -select_streams v:0 -count_frames -show_entries stream=nb_read_frames,duration,width,height,sample_aspect_ratio -of json "${loopedVideoPath}"`
      );
      const json = JSON.parse(probeData.stdout);
      const frames = parseInt(json.streams[0].nb_read_frames, 10);
      const dur = parseFloat(json.streams[0].duration);
      const w = json.streams[0].width;
      const h = json.streams[0].height;
      const sar = json.streams[0].sample_aspect_ratio;

      console.log(`    -> Looped Video: ${w}x${h}, SAR: ${sar}, Duration: ${dur}s, Total Frames: ${frames}`);
      if (w !== 1080 || h !== 1920) {
        throw new Error(`Dimensions must be 1080x1920, got ${w}x${h}`);
      }
      if (sar !== "1:1") {
        throw new Error(`Sample aspect ratio must be 1:1, got ${sar}`);
      }
      if (frames < 85 || frames > 95) {
        throw new Error(`Expected ~90 frames across 5 loops, got ${frames}`);
      }
    });

    // ------------------------------------------------------------------------
    // CHALLENGE 3: Non-standard Video Aspect Ratios (16:9 Landscape, 1:1 Square, 4:3)
    // ------------------------------------------------------------------------
    await challenge("Portrait Invariance: Landscape 16:9 and Square 1:1 scale/crop to exact 1080x1920 setsar=1", async () => {
      const inputs = [
        { name: "landscape_16_9", w: 1920, h: 1080 },
        { name: "square_1_1", w: 720, h: 720 },
        { name: "tv_4_3", w: 1440, h: 1080 },
      ];

      const overlayPngPath = path.join(tmpDir, "overlay_blank.png");
      const silenceAudioPath = path.join(tmpDir, "silence.mp3");

      for (const input of inputs) {
        const inPath = path.join(tmpDir, `${input.name}.mp4`);
        await execAsync(
          `ffmpeg -y -f lavfi -i testsrc=size=${input.w}x${input.h}:rate=30 -t 1 -c:v libx264 -preset ultrafast "${inPath}"`
        );

        const outPath = path.join(tmpDir, `${input.name}_out.mp4`);
        await execAsync(
          `ffmpeg -y -stream_loop -1 -i "${inPath}" -i "${overlayPngPath}" -i "${silenceAudioPath}" ` +
          `-filter_complex "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1[bg];[bg][1:v]overlay=0:0[v]" ` +
          `-map "[v]" -map 2:a -c:v libx264 -preset ultrafast -pix_fmt yuv420p -c:a aac -b:a 192k ` +
          `-t 1.0 "${outPath}"`
        );

        const probe = await execAsync(
          `ffprobe -v error -select_streams v:0 -show_entries stream=width,height,sample_aspect_ratio,display_aspect_ratio -of json "${outPath}"`
        );
        const s = JSON.parse(probe.stdout).streams[0];
        console.log(`    -> [${input.name}] -> Out: ${s.width}x${s.height}, SAR: ${s.sample_aspect_ratio}, DAR: ${s.display_aspect_ratio}`);
        if (s.width !== 1080 || s.height !== 1920) {
          throw new Error(`${input.name} did not produce 1080x1920 (got ${s.width}x${s.height})`);
        }
        if (s.sample_aspect_ratio !== "1:1") {
          throw new Error(`${input.name} SAR is not 1:1 (got ${s.sample_aspect_ratio})`);
        }
      }
    });

    // ------------------------------------------------------------------------
    // CHALLENGE 4: RGBA PNG Overlay Transparency & Alpha Preservation at (0,0)
    // ------------------------------------------------------------------------
    await challenge("Alpha Blending: RGBA PNG overlay at (0,0) composites transparent channel without black clipping", async () => {
      const greenBgPath = path.join(tmpDir, "green_bg.mp4");
      // Use color=0x00FF00 for pure saturated lime green (G=255)
      await execAsync(
        `ffmpeg -y -f lavfi -i color=c=0x00FF00:size=1080x1920:rate=30 -t 1 -c:v libx264 -preset ultrafast "${greenBgPath}"`
      );

      const testOverlayPng = path.join(tmpDir, "half_overlay.png");
      const halfSvg = `
        <svg width="1080" height="1920" xmlns="http://www.w3.org/2000/svg">
          <!-- Top half transparent -->
          <!-- Bottom half solid red -->
          <rect y="960" width="1080" height="960" fill="rgba(255, 0, 0, 1.0)"/>
        </svg>
      `;
      const svgBuf = await sharp(Buffer.from(halfSvg)).png().toBuffer();
      await fs.writeFile(testOverlayPng, svgBuf);

      const silenceAudioPath = path.join(tmpDir, "silence.mp3");
      const compositeOut = path.join(tmpDir, "alpha_test.mp4");

      await execAsync(
        `ffmpeg -y -stream_loop -1 -i "${greenBgPath}" -i "${testOverlayPng}" -i "${silenceAudioPath}" ` +
        `-filter_complex "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1[bg];[bg][1:v]overlay=0:0[v]" ` +
        `-map "[v]" -map 2:a -c:v libx264 -preset ultrafast -pix_fmt yuv420p -c:a aac -b:a 192k ` +
        `-t 1.0 "${compositeOut}"`
      );

      const extractedFrame = path.join(tmpDir, "extracted_frame.png");
      await execAsync(`ffmpeg -y -i "${compositeOut}" -vframes 1 "${extractedFrame}"`);

      const { data, info } = await sharp(extractedFrame).raw().toBuffer({ resolveWithObject: true });
      // Sample pixel in top half (x=540, y=400) -> should be green (R < 30, G > 120, B < 30)
      const topPixelOffset = (400 * info.width + 540) * info.channels;
      const topR = data[topPixelOffset];
      const topG = data[topPixelOffset + 1];
      const topB = data[topPixelOffset + 2];

      // Sample pixel in bottom half (x=540, y=1400) -> should be red (R > 180, G < 50, B < 50)
      const bottomPixelOffset = (1400 * info.width + 540) * info.channels;
      const bottomR = data[bottomPixelOffset];
      const bottomG = data[bottomPixelOffset + 1];
      const bottomB = data[bottomPixelOffset + 2];

      console.log(`    -> Top Pixel (transparent area): R=${topR}, G=${topG}, B=${topB} (Expected Green)`);
      console.log(`    -> Bottom Pixel (overlay area): R=${bottomR}, G=${bottomG}, B=${bottomB} (Expected Red)`);

      if (topG < 120 || topR > 50) {
        throw new Error(`Transparent area was not green! Got R=${topR}, G=${topG}, B=${topB}`);
      }
      if (bottomR < 180 || bottomG > 50) {
        throw new Error(`Overlay area was not red! Got R=${bottomR}, G=${bottomG}, B=${bottomB}`);
      }
    });

    // ------------------------------------------------------------------------
    // CHALLENGE 5: buildCarouselVideo End-to-End Execution with All Edge Cases
    // ------------------------------------------------------------------------
    await challenge("buildCarouselVideo Handler: multi-slide mix of videoUrl, missing videoUrl, invalid videoUrl, and empty text", async () => {
      const localValidVideo = path.join(tmpDir, "local_nature.mp4");
      await execAsync(`ffmpeg -y -f lavfi -i testsrc=size=1080x1920:rate=30 -t 1 -c:v libx264 -preset ultrafast "${localValidVideo}"`);

      const blankOverlayPng = await sharp({
        create: { width: 1080, height: 1920, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0.3 } }
      }).png().toBuffer();
      const base64Overlay = `data:image/png;base64,${blankOverlayPng.toString("base64")}`;

      const payload = {
        title: "Adversarial Test Reel",
        slides: [
          {
            overlayBase64: base64Overlay,
            videoUrl: localValidVideo,
            text: "Слава на Аллах, Господа на световете.",
          },
          {
            overlayBase64: base64Overlay,
            // videoUrl omitted -> should trigger image loop fallback
            text: "Търпението е ключ към успеха.",
          },
          {
            overlayBase64: base64Overlay,
            videoUrl: "https://invalid-host-that-does-not-exist-9988.com/fake.mp4", // unreachable -> should fallback to getLocalHalalVideoFallback
            text: "Милостта на Аллах обхваща всяко нещо.",
          },
          {
            overlayBase64: base64Overlay,
            videoUrl: localValidVideo,
            text: "   ", // empty text -> should trigger silent audio fallback
          },
        ],
      };

      console.log("    Executing buildCarouselVideo inside storage context...");
      const storage = (globalThis as any)[Symbol.for("tanstack-start:start-storage-context")];
      const mockContext = {
        contextAfterGlobalMiddlewares: {},
        request: new Request("http://localhost:8080/api"),
      };

      const primaryDir = path.join(os.homedir(), ".islamicreels_jobs");
      const beforeFiles = new Set(await fs.readdir(primaryDir).catch(() => []));

      if (storage) {
        await storage.run(mockContext, async () => {
          await buildCarouselVideo({ data: payload });
        });
      } else {
        await buildCarouselVideo({ data: payload });
      }

      const afterFiles = await fs.readdir(primaryDir);
      const newFiles = afterFiles.filter((f) => f.endsWith(".mp4") && !beforeFiles.has(f));

      if (newFiles.length === 0) {
        throw new Error("No new .mp4 job file was generated in ~/.islamicreels_jobs");
      }

      const generatedFilePath = path.join(primaryDir, newFiles[0]);
      const stat = await fs.stat(generatedFilePath);
      console.log(`    -> Generated Reel: ${newFiles[0]} (${stat.size} bytes)`);

      if (stat.size < 10000) {
        throw new Error(`Generated file size too small (${stat.size} bytes)`);
      }

      const probeRes = await execAsync(
        `ffprobe -v error -show_entries format=duration -show_streams -of json "${generatedFilePath}"`
      );
      const probeJson = JSON.parse(probeRes.stdout);
      const vStream = probeJson.streams.find((s: any) => s.codec_type === "video");
      const aStream = probeJson.streams.find((s: any) => s.codec_type === "audio");
      const duration = parseFloat(probeJson.format.duration);

      console.log(`    -> Final File: ${stat.size} bytes, Duration: ${duration}s, Video: ${vStream?.width}x${vStream?.height} (SAR ${vStream?.sample_aspect_ratio}, DAR ${vStream?.display_aspect_ratio}), Audio: ${aStream?.codec_name}`);

      if (!vStream || vStream.width !== 1080 || vStream.height !== 1920) {
        throw new Error(`Output video stream must be 1080x1920, got ${vStream?.width}x${vStream?.height}`);
      }
      if (vStream.sample_aspect_ratio !== "1:1") {
        throw new Error(`Output video sample aspect ratio must be 1:1, got ${vStream.sample_aspect_ratio}`);
      }
      if (!aStream || aStream.codec_name !== "aac") {
        throw new Error(`Output audio stream must be AAC, got ${aStream?.codec_name}`);
      }
      if (duration < 8.0) {
        throw new Error(`Expected total duration >= 8s across 4 slides, got ${duration}s`);
      }

      await fs.unlink(generatedFilePath).catch(() => null);
    });

  } finally {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {
      // cleanup
    }
  }

  console.log("\n============================================================");
  console.log(`🎯 ADVERSARIAL STRESS TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log("============================================================\n");

  if (failed > 0) {
    throw new Error(`${failed} adversarial challenge(s) failed!`);
  }
}

runAdversarialM3Tests().catch((err) => {
  console.error("FATAL TEST RUNNER ERROR:", err);
  process.exit(1);
});
