import React, { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Bot, Send, Loader2, Sparkles, Download, CheckCircle2, Video, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { chatWithAssistant, confirmAndGenerateVideo, type VideoProposal } from "@/lib/assistant.functions";

export const Route = createFileRoute("/_app/assistant")({
  component: AssistantPage,
});

type ChatMsg = {
  role: "user" | "assistant";
  text: string;
  proposal?: VideoProposal | null;
  jobId?: string;
  reference?: string;
};

function AssistantPage() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmingIdx, setConfirmingIdx] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "assistant",
      text: "Здравей! Аз съм твоят интелигентен Ислямски AI Видео Асистент.\n\nКажи ми какво видео искаш да създадем (напр. *„Направи видео за търпението“* или *„Видео за Хадис № 5 на Навауи“*). Първо ще ти изготвя красиво предложение за одобрение, и едва когато кажеш „да“, ще го генерирам!",
    },
  ]);

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
      toast.success("Видеото е стартирано успешно!");
    } catch (err: any) {
      toast.error(err?.message || "Грешка при стартиране на видеото");
    } finally {
      setConfirmingIdx(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 font-ui">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-sm">
          <Bot className="size-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">AI Видео Асистент (С одобрение)</h1>
          <p className="text-sm text-muted-foreground">
            Асистентът първо ти предлага детайлен план за видеото и пита за одобрение, преди да започне рендирането.
          </p>
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
          className="rounded-full text-xs"
        >
          🌟 Хадис за намеренията (TikTok 9:16)
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setPrompt("Направи TikTok видео за Сура Ал-Ихляс (112:1-4) със спокоен фон");
          }}
          className="rounded-full text-xs"
        >
          🕋 Сура Ал-Ихляс
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setPrompt("Направи TikTok видео за Аят Алкарси (Сура 2 аят 255)");
          }}
          className="rounded-full text-xs"
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
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => handleConfirmProposal(m.proposal!, idx)}
                        disabled={confirmingIdx !== null}
                        className="rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
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
                        className="rounded-lg text-xs"
                      >
                        <Pencil className="size-3.5 mr-1" />
                        Промени нещо
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
