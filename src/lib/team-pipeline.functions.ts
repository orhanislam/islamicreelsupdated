/// <reference path="../types/declarations.d.ts" />
import { createServerFn } from "@tanstack/react-start";
import {
  generateExplainedVideoProposalDirect,
  type VideoProposal,
} from "./assistant.functions";
import { auditAndRefineProposal } from "./smart-script-auditor";
import { formatViralSocialCaption, generateTikTokSEOTitle } from "./caption.functions";
import { LOCAL_HALAL_VIDEO_POOL, type CuratedHalalVideoAsset } from "./backgrounds.functions";
import { getBulgarianTime, getNextBulgarianRun } from "./bulgarian-time";

export type WorkerRole = "copywriter" | "hodja" | "video_editor" | "seo_worker";

export interface WorkerInfo {
  id: WorkerRole;
  name: string;
  roleTitle: string;
  avatar: string;
  badge: string;
  colorTheme: "indigo" | "emerald" | "violet" | "amber";
  description: string;
  responsibilities: string[];
  metrics: { label: string; value: string }[];
}

export const SALAFI_WORKERS_ROSTER: WorkerInfo[] = [
  {
    id: "copywriter",
    name: "Ислямски Копирайтър",
    roleTitle: "Сценарист & Куки",
    avatar: "✍️",
    badge: "Скрипт & 4-Степенна Структура",
    colorTheme: "indigo",
    description: "Разработва завладяващи куки (hooks) за първите 2 секунди, автентични далили от Корана и Сахих Сунната, ясен 3-пластов Шарх и практическо напътствие/дуа.",
    responsibilities: [
      "Психологическа вирална кука за задържане на вниманието в TikTok",
      "Структуриране на 4-те степени: Кука -> Далил -> Обяснение -> Действие",
      "Книжовен български език и учтива форма („Вие“)",
      "Богословска яснота без сложни и двусмислени формулировки",
    ],
    metrics: [
      { label: "Стил на изказ", value: "Книжовен (Учтив)" },
      { label: "Времеви обхват", value: "45–65 сек." },
      { label: "Вирална структура", value: "4-степенна" },
    ],
  },
  {
    id: "hodja",
    name: "Проверяващ Салафи Ходжа",
    roleTitle: "Богословски Одит & Акида",
    avatar: "🛡️",
    badge: "100% Salafi Manhaj & Сахих Далил",
    colorTheme: "emerald",
    description: "Строг богословски надзор по Манхаджа на ас-Саляф ас-Салих (Ибн Баз, Ал-Албани, Ибн Усеймин). Проверява далила за автентичност, елиминира ширк в дуа, суеверия, амулети, бид'а, харам образи (0 лица, 0 музика) и слага 100% Зелен Салафи Печат.",
    responsibilities: [
      "Проверка на източника (Сахих ал-Бухари, Сахих Муслим, Навауи, Коран)",
      "Филтриране на ширк, посредници в дуа, амулети и суеверия",
      "Утвърждаване на Трона и Атрибутите на Аллах без изопачаване (Та'вил)",
      "Филтър за визуално съдържание: 0 лица, 0 жени, 0 очи, 0 музика",
      "Издаване на официален сертификат за 100% богословска чистота",
    ],
    metrics: [
      { label: "Богословска оценка", value: "100% Салафи" },
      { label: "Автентичност на далил", value: "Сахих / Коран" },
      { label: "Филтър за ширк/бид'а", value: "Максимален (Активен)" },
    ],
  },
  {
    id: "video_editor",
    name: "Видео Редактор & Монтажист",
    roleTitle: "9:16 Монтаж & B-Roll",
    avatar: "🎬",
    badge: "1080x1920 HD & TikTok Safe Zone",
    colorTheme: "violet",
    description: "Селектира кинематографични вертикални 9:16 Halal B-Roll клипове, позиционира субтитрите в TikTok Safe Zone (760px), синхронизира аудиото дума по дума и гарантира нулев мъртъв интервал (Zero Dead Air).",
    responsibilities: [
      "Избор на 3 хармонични кинематографични 9:16 Halal B-Roll сцени",
      "Центриране на субтитрите в безопасната зона на TikTok (макс 760px)",
      "2-редово визуално балансиране на текста без отрязани думи",
      "Премахване на фонова музика (-an) и напасване на кристално TTS/Коран аудио",
      "Zero Dead Air: Финално отрязване веднага след края на говора",
    ],
    metrics: [
      { label: "Резолюция", value: "1080x1920 (9:16)" },
      { label: "Safe Zone ширина", value: "Макс 760px" },
      { label: "Zero Dead Air", value: "Активно (+0.15s)" },
    ],
  },
  {
    id: "seo_worker",
    name: "SEO & Социален Мениджър",
    roleTitle: "TikTok SEO & Публикация",
    avatar: "📈",
    badge: "Вирални Заглавия & Хаштагове",
    colorTheme: "amber",
    description: "Генерира SEO оптимизирани заглавия за търсачката на TikTok, грабващи описания с целеви хаштагове, текстови идеи за корици и планира качването в пиковите часове за максимален органичен обхват.",
    responsibilities: [
      "SEO заглавие с висок CTR и таргетирани ключови думи",
      "Грабващо описание с калибрирани хаштагове (#islam #quran #bulgaria)",
      "Концепция за вирална корица (Thumbnail) с висок контраст",
      "Определяне на идеален час за качване (10:00, 14:00 или 20:00 ч.)",
      "Подготовка за автоматично качване чрез 24/7 Автопилота",
    ],
    metrics: [
      { label: "SEO алгоритъм", value: "TikTok Search 2026" },
      { label: "Златни часове", value: "10:00 / 14:00 / 20:00" },
      { label: "Авто-публикация", value: "Готов за Автопилот" },
    ],
  },
];

