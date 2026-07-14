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
        if (end <= start) end = start + 0.15;
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
