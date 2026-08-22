import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Image as ImageIcon, Copy } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { generateBackground } from "@/lib/backgrounds.functions";
import { renderCarouselSlide } from "@/lib/render-carousel";
import { toast } from "sonner";
import { saveMediaBlob } from "@/lib/download-media";
import JSZip from "jszip";

type Slide = { topTitle: string; mainText: string; bottomText: string; footerText: string; imagePrompt: string };

export function CarouselRendererButton({ slides, title }: { slides: Slide[]; title: string }) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const runGenerate = useServerFn(generateBackground);

  const handleGenerate = async () => {
    if (!slides || slides.length === 0) return;
    setLoading(true);
    try {
      const zip = new JSZip();

            setProgress("Генериране на всички снимки едновременно...");
      const renderedSlides = await Promise.all(slides.map(async (slide, i) => {
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
      
      renderedSlides.forEach(({ blob, name }) => {
        zip.file(name, blob);
      });

      setProgress("Пакетиране на архива...");
      const zipBlob = await zip.generateAsync({ type: "blob" });
      
      setProgress("Изтегляне...");
      await saveMediaBlob(zipBlob, `${title}_Carousel.zip`, "application/zip");
      
      toast.success("Каруселът беше изтеглен като ZIP архив!");
    } catch (err: any) {
      console.error(err);
      toast.error("Грешка при генерирането: " + err.message);
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
      <Button 
        onClick={handleGenerate} 
        disabled={loading}
        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20 shadow-lg gap-2"
      >
        {loading ? <Loader2 className="size-4 animate-spin" /> : <ImageIcon className="size-4" />}
        {loading ? progress : "Генерирай и Изтегли Слайдовете"}
      </Button>
    </div>
  );
}
