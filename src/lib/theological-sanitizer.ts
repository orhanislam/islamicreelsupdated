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

  // 6. Professional respectful tone & grammatical gender correction:
  // Corrects machine mistranslations like "вашето Господ" -> "Вашия Господ", "вашето Творец" -> "Вашия Творец", etc.
  // Masculine targets:
  const mascNouns = "(?:господ|господар|творец|създател|аллах|пророк|пратеник|живот|път|ум|избор|дух|иман|сабр|нийет|ниет|грях|дълг|зикр|таухид|тауаккул|намаз|ден|час|дом|брат|баща|син|план|проект|канал|клип|пост|успех|шариат|коран|хадис|порив|стремеж|мир|покой|завет|изпит)";
  const mascAdj = "(?:единствен|духовен|истински|собствен|нов|личен|земен|бъдещ|вечен|всекидневен|ежедневен|дълбок|труден|главен|искрен|добър)";

  s = s.replace(new RegExp(`${bStart}(?:вашето|вашетия)\\s+(${mascAdj})\\s+(${mascNouns})${bEnd}`, "gui"), (_, adj, noun) => {
    return `Вашия ${adj} ${noun}`;
  });
  s = s.replace(new RegExp(`${bStart}(?:вашето|вашетия)\\s+(${mascNouns})${bEnd}`, "gui"), (_, noun) => {
    return `Вашия ${noun}`;
  });
  s = s.replace(new RegExp(`${bStart}твоето\\s+(${mascAdj})\\s+(${mascNouns})${bEnd}`, "gui"), (m, adj, noun) => {
    const isCap = m[0] === m[0].toUpperCase();
    return `${isCap ? "Твоя" : "твоя"} ${adj} ${noun}`;
  });
  s = s.replace(new RegExp(`${bStart}твоето\\s+(${mascNouns})${bEnd}`, "gui"), (m, noun) => {
    const isCap = m[0] === m[0].toUpperCase();
    return `${isCap ? "Твоя" : "твоя"} ${noun}`;
  });

  // Feminine targets:
  const femNouns = "(?:душа|вяра|молитва|молба|дуа|надежда|милост|прошка|скръб|тревога|болка|радост|мъдрост|страница|публикация|мисъл|постъпка|сура|сунна|умма|съдба|награда|истина|благодат|сила|свобода)";
  const femAdj = "(?:единствена|духовна|истинска|собствена|нова|лична|земна|бъдеща|вечна|всекидневна|ежедневна|дълбока|трудна|главна|искрена|добра)";

  s = s.replace(new RegExp(`${bStart}(?:вашето|вашия|вашият)\\s+(${femAdj})\\s+(${femNouns})${bEnd}`, "gui"), (_, adj, noun) => {
    return `Вашата ${adj} ${noun}`;
  });
  s = s.replace(new RegExp(`${bStart}(?:вашето|вашия|вашият)\\s+(${femNouns})${bEnd}`, "gui"), (_, noun) => {
    return `Вашата ${noun}`;
  });
  s = s.replace(new RegExp(`${bStart}(?:твоето|твоя|твоят)\\s+(${femAdj})\\s+(${femNouns})${bEnd}`, "gui"), (m, adj, noun) => {
    const isCap = m[0] === m[0].toUpperCase();
    return `${isCap ? "Твоята" : "твоята"} ${adj} ${noun}`;
  });
  s = s.replace(new RegExp(`${bStart}(?:твоето|твоя|твоят)\\s+(${femNouns})${bEnd}`, "gui"), (m, noun) => {
    const isCap = m[0] === m[0].toUpperCase();
    return `${isCap ? "Твоята" : "твоята"} ${noun}`;
  });

  // Plural targets:
  const plurNouns = "(?:дела|грехове|сърца|стъпки|молитви|въпроси|видеа|предложения|идеи|мисли|дни|часове|клипове|карусели|постове|хора|вярващи|изпитания|напътствия|поуки|семейства|чеда|братя)";
  const plurAdj = "(?:единствени|духовни|истински|собствени|нови|лични|земни|бъдещи|вечни|всекидневни|ежедневни|дълбоки|трудни|главни|искрени|добри)";

  s = s.replace(new RegExp(`${bStart}(?:вашето|вашия|вашият)\\s+(${plurAdj})\\s+(${plurNouns})${bEnd}`, "gui"), (_, adj, noun) => {
    return `Вашите ${adj} ${noun}`;
  });
  s = s.replace(new RegExp(`${bStart}(?:вашето|вашия|вашият)\\s+(${plurNouns})${bEnd}`, "gui"), (_, noun) => {
    return `Вашите ${noun}`;
  });
  s = s.replace(new RegExp(`${bStart}(?:твоето|твоя|твоят)\\s+(${plurAdj})\\s+(${plurNouns})${bEnd}`, "gui"), (m, adj, noun) => {
    const isCap = m[0] === m[0].toUpperCase();
    return `${isCap ? "Твоите" : "твоите"} ${adj} ${noun}`;
  });
  s = s.replace(new RegExp(`${bStart}(?:твоето|твоя|твоят)\\s+(${plurNouns})${bEnd}`, "gui"), (m, noun) => {
    const isCap = m[0] === m[0].toUpperCase();
    return `${isCap ? "Твоите" : "твоите"} ${noun}`;
  });

  // 7. Respectful and dignified Islamic emoji normalization:
  // Strictly replaces hype/gaming/casual or disrespectful emojis (fire, lightning, rocket, cartoon lightbulb)
  // with dignified, official Islamic symbols, and strips prohibited emojis (human hands, music notes, Kaaba as decorative icon).
  s = s
    .replace(/⚡/gu, "📌")
    .replace(/🔥/gu, "✨")
    .replace(/🚀/gu, "🎬")
    .replace(/💡/gu, "💎")
    .replace(/💥/gu, "✨")
    .replace(/❤️/gu, "🤍")
    .replace(/[🤲👉👆✍️👏🤝🙏🎶🎵🎼🕋]/gu, "")
    .replace(/[ \t]{2,}/g, " ");

  return s;
}
