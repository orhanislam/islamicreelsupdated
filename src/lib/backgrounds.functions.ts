import { createServerFn } from "@tanstack/react-start";
import { geminiChat, geminiGenerateImage } from "@/lib/gemini";

const PROMPT_SYSTEM = `Ти си арт-директор за вирално ислямско съдържание в TikTok. Получаваш ислямски текст (аят или хадис) и измисляш 3 различни визуални идеи за вертикален фон 9:16. ВАЖНИ ПРАВИЛА:
- БЕЗ хора, БЕЗ животни, БЕЗ лица, БЕЗ ръце, БЕЗ силуети на хора.
- БЕЗ арабска калиграфия върху изображението, БЕЗ текст изобщо.
- БЕЗ изображения на Кааба, джамии с разпознаваеми минарета, само ако са далечни и абстрактни.
- Разрешени: красива природа (планини, океан, пустиня по залез, гори, водопади, звездно небе, мъгла, дъжд по прозорец), архитектурни детайли (арки, геометрични шарки, мраморни подове), интериор (стара библиотека, стара книга с лъч светлина, перо и мастило, свещ, чаша чай), текстури (злато, мрамор, кадифе, перголи).
- Стил: кинематографично, дълбочина на полето, мек филмов цвят, премиум, емоционално резониращ с темата на текста.
Върни JSON масив с 3 обекта: [{"label":"кратко име на български","prompt":"подробен английски prompt за image gen"}]. САМО JSON, без обяснения.`;

export const suggestBackgrounds = createServerFn({ method: "POST" })
  .inputValidator((input: { text: string; sourceRef: string }) => input)
  .handler(async ({ data }) => {
    const raw = await geminiChat(
      "gemini-2.5-flash",
      [
        { role: "system", content: PROMPT_SYSTEM },
        { role: "user", content: `Източник: ${data.sourceRef}\n\nТекст:\n${data.text}` },
      ],
      true,
    );
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error("Невалиден отговор от AI");
    }
    const arr = Array.isArray(parsed)
      ? parsed
      : Array.isArray((parsed as { suggestions?: unknown }).suggestions)
        ? (parsed as { suggestions: unknown[] }).suggestions
        : Array.isArray((parsed as { ideas?: unknown }).ideas)
          ? (parsed as { ideas: unknown[] }).ideas
          : [];
    const suggestions = (arr as Array<{ label?: string; prompt?: string }>)
      .filter((s) => s && typeof s.prompt === "string")
      .slice(0, 3)
      .map((s) => ({ label: s.label ?? "Идея", prompt: s.prompt! }));
    if (!suggestions.length) throw new Error("Няма предложения");
    return { suggestions };
  });

export const generateBackground = createServerFn({ method: "POST" })
  .inputValidator((input: { prompt: string }) => input)
  .handler(async ({ data }) => {
    // Generate image via Gemini Imagen and return base64 straight to client.
    const { base64, mimeType } = await geminiGenerateImage(data.prompt);
    return { base64, mimeType };
  });
