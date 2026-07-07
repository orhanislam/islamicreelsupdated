import { createServerFn } from "@tanstack/react-start";

export type WordSegment = { start: number; end: number; word?: string };

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

    let firstAudioUrl = `https://everyayah.com/data/Yasser_Ad-Dussary_128kbps/${pad(surah, 3)}${pad(ayah, 3)}.mp3`;

    // Fetch exact word-level timing segments for Yasser Ad-Dossary (reciter ID 97 on QuranCDN API)
    const quranCdnData = await fetchJsonWithRetry(`https://api.qurancdn.com/api/qdc/audio/reciters/97/audio_files?chapter=${surah}&segments=true`);

    // Sequential fetching with retries to prevent connection limits and 'fetch failed' errors
    for (let idx = 0; idx < count; idx++) {
      const i = ayah + idx;
      const key = `${surah}:${i}`;
      const defaultDossaryUrl = `https://everyayah.com/data/Yasser_Ad-Dussary_128kbps/${pad(surah, 3)}${pad(i, 3)}.mp3`;

      const ar = await fetchJsonWithRetry(`https://api.alquran.cloud/v1/ayah/${key}/quran-uthmani`);
      if (!ar || !ar.data || !ar.data.text) {
        throw new Error(`Аят ${i} не може да бъде изтеглен (грешка при свързване със сървъра на Корана). Моля, опитай отново.`);
      }
      const en = await fetchJsonWithRetry(`https://api.alquran.cloud/v1/ayah/${key}/en.muhsinkhan`);
      if (!en || !en.data || !en.data.text) {
        throw new Error(`Преводът за Аят ${i} не е намерен.`);
      }

      const audioUrlToFetch = defaultDossaryUrl;
      if (idx === 0) firstAudioUrl = audioUrlToFetch;
      const audioArrayBuf = await fetchBufferWithRetry(audioUrlToFetch);

      if (!surahName) surahName = ar.data.surah.englishName;
      arabicList.push(ar.data.text);
      englishList.push(en.data.text);
      const arWords = ar.data.text.split(/\s+/).filter(Boolean);

      let dur = 0;
      if (audioArrayBuf) {
        const buf = BufferMod.from(audioArrayBuf);
        audioBufs.push(buf);
        try {
          dur = await mp3Duration(buf);
        } catch { /* ignore */ }
      }

      let segs: WordSegment[] = [];
      const vt = quranCdnData?.audio_files?.[0]?.verse_timings?.find((v: any) => v.verse_key === key);
      if (vt && vt.duration > 0 && Array.isArray(vt.segments) && vt.segments.length > 0) {
        const scale = dur > 0 ? (dur / (vt.duration / 1000)) : 1;
        segs = vt.segments.map((s: number[], sIdx: number) => ({
          start: ((Number(s[1]) - vt.timestamp_from) / 1000) * scale + timeOffset,
          end: ((Number(s[2]) - vt.timestamp_from) / 1000) * scale + timeOffset,
          word: arWords[sIdx] || `ar_${sIdx + 1}`,
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

    let audioUrl = firstAudioUrl;
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
