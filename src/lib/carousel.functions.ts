import { createServerFn } from "@tanstack/react-start";
import { geminiChat } from "./gemini";
import {
  getNextTawheedTopic,
  formatNegativeExclusionPrompt,
  getTawheedTaxonomy,
} from "./tawheed-taxonomy";
import {
  getRecentCarouselHistoryDirect,
  recordCarouselProposalUsageDirect,
} from "./memory.functions";

export interface CarouselSlideData {
  topTitle: string;
  mainText: string;
  bottomText: string;
  footerText: string;
  imagePrompt: string;
}

export interface GenerateCarouselInput {
  topic?: string;
  recentTopicIds?: string[];
  pillar?: "rububiyyah" | "uluhiyyah" | "asma_was_sifat";
}

export function buildCarouselSystemPrompt(
  chosenTopic: ReturnType<typeof getNextTawheedTopic>,
  exclusionText: string,
): string {
  return `Ти си експерт по създаване на вирусни Ислямски карусели за TikTok и Instagram Reels на български език, следващ стриктно Салафитската методология (Коран и Сахих Сунна според разбирането на праведните предци).

${exclusionText}

ТЕКУЩА ИЗБРАНА ТАУХИД ПОДТЕМА:
- Стълб: ${chosenTopic.pillarBg}
- Тема: ${chosenTopic.titleBg}
- Насока за Хука: "${chosenTopic.hookAngleBg}"
- Автентичен Далил: ${chosenTopic.dalilReference}
- Текст на далила: ${chosenTopic.dalilTextBg}
- Визуално настроение: ${chosenTopic.suggestedVisualMood}

СТРИКТНА СТРУКТУРА НА ТОЧНО 4 СЛАЙДА:
1. Слайд 1 (Куката / Hook):
   - topTitle: Кратък мощен етикет (макс 3 думи, напр. "[ТАУХИД]", "[БОЖЕСТВЕН ЗАКОН]", "[ИЗПИТАНИЕ]").
   - mainText: Завладяващо твърдение или въпрос на български, адресиращ конкретната подтема на Таухид (БЕЗ банални въпроси като 'Защо си тук?').
   - bottomText: Кратко пояснение или насока (напр. "Плъзни наляво за истината").
   - footerText: "1/4 • Плъзнете наляво"
   - imagePrompt: Тъмен, кинематографичен природен пейзаж на АНГЛИЙСКИ (dark, moody, cinematic photorealistic 8k vertical, no people).

2. Слайд 2 (Обяснение и контекст):
   - topTitle: Подзаглавие по темата (напр. "ВЕЛИКИЯТ БОЖЕСТВЕН ЗАКОН").
   - mainText: Дълбоко богословско обяснение на български без претрупан текст (20-30 думи).
   - bottomText: Поука за ежедневието.
   - footerText: "2/4 • Плъзнете наляво"
   - imagePrompt: Същият пейзаж с постепенно изгряваща светлина (gradually emerging light, misty dawn, no people, vertical 8k).

3. Слайд 3 (Автентичен Далил от Коран или Сахих Хадис):
   - topTitle: Точен цитат и номер (напр. "${chosenTopic.dalilReference}").
   - mainText: Цитат на самия Аят или Хадис в кавички на правилен български език (напр. "${chosenTopic.dalilTextBg}").
   - bottomText: Кратък размисъл.
   - footerText: "3/4 • Плъзнете наляво"
   - imagePrompt: Сияйна светлина и слънчеви лъчи пробиващи през облаците (golden rays breaking through dramatic clouds over landscape, no people, vertical 8k).

4. Слайд 4 (Кулминация, Дуа или Призив):
   - topTitle: Заключителен апел (напр. "ДУХОВНО СПАСЕНИЕ").
   - mainText: Кратка искрена дуа или духовно решение.
   - bottomText: Призив за действие (CTA, напр. "Сподели това знание за непрекъсната награда (садака джария)!").
   - footerText: "4/4 • Последвайте за още"
   - imagePrompt: Пейзажът изцяло окъпан в топла златна божествена светлина (bathed in warm divine golden light, magnificent majestic nature, no people, vertical 8k).

SALAFI HALAL ПРАВИЛА ЗА IMAGEPROMPT:
ВИНАГИ генерирай промптове САМО за природа, планини, морета, пустиня, космос или архитектура.
СТРИКТНО ЗАБРАНЕНО е включването на хора (people, person, man, woman), човешки лица (faces), силуети или животни.

Върни САМО валиден JSON масив от ТОЧНО 4 обекта, всеки с полетата { topTitle, mainText, bottomText, footerText, imagePrompt }. Без допълнителен текст преди или след JSON масива.`;
}

