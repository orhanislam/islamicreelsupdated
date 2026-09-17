/**
 * Theological respect and Tawheed sanitizer module:
 * Enforces highest adab and authentic theological accuracy for Allah's attributes and titles.
 * Eliminates erroneous, diminutive or disrespectful machine phrasing (e.g. "единичкият/единичния Творец")
 * and replaces them with the correct Islamic Bulgarian title: "Единственият/Единствения Творец".
 */

export function sanitizeTheologicalRespect(text: string): string {
  if (!text) return "";
  let s = text;

  const bStart = "(?<![а-яА-ЯёЁa-zA-Z0-9])";
  const bEnd = "(?![а-яА-ЯёЁa-zA-Z0-9])";

  // 1. Phrases with Творец
  s = s.replace(new RegExp(`${bStart}единички(ят|я)\\s+творец${bEnd}`, "gi"), (_, art) => {
    return art.toLowerCase() === "ят" ? "Единственият Творец" : "Единствения Творец";
  });
  s = s.replace(new RegExp(`${bStart}единични(ят|я)\\s+творец${bEnd}`, "gi"), (_, art) => {
    return art.toLowerCase() === "ят" ? "Единственият Творец" : "Единствения Творец";
  });
  s = s.replace(new RegExp(`${bStart}единич(?:ък|ен)\\s+творец${bEnd}`, "gi"), () => "Единствен Творец");

  // 2. Phrases with Създател, Бог, Господ, Владетел, Покровител
  s = s.replace(new RegExp(`${bStart}единички(ят|я)\\s+(създател|бог|господ|владетел|покровител)${bEnd}`, "gi"), (_, art, title) => {
    const capTitle = title[0].toUpperCase() + title.slice(1);
    const adj = art.toLowerCase() === "ят" ? "Единственият" : "Единствения";
    return adj + " " + capTitle;
  });
  s = s.replace(new RegExp(`${bStart}единични(ят|я)\\s+(създател|бог|господ|владетел|покровител)${bEnd}`, "gi"), (_, art, title) => {
    const capTitle = title[0].toUpperCase() + title.slice(1);
    const adj = art.toLowerCase() === "ят" ? "Единственият" : "Единствения";
    return adj + " " + capTitle;
  });
  s = s.replace(new RegExp(`${bStart}единич(?:ък|ен)\\s+(създател|бог|господ|владетел|покровител)${bEnd}`, "gi"), (_, title) => {
    const capTitle = title[0].toUpperCase() + title.slice(1);
    return "Единствен " + capTitle;
  });

  // 3. Phrases with Аллах
  s = s.replace(new RegExp(`${bStart}единички(ят|я)\\s+аллах${bEnd}`, "gi"), (_, art) => {
    const adj = art.toLowerCase() === "ят" ? "Единственият" : "Единствения";
    return adj + " Аллах";
  });
  s = s.replace(new RegExp(`${bStart}единични(ят|я)\\s+аллах${bEnd}`, "gi"), (_, art) => {
    const adj = art.toLowerCase() === "ят" ? "Единственият" : "Единствения";
    return adj + " Аллах";
  });

  // 4. Standalone diminutive "единичкият" / "единичния" -> "Единственият" / "Единствения"
  s = s.replace(new RegExp(`${bStart}единички(ят|я)${bEnd}`, "gi"), (m, art) => {
    const isCap = m[0] === m[0].toUpperCase();
    const res = art.toLowerCase() === "ят" ? "Единственият" : "Единствения";
    return isCap ? res : res.charAt(0).toLowerCase() + res.slice(1);
  });
  s = s.replace(new RegExp(`${bStart}единични(ят|я)${bEnd}`, "gi"), (m, art) => {
    const isCap = m[0] === m[0].toUpperCase();
    const res = art.toLowerCase() === "ят" ? "Единственият" : "Единствения";
    return isCap ? res : res.charAt(0).toLowerCase() + res.slice(1);
  });
  s = s.replace(new RegExp(`${bStart}единич(?:ък|ен)${bEnd}`, "gi"), (m) => {
    const isCap = m[0] === m[0].toUpperCase();
    return isCap ? "Единствен" : "единствен";
  });
  s = s.replace(new RegExp(`${bStart}единич(?:ка|на)(та)?${bEnd}`, "gi"), (m, def) => {
    const isCap = m[0] === m[0].toUpperCase();
    const res = def ? "Единствената" : "Единствена";
    return isCap ? res : res.charAt(0).toLowerCase() + res.slice(1);
  });
  s = s.replace(new RegExp(`${bStart}единич(?:ко|но)(то)?${bEnd}`, "gi"), (m, def) => {
    const isCap = m[0] === m[0].toUpperCase();
    const res = def ? "Единственото" : "Единствено";
    return isCap ? res : res.charAt(0).toLowerCase() + res.slice(1);
  });
  s = s.replace(new RegExp(`${bStart}единич(?:ки|ни)(те)?${bEnd}`, "gi"), (m, def) => {
    const isCap = m[0] === m[0].toUpperCase();
    const res = def ? "Единствените" : "Единствени";
    return isCap ? res : res.charAt(0).toLowerCase() + res.slice(1);
  });

  // 5. Reverence for Allah: strictly eliminate casual "оня" when referring to the Creator
  s = s
    .replace(/(?:търси|иска|зове|напомня\s+за)\s+оня\b/gi, "$1 своя Създател")
    .replace(/(?<=^|[^\p{L}\p{N}])оня(?=[^\p{L}\p{N}]|$)/gui, "Аллах Всевишният")
    .replace(/(?<=^|[^\p{L}\p{N}])тоя(?=[^\p{L}\p{N}]|$)/gui, "този");

  return s;
}
