import { createServerFn } from "@tanstack/react-start";
import { geminiChat, geminiGenerateImage } from "./gemini";

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
      "gemini-3.6-flash",
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
  .inputValidator((input: { prompt?: string }) => input)
  .handler(async ({ data }) => {
    // Generate image via Gemini Imagen and return base64 straight to client.
    const safePrompt = (data && data.prompt) ? data.prompt : "beautiful cinematic islamic background";
    const { base64, mimeType } = await geminiGenerateImage(safePrompt);
    return { base64, mimeType };
  });

export const LOCAL_BACKGROUND_POOL: string[] = [
  "tiktok_images/img0.jpg",
  "tiktok_images/img1.jpg",
  "tiktok_images/img2.jpg",
  "tiktok_images/img3.jpg",
  "tiktok_output/bg1.jpg",
  "tiktok_output/bg2.jpg",
  "tiktok_output/bg3.jpg",
  "tiktok_output/bg4.jpg",
];

export async function getCarouselBackgroundsDirect(data?: {
  count?: number;
  cycleIndex?: number;
}): Promise<{ backgrounds: string[] }> {
  const count = Math.max(1, Math.min(20, Number(data?.count) || 4));
  const cycleIndex = Math.max(0, Number(data?.cycleIndex) || 0);
  const fs = await import("fs/promises");
  const path = await import("path");

  const pool = LOCAL_BACKGROUND_POOL;
  const backgrounds: string[] = [];

  for (let i = 0; i < count; i++) {
    const assetIdx = (cycleIndex * count + i) % pool.length;
    const relPath = pool[assetIdx];
    const absPath = path.resolve(process.cwd(), relPath);

    try {
      const buf = await fs.readFile(absPath);
      const base64 = buf.toString("base64");
      backgrounds.push(`data:image/jpeg;base64,${base64}`);
    } catch (err) {
      console.warn(`[getCarouselBackgrounds] Failed to read ${relPath}:`, err);
      backgrounds.push(
        `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920"><rect width="1080" height="1920" fill="%23111827"/></svg>`,
      );
    }
  }

  return { backgrounds };
}

export const getCarouselBackgrounds = createServerFn({ method: "POST" })
  .validator((input: { count?: number; cycleIndex?: number } | undefined) => input || {})
  .handler(async ({ data }: { data?: { count?: number; cycleIndex?: number } }): Promise<{ backgrounds: string[] }> => {
    return getCarouselBackgroundsDirect(data);
  });
