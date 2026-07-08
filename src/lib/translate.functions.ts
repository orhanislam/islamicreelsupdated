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
  .inputValidator((input: { english: string; sourceRef: string; ayahBounds?: any[] }) => input)
  .handler(async ({ data }) => {
    const sanitize = (t: string) =>
      t
        .replace(/\(\s*с\s*\/\s*у\s*\)/gi, "(мир да бъде със него)")
        .replace(/\bс\s*\/\s*у\b/gi, "мир да бъде със него")
        .replace(/\(\s*(saw|pbuh|ﷺ|саллялляху алейхи (?:ва|уе) селлем)\s*\)/gi, "(мир да бъде със него)");

    if (data.ayahBounds && Array.isArray(data.ayahBounds) && data.ayahBounds.length > 0) {
      const uncached = data.ayahBounds.filter((b) => !globalCache.has(`ayah_${b.ayah}_${(b.english || "").trim()}`));

      if (uncached.length > 0) {
        try {
          const prompt = `Източник: ${data.sourceRef}\n\nМоля, преведи следните аяти на български език (точен, литературен превод, без съкращения, ясен български текст).\nВърни САМО JSON обект, където ключовете са номерата на аятите, а стойностите са преводите им на български език:\n{\n  "105": "превод на аят 105...",\n  "106": "превод на аят 106..."\n}\n\nАяти:\n${uncached.map((b) => `Аят ${b.ayah}: ${b.english}`).join("\n\n")}`;
          const rawJson = await geminiChat(
            "gemini-2.5-flash",
            [
              { role: "system", content: SYSTEM },
              { role: "user", content: prompt },
            ],
            true
          );
          const parsed = JSON.parse(rawJson);
          for (const b of uncached) {
            const val = parsed[String(b.ayah)] || parsed[b.ayah];
            if (val && typeof val === "string" && val.trim().length > 0) {
              const bgText = sanitize(val).trim();
              globalCache.set(`ayah_${b.ayah}_${(b.english || "").trim()}`, bgText);
            }
          }
        } catch (e) {
          console.warn("[translate] Batch JSON translate failed, falling back to sequential:", e);
        }

        for (const b of data.ayahBounds) {
          const cacheKey = `ayah_${b.ayah}_${(b.english || "").trim()}`;
          if (!globalCache.has(cacheKey)) {
            try {
              const raw = await geminiChat("gemini-2.5-flash", [
                { role: "system", content: SYSTEM },
                { role: "user", content: `Източник: ${data.sourceRef} (Аят ${b.ayah})\n\nАнглийски:\n${b.english}` },
              ]);
              globalCache.set(cacheKey, sanitize(raw).trim());
            } catch (err) {
              console.error(`Error translating ayah ${b.ayah}:`, err);
              globalCache.set(cacheKey, b.english || "");
            }
          }
        }
      }

      const updatedBounds = data.ayahBounds.map((b) => {
        const cacheKey = `ayah_${b.ayah}_${(b.english || "").trim()}`;
        return { ...b, bulgarian: globalCache.get(cacheKey) || b.english || "" };
      });
      const bulgarian = updatedBounds.map((b) => b.bulgarian).join(" ");
      return { bulgarian, ayahBounds: updatedBounds, cached: false };
    }

    const cacheKey = data.english.trim();
    if (globalCache.has(cacheKey)) {
      return { bulgarian: globalCache.get(cacheKey)!, cached: true };
    }

    const raw = await geminiChat(
      "gemini-2.5-flash",
      [
        { role: "system", content: SYSTEM },
        { role: "user", content: `Източник: ${data.sourceRef}\n\nАнглийски:\n${data.english}` },
      ],
    );
    const bulgarian = sanitize(raw);
    if (!bulgarian) throw new Error("Празен превод");

    globalCache.set(cacheKey, bulgarian);
    return { bulgarian, cached: false };
  });
