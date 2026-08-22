const fs = require('fs');
let code = fs.readFileSync('src/components/CarouselRendererButton.tsx', 'utf-8');

const targetRegex = /for \(let i = 0; i < slides\.length; i\+\+\) \{[\s\S]*?zip\.file\([^)]+\);\s*\}/;

const replacement = `      setProgress("Генериране на всички снимки едновременно...");
      const renderedSlides = await Promise.all(slides.map(async (slide, i) => {
        const currentPrompt = slide?.imagePrompt || "cinematic dark background islamic theme";
        const bgRes = await runGenerate({ data: { prompt: currentPrompt } });
        const bgUrl = \`data:\${bgRes.mimeType};base64,\${bgRes.base64}\`;
        
        const blob = await renderCarouselSlide({
          backgroundUrl: bgUrl,
          topTitle: slide.topTitle || "",
          mainText: slide.mainText || "",
          bottomText: slide.bottomText || "",
          footerText: slide.footerText || ""
        });
        return { blob, name: \`Slide_\${i + 1}.png\` };
      }));
      
      renderedSlides.forEach(({ blob, name }) => {
        zip.file(name, blob);
      });`;

if (code.match(targetRegex)) {
  code = code.replace(targetRegex, replacement);
  fs.writeFileSync('src/components/CarouselRendererButton.tsx', code);
  console.log("Replaced handleGenerate with Promise.all successfully!");
} else {
  console.log("Target not found!");
}
