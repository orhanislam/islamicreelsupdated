import { z } from "zod";

export const WordTimingSchema = z.object({
  word: z.string().min(1, "Думата не може да е празна"),
  start: z.number().min(0, "Началото трябва да е положително"),
  end: z.number().min(0, "Краят трябва да е положителен"),
});

export type ValidatedWordTiming = z.infer<typeof WordTimingSchema>;

export interface SyncVerificationResult {
  valid: boolean;
  correctedTimings: ValidatedWordTiming[];
  maxDriftMs: number;
  warnings: string[];
}

/**
 * Verifies and corrects audio-subtitle synchronization to guarantee 0 drift bugs.
 * Strictly clamps end times to total audio duration and prevents overlapping timestamps.
 */
export function verifyAndCorrectSubtitleSync(
  rawTimings: any[],
  totalAudioDurationSec: number
): SyncVerificationResult {
  const warnings: string[] = [];
  const correctedTimings: ValidatedWordTiming[] = [];
  let maxDriftMs = 0;

  if (!Array.isArray(rawTimings) || rawTimings.length === 0) {
    return {
      valid: false,
      correctedTimings: [],
      maxDriftMs: 0,
      warnings: ["Няма предоставени субтитри за синхронизация"],
    };
  }

  const safeMaxDur = Math.max(0.1, Number(totalAudioDurationSec) || 15);

  // Step 1: Parse all valid raw timings
  const parsed: { word: string; start: number; end: number }[] = [];
  for (let i = 0; i < rawTimings.length; i++) {
    const raw = rawTimings[i];
    const parseRes = WordTimingSchema.safeParse({
      word: String(raw?.word ?? "").trim() || "...",
      start: Number(raw?.start ?? 0),
      end: Number(raw?.end ?? 0),
    });
    if (parseRes.success) {
      let { word, start, end } = parseRes.data;
      if (end <= start) end = start + 0.3;
      parsed.push({ word, start, end });
    } else {
      warnings.push(`Дума #${i + 1} имаше невалиден таймстемп.`);
    }
  }

  if (parsed.length === 0) {
    return { valid: false, correctedTimings: [], maxDriftMs: 0, warnings };
  }

  // Step 2: Only compress if lastEnd exceeds safeMaxDur + 0.15 (to prevent out-of-bounds subtitles).
  // NEVER stretch when lastEnd < safeMaxDur because trailing silence or background music must not delay spoken word timings!
  const lastEnd = parsed[parsed.length - 1].end;
  const stretchRatio = (lastEnd > safeMaxDur + 0.15)
    ? safeMaxDur / lastEnd
    : 1;

  if (stretchRatio !== 1) {
    warnings.push(`Синхронизиране на темпото: коефициент ${stretchRatio.toFixed(3)} за точно съвпадение с аудиото (${safeMaxDur.toFixed(2)}s)`);
  }

  for (let i = 0; i < parsed.length; i++) {
    let word = parsed[i].word;
    let start = parsed[i].start * stretchRatio;
    let end = parsed[i].end * stretchRatio;

    // Prevent overlap with previous word
    if (correctedTimings.length > 0) {
      const prev = correctedTimings[correctedTimings.length - 1];
      if (start < prev.end) {
        const drift = Math.round((prev.end - start) * 1000);
        if (drift > maxDriftMs) maxDriftMs = drift;
        start = prev.end;
        if (end <= start) end = start + 0.16;
      } else if (start - prev.end > 0 && start - prev.end <= 0.22) {
        // PRO STUDIO GAP SMOOTHING: If gap between words is <= 220ms, bridge prev.end to start
        // This eliminates distracting 50-200ms screen flicker between words in the same spoken phrase!
        prev.end = Number(start.toFixed(3));
      }
    }

    // Strictly clamp within audio bounds
    if (start >= safeMaxDur) {
      start = Math.max(0, safeMaxDur - 0.2);
      end = safeMaxDur;
    }
    if (end > safeMaxDur) {
      end = safeMaxDur;
    }

    correctedTimings.push({
      word,
      start: Number(start.toFixed(3)),
      end: Number(end.toFixed(3)),
    });
  }

  return {
    valid: warnings.length === 0,
    correctedTimings,
    maxDriftMs,
    warnings,
  };
}

/**
 * Bulk shifts all subtitle timestamps by offsetSec (+/-).
 * Automatically clamps to >= 0 and <= maxDurationSec.
 */
