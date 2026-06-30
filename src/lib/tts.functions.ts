// Bulgarian male-voice narration for hadiths via ElevenLabs multilingual v2.
import { createServerFn } from "@tanstack/react-start";

const VOICE_ID = "JBFqnCBsd6RMkjVDRZzb";

export type WordTiming = { start: number; end: number; word: string };

function groupCharsIntoWords(
  characters: string[],
  starts: number[],
  ends: number[],
): WordTiming[] {
  const words: WordTiming[] = [];
  let cur: { chars: string[]; start: number; end: number } | null = null;
  for (let i = 0; i < characters.length; i++) {
    const ch = characters[i];
    const isWs = /\s/.test(ch);
    if (isWs) {
      if (cur) { words.push({ start: cur.start, end: cur.end, word: cur.chars.join("") }); cur = null; }
      continue;
    }
    if (!cur) cur = { chars: [ch], start: starts[i] ?? 0, end: ends[i] ?? starts[i] ?? 0 };
    else { cur.chars.push(ch); cur.end = ends[i] ?? cur.end; }
  }
  if (cur) words.push({ start: cur.start, end: cur.end, word: cur.chars.join("") });
  return words;
}

export const synthesizeHadithNarration = createServerFn({ method: "POST" })
  .inputValidator((input: { text: string; reference?: string }) => {
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
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) throw new Error("ELEVENLABS_API_KEY не е конфигуриран в .env");

    // Strip pause-inducing punctuation (commas, dashes, ellipses) which cause 
    // ElevenLabs to insert unnaturally long pauses in the middle of sentences.
    // We leave periods/question marks so it still pauses correctly at the end of sentences.
    const cleaned = data.text
      .replace(/[,;:\-—_…]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    // Add an explicit pause to the end of the text. ElevenLabs often trims 
    // the trailing audio too aggressively, causing the last word to be cut off.
    const speech = cleaned + " ...";

    let wordTimings: WordTiming[] = [];

    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/with-timestamps?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: { "xi-api-key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          text: speech,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.50, // Lower stability makes the voice faster and more expressive
            similarity_boost: 0.85,
            style: 0.05,
            use_speaker_boost: true,
          },
        }),
      },
    );
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`ElevenLabs ${res.status}: ${body.slice(0, 200) || "грешка"}`);
    }
    const j = await res.json() as {
      audio_base64?: string;
      alignment?: { characters?: string[]; character_start_times_seconds?: number[]; character_end_times_seconds?: number[] };
    };
    if (!j.audio_base64) throw new Error("ElevenLabs не върна audio_base64");
    
    const al = j.alignment;
    if (al?.characters && al.character_start_times_seconds && al.character_end_times_seconds) {
      wordTimings = groupCharsIntoWords(al.characters, al.character_start_times_seconds, al.character_end_times_seconds);
    }
    
    // Return base64 directly to the client instead of uploading to Supabase
    return { base64: j.audio_base64, mimeType: "audio/mpeg", wordTimings };
  });
