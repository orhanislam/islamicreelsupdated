const fs = require('fs');
let code = fs.readFileSync('src/lib/assistant.functions.ts', 'utf-8');

const targetRegex = /Спазвай стриктни Salafi Halal принципи\./g;
const replacement = "Спазвай стриктни Salafi Halal принципи. Всяко съдържание трябва да съответства строго на Салафитската методология (Quran & Sunnah upon the understanding of the Salaf). Без бида (нововъведения), без слаби (da'if) хадиси.";

if (code.match(targetRegex)) {
  code = code.replace(targetRegex, replacement);
  fs.writeFileSync('src/lib/assistant.functions.ts', code);
  console.log("Replaced salafi strict rules successfully!");
} else {
  console.log("Target not found!");
}
