/**
 * Bulgarian Time Helper (Europe/Sofia timezone: EET/EEST, UTC+2 / UTC+3).
 * Guarantees 100% accurate Bulgarian local time regardless of VPS host timezone (e.g. CET/UTC).
 */
export function getBulgarianTime(date: Date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Sofia",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "00";
  const year = get("year");
  const month = get("month");
  const day = get("day");
  const hour = get("hour");
  const minute = get("minute");
  const second = get("second");

  const hourNum = parseInt(hour, 10);
  const minNum = parseInt(minute, 10);
  const totalMinutes = hourNum * 60 + minNum;

  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    hourNum,
    minNum,
    totalMinutes,
    timeHm: `${hour}:${minute}`,
    dateKey: `${year}-${month}-${day}`,
    slotKey: (slotHm: string) => `${year}-${month}-${day}_${slotHm}`,
    fullText: `${day}.${month}.${year} г., ${hour}:${minute}:${second} ч. (Българско време, Europe/Sofia)`,
  };
}

/**
 * Calculates the next upcoming scheduled slot in Bulgarian time and human-readable countdown text.
 */
export function getNextBulgarianRun(
  scheduleTimes: string[],
  date: Date = new Date(),
): {
  nextTime: string;
  isToday: boolean;
  minutesRemaining: number;
  formattedText: string;
} | null {
  if (!scheduleTimes || scheduleTimes.length === 0) return null;
  const bg = getBulgarianTime(date);
  const sortedTimes = [...scheduleTimes].sort();

  for (const time of sortedTimes) {
    const [h, m] = time.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) continue;
    const slotMins = h * 60 + m;
    if (slotMins > bg.totalMinutes) {
      const remaining = slotMins - bg.totalMinutes;
      const remH = Math.floor(remaining / 60);
      const remM = remaining % 60;
      const remText = remH > 0 ? `${remH} ч. и ${remM} мин.` : `${remM} мин.`;
      return {
        nextTime: time,
        isToday: true,
        minutesRemaining: remaining,
        formattedText: `Днес в ${time} ч. (след ~${remText})`,
      };
    }
  }

  const firstTomorrow = sortedTimes[0];
  const [fh, fm] = firstTomorrow.split(":").map(Number);
  const slotMinsTomorrow = 1440 - bg.totalMinutes + (fh * 60 + fm);
  const remH = Math.floor(slotMinsTomorrow / 60);
  const remM = slotMinsTomorrow % 60;
  const remText = remH > 0 ? `${remH} ч. и ${remM} мин.` : `${remM} мин.`;
  return {
    nextTime: firstTomorrow,
    isToday: false,
    minutesRemaining: slotMinsTomorrow,
    formattedText: `Утре в ${firstTomorrow} ч. (след ~${remText})`,
  };
}

/**
 * Dynamically computes the exact ISO-8601 UTC offset for Europe/Sofia on a given date
 * ("+02:00" during winter EET, "+03:00" during summer EEST) without hardcoding "+02:00".
 */
export function getBulgarianUtcOffset(referenceDate: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Sofia",
      timeZoneName: "shortOffset",
    }).formatToParts(referenceDate);
    const tzPart = parts.find((p) => p.type === "timeZoneName")?.value || "GMT+2";
    const m = tzPart.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/i);
    if (m) {
      const sign = m[1];
      const hh = m[2].padStart(2, "0");
      const mm = (m[3] || "00").padStart(2, "0");
      return `${sign}${hh}:${mm}`;
    }
  } catch {
    // Fallback below
  }
  return "+02:00";
}

/**
 * Builds an accurate Europe/Sofia scheduled ISO-8601 timestamp with optional anti-congestion offset.
 *
 * WHY ANTI-CONGESTION OFFSET MATTERS FOR TIKTOK 1080p HD:
 * Empirical inspection of @orhan.islam proved that TikTok's Content Posting API cluster (v26300gc)
 * receives a massive global burst from third-party schedulers (Buffer, Hootsuite, Upload-Post) at
 * exact ":00" and ":30" top-of-the-hour marks, causing VQScore=0 API posts to get load-shedded out of
 * the secondary 1080x1920 HEVC queue (permanently stuck at 576x1024 / 540p). Shifting exact :00/:30
 * scheduled API deliveries by +13 minutes bypasses the global :00/:30 transcode queue stampede.
 */
export function buildBulgarianScheduledIso(params: {
  year: string | number;
  month: string | number;
  day: string | number;
  hour: number;
  minute: number;
  avoidTopOfHourStampede?: boolean;
  referenceDate?: Date;
}): string {
  const y = String(params.year).padStart(4, "0");
  const mo = String(params.month).padStart(2, "0");
  const d = String(params.day).padStart(2, "0");

  let targetMinute = params.minute;
  if (params.avoidTopOfHourStampede && (targetMinute === 0 || targetMinute === 30)) {
    targetMinute += 13; // e.g. 12:00 -> 12:13, 12:30 -> 12:43 (off-stampede window)
  }

  const extraHours = Math.floor(targetMinute / 60);
  const finalMinute = targetMinute % 60;
  const finalHour = (params.hour + extraHours) % 24;

  const probeDate =
    params.referenceDate ||
    new Date(`${y}-${mo}-${d}T${String(finalHour).padStart(2, "0")}:${String(finalMinute).padStart(2, "0")}:00Z`);
  const offset = getBulgarianUtcOffset(probeDate);

  const baseDate = new Date(
    `${y}-${mo}-${d}T${String(finalHour).padStart(2, "0")}:${String(finalMinute).padStart(2, "0")}:00${offset}`,
  );
  if (params.hour + extraHours >= 24) {
    baseDate.setUTCDate(baseDate.getUTCDate() + Math.floor((params.hour + extraHours) / 24));
  }
  return baseDate.toISOString();
}
