import { createServerFn } from "@tanstack/react-start";
import { geminiChat } from "./gemini";
import { sanitizeTheologicalRespect } from "./theological-sanitizer";
import { enrichUnfamiliarQuranicTerms } from "./islamic-glossary";

const SYSTEM = `Ти си експертен преводач на ислямски текстове на БЪЛГАРСКИ ЕЗИК (на кирилица).
ВАЖНО: НИКОГА НЕ ПИШИ АРАБСКИ ТЕКСТ В ОТГОВОРА! Върни САМО И ЕДИНСТВЕНО превода на български език на кирилица!
Превеждаш английски превод (Muhsin Khan за Коран, или сахих хадис от sunnah.com) на български със следните строги правила:
1. АВТЕНТИЧНОСТ преди всичко. Никаква поетична свобода с ислямските концепции, но преводът трябва да звучи ЕСТЕСТВЕНО и КРАСИВО на български език (избягвай дървения, буквален превод, който нарушава граматиката).
2. Запази без превод следните термини в българска транслитерация: Аллах, Расулюллах, Пророк, Корана, Сура, Аят, иман, такуа, дини, дуа, шахада, салят, закят, саум, хадж, джахилия, дунйа, ахират, шейтан, малаика, джинн, шахид.
2а. ВИНАГИ заменяй съкращения като "(с/у)", "(саллялляху алейхи ва селлем)", "(ﷺ)", "(saw)", "(pbuh)", "(SAW)", "(PBUH)" с пълния български израз: "мир да бъде със него". Никога не оставяй "с/у" в превода.
3. "Allah" -> "Аллах" (никога "Бог"). "Lord" в контекста на Аллах -> "Господар".
3а. "The Sole Creator" / "The One Creator" / "The Only Creator" -> "Единственият Творец" (СТРИКТНО Е ЗАБРАНЕНО да се използва "единичък", "единичкият", "единичният", "единичен Творец"). Говори с подобаващо уважение, достолепие и благоговение!
4. ВИНАГИ изписвай "тоест" като цяла дума. НИКОГА не използвай съкращението "т.е." или "т.е".
5. ПОЯСНЕНИЕ НА НЕПОЗНАТИ КОРАНИЧЕСКИ ПРОЗВИЩА И ЕПИТЕТИ В КАВИЧКИ: Когато в текста се споменава кораническо прозвище, което обикновените хора не знаят (напр. „Дху-н-Нун“, „Сахиб ал-Хут“, „Дху-л-Карнайн“, „Ал-Хадир“), ЗАДЪЛЖИТЕЛНО веднага след него постави в кавички неговото значение, напр. „Дху-н-Нун „човекът на кита — пророкът Юнус““, за да бъде веднага ясно на обикновения читател.
5а. ГРАМАТИЧЕСКА СЪГЛАСУВАНОСТ НА МЕСТОИМЕНИЯТА: Когато превеждаш местоимения (your, yours), задължително съгласувай рода на български език:
- За думи от МЪЖКИ РОД (Господ, Господар, Творец, Създател, живот, път): „Вашия / твоя“ (НИКОГА „вашето Господ“, „вашето Творец“)!
- За думи от ЖЕНСКИ РОД (душа, вяра, молитва, дуа, милост): „Вашата / твоята“ (НИКОГА „вашето душа“)!
- За думи от СРЕДЕН РОД (сърце, дело, добро): „Вашето / твоето“!
- За думи в МНОЖЕСТВЕНО ЧИСЛО (дела, грехове, стъпки): „Вашите / твоите“ (НИКОГА „вашето дела“)!
Използвай официална и уважителна учтива форма („Вашия“, „Вашата“, „Вашите“).
6. Стил: Използвай възвишен, книжовен и ясен български език, подобаващ на свещени текстове.
7. Върни САМО българския превод на кирилица, без арабски букви, без мета-обяснения, без префикси.`;

const globalCache = (globalThis as any).__translationCache || new Map<string, string>();
if (!(globalThis as any).__translationCache) {
  (globalThis as any).__translationCache = globalCache;
}

