import { createServerFn } from "@tanstack/react-start";
import { geminiChat, type ChatMessage } from "./gemini";
import { fetchSunnahHadith, type SunnahCollection } from "./sunnah.functions";
import { fetchAyah } from "./quran.functions";
import { translateToBulgarian } from "./translate.functions";
import { searchPexelsVideos, matchTheologicalConcept } from "./pexels.functions";
import { synthesizeHadithNarration } from "./tts.functions";
import { startServerRenderJob, getJobsDir } from "./render.functions";
import { getAiMemory, updateAiMemory, recordProposalUsages } from "./memory.functions";
import { createTask, updateTask, listTasks, clearAllTasks } from "./tasks-engine";
import {
  getNextTawheedTopic,
  formatNegativeExclusionPrompt,
  getTawheedTaxonomy,
} from "./tawheed-taxonomy";
import {
  getExcludedScripturesOneMonth,
  checkProposalOneMonthCooldown,
  recordRejectedScriptureDirect,
  type ExcludedScripturesData,
} from "./generation-history.functions";
import {
  fetchAuthenticTafsirDirect,
  getVerifiedHadithSharhDirect,
  formatTafsirGroundingPrompt,
  detectScriptureFromText,
  enrichProposalWithAuthenticTafsir,
} from "./tafsir.functions";


export type ExplainedVideoScript = {
  hookQuestion: string; // 1a. Въпрос за грабване на вниманието в първите 2-3 секунди
  hookContext: string;  // 1b. Кратко обяснение на болката/ситуацията (1-2 изречения)
  dalilIntro?: string;  // 2a. Преход към далила ("Чуй какво казва Аллах в Корана:" или "Пратеникът на Аллах ﷺ ни учи:")
  dalilText?: string;   // 2b. Текст на аята или хадиса
  explanation: string;  // 3. Разяснение / Поука / Тефсир
  actionStep: string;   // 4. Практическо действие още днес + призив за споделяне
  sourceScholar?: string; // напр. "Шейх Абдур-Рахман ас-Са'ди" или "Salafi Shaykh AI"
  sourceWork?: string;    // напр. "Тефсир ас-Са'ди (Quran.com API)" или "Шарх ал-Арба'ин ан-Навауийя"
  sourceText?: string;    // автентичен текст от базата данни
  sourceType?: "database" | "salafi_ai"; // източник: проверена база данни или Salafi AI
  isAuthenticVerified?: boolean; // флаг за гарантиран проверен източник
};

export type VideoProposal = {
  title: string;
  type: "hadith" | "quran" | "tiktok" | "general" | "carousel" | "explained_video";
  collection?: string;
  number?: number;
  surah?: number;
  ayah?: number;
  count?: number;
  summaryBg: string;
  themeBg: string;
  searchQuery: string;
  tiktokTheme?: "hormozi" | "emerald" | "neon" | "classic";
  // CapCut-like editing controls
  bRollInterval?: number; // seconds between B-Roll scene switches (e.g. 3)
  useBRoll?: boolean; // enable multi-scene B-Roll
  subtitlePosition?: "bottom" | "middle" | "lower-third";
  quality?: "high" | "720p";
  carouselSlides?: {
    topTitle: string;
    mainText: string;
    bottomText: string;
    footerText: string;
    imagePrompt: string;
    quoteText?: string;
    commentaryText?: string;
    sourceBadge?: string;
  }[];
  scriptWorkflow?: ExplainedVideoScript;
};

export function cleanProposalTitle(rawTitle: string): string {
  if (!rawTitle || typeof rawTitle !== "string") return "";
  let title = rawTitle.trim();

  // Pattern matching unwanted metadata tags (platforms, formats, slide indicators, viral tags)
  // while strictly preserving authentic citations like [Коран 2:255], [Сахих ал-Бухари #6424], [Сура Ал-Фатиха (1:1-2)], [Сунан Ат-Тирмизи #1987], (112:1-4), etc.
  const metaPattern =
    /(?:tiktok\s*carousels?|tiktok|карусели?|carousel|carousels|коран\s*\/\s*tiktok|tiktok\s*\/\s*коран|коран\s*\/\s*reels|reels\s*\/\s*коран|instagram\s*reels?|reels?|youtube\s*shorts?|shorts?|слайд\s*\d+|slide\s*\d+|viral|вайръл)/i;
  const metaBracketRegex = new RegExp(`\\[\\s*${metaPattern.source}\\s*\\]\\s*[:-]?\\s*`, "gi");
  const metaPrefixRegex = new RegExp(`^\\s*\\[\\s*${metaPattern.source}\\s*\\]\\s*[:-]?\\s*`, "i");
  const unbracketedPrefixRegex = new RegExp(`^\\s*${metaPattern.source}\\s*[:-]\\s*`, "i");

  // 1. Repeatedly strip leading bracketed meta prefixes
  while (metaPrefixRegex.test(title)) {
    title = title.replace(metaPrefixRegex, "").trim();
  }

  // 2. Strip metadata tags embedded anywhere in the title or trailing
  title = title.replace(metaBracketRegex, " ").trim();

  // 3. Strip unbracketed leading prefixes (e.g. "tiktok: ...", "карусел: ...", "reels - ...")
  while (unbracketedPrefixRegex.test(title)) {
    title = title.replace(unbracketedPrefixRegex, "").trim();
  }

  // 4. Clean empty brackets leftover if nested brackets existed (e.g. "[[tiktok carousels]]" -> "[]")
  title = title.replace(/\[\s*\]/g, "").trim();

  // 5. Clean extra outer brackets around valid bracketed citations (e.g. "[[Коран 2:255]]" -> "[Коран 2:255]")
  title = title
    .replace(/\[\s*(\[[^\]]+\])/g, "$1")
    .replace(/(\[[^\]]+\])\s*\]/g, "$1")
    .trim();

  // 6. Clean dangling leading or trailing punctuation
  title = title
    .replace(/^[:-]\s*/, "")
    .replace(/\s*[:-]$/, "")
    .trim();

  // 7. Normalize multi-spaces
  title = title.replace(/\s{2,}/g, " ").trim();

  return title;
}

