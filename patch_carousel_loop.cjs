const fs = require('fs');
let code = fs.readFileSync('src/components/CarouselRendererButton.tsx', 'utf-8');

// Ensure we have a fallback prompt and protect against undefined data
const replacement = `
        const currentPrompt = slide?.imagePrompt || "cinematic dark background islamic theme";
        const bgRes = await runGenerate({ data: { prompt: currentPrompt } });
`;

// Find the line with the loop
code = code.replace(/const bgRes = await runGenerate[^;]+;/, replacement);

fs.writeFileSync('src/components/CarouselRendererButton.tsx', code);
console.log("Patched CarouselRendererButton to use fallback prompt.");
