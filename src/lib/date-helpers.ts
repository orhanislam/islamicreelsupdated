const MONTHS_LONG = [
  "януари", "февруари", "март", "април", "май", "юни",
  "юли", "август", "септември", "октомври", "ноември", "декември",
];
const MONTHS_SHORT = [
  "яну", "фев", "мар", "апр", "май", "юни",
  "юли", "авг", "сеп", "окт", "ное", "дек",
];
const WEEKDAYS_SHORT = [
  "нед", "пон", "вт", "ср", "чт", "пт", "сб",
];

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function formatMonthYear(d: Date) {
  return `${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatTimeHM(d: Date) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function formatDayMonth(d: Date) {
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}`;
}

export function formatShortDateTime(d: Date) {
  const wd = WEEKDAYS_SHORT[d.getDay()];
  const day = pad2(d.getDate());
  const month = MONTHS_SHORT[d.getMonth()];
  const time = formatTimeHM(d);
  return `${wd}, ${day} ${month}, ${time}`;
}

export function formatFullDateTime(d: Date) {
  const day = pad2(d.getDate());
  const month = MONTHS_SHORT[d.getMonth()];
  const time = formatTimeHM(d);
  return `${day} ${month} ${d.getFullYear()}, ${time}`;
}
