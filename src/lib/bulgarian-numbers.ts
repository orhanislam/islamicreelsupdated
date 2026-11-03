/**
 * Bulgarian Number to Words & TTS Phonetic Normalizer
 * Converts numerical digits, citations, ordinals, percentages, and decimals
 * into standard literary Bulgarian words for natural speech synthesis (TTS).
 */

const UNITS = ["нула", "едно", "две", "три", "четири", "пет", "шест", "седем", "осем", "девет"];

const TEENS = [
  "десет",
  "единадесет",
  "дванадесет",
  "тринадесет",
  "четиринадесет",
  "петнадесет",
  "шестнадесет",
  "седемнадесет",
  "осемнадесет",
  "деветнадесет",
];

const TENS = [
  "",
  "десет",
  "двадесет",
  "тридесет",
  "четиридесет",
  "петдесет",
  "шестдесет",
  "седемдесет",
  "осемдесет",
  "деветдесет",
];

const HUNDREDS = [
  "",
  "сто",
  "двеста",
  "триста",
  "четиристотин",
  "петстотин",
  "шестстотин",
  "седемстотин",
  "осемстотин",
  "деветстотин",
];

export type NumberGender = "masculine" | "feminine" | "neuter";

function formatUnder100(n: number, gender: NumberGender = "neuter"): string {
  if (n === 0) return "";
  if (n < 10) {
    if (gender === "masculine") return n === 1 ? "един" : n === 2 ? "два" : UNITS[n];
    if (gender === "feminine") return n === 1 ? "една" : n === 2 ? "две" : UNITS[n];
    return UNITS[n];
  }
  if (n < 20) return TEENS[n - 10];
  if (n % 10 === 0) return TENS[n / 10];
  const t = TENS[Math.floor(n / 10)];
  const u = formatUnder100(n % 10, gender);
  return `${t} и ${u}`;
}

function formatUnder1000(n: number, gender: NumberGender = "neuter"): string {
  if (n < 100) return formatUnder100(n, gender);
  const h = Math.floor(n / 100);
  const rem = n % 100;
  const hStr = HUNDREDS[h];
  if (rem === 0) return hStr;
  if (rem < 20 || rem % 10 === 0) {
    return `${hStr} и ${formatUnder100(rem, gender)}`;
  }
  return `${hStr} ${formatUnder100(rem, gender)}`;
}

function formatUnderMillion(n: number, gender: NumberGender = "neuter"): string {
  if (n < 1000) return formatUnder1000(n, gender);
  const thousandsCount = Math.floor(n / 1000);
  const rem = n % 1000;
  let thousandsStr = "";
  if (thousandsCount === 1) {
    thousandsStr = "хиляда";
  } else {
    thousandsStr = `${formatUnder1000(thousandsCount, "feminine")} хиляди`;
  }
  if (rem === 0) return thousandsStr;
  const remStr = formatUnder1000(rem, gender);
  if (remStr.includes(" и ")) {
    return `${thousandsStr} ${remStr}`;
  }
  return `${thousandsStr} и ${remStr}`;
}

function formatUnderBillion(n: number, gender: NumberGender = "neuter"): string {
  if (n < 1000000) return formatUnderMillion(n, gender);
  const millionsCount = Math.floor(n / 1000000);
  const rem = n % 1000000;
  let millionsStr = "";
  if (millionsCount === 1) {
    millionsStr = "един милион";
  } else {
    millionsStr = `${formatUnder1000(millionsCount, "masculine")} милиона`;
  }
  if (rem === 0) return millionsStr;
  const remStr = formatUnderMillion(rem, gender);
  if (remStr.includes(" и ")) {
    return `${millionsStr} ${remStr}`;
  }
  return `${millionsStr} и ${remStr}`;
}

/**
 * Converts an integer into standard Bulgarian words with grammatically correct
 * conjunctions ('и') and gender agreement.
 * Examples:
 *   5 -> "пет"
 *   50 -> "петдесет"
 *   500 -> "петстотин"
 *   5000 -> "пет хиляди"
 *   5368 -> "пет хиляди триста шестдесет и осем"
 */
export function integerToBulgarianWords(n: number | bigint, gender: NumberGender = "neuter"): string {
  const num = typeof n === "bigint" ? Number(n) : n;
  if (num === 0) return "нула";
  if (num < 0) return `минус ${integerToBulgarianWords(-num, gender)}`;
  if (num < 1000000000) return formatUnderBillion(num, gender);

  const billionsCount = Math.floor(num / 1000000000);
  const rem = num % 1000000000;
  let billionsStr = "";
  if (billionsCount === 1) {
    billionsStr = "един милиард";
  } else {
    billionsStr = `${formatUnder1000(billionsCount, "masculine")} милиарда`;
  }
  if (rem === 0) return billionsStr;
  const remStr = formatUnderBillion(rem, gender);
  if (remStr.includes(" и ")) {
    return `${billionsStr} ${remStr}`;
  }
  return `${billionsStr} и ${remStr}`;
}

