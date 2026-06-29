import { createServerFn } from "@tanstack/react-start";
import { geminiChat } from "@/lib/gemini";

const SYS = `Ти си експерт по вирално ислямско съдържание за TikTok. Получаваш темата/настроението от потребителя и предлагаш 5 силни аята или сахих хадиси, които биха резонирали емоционално и биха станали вирални. ВАЖНО:
- Аяти само от Корана с реални Сура:Аят (например 2:255, 94:5-6, 13:28). НЕ измисляй препратки.
- Хадиси само сахих, ако не си 100% сигурен — НЕ предлагай хадис, предложи аят.
- За всяко предложение върни: kind ("ayah"|"hadith"), ref (например "2:255" или "Bukhari 1"), title_bg (кратко емоционално заглавие на български до 6 думи), reason_bg (1-2 изречения защо ще стане вирално и за кого), score (1-100).
- Подреди от най-силно (най-високият score) надолу.
Върни САМО валиден JSON: {"items":[{...},{...}]}. Без обяснения, без markdown.`;

export const suggestViral = createServerFn({ method: "POST" })
  .inputValidator((input: { theme: string; kind?: "any" | "ayah" | "hadith" }) => input)
  .handler(async ({ data }) => {
    const constraint = data.kind === "ayah" ? "Само аяти." : data.kind === "hadith" ? "Само сахих хадиси." : "Аяти или сахих хадиси.";
    const raw = await geminiChat(
      "gemini-2.5-flash",
      [
        { role: "system", content: SYS },
        { role: "user", content: `Тема/настроение: ${data.theme}\n${constraint}` },
      ],
      true,
    );
    let parsed: { items?: Array<{ kind: string; ref: string; title_bg: string; reason_bg: string; score: number }> };
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error("Невалиден отговор от AI");
    }
    const items = (parsed.items ?? [])
      .filter((i) => (i.kind === "ayah" || i.kind === "hadith") && typeof i.ref === "string")
      .slice(0, 5);
    if (!items.length) throw new Error("Няма предложения");
    return { items };
  });
