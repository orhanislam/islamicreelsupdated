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
 * Converts spelled-out Bulgarian number words in citations into direct digits.
 * E.g. "хадис номер едно" -> "хадис номер 1", "сура втора" -> "сура 2", "аят първи" -> "аят 1".
 */
export function convertBulgarianNumberWordsToDigits(text: string): string {
  if (!text) return "";
  let res = text;

  const spelledKeys = Object.keys(SPELLED_CITATION_NUMBERS).join("|");
  const pattern = new RegExp(
    `(?<=(?:^|[^\\p{L}\\p{N}])(?:номер|хадис|аят|сура|част|епизод|точка|т\\.)\\s+)(${spelledKeys})(?=[^\\p{L}\\p{N}]|$)`,
    "gui"
  );
  res = res.replace(pattern, (m) => SPELLED_CITATION_NUMBERS[m.toLowerCase()] || m);

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
