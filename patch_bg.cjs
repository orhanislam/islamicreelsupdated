const fs = require('fs');
let code = fs.readFileSync('src/lib/backgrounds.functions.ts', 'utf-8');

const target = `export const generateBackground = createServerFn({ method: "POST" })
  .inputValidator((input: { prompt: string }) => input)
  .handler(async ({ data }) => {
    // Generate image via Gemini Imagen and return base64 straight to client.
    const { base64, mimeType } = await geminiGenerateImage(data.prompt);
    return { base64, mimeType };
  });`;

const replacement = `export const generateBackground = createServerFn({ method: "POST" })
  .inputValidator((input: { prompt?: string }) => input)
  .handler(async ({ data }) => {
    // Generate image via Gemini Imagen and return base64 straight to client.
    const safePrompt = (data && data.prompt) ? data.prompt : "beautiful cinematic islamic background";
    const { base64, mimeType } = await geminiGenerateImage(safePrompt);
    return { base64, mimeType };
  });`;

code = code.replace(/export const generateBackground = createServerFn[\s\S]*?\}\);/m, replacement);

fs.writeFileSync('src/lib/backgrounds.functions.ts', code);
console.log("Patched backgrounds.functions.ts to be robust against missing data");
