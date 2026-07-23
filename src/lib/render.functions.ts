/// <reference path="../types/declarations.d.ts" />
import { createServerFn } from "@tanstack/react-start";
import type { Buffer } from "node:buffer";
import { verifyAndCorrectSubtitleSync } from "./subtitle-sync.functions";

// Polyfill __dirname and __filename for bundled CommonJS modules in ESM environments
try {
  if (typeof globalThis !== "undefined" && !(globalThis as any).__dirname) {
    (globalThis as any).__dirname = process.cwd();
    (globalThis as any).__filename = process.cwd() + "/index.mjs";
  }
} catch { /* ignore */ }

let renderQueue: any = null;
async function getRenderQueue() {
  if (!renderQueue) {
    const PQueueMod = await import("p-queue");
    const PQueue = PQueueMod.default || PQueueMod;
    renderQueue = new PQueue({ concurrency: 1 });
  }
  return renderQueue;
}

export async function executeRenderTask(opts: any): Promise<any> {
  const data = opts.data || opts;
  const queue = await getRenderQueue();
  return await queue.add(async () => {
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
    const tmpDir = tempDir;
    // Clean up stale temporary files right before starting render to prevent "No space left on device" errors
    try {
      await aggressivelyCleanServerDisk(false);
    } catch {
      // ignore non-critical cleanup errors
    }

    const sessionId = Date.now().toString() + Math.floor(Math.random() * 10000);
    const bgPath = path.join(tempDir, `bg_${sessionId}`); // extension added later
    const audioPath = path.join(tempDir, `audio_${sessionId}.mp3`);
    const assPath = path.join(tempDir, `subs_${sessionId}.ass`);
    const outPath = path.join(tempDir, `out_${sessionId}.mp4`);
    const sessionTempFiles = new Set<string>([audioPath, assPath, outPath]);

    try {
      console.log("[server-render] Starting pure FFmpeg render...");

      // 1. Download/Save Audio or Generate Silent Fallback
      let hasValidAudio = false;
      if (data.audioUrl) {
        try {
          if (data.audioUrl.startsWith("data:")) {
            const b64 = data.audioUrl.split(",")[1];
            await fs.writeFile(audioPath, BufferMod.from(b64, "base64"));
            hasValidAudio = true;
          } else {
            const res = await fetch(data.audioUrl, {
              headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
            });
            if (res.ok) {
              const arrayBuf = await res.arrayBuffer();
              await fs.writeFile(audioPath, BufferMod.from(arrayBuf));
              hasValidAudio = true;
            }
          }
        } catch (err) {
          console.warn("[server-render] Could not load audioUrl, generating silent audio track:", err);
        }
      }

      if (!hasValidAudio) {
        console.log("[server-render] No audio provided or fetch failed, creating 15s silent audio track...");
        await new Promise<void>((resolve, reject) => {
          ffmpeg()
            .input("anullsrc=r=44100:cl=mono")
            .inputFormat("lavfi")
            .outputOptions(["-t 15", "-c:a libmp3lame"])
            .save(audioPath)
            .on("end", () => resolve())
            .on("error", (e: any) => {
              console.warn("lavfi anullsrc fallback error, trying silent mp3 generation", e);
              resolve();
            });
        });
      }

      let audioDur = 15;
      try {
        audioDur = await new Promise<number>((resolve) => {
          let output = "";
          ffmpeg()
            .input(audioPath)
            .outputOptions(["-f null"])
            .output("-")
            .on("error", () => {
              const match = output.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
              if (match) {
                resolve(Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]));
              } else {
                resolve(0);
              }
            })
            .on("end", () => {
              const match = output.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
              if (match) {
                resolve(Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]));
              } else {
                resolve(0);
              }
            })
            .on("stderr", (line: string) => {
              output += line + "\n";
            })
            .run();
        });

        if (!audioDur || audioDur <= 0) {
          const mp3Duration = (await import("mp3-duration")).default;
          const audioBuf = await fs.readFile(audioPath);
          audioDur = await mp3Duration(audioBuf);
        }
        console.log(`[server-render] Exact audio duration probed: ${audioDur} seconds`);
      } catch (err) {
        console.warn("[server-render] Could not probe exact audio duration, falling back to 20s", err);
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
        sessionTempFiles.add(finalBgPath);
      } else {
        try {
          const res = await fetch(bgUrl, {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
          });
          if (!res.ok) throw new Error(`Status ${res.status}`);
          const contentType = res.headers.get("content-type") || "";
          if (contentType.includes("video") || bgUrl.includes(".mp4")) {
            isVideoBg = true;
            finalBgPath += ".mp4";
          } else {
            finalBgPath += ".jpg";
          }
          const arrayBuf = await res.arrayBuffer();
          await fs.writeFile(finalBgPath, BufferMod.from(arrayBuf));
          sessionTempFiles.add(finalBgPath);
        } catch (fetchErr) {
          console.warn("[server-render] Primary background fetch failed, using reliable fallback video:", fetchErr);
          const fallbackUrl = "https://videos.pexels.com/video-files/855029/855029-hd_1080_1920_30fps.mp4";
          const fbRes = await fetch(fallbackUrl);
          isVideoBg = true;
          finalBgPath += ".mp4";
          const arrayBuf = await fbRes.arrayBuffer();
          await fs.writeFile(finalBgPath, BufferMod.from(arrayBuf));
          sessionTempFiles.add(finalBgPath);
        }
      }

      // 2.5 Multi-Scene B-Roll sequence (if multiple bRollUrls provided)
      if (Array.isArray(data.bRollUrls) && data.bRollUrls.length > 1) {
        try {
          console.log(`[server-render] Creating multi-scene B-Roll sequence from ${data.bRollUrls.length} clips...`);
          const bRollFiles: string[] = [];
          for (let i = 0; i < data.bRollUrls.length; i++) {
            const url = data.bRollUrls[i];
            const p = path.join(tmpDir, `broll_${i}_${Date.now()}.mp4`);
            const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
            if (r.ok) {
              const buf = await r.arrayBuffer();
              await fs.writeFile(p, BufferMod.from(buf));
              bRollFiles.push(p);
              sessionTempFiles.add(p);
            }
          }
          if (bRollFiles.length > 1) {
            const clipDur = Math.max(3.5, audioDur / bRollFiles.length);
            const concatListPath = path.join(tmpDir, `concat_${Date.now()}.txt`);
            sessionTempFiles.add(concatListPath);
            const normalizedPaths: string[] = [];

            for (let i = 0; i < bRollFiles.length; i++) {
              const normPath = path.join(tmpDir, `norm_${i}_${Date.now()}.mp4`);
              await new Promise((resolve, reject) => {
                ffmpeg(bRollFiles[i])
                  .setFfmpegPath(ffmpegPath)
                  .outputOptions([
                    `-t ${clipDur}`,
                    "-vf scale=1080:1920:flags=lanczos:force_original_aspect_ratio=increase,crop=1080:1920,fps=30",
                    "-c:v libx264",
                    "-preset veryfast",
                    "-crf 18",
                    "-pix_fmt yuv420p",
                    "-an",
                  ])
                  .output(normPath)
                  .on("end", resolve)
                  .on("error", reject)
                  .run();
              });
              normalizedPaths.push(normPath);
              sessionTempFiles.add(normPath);
            }

            const concatContent = normalizedPaths.map((p) => `file '${p.replace(/\\/g, "/")}'`).join("\n");
            await fs.writeFile(concatListPath, concatContent);

            const multiSceneBg = path.join(tmpDir, `multiscene_${Date.now()}.mp4`);
            sessionTempFiles.add(multiSceneBg);
            await new Promise((resolve, reject) => {
              ffmpeg()
                .setFfmpegPath(ffmpegPath)
                .input(concatListPath)
                .inputOptions(["-f concat", "-safe 0"])
                .outputOptions(["-c copy"])
                .output(multiSceneBg)
                .on("end", resolve)
                .on("error", reject)
                .run();
            });

            finalBgPath = multiSceneBg;
            sessionTempFiles.add(finalBgPath);
            isVideoBg = true;
            console.log("[server-render] Multi-scene B-Roll successfully built:", finalBgPath);

            // Immediately delete intermediate clips and concat file to free up 100MB+ disk space before audio/subtitle processing
            for (const p of [...bRollFiles, ...normalizedPaths, concatListPath]) {
              await fs.unlink(p).catch(() => {});
              sessionTempFiles.delete(p);
            }
          }
        } catch (bRollErr) {
          console.warn("[server-render] Multi-scene B-Roll failed, falling back to primary bg:", bRollErr);
        }
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
      const subPos = data.subtitlePosition || "tiktok";
      let bulgarianAlign = 8;
      let bulgarianMarginV = 1180; // TikTok safe area default above caption

      if (subPos === "reels") {
        bulgarianAlign = 8;
        bulgarianMarginV = 1120;
      } else if (subPos === "shorts") {
        bulgarianAlign = 8;
        bulgarianMarginV = 1150;
      } else if (subPos === "center") {
        bulgarianAlign = 5;
        bulgarianMarginV = 960;
      } else if (data.style === "bottom" || isLowerThird) {
        bulgarianAlign = 8;
        bulgarianMarginV = 1180;
      }

      const tiktokTheme = data.tiktokTheme || "hormozi";
      let outlineColor = "&H00000000";
      let outlineWidth = "6.5";
      let shadowSize = "2.5";
      let highlightColor = "&H0000D7FF&"; // Classic Gold
      let borderStyle = "1";
      let backColor = "&H66000000";

      if (tiktokTheme === "emerald") {
        outlineColor = "&H00102008";
        outlineWidth = "6.5";
        shadowSize = "2.5";
        highlightColor = "&H0032CD32&"; // Lime Green / Gold glow
      } else if (tiktokTheme === "neon") {
        outlineColor = "&H00181000";
        outlineWidth = "6.0";
        shadowSize = "2.5";
        highlightColor = "&H00FFFF00&"; // Neon Cyan/Gold
      } else if (tiktokTheme === "classic") {
        outlineColor = "&H00000000";
        outlineWidth = "5.0";
        shadowSize = "1.5";
        highlightColor = "&H0000D7FF&";
      } else if (tiktokTheme === "fire") {
        outlineColor = "&H00001866";
        outlineWidth = "6.5";
        shadowSize = "2.5";
        highlightColor = "&H000066FF&"; // Flaming Orange Gold
      } else if (tiktokTheme === "box") {
        borderStyle = "3";
        backColor = "&HAA000000";
        outlineColor = "&H00000000";
        outlineWidth = "8.0";
        shadowSize = "0";
        highlightColor = "&H0000D7FF&";
      }

      let ass = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Arabic,Scheherazade New,100,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,3,0,8,50,50,300,1
Style: Bulgarian,Outfit,120,&H00FFFFFF,&H0000D7FF,${outlineColor},${backColor},-1,0,0,0,100,100,0,0,${borderStyle},${outlineWidth},${shadowSize},${bulgarianAlign},100,100,${bulgarianMarginV},1
Style: Reference,Outfit,46,&H005DC9F4,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,3,1,8,50,50,280,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

      if (data.reference) {
        ass += `Dialogue: 0,0:00:00.00,${formatTime(audioDur)},Reference,,0,0,0,,{\\an8\\pos(540,280)}${data.reference}\n`;
      }

      // Arabic is intentionally omitted from video output so the Bulgarian text fits nicely without clutter.

      if (data.bulgarian) {
        let words = data.bulgarian.trim().split(/\s+/).filter(Boolean);
        let timings = data.bulgarianWordTimings;
        if (timings && timings.length > 0) {
          const syncRes = verifyAndCorrectSubtitleSync(timings, audioDur);
          timings = syncRes.correctedTimings;
          // Use TTS words as truth when available, to guarantee 1:1 word-timing alignment
          if (timings.length > 0 && timings[0].word && timings[0].word !== "...") {
            words = timings.map((t: any) => t.word);
          }
          // If word counts still differ, re-distribute timings to match words
          if (timings.length !== words.length) {
            const ratio = audioDur / Math.max(1, words.length);
            timings = words.map((_w: string, i: number) => ({
              word: _w,
              start: Number((i * ratio).toFixed(3)),
              end: Number(((i + 1) * ratio).toFixed(3)),
            }));
          }
        } else {
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
              const speechCost = (w: string) => {
                let cost = 1 + w.replace(/[^\p{L}\p{N}]/gu, "").length * 0.55;
                if (/[.!?…]$/.test(w)) cost += 3.5;
                else if (/[,;:—]$/.test(w)) cost += 1.8;
                return cost;
              };
              const costs = words.map(speechCost);
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
              const speechCost = (w: string) => {
                let cost = 1 + w.replace(/[^\p{L}\p{N}]/gu, "").length * 0.55;
                if (/[.!?…]$/.test(w)) cost += 3.5;
                else if (/[,;:—]$/.test(w)) cost += 1.8;
                return cost;
              };
              const costs = words.map(speechCost);
              const cumCost = [0];
              for (let i = 0; i < costs.length; i++) cumCost.push(cumCost[i] + costs[i]);
              const totalCost = cumCost[cumCost.length - 1] || 1;
              for (let i = 0; i < words.length; i++) {
                const s = (cumCost[i] / totalCost) * audioDur;
                const e = (cumCost[i + 1] / totalCost) * audioDur;
                timings.push({ start: s, end: e });
              }
            }
          }
        }

        if (timings && timings.length > 0) {
          const syncRes = verifyAndCorrectSubtitleSync(
            timings.map((t: any, idx: number) => ({
              word: t.word || words[idx] || "...",
              start: t.start,
              end: t.end,
            })),
            audioDur
          );
          timings = syncRes.correctedTimings;
        }

        // Crisp stable subtitle style: 100% scale at all times with no word-shifting zoom distortion
        const bounds = data.ayahBounds;
        if (Array.isArray(bounds) && bounds.length > 0) {
          // FULL-AYAH BLOCK ACTIVE KARAOKE: One complete Ayah per subtitle block from ayah.start to ayah.end,
          // dynamically sliced so the currently spoken word pops and glows in real time!
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
            }

            if (ayahWords.length > 0) {
              const startWordIdx = wordIdx;
              wordIdx += ayahWords.length;

              const start = Number(b.start) || 0;
              const nextStart = !isLast && bounds[bIdx + 1] ? Number(bounds[bIdx + 1].start) : null;
              const rawEnd = Number(b.end) || (start + 5);
              const end = nextStart !== null ? Math.min(rawEnd, nextStart) : rawEnd;
              const wordCount = ayahWords.length;
              const fs = wordCount > 40 ? 38 : wordCount > 28 ? 44 : wordCount > 18 ? 50 : wordCount > 10 ? 56 : 64;
              const wpl = wordCount > 40 ? 9 : wordCount > 28 ? 8 : wordCount > 18 ? 7 : wordCount > 10 ? 6 : 5;
              const highlightKeywords = /^(Аллах|Коран|Корана|Пророк|Пророкът|Хадис|Сура|Аят|Рай|Дженнет|Дженнета|Дуа|Иман|Благословение|Милост|Търпение|Надежда|Успех|Мухаммад|Господ|Господар|Победа|Спокойствие|Защита|Сърце|Сърцето|Живот|Време|Времето|Истина|Истината|Светлина|Зло|Добро|Вяра|Вярата)[.,!?…]?$/i;
              const isCustomOrKeyword = (wordStr: string) => {
                const cleanW = wordStr.replace(/[^\p{L}\p{N}]/gu, "");
                return (Array.isArray(data.customKeywords) && data.customKeywords.includes(cleanW)) || highlightKeywords.test(wordStr);
              };

              for (let wIdx = 0; wIdx < ayahWords.length; wIdx++) {
                const globalIdx = startWordIdx + wIdx;
                const wordStart = timings[globalIdx]?.start ?? start;
                const nextWordStart = wIdx + 1 < ayahWords.length
                  ? (timings[globalIdx + 1]?.start ?? end)
                  : end;

                const sliceStart = Math.max(start, wIdx === 0 ? start : wordStart);
                const sliceEnd = Math.min(end, wIdx === ayahWords.length - 1 ? end : nextWordStart);
                if (sliceEnd <= sliceStart) continue;

                let formattedText = "";
                for (let w = 0; w < ayahWords.length; w++) {
                  const wordStr = ayahWords[w];
                  const isKeyword = isCustomOrKeyword(wordStr);
                  const isActive = w === wIdx;
                  if (isActive) {
                    formattedText += `{\\c${highlightColor}\\b1\\t(0,60,\\fscx114\\fscy114)\\t(60,150,\\fscx100\\fscy100)}${wordStr}{\\r} `;
                  } else if (isKeyword) {
                    formattedText += `{\\c${highlightColor}\\b1}${wordStr}{\\r} `;
                  } else {
                    formattedText += `{\\c&H00FFFFFF&}${wordStr}{\\r} `;
                  }
                  if ((w + 1) % wpl === 0 && w < ayahWords.length - 1) {
                    formattedText = formattedText.trimEnd() + "\\N";
                  }
                }
                formattedText = formattedText.trim();
                const microPop = (isFirst && wIdx === 0)
                  ? `\\fad(150,0)\\t(0,100,\\fscx104\\fscy104)\\t(100,180,\\fscx100\\fscy100)`
                  : ``;
                const useAnim = (isLast && wIdx === ayahWords.length - 1) ? `${microPop}\\fad(0,120)` : microPop;
                const posTag = subPos === "center" ? `\\an5\\pos(540,960)` : `\\an8\\pos(540,${bulgarianMarginV})`;
                const ayahStyleTag = `{${posTag}\\fs${fs}${useAnim}}`;
                ass += `Dialogue: 0,${formatTime(sliceStart)},${formatTime(sliceEnd)},Bulgarian,,0,0,0,,${ayahStyleTag}${formattedText}\n`;
              }
            }
          }
        } else {
          // Group words into short viral TikTok-style punchy phrases (2 to 4 words max) OR single word pop
          const isSingleWordMode = data.subtitleSlicingMode === "single";
          const MAX_WORDS = isSingleWordMode ? 1 : 4;
          const MIN_WORDS = isSingleWordMode ? 1 : 2;
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
            // Acoustic Pause Slicing: if natural breathing gap (> 0.25s) exists right before this word, flush preceding phrase immediately
            if (!isSingleWordMode && cur.length > 0 && timings[i] && timings[i - 1]) {
              const gap = timings[i].start - timings[i - 1].end;
              if (gap > 0.25) {
                flush();
              }
            }
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
            const isFirstPhrase = idx === 0;
            const isLastPhrase = idx === phrases.length - 1;
            
            // Ensure exact synchronization with the start of the first word in the phrase
            let start = timings[p.startIdx]?.start ?? prevEnd;
            if (start < prevEnd) {
              start = prevEnd;
            }

            const nextPhraseStart = idx + 1 < phrases.length
              ? (timings[phrases[idx + 1].startIdx]?.start ?? audioDur)
              : audioDur;

            // End when the last word in the phrase finishes, plus a slight tail (0.12s) for natural reading
            const lastWordEnd = timings[p.endIdx - 1]?.end ?? (start + 1.5);
            let end = Math.min(nextPhraseStart, Math.max(start + 0.2, lastWordEnd + (isSingleWordMode ? 0.06 : 0.12)));

            const highlightKeywords = /^(Аллах|Коран|Корана|Пророк|Пророкът|Хадис|Сура|Аят|Рай|Дженнет|Дженнета|Дуа|Иман|Благословение|Милост|Търпение|Надежда|Успех|Мухаммад|Господ|Господар|Победа|Спокойствие|Защита|Сърце|Сърцето|Живот|Време|Времето|Истина|Истината|Светлина|Зло|Добро|Вяра|Вярата)[.,!?…]?$/i;
            const isCustomOrKeyword = (wordStr: string) => {
              const cleanW = wordStr.replace(/[^\p{L}\p{N}]/gu, "");
              return (Array.isArray(data.customKeywords) && data.customKeywords.includes(cleanW)) || highlightKeywords.test(wordStr);
            };

            // MASTERCLASS ACTIVE WORD KARAOKE SLICING:
            // Slice the phrase interval [start, end] into distinct ASS events for each active word so that
            // every single word pops and glows exactly at the millisecond the narrator speaks it!
            for (let wIdx = 0; wIdx < p.words.length; wIdx++) {
              const globalIdx = p.startIdx + wIdx;
              const wordStart = timings[globalIdx]?.start ?? start;
              const nextWordStart = wIdx + 1 < p.words.length
                ? (timings[globalIdx + 1]?.start ?? end)
                : end;

              const sliceStart = Math.max(start, wIdx === 0 ? start : wordStart);
              const sliceEnd = Math.min(end, wIdx === p.words.length - 1 ? end : nextWordStart);
              if (sliceEnd <= sliceStart) continue;

              const textLine = p.words
                .map((w, i) => {
                  const isKeyword = isCustomOrKeyword(w);
                  const isActive = i === wIdx;
                  if (isActive) {
                    // Active spoken word: instant micro-pop scale with glowing highlight color
                    return `{\\c${highlightColor}\\b1\\t(0,60,\\fscx116\\fscy116)\\t(60,150,\\fscx100\\fscy100)}${w}{\\r}`;
                  } else if (isKeyword) {
                    // Important Islamic/Custom keyword retain their gold/neon highlight
                    return `{\\c${highlightColor}\\b1}${w}{\\r}`;
                  } else {
                    // Clean crisp white font for inactive words
                    return `{\\c&H00FFFFFF&}${w}`;
                  }
                })
                .join(" ");

              const microPop = (isFirstPhrase && wIdx === 0)
                ? `\\fad(120,0)\\t(0,100,\\fscx105\\fscy105)\\t(100,180,\\fscx100\\fscy100)`
                : ``;
              const useAnim = (isLastPhrase && wIdx === p.words.length - 1) ? `${microPop}\\fad(0,100)` : microPop;
              const posTag = subPos === "center" ? `\\an5\\pos(540,960)` : `\\an8\\pos(540,${bulgarianMarginV})`;
              const phraseStyleTag = `{${posTag}\\fscx100\\fscy100${useAnim}}`;
              ass += `Dialogue: 0,${formatTime(sliceStart)},${formatTime(sliceEnd)},Bulgarian,,0,0,0,,${phraseStyleTag}${textLine}\n`;
            }
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
          `[0:v]crop='min(iw,ih*9/16)':'min(iw*16/9,ih)',scale=${width}:${height}:flags=lanczos,eq=contrast=1.08:saturation=1.16:brightness=-0.04:gamma=0.98,unsharp=5:5:0.8:3:3:0.4,vignette=PI/4,subtitles='${escapedAssPath}'[v]`,
          `[1:a]highpass=f=45,treble=g=2:f=3500:w=0.7,acompressor=threshold=-18dB:ratio=2.5:attack=5:release=50,bass=g=3:f=110:w=0.6,loudnorm=I=-14:LRA=9:TP=-1.0[a]`
        ])
        .outputOptions([
          "-map [v]",
          "-map [a]",
          "-c:v libx264",
          "-profile:v main",
          "-level 4.0",
          "-pix_fmt yuv420p",
          "-colorspace bt709",
          "-color_trc bt709",
          "-color_primaries bt709",
          "-movflags +faststart",
          "-preset veryfast",
          "-crf 17",
          "-r 30",
          "-g 60",
          "-c:a aac",
          "-profile:a aac_low",
          "-b:a 192k",
          "-ar 48000",
          "-ac 2",
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
            if (data && data.targetOutputPath && typeof data.targetOutputPath === "string") {
              const dest = data.targetOutputPath;
              console.log(`[server-render] Direct move to targetOutputPath: ${dest} (Zero-RAM Base64 elimination)`);
              await fs.mkdir(path.dirname(dest), { recursive: true }).catch(() => {});
              await fs.rename(outPath, dest).catch(async () => {
                await fs.copyFile(outPath, dest);
                await fs.unlink(outPath).catch(() => {});
              });
              resolve(JSON.stringify({ directWrite: true, filePath: dest, size: stat.size }));
            } else {
              const buf = await fs.readFile(outPath);
              resolve(buf.toString("base64"));
            }
          } catch (e) {
            reject(e);
          } finally {
            // Cleanup all temporary files created during this render session
            for (const fp of sessionTempFiles) {
              await fs.unlink(fp).catch(() => {});
            }
            await fs.unlink(finalBgPath).catch(() => {});
          }
        })
        .on("error", async (err: any) => {
          console.error("[server-render] FFmpeg Error:", err.message);
          if (ffmpegStderr) console.error("[server-render] FFmpeg stderr log:\n", ffmpegStderr);
          // Cleanup all temporary files created during this render session
          for (const fp of sessionTempFiles) {
            await fs.unlink(fp).catch(() => {});
          }
          await fs.unlink(finalBgPath).catch(() => {});
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
  }

export const runServerRender = createServerFn({ method: "POST" })
  .validator((opts: any) => opts)
  .handler(async ({ data }) => {
    return await executeRenderTask(data);
  });

// ==========================================
// BACKGROUND SERVER JOBS (SURVIVE BROWSER CLOSE)
// ==========================================

async function aggressivelyCleanServerDisk(forceAll = false) {
  try {
    const os = await import("os");
    const fs = (await import("fs")).promises;
    const path = await import("path");
    const { exec } = await import("child_process");
    const now = Date.now();

    // 0. If forceAll is true, synchronously await shell commands to flush PM2 logs, vacuum systemd journals, clean apt/npm caches, and purge temp/log folders
    if (forceAll) {
      await new Promise<void>((resolve) => {
        const cmd = [
          "pm2 flush 2>/dev/null",
          "journalctl --vacuum-size=20M 2>/dev/null",
          "journalctl --vacuum-time=1d 2>/dev/null",
          "apt-get clean 2>/dev/null",
          "npm cache clean --force 2>/dev/null",
          "rm -rf /tmp/* /var/tmp/* /var/cache/* ~/.cache/* /root/.cache/* /home/*/.cache/* ~/.npm/* /root/.npm/* /home/*/.npm/* ~/.pm2/logs/* /root/.pm2/logs/* /home/*/.pm2/logs/* /var/log/*.gz /var/log/*/*/*.gz 2>/dev/null"
        ].join("; ");
        exec(cmd, { timeout: 15000 }, () => resolve());
      });
    }

    // 1. Clean OS temp directory (/tmp) and explicit /tmp, /var/tmp
    const tmpDirs = [os.tmpdir(), "/tmp", "/var/tmp", path.join(process.cwd(), "tmp"), path.join(process.cwd(), ".output", "tmp")];
    for (const tmpDir of tmpDirs) {
      try {
        const tmpFiles = await fs.readdir(tmpDir).catch(() => []);
        const prefixes = ["broll_", "multiscene_", "norm_", "concat_", "sub_", "bg_", "py-tts-", "video_", "tmp-", "align_audio_"];
        for (const f of tmpFiles) {
          const matchesPrefix = forceAll || prefixes.some((p) => f.startsWith(p)) || f.endsWith(".mp4") || f.endsWith(".mp3") || f.endsWith(".vtt") || f.endsWith(".ass") || f.endsWith(".jpg") || f.endsWith(".png");
          if (matchesPrefix) {
            const fp = path.join(tmpDir, f);
            const st = await fs.stat(fp).catch(() => null);
            // If forceAll is true, delete immediately (threshold 0); otherwise if older than 2 minutes
            const threshold = forceAll ? 0 : 2 * 60 * 1000;
            if (st && now - st.mtimeMs >= threshold) {
              await fs.rm(fp, { recursive: true, force: true }).catch(() => {});
            }
          }
        }
      } catch {}
    }

    // 2. Truncate PM2 log files (~/.pm2/logs and /root/.pm2/logs) to reclaim disk space immediately without closing open file descriptors
    const logDirs = [path.join(os.homedir(), ".pm2", "logs"), "/root/.pm2/logs", "/home/admin/.pm2/logs"];
    for (const lDir of logDirs) {
      try {
        const lFiles = await fs.readdir(lDir).catch(() => []);
        for (const lf of lFiles) {
          if (lf.endsWith(".log")) {
            const lPath = path.join(lDir, lf);
            const st = await fs.stat(lPath).catch(() => null);
            if (st && (forceAll || st.size > 5 * 1024 * 1024)) {
              await fs.writeFile(lPath, "").catch(() => {});
            }
          }
        }
      } catch {}
    }

    // 3. Clean up old finished or partial jobs in ~/.islamicreels_jobs (STRICT 5GB SSD PROTECTION)
    try {
      const jobsDir = path.join(os.homedir(), ".islamicreels_jobs");
      const jFiles = await fs.readdir(jobsDir).catch(() => []);
      
      let activeIds = new Set<string>();
      let completedIds = new Set<string>();
      try {
        const jobsFile = path.join(jobsDir, "jobs.json");
        const raw = await fs.readFile(jobsFile, "utf-8");
        const jobsList = JSON.parse(raw);
        if (Array.isArray(jobsList)) {
          jobsList.forEach((j: any) => {
            if (j && (j.status === "processing" || j.status === "rendering" || j.status === "queued")) {
              activeIds.add(j.id);
            } else if (j && j.status === "completed") {
              completedIds.add(j.id);
            }
          });
          // STRICT CAP: Keep at most 8 jobs total in JSON to prevent disk/metadata bloat
          if (jobsList.length > 8) {
            const trimmed = jobsList.slice(0, 8);
            await fs.writeFile(jobsFile, JSON.stringify(trimmed, null, 2), "utf-8").catch(() => {});
          }
        }
      } catch {}

      // Collect stats for all completed or orphan files in jobs directory to sort by age
      const fileStats: { name: string; path: string; mtimeMs: number; isActive: boolean; isCompleted: boolean }[] = [];
      for (const jf of jFiles) {
        if (jf === "jobs.json") continue;
        const jp = path.join(jobsDir, jf);
        const st = await fs.stat(jp).catch(() => null);
        if (!st) continue;
        const isActivelyRendering = Array.from(activeIds).some((id) => jf.startsWith(id));
        const isCompletedJob = Array.from(completedIds).some((id) => jf.startsWith(id));
        fileStats.push({ name: jf, path: jp, mtimeMs: st.mtimeMs, isActive: isActivelyRendering, isCompleted: isCompletedJob });
      }

      // Sort newest to oldest
      fileStats.sort((a, b) => b.mtimeMs - a.mtimeMs);

      let completedCount = 0;
      for (const fsItem of fileStats) {
        if (fsItem.isActive) continue;

        if (fsItem.isCompleted || fsItem.name.endsWith(".mp4")) {
          completedCount++;
          // STRICT LIMIT: If we already kept 8 completed MP4 files, delete any older ones immediately regardless of age
          if (completedCount > 8) {
            await fs.rm(fsItem.path, { recursive: true, force: true }).catch(() => {});
            continue;
          }
          // Age threshold: 3 hours for forceAll, 24 hours for routine check
          const completedThreshold = forceAll ? 3 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
          if (now - fsItem.mtimeMs >= completedThreshold) {
            await fs.rm(fsItem.path, { recursive: true, force: true }).catch(() => {});
          }
        } else {
          // Temporary/orphan files in job dir: delete immediately on forceAll or after 2 hours
          const tempThreshold = forceAll ? 0 : 2 * 60 * 60 * 1000;
          if (now - fsItem.mtimeMs >= tempThreshold) {
            await fs.rm(fsItem.path, { recursive: true, force: true }).catch(() => {});
          }
        }
      }
    } catch {}
  } catch {}
}

export const getJobsDir = async () => {
  const os = await import("os");
  const fs = (await import("fs")).promises;
  const path = await import("path");
  const dir = path.join(os.homedir(), ".islamicreels_jobs");
  await fs.mkdir(dir, { recursive: true }).catch(() => {});

  await aggressivelyCleanServerDisk(false);
  scheduleServerMaintenance();

  return dir;
};

export type ServerJobRecord = {
  id: string;
  title: string;
  status: "queued" | "rendering" | "completed" | "error";
  createdAt: number;
  completedAt?: number;
  data?: any;
  error?: string;
};

async function loadJobs(): Promise<ServerJobRecord[]> {
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

// Sequential in-memory job queue to guarantee concurrency = 1
// Prevents ENOSPC (no space left on device) and CPU/RAM exhaustion when batch rendering many videos at once
type QueuedRenderJob = {
  id: string;
  data: any;
  title: string;
};

const backgroundRenderQueue: QueuedRenderJob[] = [];
let isQueueProcessing = false;

async function recoverInterruptedJobs() {
  try {
    const jobs = await loadJobs();
    let modified = false;
    for (const j of jobs) {
      if (j && (j.status === "rendering" || j.status === "queued") && j.data) {
        if (j.status === "rendering") {
          console.log(`[server-recovery] Recovering interrupted job ${j.id} (${j.title}) -> setting back to queued.`);
          j.status = "queued";
          modified = true;
        }
        if (!backgroundRenderQueue.some((item) => item.id === j.id)) {
          backgroundRenderQueue.push({ id: j.id, data: j.data, title: j.title || "Ислямско видео" });
        }
      }
    }
    if (modified) {
      await saveJobs(jobs);
    }
    if (backgroundRenderQueue.length > 0 && !isQueueProcessing) {
      processRenderQueue().catch((e) => console.error("[server-recovery] Queue resume error:", e));
    }
  } catch (e) {
    console.error("[server-recovery] Error recovering jobs:", e);
  }
}

async function processRenderQueue() {
  if (isQueueProcessing) return;
  isQueueProcessing = true;

  try {
    const allJobs = await loadJobs();
    const queuedInFile = allJobs.filter((j: any) => j.status === "queued" && j.data);
    for (const qj of queuedInFile) {
      if (!backgroundRenderQueue.some((item) => item.id === qj.id)) {
        backgroundRenderQueue.push({ id: qj.id, data: qj.data, title: qj.title || "Ислямско видео" });
      }
    }
  } catch {}

  while (backgroundRenderQueue.length > 0) {
    const item = backgroundRenderQueue.shift()!;
    const fs = (await import("fs")).promises;
    const path = await import("path");
    const dir = await getJobsDir();
    const targetMp4 = path.join(dir, `${item.id}.mp4`);

    try {
      console.log(`[server-queue] Starting queued render for ${item.id} (${item.title})... Queue remaining: ${backgroundRenderQueue.length}`);
      
      const startJobs = await loadJobs();
      const sIdx = startJobs.findIndex((j: any) => j.id === item.id);
      if (sIdx !== -1) {
        startJobs[sIdx].status = "rendering";
        await saveJobs(startJobs);
      }

      // 1. Thorough disk cleanup right before starting EACH job to ensure 100% free /tmp space
      await aggressivelyCleanServerDisk(true);

      const renderResult = await executeRenderTask({
        data: { ...item.data, targetOutputPath: targetMp4 }
      });

      let directWriteSuccess = false;
      if (typeof renderResult === "string" && renderResult.startsWith("{")) {
        try {
          const parsed = JSON.parse(renderResult);
          if (parsed.directWrite && parsed.filePath) {
            directWriteSuccess = true;
          }
        } catch {}
      }

      if (!directWriteSuccess && typeof renderResult === "string") {
        const BufferMod = (await import("node:buffer")).Buffer;
        await fs.writeFile(targetMp4, BufferMod.from(renderResult, "base64"));
      }

      const curJobs = await loadJobs();
      const idx = curJobs.findIndex((j: any) => j.id === item.id);
      if (idx !== -1) {
        curJobs[idx].status = "completed";
        curJobs[idx].completedAt = Date.now();
        await saveJobs(curJobs);
      }
      console.log(`[server-queue] Render ${item.id} COMPLETED successfully!`);

      // 2. Post-render cleanup of intermediate temp files before next job
      await aggressivelyCleanServerDisk(false);
    } catch (err: any) {
      console.error(`[server-queue] Render ${item.id} FAILED:`, err);
      const curJobs = await loadJobs();
      const idx = curJobs.findIndex((j: any) => j.id === item.id);
      if (idx !== -1) {
        curJobs[idx].status = "error";
        curJobs[idx].error = String(err?.message || err);
        await saveJobs(curJobs);
      }
      await aggressivelyCleanServerDisk(false);
    }
  }

  isQueueProcessing = false;
}

export const startServerRenderJob = createServerFn({ method: "POST" })
  .validator((input: { data: any; title: string }) => input)
  .handler(async ({ data: { data, title } }) => {
    const jobId = `job_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const jobs = await loadJobs();
    jobs.unshift({
      id: jobId,
      title: title || "Ислямско видео (Фонов рендер)",
      status: "queued",
      createdAt: Date.now(),
      data,
    });
    await saveJobs(jobs);

    backgroundRenderQueue.push({ id: jobId, data, title: title || "Ислямско видео" });
    processRenderQueue().catch((e) => console.error("[server-queue] Queue processing error:", e));

    return { jobId, status: "queued" };
  });

export const retryServerRenderJob = createServerFn({ method: "POST" })
  .validator((input: { id: string }) => input)
  .handler(async ({ data: { id } }) => {
    const jobs = await loadJobs();
    const idx = jobs.findIndex((j: any) => j.id === id);
    if (idx === -1 || !jobs[idx].data) {
      throw new Error("Job or render data not found");
    }
    const jobData = jobs[idx].data;
    const jobTitle = jobs[idx].title || id;
    jobs[idx].status = "queued";
    jobs[idx].error = undefined;
    await saveJobs(jobs);

    backgroundRenderQueue.push({ id, data: jobData, title: jobTitle });
    processRenderQueue().catch((e) => console.error("[server-queue] Queue processing error:", e));

    return { success: true };
  });

export const listServerRenderJobs = createServerFn({ method: "POST" })
  .handler(async () => {
    const fs = (await import("fs")).promises;
    const path = await import("path");
    const dir = await getJobsDir();
    const jobs = await loadJobs();
    const validJobs: ServerJobRecord[] = [];
    let updated = false;
    for (const j of jobs) {
      if (j && j.status === "completed") {
        const fileExists = await fs.stat(path.join(dir, `${j.id}.mp4`)).catch(() => null);
        if (!fileExists) {
          j.status = "error";
          j.error = "Видеото е било автоматично почистено от диска на сървъра. Натиснете бутона 🔄 за повторно рендиране.";
          updated = true;
        }
      }
      validJobs.push(j);
    }
    if (updated) {
      await saveJobs(validJobs);
    }
    return validJobs;
  });

export const getServerRenderJobBase64 = createServerFn({ method: "POST" })
  .validator((input: { id: string }) => input)
  .handler(async ({ data: { id } }) => {
    const fs = (await import("fs")).promises;
    const path = await import("path");
    const dir = await getJobsDir();
    const targetMp4 = path.join(dir, `${id}.mp4`);
    try {
      const buf = await fs.readFile(targetMp4);
      return buf.toString("base64");
    } catch (err: any) {
      throw new Error("Видеото не е намерено на диска на сървъра. Моля, рендирайте го отново.");
    }
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

export const getServerRenderJobDownloadUrl = createServerFn({ method: "POST" })
  .validator((input: { id: string; title?: string }) => input)
  .handler(async ({ data: { id, title } }) => {
    const fs = (await import("fs")).promises;
    const path = await import("path");
    const dir = await getJobsDir();
    const targetMp4 = path.join(dir, `${id}.mp4`);

    // Verify the file exists
    await fs.access(targetMp4);

    const filename = (title || "islamic-reel").replace(/[^a-z0-9._-]+/gi, "_") + ".mp4";
    return {
      downloadUrl: `/api/download/${id}?filename=${encodeURIComponent(filename)}`,
    };
  });

export const cleanServerDiskSpace = createServerFn({ method: "POST" })
  .handler(async () => {
    await aggressivelyCleanServerDisk(true);
    return { success: true };
  });

let maintenanceTimerStarted = false;
export function scheduleServerMaintenance() {
  if (maintenanceTimerStarted) return;
  maintenanceTimerStarted = true;
  console.log("[server-maintenance] Automatic server health & temp cleanup worker initialized.");

  setTimeout(() => {
    aggressivelyCleanServerDisk(true).catch((e) => console.error("[server-maintenance] Boot cleanup error:", e));
    recoverInterruptedJobs().catch((e) => console.error("[server-maintenance] Boot recovery error:", e));
  }, 3 * 1000);

  setInterval(() => {
    console.log("[server-maintenance] Running scheduled 6-hour disk & PM2 log maintenance...");
    aggressivelyCleanServerDisk(true).catch((e) => console.error("[server-maintenance] Scheduled cleanup error:", e));
    recoverInterruptedJobs().catch((e) => console.error("[server-maintenance] Scheduled recovery error:", e));
  }, 6 * 60 * 60 * 1000);
}

if (typeof process !== "undefined" && !maintenanceTimerStarted) {
  try { scheduleServerMaintenance(); } catch {}
}
