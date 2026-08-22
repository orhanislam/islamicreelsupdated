const fs = require('fs');
let code = fs.readFileSync('src/components/CarouselRendererButton.tsx', 'utf-8');

const replacement = `
  const handleGenerate = async () => {
    if (!slides || slides.length === 0) return;
    setLoading(true);
    try {
      const blobs: Blob[] = [];
      const files: File[] = [];

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
        
        blobs.push(blob);
        files.push(new File([blob], \`\${title}_Slide_\${i + 1}.png\`, { type: blob.type || "image/png" }));
      }

      setProgress("Запазване на слайдовете...");
      
      const nav = navigator as any;
      if (nav.canShare && nav.canShare({ files })) {
        try {
          await nav.share({
            title: title || "TikTok Carousel",
            files: files
          });
          toast.success("Слайдовете бяха споделени/запазени успешно!");
          setLoading(false);
          setProgress("");
          return;
        } catch (shareErr) {
          console.warn("Share failed or cancelled", shareErr);
        }
      }

      // Fallback: download sequentially
      for (let i = 0; i < blobs.length; i++) {
        saveMediaBlob(blobs[i], \`\${title}_Slide_\${i + 1}.png\`);
        await new Promise(r => setTimeout(r, 600)); // slight delay to bypass popup blockers
      }
      
      toast.success("Слайдовете се изтеглят!");
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
console.log("Patched CarouselRendererButton to batch download files");
