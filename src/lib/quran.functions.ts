/// <reference path="../types/declarations.d.ts" />
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
  ayahBounds?: { ayah: number; start: number; end: number; arabic: string; english: string; bulgarian?: string }[];
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

async function sliceQuranCdnAudio(audioUrl: string, startSec: number, endSec: number): Promise<{ dataUrl: string; actualDuration: number } | null> {
  try {
    const fs = (await import("node:fs")).promises;
    const os = await import("node:os");
    const path = await import("node:path");
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const execFileAsync = promisify(execFile);
    const mp3Duration = (await import("mp3-duration")).default;

    let ffmpegPath = "ffmpeg";
    try {
      const installerMod = await import("@ffmpeg-installer/ffmpeg");
      const installer = installerMod.default || installerMod;
      if (installer?.path) ffmpegPath = installer.path;
    } catch {
      ffmpegPath = process.platform === "win32" ? "ffmpeg" : "/usr/bin/ffmpeg";
    }

    const tmpSlice = path.join(os.tmpdir(), `quran_slice_${Date.now()}_${Math.random().toString(36).substring(2)}.mp3`);
    const expectedDuration = Math.max(0.1, endSec - startSec);

    // CRITICAL: Use audio filter atrim=start=X:end=Y for 100% sample-accurate
    // slicing. Standard -ss HTTP seeking on MP3 streams seeks to approximate
    // frame headers which introduced 1.5–3 seconds of drift.
    await execFileAsync(ffmpegPath, [
      "-y",
      "-i", audioUrl,
      "-af", `atrim=start=${startSec.toFixed(3)}:end=${endSec.toFixed(3)},asetpts=PTS-STARTPTS`,
      "-c:a", "libmp3lame",
      "-q:a", "2",
      "-loglevel", "error",
      "-nostdin",
      tmpSlice
    ]);

    const buf = await fs.readFile(tmpSlice);
    let actualDuration = expectedDuration;
    try {
      const BufferMod = (await import("node:buffer")).Buffer;
      actualDuration = await mp3Duration(BufferMod.from(buf));
    } catch { /* use expected */ }
    await fs.unlink(tmpSlice).catch(() => {});

    console.log(`[quran-slice] expected=${expectedDuration.toFixed(3)}s actual=${actualDuration.toFixed(3)}s drift=${(actualDuration - expectedDuration).toFixed(3)}s`);

    return {
      dataUrl: `data:audio/mp3;base64,${buf.toString("base64")}`,
      actualDuration,
    };
  } catch (e) {
    console.error("[quran-slice] FFmpeg slice failed:", e);
    return null;
  }
}

async function concatCleanMp3s(buffers: any[]): Promise<any> {
  const BufferMod = (await import("node:buffer")).Buffer;
  if (buffers.length === 0) return BufferMod.from([]);
  if (buffers.length === 1) return buffers[0];

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
      ffmpegPath = "ffmpeg";
    }

    const id = `${Date.now()}_${Math.random().toString(36).substring(2)}`;
    const inputPaths: string[] = [];
    const ffmpegArgs: string[] = ["-y"];

    for (let i = 0; i < buffers.length; i++) {
      const p = path.join(os.tmpdir(), `quran_part_${id}_${i}.mp3`);
      await fs.writeFile(p, buffers[i]);
      inputPaths.push(p);
      ffmpegArgs.push("-i", p);
    }

    const outPath = path.join(os.tmpdir(), `quran_concat_${id}.mp3`);
    ffmpegArgs.push(
      "-filter_complex",
      `concat=n=${buffers.length}:v=0:a=1[out]`,
      "-map", "[out]",
      "-c:a", "libmp3lame",
      "-b:a", "192k",
      "-loglevel", "error",
      outPath
    );

    await execFileAsync(ffmpegPath, ffmpegArgs);
    const resultBuf = await fs.readFile(outPath);

    // Cleanup
    for (const p of inputPaths) await fs.unlink(p).catch(() => {});
    await fs.unlink(outPath).catch(() => {});

    return resultBuf;
  } catch (e) {
    console.warn("[quran-concat] FFmpeg concat failed, falling back to clean header strip:", e);
    const cleaned = buffers.map((buf, i) => {
      if (i === 0) return buf;
      if (buf.length > 10 && buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) {
        const size = ((buf[6] & 0x7f) << 21) | ((buf[7] & 0x7f) << 14) | ((buf[8] & 0x7f) << 7) | (buf[9] & 0x7f);
        const headerLen = 10 + size;
        if (headerLen < buf.length) return buf.subarray(headerLen);
      }
      return buf;
    });
    return BufferMod.concat(cleaned);
  }
}

