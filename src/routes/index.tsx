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
      <header className="sticky top-0 z-50 border-b border-white/5 bg-background/60 backdrop-blur-xl shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-full bg-primary text-primary-foreground grid place-items-center font-arabic text-lg shadow-lg shadow-primary/20">ن</div>
            <span className="text-xl font-semibold tracking-tight">Nur Studio</span>
          </div>
          <Link
            to="/create"
            className="font-ui rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:scale-105 hover:bg-primary/90"
          >
            Създай
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-20 text-center">
        <div className="animate-fade-up" style={{ animationDelay: "0ms" }}>
          <p className="font-arabic text-4xl text-accent drop-shadow-md">بِسْمِ ٱللَّٰهِ</p>
        </div>
        
        <h1 className="mt-8 text-5xl md:text-7xl font-bold tracking-tight animate-fade-up" style={{ animationDelay: "100ms" }}>
          Автентично ислямско съдържание.
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-primary animate-pulse-glow bg-[length:200%_auto]">Готово за TikTok.</span>
        </h1>
        
        <p className="font-ui mx-auto mt-6 max-w-2xl text-lg text-muted-foreground animate-fade-up" style={{ animationDelay: "200ms" }}>
          Избери аят от Корана или сахих хадис. Получи професионален превод на български,
          красив фон, рецитация и готово вертикално видео или снимка — за минути.
        </p>
        
        <div className="mt-10 flex flex-wrap justify-center gap-4 font-ui animate-fade-up" style={{ animationDelay: "300ms" }}>
          <Link to="/create" className="rounded-full bg-primary px-8 py-3.5 text-primary-foreground font-medium shadow-xl shadow-primary/30 transition-all hover:scale-105 hover:bg-primary/90">
            Започни безплатно
          </Link>
          <a href="#features" className="rounded-full border border-white/10 bg-card/40 backdrop-blur-md px-8 py-3.5 font-medium transition-all hover:bg-secondary hover:scale-105">
            Виж как работи
          </a>
        </div>

        <div id="features" className="font-ui mt-24 grid gap-6 md:grid-cols-3 text-left">
          {[
            { Icon: BookOpen, title: "Автентични източници", body: "Quran.com (Muhsin Khan) и sunnah.com — само сахих хадиси.", delay: 400 },
            { Icon: Sparkles, title: "AI избор на вирални", body: "AI предлага топ 5 аята/хадиса с оценка. Ти одобряваш преди генериране.", delay: 500 },
            { Icon: Video, title: "Снимки и видеа", body: "Вертикални 1080×1920 за TikTok, със синхронизиран превод и рецитация.", delay: 600 },
          ].map(({ Icon, title, body, delay }) => (
            <div key={title} className="rounded-2xl border border-white/5 bg-card/40 backdrop-blur-xl p-8 shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-primary/20 animate-fade-up" style={{ animationDelay: `${delay}ms` }}>
              <div className="size-12 rounded-lg bg-primary/10 grid place-items-center mb-4">
                <Icon className="size-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