const FEMININE_NOUNS = new Set([
  "година", "години", "нощ", "нощи", "молитва", "молитви", "сура", "сури",
  "жена", "жени", "минута", "минути", "секунда", "секунди", "седмица", "седмици",
  "заповед", "заповеди", "награда", "награди", "книга", "книги", "ръка", "ръце",
  "душа", "души", "страница", "страници", "порция", "порции", "врата", "врати"
]);

const MASCULINE_NOUNS = new Set([
  "ден", "дни", "път", "пъти", "месец", "месеца", "аят", "аята", "аяти",
  "хадис", "хадиса", "хадиси", "стълб", "стълба", "стълбове", "век", "века",
  "час", "часа", "човек", "души", "мъж", "мъже", "грях", "греха", "грехове",
  "пророк", "пророци", "бог", "ангел", "ангели", "ангела"
]);

function inferGender(nextWord?: string): NumberGender {
  if (!nextWord) return "neuter";
  const clean = nextWord.toLowerCase().replace(/[^\p{L}]/gu, "");
  if (FEMININE_NOUNS.has(clean)) return "feminine";
  if (MASCULINE_NOUNS.has(clean)) return "masculine";
  if (clean.endsWith("а") || clean.endsWith("я") || clean.endsWith("ост")) return "feminine";
  return "neuter";
}

const ORDINAL_MAP: Record<string, string> = {
  "1-ви": "първи", "1-вия": "първия", "1-вият": "първият", "1-ва": "първа", "1-вата": "първата", "1-во": "първо", "1-вото": "първото",
  "2-ри": "втори", "2-рия": "втория", "2-рият": "вторият", "2-ра": "втора", "2-рата": "втората", "2-ро": "второ", "2-рото": "второто",
  "3-ти": "трети", "3-тия": "третия", "3-тият": "третият", "3-та": "трета", "3-тата": "третата", "3-то": "трето", "3-тото": "третото",
  "4-ти": "четвърти", "4-тия": "четвъртия", "4-та": "четвърта", "4-то": "четвърто",
  "5-ти": "пети", "5-тия": "петия", "5-та": "пета", "5-то": "пето",
  "6-ти": "шести", "6-тия": "шестия", "6-та": "шеста", "6-то": "шесто",
  "7-ми": "седми", "7-мия": "седмия", "7-ма": "седма", "7-мо": "седмо",
  "8-ми": "осми", "8-мия": "осмия", "8-ма": "осма", "8-мо": "осмо",
  "9-ти": "девети", "9-тия": "деветия", "9-та": "девета", "9-то": "девето",
  "10-ти": "десети", "10-тия": "десетия", "10-та": "десета", "10-то": "десето"
};

const ROMAN_CENTURIES: Record<string, string> = {
  "i": "първи", "ii": "втори", "iii": "трети", "iv": "четвърти", "v": "пети",
  "vi": "шести", "vii": "седми", "viii": "осми", "ix": "девети", "x": "десети",
  "xi": "единадесети", "xii": "дванадесети", "xiii": "тринадесети", "xiv": "четиринадесети",
  "xv": "петнадесети", "xvi": "шестнадесети", "xvii": "седемнадесети", "xviii": "осемнадесети",
  "xix": "деветнадесети", "xx": "двадесети", "xxi": "двадесет и първи"
};

const SPELLED_CITATION_NUMBERS: Record<string, string> = {
  "едно": "1",
  "една": "1",
  "един": "1",
  "първи": "1",
  "първия": "1",
  "първият": "1",
  "първа": "1",
  "първата": "1",
  "първо": "1",
  "първото": "1",
  "две": "2",
  "два": "2",
  "втори": "2",
  "втория": "2",
  "вторият": "2",
  "втора": "2",
  "втората": "2",
  "второ": "2",
  "три": "3",
  "трети": "3",
  "третия": "3",
  "третият": "3",
  "трета": "3",
  "третата": "3",
  "трето": "3",
  "четири": "4",
  "четвърти": "4",
  "четвърта": "4",
  "пет": "5",
  "пети": "5",
  "пета": "5",
  "шест": "6",
  "шести": "6",
  "шеста": "6",
  "седем": "7",
  "седми": "7",
  "седма": "7",
  "осем": "8",
  "осми": "8",
  "осма": "8",
  "девет": "9",
  "девети": "9",
  "девета": "9",
  "десет": "10",
  "десети": "10",
  "десета": "10",
  "единадесет": "11",
  "единайсет": "11",
  "дванадесет": "12",
  "дванайсет": "12",
  "тринадесет": "13",
  "тринайсет": "13",
  "четиринадесет": "14",
  "четиринайсет": "14",
  "петнадесет": "15",
  "петнайсет": "15",
  "шестнадесет": "16",
  "шестнайсет": "16",
  "седемнадесет": "17",
  "седемнайсет": "17",
  "осемнадесет": "18",
  "осемнайсет": "18",
  "деветнадесет": "19",
  "деветнайсет": "19",
  "двадесет": "20",
  "двайсет": "20",
  "тридесет": "30",
  "четиридесет": "40",
  "петдесет": "50",
  "шестдесет": "60",
  "седемдесет": "70",
  "осемдесет": "80",
  "деветдесет": "90",
  "сто": "100",
  "двеста": "200",
  "триста": "300",
  "хиляда": "1000",
};

