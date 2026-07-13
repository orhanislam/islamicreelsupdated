import React, { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Bot, Send, Loader2, Sparkles, Film, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { chatAndGenerateVideo } from "@/lib/assistant.functions";

export const Route = createFileRoute("/_app/assistant")({
  component: AssistantPage,
});

type ChatMsg = {
  role: "user" | "assistant";
  text: string;
  jobId?: string;
  reference?: string;
};

function AssistantPage() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "assistant",
      text: "Здравей! Аз съм твоят Ислямски AI Видео Асистент. Напиши ми какво видео искаш да създадем (например: *„Направи видео за Хадис 1 на Навауи“* или *„Направи видео за Сура Ал-Фятиха аят 1 до 4“*) и ще го генерирам автоматично и оставя в Изтегляния!",
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

      const res = await chatAndGenerateVideo({
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
          jobId: res.jobId,
          reference: res.reference,
        },
      ]);

      if (res.jobStarted) {
        toast.success("Видеото се генерира във фонов режим на сървъра!");
      }
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

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 font-ui">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-sm">
          <Bot className="size-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">AI Видео Асистент (Чат генератор)</h1>
          <p className="text-sm text-muted-foreground">
            Разговаряй с асистента и той автоматично ще създаде цялото видео и ще го остави в Изтегляния.
          </p>
        </div>
      </div>

      <Card className="glass-card flex h-[620px] flex-col overflow-hidden border border-border/80 shadow-lg">
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
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/80 text-foreground"
                }`}
              >
                <div className="whitespace-pre-line">{m.text}</div>
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
                Асистентът мисли и създава видеото...
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
            placeholder="Напр.: Направи видео за Хадис № 5 на Навауи или Сура Ал-Ихляс..."
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
