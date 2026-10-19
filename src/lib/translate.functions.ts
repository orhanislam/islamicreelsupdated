import { createServerFn } from "@tanstack/react-start";
import { geminiChat } from "./gemini";
import { sanitizeTheologicalRespect } from "./theological-sanitizer";
import { enrichUnfamiliarQuranicTerms } from "./islamic-glossary";

const SYSTEM = `Ти си водещ академичен и богословски преводач на ислямски свещени текстове (Свещения Коран и Сахих Сунната) на КНИЖОВЕН БЪЛГАРСКИ ЕЗИК (на кирилица).
ВАЖНО: НИКОГА НЕ ПИШИ АРАБСКИ БУКВИ ИЛИ ЛАТИНИЦА В ОТГОВОРА! Върни САМО И ЕДИНСТВЕНО превода на чист книжовен български език на кирилица!
Превеждаш от арабския оригинал и английския превод (Muhsin Khan / Sahih International за Коран, или сахих хадис от sunnah.com) на български със следните строги правила:
1. БОГОСЛОВСКА ТОЧНОСТ И ВИСОК КНИЖОВЕН СТИЛ:
- Преводът трябва да бъде богословски верен по акъидата на Ахлу Сунна уал Джама'а и да звучи ВЪЗВИШЕНО, ЕСТЕСТВЕНО и ГРАМАТИЧЕСКИ БЕЗУПРЕЧНО на български език (в духа на класическия академичен превод на Корана).
- Избягвай буквален (дървен) превод на английски синтактични конструкции (калки). Използвай естествен български словоред, правилно членуване (пълен/кратък член) и точни глаголни времена.
- При хадиси: превеждай "Narrated Abu Huraira..." / "It was narrated from..." като „Предава се от Абу Хурайра (Аллах да е доволен от него), че Пратеникът на Аллах (мир да бъде с него) каза:...“ (НИКОГА „Разказано от...“).
- Премахвай технически английски препратки в скоби като "[V. 2:255]" или "(see V. 3:10)". Ако в английския текст има кратко тълкувателно пояснение в скоби, вплети го плавно и естествено в българското изречение без квадратни скоби.
2. Запази в утвърдена българска ислямска транслитерация следните термини: Аллах, Пратеникът на Аллах, Пророкът, Коран, Сура, Аят, иман, ихсан, такуа, таухид, дуа, шахада, салят (намаз), закят, саум, хадж, дунйа, ахират, Дженнет (Рай), Джехеннем (Ад), шейтан, малаика (ангели), джинн, шахид.
2а. ВИНАГИ заменяй съкращения като "(с/у)", "(саллялляху алейхи ва селлем)", "(ﷺ)", "(saw)", "(pbuh)", "(SAW)", "(PBUH)" с граматически правилния български израз: "мир да бъде с него" (с предлог "с", НИКОГА "със него"). Никога не оставяй "с/у" в превода.
2б. Спазвай стриктно фонетичното правило за предлозите "с" и "със": пиши "със" САМО пред думи, започващи със "с" или "з" (напр. "със сърце", "със себе си", "със знание"), и "с" пред всички останали думи (напр. "с него", "с тях", "с милост", "с търпение").
3. "Allah" -> "Аллах" (никога "Бог"). "Lord" в контекста на Аллах -> "Господар" (напр. "Господарят на световете").
3а. "The Sole Creator" / "The One Creator" / "The Only Creator" -> "Единственият Творец" (СТРИКТНО Е ЗАБРАНЕНО да се използва "единичък", "единичкият", "единичният", "единичен Творец"). Говори с подобаващо уважение, достолепие и благоговение!
4. ВИНАГИ изписвай "тоест" като цяла дума. НИКОГА не използвай съкращението "т.е." или "т.е".
5. ПОЯСНЕНИЕ НА НЕПОЗНАТИ КОРАНИЧЕСКИ ПРОЗВИЩА И ЕПИТЕТИ В КАВИЧКИ: Когато в текста се споменава кораническо прозвище, което обикновените хора не знаят (напр. „Дху-н-Нун“, „Сахиб ал-Хут“, „Дху-л-Карнайн“, „Ал-Хадир“), ЗАДЪЛЖИТЕЛНО веднага след него постави в кавички неговото значение, напр. „Дху-н-Нун „човекът на кита — пророкът Юнус““, за да бъде веднага ясно на слушателя.
5а. ГРАМАТИЧЕСКА СЪГЛАСУВАНОСТ НА МЕСТОИМЕНИЯТА: Когато превеждаш местоимения (your, yours), задължително съгласувай рода и числото на български език:
- За думи от МЪЖКИ РОД (Господ, Господар, Творец, Създател, живот, път): „Вашия / твоя“ (НИКОГА „вашето Господ“, „вашето Творец“)!
- За думи от ЖЕНСКИ РОД (душа, вяра, молитва, дуа, милост): „Вашата / твоята“ (НИКОГА „вашето душа“)!
- За думи от СРЕДЕН РОД (сърце, дело, добро): „Вашето / твоето“!
- За думи в МНОЖЕСТВЕНО ЧИСЛО (дела, грехове, стъпки): „Вашите / твоите“ (НИКОГА „вашето дела“)!
6. Стил за озвучаване (Voiceover Ready): Текстът ще се чете от професионален диктор и ще се показва като субтитри в TikTok. Използвай ясна, ритмична и благозвучна пунктуация, без тромави скоби и без технически бележки под линия.
7. Върни САМО българския превод на кирилица, без арабски букви, без мета-обяснения, без префикси.`;

