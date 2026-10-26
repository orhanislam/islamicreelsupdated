/// <reference path="../types/declarations.d.ts" />
import { createServerFn } from "@tanstack/react-start";
import { sanitizeTheologicalRespect } from "./theological-sanitizer";
import { normalizeBulgarianNumbersForTts, integerToBulgarianWords } from "./bulgarian-numbers";
import {
  normalizeAllIslamicPhonetics,
  normalizeIslamicPhoneticsToDisplayWord,
  normalizeIslamicArabicPhoneticsForTts,
  normalizePhoneticsToDisplayWord,
  type WordTiming,
} from "./islamic-phonetics";
import { remapSalawatTimingsToBulgarian } from "./salawat-timings";

export {
  normalizeBulgarianNumbersForTts,
  integerToBulgarianWords,
  normalizeAllIslamicPhonetics,
  normalizeIslamicPhoneticsToDisplayWord,
  normalizeIslamicArabicPhoneticsForTts,
  normalizePhoneticsToDisplayWord,
  remapSalawatTimingsToBulgarian,
  type WordTiming,
};

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
        const cleanWord = curWord.replace(/^[\s.,:;!?…\-—–'"„“”«»]+|[\s.,:;!?…\-—–'"„“”«»]+$/g, "").trim();
        if (cleanWord.length > 0) {
          timings.push({
            start: Math.round(curStart * 1000) / 1000,
            end: Math.round(curEnd * 1000) / 1000,
            word: curWord,
          });
        }
      }
      curWord = "";
      curStart = null;
    }
  }
  if (curWord.length > 0 && curStart !== null && curEnd > curStart) {
    const cleanWord = curWord.replace(/^[\s.,:;!?…\-—–'"„“”«»]+|[\s.,:;!?…\-—–'"„“”«»]+$/g, "").trim();
    if (cleanWord.length > 0) {
      timings.push({
        start: Math.round(curStart * 1000) / 1000,
        end: Math.round(curEnd * 1000) / 1000,
        word: curWord,
      });
    }
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
        // Exclude standalone dots/punctuation tokens (e.g. "...", "....", ",")
        const validWords = words.filter((w) => {
          const stripped = w.replace(/^[\s.,:;!?…\-—–'"„“”«»]+|[\s.,:;!?…\-—–'"„“”«»]+$/g, "").trim();
          return stripped.length > 0;
        });
        if (validWords.length > 0 && end > start) {
          const dur = end - start;
          for (let w = 0; w < validWords.length; w++) {
            const wStart = start + (w / validWords.length) * dur;
            const wEnd = start + ((w + 1) / validWords.length) * dur;
            timings.push({
              start: Math.round(wStart * 1000) / 1000,
              end: Math.round(wEnd * 1000) / 1000,
              word: validWords[w],
            });
          }
        }
        break;
      }
    }
  }
  return timings;
}

export async function synthesizeHadithNarrationDirect(
  data: string | { text: string; reference?: string },
): Promise<{
  base64: string;
  mimeType: string;
  wordTimings: WordTiming[];
}> {
  if (!import.meta.env.SSR) {
    throw new Error("synthesizeHadithNarrationDirect is a server-only function");
  }

  const rawText = typeof data === "string" ? data : data?.text;
  const textInput = String(rawText ?? "").trim();
  if (!textInput) throw new Error("Празен текст за озвучаване");
  if (textInput.length > 4500) throw new Error("Текстът е твърде дълъг за един запис");

  // Authentically normalize Islamic Arabic terminology for Salafi Arabic diction
  let cleaned = normalizeIslamicArabicPhoneticsForTts(textInput);
  // Explicitly normalize Bulgarian numbers, citations, and symbols (#1, №1, 2:255, ordinals, percentages) for natural verbalization
  cleaned = normalizeBulgarianNumbersForTts(cleaned);

  let audioBuffer: any = null;
  let exactWordTimings: WordTiming[] | null = null;
  const BufferMod = (await import("node:buffer")).Buffer;

  const elevenKey = process.env.ELEVENLABS_API_KEY || process.env.VITE_ELEVENLABS_API_KEY;
  const elevenVoice = process.env.ELEVENLABS_VOICE_ID || process.env.VITE_ELEVENLABS_VOICE_ID || "pNInz6obpgDQGcFmaJgB"; // Default: Adam (Deep, realistic male) / Multilingual v2

  if (elevenKey) {
    try {
      console.log("[tts] Synthesizing with ElevenLabs API (with-timestamps)...");
      const cleanForEleven = cleaned
        .replace(/<break[^>]*\/>/gi, ",\n\n")
        .replace(/<[^>]+>/g, " ")
        .replace(/\[(?:tiktok|carousel|карусел|видео|кука|далил|обяснение|напътствие|hook|dalil|explanation|guidance|action)[^\]]*\]/gi, " ")
        .replace(/[\[\]]/g, " ")
        .replace(/\.{2,}/g, ", ")
        .replace(/…+/g, ", ")
        .replace(/,\s*,+/g, ", ")
        .replace(/\s{2,}/g, " ")
        .trim();
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${elevenVoice}/with-timestamps`, {
        method: "POST",
        headers: {
          "xi-api-key": elevenKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: cleanForEleven,
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
      rate: "-2%",
      pitch: "-2Hz",
    });

    try {
      const os = await import("os");
      const path = await import("path");
      const fs = await import("fs/promises");

      const tmpPath = path.join(os.tmpdir(), `tts-${Date.now()}-${Math.random().toString(36).slice(2)}.mp3`);
      const cleanForEdge = cleaned
        .replace(/<break[^>]*\/>/gi, ",\n\n")
        .replace(/<[^>]+>/g, " ")
        .replace(/\[(?:tiktok|carousel|карусел|видео|кука|далил|обяснение|напътствие|hook|dalil|explanation|guidance|action)[^\]]*\]/gi, " ")
        .replace(/[\[\]]/g, " ")
        .replace(/\.{2,}/g, ", ")
        .replace(/…+/g, ", ")
        .replace(/,\s*,+/g, ", ")
        .replace(/\s{2,}/g, " ")
        .trim();
      await tts.ttsPromise(cleanForEdge, tmpPath);
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
        const cleanForEdge = cleaned
          .replace(/<break[^>]*\/>/gi, ",\n\n")
          .replace(/<[^>]+>/g, " ")
          .replace(/\[(?:tiktok|carousel|карусел|видео|кука|далил|обяснение|напътствие|hook|dalil|explanation|guidance|action)[^\]]*\]/gi, " ")
          .replace(/[\[\]]/g, " ")
          .replace(/\.{2,}/g, ", ")
          .replace(/…+/g, ", ")
          .replace(/,\s*,+/g, ", ")
          .replace(/\s{2,}/g, " ")
          .trim();
        await execFileAsync("edge-tts", [
          "--voice", "bg-BG-BorislavNeural",
          "--text", cleanForEdge,
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
          const cleanForGoogle = cleaned
            .replace(/<break[^>]*\/>/gi, ", ")
            .replace(/<[^>]+>/g, " ")
            .replace(/\[(?:tiktok|carousel|карусел|видео|кука|далил|обяснение|напътствие|hook|dalil|explanation|guidance|action)[^\]]*\]/gi, " ")
            .replace(/[\[\]]/g, " ")
            .replace(/\.{2,}/g, ", ")
            .replace(/…+/g, ", ")
            .replace(/,\s*,+/g, ", ")
            .replace(/\s{2,}/g, " ")
            .trim();
          const googleTTS = await import("google-tts-api");
          const base64Audio = await googleTTS.getAudioBase64(cleanForGoogle.slice(0, 200), {
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

  // Get exact audio duration (probe via ffprobe with fallback to mp3Duration)
  let duration = 5; // fallback
  try {
    const { execFile } = await import("child_process");
    const util = await import("util");
    const execFileAsync = util.promisify(execFile);
    const os = await import("os");
    const path = await import("path");
    const fs = await import("fs/promises");
    const tmpProbe = path.join(os.tmpdir(), `probe-${Date.now()}-${Math.random().toString(36).slice(2)}.mp3`);
    await fs.writeFile(tmpProbe, audioBuffer);
    try {
      const { stdout } = await execFileAsync("ffprobe", [
        "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        tmpProbe,
      ]);
      const parsed = parseFloat(stdout.trim());
      if (!isNaN(parsed) && parsed > 0) {
        duration = parsed;
      }
    } finally {
      await fs.unlink(tmpProbe).catch(() => {});
    }
  } catch {
    try {
      const mp3DurationMod = await import("mp3-duration");
      const mp3Duration = mp3DurationMod.default || mp3DurationMod;
      duration = await mp3Duration(audioBuffer);
    } catch (err) {
      console.warn("Failed to get MP3 duration", err);
    }
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

  // Remap spoken Arabic Salawat & Sahabah timings back to Bulgarian meaning words ("мир да бъде с него")
  wordTimings = remapSalawatTimingsToBulgarian(wordTimings);

  const { verifyAndCorrectSubtitleSync } = await import("./subtitle-sync.functions");
  const verified = verifyAndCorrectSubtitleSync(wordTimings, duration);
  wordTimings = verified.correctedTimings.map((t: WordTiming) => ({
    ...t,
    word: normalizePhoneticsToDisplayWord(t.word),
  }));

  return {
    base64: audioBuffer.toString("base64"),
    mimeType: "audio/mpeg",
    wordTimings,
  };
}

export const synthesizeHadithNarration = createServerFn({ method: "POST" })
  .validator((input: { text: string; reference?: string }) => {
    const text = String(input.text ?? "").trim();
    if (!text) throw new Error("Празен текст за озвучаване");
    if (text.length > 4500) throw new Error("Текстът е твърде дълъг за един запис");
    return { text, reference: input.reference ?? "" };
  })
  .handler(async ({ data }) => {
    return await synthesizeHadithNarrationDirect(data);
  });
