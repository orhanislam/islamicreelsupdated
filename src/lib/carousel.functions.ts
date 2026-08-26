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
  return `Ти си елитен експерт и продуцент по създаване на вирусни Ислямски карусели за TikTok и Instagram Reels на български език, следващ доказаната рамка за максимално задържане и споделяния (Viral Carousel Framework) и стриктна Салафитска методология (Коран и Сахих Сунна според разбирането на праведните предци).

${exclusionText}

ТЕКУЩА ИЗБРАНА ТАУХИД ПОДТЕМА:
- Стълб: ${chosenTopic.pillarBg}
- Тема: ${chosenTopic.titleBg}
- Насока за Хука: "${chosenTopic.hookAngleBg}"
- Автентичен Далил: ${chosenTopic.dalilReference}
- Текст на далила: ${chosenTopic.dalilTextBg}
- Визуално настроение: ${chosenTopic.suggestedVisualMood}

РАМКА ЗА ВИРУСНИ КАРУСЕЛИ (VIRAL RETENTION FRAMEWORK) — ТОЧНО 4 СЛАЙДА:

1. Слайд 1 (Куката / Viral Hook):
   - ЦЕЛ: Моментално отваряне на любопитна празнина (curiosity gap), провокативен въпрос или контраинтуитивно твърдение, което спира скролването.
   - СТРИКТНА ЗАБРАНА ЗА ГЕНЕРИЧНИ ЗАГЛАВИЯ: Абсолютно забранени са общи заглавия като 'Таухид', 'Вярата в Аллах', 'Ислямски урок' или клишета като 'Защо си тук?'.
   - topTitle: Кратък драматичен етикет (макс 2-3 думи в скоби, напр. "[ТАЙНАТА НА РИЗКА]", "[ПАРАДОКСЪТ]", "[СКРИТИЯТ ЗНАК]").
   - mainText: Мощен, психологически издържан хук с любопитна празнина, контраинтуитивен факт или провокативен въпрос по темата (напр. базиран на "${chosenTopic.hookAngleBg}").
   - bottomText: Примамка за плъзгане (напр. "Плъзни наляво, за да разбереш тайната 👉" или "Плъзни наляво за истината").
   - footerText: "1/4 • Плъзнете наляво"
   - imagePrompt: Тъмен, кинематографичен природен пейзаж на АНГЛИЙСКИ (dark, moody, cinematic photorealistic 8k vertical, no people).

2. Слайд 2 (Тяло 1 / Обяснение, Контекст и Клифхенгър):
   - ЦЕЛ: Сбито богословско обяснение, структурирано за светкавично четене и задържане на вниманието.
   - СТРУКТУРА: Максимум 2-3 кратки, ударни изречения (без тежки абзаци).
   - ЗАДЪЛЖИТЕЛЕН КЛИФХЕНГЪР: Трябва ЗАДЪЛЖИТЕЛНО да завършва с клифхенгър или силен интригуващ преход към следващия слайд (напр. "Но най-поразяващото доказателство за това е скрито в думите на Аллах...", "Виж какво разкрива автентичното предание на следващия слайд 👉").
   - topTitle: Подзаглавие по темата (напр. "БОЖЕСТВЕНИЯТ ЗАКОН", "СКРИТАТА МЪДРОСТ").
   - mainText: Стегнати 2-3 изречения по същината на темата, завършващи с клифхенгър към Слайд 3.
   - bottomText: "Плъзни наляво за далила 👉"
   - footerText: "2/4 • Плъзнете наляво"
   - imagePrompt: Същият пейзаж с постепенно изгряваща светлина (gradually emerging light, misty dawn, no people, vertical 8k).

3. Слайд 3 (Тяло 2 / Автентичен Далил от Коран или Сахих Хадис):
   - ЦЕЛ: Безкомпромисен авторитет чрез директно цитиране на свещения далил (Коран или Сахих Хадис).
   - СТРУКТУРА: Сбит текст (макс 2-3 изречения). Точен цитат в кавички, последван от 1 кратко изречение преход към действието.
   - ЗАДЪЛЖИТЕЛЕН ПРЕХОД КЪМ ДЕЙСТВИЕТО: Завършва с преход към практическото духовно решение в Слайд 4 (напр. "А ето как да приложиш това спасение в живота си още днес...").
   - topTitle: Точен цитат и номер (напр. "${chosenTopic.dalilReference}").
   - mainText: Цитат на самия Аят или Хадис в кавички на правилен български език ("${chosenTopic.dalilTextBg}"), с преход към действието.
   - bottomText: "Плъзни за духовното решение 👉"
   - footerText: "3/4 • Плъзнете наляво"
   - imagePrompt: Сияйна светлина и слънчеви лъчи пробиващи през облаците (golden rays breaking through dramatic clouds over landscape, no people, vertical 8k).

4. Слайд 4 (Кулминация и Стойностен Призив за Действие / Value-Driven CTA):
   - ЦЕЛ: Конкретна дуа/разрешение и МОЩЕН, СТОЙНОСТЕН ПРИЗИВ ЗА ДЕЙСТВИЕ (Value-Driven CTA).
   - ЗАДЪЛЖИТЕЛНИ КЛЮЧОВИ ДУМИ: Задължително трябва да включва конкретно действие с български глаголи като "Запази" (Save this reminder/checklist), "Сподели" (Share for sadaqah jariyah) или "Коментирай" (Comment for engagement) с ясна полза за читателя.
   - topTitle: Заключителен апел (напр. "ДЕЙСТВИЕ И ДУА", "ТВОЯТ ПЛАН ЗА ДЕЙСТВИЕ").
   - mainText: Кратка искрена дуа или духовно практическо решение (1-2 изречения).
   - bottomText: Стойностен призив за действие (CTA) с ключови думи (напр. "Запази това напомняне за моменти на трудност и го сподели за садака джария!").
   - footerText: "4/4 • Запази & Сподели"
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
          content: `Генерирай 4-слайдов TikTok карусел по рамката за вирусни карусели (Viral Hook -> Сбито тяло с клифхенгъри -> Автентичен Далил -> Стойностен CTA със 'Запази'/'Сподели') за следната тема: ${topicQuery}`,
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

  // Fallback deterministic authentic slides from chosen Tawheed topic using Viral Framework
  const fallbackSlides: CarouselSlideData[] = [
    {
      topTitle: `[${chosenTopic.pillar === "rububiyyah" ? "ТАЙНАТА НА ГОСПОДСТВОТО" : chosenTopic.pillar === "uluhiyyah" ? "ТАЙНАТА НА ПОКЛОНЕНИЕТО" : "ВЕЛИЧИЕТО НА АЛЛАХ"}]`,
      mainText: chosenTopic.hookAngleBg,
      bottomText: "Плъзни наляво, за да научиш тайната 👉",
      footerText: "1/4 • Плъзнете наляво",
      imagePrompt: `dark moody cinematic landscape, ${chosenTopic.suggestedVisualMood}, vertical 9:16, photorealistic 8k, no people`,
    },
    {
      topTitle: "БОЖЕСТВЕНИЯТ ЗАКОН",
      mainText: `${chosenTopic.summaryBg} Но ето какво разкрива свещеното слово на следващия слайд...`,
      bottomText: "Плъзни наляво за далила 👉",
      footerText: "2/4 • Плъзнете наляво",
      imagePrompt: `majestic nature with soft morning dawn light breaking through fog, ${chosenTopic.suggestedVisualMood}, vertical 9:16, 8k, no people`,
    },
    {
      topTitle: `[${chosenTopic.dalilReference}]`,
      mainText: `${chosenTopic.dalilTextBg} А ето как да приложиш това спасение в живота си още днес...`,
      bottomText: "Плъзни за духовното решение 👉",
      footerText: "3/4 • Плъзнете наляво",
      imagePrompt: `golden divine sunbeams shining through mountains, magnificent nature, vertical 9:16, 8k, no people`,
    },
    {
      topTitle: "ДЕЙСТВИЕ И ДУА",
      mainText:
        "О, Аллах, утвърди сърцата ни в чистия Таухид и ни дари с душевна сила и благочестие.",
      bottomText: "Запази това напомняне за моменти на трудност и сподели за садака джария!",
      footerText: "4/4 • Запази & Сподели",
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
