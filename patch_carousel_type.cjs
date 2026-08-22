const fs = require('fs');
let code = fs.readFileSync('src/lib/assistant.functions.ts', 'utf-8');

code = code.replace(
  '"type": "hadith" | "quran" | "tiktok" | "general",',
  '"type": "hadith" | "quran" | "tiktok" | "general" | "carousel",'
);

fs.writeFileSync('src/lib/assistant.functions.ts', code);
console.log("Patched JSON structure in system prompt");
