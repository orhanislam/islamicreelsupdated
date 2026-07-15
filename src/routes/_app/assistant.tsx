import React, { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Bot, Send, Loader2, Sparkles, Download, CheckCircle2, Video, Pencil, Brain, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { chatWithAssistant, suggestViralProposal, suggestBatchViralProposals, confirmAndGenerateVideo, startBatchViralSeries, type VideoProposal } from "@/lib/assistant.functions";
import { getAiMemory, updateAiMemory, type AiMemory } from "@/lib/memory.functions";
import { playStudioClick } from "@/lib/sfx";

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
};

function AssistantPage() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchCount, setBatchCount] = useState<number>(5);
  const [viralLoading, setViralLoading] = useState(false);
  const [confirmingIdx, setConfirmingIdx] = useState<number | null>(null);
  const [showMemory, setShowMemory] = useState(false);
  const [memory, setMemory] = useState<AiMemory | null>(null);
  const [newInstruction, setNewInstruction] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>(() => {
    try {
      const saved = localStorage.getItem("islamic_assistant_chat_history_v3");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      {
        role: "assistant",
        text: "Здравей! Аз съм твоят интелигентен Ислямски AI Видео Асистент с дълготрайна памет 🧠 и **постоянен чат на живо** (историята никога не се изчиства автоматично).\n\nКажи ми какво видео искаш да създадем или поискай **пакет от идеи за одобрение** (Коран, Хадиси и TikTok теми). Аз изготвям подробен план с предложения, от който можеш да избереш кои да генерираме!",
      },
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem("islamic_assistant_chat_history_v3", JSON.stringify(messages));
    } catch {}
  }, [messages]);

  useEffect(() => {
    getAiMemory().then((m) => setMemory(m)).catch(() => {});
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

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || loading) return;

    const userText = prompt;
    setPrompt("");
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

  const handleStartBatchSeries = async (customCount?: number | React.MouseEvent) => {
    const countToRun = typeof customCount === "number" ? customCount : batchCount;
    try {
      playStudioClick("start");
      setBatchLoading(true);
      toast.message(`Стартиране на пакетно генериране на ${countToRun} вайръл видеа...`);
      const res = await startBatchViralSeries({ data: { count: countToRun } });
      playStudioClick("success");
      toast.success(res.message);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `📦 **Пакетното генериране е стартирано!**\n\nСистемата генерира ${countToRun} топ вайръл видеа от Корана с професионални субтитри. Можеш да ги следиш и да ги изтеглиш наведнъж в раздел **[Изтегляния](/downloads)**.`,
        },
      ]);
    } catch (e: any) {
      toast.error(e?.message || "Грешка при стартиране на пакетното генериране");
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
          text: `🔥 **Вайръл Предложение:**\n\n${res.reply}\n\n📋 **Тема:** ${res.proposal?.title}\n🎨 **Атмосфера:** ${res.proposal?.themeBg}\n\n👆 Натисни **\"✅ Одобрявам\"** за да генерирам видеото автоматично!`,
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
        </Card>
      )}

      {/* Viral AI Suggestion Card */}
      <div className="mb-4 rounded-2xl border border-red-500/30 bg-gradient-to-r from-red-500/10 via-orange-500/5 to-transparent p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
            <Sparkles className="size-4" /> ВАЙРЪЛ AI ГЕНЕРАТОР
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            AI избира уникална, дълбока и рядко цитирана тема от Корана или Хадисите. Без банални текстове — само вирусни!
          </p>
        </div>
        <button
          onClick={handleViralSuggest}
          disabled={viralLoading || loading}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg hover:from-red-400 hover:to-orange-400 transition shrink-0 cursor-pointer"
        >
          {viralLoading ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Търсене...
            </>
          ) : (
            <>
              🔥 Вайръл Тема
            </>
          )}
        </button>
      </div>

      {/* Batch Series Luxury Card */}
      <div className="mb-6 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
            <Sparkles className="size-4" /> ПАКЕТЕН РЕЖИМ • ВАЙРЪЛ СЕРИЯ ОТ КОРАНА
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Избери колко топ вайръл видеа да се генерират автоматично наведнъж (с Hormozi субтитри и кино B-Roll):
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-2.5">
            {[3, 5, 8, 10].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setBatchCount(num)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                  batchCount === num
                    ? "bg-amber-500 text-black border-amber-400 shadow-md scale-105"
                    : "bg-black/40 text-amber-300/80 border-amber-500/30 hover:bg-amber-500/20"
                }`}
              >
                🔥 {num} видеа
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => handleStartBatchSeries(batchCount)}
          disabled={batchLoading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-3 text-xs font-bold text-black shadow-lg hover:from-amber-400 hover:to-amber-500 transition shrink-0 cursor-pointer self-stretch sm:self-auto"
        >
          {batchLoading ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Генериране...
            </>
          ) : (
            <>
              <Video className="size-4" /> 🚀 Генерирай Серия от {batchCount} Видеа
            </>
          )}
        </button>
      </div>

      {/* Batch Plan Suggestion Quick Toolbar */}
      <div className="mb-4 rounded-2xl border border-teal-500/30 bg-gradient-to-r from-teal-500/10 via-emerald-500/5 to-transparent p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-teal-400 font-bold text-sm">
            <Brain className="size-4" /> ИНТЕЛИГЕНТЕН ПЛАН ЗА ВАЙРЪЛ ВИДЕА (Коран, Хадиси & TikTok)
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            AI изготвя план с разнородни теми за одобрение. Избери колко идеи искаш да ти предложи в чата:
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-2.5">
            {[3, 5, 8, 10].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleBatchSuggest(num)}
                disabled={viralLoading || loading}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer bg-teal-500/15 text-teal-300 border-teal-500/30 hover:bg-teal-500 hover:text-black shadow-sm"
              >
                📋 План за {num} идеи
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground mr-1">⚡ Бързи TikTok идеи:</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setPrompt("Направи кратко вирусна TikTok видео идея за Хадис № 1 на Навауи (намеренията)");
          }}
          className="rounded-full text-xs cursor-pointer"
        >
          🌟 Хадис за намеренията (TikTok 9:16)
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setPrompt("Направи TikTok видео за Сура Ал-Ихляс (112:1-4) със спокоен фон");
          }}
          className="rounded-full text-xs cursor-pointer"
        >
          🕋 Сура Ал-Ихляс
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setPrompt("Направи TikTok видео за Аят Алкарси (Сура 2 аят 255)");
          }}
          className="rounded-full text-xs cursor-pointer"
        >
          📖 Аят ал-Курси
        </Button>
      </div>

      <Card className="glass-card flex h-[640px] flex-col overflow-hidden border border-border/80 shadow-lg">
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
                        <span className="font-medium text-foreground">{m.proposal.title}</span>
                      </div>
                      {m.proposal.summaryBg && (
                        <div>
                          <span className="font-semibold text-muted-foreground">Съдържание: </span>
                          <span className="text-foreground">{m.proposal.summaryBg}</span>
                        </div>
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
                            ? "🕋 Ислямски Изумруд (Emerald Glow)"
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
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => handleConfirmProposal(m.proposal!, idx)}
                        disabled={confirmingIdx !== null}
                        className="rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 cursor-pointer"
                      >
                        {confirmingIdx === idx ? (
                          <>
                            <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                            Генерира се...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="size-3.5 mr-1.5" />
                            ✨ Одобри и генерирай видеото
                          </>
                        )}
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPrompt("Искам да променим следното в предложението: ")}
                        className="rounded-lg text-xs cursor-pointer"
                      >
                        <Pencil className="size-3.5 mr-1" />
                        Промени нещо
                      </Button>
                    </div>
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
                                <span>{prop.title}</span>
                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-black/40 border border-border">
                                  {prop.type === "hadith" ? "📖 Сахих Хадис" : "🕋 Коран / Тренд"}
                                </span>
                              </div>
                              {prop.summaryBg && <p className="text-muted-foreground">{prop.summaryBg}</p>}
                              <div className="flex flex-wrap gap-3 text-[11px] text-amber-400/90 pt-0.5">
                                <span>🎨 {prop.themeBg || "Кино фон"}</span>
                                <span>⚡ Стил: {prop.tiktokTheme || "hormozi"}</span>
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
                            🎬 Одобри и Генерирай Избраните ({(m.selectedProposalIndices || m.proposals.map((_, i) => i)).length} от {m.proposals.length}) Видеа наведнъж
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {m.jobId && (
                  <div className="mt-3 flex items-center gap-2 border-t border-border/40 pt-3">
                    <Link
                      to="/downloads"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/90 transition"
                    >
                      <Download className="size-3.5" />
                      Отвори Изтегляния
                    </Link>
                    <span className="text-xs opacity-75">
                      Файловете са в Изтегляния
                    </span>
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
