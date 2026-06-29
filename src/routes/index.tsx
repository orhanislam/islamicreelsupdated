import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Sparkles, Video } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nur Studio — Виралско ислямско съдържание на български" },
      {
        name: "description",
        content:
          "Превърнете автентични аяти от Корана и сахих хадиси в готови TikTok видеа и снимки на български език. Гласовете на Ясер ал-Досари и др., AI фон, синхронизиран превод.",
      },
      { property: "og:title", content: "Nur Studio" },
      { property: "og:description", content: "Виралско ислямско съдържание на български — автоматично, автентично." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-full bg-primary text-primary-foreground grid place-items-center font-arabic text-lg">ن</div>
            <span className="text-xl font-semibold">Nur Studio</span>
          </div>
          <Link
            to="/create"
            className="font-ui rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Създай
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-20 text-center">
        <p className="font-arabic text-4xl text-accent">بِسْمِ ٱللَّٰهِ</p>
        <h1 className="mt-6 text-5xl md:text-7xl font-semibold tracking-tight">
          Автентично ислямско съдържание.
          <br />
          <span className="text-primary">Готово за TikTok.</span>
        </h1>
        <p className="font-ui mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Избери аят от Корана или сахих хадис. Получи професионален превод на български,
          красив фон, рецитация и готово вертикално видео или снимка — за минути.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3 font-ui">
          <Link to="/create" className="rounded-md bg-primary px-6 py-3 text-primary-foreground font-medium hover:opacity-90">
            Започни безплатно
          </Link>
          <a href="#features" className="rounded-md border border-border px-6 py-3 font-medium hover:bg-secondary">
            Виж как работи
          </a>
        </div>

        <div id="features" className="font-ui mt-24 grid gap-6 md:grid-cols-3 text-left">
          {[
            { Icon: BookOpen, title: "Автентични източници", body: "Quran.com (Muhsin Khan) и sunnah.com — само сахих хадиси." },
            { Icon: Sparkles, title: "AI избор на вирални", body: "AI предлага топ 5 аята/хадиса с оценка. Ти одобряваш преди генериране." },
            { Icon: Video, title: "Снимки и видеа", body: "Вертикални 1080×1920 за TikTok, със синхронизиран превод и рецитация." },
          ].map(({ Icon, title, body }) => (
            <div key={title} className="rounded-xl border border-border bg-card p-6">
              <Icon className="size-6 text-accent" />
              <h3 className="mt-3 text-xl">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
