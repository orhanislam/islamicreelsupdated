import { createServerFn } from "@tanstack/react-start";
import { geminiChat } from "@/lib/gemini";

const SYSTEM = `Ти си експерт по viral Islamic TikTok контент на български език.
Генерираш кратък, емоционален caption за TikTok пост на база ислямски текст (аят или хадис).
Строги правила:
1. На български. Без английски думи (освен имена като Allah, ако решиш).
2. Уважителен, автентичен тон. Никакъв clickbait, никакви преувеличения.
3. Без емоджита, които изглеждат играчно — позволени: ☪️ 🌙 ✨ 📿 🕌 (използвай 0-2 общо).
4. Дължина: 1-3 кратки реда + кука (hook) на първия ред.
5. След това: ред "—" и точно 12-18 hashtag-а, всички малки букви, без интервали.
   Микс: български (#корана #исляммладеж #ислямбългария), английски глобални (#islam #quran #islamicreminders #muslimtiktok #dawah #hadith), и тематични спрямо текста.
6. Върни САМО caption-а — без обяснения, без markdown, без "ето твоят caption".`;

export const generateCaption = createServerFn({ method: "POST" })
  .inputValidator((input: {
    bulgarian: string;
    sourceRef: string;
    kind: "ayah" | "hadith";
  }) => input)
  .handler(async ({ data }) => {
    const content = await geminiChat(
      "gemini-2.5-flash",
      [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: `Тип: ${data.kind}\nИзточник: ${data.sourceRef}\n\nТекст на български:\n${data.bulgarian}`,
        },
      ],
    );
    if (!content) throw new Error("Празен caption");
    return { caption: content };
  });
