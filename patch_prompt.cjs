const fs = require('fs');
let code = fs.readFileSync('src/lib/assistant.functions.ts', 'utf-8');

const sysPromptInjection = `

КАРУСЕЛИ (CAROUSEL):
Ако потребителят иска "карусел" (слайдове със снимки за TikTok/Reels): 
Върни proposal с type: "carousel", title, summaryBg, и задължително включи "carouselSlides": масив от 4 обекта, всеки с { topTitle, mainText, bottomText, footerText, imagePrompt }. imagePrompt трябва да е на английски за photorealistic dark cinematic картинка. Структурирай 4-те слайда като: 1) Въпрос/Хук, 2) Обяснение, 3) Хадис/Коран, 4) Решение/Дуа.
`;

const injectionPoint = 'CAPCUT-ПОДОБНИ ИНСТРУКЦИИ ЗА РЕДАКТИРАНЕ:';
if (code.includes(injectionPoint)) {
  code = code.replace(injectionPoint, sysPromptInjection + '\n' + injectionPoint);
  fs.writeFileSync('src/lib/assistant.functions.ts', code);
  console.log('Fixed systemPrompt in assistant.functions.ts');
} else {
  console.log('Could not find injection point!');
}