/**
 * Converts spelled-out Bulgarian number words into direct digits.
 * Fulfills the user requirement:
 * "трябва вместо да пише цифрите със букви да ги пише със цифри"
 * (Numbers must be written directly as digits, never expanded into spelled-out letter words).
 * 
 * Handles:
 * 1. Citations: "хадис номер едно" -> "хадис номер 1", "сура втора" -> "сура 2", "аят първи" -> "аят 1"
 * 2. Multi-word numbers: "деветдесет и девет" -> "99", "двадесет и пет" -> "25"
 * 3. Countable nouns: "пет стълба" -> "5 стълба", "три признака" -> "3 признака", "сто пъти" -> "100 пъти", "една минута" -> "1 минута"
 * 4. Ordinals: "първа стъпка" -> "1-ва стъпка", "втори признак" -> "2-ри признак", "трето правило" -> "3-то правило"
 * 5. Enumeration heads: "Първо:" -> "1.", "Второ:" -> "2."
 */
export function convertBulgarianNumberWordsToDigits(text: string): string {
  if (!text) return "";
  let res = text;

  // 1. Direct compound numbers like "деветдесет и девет" -> "99", "двадесет и пет" -> "25"
  const tensWords: Record<string, number> = {
    двадесет: 20,
    двайсет: 20,
    тридесет: 30,
    трийсет: 30,
    четиридесет: 40,
    четирийсет: 40,
    петдесет: 50,
    шестдесет: 60,
    седемдесет: 70,
    осемдесет: 80,
    деветдесет: 90,
  };
  const unitWords: Record<string, number> = {
    едно: 1,
    една: 1,
    един: 1,
    две: 2,
    два: 2,
    три: 3,
    четири: 4,
    пет: 5,
    шест: 6,
    седем: 7,
    осем: 8,
    девет: 9,
  };

  const compoundPattern = new RegExp(
    `(?<=^|[^\\p{L}\\p{N}])(${Object.keys(tensWords).join("|")})\\s+и\\s+(${Object.keys(unitWords).join("|")})(?=[^\\p{L}\\p{N}]|$)`,
    "gui"
  );
  res = res.replace(compoundPattern, (_m, tWord, uWord) => {
    const t = tensWords[tWord.toLowerCase()] || 0;
    const u = unitWords[uWord.toLowerCase()] || 0;
    return String(t + u);
  });

  // 2. Ordinals before words or punctuation: "първа стъпка" -> "1-ва стъпка", "първи стълб" -> "1-ви стълб"
  const ORDINAL_MAP: Record<string, string> = {
    "първи": "1-ви",
    "първия": "1-ви",
    "първият": "1-ви",
    "първа": "1-ва",
    "първата": "1-ва",
    "първо": "1-во",
    "първото": "1-во",
    "втори": "2-ри",
    "втория": "2-ри",
    "вторият": "2-ри",
    "втора": "2-ра",
    "втората": "2-ра",
    "второ": "2-ро",
    "второто": "2-ро",
    "трети": "3-ти",
    "третия": "3-ти",
    "третият": "3-ти",
    "трета": "3-та",
    "третата": "3-та",
    "трето": "3-то",
    "третото": "3-то",
    "четвърти": "4-ти",
    "четвъртия": "4-ти",
    "четвъртият": "4-ти",
    "четвърта": "4-та",
    "четвъртата": "4-та",
    "четвърто": "4-то",
    "пети": "5-ти",
    "петия": "5-ти",
    "петият": "5-ти",
    "пета": "5-та",
    "петата": "5-та",
    "пето": "5-то",
  };
  const ordinalKeys = Object.keys(ORDINAL_MAP).join("|");
  res = res.replace(
    new RegExp(
      `(?<=^|[^\\p{L}\\p{N}])(${ordinalKeys})(?=\\s+(?:стъпка|стълб|признак|правило|част|ниво|въпрос|точка|етап|начин|дело)|[:\\-–])`,
      "gui"
    ),
    (m) => ORDINAL_MAP[m.toLowerCase()] || m
  );

  // 3. Spelled citation numbers (e.g. "хадис номер едно" -> "хадис номер 1", "сура втора" -> "сура 2")
  const spelledKeys = Object.keys(SPELLED_CITATION_NUMBERS).join("|");
  const citationPattern = new RegExp(
    `(?<=(?:^|[^\\p{L}\\p{N}])(?:номер|хадис|аят|сура|част|епизод|точка|т\\.)\\s+)(${spelledKeys})(?=[^\\p{L}\\p{N}]|$)`,
    "gui"
  );
  res = res.replace(citationPattern, (m) => SPELLED_CITATION_NUMBERS[m.toLowerCase()] || m);

  // 4. Quantities before countable nouns / time units / steps / items:
  // e.g. "пет стълба" -> "5 стълба", "три признака" -> "3 признака", "сто пъти" -> "100 пъти", "една минута" -> "1 минута"
  const COUNTABLE_NOUNS = [
    "стълба",
    "стълб",
    "признака",
    "признак",
    "пъти",
    "път",
    "минути",
    "минута",
    "секунди",
    "секунда",
    "часа",
    "час",
    "дни",
    "години",
    "година",
    "души",
    "човека",
    "стъпки",
    "стъпка",
    "правила",
    "правило",
    "неща",
    "дела",
    "дело",
    "грехове",
    "грях",
    "причини",
    "причина",
    "начина",
    "начин",
    "въпроса",
    "въпрос",
    "имена",
    "име",
    "аята",
    "аят",
    "хадиса",
    "хадис",
    "ракаата",
    "ракаат",
    "молитви",
    "молитва",
  ].join("|");

  const quantityPattern = new RegExp(
    `(?<=^|[^\\p{L}\\p{N}])(${spelledKeys})(?=\\s+(?:${COUNTABLE_NOUNS})(?:[^\\p{L}\\p{N}]|$))`,
    "gui"
  );
  res = res.replace(quantityPattern, (m) => SPELLED_CITATION_NUMBERS[m.toLowerCase()] || m);

  return res;
}

