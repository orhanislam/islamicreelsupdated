import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Image as ImageIcon } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { generateBackground } from "@/lib/backgrounds.functions";
import { renderCarouselSlide } from "@/lib/render-carousel";
import { toast } from "sonner";
import { saveMediaBlob } from "@/lib/download-media";

type Slide = { topTitle: string; mainText: string; bottomText: string; footerText: string; imagePrompt: string };

export function CarouselRendererButton({ slides, title }: { slides: Slide[]; title: string }) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const runGenerate = useServerFn(generateBackground);

  const handleGenerate = async () => {
    if (!slides || slides.length === 0) return;
    setLoading(true);
    try {
      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        setProgress(`Генериране на снимка ${i + 1}/${slides.length}...`);
        
        // 1. Gen BG
        const bgRes = await runGenerate({ prompt: slide.imagePrompt });
        const bgUrl = `data:${bgRes.mimeType};base64,${bgRes.base64}`;
        
        setProgress(`Рендиране на слайд ${i + 1}...`);
        
        // 2. Render Slide
        const blob = await renderCarouselSlide({
          backgroundUrl: bgUrl,
          topTitle: slide.topTitle || "",
          mainText: slide.mainText || "",
          bottomText: slide.bottomText || "",
          footerText: slide.footerText || ""
        });
        
        // 3. Download
        saveMediaBlob(blob, `${title}_Slide_${i + 1}.png`);
      }
      toast.success("Всички слайдове са изтеглени!");
    } catch (err: any) {
      console.error(err);
      toast.error("Грешка при генерирането: " + err.message);
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  return (
    <div className="mt-3">
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
