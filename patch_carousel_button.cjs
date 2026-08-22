const fs = require('fs');
const file = 'src/components/CarouselRendererButton.tsx';
let code = fs.readFileSync(file, 'utf-8');

// Replace the bad runGenerate call with the correct one wrapping arguments in 'data'
const badCall = 'await runGenerate({ prompt: slide.imagePrompt })';
const correctCall = 'await runGenerate({ data: { prompt: slide.imagePrompt } })';

if (code.includes(badCall)) {
  code = code.replace(badCall, correctCall);
  fs.writeFileSync(file, code);
  console.log('Fixed runGenerate call in CarouselRendererButton');
} else {
  console.log('Could not find bad call, maybe already fixed or different format?');
}