export function normalizeIslamicTermsBulgarian(t: string): string {
  if (!t) return "";
  const cleaned = t
    .replace(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]+/g, "")
    // Abbreviations
    .replace(/\(\s*с\s*\/\s*у\s*\)/gi, "(мир да бъде с него)")
    .replace(/\bс\s*\/\s*у\b/gi, "мир да бъде с него")
    .replace(/(?:\(\s*(?:saw|pbuh|с\.а\.с\.|с\.а\.в\.)\s*\)|\b(?:с\.а\.с\.|с\.а\.в\.|ﷺ)\b)/gi, "мир да бъде с него")
    .replace(/\(\s*(?:saw|pbuh|ﷺ|саллялляху алейхи (?:ва|уе) селлем)\s*\)/gi, "(мир да бъде с него)")
    .replace(/\b(?:с\.в\.т\.|swt)\b/gi, "Субханаху ва Тааля")
    .replace(/(?:\(\s*(?:р\.а\.|ra|ра)\s*\)|\bр\.а\.)/gi, " (Аллах да е доволен от него) ")
    .replace(/\b(?:radiyallahu\s+anhu|радияллаху\s+анху)\b/gi, " Аллах да е доволен от него ")
    // Contextual fixes for proper Islamic terminology & preventing AI transliteration mistakes
    .replace(/\bal-djadjali\b/gi, "Ал-Даджжал")
    .replace(/\bал-джаджали\b/gi, "Ал-Даджжал")
    .replace(/\bал-даджал\b/gi, "Ал-Даджжал")
    .replace(/\bДаджал\b/g, "Даджжал")
    .replace(/\bал-Бухари\b/gi, "Ал-Бухари")
    .replace(/\bАбу Давуд\b/gi, "Абу Дауд")
    .replace(/(^|\s)т\.е\.(?=\s|$)/gi, "$1тоест")
    .replace(/(^|\s)т\.е(?=\s|$)/gi, "$1тоест")
    .replace(/\s+/g, " ")
    .trim();

  return sanitizeTheologicalRespect(enrichUnfamiliarQuranicTerms(cleaned));
}

