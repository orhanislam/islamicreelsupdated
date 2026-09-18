/**
 * Islamic Glossary & Quranic Epithets Enricher:
 * Automatically annotates unfamiliar Quranic titles, epithets, and classical terms
 * with their clear meaning in quotation marks („...“), so that ordinary viewers
 * and social media audiences immediately understand who and what is being spoken about.
 *
 * Example:
 *   "И Дху-н-Нун, когато си отиде..."
 *   -> "И Дху-н-Нун „човекът на кита — пророкът Юнус“, когато си отиде..."
 */

export interface QuranicTermGloss {
  pattern: RegExp;
  cleanName: string;
  meaningQuote: string;
}

export const QURANIC_GLOSSARY_REGISTRY: QuranicTermGloss[] = [
  {
    // Дху-н-Нун (Prophet Yunus / Jonah)
    pattern: /(?<=^|[^\p{L}\p{N}])(?:Дху-н-Нун|Зу-н-Нун|Дхун-Нун|Дхуннун|Dhu-n-Nun|Zun-Nun)(?=[^\p{L}\p{N}]|$)(?!\s*["„“'\(][^"„“'\)]*(?:Юнус|кит))/gui,
    cleanName: "Дху-н-Нун",
    meaningQuote: "„човекът на кита — пророкът Юнус“",
  },
  {
    // Сахиб ал-Хут (Companion of the Whale - Yunus)
    pattern: /(?<=^|[^\p{L}\p{N}])(?:Сахиб\s+ал-Хут|Сахиб\s+ал-хуут|Сахибул\s+Хут|Sahib\s+al-Hut)(?=[^\p{L}\p{N}]|$)(?!\s*["„“'\(][^"„“'\)]*(?:Юнус|кит))/gui,
    cleanName: "Сахиб ал-Хут",
    meaningQuote: "„човекът на кита — пророкът Юнус“",
  },
  {
    // Дху-л-Карнайн (The Two-Horned / Two-Ages Ruler)
    pattern: /(?<=^|[^\p{L}\p{N}])(?:Дху-л-Карнайн|Зу-л-Карнайн|Дхул-Карнайн|Зулкарнайн|Dhu-l-Qarnayn|Dhul-Qarnayn)(?=[^\p{L}\p{N}]|$)(?!\s*["„“'\(][^"„“'\)]*епохи)/gui,
    cleanName: "Дху-л-Карнайн",
    meaningQuote: "„притежателят на двете епохи“",
  },
  {
    // Ал-Хадир / Ал-Хидр (The Righteous Servant of Allah)
    pattern: /(?<=^|[^\p{L}\p{N}])(?:Ал-Хадир|Ал-Хидр|ал-Хадир|ал-Хидр|Al-Khidr|Khidr)(?=[^\p{L}\p{N}]|$)(?!\s*["„“'\(][^"„“'\)]*праведни)/gui,
    cleanName: "Ал-Хадир",
    meaningQuote: "„праведният раб на Аллах — праведникът Хидр“",
  },
  {
    // Бану Исраил (Children of Israel / Prophet Ya'qub's progeny)
    pattern: /(?<=^|[^\p{L}\p{N}])(?:Бану\s+Исраил|Бани\s+Исраил|Banu\s+Israel|Bani\s+Israil)(?=[^\p{L}\p{N}]|$)(?!\s*["„“'\(][^"„“'\)]*Якуб)/gui,
    cleanName: "Бану Исраил",
    meaningQuote: "„синовете на Исраил — народът на пророка Якуб“",
  },
  {
    // Ас-Самири (The Samaritan who forged the golden calf)
    pattern: /(?<=^|[^\p{L}\p{N}])(?:Ас-Самири|ас-Самири|As-Samiri)(?=[^\p{L}\p{N}]|$)(?!\s*["„“'\(][^"„“'\)]*телец)/gui,
    cleanName: "Ас-Самири",
    meaningQuote: "„самарянинът, подмамил народа със златния телец“",
  },
  {
    // Карун (Korah)
    pattern: /(?<=^|[^\p{L}\p{N}])(?:Карун|Qarun)(?=[^\p{L}\p{N}]|$)(?!\s*["„“'\(][^"„“'\)]*богаташ)/gui,
    cleanName: "Карун",
    meaningQuote: "„надменният богаташ от народа на Муса“",
  },
  {
    // Талут (King Saul)
    pattern: /(?<=^|[^\p{L}\p{N}])(?:Талут|Talut)(?=[^\p{L}\p{N}]|$)(?!\s*["„“'\(][^"„“'\)]*Саул)/gui,
    cleanName: "Талут",
    meaningQuote: "„благочестивият цар Саул“",
  },
  {
    // Джалут (Goliath)
    pattern: /(?<=^|[^\p{L}\p{N}])(?:Джалут|Jalut)(?=[^\p{L}\p{N}]|$)(?!\s*["„“'\(][^"„“'\)]*Голиат)/gui,
    cleanName: "Джалут",
    meaningQuote: "„надменният воин Голиат“",
  },
  {
    // Азар (Azar - father of Ibrahim)
    pattern: /(?<=^|[^\p{L}\p{N}])(?:Азар|Azar)(?=[^\p{L}\p{N}]|$)(?!\s*["„“'\(][^"„“'\)]*Ибрахим)/gui,
    cleanName: "Азар",
    meaningQuote: "„бащата на пророка Ибрахим“",
  },
  {
    // Узайр (Ezra)
    pattern: /(?<=^|[^\p{L}\p{N}])(?:Узайр|Uzair|Uzayr)(?=[^\p{L}\p{N}]|$)(?!\s*["„“'\(][^"„“'\)]*Езра)/gui,
    cleanName: "Узайр",
    meaningQuote: "„праведникът Езра“",
  },
  {
    // Сидрат ал-Мунтаха (The Lote Tree of the Utmost Boundary)
    pattern: /(?<=^|[^\p{L}\p{N}])(?:Сидрат\s+ал-Мунтаха|Сидратул\s+Мунтаха|Sidrat\s+al-Muntaha)(?=[^\p{L}\p{N}]|$)(?!\s*["„“'\(][^"„“'\)]*Дървото)/gui,
    cleanName: "Сидрат ал-Мунтаха",
    meaningQuote: "„Дървото на предела на Седмото небе“",
  },
  {
    // Ал-Байт ал-Ма'мур (The Frequented House above the Kaaba)
    pattern: /(?<=^|[^\p{L}\p{N}])(?:Ал-Байт\s+ал-Ма'?мур|Байтул\s+Ма'?мур|Al-Bayt\s+al-Ma'?mur)(?=[^\p{L}\p{N}]|$)(?!\s*["„“'\(][^"„“'\)]*Небесният)/gui,
    cleanName: "Ал-Байт ал-Ма'мур",
    meaningQuote: "„Небесният храм на ангелите над Кааба“",
  },
  {
    // Ал-Каусар (Abundance / River of Jannah)
    pattern: /(?<=^|[^\p{L}\p{N}])(?:Ал-Каусар|ал-Каусар|Каусар|Al-Kawthar)(?=[^\p{L}\p{N}]|$)(?!\s*["„“'\(][^"„“'\)]*река)/gui,
    cleanName: "Ал-Каусар",
    meaningQuote: "„най-изобилното благо — райската река на Пратеника ﷺ“",
  },
  {
    // Ал-А'раф (The Heights)
    pattern: /(?<=^|[^\p{L}\p{N}])(?:Ал-А'?раф|ал-А'?раф|Al-A'raf)(?=[^\p{L}\p{N}]|$)(?!\s*["„“'\(][^"„“'\)]*възвишени)/gui,
    cleanName: "Ал-А'раф",
    meaningQuote: "„възвишенията между Рая и Ада“",
  },
];

/**
 * Enriches unfamiliar Quranic epithets and terms with their clear meaning in quotation marks („...“).
 * Preserves existing explanations without duplication.
 */
export function enrichUnfamiliarQuranicTerms(text: string): string {
  if (!text) return "";
  let enriched = text;

  for (const entry of QURANIC_GLOSSARY_REGISTRY) {
    enriched = enriched.replace(entry.pattern, () => {
      return `${entry.cleanName} ${entry.meaningQuote}`;
    });
  }

  // Normalize duplicate quotes or spacing if any occurred
  enriched = enriched
    .replace(/["„“]\s*["„“]/g, "„")
    .replace(/\s{2,}/g, " ");

  return enriched;
}
