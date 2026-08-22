const fs = require('fs');
let code = fs.readFileSync('src/lib/assistant.functions.ts', 'utf-8');

const target = `КАРУСЕЛИ (CAROUSEL):
Ако потребителят иска "карусел" (слайдове със снимки за TikTok/Reels): 
Върни proposal с type: "carousel", title, summaryBg, и задължително включи "carouselSlides": масив от 4 обекта, всеки с { topTitle, mainText, bottomText, footerText, imagePrompt }. imagePrompt трябва да е на английски за photorealistic dark cinematic картинка. Структурирай 4-те слайда като: 1) Въпрос/Хук, 2) Обяснение, 3) Хадис/Коран, 4) Решение/Дуа.`;

const replacement = `КАРУСЕЛИ (CAROUSEL):
Ако потребителят иска "карусел" (слайдове със снимки за TikTok/Reels): 
Върни proposal с type: "carousel", title, summaryBg, и задължително включи "carouselSlides": масив от обекти, всеки с { topTitle, mainText, bottomText, footerText, imagePrompt }. 
СПАЗВАЙ ТОЗИ УПДАТНАТ WORKFLOW ЗА СЛАЙДОВЕТЕ:
1. Слайд 1 (Куката): Завладяващо, провокиращо размисъл твърдение/въпрос на български език, адресиращо универсална нужда или трудност. Текстът се запазва умишлено кратък. imagePrompt: мрачно, сенчесто и драматично (dark, shadowy, dramatic cinematic).
2. Слайдове 2 до N-1 (Същинска стойност): Разгръщане на съдържанието (Аят, Хадис, Сунна) стъпка по стъпка. АБСОЛЮТНО ЗАБРАНЕНО Е ПРЕТРУПВАНЕТО с много текст на един екран! Ако хадисът има 3 стъпки, отдели им отделни слайдове. imagePrompt: визуалната естетика постепенно става по-светла (gradually brighter, emerging light).
3. Последен Слайд N (Кулминация и Призив): Окончателната духовна развръзка, мир или върховно обещание. imagePrompt: изцяло окъпан в топла, сияйна и божествена златна светлина (bathed in warm, radiant, golden divine light). ЗАДЪЛЖИТЕЛНО завърши с призив за действие (CTA) в долната част на екрана (bottomText или footerText), подтикващ зрителите да последват или споделят.`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/lib/assistant.functions.ts', code);
  console.log("Successfully updated CAROUSEL workflow instructions in system prompt.");
} else {
  console.log("Error: Target string not found.");
}
