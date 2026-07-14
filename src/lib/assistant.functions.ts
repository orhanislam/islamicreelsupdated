import { createServerFn } from "@tanstack/react-start";
import { geminiChat } from "@/lib/gemini";
import { fetchSunnahHadith } from "@/lib/sunnah.functions";
import { fetchAyah } from "@/lib/quran.functions";
import { translateToBulgarian } from "@/lib/translate.functions";
import { searchPexelsVideos } from "@/lib/pexels.functions";
import { synthesizeHadithNarration } from "@/lib/tts.functions";
import { startServerRenderJob } from "@/lib/render.functions";
import { getAiMemory, updateAiMemory } from "@/lib/memory.functions";

export type VideoProposal = {
  title: string;
  type: "hadith" | "quran";
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

    const systemPrompt = `Ти си умен и учтив Ислямски AI Видео Асистент на Български език с дълготрайна памет.
${memoryContext}

ВАЖНО ПРАВИЛО: Ти ВИНАГИ ПИТАШ потребителя за одобрение преди да се генерира видеото!
Когато потребителят поиска видео, ти НЕ генерираш видеото веднага, а му предлагаш детайлен план (proposal), за да го одобри.
Ако потребителят ти каже да промениш стила на текста (напр. "златно караоке", "зелен изумруд", "неонови субтитри", "класически бял") или го има в паметта му, задължително избери съответния "tiktokTheme" ("hormozi", "emerald", "neon" или "classic").

КРИТИЧНО ПРАВИЛО ЗА ВАЙРЪЛ ТЕМИ (DO NOT RECOMMEND COMMON TEXTS):
НИКОГА не препоръчвай банални, често срещани или общоизвестни клиширани текстове (като най-стандартните напомняния или най-често повтаряните кратки цитати).
ВИНАГИ избирай ДЪЛБОКИ, ВЪЗДЕЙСТВАЩИ, ПО-РЯДКО ЦИТИРАНИ, но психологически поразителни уроци от Корана или Сахих Хадиси, които ще накарат зрителя да натръпне, да се замисли и да сподели видеото веднага (Viral Hook & High Retention)!

CAPCUT-ПОДОБНИ ИНСТРУКЦИИ ЗА РЕДАКТИРАНЕ:
Ти разбираш и прилагаш всякакви инструкции за редактиране на видеото, подобно на CapCut/Premiere/DaVinci. Примери:
- "добави B-Roll на всеки 3 секунди" → useBRoll: true, bRollInterval: 3
- "сменящи се кадри" → useBRoll: true
- "субтитрите отдолу" → subtitlePosition: "bottom"
- "субтитрите в средата" → subtitlePosition: "middle"
- "720p качество" → quality: "720p"
- "зелен стил" → tiktokTheme: "emerald"
- "класически бели букви" → tiktokTheme: "classic"
Ако потребителят даде инструкции за редактиране, добави ги в proposal обекта.

Трябва да върнеш JSON обект със следната структура:
1. Ако потребителят иска видео или тема за видео:
{
  "reply": "Твоят учтив отговор на български език, в който представяш предложението и питаш дали му харесва.",
  "newLearnedFact": "Ако в това съобщение потребителят ти е казал нещо важно за себе си или ново предпочитание за стил/фон, запиши го тук (иначе остави null)",
  "proposal": {
    "title": "Точно заглавие на български",
    "type": "hadith" или "quran",
    "collection": "nawawi40" | "bukhari" | "muslim" | "tirmidhi",
    "number": номер на хадис,
    "surah": номер на сура (1-114),
    "ayah": начален аят,
    "count": брой аяти (1-7),
    "summaryBg": "Кратко описание или български превод на избрания текст",
    "themeBg": "Визуална атмосфера на български",
    "searchQuery": "ключови думи за фон на английски",
    "tiktokTheme": "hormozi" | "emerald" | "neon" | "classic" (по подразбиране "hormozi"),
    "useBRoll": true/false (ако потребителят иска сменящи се B-Roll кадри),
    "bRollInterval": число в секунди (на колко секунди да се сменя B-Roll кадъра, напр. 3),
    "subtitlePosition": "bottom" | "middle" | "lower-third" (позиция на субтитрите),
    "quality": "high" | "720p" (качество на видеото)
  }
}

2. Ако потребителят задава въпрос, поздравява или обсъжда без конкретно искане за видео:
{
  "reply": "Отговор на български език",
  "newLearnedFact": "Ако има нов факт или предпочитание за запомняне",
  "proposal": null
}

ВАЖНО: Върни САМО валиден JSON без маркдаун кавички.`;

    const msgs = [
      { role: "system", content: systemPrompt },
      ...data.history.map((m) => ({ role: m.role, content: m.content })),
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

    if (proposal.type === "hadith") {
      const coll = proposal.collection || "nawawi40";
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
    } else {
      const surah = Number(proposal.surah) || 1;
      const ayah = Number(proposal.ayah) || 1;
      const count = Math.min(7, Math.max(1, Number(proposal.count) || 1));
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
      reference,
    };
  });

export const startBatchViralSeries = createServerFn({ method: "POST" })
  .handler(async (): Promise<{ success: boolean; count: number; message: string }> => {
    // Generate a curated 3-part viral series
    const series = [
      { surah: 1, ayah: 1, ayahEnd: 2, ref: "Сура Ал-Фатиха (1:1-2)" },
      { surah: 112, ayah: 1, ayahEnd: 4, ref: "Сура Ал-Ихлас (112:1-4)" },
      { surah: 103, ayah: 1, ayahEnd: 3, ref: "Сура Ал-Аср (103:1-3)" },
    ];

    for (const item of series) {
      await approveAndRenderAssistantIdea({
        data: {
          surah: item.surah,
          ayah: item.ayah,
          ayahEnd: item.ayahEnd,
          reference: `${item.ref} • Пакетно Вайръл Видео`,
        },
      });
    }

    return {
      success: true,
      count: series.length,
      message: `📦 Успешно стартирано пакетно генериране на ${series.length} професионални вайръл видеа! Можеш да следиш напредъка им в раздел Изтегляния.`,
    };
  });