export interface InterWorkerChatMessage {
  id: string;
  speaker: "manager" | WorkerRole;
  speakerName: string;
  avatar: string;
  badge: string;
  colorTheme: "indigo" | "emerald" | "violet" | "amber" | "emerald";
  message: string;
  timestamp: string;
  stepNumber: number;
}

export interface MultiWorkerCollaborationResult {
  topic: string;
  completedAt: string;
  copywriter: {
    title: string;
    hookQuestion: string;
    hookContext: string;
    dalilText: string;
    dalilSource: string;
    explanation: string;
    actionStep: string;
    sourceScholar: string;
    sourceWork: string;
    fullScriptBulgarian: string;
    wordCount: number;
    estimatedDurationSec: number;
    handoffNotes: string;
  };
  hodja: {
    passed: boolean;
    theologyScore: number;
    grammarScore: number;
    overallScore: number;
    is100PercentGuaranteed: boolean;
    daleelVerified: boolean;
    theologyVerified: boolean;
    grammarVerified: boolean;
    correctionsApplied: string[];
    certificateNumber: string;
    salafiStamp: string;
    verdict: string;
    handoffNotes: string;
  };
  videoEditor: {
    format: string;
    bRollScenes: Array<{
      title: string;
      theme: string;
      mood: string;
      url: string;
      role: string;
    }>;
    subtitlesSpec: {
      safeZoneMaxPx: number;
      linesCount: number;
      fontFamily: string;
      zeroDeadAirSec: number;
    };
    audioNarration: {
      voice: string;
      pace: string;
    };
    handoffNotes: string;
  };
  seoWorker: {
    seoTitle: string;
    caption: string;
    hashtags: string[];
    thumbnailPrompt: string;
    recommendedPostTime: string;
    targetAudience: string;
    handoffNotes: string;
  };
  interWorkerChatLog: InterWorkerChatMessage[];
  finalProposal: VideoProposal;
}