export function shiftAllTimings(
  timings: ValidatedWordTiming[],
  offsetSec: number,
  maxDurationSec: number = 600
): ValidatedWordTiming[] {
  if (!Array.isArray(timings) || timings.length === 0) return [];
  const shifted = timings.map((t) => {
    let start = Math.max(0, t.start + offsetSec);
    let end = Math.max(start + 0.1, t.end + offsetSec);
    if (start >= maxDurationSec) {
      start = Math.max(0, maxDurationSec - 0.2);
      end = maxDurationSec;
    }
    if (end > maxDurationSec) {
      end = maxDurationSec;
    }
    return {
      word: t.word,
      start: Number(start.toFixed(3)),
      end: Number(end.toFixed(3)),
    };
  });
  return verifyAndCorrectSubtitleSync(shifted, maxDurationSec).correctedTimings;
}

/**
 * Format seconds into SRT (HH:MM:SS,mmm) or VTT (HH:MM:SS.mmm) timestamp.
 */
function formatSubtitleTime(secs: number, separator: "," | "." = ","): string {
  const totalMs = Math.max(0, Math.round(secs * 1000));
  const ms = totalMs % 1000;
  const totalS = Math.floor(totalMs / 1000);
  const s = totalS % 60;
  const totalM = Math.floor(totalS / 60);
  const m = totalM % 60;
  const h = Math.floor(totalM / 60);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}${separator}${ms.toString().padStart(3, "0")}`;
}

/**
 * Export word timings to standard SubRip (.SRT) format.
 */
export function exportToSRT(timings: ValidatedWordTiming[]): string {
  if (!Array.isArray(timings) || timings.length === 0) return "";
  return timings
    .map((t, idx) => {
      const srtStart = formatSubtitleTime(t.start, ",");
      const srtEnd = formatSubtitleTime(t.end, ",");
      return `${idx + 1}\n${srtStart} --> ${srtEnd}\n${t.word}\n`;
    })
    .join("\n");
}

/**
 * Export word timings to standard WebVTT (.VTT) format.
 */
export function exportToVTT(timings: ValidatedWordTiming[]): string {
  if (!Array.isArray(timings) || timings.length === 0) return "WEBVTT\n\n";
  const blocks = timings
    .map((t, idx) => {
      const vttStart = formatSubtitleTime(t.start, ".");
      const vttEnd = formatSubtitleTime(t.end, ".");
      return `${idx + 1}\n${vttStart} --> ${vttEnd}\n${t.word}`;
    })
    .join("\n\n");
  return `WEBVTT\n\n${blocks}\n`;
}

/**
 * Parse standard .SRT or .VTT content into ValidatedWordTiming[].
 * Supports both comma (HH:MM:SS,mmm) and dot (HH:MM:SS.mmm) timestamps.
 */
export function parseSRT(content: string): ValidatedWordTiming[] {
  if (!content || typeof content !== "string") return [];
  const lines = content
    .replace(/WEBVTT[^\n]*/gi, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n");

  const timings: ValidatedWordTiming[] = [];
  const timeRegex = /([0-9]{1,2}:[0-9]{2}:[0-9]{2}[,/.][0-9]{2,3}|[0-9]{1,2}:[0-9]{2}[,/.][0-9]{2,3})\s*-->\s*([0-9]{1,2}:[0-9]{2}:[0-9]{2}[,/.][0-9]{2,3}|[0-9]{1,2}:[0-9]{2}[,/.][0-9]{2,3})/;

  const parseToSec = (timeStr: string): number => {
    const clean = timeStr.replace(/,/g, ".");
    const parts = clean.split(":");
    if (parts.length === 3) {
      const h = parseFloat(parts[0]) || 0;
      const m = parseFloat(parts[1]) || 0;
      const s = parseFloat(parts[2]) || 0;
      return h * 3600 + m * 60 + s;
    } else if (parts.length === 2) {
      const m = parseFloat(parts[0]) || 0;
      const s = parseFloat(parts[1]) || 0;
      return m * 60 + s;
    }
    return parseFloat(clean) || 0;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const match = timeRegex.exec(line);
    if (match) {
      const start = parseToSec(match[1]);
      const end = parseToSec(match[2]);
      // Next non-empty line is the word/text
      let textLine = "";
      let j = i + 1;
      while (j < lines.length && lines[j].trim() !== "" && !/^[0-9]+$/.test(lines[j].trim())) {
        if (textLine) textLine += " ";
        textLine += lines[j].trim();
        j++;
      }
      if (textLine) {
        timings.push({
          word: textLine,
          start: Number(start.toFixed(3)),
          end: Number(Math.max(start + 0.1, end).toFixed(3)),
        });
      }
      i = j - 1;
    }
  }

  return timings;
}