const globalCache = (globalThis as any).__translationCache || new Map<string, string>();
if (!(globalThis as any).__translationCache) {
  (globalThis as any).__translationCache = globalCache;
}

export function normalizeIslamicTermsBulgarian(t: string): string {
  if (!t) return "";
  const cleaned = t
    .replace(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]+/g, "")
    // Strip leftover English cross-reference brackets from Muhsin Khan / sunnah.com
    .replace(/\[\s*(?:see\s+)?v\.?\s*\d+\s*:\s*\d+[^\]]*\]/gi, "")
    .replace(/\(\s*(?:see\s+)?v\.?\s*\d+\s*:\s*\d+[^)]*\)/gi, "")
    // Abbreviations
    .replace(/\(\s*с\s*\/\s*у\s*\)/gi, "(мир да бъде с него)")
    .replace(/\bс\s*\/\s*у\b/gi, "мир да бъде с него")
    .replace(/(?:\(\s*(?:saw|pbuh|с\.а\.с\.|с\.а\.в\.)\s*\)|\b(?:с\.а\.с\.|с\.а\.в\.|ﷺ)\b)/gi, "мир да бъде с него")
    .replace(/\(\s*(?:saw|pbuh|ﷺ|саллялляху алейхи (?:ва|уе) селлем)\s*\)/gi, "(мир да бъде с него)")
    .replace(/мир\s+да\s+бъде\s+със\s+него/gi, "мир да бъде с него")
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
        const key = `ayah_v2_${b.ayah}_${(b.english || "").trim()}`;
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
          const prompt = `Източник: ${data.sourceRef}\n\nМоля, преведи следните аяти на възвишен, точен и граматически безупречен КНИЖОВЕН БЪЛГАРСКИ ЕЗИК (на кирилица!).\nВАЖНО: НЕ връщай арабския текст! Върни САМО превода на български език!\nЗа всеки аят върни превода във формат:\n=== AYAH номер ===\nтекст на превода на български език\n\nАяти за превод:\n${uncached.map((b) => `Аят ${b.ayah}:\n${b.arabic ? `Арабски оригинал: ${b.arabic}\n` : ""}Английски превод: ${b.english || ""}`).join("\n\n")}`;

          const rawResp = await geminiChat(
            "gemini-3.1-pro",
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
                  globalCache.set(`ayah_v2_${targetB.ayah}_${(targetB.english || "").trim()}`, cleanText);
                }
              }
            }
          }

          for (const targetB of uncached) {
            const cacheKey = `ayah_v2_${targetB.ayah}_${(targetB.english || "").trim()}`;
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
            const cacheKey = `ayah_v2_${singleB.ayah}_${(singleB.english || "").trim()}`;
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
            const prompt2 = `Източник: ${data.sourceRef}\n\nМоля, преведи следните аяти на КНИЖОВЕН БЪЛГАРСКИ ЕЗИК (на кирилица!), като всеки аят започва с номера му в скоби (напр. (1) ...):\nНЕ връщай арабски текст!\n\n${stillMissing.map((b) => `(${b.ayah}) ${b.english || b.arabic || ""}`).join("\n\n")}`;
            const raw2 = await geminiChat("gemini-3.1-pro", [
              { role: "system", content: SYSTEM },
              { role: "user", content: prompt2 },
            ]);
            for (const b of stillMissing) {
              const cacheKey = `ayah_v2_${b.ayah}_${(b.english || "").trim()}`;
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
              const cacheKey = `ayah_v2_${singleB.ayah}_${(singleB.english || "").trim()}`;
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
        const cacheKey = `ayah_v2_${b.ayah}_${(b.english || "").trim()}`;
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

    const cacheKey = `v2_${data.sourceRef}_${data.english.trim()}`;
    const cachedVal = globalCache.get(cacheKey);
    if (cachedVal && cachedVal.trim().length > 0 && !/[\u0600-\u06FF]/.test(cachedVal)) {
      return { bulgarian: cachedVal.trim(), cached: true };
    }

    const prompt = `Източник: ${data.sourceRef}\n\nМоля, преведи следния свещен текст / хадис на възвишен, книжовен и граматически безупречен БЪЛГАРСКИ ЕЗИК (на кирилица).\nНЕ връщай арабски текст! Върни САМО българския превод (без въведения и без коментари):\n\n${data.arabic ? `Арабски оригинал (за смислова точност):\n${data.arabic}\n\n` : ""}Английски превод:\n${data.english}`;

    const raw = await geminiChat(
      "gemini-3.1-pro",
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
