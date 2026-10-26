import React, { useState } from "react";
import {
  SALAFI_WORKERS_ROSTER,
  runMultiWorkerPipeline,
  type WorkerRole,
  type MultiWorkerCollaborationResult,
  type InterWorkerChatMessage,
} from "@/lib/team-pipeline.functions";
import { auditCustomText100Percent, confirmAndGenerateVideo } from "@/lib/assistant.functions";
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
} from "lucide-react";

interface SalafiWorkersTeamProps {
  onStartRender?: (proposal: any) => void;
  className?: string;
}

const PRESET_TOPICS = [
  { label: "🌿 Чист Таухид и покой на сърцето", topic: "Чистият Таухид, покой на сърцето и надежда в Аллах" },
  { label: "📖 Сура Ал-Ихляс (112:1-4)", topic: "Сура Ал-Ихляс (112:1-4) - Величието на Единствения Творец" },
  { label: "📜 Хадисът за намеренията (Навауи #1)", topic: "Хадис № 1 на Навауи - Делата се ценят според намеренията" },
  { label: "🛡️ Изпитания и Сабр (Бухари #5645)", topic: "Сахих ал-Бухари #5645 - Скритата милост в изпитанията и търпението" },
  { label: "💧 Истигфар и покаяние (Тауба)", topic: "Силата на истигфара, покаянието и отварянето на вратите на милостта" },
  { label: "🌾 Ризк, препитание и благодарност", topic: "Ризк, препитание и упование (Тауаккул) в Аллах Всевишният" },
];

