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

  // 7f. Grammatical self-healing for 3rd-person singular verbs & clitic pronouns:
  // Prevents and heals corruptions such as "Аллах ще те пазете" -> "Аллах ще те пази", "Той ще те пазете" -> "Той ще те пази",
  // "ще Ви пазете" -> "ще Ви пази", and clitic "ти" corrupted into "вие" ("Аллах вече вие е предписал" -> "Аллах вече ти е предписал").
  const verb3rdPersonMap: Record<string, string> = {
    "пазете": "пази",
    "направете": "направи",
    "отворете": "отвори",
    "споделете": "сподели",
    "благодарете": "благодари",
    "потърсете": "потърси",
    "помислете": "помисли",
    "започнете": "започне",
    "погледнете": "погледне",
    "спрете": "спре",
    "чуйте": "чуе",
    "вижте": "види",
    "вземете": "вземе",
    "прочетете": "прочете",
    "поискайте": "поиска",
    "помнете": "помни",
  };
  const pluralVerbsPattern = Object.keys(verb3rdPersonMap).join("|");
  s = s.replace(
    new RegExp(
      `((?:ще|нека)\\s+(?:те|ти|Ви|ви|го|я|ги|ни|ми|му|й|се)\\s+)(${pluralVerbsPattern})${bEnd}`,
      "gui",
    ),
    (_, prefix, v) => `${prefix}${verb3rdPersonMap[v.toLowerCase()] || "пази"}`,
  );
  s = s.replace(
    new RegExp(
      `(\\bда\\s+(?:те|ти|Ви|ви|го|я|ги|ни|ми|му|й)\\s+)(${pluralVerbsPattern})${bEnd}`,
      "gui",
    ),
    (_, prefix, v) => `${prefix}${verb3rdPersonMap[v.toLowerCase()] || "пази"}`,
  );
  s = s.replace(
    new RegExp(
      `((?:Аллах|Той|Господ|Творецът|Създателят|Всевишният|Пратеникът|Пророкът|човекът|вярващият|молитвата|вярата|садаката|истината|който|която|което)\\s+(?:Всевишният\\s+|Славният\\s+)*(?:винаги\\s+|вече\\s+|непрестанно\\s+|не\\s+|ще\\s+|да\\s+)*(?:те\\s+|ти\\s+|Ви\\s+|ви\\s+|го\\s+|я\\s+|ги\\s+|ни\\s+|ми\\s+|му\\s+|й\\s+|се\\s+)*)(${pluralVerbsPattern})${bEnd}`,
      "gui",
    ),
    (_, prefix, v) => `${prefix}${verb3rdPersonMap[v.toLowerCase()] || "пази"}`,
  );
  // Heal clitic "ти" corrupted into "вие"
  s = s
    .replace(
      new RegExp(
        `((?:ще|да|не|вече|ако|когато|който|която|което|че|защото|докато)\\s+)вие(\\s+(?:е|са|бъде|даде|дава|помогне|помага|прости|прощава|пази|защити|защитава|напътства|насочи|обича|вижда|чува|знае|принесе|принесат|навреди|навредят|помогнат|предписал|отредил|определил|стига|достатъчен|улесни|улеснява|отвори|промени))${bEnd}`,
        "gui",
      ),
      "$1ти$2",
    )
    .replace(
      new RegExp(
        `(Аллах\\s+(?:Всевишният\\s+)?(?:вече\\s+|винаги\\s+)?)вие(\\s+(?:е|са|ще|да|пази|помага|дава|прощава|вижда|чува|знае|предписал|отредил))${bEnd}`,
        "gui",
      ),
      "$1ти$2",
    )
    .replace(
      new RegExp(
        `((?:сърцето|душата|живота|животът|делата|греховете|молитвата|вярата|съдбата|пътя|пътят|ръцете|очите|гърдите|умът|ума|домът|дома|семейството|богатството|здравето|времето|езикът|езика|нравът|нрава|намерението|намеренията|родителите|децата|думите|стъпките|грехът|греха|мислите|тялото|лицето|главата)\\s+)вие(?![\\p{L}\\p{N}]|\\s+(?:сте|знаете|имате|можете|търсите|правите|виждате|чувате|чувствате|усещате|искате|вярвате|казвате|четете))`,
        "gui",
      ),
      "$1ти",
    )
    .replace(new RegExp(`${bStart}една\\s+ден${bEnd}`, "gui"), (m) =>
      m[0] === m[0].toUpperCase() ? "Един ден" : "един ден",
    );

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

