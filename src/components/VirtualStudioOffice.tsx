import React, { useState, useEffect } from "react";
import {
  SALAFI_WORKERS_ROSTER,
  runMultiWorkerPipeline,
  type WorkerRole,
  type MultiWorkerCollaborationResult,
  type InterWorkerChatMessage,
} from "@/lib/team-pipeline.functions";
import { confirmAndGenerateVideo, auditCustomText100Percent } from "@/lib/assistant.functions";
import { LOCAL_HALAL_VIDEO_POOL } from "@/lib/backgrounds.functions";
import { copyToClipboardFallback } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Users,
  Sparkles,
  ShieldCheck,
  Video,
  TrendingUp,
  FileText,
  CheckCircle2,
  Clock,
  ArrowRight,
  Send,
  Loader2,
  Copy,
  ExternalLink,
  Play,
  RotateCcw,
  Sliders,
  Layers,
  ChevronRight,
  Eye,
  Check,
  Monitor,
  Maximize2,
  Volume2,
  Headphones,
  BookOpen,
  Award,
  Zap,
} from "lucide-react";

interface VirtualStudioOfficeProps {
  onStartRender?: (proposal: any) => void;
  className?: string;
}

type DeskId = "director" | "copywriter" | "hodja" | "video_editor" | "seo_worker";

