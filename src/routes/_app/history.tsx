import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  listGenerationHistory,
  deleteGenerationHistoryEntry,
  clearAllGenerationHistory,
  isItemWithinOneMonthCooldown,
  getCooldownDaysRemaining,
  type GenerationHistoryItem,
  type GenerationType,
} from "@/lib/generation-history.functions";
import {
  BookOpen,
  ScrollText,
  Layers,
  Calendar,
  Clock,
  Search,
  Trash2,
  Copy,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Video,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  History as HistoryIcon,
  X,
  Share2,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { copyToClipboardFallback } from "@/lib/utils";

export const Route = createFileRoute("/_app/history")({
  component: HistoryPage,
});

function formatBulgarianDateTime(timestamp: number): { fullDate: string; time: string; relative: string } {
  const date = new Date(timestamp);

  // Full date: e.g. 16 септември 2026 г.
  const fullDate = date.toLocaleDateString("bg-BG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Time: e.g. 16:30 ч.
  const time = date.toLocaleTimeString("bg-BG", {
    hour: "2-digit",
    minute: "2-digit",
  }) + " ч.";

  // Relative time
  const now = Date.now();
  const diffSec = Math.floor((now - timestamp) / 1000);
  let relative = "";

  if (diffSec < 60) {
    relative = "току-що";
  } else if (diffSec < 3600) {
    const min = Math.floor(diffSec / 60);
    relative = `преди ${min} ${min === 1 ? "минута" : "минути"}`;
  } else if (diffSec < 86400) {
    const hours = Math.floor(diffSec / 3600);
    relative = `преди ${hours} ${hours === 1 ? "час" : "часа"}`;
  } else if (diffSec < 86400 * 2) {
    relative = "вчера";
  } else {
    const days = Math.floor(diffSec / 86400);
    relative = `преди ${days} ${days === 1 ? "ден" : "дни"}`;
  }

  return { fullDate, time, relative };
}

function HistoryPage() {
  const navigate = useNavigate();
  const runListHistory = useServerFn(listGenerationHistory);
  const runDeleteEntry = useServerFn(deleteGenerationHistoryEntry);
  const runClearAll = useServerFn(clearAllGenerationHistory);

  const [items, setItems] = useState<GenerationHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | GenerationType>("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadHistory = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      const data = await runListHistory();
      setItems(data || []);
    } catch (e) {
      console.error("Failed to load generation history:", e);
      toast.error("Неуспешно зареждане на историята");
    } finally {
      setLoading(false);
      if (isManualRefresh) setRefreshing(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id);
      await runDeleteEntry({ data: { id } });
      setItems((prev) => prev.filter((item) => item.id !== id));
      toast.success("Записът е премахнат от историята");
    } catch (e) {
      toast.error("Грешка при изтриване на записа");
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAll = async () => {
    try {
      await runClearAll();
      setItems([]);
      setClearDialogOpen(false);
      toast.success("Цялата история беше успешно изчистена");
    } catch (e) {
      toast.error("Грешка при изчистване на историята");
    }
  };

  const handleOpenInCreate = (item: GenerationHistoryItem) => {
    const proposal: Record<string, any> = {
      type: item.type === "hadith" ? "hadith" : "quran",
      title: item.title,
      reference: item.reference,
      surah: item.surah,
      ayah: item.ayah,
      count: item.ayahEnd && item.ayah ? item.ayahEnd - item.ayah + 1 : 1,
      collection: item.collection,
      number: item.hadithNumber,
      themeBg: item.title,
      tiktokTheme: item.theme || "hormozi",
      autoGenerate: false,
    };

    localStorage.setItem("edit_proposal", JSON.stringify(proposal));
    navigate({ to: "/create" });
    toast.success(`Зареждане на „${item.title}“ в Създай...`);
  };

  const handleCopyText = (item: GenerationHistoryItem) => {
    const parts = [
      item.title || item.reference,
      "",
      item.arabicText ? item.arabicText : null,
      item.arabicText ? "" : null,
      item.bulgarianText ? item.bulgarianText : null,
    ].filter((p) => p !== null);

    const fullText = parts.join("\n");
    copyToClipboardFallback(fullText);
    toast.success("Текстът е копиран в клипборда!");
  };

  const handleCopySocialShare = (item: GenerationHistoryItem) => {
    const header = item.type === "ayah" ? "📖 Аят от Корана" : item.type === "hadith" ? "📜 Хадис на Пророка ﷺ" : "✨ Ислямско напомняне";
    const ref = item.title || item.reference;
    const arabic = item.arabicText ? `\n\n${item.arabicText}` : "";
    const bg = item.bulgarianText ? `\n\n"${item.bulgarianText}"` : "";
    const hashtags = "\n\n#ислям #коран #хадис #напомняне #bulgaria #allah #islamicreels";

    const text = `${header} • ${ref}${arabic}${bg}${hashtags}`;
    copyToClipboardFallback(text);
    toast.success("Форматираният текст за TikTok/Instagram е копиран!");
  };

  // Filter and sort items
  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        // Tab filter
        if (activeTab !== "all" && item.type !== activeTab) {
          return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const title = (item.title || "").toLowerCase();
          const ref = (item.reference || "").toLowerCase();
          const bg = (item.bulgarianText || "").toLowerCase();
          const ar = (item.arabicText || "").toLowerCase();

          return (
            title.includes(q) ||
            ref.includes(q) ||
            bg.includes(q) ||
            ar.includes(q)
          );
        }

        return true;
      })
      .sort((a, b) => {
        return sortOrder === "desc"
          ? b.timestamp - a.timestamp
          : a.timestamp - b.timestamp;
      });
  }, [items, activeTab, searchQuery, sortOrder]);

  // Stats
  const stats = useMemo(() => {
    const total = items.length;
    const ayahs = items.filter((i) => i.type === "ayah").length;
    const hadiths = items.filter((i) => i.type === "hadith").length;
    const carousels = items.filter((i) => i.type === "carousel").length;
    const inCooldown = items.filter((i) => isItemWithinOneMonthCooldown(i.timestamp)).length;
    return { total, ayahs, hadiths, carousels, inCooldown };
  }, [items]);

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50 pb-6 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="size-9 rounded-lg bg-primary/10 text-primary grid place-items-center">
                <HistoryIcon className="size-5" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">История на генериранията</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Пълен регистър на всички генерирани аяти, хадиси и карусели с точна дата, час и текст.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadHistory(true)}
              disabled={refreshing}
              className="gap-1.5"
            >
              <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
              Обнови
            </Button>

            {items.length > 0 && (
              <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive gap-1.5">
                    <Trash2 className="size-4" />
                    Изчисти
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                      <AlertTriangle className="size-5" />
                      Изчистване на цялата история
                    </DialogTitle>
                    <DialogDescription>
                      Сигурни ли сте, че искате да изтриете всички {items.length} записа от историята?
                      Това действие е необратимо.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => setClearDialogOpen(false)}>
                      Отказ
                    </Button>
                    <Button variant="destructive" onClick={handleClearAll}>
                      Да, изчисти всичко
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            <Link to="/create">
              <Button size="sm" className="gap-1.5 shadow-md shadow-primary/20">
                <Sparkles className="size-4" />
                Ново видео
              </Button>
            </Link>
          </div>
        </div>

        {/* 1-Month Cooldown Banner */}
        <div className="mb-6 rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="size-9 rounded-lg bg-primary/20 text-primary grid place-items-center shrink-0 mt-0.5 sm:mt-0">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-foreground">
                  30-дневна защита от повторно генериране от AI асистента
                </span>
                <Badge variant="secondary" className="text-[11px] bg-primary/20 text-primary border-primary/30">
                  {stats.inCooldown} в активна пауза
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Всеки генериран тук аят и хадис автоматично се блокира от предложенията на AI асистента за период от 1 месец (30 дни), за да се гарантира уникалност на вашите видеа.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Card className="p-4 bg-card/60 border-border/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Общо генерирани</span>
              <HistoryIcon className="size-4 text-primary" />
            </div>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </Card>

          <Card className="p-4 bg-card/60 border-border/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Аяти от Корана</span>
              <BookOpen className="size-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold mt-1 text-emerald-500">{stats.ayahs}</p>
          </Card>

          <Card className="p-4 bg-card/60 border-border/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Хадиси</span>
              <ScrollText className="size-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold mt-1 text-amber-500">{stats.hadiths}</p>
          </Card>

          <Card className="p-4 bg-card/60 border-border/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Карусели</span>
              <Layers className="size-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold mt-1 text-blue-500">{stats.carousels}</p>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="space-y-3 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Box */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Търси по сура, хадис, тема или ключова дума..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 bg-card/60 border-border/60"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            {/* Sort Toggle */}
            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <Button
                variant={sortOrder === "desc" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setSortOrder("desc")}
                className="text-xs"
              >
                Най-нови първо
              </Button>
              <Button
                variant={sortOrder === "asc" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setSortOrder("asc")}
                className="text-xs"
              >
                Най-стари първо
              </Button>
            </div>
          </div>

          {/* Type Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              variant={activeTab === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("all")}
              className="rounded-full text-xs h-8"
            >
              Всички ({stats.total})
            </Button>
            <Button
              variant={activeTab === "ayah" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("ayah")}
              className="rounded-full text-xs h-8 gap-1.5"
            >
              <BookOpen className="size-3.5" />
              Аяти от Корана ({stats.ayahs})
            </Button>
            <Button
              variant={activeTab === "hadith" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("hadith")}
              className="rounded-full text-xs h-8 gap-1.5"
            >
              <ScrollText className="size-3.5" />
              Хадиси ({stats.hadiths})
            </Button>
            <Button
              variant={activeTab === "carousel" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("carousel")}
              className="rounded-full text-xs h-8 gap-1.5"
            >
              <Layers className="size-3.5" />
              Карусели ({stats.carousels})
            </Button>
          </div>
        </div>

        {/* Content List */}
        {loading ? (
          <div className="py-20 text-center text-muted-foreground">
            <RefreshCw className="size-8 animate-spin mx-auto mb-3 text-primary" />
            <p>Зареждане на историята...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <Card className="py-16 px-6 text-center border-dashed border-border/80 bg-card/30">
            <div className="size-14 rounded-full bg-muted grid place-items-center mx-auto mb-4 text-muted-foreground">
              <HistoryIcon className="size-7" />
            </div>
            {searchQuery || activeTab !== "all" ? (
              <>
                <h3 className="text-lg font-semibold mb-1">Няма намерени записи</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
                  Няма елементи в историята, които да отговарят на зададените филтри или търсене.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setActiveTab("all");
                  }}
                >
                  Изчисти филтрите
                </Button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold mb-1">Все още нямате генерирано съдържание</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto mb-5">
                  Когато създадете видео, снимка или карусел от Корана или Сунната, те автоматично ще се записват тук с дата и час.
                </p>
                <Link to="/create">
                  <Button className="gap-2">
                    <Sparkles className="size-4" />
                    Създай първото си видео
                  </Button>
                </Link>
              </>
            )}
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredItems.map((item) => {
              const { fullDate, time, relative } = formatBulgarianDateTime(item.timestamp);
              const isDeleting = deletingId === item.id;
              const inCooldown = isItemWithinOneMonthCooldown(item.timestamp);
              const daysRemaining = getCooldownDaysRemaining(item.timestamp);

              return (
                <Card
                  key={item.id}
                  className="p-5 bg-card/60 border-border/60 hover:border-border transition-all duration-200 shadow-sm"
                >
                  <div className="flex flex-col gap-4">
                    {/* Header Row: Badges, Title, Date/Time */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Type Badge */}
                        {item.type === "ayah" ? (
                          <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 gap-1">
                            <BookOpen className="size-3" />
                            Аят от Корана
                          </Badge>
                        ) : item.type === "hadith" ? (
                          <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 gap-1">
                            <ScrollText className="size-3" />
                            Хадис
                          </Badge>
                        ) : (
                          <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30 gap-1">
                            <Layers className="size-3" />
                            Карусел
                          </Badge>
                        )}

                        {/* Format Badge */}
                        {item.format === "video" ? (
                          <Badge variant="outline" className="text-xs text-muted-foreground gap-1">
                            <Video className="size-3 text-primary" />
                            Видео
                          </Badge>
                        ) : item.format === "photo" ? (
                          <Badge variant="outline" className="text-xs text-muted-foreground gap-1">
                            <ImageIcon className="size-3 text-accent" />
                            Снимка
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-muted-foreground gap-1">
                            <Layers className="size-3 text-blue-400" />
                            Карусел (Слайдове)
                          </Badge>
                        )}

                        {item.theme && (
                          <Badge variant="secondary" className="text-xs uppercase tracking-wider font-mono">
                            {item.theme}
                          </Badge>
                        )}

                        {/* 1-Month Cooldown Badge */}
                        {inCooldown ? (
                          <Badge
                            variant="outline"
                            className="text-xs bg-amber-500/10 text-amber-400 border-amber-500/30 gap-1 font-medium"
                            title="AI асистентът няма да предлага този аят или хадис преди да изтече 1 месец"
                          >
                            <ShieldCheck className="size-3 text-amber-400" />
                            AI пауза: още {daysRemaining} {daysRemaining === 1 ? "ден" : "дни"}
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-xs text-muted-foreground/80 border-border/40 gap-1"
                            title="1 месец изтече — може да се генерира отново от AI асистента"
                          >
                            <CheckCircle2 className="size-3 text-emerald-500/70" />
                            1 месец изтече
                          </Badge>
                        )}
                      </div>

                      {/* Prominent Date and Time */}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 font-medium text-foreground/90">
                          <Calendar className="size-3.5 text-primary" />
                          {fullDate}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 font-medium text-foreground/90">
                          <Clock className="size-3.5 text-accent" />
                          {time}
                        </span>
                        <span className="text-[11px] bg-secondary/80 px-2 py-0.5 rounded-full text-muted-foreground">
                          {relative}
                        </span>
                      </div>
                    </div>

                    {/* Main Title & Reference */}
                    <div>
                      <h2 className="text-lg md:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        {item.title}
                      </h2>
                      {item.reference && item.reference !== item.title && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Референция: <span className="font-mono text-foreground/80">{item.reference}</span>
                        </p>
                      )}
                    </div>

                    {/* Arabic Text (if present) */}
                    {item.arabicText && (
                      <div className="bg-muted/40 rounded-xl p-4 border border-border/40">
                        <p
                          className="font-arabic text-xl md:text-2xl text-right leading-loose text-accent drop-shadow-sm"
                          dir="rtl"
                        >
                          {item.arabicText}
                        </p>
                      </div>
                    )}

                    {/* Bulgarian Translation */}
                    {item.bulgarianText && (
                      <div className="text-sm md:text-base text-foreground/90 leading-relaxed bg-background/50 rounded-lg p-3.5 border border-border/30">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                          Превод на български:
                        </span>
                        „{item.bulgarianText}“
                      </div>
                    )}

                    {/* Actions Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/30">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Open in Create button */}
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleOpenInCreate(item)}
                          className="gap-1.5 text-xs font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
                        >
                          <Sparkles className="size-3.5 text-primary" />
                          Отвори в Създай
                        </Button>

                        {/* Copy Full Text */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopyText(item)}
                          className="gap-1.5 text-xs"
                        >
                          <Copy className="size-3.5" />
                          Копирай текст
                        </Button>

                        {/* Copy for TikTok */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopySocialShare(item)}
                          className="gap-1.5 text-xs"
                        >
                          <Share2 className="size-3.5 text-accent" />
                          За TikTok / Instagram
                        </Button>
                      </div>

                      {/* Delete button */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(item.id)}
                        disabled={isDeleting}
                        className="text-muted-foreground hover:text-destructive gap-1 text-xs"
                      >
                        <Trash2 className="size-3.5" />
                        Изтрий
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
