import { createServerFn } from "@tanstack/react-start";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";

const execFileAsync = promisify(execFile);
const ffmpegPath = ffmpegInstaller.path;

export type SpeechInterval = {
  start: number;
  end: number;
};

export type TimedItem = {
  start: number;
  end: number;
  [key: string]: any;
};

/**
 * Runs acoustic silence detection on an audio file or data/remote URL
 * and returns precisely detected active speech intervals (excluding silent gaps).
 */
export async function detectSpeechIntervals(
  audioUrlOrBase64: string,
  silenceThresholdDb = -33,
  minSilenceDurationSec = 0.15
): Promise<SpeechInterval[]> {
  let tmpPath = "";
  let isTemp = false;

  try {
    if (audioUrlOrBase64.startsWith("data:audio/")) {
      const base64Data = audioUrlOrBase64.split(",")[1];
      const BufferMod = (await import("node:buffer")).Buffer;
      const buf = BufferMod.from(base64Data, "base64");
      tmpPath = path.join(os.tmpdir(), `align_audio_${Date.now()}_${Math.random().toString(36).slice(2)}.mp3`);
      await fs.writeFile(tmpPath, buf);
      isTemp = true;
    } else {
      tmpPath = audioUrlOrBase64;
    }

    const { stderr } = await execFileAsync(ffmpegPath, [
      "-i", tmpPath,
      "-af", `silencedetect=noise=${silenceThresholdDb}dB:d=${minSilenceDurationSec}`,
      "-f", "null",
      "-"
    ]);

    const silenceStarts: number[] = [];
    const silenceEnds: number[] = [];

    const lines = stderr.split("\n");
    for (const line of lines) {
      const startMatch = line.match(/silence_start:\s*([\d.]+)/);
      if (startMatch) {
        silenceStarts.push(parseFloat(startMatch[1]));
      }
      const endMatch = line.match(/silence_end:\s*([\d.]+)/);
      if (endMatch) {
        silenceEnds.push(parseFloat(endMatch[1]));
      }
    }

    // Also extract total audio duration from metadata
    let totalDuration = 0;
    const durationMatch = stderr.match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
    if (durationMatch) {
      totalDuration =
        parseInt(durationMatch[1], 10) * 3600 +
        parseInt(durationMatch[2], 10) * 60 +
        parseFloat(durationMatch[3]);
    }

    // Construct active speech intervals between silences
    const speechIntervals: SpeechInterval[] = [];
    let currentSpeechStart = 0;

    for (let i = 0; i < silenceStarts.length; i++) {
      const sStart = silenceStarts[i];
      if (sStart > currentSpeechStart + 0.05) {
        speechIntervals.push({
          start: Math.round(currentSpeechStart * 1000) / 1000,
          end: Math.round(sStart * 1000) / 1000
        });
      }
      currentSpeechStart = silenceEnds[i] || sStart;
    }

    if (totalDuration > currentSpeechStart + 0.05) {
      speechIntervals.push({
        start: Math.round(currentSpeechStart * 1000) / 1000,
        end: Math.round(totalDuration * 1000) / 1000
      });
    }

    return speechIntervals;
  } catch (err) {
    console.error("[audio-align] Failed to detect speech intervals:", err);
    return [];
  } finally {
    if (isTemp && tmpPath) {
      await fs.unlink(tmpPath).catch(() => {});
    }
  }
}

/**
 * Proportionally maps items (words, phrases, or ayahs) onto detected speech intervals
 * so timestamps snap perfectly to speech onset and skip silent pauses.
 */
export function alignTimestampsToSpeech<T extends TimedItem>(
  items: T[],
  speechIntervals: SpeechInterval[]
): T[] {
  if (!items.length || !speechIntervals.length) return items;

  const totalSpeechDuration = speechIntervals.reduce(
    (acc, int) => acc + Math.max(0, int.end - int.start),
    0
  );
  if (totalSpeechDuration <= 0) return items;

  const origStart = items[0].start;
  const origEnd = items[items.length - 1].end;
  const origDuration = Math.max(0.001, origEnd - origStart);

  let prevEnd = 0;

  return items.map((item, idx) => {
    const relStart = Math.max(0, Math.min(1, (item.start - origStart) / origDuration));
    const relEnd = Math.max(0, Math.min(1, (item.end - origStart) / origDuration));

    const targetSpeechStart = relStart * totalSpeechDuration;
    const targetSpeechEnd = Math.max(relEnd * totalSpeechDuration, targetSpeechStart + 0.02);

    const mapToAbsoluteTime = (speechTargetSec: number): number => {
      let accumulated = 0;
      for (const interval of speechIntervals) {
        const span = Math.max(0, interval.end - interval.start);
        if (accumulated + span >= speechTargetSec) {
          const offsetInInterval = speechTargetSec - accumulated;
          return Math.round((interval.start + offsetInInterval) * 1000) / 1000;
        }
        accumulated += span;
      }
      return speechIntervals[speechIntervals.length - 1].end;
    };

    let start = mapToAbsoluteTime(targetSpeechStart);
    let end = mapToAbsoluteTime(targetSpeechEnd);

    if (idx > 0 && start < prevEnd) {
      start = prevEnd;
    }
    if (end <= start) {
      end = Math.round((start + 0.03) * 1000) / 1000;
    }
    prevEnd = end;

    return {
      ...item,
      start,
      end
    };
  });
}

/**
 * Ensures existing timestamps never fall into detected silent gaps.
 */
export function clampToSpeechIntervals<T extends TimedItem>(
  items: T[],
  speechIntervals: SpeechInterval[]
): T[] {
  if (!items.length || !speechIntervals.length) return items;

  return items.map((item) => {
    let { start, end } = item;

    // Check if start falls inside an interval
    const inStartInterval = speechIntervals.some((int) => start >= int.start && start <= int.end);
    if (!inStartInterval) {
      const nextInterval = speechIntervals.find((int) => int.start >= start);
      if (nextInterval) {
        start = nextInterval.start;
      }
    }

    if (end <= start) {
      end = Math.round((start + 0.05) * 1000) / 1000;
    }

    return {
      ...item,
      start,
      end,
    };
  });
}

export const alignAudioTimestamps = createServerFn({ method: "POST" })
  .inputValidator((input: { audioUrl: string; items: TimedItem[] }) => input)
  .handler(async ({ data }) => {
    const intervals = await detectSpeechIntervals(data.audioUrl);
    if (!intervals.length) {
      return { alignedItems: data.items, intervals: [] };
    }
    const alignedItems = alignTimestampsToSpeech(data.items, intervals);
    return { alignedItems, intervals };
  });
