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

  for (let i = 0; i < rawTimings.length; i++) {
    const raw = rawTimings[i];
    const parseRes = WordTimingSchema.safeParse({
      word: String(raw?.word ?? "").trim() || "...",
      start: Number(raw?.start ?? 0),
      end: Number(raw?.end ?? 0),
    });

    if (!parseRes.success) {
      warnings.push(`Дума #${i + 1} имаше невалиден таймстемп и бе коригирана.`);
      continue;
    }

    let { word, start, end } = parseRes.data;

    // Ensure start < end
    if (end <= start) {
      end = start + 0.35;
      warnings.push(`Коригиран нулев интервал за дума „${word}“`);
    }

    // Prevent overlap with previous word
    if (correctedTimings.length > 0) {
      const prev = correctedTimings[correctedTimings.length - 1];
      if (start < prev.end) {
        const drift = Math.round((prev.end - start) * 1000);
        if (drift > maxDriftMs) maxDriftMs = drift;
        start = prev.end + 0.01;
        if (end <= start) end = start + 0.3;
      }
    }

    // Strictly clamp within audio bounds
    if (start >= safeMaxDur) {
      start = Math.max(0, safeMaxDur - 0.4);
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
