import { createServerFn } from "@tanstack/react-start";
import { synthesizeHadithNarration } from "./tts.functions";

export const buildCarouselVideo = createServerFn({ method: "POST" })
  .validator((input: { slides: { imageBase64: string; text: string }[]; title: string }) => input)
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

      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        
        const imageBuffer = Buffer.from(slide.imageBase64.split(",")[1], "base64");
        const imagePath = path.join(tmpDir, `slide_${i}.png`);
        await fs.writeFile(imagePath, imageBuffer);

        let audioDurationSecs = 3;
        const audioPath = path.join(tmpDir, `audio_${i}.mp3`);
        
        if (slide.text && slide.text.trim().length > 0) {
          try {
            const narr = await synthesizeHadithNarration({ data: { text: slide.text } });
            const audioBuffer = Buffer.from(narr.base64, "base64");
            await fs.writeFile(audioPath, audioBuffer);
            
            try {
              const { stdout } = await execAsync(`ffprobe -i "${audioPath}" -show_entries format=duration -v quiet -of csv="p=0"`);
              const dur = parseFloat(stdout.trim());
              if (!isNaN(dur) && dur > 0) {
                audioDurationSecs = dur;
              }
            } catch (e) {
              console.warn("Failed to get duration, using fallback 5s", e);
              audioDurationSecs = 5;
            }
          } catch (e) {
            console.warn("TTS failed for slide", i, e);
            await execAsync(`ffmpeg -f lavfi -i anullsrc=r=44100:cl=stereo -t 3 -q:a 9 -acodec libmp3lame "${audioPath}"`);
          }
        } else {
          await execAsync(`ffmpeg -f lavfi -i anullsrc=r=44100:cl=stereo -t 3 -q:a 9 -acodec libmp3lame "${audioPath}"`);
        }

        // Add 0.5s padding
        audioDurationSecs += 0.5;

        const slideVideoPath = path.join(tmpDir, `vid_${i}.mp4`);
        await execAsync(`ffmpeg -loop 1 -i "${imagePath}" -i "${audioPath}" -c:v libx264 -tune stillimage -c:a aac -b:a 192k -pix_fmt yuv420p -t ${audioDurationSecs} "${slideVideoPath}"`);

        inputsListContent += `file 'vid_${i}.mp4'\n`;
      }

      await fs.writeFile(inputsListPath, inputsListContent);

      const finalVideoName = `${jobId}.mp4`;
      
      const primaryDir = path.join(os.homedir(), ".islamicreels_jobs");
      await fs.mkdir(primaryDir, { recursive: true });
      const finalVideoPath = path.join(primaryDir, finalVideoName);

      await execAsync(`ffmpeg -f concat -safe 0 -i "${inputsListPath}" -c copy "${finalVideoPath}"`);

      try {
        await fs.rm(tmpDir, { recursive: true, force: true });
      } catch (e) {
        console.warn("Failed to clean up tmp dir", e);
      }

      return { success: true, jobId, title };

    } catch (e: any) {
      console.error("Carousel video build failed:", e);
      throw new Error("Грешка: " + e.message);
    }
  });
