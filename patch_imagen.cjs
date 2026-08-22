const fs = require('fs');
let code = fs.readFileSync('src/lib/gemini.ts', 'utf-8');

// Replace gemini-3.6-flash with gemini-3.1-flash-image inside geminiGenerateImage
const targetFuncStart = code.indexOf('export async function geminiGenerateImage');
const endpointStart = code.indexOf('gemini-3.6-flash:generateContent', targetFuncStart);

if (endpointStart !== -1) {
  code = code.substring(0, endpointStart) + 'gemini-3.1-flash-image:generateContent' + code.substring(endpointStart + 'gemini-3.6-flash:generateContent'.length);
  fs.writeFileSync('src/lib/gemini.ts', code);
  console.log('Fixed geminiGenerateImage to use gemini-3.1-flash-image');
} else {
  console.log('Could not find endpoint to replace');
}