export async function generateCarouselScriptDirect(
  data: GenerateCarouselInput | { topic?: string } = {},
): Promise<CarouselSlideData[]> {
  // 1. Retrieve recent history to maintain state-tracking
  const recentHistory = await getRecentCarouselHistoryDirect(15).catch(() => []);

  // Combine passed recentTopicIds with persisted history
  const historyTopicIds = [
    ...((data as GenerateCarouselInput).recentTopicIds || []),
    ...recentHistory.map((h) => h.subtopicId || h.title),
  ];

  // 2. Select next diverse Tawheed topic
  let chosenTopic = getNextTawheedTopic(historyTopicIds);
  const pillar = (data as GenerateCarouselInput).pillar;
  if (pillar) {
    const taxonomy = getTawheedTaxonomy();
    const pillarMatch = taxonomy.find(
      (t) => t.pillar === pillar && !historyTopicIds.includes(t.id),
    );
    if (pillarMatch) chosenTopic = pillarMatch;
  }

  const topicQuery =
    data.topic && data.topic.trim().length > 3
      ? data.topic
      : `${chosenTopic.pillarBg}: ${chosenTopic.titleBg}`;

  // 3. Build exclusion prompt & system prompt
  const exclusionText = formatNegativeExclusionPrompt(recentHistory);
  const systemPrompt = buildCarouselSystemPrompt(chosenTopic, exclusionText);

  // 4. Call Gemini AI
  try {
    const raw = await geminiChat(
      "gemini-3.6-flash",
      [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Генерирай 4-слайдов TikTok карусел за следната тема: ${topicQuery}`,
        },
      ],
      true, // json mode
    );

    let clean = raw.replace(/```json\s*|\s*```/g, "").trim();
    const firstBracket = clean.indexOf("[");
    const lastBracket = clean.lastIndexOf("]");
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      clean = clean.substring(firstBracket, lastBracket + 1);
    }
    const parsed: CarouselSlideData[] = JSON.parse(clean);

    if (Array.isArray(parsed) && parsed.length >= 3) {
      // 5. Persist to memory state
      const hookText = parsed[0]?.mainText || parsed[0]?.topTitle || chosenTopic.hookAngleBg;
      await recordCarouselProposalUsageDirect({
        id: `carousel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type: "carousel",
        pillar: chosenTopic.pillar,
        subtopicId: chosenTopic.id,
        title: chosenTopic.titleBg,
        hook: hookText,
        premise: chosenTopic.summaryBg,
      }).catch((err) => console.warn("Failed to persist carousel to memory:", err));

      return parsed;
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn("[generateCarouselScriptDirect] AI call failed or fallback:", errorMsg);
  }

  // Fallback deterministic authentic slides from chosen Tawheed topic
  const fallbackSlides: CarouselSlideData[] = [
    {
      topTitle: `[${chosenTopic.pillar === "rububiyyah" ? "РУБУБИЙЯ" : chosenTopic.pillar === "uluhiyyah" ? "УЛЮХИЙЯ" : "АСМА СИФАТ"}]`,
      mainText: chosenTopic.hookAngleBg,
      bottomText: "Плъзни наляво за истината",
      footerText: "1/4 • Плъзнете наляво",
      imagePrompt: `dark moody cinematic landscape, ${chosenTopic.suggestedVisualMood}, vertical 9:16, photorealistic 8k, no people`,
    },
    {
      topTitle: "ВЕЛИКИЯТ БОЖЕСТВЕН ЗАКОН",
      mainText: chosenTopic.summaryBg,
      bottomText: "Размисли над това",
      footerText: "2/4 • Плъзнете наляво",
      imagePrompt: `majestic nature with soft morning dawn light breaking through fog, ${chosenTopic.suggestedVisualMood}, vertical 9:16, 8k, no people`,
    },
    {
      topTitle: `[${chosenTopic.dalilReference}]`,
      mainText: chosenTopic.dalilTextBg,
      bottomText: "Словото на Аллах и Неговия Пратеник ﷺ",
      footerText: "3/4 • Плъзнете наляво",
      imagePrompt: `golden sunbeams shining through mountains, magnificent nature, vertical 9:16, 8k, no people`,
    },
    {
      topTitle: "ДУХОВЕН ПОКОЙ И ДУА",
      mainText:
        "О, Аллах, утвърди сърцата ни в чистия Таухид и ни дари благочестие в този и в отвъдния свят.",
      bottomText: "Сподели с близък за садака джария!",
      footerText: "4/4 • Последвайте ни",
      imagePrompt: `warm radiant divine golden light over peaceful calm waters, majestic landscape, vertical 9:16, 8k, no people`,
    },
  ];

  await recordCarouselProposalUsageDirect({
    id: `carousel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    type: "carousel",
    pillar: chosenTopic.pillar,
    subtopicId: chosenTopic.id,
    title: chosenTopic.titleBg,
    hook: chosenTopic.hookAngleBg,
    premise: chosenTopic.summaryBg,
  }).catch(() => {});

  return fallbackSlides;
}

export const generateCarouselScript = createServerFn({ method: "POST" })
  .validator((input: GenerateCarouselInput | { topic?: string }) => input || {})
  .handler(async ({ data }): Promise<CarouselSlideData[]> => {
    return generateCarouselScriptDirect(data);
  });
