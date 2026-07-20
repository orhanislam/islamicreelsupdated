import { createServerFn } from "@tanstack/react-start";
import { geminiChat, type ChatMessage } from "@/lib/gemini";
import { fetchSunnahHadith } from "@/lib/sunnah.functions";
import { fetchAyah } from "@/lib/quran.functions";
import { translateToBulgarian } from "@/lib/translate.functions";
import { searchPexelsVideos } from "@/lib/pexels.functions";
import { synthesizeHadithNarration } from "@/lib/tts.functions";
import { startServerRenderJob, getJobsDir } from "@/lib/render.functions";
import { getAiMemory, updateAiMemory } from "@/lib/memory.functions";
import { createTask, updateTask, listTasks } from "@/lib/tasks-engine";

export type VideoProposal = {
  title: string;
  type: "hadith" | "quran" | "tiktok" | "general";
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
  bRollInterval?: number;        // seconds between B-Roll scene switches (e.g. 3)
  useBRoll?: boolean;            // enable multi-scene B-Roll
  subtitlePosition?: "bottom" | "middle" | "lower-third";
  quality?: "high" | "720p";
};

export const chatWithAssistant = createServerFn({ method: "POST" })
  .validator((input: { prompt: string; history: { role: string; content: string }[] }) => input)
  .handler(async ({ data }) => {
    const memory = await getAiMemory();

    const memoryContext = `
=== ПАМЕТ НА АСИСТЕНТА ЗА ПОТРЕБИТЕЛЯ ===
Инструкции от потребителя:
${memory.customInstructions.map((i, idx) => `${idx + 1}. ${i}`).join("\n")}

Запомнени факти за потребителя:
${memory.learnedFacts.length ? memory.learnedFacts.join("\n") : "Няма записани факти още."}
=======================================
Трябва стриктно да спазваш горните инструкции при всяко предложение за видео и всеки отговор!`;

    const systemPrompt = `Ти си ПРОФЕСИОНАЛЕН ПРОДУЦЕНТ И РЕЖИСЬОР на вирусни Ислямски видеа (Reels & TikTok) на Български език с дълготрайна памет.
${memoryContext}

ВАЖНО ПРАВИЛО: Ти ВИНАГИ ПИТАШ потребителя за одобрение преди да се генерира видеото!
Когато потребителят поиска видео, ти НЕ генерираш видеото веднага, а му предлагаш детайлен план (proposal), за да го одобри.
Ако потребителят ти каже да промениш стила на текста (напр. "златно караоке", "зелен изумруд", "неонови субтитри", "класически бял") или го има в паметта му, задължително избери съответния "tiktokTheme" ("hormozi", "emerald", "neon" или "classic").

ПРОФЕСИОНАЛНИ ПРАВИЛА ЗА ВАЙРЪЛ РЕЖИСУРА (PRO WORKFLOW):
1. НИКОГА не препоръчвай банални, често срещани или клиширани цитати. ВИНАГИ избирай ДЪЛБОКИ, ВЪЗДЕЙСТВАЩИ, ПО-РЯДКО ЦИТИРАНИ, но психологически поразителни уроци от Корана или Сахих Хадиси, които предизвикват силен емоционален резонанс и споделяне!
2. Всяко предложение за видео трябва задължително да има СИЛНА КУКА (Viral Hook) в първите 3 секунди (напр. "Знакът, че Аллах е чул молитвата ти...", "Защо чувстваш празнина дори когато имаш всичко...", "Аятът, който променя начина, по който гледаш на болката...").
3. Задължително прилагай кинематографичен динамичен монтаж: ВИНАГИ задавай "useBRoll": true, "bRollInterval": 3 и "quality": "high", освен ако потребителят изрично не поиска статичен фон.

CAPCUT-ПОДОБНИ ИНСТРУКЦИИ ЗА РЕДАКТИРАНЕ:
Ти разбираш и прилагаш всякакви инструкции за редактиране на видеото, подобно на CapCut/Premiere/DaVinci:
- "добави B-Roll на всеки 3 секунди" → useBRoll: true, bRollInterval: 3
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
    "title": "Точно заглавие на български (напр. [Коран] Аят ал-Курси или [TikTok] 3 неща, които отнемат спокойствието)",
    "type": "hadith" | "quran" | "tiktok" | "general",
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
    "bRollInterval": 3,
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

ВАЖНО: Върни САМО валиден JSON без маркдаун кавички.`;

    const msgs: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...data.history.map((m) => ({ role: m.role as "system" | "user" | "assistant", content: m.content })),
      { role: "user", content: data.prompt },
    ];

    const raw = await geminiChat("gemini-2.5-flash", msgs, true);
    let parsed: any;
    try {
      let clean = raw.replace(/```json\s*|\s*```/g, "").trim();
      const firstBrace = clean.indexOf("{");
      const lastBrace = clean.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        clean = clean.substring(firstBrace, lastBrace + 1);
      }
      parsed = JSON.parse(clean);
    } catch {
      let cleanText = raw.replace(/```json[\s\S]*?```/g, "").replace(/[{}"_]/g, " ").trim();
      if (!cleanText || cleanText.length < 5) cleanText = raw;
      parsed = { reply: cleanText, proposal: null };
    }

    if (parsed.newLearnedFact && typeof parsed.newLearnedFact === "string" && parsed.newLearnedFact.trim().length > 2) {
      if (!memory.learnedFacts.includes(parsed.newLearnedFact.trim())) {
        memory.learnedFacts.push(parsed.newLearnedFact.trim());
        await updateAiMemory({ data: { memory } }).catch(() => {});
      }
    }

    return {
      reply: parsed.reply || "С какво мога да ти помогна днес?",
      proposal: (parsed.proposal as VideoProposal) || null,
      proposals: Array.isArray(parsed.proposals) && parsed.proposals.length > 0 ? (parsed.proposals as VideoProposal[]) : null,
      memory,
    };
  });

