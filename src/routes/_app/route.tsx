import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { PlusCircle, Bot, History, Download } from "lucide-react";

export const Route = createFileRoute("/_app")({
  ssr: false,
  component: AppShell,
});

function AppShell() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-card/75 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 gap-2">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="size-8 rounded-full bg-primary text-primary-foreground grid place-items-center font-arabic shadow-sm">ن</div>
            <span className="text-base sm:text-lg font-semibold tracking-tight hidden xs:inline">Nur Studio</span>
          </Link>
          <nav className="font-ui flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm overflow-x-auto py-0.5 no-scrollbar">
            <Link
              to="/assistant"
              className="rounded-md px-2.5 sm:px-3 py-1.5 sm:py-2 hover:bg-secondary whitespace-nowrap flex items-center gap-1.5 transition-colors [&.active]:bg-secondary [&.active]:text-primary"
              activeProps={{ className: "active" }}
            >
              <Bot className="size-4 text-primary shrink-0" />
              <span>AI Асистент</span>
            </Link>
            <Link
              to="/create"
              className="rounded-md px-2.5 sm:px-3 py-1.5 sm:py-2 hover:bg-secondary whitespace-nowrap flex items-center gap-1.5 transition-colors [&.active]:bg-secondary [&.active]:text-primary"
              activeProps={{ className: "active" }}
            >
              <PlusCircle className="size-4 shrink-0" />
              <span>Създай</span>
            </Link>
            <Link
              to="/history"
              className="rounded-md px-2.5 sm:px-3 py-1.5 sm:py-2 hover:bg-secondary whitespace-nowrap flex items-center gap-1.5 transition-colors [&.active]:bg-secondary [&.active]:text-primary"
              activeProps={{ className: "active" }}
            >
              <History className="size-4 text-primary shrink-0" />
              <span className="font-medium">История</span>
            </Link>
            <Link
              to="/downloads"
              className="rounded-md px-2.5 sm:px-3 py-1.5 sm:py-2 hover:bg-secondary whitespace-nowrap flex items-center gap-1.5 transition-colors [&.active]:bg-secondary [&.active]:text-primary"
              activeProps={{ className: "active" }}
            >
              <Download className="size-4 shrink-0" />
              <span>Изтегляния</span>
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1"><Outlet /></main>
    </div>
  );
}
