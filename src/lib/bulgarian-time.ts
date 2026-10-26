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