function getCorrectedVerseTimings(surah: number, ayahNum: number, vt: any) {
  return vt;
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
    const ayahBounds: { ayah: number; start: number; end: number; arabic: string; english: string; bulgarian?: string; segments?: any[] }[] = [];
    const audioBufs: any[] = [];
    let timeOffset = 0;

    let firstAudioUrl = `https://everyayah.com/data/Yasser_Ad-Dussary_128kbps/${pad(surah, 3)}${pad(ayah, 3)}.mp3`;

    // Fetch exact word-level timing segments for Yasser Ad-Dossary (reciter ID 97 on QuranCDN API)
    const quranCdnData = await fetchJsonWithRetry(`https://api.qurancdn.com/api/qdc/audio/reciters/97/audio_files?chapter=${surah}&segments=true`);
    const cdnAudioUrl = quranCdnData?.audio_files?.[0]?.audio_url;
    const cdnTimings = quranCdnData?.audio_files?.[0]?.verse_timings;
    
    const vtStartRaw = cdnTimings?.find((v: any) => v.verse_key === `${surah}:${ayah}`);
    const vtEndRaw = cdnTimings?.find((v: any) => v.verse_key === `${surah}:${ayah + count - 1}`);
    const vtNextRaw = cdnTimings?.find((v: any) => v.verse_key === `${surah}:${ayah + count}`);
    const vtStart = getCorrectedVerseTimings(surah, ayah, vtStartRaw);
    const vtEnd = getCorrectedVerseTimings(surah, ayah + count - 1, vtEndRaw);

    let useCdnSlice = false;
    let cdnBase64Url = "";
    // Correction factor: if the actual sliced audio duration differs from the
    // expected metadata duration, we scale all ayahBounds timestamps so they
    // align with the real audio. A value of 1.0 means no correction needed.
    let cdnTimeScale = 1.0;
    let effectiveStartSec = 0;
    if (cdnAudioUrl && vtStart && vtEnd && vtStart.timestamp_from !== undefined && vtEnd.timestamp_to !== undefined) {
      effectiveStartSec = vtStart.timestamp_from / 1000;
      const rawEndSec = vtEnd.timestamp_to / 1000;
      const nextStartSec = vtNextRaw && vtNextRaw.timestamp_from !== undefined
        ? (vtNextRaw.timestamp_from / 1000) - 0.02
        : rawEndSec + 0.12;
      const endSec = Math.min(rawEndSec + 0.05, nextStartSec);
      const sliced = await sliceQuranCdnAudio(cdnAudioUrl, effectiveStartSec, endSec);
      if (sliced) {
        useCdnSlice = true;
        cdnBase64Url = sliced.dataUrl;
        // Do not scale timestamps by mp3Duration vs expected metadata duration,
        // as FFmpeg atrim slicing is strictly 1:1 sample accurate in time.
        cdnTimeScale = 1.0;
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
      const en = await fetchJsonWithRetry(`https://api.alquran.cloud/v1/ayah/${key}/en.hilali`);
      if (!en || !en.data || !en.data.text) {
        throw new Error(`Преводът за Аят ${i} не е намерен.`);
      }
      const bg = await fetchJsonWithRetry(`https://api.alquran.cloud/v1/ayah/${key}/bg.theophanov`).catch(() => null);
      const bgText = bg && bg.data && bg.data.text ? bg.data.text : en.data.text;

      if (!surahName) surahName = ar.data.surah.englishName;
      arabicList.push(ar.data.text);
      englishList.push(en.data.text);
      const arWords = ar.data.text.split(/\s+/).filter(Boolean);

      if (useCdnSlice) {
        const vtRaw = cdnTimings?.find((v: any) => v.verse_key === key);
        const nextVtRaw = cdnTimings?.find((v: any) => v.verse_key === `${surah}:${i + 1}`);
        const vt = getCorrectedVerseTimings(surah, i, vtRaw);
        const nextVt = getCorrectedVerseTimings(surah, i + 1, nextVtRaw);
        if (vt) {
          const offsetSec = effectiveStartSec;
          let segs: any[] = [];
          if (Array.isArray(vt.segments) && vt.segments.length > 0) {
            segs = vt.segments.map((s: number[], sIdx: number) => ({
              start: Math.max(0, Math.round(((Number(s[1]) / 1000) - offsetSec) * 1000) / 1000),
              end: Math.max(0, Math.round(((Number(s[2]) / 1000) - offsetSec) * 1000) / 1000),
              word: arWords[sIdx] || `ar_${sIdx + 1}`,
            }));
            wordSegments.push(...segs);
          }
          const aStart = Math.max(0, Math.round(((vt.timestamp_from / 1000) - offsetSec) * 1000) / 1000);
          const rawEnd = Math.max(0, Math.round(((vt.timestamp_to / 1000) - offsetSec) * 1000) / 1000);
          const nextStartSec = nextVt ? Math.max(0, Math.round(((nextVt.timestamp_from / 1000) - offsetSec) * 1000) / 1000) : rawEnd;
          const aEnd = nextVt ? Math.min(rawEnd, nextStartSec) : rawEnd;
          ayahBounds.push({ ayah: i, start: aStart, end: aEnd, arabic: ar.data.text, english: en.data.text, bulgarian: bgText, segments: segs });
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
        ayahBounds.push({ ayah: i, start: aStart, end: aEnd, arabic: ar.data.text, english: en.data.text, bulgarian: bgText, segments: segs });
      }
    }

    const arabicText = arabicList.join(" ۝ ");
    const englishText = englishList.join(" ");
    const arabicWordCount = arabicText.split(/\s+/).filter(Boolean).length;

    let audioUrl = useCdnSlice ? cdnBase64Url : firstAudioUrl;
    if (!useCdnSlice && count > 1 && audioBufs.length > 0) {
      const combined = await concatCleanMp3s(audioBufs);
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
