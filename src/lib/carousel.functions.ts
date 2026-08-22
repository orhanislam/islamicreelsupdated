import { createServerFn } from "@tanstack/react-start";
import { geminiChat } from "@/lib/gemini";

const PROMPT_SYSTEM = `Ти си експерт по създаване на ислямско съдържание за TikTok (карусели).
Целта е да се създадат 4 слайда по дадена тема. 
Всеки слайд трябва да има:
- topTitle: Кратко заглавие горе (макс 3 думи, главни букви).
- mainText: Основен текст в средата (кратък, ангажиращ).
- bottomText: Долен текст (поука, въпрос или цитат).
- footerText: Най-отдолу, напр. "← Плъзнете наляво" или "*Последвайте ни*".
- imagePrompt: Промпт на АНГЛИЙСКИ за AI генератор на изображения. Трябва да е photorealistic, vertical, dark cinematic lighting, 8k. 

Структура на 4-те слайда:
1. Хук (въпрос или интересна мисъл).
2. Обяснение или контекст.
3. Доказателство от Корана или Сунната.
4. Решение, Дуа или Призив.

Върни САМО валиден JSON масив с 4 обекта, всеки с тези 5 полета.`;

export const generateCarouselScript = createServerFn({ method: "POST" })
  .inputValidator((input: { topic: string }) => input)
  .handler(async ({ data }) => {
    const raw = await geminiChat(
      "gemini-3.6-pro", // use a good model for complex json
      [
        { role: "system", content: PROMPT_SYSTEM },
        { role: "user", content: `Тема: ${data.topic}` },
      ],
      true, // json mode
    );
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      throw new Error("Failed to parse carousel script.");
    }
  });
