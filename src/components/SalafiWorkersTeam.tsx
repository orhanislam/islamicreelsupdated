import React, { useState } from "react";
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
  Zap,
  BookOpen,
  Award,
  Terminal,
  Flame,
  Compass,
  CheckCheck,
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
  const [activeTab, setActiveTab] = useState<"pipeline" | WorkerRole>("pipeline");
  const [topicInput, setTopicInput] = useState<string>("");
  const [sourcePreference, setSourcePreference] = useState<"auto" | "quran" | "hadith">("auto");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [activeStep, setActiveStep] = useState<number>(0); // 0: Idle, 1: Manager, 2: Copywriter, 3: Hodja, 4: Video, 5: SEO, 6: Final Release
  const [pipelineResult, setPipelineResult] = useState<MultiWorkerCollaborationResult | null>(null);

  // Skill interactive testing states
  const [testingSkillId, setTestingSkillId] = useState<string | null>(null);
  const [skillTestResults, setSkillTestResults] = useState<
    Record<string, { output: string; metrics?: { label: string; value: string }[]; timestamp: string }>
  >({});
  const [skillCustomInputs, setSkillCustomInputs] = useState<Record<string, string>>({});

  // Micro-task states for individual workers
  const [hodjaTextToAudit, setHodjaTextToAudit] = useState<string>("");
  const [hodjaAuditLoading, setHodjaAuditLoading] = useState<boolean>(false);
  const [hodjaAuditResult, setHodjaAuditResult] = useState<any>(null);

  const [copywriterPrompt, setCopywriterPrompt] = useState<string>("");
  const [seoCustomText, setSeoCustomText] = useState<string>("");
  const [seoResult, setSeoResult] = useState<{ title: string; hashtags: string[]; caption: string } | null>(null);

  // Run full collaborative pipeline
  const handleStartPipeline = async (overrideTopic?: string) => {
    const topicToUse = overrideTopic || topicInput || "Чистият Таухид и покой на сърцето";
    setIsProcessing(true);
    setPipelineResult(null);
    setActiveStep(1);

    try {
      // Visual step progression
      const stepTimer1 = setTimeout(() => setActiveStep(2), 1500);
      const stepTimer2 = setTimeout(() => setActiveStep(3), 3200);
      const stepTimer3 = setTimeout(() => setActiveStep(4), 5000);
      const stepTimer4 = setTimeout(() => setActiveStep(5), 6800);

      const res = await runMultiWorkerPipeline({
        data: {
          topic: topicToUse,
          sourcePreference,
        },
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
      clearTimeout(stepTimer4);

      setPipelineResult(res);
      setActiveStep(6);
      toast.success("Всички работници и Управителят завършиха съвместния цикъл на 100%! 🌿🏆");
    } catch (err: any) {
      toast.error(err?.message || "Грешка при изпълнение на съвместната работа.");
      setActiveStep(0);
    } finally {
      setIsProcessing(false);
    }
  };

  // Interactive Skill Testing
  const handleRunSkillTest = async (workerId: WorkerRole, skill: WorkerSkill) => {
    setTestingSkillId(skill.id);
    const customQuery = skillCustomInputs[skill.id] || topicInput || "Чистият Таухид и покой на сърцето";
    try {
      const res = await testWorkerSkill({
        data: {
          workerId,
          skillId: skill.id,
          sampleInput: customQuery,
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
        toast.success(`Умението „${skill.name}“ бе изпълнено професионално! ✨`);
      } else {
        toast.error("Неуспешно изпълнение на умението.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Грешка при тестване на умението.");
    } finally {
      setTestingSkillId(null);
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
🕌 ДИРЕКТИВА НА УПРАВИТЕЛЯ (Шейх Салафи AI):
${pipelineResult.managerDirective}

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
    toast.success("Целият пакет от екипа и Управителя е копиран в клипборда! 📋");
  };

  // Helper to render skills matrix for any worker
  const renderSkillsMatrix = (workerId: WorkerRole, skills: WorkerSkill[], themeColor: string) => {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Zap className="size-4 text-amber-400" />
              <span>Професионален Арсенал от Умения ({skills.length} Специализирани Умения)</span>
            </h4>
            <p className="text-xs text-muted-foreground">
              Всяко умение е калибрирано според най-високите богословски и вирални стандарти. Можете да го тествате на живо.
            </p>
          </div>
          <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-secondary/80 border border-border/80 font-bold">
            100% Автономна Експертиза
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {skills.map((skill) => {
            const isTesting = testingSkillId === skill.id;
            const testResult = skillTestResults[skill.id];

            const levelBadge = {
              "Майстор": "bg-amber-500/20 text-amber-300 border-amber-500/40",
              "Експерт": "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
              "Автономно": "bg-indigo-500/20 text-indigo-300 border-indigo-500/40",
            }[skill.level] || "bg-primary/20 text-primary border-primary/40";

            return (
              <div
                key={skill.id}
                className="rounded-2xl border border-border/70 bg-card/70 p-4 space-y-3 hover:border-primary/40 transition-all shadow-xs flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl p-1.5 rounded-xl bg-secondary/70 border border-border/50 shrink-0">
                        {skill.icon}
                      </span>
                      <div>
                        <h5 className="text-xs sm:text-sm font-bold text-foreground leading-tight">
                          {skill.name}
                        </h5>
                        <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">
                          Категория: {skill.category}
                        </span>
                      </div>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border shrink-0 ${levelBadge}`}>
                      {skill.level}
                    </span>
                  </div>

                  <p className="text-xs text-foreground/80 leading-relaxed">
                    {skill.description}
                  </p>

                  <div className="rounded-xl bg-secondary/40 border border-border/60 p-2.5 text-[11px] space-y-1">
                    <span className="text-[10px] uppercase font-bold text-primary font-mono block">
                      ⚙️ Механизъм на Изпълнение:
                    </span>
                    <p className="text-muted-foreground leading-normal">
                      {skill.executionDetail}
                    </p>
                  </div>
                </div>

                {/* Skill Test & Result */}
                <div className="space-y-2 pt-2 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    <Input
                      value={skillCustomInputs[skill.id] ?? ""}
                      onChange={(e) =>
                        setSkillCustomInputs((prev) => ({
                          ...prev,
                          [skill.id]: e.target.value,
                        }))
                      }
                      placeholder={topicInput || "Тема за проверка..."}
                      className="h-8 text-[11px] rounded-lg bg-background/80"
                      disabled={isTesting}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !isTesting) {
                          handleRunSkillTest(workerId, skill);
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={() => handleRunSkillTest(workerId, skill)}
                      disabled={isTesting}
                      className="h-8 px-3 text-xs font-bold rounded-lg shrink-0 cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      {isTesting ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <span className="flex items-center gap-1.5">
                          <span>⚡</span>
                          <span>Тествай</span>
                        </span>
                      )}
                    </Button>
                  </div>

                  {testResult && (
                    <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/25 p-3 space-y-2 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between text-[10px] text-emerald-400 font-mono">
                        <span className="font-bold flex items-center gap-1">
                          <CheckCheck className="size-3 text-emerald-400" /> Изпълнено в {testResult.timestamp}
                        </span>
                        <span>100% Успех</span>
                      </div>

                      {testResult.metrics && testResult.metrics.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {testResult.metrics.map((m, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300"
                            >
                              <strong>{m.label}:</strong> {m.value}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="rounded-lg bg-black/50 border border-emerald-500/20 p-2.5 text-[11px] text-neutral-200 font-mono whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                        {testResult.output}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const managerWorker = SALAFI_WORKERS_ROSTER.find((w) => w.id === "manager");
  const copywriterWorker = SALAFI_WORKERS_ROSTER.find((w) => w.id === "copywriter");
  const hodjaWorker = SALAFI_WORKERS_ROSTER.find((w) => w.id === "hodja");
  const videoEditorWorker = SALAFI_WORKERS_ROSTER.find((w) => w.id === "video_editor");
  const seoWorker = SALAFI_WORKERS_ROSTER.find((w) => w.id === "seo_worker");

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
              <span>Екип от AI Специалисти на Шейх Салафи</span>
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-300 via-amber-200 to-indigo-300 bg-clip-text text-transparent">
              5-членно Автономно Ислямско Студио (1 Управител + 4 Работника)
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
              Главният Управител (Шейх Салафи AI) и 4-мата специалисти разполагат с <strong>25 професионални умения</strong>:
              богословско брифване, 4-степенен сценарий, 100% Акида филтър, Safe Zone 760px монтаж и TikTok SEO вирален алгоритъм.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/30 p-2.5 text-center text-xs">
              <span className="block text-[10px] text-emerald-400 uppercase font-mono font-bold">Оркестрация</span>
              <span className="font-bold text-white flex items-center gap-1.5 justify-center mt-0.5">
                <span>🕌</span> Шейх Салафи AI
              </span>
              <span className="block text-[10px] text-muted-foreground font-mono mt-0.5">25 Професионални Умения</span>
            </div>
          </div>
        </div>

        {/* Worker Roster Horizontal Grid (5 Members) */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {SALAFI_WORKERS_ROSTER.map((worker, idx) => {
            const isStepActive = isProcessing && activeStep === idx + 1;
            const isStepDone = activeStep > idx + 1 || activeStep === 6;

            const themeStyles = {
              indigo: "border-indigo-500/30 bg-indigo-950/20 text-indigo-300 hover:border-indigo-500/60",
              emerald: "border-emerald-500/30 bg-emerald-950/20 text-emerald-300 hover:border-emerald-500/60",
              violet: "border-violet-500/30 bg-violet-950/20 text-violet-300 hover:border-violet-500/60",
              amber: "border-amber-500/30 bg-amber-950/20 text-amber-300 hover:border-amber-500/60",
            }[worker.colorTheme] || "border-emerald-500/30 bg-emerald-950/20 text-emerald-300";

            const badgeBg = {
              indigo: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
              emerald: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
              violet: "bg-violet-500/20 text-violet-300 border-violet-500/30",
              amber: "bg-amber-500/20 text-amber-300 border-amber-500/30",
            }[worker.colorTheme] || "bg-emerald-500/20 text-emerald-300";

            return (
              <div
                key={worker.id}
                onClick={() => setActiveTab(worker.id)}
                className={`group relative rounded-xl border p-3.5 transition-all cursor-pointer ${themeStyles} ${
                  isStepActive ? "ring-2 ring-emerald-400 shadow-lg scale-[1.02]" : ""
                } ${activeTab === worker.id ? "ring-2 ring-white/50 bg-card shadow-md" : ""}`}
              >
                <div className="flex items-start justify-between gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl shrink-0">{worker.avatar}</span>
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">
                        {worker.name}
                      </h4>
                      <span className="text-[10px] text-muted-foreground block font-medium truncate">
                        {worker.roleTitle}
                      </span>
                    </div>
                  </div>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold border uppercase tracking-wider shrink-0 ${badgeBg}`}>
                    {isStepActive ? "Работи..." : isStepDone ? "Готов ✓" : "На линия"}
                  </span>
                </div>

                <p className="mt-2 text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                  {worker.description}
                </p>

                <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2 text-[10px]">
                  <span className="text-muted-foreground font-mono">Умения:</span>
                  <span className="font-bold text-foreground flex items-center gap-1">
                    <Zap className="size-3 text-amber-400" />
                    <span>{worker.skills?.length || 5} Умения</span>
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
          onClick={() => setActiveTab("manager")}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "manager"
              ? "bg-emerald-700 text-white shadow-md shadow-emerald-700/20"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
          }`}
        >
          <span>🕌</span>
          <span>Кабинет на Управителя (5 Умения)</span>
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
          <span>Бюро на Копирайтъра (5 Умения)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("hodja")}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "hodja"
              ? "bg-emerald-800 text-white shadow-md shadow-emerald-800/20"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
          }`}
        >
          <span>🛡️</span>
          <span>Бюро на Салафи Ходжата (5 Умения)</span>
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
          <span>Бюро на Видео Редактора (5 Умения)</span>
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
          <span>Бюро на SEO Специалиста (5 Умения)</span>
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
                  <span>🚀</span> Стартирай Съвместен Производствен Цикъл (25 Професионални Умения)
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Задайте тема или изберете бърз пресет. Управителят и 4-мата работници поемат щафетата последователно.
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
                    <span>Екипът и Управителят творят...</span>
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

          {/* Real-time Visual Handoff Pipeline Diagram (5 Stages) */}
          <Card className="border border-border/80 bg-card/60 p-4 sm:p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Layers className="size-3.5 text-primary" />
                <span>Жив Поток на Предаване на Щафетата (5-Степенен Пайплайн)</span>
              </span>
              <span className="font-mono text-[11px] text-emerald-400">
                {activeStep === 0 && "Готов за старт"}
                {activeStep === 1 && "Фаза 1: Управителят брифва екипа"}
                {activeStep === 2 && "Фаза 2: Копирайтърът пише сценарий"}
                {activeStep === 3 && "Фаза 3: Салафи Ходжата проверява"}
                {activeStep === 4 && "Фаза 4: Видео Монтажистът сглобява"}
                {activeStep === 5 && "Фаза 5: SEO Специалистът оптимизира"}
                {activeStep === 6 && "✅ Управителят издаде Зелен Печат 🏆"}
              </span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 relative">
              {/* Step 1: Manager */}
              <div
                className={`rounded-xl border p-3 transition-all ${
                  activeStep === 1
                    ? "border-emerald-500 bg-emerald-500/15 ring-2 ring-emerald-500 shadow-md"
                    : activeStep > 1
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                    : "border-border/60 bg-background/50 text-muted-foreground"
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <span>🕌</span> 1. Управител
                  </span>
                  {activeStep === 1 && <Loader2 className="size-3.5 animate-spin text-emerald-400" />}
                  {activeStep > 1 && <Check className="size-3.5 text-emerald-400" />}
                </div>
                <p className="text-[11px] leading-snug">
                  Богословски бриф & посока на проекта.
                </p>
              </div>

              {/* Step 2: Copywriter */}
              <div
                className={`rounded-xl border p-3 transition-all ${
                  activeStep === 2
                    ? "border-indigo-500 bg-indigo-500/15 ring-2 ring-indigo-500 shadow-md"
                    : activeStep > 2
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                    : "border-border/60 bg-background/50 text-muted-foreground"
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <span>✍️</span> 2. Копирайтър
                  </span>
                  {activeStep === 2 && <Loader2 className="size-3.5 animate-spin text-indigo-400" />}
                  {activeStep > 2 && <Check className="size-3.5 text-emerald-400" />}
                </div>
                <p className="text-[11px] leading-snug">
                  4-степенен сценарий с вирална кука и цитат.
                </p>
              </div>

              {/* Step 3: Salafi Hodja */}
              <div
                className={`rounded-xl border p-3 transition-all ${
                  activeStep === 3
                    ? "border-emerald-500 bg-emerald-500/15 ring-2 ring-emerald-500 shadow-md"
                    : activeStep > 3
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                    : "border-border/60 bg-background/50 text-muted-foreground"
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <span>🛡️</span> 3. Салафи Ходжа
                  </span>
                  {activeStep === 3 && <Loader2 className="size-3.5 animate-spin text-emerald-400" />}
                  {activeStep > 3 && <Check className="size-3.5 text-emerald-400" />}
                </div>
                <p className="text-[11px] leading-snug">
                  100% Салафи Манхадж, Сахих далил и Adab.
                </p>
              </div>

              {/* Step 4: Video Editor */}
              <div
                className={`rounded-xl border p-3 transition-all ${
                  activeStep === 4
                    ? "border-violet-500 bg-violet-500/15 ring-2 ring-violet-500 shadow-md"
                    : activeStep > 4
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                    : "border-border/60 bg-background/50 text-muted-foreground"
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <span>🎬</span> 4. Видео Монтажист
                  </span>
                  {activeStep === 4 && <Loader2 className="size-3.5 animate-spin text-violet-400" />}
                  {activeStep > 4 && <Check className="size-3.5 text-emerald-400" />}
                </div>
                <p className="text-[11px] leading-snug">
                  3 Halal сцени, Safe Zone и Zero Dead Air.
                </p>
              </div>

              {/* Step 5: SEO Worker */}
              <div
                className={`rounded-xl border p-3 transition-all ${
                  activeStep === 5
                    ? "border-amber-500 bg-amber-500/15 ring-2 ring-amber-500 shadow-md"
                    : activeStep === 6
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                    : "border-border/60 bg-background/50 text-muted-foreground"
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <span>📈</span> 5. SEO Специалист
                  </span>
                  {activeStep === 5 && <Loader2 className="size-3.5 animate-spin text-amber-400" />}
                  {activeStep === 6 && <Check className="size-3.5 text-emerald-400" />}
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
            <div className="space-y-5">
              {/* Manager Final Release Card */}
              <div className="rounded-2xl border-2 border-emerald-500/60 bg-gradient-to-br from-emerald-950/60 via-card to-background p-5 shadow-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-500/30 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl p-2 rounded-2xl bg-emerald-500/20 border border-emerald-500/40">
                      🕌
                    </span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-base font-extrabold text-foreground">
                          Официално Одобрение от Главния Управител (Шейх Салафи AI)
                        </h4>
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          {pipelineResult.hodja.salafiStamp}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Сертификат № <strong>{pipelineResult.hodja.certificateNumber}</strong> • 100% Salafi Manhaj Release • {pipelineResult.copywriter.wordCount} думи (~{pipelineResult.copywriter.estimatedDurationSec}s)
                      </p>
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

                <div className="rounded-xl bg-background/80 border border-emerald-500/30 p-3.5 text-xs text-foreground/90 leading-relaxed font-sans">
                  <span className="text-[10px] uppercase font-bold text-emerald-400 font-mono block mb-1">
                    📜 Директива на Управителя:
                  </span>
                  {pipelineResult.managerDirective}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs pt-1">
                  <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-2">
                    <span className="text-[10px] text-muted-foreground uppercase font-mono block">Акида & Таухид</span>
                    <span className="text-emerald-300 font-bold">100% Чист</span>
                  </div>
                  <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-2">
                    <span className="text-[10px] text-muted-foreground uppercase font-mono block">Визуален Филтър</span>
                    <span className="text-emerald-300 font-bold">0 Лица / 0 Хора</span>
                  </div>
                  <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-2">
                    <span className="text-[10px] text-muted-foreground uppercase font-mono block">Аудио Филтър</span>
                    <span className="text-emerald-300 font-bold">0 Музика (-an)</span>
                  </div>
                  <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-2">
                    <span className="text-[10px] text-muted-foreground uppercase font-mono block">TikTok Safe Zone</span>
                    <span className="text-emerald-300 font-bold">760px Централен</span>
                  </div>
                </div>
              </div>

              {/* Skills Execution Trace */}
              {pipelineResult.skillsExecuted && pipelineResult.skillsExecuted.length > 0 && (
                <Card className="border border-border/80 bg-card/60 p-4 sm:p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                      <Zap className="size-4 text-amber-400" />
                      <span>Изпълнени Професионални Умения в Този Проект ({pipelineResult.skillsExecuted.length} Умения)</span>
                    </h4>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      Всички стъпки са валидирани
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                    {pipelineResult.skillsExecuted.map((rec, i) => (
                      <div
                        key={i}
                        className="rounded-xl border border-border/60 bg-secondary/30 p-3 space-y-1.5 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-foreground flex items-center gap-1.5">
                            <span>{rec.icon}</span>
                            <span className="truncate max-w-[150px]">{rec.skillName}</span>
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            {rec.status === "verified" ? "Валидирано ✓" : "Приложено ✓"}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-snug">
                          {rec.detail}
                        </p>
                        <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground/70 pt-1 border-t border-border/30">
                          <span className="truncate">{rec.workerName.split(" ")[0]}</span>
                          <span>{rec.timestamp}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

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

      {/* TAB 2: MANAGER DESK */}
      {activeTab === "manager" && managerWorker && (
        <Card className="border border-emerald-500/40 bg-card p-5 space-y-6 shadow-sm animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
            <div className="flex items-center gap-3">
              <span className="text-4xl p-2 rounded-2xl bg-emerald-500/20 border border-emerald-500/40">
                🕌
              </span>
              <div>
                <h3 className="text-base sm:text-lg font-black text-foreground">
                  Кабинет на Главния Управител (Шейх Салафи AI)
                </h3>
                <p className="text-xs text-muted-foreground max-w-xl">
                  Върховна режисура, богословско брифване, безкомпромисен Салафи контрол и оркестрация на целия студиен пайплайн.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-3 py-1 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                Ръководител на Студиото
              </span>
            </div>
          </div>

          {/* Manager Skills Matrix */}
          {renderSkillsMatrix("manager", managerWorker.skills, "emerald")}
        </Card>
      )}

      {/* TAB 3: COPYWRITER DESK */}
      {activeTab === "copywriter" && copywriterWorker && (
        <Card className="border border-indigo-500/40 bg-card p-5 space-y-6 shadow-sm animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
            <div className="flex items-center gap-3">
              <span className="text-4xl p-2 rounded-2xl bg-indigo-500/20 border border-indigo-500/40">
                ✍️
              </span>
              <div>
                <h3 className="text-base sm:text-lg font-black text-foreground">
                  Бюро на Ислямския Копирайтър & Сценарист
                </h3>
                <p className="text-xs text-muted-foreground max-w-xl">
                  Специализиран в 4-степенни вирални сценарии, 2-секундни куки за задържане на вниманието и книжовен български език.
                </p>
              </div>
            </div>
            <span className="text-xs px-3 py-1 rounded-full font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-mono">
              Кука → Далил → Шарх → Дуа
            </span>
          </div>

          {/* Copywriter Skills Matrix */}
          {renderSkillsMatrix("copywriter", copywriterWorker.skills, "indigo")}
        </Card>
      )}

      {/* TAB 4: SALAFI HODJA DESK */}
      {activeTab === "hodja" && hodjaWorker && (
        <Card className="border border-emerald-500/40 bg-card p-5 space-y-6 shadow-sm animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
            <div className="flex items-center gap-3">
              <span className="text-4xl p-2 rounded-2xl bg-emerald-500/20 border border-emerald-500/40">
                🛡️
              </span>
              <div>
                <h3 className="text-base sm:text-lg font-black text-foreground">
                  Бюро на Проверяващия Салафи Ходжа
                </h3>
                <p className="text-xs text-muted-foreground max-w-xl">
                  100% Салафи Манхадж одит, проверка на автентичността на хадисите, елиминиране на ширк, суеверия и издаване на Зелен Печат.
                </p>
              </div>
            </div>
            <span className="text-xs px-3 py-1 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
              100% Salafi Manhaj
            </span>
          </div>

          {/* Interactive Text Auditor */}
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-3">
            <label className="text-xs font-bold text-foreground">Бърза богословска проверка на свободен ислямски текст:</label>
            <Textarea
              value={hodjaTextToAudit}
              onChange={(e) => setHodjaTextToAudit(e.target.value)}
              placeholder="Поставете текст на хадис, дуа или ислямски пост за богословска проверка..."
              rows={3}
              className="text-xs rounded-xl bg-background/80"
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
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/30 p-3.5 space-y-2 mt-2">
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

          {/* Hodja Skills Matrix */}
          {renderSkillsMatrix("hodja", hodjaWorker.skills, "emerald")}
        </Card>
      )}

      {/* TAB 5: VIDEO EDITOR DESK */}
      {activeTab === "video_editor" && videoEditorWorker && (
        <Card className="border border-violet-500/40 bg-card p-5 space-y-6 shadow-sm animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
            <div className="flex items-center gap-3">
              <span className="text-4xl p-2 rounded-2xl bg-violet-500/20 border border-violet-500/40">
                🎬
              </span>
              <div>
                <h3 className="text-base sm:text-lg font-black text-foreground">
                  Бюро на Видео Редактора & Монтажиста
                </h3>
                <p className="text-xs text-muted-foreground max-w-xl">
                  Вертикален 9:16 HD монтаж, центриране в TikTok Safe Zone (760px), Halal B-Roll клипове и Zero Dead Air компресия.
                </p>
              </div>
            </div>
            <span className="text-xs px-3 py-1 rounded-full font-bold bg-violet-500/20 text-violet-300 border border-violet-500/40 font-mono">
              1080x1920 30fps HD
            </span>
          </div>

          {/* Video Editor Skills Matrix */}
          {renderSkillsMatrix("video_editor", videoEditorWorker.skills, "violet")}
        </Card>
      )}

      {/* TAB 6: SEO WORKER DESK */}
      {activeTab === "seo_worker" && seoWorker && (
        <Card className="border border-amber-500/40 bg-card p-5 space-y-6 shadow-sm animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
            <div className="flex items-center gap-3">
              <span className="text-4xl p-2 rounded-2xl bg-amber-500/20 border border-amber-500/40">
                📈
              </span>
              <div>
                <h3 className="text-base sm:text-lg font-black text-foreground">
                  Бюро на SEO & Социалния Мениджър
                </h3>
                <p className="text-xs text-muted-foreground max-w-xl">
                  Вирални заглавия с ключови думи за TikTok Search 2026, релевантни хаштаг клъстери, златни часове и промптове за корици.
                </p>
              </div>
            </div>
            <span className="text-xs px-3 py-1 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
              TikTok Search 2026
            </span>
          </div>

          {/* SEO Skills Matrix */}
          {renderSkillsMatrix("seo_worker", seoWorker.skills, "amber")}
        </Card>
      )}
    </div>
  );
}
