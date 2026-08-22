const fs = require('fs');
let code = fs.readFileSync('src/lib/assistant.functions.ts', 'utf-8');

const startIdx = code.indexOf('export type VideoProposal = {');
const endIdx = code.indexOf('};', startIdx) + 2;

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
  // CapCut-like editing controls
  bRollInterval?: number;        // seconds between B-Roll scene switches (e.g. 3)
  useBRoll?: boolean;            // enable multi-scene B-Roll
  subtitlePosition?: "bottom" | "middle" | "lower-third";
  quality?: "high" | "720p";
  carouselSlides?: { topTitle: string; mainText: string; bottomText: string; footerText: string; imagePrompt: string }[];
};`;

code = code.substring(0, startIdx) + newType + code.substring(endIdx);

const sysPromptInjection = `  КАРУСЕЛИ (CAROUSEL):
  Ако потребителят иска "карусел" (слайдове със снимки за TikTok/Reels): 
  Върни proposal с type: "carousel", title, summaryBg, и задължително включи "carouselSlides": масив от 4 обекта, всеки с { topTitle, mainText, bottomText, footerText, imagePrompt }. imagePrompt трябва да е на английски за photorealistic dark cinematic картинка. Структурирай 4-те слайда като: 1) Въпрос/Хук, 2) Обяснение, 3) Хадис/Коран, 4) Решение/Дуа.
`;

const capcutIdx = code.indexOf('CAPCUT-ПОДОБНИ КОНТРОЛИ ЗА МОНТАЖА:');
if (capcutIdx > -1) {
  code = code.substring(0, capcutIdx) + sysPromptInjection + '\n  ' + code.substring(capcutIdx);
}

fs.writeFileSync('src/lib/assistant.functions.ts', code);
console.log('Updated assistant.functions.ts successfully');
