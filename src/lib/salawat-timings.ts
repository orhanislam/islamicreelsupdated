export interface WordTiming {
  word: string;
  start: number;
  end: number;
}

/**
 * Strips punctuation and symbols for token pattern recognition
 */
function cleanToken(w: string): string {
  return (w || "").toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
}

/**
 * Checks if a word is the start of the Prophet's Salawat in Arabic
 */
export function isSalawatStartToken(w: string): boolean {
  const c = cleanToken(w);
  return (
    c.startsWith("саллалла") ||
    c.startsWith("саллялла") ||
    c.startsWith("салала") ||
    c.startsWith("sallalla") ||
    c.startsWith("sallala")
  );
}

/**
 * Checks if a word is the start of Sahabah honorific in Arabic
 */
export function isSahabahStartToken(w: string): boolean {
  const c = cleanToken(w);
  return (
    c.startsWith("радийалла") ||
    c.startsWith("радиялла") ||
    c.startsWith("радиалла") ||
    c.startsWith("radiyalla") ||
    c.startsWith("radialla")
  );
}

/**
 * Remaps authentic Arabic spoken Salawat and Sahabah honorific word timings
 * into Bulgarian meaning tokens ("мир да бъде с него", "Аллах да е доволен от него"),
 * distributing the timestamps smoothly across the exact spoken audio duration.
 *
 * This fulfills the requirement: Spoken audio articulates authentic Arabic dialect,
 * while video subtitles and on-screen text always display literary Bulgarian meaning!
 */
export function remapSalawatTimingsToBulgarian(timings: WordTiming[]): WordTiming[] {
  if (!Array.isArray(timings) || timings.length === 0) return timings || [];

  const result: WordTiming[] = [];

  for (let i = 0; i < timings.length; ) {
    const t0 = timings[i];
    const w0 = cleanToken(t0.word);

    // 1. Prophet Salawat detection
    if (isSalawatStartToken(t0.word)) {
      let matchCount = 0;

      // 4 tokens: Саллаллааху + 'алейхи + ва + саллям
      if (
        i + 3 < timings.length &&
        /^(?:'|`)?але[йй]х|ala(?:y|i)h/i.test(cleanToken(timings[i + 1].word)) &&
        /^(?:ва|уа|wa)$/i.test(cleanToken(timings[i + 2].word)) &&
        /(?:с[ае]лл[яе]м|sallam)/i.test(cleanToken(timings[i + 3].word))
      ) {
        matchCount = 4;
      }
      // 3 tokens: Саллаллааху + 'алейхи + ва-саллям
      else if (
        i + 2 < timings.length &&
        /^(?:'|`)?але[йй]х|ala(?:y|i)h/i.test(cleanToken(timings[i + 1].word)) &&
        /(?:с[ае]лл[яе]м|sallam)/i.test(cleanToken(timings[i + 2].word))
      ) {
        matchCount = 3;
      }
      // 3 tokens: Саллаллааху-алейхи + ва + саллям
      else if (
        i + 2 < timings.length &&
        /але[йй]х|ala(?:y|i)h/i.test(w0) &&
        /^(?:ва|уа|wa)$/i.test(cleanToken(timings[i + 1].word)) &&
        /(?:с[ае]лл[яе]м|sallam)/i.test(cleanToken(timings[i + 2].word))
      ) {
        matchCount = 3;
      }
      // 2 tokens: Саллаллааху + саллям
      else if (
        i + 1 < timings.length &&
        /(?:с[ае]лл[яе]м|sallam)/i.test(cleanToken(timings[i + 1].word))
      ) {
        matchCount = 2;
      }
      // 1 token: composite Саллаллааху-алейхи-ва-саллям
      else if (/(?:с[ае]лл[яе]м|sallam)/i.test(w0)) {
        matchCount = 1;
      }

      if (matchCount > 0) {
        const lastIdx = i + matchCount - 1;
        const start = t0.start;
        const end = Math.max(t0.end, timings[lastIdx].end);
        const lastWord = timings[lastIdx].word || "";
        const punctMatch = lastWord.match(/([.,;:!?…\-—–'"„“”»]+)$/);
        const trailingPunct = punctMatch ? punctMatch[1] : "";

        // Bulgarian meaning tokens: "мир да бъде с него"
        const bulgarianWords = ["мир", "да", "бъде", "с", "него" + trailingPunct];
        const weights = [3, 2, 4, 1.5, 4];
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        const span = Math.max(0.2, end - start);

        let curS = start;
        for (let k = 0; k < bulgarianWords.length; k++) {
          const isLast = k === bulgarianWords.length - 1;
          const dur = isLast ? end - curS : span * (weights[k] / totalWeight);
          const curE = isLast ? end : Math.round((curS + dur) * 1000) / 1000;
          result.push({
            word: bulgarianWords[k],
            start: Math.round(curS * 1000) / 1000,
            end: Math.max(Math.round(curS * 1000) / 1000 + 0.05, Math.round(curE * 1000) / 1000),
          });
          curS = curE;
        }

        i += matchCount;
        continue;
      }
    }

    // 2. Sahabah honorific detection (Радийаллааху 'анху / 'анхаа / 'анхум)
    if (isSahabahStartToken(t0.word)) {
      let matchCount = 0;
      let gender: "masc" | "fem" | "plural" = "masc";

      if (
        i + 1 < timings.length &&
        (/^(?:'|`)?анх/i.test(cleanToken(timings[i + 1].word)) || /^anh/i.test(cleanToken(timings[i + 1].word)))
      ) {
        matchCount = 2;
        const c1 = cleanToken(timings[i + 1].word);
        if (/(?:ум|hum)$/i.test(c1)) gender = "plural";
        else if (/(?:а|аа|ha|haa)$/i.test(c1)) gender = "fem";
      } else if (/(?:анх|anh)/i.test(w0)) {
        matchCount = 1;
        if (/(?:ум|hum)$/i.test(w0)) gender = "plural";
        else if (/(?:а|аа|ha|haa)$/i.test(w0)) gender = "fem";
      }

      if (matchCount > 0) {
        const lastIdx = i + matchCount - 1;
        const start = t0.start;
        const end = Math.max(t0.end, timings[lastIdx].end);
        const lastWord = timings[lastIdx].word || "";
        const punctMatch = lastWord.match(/([.,;:!?…\-—–'"„“”»]+)$/);
        const trailingPunct = punctMatch ? punctMatch[1] : "";

        const pronoun = gender === "plural" ? "тях" : gender === "fem" ? "нея" : "него";
        const bulgarianWords = ["Аллах", "да", "е", "доволен", "от", pronoun + trailingPunct];
        const weights = [5, 2, 1.5, 7, 2, 4];
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        const span = Math.max(0.2, end - start);

        let curS = start;
        for (let k = 0; k < bulgarianWords.length; k++) {
          const isLast = k === bulgarianWords.length - 1;
          const dur = isLast ? end - curS : span * (weights[k] / totalWeight);
          const curE = isLast ? end : Math.round((curS + dur) * 1000) / 1000;
          result.push({
            word: bulgarianWords[k],
            start: Math.round(curS * 1000) / 1000,
            end: Math.max(Math.round(curS * 1000) / 1000 + 0.05, Math.round(curE * 1000) / 1000),
          });
          curS = curE;
        }

        i += matchCount;
        continue;
      }
    }

    // Default: retain word
    result.push(t0);
    i++;
  }

  return result;
}