export const translateToBulgarian = createServerFn({ method: "POST" })
  .inputValidator((input: { english: string; sourceRef: string; arabic?: string; ayahBounds?: any[] }) => input)
  .handler(async ({ data }) => {
    const sanitize = (t: string) => normalizeIslamicTermsBulgarian(t);

    if (data.ayahBounds && Array.isArray(data.ayahBounds) && data.ayahBounds.length > 0) {
      const getCached = (b: any) => {
        const key = `ayah_${b.ayah}_${(b.english || "").trim()}`;
        const val = globalCache.get(key);
        if (!val || val.trim().length === 0) return null;
        if (/[\u0600-\u06FF]/.test(val)) {
          globalCache.delete(key);
          return null;
        }
        return val.trim();
      };

      const uncached = data.ayahBounds.filter((b) => !getCached(b));

      if (uncached.length > 0) {
        try {
          const prompt = `Източник: ${data.sourceRef}\n\nМоля, преведи следните аяти на БЪЛГАРСКИ ЕЗИК (на кирилица!).\nВАЖНО: НЕ връщай арабския текст! Върни САМО превода на български език!\nЗа всеки аят върни превода във формат:\n=== AYAH номер ===\nтекст на превода на български език\n\nАяти за превод:\n${uncached.map((b) => `Аят ${b.ayah}:\n${b.english || b.arabic || ""}`).join("\n\n")}`;

          const rawResp = await geminiChat(
            "gemini-1.5-pro",
            [
              { role: "system", content: SYSTEM },
              { role: "user", content: prompt },
            ],
            false
          );

          const delimiterRegex = /===\s*(?:AYAH|АЯТ)\s*(\d+)\s*===/i;
          if (delimiterRegex.test(rawResp)) {
            const parts = rawResp.split(delimiterRegex);
            for (let i = 1; i < parts.length; i += 2) {
              const ayahNum = Number(parts[i]);
              let text = (parts[i + 1] || "").trim();
              text = text.replace(/===\s*(?:AYAH|АЯТ).*$/is, "").trim();
              if (ayahNum && text) {
                const targetB = uncached.find((b) => Number(b.ayah) === ayahNum);
                if (targetB) {
                  let cleanText = sanitize(text);
                  cleanText = cleanText.replace(new RegExp(`^(?:\\(${targetB.ayah}\\)|\\[${targetB.ayah}\\]|${targetB.ayah}\\.?)\\s*`), "").trim();
                  globalCache.set(`ayah_${targetB.ayah}_${(targetB.english || "").trim()}`, cleanText);
                }
              }
            }
          }

          for (const targetB of uncached) {
            const cacheKey = `ayah_${targetB.ayah}_${(targetB.english || "").trim()}`;
            if (!globalCache.get(cacheKey) || !globalCache.get(cacheKey)!.trim()) {
              const lineRegex = new RegExp(`(?:^|\\n)\\s*(?:\\(${targetB.ayah}\\)|\\[${targetB.ayah}\\]|${targetB.ayah}\\.)\\s*([^\\n]+(?:\\n(?!\\s*(?:\\(|\\[|\\d+\\.))[^\n]+)*)`, "i");
              const match = rawResp.match(lineRegex);
              if (match && match[1]) {
                const cleanText = sanitize(match[1]).trim();
                const formattedText = cleanText.replace(/^(?:\(\d+\)|\[\d+\]|\d+\.)\s*/, "");
                globalCache.set(cacheKey, formattedText);
              }
            }
          }

          if (uncached.length === 1 && rawResp.trim()) {
            const singleB = uncached[0];
            const cacheKey = `ayah_${singleB.ayah}_${(singleB.english || "").trim()}`;
            if (!globalCache.get(cacheKey) || !globalCache.get(cacheKey)!.trim()) {
              const cleanText = sanitize(rawResp).trim();
              const formattedText = cleanText.replace(/^(?:\(\d+\)|\[\d+\]|\d+\.)\s*/, "");
              globalCache.set(cacheKey, formattedText);
            }
          }
        } catch (e) {
          console.warn("[translate] Batch translate failed, falling back to sequential:", e);
        }

        const stillMissing = data.ayahBounds.filter((b) => !getCached(b));
        if (stillMissing.length > 0) {
          try {
            await new Promise((r) => setTimeout(r, 1000));
            const prompt2 = `Източник: ${data.sourceRef}\n\nМоля, преведи следните аяти на БЪЛГАРСКИ ЕЗИК (на кирилица!), като всеки аят започва с номера му в скоби (напр. (1) ...):\nНЕ връщай арабски текст!\n\n${stillMissing.map((b) => `(${b.ayah}) ${b.english || b.arabic || ""}`).join("\n\n")}`;
            const raw2 = await geminiChat("gemini-1.5-pro", [
              { role: "system", content: SYSTEM },
              { role: "user", content: prompt2 },
            ]);
            for (const b of stillMissing) {
              const cacheKey = `ayah_${b.ayah}_${(b.english || "").trim()}`;
              const lineRegex = new RegExp(`(?:^|\\n)\\s*(?:\\(${b.ayah}\\)|\\[${b.ayah}\\]|${b.ayah}\\.)\\s*([^\\n]+(?:\\n(?!\\s*(?:\\(|\\[|\\d+\\.))[^\n]+)*)`, "i");
              const match = raw2.match(lineRegex);
              if (match && match[1]) {
                const cleanText = sanitize(match[1]).trim();
                const formattedText = cleanText.replace(/^(?:\(\d+\)|\[\d+\]|\d+\.)\s*/, "");
                globalCache.set(cacheKey, formattedText);
              }
            }
            if (stillMissing.length === 1 && raw2.trim()) {
              const singleB = stillMissing[0];
              const cacheKey = `ayah_${singleB.ayah}_${(singleB.english || "").trim()}`;
              if (!getCached(singleB)) {
                const cleanText = sanitize(raw2).trim();
                const formattedText = cleanText.replace(/^(?:\(\d+\)|\[\d+\]|\d+\.)\s*/, "");
                globalCache.set(cacheKey, formattedText);
              }
            }
          } catch (err) {
            console.error("[translate] Single batch retry failed:", err);
          }
        }
      }

      const updatedBounds = data.ayahBounds.map((b) => {
        const cacheKey = `ayah_${b.ayah}_${(b.english || "").trim()}`;
        const cached = globalCache.get(cacheKey);
        const existingBg = b.bulgarian ? (b.bulgarian.startsWith(`(${b.ayah})`) ? b.bulgarian : `(${b.ayah}) ${b.bulgarian}`) : "";
        return { ...b, bulgarian: cached || existingBg || `(${b.ayah}) ${b.english || ""}` };
      });
      let bulgarian = updatedBounds
        .map((b) => b.bulgarian)
        .filter(Boolean)
        .join("\n\n");

      return { bulgarian, ayahBounds: updatedBounds, cached: false };
    }

    const cacheKey = `${data.sourceRef}_${data.english.trim()}`;
    const cachedVal = globalCache.get(cacheKey);
    if (cachedVal && cachedVal.trim().length > 0 && !/[\u0600-\u06FF]/.test(cachedVal)) {
      return { bulgarian: cachedVal.trim(), cached: true };
    }

    const prompt = `Източник: ${data.sourceRef}\n\nМоля, преведи следния хадис/текст на ясен, литературен и точен БЪЛГАРСКИ ЕЗИК (на кирилица).\nНЕ връщай арабски текст! Върни САМО българския превод (без въведения и без коментари):\n\nАнглийски:\n${data.english}`;

    const raw = await geminiChat(
      "gemini-1.5-pro",
      [
        { role: "system", content: SYSTEM },
        { role: "user", content: prompt },
      ],
    );
    const bulgarian = sanitize(raw).trim() || data.english.trim();
    if (!bulgarian) throw new Error("Празен превод");

    globalCache.set(cacheKey, bulgarian);
    return { bulgarian, cached: false };
  });