/**
 * Normalizes all numbers and numerical expressions in Bulgarian text into
 * clean standard digits and direct numeric citations.
 * Fulfills the user requirement: "цифрите да се напишат направо като цифри, не със букви"
 * (Numbers must be written directly as digits, never expanded into spelled-out letter words).
 */
export function normalizeBulgarianNumbersForTts(text: string): string {
  if (!text) return "";

  let res = text;

  // 0. Convert Eastern Arabic numerals (٠-٩) to standard digits
  res = res.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));

  // 1. Collapse spaced thousands like "5 000" into "5000"
  res = res.replace(/(?<=^|[^\p{L}\p{N}])(\d{1,3})\s+(\d{3})(?=[^\p{L}\p{N}]|$)/gu, "$1$2");

  // 2. Quran Chapter:Verse format: keep directly as digits "сура $1, аят $2"
  res = res.replace(
    /(?<=[^\p{L}\p{N}]|^)(\d+):(\d+)(?:-(\d+))?(?=[^\p{L}\p{N}]|$)/gu,
    (_m, surah, ayah, ayahEnd) => {
      if (ayahEnd) {
        return `сура ${surah}, аяти от ${ayah} до ${ayahEnd}`;
      }
      return `сура ${surah}, аят ${ayah}`;
    }
  );

  // 3. Hadith references & citations like "#1", "# 1", "№1", "№ 1", "No. 1" -> standardize as digits "номер $1"
  res = res.replace(
    /(?:#\s*|№\s*|No\.\s*|No\s+|Nº\s*|N°\s*|Nr\.\s*|Nr\s+|nr\.\s*|nr\s+|ном\.\s*)(\d+)(?=[^\p{L}\p{N}]|$)/gui,
    "номер $1"
  );

  // 4. Standalone number symbols without digits
  res = res
    .replace(/№/g, " номер ")
    .replace(/(?<=^|[^\p{L}\p{N}])No\.(?=[^\p{L}\p{N}]|$)/giu, " номер ")
    .replace(/(?<=^|[^\p{L}\p{N}])N°(?=[^\p{L}\p{N}]|$)/giu, " номер ")
    .replace(/(?<=^|[^\p{L}\p{N}])Nº(?=[^\p{L}\p{N}]|$)/giu, " номер ");

  // 5. Convert any spelled-out Bulgarian number words back into digits ("номер едно" -> "номер 1", "сура втора" -> "сура 2")
  res = convertBulgarianNumberWordsToDigits(res);

  // 6. Clean multi-spaces
  res = res.replace(/[ \t]{2,}/g, " ").trim();

  return res;
}


