import { createServerFn } from "@tanstack/react-start";

export type WordSegment = { start: number; end: number };

export type AyahData = {
  surah: number;
  ayah: number;
  arabic: string;
  english: string;
  surahName: string;
  audioUrl: string;
  /** Per-Arabic-word timing in seconds, aligned to audioUrl. Empty if unavailable. */
  wordSegments: WordSegment[];
  arabicWordCount: number;
};

const pad = (n: number, l: number) => String(n).padStart(l, "0");

export const fetchAyah = createServerFn({ method: "POST" })
  .inputValidator((input: { surah: number; ayah: number }) => {
    const surah = Math.floor(Number(input.surah));
    const ayah = Math.floor(Number(input.ayah));
    if (!Number.isFinite(surah) || surah < 1 || surah > 114) {
      throw new Error(`Невалидна сура: ${input.surah} (трябва 1–114)`);
    }
    if (!Number.isFinite(ayah) || ayah < 1) {
      throw new Error(`Невалиден аят: ${input.ayah}`);
    }
    return { surah, ayah };
  })
  .handler(async ({ data }): Promise<AyahData> => {
    const { surah, ayah } = data;
    const key = `${surah}:${ayah}`;

    const [arRes, enRes, recRes] = await Promise.all([
      fetch(`https://api.alquran.cloud/v1/ayah/${key}/quran-uthmani`),
      fetch(`https://api.alquran.cloud/v1/ayah/${key}/en.muhsinkhan`),
      fetch(`https://api.quran.com/api/v4/quran/recitations/7?verse_key=${key}&fields=segments`).catch(() => null),
    ]);
    if (!arRes.ok || !enRes.ok) throw new Error("Аятът не е намерен");
    const ar = await arRes.json();
    const en = await enRes.json();
    let recData: any = null;
    if (recRes && recRes.ok) {
      recData = await recRes.json().catch(() => null);
    }

    // Mishari Rashid Alafasy recitation from Quran.com API v4 (ID 7) — includes exact
    // millisecond word timestamps (segments) for perfect subtitle synchronization.
    let audioUrl = `https://everyayah.com/data/Yasser_Ad-Dussary_128kbps/${pad(surah, 3)}${pad(ayah, 3)}.mp3`;
    let wordSegments: WordSegment[] = [];

    const audioFile = recData?.audio_files?.[0];
    if (audioFile?.url) {
      audioUrl = audioFile.url.startsWith("http") ? audioFile.url : `https://verses.quran.com/${audioFile.url}`;
      if (Array.isArray(audioFile.segments) && audioFile.segments.length > 0) {
        wordSegments = audioFile.segments.map((s: number[]) => ({
          start: (Number(s[2]) || 0) / 1000,
          end: (Number(s[3]) || 0) / 1000,
        }));
      }
    }

    const arabicText: string = ar.data.text;
    const arabicWordCount = arabicText.split(/\s+/).filter(Boolean).length;

    return {
      surah,
      ayah,
      arabic: arabicText,
      english: en.data.text,
      surahName: ar.data.surah.englishName,
      audioUrl,
      wordSegments,
      arabicWordCount,
    };
  });
