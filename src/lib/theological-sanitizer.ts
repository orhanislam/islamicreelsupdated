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

  // 7. Literary Bulgarian grammar & scholarly translation polish:
  // 7a. Strip leftover English translation cross-references like [V. 2:255], (see V. 3:10), [Tafsir ...]
  s = s
    .replace(/\[\s*(?:see\s+)?v\.?\s*\d+\s*:\s*\d+[^\]]*\]/gi, "")
    .replace(/\(\s*(?:see\s+)?v\.?\s*\d+\s*:\s*\d+[^)]*\)/gi, "")
    .replace(/\[\s*(?:tafsir|i\.e\.)[^\]]*\]/gi, "")
    .replace(/\s+([.,!?;:])/g, "$1");

  // 7b. Fix Hadith transmission calques ("Разказано от Абу Хурайра" -> "Предава се от Абу Хурайра")
  s = s
    .replace(new RegExp(`(^|[.!?\\n]\\s*)разказано\\s+е\\s+от${bEnd}`, "gi"), "$1Предава се от")
    .replace(new RegExp(`(^|[.!?\\n]\\s*)разказано\\s+от${bEnd}`, "gi"), "$1Предава се от")
    .replace(new RegExp(`(^|[.!?\\n]\\s*)разказва\\s+се\\s+от${bEnd}`, "gi"), "$1Предава се от");

  // 7c. Fix nominative definite article (пълен член) when Пратеникът / Пророкът is the subject
  s = s
    .replace(
      new RegExp(`(^|[:.!?\\n„"«]\\s*|${bStart}че\\s+)пратеника\\s+на\\s+аллах(\\s*(?:ﷺ|\\(мир[^)]*\\)|мир\\s+да\\s+бъде\\s+с\\s+него))?\\s+(каза|рече|попита|повели|повелява|учи|заповяда|забрани|предупреди|отговори|е\\s+казал|ни\\s+учи)${bEnd}`, "gi"),
      (_, prefix, salawat, verb) => `${prefix}Пратеникът на Аллах${salawat || ""} ${verb}`,
    )
    .replace(
      new RegExp(`(^|[:.!?\\n„"«]\\s*|${bStart}че\\s+)пророка(\\s*(?:ﷺ|\\(мир[^)]*\\)|мир\\s+да\\s+бъде\\s+с\\s+него))?\\s+(каза|рече|попита|повели|повелява|учи|заповяда|забрани|предупреди|отговори|е\\s+казал|ни\\s+учи)${bEnd}`, "gi"),
      (_, prefix, salawat, verb) => `${prefix}Пророкът${salawat || ""} ${verb}`,
    );

  // 7d. Bulgarian phonetic euphony for prepositions "с" vs "със":
  // "със" is ONLY used before words starting with с/з (or single-consonant clitics).
  // Fix "със него/нея/тях/нас/вас/мен/теб/милост/търпение/добро/вяра/праведните/търпеливите" -> "с ..."
  s = s.replace(
    new RegExp(`${bStart}със\\s+(него|нея|тях|нас|вас|мен|теб|милост|търпение|добро|вяра|истина|праведните|търпеливите|благодат|почит|уважение|чисто|цялото|всички|всеки|всяка|всяко|единия|едно)${bEnd}`, "gi"),
    (m, word) => {
      const isCap = m[0] === m[0].toUpperCase();
      return `${isCap ? "С" : "с"} ${word}`;
    },
  );
  // Fix "с себе си / с своите / с своя / с своето / с сърце / с страх / с знание / с словото" -> "със ..."
  s = s.replace(
    new RegExp(`${bStart}с\\s+(себе|своите|своя|своята|своето|сърце|сърцето|страх|словото|справедливост|знание|знанието|злото|земята)${bEnd}`, "gi"),
    (m, word) => {
      const isCap = m[0] === m[0].toUpperCase();
      return `${isCap ? "Със" : "със"} ${word}`;
    },
  );

  // 7e. Written Islamic honorifics: Always write literary Bulgarian meaning in text displays
  // Ensures all written titles, subtitles, captions, and summaries show "(мир да бъде с него)" and "(Аллах да е доволен от него)"
  s = s
    .replace(/\(\s*с\s*\/\s*у\s*\)/gi, "(мир да бъде с него)")
    .replace(/(?<=^|[^\p{L}\p{N}])с\s*\/\s*у(?=[^\p{L}\p{N}]|$)/gui, "мир да бъде с него")
    .replace(/(?:\(\s*(?:saw|pbuh|с\.а\.с\.|с\.а\.в\.)\s*\)|(?<=^|[^\p{L}\p{N}])(?:с\.а\.с\.|с\.а\.в\.|ﷺ)(?=[^\p{L}\p{N}]|$))/gui, "(мир да бъде с него)")
    .replace(/(?:\(\s*)?(?:sallallahu\s+ala(?:y|i)hi\s+wa\s+sallam|салл?аллаа?ху\s+але[йй]хи\s+(?:ва|уа|уе)\s+с[ае]лл[яе]м)(?:\s*\))?/gi, " (мир да бъде с него) ")
    .replace(/мир\s+да\s+бъде\s+със\s+него/gi, "мир да бъде с него")
    .replace(/(?:\(\s*(?:р\.а\.|ra|ра)\s*\)|(?<=^|[^\p{L}\p{N}])(?:р\.а\.)(?=[^\p{L}\p{N}]|$))/gui, " (Аллах да е доволен от него) ")
    .replace(/(?:\(\s*)?(?:radiyallahu\s+anhu|ради[йя]ллаа?ху\s+анху)(?:\s*\))?/gi, " (Аллах да е доволен от него) ")
    .replace(/(?:\(\s*)?(?:radiyallahu\s+anha|ради[йя]ллаа?ху\s+анха)(?:\s*\))?/gi, " (Аллах да е доволен от нея) ")
    .replace(/(?:\(\s*)?(?:radiyallahu\s+anhum|ради[йя]ллаа?ху\s+анхум)(?:\s*\))?/gi, " (Аллах да е доволен от тях) ")
    .replace(/\(\s*\(\s*(мир да бъде с него)\s*\)\s*\)/gi, "($1)")
    .replace(/\(\s*\(\s*(Аллах да е доволен от [^)]+)\s*\)\s*\)/gi, "($1)");

  // 8. Respectful and dignified Islamic emoji normalization:
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
