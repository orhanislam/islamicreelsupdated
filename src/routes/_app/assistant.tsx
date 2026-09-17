import { CarouselRendererButton } from "@/components/CarouselRendererButton";
import React, { useState, useEffect, useRef } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Bot, Send, Loader2, Sparkles, Download, CheckCircle2, Video, Pencil, Brain, Trash2, Plus, Copy, Image as ImageIcon, BookOpen, ScrollText, ShieldCheck, History, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { copyToClipboardFallback } from "@/lib/utils";
import { toast } from "sonner";
import { chatWithAssistant, suggestViralProposal, suggestExplainedVideoProposal, suggestAlternativeProposal, suggestBatchViralProposals, confirmAndGenerateVideo, startBatchViralSeries, startBatchViralHadithSeries, getAssistantHistory, saveAssistantHistory, clearAssistantHistory, startBackgroundPlanGeneration, startBackgroundBatchGeneration, checkActiveBackgroundTasks, cleanProposalTitle, extractTopic, detectActionOrDuaLabel, cleanScriptPrefixes, stripScholarAttribution, type VideoProposal, type ExplainedVideoScript } from "@/lib/assistant.functions";
import { getAiMemory, updateAiMemory, type AiMemory } from "@/lib/memory.functions";
import { getOneMonthCooldownSummary, recordRejectedProposalToHistory } from "@/lib/generation-history.functions";
import { generateViralThumbnail } from "@/lib/thumbnail.functions";
import { formatViralSocialCaption } from "@/lib/caption.functions";
import { playStudioClick } from "@/lib/sfx";
import { getNextTawheedTopic, getTawheedTaxonomy } from "@/lib/tawheed-taxonomy";

export const Route = createFileRoute("/_app/assistant")({
  component: AssistantPage,
});

type ChatMsg = {
  role: "user" | "assistant";
  text: string;
  proposal?: VideoProposal | null;
  proposals?: VideoProposal[] | null;
  selectedProposalIndices?: number[];
  jobId?: string;
  reference?: string;
  isPlanning?: boolean;
  planId?: string;
  isRejected?: boolean;
};

const DEFAULT_MESSAGES: ChatMsg[] = [
  {
    role: "assistant",
    text: "Здравей! Аз съм твоят интелигентен Ислямски AI Видео Асистент с дълготрайна памет 🧠 и **постоянен чат на живо** (историята никога не се изчиства автоматично).\n\nКажи ми какво видео искаш да създадем или поискай **пакет от идеи за одобрение** (Коран, Хадиси и TikTok теми). Аз изготвям подробен план с предложения, от който можеш да избереш кои да генерираме!",
  },
];

export const VIRAL_QURAN_PRESETS = [
  { surah: 112, ayah: 1, count: 4, title: "Сура Ал-Ихляс (112:1-4)", prompt: "Направи TikTok видео за Сура Ал-Ихляс (112:1-4) със спокоен кинематографичен фон" },
  { surah: 2, ayah: 255, count: 1, title: "Аят ал-Курси (2:255)", prompt: "Направи TikTok видео за Аят Алкарси (Сура 2 аят 255) с нощно небе и звезди" },
  { surah: 94, ayah: 5, count: 2, title: "Сура Аш-Шарх (94:5-6)", prompt: "Направи TikTok видео за Сура Аш-Шарх (94:5-6) - С всяка трудност идва облекчение" },
  { surah: 103, ayah: 1, count: 3, title: "Сура Ал-Аср (103:1-3)", prompt: "Направи TikTok видео за Сура Ал-Аср (103:1-3) за времето и спасението" },
  { surah: 113, ayah: 1, count: 5, title: "Сура Ал-Фаляк (113:1-5)", prompt: "Направи TikTok видео за Сура Ал-Фаляк (113:1-5) за защита при изгрев слънце" },
  { surah: 114, ayah: 1, count: 6, title: "Сура Ан-Нас (114:1-6)", prompt: "Направи TikTok видео за Сура Ан-Нас (114:1-6) за духовно спокойствие" },
  { surah: 108, ayah: 1, count: 3, title: "Сура Ал-Каусар (108:1-3)", prompt: "Направи TikTok видео за Сура Ал-Каусар (108:1-3) за райското изобилие" },
  { surah: 67, ayah: 1, count: 3, title: "Сура Ал-Мулк (67:1-3)", prompt: "Направи TikTok видео за Сура Ал-Мулк (67:1-3) за величието на сътворението" },
  { surah: 55, ayah: 13, count: 1, title: "Сура Ар-Рахман (55:13)", prompt: "Направи TikTok видео за Сура Ар-Рахман (55:13) - Кое от благата на вашия Господ ще излъжете?" },
  { surah: 39, ayah: 53, count: 1, title: "Сура Аз-Зумар (39:53)", prompt: "Направи TikTok видео за Сура Аз-Зумар (39:53) - Не губете надежда в милостта на Аллах" }
];

export const VIRAL_HADITH_PRESETS = [
  { collection: "nawawi40", number: 1, title: "Хадис № 1 на Навауи (Намеренията)", prompt: "Направи вирално TikTok видео за Хадис № 1 на Навауи (Делата се ценят според намеренията)" },
  { collection: "bukhari", number: 6424, title: "Сахих ал-Бухари #6424 (Изпитанията)", prompt: "Направи вирално TikTok видео за Сахих ал-Бухари #6424 за скритата милост в изпитанията" },
  { collection: "nawawi40", number: 5, title: "Хадис № 5 на Навауи (Чистота на вярата)", prompt: "Направи вирално TikTok видео за Хадис № 5 на Навауи за искреността в религията" },
  { collection: "muslim", number: 2564, title: "Сахих Муслим #2564 (Добротата)", prompt: "Направи вирално TikTok видео за Сахих Муслим #2564 за силата на благородните обръщения" },
  { collection: "tirmidhi", number: 1987, title: "Сунан Ат-Тирмизи #1987 (Търпението)", prompt: "Направи вирално TikTok видео за Сахих Хадис от Тирмизи за вътрешния мир и сабр" },
  { collection: "nawawi40", number: 13, title: "Хадис № 13 на Навауи (Братска обич)", prompt: "Направи вирално TikTok видео за Хадис № 13 на Навауи - Никога не си истински вярващ, докато не пожелаеш за брата си това, което желаеш за себе си" }
];

