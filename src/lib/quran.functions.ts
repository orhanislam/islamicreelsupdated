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

    const [arRes, enRes] = await Promise.all([
      fetch(`https://api.alquran.cloud/v1/ayah/${key}/quran-uthmani`),
      fetch(`https://api.alquran.cloud/v1/ayah/${key}/en.muhsinkhan`),
    ]);
    if (!arRes.ok || !enRes.ok) throw new Error("Аятът не е намерен");
    const ar = await arRes.json();
    const en = await enRes.json();

    // Yasser Al-Dossari (Ad-Dussary) recitation from everyayah.com — reliable
    // CDN with one MP3 per ayah. Quran.com's recitations API does NOT include
    // Al-Dossari, so we use everyayah and fall back to linear word reveal.
    const audioUrl = `https://everyayah.com/data/Yasser_Ad-Dussary_128kbps/${pad(surah, 3)}${pad(ayah, 3)}.mp3`;

    const arabicText: string = ar.data.text;
    const arabicWordCount = arabicText.split(/\s+/).filter(Boolean).length;

    return {
      surah,
      ayah,
      arabic: arabicText,
      english: en.data.text,
      surahName: ar.data.surah.englishName,
      audioUrl,
      wordSegments: [],
      arabicWordCount,
    };
  });
