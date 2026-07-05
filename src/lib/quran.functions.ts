import { createServerFn } from "@tanstack/react-start";

export type WordSegment = { start: number; end: number };

export type AyahData = {
  surah: number;
  ayah: number;
  ayahEnd?: number;
  arabic: string;
  english: string;
  surahName: string;
  audioUrl: string;
  /** Per-Arabic-word timing in seconds, aligned to audioUrl. Empty if unavailable. */
  wordSegments: WordSegment[];
  arabicWordCount: number;
};

const pad = (n: number, l: number) => String(n).padStart(l, "0");

async function fetchJsonWithRetry(url: string, retries = 2): Promise<any> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch (e) {
      if (attempt === retries) return null;
      await new Promise(r => setTimeout(r, 300 * (attempt + 1)));
    }
  }
  return null;
}

async function fetchBufferWithRetry(url: string, retries = 2): Promise<ArrayBuffer | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.arrayBuffer();
    } catch (e) {
      if (attempt === retries) return null;
      await new Promise(r => setTimeout(r, 300 * (attempt + 1)));
    }
  }
  return null;
}

export const fetchAyah = createServerFn({ method: "POST" })
  .inputValidator((input: { surah: number; ayah: number; ayahEnd?: number }) => {
    const surah = Math.floor(Number(input.surah));
    const ayah = Math.floor(Number(input.ayah));
    let ayahEnd = input.ayahEnd !== undefined && input.ayahEnd !== null && String(input.ayahEnd) !== ""
      ? Math.floor(Number(input.ayahEnd))
      : ayah;
    if (!Number.isFinite(surah) || surah < 1 || surah > 114) {
      throw new Error(`Невалидна сура: ${input.surah} (трябва 1–114)`);
    }
    if (!Number.isFinite(ayah) || ayah < 1) {
      throw new Error(`Невалиден аят: ${input.ayah}`);
    }
    if (!Number.isFinite(ayahEnd) || ayahEnd < ayah) {
      ayahEnd = ayah;
    }
    if (ayahEnd - ayah > 10) {
      throw new Error("Моля, избери интервал от най-много 10 аята за едно видео.");
    }
    return { surah, ayah, ayahEnd };
  })
  .handler(async ({ data }): Promise<AyahData> => {
    const { surah, ayah, ayahEnd } = data;
    const count = (ayahEnd && ayahEnd > ayah) ? (ayahEnd - ayah + 1) : 1;

    const mp3Duration = (await import("mp3-duration")).default;
    const BufferMod = (await import("node:buffer")).Buffer;

    const arabicList: string[] = [];
    const englishList: string[] = [];
    let surahName = "";
    let wordSegments: WordSegment[] = [];
    const audioBufs: any[] = [];
    let timeOffset = 0;

    // Sequential fetching with retries to prevent connection limits and 'fetch failed' errors
    for (let idx = 0; idx < count; idx++) {
      const i = ayah + idx;
      const key = `${surah}:${i}`;
      const dossariUrl = `https://everyayah.com/data/Yasser_Ad-Dussary_128kbps/${pad(surah, 3)}${pad(i, 3)}.mp3`;

      const ar = await fetchJsonWithRetry(`https://api.alquran.cloud/v1/ayah/${key}/quran-uthmani`);
      if (!ar || !ar.data || !ar.data.text) {
        throw new Error(`Аят ${i} не може да бъде изтеглен (грешка при свързване със сървъра на Корана). Моля, опитай отново.`);
      }
      const en = await fetchJsonWithRetry(`https://api.alquran.cloud/v1/ayah/${key}/en.muhsinkhan`);
      if (!en || !en.data || !en.data.text) {
        throw new Error(`Преводът за Аят ${i} не е намерен.`);
      }
      const recData = await fetchJsonWithRetry(`https://api.quran.com/api/v4/quran/recitations/7?verse_key=${key}&fields=segments`);
      const audioArrayBuf = await fetchBufferWithRetry(dossariUrl);

      if (!surahName) surahName = ar.data.surah.englishName;
      arabicList.push(ar.data.text);
      englishList.push(en.data.text);

      let dur = 0;
      if (audioArrayBuf) {
        const buf = BufferMod.from(audioArrayBuf);
        audioBufs.push(buf);
        try {
          dur = await mp3Duration(buf);
        } catch { /* ignore */ }
      }

      const audioFile = recData?.audio_files?.[0];
      let segs: WordSegment[] = [];
      if (audioFile && Array.isArray(audioFile.segments) && audioFile.segments.length > 0) {
        segs = audioFile.segments.map((s: number[]) => ({
          start: (Number(s[2]) || 0) / 1000 + timeOffset,
          end: (Number(s[3]) || 0) / 1000 + timeOffset,
        }));
      }
      wordSegments.push(...segs);

      if (dur > 0) {
        timeOffset += dur;
      } else if (segs.length > 0) {
        timeOffset = segs[segs.length - 1].end;
      } else {
        timeOffset += 10;
      }
    }

    const arabicText = arabicList.join(" ۝ ");
    const englishText = englishList.join(" ");
    const arabicWordCount = arabicText.split(/\s+/).filter(Boolean).length;

    let audioUrl = `https://everyayah.com/data/Yasser_Ad-Dussary_128kbps/${pad(surah, 3)}${pad(ayah, 3)}.mp3`;
    if (count > 1 && audioBufs.length > 0) {
      const combined = BufferMod.concat(audioBufs);
      audioUrl = `data:audio/mp3;base64,${combined.toString("base64")}`;
    }

    return {
      surah,
      ayah,
      ayahEnd: count > 1 ? ayahEnd : undefined,
      arabic: arabicText,
      english: englishText,
      surahName,
      audioUrl,
      wordSegments,
      arabicWordCount,
    };
  });
