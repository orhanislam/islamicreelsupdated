import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Image as ImageIcon, Copy, Send } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { generateBackground } from "@/lib/backgrounds.functions";
import { renderCarouselSlide } from "@/lib/render-carousel";
import { triggerMakeWebhook } from "@/lib/make.functions";
import { toast } from "sonner";
import { saveMediaBlob } from "@/lib/download-media";
import JSZip from "jszip";

type Slide = { topTitle: string; mainText: string; bottomText: string; footerText: string; imagePrompt: string };

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function CarouselRendererButton({ slides, title }: { slides: Slide[]; title: string }) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const runGenerate = useServerFn(generateBackground);
  const runMake = useServerFn(triggerMakeWebhook);

  const _renderAllSlides = async () => {
    setProgress("Генериране на фонове и текст...");
    return await Promise.all(slides.map(async (slide, i) => {
      const currentPrompt = slide?.imagePrompt || "cinematic dark background islamic theme";
      const bgRes = await runGenerate({ data: { prompt: currentPrompt } });
      const bgUrl = `data:${bgRes.mimeType};base64,${bgRes.base64}`;
      
      const blob = await renderCarouselSlide({
        backgroundUrl: bgUrl,
        topTitle: slide.topTitle || "",
        mainText: slide.mainText || "",
        bottomText: slide.bottomText || "",
        footerText: slide.footerText || ""
      });
      return { blob, name: `Slide_${i + 1}.png` };
    }));
  };

  const handleGenerate = async () => {
    if (!slides || slides.length === 0) return;
    setLoading(true);
    try {
      const zip = new JSZip();
      const renderedSlides = await _renderAllSlides();
      renderedSlides.forEach(({ blob, name }) => zip.file(name, blob));

      setProgress("Създаване на архив...");
      const zipBlob = await zip.generateAsync({ type: "blob" });
      
      setProgress("Изтегляне...");
      await saveMediaBlob(zipBlob, `${title}_Carousel.zip`, "application/zip");
      toast.success("Успешно изтеглен ZIP архив!");
    } catch (err: any) {
      console.error(err);
      toast.error("Грешка при генериране: " + err.message);
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  const handleSendToMake = async () => {
    if (!slides || slides.length === 0) return;
    setLoading(true);
    try {
      const renderedSlides = await _renderAllSlides();
      setProgress("Конвертиране...");
      const base64Slides = await Promise.all(renderedSlides.map(s => blobToBase64(s.blob)));
      
      setProgress("Изпращане към Make.com...");
      const webhookUrl = "https://hook.eu2.make.com/07869xb84hvnqfq2o26m56jw2ge6m1ua"; // User's specific webhook
      await runMake({ data: { title, slides: base64Slides, webhookUrl } });
      
      toast.success("Успешно изпратено към Make.com!");
    } catch (err: any) {
      console.error(err);
      toast.error("Грешка при изпращане: " + err.message);
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  const handleCopyTitle = () => {
    if (title) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(title).catch(err => console.error(err));
        toast.success("Заглавието е копирано!");
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = title;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          document.execCommand('copy');
          toast.success("Заглавието е копирано!");
        } catch (err) {
          console.error('Fallback copy failed', err);
          toast.error("Копирането не бе успешно.");
        }
        document.body.removeChild(textArea);
      }
    }
  };

  return (
    <div className="mt-3 flex flex-col gap-2">
      <Button 
        variant="outline" 
        onClick={handleCopyTitle} 
        className="w-full gap-2 border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-400"
      >
        <Copy className="size-4" /> Копирай Заглавието (за TikTok)
      </Button>
      <div className="flex gap-2 w-full">
        <Button 
          onClick={handleGenerate} 
          disabled={loading}
          className="w-1/2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20 shadow-lg gap-2"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <ImageIcon className="size-4" />}
          Изтегли
        </Button>
        <Button 
          onClick={handleSendToMake} 
          disabled={loading}
          className="w-1/2 bg-purple-600 hover:bg-purple-500 text-white shadow-purple-500/20 shadow-lg gap-2"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          Прати в Make
        </Button>
      </div>
      {loading && progress && <div className="text-xs text-center text-emerald-500/70">{progress}</div>}
    </div>
  );
}
