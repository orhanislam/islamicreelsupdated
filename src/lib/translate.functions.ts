import { createServerFn } from "@tanstack/react-start";
import { geminiChat } from "@/lib/gemini";

const SYSTEM = `Ти си експертен преводач на ислямски текстове на български език.
Превеждаш английски превод (Muhsin Khan за Коран, или сахих хадис от sunnah.com) на български със следните строги правила:
1. АВТЕНТИЧНОСТ преди всичко. Никаква поетична свобода с ислямските концепции, но преводът трябва да звучи ЕСТЕСТВЕНО и КРАСИВО на български език (избягвай дървения, буквален превод, който нарушава граматиката).
2. Запази без превод следните термини в българска транслитерация: Аллах, Расулюллах, Пророк, Корана, Сура, Аят, иман, такуа, дини, дуа, шахада, салят, закят, саум, хадж, джахилия, дунйа, ахират, шейтан, малаика, джинн, шахид.
2а. ВИНАГИ заменяй съкращения като "(с/у)", "(саллялляху алейхи ва селлем)", "(ﷺ)", "(saw)", "(pbuh)", "(SAW)", "(PBUH)" с пълния български израз: "мир да бъде със него". Никога не оставяй "с/у" в превода.
3. "Allah" -> "Аллах" (никога "Бог"). "Lord" в контекста на Аллах -> "Господар".
4. Стил: Използвай възвишен, книжовен и ясен български език, подобаващ на свещени текстове.
5. Върни САМО българския превод, без обяснения, без кавички, без префикси.`;

const globalCache = (globalThis as any).__translationCache || new Map<string, string>();
if (!(globalThis as any).__translationCache) {
  (globalThis as any).__translationCache = globalCache;
}

