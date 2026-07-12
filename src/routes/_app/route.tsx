import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { PlusCircle } from "lucide-react";

export const Route = createFileRoute("/_app")({
  ssr: false,
  component: AppShell,
});

function AppShell() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border/60 bg-card/50 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="size-8 rounded-full bg-primary text-primary-foreground grid place-items-center font-arabic">ن</div>
            <span className="text-lg font-semibold">Nur Studio</span>
          </Link>
          <nav className="font-ui flex items-center gap-1.5 text-sm">
            <Link to="/create" className="rounded-md px-3 py-2 hover:bg-secondary [&.active]:bg-secondary [&.active]:text-primary" activeProps={{ className: "active" }}>
              <PlusCircle className="inline size-4 mr-1" /> Създай
            </Link>
            <Link to="/downloads" className="rounded-md px-3 py-2 hover:bg-secondary [&.active]:bg-secondary [&.active]:text-primary" activeProps={{ className: "active" }}>
              Изтегляния
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1"><Outlet /></main>
    </div>
  );
}
