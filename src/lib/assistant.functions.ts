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
    "tiktokTheme": "hormozi" | "emerald" | "neon" | "classic" (по подразбиране "hormozi")
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

    const { jobId } = await startServerRenderJob({
      data: {
        title: reference,
        data: {
          backgroundUrl: bestVid,
          backgroundVideoUrl: bestVid,
          arabic,
          bulgarian,
          reference,
          style: "middle",
          tiktokTheme: proposal.tiktokTheme || "hormozi",
          audioUrl: audioUrl || undefined,
          requireAudio: Boolean(audioUrl),
          fallbackDuration: 10,
          wordSegments,
          ayahBounds,
          arabicWordCount,
          bulgarianWordTimings,
          quality: "high",
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
