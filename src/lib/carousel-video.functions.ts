import { createServerFn } from "@tanstack/react-start";
import { synthesizeHadithNarration } from "./tts.functions";
import {
  getLocalHalalVideoFallback,
  ensureFallbackVideoExists,
} from "./backgrounds.functions";

export interface BuildCarouselVideoInput {
  slides: {
    overlayBase64?: string; // Transparent PNG with text & scrim
    imageBase64?: string;   // For backwards compatibility
    videoUrl?: string;     // Context-aware moving video background
    text: string;          // Slide text for TTS voiceover narration
  }[];
  title: string;
}

export const buildCarouselVideo = createServerFn({ method: "POST" })
  .validator((input: BuildCarouselVideoInput) => input)
  .handler(async ({ data: { slides, title } }) => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const os = await import("os");
    const { exec } = await import("child_process");
    const { promisify } = await import("util");
    const execAsync = promisify(exec);

    const jobId = Math.random().toString(36).substring(2, 15);
    const tmpDir = path.join(os.tmpdir(), `carousel_video_${jobId}`);
    await fs.mkdir(tmpDir, { recursive: true });

    try {
      const inputsListPath = path.join(tmpDir, "inputs.txt");
      let inputsListContent = "";
      let totalDurationSecs = 0;

      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];

        // 1. Accept either overlayBase64 or imageBase64; write PNG overlay to slide_${i}.png
        const rawBase64 = slide.overlayBase64 || slide.imageBase64 || "";
        const base64Data = rawBase64.includes(",") ? rawBase64.split(",")[1] : rawBase64;
        const imageBuffer = Buffer.from(base64Data, "base64");
        const overlayPath = path.join(tmpDir, `slide_${i}.png`);
        await fs.writeFile(overlayPath, imageBuffer);

        // 2. TTS Voiceover Audio synthesis & duration extraction
        let audioDurationSecs = 3.0;
        const audioPath = path.join(tmpDir, `audio_${i}.mp3`);

        if (slide.text && slide.text.trim().length > 0) {
          try {
            const narr = await synthesizeHadithNarration({ data: { text: slide.text } });
            const audioBuffer = Buffer.from(narr.base64, "base64");
            await fs.writeFile(audioPath, audioBuffer);

            try {
              const { stdout } = await execAsync(
                `ffprobe -i "${audioPath}" -show_entries format=duration -v quiet -of csv="p=0"`
              );
              const dur = parseFloat(stdout.trim());
              if (!isNaN(dur) && dur >= 0.5) {
                audioDurationSecs = dur;
              } else {
                audioDurationSecs = 3.0;
              }
            } catch (probeErr) {
              console.warn("Failed to get duration via ffprobe, using fallback 3s", probeErr);
              audioDurationSecs = 3.0;
            }
          } catch (ttsErr) {
            console.warn("TTS failed for slide", i, ttsErr);
            await execAsync(
              `ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=stereo -t 3 -q:a 9 -acodec libmp3lame "${audioPath}"`
            );
            audioDurationSecs = 3.0;
          }
        } else {
          await execAsync(
            `ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=stereo -t 3 -q:a 9 -acodec libmp3lame "${audioPath}"`
          );
          audioDurationSecs = 3.0;
        }

        // Add 0.5s padding
        audioDurationSecs += 0.5;
        totalDurationSecs += audioDurationSecs;

        // 3. Moving video background or image loop fallback
        const slideVideoPath = path.join(tmpDir, `vid_${i}.mp4`);
        let hasVideoBg = false;
        const bgPath = path.join(tmpDir, `bg_${i}.mp4`);

        if (slide.videoUrl && typeof slide.videoUrl === "string" && slide.videoUrl.trim().length > 0) {
          const vUrl = slide.videoUrl.trim();
          if (vUrl.startsWith("http://") || vUrl.startsWith("https://")) {
            try {
              const controller = new AbortController();
              const timeout = setTimeout(() => controller.abort(), 12000);
              const res = await fetch(vUrl, { signal: controller.signal });
              clearTimeout(timeout);
              if (res.ok) {
                const buf = Buffer.from(await res.arrayBuffer());
                if (buf.length > 5000) {
                  await fs.writeFile(bgPath, buf);
                  hasVideoBg = true;
                }
              }
            } catch (fetchErr) {
              console.warn(`Failed to fetch remote videoUrl for slide ${i}:`, fetchErr);
            }
          } else {
            // Local or relative path
            try {
              const resolved = path.isAbsolute(vUrl) ? vUrl : path.resolve(process.cwd(), vUrl);
              const stat = await fs.stat(resolved).catch(() => null);
              if (stat && stat.size > 5000) {
                await fs.copyFile(resolved, bgPath);
                hasVideoBg = true;
              }
            } catch (resolveErr) {
              console.warn(`Failed to resolve local videoUrl for slide ${i}:`, resolveErr);
            }
          }

          // If fetching/resolving fails, fallback gracefully to getLocalHalalVideoFallback(i)
          if (!hasVideoBg) {
            try {
              const fallbackAsset = getLocalHalalVideoFallback(i);
              const fallbackFilePath = await ensureFallbackVideoExists(fallbackAsset);
              const stat = await fs.stat(fallbackFilePath).catch(() => null);
              if (stat && stat.size > 5000) {
                await fs.copyFile(fallbackFilePath, bgPath);
                hasVideoBg = true;
              }
            } catch (fallbackErr) {
              console.warn(`Fallback video ensure failed for slide ${i}:`, fallbackErr);
            }
          }
        }

        if (hasVideoBg) {
          try {
            await execAsync(
              `ffmpeg -y -stream_loop -1 -i "${bgPath}" -i "${overlayPath}" -i "${audioPath}" ` +
              `-filter_complex "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1[bg];[bg][1:v]overlay=0:0[v]" ` +
              `-map "[v]" -map 2:a -c:v libx264 -preset veryfast -pix_fmt yuv420p -c:a aac -b:a 192k ` +
              `-t ${audioDurationSecs} "${slideVideoPath}"`
            );
          } catch (ffmpegVideoErr) {
            console.warn(
              `FFmpeg video compositing failed for slide ${i}, falling back to image loop:`,
              ffmpegVideoErr
            );
            await execAsync(
              `ffmpeg -y -loop 1 -i "${overlayPath}" -i "${audioPath}" ` +
              `-c:v libx264 -tune stillimage -c:a aac -b:a 192k -pix_fmt yuv420p ` +
              `-t ${audioDurationSecs} "${slideVideoPath}"`
            );
          }
        } else {
          // If slide.videoUrl is absent, support image loop fallback with -loop 1 -i "${overlayPath}" -i "${audioPath}" -c:v libx264 -tune stillimage ...
          await execAsync(
            `ffmpeg -y -loop 1 -i "${overlayPath}" -i "${audioPath}" ` +
            `-c:v libx264 -tune stillimage -c:a aac -b:a 192k -pix_fmt yuv420p ` +
            `-t ${audioDurationSecs} "${slideVideoPath}"`
          );
        }

        inputsListContent += `file 'vid_${i}.mp4'\n`;
      }

      await fs.writeFile(inputsListPath, inputsListContent);

      const primaryDir = path.join(os.homedir(), ".islamicreels_jobs");
      await fs.mkdir(primaryDir, { recursive: true });

      const finalVideoPath = path.join(primaryDir, `${jobId}.mp4`);
      await execAsync(`ffmpeg -y -f concat -safe 0 -i "${inputsListPath}" -c copy "${finalVideoPath}"`);

      try {
        await fs.rm(tmpDir, { recursive: true, force: true });
      } catch (e) {
        console.warn("Failed to clean up tmp dir", e);
      }

      const cleanTitleSafe =
        (title || "Ислямски_Карусел").replace(/[<>:"/\\|?*]+/g, "_").trim() || "Ислямски_Карусел";
      const finalVideoName = `${cleanTitleSafe}.mp4`;

      return {
        success: true,
        jobId,
        title,
        downloadUrl: `/api/download/${jobId}?filename=${encodeURIComponent(finalVideoName)}`,
        duration: Number(totalDurationSecs.toFixed(2)),
      };
    } catch (e: any) {
      console.error("Carousel video build failed:", e);
      throw new Error("Грешка: " + e.message);
    }
  });
