const fs = require('fs');
let code = fs.readFileSync('src/components/CarouselRendererButton.tsx', 'utf-8');

// Ensure JSZip is imported
if (!code.includes('import JSZip')) {
  code = code.replace('import { saveMediaBlob } from "@/lib/download-media";', 'import { saveMediaBlob } from "@/lib/download-media";\nimport JSZip from "jszip";');
}

const replacement = `
  const handleGenerate = async () => {
    if (!slides || slides.length === 0) return;
    setLoading(true);
    try {
      const zip = new JSZip();

      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        setProgress(\`Генериране на фон \${i + 1}/\${slides.length}...\`);
        
        const currentPrompt = slide?.imagePrompt || "cinematic dark background islamic theme";
        const bgRes = await runGenerate({ data: { prompt: currentPrompt } });
        const bgUrl = \`data:\${bgRes.mimeType};base64,\${bgRes.base64}\`;
        
        setProgress(\`Рендериране на слайд \${i + 1}...\`);
        
        const blob = await renderCarouselSlide({
          backgroundUrl: bgUrl,
          topTitle: slide.topTitle || "",
          mainText: slide.mainText || "",
          bottomText: slide.bottomText || "",
          footerText: slide.footerText || ""
        });
        
        zip.file(\`Slide_\${i + 1}.png\`, blob);
      }

      setProgress("Пакетиране на архива...");
      const zipBlob = await zip.generateAsync({ type: "blob" });
      
      setProgress("Изтегляне...");
      await saveMediaBlob(zipBlob, \`\${title}_Carousel.zip\`, "application/zip");
      
      toast.success("Каруселът беше изтеглен като ZIP архив!");
    } catch (err: any) {
      console.error(err);
      toast.error("Грешка при генерирането: " + err.message);
    } finally {
      setLoading(false);
      setProgress("");
    }
  };
`;

code = code.replace(/const handleGenerate = async \(\) => \{[\s\S]*?finally \{\s*setLoading\(false\);\s*setProgress\(""\);\s*\}\s*\};/m, replacement.trim());

fs.writeFileSync('src/components/CarouselRendererButton.tsx', code);
console.log("Patched CarouselRendererButton to download ZIP file");