export function VirtualStudioOffice({ onStartRender, className = "" }: VirtualStudioOfficeProps) {
  const [selectedDesk, setSelectedDesk] = useState<DeskId | "overview">("overview");
  const [topicInput, setTopicInput] = useState<string>("");
  const [isProducing, setIsProducing] = useState<boolean>(false);
  const [activeStep, setActiveStep] = useState<number>(0); // 0: Idle, 1: Copywriter, 2: Hodja, 3: Video Editor, 4: SEO Worker, 5: Complete
  const [pipelineResult, setPipelineResult] = useState<MultiWorkerCollaborationResult | null>(null);

  // Auto-focus on active desk during production
  useEffect(() => {
    if (!isProducing) return;
    if (activeStep === 1) setSelectedDesk("copywriter");
    else if (activeStep === 2) setSelectedDesk("hodja");
    else if (activeStep === 3) setSelectedDesk("video_editor");
    else if (activeStep === 4) setSelectedDesk("seo_worker");
    else if (activeStep === 5) setSelectedDesk("director");
  }, [activeStep, isProducing]);

  const handleStartProduction = async (overrideTopic?: string) => {
    const topicToUse = overrideTopic || topicInput || "Чистият Таухид и покой на сърцето";
    setIsProducing(true);
    setPipelineResult(null);
    setActiveStep(1);

    try {
      const stepTimer1 = setTimeout(() => setActiveStep(2), 2200);
      const stepTimer2 = setTimeout(() => setActiveStep(3), 4400);
      const stepTimer3 = setTimeout(() => setActiveStep(4), 6600);

      const res = await runMultiWorkerPipeline({
        data: {
          topic: topicToUse,
          sourcePreference: "auto",
        },
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);

      setPipelineResult(res);
      setActiveStep(5);
      toast.success("Всички работници в офиса приключиха успешно! Резултатът е готов при Директора 🏆");
    } catch (err: any) {
      toast.error(err?.message || "Грешка при изпълнение на продукцията в студиото.");
      setActiveStep(0);
      setSelectedDesk("overview");
    } finally {
      setIsProducing(false);
    }
  };

  const handleCopyPackage = () => {
    if (!pipelineResult) return;
    const pkg = `🎬 Nur Studio [Виртуално AI Студио]
────────────────────────────────────────
📌 Заглавие: ${pipelineResult.seoWorker.seoTitle}
🛡️ Одит на Салафи Ходжата: ${pipelineResult.hodja.salafiStamp} (Сертификат № ${pipelineResult.hodja.certificateNumber})
⏳ Препоръчителен час: ${pipelineResult.seoWorker.recommendedPostTime}

📜 СЦЕНАРИЙ (Копирайтър):
${pipelineResult.copywriter.hookQuestion}
${pipelineResult.copywriter.hookContext}
${pipelineResult.copywriter.dalilText} (${pipelineResult.copywriter.dalilSource})
${pipelineResult.copywriter.explanation}
${pipelineResult.copywriter.actionStep}

📱 TIKTOK ОПИСАНИЕ И ХАШТАГОВЕ:
${pipelineResult.seoWorker.caption}
${pipelineResult.seoWorker.hashtags.join(" ")}
────────────────────────────────────────`;
    copyToClipboardFallback(pkg);
    toast.success("Целият пакет е копиран в клипборда! 📋");
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Studio Header & Camera Switcher */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-neutral-950 via-neutral-900 to-emerald-950/60 p-4 sm:p-5 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300">
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Офис на Живо • Nur Studio AI HQ</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>🏢</span> Виртуално Работно Студио
            </h2>
            <p className="text-xs text-neutral-300 max-w-xl">
              Вижте в реално време как специалистите седят по бюрата си, комуникират помежду си и трансформират всяка богословска тема в завършено 9:16 видео.
            </p>
          </div>

          {/* Camera View Switcher */}
          <div className="flex flex-wrap items-center gap-1.5 bg-neutral-900/90 border border-neutral-700/80 p-1.5 rounded-xl text-xs">
            <span className="text-[10px] uppercase font-bold text-neutral-400 px-2 font-mono">Камера:</span>
            <button
              type="button"
              onClick={() => setSelectedDesk("overview")}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                selectedDesk === "overview"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-800"
              }`}
            >
              🔭 Пълен Офис
            </button>
            <button
              type="button"
              onClick={() => setSelectedDesk("director")}
              className={`px-2 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                selectedDesk === "director"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-800"
              }`}
            >
              🕌 Директор
            </button>
            <button
              type="button"
              onClick={() => setSelectedDesk("copywriter")}
              className={`px-2 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                selectedDesk === "copywriter"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-800"
              }`}
            >
              ✍️ Копирайтър
            </button>
            <button
              type="button"
              onClick={() => setSelectedDesk("hodja")}
              className={`px-2 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                selectedDesk === "hodja"
                  ? "bg-emerald-700 text-white shadow-sm"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-800"
              }`}
            >
              🛡️ Салафи Ходжа
            </button>
            <button
              type="button"
              onClick={() => setSelectedDesk("video_editor")}
              className={`px-2 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                selectedDesk === "video_editor"
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-800"
              }`}
            >
              🎬 Монтажист
            </button>
            <button
              type="button"
              onClick={() => setSelectedDesk("seo_worker")}
              className={`px-2 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                selectedDesk === "seo_worker"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-800"
              }`}
            >
              📈 SEO
            </button>
          </div>
        </div>

        {/* Quick Launch Control Bar */}
        <div className="mt-4 pt-3 border-t border-neutral-800 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
          <Input
            value={topicInput}
            onChange={(e) => setTopicInput(e.target.value)}
            placeholder="Задайте тема на офиса (напр. 'Сабр при изпитания', 'Сура Ал-Ихляс', 'Истигфар')..."
            className="h-10 text-xs rounded-xl bg-neutral-900/90 border-neutral-700 text-white placeholder:text-neutral-500"
            disabled={isProducing}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isProducing) {
                handleStartProduction();
              }
            }}
          />
          <Button
            onClick={() => handleStartProduction()}
            disabled={isProducing}
            className="h-10 px-5 text-xs font-bold rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 text-white shadow-lg shadow-emerald-700/20 shrink-0 cursor-pointer hover:scale-[1.02] transition-transform"
          >
            {isProducing ? (
              <span className="flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                <span>Работниците изпълняват...</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Play className="size-3.5 fill-current" />
                <span>Пусни Производство в Офиса</span>
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* 2D VIRTUAL STUDIO OFFICE FLOOR PLAN */}
      <div className="relative rounded-3xl border-2 border-emerald-900/60 bg-gradient-to-b from-[#111613] via-[#0d120f] to-[#080b09] p-4 sm:p-8 shadow-2xl overflow-hidden min-h-[580px]">
        {/* Ambient Floor Rugs & Atmospheric Perspective Grid */}
        <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px]" />
        
        {/* Persian Rug in the Center */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[520px] h-[220px] sm:h-[300px] rounded-2xl border border-amber-600/30 bg-amber-950/15 pointer-events-none shadow-inner opacity-40">
          <div className="w-full h-full border border-dashed border-amber-500/20 rounded-xl m-1 flex items-center justify-center font-arabic text-amber-500/20 text-4xl select-none">
            بِسْمِ ٱللَّٰهِ
          </div>
        </div>

        {/* Dynamic Glowing Data Flow Pipelines connecting the desks */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
          <defs>
            <linearGradient id="pipelineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.6" />
              <stop offset="33%" stopColor="#10b981" stopOpacity="0.6" />
              <stop offset="66%" stopColor="#8b5cf6" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.6" />
            </linearGradient>
          </defs>
          {/* Animated Connecting Pathways between desks */}
          <path
            d="M 220 380 Q 250 200 480 140"
            fill="none"
            stroke="url(#pipelineGrad)"
            strokeWidth="2"
            strokeDasharray="6 6"
            className={isProducing && activeStep >= 1 ? "animate-pulse" : "opacity-30"}
          />
          <path
            d="M 480 140 Q 600 140 760 180"
            fill="none"
            stroke="url(#pipelineGrad)"
            strokeWidth="2"
            strokeDasharray="6 6"
            className={isProducing && activeStep >= 2 ? "animate-pulse" : "opacity-30"}
          />
          <path
            d="M 760 180 Q 760 320 720 400"
            fill="none"
            stroke="url(#pipelineGrad)"
            strokeWidth="2"
            strokeDasharray="6 6"
            className={isProducing && activeStep >= 3 ? "animate-pulse" : "opacity-30"}
          />
          <path
            d="M 720 400 Q 500 440 480 280"
            fill="none"
            stroke="url(#pipelineGrad)"
            strokeWidth="2"
            strokeDasharray="6 6"
            className={isProducing && activeStep >= 4 ? "animate-pulse" : "opacity-30"}
          />
        </svg>

        {/* DESKS GRID CONTAINER */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 items-center justify-items-center">

          {/* DESK 1: ✍️ БЮРО НА КОПИРАЙТЪРА (Left / West Station) */}
          <div
            onClick={() => setSelectedDesk("copywriter")}
            className={`group relative w-full max-w-[340px] rounded-2xl border p-4 sm:p-5 transition-all duration-300 cursor-pointer ${
              selectedDesk === "copywriter"
                ? "border-indigo-500 bg-indigo-950/40 ring-4 ring-indigo-500/30 scale-105 shadow-2xl z-20"
                : "border-indigo-500/30 bg-neutral-900/80 hover:border-indigo-400 hover:bg-neutral-900"
            } ${activeStep === 1 ? "ring-2 ring-indigo-400 shadow-indigo-500/40 animate-pulse" : ""}`}
          >
            {/* Status Pill */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase">
                {activeStep === 1 ? "✍️ Пише кука..." : "Бюро 1: Копирайтър"}
              </span>
              <span className={`size-2 rounded-full ${activeStep === 1 ? "bg-indigo-400 animate-ping" : "bg-indigo-400"}`} />
            </div>

            {/* VISUAL ILLUSTRATION: Worker Seated at Desk */}
            <div className="relative h-44 rounded-xl bg-gradient-to-b from-indigo-950/30 to-black/60 border border-indigo-500/20 p-2 overflow-hidden flex flex-col justify-end items-center">
              {/* Wall Corkboard with 4-step sticky notes */}
              <div className="absolute top-2 left-2 right-2 h-10 border border-indigo-500/20 rounded bg-indigo-950/20 flex items-center justify-around px-1 text-[9px] font-mono text-indigo-300/80">
                <span className="bg-indigo-500/30 px-1 rounded">1. Hook</span>
                <span className="bg-emerald-500/30 px-1 rounded text-emerald-300">2. Dalil</span>
                <span className="bg-amber-500/30 px-1 rounded text-amber-300">3. Sharh</span>
                <span className="bg-teal-500/30 px-1 rounded text-teal-300">4. Action</span>
              </div>

              {/* Seated Character Avatar */}
              <div className="relative z-10 flex flex-col items-center">
                {/* Speech Bubble when active */}
                <div className="mb-1 rounded-lg bg-indigo-600 text-white px-2 py-1 text-[10px] font-bold shadow-md animate-bounce text-center max-w-[200px] truncate">
                  {pipelineResult?.copywriter.hookQuestion || "„Търсите ли покой за сърцето?“"}
                </div>
                {/* Character Head & Shoulders */}
                <div className="size-12 rounded-full bg-gradient-to-b from-indigo-400 to-indigo-700 border-2 border-indigo-200 flex items-center justify-center text-xl shadow-lg">
                  <span>✍️</span>
                </div>
                {/* Ergonomic Office Chair Back */}
                <div className="w-16 h-3 bg-neutral-800 rounded-t-lg -mt-1 border border-neutral-700" />
              </div>

              {/* Wooden Desk Surface with Equipment */}
              <div className="relative z-20 w-full h-14 bg-gradient-to-t from-neutral-800 to-neutral-700 rounded-t-xl border-t-2 border-amber-600/60 p-1 flex items-center justify-around shadow-md">
                {/* Open Laptop with glowing screen */}
                <div className="w-16 h-10 bg-indigo-950 border border-indigo-400 rounded-t flex flex-col items-center justify-center p-0.5 shadow-lg">
                  <div className="w-full h-full bg-indigo-900/60 rounded flex items-center justify-center text-[7px] font-mono text-indigo-200">
                    SCRIPT 9:16
                  </div>
                  <div className="w-20 h-1 bg-neutral-600 rounded-b mt-0.5" />
                </div>
                {/* Brass Desk Lamp */}
                <div className="size-6 rounded-full bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-xs shadow-amber-400/20 shadow-md">
                  💡
                </div>
                {/* Stack of Hadith books & Coffee Cup */}
                <div className="flex items-center gap-1">
                  <span className="text-xs">☕</span>
                  <span className="text-xs">📚</span>
                </div>
              </div>
            </div>

            {/* Bottom Desk Label */}
            <div className="mt-3 text-xs space-y-1">
              <div className="flex items-center justify-between font-bold">
                <span className="text-white">Ислямски Копирайтър</span>
                <span className="text-indigo-400 text-[10px] font-mono">4-степенен сценарист</span>
              </div>
              <p className="text-[11px] text-neutral-400 line-clamp-1">
                Генерира първите 2 сек. кука, далил, обяснение и дуа.
              </p>
            </div>
          </div>

          {/* DESK 2: 🕌 КАБИНЕТ НА ДИРЕКТОРА (Center North / Executive Desk) */}
          <div
            onClick={() => setSelectedDesk("director")}
            className={`group relative w-full max-w-[340px] rounded-2xl border p-4 sm:p-5 transition-all duration-300 cursor-pointer ${
              selectedDesk === "director"
                ? "border-emerald-400 bg-emerald-950/40 ring-4 ring-emerald-500/30 scale-105 shadow-2xl z-20"
                : "border-emerald-500/40 bg-neutral-900/80 hover:border-emerald-300 hover:bg-neutral-900"
            } ${activeStep === 5 ? "ring-2 ring-emerald-300 shadow-emerald-500/50" : ""}`}
          >
            {/* Status Pill */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                Главна Дирекция
              </span>
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            {/* VISUAL ILLUSTRATION: Director Seated at Executive Desk */}
            <div className="relative h-44 rounded-xl bg-gradient-to-b from-emerald-950/30 to-black/60 border border-emerald-500/20 p-2 overflow-hidden flex flex-col justify-end items-center">
              {/* Islamic Arch Backdrop on wall */}
              <div className="absolute top-1 w-24 h-20 border-2 border-emerald-500/30 rounded-t-full flex items-center justify-center text-emerald-400/40 font-arabic text-xl pointer-events-none">
                نور
              </div>

              {/* Seated Director Avatar */}
              <div className="relative z-10 flex flex-col items-center">
                {/* Speech Bubble */}
                <div className="mb-1 rounded-lg bg-emerald-700 text-white px-2 py-1 text-[10px] font-bold shadow-md text-center max-w-[210px] truncate">
                  {pipelineResult ? "„Целият пакет е одобрен за рендиране!“" : "„Оркестрирам 4-членния екип.“"}
                </div>
                {/* Sheikh Head */}
                <div className="size-12 rounded-full bg-gradient-to-b from-emerald-300 to-emerald-700 border-2 border-amber-300 flex items-center justify-center text-xl shadow-lg">
                  <span>🕌</span>
                </div>
                {/* Director Leather Chair */}
                <div className="w-18 h-3.5 bg-neutral-900 rounded-t-lg -mt-1 border border-amber-600/40" />
              </div>

              {/* Executive Mahogany Desk with Golden Microphone & Quran */}
              <div className="relative z-20 w-full h-14 bg-gradient-to-t from-amber-950 to-amber-900 rounded-t-xl border-t-2 border-amber-400 p-1 flex items-center justify-around shadow-md">
                {/* Studio Broadcast Microphone */}
                <div className="flex flex-col items-center">
                  <div className="size-4 rounded-full bg-amber-400/40 border border-amber-300 flex items-center justify-center text-[8px]">
                    🎙️
                  </div>
                  <div className="w-1 h-3 bg-neutral-700" />
                </div>
                {/* Master Monitoring Screen */}
                <div className="w-20 h-10 bg-emerald-950 border border-emerald-400 rounded flex flex-col items-center justify-center text-[7px] font-mono text-emerald-200">
                  <span>NUR HQ 100%</span>
                  <span className="text-amber-300 text-[6px]">4 WORKERS LIVE</span>
                </div>
                {/* Classical Tea Glass & Misbaha */}
                <div className="flex items-center gap-1">
                  <span className="text-xs">🫖</span>
                  <span className="text-xs">📿</span>
                </div>
              </div>
            </div>

            {/* Bottom Desk Label */}
            <div className="mt-3 text-xs space-y-1">
              <div className="flex items-center justify-between font-bold">
                <span className="text-white">Шейх Салафи AI</span>
                <span className="text-emerald-400 text-[10px] font-mono">Главен Мениджър</span>
              </div>
              <p className="text-[11px] text-neutral-400 line-clamp-1">
                Разпределя задачите, координира и пуска финалния рендер.
              </p>
            </div>
          </div>

          {/* DESK 3: 🛡️ БЮРО НА САЛАФИ ХОДЖАТА (Right / East Station) */}
          <div
            onClick={() => setSelectedDesk("hodja")}
            className={`group relative w-full max-w-[340px] rounded-2xl border p-4 sm:p-5 transition-all duration-300 cursor-pointer ${
              selectedDesk === "hodja"
                ? "border-emerald-600 bg-emerald-950/40 ring-4 ring-emerald-600/30 scale-105 shadow-2xl z-20"
                : "border-emerald-600/30 bg-neutral-900/80 hover:border-emerald-500 hover:bg-neutral-900"
            } ${activeStep === 2 ? "ring-2 ring-emerald-400 shadow-emerald-600/40 animate-pulse" : ""}`}
          >
            {/* Status Pill */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                {activeStep === 2 ? "🛡️ Проверява далил..." : "Бюро 2: Салафи Ходжа"}
              </span>
              <span className={`size-2 rounded-full ${activeStep === 2 ? "bg-emerald-400 animate-ping" : "bg-emerald-400"}`} />
            </div>

            {/* VISUAL ILLUSTRATION: Scholar Seated at Cedar Wood Desk */}
            <div className="relative h-44 rounded-xl bg-gradient-to-b from-emerald-950/30 to-black/60 border border-emerald-500/20 p-2 overflow-hidden flex flex-col justify-end items-center">
              {/* Certificate & Salafi Manhaj Seal on wall */}
              <div className="absolute top-2 right-2 border border-emerald-500/40 rounded px-1.5 py-0.5 bg-emerald-950/40 text-[8px] font-mono text-emerald-300 flex items-center gap-1">
                <span>🛡️</span> 100% Salafi Seal
              </div>

              {/* Seated Scholar Avatar */}
              <div className="relative z-10 flex flex-col items-center">
                {/* Speech Bubble */}
                <div className="mb-1 rounded-lg bg-emerald-800 text-white px-2 py-1 text-[10px] font-bold shadow-md text-center max-w-[200px] truncate">
                  {pipelineResult?.hodja.salafiStamp || "„Далилът е 100% Сахих. Одобрено!“"}
                </div>
                {/* Scholar Head */}
                <div className="size-12 rounded-full bg-gradient-to-b from-emerald-300 to-emerald-800 border-2 border-emerald-200 flex items-center justify-center text-xl shadow-lg">
                  <span>🛡️</span>
                </div>
                {/* Scholar Chair */}
                <div className="w-16 h-3 bg-neutral-800 rounded-t-lg -mt-1 border border-neutral-700" />
              </div>

              {/* Carved Wooden Desk with Quran Holder & Stamp Pad */}
              <div className="relative z-20 w-full h-14 bg-gradient-to-t from-neutral-800 to-neutral-700 rounded-t-xl border-t-2 border-emerald-600/70 p-1 flex items-center justify-around shadow-md">
                {/* Classical Rihal (Quran Holder) */}
                <div className="w-10 h-8 border border-emerald-500/40 rounded flex items-center justify-center text-[10px] bg-emerald-950/60">
                  📖
                </div>
                {/* Authentic Hadith Books (Bukhari / Muslim) */}
                <div className="flex flex-col items-center">
                  <div className="w-12 h-2 bg-emerald-800 rounded -mb-0.5" />
                  <div className="w-14 h-2 bg-emerald-900 rounded" />
                  <span className="text-[6px] font-mono text-emerald-300">САХИХ СУННА</span>
                </div>
                {/* Green Stamp Seal Pad */}
                <div className="size-6 rounded-full bg-emerald-500/30 border border-emerald-400 flex items-center justify-center text-[10px] shadow-sm">
                  🟢
                </div>
              </div>
            </div>

            {/* Bottom Desk Label */}
            <div className="mt-3 text-xs space-y-1">
              <div className="flex items-center justify-between font-bold">
                <span className="text-white">Проверяващ Салафи Ходжа</span>
                <span className="text-emerald-400 text-[10px] font-mono">100% Акида Одит</span>
              </div>
              <p className="text-[11px] text-neutral-400 line-clamp-1">
                Филтрира ширк, суеверия, амулети и издава сертификат.
              </p>
            </div>
          </div>

          {/* DESK 4: 🎬 МОНТАЖНО СТУДИО НА ВИДЕО РЕДАКТОРА (South-West Station) */}
          <div
            onClick={() => setSelectedDesk("video_editor")}
            className={`group relative w-full max-w-[340px] rounded-2xl border p-4 sm:p-5 transition-all duration-300 cursor-pointer ${
              selectedDesk === "video_editor"
                ? "border-violet-500 bg-violet-950/40 ring-4 ring-violet-500/30 scale-105 shadow-2xl z-20"
                : "border-violet-500/30 bg-neutral-900/80 hover:border-violet-400 hover:bg-neutral-900"
            } ${activeStep === 3 ? "ring-2 ring-violet-400 shadow-violet-500/40 animate-pulse" : ""}`}
          >
            {/* Status Pill */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 uppercase">
                {activeStep === 3 ? "🎬 Монтира 9:16..." : "Бюро 3: Видео Монтажист"}
              </span>
              <span className={`size-2 rounded-full ${activeStep === 3 ? "bg-violet-400 animate-ping" : "bg-violet-400"}`} />
            </div>

            {/* VISUAL ILLUSTRATION: Video Editor with Dual Curved Monitors & Headphones */}
            <div className="relative h-44 rounded-xl bg-gradient-to-b from-violet-950/30 to-black/60 border border-violet-500/20 p-2 overflow-hidden flex flex-col justify-end items-center">
              {/* Sound Waveform Visualizer on wall */}
              <div className="absolute top-2 left-3 right-3 h-6 flex items-center justify-between gap-1 opacity-40">
                {[4, 12, 18, 8, 22, 16, 26, 14, 8, 20, 15, 10, 24, 6, 18, 12].map((h, i) => (
                  <div key={i} className="w-1.5 bg-violet-400 rounded-full" style={{ height: `${h}px` }} />
                ))}
              </div>

              {/* Seated Editor Avatar with Over-Ear Headphones */}
              <div className="relative z-10 flex flex-col items-center">
                {/* Speech Bubble */}
                <div className="mb-1 rounded-lg bg-violet-700 text-white px-2 py-1 text-[10px] font-bold shadow-md text-center max-w-[200px] truncate">
                  {pipelineResult ? "„3 Halal сцени в Safe Zone 760px!“" : "„Нагласям аудио тайминга и Safe Zone.“"}
                </div>
                {/* Editor Head with Studio Headphones */}
                <div className="size-12 rounded-full bg-gradient-to-b from-violet-400 to-violet-800 border-2 border-violet-200 flex items-center justify-center text-xl shadow-lg relative">
                  <span>🎬</span>
                  <div className="absolute -inset-1 border-2 border-violet-300/60 rounded-full pointer-events-none" />
                </div>
                {/* Gaming/Studio Chair */}
                <div className="w-16 h-3 bg-neutral-800 rounded-t-lg -mt-1 border border-violet-500/40" />
              </div>

              {/* Video Suite Desk with Dual Vertical 9:16 Monitors */}
              <div className="relative z-20 w-full h-14 bg-gradient-to-t from-neutral-800 to-neutral-700 rounded-t-xl border-t-2 border-violet-500 p-1 flex items-center justify-around shadow-md">
                {/* Vertical Monitor 1: Halal B-Roll Preview */}
                <div className="w-10 h-11 bg-black border border-violet-400 rounded flex flex-col items-center justify-center text-[6px] font-mono text-violet-300">
                  <span>9:16 HD</span>
                  <span className="text-[9px]">🏔️</span>
                </div>
                {/* Vertical Monitor 2: Subtitle Waveform */}
                <div className="w-10 h-11 bg-black border border-violet-400 rounded flex flex-col items-center justify-center text-[6px] font-mono text-violet-300">
                  <span>SAFE</span>
                  <span className="text-emerald-400 text-[6px]">760px</span>
                </div>
                {/* Editing Soundboard & Mouse */}
                <div className="flex items-center gap-1">
                  <span className="text-xs">🎛️</span>
                  <span className="text-xs">🖱️</span>
                </div>
              </div>
            </div>

            {/* Bottom Desk Label */}
            <div className="mt-3 text-xs space-y-1">
              <div className="flex items-center justify-between font-bold">
                <span className="text-white">Видео Редактор</span>
                <span className="text-violet-400 text-[10px] font-mono">1080x1920 30fps</span>
              </div>
              <p className="text-[11px] text-neutral-400 line-clamp-1">
                Подбира Halal сцени, центрира субтитрите в Safe Zone.
              </p>
            </div>
          </div>

          {/* DESK 5: 📈 БЮРО НА SEO & СОЦИАЛНИЯ МЕНИДЖЪР (South-East Station) */}
          <div
            onClick={() => setSelectedDesk("seo_worker")}
            className={`group relative w-full max-w-[340px] rounded-2xl border p-4 sm:p-5 transition-all duration-300 cursor-pointer ${
              selectedDesk === "seo_worker"
                ? "border-amber-500 bg-amber-950/40 ring-4 ring-amber-500/30 scale-105 shadow-2xl z-20"
                : "border-amber-500/30 bg-neutral-900/80 hover:border-amber-400 hover:bg-neutral-900"
            } ${activeStep === 4 ? "ring-2 ring-amber-400 shadow-amber-500/40 animate-pulse" : ""}`}
          >
            {/* Status Pill */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                {activeStep === 4 ? "📈 Оптимизира SEO..." : "Бюро 4: SEO Специалист"}
              </span>
              <span className={`size-2 rounded-full ${activeStep === 4 ? "bg-amber-400 animate-ping" : "bg-amber-400"}`} />
            </div>

            {/* VISUAL ILLUSTRATION: SEO Strategist with Smartphones & Analytics Graph */}
            <div className="relative h-44 rounded-xl bg-gradient-to-b from-amber-950/30 to-black/60 border border-amber-500/20 p-2 overflow-hidden flex flex-col justify-end items-center">
              {/* Whiteboard with Trending Hashtags on wall */}
              <div className="absolute top-2 left-2 right-2 border border-amber-500/30 rounded bg-amber-950/30 px-2 py-0.5 text-[8px] font-mono text-amber-300 flex items-center justify-between">
                <span>#islam #quran #bulgaria</span>
                <span className="text-emerald-400 font-bold">▲ +480%</span>
              </div>

              {/* Seated SEO Specialist Avatar */}
              <div className="relative z-10 flex flex-col items-center">
                {/* Speech Bubble */}
                <div className="mb-1 rounded-lg bg-amber-600 text-white px-2 py-1 text-[10px] font-bold shadow-md text-center max-w-[200px] truncate">
                  {pipelineResult?.seoWorker.seoTitle || "„Високо CTR заглавие и златни часове!“"}
                </div>
                {/* SEO Specialist Head */}
                <div className="size-12 rounded-full bg-gradient-to-b from-amber-300 to-amber-700 border-2 border-amber-200 flex items-center justify-center text-xl shadow-lg">
                  <span>📈</span>
                </div>
                {/* Modern Chair */}
                <div className="w-16 h-3 bg-neutral-800 rounded-t-lg -mt-1 border border-neutral-700" />
              </div>

              {/* Modern Glass Desk with Smartphone Test Stands & Analytics Tablet */}
              <div className="relative z-20 w-full h-14 bg-gradient-to-t from-neutral-800 to-neutral-700 rounded-t-xl border-t-2 border-amber-500 p-1 flex items-center justify-around shadow-md">
                {/* Vertical Smartphone Dock (TikTok Feed) */}
                <div className="w-7 h-11 bg-black border border-amber-400 rounded flex flex-col items-center justify-center text-[5px] text-amber-200 font-mono">
                  <span>TIKTOK</span>
                  <span className="text-[7px]">📱</span>
                </div>
                {/* Analytics Tablet with Growth Curve */}
                <div className="w-14 h-9 bg-neutral-900 border border-amber-400 rounded flex flex-col items-center justify-center text-[6px] text-amber-300 font-mono">
                  <span>SEARCH 2026</span>
                  <span className="text-emerald-400 font-bold">10:00 / 20:00</span>
                </div>
                {/* Energy Drink & Stylus */}
                <div className="flex items-center gap-1">
                  <span className="text-xs">⚡</span>
                  <span className="text-xs">🖊️</span>
                </div>
              </div>
            </div>

            {/* Bottom Desk Label */}
            <div className="mt-3 text-xs space-y-1">
              <div className="flex items-center justify-between font-bold">
                <span className="text-white">SEO & Социален Мениджър</span>
                <span className="text-amber-400 text-[10px] font-mono">TikTok Search</span>
              </div>
              <p className="text-[11px] text-neutral-400 line-clamp-1">
                Генерира SEO заглавие, хаштагове и определя часове.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* DETAILED WORKSTATION MODAL / CLOSE-UP VIEW (when a desk is clicked) */}
      {selectedDesk !== "overview" && (
        <Card className="border border-border/80 bg-neutral-900/90 p-5 space-y-4 rounded-2xl shadow-xl animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl">
                {selectedDesk === "director" && "🕌"}
                {selectedDesk === "copywriter" && "✍️"}
                {selectedDesk === "hodja" && "🛡️"}
                {selectedDesk === "video_editor" && "🎬"}
                {selectedDesk === "seo_worker" && "📈"}
              </span>
              <div>
                <h3 className="text-base font-bold text-white">
                  {selectedDesk === "director" && "Кабинет на Главния Директор (Шейх Салафи AI)"}
                  {selectedDesk === "copywriter" && "Работно Бюро на Ислямския Копирайтър"}
                  {selectedDesk === "hodja" && "Работно Бюро на Проверяващия Салафи Ходжа"}
                  {selectedDesk === "video_editor" && "Монтажен Пулт на Видео Редактора"}
                  {selectedDesk === "seo_worker" && "Работно Бюро на SEO & Социалния Мениджър"}
                </h3>
                <span className="text-xs text-neutral-400">
                  {selectedDesk === "director" && "Координира целия екип, следи сървърния рендер и управлява 24/7 Автопилота."}
                  {selectedDesk === "copywriter" && "Генерира 4-степенния вирален сценарий с емоционална кука и ясен Шарх."}
                  {selectedDesk === "hodja" && "100% Salafi Manhaj одит, проверка на далила, филтър за ширк/суеверия и Зелен Печат."}
                  {selectedDesk === "video_editor" && "Селекция на 9:16 Halal B-Roll клипове, субтитри в Safe Zone 760px и Zero Dead Air."}
                  {selectedDesk === "seo_worker" && "TikTok SEO алгоритъм, хаштагове, вирално заглавие и планиране на графика."}
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDesk("overview")}
              className="rounded-xl text-xs font-bold border-neutral-700 text-neutral-300 hover:text-white cursor-pointer"
            >
              ← Обратно към Офиса
            </Button>
          </div>

          {/* Workstation Specific Content */}
          {selectedDesk === "copywriter" && (
            <div className="space-y-3 text-xs">
              <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-3.5 space-y-2">
                <span className="font-bold text-indigo-300 uppercase tracking-wider text-[11px] font-mono block">
                  Активен Монитор на Копирайтъра:
                </span>
                <p className="text-neutral-200 leading-relaxed font-sans">
                  {pipelineResult?.copywriter.fullScriptBulgarian ||
                    "„Знаете ли защо сърцето се чувства неспокойно? Аллах Всевишният ни разкрива в Корана тайната на истинския мир. Когато помните Единствения Творец, тревогите избледняват. Направете дуа днес и потърсете Неговата милост!“"}
                </p>
                <div className="flex gap-2 text-[10px] text-indigo-300/80 pt-1 border-t border-indigo-500/20 font-mono">
                  <span>Думи: {pipelineResult?.copywriter.wordCount || 38}</span>
                  <span>•</span>
                  <span>Време: ~{pipelineResult?.copywriter.estimatedDurationSec || 45} сек.</span>
                  <span>•</span>
                  <span>Структура: 4-степенна (Кука → Далил → Шарх → Дуа)</span>
                </div>
              </div>
            </div>
          )}

          {selectedDesk === "hodja" && (
            <div className="space-y-3 text-xs">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-300 uppercase tracking-wider text-[11px] font-mono block">
                    Официален Богословски Сертификат:
                  </span>
                  <span className="font-mono text-emerald-400 font-bold">
                    № {pipelineResult?.hodja.certificateNumber || "SLF-2026-HQ100"}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center pt-1">
                  <div className="rounded bg-black/40 p-2 border border-emerald-500/20">
                    <span className="text-[10px] text-neutral-400 block font-mono">Акида Оценка</span>
                    <span className="text-base font-bold text-emerald-400">100%</span>
                  </div>
                  <div className="rounded bg-black/40 p-2 border border-emerald-500/20">
                    <span className="text-[10px] text-neutral-400 block font-mono">Далил Сахих</span>
                    <span className="text-base font-bold text-emerald-400">✓ Потвърден</span>
                  </div>
                  <div className="rounded bg-black/40 p-2 border border-emerald-500/20">
                    <span className="text-[10px] text-neutral-400 block font-mono">Ширк / Суеверия</span>
                    <span className="text-base font-bold text-emerald-400">0% (Чист)</span>
                  </div>
                  <div className="rounded bg-black/40 p-2 border border-emerald-500/20">
                    <span className="text-[10px] text-neutral-400 block font-mono">Книжовен Език</span>
                    <span className="text-base font-bold text-emerald-400">Учтив („Вие“)</span>
                  </div>
                </div>
                <p className="text-[11px] text-emerald-200 pt-1">
                  {pipelineResult?.hodja.verdict || "Далилът е достоверен, текстът утвърждава Божествените Атрибути по Манхаджа на Праведните предци (ас-Саляф ас-Салих)."}
                </p>
              </div>
            </div>
          )}

          {selectedDesk === "video_editor" && (
            <div className="space-y-3 text-xs">
              <div className="rounded-xl border border-violet-500/30 bg-violet-950/20 p-3.5 space-y-2">
                <span className="font-bold text-violet-300 uppercase tracking-wider text-[11px] font-mono block">
                  Конфигурация на 9:16 Монтажния Пулт:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  {(pipelineResult?.videoEditor.bRollScenes || LOCAL_HALAL_VIDEO_POOL.slice(0, 3)).map((s: any, idx: number) => (
                    <div key={idx} className="rounded-lg bg-black/50 border border-violet-500/20 p-2 space-y-1">
                      <span className="text-[10px] font-mono text-violet-400 font-bold">Сцена {idx + 1}:</span>
                      <p className="font-bold text-white truncate">{s.title}</p>
                      <span className="text-[10px] text-neutral-400 block">100% Halal Verified</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center text-[10px] font-mono text-neutral-400 pt-1 border-t border-violet-500/20">
                  <span>TikTok Safe Zone: 760px</span>
                  <span>•</span>
                  <span>Audio: bg-BG-BorislavNeural</span>
                  <span>•</span>
                  <span>Zero Dead Air: 100% Active</span>
                </div>
              </div>
            </div>
          )}

          {selectedDesk === "seo_worker" && (
            <div className="space-y-3 text-xs">
              <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3.5 space-y-2">
                <span className="font-bold text-amber-300 uppercase tracking-wider text-[11px] font-mono block">
                  TikTok Search Алгоритъм и Пакет за Публикация:
                </span>
                <div className="rounded bg-black/40 p-2.5 border border-amber-500/20 space-y-1">
                  <span className="text-[10px] font-mono text-amber-400 font-bold uppercase">Вирално Заглавие:</span>
                  <p className="font-bold text-white text-sm">
                    {pipelineResult?.seoWorker.seoTitle || "Тайната на спокойствието в сърцето [Коран]"}
                  </p>
                </div>
                <div className="rounded bg-black/40 p-2.5 border border-amber-500/20 space-y-1">
                  <span className="text-[10px] font-mono text-amber-400 font-bold uppercase">Описание & Хаштагове:</span>
                  <p className="text-neutral-200">
                    {pipelineResult?.seoWorker.caption || "Знаете ли коя е истинската тайна на покоя? Ето какво казва Аллах Всевишният."}
                  </p>
                  <p className="text-emerald-400 font-mono text-[11px]">
                    {pipelineResult?.seoWorker.hashtags.join(" ") || "#islam #quran #bulgaria #напомняне #tawheed"}
                  </p>
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-amber-300">
                  <span>Идеален слот за качване:</span>
                  <span className="font-bold">{pipelineResult?.seoWorker.recommendedPostTime || "Днес в 20:00 ч. (Българско време)"}</span>
                </div>
              </div>
            </div>
          )}

          {selectedDesk === "director" && (
            <div className="space-y-3 text-xs">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3.5 space-y-2">
                <span className="font-bold text-emerald-300 uppercase tracking-wider text-[11px] font-mono block">
                  Главно Командно Табло на Студиото:
                </span>
                <p className="text-neutral-200">
                  Шейх Салафи AI координира всички работници в реално време. Когато производството завърши, проектът може да бъде изпратен директно към видео рендера или към 24/7 Автопилота за автоматично качване в TikTok.
                </p>
                {pipelineResult && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button
                      onClick={handleCopyPackage}
                      variant="outline"
                      size="sm"
                      className="rounded-xl text-xs font-bold border-neutral-700 cursor-pointer"
                    >
                      <Copy className="size-3.5 mr-1" /> Копирай Целия Пакет
                    </Button>
                    <Button
                      onClick={() => {
                        if (onStartRender) {
                          onStartRender(pipelineResult.finalProposal);
                        } else {
                          confirmAndGenerateVideo({ data: { proposal: pipelineResult.finalProposal } })
                            .then((res: any) => {
                              toast.success(`Видеото е предадено за рендиране! Job ID: ${res?.jobId || "активно"}`);
                            })
                            .catch((e: any) => toast.error(e?.message || "Грешка при пускане на рендер"));
                        }
                      }}
                      size="sm"
                      className="rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md cursor-pointer"
                    >
                      <Play className="size-3.5 mr-1" /> 🎬 Рендирай Видеото Веднага
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* FINAL FINISHED DELIVERABLE CARD (if production is complete) */}
      {pipelineResult && (
        <Card className="border border-emerald-500/40 bg-gradient-to-br from-emerald-950/40 via-card to-background p-5 rounded-2xl shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="text-3xl">🏆</span>
              <div>
                <h3 className="text-base font-extrabold text-foreground">
                  Завършен Продукт от 4-те Бюра
                </h3>
                <span className="text-xs text-emerald-400 font-mono font-bold">
                  {pipelineResult.hodja.salafiStamp}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={handleCopyPackage}
                variant="outline"
                className="rounded-xl text-xs font-bold cursor-pointer"
              >
                <Copy className="size-3.5 mr-1" /> Копирай
              </Button>
              <Button
                onClick={() => {
                  if (onStartRender) {
                    onStartRender(pipelineResult.finalProposal);
                  } else {
                    confirmAndGenerateVideo({ data: { proposal: pipelineResult.finalProposal } })
                      .then((res: any) => {
                        toast.success(`Видеото е предадено за рендиране! Job ID: ${res?.jobId || "активно"}`);
                      })
                      .catch((e: any) => toast.error(e?.message || "Грешка при пускане на рендер"));
                  }
                }}
                className="rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md cursor-pointer"
              >
                <Play className="size-3.5 mr-1" /> 🎬 Рендирай Видеото на Сървъра
              </Button>
            </div>
          </div>

          {/* Quick Recap of All 4 Workstations */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/20 p-3 space-y-1">
              <span className="font-bold text-indigo-300 block">✍️ Копирайтър</span>
              <p className="text-muted-foreground text-[11px] truncate">{pipelineResult.copywriter.hookQuestion}</p>
              <span className="text-[10px] text-indigo-400 font-mono block pt-1">4-степенен сценарий ✓</span>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-3 space-y-1">
              <span className="font-bold text-emerald-300 block">🛡️ Салафи Ходжа</span>
              <p className="text-muted-foreground text-[11px] truncate">Сертификат № {pipelineResult.hodja.certificateNumber}</p>
              <span className="text-[10px] text-emerald-400 font-mono block pt-1">100% Salafi Grade ✓</span>
            </div>
            <div className="rounded-xl border border-violet-500/20 bg-violet-950/20 p-3 space-y-1">
              <span className="font-bold text-violet-300 block">🎬 Видео Редактор</span>
              <p className="text-muted-foreground text-[11px] truncate">3 Halal сцени • Safe Zone 760px</p>
              <span className="text-[10px] text-violet-400 font-mono block pt-1">1080x1920 30fps ✓</span>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-3 space-y-1">
              <span className="font-bold text-amber-300 block">📈 SEO Специалист</span>
              <p className="text-muted-foreground text-[11px] truncate">{pipelineResult.seoWorker.seoTitle}</p>
              <span className="text-[10px] text-amber-400 font-mono block pt-1">Слот: {pipelineResult.seoWorker.recommendedPostTime}</span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
