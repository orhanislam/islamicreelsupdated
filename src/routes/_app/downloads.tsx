import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import {
  getDownloadsQueue,
  deleteDownloadItem,
  clearDownloadsQueue,
  type DownloadItem,
} from "@/lib/downloads-queue";
import {
  listServerRenderJobs,
  getServerRenderJobBase64,
  deleteServerRenderJob,
  retryServerRenderJob,
} from "@/lib/render.functions";
import { Download, Trash2, CheckCircle2, ArrowLeft, Video, Film, RefreshCw, Loader2, AlertCircle, CloudCheck } from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";

export const Route = createFileRoute("/_app/downloads")({
  component: DownloadsPage,
});

type ServerJob = {
  id: string;
  title: string;
  status: "rendering" | "completed" | "error";
  createdAt: number;
  error?: string;
};

function DownloadsPage() {
  const [items, setItems] = useState<DownloadItem[]>([]);
  const [serverJobs, setServerJobs] = useState<ServerJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());
  const [downloadingServerId, setDownloadingServerId] = useState<string | null>(null);
  const [preloadedUrls, setPreloadedUrls] = useState<Record<string, string>>({});
  const preloadingRef = useRef<Set<string>>(new Set());

  const loadAll = async () => {
    try {
      const [localData, serverData] = await Promise.all([
        getDownloadsQueue().catch(() => [] as DownloadItem[]),
        listServerRenderJobs().catch(() => [] as ServerJob[]),
      ]);
      setItems(localData);
      setServerJobs(serverData);
    } catch (e) {
      console.error("Failed to load downloads:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  // Poll every 3 seconds while page is open so newly started background jobs appear immediately
  useEffect(() => {
    const timer = setInterval(() => {
      loadAll();
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // Automatically preload server MP4 files in the background so clicking download is instant!
  useEffect(() => {
    serverJobs.forEach(async (job) => {
      if (job.status === "completed" && !preloadedUrls[job.id] && !preloadingRef.current.has(job.id)) {
        preloadingRef.current.add(job.id);
        try {
          const base64 = await getServerRenderJobBase64({ data: { id: job.id } });
          const res = await fetch("data:video/mp4;base64," + base64);
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          setPreloadedUrls((prev) => ({ ...prev, [job.id]: url }));
          confetti({
            particleCount: 65,
            spread: 75,
            origin: { y: 0.65 },
            colors: ["#FFD700", "#10B981", "#3B82F6", "#F59E0B"],
          });
        } catch (err) {
          console.error("Failed to preload server video:", err);
          preloadingRef.current.delete(job.id);
        }
      }
    });
  }, [serverJobs]);

  // Auto-trigger download for local items when opened
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
        setTimeout(async () => {
          await deleteDownloadItem(item.id);
          setItems((prev) => prev.filter((x) => x.id !== item.id));
        }, 8000);
      }
    } catch (err) {
      toast.error("Грешка при изтегляне на видеото");
    }
  };

  const handleDownloadServerJob = async (job: ServerJob) => {
    let url = preloadedUrls[job.id];
    if (!url) {
      setDownloadingServerId(job.id);
      try {
        toast.message("Подготвям видеото за изтегляне от сървъра...");
        const base64 = await getServerRenderJobBase64({ data: { id: job.id } });
        const res = await fetch("data:video/mp4;base64," + base64);
        const blob = await res.blob();
        url = URL.createObjectURL(blob);
        setPreloadedUrls((prev) => ({ ...prev, [job.id]: url }));
      } catch (e) {
        toast.error("Не успях да сваля видеото от сървъра");
        setDownloadingServerId(null);
        return;
      } finally {
        setDownloadingServerId(null);
      }
    }

    const a = document.createElement("a");
    a.href = url;
    a.download = `${job.title || "islamic-reel"}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("Видеото е свалено веднага!");
  };

  const handleRemoveLocal = async (id: string) => {
    await deleteDownloadItem(id);
    setItems((prev) => prev.filter((x) => x.id !== id));
    toast.success("Видеото е изтрито от списъка");
  };

  const handleRemoveServerJob = async (id: string) => {
    await deleteServerRenderJob({ data: { id } });
    setServerJobs((prev) => prev.filter((x) => x.id !== id));
    toast.success("Фоновият запис е изтрит от сървъра");
  };

  const handleRetryServerJob = async (id: string) => {
    try {
      toast.message("Стартирам повторен опит за рендиране на сървъра...");
      await retryServerRenderJob({ data: { id } });
      toast.success("Рендирането започна отново на сървъра!");
      loadAll();
    } catch (e: any) {
      toast.error(e?.message || "Не успях да стартирам повторно рендирането");
    }
  };

  const handleClearAll = async () => {
    await clearDownloadsQueue();
    for (const j of serverJobs) {
      await deleteServerRenderJob({ data: { id: j.id } });
    }
    setItems([]);
    setServerJobs([]);
    toast.success("Всички видеа са изчистени");
  };

  const totalCount = items.length + serverJobs.length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 rounded-2xl border border-primary/30 bg-primary/10 p-4 flex items-center gap-3 text-sm">
        <CloudCheck className="size-6 text-primary shrink-0" />
        <div>
          <p className="font-semibold text-foreground">
            ☁️ 100% Автономно рендиране — Можеш спокойно да затвориш сайта!
          </p>
          <p className="text-muted-foreground text-xs mt-0.5">
            Когато одобриш видео от AI Асистента, то се рендира на сървъра. Можеш да затвориш браузъра веднага — когато се върнеш тук по-късно, видеото ще те чака готово за изтегляне!
          </p>
        </div>
      </div>

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
            Вашите рендирани видеа се запазват тук — включително фонови сървърни рендери, дори при затворен браузър!
          </p>
        </div>

        {totalCount > 0 && (
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
      ) : totalCount === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/80 bg-card/40 p-12 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Video className="size-7" />
          </div>
          <h3 className="text-lg font-semibold">Няма чакащи видеа</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            Когато рендирате видео от страницата „Създай“, то ще се появи тук готовo за сваляне.
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
          {/* Server background jobs */}
          {serverJobs.map((job) => {
            return (
              <div
                key={job.id}
                className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card/70 backdrop-blur shadow-sm hover:shadow-md transition flex flex-col p-5"
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <h3 className="font-semibold text-base line-clamp-1">{job.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Сървърен фонов рендер (Clouding.io)
                    </p>
                  </div>
                  {job.status === "rendering" && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-500 border border-blue-500/20">
                      <Loader2 className="size-3.5 animate-spin" />
                      Рендира се на сървъра...
                    </span>
                  )}
                  {job.status === "completed" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-500 border border-emerald-500/20">
                      <CheckCircle2 className="size-3.5" />
                      Готово (Сървър)
                    </span>
                  )}
                  {job.status === "error" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-500 border border-rose-500/20">
                      <AlertCircle className="size-3.5" />
                      Грешка
                    </span>
                  )}
                </div>

                <div className="mt-auto flex items-center gap-2">
                  {job.status === "completed" ? (
                    <button
                      onClick={() => handleDownloadServerJob(job)}
                      disabled={downloadingServerId === job.id}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition cursor-pointer"
                    >
                      {downloadingServerId === job.id ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Сваля се...
                        </>
                      ) : (
                        <>
                          <Download className="size-4" />
                          Свали MP4 от сървъра
                        </>
                      )}
                    </button>
                  ) : job.status === "rendering" ? (
                    <div className="flex-1 text-xs text-muted-foreground text-center py-2 bg-muted/40 rounded-xl">
                      Можеш да затвориш Safari — видеото ще е готово тук!
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-between gap-2 px-3 py-1.5 bg-rose-500/10 rounded-xl border border-rose-500/20">
                      <span className="text-xs text-rose-500 line-clamp-1">
                        {job.error || "Грешка при рендиране"}
                      </span>
                      <button
                        onClick={() => handleRetryServerJob(job.id)}
                        className="inline-flex items-center gap-1 rounded-lg bg-rose-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-600 transition shrink-0"
                      >
                        <RefreshCw className="size-3" />
                        Опитай пак
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => handleRemoveServerJob(job.id)}
                    className="inline-flex items-center justify-center size-10 rounded-xl border border-border/80 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
                    title="Изтрий от сървъра"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Client local browser queue */}
          {items.map((item) => {
            const isDownloaded = downloadedIds.has(item.id);
            const sizeMB = (item.blob.size / (1024 * 1024)).toFixed(1);

            return (
              <div
                key={item.id}
                className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card/70 backdrop-blur shadow-sm hover:shadow-md transition flex flex-col p-5"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="font-semibold text-base line-clamp-1">{item.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.ext.toUpperCase()} • {sizeMB} MB • 1080p 30 FPS
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-500 border border-emerald-500/20">
                    <CheckCircle2 className="size-3.5" />
                    {isDownloaded ? "Изтеглено / Готово" : "Готово"}
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
                    onClick={() => handleRemoveLocal(item.id)}
                    className="inline-flex items-center justify-center size-10 rounded-xl border border-border/80 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
                    title="Изтрий от паметта"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

