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

/**
 * Normalizes all numbers and numerical expressions in Bulgarian text into
 * fully articulated phonetic words for TTS pronunciation.
 */
export function normalizeBulgarianNumbersForTts(text: string): string {
  if (!text) return "";

  let res = text;

  // 0. Convert Eastern Arabic numerals (٠-٩) to standard digits
  res = res.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));

  // 1. Collapse spaced thousands like "5 000" into "5000"
  res = res.replace(/(?<=^|[^\p{L}\p{N}])(\d{1,3})\s+(\d{3})(?=[^\p{L}\p{N}]|$)/gu, "$1$2");

  // 2. Ordinals with hyphens: 1-ви, 2-ри, 3-ти, 1-ва, 2-ра, etc.
  res = res.replace(
    /(?<=^|[^\p{L}\p{N}])(\d+-(?:ви|вия|вият|ва|вата|во|вото|ри|рия|рият|ра|рата|ро|рото|ти|тия|тият|та|тата|то|тото|ми|мия|мият|ма|мата|мо|мото))(?=[^\p{L}\p{N}]|$)/gui,
    (match) => {
      const lower = match.toLowerCase();
      return ORDINAL_MAP[lower] || match;
    }
  );

  // 3. Roman numerals before "век": e.g. "VII век", "XXI век"
  res = res.replace(
    /(?<=^|[^\p{L}\p{N}])([ivxlcdm]+)\s+(век(?:а|ът)?)(?=[^\p{L}\p{N}]|$)/gui,
    (_m, roman, century) => {
      const lower = roman.toLowerCase();
      const word = ROMAN_CENTURIES[lower];
      return word ? `${word} ${century}` : _m;
    }
  );

  // 4. Quran Chapter:Verse format e.g. "2:255" or "(13:28)" or "112:1-4"
  res = res.replace(
    /(?<=[^\p{L}\p{N}]|^)(\d+):(\d+)(?:-(\d+))?(?=[^\p{L}\p{N}]|$)/gu,
    (_m, surah, ayah, ayahEnd) => {
      const sWords = integerToBulgarianWords(parseInt(surah, 10), "feminine");
      const aStartWords = integerToBulgarianWords(parseInt(ayah, 10), "masculine");
      if (ayahEnd) {
        const aEndWords = integerToBulgarianWords(parseInt(ayahEnd, 10), "masculine");
        return `сура ${sWords}, аяти от ${aStartWords} до ${aEndWords}`;
      }
      return `сура ${sWords}, аят ${aStartWords}`;
    }
  );

  // 5. Hadith references like "#5368" or "№ 5368" or "№5368"
  res = res.replace(
    /(?:#|№\s*|(?<=^|[^\p{L}\p{N}])номер\s+)(\d+)(?=[^\p{L}\p{N}]|$)/gui,
    (_m, numStr) => {
      const val = parseInt(numStr, 10);
      return `номер ${integerToBulgarianWords(val, "masculine")}`;
    }
  );

  // 6. Percentages: e.g. 50% -> "петдесет процента"
  res = res.replace(
    /(?<=^|[^\p{L}\p{N}])(\d+)%(?=[^\p{L}\p{N}]|$)/gu,
    (_m, numStr) => {
      const val = parseInt(numStr, 10);
      return `${integerToBulgarianWords(val, "masculine")} процента`;
    }
  );

  // 7. Decimals: e.g. 3.5 or 3,5 (surrounded by digits)
  res = res.replace(
    /(?<=^|[^\p{L}\p{N}])(\d+)[.,](\d+)(?=[^\p{L}\p{N}]|$)/gu,
    (_m, intPart, decPart) => {
      const intVal = parseInt(intPart, 10);
      const decVal = parseInt(decPart, 10);
      return `${integerToBulgarianWords(intVal, "neuter")} цяло и ${integerToBulgarianWords(decVal, "neuter")}`;
    }
  );

  // 8. Negative integers: e.g. -5
  res = res.replace(
    /(?<=^|\s)-(\d+)(?=[^\p{L}\p{N}]|$)/gu,
    (_m, numStr) => {
      const val = parseInt(numStr, 10);
      return `минус ${integerToBulgarianWords(val, "neuter")}`;
    }
  );

  // 9. Standalone integers (Disabled to preserve digits for 1:1 TTS timing sync)
  // res = res.replace(
  //   /(?<=^|[^\p{L}\p{N}])(\d+)(?=[^\p{L}\p{N}]|$)/gu,
  //   ...
  // );

  return res;
}
