const fs = require('fs');
let code = fs.readFileSync('src/lib/assistant.functions.ts', 'utf-8');

const typeRegex = /export type VideoProposal = \{[\s\S]*?quality\?: "high" \| "720p";\n\};/;
const newType = `export type VideoProposal = {
  title: string;
  type: "hadith" | "quran" | "tiktok" | "general" | "carousel";
  collection?: string;
  number?: number;
  surah?: number;
  ayah?: number;
  count?: number;
  summaryBg: string;
  themeBg: string;
  searchQuery: string;
  tiktokTheme?: "hormozi" | "emerald" | "neon" | "classic";
  bRollInterval?: number;
  useBRoll?: boolean;
  subtitlePosition?: "bottom" | "middle" | "lower-third";
  quality?: "high" | "720p";
  carouselSlides?: { topTitle: string; mainText: string; bottomText: string; footerText: string; imagePrompt: string }[];
};`;

if(code.match(typeRegex)) {
  code = code.replace(typeRegex, newType);
} else {
  console.log("Could not find VideoProposal type to replace");
}

const sysPromptInjection = `  КАРУСЕЛИ (CAROUSEL):
  Ако потребителят иска "карусел" (слайдове със снимки за TikTok/Reels): 
  Върни proposal с type: "carousel", title и summaryBg, и задължително включи "carouselSlides": масив от 4 обекта, всеки с { topTitle, mainText, bottomText, footerText, imagePrompt }. imagePrompt трябва да е на английски за photorealistic dark cinematic картинка. Структурирай 4-те слайда като: 1) Въпрос/Хук, 2) Обяснение, 3) Хадис/Коран, 4) Решение/Дуа.
`;

if(code.includes('CAPCUT-ПОДОБНИ КОНТРОЛИ ЗА МОНТАЖА:')) {
  code = code.replace('CAPCUT-ПОДОБНИ КОНТРОЛИ ЗА МОНТАЖА:', sysPromptInjection + '\n  CAPCUT-ПОДОБНИ КОНТРОЛИ ЗА МОНТАЖА:');
} else {
  console.log("Could not find CAPCUT injection point");
}

fs.writeFileSync('src/lib/assistant.functions.ts', code);
console.log('Updated assistant.functions.ts successfully');
