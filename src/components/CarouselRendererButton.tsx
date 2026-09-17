import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Image as ImageIcon, Copy, Send, Video } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { generateBackground, getCarouselBackgrounds } from "@/lib/backgrounds.functions";
import { renderCarouselSlide } from "@/lib/render-carousel";
import { triggerMakeWebhook } from "@/lib/make.functions";
import { cleanProposalTitle } from "@/lib/assistant.functions";
import { formatViralSocialCaption, generateTikTokSEOTitle } from "@/lib/caption.functions";
import { toast } from "sonner";
import { saveMediaBlob } from "@/lib/download-media";
import JSZip from "jszip";
import { autoSplitSlides } from "@/lib/split-slides";
import { buildCarouselVideo } from "@/lib/carousel-video.functions";
import { fetchCarouselSlideVideos, getCarouselSlideVideos } from "@/lib/pexels.functions";
import { addGenerationHistoryEntry } from "@/lib/generation-history.functions";


type Slide = {
  topTitle: string;
  mainText: string;
  bottomText: string;
  footerText?: string;
  imagePrompt?: string;
  quoteText?: string;
  commentaryText?: string;
  sourceBadge?: string;
  text?: string;
};

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function CarouselRendererButton({ slides: initialSlides, title }: { slides: Slide[]; title: string }) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const runGenerate = useServerFn(generateBackground);
  const runGetBackgrounds = useServerFn(getCarouselBackgrounds);
  const runMake = useServerFn(triggerMakeWebhook);
  const runBuildVideo = useServerFn(buildCarouselVideo);
  const runFetchVideos = useServerFn(getCarouselSlideVideos);

  const cleanTitle = cleanProposalTitle(title) || "Ислямски_Карусел";

  const _renderAllSlides = async () => {
    setProgress("Обработка на текстовете...");
    const slides = autoSplitSlides(initialSlides);

    setProgress("Извличане на фонови изображения...");
    let cycleIndex = 0;
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const stored = parseInt(localStorage.getItem("islamic_carousel_bg_cycle") || "0", 10);
        cycleIndex = isNaN(stored) ? 0 : stored;
        localStorage.setItem("islamic_carousel_bg_cycle", String((cycleIndex + 1) % 1000));
      } catch {
        cycleIndex = 0;
      }
    }

    let bgList: string[] = [];
    try {
      const bgRes = await runGetBackgrounds({ data: { count: slides.length, cycleIndex } });
      if (bgRes?.backgrounds && bgRes.backgrounds.length > 0) {
        bgList = bgRes.backgrounds;
      }
    } catch (err) {
      console.warn("Could not fetch local backgrounds, using fallback generator:", err);
    }

    setProgress("Изчисляване на глобален размер на текста...");
    // Pre-compute the minimum scale across ALL slides to guarantee consistency
    let minScale = 1.0;
    let minGapScale = 1.0;
    if (typeof document !== "undefined") {
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = 1080;
      tempCanvas.height = 1920;
      const ctx = tempCanvas.getContext("2d");
      if (ctx) {
        const { fitSlideLayout } = await import("@/lib/render-carousel");
        
        for (const slide of slides) {
          const layout = fitSlideLayout(ctx, {
            backgroundUrl: "",
            topTitle: slide.topTitle || "",
            mainText: slide.mainText || "",
            bottomText: slide.bottomText || "",
            footerText: slide.footerText || "",
            quoteText: slide.quoteText,
            commentaryText: slide.commentaryText,
          });
          if (layout.scale < minScale) minScale = layout.scale;
          if (layout.gapScale < minGapScale) minGapScale = layout.gapScale;
        }
      }
    }

    setProgress("Рендиране на слайдовете в TikTok Safe Zone...");
    return await Promise.all(
      slides.map(async (slide, i) => {
        let bgUrl = bgList[i % (bgList.length || 1)];
        if (!bgUrl) {
          const currentPrompt = slide?.imagePrompt || "cinematic dark background islamic theme";
          const bgRes = await runGenerate({ data: { prompt: currentPrompt } });
          bgUrl = `data:${bgRes.mimeType};base64,${bgRes.base64}`;
        }

        const blob = await renderCarouselSlide(
          {
            backgroundUrl: bgUrl,
            topTitle: slide.topTitle || "",
            mainText: slide.mainText || "",
            bottomText: slide.bottomText || "",
            footerText: slide.footerText || "",
            quoteText: slide.quoteText,
            commentaryText: slide.commentaryText,
          },
          minScale,
          minGapScale
        );
        return { blob, name: `Slide_${i + 1}.png` };
      }),
    );
  };

  const handleGenerate = async () => {
    if (!initialSlides || initialSlides.length === 0) return;
    setLoading(true);
    try {
      const zip = new JSZip();
      const renderedSlides = await _renderAllSlides();
      renderedSlides.forEach(({ blob, name }) => zip.file(name, blob));

      setProgress("Създаване на архив...");
      const zipBlob = await zip.generateAsync({ type: "blob" });

      setProgress("Изтегляне...");
      const safeFilename = `${cleanTitle.replace(/[<>:"/\\|?*]+/g, "_")}_Carousel.zip`;
      await saveMediaBlob(zipBlob, safeFilename, "application/zip");
      toast.success("Успешно изтеглен ZIP архив!");

      addGenerationHistoryEntry({
        data: {
          entry: {
            type: "carousel",
            title: cleanTitle,
            reference: cleanTitle,
            bulgarianText: initialSlides[0]?.mainText || initialSlides[0]?.topTitle,
            format: "carousel",
            timestamp: Date.now(),
          },
        },
      }).catch(() => {});
    } catch (err: any) {
      console.error(err);
      toast.error("Грешка при генериране: " + err.message);
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  const handleSendToMake = async () => {
    if (!initialSlides || initialSlides.length === 0) return;
    setLoading(true);
    try {
      const renderedSlides = await _renderAllSlides();
      setProgress("Конвертиране...");
      const base64Slides = await Promise.all(renderedSlides.map((s) => blobToBase64(s.blob)));

      setProgress("Изпращане към Make.com...");
      const webhookUrl = "https://hook.eu2.make.com/07869xb84hvnqfq2o26m56jw2ge6m1ua"; // User's specific webhook
      await runMake({ data: { title: cleanTitle, slides: base64Slides, webhookUrl } });

      toast.success("Успешно изпратено към Make.com!");
    } catch (err: any) {
      console.error(err);
      toast.error("Грешка при изпращане: " + err.message);
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  /** Extract the best summary/dalil/hook from slides for the SEO caption */
  const _buildCaptionFromSlides = () => {
    // Slide 1 → hook (mainText), Slide 3/4 → dalilText (quoteText), last → actionStep (bottomText or mainText with "Запази"/"Амин")
    let hookQuestion = "";
    let dalilText = "";
    let explanation = "";
    let actionStep = "";

    const slides = initialSlides || [];
    // Hook from first slide
    const firstSlide = slides[0];
    if (firstSlide) {
      hookQuestion = (firstSlide.mainText || firstSlide.text || "").trim().slice(0, 180);
    }
    // Dalil from slide with quoteText, or slide 2+
    for (let i = 1; i < slides.length; i++) {
      const s = slides[i];
      if (s.quoteText && s.quoteText.trim().length > 15) {
        dalilText = s.quoteText.trim();
        break;
      }
      if (s.mainText && /„|"|\"|«|Аллах|Пратеникът|Всевишният/i.test(s.mainText)) {
        dalilText = s.mainText.trim();
        break;
      }
    }
    // Explanation from commentaryText of any slide
    for (const s of slides) {
      if (s.commentaryText && s.commentaryText.trim().length > 20) {
        explanation = s.commentaryText.trim();
        break;
      }
    }
    // Action from last slide
    const lastSlide = slides[slides.length - 1];
    if (lastSlide && lastSlide !== firstSlide) {
      actionStep = (lastSlide.bottomText || lastSlide.mainText || "").trim();
    }

    return { hookQuestion, dalilText, explanation, actionStep };
  };

  /** Copy full TikTok SEO + Salafi AI Shaykh caption to clipboard */
  const handleCopyCaption = () => {
    const { hookQuestion, dalilText, explanation, actionStep } = _buildCaptionFromSlides();
    const text = formatViralSocialCaption(cleanTitle, undefined, {
      title: cleanTitle,
      hookQuestion,
      dalilText,
      explanation,
      actionStep,
    });
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch((err) => console.error(err));
    } else {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-999999px";
      ta.style.top = "-999999px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try { document.execCommand("copy"); } catch {}
      document.body.removeChild(ta);
    }
    toast.success("✅ TikTok SEO текстът (Salafi AI Shaykh) е копиран!");
  };

  /** Copy just the clean 1-line TikTok SEO headline */
  const handleCopyTitle = () => {
    const seoTitle = generateTikTokSEOTitle(cleanTitle);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(seoTitle).catch((err) => console.error(err));
    } else {
      const ta = document.createElement("textarea");
      ta.value = seoTitle;
      ta.style.position = "fixed";
      ta.style.left = "-999999px";
      ta.style.top = "-999999px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try { document.execCommand("copy"); } catch {}
      document.body.removeChild(ta);
    }
    toast.success("✅ TikTok SEO заглавието е копирано!");
  };



  const handleGenerateVideo = async () => {
    if (!initialSlides || initialSlides.length === 0) return;
    setLoading(true);
    try {
      setProgress("Създаване на наративен сценарий от карусела...");

      // 1. Build cohesive, professional narration script from carousel slides
      const scriptParts: string[] = [];
      const seen = new Set<string>();

      for (const slide of initialSlides) {
        const candidates = [slide.quoteText, slide.mainText, slide.commentaryText, slide.text]
          .filter((t): t is string => Boolean(t && typeof t === "string" && t.trim().length > 0));

        for (const text of candidates) {
          const clean = text
            .replace(/Продължава\s*👉?/gi, "")
            .replace(/👉/g, "")
            .replace(/Слайд\s*\d+/gi, "")
            .trim();
          if (clean && !seen.has(clean)) {
            seen.add(clean);
            scriptParts.push(clean);
          }
        }
      }

      const fullNarrationScript = scriptParts.join(". ").replace(/\s+/g, " ").replace(/\.+/g, ".").trim();

      setProgress("Търсене на кинематографични видео сцени (Халал B-Roll)...");
      let videoUrls: string[] = [];
      try {
        const videoResults = await runFetchVideos({ data: { slides: initialSlides as any } });
        if (Array.isArray(videoResults)) {
          videoUrls = videoResults.map((v: any) => v?.videoUrl).filter(Boolean);
        }
      } catch (serverFetchErr) {
        console.warn("Pre-fetch video failed, will use server B-roll:", serverFetchErr);
      }

      setProgress("Генериране на видео със синхронизирани субтитри и аудио...");
      const res = await runBuildVideo({
        data: {
          slides: initialSlides as any,
          script: fullNarrationScript,
          title: cleanTitle,
          bRollUrls: videoUrls,
          tiktokTheme: "hormozi",
        },
      });

      if (res && res.jobId) {
        const downloadUrl =
          res.downloadUrl ||
          `/api/download/${res.jobId}?filename=${encodeURIComponent(
            cleanTitle.replace(/[<>:"/\\|?*]+/g, "_") + ".mp4"
          )}`;
        window.location.href = downloadUrl;
        toast.success("Видеото е готово с динамични субтитри и се изтегля!");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Грешка при генериране на видео: " + err.message);
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  return (
    <div className="mt-3 flex flex-col gap-2">
      {/* Primary: Full TikTok SEO Caption + Salafi AI Shaykh text */}
      <Button
        variant="outline"
        onClick={handleCopyCaption}
        className="w-full gap-2 border-teal-500/40 hover:bg-teal-500/10 text-teal-400 font-semibold"
        title="Копирай пълния TikTok SEO пост (заглавие, Далил, Salafi AI Shaykh обяснение, призив, хаштагове)"
      >
        <Copy className="size-4" /> 📋 Копирай TikTok SEO Текст (Salafi AI Shaykh)
      </Button>
      {/* Secondary: Just the 1-line SEO headline */}
      <Button
        variant="outline"
        onClick={handleCopyTitle}
        className="w-full gap-2 border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-400 text-sm"
        title="Копирай само SEO заглавието (1 ред)"
      >
        <Copy className="size-3.5" /> Само SEO Заглавие (1 ред)
      </Button>

      <div className="flex gap-2 w-full flex-wrap">
        <Button
          onClick={handleGenerate}
          disabled={loading}
          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20 shadow-lg gap-2"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ImageIcon className="size-4" />
          )}
          Изтегли ZIP
        </Button>
        <Button
          onClick={handleGenerateVideo}
          disabled={loading}
          className="flex-1 bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20 shadow-lg gap-2"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Video className="size-4" />}
          Изтегли Видео
        </Button>
        <Button
          onClick={handleSendToMake}
          disabled={loading}
          className="flex-1 bg-purple-600 hover:bg-purple-500 text-white shadow-purple-500/20 shadow-lg gap-2"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          Прати в Make
        </Button>
      </div>
      {loading && progress && (
        <div className="text-xs text-center text-emerald-500/70">{progress}</div>
      )}
    </div>
  );
}
