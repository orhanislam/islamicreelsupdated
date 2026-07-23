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
  getServerRenderJobDownloadUrl,
  deleteServerRenderJob,
  retryServerRenderJob,
  cleanServerDiskSpace,
  type ServerJobRecord as ServerJob,
} from "@/lib/render.functions";
import { generateViralThumbnail } from "@/lib/thumbnail.functions";
import { formatViralSocialCaption } from "@/lib/caption.functions";
import { saveMediaBlob, saveMediaFromUrl, isIOSMediaDevice, sanitizeFilename } from "@/lib/download-media";
import { Download, Trash2, CheckCircle2, ArrowLeft, Video, Film, RefreshCw, Loader2, AlertCircle, CloudCheck, Image as ImageIcon, Sparkles, Copy, Package } from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import JSZip from "jszip";

export const Route = createFileRoute("/_app/downloads")({
  component: DownloadsPage,
});

function DownloadsPage() {
  const [items, setItems] = useState<DownloadItem[]>([]);
  const [serverJobs, setServerJobs] = useState<ServerJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());
  const [downloadingServerId, setDownloadingServerId] = useState<string | null>(null);
  const [downloadingBatch, setDownloadingBatch] = useState(false);
  const [downloadingZipBatch, setDownloadingZipBatch] = useState(false);
  const [downloadingKitId, setDownloadingKitId] = useState<string | null>(null);
  const [generatingThumbId, setGeneratingThumbId] = useState<string | null>(null);
  const [cleaningDisk, setCleaningDisk] = useState(false);
  const [preloadedUrls, setPreloadedUrls] = useState<Record<string, string>>({});
  const preloadingRef = useRef<Set<string>>(new Set());

  const handleCopyTikTokCaption = (title: string) => {
    const text = formatViralSocialCaption(title);
    navigator.clipboard.writeText(text);
    toast.success("📋 Професионалният TikTok/Reels текст е копиран в клипборда!");
  };

  const handleCleanServerDisk = async () => {
    try {
      setCleaningDisk(true);
      toast.message("🧹 Изчиствам всички временни файлове, кеш и логове на сървъра...");
      await cleanServerDiskSpace();
      toast.success("✅ Дисковото пространство на сървъра е успешно освободено!");
      loadAll();
    } catch (e: any) {
      toast.error(e?.message || "Грешка при почистване на диска");
    } finally {
      setCleaningDisk(false);
    }
  };

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

  // Note: We fetch base64 video data on-demand upon download or explicit click to save network bandwidth and avoid ENOSPC/memory spikes.

  // Auto-trigger download for local items when opened
  useEffect(() => {
    if (items.length === 0) return;
    items.forEach((item) => {
      if (!downloadedIds.has(item.id)) {
        triggerDownload(item, false);
      }
    });
  }, [items]);

  const triggerDownload = async (item: DownloadItem, manual = false) => {
    try {
      await saveMediaBlob(item.blob, `${item.title || "nur-studio-video"}.${item.ext}`, item.mimeType);
      setDownloadedIds((prev) => new Set([...prev, item.id]));
      if (manual) {
        toast.success("Изтеглянето е успешно!");
      } else {
        toast.success(`Изтегляне: ${item.title}.${item.ext}`);
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
    setDownloadingServerId(job.id);
    try {
      toast.message("Подготвям видеото за изтегляне от сървъра...");

      const { downloadUrl } = await getServerRenderJobDownloadUrl({
        data: { id: job.id, title: job.title },
      });

      // On iOS Safari, attempt native Share Sheet ("Save Video" directly into Photos app)
      if (isIOSMediaDevice()) {
        try {
          const res = await saveMediaFromUrl(downloadUrl, `${job.title || "islamic-reel"}.mp4`, "video/mp4");
          if (res === "shared") {
            toast.success("Видеото е запазено или споделено успешно!");
            return;
          }
        } catch (e) {
          console.warn("[downloads] iOS streaming/share failed:", e);
        }
      }

      // For iOS Safari: Open in a new tab because blob/direct downloads sometimes fail inside PWA or standalone
      if (isIOSMediaDevice()) {
        window.open(downloadUrl, "_blank");
        return;
      }

      // Universal robust native download via streaming endpoint (zero memory crash risk)
      // window.location.assign triggers the native download manager seamlessly and bypasses async popup blockers on Android
      window.location.assign(downloadUrl);
      toast.success("Изтеглянето стартира! Провери лентата за изтегляния.");

    } catch (e) {
      toast.error("Файлът не беше намерен. Възможно е да е изчистен. Натисни 🔄 за повторно рендиране!");
    } finally {
      setDownloadingServerId(null);
    }
  };

  const handleDownloadAllCompleted = async () => {
    const completedServerJobs = serverJobs.filter((j) => j.status === "completed");
    const allCount = completedServerJobs.length + items.length;
    if (allCount === 0) {
      toast.error("Няма готови видеа за сваляне");
      return;
    }
    try {
      setDownloadingBatch(true);
      toast.message(`📦 Стартирам последователно сваляне на всички ${allCount} готови видеа...`);
      for (let i = 0; i < completedServerJobs.length; i++) {
        const job = completedServerJobs[i];
        toast.message(`Сваляне на ${i + 1}/${allCount}: ${job.title}...`);
        await handleDownloadServerJob(job);
        await new Promise((r) => setTimeout(r, 800));
      }
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        toast.message(`Сваляне на ${completedServerJobs.length + i + 1}/${allCount}: ${item.title}...`);
        await triggerDownload(item, false);
        await new Promise((r) => setTimeout(r, 800));
      }
      toast.success(`🎉 Всички ${allCount} видеа са свалени успешно!`);
    } catch (e) {
      toast.error("Грешка при масовото сваляне");
    } finally {
      setDownloadingBatch(false);
    }
  };

  const handleDownloadAllZip = async () => {
    const completedServerJobs = serverJobs.filter((j) => j.status === "completed");
    const allCount = completedServerJobs.length + items.length;
    if (allCount === 0) {
      toast.error("Няма готови видеа за пакетиране");
      return;
    }
    try {
      setDownloadingZipBatch(true);
      toast.message(`📦 Създаване на масивна All-in-One ZIP архива с ${allCount} видеа + Social Kits...`);
      const zip = new JSZip();

      for (let i = 0; i < completedServerJobs.length; i++) {
        const job = completedServerJobs[i];
        toast.message(`Пакетиране на ${i + 1}/${allCount}: ${job.title}...`);
        const folderName = sanitizeFilename(`${i + 1}_${job.title || "islamic_video"}`);
        const folder = zip.folder(folderName) || zip;

        const { downloadUrl } = await getServerRenderJobDownloadUrl({ data: { id: job.id, title: job.title } });
        const res = await fetch(downloadUrl);
        if (res.ok) {
          const blob = await res.blob();
          folder.file(`${folderName}.mp4`, blob);
        }
        
        const captionText = formatViralSocialCaption(job.title || "Ислямска мъдрост");
        folder.file(`${folderName}_tiktok_caption.txt`, captionText);
        try {
          const thumbRes = await generateViralThumbnail({ data: { title: job.title || "Ислямска мъдрост" } });
          if (thumbRes && thumbRes.dataUrl && thumbRes.dataUrl.includes("base64,")) {
            const thumbBase64 = thumbRes.dataUrl.split("base64,")[1];
            folder.file(`${folderName}_thumbnail.jpg`, thumbBase64, { base64: true });
          }
        } catch {}
      }

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        toast.message(`Пакетиране на ${completedServerJobs.length + i + 1}/${allCount}: ${item.title}...`);
        const folderName = sanitizeFilename(`${completedServerJobs.length + i + 1}_${item.title || "islamic_video"}`);
        const folder = zip.folder(folderName) || zip;
        folder.file(`${folderName}.${item.ext}`, item.blob);
        const captionText = formatViralSocialCaption(item.title || "Ислямска мъдрост");
        folder.file(`${folderName}_tiktok_caption.txt`, captionText);
      }

      toast.message("Генериране на ZIP файла...");
      const zipBlob = await zip.generateAsync({ type: "blob" });
      await saveMediaBlob(zipBlob, `Islamic_Reels_All_In_One_Package_${Date.now()}.zip`, "application/zip");
      toast.success(`🎉 All-in-One ZIP пакетът със ${allCount} видеа е свален успешно!`);
    } catch (e) {
      toast.error("Грешка при създаване на общата ZIP архива");
    } finally {
      setDownloadingZipBatch(false);
    }
  };

  const handleDownloadSocialKit = async (job: ServerJob) => {
    setDownloadingKitId(job.id);
    try {
      toast.message("📦 Изграждане на 1-Click Viral Social Kit (MP4 + TikTok Текст + Корица в ZIP)...");
      const zip = new JSZip();
      const folderName = sanitizeFilename(job.title || "islamic_video");
      const folder = zip.folder(folderName) || zip;

      const { downloadUrl } = await getServerRenderJobDownloadUrl({ data: { id: job.id, title: job.title } });
      const res = await fetch(downloadUrl);
      if (res.ok) {
        const blob = await res.blob();
        folder.file(`${folderName}_video.mp4`, blob);
      }

      const captionText = formatViralSocialCaption(job.title || "Ислямска мъдрост");
      folder.file(`${folderName}_tiktok_caption.txt`, captionText);

      try {
        const thumbRes = await generateViralThumbnail({ data: { title: job.title || "Ислямска мъдрост" } });
        if (thumbRes && thumbRes.dataUrl && thumbRes.dataUrl.includes("base64,")) {
          const thumbBase64 = thumbRes.dataUrl.split("base64,")[1];
          folder.file(`${folderName}_thumbnail.jpg`, thumbBase64, { base64: true });
        }
      } catch {}

      const content = await zip.generateAsync({ type: "blob" });
      await saveMediaBlob(content, `${folderName}_Viral_Social_Kit.zip`, "application/zip");
      toast.success("🎉 Viral Social Kit (ZIP) е изтеглен успешно!");
    } catch (e: any) {
      toast.error("Грешка при създаване на Viral Social Kit ZIP");
    } finally {
      setDownloadingKitId(null);
    }
  };

  const handleDownloadLocalSocialKit = async (item: DownloadItem) => {
    setDownloadingKitId(item.id);
    try {
      toast.message("📦 Изграждане на 1-Click Viral Social Kit (MP4 + TikTok Текст + Корица в ZIP)...");
      const zip = new JSZip();
      const folderName = sanitizeFilename(item.title || "islamic_video");
      const folder = zip.folder(folderName) || zip;

      folder.file(`${folderName}_video.${item.ext}`, item.blob);

      const captionText = formatViralSocialCaption(item.title || "Ислямска мъдрост");
      folder.file(`${folderName}_tiktok_caption.txt`, captionText);

      try {
        const thumbRes = await generateViralThumbnail({ data: { title: item.title || "Ислямска мъдрост" } });
        if (thumbRes && thumbRes.dataUrl && thumbRes.dataUrl.includes("base64,")) {
          const thumbBase64 = thumbRes.dataUrl.split("base64,")[1];
          folder.file(`${folderName}_thumbnail.jpg`, thumbBase64, { base64: true });
        }
      } catch {}

      const content = await zip.generateAsync({ type: "blob" });
      await saveMediaBlob(content, `${folderName}_Viral_Social_Kit.zip`, "application/zip");
      toast.success("🎉 Viral Social Kit (ZIP) е изтеглен успешно!");
    } catch (e: any) {
      toast.error("Грешка при създаване на Viral Social Kit ZIP");
    } finally {
      setDownloadingKitId(null);
    }
  };

  const handleDownloadThumbnail = async (id: string, title: string) => {
    try {
      setGeneratingThumbId(id);
      toast.message("Генериране на професионална вайръл корица (Thumbnail)...");
      const res = await generateViralThumbnail({ data: { title } });
      const a = document.createElement("a");
      a.href = res.dataUrl;
      a.download = `${title || "islamic-reel"}_thumbnail.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Вайръл корицата е свалена успешно!");
    } catch (e) {
      toast.error("Не успях да създам корицата");
    } finally {
      setGeneratingThumbId(null);
    }
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

        <div className="flex items-center gap-2 flex-wrap">
          {(serverJobs.some((j) => j.status === "completed") || items.length > 0) && (
            <>
              <button
                onClick={handleDownloadAllZip}
                disabled={downloadingZipBatch || downloadingBatch}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2.5 text-sm font-bold text-black shadow-lg hover:from-amber-400 hover:to-amber-500 transition cursor-pointer scale-105"
              >
                {downloadingZipBatch ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Пакетиране в ZIP...
                  </>
                ) : (
                  <>
                    <Package className="size-4" /> 📦 Свали Всички като ZIP Пакет ({serverJobs.filter((j) => j.status === "completed").length + items.length})
                  </>
                )}
              </button>
              <button
                onClick={handleDownloadAllCompleted}
                disabled={downloadingBatch || downloadingZipBatch}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 text-sm font-bold text-black shadow-lg hover:from-emerald-400 hover:to-teal-500 transition cursor-pointer"
              >
                {downloadingBatch ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Сваляне 1 по 1...
                  </>
                ) : (
                  <>
                    <Download className="size-4" /> Свали Всички 1 по 1
                  </>
                )}
              </button>
            </>
          )}
          <button
            onClick={handleCleanServerDisk}
            disabled={cleaningDisk}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3.5 py-2 text-sm font-medium text-primary hover:bg-primary/20 transition cursor-pointer"
          >
            {cleaningDisk ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            🧹 Изчисти диска на сървъра
          </button>
          {totalCount > 0 && (
            <button
              onClick={handleClearAll}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-sm font-medium hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition cursor-pointer"
            >
              <Trash2 className="size-4" /> Изчисти всички
            </button>
          )}
        </div>
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
                  {job.status === "queued" && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-500 border border-amber-500/20">
                      <Loader2 className="size-3.5 animate-spin" />
                      Чака в опашка (1 по 1)...
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
                    <>
                      <button
                        onClick={() => handleDownloadServerJob(job)}
                        disabled={downloadingServerId === job.id}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-3.5 py-2.5 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition cursor-pointer"
                      >
                        {downloadingServerId === job.id ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            Сваля се...
                          </>
                        ) : (
                          <>
                            <Download className="size-4" />
                            Свали MP4
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleCopyTikTokCaption(job.title)}
                        title="Копирай TikTok Заглавие & Описание с хаштагове"
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-teal-500/40 bg-teal-500/10 px-3 py-2.5 text-sm font-medium text-teal-400 hover:bg-teal-500/20 transition cursor-pointer shrink-0"
                      >
                        <Copy className="size-4" />
                        TikTok Текст
                      </button>
                      <button
                        onClick={() => handleDownloadThumbnail(job.id, job.title)}
                        disabled={generatingThumbId === job.id}
                        title="Генерирай Вайръл TikTok Корица (Thumbnail)"
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-sm font-medium text-amber-400 hover:bg-amber-500/20 transition cursor-pointer shrink-0"
                      >
                        {generatingThumbId === job.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <>
                            <ImageIcon className="size-4" />
                            Корица
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleDownloadSocialKit(job)}
                        disabled={downloadingKitId === job.id}
                        title="1-Click Viral Social Kit (Видео + Текст + Корица в 1 ZIP файл)"
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-primary/20 border border-amber-500/50 px-3 py-2.5 text-sm font-bold text-amber-400 hover:bg-amber-500/30 transition cursor-pointer shrink-0"
                      >
                        {downloadingKitId === job.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <>
                            <Package className="size-4" />
                            Social Kit (ZIP)
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleRetryServerJob(job.id)}
                        title="Рендирай отново (Ако файлът на сървъра е бил изчистен от старата система)"
                        className="inline-flex items-center justify-center rounded-xl border border-primary/30 bg-primary/10 p-2.5 text-sm font-medium text-primary hover:bg-primary/20 transition cursor-pointer shrink-0"
                      >
                        <RefreshCw className="size-4" />
                      </button>
                    </>
                  ) : job.status === "rendering" || job.status === "queued" ? (
                    <div className="flex-1 space-y-2 py-3 px-3 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                      <div className="flex items-center justify-between text-xs font-semibold text-blue-400">
                        <span className="flex items-center gap-1.5">
                          <Loader2 className="size-3.5 animate-spin text-blue-400" />
                          {job.status === "rendering" ? "🚀 Сървърен фонов рендер..." : "⏳ В опашка за последователно рендиране..."}
                        </span>
                        <span className="font-mono">{job.status === "rendering" ? "65% • Live" : "Опашка"}</span>
                      </div>
                      <div className="w-full bg-blue-500/10 rounded-full h-2 overflow-hidden border border-blue-500/20">
                        <div
                          className={`h-full bg-gradient-to-r from-blue-500 via-teal-400 to-amber-400 rounded-full transition-all duration-1000 ${
                            job.status === "rendering" ? "w-2/3 animate-pulse" : "w-1/4 opacity-60"
                          }`}
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground text-center">
                        {job.status === "rendering"
                          ? "⚡ 100% автономно на Clouding.io — можеш спокойно да затвориш браузъра и да се върнеш по-късно!"
                          : "🚀 Ще стартира автоматично веднага щом предходното видео завърши (за да не се претовари диска)."}
                      </p>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-3 py-2 bg-rose-500/10 rounded-xl border border-rose-500/20">
                      <span className="text-xs text-rose-500 line-clamp-2">
                        {job.error || "Грешка при рендиране"}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                        <button
                          onClick={async () => {
                            await handleCleanServerDisk();
                            await handleRetryServerJob(job.id);
                          }}
                          disabled={cleaningDisk}
                          className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1 text-xs font-bold text-black hover:bg-amber-400 transition cursor-pointer"
                        >
                          🧹 Изчисти диска и опитай
                        </button>
                        <button
                          onClick={() => handleRetryServerJob(job.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-rose-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-600 transition shrink-0 cursor-pointer"
                        >
                          <RefreshCw className="size-3" />
                          Опитай пак
                        </button>
                      </div>
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

                <div className="mt-4 flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => triggerDownload(item, true)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition cursor-pointer"
                  >
                    <Download className="size-4" />
                    MP4
                  </button>
                  <button
                    onClick={() => handleCopyTikTokCaption(item.title || "islamic-reel")}
                    title="Копирай TikTok Заглавие & Описание с хаштагове"
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-teal-500/40 bg-teal-500/10 px-3 py-2.5 text-sm font-medium text-teal-400 hover:bg-teal-500/20 transition cursor-pointer shrink-0"
                  >
                    <Copy className="size-4" />
                    TikTok Текст
                  </button>
                  <button
                    onClick={() => handleDownloadThumbnail(item.id, item.title || "islamic-reel")}
                    disabled={generatingThumbId === item.id}
                    title="Генерирай Вайръл TikTok Корица (Thumbnail)"
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-sm font-medium text-amber-400 hover:bg-amber-500/20 transition cursor-pointer shrink-0"
                  >
                    {generatingThumbId === item.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <>
                        <ImageIcon className="size-4" />
                        Корица
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleDownloadLocalSocialKit(item)}
                    disabled={downloadingKitId === item.id}
                    title="1-Click Viral Social Kit (Видео + Текст + Корица в 1 ZIP файл)"
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-primary/20 border border-amber-500/50 px-3 py-2.5 text-sm font-bold text-amber-400 hover:bg-amber-500/30 transition cursor-pointer shrink-0"
                  >
                    {downloadingKitId === item.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <>
                        <Package className="size-4" />
                        Social Kit (ZIP)
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleRemoveLocal(item.id)}
                    className="inline-flex items-center justify-center size-10 rounded-xl border border-border/80 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition cursor-pointer shrink-0"
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