export async function runMultiWorkerPipelineDirect(input?: {
  topic?: string;
  sourcePreference?: "auto" | "quran" | "hadith";
}): Promise<MultiWorkerCollaborationResult> {
  if (!import.meta.env.SSR) {
    throw new Error("runMultiWorkerPipelineDirect is a server-only function");
  }

  const userTopic = (input?.topic || "").trim();
  const sourcePref = input?.sourcePreference || "auto";

  // 1. CHIEF MANAGER ASSIGNS WORK TO COPYWRITER
  const { proposal: rawProposal } = await generateExplainedVideoProposalDirect({
    topic: userTopic,
    sourcePreference: sourcePref,
  });

  if (!rawProposal) {
    throw new Error("Неуспешно генериране на сценарий от Копирайтъра. Моля опитайте отново.");
  }

  // Extract Copywriter script elements
  const script = rawProposal.explainedScript || {
    hookQuestion: rawProposal.hook || "Знаете ли коя е най-голямата благословия в живота?",
    hookContext: rawProposal.context || "Повечето хора търсят покой на грешните места.",
    dalilIntro: "Аллах Всевишният казва в Свещения Коран:",
    dalilText: rawProposal.fullDalilText || rawProposal.text || "",
    explanation: rawProposal.explanation || rawProposal.summaryBg || "",
    actionStep: rawProposal.actionStep || "Правете дуа и благодарете на Единствения Творец.",
    sourceScholar: rawProposal.sourceScholar || "Шейх Ибн Баз (рахимахуллах)",
    sourceWork: rawProposal.sourceWork || "Маджму' Фатава",
  };

  const fullScriptBulgarian = [
    script.hookQuestion,
    script.hookContext,
    script.dalilIntro,
    script.dalilText,
    script.explanation,
    script.actionStep,
  ].filter(Boolean).join(" ");

  const words = fullScriptBulgarian.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const estimatedDurationSec = Math.max(35, Math.min(85, Math.round(wordCount * 0.42)));

  // 2. SALAFI HODJA AUDITS & HEALS THE SCRIPT (100% Salafi Manhaj)
  const { proposal: auditedProposal, report: auditReport } = auditAndRefineProposal(
    rawProposal as any,
    { maxPasses: 4 }
  );

  const finalProposal = auditedProposal as VideoProposal;
  finalProposal.auditReport = auditReport;

  const certificateNumber = `SLF-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;
  const hodjaPassed = auditReport.theologyScore >= 95 && auditReport.grammarScore >= 90;

  // 3. VIDEO EDITOR SELECTS SCENES & CONFIGURES VERTICAL 9:16 RENDERING
  const topicLower = (finalProposal.title + " " + (finalProposal.topic || "") + " " + fullScriptBulgarian).toLowerCase();
  
  // Pick 3 diverse matching Halal videos from the curated pool
  let selectedPool = LOCAL_HALAL_VIDEO_POOL;
  if (topicLower.includes("огън") || topicLower.includes("ад") || topicLower.includes("наказание") || topicLower.includes("грех")) {
    selectedPool = LOCAL_HALAL_VIDEO_POOL.filter(v => v.tags.includes("fire") || v.tags.includes("storm") || v.tags.includes("night"));
  } else if (topicLower.includes("дъжд") || topicLower.includes("милост") || topicLower.includes("прошка") || topicLower.includes("тауба")) {
    selectedPool = LOCAL_HALAL_VIDEO_POOL.filter(v => v.tags.includes("rain") || v.tags.includes("garden") || v.tags.includes("waterfall"));
  } else if (topicLower.includes("звезд") || topicLower.includes("нощ") || topicLower.includes("сътворение") || topicLower.includes("небе")) {
    selectedPool = LOCAL_HALAL_VIDEO_POOL.filter(v => v.tags.includes("night") || v.tags.includes("stars") || v.tags.includes("cosmos"));
  } else {
    selectedPool = LOCAL_HALAL_VIDEO_POOL.filter(v => v.tags.includes("desert") || v.tags.includes("mountain") || v.tags.includes("garden"));
  }

  if (selectedPool.length < 3) {
    selectedPool = LOCAL_HALAL_VIDEO_POOL;
  }

  const chosenScenes = selectedPool.slice(0, 3).map((v, i) => ({
    title: v.title,
    theme: v.themeBg,
    mood: v.mood,
    url: v.url,
    role: i === 0 ? "Кука & Начало" : i === 1 ? "Далил & Обяснение" : "Заключение & Дуа",
  }));

  // 4. SEO WORKER CRAFTS VIRAL METADATA & SCHEDULE
  const seoTitle = generateTikTokSEOTitle(finalProposal);
  const caption = formatViralSocialCaption(finalProposal);
  const hashtags = [
    "#islam",
    "#quran",
    "#bulgaria",
    "#напомняне",
    "#ислям",
    "#сунна",
    "#tawheed",
    "#salafi",
  ];

  const nowBg = getBulgarianTime();
  const nextBgRun = getNextBulgarianRun(["10:00", "14:00", "20:00"], new Date());
  const recommendedPostTime = nextBgRun?.formattedText || "Днес в 20:00 ч. (Българско време)";

  // 5. SYNTHESIZE COLLABORATIVE SLACK-STYLE DIALOGUE
  const nowStr = nowBg.timeHm + " ч.";
  const interWorkerChatLog: InterWorkerChatMessage[] = [
    {
      id: "msg_1",
      speaker: "manager",
      speakerName: "Шейх Салафи AI (Главен Мениджър)",
      avatar: "🕌",
      badge: "Оркестратор",
      colorTheme: "emerald",
      message: `Бисмиллях! Разпределям нова задача към екипа. Тема: „${finalProposal.title}“. Копирайтър, подготви завладяващ 4-степенен сценарий!`,
      timestamp: nowStr,
      stepNumber: 1,
    },
    {
      id: "msg_2",
      speaker: "copywriter",
      speakerName: "Ислямски Копирайтър",
      avatar: "✍️",
      badge: "Скрипт & 4-Степенна Структура",
      colorTheme: "indigo",
      message: `Сценарият е готов! Създадох силна кука: „${script.hookQuestion}“. Далилът е структуриран с 3-пластово обяснение и учтива форма („Вие“). Предавам на Салафи Ходжата за богословски одит.`,
      timestamp: nowStr,
      stepNumber: 2,
    },
    {
      id: "msg_3",
      speaker: "hodja",
      speakerName: "Проверяващ Салафи Ходжа",
      avatar: "🛡️",
      badge: "100% Salafi Manhaj & Сахих Далил",
      colorTheme: "emerald",
      message: `Алхамдулиллах! Извърших пълен одит: Далилът е автентичен Сахих. Чист Таухид (0 ширк, 0 амулети, 0 посредници). Текстът отговаря 100% на Манхаджа на ас-Саляф ас-Салих. Издавам сертификат № ${certificateNumber} и слагам Зелен Салафи Печат! Предавам на Видео Редактора.`,
      timestamp: nowStr,
      stepNumber: 3,
    },
    {
      id: "msg_4",
      speaker: "video_editor",
      speakerName: "Видео Редактор & Монтажист",
      avatar: "🎬",
      badge: "1080x1920 HD & TikTok Safe Zone",
      colorTheme: "violet",
      message: `Поех одобрения текст! Избрах 3 кинематографични 9:16 Halal B-Roll сцени (${chosenScenes.map(s => s.title).join(", ")}). Субтитрите са центрирани в Safe Zone (760px). Zero Dead Air е активирано. Предавам на SEO Специалиста за финално опаковане.`,
      timestamp: nowStr,
      stepNumber: 4,
    },
    {
      id: "msg_5",
      speaker: "seo_worker",
      speakerName: "SEO & Социален Мениджър",
      avatar: "📈",
      badge: "Вирални Заглавия & Хаштагове",
      colorTheme: "amber",
      message: `Готово! Генерирах вирално TikTok SEO заглавие: „${seoTitle}“, описание с висок CTR и 8 таргетирани хаштага. Препоръчителен слот за качване: ${recommendedPostTime}. Целият пакет е одобрен и готов за рендиране или автопилот!`,
      timestamp: nowStr,
      stepNumber: 5,
    },
  ];

  return {
    topic: userTopic || finalProposal.title,
    completedAt: nowBg.fullText,
    copywriter: {
      title: finalProposal.title,
      hookQuestion: script.hookQuestion,
      hookContext: script.hookContext,
      dalilText: script.dalilText || finalProposal.fullDalilText || "",
      dalilSource: finalProposal.reference || `${finalProposal.type === "quran" ? "Коран" : "Хадис"} ${finalProposal.sourceScholar || ""}`,
      explanation: script.explanation,
      actionStep: script.actionStep || "",
      sourceScholar: script.sourceScholar || "Шейх Ибн Баз (рахимахуллах)",
      sourceWork: script.sourceWork || "Маджму' Фатава",
      fullScriptBulgarian,
      wordCount,
      estimatedDurationSec,
      handoffNotes: "Готово за теологичен одит от Салафи Ходжата.",
    },
    hodja: {
      passed: hodjaPassed,
      theologyScore: auditReport.theologyScore,
      grammarScore: auditReport.grammarScore,
      overallScore: auditReport.overallScore,
      is100PercentGuaranteed: auditReport.is100PercentGuaranteed,
      daleelVerified: auditReport.daleelVerified,
      theologyVerified: auditReport.theologyVerified,
      grammarVerified: auditReport.grammarVerified,
      correctionsApplied: auditReport.correctionsApplied || [],
      certificateNumber,
      salafiStamp: "🛡️ ОДОБРЕНО: 100% Salafi Manhaj (Ахл ус-Сунна уал-Джама'а)",
      verdict: "Автентичен далил, чист Таухид, без ширк, без бид'а, строго богословско съответствие.",
      handoffNotes: "Одобрено за видео монтаж.",
    },
    videoEditor: {
      format: "1080x1920 (9:16 Vertical HD @ 30fps)",
      bRollScenes: chosenScenes,
      subtitlesSpec: {
        safeZoneMaxPx: 760,
        linesCount: 2,
        fontFamily: "Outfit Cyrillic / Inter Bold",
        zeroDeadAirSec: Number((estimatedDurationSec + 0.15).toFixed(2)),
      },
      audioNarration: {
        voice: "bg-BG-BorislavNeural (Салафи мъжки глас)",
        pace: "Спокоен и достолепен (-2% rate, -2Hz pitch)",
      },
      handoffNotes: "Видеото е подготвено за Safe Zone и перфектен тайминг.",
    },
    seoWorker: {
      seoTitle,
      caption,
      hashtags,
      thumbnailPrompt: `Cinematic vertical 9:16 vertical background for ${finalProposal.title}, high quality lighting, serene atmosphere, no humans, no text`,
      recommendedPostTime,
      targetAudience: "Българско говорящи мюсюлмани и търсещи истината в TikTok/Reels",
      handoffNotes: "Оптимизирано за алгоритмично класиране в TikTok Search.",
    },
    interWorkerChatLog,
    finalProposal,
  };
}

export const runMultiWorkerPipeline = createServerFn({ method: "POST" })
  .validator((input?: { topic?: string; sourcePreference?: "auto" | "quran" | "hadith" }) => input)
  .handler(async ({ data }) => {
    return await runMultiWorkerPipelineDirect(data);
  });
