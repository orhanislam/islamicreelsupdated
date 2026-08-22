import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Image as ImageIcon } from "lucide-react";
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

      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        setProgress(`Генериране на фон ${i + 1}/${slides.length}...`);
        
        const currentPrompt = slide?.imagePrompt || "cinematic dark background islamic theme";
        const bgRes = await runGenerate({ data: { prompt: currentPrompt } });
        const bgUrl = `data:${bgRes.mimeType};base64,${bgRes.base64}`;
        
        setProgress(`Рендериране на слайд ${i + 1}...`);
        
        const blob = await renderCarouselSlide({
          backgroundUrl: bgUrl,
          topTitle: slide.topTitle || "",
          mainText: slide.mainText || "",
          bottomText: slide.bottomText || "",
          footerText: slide.footerText || ""
        });
        
        zip.file(`Slide_${i + 1}.png`, blob);
      }

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
