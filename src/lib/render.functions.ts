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
    let ffmpegPath = "ffmpeg";
    try {
      const installerMod = await import("@ffmpeg-installer/ffmpeg");
      const installer = installerMod.default || installerMod;
      if (installer?.path) ffmpegPath = installer.path;
    } catch (e) {
      ffmpegPath = "ffmpeg";
    }
    console.log(`[server-render] Using ffmpeg at: ${ffmpegPath}`);
    ffmpeg.setFfmpegPath(ffmpegPath);

    const tempDir = os.tmpdir();
    // Clean up stale temporary files older than 30 minutes to prevent "No space left on device" errors
    try {
      const now = Date.now();
      const files = await fs.readdir(tempDir);
      for (const f of files) {
        if (/^(bg_|audio_|subs_|out_|quran_slice_)/.test(f)) {
          const fp = path.join(tempDir, f);
          const st = await fs.stat(fp).catch(() => null);
          if (st && now - st.mtimeMs > 30 * 60 * 1000) {
            await fs.unlink(fp).catch(() => {});
          }
        }
      }
    } catch {
      // ignore non-critical cleanup errors
    }

    const sessionId = Date.now().toString() + Math.floor(Math.random() * 10000);
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
        const totalCs = Math.max(0, Math.round(secs * 100));
        const cs = totalCs % 100;
        const totalS = Math.floor(totalCs / 100);
        const s = totalS % 60;
        const totalM = Math.floor(totalS / 60);
        const m = totalM % 60;
        const h = Math.floor(totalM / 60);
        return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`;
      };

      const isLowerThird = data.style === "lower-third";
      // Anchor top-down in the lower half (Alignment 8 = top-center at MarginV = 1150)
      // so when text wraps or grows, lines continue vertically downwards.
      const bulgarianAlign = 8;
      const bulgarianMarginV = 1150;

      let ass = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Arabic,Scheherazade New,100,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,3,0,8,50,50,300,1
Style: Bulgarian,Outfit,120,&H00FFFFFF,&H000000FF,&H00000000,&H66000000,-1,0,0,0,100,100,0,0,1,4.5,0,${bulgarianAlign},100,100,1120,1
Style: Reference,Outfit,46,&H005DC9F4,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,3,1,8,50,50,280,1

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
          const bounds = data.ayahBounds;
          if (Array.isArray(bounds) && bounds.length > 0) {
            // AYAH-BOUNDED ACOUSTIC ANCHORING
            // Distribute Bulgarian words across the Ayahs and strictly bound each word inside its Ayah's exact start and end time.
            const totalEngLen = bounds.reduce((acc: number, b: any) => acc + (b.english ? b.english.length : 10), 0) || 1;
            let wordIdx = 0;
            for (let bIdx = 0; bIdx < bounds.length; bIdx++) {
              const b = bounds[bIdx];
              const isLast = bIdx === bounds.length - 1;
              let ayahWords: string[];
              if (b.bulgarian && typeof b.bulgarian === "string" && b.bulgarian.trim().length > 0) {
                ayahWords = b.bulgarian.split(/\s+/).filter(Boolean);
              } else {
                const ratio = (b.english ? b.english.length : 10) / totalEngLen;
                const count = isLast ? (words.length - wordIdx) : Math.max(1, Math.round(words.length * ratio));
                ayahWords = words.slice(wordIdx, Math.min(words.length, wordIdx + count));
              }
              wordIdx += ayahWords.length;

              const bStart = Number(b.start) || 0;
              const bEnd = Number(b.end) || (bStart + 5);
              const bDur = Math.max(0.5, bEnd - bStart);

              const ayahCosts = ayahWords.map((w: string) => 1 + w.replace(/[^\p{L}\p{N}]/gu, "").length * 0.55);
              const ayahTotalCost = ayahCosts.reduce((sum: number, c: number) => sum + c, 0) || 1;
              let ayahCumCost = 0;

              const interpolateSegTime = (frac: number, segs?: any[]) => {
                if (frac <= 0) return bStart;
                if (frac >= 1) return bEnd;
                if (!Array.isArray(segs) || segs.length === 0) {
                  return bStart + frac * bDur;
                }
                const x = frac * segs.length;
                const k = Math.min(segs.length - 1, Math.floor(x));
                const r = x - k;
                const sStart = Number(segs[k].start) || bStart;
                const sEnd = Number(segs[k].end) || bEnd;
                return sStart + r * (sEnd - sStart);
              };

              for (let w = 0; w < ayahWords.length; w++) {
                const fracS = ayahCumCost / ayahTotalCost;
                ayahCumCost += ayahCosts[w];
                const fracE = ayahCumCost / ayahTotalCost;
                timings.push({
                  start: Math.round(interpolateSegTime(fracS, b.segments) * 1000) / 1000,
                  end: Math.round(interpolateSegTime(fracE, b.segments) * 1000) / 1000
                });
              }
            }
          } else {
            const segs = data.wordSegments;
            if (Array.isArray(segs) && segs.length > 0) {
              const scale = 1;
              const costs = words.map((w: string) => 1 + w.replace(/[^\p{L}\p{N}]/gu, "").length * 0.55);
              const cumCost = [0];
              for (let i = 0; i < costs.length; i++) cumCost.push(cumCost[i] + costs[i]);
              const totalCost = cumCost[cumCost.length - 1] || 1;

              const segDurs = segs.map((s: any) => Math.max(0.1, (s.end - s.start) * scale));
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
        }

        // CapCut pro subtitle style: Smooth zoom pop-in from 85% to 100% scale over 180ms + fade-in
        const animTag = "\\fscx85\\fscy85\\t(0,180,\\fscx100\\fscy100)\\fad(150,120)";
        const styleTag = `{\\an2\\pos(540,1540)${animTag}}`;

        const bounds = data.ayahBounds;
        if (Array.isArray(bounds) && bounds.length > 0) {
          // FULL-AYAH BLOCK SYNCHRONIZER: One complete Ayah per subtitle block from ayah.start to ayah.end
          // No fade between consecutive ayahs — instant swap for crisp transitions
          const instantAnimTag = "\\fscx100\\fscy100\\fad(0,0)";
          const totalEngLen = bounds.reduce((acc: number, b: any) => acc + (b.english ? b.english.length : 10), 0) || 1;
          let wordIdx = 0;
          for (let bIdx = 0; bIdx < bounds.length; bIdx++) {
            const b = bounds[bIdx];
            const isLast = bIdx === bounds.length - 1;
            const isFirst = bIdx === 0;
            let ayahWords: string[];
            if (b.bulgarian && typeof b.bulgarian === "string" && b.bulgarian.trim().length > 0) {
              ayahWords = b.bulgarian.split(/\s+/).filter(Boolean);
            } else {
              const ratio = (b.english ? b.english.length : 10) / totalEngLen;
              const count = isLast ? (words.length - wordIdx) : Math.max(1, Math.round(words.length * ratio));
              ayahWords = words.slice(wordIdx, Math.min(words.length, wordIdx + count));
              wordIdx += ayahWords.length;
            }

            if (ayahWords.length > 0) {
              const start = Number(b.start) || 0;
              // Connect end to the next ayah's start for seamless coverage
              const nextStart = !isLast && bounds[bIdx + 1] ? Number(bounds[bIdx + 1].start) : null;
              const rawEnd = Number(b.end) || (start + 5);
              const end = nextStart !== null ? Math.min(rawEnd, nextStart) : rawEnd;
              const wordCount = ayahWords.length;
              const fs = wordCount > 40 ? 38 : wordCount > 28 ? 44 : wordCount > 18 ? 50 : wordCount > 10 ? 56 : 64;
              const wpl = wordCount > 40 ? 9 : wordCount > 28 ? 8 : wordCount > 18 ? 7 : wordCount > 10 ? 6 : 5;
              let formattedText = "";
              for (let w = 0; w < ayahWords.length; w++) {
                formattedText += ayahWords[w] + " ";
                if ((w + 1) % wpl === 0 && w < ayahWords.length - 1) {
                  formattedText = formattedText.trimEnd() + "\\N";
                }
              }
              formattedText = formattedText.trim();
              // First ayah gets gentle fade-in; last gets fade-out; middle ayahs instant swap
              const useAnim = isFirst ? `\\fad(150,0)` : isLast ? `\\fad(0,120)` : instantAnimTag;
              const ayahStyleTag = data.style === "bottom"
                ? `{\\an2\\pos(540,1600)\\fs${fs}${useAnim}}`
                : `{\\an5\\pos(540,960)\\fs${fs}${useAnim}}`;
              ass += `Dialogue: 0,${formatTime(start)},${formatTime(end)},Bulgarian,,0,0,0,,${ayahStyleTag}${formattedText}\n`;
            }
          }
        } else {
          // Group words into short TikTok-style phrases for non-Ayah narrations
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

          let prevEnd = 0;
          for (let idx = 0; idx < phrases.length; idx++) {
            const p = phrases[idx];
            let start = timings[p.startIdx]?.start ?? prevEnd;
            let end = timings[p.endIdx - 1]?.end ?? (start + 2);

            // Ensure no overlap with previous phrase
            if (start < prevEnd) {
              start = prevEnd;
            }
            // Ensure next phrase start boundary doesn't overlap this end
            const nextStart = idx + 1 < phrases.length ? (timings[phrases[idx + 1].startIdx]?.start ?? end) : audioDur;
            if (end > nextStart) {
              end = nextStart;
            }
            // Ensure minimum duration so no 1-frame flashes
            if (end <= start + 0.08) {
              end = start + 0.08;
            }

            const textLine = p.words.join(" ");
            ass += `Dialogue: 0,${formatTime(start)},${formatTime(end)},Bulgarian,,0,0,0,,${styleTag}${textLine}\n`;
            prevEnd = end;
          }
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

        const is1080p = data.quality !== "720p";
        const width = is1080p ? 1080 : 720;
        const height = is1080p ? 1920 : 1280;

        let ffmpegStderr = "";

        cmd.complexFilter([
          `[0:v]crop='min(iw,ih*9/16)':'min(iw*16/9,ih)',scale=${width}:${height}:flags=lanczos,eq=brightness=-0.08,subtitles='${escapedAssPath}'[v]`
        ])
        .outputOptions([
          "-map [v]",
          "-map 1:a?",
          "-c:v libx264",
          "-profile:v high",
          "-level 4.2",
          "-pix_fmt yuv420p",
          "-preset fast",
          "-crf 20",
          "-r 30",
          "-g 60",
          "-c:a aac",
          "-b:a 128k",
          "-ar 44100",
          `-t ${Number(audioDur).toFixed(2)}`,
          "-threads 0"
        ])
        .outputFormat("mp4")
        .on("start", (commandLine: string) => {
          console.log(`[server-render] FFmpeg started with command: ${commandLine}`);
        })
        .on("stderr", (line: string) => {
          ffmpegStderr += line + "\n";
        })
        .on("progress", (progress: any) => {
          if (progress.percent) {
            console.log(`[server-render] Rendering progress: ${progress.percent.toFixed(1)}% (time: ${progress.timemark})`);
          } else {
            console.log(`[server-render] Rendering progress: ${progress.timemark}`);
          }
        })
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
        .on("error", async (err: any) => {
          console.error("[server-render] FFmpeg Error:", err.message);
          if (ffmpegStderr) console.error("[server-render] FFmpeg stderr log:\n", ffmpegStderr);
          // Cleanup
          await fs.unlink(finalBgPath).catch(() => {});
          await fs.unlink(audioPath).catch(() => {});
          await fs.unlink(assPath).catch(() => {});
          await fs.unlink(outPath).catch(() => {});
          const errLines = ffmpegStderr
            .split("\n")
            .filter(l => l.trim() && !l.includes("libx264 @") && !l.includes("aac @") && !l.includes("frame=") && !l.includes("size="))
            .slice(-10)
            .join(" | ");
          reject(new Error(err.message + (errLines ? ` [FFmpeg log: ${errLines}]` : "")));
        });
      });

    } catch (err: unknown) {
      console.error("[server-render] Critical failure:", err);
      throw new Error(String(err));
    }
  });

// ==========================================
// BACKGROUND SERVER JOBS (SURVIVE BROWSER CLOSE)
// ==========================================

const getJobsDir = async () => {
  const os = await import("os");
  const fs = (await import("fs")).promises;
  const path = await import("path");
  const dir = path.join(os.homedir(), ".islamicreels_jobs");
  await fs.mkdir(dir, { recursive: true }).catch(() => {});
  return dir;
};

async function loadJobs() {
  const fs = (await import("fs")).promises;
  const path = await import("path");
  const dir = await getJobsDir();
  const file = path.join(dir, "jobs.json");
  try {
    const txt = await fs.readFile(file, "utf-8");
    return JSON.parse(txt);
  } catch {
    return [];
  }
}

async function saveJobs(jobs: any[]) {
  const fs = (await import("fs")).promises;
  const path = await import("path");
  const dir = await getJobsDir();
  const file = path.join(dir, "jobs.json");
  await fs.writeFile(file, JSON.stringify(jobs, null, 2), "utf-8");
}

export const startServerRenderJob = createServerFn({ method: "POST" })
  .validator((input: { data: any; title: string }) => input)
  .handler(async ({ data: { data, title } }) => {
    const jobId = `job_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const jobs = await loadJobs();
    jobs.unshift({
      id: jobId,
      title: title || "Ислямско видео (Фонов рендер)",
      status: "rendering",
      createdAt: Date.now(),
    });
    await saveJobs(jobs);

    // Start FFmpeg asynchronously in the background so closing Safari does not stop it
    (async () => {
      const fs = (await import("fs")).promises;
      const path = await import("path");
      const dir = await getJobsDir();
      const targetMp4 = path.join(dir, `${jobId}.mp4`);
      try {
        console.log(`[server-job] Starting background render for ${jobId}...`);
        const base64Data = await runServerRender({ data });
        const BufferMod = (await import("node:buffer")).Buffer;
        await fs.writeFile(targetMp4, BufferMod.from(base64Data, "base64"));

        const curJobs = await loadJobs();
        const idx = curJobs.findIndex((j: any) => j.id === jobId);
        if (idx !== -1) {
          curJobs[idx].status = "completed";
          curJobs[idx].completedAt = Date.now();
          await saveJobs(curJobs);
        }
        console.log(`[server-job] Background render ${jobId} COMPLETED!`);
      } catch (err: any) {
        console.error(`[server-job] Background render ${jobId} FAILED:`, err);
        const curJobs = await loadJobs();
        const idx = curJobs.findIndex((j: any) => j.id === jobId);
        if (idx !== -1) {
          curJobs[idx].status = "error";
          curJobs[idx].error = String(err.message || err);
          await saveJobs(curJobs);
        }
      }
    })();

    return { jobId, status: "rendering" };
  });

export const listServerRenderJobs = createServerFn({ method: "POST" })
  .handler(async () => {
    return await loadJobs();
  });

export const getServerRenderJobBase64 = createServerFn({ method: "POST" })
  .validator((input: { id: string }) => input)
  .handler(async ({ data: { id } }) => {
    const fs = (await import("fs")).promises;
    const path = await import("path");
    const dir = await getJobsDir();
    const targetMp4 = path.join(dir, `${id}.mp4`);
    const BufferMod = (await import("node:buffer")).Buffer;
    const buf = await fs.readFile(targetMp4);
    return buf.toString("base64");
  });

export const deleteServerRenderJob = createServerFn({ method: "POST" })
  .validator((input: { id: string }) => input)
  .handler(async ({ data: { id } }) => {
    const fs = (await import("fs")).promises;
    const path = await import("path");
    const dir = await getJobsDir();
    const targetMp4 = path.join(dir, `${id}.mp4`);
    await fs.unlink(targetMp4).catch(() => {});
    const curJobs = await loadJobs();
    const updated = curJobs.filter((j: any) => j.id !== id);
    await saveJobs(updated);
    return { success: true };
  });

