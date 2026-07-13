import { createServerFn } from "@tanstack/react-start";
import * as googleTTS from "google-tts-api";
import mp3Duration from "mp3-duration";

export type WordTiming = { start: number; end: number; word: string };

function estimateWordTimings(text: string, totalDuration: number): WordTiming[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [];

  // Phonetic cost weighting + punctuation pauses for rhythmic accuracy
  const speechCost = (w: string) => {
    let cost = 1 + w.replace(/[^\p{L}\p{N}]/gu, "").length * 0.55;
    if (/[.!?…]$/.test(w)) cost += 3.5;
    else if (/[,;:—]$/.test(w)) cost += 1.8;
    return cost;
  };
  const costs = words.map(speechCost);
  const totalCost = costs.reduce((sum, c) => sum + c, 0) || 1;

  const timings: WordTiming[] = [];
  let currentCost = 0;

  const leadSilence = 0.05;
  const tailSilence = 0.1;
  const speechDuration = Math.max(0.5, totalDuration - leadSilence - tailSilence);

  for (let i = 0; i < words.length; i++) {
    const startFrac = currentCost / totalCost;
    currentCost += costs[i];
    const endFrac = currentCost / totalCost;

    const start = Math.round((leadSilence + startFrac * speechDuration) * 1000) / 1000;
    const end = Math.round((leadSilence + endFrac * speechDuration) * 1000) / 1000;

    timings.push({
      start,
      end,
      word: words[i],
    });
  }

  return timings;
}

function parseElevenLabsTimings(
  alignment: {
    characters: string[];
    character_start_times_seconds: number[];
    character_end_times_seconds: number[];
  }
): WordTiming[] {
  const timings: WordTiming[] = [];
  const chars = alignment.characters || [];
  const starts = alignment.character_start_times_seconds || [];
  const ends = alignment.character_end_times_seconds || [];

  let curWord = "";
  let curStart: number | null = null;
  let curEnd = 0;

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (/\S/.test(ch)) {
      if (curStart === null) curStart = starts[i];
      curWord += ch;
      curEnd = ends[i];
    } else if (curWord.length > 0) {
      if (curStart !== null && curEnd > curStart) {
        timings.push({
          start: Math.round(curStart * 1000) / 1000,
          end: Math.round(curEnd * 1000) / 1000,
          word: curWord,
        });
      }
      curWord = "";
      curStart = null;
    }
  }
  if (curWord.length > 0 && curStart !== null && curEnd > curStart) {
    timings.push({
      start: Math.round(curStart * 1000) / 1000,
      end: Math.round(curEnd * 1000) / 1000,
      word: curWord,
    });
  }

  return timings;
}

function parseVttTimings(vttText: string): WordTiming[] {
  const timings: WordTiming[] = [];
  const cues = vttText.split(/\r?\n\r?\n/);
  const parseTime = (str: string) => {
    const parts = str.trim().replace(",", ".").split(":");
    if (parts.length === 3) {
      return Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2]);
    }
    if (parts.length === 2) {
      return Number(parts[0]) * 60 + Number(parts[1]);
    }
    return 0;
  };

  for (const cue of cues) {
    const lines = cue.trim().split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("-->")) {
        const [startStr, endStr] = lines[i].split("-->");
        const start = parseTime(startStr);
        const end = parseTime(endStr);
        const text = lines.slice(i + 1).join(" ").trim();
        const words = text.split(/\s+/).filter(Boolean);
        if (words.length > 0 && end > start) {
          const dur = end - start;
          for (let w = 0; w < words.length; w++) {
            const wStart = start + (w / words.length) * dur;
            const wEnd = start + ((w + 1) / words.length) * dur;
            timings.push({
              start: Math.round(wStart * 1000) / 1000,
              end: Math.round(wEnd * 1000) / 1000,
              word: words[w],
            });
          }
        }
        break;
      }
    }
  }
  return timings;
}

