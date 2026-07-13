import { createServerFn } from "@tanstack/react-start";
import { geminiChat } from "@/lib/gemini";
import { fetchSunnahHadith } from "@/lib/sunnah.functions";
import { fetchAyah } from "@/lib/quran.functions";
import { translateToBulgarian } from "@/lib/translate.functions";
import { searchPexelsVideos } from "@/lib/pexels.functions";
import { synthesizeHadithNarration } from "@/lib/tts.functions";
import { startServerRenderJob } from "@/lib/render.functions";

export type AssistantMessage = {
  role: "user" | "assistant";
  text: string;
  jobId?: string;
};

export const chatAndGenerateVideo = createServerFn({ method: "POST" })
  .validator((input: { prompt: string; history: { role: string; content: string }[] }) => input)
  .handler(async ({ data }) => {
    const systemPrompt = `Ти си интелигентен Ислямски AI Видео Асистент на Български език.
Потребителят разговаря с теб и може да поиска да му създадеш видео за конкретна Сура/Аят или Хадис, или да му предложиш тема.
Твоята задача:
1. Ако потребителят иска видео (напр. "направи ми видео за хадис 3 от навауи", "видео за сура 1 аят 1 до 3", "направи видео за търпението"), ти трябва да върнеш JSON обект със следната структура:
{
  "reply": "Твоят отговор към потребителя на български език",
  "action": {
    "type": "hadith" или "quran",
    "collection": "nawawi40" | "bukhari" | "muslim" | "tirmidhi" (само при hadith),
    "number": номер на хадис (само при hadith),
    "surah": номер на сура (1-114, само при quran),
    "ayah": начален аят (само при quran),
    "count": брой аяти (1-7, само при quran),
    "searchQuery": "ключови думи за фон на английски (напр. calm nature sunset mecca mosque)"
  }
}
2. Ако потребителят само пита въпрос или задава уточнение, върни:
{
  "reply": "Отговор на български език",
  "action": null
}

ВАЖНО: Върни ВИНАГИ валиден JSON без маркдаун кавички, само чист JSON обект.`;

    const msgs = [
      { role: "system", content: systemPrompt },
      ...data.history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: data.prompt },
    ];

    const raw = await geminiChat("gemini-2.5-flash", msgs, true);
    let parsed: any;
    try {
      const clean = raw.replace(/```json\s*|\s*```/g, "").trim();
      parsed = JSON.parse(clean);
    } catch {
      parsed = { reply: raw, action: null };
    }

    if (!parsed.action) {
      return { reply: parsed.reply || "Какво видео би желал да създадем?", jobStarted: false };
    }

    // Trigger complete video generation and place in /downloads
    try {
      let arabic = "";
      let english = "";
      let bulgarian = "";
      let reference = "";
      let audioUrl: string | null = null;
      let wordSegments: any[] | undefined = undefined;
      let ayahBounds: any[] | undefined = undefined;
      let bulgarianWordTimings: any[] | undefined = undefined;

      const act = parsed.action;
      if (act.type === "hadith") {
        const coll = act.collection || "nawawi40";
        const num = Number(act.number) || 1;
        const h = await fetchSunnahHadith({ data: { collection: coll, number: num } });
        arabic = h.arabic;
        english = h.english;
        reference = h.reference;
        const t = await translateToBulgarian({ data: { english: h.english, sourceRef: h.reference } });
        bulgarian = t.bulgarian;

        // Generate Bulgarian narration voice
        try {
          const narr = await synthesizeHadithNarration({ data: { text: bulgarian } });
          audioUrl = narr.audioUrl;
          bulgarianWordTimings = narr.wordTimings;
        } catch (e) {
          console.warn("Could not narrate hadith:", e);
        }
      } else {
        // Quran
        const surah = Number(act.surah) || 1;
        const ayah = Number(act.ayah) || 1;
        const count = Math.min(7, Math.max(1, Number(act.count) || 1));
        const q = await fetchAyah({ data: { surah, ayah, count } });
        arabic = q.arabic;
        english = q.english;
        reference = `Сура ${q.surahName} (${surah}:${ayah}${count > 1 ? `-${ayah + count - 1}` : ""})`;
        audioUrl = q.audioUrl;
        wordSegments = q.wordSegments;
        ayahBounds = q.ayahBounds;

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

      // Pick background video from Pexels
      const vidSearch = await searchPexelsVideos({
        data: {
          text: act.searchQuery || "islamic calm sunset nature mosque",
          minDuration: 30,
        },
      });

      const bestVid = vidSearch.videos?.[0]?.link || "https://videos.pexels.com/video-files/855029/855029-hd_1080_1920_30fps.mp4";

      // Start background server render job
      const jobId = await startServerRenderJob({
        data: {
          title: reference,
          data: {
            backgroundUrl: bestVid,
            backgroundVideoUrl: bestVid,
            arabic,
            bulgarian,
            reference,
            style: "middle",
            audioUrl: audioUrl || undefined,
            requireAudio: Boolean(audioUrl),
            fallbackDuration: 10,
            wordSegments,
            ayahBounds,
            bulgarianWordTimings,
            quality: "high",
          },
        },
      });

      return {
        reply: `${parsed.reply}\n\n🎬 **Стартирах генерирането на видеото за „${reference}“ на сървъра!** Можеш да го намериш и свалиш веднага след рендиране от раздел **[Изтегляния](/downloads)**.`,
        jobStarted: true,
        jobId,
        reference,
      };
    } catch (err: any) {
      return {
        reply: `${parsed.reply}\n\n⚠️ Възникна грешка при стартиране на видеото: ${err?.message || err}`,
        jobStarted: false,
      };
    }
  });
