import { createServerFn } from "@tanstack/react-start";
import type { Buffer } from "node:buffer";

// Polyfill __dirname and __filename for bundled CommonJS modules in ESM environments
try {
  if (typeof globalThis !== "undefined" && !(globalThis as any).__dirname) {
    (globalThis as any).__dirname = process.cwd();
    (globalThis as any).__filename = process.cwd() + "/index.mjs";
  }
} catch { /* ignore */ }

export const runServerRender = createServerFn({ method: "POST" })
  .validator((opts: any) => opts)
  .handler(async ({ data }) => {
    const fs = (await import("fs")).promises;
    const os = await import("os");
    const path = await import("path");
    const BufferMod = (await import("node:buffer")).Buffer;
    
    const ffmpegMod = await import("fluent-ffmpeg");
    const ffmpeg = ffmpegMod.default || ffmpegMod;
    let ffmpegPath = "/usr/bin/ffmpeg";
    if (process.platform === "win32") {
      try {
        const installerMod = await import("@ffmpeg-installer/ffmpeg");
        const installer = installerMod.default || installerMod;
        if (installer?.path) ffmpegPath = installer.path;
      } catch (e) {
        ffmpegPath = "ffmpeg";
      }
    }
    console.log(`[server-render] Using ffmpeg at: ${ffmpegPath}`);
    ffmpeg.setFfmpegPath(ffmpegPath);

    const sessionId = Date.now().toString() + Math.floor(Math.random() * 10000);
    const tempDir = os.tmpdir();
    const bgPath = path.join(tempDir, `bg_${sessionId}`); // extension added later
    const audioPath = path.join(tempDir, `audio_${sessionId}.mp3`);
    const assPath = path.join(tempDir, `subs_${sessionId}.ass`);
    const outPath = path.join(tempDir, `out_${sessionId}.mp4`);

    try {
      console.log("[server-render] Starting pure FFmpeg render...");

      // 1. Download/Save Audio
      if (data.audioUrl) {
        if (data.audioUrl.startsWith("data:")) {
          const b64 = data.audioUrl.split(",")[1];
          await fs.writeFile(audioPath, BufferMod.from(b64, "base64"));
        } else {
          const res = await fetch(data.audioUrl, {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
          });
          if (!res.ok) throw new Error(`Failed to fetch audio: ${res.status} ${res.statusText}`);
          const arrayBuf = await res.arrayBuffer();
          await fs.writeFile(audioPath, BufferMod.from(arrayBuf));
        }
      } else {
        throw new Error("No audioUrl provided");
      }

      let audioDur = 15;
      try {
        const mp3Duration = (await import("mp3-duration")).default;
        const audioBuf = await fs.readFile(audioPath);
        audioDur = await mp3Duration(audioBuf);
        console.log(`[server-render] Exact audio duration: ${audioDur} seconds`);
      } catch (err) {
        console.warn("[server-render] Could not get exact MP3 duration, falling back to 20s", err);
        audioDur = 20;
      }

      // 2. Download/Save Background
      let isVideoBg = false;
      let finalBgPath = bgPath;
      const bgUrl = data.backgroundVideoUrl || data.backgroundUrl;
      if (!bgUrl) throw new Error("No background provided");

      if (bgUrl.startsWith("data:")) {
        const b64 = bgUrl.split(",")[1];
        const mime = bgUrl.split(";")[0].split(":")[1];
        if (mime.includes("video")) {
          isVideoBg = true;
          finalBgPath += ".mp4";
        } else {
          finalBgPath += ".jpg";
        }
        await fs.writeFile(finalBgPath, BufferMod.from(b64, "base64"));
      } else {
        const res = await fetch(bgUrl, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
        });
        if (!res.ok) throw new Error(`Failed to fetch background video: ${res.status} ${res.statusText}`);
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("video") || bgUrl.includes(".mp4")) {
          isVideoBg = true;
          finalBgPath += ".mp4";
        } else {
          finalBgPath += ".jpg";
        }
        const arrayBuf = await res.arrayBuffer();
        await fs.writeFile(finalBgPath, BufferMod.from(arrayBuf));
      }

      // 3. Generate ASS Subtitles
      const formatTime = (secs: number) => {
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = Math.floor(secs % 60);
        const cs = Math.floor((secs % 1) * 100);
        return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`;
      };

      const isLowerThird = data.style === "lower-third";
      const bulgarianAlign = isLowerThird ? 2 : 5;
      const bulgarianMarginV = isLowerThird ? 300 : 0;

      let ass = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Arabic,Scheherazade New,100,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,3,0,8,50,50,300,1
Style: Bulgarian,Inter,80,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,5,2,${bulgarianAlign},180,180,${bulgarianMarginV},1
Style: Reference,Inter,46,&H005DC9F4,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,3,1,8,50,50,280,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

      if (data.reference) {
        ass += `Dialogue: 0,0:00:00.00,${formatTime(audioDur)},Reference,,0,0,0,,{\\an8\\pos(540,280)}${data.reference}\n`;
      }

      // Arabic is intentionally omitted from video output so the Bulgarian text fits nicely without clutter.

      if (data.bulgarian) {
        const words = data.bulgarian.trim().split(/\s+/).filter(Boolean);
        let timings = data.bulgarianWordTimings;
        if (!timings || !timings.length) {
          timings = [];
          const segs = data.wordSegments;
          if (Array.isArray(segs) && segs.length > 0) {
            const scale = 1; // DO NOT scale exact reciter segment timestamps
            const costs = words.map(w => 1 + w.replace(/[^\p{L}\p{N}]/gu, "").length * 0.55);
            const cumCost = [0];
            for (let i = 0; i < costs.length; i++) cumCost.push(cumCost[i] + costs[i]);
            const totalCost = cumCost[cumCost.length - 1] || 1;

            // Build cumulative acoustic timeline of the reciter's voice
            // Instead of counting indices (1, 2, 3...), we sum the actual acoustic duration of each segment!
            const segDurs = segs.map(s => Math.max(0.1, (s.end - s.start) * scale));
            const cumAudio = [0];
            for (let i = 0; i < segDurs.length; i++) cumAudio.push(cumAudio[i] + segDurs[i]);
            const totalAudio = cumAudio[cumAudio.length - 1] || audioDur;

            for (let i = 0; i < words.length; i++) {
              const fracS = cumCost[i] / totalCost;
              const fracE = cumCost[i + 1] / totalCost;
              const targetAudioS = fracS * totalAudio;
              const targetAudioE = fracE * totalAudio;

              let sIdx = 0;
              while (sIdx < segs.length - 1 && cumAudio[sIdx + 1] < targetAudioS) sIdx++;
              const remAudioS = (targetAudioS - cumAudio[sIdx]) / segDurs[sIdx];
              const start = (segs[sIdx].start + remAudioS * (segs[sIdx].end - segs[sIdx].start)) * scale;

              let eIdx = 0;
              while (eIdx < segs.length - 1 && cumAudio[eIdx + 1] < targetAudioE) eIdx++;
              const remAudioE = (targetAudioE - cumAudio[eIdx]) / segDurs[eIdx];
              const end = (segs[eIdx].start + remAudioE * (segs[eIdx].end - segs[eIdx].start)) * scale;

              timings.push({ start, end });
            }
          } else {
            const step = audioDur / Math.max(1, words.length);
            for (let i = 0; i < words.length; i++) {
              timings.push({ start: i * step, end: (i + 1) * step });
            }
          }
        }

        // Group words into short TikTok-style phrases (2 to 6 words per phrase, breaking on punctuation)
        const MAX_WORDS = 6;
        const MIN_WORDS = 2;
        type Phrase = { words: string[]; startIdx: number; endIdx: number };
        const phrases: Phrase[] = [];
        let cur: string[] = [];
        let curStart = 0;
        const flush = () => {
          if (!cur.length) return;
          phrases.push({ words: cur, startIdx: curStart, endIdx: curStart + cur.length });
          curStart += cur.length;
          cur = [];
        };
        for (let i = 0; i < words.length; i++) {
          const w = words[i];
          cur.push(w);
          const endsPunct = /[.!?…]$/.test(w) || (/[,;:—]$/.test(w) && cur.length >= MIN_WORDS);
          if ((endsPunct && cur.length >= MIN_WORDS) || cur.length >= MAX_WORDS) {
            flush();
          }
        }
        flush();

        // CapCut pro subtitle style: Smooth zoom pop-in from 85% to 100% scale over 180ms + fade-in
        const animTag = "\\fscx85\\fscy85\\t(0,180,\\fscx100\\fscy100)\\fad(150,120)";
        const styleTag = isLowerThird
          ? `{\\an2\\pos(540,1600)${animTag}}`
          : `{\\an5\\pos(540,960)${animTag}}`;

        let prevEnd = 0;
        for (let idx = 0; idx < phrases.length; idx++) {
          const p = phrases[idx];
          const start = timings[p.startIdx]?.start ?? prevEnd;
          const end = timings[p.endIdx - 1]?.end ?? (start + 2);

          const textLine = p.words.join(" ");
          ass += `Dialogue: 0,${formatTime(start)},${formatTime(end)},Bulgarian,,0,0,0,,${styleTag}${textLine}\n`;
          prevEnd = end;
        }
        const lastPhrase = phrases[phrases.length - 1];
        if (lastPhrase) {
          ass += `Dialogue: 0,${formatTime(prevEnd)},0:10:00.00,Bulgarian,,0,0,0,,${styleTag}${lastPhrase.words.join(" ")}\n`;
        }
      }

      await fs.writeFile(assPath, "\uFEFF" + ass); // UTF-8 BOM helps some parsers

      // Escape ASS path for FFmpeg filter on Windows
      const escapedAssPath = assPath.replace(/\\/g, '/').replace(/:/g, '\\:');

      // 4. Run FFmpeg
      console.log(`[server-render] Generating MP4 with FFmpeg...`);
      return new Promise<string>((resolve, reject) => {
        let cmd = ffmpeg();
        
        if (isVideoBg) {
          cmd = cmd.input(finalBgPath).inputOptions(["-stream_loop -1"]);
        } else {
          cmd = cmd.input(finalBgPath).inputOptions(["-loop 1"]);
        }
        
        cmd = cmd.input(audioPath);

        const width = data.quality === "1080p" ? 1080 : 720;
        const height = data.quality === "1080p" ? 1920 : 1280;

        cmd.complexFilter([
          `[0:v]crop='min(iw,ih*9/16)':'min(iw*16/9,ih)',scale=${width}:${height},drawbox=x=0:y=0:w=${width}:h=${height}:color=black@0.15:t=fill,subtitles='${escapedAssPath}'[v]`
        ])
        .outputOptions([
          "-map [v]",
          "-map 1:a",
          "-c:v libx264",
          "-profile:v main",
          "-level 4.0",
          "-pix_fmt yuv420p",
          "-movflags +faststart",
          "-preset ultrafast",
          "-crf 28",
          "-r 30",
          "-vsync 1",
          "-g 60",
          "-c:a aac",
          "-b:a 128k",
          "-ar 44100",
          `-t ${audioDur}`,
          "-threads 0"
        ])
        .outputFormat("mp4")
        .save(outPath)
        .on("end", async () => {
          try {
            const stat = await fs.stat(outPath);
            console.log(`[server-render] FFmpeg finished successfully. MP4 size: ${stat.size} bytes`);
            const buf = await fs.readFile(outPath);
            resolve(buf.toString("base64"));
          } catch (e) {
            reject(e);
          } finally {
            // Cleanup
            await fs.unlink(finalBgPath).catch(() => {});
            await fs.unlink(audioPath).catch(() => {});
            await fs.unlink(assPath).catch(() => {});
            await fs.unlink(outPath).catch(() => {});
          }
        })
        .on("error", async (err) => {
          console.error("[server-render] FFmpeg Error:", err);
          // Cleanup
          await fs.unlink(finalBgPath).catch(() => {});
          await fs.unlink(audioPath).catch(() => {});
          await fs.unlink(assPath).catch(() => {});
          await fs.unlink(outPath).catch(() => {});
          reject(err);
        });
      });

    } catch (err: unknown) {
      console.error("[server-render] Critical failure:", err);
      throw new Error(String(err));
    }
  });