export const synthesizeHadithNarration = createServerFn({ method: "POST" })
  .validator((input: { text: string; reference?: string }) => {
    const text = String(input.text ?? "").trim();
    if (!text) throw new Error("Празен текст за озвучаване");
    if (text.length > 4500) throw new Error("Текстът е твърде дълъг за един запис");
    return { text, reference: input.reference ?? "" };
  })
  .handler(async ({ data }): Promise<{
    base64: string;
    mimeType: string;
    wordTimings: WordTiming[];
  }> => {
    // Clean and normalize Islamic terminology & abbreviations for accurate Bulgarian TTS diction
    const cleaned = data.text
      .replace(/\(\s*с\s*\/\s*у\s*\)/gi, " мир да бъде с него ")
      .replace(/\bс\s*\/\s*у\b/gi, " мир да бъде с него ")
      .replace(/\b(?:с\.а\.с\.|с\.а\.в\.|saw|pbuh|ﷺ)\b/gi, " мир да бъде с него ")
      .replace(/\b(?:с\.в\.т\.|swt)\b/gi, " Субханаху ва Тааля ")
      .replace(/\b(?:р\.а\.|ra)\b/gi, " Аллах да е доволен от него ")
      .replace(/\bal-djadjali\b/gi, "Ал-Даджжал")
      .replace(/\bал-джаджали\b/gi, "Ал-Даджжал")
      .replace(/\bал-даджал\b/gi, "Ал-Даджжал")
      // Fix Islamic reference name pronunciation for Bulgarian TTS
      .replace(/\bал-Бухари\b/gi, "Ал Бухаари")
      .replace(/\bАл-Бухари\b/g, "Ал Бухаари")
      .replace(/\bal-Bukhari\b/gi, "Ал Бухаари")
      .replace(/\bBukhari\b/gi, "Бухаари")
      .replace(/\bМуслим\b/g, "Муслим")
      .replace(/\bал-Муслим\b/gi, "Ал Муслим")
      .replace(/\bат-Тирмизи\b/gi, "Ат Тирмизи")
      .replace(/\bал-Тирмизи\b/gi, "Ат Тирмизи")
      .replace(/\bTirmidhi\b/gi, "Тирмизи")
      .replace(/\bан-Навави\b/gi, "Ан Навави")
      .replace(/\bНавави\b/g, "Навави")
      .replace(/\bАбу Давуд\b/g, "Абу Давуд")
      .replace(/\bIbn Majah\b/gi, "Ибн Маджа")
      .replace(/\bал-Хаким\b/gi, "Ал Хааким")
      .replace(/\bСахих\b/g, "Сахийх")
      .replace(/\bхадис\b/gi, "хадис")
      .replace(/\bСура\b/g, "Сура")
      .replace(/\bАят\b/g, "Аят")
      .replace(/[\-—_…]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    let audioBuffer: any = null;
    let exactWordTimings: WordTiming[] | null = null;
    const BufferMod = (await import("node:buffer")).Buffer;

    const elevenKey = process.env.ELEVENLABS_API_KEY || process.env.VITE_ELEVENLABS_API_KEY;
    const elevenVoice = process.env.ELEVENLABS_VOICE_ID || process.env.VITE_ELEVENLABS_VOICE_ID || "JBFqnCBsd6RMkjVDRZzb"; // Default: George / Multilingual v2

    if (elevenKey) {
      try {
        console.log("[tts] Synthesizing with ElevenLabs API (with-timestamps)...");
        const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${elevenVoice}/with-timestamps`, {
          method: "POST",
          headers: {
            "xi-api-key": elevenKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: cleaned,
            model_id: "eleven_multilingual_v2",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.8,
            },
          }),
        });
        if (res.ok) {
          const jsonRes = await res.json();
          if (jsonRes.audio_base64) {
            audioBuffer = BufferMod.from(jsonRes.audio_base64, "base64");
            if (jsonRes.alignment) {
              const parsed = parseElevenLabsTimings(jsonRes.alignment);
              if (parsed.length > 0) {
                exactWordTimings = parsed;
              }
            }
            console.log("[tts] Successfully generated audio & exact timestamps via ElevenLabs");
          }
        } else {
          console.warn(`[tts] ElevenLabs API error ${res.status}: ${await res.text()}, falling back to EdgeTTS`);
        }
      } catch (err) {
        console.warn("[tts] ElevenLabs request failed, falling back to EdgeTTS:", err);
      }
    }

    if (!audioBuffer) {
      const { EdgeTTS } = await import("node-edge-tts");
      const tts = new EdgeTTS({
        voice: "bg-BG-BorislavNeural", // Premium natural male voice for Bulgarian
        lang: "bg-BG",
        outputFormat: "audio-24khz-48kbitrate-mono-mp3",
      });

      try {
        const os = await import("os");
        const path = await import("path");
        const fs = await import("fs/promises");

        const tmpPath = path.join(os.tmpdir(), `tts-${Date.now()}-${Math.random().toString(36).slice(2)}.mp3`);
        await tts.ttsPromise(cleaned, tmpPath);
        audioBuffer = await fs.readFile(tmpPath);
        await fs.unlink(tmpPath).catch(() => {});
      } catch (e: any) {
        console.warn("[tts] Node EdgeTTS failed, trying Python edge-tts realistic male voice:", e);
        try {
          const os = await import("os");
          const path = await import("path");
          const fs = await import("fs/promises");
          const { execFile } = await import("child_process");
          const util = await import("util");
          const execFileAsync = util.promisify(execFile);

          const tmpPyPath = path.join(os.tmpdir(), `py-tts-${Date.now()}.mp3`);
          const tmpVttPath = path.join(os.tmpdir(), `py-tts-${Date.now()}.vtt`);
          await execFileAsync("edge-tts", [
            "--voice", "bg-BG-BorislavNeural",
            "--text", cleaned,
            "--write-media", tmpPyPath,
            "--write-subtitles", tmpVttPath
          ]);
          audioBuffer = await fs.readFile(tmpPyPath);
          try {
            const vttContent = await fs.readFile(tmpVttPath, "utf-8");
            const parsedVtt = parseVttTimings(vttContent);
            if (parsedVtt.length > 0) {
              exactWordTimings = parsedVtt;
            }
          } catch { /* ignore vtt parse errors */ }
          await fs.unlink(tmpPyPath).catch(() => {});
          await fs.unlink(tmpVttPath).catch(() => {});
        } catch (pyErr) {
          console.warn("[tts] Python edge-tts failed, falling back to Google TTS:", pyErr);
          try {
            const base64Audio = await googleTTS.getAudioBase64(cleaned.slice(0, 200), {
              lang: "bg",
              slow: false,
              host: "https://translate.google.com",
              timeout: 10000,
            });
            audioBuffer = BufferMod.from(base64Audio, "base64");
          } catch (gErr: any) {
            throw new Error("Грешка при генериране на аудио озвучаване: " + (e?.message || gErr?.message || "Неуспешен запис"));
          }
        }
      }
    }

    // Get exact audio duration
    let duration = 5; // fallback
    try {
      duration = await mp3Duration(audioBuffer);
    } catch (err) {
      console.warn("Failed to get MP3 duration", err);
    }

    let wordTimings = exactWordTimings || estimateWordTimings(cleaned, duration);

    if (!exactWordTimings) {
      try {
        const { detectSpeechIntervals, alignTimestampsToSpeech } = await import("./audio-align.functions");
        const base64Url = `data:audio/mp3;base64,${audioBuffer.toString("base64")}`;
        const speechIntervals = await detectSpeechIntervals(base64Url);
        if (speechIntervals.length > 0) {
          wordTimings = alignTimestampsToSpeech(wordTimings, speechIntervals);
        }
      } catch (alignErr) {
        console.warn("Audio alignment fallback:", alignErr);
      }
    }

    return {
      base64: audioBuffer.toString("base64"),
      mimeType: "audio/mpeg",
      wordTimings,
    };
  });
