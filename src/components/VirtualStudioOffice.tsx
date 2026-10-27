import React, { useState, useEffect } from "react";
import {
  SALAFI_WORKERS_ROSTER,
  runMultiWorkerPipeline,
  testWorkerSkill,
  type WorkerRole,
  type WorkerSkill,
  type SkillExecutionRecord,
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
  CheckCheck,
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
  const [activeStep, setActiveStep] = useState<number>(0); // 0: Idle, 1: Director briefing, 2: Copywriter, 3: Hodja, 4: Video Editor, 5: SEO Worker, 6: Complete
  const [pipelineResult, setPipelineResult] = useState<MultiWorkerCollaborationResult | null>(null);

  // Skill interactive testing states in workstation view
  const [testingSkillId, setTestingSkillId] = useState<string | null>(null);
  const [skillTestResults, setSkillTestResults] = useState<
    Record<string, { output: string; metrics?: { label: string; value: string }[]; timestamp: string }>
  >({});
  const [customSkillQueries, setCustomSkillQueries] = useState<Record<string, string>>({});

  // Auto-focus on active desk during production
  useEffect(() => {
    if (!isProducing) return;
    if (activeStep === 1) setSelectedDesk("director");
    else if (activeStep === 2) setSelectedDesk("copywriter");
    else if (activeStep === 3) setSelectedDesk("hodja");
    else if (activeStep === 4) setSelectedDesk("video_editor");
    else if (activeStep === 5) setSelectedDesk("seo_worker");
    else if (activeStep === 6) setSelectedDesk("director");
  }, [activeStep, isProducing]);

  const handleStartProduction = async (overrideTopic?: string) => {
    const topicToUse = overrideTopic || topicInput || "Чистият Таухид и покой на сърцето";
    setIsProducing(true);
    setPipelineResult(null);
    setActiveStep(1);

    try {
      const stepTimer1 = setTimeout(() => setActiveStep(2), 1500);
      const stepTimer2 = setTimeout(() => setActiveStep(3), 3200);
      const stepTimer3 = setTimeout(() => setActiveStep(4), 5000);
      const stepTimer4 = setTimeout(() => setActiveStep(5), 6800);

      const res = await runMultiWorkerPipeline({
        data: {
          topic: topicToUse,
          sourcePreference: "auto",
        },
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
      clearTimeout(stepTimer4);

      setPipelineResult(res);
      setActiveStep(6);
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
🕌 ДИРЕКТИВА НА ДИРЕКТОРА:
${pipelineResult.managerDirective}

📌 Заглавие: ${pipelineResult.seoWorker.seoTitle}
🛡️ Одит на Салафи Ходжата: ${pipelineResult.hodja.salafiStamp} (Сертификат № ${pipelineResult.hodja.certificateNumber})
⏳ Препоръчителен час: ${pipelineResult.seoWorker.recommendedPostTime}

📜 СЦЕНАРИЙ (Копирайтър):
1. Кука: ${pipelineResult.copywriter.hookQuestion}
2. Далил: ${pipelineResult.copywriter.dalilText} (${pipelineResult.copywriter.dalilSource})
3. Шарх: ${pipelineResult.copywriter.explanation}
4. Дуа / Действие: ${pipelineResult.copywriter.actionStep}

📱 TIKTOK ОПИСАНИЕ И ХАШТАГОВЕ:
${pipelineResult.seoWorker.caption}
${pipelineResult.seoWorker.hashtags.join(" ")}
────────────────────────────────────────`;
    copyToClipboardFallback(pkg);
    toast.success("Целият пакет е копиран в клипборда! 📋");
  };

  // Run single skill test from desk
  const handleRunSkillTest = async (workerRole: WorkerRole, skill: WorkerSkill) => {
    setTestingSkillId(skill.id);
    const queryToUse = customSkillQueries[skill.id] || topicInput || "Чистият Таухид и покой на сърцето";
    try {
      const res = await testWorkerSkill({
        data: {
          workerId: workerRole,
          skillId: skill.id,
          sampleInput: queryToUse,
        },
      });

      if (res && res.success) {
        setSkillTestResults((prev) => ({
          ...prev,
          [skill.id]: {
            output: res.output,
            metrics: res.metrics,
            timestamp: new Date().toLocaleTimeString("bg-BG", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          },
        }));
        toast.success(`Умението „${skill.name}“ бе тествано на работното място! ✨`);
      }
    } catch (err: any) {
      toast.error(err?.message || "Грешка при тестване на умението.");
    } finally {
      setTestingSkillId(null);
    }
  };

  const getWorkerForDesk = (desk: DeskId) => {
    const roleMap: Record<DeskId, WorkerRole> = {
      director: "manager",
      copywriter: "copywriter",
      hodja: "hodja",
      video_editor: "video_editor",
      seo_worker: "seo_worker",
    };
    const role = roleMap[desk];
    return SALAFI_WORKERS_ROSTER.find((w) => w.id === role);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Studio Header & Camera Switcher */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-neutral-950 via-neutral-900 to-emerald-950/60 p-4 sm:p-5 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300">
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Офис на Живо • Nur Studio AI HQ (25 Професионални Умения)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>🏢</span> Виртуално Работно Студио
            </h2>
            <p className="text-xs text-neutral-300 max-w-xl">
              Вижте в реално време как Главният Директор и 4-мата специалисти седят по бюрата си, активират своите 25 умения и трансформират всяка богословска тема в завършено 9:16 видео.
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
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.7" />
              <stop offset="25%" stopColor="#6366f1" stopOpacity="0.7" />
              <stop offset="50%" stopColor="#10b981" stopOpacity="0.7" />
              <stop offset="75%" stopColor="#8b5cf6" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.7" />
            </linearGradient>
          </defs>
          <path
            d="M 480 140 Q 300 200 220 380"
            fill="none"
            stroke="url(#pipelineGrad)"
            strokeWidth="2"
            strokeDasharray="6 6"
            className={isProducing && activeStep >= 1 ? "animate-pulse" : "opacity-30"}
          />
          <path
            d="M 220 380 Q 300 200 480 140"
            fill="none"
            stroke="url(#pipelineGrad)"
            strokeWidth="2"
            strokeDasharray="6 6"
            className={isProducing && activeStep >= 2 ? "animate-pulse" : "opacity-30"}
          />
          <path
            d="M 480 140 Q 600 140 760 180"
            fill="none"
            stroke="url(#pipelineGrad)"
            strokeWidth="2"
            strokeDasharray="6 6"
            className={isProducing && activeStep >= 3 ? "animate-pulse" : "opacity-30"}
          />
          <path
            d="M 760 180 Q 760 320 720 400"
            fill="none"
            stroke="url(#pipelineGrad)"
            strokeWidth="2"
            strokeDasharray="6 6"
            className={isProducing && activeStep >= 4 ? "animate-pulse" : "opacity-30"}
          />
          <path
            d="M 720 400 Q 500 440 480 280"
            fill="none"
            stroke="url(#pipelineGrad)"
            strokeWidth="2"
            strokeDasharray="6 6"
            className={isProducing && activeStep >= 5 ? "animate-pulse" : "opacity-30"}
          />
        </svg>

        {/* DESKS GRID CONTAINER */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 items-center justify-items-center">

          {/* DESK 1: ✍️ БЮРО НА КОПИРАЙТЪРА (West Station) */}
          <div
            onClick={() => setSelectedDesk("copywriter")}
            className={`group relative w-full max-w-[340px] rounded-2xl border p-4 sm:p-5 transition-all duration-300 cursor-pointer ${
              selectedDesk === "copywriter"
                ? "border-indigo-500 bg-indigo-950/40 ring-4 ring-indigo-500/30 scale-105 shadow-2xl z-20"
                : "border-indigo-500/30 bg-neutral-900/80 hover:border-indigo-400 hover:bg-neutral-900"
            } ${activeStep === 2 ? "ring-2 ring-indigo-400 shadow-indigo-500/40 animate-pulse" : ""}`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase">
                {activeStep === 2 ? "✍️ Пише кука..." : "Бюро 1: Копирайтър (5 Умения)"}
              </span>
              <span className={`size-2 rounded-full ${activeStep === 2 ? "bg-indigo-400 animate-ping" : "bg-indigo-400"}`} />
            </div>

            <div className="relative h-44 rounded-xl bg-gradient-to-b from-indigo-950/30 to-black/60 border border-indigo-500/20 p-2 overflow-hidden flex flex-col justify-end items-center">
              <div className="absolute top-2 left-2 right-2 h-10 border border-indigo-500/20 rounded bg-indigo-950/20 flex items-center justify-around px-1 text-[9px] font-mono text-indigo-300/80">
                <span className="bg-indigo-500/30 px-1 rounded">1. Hook</span>
                <span className="bg-emerald-500/30 px-1 rounded text-emerald-300">2. Dalil</span>
                <span className="bg-amber-500/30 px-1 rounded text-amber-300">3. Sharh</span>
                <span className="bg-teal-500/30 px-1 rounded text-teal-300">4. Action</span>
              </div>

              <div className="relative z-10 flex flex-col items-center">
                <div className="mb-1 rounded-lg bg-indigo-600 text-white px-2 py-1 text-[10px] font-bold shadow-md animate-bounce text-center max-w-[200px] truncate">
                  {pipelineResult?.copywriter.hookQuestion || "„Търсите ли покой за сърцето?“"}
                </div>
                <div className="size-12 rounded-full bg-gradient-to-b from-indigo-400 to-indigo-700 border-2 border-indigo-200 flex items-center justify-center text-xl shadow-lg">
                  <span>✍️</span>
                </div>
                <div className="w-16 h-3 bg-neutral-800 rounded-t-lg -mt-1 border border-neutral-700" />
              </div>

              <div className="relative z-20 w-full h-14 bg-gradient-to-t from-neutral-800 to-neutral-700 rounded-t-xl border-t-2 border-amber-600/60 p-1 flex items-center justify-around shadow-md">
                <div className="w-16 h-10 bg-indigo-950 border border-indigo-400 rounded-t flex flex-col items-center justify-center p-0.5 shadow-lg">
                  <div className="w-full h-full bg-indigo-900/60 rounded flex items-center justify-center text-[7px] font-mono text-indigo-200">
                    SCRIPT 9:16
                  </div>
                  <div className="w-20 h-1 bg-neutral-600 rounded-b mt-0.5" />
                </div>
                <div className="size-6 rounded-full bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-xs shadow-amber-400/20 shadow-md">
                  💡
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs">☕</span>
                  <span className="text-xs">📚</span>
                </div>
              </div>
            </div>

            <div className="mt-3 text-xs space-y-1">
              <div className="flex items-center justify-between font-bold">
                <span className="text-white">Ислямски Копирайтър</span>
                <span className="text-indigo-400 text-[10px] font-mono">5 Специализирани Умения</span>
              </div>
              <p className="text-[11px] text-neutral-400 line-clamp-1">
                Генерира първите 2 сек. кука, далил, обяснение и дуа.
              </p>
            </div>
          </div>

          {/* DESK 2: 🕌 КАБИНЕТ НА ДИРЕКТОРА (Executive Desk - North) */}
          <div
            onClick={() => setSelectedDesk("director")}
            className={`group relative w-full max-w-[340px] rounded-2xl border p-4 sm:p-5 transition-all duration-300 cursor-pointer ${
              selectedDesk === "director"
                ? "border-emerald-400 bg-emerald-950/40 ring-4 ring-emerald-500/30 scale-105 shadow-2xl z-20"
                : "border-emerald-500/40 bg-neutral-900/80 hover:border-emerald-300 hover:bg-neutral-900"
            } ${activeStep === 1 || activeStep === 6 ? "ring-2 ring-emerald-300 shadow-emerald-500/50" : ""}`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                {activeStep === 1 ? "🕌 Брифва екипа..." : activeStep === 6 ? "🏆 Финален Печат ✓" : "Главна Дирекция (5 Умения)"}
              </span>
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            <div className="relative h-44 rounded-xl bg-gradient-to-b from-emerald-950/30 to-black/60 border border-emerald-500/20 p-2 overflow-hidden flex flex-col justify-end items-center">
              <div className="absolute top-1 w-24 h-20 border-2 border-emerald-500/30 rounded-t-full flex items-center justify-center text-emerald-400/40 font-arabic text-xl pointer-events-none">
                نور
              </div>

              <div className="relative z-10 flex flex-col items-center">
                <div className="mb-1 rounded-lg bg-emerald-700 text-white px-2 py-1 text-[10px] font-bold shadow-md text-center max-w-[210px] truncate">
                  {pipelineResult ? "„Всички 25 умения са активирани успешно!“" : "„Оркестрирам 4-членния екип.“"}
                </div>
                <div className="size-12 rounded-full bg-gradient-to-b from-emerald-300 to-emerald-700 border-2 border-amber-300 flex items-center justify-center text-xl shadow-lg">
                  <span>🕌</span>
                </div>
                <div className="w-18 h-3.5 bg-neutral-900 rounded-t-lg -mt-1 border border-amber-600/40" />
              </div>

              <div className="relative z-20 w-full h-14 bg-gradient-to-t from-amber-950 to-amber-900 rounded-t-xl border-t-2 border-amber-400 p-1 flex items-center justify-around shadow-md">
                <div className="flex flex-col items-center">
                  <div className="size-4 rounded-full bg-amber-400/40 border border-amber-300 flex items-center justify-center text-[8px]">
                    🎙️
                  </div>
                  <div className="w-1 h-3 bg-neutral-700" />
                </div>
                <div className="w-20 h-10 bg-emerald-950 border border-emerald-400 rounded flex flex-col items-center justify-center text-[7px] font-mono text-emerald-200">
                  <span>NUR HQ 100%</span>
                  <span className="text-amber-300 text-[6px]">25 SKILLS ACTIVE</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs">🫖</span>
                  <span className="text-xs">📿</span>
                </div>
              </div>
            </div>

            <div className="mt-3 text-xs space-y-1">
              <div className="flex items-center justify-between font-bold">
                <span className="text-white">Шейх Салафи AI</span>
                <span className="text-emerald-400 text-[10px] font-mono">Главен Управител</span>
              </div>
              <p className="text-[11px] text-neutral-400 line-clamp-1">
                Богословски бриф, Салафи релиз и 24/7 Автопилот.
              </p>
            </div>
          </div>

          {/* DESK 3: 🛡️ БЮРО НА САЛАФИ ХОДЖАТА (East Station) */}
          <div
            onClick={() => setSelectedDesk("hodja")}
            className={`group relative w-full max-w-[340px] rounded-2xl border p-4 sm:p-5 transition-all duration-300 cursor-pointer ${
              selectedDesk === "hodja"
                ? "border-emerald-600 bg-emerald-950/40 ring-4 ring-emerald-600/30 scale-105 shadow-2xl z-20"
                : "border-emerald-600/30 bg-neutral-900/80 hover:border-emerald-500 hover:bg-neutral-900"
            } ${activeStep === 3 ? "ring-2 ring-emerald-400 shadow-emerald-600/40 animate-pulse" : ""}`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                {activeStep === 3 ? "🛡️ Проверява далил..." : "Бюро 2: Салафи Ходжа (5 Умения)"}
              </span>
              <span className={`size-2 rounded-full ${activeStep === 3 ? "bg-emerald-400 animate-ping" : "bg-emerald-400"}`} />
            </div>

            <div className="relative h-44 rounded-xl bg-gradient-to-b from-emerald-950/30 to-black/60 border border-emerald-500/20 p-2 overflow-hidden flex flex-col justify-end items-center">
              <div className="absolute top-2 right-2 border border-emerald-500/40 rounded px-1.5 py-0.5 bg-emerald-950/40 text-[8px] font-mono text-emerald-300 flex items-center gap-1">
                <span>🛡️</span> 100% Salafi Seal
              </div>

              <div className="relative z-10 flex flex-col items-center">
                <div className="mb-1 rounded-lg bg-emerald-800 text-white px-2 py-1 text-[10px] font-bold shadow-md text-center max-w-[200px] truncate">
                  {pipelineResult?.hodja.salafiStamp || "„Далилът е 100% Сахих. Одобрено!“"}
                </div>
                <div className="size-12 rounded-full bg-gradient-to-b from-emerald-300 to-emerald-800 border-2 border-emerald-200 flex items-center justify-center text-xl shadow-lg">
                  <span>🛡️</span>
                </div>
                <div className="w-16 h-3 bg-neutral-800 rounded-t-lg -mt-1 border border-neutral-700" />
              </div>

              <div className="relative z-20 w-full h-14 bg-gradient-to-t from-neutral-800 to-neutral-700 rounded-t-xl border-t-2 border-emerald-600/70 p-1 flex items-center justify-around shadow-md">
                <div className="w-10 h-8 border border-emerald-500/40 rounded flex items-center justify-center text-[10px] bg-emerald-950/60">
                  📖
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-12 h-2 bg-emerald-800 rounded -mb-0.5" />
                  <div className="w-14 h-2 bg-emerald-900 rounded" />
                  <span className="text-[6px] font-mono text-emerald-300">САХИХ СУННА</span>
                </div>
                <div className="size-6 rounded-full bg-emerald-500/30 border border-emerald-400 flex items-center justify-center text-[10px] shadow-sm">
                  🟢
                </div>
              </div>
            </div>

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
            } ${activeStep === 4 ? "ring-2 ring-violet-400 shadow-violet-500/40 animate-pulse" : ""}`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 uppercase">
                {activeStep === 4 ? "🎬 Монтира 9:16..." : "Бюро 3: Видео Монтажист (5 Умения)"}
              </span>
              <span className={`size-2 rounded-full ${activeStep === 4 ? "bg-violet-400 animate-ping" : "bg-violet-400"}`} />
            </div>

            <div className="relative h-44 rounded-xl bg-gradient-to-b from-violet-950/30 to-black/60 border border-violet-500/20 p-2 overflow-hidden flex flex-col justify-end items-center">
              <div className="absolute top-2 left-3 right-3 h-6 flex items-center justify-between gap-1 opacity-40">
                {[4, 12, 18, 8, 22, 16, 26, 14, 8, 20, 15, 10, 24, 6, 18, 12].map((h, i) => (
                  <div key={i} className="w-1.5 bg-violet-400 rounded-full" style={{ height: `${h}px` }} />
                ))}
              </div>

              <div className="relative z-10 flex flex-col items-center">
                <div className="mb-1 rounded-lg bg-violet-700 text-white px-2 py-1 text-[10px] font-bold shadow-md text-center max-w-[200px] truncate">
                  {pipelineResult ? "„3 Halal сцени в Safe Zone 760px!“" : "„Нагласям аудио тайминга и Safe Zone.“"}
                </div>
                <div className="size-12 rounded-full bg-gradient-to-b from-violet-400 to-violet-800 border-2 border-violet-200 flex items-center justify-center text-xl shadow-lg relative">
                  <span>🎬</span>
                  <div className="absolute -inset-1 border-2 border-violet-300/60 rounded-full pointer-events-none" />
                </div>
                <div className="w-16 h-3 bg-neutral-800 rounded-t-lg -mt-1 border border-violet-500/40" />
              </div>

              <div className="relative z-20 w-full h-14 bg-gradient-to-t from-neutral-800 to-neutral-700 rounded-t-xl border-t-2 border-violet-500 p-1 flex items-center justify-around shadow-md">
                <div className="w-10 h-11 bg-black border border-violet-400 rounded flex flex-col items-center justify-center text-[6px] font-mono text-violet-300">
                  <span>9:16 HD</span>
                  <span className="text-[9px]">🏔️</span>
                </div>
                <div className="w-10 h-11 bg-black border border-violet-400 rounded flex flex-col items-center justify-center text-[6px] font-mono text-violet-300">
                  <span>SAFE</span>
                  <span className="text-emerald-400 text-[6px]">760px</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs">🎛️</span>
                  <span className="text-xs">🖱️</span>
                </div>
              </div>
            </div>

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
            } ${activeStep === 5 ? "ring-2 ring-amber-400 shadow-amber-500/40 animate-pulse" : ""}`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                {activeStep === 5 ? "📈 Оптимизира SEO..." : "Бюро 4: SEO Специалист (5 Умения)"}
              </span>
              <span className={`size-2 rounded-full ${activeStep === 5 ? "bg-amber-400 animate-ping" : "bg-amber-400"}`} />
            </div>

            <div className="relative h-44 rounded-xl bg-gradient-to-b from-amber-950/30 to-black/60 border border-amber-500/20 p-2 overflow-hidden flex flex-col justify-end items-center">
              <div className="absolute top-2 left-2 right-2 border border-amber-500/30 rounded bg-amber-950/30 px-2 py-0.5 text-[8px] font-mono text-amber-300 flex items-center justify-between">
                <span>#islam #quran #bulgaria</span>
                <span className="text-emerald-400 font-bold">▲ +480%</span>
              </div>

              <div className="relative z-10 flex flex-col items-center">
                <div className="mb-1 rounded-lg bg-amber-600 text-white px-2 py-1 text-[10px] font-bold shadow-md text-center max-w-[200px] truncate">
                  {pipelineResult?.seoWorker.seoTitle || "„Високо CTR заглавие и златни часове!“"}
                </div>
                <div className="size-12 rounded-full bg-gradient-to-b from-amber-300 to-amber-700 border-2 border-amber-200 flex items-center justify-center text-xl shadow-lg">
                  <span>📈</span>
                </div>
                <div className="w-16 h-3 bg-neutral-800 rounded-t-lg -mt-1 border border-neutral-700" />
              </div>

              <div className="relative z-20 w-full h-14 bg-gradient-to-t from-neutral-800 to-neutral-700 rounded-t-xl border-t-2 border-amber-500 p-1 flex items-center justify-around shadow-md">
                <div className="w-7 h-11 bg-black border border-amber-400 rounded flex flex-col items-center justify-center text-[5px] text-amber-200 font-mono">
                  <span>TIKTOK</span>
                  <span className="text-[7px]">📱</span>
                </div>
                <div className="w-14 h-9 bg-neutral-900 border border-amber-400 rounded flex flex-col items-center justify-center text-[6px] text-amber-300 font-mono">
                  <span>SEARCH 2026</span>
                  <span className="text-emerald-400 font-bold">10:00 / 20:00</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs">⚡</span>
                  <span className="text-xs">🖊️</span>
                </div>
              </div>
            </div>

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

      {/* DETAILED WORKSTATION CLOSE-UP VIEW (when a desk is clicked) */}
      {selectedDesk !== "overview" && (() => {
        const currentWorker = getWorkerForDesk(selectedDesk);
        if (!currentWorker) return null;

        return (
          <Card className="border border-border/80 bg-neutral-900/90 p-5 space-y-5 rounded-2xl shadow-xl animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl p-1.5 rounded-xl bg-neutral-800 border border-neutral-700">
                  {currentWorker.avatar}
                </span>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>{currentWorker.name}</span>
                    <span className="text-xs font-mono font-normal text-emerald-400">
                      ({currentWorker.roleTitle})
                    </span>
                  </h3>
                  <span className="text-xs text-neutral-400">
                    {currentWorker.description}
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

            {/* Render Full 5 Skills Matrix for the Selected Desk */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5 font-mono">
                  <Zap className="size-3.5 text-amber-400" />
                  <span>Професионални Умения на Бюрото ({currentWorker.skills.length} Специализирани Умения)</span>
                </h4>
                <span className="text-[10px] font-mono text-emerald-400 font-bold">
                  100% Salafi Certified
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {currentWorker.skills.map((skill) => {
                  const isTesting = testingSkillId === skill.id;
                  const testRes = skillTestResults[skill.id];

                  return (
                    <div
                      key={skill.id}
                      className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-3.5 space-y-2.5 flex flex-col justify-between"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xl p-1 rounded-lg bg-neutral-800 border border-neutral-700">
                              {skill.icon}
                            </span>
                            <div>
                              <h5 className="text-xs font-bold text-white leading-tight">
                                {skill.name}
                              </h5>
                              <span className="text-[9px] font-mono text-neutral-400 uppercase">
                                Категория: {skill.category}
                              </span>
                            </div>
                          </div>
                          <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                            {skill.level}
                          </span>
                        </div>

                        <p className="text-[11px] text-neutral-300 leading-relaxed">
                          {skill.description}
                        </p>

                        <div className="rounded-lg bg-neutral-900 border border-neutral-800 p-2 text-[10px] text-neutral-400 font-mono">
                          <strong className="text-neutral-300">Механизъм:</strong> {skill.executionDetail}
                        </div>
                      </div>

                      {/* Interactive Live Skill Execution */}
                      <div className="pt-2 border-t border-neutral-800 space-y-2">
                        <div className="flex items-center gap-2">
                          <Input
                            value={customSkillQueries[skill.id] ?? ""}
                            onChange={(e) =>
                              setCustomSkillQueries((prev) => ({
                                ...prev,
                                [skill.id]: e.target.value,
                              }))
                            }
                            placeholder={topicInput || "Тема за проверка..."}
                            className="h-7 text-[11px] rounded-lg bg-neutral-900 border-neutral-700 text-white"
                            disabled={isTesting}
                          />
                          <Button
                            size="sm"
                            onClick={() => handleRunSkillTest(currentWorker.id, skill)}
                            disabled={isTesting}
                            className="h-7 px-3 text-[11px] font-bold rounded-lg shrink-0 cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground"
                          >
                            {isTesting ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <span>Тествай</span>
                            )}
                          </Button>
                        </div>

                        {testRes && (
                          <div className="rounded-lg bg-neutral-900 border border-emerald-500/30 p-2.5 space-y-1.5 text-[10px] font-mono">
                            <div className="flex items-center justify-between text-emerald-400">
                              <span className="flex items-center gap-1 font-bold">
                                <CheckCheck className="size-3" /> Успешно в {testRes.timestamp}
                              </span>
                              <span>100% Salafi Safe</span>
                            </div>
                            <div className="text-neutral-200 whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
                              {testRes.output}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        );
      })()}

      {/* FINAL FINISHED DELIVERABLE CARD (if production is complete) */}
      {pipelineResult && (
        <Card className="border border-emerald-500/40 bg-gradient-to-br from-emerald-950/40 via-card to-background p-5 rounded-2xl shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="text-3xl">🏆</span>
              <div>
                <h3 className="text-base font-extrabold text-foreground">
                  Завършен Продукт от Офиса (5 Бюра & 25 Умения)
                </h3>
                <span className="text-xs text-emerald-400 font-mono font-bold">
                  {pipelineResult.hodja.salafiStamp} • Сертификат № {pipelineResult.hodja.certificateNumber}
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

          {/* Director's Directive Banner */}
          <div className="rounded-xl bg-emerald-950/30 border border-emerald-500/30 p-3 text-xs text-foreground/90 space-y-1">
            <span className="text-[10px] font-mono uppercase font-bold text-emerald-400 block">
              📜 Директива на Директора (Шейх Салафи AI):
            </span>
            <p>{pipelineResult.managerDirective}</p>
          </div>

          {/* Executed Skills Trace */}
          {pipelineResult.skillsExecuted && pipelineResult.skillsExecuted.length > 0 && (
            <div className="rounded-xl bg-secondary/30 border border-border/60 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-foreground">
                <span className="flex items-center gap-1.5">
                  <Zap className="size-3.5 text-amber-400" />
                  <span>Изпълнени Умения в Продукцията:</span>
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {pipelineResult.skillsExecuted.length} умения активирани
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {pipelineResult.skillsExecuted.map((rec, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md bg-background border border-border/60 text-foreground"
                  >
                    <span>{rec.icon}</span>
                    <span>{rec.skillName}</span>
                    <span className="text-emerald-400 font-bold">✓</span>
                  </span>
                ))}
              </div>
            </div>
          )}

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