/**
 * Salafi Theological Deviation Detector and Healer (Ahl us-Sunnah wal-Jama'ah)
 * Corrects deviations regarding Tawheed, Shirk in Dua, amulets, and divine attributes.
 */
export function detectAndHealSalafiTheologicalDeviations(text: string): {
  healedText: string;
  healed: boolean;
  fixes: string[];
} {
  if (!text) return { healedText: "", healed: false, fixes: [] };
  const fixes: string[] = [];
  let s = text;
  let healed = false;

  // 1. Shirk in Dua / Calling upon the dead or intermediaries (Истигаса към мъртви/аулия)
  const shirkInDuaPattern = /(?<=^|[^\p{L}\p{N}])(?:мол(?:ете|ите|им|и|е)\s+се\s+на|(?:искай(?:те)?|търс(?:ете|ите|им|и))\s+(?:(?:помощ|закрила|спасение)\s+)?от)\s+(?:светци(?:те)?|аулия(?:та)?|покойници(?:те)?|мъртви(?:те)?|гробове(?:те)?|шейхове(?:те)?)(?:\s+и\s+(?:светци(?:те)?|аулия(?:та)?|покойници(?:те)?|мъртви(?:те)?|гробове(?:те)?|шейхове(?:те)?))*(?=[^\p{L}\p{N}]|$)/giu;
  const beforeShirk = s;
  s = s.replace(
    shirkInDuaPattern,
    "отправете Вашата дуа и молба ЕДИНСТВЕНО към Аллах Всевишният, без никакви посредници",
  );
  if (s !== beforeShirk) {
    healed = true;
    fixes.push("🚨 КОРИГИРАНО ТЕОЛОГИЧЕСКО ОТКЛОНЕНИЕ (Таухид ал-Улухийя): Моленето към покойници/светци беше заменено с чиста дуа единствено към Аллах [Коран 72:18]");
  }

  // 2. Amulets, Talismans, Blue Beads, Evil Eye Charms (Суеверия и амулети)
  const amuletPattern = /(?<=^|[^\p{L}\p{N}])(?:синьо(?:то)?\s+око(?:\s+против\s+уроци)?|червен(?:ия|ият)?\s+конец(?:\s+против\s+уроци)?|муска(?:та)?(?:\s+(?:пази|защитава|носи))?|талисман(?:ът|а)?(?:\s+(?:пази|носи))?|амулет(?:ът|а)?(?:\s+(?:пази|носи))?|око(?:то)?\s+против\s+уроци)(?=[^\p{L}\p{N}]|$)/giu;
  const beforeAmulet = s;
  s = s.replace(
    amuletPattern,
    "носенето на амулети и талисмани е забранено в Исляма, а истинската защита е единствено чрез четене на Коран (сурите Ал-Фаляк, Ан-Нас, Аят ал-Курси) и упование в Твореца",
  );
  if (s !== beforeAmulet) {
    healed = true;
    fixes.push("🚨 КОРИГИРАНО СУЕВЕРИЕ (Ширк в причините): Сини очи и амулети заменени с автентична Сунна рукя и Тауаккул");
  }

  // 3. Ta'weel / Metaphorical denial of Allah's Attributes (Та'тил и Тахриф)
  const taweelPattern = /(?<=^|[^\p{L}\p{N}])(?:ръката\s+на\s+аллах\s+е\s+(?:само\s+)?метафора\s+за\s+сила|аллах\s+е\s+навсякъде\s+физически|тронът\s+на\s+аллах\s+е\s+(?:просто\s+)?символ)(?=[^\p{L}\p{N}]|$)/giu;
  const beforeTaweel = s;
  s = s.replace(
    taweelPattern,
    "Аллах Всевишният е над Своя Трон над седемте небеса, със Своето Знание обхваща всяко нещо, и ние утвърждаваме Неговите Божествени Качества без изкривяване, отричане или оприличаване на творенията",
  );
  if (s !== beforeTaweel) {
    healed = true;
    fixes.push("🚨 КОРИГИРАНО ОТКЛОНЕНИЕ (Таухид ал-Асма уас-Сифат): Утвърдена чистата Салафитска Акида за Трона и Божествените Атрибути [Коран 42:11]");
  }

  // 4. Tawheed Reverence: Check for casual diminutive forms of Allah
  const casualAllah = /(?<=^|[^\p{L}\p{N}])(?:единичък|единичкият|единичният|оня\s+горе|тоя\s+горе)(?=[^\p{L}\p{N}]|$)/giu;
  const beforeCasual = s;
  s = s.replace(casualAllah, "Единственият Творец");
  if (s !== beforeCasual) {
    healed = true;
    fixes.push("Коригиран неподходящ израз за Аллах: Заменен с 'Единственият Творец'");
  }

  // 5. Shirk in Dua / Calling upon the Prophet ﷺ for help or forgiveness after his death
  const prophetDuaPattern = /(?<=^|[^\p{L}\p{N}])(?:о[,\s]+пратенико\s+на\s+аллах|йа\s+расулуллах|йа\s+пророко|о[,\s]+пророко)\s*[,–—\s]+(?:помогни\s+ми|спаси\s+ме|излекувай\s+ме|прости\s+ми|дай\s+ми)(?=[^\p{L}\p{N}]|$)/giu;
  const beforeProphetDua = s;
  s = s.replace(
    prophetDuaPattern,
    "отправете Вашата дуа единствено към Аллах Всевишният, Който чува и откликва, а към Пратеника ﷺ изпращаме благослов (саляуат)",
  );
  if (s !== beforeProphetDua) {
    healed = true;
    fixes.push("🚨 КОРИГИРАНО ТЕОЛОГИЧЕСКО ОТКЛОНЕНИЕ: Дуа се отправя единствено към Аллах Всевишният, без зов към творение [Коран 72:18]");
  }

  // 6. Swearing by creations / Oaths by other than Allah
  const oathPattern = /(?<=^|[^\p{L}\p{N}])(?:кълна\s+се\s+в\s+(?:децата|майка|хляба|гроба|пророка|пратеника|небето|земята)|заклевам\s+се\s+в\s+(?:децата|майка|хляба|гроба|пророка|пратеника))(?=[^\p{L}\p{N}]|$)/giu;
  const beforeOath = s;
  s = s.replace(oathPattern, "кълна се в Аллах, Твореца на световете");
  if (s !== beforeOath) {
    healed = true;
    fixes.push("🚨 КОРИГИРАНА КЛЕТВА (Ширк Асгар): Клетвата в Исляма е позволена единствено в името на Аллах");
  }

  // 7. Horoscopes, astrology, fortune-telling
  const horoscopePattern = /(?<=^|[^\p{L}\p{N}])(?:хороскоп(?:ът|а|и|ите|ата)?|зоди(?:ята|ите|я)?\s+(?:казва|предсказва|определя)|гледане\s+на\s+(?:кафе|карти|ръка|боб)|гадател(?:и|ство|ка)?)(?=[^\p{L}\p{N}]|$)/giu;
  const beforeHoro = s;
  s = s.replace(
    horoscopePattern,
    "бъдещето и неведомото (ал-Гайб) са известни единствено на Аллах Всевишният, а астрологията и гаданията са грях в Исляма",
  );
  if (s !== beforeHoro) {
    healed = true;
    fixes.push("🚨 КОРИГИРАНО СУЕВЕРИЕ: Хороскопите и гаданията са отхвърлени, утвърдено знанието на Аллах за Неведомото [Коран 27:65]");
  }

  // 8. Secular pantheism / "вселената чува / дава / грижи се"
  const universePattern = /(?<=^|[^\p{L}\p{N}])(?:вселената\s+(?:чува|дава|се\s+грижи|ще\s+ти\s+върне|откликва)|енергията\s+на\s+вселената|космическа\s+енергия)(?=[^\p{L}\p{N}]|$)/giu;
  const beforeUniverse = s;
  s = s.replace(universePattern, "Аллах Всевишният, Единственият Творец и Господар на световете");
  if (s !== beforeUniverse) {
    healed = true;
    fixes.push("🚨 КОРИГИРАН СВЕТСКИ ТЕРМИН: Премахнато обожествяване на 'вселената', заменено с Единствения Творец");
  }

  return { healedText: s, healed, fixes };
}
