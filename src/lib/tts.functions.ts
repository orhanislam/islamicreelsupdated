import { createServerFn } from "@tanstack/react-start";
import * as googleTTS from "google-tts-api";
import mp3Duration from "mp3-duration";

export type WordTiming = { start: number; end: number; word: string };

function estimateWordTimings(text: string, totalDuration: number): WordTiming[] {
  // Simple heuristic: allocate time based on character count
  const words = text.split(/\s+/).filter(Boolean);
  const totalChars = words.reduce((sum, w) => sum + w.length, 0);
  
  const timings: WordTiming[] = [];
  let currentTime = 0;
  
  for (const word of words) {
    // Add extra tiny delay if the word ends with punctuation, as TTS engines pause.
    const hasPunctuation = /[.,:;!?]$/.test(word);
    
    // Exact fraction of the duration based on chars
    const wordDuration = (word.length / totalChars) * totalDuration;
    
    timings.push({
      start: currentTime,
      end: currentTime + wordDuration,
      word: word
    });
    
    currentTime += wordDuration;
    
    // Add fake pause gap in our timing math so the next word starts slightly later
    // to better align with the natural TTS pauses
    if (hasPunctuation) {
      currentTime += 0.3; 
    } else {
      currentTime += 0.05; // tiny space between words
    }
  }
  
  // Since we added arbitrary pauses, currentTime might exceed totalDuration.
  // We need to scale all timestamps down to strictly fit within totalDuration.
  if (currentTime > 0 && timings.length > 0) {
    const scale = totalDuration / currentTime;
    for (const t of timings) {
      t.start *= scale;
      t.end *= scale;
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
    // Clean text for optimal TTS
    const cleaned = data.text
      .replace(/[\-—_…]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const { EdgeTTS } = await import("node-edge-tts");
    const tts = new EdgeTTS({
      voice: "bg-BG-BorislavNeural", // Premium natural male voice for Bulgarian
      lang: "bg-BG",
      outputFormat: "audio-24khz-48kbitrate-mono-mp3",
    });

    // We can't directly get a Buffer from node-edge-tts without saving or streaming,
    // wait, node-edge-tts might have a way to stream or just save to tmp file.
    // Let's check if it has a way to get buffer. 
    // Actually, reading the source of node-edge-tts, we can use a temp file.
    const tmpFile = `/tmp/tts-${Date.now()}.mp3`;
    let audioBuffer: Buffer;
    
    try {
      const os = await import("os");
      const path = await import("path");
      const fs = await import("fs/promises");
      
      const tmpPath = path.join(os.tmpdir(), `tts-${Date.now()}-${Math.random().toString(36).slice(2)}.mp3`);
      await tts.ttsPromise(cleaned, tmpPath);
      audioBuffer = await fs.readFile(tmpPath);
      await fs.unlink(tmpPath).catch(() => {});
    } catch (e: any) {
      throw new Error("Грешка при генериране на Edge TTS: " + e.message);
    }

    // Get exact audio duration
    let duration = 5; // fallback
    try {
      duration = await mp3Duration(audioBuffer);
    } catch (err) {
      console.warn("Failed to get MP3 duration", err);
    }

    // Estimate the word timings so Remotion subtitles still work
    const wordTimings = estimateWordTimings(cleaned, duration);

    return {
      base64: audioBuffer.toString("base64"),
      mimeType: "audio/mpeg",
      wordTimings,
    };
  });
