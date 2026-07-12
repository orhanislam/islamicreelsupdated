import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  getDownloadsQueue,
  deleteDownloadItem,
  clearDownloadsQueue,
  type DownloadItem,
} from "@/lib/downloads-queue";
import { Download, Trash2, CheckCircle2, ArrowLeft, Video, Film, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/downloads")({
  component: DownloadsPage,
});

function DownloadsPage() {
  const [items, setItems] = useState<DownloadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());

  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await getDownloadsQueue();
      setItems(data);
    } catch (e) {
      console.error("Failed to load downloads queue:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  // Auto-trigger download for all items when opened, then schedule cleanup
  useEffect(() => {
    if (items.length === 0) return;

    items.forEach((item) => {
      if (!downloadedIds.has(item.id)) {
        triggerDownload(item, false);
      }
    });
  }, [items]);

  const triggerDownload = (item: DownloadItem, manual = false) => {
    try {
      const url = URL.createObjectURL(item.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${item.title || "nur-studio-video"}.${item.ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);

      setDownloadedIds((prev) => new Set([...prev, item.id]));
      if (manual) {
        toast.success("Изтеглянето стартира отново!");
      } else {
        toast.success(`Автоматично изтегляне: ${item.title}.${item.ext}`);
        // Automatically delete from storage after 8 seconds so storage stays clean
        setTimeout(async () => {
          await deleteDownloadItem(item.id);
          setItems((prev) => prev.filter((x) => x.id !== item.id));
        }, 8000);
      }
    } catch (err) {
      toast.error("Грешка при изтегляне на видеото");
    }
  };

  const handleRemove = async (id: string) => {
    await deleteDownloadItem(id);
    setItems((prev) => prev.filter((x) => x.id !== id));
    toast.success("Видеото е изтрито от списъка");
  };

  const handleClearAll = async () => {
    await clearDownloadsQueue();
    setItems([]);
    toast.success("Всички видеа са изчистени");
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-primary font-medium text-sm mb-1">
            <Link to="/create" className="inline-flex items-center gap-1 hover:underline">
              <ArrowLeft className="size-4" /> Назад към Създай
            </Link>
          </div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2.5">
            <Film className="size-7 text-primary" />
            Готови видеа за изтегляне
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Вашите рендирани видеа се изтеглят автоматично и се изчистват от паметта след запазване.
          </p>
        </div>

        {items.length > 0 && (
          <button
            onClick={handleClearAll}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-sm font-medium hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition"
          >
            <Trash2 className="size-4" /> Изчисти всички
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <RefreshCw className="size-6 animate-spin mr-2" /> Зареждане на видеа...
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/80 bg-card/40 p-12 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Video className="size-7" />
          </div>
          <h3 className="text-lg font-semibold">Няма чакащи видеа</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            Когато рендирате ново видео от страницата „Създай“, то ще се прехвърли автоматично тук, ще се изтегли на устройството ви и ще се изчисти.
          </p>
          <div className="mt-6">
            <Link
              to="/create"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-md hover:bg-primary/90 transition"
            >
              Създай ново видео
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {items.map((item) => {
            const isDownloaded = downloadedIds.has(item.id);
            const sizeMB = (item.blob.size / (1024 * 1024)).toFixed(1);

            return (
              <div
                key={item.id}
                className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card/70 backdrop-blur shadow-sm hover:shadow-md transition flex flex-col"
              >
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h3 className="font-semibold text-base line-clamp-1">
                        {item.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.ext.toUpperCase()} • {sizeMB} MB • 1080p 30 FPS
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-500 border border-emerald-500/20">
                      <CheckCircle2 className="size-3.5" />
                      {isDownloaded ? "Изтегля се / Готово" : "Готово"}
                    </span>
                  </div>

                  <div className="my-2 rounded-xl overflow-hidden bg-black/40 aspect-[9/16] max-h-72 flex items-center justify-center border border-border/40">
                    <video
                      src={URL.createObjectURL(item.blob)}
                      controls
                      playsInline
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <button
                      onClick={() => triggerDownload(item, true)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition"
                    >
                      <Download className="size-4" />
                      Свали отново
                    </button>
                    <button
                      onClick={() => handleRemove(item.id)}
                      className="inline-flex items-center justify-center size-10 rounded-xl border border-border/80 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
                      title="Изтрий от паметта"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
