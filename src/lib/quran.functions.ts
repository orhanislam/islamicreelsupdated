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
  ayahBounds?: { ayah: number; start: number; end: number; arabic: string; english: string }[];
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

async function sliceQuranCdnAudio(audioUrl: string, startSec: number, endSec: number): Promise<string | null> {
  try {
    const fs = (await import("node:fs")).promises;
    const os = await import("node:os");
    const path = await import("node:path");
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const execFileAsync = promisify(execFile);

    let ffmpegPath = "ffmpeg";
    try {
      const installerMod = await import("@ffmpeg-installer/ffmpeg");
      const installer = installerMod.default || installerMod;
      if (installer?.path) ffmpegPath = installer.path;
    } catch {
      ffmpegPath = process.platform === "win32" ? "ffmpeg" : "/usr/bin/ffmpeg";
    }

    const tmpSlice = path.join(os.tmpdir(), `quran_slice_${Date.now()}_${Math.random().toString(36).substring(2)}.mp3`);
    const durationSec = Math.max(0.1, endSec - startSec);
    await execFileAsync(ffmpegPath, [
      "-y",
      "-ss", startSec.toFixed(3),
      "-i", audioUrl,
      "-t", durationSec.toFixed(3),
      "-c:a", "libmp3lame",
      "-q:a", "2",
      "-loglevel", "error",
      "-nostdin",
      tmpSlice
    ]);

    const buf = await fs.readFile(tmpSlice);
    await fs.unlink(tmpSlice).catch(() => {});
    return `data:audio/mp3;base64,${buf.toString("base64")}`;
  } catch (e) {
    console.error("[quran-slice] FFmpeg slice failed:", e);
    return null;
  }
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
    const count = ayahEnd - ayah + 1;

    const mp3Duration = (await import("mp3-duration")).default;
    const BufferMod = (await import("node:buffer")).Buffer;

    const arabicList: string[] = [];
    const englishList: string[] = [];
    let surahName = "";
    let wordSegments: WordSegment[] = [];
    const ayahBounds: { ayah: number; start: number; end: number; arabic: string; english: string }[] = [];
    const audioBufs: any[] = [];
    let timeOffset = 0;

    let firstAudioUrl = `https://everyayah.com/data/Yasser_Ad-Dussary_128kbps/${pad(surah, 3)}${pad(ayah, 3)}.mp3`;

    // Fetch exact word-level timing segments for Yasser Ad-Dossary (reciter ID 97 on QuranCDN API)
    const quranCdnData = await fetchJsonWithRetry(`https://api.qurancdn.com/api/qdc/audio/reciters/97/audio_files?chapter=${surah}&segments=true`);
    const cdnAudioUrl = quranCdnData?.audio_files?.[0]?.audio_url;
    const cdnTimings = quranCdnData?.audio_files?.[0]?.verse_timings;
    const vtStart = cdnTimings?.find((v: any) => v.verse_key === `${surah}:${ayah}`);
    const vtEnd = cdnTimings?.find((v: any) => v.verse_key === `${surah}:${ayah + count - 1}`);

    let useCdnSlice = false;
    let cdnBase64Url = "";
    if (cdnAudioUrl && vtStart && vtEnd && vtStart.timestamp_from !== undefined && vtEnd.timestamp_to !== undefined) {
      const startSec = vtStart.timestamp_from / 1000;
      const endSec = vtEnd.timestamp_to / 1000;
      const sliced = await sliceQuranCdnAudio(cdnAudioUrl, startSec, endSec);
      if (sliced) {
        useCdnSlice = true;
        cdnBase64Url = sliced;
      }
    }

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

      if (!surahName) surahName = ar.data.surah.englishName;
      arabicList.push(ar.data.text);
      englishList.push(en.data.text);
      const arWords = ar.data.text.split(/\s+/).filter(Boolean);

      if (useCdnSlice) {
        const vt = cdnTimings?.find((v: any) => v.verse_key === key);
        if (vt) {
          const offsetSec = vtStart.timestamp_from / 1000;
          if (Array.isArray(vt.segments) && vt.segments.length > 0) {
            const segs = vt.segments.map((s: number[], sIdx: number) => ({
              start: Math.round(((Number(s[1]) / 1000) - offsetSec) * 1000) / 1000,
              end: Math.round(((Number(s[2]) / 1000) - offsetSec) * 1000) / 1000,
              word: arWords[sIdx] || `ar_${sIdx + 1}`,
            }));
            wordSegments.push(...segs);
          }
          const aStart = Math.round(((vt.timestamp_from / 1000) - offsetSec) * 1000) / 1000;
          const aEnd = Math.round(((vt.timestamp_to / 1000) - offsetSec) * 1000) / 1000;
          ayahBounds.push({ ayah: i, start: aStart, end: aEnd, arabic: ar.data.text, english: en.data.text });
        }
      } else {
        const audioUrlToFetch = defaultDossaryUrl;
        if (idx === 0) firstAudioUrl = audioUrlToFetch;
        const audioArrayBuf = await fetchBufferWithRetry(audioUrlToFetch);

        let dur = 0;
        if (audioArrayBuf) {
          const buf = BufferMod.from(audioArrayBuf);
          audioBufs.push(buf);
          try {
            dur = await mp3Duration(buf);
          } catch { /* ignore */ }
        }

        const aStart = timeOffset;
        let segs: WordSegment[] = [];
        const vt = cdnTimings?.find((v: any) => v.verse_key === key);
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
        const aEnd = timeOffset;
        ayahBounds.push({ ayah: i, start: aStart, end: aEnd, arabic: ar.data.text, english: en.data.text });
      }
    }

    const arabicText = arabicList.join(" ۝ ");
    const englishText = englishList.join(" ");
    const arabicWordCount = arabicText.split(/\s+/).filter(Boolean).length;

    let audioUrl = useCdnSlice ? cdnBase64Url : firstAudioUrl;
    if (!useCdnSlice && count > 1 && audioBufs.length > 0) {
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
      ayahBounds,
      arabicWordCount,
    };
  });