export function extractTopic(proposal: {
  title?: string;
  themeBg?: string;
  topic?: string;
}): string {
  if (proposal.topic && proposal.topic.trim()) {
    return proposal.topic.trim();
  }
  const title = proposal.title ? cleanProposalTitle(proposal.title) : "";
  if (!title) {
    return (proposal.themeBg || "").replace(/^тема:\s*/i, "").trim();
  }

  // 1. If format is "[Коран 13:28] Покоят на сърцата" or "[Сахих ал-Бухари #6424] Силата на търпението"
  if (title.includes("] ")) {
    const after = title.split("] ").slice(1).join("] ").trim();
    if (after) return after.replace(/^["„“'«»\s:\-–—]+|["„“'«»\s:\-–—]+$/g, "").trim();
  }
  if (title.includes("]")) {
    const after = title.split("]").slice(1).join("]").replace(/^[:\-–—\s]+/, "").trim();
    if (after) return after.replace(/^["„“'«»\s:\-–—]+|["„“'«»\s:\-–—]+$/g, "").trim();
  }

  // 2. If format is "Коран 2:255 • Защита от злото" or "Защита от злото • Коран 2:255"
  if (title.includes("•")) {
    const parts = title.split("•").map((p) => p.trim()).filter(Boolean);
    const nonCitation = parts.find(
      (p) => !/(?:коран|сура|хадис|бухари|муслим|тирмизи|навауи|\d+[:.]\d+)/i.test(p)
    );
    if (nonCitation) return nonCitation.replace(/^["„“'«»\s:\-–—]+|["„“'«»\s:\-–—]+$/g, "").trim();
    if (parts.length > 1) return parts[1].replace(/^["„“'«»\s:\-–—]+|["„“'«»\s:\-–—]+$/g, "").trim();
  }

  // 3. If format is "Коран 6:19 - Доказателствата на Аллах"
  if (/\s+[-–—]\s+/.test(title)) {
    const parts = title.split(/\s+[-–—]\s+/).map((p) => p.trim()).filter(Boolean);
    const nonCitation = parts.find(
      (p) => !/(?:коран|сура|хадис|бухари|муслим|тирмизи|навауи|\d+[:.]\d+)/i.test(p)
    );
    if (nonCitation) return nonCitation.replace(/^["„“'«»\s:\-–—]+|["„“'«»\s:\-–—]+$/g, "").trim();
    if (parts.length > 1) return parts[1].replace(/^["„“'«»\s:\-–—]+|["„“'«»\s:\-–—]+$/g, "").trim();
  }

  // 4. Check if title is purely a citation (e.g. "Коран 2:255" or "Сура Ал-Бакара 2:255")
  const isPureCitation =
    /^(?:коран|сура|хадис|сахих|сунан|айят|аят)\b/i.test(title) && /\d+/.test(title);
  if (isPureCitation && proposal.themeBg) {
    return proposal.themeBg
      .replace(/^тема:\s*/i, "")
      .replace(/^["„“'«»\s:\-–—]+|["„“'«»\s:\-–—]+$/g, "")
      .trim();
  }

  return title.replace(/^["„“'«»\s:\-–—]+|["„“'«»\s:\-–—]+$/g, "").trim();
}

async function injectAuthenticCarouselText(proposals: VideoProposal[]) {
  if (!proposals) return;
  const rx =
    /[\p{Extended_Pictographic}\p{Emoji_Presentation}\u2728\u2B50\u2600-\u26FF\u2700-\u27BF]/gu;

  for (const prop of proposals) {
    if (!prop) continue;
    if (prop.title) {
      prop.title = cleanProposalTitle(prop.title);
    }
    if (prop.type !== "carousel" || !prop.carouselSlides || prop.carouselSlides.length < 2)
      continue;

    let bulgarian = "";
    let reference = "";

    try {
      if (prop.surah && prop.ayah) {
        const a = await fetchAyah({ data: { surah: Number(prop.surah), ayah: Number(prop.ayah) } });
        reference = `Сура ${a.surahName} (${a.surah}:${a.ayah})`;
        const t = await translateToBulgarian({
          data: {
            english: a.english,
            sourceRef: reference,
            arabic: a.arabic,
            ayahBounds: a.ayahBounds,
          },
        });
        bulgarian = t.bulgarian;
      } else if (prop.collection && prop.number) {
        const h = await fetchSunnahHadith({
          data: { collection: prop.collection as SunnahCollection, number: Number(prop.number) },
        });
        const t = await translateToBulgarian({
          data: { english: h.english, sourceRef: h.reference, arabic: h.arabic },
        });
        bulgarian = t.bulgarian;
        reference = h.reference;
      }
    } catch (e) {
      console.warn("Failed to fetch authentic text for carousel:", e);
    }

    if (bulgarian) {
      const originalSlides = prop.carouselSlides;
      const hookSlide = { ...originalSlides[0] };
      const ctaSlide = { ...originalSlides[originalSlides.length - 1] };
      const defaultPrompt =
        originalSlides[1]?.imagePrompt ||
        originalSlides[0]?.imagePrompt ||
        "cinematic, dark landscape, 8k, vertical 9:16, no people";

      // Build exactly 4 slides adhering strictly to the Viral Framework
      // Slide 1: Hook
      hookSlide.footerText = "1/4 • Плъзнете наляво";
      if (!hookSlide.bottomText) hookSlide.bottomText = "Плъзни наляво за тайната -->";

      // Slide 2: Body Context & Cliffhanger
      let contextSlide: {
        topTitle: string;
        mainText: string;
        bottomText: string;
        footerText: string;
        imagePrompt: string;
        quoteText?: string;
        commentaryText?: string;
        sourceBadge?: string;
      };
      if (originalSlides.length >= 4) {
        contextSlide = { ...originalSlides[1] };
      } else {
        const baseContext =
          prop.summaryBg ||
          "Всеки един от нас търси мир, но истинското спасение лежи в правилното разбиране на вярата.";
        contextSlide = {
          topTitle: "БОЖЕСТВЕНИЯТ ЗАКОН",
          mainText: `${baseContext} Но ето какво разкрива свещеното слово на следващия слайд...`,
          bottomText: "Плъзни наляво за далила -->",
          footerText: "2/4 • Плъзнете наляво",
          imagePrompt: originalSlides[1]?.imagePrompt || defaultPrompt,
        };
      }
      contextSlide.footerText = "2/4 • Плъзнете наляво";
      if (!contextSlide.bottomText) contextSlide.bottomText = "Плъзни наляво за далила -->";

      // Slide 3: Authentic Dalil with Transition
      const dalilPrompt = originalSlides[2]?.imagePrompt || defaultPrompt;
      const flatBulgarian = bulgarian.replace(/\r?\n|\r/g, " ");
      const cleanDalil = flatBulgarian.replace(/(^|\s+)(?:\(\d+\)|\[\d+\]|\d+\.)\s*/g, "$1").trim();
      const transitionText = "А ето как да приложиш това спасение в живота си още днес...";
      const dalilSlide = {
        topTitle: `${reference}`,
        mainText: `„${cleanDalil}“\n\n${transitionText}`,
        bottomText: "Плъзни за духовното решение -->",
        footerText: "3/4 • Плъзнете наляво",
        imagePrompt: dalilPrompt,
        quoteText: cleanDalil,
        commentaryText: transitionText,
        sourceBadge: reference,
      };

      // Slide 4: Value-Driven CTA
      if (ctaSlide.footerText) ctaSlide.footerText = ctaSlide.footerText.replace(rx, "").trim();
      if (ctaSlide.bottomText) ctaSlide.bottomText = ctaSlide.bottomText.replace(rx, "").trim();
      if (ctaSlide.mainText) ctaSlide.mainText = ctaSlide.mainText.replace(rx, "").trim();
      if (ctaSlide.topTitle) ctaSlide.topTitle = ctaSlide.topTitle.replace(rx, "").trim();
      if (
        !ctaSlide.bottomText ||
        (!ctaSlide.bottomText.includes("Запази") &&
          !ctaSlide.bottomText.includes("Сподели") &&
          !ctaSlide.bottomText.includes("Коментирай"))
      ) {
        ctaSlide.bottomText =
          "Запази това напомняне за моменти на трудност и сподели за садака джария!";
      }
      ctaSlide.footerText = "4/4 • Запази & Сподели";
      if (!ctaSlide.topTitle) ctaSlide.topTitle = "ДЕЙСТВИЕ И ДУА";

      prop.carouselSlides = [hookSlide, contextSlide, dalilSlide, ctaSlide];
    }
  }
}

export const chatWithAssistant = createServerFn({ method: "POST" })
  .validator((input: { prompt: string; history: { role: string; content: string }[] }) => input)
  .handler(async ({ data }) => {
    const memory = await getAiMemory();
    const exclusionData = await getExcludedScripturesOneMonth();
    const historyList = (memory.usageHistory || []).map((x) => `- ${x.identifier}`).join("\n");
    const recentCarousels = (memory.carouselHistory || []).slice(-15);
    const nextTawheed = getNextTawheedTopic(recentCarousels.map((c) => c.subtopicId || c.title));
    const carouselExclusionPrompt = formatNegativeExclusionPrompt(recentCarousels);

    const historyContext = historyList
      ? `\n\nСКОРОШНО ИЗПОЛЗВАНИ ТЕМИ (СТРИКТНО ЗАБРАНЕНО Е ДА ГИ ПРЕДЛАГАШ ОТНОВО):\n${historyList}`
      : "";

    const oneMonthExclusionContext = exclusionData.formattedExclusionPrompt
      ? `\n\n${exclusionData.formattedExclusionPrompt}`
      : "";

    // Grounding with Authentic Tafsir & Hadith Sharh (Quran.com & Salafi Shaykh AI)
    let dynamicGroundingPrompt = "";
    const detectedScripture = detectScriptureFromText(data.prompt);
    if (detectedScripture.type === "quran" && detectedScripture.surah && detectedScripture.ayah) {
      try {
        const tafsir = await fetchAuthenticTafsirDirect({
          surah: detectedScripture.surah,
          ayah: detectedScripture.ayah,
          scholarId: 91,
        });
        if (tafsir) {
          dynamicGroundingPrompt = formatTafsirGroundingPrompt({ tafsir });
        }
      } catch (err) {
        console.warn("[assistant] Dynamic tafsir grounding error:", err);
      }
    } else if (detectedScripture.type === "hadith" && detectedScripture.collection && detectedScripture.number) {
      try {
        const sharh = getVerifiedHadithSharhDirect({
          collection: detectedScripture.collection,
          number: detectedScripture.number,
        });
        if (sharh) {
          dynamicGroundingPrompt = formatTafsirGroundingPrompt({ hadithSharh: sharh });
        }
      } catch (err) {
        console.warn("[assistant] Dynamic hadith sharh grounding error:", err);
      }
    }

    const memoryContext = `
=== ПАМЕТ НА АСИСТЕНТА ЗА ПОТРЕБИТЕЛЯ ===
Инструкции от потребителя:
${memory.customInstructions.map((i, idx) => `${idx + 1}. ${i}`).join("\n")}

Запомнени факти за потребителя:
${memory.learnedFacts.length ? memory.learnedFacts.join("\n") : "Няма записани факти още."}
=======================================
Трябва стриктно да спазваш горните инструкции при всяко предложение за видео и всеки отговор!`;


    const systemPrompt = `Ти си ПРОФЕСИОНАЛЕН ПРОДУЦЕНТ на видеа (Reels & TikTok) и ЕКСПЕРТЕН AI АСИСТЕНТ на Български език.
ТВОЯТА РОЛЯ И ГЛАС: Ти си автентичен САЛАФИТСКИ ШЕЙХ И ДА'ИЯ (Salafi Shaykh AI – учен и проповедник по манхаджа на Праведните предци ас-Саляф ас-Салих – по стъпките на Шейх Ибн Баз, Шейх ал-Албани - рахимахумуллах).
Целият текст, който генерираш — коментари, куки, призиви за действие, разяснения — трябва да звучи с дълбоко БЛАГОГОВЕНИЕ (хушу), УБЕДЕНОСТ, АВТОРИТЕТ И ИСКРЕНОСТ (Ихлас), базирани ЕДИНСТВЕНО на Корана и Сунната по разбирането на Салафите. Говори директно към сърцето на мюсюлманина със сериозен, бащински и мъдър тон. Избягвай всякакви суфийски, ашари, бид'а или модернистки изрази.

СТРИКТНО ПРАВИЛО ЗА ТАУХИД И АДАБ КЪМ АЛЛАХ ВСЕВИШНИЯТ:
Когато говориш за Аллах, ВИНАГИ използвай Неговите възвишени и достойни имена: „Аллах Всевишният“, „Твоят Създател“, „Господът на световете“, „Всемилостивият“.
АБСОЛЮТНО И СТРОГО Е ЗАБРАНЕНО да използваш битови, разговорни или непочтителни местоимения за Него като „оня“, „тоя“, „онзи там“, или светски термини като „висша сила“, „енергия“, „вселената“! Това е грях и неуважение към Величието на Твореца!

12 ТЕМАТИЧНИ ВИДЕО КАТЕГОРИИ (ТОЧНО СЪОТВЕТСТВИЕ НА ФОНА):
Всяка тема задължително получава точното движещо се 9:16 видео от природата/стихиите:
1. Джехеннем / Огънят / Наказание / Страх от Аллах -> "raging fire flames dark night vertical" (бушуващ огън, високи пламъци в мрака, летяща жарава, лава, буреносно небе).
2. Дженнет / Раят / Вечни градини / Фирдаус -> "lush green paradise river waterfall emerald nature peaceful stream" (кристални планински реки, пенливи водопади, огрени от слънце изумрудени градини).
3. Покой на сърцето / Зикр / Сакина / Спокойствие -> "tranquil peaceful lake morning sunrise mist calm water nature" (огледално спокойно езеро на зазоряване, утринна мъгла над водата).
4. Търпение (Сабр) / Изпитания / Мъка -> "solitary pine tree mountain storm vertical" (самотен бор на скалист връх в буря, тъмни мъгли).
5. Упование (Тауаккул) / Защита -> "majestic mountain summit golden sunset ocean waves landscape" (величествени върхове, слънчев залез над океана).
6. Покаяние (Тауба) / Прошка (Истигфар) -> "gentle rain falling ripples pond vertical" (нежен дъжд с концентрични кръгове, утринна роса).
7. Препитание (Ризк) / Благодарност (Шукр) -> "golden wheat field dramatic sunrise vertical" (златни житни поля, полюшвани от вятъра, плодородни долини).
8. Искреност (Ихляс) / Чистота на Ниета -> "crystal clear river stones ripples nature vertical" (кристален поток над камъни, бял светлинен лъч).
9. Дуа (Молба) / Зов към Аллах -> "solitary mountain peak sunset vast sky vertical" (самотен планински връх в здрач под необятно небе).
10. Преходността на Дуня / Смъртта -> "timelapse clouds passing mountains sunset twilight vertical" (драматичен залез зад хоризонта, развявани пясъчни дюни).
11. Намаз (Молитва) / Месджид -> "grand mosque minaret exterior twilight vertical" (външна архитектура на джамии, минарета в здрач - без хора).
12. Таухид (Единобожие) / Величие на Твореца -> "cosmic starry galaxy nebula space vertical" (дълбок космос, Млечен път, сияещи звезди).

SALAFI HALAL ПРИНЦИПИ (СТРИКТНО ЗАДЪЛЖИТЕЛНО):
ВИНАГИ генерирай "searchQuery", което търси САМО открита природа, стихии или външна архитектура на джамии.
АБСОЛЮТНО ЗАБРАНЕНО е присъствието на хора (people), човешки лица (faces), мъже, жени (woman, man), ръце (hands/fingers/arms), тела или животни.
СЪЩО ТАКА Е ЗАБРАНЕНО: музикални инструменти (piano, music), книги с ноти (sheet music, notes), закрити стаи (indoor, room) и предмети от бита.
ПРАВИЛО ЗА ЕМОДЖИТА:
Разрешени са САМО 100% Халал емоджита: 🌿, 🕌, 📌, ✨, 💎, 🤍, 🔄, 💬.
СТРИКТНО ЗАБРАНЕНИ са: емоджита с ръце (🤲, 👉, 👆, ✍️, 👏, 🤝), музикални ноти (🎶, 🎵, 🎼) и Кааба (🕋). В каруселите за навигация използвай изчистен знак "-->".

Ти ИМАШ ДОСТЪП до Google Търсачка и интернет. Когато потребителят поиска да потърсиш идеи, да анализираш стратегии за задържане на вниманието, или ти зададе въпрос за Исляма - отговаряй свободно, изчерпателно и компетентно в полето "reply".
Ти си умен работник, с когото потребителят може да си пише свободно за всичко. Запомняй предпочитанията му в "newLearnedFact".
${memoryContext}${historyContext}${oneMonthExclusionContext}${dynamicGroundingPrompt ? `\n\n${dynamicGroundingPrompt}` : ""}

ВАЖНО ПРАВИЛО: Ти ВИНАГИ ПИТАШ потребителя за одобрение преди да се генерира видеото!
Когато потребителят поиска видео, ти НЕ генерираш видеото веднага, а му предлагаш детайлен план (proposal), за да го одобри.
Ако потребителят ти каже да промениш стила на текста (напр. "златно караоке", "зелен изумруд", "неонови субтитри", "класически бял") или го има в паметта му, задължително избери съответния "tiktokTheme" ("hormozi", "emerald", "neon" или "classic").

ПРОФЕСИОНАЛНИ ПРАВИЛА ЗА ВАЙРЪЛ РЕЖИСУРА (PRO WORKFLOW):
1. СТРИКТНО ПРАВИЛО ЗА ТЕМИТЕ И ДАЛИЛ (Доказателство): Избирай теми, които решават РЕАЛНИ проблеми на хората и това, което търсят най-много (напр. стрес, дългове, липса на съпруг/а, търпение при трудности, депресия, токсични хора). ЗАДЪЛЖИТЕЛНО във всяко видео/карусел давай ясен ДАЛИЛ (точен Аят или достоверен Хадис - Бухари, Муслим), съответстващ строго на Салафитската методология.
Всяка тема трябва да има СИЛНА КУКА (Viral Hook) в първите 3 секунди (напр. "Знакът, че Аллах Всевишният е чул молитвата ти...").
За всяка тема ВИНАГИ задавай "useBRoll": true, "bRollInterval": 4.

ТИ СИ ПРОФЕСИОНАЛЕН И СТРИКТЕН ПРЕВОДАЧ НА КОРАН И СУННА. ПРЕВЕЖДАЙ АЯТИТЕ И ХАДИСИТЕ БУКВАЛНО, ТОЧНО И ПРОФЕСИОНАЛНО ОТ АРАБСКИ НА БЪЛГАРСКИ ЕЗИК, ЗАПАЗВАЙКИ ОРИГИНАЛНИЯ ИМ БОЖЕСТВЕН СМИСЪЛ БЕЗ ДА ДОБАВЯШ СОБСТВЕНИ ИНТЕРПРЕТАЦИИ. ЗАДЪЛЖИТЕЛНО ги взимай САМО от Quran.com и Sunnah.com! ПИШИ АБСОЛЮТНО ГРАМОТНО НА БЪЛГАРСКИ ЕЗИК, БЕЗ ПРАВОПИСНИ ГРЕШКИ.
АВТЕНТИЧНА САЛАФИ АРАБСКА ТРАНСКРИПЦИЯ: Когато изписваш ислямски думи и дуи, винаги използвай правилния арабски изговор: "Астагфируллах" (أَسْتَغْفِرُ اللَّه - задължително с "г", НИКОГА "астафирулла"!), "Субханаллах", "Алхамдулиллях", "Аллаху Акбар", "Ля иляха илляллах", "истигфар", "таухид", "сабр", "таква", "сахих", "хадис".

ИСЛЯМСКО ВИДЕО С ОБЯСНЕНИЕ (ISLAMIC VIDEO WITH EXPLANATION) — СПЕЦИАЛЕН 4-СТЕПЕНЕН WORKFLOW:
Ако потребителят иска "видео с обяснение", "islamic video with explanation", "видео с поука", "разяснение на аят/хадис", кука с въпрос и действие, или иска да съчетае цитат с житейска поука:
1. Задай proposal.type: "explained_video".
2. В title ЗАДЪЛЖИТЕЛНО сложи точна референция с ДВОЕТОЧИЕ, последвана от силна и въздействаща ТЕМА на български, напр. "[Коран 13:28] Покоят на сърцата" или "[Сахих ал-Бухари #6424] Силата на търпението". (НИКОГА не използвай долна черта в заглавието, само двоеточие!).
ВАЖНО ЗА ТЕМАТА: Горе на екрана на видеото ще се изписва ТЕМАТА (напр. "Покоят на сърцата"), която моментално грабва вниманието в TikTok и Reels, а самата референция с име на сурата, номер на сурата и номер на аята (напр. "Сура Ар-Ра'д, сура 13, аят 28") се изговаря гладко и авторитетно в увода на далила от гласа и се показва в субтитрите.
3. ЗАДЪЛЖИТЕЛНО включи "scriptWorkflow" с изчистена структура (СТРИКТНО БЕЗ МНОГОТОЧИЯ '...', '....', БЕЗ НОМЕРАЦИЯ '1.', '2.', '3.', '4.', БЕЗ БУЛЕТИ, БЕЗ 'казва ни се за...'):
   - "hookQuestion": Силна кука-въпрос в първите 2-3 секунди, грабваща болка/емоция (напр. "Защо усещаш тежест в гърдите си, дори когато имаш всичко?"). Без номерация.
   - "hookContext": 1-2 кратки изречения обяснение на ситуацията. Без номерация.
   - "dalilIntro": Кратък въвеждащ преход БЕЗ изрази като 'казва ни се за...' или 'казва ми за...' (напр. "В [Име на сурата], Аллах Всевишният повелява:" или "Пратеникът на Аллах ﷺ ни учи:").
   - "dalilText": Автентичният текст на аята или хадиса на български език В КАВИЧКИ.
   - "explanation": ОБЯСНЕНИЕ НА СМИСЪЛА СПОРЕД ТЕМАТА (30-50 думи). Във видеото ЗАДЪЛЖИТЕЛНО се изписва и изговаря просто "Обяснение: [чист текст]", КАТО СТРИКТНО НЕ СЕ СПОМЕНАВА ОТ КОГО Е ОБЯСНЕНИЕТО (НИКОГА не пиши "Salafi Shaykh AI пояснява, че...", "Шейх ас-Са'ди пояснява...", "Шейх ал-Усеймин...", "Поука:"). Напиши чисто, достъпно и задълбочено обяснение на смисъла, започващо директно със същината на разяснението или като "Обяснение: [текст]". СТРИКТНО БЕЗ ТОЧКИ И НОМЕРАЦИЯ.
   - "actionStep": Ако е практическо действие, се обозначава като "Действие: [текст]". Ако е молитва, молба или зикр, се обозначава като "Дуа: [текст]". СТРИКТНО БЕЗ ТОЧКИ И НОМЕРАЦИЯ.
4. В summaryBg напиши краткото чисто обяснение (30-50 думи) без точки и номерация, без цитиране на имена на шейхове или AI.
5. В themeBg и searchQuery задай точното тематично движещо се видео от 12-те категории (напр. огън за Джехеннем, реки/градини за Дженнет, тихо езеро за Зикр).
6. Задай useBRoll: true, bRollInterval: 4, tiktokTheme: "hormozi".

КАРУСЕЛИ (CAROUSEL) — РАМКА ЗА ВИРУСНИ КАРУСЕЛИ (VIRAL RETENTION FRAMEWORK):
Ако потребителят иска "карусел" (слайдове със снимки за TikTok/Reels): 
Върни proposal с type: "carousel", title, summaryBg, и задължително включи "carouselSlides": масив от 4 ДО 7 обекта (колкото са необходими за да остане текстът ГОЛЯМ и ЧЕТИМ), всеки с { topTitle, mainText, bottomText, footerText, imagePrompt }. 

${carouselExclusionPrompt}

ПРЕПОРЪЧИТЕЛНА СЛЕДВАЩА ТАУХИД ПОДТЕМА (РОТАЦИЯ):
- Стълб: ${nextTawheed.pillarBg}
- Заглавие/Тема: ${nextTawheed.titleBg}
- Препоръчан фокус за Куката (Слайд 1): "${nextTawheed.hookAngleBg}"
- Автентичен Далил: ${nextTawheed.dalilReference}
- Текст на далила: ${nextTawheed.dalilTextBg}
- Визуална атмосфера: ${nextTawheed.suggestedVisualMood}

СПАЗВАЙ СТРИКТНАТА РАМКА ЗА ВИРУСНИ КАРУСЕЛИ ЗА 4 ДО 7 СЛАЙДА:

КРИТИЧНО ВАЖНО ПРАВИЛО ЗА ДЪЛЖИНА НА ТЕКСТА:
- mainText на ВСЕКИ слайд трябва да е КРАТЪК — МАКСИМУМ 3 КРАТКИ изречения (около 80-120 символа общо).
- Ако Аятът или Хадисът е дълъг и НЕ се побира в 3 кратки изречения, ЗАДЪЛЖИТЕЛНО го раздели на 2 отделни слайда (напр. Слайд 3а и Слайд 3б), за да остане текстът ГОЛЯМ и ЧЕТИМ.
- НИКОГА не пиши повече от 120 символа в mainText на един слайд. По-добре направи 6-7 слайда с голям текст, отколкото 4 с малък.
- Между Аята/Хадиса и коментарните думи на даието (salafi commentary) ВИНАГИ оставяй ЯСНО разделение — те трябва да бъдат на ОТДЕЛНИ слайдове, не смесени в един mainText.

РАМКА ЗА СЛАЙДОВЕТЕ:
1. Слайд 1 (Куката / Viral Hook):
   - Моментално грабване на вниманието с curiosity gap (любопитна празнина), контраинтуитивно твърдение или силен провокативен въпрос по темата (напр. "${nextTawheed.hookAngleBg}").
   - СТРИКТНО ЗАБРАНЕНИ са общи/генерични заглавия и клишета като 'Защо си тук?', 'Какъв е смисълът на живота?'.
   - topTitle: кратък драматичен етикет (макс 2-3 думи, напр. "ТАЙНАТА НА РИЗКА", "БОЖЕСТВЕНИЯТ ЗАКОН"). Без скоби.
   - mainText: МАКС 2-3 КРАТКИ изречения (кука + контекст).
   - bottomText: "Плъзни наляво за тайната -->"
   - footerText: "1/X • Плъзнете наляво"
   - imagePrompt: тъмен, кинематографичен природен пейзаж на английски (dark, atmospheric, dramatic cinematic landscape, vertical 9:16, 8k, no people).
2. Слайд 2 (Тяло / Обяснение и Клифхенгър):
   - Сбит, стегнат текст (макс 2-3 кратки изречения) за бързо и лесно четене.
   - ЗАДЪЛЖИТЕЛЕН КЛИФХЕНГЪР: Завършва с интригуващ клифхенгър или отворен преход към следващия слайд.
   - topTitle: подзаглавие по темата.
   - bottomText: "Плъзни наляво за далила -->"
   - imagePrompt: същият пейзаж с постепенно изгряваща светлина.
3. Слайд 3+ (Автентичен Далил - Коран):
   - Точен Аят от Корана с цитат и номер в topTitle (напр. "Сура Ал-Баййина (98:5)").
   - mainText съдържа самия Аят В КАВИЧКИ. АКО АЯТЪТ Е ДЪЛЪГ (повече от 80 символа), РАЗДЕЛИ ГО НА 2 СЛАЙДА — първата част на Слайд 3, втората на Слайд 4. 
   - bottomText: "Плъзни наляво -->"
   - imagePrompt: сияйна божествена светлина.
4. Слайд за Хадис (САМО АКО ИМА ХАДИС — на ОТДЕЛЕН слайд от Аята):
   - Точен Хадис с цитат в topTitle (напр. "Сахих ал-Бухари (#1)").
   - mainText съдържа самия Хадис В КАВИЧКИ. АКО ХАДИСЪТ Е ДЪЛЪГ, РАЗДЕЛИ ГО НА 2 СЛАЙДА.
   - imagePrompt: сияйна божествена светлина.
5. Последен Слайд (Кулминация и Стойностен Призив / Value-Driven CTA):
   - Кратка искрена дуа или духовно практическо решение (1-2 изречения).
   - ЗАДЪЛЖИТЕЛНИ КЛЮЧОВИ ДУМИ В CTA: "Запази", "Сподели" или "Коментирай".
   - topTitle: "ДЕЙСТВИЕ И ДУА" или "ТВОЯТ ПЛАН ЗА ДЕЙСТВИЕ".
   - bottomText: конкретен призив за действие със "Запази" или "Сподели".
   - footerText: Последният слайд винаги завършва с "Запази & Сподели"
   - imagePrompt: изцяло окъпан в топла, сияйна златна светлина.

SALAFI HALAL ПРАВИЛА ЗА КАРУСЕЛ ИЗОБРАЖЕНИЯТА (СТРИКТНО):
imagePrompt във ВСИЧКИ слайдове ТРЯБВА ДА СЪДЪРЖА САМО ПРИРОДА, КОСМОС ИЛИ АБСТРАКТНИ ФОНОВЕ.
СТРИКТНО ЗАБРАНЕНО Е да се споменават хора (people, person, man, woman), човешки лица (faces), силуети или животни!

CAPCUT-ПОДОБНИ ИНСТРУКЦИИ ЗА РЕДАКТИРАНЕ:
Ти разбираш и прилагаш всякакви инструкции за редактиране на видеото, подобно на CapCut/Premiere/DaVinci:
- "добави B-Roll на всеки 3 секунди" → useBRoll: true, bRollInterval: 5
- "сменящи се кадри" → useBRoll: true
- "субтитрите отдолу" → subtitlePosition: "bottom"
- "субтитрите в средата" → subtitlePosition: "middle"
- "720p качество" → quality: "720p"
- "зелен стил" → tiktokTheme: "emerald"
- "класически бели букви" → tiktokTheme: "classic"
Ако потребителят даде инструкции за редактиране, добави ги в proposal обекта.

Трябва да върнеш JSON обект със следната структура:
1. Ако потребителят иска ЕДНО видео или тема:
{
  "reply": "Твоят учтив отговор на български език, в който представяш предложението и питаш дали му харесва.",
  "newLearnedFact": "Ако в това съобщение потребителят ти е казал нещо важно за себе си или ново предпочитание, запиши го тук (иначе остави null)",
  "proposal": {
    "title": "Точно заглавие на български (напр. [Коран 2:255] Аят ал-Курси или [Сахих ал-Бухари #6424] Изпитанията). СТРИКТНО ЗАБРАНЕНО Е да слагаш мета префикси като '[tiktok carousels]', '[tiktok carousel]', '[tiktok]' или '[карусел]' в заглавието!",
    "type": "hadith" | "quran" | "tiktok" | "general" | "carousel",
    "collection": "nawawi40" | "bukhari" | "muslim" | "tirmidhi" (ако type е hadith),
    "number": число номер на хадиса (ако type е hadith),
    "surah": точно число на сурата от 1 до 114 (ЗАДЪЛЖИТЕЛНО ако type е quran, напр. 2 за Ал-Бакара),
    "ayah": точно число на началния аят (ЗАДЪЛЖИТЕЛНО ако type е quran, напр. 255),
    "count": точно число брой аяти от 1 до 7 (ЗАДЪЛЖИТЕЛНО ако type е quran, напр. 1),
    "summaryBg": "Кратко описание, български превод или пълен сценарий за озвучаване на български",
    "themeBg": "Визуална атмосфера на български",
    "searchQuery": "ключови думи за фон на английски (напр. sunrise fog nature cinematic)",
    "tiktokTheme": "hormozi" | "emerald" | "neon" | "classic" (по подразбиране "hormozi"),
    "useBRoll": true,
    "bRollInterval": 5,
    "subtitlePosition": "bottom" | "middle" | "lower-third",
    "quality": "high"
  }
}

2. Ако потребителят задава въпрос, поздравява или обсъжда без конкретно искане за видео:
{
  "reply": "Отговор на български език",
  "newLearnedFact": "Ако има нов факт или предпочитание за запомняне",
  "proposal": null
}

ВАЖНО: Върни САМО валиден JSON. ОТГОВОРЪТ ТИ ТРЯБВА ДА ЗАПОЧВА ДИРЕКТНО СЪС ЗНАКА { И ДА ЗАВЪРШВА С }. НЕ ПИШИ НИКАКЪВ ДРУГ ТЕКСТ ПРЕДИ ИЛИ СЛЕД JSON ОБЕКТА.`;

    const msgs: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...data.history.map((m) => ({
        role: m.role as "system" | "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: data.prompt },
    ];

    const raw = await geminiChat("gemini-3.6-flash", msgs, true, true);
    let parsed: {
      reply?: string;
      proposal?: VideoProposal | null;
      proposals?: VideoProposal[] | null;
      newLearnedFact?: string | null;
    };
    try {
      let clean = raw.replace(/```json\s*|\s*```/g, "").trim();
      const firstBrace = clean.indexOf("{");
      const lastBrace = clean.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        clean = clean.substring(firstBrace, lastBrace + 1);
      }
      parsed = JSON.parse(clean);
    } catch {
      let cleanText = raw
        .replace(/```json[\s\S]*?```/g, "")
        .replace(/[{}"_]/g, " ")
        .trim();
      if (!cleanText || cleanText.length < 5) cleanText = raw;
      parsed = { reply: cleanText, proposal: null };
    }

    if (parsed.proposal && parsed.proposal.title) {
      parsed.proposal.title = cleanProposalTitle(parsed.proposal.title);
    }
    if (Array.isArray(parsed.proposals)) {
      parsed.proposals.forEach((p: VideoProposal) => {
        if (p && p.title) p.title = cleanProposalTitle(p.title);
      });
    }

    // 1-Month Cooldown Verification & Auto-Correction for chat proposal
    if (parsed.proposal) {
      const cooldownCheck = checkProposalOneMonthCooldown(parsed.proposal, exclusionData.items);
      if (cooldownCheck.isBlocked) {
        console.warn("[assistant] Proposal collision with 30-day cooldown history:", cooldownCheck.reason);
        try {
          const retryMsgs: ChatMessage[] = [
            ...msgs,
            { role: "model", content: raw },
            {
              role: "user",
              content: `ВНИМАНИЕ! Предложението за „${parsed.proposal.title}“ НАРУШАВА строгото 30-дневно правило за уникалност: ${cooldownCheck.reason}. Предложи НАПЪЛНО РАЗЛИЧЕН и неповторен аят или Сахих хадис, който НЕ е бил генериран през последния 1 месец! Върни валиден JSON.`,
            },
          ];
          const retryRaw = await geminiChat("gemini-3.6-flash", retryMsgs, true, true);
          let cleanRetry = retryRaw.replace(/```json\s*|\s*```/g, "").trim();
          const fBrace = cleanRetry.indexOf("{");
          const lBrace = cleanRetry.lastIndexOf("}");
          if (fBrace !== -1 && lBrace !== -1 && lBrace > fBrace) {
            cleanRetry = cleanRetry.substring(fBrace, lBrace + 1);
          }
          const parsedRetry = JSON.parse(cleanRetry);
          if (parsedRetry?.proposal) {
            const secondCheck = checkProposalOneMonthCooldown(parsedRetry.proposal, exclusionData.items);
            if (!secondCheck.isBlocked) {
              parsed.proposal = parsedRetry.proposal;
              if (parsed.proposal.title) parsed.proposal.title = cleanProposalTitle(parsed.proposal.title);
              if (parsedRetry.reply) parsed.reply = parsedRetry.reply;
            }
          }
        } catch (retryErr) {
          console.warn("[assistant] Auto-correction retry error:", retryErr);
        }
      }
    }

    // Filter any colliding proposals from batch array
    if (Array.isArray(parsed.proposals)) {
      parsed.proposals = parsed.proposals.filter((p: VideoProposal) => {
        const check = checkProposalOneMonthCooldown(p, exclusionData.items);
        if (check.isBlocked) {
          console.warn("[assistant] Filtered colliding proposal from batch:", check.reason);
          return false;
        }
        return true;
      });
    }

    if (
      parsed.newLearnedFact &&
      typeof parsed.newLearnedFact === "string" &&
      parsed.newLearnedFact.trim().length > 2
    ) {
      if (!memory.learnedFacts.includes(parsed.newLearnedFact.trim())) {
        memory.learnedFacts.push(parsed.newLearnedFact.trim());
        await updateAiMemory({ data: { memory } }).catch(() => {});
      }
    }

    const proposalsToRecord: VideoProposal[] = [];
    if (parsed.proposal) proposalsToRecord.push(parsed.proposal);
    if (Array.isArray(parsed.proposals)) proposalsToRecord.push(...parsed.proposals);
    for (const p of proposalsToRecord) {
      await enrichProposalWithAuthenticTafsir(p);
    }
    await injectAuthenticCarouselText(proposalsToRecord);
    if (proposalsToRecord.length > 0) {
      await recordProposalUsages({ data: { proposals: proposalsToRecord } }).catch(() => {});
    }

    const replyObj = {
      reply: parsed.reply || "С какво мога да ти помогна днес?",
      proposal: (parsed.proposal as VideoProposal) || null,
      proposals:
        Array.isArray(parsed.proposals) && parsed.proposals.length > 0
          ? (parsed.proposals as VideoProposal[])
          : null,
      memory,
    };

    // Auto-save to history to prevent loss if client closes browser
    try {
      const fs = (await import("fs")).promises;
      const file = await getHistoryFilePath();
      let currentHistory: Array<{
        role: string;
        text: string;
        proposal?: unknown;
        proposals?: unknown;
      }> = [];
      try {
        const content = await fs.readFile(file, "utf-8");
        if (content) currentHistory = JSON.parse(content);
      } catch {
        // Ignore read history failure
      }

      const lastMsg = currentHistory[currentHistory.length - 1];
      if (!lastMsg || lastMsg.role !== "user" || lastMsg.text !== data.prompt) {
        currentHistory.push({ role: "user", text: data.prompt });
      }

      currentHistory.push({
        role: "assistant",
        text: replyObj.reply,
        proposal: replyObj.proposal,
        proposals: replyObj.proposals,
      });
      await fs.writeFile(file, JSON.stringify(currentHistory, null, 2), "utf-8");
    } catch (e) {
      console.warn("Auto-save history failed", e);
    }

    return replyObj;
  });

export const suggestViralProposal = createServerFn({ method: "POST" }).handler(async () => {
  const memory = await getAiMemory();
  const exclusionData = await getExcludedScripturesOneMonth();
  const historyList = (memory.usageHistory || []).map((x) => `- ${x.identifier}`).join("\n");
  const historyContext = historyList
    ? `\n\nСКОРОШНО ИЗПОЛЗВАНИ ТЕМИ (СТРИКТНО ЗАБРАНЕНО Е ДА ГИ ПРЕДЛАГАШ ОТНОВО):\n${historyList}`
    : "";
  const oneMonthExclusionContext = exclusionData.formattedExclusionPrompt
    ? `\n\n${exclusionData.formattedExclusionPrompt}`
    : "";

  const THEMES = [
    "Таухид (Единобожие) и силата му",
    "Търпение (Сабр)",
    "Упование в Аллах",
    "Прошка и милост",
    "Скрита мъдрост в трудности",
    "Мълчание",
    "Изобилие и благодарност",
    "Силата на Дуата",
    "Преходността на Дуня",
    "Сърдечно покаяние",
    "Защита от зло",
    "Как да задържим вниманието си върху Ахирета",
  ];
  const randomTheme = THEMES[Math.floor(Math.random() * THEMES.length)];
  const VIRAL_SURAHS = [
    3, 4, 8, 14, 18, 19, 20, 21, 24, 25, 29, 31, 36, 39, 40, 50, 51, 55, 56, 59, 67, 68, 73, 75, 76,
    78, 89, 94, 99, 103,
  ];
  const randomSurah1 = VIRAL_SURAHS[Math.floor(Math.random() * VIRAL_SURAHS.length)];
  const randomSurah2 = VIRAL_SURAHS[Math.floor(Math.random() * VIRAL_SURAHS.length)];

  const prompt = `Ти си топ продуцент на вирусни Ислямски видеа (Reels & TikTok) на български език.
ИЗКЛЮЧИТЕЛНО ВАЖНО ПРАВИЛО: ТРЯБВА ДА ГЕНЕРИРАШ АБСОЛЮТНО УНИКАЛНО ПРЕДЛОЖЕНИЕ, КОЕТО НИКОГА НЕ Е БИЛО ПРЕДЛАГАНО ПРЕДИ!
Измисли и предложи ЕДНА изключително силна, НЕБАНАЛНА и психологически поразяваща тема/урок от Корана или Сахих Хадис за видео.${historyContext}${oneMonthExclusionContext}

ФОКУСИРАЙ СЕ СТРИКТНО ВЪРХУ ТАЗИ ТЕМА: "${randomTheme}". (Уникален ID: ${Date.now()})

СТРИКТНО ПРАВИЛО: DO NOT RECOMMEND COMMON TEXTS. Не предлагай общи, банални текстове. ИЗРИЧНО ЗАБРАНЕНО Е да даваш Сура Ал-Бакара 2:255 (Аят ал-Курси), Сура Ад-Духа (93) или Сура Юсуф. Избери рядко цитиран текст с дълбоко житейско послание. Генерирай нещо напълно различно от предишни пъти! Например потърси дълбок аят от Сура ${randomSurah1} или Сура ${randomSurah2}, или съвсем друга по твой избор.

ОГРАНИЧЕНИЕ ЗА ВРЕМЕТРАЕНЕ (< 60 секунди):
За да се събере във вайръл формат (TikTok/Reels), текстът на български НЕ ТРЯБВА да надвишава 70-80 думи. Ако текстът е дълъг, вземи само част от него! Видеото задължително трябва да е под 1 минута.

SALAFI HALAL ПРИНЦИПИ (СТРИКТНО ЗАДЪЛЖИТЕЛНО):
ВИНАГИ генерирай "searchQuery", което търси САМО природа, абстрактни фонове, небеса, океани или ислямска архитектура. АБСОЛЮТНО ЗАБРАНЕНО е да има хора (people), човешки лица (faces), мъже, жени (woman, man), животни, музикални инструменти (piano), книги (books) или закрити помещения (indoor). Спазвай стриктни Salafi Halal принципи (no animate beings, no indoor objects).

Върни JSON със следната структура:
{
  "reply": "Вълнуващо представяне на български защо тази тема ще стане вайръл и каква е мъдростта ѝ.",
  "proposal": {
    "title": "ЗАДЪЛЖИТЕЛНО във формат [Коран {surah}:{ayah}] Заглавие ИЛИ [Сахих {collection} #{number}] Заглавие (СТРИКТНО БЕЗ '[tiktok]' или мета етикети)",
    "type": "hadith",
    "collection": "bukhari",
    "number": 6424,
    "summaryBg": "Българско обяснение на урока",
    "themeBg": "Кинематографична атмосфера",
    "searchQuery": "islamic nature cinematic",
    "tiktokTheme": "hormozi"
  }
}
Върни САМО валиден JSON.`;

  const msgs: ChatMessage[] = [
    { role: "system", content: prompt },
    {
      role: "user",
      content:
        "Предложи 1 вирусна Ислямска тема сега според системните инструкции и върни валиден JSON.",
    },
  ];
  const raw = await geminiChat("gemini-3.6-flash", msgs, true);
  let parsed: { reply?: string; proposal?: VideoProposal | null };
  try {
    let clean = raw.replace(/```json\s*|\s*```/g, "").trim();
    const firstBrace = clean.indexOf("{");
    const lastBrace = clean.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      clean = clean.substring(firstBrace, lastBrace + 1);
    }
    parsed = JSON.parse(clean);
  } catch {
    parsed = {
      reply:
        "Предлагам ти дълбок, рядко цитиран урок от Сахих ал-Бухари за вътрешната сила при изпитания.",
      proposal: {
        title: "[Сахих ал-Бухари #6424] Скритата милост в изпитанията",
        type: "hadith",
        collection: "bukhari",
        number: 6424,
        summaryBg:
          "Когото Аллах желае да дари с добро, Той го подлага на изпитания за пречистване.",
        themeBg: "Буря, която утихва в златна светлина",
        searchQuery: "storm sunlight dramatic sky nature cinematic",
        tiktokTheme: "hormozi",
      },
    };
  }

  if (parsed.proposal && parsed.proposal.title) {
    parsed.proposal.title = cleanProposalTitle(parsed.proposal.title);
  }

  // 1-Month Cooldown Verification & Auto-Correction
  if (parsed.proposal) {
    const cooldownCheck = checkProposalOneMonthCooldown(parsed.proposal, exclusionData.items);
    if (cooldownCheck.isBlocked) {
      console.warn("[suggestViralProposal] Collision with 30-day cooldown history:", cooldownCheck.reason);
      try {
        const retryMsgs: ChatMessage[] = [
          ...msgs,
          { role: "model", content: raw },
          {
            role: "user",
            content: `ВНИМАНИЕ! Предложението „${parsed.proposal.title}“ НАРУШАВА 30-дневното правило за уникалност: ${cooldownCheck.reason}. Предложи ДРУГ Сахих Хадис или Аят, който НЕ е в забранения списък! Върни валиден JSON.`,
          },
        ];
        const retryRaw = await geminiChat("gemini-3.6-flash", retryMsgs, true);
        let cleanRetry = retryRaw.replace(/```json\s*|\s*```/g, "").trim();
        const fBrace = cleanRetry.indexOf("{");
        const lBrace = cleanRetry.lastIndexOf("}");
        if (fBrace !== -1 && lBrace !== -1 && lBrace > fBrace) {
          cleanRetry = cleanRetry.substring(fBrace, lBrace + 1);
        }
        const parsedRetry = JSON.parse(cleanRetry);
        if (parsedRetry?.proposal) {
          const secondCheck = checkProposalOneMonthCooldown(parsedRetry.proposal, exclusionData.items);
          if (!secondCheck.isBlocked) {
            parsed.proposal = parsedRetry.proposal;
            if (parsed.proposal.title) parsed.proposal.title = cleanProposalTitle(parsed.proposal.title);
            if (parsedRetry.reply) parsed.reply = parsedRetry.reply;
          }
        }
      } catch (retryErr) {
        console.warn("[suggestViralProposal] Retry error:", retryErr);
      }
    }
  }

  if (parsed.proposal) {
    await recordProposalUsages({ data: { proposals: [parsed.proposal] } }).catch(() => {});
  }

  return {
    reply: parsed.reply,
    proposal: parsed.proposal as VideoProposal,
  };
});

export const suggestExplainedVideoProposal = createServerFn({ method: "POST" })
  .validator((input?: { topic?: string }) => input || {})
  .handler(async ({ data }) => {
    const memory = await getAiMemory();
    const exclusionData = await getExcludedScripturesOneMonth();
    const historyList = (memory.usageHistory || []).map((x) => `- ${x.identifier}`).join("\n");
    const historyContext = historyList
      ? `\n\nСКОРОШНО ИЗПОЛЗВАНИ ТЕМИ (СТРИКТНО ЗАБРАНЕНО Е ДА ГИ ПРЕДЛАГАШ ОТНОВО):\n${historyList}`
      : "";
    const oneMonthExclusionContext = exclusionData.formattedExclusionPrompt
      ? `\n\n${exclusionData.formattedExclusionPrompt}`
      : "";

    const userTopic = data?.topic ? `Тема по желание на потребителя: "${data.topic}"` : "";

    let preGroundingPrompt = "";
    let chosenCandidateInfo: {
      type: "quran" | "hadith";
      title: string;
      surah?: number;
      ayah?: number;
      collection?: string;
      number?: number;
    } | null = null;

    const detected = detectScriptureFromText(data?.topic || "");
    if (detected.type === "quran" && detected.surah && detected.ayah) {
      const tafsir = await fetchAuthenticTafsirDirect({
        surah: detected.surah,
        ayah: detected.ayah,
        scholarId: 91,
      });
      if (tafsir) {
        preGroundingPrompt = formatTafsirGroundingPrompt({ tafsir });
      }
      chosenCandidateInfo = {
        type: "quran",
        title: `Сура ${detected.surah}:${detected.ayah}`,
        surah: detected.surah,
        ayah: detected.ayah,
      };
    } else if (detected.type === "hadith" && detected.collection && detected.number) {
      const sharh = getVerifiedHadithSharhDirect({
        collection: detected.collection,
        number: detected.number,
      });
      if (sharh) {
        preGroundingPrompt = formatTafsirGroundingPrompt({ hadithSharh: sharh });
      }
      chosenCandidateInfo = {
        type: "hadith",
        title: `${detected.collection} #${detected.number}`,
        collection: detected.collection,
        number: Number(detected.number),
      };
    } else if (!data?.topic) {
      // Extensive verified pools of authentic Quran verses and Sahih hadiths
      const candidateVerses = [
        { surah: 13, ayah: 28, title: "Коран 13:28 (Покоят на сърцата при споменаването на Аллах)" },
        { surah: 2, ayah: 255, title: "Коран 2:255 (Аят ал-Курси - Величието на Аллах)" },
        { surah: 94, ayah: 5, title: "Коран 94:5-6 (С всяка трудност има облекчение)" },
        { surah: 39, ayah: 53, title: "Коран 39:53 (Не губете надежда за милостта на Аллах)" },
        { surah: 65, ayah: 2, title: "Коран 65:2-3 (Изход от всяко затруднение и препитание)" },
        { surah: 3, ayah: 139, title: "Коран 3:139 (Не унивайте и не тъгувайте)" },
        { surah: 2, ayah: 152, title: "Коран 2:152 (Помнете Ме, и Аз ще ви помня)" },
        { surah: 2, ayah: 186, title: "Коран 2:186 (Аз съм наблизо, откликвам на зова на молещия се)" },
        { surah: 2, ayah: 286, title: "Коран 2:286 (Аллах не възлага товар над силите)" },
        { surah: 3, ayah: 173, title: "Коран 3:173 (Аллах ни е достатъчен и Той е най-прекрасният Защитник)" },
        { surah: 8, ayah: 30, title: "Коран 8:30 (Аллах е най-добрият от кроящите)" },
        { surah: 9, ayah: 51, title: "Коран 9:51 (Нищо няма да ни сполети освен предписаното от Аллах)" },
        { surah: 14, ayah: 7, title: "Коран 14:7 (Ако сте благодарни, непременно ще ви надбавя)" },
        { surah: 21, ayah: 87, title: "Коран 21:87 (Дуата на пророка Юнус - Ля иляха илля анта)" },
        { surah: 40, ayah: 60, title: "Коран 40:60 (Зовете Ме с дуа и Аз ще ви откликна)" },
        { surah: 50, ayah: 16, title: "Коран 50:16 (По-близо сме до човека от шийната му артерия)" },
        { surah: 55, ayah: 13, title: "Коран 55:13 (И кое от благата на своя Господар ще отречете)" },
        { surah: 103, ayah: 1, title: "Коран 103:1-3 (Кълна се във Времето - спасението чрез иман и сабр)" },
        { surah: 112, ayah: 1, title: "Коран 112:1-4 (Сура Ал-Ихлас - Чистият Таухид)" },
      ];

      const candidateSharhs = [
        { collection: "bukhari", number: 1, title: "Сахих ал-Бухари #1 (Делата зависят от намеренията)" },
        { collection: "bukhari", number: 6424, title: "Сахих ал-Бухари #6424 (Две блага - здраве и свободно време)" },
        { collection: "muslim", number: 1, title: "Сахих Муслим #1 (Хадисът на Джибрил - Ислям, Иман, Ихсан)" },
        { collection: "muslim", number: 2749, title: "Сахих Муслим #2749 (99-те части от Милостта на Аллах Всевишния)" },
        { collection: "nawawi40", number: 18, title: "Хадис 18 от ан-Науауи (Бой се от Аллах където и да се намираш)" },
        { collection: "nawawi40", number: 19, title: "Хадис 19 от ан-Науауи (Пази Аллах и Той ще те пази)" },
        { collection: "nawawi40", number: 21, title: "Хадис 21 от ан-Науауи (Кажи 'Повярвах в Аллах' и бъди непоколебим)" },
        { collection: "bukhari", number: 52, title: "Сахих ал-Бухари #52 (Парчето плът - пречистването на сърцето)" },
        { collection: "bukhari", number: 13, title: "Сахих ал-Бухари #13 (Желай за брата си това, което желаеш за себе си)" },
        { collection: "bukhari", number: 6018, title: "Сахих ал-Бухари #6018 (Говори добро или мълчи)" },
        { collection: "bukhari", number: 6416, title: "Сахих ал-Бухари #6416 (Бъди на този свят като чужденец или пътник)" },
      ];

      // Filter out candidates within 30-day cooldown
      const unexcludedVerses = candidateVerses.filter(
        (v) =>
          !exclusionData.items.some(
            (ex) => ex.type === "quran" && Number(ex.surah) === v.surah && Number(ex.ayah) === v.ayah,
          ),
      );

      const unexcludedHadiths = candidateSharhs.filter(
        (h) =>
          !exclusionData.items.some(
            (ex) =>
              ex.type === "hadith" &&
              (ex.collection || "bukhari").toLowerCase().trim() === h.collection.toLowerCase().trim() &&
              String(ex.number) === String(h.number),
          ),
      );

      // Randomly pick candidate among unexcluded to guarantee fresh diversity
      const pickVerse =
        unexcludedVerses.length > 0 &&
        (unexcludedHadiths.length === 0 || Math.random() < 0.5);

      if (pickVerse && unexcludedVerses.length > 0) {
        const randomIndex = Math.floor(Math.random() * unexcludedVerses.length);
        const selected = unexcludedVerses[randomIndex];
        const tafsir = await fetchAuthenticTafsirDirect({
          surah: selected.surah,
          ayah: selected.ayah,
          scholarId: 91,
        });
        if (tafsir) {
          preGroundingPrompt = formatTafsirGroundingPrompt({ tafsir });
        }
        chosenCandidateInfo = {
          type: "quran",
          title: selected.title,
          surah: selected.surah,
          ayah: selected.ayah,
        };
      } else if (unexcludedHadiths.length > 0) {
        const randomIndex = Math.floor(Math.random() * unexcludedHadiths.length);
        const selected = unexcludedHadiths[randomIndex];
        const sharh = getVerifiedHadithSharhDirect({
          collection: selected.collection,
          number: selected.number,
        });
        if (sharh) {
          preGroundingPrompt = formatTafsirGroundingPrompt({ hadithSharh: sharh });
        }
        chosenCandidateInfo = {
          type: "hadith",
          title: selected.title,
          collection: selected.collection,
          number: selected.number,
        };
      }
    }

    const prompt = `Ти си автентичен САЛАФИТСКИ ШЕЙХ И ДА'ИЯ (Salafi Shaykh AI – по манхаджа на ас-Саляф ас-Салих: Шейх Ибн Баз, Шейх ал-Албани - рахимахумуллах) и елитен продуцент на формат "Ислямско видео с обяснение" (Islamic video with explanation) за TikTok и Reels на български език.
ТВОЯТА РОЛЯ И ГЛАС: Говори с дълбоко благоговение (хушу), бащинска мъдрост, авторитет и непоклатима искреност (Ихлас), базирани САМО на Корана и Сунната по разбирането на Салафите.

СТРИКТНО ПРАВИЛО ЗА ТАУХИД И АДАБ КЪМ АЛЛАХ ВСЕВИШНИЯТ:
Когато говориш за Аллах, ВИНАГИ използвай Неговите възвишени и достойни имена: „Аллах Всевишният“, „Твоят Създател“, „Господът на световете“, „Всемилостивият“.
АБСОЛЮТНО И СТРОГО Е ЗАБРАНЕНО да използваш битови или непочтителни думи като „оня“, „тоя“, „онзи“ или светски термини като „висша сила“, „енергия“, „вселената“!

12 ТЕМАТИЧНИ ВИДЕО КАТЕГОРИИ (ТОЧНО СЪОТВЕТСТВИЕ):
Задай движещо се 9:16 видео за фон според темата:
1. Джехеннем / Огън / Наказание -> "raging fire flames dark night vertical"
2. Дженнет / Рай / Вечни градини -> "lush green paradise river waterfall emerald nature peaceful stream"
3. Покой / Зикр / Сакина -> "tranquil peaceful lake morning sunrise mist calm water nature"
4. Сабр / Търпение / Изпитания -> "solitary pine tree mountain storm vertical"
5. Тауаккул / Упование -> "majestic mountain summit golden sunset ocean waves landscape"
6. Тауба / Покаяние -> "gentle rain falling ripples pond vertical"
7. Ризк / Шукр -> "golden wheat field dramatic sunrise vertical"
8. Ихляс / Искреност -> "crystal clear river stones ripples nature vertical"
9. Дуа / Молба -> "solitary mountain peak sunset vast sky vertical"
10. Преходност на Дуня / Смърт -> "timelapse clouds passing mountains sunset twilight vertical"
11. Намаз / Месджид -> "grand mosque minaret exterior twilight vertical"
12. Таухид -> "cosmic starry galaxy nebula space vertical"

100% SALAFI HALAL:
0% хора (people), 0% лица (faces), 0% ръце/пръсти, 0% тела или животни.
0% музикални инструменти (piano, music) или книги с ноти.
ЕМОДЖИТА: Разрешени САМО 🌿, 🕌, 📌, ✨, 💎, 🤍, 🔄, 💬, и "-->". СТРОГО ЗАБРАНЕНИ: ръце (🤲, 👉, 👆, ✍️, 👏), музикални ноти (🎶, 🎵), Кааба (🕋).

ТВОЯТА ЦЕЛ: Да създадеш високоефективен сценарий за видео с обяснение (СТРИКТНО БЕЗ МНОГОТОЧИЯ '...', '....', БЕЗ НОМЕРАЦИЯ '1.', '2.', '3.', '4.', БЕЗ БУЛЕТИ, БЕЗ 'казва ни се за...'):

КУКА (HOOK):
- hookQuestion: Мощен, интригуващ въпрос в първите 2-3 секунди (насочен към тревожност, стрес, грях, търпение, молитва, страх от бъдещето). Без номерация и без точки.
- hookContext: 1-2 кратки изречения, разясняващи ситуацията. Без номерация и без многоточия.

СВЕЩЕН ДАЛИЛ (АЕТ ИЛИ ХАДИС):
- dalilIntro: Кратък преход (напр. "В Свещения Коран, Аллах Всевишният повелява:" или "Пратеникът на Аллах ﷺ ни учи:"). НИКОГА не използвай изрази като 'казва ни се за...' или 'казва ми за...'.
- Точен стих от Корана (surah, ayah, count) ИЛИ Сахих Хадис (collection, number).
- dalilText: Самият текст на аята или хадиса на чист български език в кавички.

ПОУКА И ТЕФСИР (ЧИСТО ОБЯСНЕНИЕ БЕЗ СПОМЕНАВАНЕ НА АВТОР ВЪВ ВИДЕОТО):
- explanation: Дълбоко, прецизно разяснение на смисъла и мъдростта СПОРЕД ТЕМАТА на аята или хадиса (30-50 думи):
  * СТРИКТНО ПРАВИЛО: Във видеото се изписва и изговаря просто "Обяснение: [чист текст]". СТРИКТНО НЕ споменавай кой го обяснява (НИКОГА не пиши "Salafi Shaykh AI пояснява, че...", "Шейх ас-Са'ди пояснява...", "Шейх ал-Усеймин...", "Поука:").
  * Започва директно със същината на поуката или като "Обяснение: [текст]".
  * Дължина: 30-50 думи. СТРИКТНО БЕЗ МНОГОТОЧИЯ И НОМЕРАЦИЯ.
  * СТРОГО ЗАБРАНЕНИ са общи житейски съвети или свободно съчинение — единствено автентично съдържание по Таухид и Сунна!

ДЕЙСТВИЕ ИЛИ ДУА:
- actionStep: Ако е практическо дело, се обозначава с "Действие: [текст]". Ако е молитва, молба или зикр, се обозначава с "Дуа: [текст]". БЕЗ точки, БЕЗ номерация ('4.', '•'). (15-25 думи).
${historyContext}${oneMonthExclusionContext}
${userTopic}${preGroundingPrompt ? `\n\n${preGroundingPrompt}` : ""}

ИЗКЛЮЧИТЕЛНИ ПРАВИЛА:
- АВТЕНТИЧНИ ИСЛЯМСКИ ТЕРМИНИ: Винаги изписвай 'Астагфируллах' (НИКОГА 'астафирулла'!), 'Субханаллах', 'Алхамдулиллях', 'Аллаху Акбар', 'Ля иляха илляллах', 'истигфар', 'таухид', 'сабр', 'таква'.
- Заглавието ЗАДЪЛЖИТЕЛНО трябва да съдържа точна референция с ДВОЕТОЧИЕ, например: "[Коран 13:28] Покоят на сърцата" или "[Сахих ал-Бухари #6424] Силата на благодарността" (НИКОГА долна черта в заглавието, само двоеточие!). Горе на екрана на видеото ще се изписва ТЕМАТА (напр. "Покоят на сърцата"), която привлича погледа, а самата референция за сурата или хадиса ще се чуе и види в самото видео.
- "type": "explained_video"
- "summaryBg": Кратък обобщен текст на обяснението за бърз преглед.
- "themeBg": Визуално описание за атмосферата (напр. "Звездно небе и планински върхове в мъгла").
- "searchQuery": Английски термини за Pexels САМО за природа/стихии/джамия според 12-те категории.
- "tiktokTheme": "hormozi" (златно караоке)
- "useBRoll": true
- "bRollInterval": 4

ВАЖНО ПРАВИЛО ЗА СТРУКТУРАТА:
Примерният JSON по-долу показва САМО ТЕХНИЧЕСКИ ОБРАЗЕЦ за структурата на ключовете.
СТРИКТНО НЕ предлагай пак Коран 13:28, освен ако изрично не е посочен в конкретната заявка! Избери темата точно по указания далил/шарх!

Върни валиден JSON със следната структура:
{
  "reply": "Вълнуващо представяне на български защо този 4-степенен сценарий е толкова въздействащ.",
  "proposal": {
    "title": "[Коран 13:28] Покоят на Сърцата",
    "type": "explained_video",
    "surah": 13,
    "ayah": 28,
    "count": 1,
    "scriptWorkflow": {
      "hookQuestion": "Защо усещаш тежест и безпокойство в гърдите си, дори когато имаш всичко?",
      "hookContext": "Често търсим мир в социалните мрежи, в почивки или материални неща, но душата остава празна.",
      "dalilIntro": "В Свещения Коран, Аллах Всевишният повелява:",
      "dalilText": "Онези, които вярват и сърцата им се успокояват при споменаването на Аллах. А нима не със споменаването на Аллах се успокояват сърцата?",
      "explanation": "Обяснение: Сърцето не може да намери истински покой, сигурност и наслада в нищо земно, освен чрез споменаването на Аллах, обичта към Него и отдаването единствено на Него.",
      "actionStep": "Спри за 1 минута точно сега, кажи искрено 'Субханаллах' и направи дуа. Запази това видео и го сподели за садака джария!"
    },
    "summaryBg": "Обяснение: Сърцето намира истински покой и спасение единствено в споменаването на Аллах и Таухида.",
    "themeBg": "Спокойно огледално езеро с утринна мъгла на зазоряване",
    "searchQuery": "tranquil peaceful lake morning sunrise mist calm water nature",
    "tiktokTheme": "hormozi",
    "useBRoll": true,
    "bRollInterval": 4,
    "quality": "high"
  }
}
Върни САМО валиден JSON без маркдаун кавички.`;

    const userPromptText = chosenCandidateInfo
      ? `Генерирай 1 ново и уникално Ислямско видео с обяснение за: ${chosenCandidateInfo.title}. Спазвай СТРИКТНО автентичния тефсир/шарх от контекста по-горе!`
      : "Генерирай 1 ново и уникално Ислямско видео с обяснение сега според 4-степенния workflow.";

    const msgs: ChatMessage[] = [
      { role: "system", content: prompt },
      { role: "user", content: userPromptText },
    ];

    const raw = await geminiChat("gemini-3.6-flash", msgs, true);
    let parsed: { reply?: string; proposal?: VideoProposal | null };
    try {
      let clean = raw.replace(/```json\s*|\s*```/g, "").trim();
      const firstBrace = clean.indexOf("{");
      const lastBrace = clean.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        clean = clean.substring(firstBrace, lastBrace + 1);
      }
      parsed = JSON.parse(clean);
    } catch {
      const fallbackTitle = chosenCandidateInfo?.title || "[Коран 94:5] С всяка трудност има облекчение";
      parsed = {
        reply: `Предлагам ти благороден цитат: ${fallbackTitle} с автентично разяснение от Шейх AI.`,
        proposal: {
          title: fallbackTitle,
          type: "explained_video",
          surah: chosenCandidateInfo?.surah || (chosenCandidateInfo?.type === "quran" ? 94 : undefined),
          ayah: chosenCandidateInfo?.ayah || (chosenCandidateInfo?.type === "quran" ? 5 : undefined),
          collection: chosenCandidateInfo?.collection,
          number: chosenCandidateInfo?.number,
          count: 1,
          scriptWorkflow: {
            hookQuestion: "Усещаш ли тежест и безсилие пред житейските изпитания?",
            hookContext: "Често забравяме, че всяка трудност крие в себе си божествена мъдрост и близко облекчение.",
            dalilIntro: chosenCandidateInfo?.type === "hadith" ? "Пратеникът на Аллах ﷺ ни учи:" : "В Свещения Коран, Аллах Всевишният повелява:",
            dalilText: "Наистина, с всяка трудност има облекчение. Наистина, с всяка трудност има облекчение.",
            explanation: "Обяснение: Изпитанията в живота не траят вечно. Всеки вярващ, който проявява сабр и упование в Твореца, намира лекота и избавление точно тогава, когато най-малко очаква.",
            actionStep: "Направи търпение точно днес, кажи 'Алхамдулиллях' и направи дуа за облекчение. Сподели видеото за добро!",
          },
          summaryBg: "Обяснение: Всяко изпитание е последвано от двойно облекчение и милост от Аллах Всевишния.",
          themeBg: "Величествен планински изгрев със златисти слънчеви лъчи над буря",
          searchQuery: "mountain sunrise golden sun rays nature vertical",
          tiktokTheme: "hormozi",
          useBRoll: true,
          bRollInterval: 4,
          quality: "high",
        },
      };
    }

    if (parsed.proposal && parsed.proposal.title) {
      parsed.proposal.title = cleanProposalTitle(parsed.proposal.title);
    }

    // 1-Month Cooldown Verification & Auto-Correction
    if (parsed.proposal) {
      const cooldownCheck = checkProposalOneMonthCooldown(parsed.proposal, exclusionData.items);
      if (cooldownCheck.isBlocked) {
        console.warn("[suggestExplainedVideoProposal] Collision with 30-day cooldown history:", cooldownCheck.reason);
        try {
          const retryMsgs: ChatMessage[] = [
            ...msgs,
            { role: "model", content: raw },
            {
              role: "user",
              content: `ВНИМАНИЕ! Предложението за „${parsed.proposal.title}“ НАРУШАВА 30-дневното правило за уникалност: ${cooldownCheck.reason}. Предложи ДРУГ Сахих Хадис или Аят за видео с обяснение, който НЕ е в забранения списък! Върни валиден JSON.`,
            },
          ];
          const retryRaw = await geminiChat("gemini-3.6-flash", retryMsgs, true);
          let cleanRetry = retryRaw.replace(/```json\s*|\s*```/g, "").trim();
          const fBrace = cleanRetry.indexOf("{");
          const lBrace = cleanRetry.lastIndexOf("}");
          if (fBrace !== -1 && lBrace !== -1 && lBrace > fBrace) {
            cleanRetry = cleanRetry.substring(fBrace, lBrace + 1);
          }
          const parsedRetry = JSON.parse(cleanRetry);
          if (parsedRetry?.proposal) {
            const secondCheck = checkProposalOneMonthCooldown(parsedRetry.proposal, exclusionData.items);
            if (!secondCheck.isBlocked) {
              parsed.proposal = parsedRetry.proposal;
              if (parsed.proposal.title) parsed.proposal.title = cleanProposalTitle(parsed.proposal.title);
              if (parsedRetry.reply) parsed.reply = parsedRetry.reply;
            }
          }
        } catch (retryErr) {
          console.warn("[suggestExplainedVideoProposal] Retry error:", retryErr);
        }
      }
    }

    if (parsed.proposal && !parsed.proposal.scriptWorkflow) {
      parsed.proposal.scriptWorkflow = {
        hookQuestion: "Защо усещаш тревога в гърдите си, дори когато всичко изглежда наред?",
        dalilIntro: parsed.proposal.surah ? "В Свещения Коран, Аллах Всевишният повелява:" : "Пратеникът на Аллах ﷺ ни учи:",
        explanation: parsed.proposal.summaryBg || "Обяснение: Истинският покой на душата се постига единствено чрез помнене на Аллах, спазване на Таухида и следване на Сунната.",
        actionStep: "Спри за 1 минута, направи искрен истигфар и дуа. Запази това видео и сподели за добро!",
      };
    }

    if (parsed.proposal) {
      await enrichProposalWithAuthenticTafsir(parsed.proposal);
      await recordProposalUsages({ data: { proposals: [parsed.proposal] } }).catch(() => {});
    }

    return {
      reply: parsed.reply,
      proposal: parsed.proposal as VideoProposal,
    };
  });

export const suggestAlternativeProposal = createServerFn({ method: "POST" })
  .validator(
    (input?: { currentTitle?: string; topic?: string; type?: string; rejectedProposal?: any }) => input || {},
  )
  .handler(async ({ data }) => {
    // Record rejected proposal immediately into 30-day cooldown history
    if (data?.rejectedProposal) {
      await recordRejectedScriptureDirect(data.rejectedProposal).catch((err) => {
        console.warn("[suggestAlternativeProposal] Failed to record rejected proposal:", err);
      });
    }

    const memory = await getAiMemory();
    const exclusionData = await getExcludedScripturesOneMonth();
    const historyList = (memory.usageHistory || []).map((x) => `- ${x.identifier}`).join("\n");
    const historyContext = historyList
      ? `\n\nСКОРОШНО ИЗПОЛЗВАНИ ТЕМИ (СТРИКТНО ЗАБРАНЕНО Е ДА ГИ ПРЕДЛАГАШ ОТНОВО):\n${historyList}`
      : "";
    const oneMonthExclusionContext = exclusionData.formattedExclusionPrompt
      ? `\n\n${exclusionData.formattedExclusionPrompt}`
      : "";

    const rejectedContext = data?.currentTitle
      ? `\nПотребителят ОТХВЪРЛИ предишното предложение: "${data.currentTitle}". Предложи НАПЪЛНО НОВ, РАЗЛИЧЕН и неповторен автентичен аят или Сахих хадис по същата тема или друга въздействаща тема!`
      : "";

    const topicHint = data?.topic ? `Желана тема: "${data.topic}".` : "";

    const prompt = `Ти си автентичен САЛАФИТСКИ ШЕЙХ И ДА'ИЯ (Salafi Shaykh AI – по манхаджа на ас-Саляф ас-Салих: Шейх Ибн Баз, Шейх ал-Албани - рахимахумуллах) и топ продуцент на Ислямски видеа на български език.
Потребителят поиска алтернативно предложение за видео.
${rejectedContext}
${topicHint}
${historyContext}${oneMonthExclusionContext}

СТРИКТНО ПРАВИЛО ЗА ТАУХИД И АДАБ КЪМ АЛЛАХ ВСЕВИШНИЯТ:
ВИНАГИ използвай „Аллах Всевишният“, „Твоят Създател“, „Господът на световете“, „Всемилостивият“. СТРОГО ЗАБРАНЕНО е да използваш разговорни или непочтителни думи като „оня“, „тоя“, „онзи“!
АВТЕНТИЧНИ ТЕРМИНИ: „Астагфируллах“ (с 'г'), „Субханаллах“, „Алхамдулиллях“, „Аллаху Акбар“, „Ля иляха илляллах“.

12 ТЕМАТИЧНИ ВИДЕО КАТЕГОРИИ (ТОЧНО СЪОТВЕТСТВИЕ):
Задай движещо се 9:16 видео за фон:
1. Огън / Джехеннем / Наказание -> "raging fire flames dark night vertical"
2. Рай / Дженнет / Вечни градини -> "lush green paradise river waterfall emerald nature peaceful stream"
3. Покой / Зикр / Сакина -> "tranquil peaceful lake morning sunrise mist calm water nature"
4. Сабр / Търпение / Изпитания -> "solitary pine tree mountain storm vertical"
5. Тауаккул / Упование -> "majestic mountain summit golden sunset ocean waves landscape"
6. Тауба / Покаяние -> "gentle rain falling ripples pond vertical"
7. Ризк / Шукр -> "golden wheat field dramatic sunrise vertical"
8. Ихляс / Искреност -> "crystal clear river stones ripples nature vertical"
9. Дуа / Молба -> "solitary mountain peak sunset vast sky vertical"
10. Преходност на Дуня / Смърт -> "timelapse clouds passing mountains sunset twilight vertical"
11. Намаз / Месджид -> "grand mosque minaret exterior twilight vertical"
12. Таухид -> "cosmic starry galaxy nebula space vertical"

100% SALAFI HALAL:
0% хора, 0% човешки лица, 0% ръце, 0% музикални инструменти или ноти.
ЕМОДЖИТА: Разрешени САМО 🌿, 🕌, 📌, ✨, 💎, 🤍, 🔄, 💬, и "-->".

Върни JSON със следната структура:
{
  "reply": "Учтиво и авторитетно обяснение на български от Шейха защо това ново предложение е по-подходящо и каква мъдрост крие.",
  "proposal": {
    "title": "Точно заглавие във формат [Коран {surah}:{ayah}] Заглавие или [Сахих {collection} #{number}] Заглавие (СТРИКТНО БЕЗ '[tiktok]' или мета етикети)",
    "type": "explained_video",
    "surah": 13,
    "ayah": 28,
    "count": 1,
    "scriptWorkflow": {
      "hookQuestion": "Кука-въпрос в първите 2-3 секунди (без точки или номерация)",
      "hookContext": "Кратко въведение в проблема (без точки или номерация)",
      "dalilIntro": "В Свещения Коран, Аллах Всевишният повелява:",
      "dalilText": "Самият текст на аята или хадиса в кавички",
      "explanation": "Обяснение: Истинският покой на душата се постига единствено чрез таухид и помненето на Аллах Всевишния.",
      "actionStep": "Действие: [практическа стъпка] ИЛИ Дуа: [молитва/зикр/молба]"
    },
    "summaryBg": "Автентичен тефсир от салафитския учен според темата (30-50 думи)",
    "themeBg": "Визуална атмосфера на български",
    "searchQuery": "ключови думи за Pexels на английски според 12-те категории",
    "tiktokTheme": "hormozi",
    "useBRoll": true,
    "bRollInterval": 4,
    "quality": "high"
  }
}
Върни САМО валиден JSON без маркдаун обвивки.`;

    const msgs: ChatMessage[] = [
      { role: "system", content: prompt },
      {
        role: "user",
        content: `Предложи 1 ново алтернативно Ислямско видео сега. Предишното отхвърлено беше: ${data?.currentTitle || "общо"}.`,
      },
    ];

    const raw = await geminiChat("gemini-3.6-flash", msgs, true);
    let parsed: { reply?: string; proposal?: VideoProposal | null };
    try {
      let clean = raw.replace(/```json\s*|\s*```/g, "").trim();
      const firstBrace = clean.indexOf("{");
      const lastBrace = clean.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        clean = clean.substring(firstBrace, lastBrace + 1);
      }
      parsed = JSON.parse(clean);
    } catch {
      parsed = {
        reply: "Предлагам ти този благороден хадис от Сахих ал-Бухари за искреното търпение и упование в Аллах Всевишният.",
        proposal: {
          title: "[Сахих ал-Бухари #5645] Скритата милост в изпитанията",
          type: "explained_video",
          collection: "bukhari",
          number: 5645,
          scriptWorkflow: {
            hookQuestion: "Защо изпитанията те връхлитат точно тогава, когато най-малко очакваш?",
            hookContext: "Често възприемаме трудностите като наказание, ала забравяме истинската божествена мъдрост.",
            dalilIntro: "Пратеникът на Аллах ﷺ ни учи:",
            dalilText: "Когото Аллах желае да дари с добро, Той го подлага на изпитания.",
            explanation: "Ибн ал-Каййим (рахимахуллах) пояснява, че изпитанията на вярващия са като лекарство — горчиво на вкус, ала изчистващо сърцето от греховете и въздигащо го при Аллах Всевишният.",
            actionStep: "Направи търпение (сабр) и кажи искрено 'Алхамдулиллях аля кулли хал'. Запази това видео и го сподели за добро!",
          },
          summaryBg: "Ибн ал-Каййим (рахимахуллах) пояснява, че изпитанията пречистват сърцето на вярващия и го доближават до Аллах.",
          themeBg: "Самотен бор в планинска буря и изгряваща светлина",
          searchQuery: "solitary pine tree mountain storm vertical",
          tiktokTheme: "hormozi",
          useBRoll: true,
          bRollInterval: 4,
          quality: "high",
        },
      };
    }

    if (parsed.proposal && parsed.proposal.title) {
      parsed.proposal.title = cleanProposalTitle(parsed.proposal.title);
    }

    // 1-Month Cooldown Verification & Auto-Correction
    if (parsed.proposal) {
      const cooldownCheck = checkProposalOneMonthCooldown(parsed.proposal, exclusionData.items);
      if (cooldownCheck.isBlocked) {
        console.warn("[suggestAlternativeProposal] Collision with 30-day cooldown history:", cooldownCheck.reason);
        try {
          const retryMsgs: ChatMessage[] = [
            ...msgs,
            { role: "model", content: raw },
            {
              role: "user",
              content: `ВНИМАНИЕ! Алтернативното предложение „${parsed.proposal.title}“ НАРУШАВА 30-дневното правило за уникалност: ${cooldownCheck.reason}. Предложи ДРУГ Сахих Хадис или Аят, който НЕ е в забранения списък! Върни валиден JSON.`,
            },
          ];
          const retryRaw = await geminiChat("gemini-3.6-flash", retryMsgs, true);
          let cleanRetry = retryRaw.replace(/```json\s*|\s*```/g, "").trim();
          const fBrace = cleanRetry.indexOf("{");
          const lBrace = cleanRetry.lastIndexOf("}");
          if (fBrace !== -1 && lBrace !== -1 && lBrace > fBrace) {
            cleanRetry = cleanRetry.substring(fBrace, lBrace + 1);
          }
          const parsedRetry = JSON.parse(cleanRetry);
          if (parsedRetry?.proposal) {
            const secondCheck = checkProposalOneMonthCooldown(parsedRetry.proposal, exclusionData.items);
            if (!secondCheck.isBlocked) {
              parsed.proposal = parsedRetry.proposal;
              if (parsed.proposal.title) parsed.proposal.title = cleanProposalTitle(parsed.proposal.title);
              if (parsedRetry.reply) parsed.reply = parsedRetry.reply;
            }
          }
        } catch (retryErr) {
          console.warn("[suggestAlternativeProposal] Retry error:", retryErr);
        }
      }
    }

    if (
      parsed.proposal &&
      !parsed.proposal.scriptWorkflow &&
      (parsed.proposal.type === "explained_video" || data?.type === "explained_video")
    ) {
      parsed.proposal.scriptWorkflow = {
        hookQuestion: "Защо усещаш тревога в гърдите си, дори когато всичко изглежда наред?",
        hookContext: "Често търсим спокойствие на грешните места, но душата остава жадна за истината.",
        dalilIntro: parsed.proposal.surah ? "В Свещения Коран, Аллах Всевишният повелява:" : "Пратеникът на Аллах ﷺ ни учи:",
        dalilText: parsed.proposal.title,
        explanation: parsed.proposal.summaryBg || "Обяснение: Истинският покой на душата се постига единствено чрез помнене на Аллах, спазване на Таухида и следване на Сунната.",
        actionStep: "Спри за 1 минута, направи искрен истигфар и дуа. Запази това видео и сподели за добро!",
      };
    }

    if (parsed.proposal) {
      await enrichProposalWithAuthenticTafsir(parsed.proposal);
      await recordProposalUsages({ data: { proposals: [parsed.proposal] } }).catch(() => {});
    }

    return {
      reply: parsed.reply || "Предлагам ти това ново алтернативно видео:",
      proposal: parsed.proposal as VideoProposal,
    };
  });

export const suggestBatchViralProposals = createServerFn({ method: "POST" })
  .validator(
    (
      input:
        { count?: number; topic?: string; targetType?: "carousel" | "video" | "mixed" } | undefined,
    ) => input || {},
  )
  .handler(
    async ({
      data,
    }: {
      data: { count?: number; topic?: string; targetType?: "carousel" | "video" | "mixed" };
    }) => {
      const countNum = data.count || 5;
      const topicStr =
        data.topic || "САМО Коран и Сахих Хадиси (БЕЗ TikTok психология и измислени цитати)";
      const targetType = data.targetType || "mixed";

      const memory = await getAiMemory();
      const exclusionData = await getExcludedScripturesOneMonth();
      const historyList = (memory.usageHistory || []).map((x) => `- ${x.identifier}`).join("\n");
      const historyContext = historyList
        ? `\n\nСКОРОШНО ИЗПОЛЗВАНИ ТЕМИ (СТРИКТНО ЗАБРАНЕНО Е ДА ГИ ПРЕДЛАГАШ ОТНОВО):\n${historyList}`
        : "";
      const oneMonthExclusionContext = exclusionData.formattedExclusionPrompt
        ? `\n\n${exclusionData.formattedExclusionPrompt}`
        : "";

      const THEMES = [
        "Таухид (Единобожие) и силата му",
        "Как да задържим вниманието си върху Ахирета",
        "Търпение (Сабр)",
        "Упование в Аллах",
        "Прошка и милост",
        "Скрита мъдрост в трудности",
        "Мълчание",
        "Изобилие и благодарност",
        "Силата на Дуата",
        "Преходността на Дуня",
        "Сърдечно покаяние",
        "Защита от зло",
        "Справедливост",
        "Доброта към родители",
      ];
      const shuffledThemes = [...THEMES].sort(() => Math.random() - 0.5);
      const selectedThemes = shuffledThemes.slice(0, 3).join(", ");

      const VIRAL_SURAHS = [
        3, 4, 8, 14, 18, 19, 20, 21, 24, 25, 29, 31, 36, 39, 40, 50, 51, 55, 56, 59, 67, 68, 73, 75,
        76, 78, 89, 94, 99, 103,
      ];
      const shuffledSurahs = [...VIRAL_SURAHS].sort(() => Math.random() - 0.5);
      const randomSurahs = shuffledSurahs.slice(0, 5).join(", ");

      const prompt = `Ти си ПРОФЕСИОНАЛЕН ПРОДУЦЕНТ И РЕЖИСЬОР на вирусни Ислямски видеа (Reels & TikTok) на български език.
ИЗКЛЮЧИТЕЛНО ВАЖНО ПРАВИЛО: ТРЯБВА ДА ГЕНЕРИРАШ АБСОЛЮТНО УНИКАЛНИ ПРЕДЛОЖЕНИЯ, КОИТО НИКОГА НЕ СА БИЛИ ПРЕДЛАГАНИ ПРЕДИ!
Измисли и предложи ПАКЕТ ОТ ТОЧНО ${countNum} изключително силни, НЕБАНАЛНИ и психологически поразяващи теми/уроци за къси видеа в категория: "${topicStr}".${historyContext}${oneMonthExclusionContext}

ФОКУСИРАЙ СЕ ДНЕС ВЪРХУ СЛЕДНИТЕ ТЕМИ: ${selectedThemes}. (Уникален ID: ${Date.now()})

ПРОФЕСИОНАЛНИ СТРИКТНИ ПРАВИЛА (PRO WORKFLOW):
1. СТРИКТНО СЛЕДВАЙ КАТЕГОРИЯТА: "${topicStr}". Ако категорията изисква САМО Хадиси, тогава генерирай ИЗКЛЮЧИТЕЛНО САМО ХАДИСИ (никакъв Коран). Ако изисква САМО Коран, генерирай САМО КОРАН. АБСОЛЮТНО СА ЗАБРАНЕНИ измислени цитати.
2. ИЗРИЧНО ЗАБРАНЕНО Е да включваш най-популярните текстове като Сура Ал-Бакара 2:255, Сура Ад-Духа (93) или Сура Юсуф! Искаме рядко цитирани, дълбоки и неклиширани текстове.${targetType === "carousel" ? "\nИЗКЛЮЧИТЕЛНО ВАЖНО ЗА КАРУСЕЛ: ЗАДЪЛЖИТЕЛНО генерирай ВСИЧКИ предложения като тип КАРУСЕЛ (type: 'carousel') с 'carouselSlides' от ТОЧНО 4 слайда по Viral Framework (Слайд 1: Hook с curiosity gap/въпрос, Слайдове 2-3: сбит текст с клифхенгъри и автентичен Далил, Слайд 4: стойностен CTA със 'Запази'/'Сподели')!" : ""}
3. ОГРАНИЧЕНИЕ ЗА ВРЕМЕТРАЕНЕ (< 60 секунди): За да се събере във вайръл формат (TikTok/Reels), текстът на български НЕ ТРЯБВА да надвишава 70-80 думи. Ако текстът е дълъг, вземи само част от него! Видеото задължително трябва да е под 1 минута.
4. Задължително включвай кинематографични настройки: "useBRoll": true, "bRollInterval": 5 и "quality": "high".
5. ВИНАГИ включвай точния източник в 'title' на български език във формат: [Коран {surah}:{ayah}] Заглавие или [Сахих {collection} #{number}] Заглавие. СТРИКТНО ЗАБРАНЕНО Е да добавяш '[tiktok carousels]', '[tiktok]' или подобни мета префикси.
6. ИЗРИЧНО Е ЗАБРАНЕНО ДА КОПИРАШ ПРИМЕРНИТЕ АЯТИ И ХАДИСИ ОТ ДОЛНИЯ JSON! ГЕНЕРИРАЙ ИЗЦЯЛО НОВИ, СЛУЧАЙНИ И УНИКАЛНИ ПРЕДЛОЖЕНИЯ!
7. ПРАВИЛО ЗА БЕКГРАУНД ВИДЕО (searchQuery): ЗАБРАНЕНО Е ДА ИМА ХОРА (мъже или жени) във видеата! Твоят searchQuery трябва ВИНАГИ да бъде само за природа, пейзажи и абстрактни неща (напр. "nature landscape mountain sunset peaceful no people"). Никога не включвай думи като "person", "woman", "man", "people".

Върни JSON със следната структура, като при всяко предложение ЗАДЪЛЖИТЕЛНО попълваш точните числови параметри за съответния type:
{
  "reply": "Увлекателно представяне на български език на този специален пакет от ${countNum} вайръл идеи. Обясни накратко защо са избрани и покани потребителя да отбележи кои желае да одобри за генериране.",
  "proposals": [
    {
      "title": "[Коран 2:255] Аят ал-Курси • Тронът на Аллах",
      "type": "quran",
      "surah": 2,
      "ayah": 255,
      "count": 1,
      "summaryBg": "Аят ал-Курси е най-великият аят в Корана, даващ абсолютна защита и спокойствие на сърцето.",
      "themeBg": "Космос, звезди и величествена златна светлина",
      "searchQuery": "stars universe galaxy cinematic",
      "tiktokTheme": "hormozi",
      "useBRoll": true,
      "bRollInterval": 5,
      "quality": "high"
    },
    {
      "title": "[Сахих ал-Бухари #5645] Защо Аллах изпраща изпитания",
      "type": "hadith",
      "collection": "bukhari",
      "number": 5645,
      "summaryBg": "Когото Аллах желае да дари с добро, Той го подлага на изпитания за пречистване на душата.",
      "themeBg": "Буря, която утихва в слънчева зора",
      "searchQuery": "storm sunlight dramatic cinematic nature",
      "tiktokTheme": "hormozi",
      "useBRoll": true,
      "bRollInterval": 5,
      "quality": "high"
    }
  ]
}
ВАЖНО: Ако предложението е от тип "quran", ЗАДЪЛЖИТЕЛНО попълни точни цели числа за "surah" (1-114), "ayah" (>0) и "count" (1-7)! НИКОГА не оставяй "surah" и "ayah" празни! Върни САМО валиден JSON без маркдаун кавички.`;

      const msgs: ChatMessage[] = [
        { role: "system", content: prompt },
        {
          role: "user",
          content: `Предложи пакет от ${countNum} вирусни идеи сега според инструкциите и върни валиден JSON с масив proposals от точно ${countNum} елемента.`,
        },
      ];

      const raw = await geminiChat("gemini-3.6-flash", msgs, true);
      let parsed: { reply?: string; proposals?: VideoProposal[] | null };
      try {
        let clean = raw.replace(/```json\s*|\s*```/g, "").trim();
        const firstBrace = clean.indexOf("{");
        const lastBrace = clean.lastIndexOf("}");
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          clean = clean.substring(firstBrace, lastBrace + 1);
        }
        parsed = JSON.parse(clean);
      } catch (err) {
        console.error("[suggestBatchViralProposals] Gemini parsing or network error:", err);
        const fallbackShuffled = [...VIRAL_SERIES_PRESETS];
        for (let i = fallbackShuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [fallbackShuffled[i], fallbackShuffled[j]] = [fallbackShuffled[j], fallbackShuffled[i]];
        }
        parsed = {
          reply: `Ето специално подбран пакет от ${countNum} топ вирусни идеи от Корана, Хадисите и TikTok трендовете! Избери кои от тях да одобрим и генерираме:`,
          proposals: fallbackShuffled.slice(0, countNum).map((p) => ({
            title: `[Коран] ${p.ref}`,
            type: "quran",
            surah: p.surah,
            ayah: p.ayah,
            count: p.ayahEnd - p.ayah + 1,
            summaryBg: p.summary,
            themeBg: "Кинематографична атмосфера",
            searchQuery: p.query,
            tiktokTheme: "hormozi",
            useBRoll: true,
            bRollInterval: 5,
            quality: "high",
          })),
        };
      }

      if (Array.isArray(parsed.proposals) && parsed.proposals.length > 0) {
        // Filter out any proposal that is within the 1-month cooldown period
        parsed.proposals = parsed.proposals.filter((p: VideoProposal) => {
          const check = checkProposalOneMonthCooldown(p, exclusionData.items);
          if (check.isBlocked) {
            console.warn("[suggestBatchViralProposals] Colliding proposal filtered:", check.reason);
            return false;
          }
          return true;
        });

        parsed.proposals.forEach((p: VideoProposal) => {
          if (p && p.title) p.title = cleanProposalTitle(p.title);
        });
        await injectAuthenticCarouselText(parsed.proposals);
        await recordProposalUsages({ data: { proposals: parsed.proposals } }).catch(() => {});
      }

      return {
        reply: parsed.reply,
        proposals: (parsed.proposals || []).slice(0, countNum) as VideoProposal[],
      };
    },
  );

export function formatSpokenCitation(rawRef: string, isQuran: boolean): string {
  if (!rawRef) return "";
  let ref = rawRef.replace(/^[\[\s]+|[\]\s]+$/g, "").trim();

  if (isQuran) {
    const m1 = ref.match(
      /(?:Сура\s+)?([^\d()]+)?\s*(?:\((\d+)[:.](\d+(?:-\d+)?)\)|(\d+)[:.](\d+(?:-\d+)?))/i
    );
    if (m1) {
      let name = (m1[1] || "").trim().replace(/^Сура\s+/i, "").replace(/[-–—•\s]+$/, "").trim();
      const surahNum = m1[2] || m1[4];
      let ayahNum = m1[3] || m1[5];
      if (ayahNum && ayahNum.includes("-")) {
        ayahNum = "аяти " + ayahNum.replace("-", " до ");
      } else if (ayahNum) {
        ayahNum = "аят " + ayahNum;
      }

      const parts: string[] = [];
      if (name && !/(?:коран)/i.test(name)) {
        parts.push("Сура " + name);
        if (surahNum) parts.push("сура " + surahNum);
      } else if (surahNum) {
        parts.push("сура " + surahNum);
      }
      if (ayahNum) parts.push(ayahNum);

      if (parts.length > 0) return parts.join(", ");
    }
  } else {
    // Hadith format: 'Сахих ал-Бухари #6424' or 'Сахих Муслим #123'
    const m2 = ref.match(/^([^#]+)(?:#\s*(\d+))?/);
    if (m2) {
      const coll = m2[1].trim();
      const num = m2[2];
      if (coll && num) return coll + ", хадис номер " + num;
      if (coll) return coll;
    }
  }
  return ref;
}

export function detectActionOrDuaLabel(text?: string): "Дуа" | "Действие" {
  if (!text) return "Действие";
  const lower = text.toLowerCase();
  const isDua =
    /(?:\bдуа|\bду'а|молба|моли се|помоли|молитва|истигфар|астагфируллах|субханаллах|алхамдулиллах|хасбуналлах|рабби|аллахумма|дуата)\b/i.test(
      lower,
    );
  return isDua ? "Дуа" : "Действие";
}

export function cleanScriptPrefixes(text: string): string {
  return text
    .replace(/(^|\n)\s*(?:\(\d+\)|\[\d+\]|\d+\.|\*|-|•)\s*/g, "$1")
    .replace(/^(?:поука|обяснение|действие|дуа|призив):\s*/i, "")
    .replace(/(?:по\s+манхаджа\s+на\s+)?(?:ас[- ]?саляф\s+ас[- ]?салих|салаф\s+ус\s+салих|саляф\s+ас\s+салих)(?:\s*[–—,]\s*)?/gi, "")
    .replace(/Шейх\s+ал-Усеймин[^\w\s]*\s*(?:\(рахимахуллах\))?\s*(?:пояснява|обяснява|подчертава|разяснява|учи|казва)[^,]*,?\s*че\s*/gi, "Salafi Shaykh AI пояснява, че ")
    .replace(/Шейх\s+ал-Усеймин(?:\s*\(рахимахуллах\))?/gi, "Salafi Shaykh AI")
    .replace(/ал-Усеймин/gi, "Salafi Shaykh AI")
    .replace(/\.{2,}/g, " ")
    .replace(/…+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function stripScholarAttribution(text: string): string {
  if (!text) return "";
  let cleaned = cleanScriptPrefixes(text);

  // Strip leading labels
  cleaned = cleaned.replace(/^(?:поука|обяснение|разяснение|тефсир):\s*/i, "");

  // Strip attribution clauses like "Salafi Shaykh AI пояснява, че", "Шейх ас-Са'ди пояснява в своя Тефсир, че", "Шейх ал-Усеймин пояснява, че"
  cleaned = cleaned.replace(
    /^(?:според\s+)?(?:salafi\s+shaykh\s+ai|шейх\s+[^,.:\n]+|имам\s+[^,.:\n]+|ибн\s+[^,.:\n]+|учените\s+на\s+исляма)\s*(?:\([^)]*\))?\s*(?:пояснява(?:т)?|обяснява(?:т)?|подчертава(?:т)?|разяснява(?:т)?|учи(?:т)?|казва(?:т)?|пише|напомня(?:т)?)[^,.:\n]*,?\s*че\s*/i,
    "",
  );

  // Strip "Според Salafi Shaykh AI, " etc.
  cleaned = cleaned.replace(
    /^(?:според\s+)(?:salafi\s+shaykh\s+ai|шейх\s+[^,.:\n]+|имам\s+[^,.:\n]+|ибн\s+[^,.:\n]+)[,:\s]+/i,
    "",
  );

  // Strip if it starts with "Salafi Shaykh AI: " or similar
  cleaned = cleaned.replace(
    /^(?:salafi\s+shaykh\s+ai|шейх\s+[^,.:\n]+|имам\s+[^,.:\n]+|ибн\s+[^,.:\n]+)\s*(?:\([^)]*\))?\s*:\s*/i,
    "",
  );

  // Strip any lingering redundant prefix
  cleaned = cleaned.replace(/^(?:поука|обяснение|разяснение|тефсир):\s*/i, "").trim();

  // Capitalize first character
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  return cleaned;
}

export function buildExplainedNarrationText(params: {
  viralTitle?: string;
  reference: string;
  quoteText: string;
  isQuran: boolean;
  scriptWorkflow?: ExplainedVideoScript;
  summaryBg?: string;
}): string {
  const sw = params.scriptWorkflow;
  const blocks: string[] = [];

  // Step 1: Hook (Question & Short Context) - strictly clean, without numbered dots
  const hookParts: string[] = [];
  if (sw?.hookQuestion) {
    hookParts.push(cleanScriptPrefixes(sw.hookQuestion));
  }
  if (sw?.hookContext) {
    hookParts.push(cleanScriptPrefixes(sw.hookContext));
  }
  if (hookParts.length === 0 && params.viralTitle && !params.viralTitle.startsWith("[")) {
    hookParts.push(cleanScriptPrefixes(params.viralTitle));
  }
  if (hookParts.length > 0) {
    blocks.push(hookParts.join(" "));
  }

  // Step 2: Dalil (Intro + Sacred Quote + Citation spoken at the end)
  const spokenRef = formatSpokenCitation(params.reference, params.isQuran);
  let intro = (sw?.dalilIntro || "").trim();
  intro = intro.replace(/^(?:чуй\s+какво\s+)?(?:ни\s+)?казва\s+(?:се\s+)?(?:ни\s+)?за\s*[^:]*:\s*/i, "");

  if (
    !intro ||
    intro === "Чуй какво казва Аллах Всевишният в Корана:" ||
    intro === "Пратеникът на Аллах ﷺ ни учи:" ||
    intro.includes("сура") ||
    intro.includes("хадис")
  ) {
    if (params.isQuran) {
      intro = "Чуй какво казва Аллах Всевишният в Корана:";
    } else {
      intro = "Пратеникът на Аллах ﷺ ни учи:";
    }
  }

  const cleanDalil = params.quoteText
    .replace(/(^|\n)\s*(?:\(\d+\)|\[\d+\]|\d+\.|\*|-|•)\s*/g, "$1")
    .replace(/\[(?:коран|сура|хадис|бухари|муслим|тирмизи|навауи)[^\]]*\]/gi, "")
    .replace(/\((?:коран|сура|хадис|бухари|муслим|тирмизи|навауи)[^)]*\)/gi, "")
    .replace(/^["„“']+|["„“']+$/g, "")
    .replace(/^(?:чуй\s+какво\s+)?(?:ни\s+)?казва\s+(?:се\s+)?(?:ни\s+)?за\s*[^:]*:\s*/i, "")
    .trim();

  // At the end of the quote, state the exact number/citation of the ayah or hadith
  const citationAtEnd = spokenRef && !spokenRef.startsWith("[") ? `\n— ${spokenRef}.` : "";
  blocks.push(`${intro}\n„${cleanDalil}“${citationAtEnd}`);

  // Step 3: Explanation (Обяснение:) - strictly labeled "Обяснение:" without naming who it is from
  let explanation = sw?.explanation?.trim() || "";
  if (!explanation && params.summaryBg) {
    explanation = params.summaryBg.trim();
  }
  if (explanation) {
    const cleanExpl = stripScholarAttribution(explanation);
    blocks.push(`Обяснение: ${cleanExpl}`);
  }

  // Step 4: Action or Dua (Действие: или Дуа:) - strictly without dots or numbering
  let action = sw?.actionStep?.trim() || "";
  if (!action) {
    action = "Запази това напомняне за моменти на трудност и сподели за садака джария!";
  }
  const cleanAct = cleanScriptPrefixes(action);
  const label = detectActionOrDuaLabel(cleanAct);
  blocks.push(`${label}: ${cleanAct}`);

  return blocks.join(' <break time="0.7s" />\n\n');
}

export const confirmAndGenerateVideo = createServerFn({ method: "POST" })
  .validator((input: { proposal: VideoProposal; force?: boolean }) => input)
  .handler(async ({ data: { proposal, force } }) => {
    if (proposal.title) {
      proposal.title = cleanProposalTitle(proposal.title);
    }

    // 1-Month Cooldown Safety Check: Block duplicate generation unless explicitly forced
    if (!force) {
      const exclusionData = await getExcludedScripturesOneMonth();
      const cooldownCheck = checkProposalOneMonthCooldown(proposal, exclusionData.items);
      if (cooldownCheck.isBlocked) {
        throw new Error(
          cooldownCheck.reason ||
            `Този аят/хадис вече беше генериран през последния 1 месец и е в 30-дневна пауза за уникалност (${cooldownCheck.daysRemaining} дни остават).`,
        );
      }
    }
    let arabic = "";
    let english = "";
    let bulgarian = "";
    let reference = proposal.title;
    let audioUrl: string | null = null;
    let wordSegments: Array<{ start: number; end: number }> | undefined = undefined;
    let ayahBounds:
      | Array<{ ayah: number; start: number; end: number; arabic: string; english: string }>
      | undefined = undefined;
    let bulgarianWordTimings: Array<{ start: number; end: number; word: string }> | undefined =
      undefined;
    let arabicWordCount: number | undefined = undefined;

    const topic = extractTopic(proposal);
    let viralTitle = topic || proposal.title || "";
    if (!topic) {
      if (viralTitle.includes("] ")) {
        viralTitle = viralTitle.split("] ").slice(1).join("] ").trim();
      } else if (viralTitle.includes("•")) {
        viralTitle = viralTitle.split("•")[1].trim();
      }
    }

    if (
      proposal.type === "hadith" ||
      (!proposal.surah && !proposal.ayah && proposal.collection && proposal.number)
    ) {
      const coll = (proposal.collection || "nawawi40") as
        "bukhari" | "muslim" | "tirmidhi" | "nawawi40";
      const num = Number(proposal.number) || 1;
      const h = await fetchSunnahHadith({ data: { collection: coll, number: num } });
      arabic = h.arabic;
      english = h.english;
      reference = h.reference;
      const t = await translateToBulgarian({
        data: { english: h.english, sourceRef: h.reference },
      });
      bulgarian = t.bulgarian;

      if (proposal.type === "explained_video" || proposal.scriptWorkflow) {
        bulgarian = buildExplainedNarrationText({
          viralTitle,
          reference: h.reference,
          quoteText: bulgarian,
          isQuran: false,
          scriptWorkflow: proposal.scriptWorkflow,
          summaryBg: proposal.summaryBg,
        });
      } else {
        const cleanExplanation = stripScholarAttribution(proposal.summaryBg || "");
        if (cleanExplanation && cleanExplanation.length > 15 && !bulgarian.includes(cleanExplanation)) {
          bulgarian = `${bulgarian} <break time="0.8s" /> Обяснение: ${cleanExplanation}`;
        }
        if (viralTitle) {
          bulgarian = `${viralTitle} <break time="1.0s" />\n\n${bulgarian}`;
        }
      }

      try {
        const narr = await synthesizeHadithNarration({ data: { text: bulgarian } });
        audioUrl = `data:${narr.mimeType || "audio/mp3"};base64,${narr.base64}`;
        bulgarianWordTimings = narr.wordTimings;
      } catch (e) {
        console.warn("Could not narrate hadith:", e);
      }
    } else if (
      proposal.type === "tiktok" ||
      proposal.type === "general" ||
      (proposal.type !== "quran" &&
        !proposal.surah &&
        !proposal.ayah &&
        !proposal.number &&
        proposal.summaryBg)
    ) {
      if (proposal.type === "explained_video" || proposal.scriptWorkflow) {
        bulgarian = buildExplainedNarrationText({
          viralTitle,
          reference: proposal.title,
          quoteText: proposal.scriptWorkflow?.dalilText || proposal.summaryBg || proposal.title,
          isQuran: false,
          scriptWorkflow: proposal.scriptWorkflow,
          summaryBg: proposal.summaryBg,
        });
      } else {
        bulgarian = proposal.summaryBg || proposal.title;
        reference = proposal.title;
        arabic = "";
        english = "";

        if (viralTitle && !bulgarian.includes(viralTitle)) {
          bulgarian = `${viralTitle} <break time="1.0s" />\n\n${bulgarian}`;
        }
      }

      try {
        const narr = await synthesizeHadithNarration({ data: { text: bulgarian } });
        audioUrl = `data:${narr.mimeType || "audio/mp3"};base64,${narr.base64}`;
        bulgarianWordTimings = narr.wordTimings;
      } catch (e) {
        console.warn("Could not narrate tiktok topic:", e);
      }
    } else {
      let surah = Number(proposal.surah);
      let ayah = Number(proposal.ayah);
      let count = Math.min(7, Math.max(1, Number(proposal.count) || 1));

      // ALWAYS trust the title first (WYSIWYG) if it contains [Коран X:Y] format
      // IMPORTANT: ONLY search the title! Do not search summaryBg, as it might contain random numbers like 39:53.
      const colonMatch = proposal.title.match(
        /\b(\d{1,3})\s*[:.]\s*(\d{1,3})(?:\s*-\s*(\d{1,3}))?\b/,
      );
      if (colonMatch) {
        surah = parseInt(colonMatch[1], 10);
        ayah = parseInt(colonMatch[2], 10);
        if (colonMatch[3]) {
          const end = parseInt(colonMatch[3], 10);
          if (end >= ayah && end - ayah < 7) {
            count = end - ayah + 1;
          }
        }
      } else if (isNaN(surah) || surah <= 0 || isNaN(ayah) || ayah <= 0) {
        const lower = proposal.title.toLowerCase();
        if (lower.includes("ихлас") || lower.includes("ikhlas")) {
          surah = 112;
          ayah = 1;
          count = 4;
        } else if (lower.includes("аср") || lower.includes("asr")) {
          surah = 103;
          ayah = 1;
          count = 3;
        } else if (lower.includes("курси") || lower.includes("kursi")) {
          surah = 2;
          ayah = 255;
          count = 1;
        } else if (lower.includes("шарх") || lower.includes("облекчение")) {
          surah = 94;
          ayah = 5;
          count = 2;
        } else if (lower.includes("фаляк") || lower.includes("фалак")) {
          surah = 113;
          ayah = 1;
          count = 5;
        } else if (lower.includes("наср") || lower.includes("победа")) {
          surah = 110;
          ayah = 1;
          count = 3;
        } else if (lower.includes("каусар") || lower.includes("изобилие")) {
          surah = 108;
          ayah = 1;
          count = 3;
        } else if (lower.includes("нас") || lower.includes("убежище")) {
          surah = 114;
          ayah = 1;
          count = 6;
        } else {
          surah = isNaN(surah) || surah <= 0 ? 1 : surah;
          ayah = isNaN(ayah) || ayah <= 0 ? 1 : ayah;
        }
      }

      try {
        const ayahEnd = ayah + count - 1;
        const q = await fetchAyah({ data: { surah, ayah, ayahEnd } });
        arabic = q.arabic;
        english = q.english;
        reference = `Сура ${q.surahName} (${surah}:${ayah}${count > 1 ? `-${ayah + count - 1}` : ""})`;
        audioUrl = q.audioUrl;
        wordSegments = q.wordSegments;
        ayahBounds = q.ayahBounds;
        arabicWordCount = q.arabicWordCount;

        const t = await translateToBulgarian({
          data: {
            english: q.english,
            sourceRef: reference,
            arabic: q.arabic,
            ayahBounds: q.ayahBounds,
          },
        });
        bulgarian = t.bulgarian.replace(/(^|\n)\s*(?:\(\d+\)|\[\d+\]|\d+\.)\s*/g, "$1").trim();

        if (proposal.type === "explained_video" || proposal.scriptWorkflow) {
          bulgarian = buildExplainedNarrationText({
            viralTitle,
            reference,
            quoteText: bulgarian,
            isQuran: true,
            scriptWorkflow: proposal.scriptWorkflow,
            summaryBg: proposal.summaryBg,
          });
        } else {
          const cleanExplanation = stripScholarAttribution(proposal.summaryBg || "");
          if (cleanExplanation && cleanExplanation.length > 15 && !bulgarian.includes(cleanExplanation)) {
            bulgarian = `${bulgarian} <break time="0.8s" /> Обяснение: ${cleanExplanation}`;
          }
          if (viralTitle) {
            bulgarian = `${viralTitle} <break time="1.0s" />\n\n${bulgarian}`;
          }
        }

        try {
          const narr = await synthesizeHadithNarration({ data: { text: bulgarian } });
          audioUrl = `data:${narr.mimeType || "audio/mp3"};base64,${narr.base64}`;
          bulgarianWordTimings = narr.wordTimings;
        } catch (e) {
          console.warn("Could not narrate Quran:", e);
        }
      } catch (err) {
        console.error(
          `[assistant] Error fetching Quran data or translating for ${surah}:${ayah}:`,
          err,
        );
        throw new Error(`Failed to load or translate Quran text: ${err}`);
      }
    }

    // 0. Salafi Adab text sanitation: Reverence for Allah (strictly eliminate casual 'оня')
    bulgarian = bulgarian
      .replace(/(?:търси|иска|зове|напомня\s+за)\s+оня\b/gi, "$1 своя Създател")
      .replace(/(?<=^|[^\p{L}\p{N}])оня(?=[^\p{L}\p{N}]|$)/gui, "Аллах Всевишният")
      .replace(/(?<=^|[^\p{L}\p{N}])тоя(?=[^\p{L}\p{N}]|$)/gui, "този");

    let resolvedQuery = proposal.searchQuery;
    const fullText = `${proposal.title || ""} ${proposal.themeBg || ""} ${proposal.summaryBg || ""} ${bulgarian || ""}`;
    const concept = matchTheologicalConcept(fullText);
    if (concept) {
      resolvedQuery = concept.roleQueries.dalil?.[0] || concept.roleQueries.hook?.[0] || resolvedQuery;
    }
    if (!resolvedQuery || !resolvedQuery.trim()) {
      resolvedQuery = "tranquil peaceful nature vertical";
    }

    let bestVid = "https://videos.pexels.com/video-files/30054113/12891205_1080_1920_30fps.mp4";
    try {
      const vidSearch = await searchPexelsVideos({
        data: {
          text: resolvedQuery,
          minDuration: 30,
        },
      });
      if (vidSearch.videos && vidSearch.videos.length > 0) {
        bestVid = vidSearch.videos[0].link;
      }
    } catch (err) {
      console.warn("[assistant] Pexels search failed, using fallback bg:", err);
    }

    // Fetch multi-scene B-Roll always for Assistant videos
    let bRollUrls: string[] | undefined;
    try {
      const { fetchMultiSceneBRoll } = await import("./pexels.functions");
      const bRollResult = await fetchMultiSceneBRoll({
        data: {
          query: resolvedQuery,
          text: bulgarian,
        },
      });
      if (bRollResult.clips && bRollResult.clips.length > 1) {
        bRollUrls = bRollResult.clips;
      }
    } catch (e) {
      console.warn("[assistant] Could not fetch multi-scene B-Roll:", e);
    }

    const subtitleStyle = proposal.subtitlePosition || "middle";

    const { jobId } = await startServerRenderJob({
      data: {
        title: proposal.title || topic || reference,
        data: {
          backgroundUrl: bestVid,
          backgroundVideoUrl: bestVid,
          arabic,
          bulgarian,
          reference: topic, // Display TOPIC at the top of the video (SAFE_TOP + 40)!
          topic,
          scriptureReference: reference,
          viralTitle: topic,
          style: subtitleStyle,
          tiktokTheme: proposal.tiktokTheme || "hormozi",
          subtitlePosition: subtitleStyle,
          subtitleSlicingMode: "phrase",
          pacingMode: "punchy",
          audioUrl: audioUrl || undefined,
          requireAudio: Boolean(audioUrl),
          fallbackDuration: 10,
          wordSegments: undefined, // undefined to force punchy mode
          ayahBounds: undefined, // undefined to force punchy mode
          arabicWordCount: undefined,
          bulgarianWordTimings,
          quality: proposal.quality || "1080p", // create.tsx uses 1080p instead of high
          bRollUrls,
        },
      },
    });

    return {
      reply: `🎬 **Одобрено! Стартирах генерирането на видеото за тема „${topic}“ на сървъра!**\n\n📌 **Горе на екрана ще се показва темата:** „${topic}“\n📖 **Свещен цитат:** ${reference} (изговаря се и се показва в самото видео)\n\nМожеш да го намериш и свалиш веднага след рендиране от раздел **[Изтегляния](/downloads)**.`,
      jobStarted: true,
      jobId,
      reference,
      topic,
    };
  });

export const approveAndRenderAssistantIdea = confirmAndGenerateVideo;

export const VIRAL_SERIES_PRESETS = [
  {
    surah: 1,
    ayah: 1,
    ayahEnd: 2,
    ref: "Сура Ал-Фатиха (1:1-2)",
    summary: "Откриването и благословията на Корана",
    query: "islamic calm mosque sunset nature",
  },
  {
    surah: 112,
    ayah: 1,
    ayahEnd: 4,
    ref: "Сура Ал-Ихлас (112:1-4)",
    summary: "Единобожието и чистотата на вярата",
    query: "mountain light rays dramatic nature",
  },
  {
    surah: 103,
    ayah: 1,
    ayahEnd: 3,
    ref: "Сура Ал-Аср (103:1-3)",
    summary: "Времето и спасението на човека",
    query: "hourglass time cinematic nature sunset",
  },
  {
    surah: 94,
    ayah: 5,
    ayahEnd: 6,
    ref: "Сура Аш-Шарх (94:5-6)",
    summary: "С всяка трудност идва облекчение",
    query: "sunlight breaking through clouds hope",
  },
  {
    surah: 2,
    ayah: 255,
    ayahEnd: 255,
    ref: "Аят ал-Курси (2:255)",
    summary: "Тронът на Аллах и великата защита",
    query: "stars night sky universe galaxy cinematic",
  },
  {
    surah: 113,
    ayah: 1,
    ayahEnd: 5,
    ref: "Сура Ал-Фаляк (113:1-5)",
    summary: "Защита от всяко зло на пукнатината на зората",
    query: "sunrise golden hour fog cinematic nature",
  },
  {
    surah: 114,
    ayah: 1,
    ayahEnd: 6,
    ref: "Сура Ан-Нас (114:1-6)",
    summary: "Убежище при Господаря на хората",
    query: "peaceful ocean waves calm nature",
  },
  {
    surah: 108,
    ayah: 1,
    ayahEnd: 3,
    ref: "Сура Ал-Каусар (108:1-3)",
    summary: "Изобилието и реката в Рая",
    query: "waterfall crystal clear water river nature",
  },
  {
    surah: 110,
    ayah: 1,
    ayahEnd: 3,
    ref: "Сура Ан-Наср (110:1-3)",
    summary: "Победата и прошката на Аллах",
    query: "triumph golden sunlight birds flying",
  },
  {
    surah: 109,
    ayah: 1,
    ayahEnd: 6,
    ref: "Сура Ал-Кафирун (109:1-6)",
    summary: "За вас е вашата религия, а за мен е моята",
    query: "desert dunes peaceful horizon sunset",
  },
];

export const startBatchViralSeries = createServerFn({ method: "POST" })
  .validator((input: { count?: number; selectedIndices?: number[] } | undefined) => input || {})
  .handler(
    async ({
      data: _data,
    }: {
      data: { count?: number; selectedIndices?: number[] };
    }): Promise<{ success: boolean; count: number; message: string }> => {
      throw new Error(
        "⚠️ НАЛИЧНА Е НОВА ВЕРСИЯ! Моля, презаредете страницата (Refresh/F5), за да видите плана в чата преди генериране.",
      );
    },
  );

export const VIRAL_HADITH_SERIES_PRESETS = [
  {
    collection: "nawawi40",
    number: 1,
    title: "Хадис № 1 на Навауи (Намеренията)",
    summaryBg: "Делата се ценят според намеренията",
    query: "sunrise golden hour cinematic nature",
  },
  {
    collection: "bukhari",
    number: 6424,
    title: "Сахих ал-Бухари #6424 (Изпитанията)",
    summaryBg: "Когото Аллах желае да дари с добро, Той го подлага на изпитания за пречистване.",
    query: "storm sunlight dramatic cinematic nature",
  },
  {
    collection: "nawawi40",
    number: 5,
    title: "Хадис № 5 на Навауи (Чистота на вярата)",
    summaryBg: "Искреността в религията и отхвърлянето на нововъведенията.",
    query: "pure water crystal clear cinematic",
  },
  {
    collection: "muslim",
    number: 2564,
    title: "Сахих Муслим #2564 (Добротата)",
    summaryBg: "Силата на благородните обръщения и милостта.",
    query: "peaceful garden flowers cinematic",
  },
  {
    collection: "tirmidhi",
    number: 1987,
    title: "Сунан Ат-Тирмизи #1987 (Търпението)",
    summaryBg: "Вътрешният мир и сабр в трудни моменти.",
    query: "mountains calm fog cinematic",
  },
  {
    collection: "nawawi40",
    number: 13,
    title: "Хадис № 13 на Навауи (Братска обич)",
    summaryBg:
      "Никога не си истински вярващ, докато не пожелаеш за брата си това, което желаеш за себе си.",
    query: "two birds flying together cinematic nature",
  },
  {
    collection: "nawawi40",
    number: 9,
    title: "Хадис № 9 на Навауи (Задълженията)",
    summaryBg: "Изпълнявайте заповедите според възможностите си.",
    query: "walking path nature forest cinematic",
  },
  {
    collection: "bukhari",
    number: 6065,
    title: "Сахих ал-Бухари #6065 (Мълчанието)",
    summaryBg: "Който вярва в Аллах и в Сетния ден, нека говори добро или да мълчи.",
    query: "calm lake reflection cinematic nature",
  },
  {
    collection: "muslim",
    number: 2699,
    title: "Сахих Муслим #2699 (Пътят към знанието)",
    summaryBg: "Който поеме по път да търси знание, Аллах ще му улесни пътя към Рая.",
    query: "stars night sky universe galaxy cinematic",
  },
  {
    collection: "nawawi40",
    number: 27,
    title: "Хадис № 27 на Навауи (Праведността)",
    summaryBg: "Праведността е добрият нрав, а грехът е това, което тревожи сърцето.",
    query: "peaceful ocean waves calm nature",
  },
];

export const startBatchViralHadithSeries = createServerFn({ method: "POST" })
  .validator((input: { count?: number; selectedIndices?: number[] } | undefined) => input || {})
  .handler(
    async ({
      data: _data,
    }: {
      data: { count?: number; selectedIndices?: number[] };
    }): Promise<{ success: boolean; count: number; message: string }> => {
      throw new Error(
        "⚠️ НАЛИЧНА Е НОВА ВЕРСИЯ! Моля, презаредете страницата (Refresh/F5), за да видите плана в чата преди генериране.",
      );
    },
  );

async function getHistoryFilePath() {
  const path = await import("path");
  const dir = await getJobsDir();
  return path.join(dir, "assistant_chat_history.json");
}

export const getAssistantHistory = createServerFn({ method: "POST" }).handler(async () => {
  const fs = (await import("fs")).promises;
  const file = await getHistoryFilePath();
  try {
    const txt = await fs.readFile(file, "utf-8");
    return JSON.parse(txt);
  } catch {
    return [];
  }
});

export const saveAssistantHistory = createServerFn({ method: "POST" })
  .validator((input: { messages: unknown[] }) => input)
  .handler(async ({ data: { messages } }) => {
    const fs = (await import("fs")).promises;
    const file = await getHistoryFilePath();
    await fs.writeFile(file, JSON.stringify(messages, null, 2), "utf-8");
    return { success: true };
  });

export const clearAssistantHistory = createServerFn({ method: "POST" }).handler(async () => {
  const fs = (await import("fs")).promises;
  const file = await getHistoryFilePath();
  await fs.unlink(file).catch(() => {});
  return { success: true };
});

let isBackgroundWorkerRunning = false;

export async function triggerBackgroundTaskWorker() {
  if (isBackgroundWorkerRunning) return;
  isBackgroundWorkerRunning = true;
  setTimeout(async () => {
    try {
      const tasks = await listTasks();
      const nextTask = tasks.find((t) => t.status === "queued");
      if (!nextTask) {
        isBackgroundWorkerRunning = false;
        return;
      }

      await updateTask(nextTask.id, {
        status: "processing",
        progress: 10,
        message: "Обработка на задачата...",
      });
      const fs = (await import("fs")).promises;
      const file = await getHistoryFilePath();

      if (nextTask.type === "plan_generation") {
        try {
          await updateTask(nextTask.id, { progress: 30, message: "AI генерира вайръл идеи..." });
          const res = await suggestBatchViralProposals({
            data: { count: nextTask.payload.count, topic: nextTask.payload.topic },
          });

          await updateTask(nextTask.id, {
            progress: 80,
            message: "Записване в историята на чата...",
          });
          let curHist: Array<{
            role: string;
            text: string;
            planId?: string;
            isPlanning?: boolean;
            proposals?: VideoProposal[];
            selectedProposalIndices?: number[];
            jobId?: string;
          }> = [];
          try {
            curHist = JSON.parse(await fs.readFile(file, "utf-8"));
          } catch {
            // Ignore parse failure
          }

          const idx = curHist.findIndex((m) => m.planId === nextTask.id || m.isPlanning);
          if (idx !== -1) {
            curHist[idx] = {
              role: "assistant",
              text: res.reply,
              proposals: res.proposals,
              selectedProposalIndices: res.proposals.map((_, i: number) => i),
              jobId: nextTask.id,
            };
          } else {
            curHist.push({
              role: "assistant",
              text: res.reply,
              proposals: res.proposals,
              selectedProposalIndices: res.proposals.map((_, i: number) => i),
              jobId: nextTask.id,
            });
          }
          await fs.writeFile(file, JSON.stringify(curHist, null, 2), "utf-8");
          await updateTask(nextTask.id, {
            status: "completed",
            progress: 100,
            message: "Планът е готов за одобрение!",
            result: res,
          });
        } catch (err: unknown) {
          console.error(`[task-engine] Plan generation error:`, err);
          let curHist: Array<{
            role: string;
            text: string;
            planId?: string;
            isPlanning?: boolean;
          }> = [];
          try {
            curHist = JSON.parse(await fs.readFile(file, "utf-8"));
          } catch {
            // Ignore parse failure
          }
          const idx = curHist.findIndex((m) => m.planId === nextTask.id || m.isPlanning);
          if (idx !== -1) {
            curHist[idx] = {
              role: "assistant",
              text: `❌ Грешка при изготвяне на плана: ${err instanceof Error ? err.message : "Неуспешна връзка с AI"}. Моля, опитайте отново.`,
            };
            await fs.writeFile(file, JSON.stringify(curHist, null, 2), "utf-8");
          }
          await updateTask(nextTask.id, {
            status: "failed",
            progress: 100,
            error: err instanceof Error ? err.message : "Грешка при генериране",
          });
        }
      } else if (nextTask.type === "batch_generation") {
        try {
          const proposals = nextTask.payload.proposals || [];
          for (let i = 0; i < proposals.length; i++) {
            const prop = proposals[i];
            const pct = Math.round(10 + ((i + 1) / proposals.length) * 85);
            await updateTask(nextTask.id, {
              progress: pct,
              message: `Обработка на видео ${i + 1} от ${proposals.length}: ${prop.title}`,
            });
            await confirmAndGenerateVideo({ data: { proposal: prop } });
          }
          await updateTask(nextTask.id, {
            status: "completed",
            progress: 100,
            message: `Успешно стартирани всички ${proposals.length} видеа в облачната опашка!`,
          });
        } catch (err: unknown) {
          console.error(`[task-engine] Batch generation error:`, err);
          await updateTask(nextTask.id, {
            status: "failed",
            progress: 100,
            error: err instanceof Error ? err.message : "Грешка в пакетното рендиране",
          });
        }
      }
    } catch (err) {
      console.error("[task-engine] Worker loop error:", err);
    } finally {
      isBackgroundWorkerRunning = false;
      setTimeout(() => {
        triggerBackgroundTaskWorker();
      }, 500);
    }
  }, 10);
}

export const clearAllBackgroundTasks = createServerFn({ method: "POST" }).handler(async () => {
  await clearAllTasks();
  return { success: true };
});

export const checkActiveBackgroundTasks = createServerFn({ method: "POST" }).handler(async () => {
  const tasks = await listTasks();
  const activeTasks = tasks.filter((t) => t.status === "queued" || t.status === "processing");
  if (activeTasks.length > 0) {
    triggerBackgroundTaskWorker();
  }
  const fs = (await import("fs")).promises;
  const file = await getHistoryFilePath();
  let history = [];
  try {
    history = JSON.parse(await fs.readFile(file, "utf-8"));
  } catch {
    // Ignore read failure
  }
  return {
    activeTasks,
    hasActive: activeTasks.length > 0,
    history,
  };
});

export const startBackgroundPlanGeneration = createServerFn({ method: "POST" })
  .validator(
    (input: {
      count?: number;
      topic?: string;
      userMsgText?: string;
      targetType?: "carousel" | "video" | "mixed";
    }) => input,
  )
  .handler(async ({ data }) => {
    const fs = (await import("fs")).promises;
    const file = await getHistoryFilePath();
    let history: Array<{ role: string; text?: string; planId?: string; isPlanning?: boolean }> = [];
    try {
      history = JSON.parse(await fs.readFile(file, "utf-8"));
    } catch {
      // Ignore read failure
    }

    const task = await createTask(
      "plan_generation",
      `План с ${data.count || 5} идеи`,
      "Изготвяне на вайръл план...",
      {
        count: data.count,
        topic: data.topic,
        userMsgText: data.userMsgText,
        targetType: data.targetType,
      },
    );

    const userMsg = { role: "user", text: data.userMsgText };
    const planningMsg = {
      role: "assistant",
      text: `⏳ **AI изготвя плана с ${data.count || 5} вайръл идеи във фонов режим...**\n\nМожеш веднага да затвориш браузъра! Когато се върнеш тук, готовият план за одобрение ще те чака на екрана.`,
      isPlanning: true,
      planId: task.id,
    };

    history.push(userMsg, planningMsg);
    await fs.writeFile(file, JSON.stringify(history, null, 2), "utf-8");
    triggerBackgroundTaskWorker();

    return { success: true, planId: task.id };
  });

export const startBackgroundBatchGeneration = createServerFn({ method: "POST" })
  .validator((input: { proposals: VideoProposal[] }) => input)
  .handler(async ({ data: { proposals } }) => {
    const fs = (await import("fs")).promises;
    const file = await getHistoryFilePath();
    let history: Array<{ role: string; text?: string }> = [];
    try {
      history = JSON.parse(await fs.readFile(file, "utf-8"));
    } catch {
      // Ignore read failure
    }

    const task = await createTask(
      "batch_generation",
      `Пакет от ${proposals.length} видеа`,
      "Изпращане към облачната опашка за рендиране...",
      { proposals },
    );

    const batchMsg = {
      role: "assistant",
      text: `🎬 **Одобрено! Стартирах фоновото генериране на ${proposals.length} видеа от твоя план!**\n\nВсички те са записани в устойчивия фонов енджин и се предават към облачната опашка за последователно рендиране. Можеш веднага да затвориш браузъра (дори на iPhone) — видеата се генерират автономно! Следи напредъка и ги свали в раздел **[Изтегляния](/downloads)**.`,
    };
    history.push(batchMsg);
    await fs.writeFile(file, JSON.stringify(history, null, 2), "utf-8");
    triggerBackgroundTaskWorker();

    return { success: true, count: proposals.length, taskId: task.id };
  });

if (typeof process !== "undefined" && typeof window === "undefined") {
  const globalForCron = globalThis as unknown as { __cronStarted: boolean };
  if (!globalForCron.__cronStarted) {
    globalForCron.__cronStarted = true;
    import("node-cron")
      .then((cron) => {
        cron.default.schedule("0 9 * * *", async () => {
          try {
            console.log("Running daily automatic viral TikTok trend analysis...");
            const { geminiChat } = await import("./gemini");
            const prompt =
              "Ти си AI TikTok продуцент. Направи бързо търсене в интернет и ми кажи: какви ислямски теми за таухид, мотивация или трудности задържат най-много вниманието на зрителите в TikTok в момента? Анализирай какво се търси и какво се гледа най-много. Избери САМО една тема, която е най-вирална. Върни само името на темата в 3 до 5 думи, без обяснения.";
            const res = await geminiChat(
              "gemini-3.6-flash",
              [{ role: "user", content: prompt }],
              false,
              true,
            );
            const chosenTopic = res ? res.trim() : "Таухид и успех в живота";

            console.log("Daily auto-topic chosen:", chosenTopic);
            await startBackgroundPlanGeneration({
              data: { count: 3, topic: chosenTopic, targetType: "carousel" },
            });
          } catch (e) {
            console.error("Daily cron error:", e);
          }
        });
      })
      .catch((e) => console.error("Failed to load node-cron", e));
  }
}