const ENUM_HEADS: Record<string, string> = {
  "1": "Първо:",
  "2": "Второ:",
  "3": "Трето:",
  "4": "Четвърто:",
  "5": "Пето:",
  "6": "Шесто:",
  "7": "Седмо:",
  "8": "Осмо:",
  "9": "Девето:",
  "10": "Десето:",
};

/**
 * Converts all numbers, digits, citations, ordinals, percentages, and lists
 * into standard literary Bulgarian words for natural speech synthesis (TTS).
 * Solves: "the tts cannot read numbers" by ensuring TTS engines (EdgeTTS & ElevenLabs)
 * receive fully verbalized Bulgarian words with correct gender agreement.
 */
export function convertBulgarianDigitsToWordsForTts(text: string): string {
  if (!text) return "";
  let res = text;

  // 0. Convert Eastern Arabic numerals (٠-٩) to standard digits
  res = res.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));

  // 1. Quran citations: 'сура 2:255' or '2:255' or 'сура 2, аят 255'
  res = res.replace(/(?:сура\s+)?(\d+):(\d+)(?:-(\d+))?/gi, (_m, s, a, aEnd) => {
    const sWord = integerToBulgarianWords(Number(s), "feminine");
    const aWord = integerToBulgarianWords(Number(a), "masculine");
    if (aEnd) {
      const aEndWord = integerToBulgarianWords(Number(aEnd), "masculine");
      return `сура ${sWord}, аяти от ${aWord} до ${aEndWord}`;
    }
    return `сура ${sWord}, аят ${aWord}`;
  });

  res = res.replace(/(сура)\s+(\d+),\s*(аят)\s+(\d+)/gi, (_m, sPref, s, aPref, a) => {
    const sCap = sPref[0] === sPref[0].toUpperCase();
    const aCap = aPref[0] === aPref[0].toUpperCase();
    return `${sCap ? "Сура" : "сура"} ${integerToBulgarianWords(Number(s), "feminine")}, ${aCap ? "Аят" : "аят"} ${integerToBulgarianWords(Number(a), "masculine")}`;
  });

  // 2. Hadith references & citations: '#1', '№1', 'номер 1', 'хадис 1'
  res = res.replace(/(?:#|№|No\.|Nr\.)\s*(\d+)/gi, (_m, n) => {
    return `номер ${integerToBulgarianWords(Number(n), "neuter")}`;
  });

  res = res.replace(/(?<=^|[^\p{L}\p{N}])(хадис|номер|аят|сура)\s+(\d+)(?=[^\p{L}\p{N}]|$)/giu, (_m, prefix, n) => {
    const isHadith = prefix.toLowerCase() === "хадис";
    const isCap = prefix[0] === prefix[0].toUpperCase();
    const cleanPref = isCap ? prefix[0].toUpperCase() + prefix.slice(1).toLowerCase() : prefix.toLowerCase();
    const middle = isHadith ? " номер " : " ";
    const gender = prefix.toLowerCase() === "сура" ? "feminine" : prefix.toLowerCase() === "аят" ? "masculine" : "neuter";
    return `${cleanPref}${middle}${integerToBulgarianWords(Number(n), gender)}`;
  });

  // 3. Ordinals: '1-ви', '1-ва', '2-ри', '3-то', etc.
  for (const [k, v] of Object.entries(ORDINAL_MAP)) {
    const reg = new RegExp(`(?<=^|[^\\p{L}\\p{N}])${k}(?=[^\\p{L}\\p{N}]|$)`, "giu");
    res = res.replace(reg, v);
  }

  // Generic ordinal fallback for higher numbers: e.g. '12-ти', '25-ти', '100-ен'
  res = res.replace(/(?<=^|[^\p{L}\p{N}])(\d+)-(ти|тия|тият|та|тата|то|тото|ми|мия|мият|ма|мата|мо|мото)(?=[^\p{L}\p{N}]|$)/giu, (_m, numStr, suffix) => {
    const num = Number(numStr);
    const baseWords = integerToBulgarianWords(num, "neuter");
    const isFem = suffix.startsWith("та") || suffix.startsWith("ма");
    const isNeut = suffix.startsWith("то") || suffix.startsWith("мо");
    if (isFem) return `${baseWords}а`;
    if (isNeut) return `${baseWords}о`;
    return `${baseWords}и`;
  });

  // 4. Enumeration list heads: '1. ', '1) ', '2. ', '3. '
  res = res.replace(/(?<=^|\n|[.!?]\s+|\s+)(\d+)[\.)]\s+/gu, (_m, num) => {
    if (ENUM_HEADS[num]) return `${ENUM_HEADS[num]} `;
    return `${integerToBulgarianWords(Number(num), "neuter")}: `;
  });

  // 5. Percentages: '100%' -> 'сто процента'
  res = res.replace(/(\d+)%/gu, (_m, n) => {
    return `${integerToBulgarianWords(Number(n), "neuter")} процента`;
  });

  // 6. Numbers before countable nouns with grammatical gender agreement:
  // e.g. '5 стълба', '1 ден' (masc), '1 нощ' (fem), '99 имена'
  res = res.replace(/(?<=^|[^\p{L}\p{N}])(\d+)\s+([a-zA-Zа-яА-Я\u0400-\u04FF]+)/giu, (_m, numStr, noun) => {
    const num = Number(numStr);
    const gender = inferGender(noun);
    return `${integerToBulgarianWords(num, gender)} ${noun}`;
  });

  // 7. Remaining standalone digits
  res = res.replace(/(?<=^|[^\p{L}\p{N}])(\d+)(?=[^\p{L}\p{N}]|$)/gu, (_m, numStr) => {
    return integerToBulgarianWords(Number(numStr), "neuter");
  });

  return res.replace(/\s{2,}/g, " ").trim();
}

