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
        } catch (fetchErr) {
          console.warn("[server-render] Primary background fetch failed, using reliable fallback video:", fetchErr);
          const fallbackUrl = "https://videos.pexels.com/video-files/855029/855029-hd_1080_1920_30fps.mp4";
          const fbRes = await fetch(fallbackUrl);
          isVideoBg = true;
          finalBgPath += ".mp4";
          const arrayBuf = await fbRes.arrayBuffer();
          await fs.writeFile(finalBgPath, BufferMod.from(arrayBuf));
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
            }
          }
          if (bRollFiles.length > 1) {
            const clipDur = Math.max(3.5, audioDur / bRollFiles.length);
            const concatListPath = path.join(tmpDir, `concat_${Date.now()}.txt`);
            const normalizedPaths: string[] = [];

            for (let i = 0; i < bRollFiles.length; i++) {
              const normPath = path.join(tmpDir, `norm_${i}_${Date.now()}.mp4`);
              await new Promise((resolve, reject) => {
                ffmpeg(bRollFiles[i])
                  .setFfmpegPath(ffmpegPath)
                  .outputOptions([
                    `-t ${clipDur}`,
                    "-vf scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30",
                    "-c:v libx264",
                    "-preset ultrafast",
                    "-an",
                  ])
                  .output(normPath)
                  .on("end", resolve)
                  .on("error", reject)
                  .run();
              });
              normalizedPaths.push(normPath);
            }

            const concatContent = normalizedPaths.map((p) => `file '${p.replace(/\\/g, "/")}'`).join("\n");
            await fs.writeFile(concatListPath, concatContent);

            const multiSceneBg = path.join(tmpDir, `multiscene_${Date.now()}.mp4`);
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
            isVideoBg = true;
            console.log("[server-render] Multi-scene B-Roll successfully built:", finalBgPath);
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
      // Anchor top-down in the lower half (Alignment 8 = top-center at MarginV = 1150)
      // so when text wraps or grows, lines continue vertically downwards.
      const bulgarianAlign = 8;
      const bulgarianMarginV = 1150;

      const tiktokTheme = data.tiktokTheme || "hormozi";
      let outlineColor = "&H00000000";
      let outlineWidth = "5.5";
      let shadowSize = "1.5";

      if (tiktokTheme === "emerald") {
        outlineColor = "&H00183010";
        outlineWidth = "5.5";
      } else if (tiktokTheme === "neon") {
        outlineColor = "&H00201505";
        outlineWidth = "5";
      } else if (tiktokTheme === "classic") {
        outlineColor = "&H00000000";
        outlineWidth = "4";
        shadowSize = "0";
      }

      let ass = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Arabic,Scheherazade New,100,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,3,0,8,50,50,300,1
Style: Bulgarian,Outfit,120,&H00FFFFFF,&H0000D7FF,${outlineColor},&H66000000,-1,0,0,0,100,100,0,0,1,${outlineWidth},${shadowSize},${bulgarianAlign},100,100,1120,1
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
        const instantAnimTag = "\\fscx100\\fscy100\\fad(0,0)";

        const bounds = data.ayahBounds;
        if (Array.isArray(bounds) && bounds.length > 0) {
          // FULL-AYAH BLOCK SYNCHRONIZER: One complete Ayah per subtitle block from ayah.start to ayah.end
          // No fade between consecutive ayahs — instant swap for crisp transitions
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
              const useAnim = isFirst ? `\\fad(150,0)` : isLast ? `\\fad(0,120)` : instantAnimTag;
              const ayahStyleTag = data.style === "bottom"
                ? `{\\an2\\pos(540,1600)\\fs${fs}${useAnim}}`
                : `{\\an5\\pos(540,960)\\fs${fs}${useAnim}}`;
              ass += `Dialogue: 0,${formatTime(start)},${formatTime(end)},Bulgarian,,0,0,0,,${ayahStyleTag}${formattedText}\n`;
            }
          }
        } else {
          // Group words into short viral TikTok-style punchy phrases (2 to 4 words max)
          const MAX_WORDS = 4;
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
            const isFirst = idx === 0;
            const isLast = idx === phrases.length - 1;
            
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
            let end = Math.min(nextPhraseStart, Math.max(start + 0.3, lastWordEnd + 0.12));

            const highlightKeywords = /^(Аллах|Коран|Корана|Пророк|Пророкът|Хадис|Сура|Аят|Рай|Дженнет|Дуа|Иман|Благословение|Милост|Търпение|Надежда|Успех|Мухаммад|Господ|Господар)[.,!?]?$/i;
            const textLine = p.words
              .map((w) => (highlightKeywords.test(w) ? `{\\c&H0000D7FF&}${w}{\\r}` : w))
              .join(" ");

            const useAnim = isFirst ? `\\fad(120,0)` : isLast ? `\\fad(0,100)` : instantAnimTag;
            const phraseStyleTag = `{\\an2\\pos(540,1540)\\fscx100\\fscy100${useAnim}}`;
            ass += `Dialogue: 0,${formatTime(start)},${formatTime(end)},Bulgarian,,0,0,0,,${phraseStyleTag}${textLine}\n`;
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
          `[0:v]crop='min(iw,ih*9/16)':'min(iw*16/9,ih)',scale=${width}:${height}:flags=bicubic,eq=contrast=1.06:saturation=1.14:brightness=-0.06,subtitles='${escapedAssPath}'[v]`,
          `[1:a]acompressor=threshold=-18dB:ratio=2.5:attack=5:release=50,bass=g=3:f=110:w=0.6,loudnorm=I=-14:LRA=11:TP=-1.5[a]`
        ])
        .outputOptions([
          "-map [v]",
          "-map [a]",
          "-c:v libx264",
          "-profile:v high",
          "-level 4.2",
          "-pix_fmt yuv420p",
          "-preset veryfast",
          "-crf 17",
          "-r 30",
          "-g 60",
          "-c:a aac",
          "-b:a 192k",
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
      data,
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

export const retryServerRenderJob = createServerFn({ method: "POST" })
  .validator((input: { id: string }) => input)
  .handler(async ({ data: { id } }) => {
    const jobs = await loadJobs();
    const idx = jobs.findIndex((j: any) => j.id === id);
    if (idx === -1 || !jobs[idx].data) {
      throw new Error("Job or render data not found");
    }
    const jobData = jobs[idx].data;
    jobs[idx].status = "rendering";
    jobs[idx].error = undefined;
    await saveJobs(jobs);

    (async () => {
      const fs = (await import("fs")).promises;
      const path = await import("path");
      const dir = await getJobsDir();
      const targetMp4 = path.join(dir, `${id}.mp4`);
      try {
        console.log(`[server-job] Retrying background render for ${id}...`);
        const base64Data = await runServerRender({ data: jobData });
        const BufferMod = (await import("node:buffer")).Buffer;
        await fs.writeFile(targetMp4, BufferMod.from(base64Data, "base64"));

        const curJobs = await loadJobs();
        const curIdx = curJobs.findIndex((j: any) => j.id === id);
        if (curIdx !== -1) {
          curJobs[curIdx].status = "completed";
          curJobs[curIdx].completedAt = Date.now();
          await saveJobs(curJobs);
        }
      } catch (err: any) {
        const curJobs = await loadJobs();
        const curIdx = curJobs.findIndex((j: any) => j.id === id);
        if (curIdx !== -1) {
          curJobs[curIdx].status = "error";
          curJobs[curIdx].error = String(err.message || err);
          await saveJobs(curJobs);
        }
      }
    })();

    return { success: true };
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