export const translateToBulgarian = createServerFn({ method: "POST" })
  .inputValidator((input: { english: string; sourceRef: string; arabic?: string; ayahBounds?: any[] }) => input)
  .handler(async ({ data }) => {
    const sanitize = (t: string) =>
      t
        .replace(/\(\s*с\s*\/\s*у\s*\)/gi, "(мир да бъде със него)")
        .replace(/\bс\s*\/\s*у\b/gi, "мир да бъде със него")
        .replace(/\(\s*(saw|pbuh|ﷺ|саллялляху алейхи (?:ва|уе) селлем)\s*\)/gi, "(мир да бъде със него)");

    if (data.ayahBounds && Array.isArray(data.ayahBounds) && data.ayahBounds.length > 0) {
      const getCached = (b: any) => {
        const key = `ayah_${b.ayah}_${(b.english || "").trim()}`;
        const val = globalCache.get(key);
        return val && val.trim().length > 0 ? val.trim() : null;
      };

      const uncached = data.ayahBounds.filter((b) => !getCached(b));

      if (uncached.length > 0) {
        try {
          const prompt = `Източник: ${data.sourceRef}\n\nМоля, преведи следните аяти на български език (точен, литературен превод от оригиналния арабски текст, на ясен и правилен български език).\nЗа всеки аят върни превода във формат:\n=== AYAH номер ===\nтекст на превода\n\nАяти за превод:\n${uncached.map((b) => `Аят ${b.ayah}:\nАрабски: ${b.arabic || ""}\nАнглийски: ${b.english || ""}`).join("\n\n")}`;

          const rawResp = await geminiChat(
            "gemini-2.5-flash",
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
                  const cleanText = sanitize(text);
                  const formattedText = cleanText.startsWith(`(${targetB.ayah})`)
                    ? cleanText
                    : `(${targetB.ayah}) ${cleanText}`;
                  globalCache.set(`ayah_${targetB.ayah}_${(targetB.english || "").trim()}`, formattedText);
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
                const formattedText = cleanText.startsWith(`(${targetB.ayah})`)
                  ? cleanText
                  : `(${targetB.ayah}) ${cleanText}`;
                globalCache.set(cacheKey, formattedText);
              }
            }
          }

          if (uncached.length === 1 && rawResp.trim()) {
            const singleB = uncached[0];
            const cacheKey = `ayah_${singleB.ayah}_${(singleB.english || "").trim()}`;
            if (!globalCache.get(cacheKey) || !globalCache.get(cacheKey)!.trim()) {
              const cleanText = sanitize(rawResp).trim();
              const formattedText = cleanText.startsWith(`(${singleB.ayah})`)
                ? cleanText
                : `(${singleB.ayah}) ${cleanText}`;
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
            const prompt2 = `Източник: ${data.sourceRef}\n\nМоля, преведи следните аяти на български език, като всеки аят започва с номера му в скоби (напр. (1) ...):\n\n${stillMissing.map((b) => `(${b.ayah}) ${b.english || b.arabic || ""}`).join("\n\n")}`;
            const raw2 = await geminiChat("gemini-2.5-flash", [
              { role: "system", content: SYSTEM },
              { role: "user", content: prompt2 },
            ]);
            for (const b of stillMissing) {
              const cacheKey = `ayah_${b.ayah}_${(b.english || "").trim()}`;
              const lineRegex = new RegExp(`(?:^|\\n)\\s*(?:\\(${b.ayah}\\)|\\[${b.ayah}\\]|${b.ayah}\\.)\\s*([^\\n]+(?:\\n(?!\\s*(?:\\(|\\[|\\d+\\.))[^\n]+)*)`, "i");
              const match = raw2.match(lineRegex);
              if (match && match[1]) {
                const cleanText = sanitize(match[1]).trim();
                const formattedText = cleanText.startsWith(`(${b.ayah})`)
                  ? cleanText
                  : `(${b.ayah}) ${cleanText}`;
                globalCache.set(cacheKey, formattedText);
              }
            }
            if (stillMissing.length === 1 && raw2.trim()) {
              const singleB = stillMissing[0];
              const cacheKey = `ayah_${singleB.ayah}_${(singleB.english || "").trim()}`;
              if (!getCached(singleB)) {
                const cleanText = sanitize(raw2).trim();
                const formattedText = cleanText.startsWith(`(${singleB.ayah})`)
                  ? cleanText
                  : `(${singleB.ayah}) ${cleanText}`;
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
        return { ...b, bulgarian: globalCache.get(cacheKey) || "" };
      });
      let bulgarian = updatedBounds
        .map((b) => b.bulgarian)
        .filter(Boolean)
        .join("\n\n");

      if (!bulgarian || bulgarian.trim().length === 0) {
        try {
          await new Promise((r) => setTimeout(r, 2000));
          const fullPrompt = `Източник: ${data.sourceRef}\n\nМоля, преведи следните аяти на български език, като всеки аят започва с номера му в скоби (напр. (1) ...):\n\n${data.ayahBounds.map((b) => `(${b.ayah}) ${b.english || b.arabic || ""}`).join("\n\n")}`;
          const rawFull = await geminiChat("gemini-1.5-flash", [
            { role: "system", content: SYSTEM },
            { role: "user", content: fullPrompt },
          ]);
          bulgarian = sanitize(rawFull).trim();
        } catch (e) {
          console.error("[translate] Fallback full translation failed:", e);
        }
      }

      if (!bulgarian || bulgarian.trim().length === 0) {
        bulgarian = data.ayahBounds
          .map((b) => `(${b.ayah}) ${b.english || ""}`)
          .join("\n\n");
      }

      return { bulgarian, ayahBounds: updatedBounds, cached: false };
    }

    const cacheKey = `${data.sourceRef}_${data.english.trim()}`;
    const cachedVal = globalCache.get(cacheKey);
    if (cachedVal && cachedVal.trim().length > 0) {
      return { bulgarian: cachedVal.trim(), cached: true };
    }

    const prompt = `Източник: ${data.sourceRef}\n\nМоля, преведи следния хадис/текст на ясен, литературен и точен български език (от оригиналния арабски текст и английския превод).\nВърни САМО българския превод на текста (без въведения, без кавички и без коментари):\n\n${data.arabic ? `Арабски:\n${data.arabic}\n\n` : ""}Английски:\n${data.english}`;

    const raw = await geminiChat(
      "gemini-2.5-flash",
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