export const suggestViralProposal = createServerFn({ method: "POST" })
  .handler(async () => {
    const prompt = `Ти си топ продуцент на вирусни Ислямски видеа (Reels & TikTok) на български език.
Измисли и предложи ЕДНА изключително силна, НЕБАНАЛНА и психологически поразяваща тема/урок от Корана или Сахих Хадис за видео.

СТРИКТНО ПРАВИЛО: DO NOT RECOMMEND COMMON TEXTS. Не предлагай общи, банални или често срещани текстове. Избери текст с дълбоко житейско послание за изпитанията, душата, надеждата, мълчанието или скритата мъдрост.

Върни JSON със следната структура:
{
  "reply": "Вълнуващо представяне на български защо тази тема ще стане вайръл и каква е мъдростта ѝ.",
  "proposal": {
    "title": "Краткия заглавен рефрен на български",
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

    const msgs = [
      { role: "system", content: prompt },
      { role: "user", content: "Предложи 1 вирусна Ислямска тема сега според системните инструкции и върни валиден JSON." }
    ] as any;
    const raw = await geminiChat("gemini-2.5-flash", msgs, true);
    let parsed: any;
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
        reply: "Предлагам ти дълбок, рядко цитиран урок от Сахих ал-Бухари за вътрешната сила при изпитания.",
        proposal: {
          title: "Сахих ал-Бухари #6424 — Скритата милост в изпитанията",
          type: "hadith",
          collection: "bukhari",
          number: 6424,
          summaryBg: "Когото Аллах желае да дари с добро, Той го подлага на изпитания за пречистване.",
          themeBg: "Буря, която утихва в златна светлина",
          searchQuery: "storm sunlight dramatic sky nature cinematic",
          tiktokTheme: "hormozi"
        }
      };
    }
    return {
      reply: parsed.reply,
      proposal: parsed.proposal as VideoProposal,
    };
  });

export const suggestBatchViralProposals = createServerFn({ method: "POST" })
  .validator((input: { count?: number; topic?: string } | undefined) => input || {})
  .handler(async ({ data }: { data: { count?: number; topic?: string } }) => {
    const countNum = data.count || 5;
    const topicStr = data.topic || "смесено (Коран, Сахих Хадиси, TikTok Трендове, психологически уроци и истории)";

    const prompt = `Ти си ПРОФЕСИОНАЛЕН ПРОДУЦЕНТ И РЕЖИСЬОР на вирусни Ислямски видеа (Reels & TikTok) на български език.
Измисли и предложи ПАКЕТ ОТ ТОЧНО ${countNum} изключително силни, НЕБАНАЛНИ и психологически поразяващи теми/уроки за къси видеа в категория: "${topicStr}".

ПРОФЕСИОНАЛНИ СТРИКТНИ ПРАВИЛА (PRO WORKFLOW):
1. Включи разнообразие: задължително предложи теми от Корана, теми от Сахих Хадиси (Бухари/Муслим), както и модерни TikTok Hormozi вирусни куки (напр. "3 неща, които убиват спокойствието ти според Исляма", "Защо Аллах забавя отговора на дуата ти", "Скритият знак, че си на прав път").
2. Не предлагай общи или клиширани текстове. Всяко предложение трябва да започва със зашеметяваща кука (viral hook) и да носи дълбок житейски заряд.
3. Задължително включвай кинематографични настройки за всяко видео: "useBRoll": true, "bRollInterval": 3 и "quality": "high".

Върни JSON със следната структура, като при всяко предложение ЗАДЪЛЖИТЕЛНО попълваш точните числови параметри за съответния type:
{
  "reply": "Увлекателно представяне на български език на този специален пакет от ${countNum} вайръл идеи. Обясни накратко защо са избрани и покани потребителя да отбележи кои желае да одобри за генериране.",
  "proposals": [
    {
      "title": "[Коран] Аят ал-Курси • Тронът на Аллах (2:255)",
      "type": "quran",
      "surah": 2,
      "ayah": 255,
      "count": 1,
      "summaryBg": "Аят ал-Курси е най-великият аят в Корана, даващ абсолютна защита и спокойствие на сърцето.",
      "themeBg": "Космос, звезди и величествена златна светлина",
      "searchQuery": "stars universe galaxy cinematic",
      "tiktokTheme": "hormozi",
      "useBRoll": true,
      "bRollInterval": 3,
      "quality": "high"
    },
    {
      "title": "[Сахих Хадис] Защо Аллах изпраща изпитания",
      "type": "hadith",
      "collection": "bukhari",
      "number": 5645,
      "summaryBg": "Когото Аллах желае да дари с добро, Той го подлага на изпитания за пречистване на душата.",
      "themeBg": "Буря, която утихва в слънчева зора",
      "searchQuery": "storm sunlight dramatic cinematic nature",
      "tiktokTheme": "hormozi",
      "useBRoll": true,
      "bRollInterval": 3,
      "quality": "high"
    },
    {
      "title": "[TikTok Психология] 3 неща, които отнемат спокойствието ти според Исляма",
      "type": "tiktok",
      "summaryBg": "Първо: Завистта към чуждия успех, която изгаря добрите дела. Второ: Забравянето на благодарността за това, което вече имаш. Трето: Гняв за неща, които не можеш да контролираш.",
      "themeBg": "Успокояваща природа, мъгла и изгряващо слънце",
      "searchQuery": "peaceful nature sunrise fog cinematic",
      "tiktokTheme": "hormozi",
      "useBRoll": true,
      "bRollInterval": 3,
      "quality": "high"
    }
  ]
}
ВАЖНО: Ако предложението е от тип "quran", ЗАДЪЛЖИТЕЛНО попълни точни цели числа за "surah" (1-114), "ayah" (>0) и "count" (1-7)! НИКОГА не оставяй "surah" и "ayah" празни! Върни САМО валиден JSON без маркдаун кавички.`;

    const msgs = [
      { role: "system", content: prompt },
      { role: "user", content: `Предложи пакет от ${countNum} вирусни идеи сега според инструкциите и върни валиден JSON с масив proposals от точно ${countNum} елемента.` }
    ] as any;

    const raw = await geminiChat("gemini-2.5-flash", msgs, true);
    let parsed: any;
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
        reply: `Ето специално подбран пакет от ${countNum} топ вирусни идеи от Корана, Хадисите и TikTok трендовете! Избери кои от тях да одобрим и генерираме:`,
        proposals: VIRAL_SERIES_PRESETS.slice(0, countNum).map(p => ({
          title: `[Коран / TikTok] ${p.ref}`,
          type: "quran",
          surah: p.surah,
          ayah: p.ayah,
          count: p.ayahEnd - p.ayah + 1,
          summaryBg: p.summary,
          themeBg: "Кинематографична атмосфера",
          searchQuery: p.query,
          tiktokTheme: "hormozi",
          useBRoll: true,
          bRollInterval: 3,
          quality: "high"
        }))
      };
    }

    return {
      reply: parsed.reply,
      proposals: (parsed.proposals || []).slice(0, countNum) as VideoProposal[],
    };
  });

export const confirmAndGenerateVideo = createServerFn({ method: "POST" })
  .validator((input: { proposal: VideoProposal }) => input)
  .handler(async ({ data: { proposal } }) => {
    let arabic = "";
    let english = "";
    let bulgarian = "";
    let reference = proposal.title;
    let audioUrl: string | null = null;
    let wordSegments: any[] | undefined = undefined;
    let ayahBounds: any[] | undefined = undefined;
    let bulgarianWordTimings: any[] | undefined = undefined;
    let arabicWordCount: number | undefined = undefined;

    if (proposal.type === "hadith" || (!proposal.surah && !proposal.ayah && proposal.collection && proposal.number)) {
      const coll = (proposal.collection || "nawawi40") as "bukhari" | "muslim" | "tirmidhi" | "nawawi40";
      const num = Number(proposal.number) || 1;
      const h = await fetchSunnahHadith({ data: { collection: coll, number: num } });
      arabic = h.arabic;
      english = h.english;
      reference = h.reference;
      const t = await translateToBulgarian({ data: { english: h.english, sourceRef: h.reference } });
      bulgarian = t.bulgarian;

      try {
        const narr = await synthesizeHadithNarration({ data: { text: bulgarian } });
        audioUrl = `data:${narr.mimeType || "audio/mp3"};base64,${narr.base64}`;
        bulgarianWordTimings = narr.wordTimings;
      } catch (e) {
        console.warn("Could not narrate hadith:", e);
      }
    } else if (proposal.type === "tiktok" || proposal.type === "general" || (proposal.type !== "quran" && !proposal.surah && !proposal.ayah && !proposal.number && proposal.summaryBg)) {
      bulgarian = proposal.summaryBg || proposal.title;
      reference = proposal.title;
      arabic = "";
      english = "";

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

      // Robust extraction: if surah/ayah are NaN, missing, or <= 0, parse from title/summary or keyword
      if (isNaN(surah) || surah <= 0 || isNaN(ayah) || ayah <= 0) {
        const textToSearch = `${proposal.title} ${proposal.summaryBg || ""}`;
        const colonMatch = textToSearch.match(/\b(\d{1,3})\s*[:.]\s*(\d{1,3})(?:\s*-\s*(\d{1,3}))?\b/);
        if (colonMatch) {
          surah = parseInt(colonMatch[1], 10);
          ayah = parseInt(colonMatch[2], 10);
          if (colonMatch[3]) {
            const end = parseInt(colonMatch[3], 10);
            if (end >= ayah && end - ayah < 7) {
              count = end - ayah + 1;
            }
          }
        } else {
          const lower = textToSearch.toLowerCase();
          if (lower.includes("ихлас") || lower.includes("ikhlas")) {
            surah = 112; ayah = 1; count = 4;
          } else if (lower.includes("аср") || lower.includes("asr")) {
            surah = 103; ayah = 1; count = 3;
          } else if (lower.includes("курси") || lower.includes("kursi")) {
            surah = 2; ayah = 255; count = 1;
          } else if (lower.includes("шарх") || lower.includes("облекчение")) {
            surah = 94; ayah = 5; count = 2;
          } else if (lower.includes("фаляк") || lower.includes("фалак")) {
            surah = 113; ayah = 1; count = 5;
          } else if (lower.includes("наср") || lower.includes("победа")) {
            surah = 110; ayah = 1; count = 3;
          } else if (lower.includes("каусар") || lower.includes("изобилие")) {
            surah = 108; ayah = 1; count = 3;
          } else if (lower.includes("нас") || lower.includes("убежище")) {
            surah = 114; ayah = 1; count = 6;
          } else {
            surah = isNaN(surah) || surah <= 0 ? 1 : surah;
            ayah = isNaN(ayah) || ayah <= 0 ? 1 : ayah;
          }
        }
      }

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
      bulgarian = t.bulgarian;
    }

    const vidSearch = await searchPexelsVideos({
      data: {
        text: proposal.searchQuery || "islamic calm sunset nature mosque",
        minDuration: 30,
      },
    });

    const bestVid = vidSearch.videos?.[0]?.link || "https://videos.pexels.com/video-files/855029/855029-hd_1080_1920_30fps.mp4";

    // Fetch multi-scene B-Roll if requested
    let bRollUrls: string[] | undefined;
    if (proposal.useBRoll) {
      try {
        const { fetchMultiSceneBRoll } = await import("@/lib/pexels.functions");
        const bRollResult = await fetchMultiSceneBRoll({
          data: { query: proposal.searchQuery || "islamic nature cinematic" },
        });
        if (bRollResult.clips && bRollResult.clips.length > 1) {
          bRollUrls = bRollResult.clips;
        }
      } catch (e) {
        console.warn("[assistant] Could not fetch multi-scene B-Roll:", e);
      }
    }

    const subtitleStyle = proposal.subtitlePosition || "middle";

    const { jobId } = await startServerRenderJob({
      data: {
        title: reference,
        data: {
          backgroundUrl: bestVid,
          backgroundVideoUrl: bestVid,
          arabic,
          bulgarian,
          reference,
          style: subtitleStyle,
          tiktokTheme: proposal.tiktokTheme || "hormozi",
          audioUrl: audioUrl || undefined,
          requireAudio: Boolean(audioUrl),
          fallbackDuration: 10,
          wordSegments,
          ayahBounds,
          arabicWordCount,
          bulgarianWordTimings,
          quality: proposal.quality || "high",
          bRollUrls,
        },
      },
    });

    return {
      reply: `🎬 **Одобрено! Стартирах генерирането на видеото за „${reference}“ на сървъра!**\n\nМожеш да го намериш и свалиш веднага след рендиране от раздел **[Изтегляния](/downloads)**.`,
      jobStarted: true,
      jobId,
      reference,
    };
  });

export const approveAndRenderAssistantIdea = confirmAndGenerateVideo;

export const VIRAL_SERIES_PRESETS = [
  { surah: 1, ayah: 1, ayahEnd: 2, ref: "Сура Ал-Фатиха (1:1-2)", summary: "Откриването и благословията на Корана", query: "islamic calm mosque sunset nature" },
  { surah: 112, ayah: 1, ayahEnd: 4, ref: "Сура Ал-Ихлас (112:1-4)", summary: "Единобожието и чистотата на вярата", query: "mountain light rays dramatic nature" },
  { surah: 103, ayah: 1, ayahEnd: 3, ref: "Сура Ал-Аср (103:1-3)", summary: "Времето и спасението на човека", query: "hourglass time cinematic nature sunset" },
  { surah: 94, ayah: 5, ayahEnd: 6, ref: "Сура Аш-Шарх (94:5-6)", summary: "С всяка трудност идва облекчение", query: "sunlight breaking through clouds hope" },
  { surah: 2, ayah: 255, ayahEnd: 255, ref: "Аят ал-Курси (2:255)", summary: "Тронът на Аллах и великата защита", query: "stars night sky universe galaxy cinematic" },
  { surah: 113, ayah: 1, ayahEnd: 5, ref: "Сура Ал-Фаляк (113:1-5)", summary: "Защита от всяко зло на пукнатината на зората", query: "sunrise golden hour fog cinematic nature" },
  { surah: 114, ayah: 1, ayahEnd: 6, ref: "Сура Ан-Нас (114:1-6)", summary: "Убежище при Господаря на хората", query: "peaceful ocean waves calm nature" },
  { surah: 108, ayah: 1, ayahEnd: 3, ref: "Сура Ал-Каусар (108:1-3)", summary: "Изобилието и реката в Рая", query: "waterfall crystal clear water river nature" },
  { surah: 110, ayah: 1, ayahEnd: 3, ref: "Сура Ан-Наср (110:1-3)", summary: "Победата и прошката на Аллах", query: "triumph golden sunlight birds flying" },
  { surah: 109, ayah: 1, ayahEnd: 6, ref: "Сура Ал-Кафирун (109:1-6)", summary: "За вас е вашата религия, а за мен е моята", query: "desert dunes peaceful horizon sunset" },
];

export const startBatchViralSeries = createServerFn({ method: "POST" })
  .validator((input: { count?: number; selectedIndices?: number[] } | undefined) => input || {})
  .handler(async ({ data }: { data: { count?: number; selectedIndices?: number[] } }): Promise<{ success: boolean; count: number; message: string }> => {
    let chosen = VIRAL_SERIES_PRESETS.slice(0, data.count || 3);
    if (data.selectedIndices && data.selectedIndices.length > 0) {
      chosen = data.selectedIndices
        .map((idx) => VIRAL_SERIES_PRESETS[idx])
        .filter(Boolean);
    }

    for (const item of chosen) {
      try {
        await confirmAndGenerateVideo({
          data: {
            proposal: {
              title: `${item.ref} • Пакетно Вайръл Видео`,
              type: "quran",
              surah: item.surah,
              ayah: item.ayah,
              count: item.ayahEnd - item.ayah + 1,
              summaryBg: item.summary,
              themeBg: "Кинематографична атмосфера",
              searchQuery: item.query,
              tiktokTheme: "hormozi",
              quality: "high",
            },
          },
        });
      } catch (e) {
        console.error(`[batch] Failed to start render for ${item.ref}:`, e);
      }
    }

    return {
      success: true,
      count: chosen.length,
      message: `📦 Успешно стартирано пакетно генериране на ${chosen.length} професионални вайръл видеа! Можеш да следиш напредъка им и да ги свалиш наведнъж в раздел Изтегляния.`,
    };
  });

async function getHistoryFilePath() {
  const path = await import("path");
  const dir = await getJobsDir();
  return path.join(dir, "assistant_chat_history.json");
}

export const getAssistantHistory = createServerFn({ method: "POST" })
  .handler(async () => {
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
  .validator((input: { messages: any[] }) => input)
  .handler(async ({ data: { messages } }) => {
    const fs = (await import("fs")).promises;
    const file = await getHistoryFilePath();
    await fs.writeFile(file, JSON.stringify(messages, null, 2), "utf-8");
    return { success: true };
  });

export const clearAssistantHistory = createServerFn({ method: "POST" })
  .handler(async () => {
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

      await updateTask(nextTask.id, { status: "processing", progress: 10, message: "Обработка на задачата..." });
      const fs = (await import("fs")).promises;
      const file = await getHistoryFilePath();

      if (nextTask.type === "plan_generation") {
        try {
          await updateTask(nextTask.id, { progress: 30, message: "AI генерира вайръл идеи..." });
          const res = await suggestBatchViralProposals({
            data: { count: nextTask.payload.count, topic: nextTask.payload.topic },
          });

          await updateTask(nextTask.id, { progress: 80, message: "Записване в историята на чата..." });
          let curHist: any[] = [];
          try {
            curHist = JSON.parse(await fs.readFile(file, "utf-8"));
          } catch {}

          const idx = curHist.findIndex((m: any) => m.planId === nextTask.id || m.isPlanning);
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
          await updateTask(nextTask.id, { status: "completed", progress: 100, message: "Планът е готов за одобрение!", result: res });
        } catch (err: any) {
          console.error(`[task-engine] Plan generation error:`, err);
          let curHist: any[] = [];
          try {
            curHist = JSON.parse(await fs.readFile(file, "utf-8"));
          } catch {}
          const idx = curHist.findIndex((m: any) => m.planId === nextTask.id || m.isPlanning);
          if (idx !== -1) {
            curHist[idx] = {
              role: "assistant",
              text: `❌ Грешка при изготвяне на плана: ${err?.message || "Неуспешна връзка с AI"}. Моля, опитайте отново.`,
            };
            await fs.writeFile(file, JSON.stringify(curHist, null, 2), "utf-8");
          }
          await updateTask(nextTask.id, { status: "failed", progress: 100, error: err?.message || "Грешка при генериране" });
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
        } catch (err: any) {
          console.error(`[task-engine] Batch generation error:`, err);
          await updateTask(nextTask.id, { status: "failed", progress: 100, error: err?.message || "Грешка в пакетното рендиране" });
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

export const checkActiveBackgroundTasks = createServerFn({ method: "POST" })
  .handler(async () => {
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
    } catch {}
    return {
      activeTasks,
      hasActive: activeTasks.length > 0,
      history,
    };
  });

export const startBackgroundPlanGeneration = createServerFn({ method: "POST" })
  .validator((input: { count?: number; topic?: string; userMsgText: string }) => input)
  .handler(async ({ data }) => {
    const fs = (await import("fs")).promises;
    const file = await getHistoryFilePath();
    let history: any[] = [];
    try {
      history = JSON.parse(await fs.readFile(file, "utf-8"));
    } catch {}

    const task = await createTask(
      "plan_generation",
      `План с ${data.count || 5} идеи`,
      "Изготвяне на вайръл план...",
      { count: data.count, topic: data.topic, userMsgText: data.userMsgText }
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
    let history: any[] = [];
    try {
      history = JSON.parse(await fs.readFile(file, "utf-8"));
    } catch {}

    const task = await createTask(
      "batch_generation",
      `Пакет от ${proposals.length} видеа`,
      "Изпращане към облачната опашка за рендиране...",
      { proposals }
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