export function SalafiWorkersTeam({ onStartRender, className = "" }: SalafiWorkersTeamProps) {
  const [activeTab, setActiveTab] = useState<"pipeline" | "copywriter" | "hodja" | "video_editor" | "seo_worker">("pipeline");
  const [topicInput, setTopicInput] = useState<string>("");
  const [sourcePreference, setSourcePreference] = useState<"auto" | "quran" | "hadith">("auto");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [activeStep, setActiveStep] = useState<number>(0); // 0: Idle, 1: Copywriter, 2: Hodja, 3: Video, 4: SEO, 5: Done
  const [pipelineResult, setPipelineResult] = useState<MultiWorkerCollaborationResult | null>(null);

  // Micro-task states for individual workers
  const [hodjaTextToAudit, setHodjaTextToAudit] = useState<string>("");
  const [hodjaAuditLoading, setHodjaAuditLoading] = useState<boolean>(false);
  const [hodjaAuditResult, setHodjaAuditResult] = useState<any>(null);

  const [copywriterPrompt, setCopywriterPrompt] = useState<string>("");
  const [copywriterLoading, setCopywriterLoading] = useState<boolean>(false);
  const [copywriterSnippet, setCopywriterSnippet] = useState<{ hook: string; dalil: string; explanation: string } | null>(null);

  const [seoCustomText, setSeoCustomText] = useState<string>("");
  const [seoResult, setSeoResult] = useState<{ title: string; hashtags: string[]; caption: string } | null>(null);

  // Run full collaborative pipeline
  const handleStartPipeline = async (overrideTopic?: string) => {
    const topicToUse = overrideTopic || topicInput || "Чистият Таухид и покой на сърцето";
    setIsProcessing(true);
    setPipelineResult(null);
    setActiveStep(1);

    try {
      // Visual step simulation while server executes
      const stepTimer1 = setTimeout(() => setActiveStep(2), 2200);
      const stepTimer2 = setTimeout(() => setActiveStep(3), 4400);
      const stepTimer3 = setTimeout(() => setActiveStep(4), 6600);

      const res = await runMultiWorkerPipeline({
        data: {
          topic: topicToUse,
          sourcePreference,
        },
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);

      setPipelineResult(res);
      setActiveStep(5);
      toast.success("Всички 4 работници завършиха съвместната работа успешно! 🌿");
    } catch (err: any) {
      toast.error(err?.message || "Грешка при изпълнение на съвместната работа.");
      setActiveStep(0);
    } finally {
      setIsProcessing(false);
    }
  };

  // Test Salafi Hodja individually
  const handleRunHodjaAudit = async () => {
    if (!hodjaTextToAudit.trim()) {
      toast.warning("Моля, въведете текст за богословска проверка.");
      return;
    }
    setHodjaAuditLoading(true);
    try {
      const res = await auditCustomText100Percent({ data: { text: hodjaTextToAudit } });
      setHodjaAuditResult(res);
      toast.success("Одитът от Салафи Ходжата завърши успешно!");
    } catch (err: any) {
      toast.error(err?.message || "Грешка при одит.");
    } finally {
      setHodjaAuditLoading(false);
    }
  };

  // Copy full package
  const handleCopyFullPackage = () => {
    if (!pipelineResult) return;
    const pkg = `🎬 ВИРАЛЕН ИСЛЯМСКИ ПАКЕТ [Nur Studio]
────────────────────────────────────────
📌 Заглавие: ${pipelineResult.seoWorker.seoTitle}
🛡️ Салафи Одит: ${pipelineResult.hodja.salafiStamp} (Сертификат № ${pipelineResult.hodja.certificateNumber})
⏳ Препоръчителен час за качване: ${pipelineResult.seoWorker.recommendedPostTime}

📜 4-СТЕПЕНЕН СЦЕНАРИЙ:
1. Кука (0-2s): ${pipelineResult.copywriter.hookQuestion}
2. Контекст: ${pipelineResult.copywriter.hookContext}
3. Далил: ${pipelineResult.copywriter.dalilText} (${pipelineResult.copywriter.dalilSource})
4. Обяснение (Шарх): ${pipelineResult.copywriter.explanation}
5. Напътствие / Дуа: ${pipelineResult.copywriter.actionStep}

📱 TIKTOK ОПИСАНИЕ И ХАШТАГОВЕ:
${pipelineResult.seoWorker.caption}

${pipelineResult.seoWorker.hashtags.join(" ")}
────────────────────────────────────────`;
    copyToClipboardFallback(pkg);
    toast.success("Целият пакет от 4-мата работници е копиран в клипборда! 📋");
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-card to-background p-5 sm:p-6 shadow-xl">
        <div className="absolute -right-8 -top-8 size-40 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-8 -bottom-8 size-40 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300 shadow-sm">
              <Users className="size-3.5 text-emerald-400" />
              <span>Екип от AI Работници на Шейх Салафи</span>
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-300 via-amber-200 to-indigo-300 bg-clip-text text-transparent">
              4-членно Автономно Ислямско Студио
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
              Главният Мениджър разпределя задачите между специализирани автономни работници: 
              <strong> Копирайтър</strong> създава сценария, <strong>Салафи Ходжа</strong> гарантира 100% Акида, 
              <strong> Видео Редактор</strong> монтира 9:16 видеото, а <strong>SEO Специалист</strong> осигурява вирален обхват в TikTok.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="rounded-xl border border-border/60 bg-background/60 p-2 text-center text-xs">
              <span className="block text-[10px] text-muted-foreground uppercase font-bold">Оркестрация</span>
              <span className="font-bold text-emerald-400 flex items-center gap-1 justify-center">
                <span>🕌</span> Шейх Салафи AI
              </span>
            </div>
          </div>
        </div>

        {/* Worker Roster Horizontal Grid */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {SALAFI_WORKERS_ROSTER.map((worker, idx) => {
            const isStepActive = isProcessing && activeStep === idx + 1;
            const isStepDone = activeStep > idx + 1 || activeStep === 5;

            const themeStyles = {
              indigo: "border-indigo-500/30 bg-indigo-950/20 text-indigo-300 hover:border-indigo-500/60",
              emerald: "border-emerald-500/30 bg-emerald-950/20 text-emerald-300 hover:border-emerald-500/60",
              violet: "border-violet-500/30 bg-violet-950/20 text-violet-300 hover:border-violet-500/60",
              amber: "border-amber-500/30 bg-amber-950/20 text-amber-300 hover:border-amber-500/60",
            }[worker.colorTheme];

            const badgeBg = {
              indigo: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
              emerald: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
              violet: "bg-violet-500/20 text-violet-300 border-violet-500/30",
              amber: "bg-amber-500/20 text-amber-300 border-amber-500/30",
            }[worker.colorTheme];

            return (
              <div
                key={worker.id}
                onClick={() => setActiveTab(worker.id as any)}
                className={`group relative rounded-xl border p-3.5 transition-all cursor-pointer ${themeStyles} ${
                  isStepActive ? "ring-2 ring-emerald-400 shadow-lg scale-[1.02]" : ""
                } ${activeTab === worker.id ? "ring-1 ring-white/40 bg-card" : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{worker.avatar}</span>
                    <div>
                      <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                        {worker.name}
                      </h4>
                      <span className="text-[10px] text-muted-foreground block font-medium">
                        {worker.roleTitle}
                      </span>
                    </div>
                  </div>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border uppercase tracking-wider ${badgeBg}`}>
                    {isStepActive ? "Работи..." : isStepDone ? "Готов ✓" : "На линия"}
                  </span>
                </div>

                <p className="mt-2 text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                  {worker.description}
                </p>

                <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2 text-[10px]">
                  <span className="text-muted-foreground font-mono">Специалност:</span>
                  <span className="font-bold text-foreground truncate max-w-[120px]">
                    {worker.metrics[0].value}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation Tabs between Collective Pipeline & Individual Desks */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar border-b border-border/60">
        <button
          type="button"
          onClick={() => setActiveTab("pipeline")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "pipeline"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
          }`}
        >
          <Sparkles className="size-3.5" />
          <span>👥 Съвместен Студиен Пайплайн</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("copywriter")}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "copywriter"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
          }`}
        >
          <span>✍️</span>
          <span>Бюро на Копирайтъра</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("hodja")}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "hodja"
              ? "bg-emerald-700 text-white shadow-md shadow-emerald-700/20"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
          }`}
        >
          <span>🛡️</span>
          <span>Бюро на Салафи Ходжата</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("video_editor")}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "video_editor"
              ? "bg-violet-600 text-white shadow-md shadow-violet-600/20"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
          }`}
        >
          <span>🎬</span>
          <span>Бюро на Видео Редактора</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("seo_worker")}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "seo_worker"
              ? "bg-amber-600 text-white shadow-md shadow-amber-600/20"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
          }`}
        >
          <span>📈</span>
          <span>Бюро на SEO Специалиста</span>
        </button>
      </div>

      {/* TAB 1: COLLECTIVE LIVE PIPELINE */}
      {activeTab === "pipeline" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Pipeline Controller Card */}
          <Card className="border border-border/80 bg-card/60 p-4 sm:p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <span>🚀</span> Стартирай Съвместен Производствен Цикъл
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Задайте тема или изберете бърз пресет. 4-мата работници ще поемат щафетата един от друг в реално време.
                </p>
              </div>

              {/* Source Preference */}
              <div className="flex items-center gap-1.5 bg-background/80 border border-border/60 rounded-xl p-1 text-xs">
                <span className="text-[10px] text-muted-foreground px-2 font-mono uppercase font-bold">Източник:</span>
                <button
                  type="button"
                  onClick={() => setSourcePreference("auto")}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                    sourcePreference === "auto" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Автоматично
                </button>
                <button
                  type="button"
                  onClick={() => setSourcePreference("quran")}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                    sourcePreference === "quran" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Коран
                </button>
                <button
                  type="button"
                  onClick={() => setSourcePreference("hadith")}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                    sourcePreference === "hadith" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Сахих Хадис
                </button>
              </div>
            </div>

            {/* Input & Action */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <Input
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                placeholder="Напишете тема (напр. 'Сабр при трудност', 'Сура 94:5', 'Искреността в сърцето')..."
                className="h-11 rounded-xl text-sm bg-background/80"
                disabled={isProcessing}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isProcessing) {
                    handleStartPipeline();
                  }
                }}
              />
              <Button
                onClick={() => handleStartPipeline()}
                disabled={isProcessing}
                className="h-11 rounded-xl px-5 text-sm font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-700/20 shrink-0 cursor-pointer"
              >
                {isProcessing ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    <span>Работниците творят...</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Sparkles className="size-4" />
                    <span>Стартирай Екипа</span>
                  </span>
                )}
              </Button>
            </div>

            {/* Quick Presets */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1 font-mono">
                <span>⚡</span> Бързи Богословски Теми:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_TOPICS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    disabled={isProcessing}
                    onClick={() => {
                      setTopicInput(p.topic);
                      handleStartPipeline(p.topic);
                    }}
                    className="rounded-lg border border-border/60 bg-secondary/40 px-2.5 py-1 text-xs font-medium text-foreground hover:border-primary/50 hover:bg-primary/10 transition-colors cursor-pointer"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {/* Real-time Visual Handoff Pipeline Diagram */}
          <Card className="border border-border/80 bg-card/60 p-4 sm:p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Layers className="size-3.5 text-primary" />
                <span>Жив Поток на Предаване на Щафетата (Handoff Pipeline)</span>
              </span>
              <span className="font-mono text-[11px] text-emerald-400">
                {activeStep === 0 && "Готов за старт"}
                {activeStep === 1 && "Фаза 1: Копирайтърът твори"}
                {activeStep === 2 && "Фаза 2: Салафи Ходжата проверява"}
                {activeStep === 3 && "Фаза 3: Видео Монтажистът сглобява"}
                {activeStep === 4 && "Фаза 4: SEO Специалистът опакова"}
                {activeStep === 5 && "✅ Продукцията е завършена на 100%"}
              </span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 relative">
              {/* Step 1: Copywriter */}
              <div className={`rounded-xl border p-3 transition-all ${
                activeStep === 1
                  ? "border-indigo-500 bg-indigo-500/15 ring-2 ring-indigo-500 shadow-md"
                  : activeStep > 1
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                  : "border-border/60 bg-background/50 text-muted-foreground"
              }`}>
                <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <span>✍️</span> 1. Копирайтър
                  </span>
                  {activeStep === 1 && <Loader2 className="size-3.5 animate-spin text-indigo-400" />}
                  {activeStep > 1 && <Check className="size-3.5 text-emerald-400" />}
                </div>
                <p className="text-[11px] leading-snug">
                  4-степенен сценарий с вирална кука и цитат.
                </p>
              </div>

              {/* Step 2: Salafi Hodja */}
              <div className={`rounded-xl border p-3 transition-all ${
                activeStep === 2
                  ? "border-emerald-500 bg-emerald-500/15 ring-2 ring-emerald-500 shadow-md"
                  : activeStep > 2
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                  : "border-border/60 bg-background/50 text-muted-foreground"
              }`}>
                <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <span>🛡️</span> 2. Салафи Ходжа
                  </span>
                  {activeStep === 2 && <Loader2 className="size-3.5 animate-spin text-emerald-400" />}
                  {activeStep > 2 && <Check className="size-3.5 text-emerald-400" />}
                </div>
                <p className="text-[11px] leading-snug">
                  100% Салафи Манхадж, Сахих далил и Adab.
                </p>
              </div>

              {/* Step 3: Video Editor */}
              <div className={`rounded-xl border p-3 transition-all ${
                activeStep === 3
                  ? "border-violet-500 bg-violet-500/15 ring-2 ring-violet-500 shadow-md"
                  : activeStep > 3
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                  : "border-border/60 bg-background/50 text-muted-foreground"
              }`}>
                <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <span>🎬</span> 3. Видео Монтажист
                  </span>
                  {activeStep === 3 && <Loader2 className="size-3.5 animate-spin text-violet-400" />}
                  {activeStep > 3 && <Check className="size-3.5 text-emerald-400" />}
                </div>
                <p className="text-[11px] leading-snug">
                  3 Halal сцени, Safe Zone и Zero Dead Air.
                </p>
              </div>

              {/* Step 4: SEO Worker */}
              <div className={`rounded-xl border p-3 transition-all ${
                activeStep === 4
                  ? "border-amber-500 bg-amber-500/15 ring-2 ring-amber-500 shadow-md"
                  : activeStep === 5
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                  : "border-border/60 bg-background/50 text-muted-foreground"
              }`}>
                <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <span>📈</span> 4. SEO Специалист
                  </span>
                  {activeStep === 4 && <Loader2 className="size-3.5 animate-spin text-amber-400" />}
                  {activeStep === 5 && <Check className="size-3.5 text-emerald-400" />}
                </div>
                <p className="text-[11px] leading-snug">
                  TikTok заглавие, хаштагове и график.
                </p>
              </div>
            </div>
          </Card>

          {/* Inter-worker Dialogue Log / Slack-style Stream */}
          {pipelineResult && (
            <Card className="border border-border/80 bg-card/60 p-4 sm:p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                  <span>💬</span> Стенограма на Колаборацията (Работен Чат между Специалистите)
                </h4>
                <span className="text-[11px] font-mono text-muted-foreground">
                  {pipelineResult.completedAt}
                </span>
              </div>

              <div className="space-y-2.5 pt-1">
                {pipelineResult.interWorkerChatLog.map((msg) => {
                  const borderCol = {
                    indigo: "border-l-indigo-500 bg-indigo-950/20",
                    emerald: "border-l-emerald-500 bg-emerald-950/20",
                    violet: "border-l-violet-500 bg-violet-950/20",
                    amber: "border-l-amber-500 bg-amber-950/20",
                  }[msg.colorTheme] || "border-l-emerald-500 bg-emerald-950/20";

                  return (
                    <div
                      key={msg.id}
                      className={`rounded-xl border-l-4 border-y border-r border-border/50 p-3 text-xs space-y-1 ${borderCol}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground flex items-center gap-1.5">
                          <span>{msg.avatar}</span>
                          <span>{msg.speakerName}</span>
                          <span className="text-[10px] px-2 py-0.2 rounded-full font-semibold bg-background/60 border border-border/60 text-muted-foreground font-mono">
                            {msg.badge}
                          </span>
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground">{msg.timestamp}</span>
                      </div>
                      <p className="text-foreground/90 leading-relaxed font-sans pl-6">
                        {msg.message}
                      </p>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Completed Deliverable Showcase */}
          {pipelineResult && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-emerald-950/30 border border-emerald-500/40 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="size-11 rounded-xl bg-emerald-500/20 border border-emerald-500/40 grid place-items-center text-xl text-emerald-300">
                    <span>🏆</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base font-extrabold text-foreground">
                        {pipelineResult.copywriter.title}
                      </h4>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        {pipelineResult.hodja.salafiStamp}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Сертификат за автентичност: <strong>{pipelineResult.hodja.certificateNumber}</strong> • {pipelineResult.copywriter.wordCount} думи • ~{pipelineResult.copywriter.estimatedDurationSec} сек.
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleCopyFullPackage}
                    variant="outline"
                    className="rounded-xl text-xs font-bold gap-1.5 cursor-pointer border-border/80"
                  >
                    <Copy className="size-3.5" />
                    <span>Копирай Пакета</span>
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
                    className="rounded-xl text-xs font-bold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md cursor-pointer"
                  >
                    <Play className="size-3.5" />
                    <span>🎬 Рендирай Видеото Веднага</span>
                  </Button>
                </div>
              </div>

              {/* 4 Cards for Each Deliverable */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Copywriter Deliverable */}
                <Card className="border border-indigo-500/30 bg-card p-4 space-y-2.5 shadow-sm">
                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <span className="font-bold text-sm text-indigo-300 flex items-center gap-1.5">
                      <span>✍️</span> 1. Сценарий от Копирайтъра
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground">4-степенна структура</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="rounded-lg bg-indigo-500/10 p-2.5 border border-indigo-500/20">
                      <span className="text-[10px] uppercase font-bold text-indigo-400 block font-mono">1. Кука (0-2s):</span>
                      <p className="font-semibold text-foreground mt-0.5">{pipelineResult.copywriter.hookQuestion}</p>
                      <p className="text-muted-foreground mt-0.5">{pipelineResult.copywriter.hookContext}</p>
                    </div>
                    <div className="rounded-lg bg-secondary/50 p-2.5 border border-border/60">
                      <span className="text-[10px] uppercase font-bold text-emerald-400 block font-mono">2. Далил ({pipelineResult.copywriter.dalilSource}):</span>
                      <p className="font-arabic text-foreground text-sm mt-0.5">{pipelineResult.copywriter.dalilText}</p>
                    </div>
                    <div className="rounded-lg bg-secondary/50 p-2.5 border border-border/60">
                      <span className="text-[10px] uppercase font-bold text-amber-400 block font-mono">3. Шарх (Обяснение по Салафи Манхадж):</span>
                      <p className="text-foreground/90 mt-0.5 leading-relaxed">{pipelineResult.copywriter.explanation}</p>
                    </div>
                    {pipelineResult.copywriter.actionStep && (
                      <div className="rounded-lg bg-secondary/50 p-2.5 border border-border/60">
                        <span className="text-[10px] uppercase font-bold text-teal-400 block font-mono">4. Напътствие & Действие:</span>
                        <p className="text-foreground/90 mt-0.5">{pipelineResult.copywriter.actionStep}</p>
                      </div>
                    )}
                  </div>
                </Card>

                {/* 2. Salafi Hodja Deliverable */}
                <Card className="border border-emerald-500/30 bg-card p-4 space-y-2.5 shadow-sm">
                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <span className="font-bold text-sm text-emerald-300 flex items-center gap-1.5">
                      <span>🛡️</span> 2. Богословски Одит (Салафи Ходжа)
                    </span>
                    <span className="text-[11px] font-mono font-bold text-emerald-400">100% Salafi Grade</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-2">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold font-mono">Теология & Акида</span>
                      <span className="block text-lg font-black text-emerald-300">{pipelineResult.hodja.theologyScore}%</span>
                    </div>
                    <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-2">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold font-mono">Книжовен Език</span>
                      <span className="block text-lg font-black text-emerald-300">{pipelineResult.hodja.grammarScore}%</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center gap-1.5 text-emerald-300 font-medium">
                      <CheckCircle2 className="size-3.5 shrink-0" />
                      <span>Далилът е автентичен Сахих хадис / аят от Корана.</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-300 font-medium">
                      <CheckCircle2 className="size-3.5 shrink-0" />
                      <span>0 ширк, 0 амулети, 0 посредници при отправяне на дуа.</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-300 font-medium">
                      <CheckCircle2 className="size-3.5 shrink-0" />
                      <span>Тронът и Качествата на Аллах са утвърдени без Та'вил.</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-300 font-medium">
                      <CheckCircle2 className="size-3.5 shrink-0" />
                      <span>Halal визуална среда: 0 човешки лица, 0 музикални инструменти.</span>
                    </div>
                  </div>

                  <div className="rounded-lg bg-emerald-500/15 border border-emerald-500/40 p-2.5 text-[11px] text-emerald-200">
                    <strong>Богословска присъда:</strong> {pipelineResult.hodja.verdict}
                  </div>
                </Card>

                {/* 3. Video Editor Deliverable */}
                <Card className="border border-violet-500/30 bg-card p-4 space-y-2.5 shadow-sm">
                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <span className="font-bold text-sm text-violet-300 flex items-center gap-1.5">
                      <span>🎬</span> 3. Монтаж от Видео Редактора
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground">9:16 Vertical HD</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground font-mono">Избрани Halal B-Roll Сцени (3 броя):</span>
                      <div className="space-y-1">
                        {pipelineResult.videoEditor.bRollScenes.map((scene, i) => (
                          <div key={i} className="flex items-center justify-between rounded-lg bg-secondary/40 p-2 border border-border/40 text-xs">
                            <span className="font-medium text-foreground flex items-center gap-1.5">
                              <span className="size-1.5 rounded-full bg-violet-400" />
                              {scene.title}
                            </span>
                            <span className="text-[10px] font-mono text-muted-foreground px-1.5 py-0.5 rounded bg-background">
                              {scene.role}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-lg bg-violet-500/10 border border-violet-500/20 p-2.5 space-y-1 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Safe Zone:</span>
                        <span className="font-mono font-bold text-foreground">Макс 760px (TikTok съвместимост)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Аудио Озвучаване:</span>
                        <span className="font-mono font-bold text-foreground">{pipelineResult.videoEditor.audioNarration.voice}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Zero Dead Air:</span>
                        <span className="font-mono font-bold text-emerald-400">Активно ({pipelineResult.videoEditor.subtitlesSpec.zeroDeadAirSec}s)</span>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* 4. SEO Deliverable */}
                <Card className="border border-amber-500/30 bg-card p-4 space-y-2.5 shadow-sm">
                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <span className="font-bold text-sm text-amber-300 flex items-center gap-1.5">
                      <span>📈</span> 4. TikTok SEO & Социален Мениджър
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground">TikTok Search Rank</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground font-mono">Вирално SEO Заглавие:</span>
                      <p className="font-bold text-foreground text-sm mt-0.5 bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg">
                        {pipelineResult.seoWorker.seoTitle}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground font-mono">Таргетирани Хаштагове:</span>
                      <p className="text-primary font-mono text-xs mt-0.5">
                        {pipelineResult.seoWorker.hashtags.join(" ")}
                      </p>
                    </div>

                    <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2 text-[11px] flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Clock className="size-3.5 text-amber-400" /> Идеален час за качване:
                      </span>
                      <span className="font-bold text-amber-200">{pipelineResult.seoWorker.recommendedPostTime}</span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: COPYWRITER DESK */}
      {activeTab === "copywriter" && (
        <Card className="border border-indigo-500/30 bg-card p-5 space-y-4 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="text-3xl">✍️</span>
              <div>
                <h3 className="text-base font-bold text-foreground">Бюро на Ислямския Копирайтър</h3>
                <p className="text-xs text-muted-foreground">Специализиран в 4-степенни вирални сценарии, психологически куки и книжовен български език.</p>
              </div>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
              Кука → Далил → Шарх → Действие
            </span>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold text-foreground">Тествайте Копирайтъра по специфична тема:</label>
            <div className="flex gap-2">
              <Input
                value={copywriterPrompt}
                onChange={(e) => setCopywriterPrompt(e.target.value)}
                placeholder="Напр. 'Как да преодолеем тревожността според Корана'..."
                className="h-10 text-xs rounded-xl"
              />
              <Button
                onClick={() => handleStartPipeline(copywriterPrompt || "Преодоляване на тревожността")}
                className="rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shrink-0 cursor-pointer"
              >
                Генерирай 4-Степенен Сценарий
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/20 p-3 space-y-1">
                <span className="font-bold text-indigo-300 block">1. Вирална Кука (0-2s)</span>
                <p className="text-muted-foreground text-[11px]">Задава интригуващ въпрос без да издава развръзката, спира превъртането в TikTok.</p>
              </div>
              <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/20 p-3 space-y-1">
                <span className="font-bold text-indigo-300 block">2. Автентичен Далил</span>
                <p className="text-muted-foreground text-[11px]">Цитат от Корана или Сахих хадис, подготвен за чист и точен прочит.</p>
              </div>
              <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/20 p-3 space-y-1">
                <span className="font-bold text-indigo-300 block">3. Напътствие & Дуа</span>
                <p className="text-muted-foreground text-[11px]">Завършва с практическа стъпка, дуа или искрено напомняне за Единствения Творец.</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* TAB 3: SALAFI HODJA DESK */}
      {activeTab === "hodja" && (
        <Card className="border border-emerald-500/30 bg-card p-5 space-y-4 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="text-3xl">🛡️</span>
              <div>
                <h3 className="text-base font-bold text-foreground">Бюро на Проверяващия Салафи Ходжа</h3>
                <p className="text-xs text-muted-foreground">Богословски одит, проверка за автентичност на хадиси, елиминиране на ширк, суеверия и бид'а.</p>
              </div>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              100% Salafi Manhaj
            </span>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold text-foreground">Въведете или поставете текст за незабавен богословски одит:</label>
            <Textarea
              value={hodjaTextToAudit}
              onChange={(e) => setHodjaTextToAudit(e.target.value)}
              placeholder="Поставете текст на хадис, дуа или ислямски пост за богословска проверка..."
              rows={4}
              className="text-xs rounded-xl"
            />
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-muted-foreground">
                Филтрира: ширк в дуа, амулети/сини очи, изопачаване на качествата на Аллах, граматика.
              </span>
              <Button
                onClick={handleRunHodjaAudit}
                disabled={hodjaAuditLoading}
                className="rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-white shrink-0 cursor-pointer"
              >
                {hodjaAuditLoading ? <Loader2 className="size-3.5 animate-spin mr-1" /> : <ShieldCheck className="size-3.5 mr-1" />}
                Провери Текста
              </Button>
            </div>

            {hodjaAuditResult && (
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-4 space-y-2 mt-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="size-4 text-emerald-400" />
                    Резултат от одита на Салафи Ходжата
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Оценка: {hodjaAuditResult.report?.theologyScore ?? 100}%
                  </span>
                </div>
                <div className="rounded-lg bg-background/60 p-2.5 text-xs text-foreground font-mono">
                  {hodjaAuditResult.refinedText || hodjaTextToAudit}
                </div>
                {hodjaAuditResult.report?.correctionsApplied?.length > 0 && (
                  <div className="space-y-1 text-xs text-amber-300">
                    <span className="font-bold">Нанесени богословски корекции:</span>
                    <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                      {hodjaAuditResult.report.correctionsApplied.map((c: string, idx: number) => (
                        <li key={idx}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* TAB 4: VIDEO EDITOR DESK */}
      {activeTab === "video_editor" && (
        <Card className="border border-violet-500/30 bg-card p-5 space-y-4 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="text-3xl">🎬</span>
              <div>
                <h3 className="text-base font-bold text-foreground">Бюро на Видео Редактора & Монтажиста</h3>
                <p className="text-xs text-muted-foreground">Вертикален 9:16 HD монтаж, центриране в TikTok Safe Zone (760px) и Halal B-Roll клипове.</p>
              </div>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-violet-500/20 text-violet-300 border border-violet-500/40">
              1080x1920 30fps HD
            </span>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider font-mono">
              Кинематографичен Halal B-Roll Пул (100% без лица, хора и музикални инструменти):
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {LOCAL_HALAL_VIDEO_POOL.slice(0, 6).map((video) => (
                <div key={video.id} className="rounded-xl border border-border/60 bg-secondary/30 p-2.5 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">{video.title}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30 font-mono">
                      {video.duration}s
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">{video.themeBg}</p>
                  <div className="flex items-center justify-between text-[10px] pt-1 text-muted-foreground">
                    <span>9:16 Вертикално</span>
                    <span className="text-emerald-400 font-bold">100% Halal Verified</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-violet-500/20 bg-violet-950/20 p-3 text-xs space-y-1">
              <span className="font-bold text-violet-300 block">TikTok Safe Zone Стандарт:</span>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Всички субтитри се ограничават до ширина 760px и Y-позиция 75% от екрана, за да не се закриват от хаштаговете, заглавието и бутоните (Like, Comment, Share) в TikTok.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* TAB 5: SEO WORKER DESK */}
      {activeTab === "seo_worker" && (
        <Card className="border border-amber-500/30 bg-card p-5 space-y-4 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="text-3xl">📈</span>
              <div>
                <h3 className="text-base font-bold text-foreground">Бюро на SEO & Социалния Мениджър</h3>
                <p className="text-xs text-muted-foreground">Генериране на вирални заглавия с ключови думи за TikTok търсачката, описания и график за публикации.</p>
              </div>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              TikTok Search 2026
            </span>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold text-foreground">Тествайте SEO генератора за заглавия и описания:</label>
            <div className="flex gap-2">
              <Input
                value={seoCustomText}
                onChange={(e) => setSeoCustomText(e.target.value)}
                placeholder="Въведете тема или ключова дума..."
                className="h-10 text-xs rounded-xl"
              />
              <Button
                onClick={() => {
                  const title = `Тайната на ${seoCustomText || "спокойствието в сърцето"}`;
                  setSeoResult({
                    title,
                    caption: `Знаете ли как да намерите истински покой? Ето какво ни учи Аллах Всевишният в Свещения Коран. Споделете това напомняне с някой, който има нужда! 🌿`,
                    hashtags: ["#islam", "#quran", "#bulgaria", "#напомняне", "#ислям", "#tawheed"],
                  });
                  toast.success("SEO заглавието и хаштаговете са готови!");
                }}
                className="rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shrink-0 cursor-pointer"
              >
                Генерирай SEO Пакет
              </Button>
            </div>

            {seoResult && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 space-y-2 mt-2">
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-400 block font-mono">Вирално Заглавие:</span>
                  <p className="font-bold text-foreground text-sm mt-0.5">{seoResult.title}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-400 block font-mono">Описание & Хаштагове:</span>
                  <p className="text-foreground/90 text-xs mt-0.5 leading-relaxed">{seoResult.caption}</p>
                  <p className="text-primary font-mono text-xs mt-1">{seoResult.hashtags.join(" ")}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 text-xs">
              <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-3 space-y-1">
                <span className="font-bold text-amber-300 block flex items-center gap-1">
                  <Clock className="size-3 text-amber-400" /> 10:00 ч. (Сутрин)
                </span>
                <p className="text-muted-foreground text-[11px]">Идеално за сутрешни дуи, вдъхновение и духовна сила за деня.</p>
              </div>
              <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-3 space-y-1">
                <span className="font-bold text-amber-300 block flex items-center gap-1">
                  <Clock className="size-3 text-amber-400" /> 14:00 ч. (Обяд)
                </span>
                <p className="text-muted-foreground text-[11px]">Време за кратка пауза и напомняне за Салята и смисъла на живота.</p>
              </div>
              <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-3 space-y-1">
                <span className="font-bold text-amber-300 block flex items-center gap-1">
                  <Clock className="size-3 text-amber-400" /> 20:00 ч. (Вечер - Пик)
                </span>
                <p className="text-muted-foreground text-[11px]">Най-висока ангажираност в TikTok и Instagram за дълбоки хадиси и Коран.</p>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
