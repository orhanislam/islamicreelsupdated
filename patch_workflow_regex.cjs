const fs = require('fs');
let code = fs.readFileSync('src/lib/assistant.functions.ts', 'utf-8');

const targetRegex = /1\. СТРИКТНО ПРАВИЛО ЗА ТЕМИТЕ: Търси ДЪЛБОКИ, ВЪЗДЕЙСТВАЩИ, ПО-РЯДКО ЦИТИРАНИ уроци\. НЕ ПОВТАРЯЙ теми, които вече са в history\./g;
const replacement = "1. СТРИКТНО ПРАВИЛО ЗА ТЕМИТЕ И ДАЛИЛ (Доказателство): Избирай теми, които решават РЕАЛНИ проблеми на хората и това, което търсят най-много (напр. стрес, дългове, липса на съпруг/а, търпение при трудности, депресия, токсични хора). ЗАДЪЛЖИТЕЛНО във всяко видео/карусел давай ясен ДАЛИЛ (точен Аят или достоверен Хадис - Бухари, Муслим), съответстващ строго на Салафитската методология.";

if (code.match(targetRegex)) {
  code = code.replace(targetRegex, replacement);
  fs.writeFileSync('src/lib/assistant.functions.ts', code);
  console.log("Replaced successfully!");
} else {
  console.log("Target not found!");
}