/**
 * Normalizes a word or phrase into canonical phonetic letters for drift-proof alignment.
 * Collapses stretched Arabic vowels (аа->а, ии->и, уу->у, яя->я, йу->ю, йа->я) and strips punctuation.
 */
function normalizeLettersForAlignment(raw: string): string {
  return (raw || "")
    .toLowerCase()
    .replace(/ь/g, "")
    .replace(/йу+/g, "ю")
    .replace(/йа+/g, "я")
    .replace(/([аеиоуъюя])\1+/g, "$1")
    .replace(/([лнмсзшджрктпбвгфхцч])\1+/g, "$1")
    .replace(/ля/g, "ла")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function tokenSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  // Fast Levenshtein distance
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > Math.ceil(maxLen * 0.45)) return 0;
  const prev = new Array<number>(n + 1);
  const curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j];
  }
  return Math.max(0, 1 - prev[n] / maxLen);
}

/**
 * Converts a single display token to its spoken Bulgarian equivalent using surrounding context.
 */
function convertSingleTokenToSpoken(token: string, nextWord?: string, prevWord?: string): string {
  const clean = token.replace(/^[^\p{L}\p{N}%#-]+|[^\p{L}\p{N}%]+$/gu, "");
  if (!clean) return token;

  if (ORDINAL_MAP[clean.toLowerCase()]) {
    return ORDINAL_MAP[clean.toLowerCase()];
  }

  const ordMatch = clean.match(/^(\d+)-(ти|тия|тият|та|тата|то|тото|ми|мия|мият|ма|мата|мо|мото)$/i);
  if (ordMatch) {
    const num = Number(ordMatch[1]);
    const suffix = ordMatch[2].toLowerCase();
    const baseWords = integerToBulgarianWords(num, "neuter");
    if (suffix.startsWith("та") || suffix.startsWith("ма")) return `${baseWords}а`;
    if (suffix.startsWith("то") || suffix.startsWith("мо")) return `${baseWords}о`;
    return `${baseWords}и`;
  }

  const pctMatch = clean.match(/^(\d+)%$/);
  if (pctMatch) {
    return `${integerToBulgarianWords(Number(pctMatch[1]), "neuter")} процента`;
  }

  const numPrefixMatch = clean.match(/^(?:#|№)(\d+)$/);
  if (numPrefixMatch) {
    return `номер ${integerToBulgarianWords(Number(numPrefixMatch[1]), "neuter")}`;
  }

  if (/^\d+$/.test(clean)) {
    if ((token.endsWith(".") || token.endsWith(")")) && ENUM_HEADS[clean] && !prevWord) {
      return ENUM_HEADS[clean];
    }
    const num = Number(clean);
    const prevClean = (prevWord || "").replace(/[^\p{L}]/gu, "").toLowerCase();
    let gender: GrammaticalGender;
    if (prevClean === "сура") gender = "feminine";
    else if (prevClean === "аят") gender = "masculine";
    else if (prevClean === "номер" || prevClean === "хадис") gender = "neuter";
    else gender = inferGender(nextWord);
    return integerToBulgarianWords(num, gender);
  }

  return token;
}

/**
 * Sanitizes raw narration text into clean display tokens for subtitles:
 * - Removes SSML/XML tags (<break time="0.7s" />, etc.)
 * - Removes workflow bracket labels ([hook], [dalil], etc.)
 * - Removes standalone punctuation-only tokens (—, –, ..., etc.)
 */
export function extractCleanDisplayTokens(displayText: string): string[] {
  if (!displayText) return [];
  const cleaned = displayText
    .replace(/<break[^>]*\/>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\[(?:tiktok|carousel|карусел|видео|кука|далил|обяснение|напътствие|hook|dalil|explanation|guidance|action)[^\]]*\]/gi, " ")
    .replace(/[\[\]()]/g, " ")
    .replace(/\.{2,}/g, " ")
    .replace(/…+/g, " ")
    .trim();

  return cleaned
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => /[\p{L}\p{N}]/u.test(t));
}

/**
 * Deterministically aligns spoken word-level timings from TTS back to clean display tokens
 * using Global Dynamic Programming (Needleman-Wunsch / Wagner-Fischer sequence alignment).
 *
 * Handles WITHOUT ANY DRIFT across 70+ second scripts:
 * - Multi-word spoken numbers -> single digit display token ('129.' <- 'сто двадесет и девет')
 * - Split Arabic hyphenated articles -> single display token ('Ат-Тауба,' <- 'Ат' + 'Тауба')
 * - Stretched Arabic phonetics -> standard Cyrillic ('Юсуф' <- 'Йуусуф', 'Ал-Бухари' <- 'Ал' + 'Бухаари')
 * - Inserted helper words ('хадис 27' <- 'хадис номер двадесет и седем')
 * - SSML <break /> tags and standalone em-dashes (—) omitted by EdgeTTS WordBoundary
 */
export function alignSpokenTimingsToDisplayTokens(
  spokenTimings: Array<{ word: string; start: number; end: number }>,
  displayText: string,
): Array<{ word: string; start: number; end: number }> {
  if (!Array.isArray(spokenTimings) || spokenTimings.length === 0) return spokenTimings || [];
  if (!displayText || !displayText.trim()) return spokenTimings;

  const displayTokens = extractCleanDisplayTokens(displayText);
  if (displayTokens.length === 0) return spokenTimings;

  const M = displayTokens.length;
  const N = spokenTimings.length;

  const dSpokenNorm: string[] = new Array(M);
  const dRawNorm: string[] = new Array(M);
  for (let i = 0; i < M; i++) {
    const spokenForm = convertSingleTokenToSpoken(
      displayTokens[i],
      displayTokens[i + 1],
      displayTokens[i - 1],
    );
    dSpokenNorm[i] = normalizeLettersForAlignment(spokenForm);
    dRawNorm[i] = normalizeLettersForAlignment(displayTokens[i]);
  }

  const sNorm: string[] = spokenTimings.map((t) => normalizeLettersForAlignment(t.word));

  const INF = 1e9;
  const stride = N + 1;
  const dp = new Float64Array((M + 1) * stride);
  const backI = new Int32Array((M + 1) * stride);
  const backJ = new Int32Array((M + 1) * stride);
  dp.fill(INF);
  backI.fill(-1);
  backJ.fill(-1);

  dp[0] = 0;
  for (let j = 0; j < N; j++) {
    const skipCost = /^(номер|от|до|и)$/i.test(sNorm[j]) ? 0.45 : 1.25;
    if (dp[j] + skipCost < dp[j + 1]) {
      dp[j + 1] = dp[j] + skipCost;
      backI[j + 1] = 0;
      backJ[j + 1] = j;
    }
  }

  const MAX_SPAN = 8;

  for (let i = 0; i < M; i++) {
    const rowBase = i * stride;
    const nextRowBase = (i + 1) * stride;
    const targetNorm = dSpokenNorm[i];
    const rawNorm = dRawNorm[i];

    for (let j = 0; j <= N; j++) {
      const curCost = dp[rowBase + j];
      if (curCost >= INF) continue;

      // 1. Skip extra spoken token S[j] (e.g. inserted 'номер')
      if (j < N) {
        const skipSpoken = /^(номер|от|до|и)$/i.test(sNorm[j]) ? 0.45 : 1.25;
        const cand = curCost + skipSpoken;
        if (cand < dp[rowBase + j + 1]) {
          dp[rowBase + j + 1] = cand;
          backI[rowBase + j + 1] = i;
          backJ[rowBase + j + 1] = j;
        }
      }

      // 2. Skip unmatched display token D[i] (interpolated later)
      {
        const cand = curCost + 1.35;
        if (cand < dp[nextRowBase + j]) {
          dp[nextRowBase + j] = cand;
          backI[nextRowBase + j] = i;
          backJ[nextRowBase + j] = j;
        }
      }

      // 3. Match D[i] to S[j .. j + k - 1] (k = 1..MAX_SPAN)
      let concatS = "";
      const maxK = Math.min(MAX_SPAN, N - j);
      for (let k = 1; k <= maxK; k++) {
        concatS += sNorm[j + k - 1];
        if (k > 1 && concatS.length > Math.max(targetNorm.length, rawNorm.length) + 5) {
          break;
        }

        let matchPenalty = INF;
        if (concatS === targetNorm || (rawNorm && concatS === rawNorm)) {
          matchPenalty = (k - 1) * 0.002;
        } else {
          const simTarget = tokenSimilarity(concatS, targetNorm);
          const simRaw = rawNorm && rawNorm !== targetNorm ? tokenSimilarity(concatS, rawNorm) : 0;
          const sim = Math.max(simTarget, simRaw);
          if (sim >= 0.72) {
            matchPenalty = (1 - sim) * 0.75 + (k - 1) * 0.01;
          } else if (
            k === 1 &&
            concatS.length >= 4 &&
            targetNorm.length >= 4 &&
            (concatS.startsWith(targetNorm.slice(0, 4)) || targetNorm.startsWith(concatS.slice(0, 4)))
          ) {
            matchPenalty = 0.45;
          } else if (k === 1) {
            matchPenalty = 1.15;
          }
        }

        if (matchPenalty < INF) {
          const cand = curCost + matchPenalty;
          const destIdx = nextRowBase + j + k;
          if (cand < dp[destIdx]) {
            dp[destIdx] = cand;
            backI[destIdx] = i;
            backJ[destIdx] = j;
          }
        }
      }
    }

    // Propagate horizontal spoken-skip along nextRowBase as well
    for (let j = 0; j < N; j++) {
      const c = dp[nextRowBase + j];
      if (c >= INF) continue;
      const skipSpoken = /^(номер|от|до|и)$/i.test(sNorm[j]) ? 0.45 : 1.25;
      if (c + skipSpoken < dp[nextRowBase + j + 1]) {
        dp[nextRowBase + j + 1] = c + skipSpoken;
        backI[nextRowBase + j + 1] = i + 1;
        backJ[nextRowBase + j + 1] = j;
      }
    }
  }

  // Backtrack from (M, N) to recover matched spoken span [sStartIdx, sEndIdx] for each display token i
  const matchedSpans: Array<{ sStart: number; sEnd: number } | null> = new Array(M).fill(null);
  let ci = M;
  let cj = N;
  while (ci > 0 || cj > 0) {
    const idx = ci * stride + cj;
    const pi = backI[idx];
    const pj = backJ[idx];
    if (pi < 0 || pj < 0) break;
    if (pi === ci - 1 && cj > pj) {
      matchedSpans[pi] = { sStart: pj, sEnd: cj - 1 };
    }
    ci = pi;
    cj = pj;
  }

  // Build final aligned timings, smoothly interpolating any rare unmatched display token
  const result: Array<{ word: string; start: number; end: number }> = new Array(M);
  for (let i = 0; i < M; i++) {
    const span = matchedSpans[i];
    if (span) {
      result[i] = {
        word: displayTokens[i],
        start: spokenTimings[span.sStart].start,
        end: spokenTimings[span.sEnd].end,
      };
    } else {
      result[i] = { word: displayTokens[i], start: -1, end: -1 };
    }
  }

  // Interpolate any unmatched gaps (start === -1) between nearest matched neighbors
  let idx = 0;
  while (idx < M) {
    if (result[idx].start >= 0) {
      idx++;
      continue;
    }
    let gapEnd = idx;
    while (gapEnd < M && result[gapEnd].start < 0) gapEnd++;
    const gapCount = gapEnd - idx;
    const prevEnd = idx > 0 ? result[idx - 1].end : (spokenTimings[0]?.start ?? 0);
    const nextStart =
      gapEnd < M
        ? result[gapEnd].start
        : Math.max(prevEnd + gapCount * 0.25, spokenTimings[N - 1]?.end ?? prevEnd + 0.3);
    const avail = Math.max(0.12 * gapCount, nextStart - prevEnd);
    const step = avail / gapCount;
    for (let g = 0; g < gapCount; g++) {
      const s = Number((prevEnd + g * step).toFixed(3));
      const e = Number((prevEnd + (g + 1) * step).toFixed(3));
      result[idx + g].start = s;
      result[idx + g].end = Math.max(Number((s + 0.08).toFixed(3)), e);
    }
    idx = gapEnd;
  }

  return result;
}