function AssistantPage() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchCount, setBatchCount] = useState<number>(1);
  const [hadithBatchCount, setHadithBatchCount] = useState<number>(1);
  const [explainedCount, setExplainedCount] = useState<number>(1);
  const [carouselCount, setCarouselCount] = useState<number>(1);
  const [planBatchCount, setPlanBatchCount] = useState<number>(1);

  const [hadithSchedule, setHadithSchedule] = useState<"now" | "scheduled">("now");
  const [hadithScheduleDate, setHadithScheduleDate] = useState<string>("");

  const [quranSchedule, setQuranSchedule] = useState<"now" | "scheduled">("now");
  const [quranScheduleDate, setQuranScheduleDate] = useState<string>("");

  const [explainedSchedule, setExplainedSchedule] = useState<"now" | "scheduled">("now");
  const [explainedScheduleDate, setExplainedScheduleDate] = useState<string>("");

  const [carouselSchedule, setCarouselSchedule] = useState<"now" | "scheduled">("now");
  const [carouselScheduleDate, setCarouselScheduleDate] = useState<string>("");

  const [planSchedule, setPlanSchedule] = useState<"now" | "scheduled">("now");
  const [planScheduleDate, setPlanScheduleDate] = useState<string>("");

  const [viralLoading, setViralLoading] = useState(false);
  const [explainedLoading, setExplainedLoading] = useState(false);
  const [confirmingIdx, setConfirmingIdx] = useState<number | null>(null);
  const [rejectingIdx, setRejectingIdx] = useState<number | null>(null);
  const [showMemory, setShowMemory] = useState(false);
  const [memory, setMemory] = useState<AiMemory | null>(null);
  const [newInstruction, setNewInstruction] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>(DEFAULT_MESSAGES);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);
  const [generatingThumbTitle, setGeneratingThumbTitle] = useState<string | null>(null);
  const [activeTasks, setActiveTasks] = useState<any[]>([]);
  const [cooldownSummary, setCooldownSummary] = useState<{
    totalBlocked: number;
    ayahs: Array<{ key: string; surah?: number; ayah?: number; daysRemaining: number; title: string }>;
    hadiths: Array<{ key: string; collection?: string; number?: number; daysRemaining: number; title: string }>;
  } | null>(null);

  const [usedQuranKeys, setUsedQuranKeys] = useState<string[]>(() => {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const parsed = JSON.parse(window.localStorage.getItem("islamic_used_quran_keys") || "[]");
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  const [usedHadithKeys, setUsedHadithKeys] = useState<string[]>(() => {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const parsed = JSON.parse(window.localStorage.getItem("islamic_used_hadith_keys") || "[]");
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  const [usedCarouselTopics, setUsedCarouselTopics] = useState<string[]>(() => {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const parsed = JSON.parse(window.localStorage.getItem("islamic_used_carousel_topics") || "[]");
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  const handleNextQuranQuickAction = () => {
    playStudioClick();
    const isPresetInCooldown = (p: typeof VIRAL_QURAN_PRESETS[0]) => {
      if (!cooldownSummary) return false;
      return cooldownSummary.ayahs.some(
        (a) => a.surah === p.surah && Math.abs((a.ayah || 0) - p.ayah) < (p.count || 1)
      );
    };

    const eligiblePresets = VIRAL_QURAN_PRESETS.filter((p) => !isPresetInCooldown(p));
    const basePresets = eligiblePresets.length > 0 ? eligiblePresets : VIRAL_QURAN_PRESETS;

    const unpicked = basePresets.filter(
      (p) => !usedQuranKeys.includes(`quran:${p.surah}:${p.ayah}`)
    );
    const pool = unpicked.length > 0 ? unpicked : basePresets;
    const selected = pool[Math.floor(Math.random() * pool.length)];
    const key = `quran:${selected.surah}:${selected.ayah}`;

    const updated = unpicked.length === 1 ? [key] : [...usedQuranKeys, key];
    setUsedQuranKeys(updated);
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        window.localStorage.setItem("islamic_used_quran_keys", JSON.stringify(updated));
      } catch {}
    }
    setPrompt(selected.prompt);
    toast.message(`📖 Избран нов аят: ${selected.title}`);
  };

  const handleNextHadithQuickAction = () => {
    playStudioClick();
    const isPresetInCooldown = (p: typeof VIRAL_HADITH_PRESETS[0]) => {
      if (!cooldownSummary) return false;
      return cooldownSummary.hadiths.some(
        (h) => h.collection?.toLowerCase() === p.collection.toLowerCase() && h.number === p.number
      );
    };

    const eligiblePresets = VIRAL_HADITH_PRESETS.filter((p) => !isPresetInCooldown(p));
    const basePresets = eligiblePresets.length > 0 ? eligiblePresets : VIRAL_HADITH_PRESETS;

    const unpicked = basePresets.filter(
      (p) => !usedHadithKeys.includes(`hadith:${p.collection}:${p.number}`)
    );
    const pool = unpicked.length > 0 ? unpicked : basePresets;
    const selected = pool[Math.floor(Math.random() * pool.length)];
    const key = `hadith:${selected.collection}:${selected.number}`;

    const updated = unpicked.length === 1 ? [key] : [...usedHadithKeys, key];
    setUsedHadithKeys(updated);
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        window.localStorage.setItem("islamic_used_hadith_keys", JSON.stringify(updated));
      } catch {}
    }
    setPrompt(selected.prompt);
    toast.message(`📜 Избран нов хадис: ${selected.title}`);
  };

  const handleNextCarouselQuickAction = async () => {
    if (loading) return;
    try {
      if (typeof playStudioClick === "function") playStudioClick("start");
      setLoading(true);

      const nextTopic = getNextTawheedTopic(usedCarouselTopics);
      const updatedUsed = [...usedCarouselTopics, nextTopic.id];
      const boundedUsed = updatedUsed.length > 30 ? updatedUsed.slice(-30) : updatedUsed;
      setUsedCarouselTopics(boundedUsed);
      if (typeof window !== "undefined" && window.localStorage) {
        try {
          window.localStorage.setItem("islamic_used_carousel_topics", JSON.stringify(boundedUsed));
        } catch {}
      }

      toast.message(`🕌 Избрана Таухид тема: ${nextTopic.titleBg}`);

      const carouselPrompt = `Генерирай ми TikTok карусел от ТОЧНО 4 слайда по рамката за вирусни карусели (Viral Carousel Framework) на тема: "${nextTopic.pillarBg} - ${nextTopic.titleBg}".
ВАЖНО:
1) Слайд 1 (Куката): Използвай curiosity gap, въпрос или контраинтуитивно твърдение, свързано с: "${nextTopic.hookAngleBg}". СТРИКТНО ЗАБРАНЕНО Е да използваш общи заглавия и клишета като 'Защо си тук?', 'Какъв е смисълът на живота?' или 'Защо си създаден?'.
2) Слайдове 2 и 3 (Тяло): Сбит текст (макс 2-3 изречения), структуриран за бързо четене и завършващ с интригуващ клифхенгър или преход към следващия слайд.
3) В Слайд 3 ЗАДЪЛЖИТЕЛНО цитирай автентичния далил: ${nextTopic.dalilReference} („${nextTopic.dalilTextBg}“) с преход към действието.
4) Слайд 4 (CTA): Задължително включи конкретно, стойностно действие с ключови думи като "Запази", "Сподели" или "Коментирай" (напр. "Запази това напомняне...", "Сподели за садака джария!").
5) Всичко да е строго по Салафитското учение (Ахлу Сунна уал Джама'а) без бид'а и слаби хадиси.
6) imagePrompt: фотореалистични вертикални природни кадри 8k (dark cinematic -> golden divine light), БЕЗ ХОРА, БЕЗ ЛИЦА И БЕЗ ЖИВОТНИ.
Използвай типа 'carousel'.`;

      const history = messages.slice(1).map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.text,
      }));

      const res = await chatWithAssistant({
        data: {
          prompt: carouselPrompt,
          history,
        },
      });
      if (typeof playStudioClick === "function") playStudioClick("success");
      
      const newMsg = {
        role: "assistant" as const,
        text: res.reply,
        proposal: res.proposal,
      };
      setMessages((prev) => [...prev, newMsg]);
    } catch (err: any) {
      if (typeof playStudioClick === "function") playStudioClick("click");
      toast.error(err.message || "Грешка при генериране на карусел.");
    } finally {
      setLoading(false);
    }
  };

  const getThumbTitle = (title?: string) => {
    if (!title) return "Ислямска мъдрост";
    let v = title;
    if (v.includes("] ")) {
      v = v.split("] ").slice(1).join("] ").trim();
    } else if (v.includes("•")) {
      v = v.split("•")[1].trim();
    }
    return v;
  };

  const handleDownloadThumbnail = async (title: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      setGeneratingThumbTitle(title);
      toast.message("Генериране на професионална вайръл корица (Thumbnail)...");
      const thumbTitle = getThumbTitle(title);
      const res = await generateViralThumbnail({ data: { title: thumbTitle } });
      const a = document.createElement("a");
      a.href = res.dataUrl;
      const safeTitle = (title || "islamic-reel").replace(/[<>:"/\\|?*]+/g, "_").trim();
      a.download = `${safeTitle}_thumbnail.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Вайръл корицата е свалена успешно!");
    } catch (err) {
      toast.error("Не успях да създам корицата");
    } finally {
      setGeneratingThumbTitle(null);
    }
  };

  const handleCopyTikTokCaption = (
    title: string,
    summary?: string,
    e?: React.MouseEvent,
    scriptWorkflow?: ExplainedVideoScript,
  ) => {
    if (e) e.stopPropagation();
    let text = "";
    if (scriptWorkflow) {
      const sw = scriptWorkflow;
      const actLabel = detectActionOrDuaLabel(sw.actionStep);
      const cleanExpl = stripScholarAttribution(sw.explanation);
      const cleanAct = cleanScriptPrefixes(sw.actionStep);
      text = `${sw.hookQuestion ? `${cleanScriptPrefixes(sw.hookQuestion)}\n${cleanScriptPrefixes(sw.hookContext || "")}\n\n` : ""}📖 ${title}\n„${sw.dalilText || title}“\n\n💡 Обяснение: ${cleanExpl}\n\n${actLabel === "Дуа" ? "🤍 Дуа:" : "⚡ Действие:"} ${cleanAct}\n\n#islamicreels #коран #хадис #ислям #напомняне #садакаджария #bulgaria #islamicvideo`;
    } else {
      const cleanTitle = getThumbTitle(title);
      text = formatViralSocialCaption(cleanTitle, summary);
    }
    copyToClipboardFallback(text);
  };

  useEffect(() => {
    let active = true;
    const fetchHistory = async () => {
      try {
        const checkRes = await checkActiveBackgroundTasks();
        if (active && checkRes.activeTasks) {
          setActiveTasks(checkRes.activeTasks);
        }
        const serverMsgs = checkRes.history && checkRes.history.length > 0 ? checkRes.history : await getAssistantHistory();
        if (active && Array.isArray(serverMsgs) && serverMsgs.length > 0) {
          setMessages(serverMsgs);
          if (typeof window !== "undefined" && window.localStorage) {
            window.localStorage.setItem("islamic_assistant_chat_history_v3", JSON.stringify(serverMsgs));
          }
          return;
        }
      } catch {}

      if (typeof window !== "undefined" && window.localStorage) {
        try {
          const saved = window.localStorage.getItem("islamic_assistant_chat_history_v3");
          if (saved) {
            const parsed = JSON.parse(saved);
            if (active && Array.isArray(parsed) && parsed.length > 0) {
              setMessages(parsed);
              saveAssistantHistory({ data: { messages: parsed } }).catch(() => {});
            }
          }
        } catch {}
      }
    };
    fetchHistory();

    const interval = setInterval(async () => {
      try {
        const checkRes = await checkActiveBackgroundTasks();
        if (checkRes.activeTasks) {
          setActiveTasks(checkRes.activeTasks);
        }
        const serverMsgs = checkRes.history && checkRes.history.length > 0 ? checkRes.history : await getAssistantHistory();
        if (Array.isArray(serverMsgs) && serverMsgs.length > 0) {
          setMessages((prev) => {
            if (JSON.stringify(prev) !== JSON.stringify(serverMsgs)) {
              if (typeof window !== "undefined" && window.localStorage) {
                window.localStorage.setItem("islamic_assistant_chat_history_v3", JSON.stringify(serverMsgs));
              }
              return serverMsgs;
            }
            return prev;
          });
        }
      } catch {}
    }, 3000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (messages !== DEFAULT_MESSAGES && messages.length > 0) {
      if (typeof window !== "undefined" && window.localStorage) {
        try {
          window.localStorage.setItem("islamic_assistant_chat_history_v3", JSON.stringify(messages));
        } catch {}
      }
      saveAssistantHistory({ data: { messages } }).catch(() => {});
    }
  }, [messages]);

  const refreshCooldownSummary = async () => {
    try {
      const s = await getOneMonthCooldownSummary();
      setCooldownSummary(s);
    } catch {}
  };

  useEffect(() => {
    getAiMemory().then((m) => setMemory(m)).catch(() => {});
    refreshCooldownSummary();
  }, []);

  const handleAddInstruction = async () => {
    if (!newInstruction.trim() || !memory) return;
    const updated: AiMemory = {
      ...memory,
      customInstructions: [...memory.customInstructions, newInstruction.trim()],
    };
    setMemory(updated);
    setNewInstruction("");
    await updateAiMemory({ data: { memory: updated } });
    toast.success("Инструкцията е запазена в паметта на асистента!");
  };

  const handleRemoveInstruction = async (idx: number) => {
    if (!memory) return;
    const updated: AiMemory = {
      ...memory,
      customInstructions: memory.customInstructions.filter((_, i) => i !== idx),
    };
    setMemory(updated);
    await updateAiMemory({ data: { memory: updated } });
    toast.success("Инструкцията е премахната.");
  };

  const handleRemoveFact = async (idx: number) => {
    if (!memory) return;
    const updated: AiMemory = {
      ...memory,
      learnedFacts: memory.learnedFacts.filter((_, i) => i !== idx),
    };
    setMemory(updated);
    await updateAiMemory({ data: { memory: updated } });
    toast.success("Фактът е изтрит от паметта.");
  };

  
  const handleGenerateCarouselClick = async () => {
    try {
      if (typeof playStudioClick === 'function') playStudioClick("start");
      setLoading(true);
      const userText = "Генерирай ми TikTok карусел с 4 слайда по рамката за вирусни карусели (Viral Hook -> Сбито тяло с клифхенгъри -> Автентичен Далил -> Стойностен CTA със 'Запази'/'Сподели'). Нека бъде на интересна Ислямска Таухид тема. Използвай type: 'carousel'.";
      const newMsgs = [...messages, { role: "user" as const, text: userText }];
      setMessages(newMsgs);
      toast.message("Генериране на карусел...");
      
      const history = newMsgs.slice(1, -1).map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.text,
      }));

      const res = await chatWithAssistant({
        data: {
          prompt: userText,
          history,
        },
      });
      if (typeof playStudioClick === 'function') playStudioClick("success");
      const newMsg = {
        role: "assistant" as const,
        text: res.reply,
        proposal: res.proposal,
      };
      setMessages((prev) => {
        const next = [...prev, newMsg];
        saveAssistantHistory({ data: { messages: next } }).catch(() => {});
        return next;
      });
    } catch (e: any) {
      toast.error(e?.message || "Грешка при генериране на карусел");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmProposal = async (proposal: VideoProposal, msgIdx: number) => {
    if (confirmingIdx !== null) return;
    playStudioClick("start");
    setConfirmingIdx(msgIdx);
    toast.message("Генерирам видеото по твоето одобрено предложение...");

    try {
      const res = await confirmAndGenerateVideo({
        data: { proposal },
      });

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: res.reply,
          jobId: res.jobId,
          reference: res.reference,
        },
      ]);
      playStudioClick("success");
      toast.success("Видеото е стартирано успешно!");
    } catch (err: any) {
      toast.error(err?.message || "Грешка при стартиране на видеото");
    } finally {
      setConfirmingIdx(null);
    }
  };

  const handleRejectAndSuggestAlternative = async (proposal: VideoProposal, msgIdx: number) => {
    if (rejectingIdx !== null) return;
    try {
      playStudioClick("click");
      setRejectingIdx(msgIdx);
      toast.message("🔄 Търся ново алтернативно предложение...");

      // 1. Record rejected proposal immediately into 30-day cooldown history
      await recordRejectedProposalToHistory({ data: { proposal } }).catch((err) => {
        console.warn("Failed to record rejected proposal to history:", err);
      });
      refreshCooldownSummary();

      // 2. Mark current proposal as rejected in chat
      setMessages((prev) => {
        const next = [...prev];
        if (next[msgIdx]) {
          next[msgIdx] = { ...next[msgIdx], isRejected: true };
        }
        return next;
      });

      // 3. Request alternative proposal (with rejection recorded)
      const res = await suggestAlternativeProposal({
        data: {
          currentTitle: proposal.title,
          topic: extractTopic(proposal),
          type: proposal.type,
          rejectedProposal: proposal,
        },
      });

      const altAct = res.proposal?.scriptWorkflow?.actionStep
        ? cleanScriptPrefixes(res.proposal.scriptWorkflow.actionStep)
        : "";
      const altActLabel = altAct ? detectActionOrDuaLabel(altAct) : "";
      const altActText = altAct ? `\n${altActLabel === "Дуа" ? "🤍" : "⚡"} **${altActLabel}:** ${altAct}` : "";
      const altExpl = stripScholarAttribution(res.proposal?.scriptWorkflow?.explanation || res.proposal?.summaryBg || "");

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `🔄 **Алтернативно предложение:**\n\n${res.reply}\n\n📖 **Цитат:** ${res.proposal?.title}\n💡 **Обяснение:** ${altExpl}${altActText}\n🎨 **Атмосфера:** ${res.proposal?.themeBg}\n\n📌 Натисни **\"✅ Съгласи се / Одобри\"** за да го генерираме, или **\"❌ Откажи / Предложи друг\"** за още едно!`,
          proposal: res.proposal,
        },
      ]);
      playStudioClick("success");
      toast.success(`Предложено е ново алтернативно видео! („${cleanProposalTitle(proposal.title)}“ е в Историята с 30 дни пауза)`);
    } catch (err: any) {
      toast.error(err?.message || "Грешка при генериране на алтернатива");
    } finally {
      setRejectingIdx(null);
    }
  };

  const handleRejectOnly = async (proposal: VideoProposal, msgIdx: number) => {
    if (rejectingIdx !== null) return;
    try {
      playStudioClick("click");
      setRejectingIdx(msgIdx);
      await recordRejectedProposalToHistory({ data: { proposal } });
      refreshCooldownSummary();

      setMessages((prev) => {
        const next = [...prev];
        if (next[msgIdx]) {
          next[msgIdx] = { ...next[msgIdx], isRejected: true };
        }
        next.push({
          role: "assistant",
          text: `❌ **Предложението е отказано:**\n\n📖 **Цитат:** ${cleanProposalTitle(proposal.title)}\n\n🛡️ **Записано в Историята:** Този аят/хадис вече има **30-дневен период на охлаждане** (сякаш е бил използван). AI няма да го предлага отново за 1 месец, освен ако не го изтриете ръчно от страницата [📜 История](/history).`,
        });
        saveAssistantHistory({ data: { messages: next } }).catch(() => {});
        return next;
      });

      playStudioClick("success");
      toast.success(`„${cleanProposalTitle(proposal.title)}“ е записан в Историята с 30-дневен период на охлаждане!`);
    } catch (err: any) {
      toast.error(err?.message || "Грешка при отказване на предложението");
    } finally {
      setRejectingIdx(null);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || loading) return;

    const userText = prompt.trim();
    setPrompt("");

    const lower = userText.toLowerCase();

    // Studio Control commands from chat
    if (/^(изчисти чата|изчисти|clear chat)\b/i.test(lower)) {
      await handleClearChat();
      return;
    }
    if (/^(отвори изтегляния|изтегляния|виж изтегляния|downloads)\b/i.test(lower)) {
      navigate({ to: "/downloads" });
      return;
    }

    // Step-by-Step Approval chat triggers
    const isApproveKeyword = /^(да|ок|одобри|одобрявам|съгласен|съгласих се|генерирай|потвърди|давай|пускай)\b/i.test(lower);
    const isRejectKeyword = /^(не|откажи|отказвам|предложи друг|дай друг|не ми харесва|смени|друг|друго|алтернатива)\b/i.test(lower);

    let pendingMsgIdx = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].proposal && !messages[i].jobId) {
        pendingMsgIdx = i;
        break;
      }
    }

    if (isApproveKeyword && pendingMsgIdx !== -1) {
      const msg = messages[pendingMsgIdx];
      await handleConfirmProposal(msg.proposal!, pendingMsgIdx);
      return;
    }

    if (isRejectKeyword && pendingMsgIdx !== -1) {
      const msg = messages[pendingMsgIdx];
      await handleRejectAndSuggestAlternative(msg.proposal!, pendingMsgIdx);
      return;
    }

    const newMsgs: ChatMsg[] = [...messages, { role: "user", text: userText }];
    setMessages(newMsgs);
    setLoading(true);

    try {
      const history = newMsgs.slice(1, -1).map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.text,
      }));

      const res = await chatWithAssistant({
        data: {
          prompt: userText,
          history,
        },
      });

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: res.reply,
          proposal: res.proposal,
        },
      ]);
    } catch (err: any) {
      toast.error(err?.message || "Грешка при комуникацията с асистента");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Възникна грешка при обработка на заявката.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleStartBatchSeries = async (customCount?: number | React.MouseEvent) => {
    const countToRun = typeof customCount === "number" ? customCount : batchCount;
    try {
      playStudioClick("start");
      setBatchLoading(true);
      toast.message(`Генериране на план с ${countToRun} вайръл видеа от Корана...`);
      const res = await suggestBatchViralProposals({ data: { count: countToRun, topic: "САМО Коран (ИЗБЯГВАЙ ПОВТОРЕНИЯ)" } });
      playStudioClick("success");
      const newMsg = {
        role: "assistant" as const,
        text: res.reply,
        proposals: res.proposals,
      };
      setMessages((prev) => {
        const next = [...prev, newMsg];
        saveAssistantHistory({ data: { messages: next } }).catch(() => {});
        return next;
      });
    } catch (e: any) {
      toast.error(e?.message || "Грешка при генериране на плана");
    } finally {
      setBatchLoading(false);
    }
  };

  const handleStartHadithBatchSeries = async (customCount?: number | React.MouseEvent) => {
    const countToRun = typeof customCount === "number" ? customCount : hadithBatchCount;
    try {
      playStudioClick("start");
      setBatchLoading(true);
      toast.message(`Генериране на план с ${countToRun} вайръл видеа с хадиси...`);
      const res = await suggestBatchViralProposals({ data: { count: countToRun, topic: "САМО Сахих Хадиси (ИЗБЯГВАЙ ПОВТОРЕНИЯ)" } });
      playStudioClick("success");
      const newMsg = {
        role: "assistant" as const,
        text: res.reply,
        proposals: res.proposals,
      };
      setMessages((prev) => {
        const next = [...prev, newMsg];
        saveAssistantHistory({ data: { messages: next } }).catch(() => {});
        return next;
      });
    } catch (e: any) {
      toast.error(e?.message || "Грешка при генериране на плана");
    } finally {
      setBatchLoading(false);
    }
  };

  const handleViralSuggest = async () => {
    try {
      playStudioClick("start");
      setViralLoading(true);
      toast.message("🔥 AI търси уникална вайръл тема (без банални текстове)...");

      const res = await suggestViralProposal();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `🔥 **Вайръл Предложение:**\n\n${res.reply}\n\n📋 **Тема:** ${res.proposal?.title}\n🎨 **Атмосфера:** ${res.proposal?.themeBg}\n\n📌 Натисни **\"✅ Съгласи се / Одобри\"** за да генерираме видеото, или **\"❌ Откажи / Предложи друг\"** за ново предложение!`,
          proposal: res.proposal,
        },
      ]);
      playStudioClick("success");
    } catch (e: any) {
      toast.error(e?.message || "Грешка при генериране на вайръл предложение");
    } finally {
      setViralLoading(false);
    }
  };

  const handleExplainedVideoSuggest = async () => {
    if (explainedCount === 0) {
      toast.error("Избрани са 0 видеа. Моля, изберете брой от 1 до 10!");
      return;
    }
    try {
      playStudioClick("start");
      setExplainedLoading(true);
      toast.message("🎬 AI подготвя Ислямско видео с обяснение (цитат + разяснение)...");

      const res = await suggestExplainedVideoProposal({ data: {} });

      const scheduleNote = explainedSchedule === "scheduled" && explainedScheduleDate
        ? `\n\n📅 **Планирано време за рендиране:** ${new Date(explainedScheduleDate).toLocaleString("bg-BG")}`
        : "";

      const expAct = res.proposal?.scriptWorkflow?.actionStep
        ? cleanScriptPrefixes(res.proposal.scriptWorkflow.actionStep)
        : "";
      const expActLabel = expAct ? detectActionOrDuaLabel(expAct) : "";
      const expActText = expAct ? `\n${expActLabel === "Дуа" ? "🤍" : "⚡"} **${expActLabel}:** ${expAct}` : "";
      const expExpl = stripScholarAttribution(res.proposal?.scriptWorkflow?.explanation || res.proposal?.summaryBg || "");

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `🎬 **Ислямско видео с обяснение:**\n\n${res.reply}\n\n📖 **Цитат:** ${res.proposal?.title}\n💡 **Обяснение:** ${expExpl}${expActText}\n🎨 **Атмосфера:** ${res.proposal?.themeBg}${scheduleNote}\n\n📌 Натисни **\"✅ Съгласи се / Одобри\"** за да стартираме видеото, или **\"❌ Откажи / Предложи друг\"** за алтернатива!`,
          proposal: res.proposal,
        },
      ]);
      playStudioClick("success");
    } catch (e: any) {
      toast.error(e?.message || "Грешка при генериране на предложение за видео с обяснение");
    } finally {
      setExplainedLoading(false);
    }
  };

  const handleClearChat = async () => {
    if (typeof window !== "undefined" && !window.confirm("Сигурни ли сте, че искате да изчистите историята на чата?")) return;
    playStudioClick("click");
    setMessages(DEFAULT_MESSAGES);
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        window.localStorage.setItem("islamic_assistant_chat_history_v3", JSON.stringify(DEFAULT_MESSAGES));
      } catch {}
    }
    await clearAssistantHistory().catch(() => {});
    toast.success("Чатът е изчистен успешно!");
  };

  const handleBatchSuggest = async (countToSuggest: number) => {
    try {
      playStudioClick("start");
      setViralLoading(true);
      toast.message(`⚡ Стартирам фоново изготвяне на план с ${countToSuggest} вайръл идеи... Може да затворите браузъра!`);
      const userText = `⚡ Изготви ми план с точно ${countToSuggest} вайръл идеи (Коран, Хадиси и TikTok теми) за одобрение.`;
      await startBackgroundPlanGeneration({
        data: { count: countToSuggest, userMsgText: userText },
      });
      playStudioClick("success");
      toast.success(`⏳ Планът се изготвя във фонов режим! Може да затворите браузъра на телефона! Когато се върнете, предложенията ще са тук.`);
      const latest = await getAssistantHistory();
      if (Array.isArray(latest) && latest.length > 0) {
        setMessages(latest);
      }
    } catch (e: any) {
      toast.error(e?.message || "Грешка при създаване на плана");
    } finally {
      setViralLoading(false);
    }
  };

  const handleToggleProposalCheckbox = (msgIdx: number, propIdx: number) => {
    setMessages((prev) =>
      prev.map((m, idx) => {
        if (idx !== msgIdx || !m.proposals) return m;
        const currentSel = m.selectedProposalIndices || m.proposals.map((_, i) => i);
        const newSel = currentSel.includes(propIdx)
          ? currentSel.filter((i) => i !== propIdx)
          : [...currentSel, propIdx].sort((a, b) => a - b);
        return { ...m, selectedProposalIndices: newSel };
      })
    );
  };

  const handleApproveBatchProposals = async (msgIdx: number) => {
    const msg = messages[msgIdx];
    if (!msg || !msg.proposals) return;
    const selectedIndices = msg.selectedProposalIndices || msg.proposals.map((_, i) => i);
    const chosen = selectedIndices.map((i) => msg.proposals![i]).filter(Boolean);
    if (chosen.length === 0) {
      toast.error("Моля, отбележете поне 1 предложение с чекбокс!");
      return;
    }

    try {
      setConfirmingIdx(msgIdx);
      playStudioClick("start");
      toast.message(`🎬 Изпращам ${chosen.length} одобрени видеа към фоновата облачна опашка... Може да затворите браузъра!`);
      await startBackgroundBatchGeneration({ data: { proposals: chosen } });
      playStudioClick("success");
      toast.success(`🎉 Успешно стартирани ${chosen.length} видеа за автономно рендиране на облака! Може веднага да излезете от браузъра.`);
      const latest = await getAssistantHistory();
      if (Array.isArray(latest) && latest.length > 0) {
        setMessages(latest);
      }
    } catch (err: any) {
      toast.error(err?.message || "Грешка при генериране на видеата");
    } finally {
      setConfirmingIdx(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 font-ui">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-sm">
            <Bot className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">AI Видео Асистент (С Дълготрайна Памет)</h1>
            <p className="text-sm text-muted-foreground">
              Асистентът помни твоите инструкции и винаги иска одобрение преди рендиране.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link to="/history">
            <Button
              variant="outline"
              className="flex items-center gap-1.5 rounded-xl text-xs px-3 cursor-pointer border-primary/40 hover:bg-primary/10 transition-colors"
              title="Виж всички генерирани аяти и хадиси в историята"
            >
              <History className="size-3.5 text-primary" />
              <span>История</span>
              {(cooldownSummary?.totalBlocked ?? 0) > 0 && (
                <span className="rounded-full bg-primary/20 text-primary px-1.5 py-0.2 text-[10px] font-semibold">
                  {cooldownSummary?.totalBlocked}
                </span>
              )}
            </Button>
          </Link>
          <Button
            variant="destructive"
            onClick={handleClearChat}
            className="flex items-center gap-1.5 rounded-xl text-xs font-semibold px-3 cursor-pointer"
            title="Изчисти чат историята на живо"
          >
            <Trash2 className="size-3.5" />
            <span>Изчисти чата</span>
          </Button>
          <Button
            variant={showMemory ? "default" : "outline"}
            onClick={() => setShowMemory(!showMemory)}
            className="flex items-center gap-2 rounded-xl text-xs cursor-pointer"
          >
            <Brain className="size-4" />
            <span>{showMemory ? "Скрий паметта" : "🧠 Моята AI Памет & Правила"}</span>
          </Button>
        </div>
      </div>

      {activeTasks.length > 0 && (
        <Card className="mb-6 border-amber-500/50 bg-amber-500/10 p-4 rounded-2xl shadow-md space-y-2 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-amber-500 text-sm">
              <Loader2 className="size-4 animate-spin" />
              <span>🚀 Активни автономни задачи на облачния сървър ({activeTasks.length})</span>
            </div>
            <span className="text-xs text-muted-foreground font-mono">Може спокойно да затворите браузъра (iPhone/Mobile)</span>
          </div>
          <div className="space-y-1.5 pt-1">
            {activeTasks.map((t) => (
              <div key={t.id} className="text-xs bg-background/80 p-2.5 rounded-xl border border-border/40 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 truncate">
                  <span className="font-semibold text-foreground">{t.title}:</span>
                  <span className="text-muted-foreground truncate">{t.message}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-20 bg-muted rounded-full h-2 overflow-hidden">
                    <div className="bg-amber-500 h-full transition-all duration-300" style={{ width: `${t.progress || 10}%` }} />
                  </div>
                  <span className="font-mono text-[11px] font-bold text-amber-500">{t.progress || 10}%</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {showMemory && memory && (
        <Card className="mb-6 border border-primary/30 bg-card/95 p-5 shadow-md space-y-4 rounded-2xl">
          <div className="flex items-center justify-between border-b border-border/50 pb-2">
            <div className="flex items-center gap-2 font-semibold text-primary">
              <Brain className="size-5" />
              <span>Управление на постоянната памет и инструкции</span>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              1. Твоите постоянни инструкции към асистента
            </h3>
            <div className="space-y-1.5">
              {memory.customInstructions.map((inst, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-xs">
                  <span>{inst}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveInstruction(idx)}
                    className="size-6 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newInstruction}
                onChange={(e) => setNewInstruction(e.target.value)}
                placeholder="Добави ново правило (напр. „Винаги предпочитай залез за фон“)"
                className="text-xs h-9"
              />
              <Button onClick={handleAddInstruction} size="sm" className="h-9 shrink-0 text-xs gap-1">
                <Plus className="size-3.5" />
                <span>Добави</span>
              </Button>
            </div>
          </div>

          {memory.learnedFacts.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border/40">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                2. Какво е научил асистентът от разговорите с теб
              </h3>
              <div className="space-y-1">
                {memory.learnedFacts.map((fact, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-lg bg-primary/5 px-3 py-2 text-xs">
                    <span>✨ {fact}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveFact(idx)}
                      className="size-6 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {cooldownSummary && cooldownSummary.totalBlocked > 0 && (
            <div className="space-y-2 pt-3 border-t border-border/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                  <ShieldCheck className="size-4 text-emerald-400" />
                  <span>30-дневна пауза от историята ({cooldownSummary.totalBlocked} активни)</span>
                </div>
                <Link to="/history" className="text-[11px] text-primary hover:underline">
                  Виж историята →
                </Link>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Асистентът автоматично блокира повторно генериране на аяти и хадиси, които вече са били създадени през последния 1 месец.
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {cooldownSummary.ayahs.slice(0, 6).map((a) => (
                  <span key={a.key} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                    📖 {a.title} ({a.daysRemaining}д)
                  </span>
                ))}
                {cooldownSummary.hadiths.slice(0, 6).map((h) => (
                  <span key={h.key} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300">
                    📜 {h.title} ({h.daysRemaining}д)
                  </span>
                ))}
                {cooldownSummary.totalBlocked > 12 && (
                  <span className="text-[10px] text-muted-foreground self-center">
                    +{cooldownSummary.totalBlocked - 12} още
                  </span>
                )}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Banner Cards Container with responsive spacing */}
      <div className="space-y-3 sm:space-y-4 mb-3 sm:mb-4">


        {/* Batch Viral Hadith Generator Card */}
        <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-r from-blue-500/10 via-cyan-500/5 to-transparent p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
              <ScrollText className="size-4" /> ПАКЕТЕН РЕЖИМ • ВАЙРЪЛ СЕРИЯ ОТ ХАДИСИ
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Избери брой автентични (Sahih) хадиса (0-10) и график за автоматично генериране:
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-2.5">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-muted-foreground">Брой:</span>
                <select
                  value={hadithBatchCount}
                  onChange={(e) => setHadithBatchCount(Number(e.target.value))}
                  className="bg-black/60 border border-blue-500/40 rounded-lg px-2 py-1 text-xs font-bold text-blue-300 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-400"
                >
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <option key={num} value={num} className="bg-neutral-900 text-white">
                      {num} {num === 1 ? "видео" : "видеа"} {num === 1 ? "(по подразбиране)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-semibold text-muted-foreground">График:</span>
                <div className="inline-flex rounded-lg border border-border/50 bg-black/40 p-0.5">
                  <button
                    type="button"
                    onClick={() => setHadithSchedule("now")}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                      hadithSchedule === "now" ? "bg-blue-500 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    ⚡ Генерирай Сега
                  </button>
                  <button
                    type="button"
                    onClick={() => setHadithSchedule("scheduled")}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                      hadithSchedule === "scheduled" ? "bg-blue-500 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    📅 Планирай
                  </button>
                </div>
                {hadithSchedule === "scheduled" && (
                  <input
                    type="datetime-local"
                    value={hadithScheduleDate}
                    onChange={(e) => setHadithScheduleDate(e.target.value)}
                    className="bg-black/60 border border-blue-500/40 rounded-lg px-2 py-1 text-xs text-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer"
                  />
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              if (hadithBatchCount === 0) {
                toast.error("Избрани са 0 видеа. Моля, изберете брой от 1 до 10!");
                return;
              }
              if (hadithSchedule === "scheduled" && hadithScheduleDate) {
                toast.success(`📅 Серията от ${hadithBatchCount} хадиса е планирана за ${new Date(hadithScheduleDate).toLocaleString("bg-BG")}!`);
              }
              handleStartHadithBatchSeries(hadithBatchCount);
            }}
            disabled={batchLoading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-600 px-5 py-3 text-xs font-bold text-white shadow-lg hover:from-blue-400 hover:to-cyan-500 transition shrink-0 cursor-pointer self-stretch sm:self-auto"
          >
            {batchLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Генериране...
              </>
            ) : (
              <>
                <Video className="size-4" /> 🚀 {hadithBatchCount === 0 ? "Избрани са 0 видеа" : `Генерирай Серия от ${hadithBatchCount} Видеа`}
              </>
            )}
          </button>
        </div>

        {/* Batch Series Luxury Card */}
        <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <Sparkles className="size-4" /> ПАКЕТЕН РЕЖИМ • ВАЙРЪЛ СЕРИЯ ОТ КОРАНА
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Избери брой топ вайръл видеа (0-10) и график за рендиране (с Hormozi субтитри и кино B-Roll):
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-2.5">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-muted-foreground">Брой:</span>
                <select
                  value={batchCount}
                  onChange={(e) => setBatchCount(Number(e.target.value))}
                  className="bg-black/60 border border-amber-500/40 rounded-lg px-2 py-1 text-xs font-bold text-amber-300 cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-400"
                >
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <option key={num} value={num} className="bg-neutral-900 text-white">
                      {num} {num === 1 ? "видео" : "видеа"} {num === 1 ? "(по подразбиране)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-semibold text-muted-foreground">График:</span>
                <div className="inline-flex rounded-lg border border-border/50 bg-black/40 p-0.5">
                  <button
                    type="button"
                    onClick={() => setQuranSchedule("now")}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                      quranSchedule === "now" ? "bg-amber-500 text-black shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    ⚡ Генерирай Сега
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuranSchedule("scheduled")}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                      quranSchedule === "scheduled" ? "bg-amber-500 text-black shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    📅 Планирай
                  </button>
                </div>
                {quranSchedule === "scheduled" && (
                  <input
                    type="datetime-local"
                    value={quranScheduleDate}
                    onChange={(e) => setQuranScheduleDate(e.target.value)}
                    className="bg-black/60 border border-amber-500/40 rounded-lg px-2 py-1 text-xs text-amber-300 focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer"
                  />
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              if (batchCount === 0) {
                toast.error("Избрани са 0 видеа. Моля, изберете брой от 1 до 10!");
                return;
              }
              if (quranSchedule === "scheduled" && quranScheduleDate) {
                toast.success(`📅 Серията от ${batchCount} видеа от Корана е планирана за ${new Date(quranScheduleDate).toLocaleString("bg-BG")}!`);
              }
              handleStartBatchSeries(batchCount);
            }}
            disabled={batchLoading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-3 text-xs font-bold text-black shadow-lg hover:from-amber-400 hover:to-amber-500 transition shrink-0 cursor-pointer self-stretch sm:self-auto"
          >
            {batchLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Генериране...
              </>
            ) : (
              <>
                <Video className="size-4" /> 🚀 {batchCount === 0 ? "Избрани са 0 видеа" : `Генерирай Серия от ${batchCount} Видеа`}
              </>
            )}
          </button>
        </div>

        {/* Islamic Video with Explanation Quick Action Toolbar */}
        <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-transparent p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mt-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <Sparkles className="size-4" /> 🎬 ИСЛЯМСКО ВИДЕО С ОБЯСНЕНИЕ (ЦИТАТ + ОБЯСНЕНИЕ)
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Генерирай готово кинематографично видео: автентичен аят/хадис, последван от дълбоко обяснение и житейска поука със синхронизирани караоке субтитри.
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-2.5">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-muted-foreground">Брой:</span>
                <select
                  value={explainedCount}
                  onChange={(e) => setExplainedCount(Number(e.target.value))}
                  className="bg-black/60 border border-emerald-500/40 rounded-lg px-2 py-1 text-xs font-bold text-emerald-300 cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-400"
                >
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <option key={num} value={num} className="bg-neutral-900 text-white">
                      {num} {num === 1 ? "видео" : "видеа"} {num === 1 ? "(по подразбиране)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-semibold text-muted-foreground">График:</span>
                <div className="inline-flex rounded-lg border border-border/50 bg-black/40 p-0.5">
                  <button
                    type="button"
                    onClick={() => setExplainedSchedule("now")}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                      explainedSchedule === "now" ? "bg-emerald-500 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    ⚡ Генерирай Сега
                  </button>
                  <button
                    type="button"
                    onClick={() => setExplainedSchedule("scheduled")}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                      explainedSchedule === "scheduled" ? "bg-emerald-500 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    📅 Планирай
                  </button>
                </div>
                {explainedSchedule === "scheduled" && (
                  <input
                    type="datetime-local"
                    value={explainedScheduleDate}
                    onChange={(e) => setExplainedScheduleDate(e.target.value)}
                    className="bg-black/60 border border-emerald-500/40 rounded-lg px-2 py-1 text-xs text-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-400 cursor-pointer"
                  />
                )}
              </div>
            </div>
          </div>
          <button
            onClick={handleExplainedVideoSuggest}
            disabled={explainedLoading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-3 text-xs font-bold text-white shadow-lg hover:from-emerald-400 hover:to-teal-500 transition shrink-0 cursor-pointer self-stretch sm:self-auto"
          >
            {explainedLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Генериране...
              </>
            ) : (
              <>
                <Video className="size-4" /> {explainedCount === 0 ? "Избрани са 0 видеа" : "Създай Видео с Обяснение"}
              </>
            )}
          </button>
        </div>

        {/* Carousel Quick Action Toolbar */}
        <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-r from-blue-500/10 via-cyan-500/5 to-transparent p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mt-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
              <ImageIcon className="size-4" /> ГЕНЕРАТОР НА TIKTOK КАРУСЕЛИ (ТАУХИД)
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Генерирай 4 слайда по разнородни подтеми на Таухид (Господство, Поклонение, Имена и Качества) без повторения.
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-2.5">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-muted-foreground">Брой:</span>
                <select
                  value={carouselCount}
                  onChange={(e) => setCarouselCount(Number(e.target.value))}
                  className="bg-black/60 border border-blue-500/40 rounded-lg px-2 py-1 text-xs font-bold text-blue-300 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-400"
                >
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <option key={num} value={num} className="bg-neutral-900 text-white">
                      {num} {num === 1 ? "карусел" : "карусела"} {num === 1 ? "(по подразбиране)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-semibold text-muted-foreground">График:</span>
                <div className="inline-flex rounded-lg border border-border/50 bg-black/40 p-0.5">
                  <button
                    type="button"
                    onClick={() => setCarouselSchedule("now")}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                      carouselSchedule === "now" ? "bg-blue-500 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    ⚡ Генерирай Сега
                  </button>
                  <button
                    type="button"
                    onClick={() => setCarouselSchedule("scheduled")}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                      carouselSchedule === "scheduled" ? "bg-blue-500 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    📅 Планирай
                  </button>
                </div>
                {carouselSchedule === "scheduled" && (
                  <input
                    type="datetime-local"
                    value={carouselScheduleDate}
                    onChange={(e) => setCarouselScheduleDate(e.target.value)}
                    className="bg-black/60 border border-blue-500/40 rounded-lg px-2 py-1 text-xs text-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer"
                  />
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              if (carouselCount === 0) {
                toast.error("Избрани са 0 карусела. Моля, изберете брой от 1 до 10!");
                return;
              }
              handleNextCarouselQuickAction();
            }}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-3 text-xs font-bold text-white shadow-lg hover:from-blue-400 hover:to-blue-500 transition shrink-0 cursor-pointer self-stretch sm:self-auto"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Генериране...
              </>
            ) : (
              <>
                <ImageIcon className="size-4" /> {carouselCount === 0 ? "Избрани са 0 карусела" : "Създай Таухид Карусел"}
              </>
            )}
          </button>
        </div>

        {/* Batch Plan Suggestion Quick Toolbar */}
        <div className="rounded-2xl border border-teal-500/30 bg-gradient-to-r from-teal-500/10 via-emerald-500/5 to-transparent p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-teal-400 font-bold text-sm">
              <Brain className="size-4" /> ИНТЕЛИГЕНТЕН ПЛАН ЗА ВАЙРЪЛ ВИДЕА (Коран, Хадиси & TikTok)
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              AI изготвя план с разнородни теми за одобрение. Избери брой идеи (0-10) и график за предлагане:
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-2.5">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-muted-foreground">Брой:</span>
                <select
                  value={planBatchCount}
                  onChange={(e) => setPlanBatchCount(Number(e.target.value))}
                  className="bg-black/60 border border-teal-500/40 rounded-lg px-2 py-1 text-xs font-bold text-teal-300 cursor-pointer focus:outline-none focus:ring-1 focus:ring-teal-400"
                >
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <option key={num} value={num} className="bg-neutral-900 text-white">
                      {num} {num === 1 ? "идея" : "идеи"} {num === 1 ? "(по подразбиране)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-semibold text-muted-foreground">График:</span>
                <div className="inline-flex rounded-lg border border-border/50 bg-black/40 p-0.5">
                  <button
                    type="button"
                    onClick={() => setPlanSchedule("now")}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                      planSchedule === "now" ? "bg-teal-500 text-black shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    ⚡ Генерирай Сега
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlanSchedule("scheduled")}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                      planSchedule === "scheduled" ? "bg-teal-500 text-black shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    📅 Планирай
                  </button>
                </div>
                {planSchedule === "scheduled" && (
                  <input
                    type="datetime-local"
                    value={planScheduleDate}
                    onChange={(e) => setPlanScheduleDate(e.target.value)}
                    className="bg-black/60 border border-teal-500/40 rounded-lg px-2 py-1 text-xs text-teal-300 focus:outline-none focus:ring-1 focus:ring-teal-400 cursor-pointer"
                  />
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (planBatchCount === 0) {
                toast.error("Избрани са 0 идеи. Моля, изберете брой от 1 до 10!");
                return;
              }
              handleBatchSuggest(planBatchCount);
            }}
            disabled={viralLoading || loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 px-5 py-3 text-xs font-bold text-black shadow-lg hover:from-teal-400 hover:to-emerald-500 transition shrink-0 cursor-pointer self-stretch sm:self-auto"
          >
            {viralLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Изготвяне...
              </>
            ) : (
              <>
                <Brain className="size-4" /> 📋 {planBatchCount === 0 ? "Избрани са 0 идеи" : `Изготви План за ${planBatchCount} ${planBatchCount === 1 ? "Идея" : "Идеи"}`}
              </>
            )}
          </button>
        </div>
      </div>

      <div className="mb-3 sm:mb-4 flex items-center gap-2 overflow-x-auto pb-1.5 max-w-full">
        <span className="text-xs font-semibold text-muted-foreground mr-1 shrink-0">⚡ Бързи TikTok идеи:</span>
        <Button
          variant="outline"
          size="sm"
          onClick={handleNextQuranQuickAction}
          className="rounded-full text-xs cursor-pointer shrink-0 glass hover:bg-primary/10 border-primary/40 text-foreground transition flex items-center gap-1.5 shadow-sm"
          title="Генерирай нов неповторен аят от Корана"
        >
          <BookOpen className="size-3.5 text-primary" />
          <span>📖 Вирален Коран</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleNextHadithQuickAction}
          className="rounded-full text-xs cursor-pointer shrink-0 glass hover:bg-amber-500/10 border-amber-500/40 text-foreground transition flex items-center gap-1.5 shadow-sm"
          title="Генерирай нов неповторен Сахих Хадис"
        >
          <ScrollText className="size-3.5 text-amber-400" />
          <span>📜 Вирални Хадиси</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setPrompt("Направи кратко вирусна TikTok видео идея за Хадис № 1 на Навауи (намеренията)");
          }}
          className="rounded-full text-xs cursor-pointer shrink-0"
        >
          🌟 Хадис за намеренията (TikTok 9:16)
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setPrompt("Направи TikTok видео за Сура Ал-Ихляс (112:1-4) със спокоен фон");
          }}
          className="rounded-full text-xs cursor-pointer shrink-0"
        >
          📖 Сура Ал-Ихляс
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setPrompt("Направи TikTok видео за Аят Алкарси (Сура 2 аят 255)");
          }}
          className="rounded-full text-xs cursor-pointer shrink-0"
        >
          📖 Аят ал-Курси
        </Button>
      </div>

      <Card className="glass-card flex h-[500px] md:h-[640px] max-h-[70vh] flex-1 flex-col overflow-hidden border border-border/80 shadow-lg">
        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${
                m.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {m.role === "assistant" && (
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Sparkles className="size-4" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/80 text-foreground"
                }`}
              >
                <div className="whitespace-pre-line">{m.text}</div>

                {m.proposal && (
                  <div className="mt-4 rounded-xl border border-primary/30 bg-card/90 p-4 shadow-sm space-y-3">
                    <div className="flex items-center justify-between border-b border-border/50 pb-2">
                      <div className="flex items-center gap-2 font-semibold text-primary">
                        <Video className="size-4" />
                        <span>Предложение за видео</span>
                      </div>
                      <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary">
                        Очаква одобрение
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div>
                        <span className="font-semibold text-muted-foreground">Заглавие: </span>
                        <span className="font-medium text-foreground">{cleanProposalTitle(m.proposal.title)}</span>
                      </div>

                      {m.proposal.type !== "carousel" && (
                        <div className="rounded-md bg-amber-500/10 border border-amber-500/25 px-2.5 py-1.5 text-xs text-amber-300 flex items-center justify-between gap-2">
                          <span className="font-semibold text-amber-400">🏷️ Горе на видеото ще пише:</span>
                          <span className="font-bold text-white bg-black/40 px-2 py-0.5 rounded border border-amber-500/30">
                            {extractTopic(m.proposal)}
                          </span>
                        </div>
                      )}

                      {m.proposal.type === 'carousel' && m.proposal.carouselSlides && (
                        <div className="mt-4 flex flex-col gap-3">
                          <div className="text-sm font-medium text-amber-400 mb-1">📸 КАРУСЕЛ (4 СЛАЙДА)</div>
                          <div className="grid grid-cols-2 gap-3">
                            {m.proposal.carouselSlides.map((slide, i) => (
                              <div key={i} className="rounded-lg border border-border/40 bg-black/40 p-3 text-xs">
                                <div className="font-bold text-amber-300 mb-1">Слайд {i+1}</div>
                                <div className="text-white/90 mb-1">{slide.topTitle}</div>
                                <div className="text-white/60 truncate">{slide.mainText}</div>
                                <div className="mt-2 text-[10px] text-teal-400/70 italic">AI Prompt: {slide.imagePrompt}</div>
                              </div>
                            ))}
                          </div>
                          <CarouselRendererButton slides={m.proposal.carouselSlides} title={cleanProposalTitle(m.proposal.title)} />
                        </div>
                      )}

                      {m.proposal.type !== "carousel" && (
                        <>
                          {m.proposal.type === 'explained_video' ? (
                            <div className="mt-2.5 mb-3 rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3.5 space-y-2.5">
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs">
                                <Sparkles className="size-3.5" /> 🎬 4-СТЕПЕНЕН WORKFLOW С ОБЯСНЕНИЕ
                              </div>

                              {m.proposal.scriptWorkflow ? (
                                <div className="space-y-2 text-xs">
                                  {m.proposal.scriptWorkflow.hookQuestion && (
                                    <div className="p-2.5 rounded-lg bg-black/40 border border-amber-500/20">
                                      <div className="font-semibold text-white/95">„{cleanScriptPrefixes(m.proposal.scriptWorkflow.hookQuestion)}“</div>
                                      {m.proposal.scriptWorkflow.hookContext && (
                                        <div className="text-white/70 mt-0.5">{cleanScriptPrefixes(m.proposal.scriptWorkflow.hookContext)}</div>
                                      )}
                                    </div>
                                  )}

                                  <div className="p-2.5 rounded-lg bg-black/40 border border-teal-500/20">
                                    <div className="font-bold text-teal-300 flex items-center gap-1 mb-1">
                                      <span>📖 Свещен цитат</span>
                                    </div>
                                    {m.proposal.scriptWorkflow.dalilText ? (
                                      <div className="font-medium text-white/90">„{cleanScriptPrefixes(m.proposal.scriptWorkflow.dalilText)}“</div>
                                    ) : (
                                      <div className="font-semibold text-primary">{m.proposal.title}</div>
                                    )}
                                  </div>

                                  <div className="p-2.5 rounded-lg bg-black/40 border border-sky-500/20">
                                    <div className="font-bold text-sky-300 flex items-center gap-1 mb-1">
                                      <span>💡 Обяснение:</span>
                                    </div>
                                    <div className="text-white/90">{stripScholarAttribution(m.proposal.scriptWorkflow.explanation)}</div>
                                  </div>

                                  <div className="p-2.5 rounded-lg bg-black/40 border border-emerald-500/30">
                                    <div className="font-bold text-emerald-300 flex items-center gap-1 mb-1">
                                      <span>
                                        {detectActionOrDuaLabel(m.proposal.scriptWorkflow.actionStep) === "Дуа"
                                          ? "🤍 Дуа:"
                                          : "⚡ Действие:"}
                                      </span>
                                    </div>
                                    <div className="text-emerald-100/90 font-medium">
                                      {cleanScriptPrefixes(m.proposal.scriptWorkflow.actionStep)}
                                    </div>
                                  </div>

                                  {m.proposal.scriptWorkflow.sourceScholar && (
                                    <div
                                      className={`rounded-lg p-2.5 space-y-1.5 ${
                                        m.proposal.scriptWorkflow.sourceType === "salafi_ai"
                                          ? "bg-amber-950/30 border border-amber-500/30"
                                          : "bg-emerald-950/40 border border-emerald-500/30"
                                      }`}
                                    >
                                      <div className="flex items-center justify-between gap-2 flex-wrap">
                                        <div
                                          className={`flex items-center gap-1.5 text-[11px] font-bold ${
                                            m.proposal.scriptWorkflow.sourceType === "salafi_ai"
                                              ? "text-amber-400"
                                              : "text-emerald-400"
                                          }`}
                                        >
                                          {m.proposal.scriptWorkflow.sourceType === "salafi_ai" ? (
                                            <Sparkles className="size-3.5 text-amber-400 shrink-0" />
                                          ) : (
                                            <ShieldCheck className="size-3.5 text-emerald-400 shrink-0" />
                                          )}
                                          <span>
                                            {m.proposal.scriptWorkflow.sourceType === "salafi_ai"
                                              ? "Разяснение от:"
                                              : "Проверен източник:"}
                                          </span>
                                          <span className="text-white font-semibold">
                                            {m.proposal.scriptWorkflow.sourceScholar}
                                          </span>
                                        </div>
                                        {m.proposal.scriptWorkflow.sourceWork && (
                                          <span
                                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                                              m.proposal.scriptWorkflow.sourceType === "salafi_ai"
                                                ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                                                : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                                            }`}
                                          >
                                            {m.proposal.scriptWorkflow.sourceWork}
                                          </span>
                                        )}
                                      </div>
                                      {m.proposal.scriptWorkflow.sourceText && (
                                        <details className="group mt-1">
                                          <summary
                                            className={`text-[10px] cursor-pointer select-none font-medium flex items-center gap-1 ${
                                              m.proposal.scriptWorkflow.sourceType === "salafi_ai"
                                                ? "text-amber-400/90 hover:text-amber-300"
                                                : "text-emerald-400/90 hover:text-emerald-300"
                                            }`}
                                          >
                                            <span>
                                              {m.proposal.scriptWorkflow.sourceType === "salafi_ai"
                                                ? "🌿 Виж разяснението и поуката от Salafi AI"
                                                : "📜 Виж автентичния оригинален текст от базата данни"}
                                            </span>
                                          </summary>
                                          <div
                                            className={`mt-1.5 p-2 rounded bg-black/50 border text-[11px] text-white/85 leading-relaxed italic max-h-36 overflow-y-auto whitespace-pre-wrap ${
                                              m.proposal.scriptWorkflow.sourceType === "salafi_ai"
                                                ? "border-amber-500/20"
                                                : "border-emerald-500/20"
                                            }`}
                                          >
                                            „{m.proposal.scriptWorkflow.sourceText}“
                                          </div>
                                        </details>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                m.proposal.summaryBg && (
                                  <div className="text-xs">
                                    <span className="font-semibold text-emerald-400">Обяснение: </span>
                                    <span className="text-foreground">{stripScholarAttribution(m.proposal.summaryBg)}</span>
                                  </div>
                                )
                              )}
                            </div>
                          ) : (
                            m.proposal.summaryBg && (
                              <div>
                                <span className="font-semibold text-muted-foreground">Съдържание: </span>
                                <span className="text-foreground">{m.proposal.summaryBg}</span>
                              </div>
                            )
                          )}
                      {m.proposal.themeBg && (
                        <div>
                          <span className="font-semibold text-muted-foreground">Визуална атмосфера: </span>
                          <span className="text-foreground">{m.proposal.themeBg}</span>
                        </div>
                      )}
                      <div>
                        <span className="font-semibold text-muted-foreground">Стил на текста: </span>
                        <span className="font-medium text-primary">
                          {m.proposal.tiktokTheme === "emerald"
                            ? "🌿 Ислямски Изумруд (Emerald Glow)"
                            : m.proposal.tiktokTheme === "neon"
                            ? "🔥 Динамичен Неон (Neon Cyan)"
                            : m.proposal.tiktokTheme === "classic"
                            ? "⚪ Класически Бял (Classic Crisp)"
                            : "🌟 Златно Караоке (Hormozi Gold)"}
                        </span>
                      </div>
                      {m.proposal.useBRoll && (
                        <div>
                          <span className="font-semibold text-muted-foreground">🎬 B-Roll: </span>
                          <span className="text-foreground">
                            Сменящи се кадри{m.proposal.bRollInterval ? ` на всеки ${m.proposal.bRollInterval}s` : ""}
                          </span>
                        </div>
                      )}
                      {m.proposal.subtitlePosition && m.proposal.subtitlePosition !== "middle" && (
                        <div>
                          <span className="font-semibold text-muted-foreground">📍 Субтитри: </span>
                          <span className="text-foreground">
                            {m.proposal.subtitlePosition === "bottom" ? "Отдолу" : "Долна третина"}
                          </span>
                        </div>
                      )}
                      {m.proposal.quality && m.proposal.quality !== "high" && (
                        <div>
                          <span className="font-semibold text-muted-foreground">📐 Качество: </span>
                          <span className="text-foreground">{m.proposal.quality}</span>
                        </div>
                      )}
                        </>
                      )}
                    </div>

                    {m.proposal.type !== "carousel" && (
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/40 mt-3">
                        {m.isRejected ? (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold">
                            <Trash2 className="size-3.5" /> Отказано и записано в Историята (30 дни пауза)
                          </div>
                        ) : (
                          <>
                            {/* Step-by-Step Approval ("Едно по Едно") Primary Buttons */}
                            <Button
                              size="sm"
                              onClick={() => handleConfirmProposal(m.proposal!, idx)}
                              disabled={confirmingIdx !== null || rejectingIdx !== null}
                              className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-md cursor-pointer transition px-4 py-2 text-xs"
                              title="Потвърди предложението и стартирай фоновото рендиране"
                            >
                              {confirmingIdx === idx ? (
                                <>
                                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                                  Генерира се...
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="size-3.5 mr-1.5" />
                                  ✅ Съгласи се / Одобри
                                </>
                              )}
                            </Button>

                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRejectAndSuggestAlternative(m.proposal!, idx)}
                              disabled={confirmingIdx !== null || rejectingIdx !== null}
                              className="rounded-xl font-bold shadow-md cursor-pointer transition px-3.5 py-2 text-xs"
                              title="Откажи това предложение, запиши го в Историята и предложи алтернатива"
                            >
                              {rejectingIdx === idx ? (
                                <>
                                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                                  Търсене...
                                </>
                              ) : (
                                <>
                                  <Trash2 className="size-3.5 mr-1.5" />
                                  ❌ Откажи / Предложи друг
                                </>
                              )}
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRejectOnly(m.proposal!, idx)}
                              disabled={confirmingIdx !== null || rejectingIdx !== null}
                              className="rounded-xl font-semibold border-red-500/40 text-red-400 hover:bg-red-500/10 cursor-pointer transition px-3 py-2 text-xs"
                              title="Само откажи предложението и го запиши в Историята (30 дни пауза) без ново предложение"
                            >
                              <X className="size-3.5 mr-1" />
                              Само Откажи
                            </Button>
                          </>
                        )}

                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            localStorage.setItem("edit_proposal", JSON.stringify({ ...m.proposal!, autoGenerate: true }));
                            navigate({ to: "/create" });
                          }}
                          disabled={confirmingIdx !== null || rejectingIdx !== null}
                          className="rounded-xl text-xs font-semibold cursor-pointer"
                          title="Прегледай точния текст, аудио и видео преди рендиране"
                        >
                          <Pencil className="size-3.5 mr-1.5" />
                          Прегледай и Редактирай
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPrompt("Искам да променим следното в предложението: ")}
                          className="rounded-xl text-xs cursor-pointer"
                        >
                          <Pencil className="size-3.5 mr-1" />
                          Промени нещо
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => handleCopyTikTokCaption(m.proposal!.title, m.proposal!.summaryBg, e, m.proposal!.scriptWorkflow)}
                          className="rounded-xl text-xs border-teal-500/40 text-teal-400 hover:bg-teal-500/10 cursor-pointer"
                          title="Копирай TikTok Заглавие & Описание"
                        >
                          <Copy className="size-3.5 mr-1" />
                          TikTok Текст
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => handleDownloadThumbnail(m.proposal!.title, e)}
                          disabled={generatingThumbTitle === m.proposal!.title}
                          className="rounded-xl text-xs border-amber-500/40 text-amber-400 hover:bg-amber-500/10 cursor-pointer"
                          title="Свали професионална корица за видеото"
                        >
                          {generatingThumbTitle === m.proposal!.title ? <Loader2 className="size-3.5 mr-1 animate-spin" /> : <ImageIcon className="size-3.5 mr-1" />}
                          Корица
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {m.proposals && Array.isArray(m.proposals) && m.proposals.length > 0 && (
                  <div className="mt-4 rounded-xl border border-teal-500/40 bg-card/95 p-4 shadow-md space-y-3">
                    <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
                      <div className="flex items-center gap-2 font-bold text-teal-400">
                        <Sparkles className="size-4" />
                        <span>План с {m.proposals.length} вайръл предложения за одобрение</span>
                      </div>
                      <span className="rounded-full bg-teal-500/15 px-3 py-0.5 text-xs font-semibold text-teal-300 border border-teal-500/30">
                        Очаква твоето одобрение
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Отбележи с чекбокс (☑️) идеите, които искаш да генерираме, и натисни бутона за групово одобрение:
                    </p>

                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {m.proposals.map((prop, propIdx) => {
                        const selectedIndices = m.selectedProposalIndices || m.proposals!.map((_, i) => i);
                        const isChecked = selectedIndices.includes(propIdx);

                        return (
                          <div
                            key={propIdx}
                            onClick={() => handleToggleProposalCheckbox(idx, propIdx)}
                            className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer ${
                              isChecked
                                ? "bg-teal-500/10 border-teal-500/40 text-foreground shadow-sm"
                                : "bg-muted/40 border-border/50 text-muted-foreground opacity-60 hover:opacity-90"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}} // handled by parent div onClick
                              className="mt-1 size-4 rounded border-teal-500 text-teal-500 focus:ring-teal-500 cursor-pointer"
                            />
                            <div className="flex-1 text-xs space-y-1">
                              <div className="font-bold text-sm flex items-center gap-2 flex-wrap">
                                <span className="text-teal-400">#{propIdx + 1}.</span>
                                <span>{cleanProposalTitle(prop.title)}</span>
                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-black/40 border border-border">
                                  {prop.type === "hadith" ? "📖 Сахих Хадис" : "📖 Коран / Тренд"}
                                </span>
                                {prop.scriptWorkflow?.sourceScholar && (
                                  <span
                                    className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${
                                      prop.scriptWorkflow.sourceType === "salafi_ai"
                                        ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                                        : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                    }`}
                                  >
                                    {prop.scriptWorkflow.sourceType === "salafi_ai" ? (
                                      <Sparkles className="size-3 text-amber-400 shrink-0" />
                                    ) : (
                                      <ShieldCheck className="size-3 text-emerald-400 shrink-0" />
                                    )}
                                    {prop.scriptWorkflow.sourceScholar}
                                  </span>
                                )}
                              </div>
                              {prop.summaryBg && <p className="text-muted-foreground">{prop.summaryBg}</p>}
                              <div className="flex flex-wrap gap-3 text-[11px] text-amber-400/90 pt-0.5">
                                <span>🎨 {prop.themeBg || "Кино фон"}</span>
                                <span>⚡ Стил: {prop.tiktokTheme || "hormozi"}</span>
                              </div>
                              <div className="flex items-center gap-1.5 pt-1.5 border-t border-border/30 mt-1" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={(e) => handleCopyTikTokCaption(prop.title, prop.summaryBg, e)}
                                  className="inline-flex items-center gap-1 rounded-md bg-teal-500/10 px-2 py-1 text-[11px] font-medium text-teal-400 hover:bg-teal-500/20 border border-teal-500/30 transition cursor-pointer"
                                  title="Копирай TikTok Заглавие и Описание с хаштагове"
                                >
                                  <Copy className="size-3" /> TikTok Текст
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleDownloadThumbnail(prop.title, e)}
                                  disabled={generatingThumbTitle === prop.title}
                                  className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-1 text-[11px] font-medium text-amber-400 hover:bg-amber-500/20 border border-amber-500/30 transition cursor-pointer"
                                  title="Свали професионална 9:16 корица за това видео"
                                >
                                  {generatingThumbTitle === prop.title ? <Loader2 className="size-3 animate-spin" /> : <ImageIcon className="size-3" />}
                                  Корица
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    localStorage.setItem("edit_proposal", JSON.stringify({ ...prop, autoGenerate: true }));
                                    navigate({ to: "/create" });
                                  }}
                                  className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-2 py-1 text-[11px] font-medium text-blue-400 hover:bg-blue-500/20 border border-blue-500/30 transition cursor-pointer"
                                  title="Прегледай точния текст, аудио и видео преди рендиране"
                                >
                                  <Pencil className="size-3" /> Редактирай
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
                      <Button
                        size="default"
                        onClick={() => handleApproveBatchProposals(idx)}
                        disabled={confirmingIdx !== null}
                        className="w-full sm:w-auto flex-1 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 text-black font-bold shadow-lg hover:from-teal-400 hover:to-emerald-500 cursor-pointer py-5 text-sm"
                      >
                        {confirmingIdx === idx ? (
                          <>
                            <Loader2 className="size-4 mr-2 animate-spin" />
                            Генериране на избраните видеа...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="size-4 mr-2" />
                            🎬 Генерирай избраните ({(m.selectedProposalIndices || m.proposals.map((_, i) => i)).length}) видеа в Изтегляния (за преглед/сваляне)
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {m.jobId && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/40 pt-3">
                    <Link
                      to="/downloads"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/90 transition"
                    >
                      <Download className="size-3.5" />
                      Отвори Изтегляния
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleCopyTikTokCaption(m.proposal ? m.proposal.title : "Ислямско видео")}
                      className="inline-flex items-center gap-1 rounded-lg border border-teal-500/40 bg-teal-500/10 px-2.5 py-1.5 text-xs font-medium text-teal-400 hover:bg-teal-500/20 transition cursor-pointer"
                    >
                      <Copy className="size-3" /> TikTok Текст
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadThumbnail(m.proposal ? m.proposal.title : "Ислямско видео")}
                      disabled={generatingThumbTitle === (m.proposal ? m.proposal.title : "Ислямско видео")}
                      className="inline-flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-xs font-medium text-amber-400 hover:bg-amber-500/20 transition cursor-pointer"
                    >
                      {generatingThumbTitle === (m.proposal ? m.proposal.title : "Ислямско видео") ? <Loader2 className="size-3 animate-spin" /> : <ImageIcon className="size-3" />}
                      Корица
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Loader2 className="size-4 animate-spin" />
              </div>
              <div className="rounded-2xl bg-muted/80 px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                Асистентът мисли и подготвя предложение...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form
          onSubmit={handleSend}
          className="flex items-center gap-2 border-t border-border/60 bg-card/60 p-4"
        >
          <Input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Напр.: Направи видео за търпението или Хадис № 5 на Навауи..."
            className="flex-1 rounded-xl"
            disabled={loading}
          />
          <Button
            type="submit"
            disabled={!prompt.trim() || loading}
            className="rounded-xl px-5"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </form>
      </Card>
    </div>
  );
}
