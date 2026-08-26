const fs = require('fs');

const additionTextBase64 = Buffer.from('ТИ СИ ПРОФЕСИОНАЛЕН И СТРИКТЕН ПРЕВОДАЧ НА КОРАН И СУННА. ПРЕВЕЖДАЙ АЯТИТЕ И ХАДИСИТЕ БУКВАЛНО, ТОЧНО И ПРОФЕСИОНАЛНО ОТ АРАБСКИ НА БЪЛГАРСКИ ЕЗИК, ЗАПАЗВАЙКИ ОРИГИНАЛНИЯ ИМ БОЖЕСТВЕН СМИСЪЛ БЕЗ ДА ДОБАВЯШ СОБСТВЕНИ ИНТЕРПРЕТАЦИИ. ЗАДЪЛЖИТЕЛНО ги взимай САМО от Quran.com и Sunnah.com!').toString('base64');

const addition = Buffer.from(additionTextBase64, 'base64').toString('utf8');

let f1 = fs.readFileSync('src/routes/_app/assistant.tsx', 'utf8');
f1 = f1.replace(/ЗАДкЛЖИТЕЛН[^\!]+\!/g, ''); // cleanup old broken ones
f1 = f1.replace(/ЗАДЪЛЖИТЕЛНО се увери, че всичко \(текст, хадиси, цитати\) е строго в съответствие със Салафитското учение \(Ахлу Сунна уал Джама'а, според разбирането на Салафите\) без никакви нововъведения \(бид'а\) и слаби хадиси\./, 
    "ЗАДЪЛЖИТЕЛНО се увери, че всичко (текст, хадиси, цитати) е строго в съответствие със Салафитското учение (Ахлу Сунна уал Джама'а, според разбирането на Салафите) без никакви нововъведения (бид'а) и слаби хадиси. " + addition);
fs.writeFileSync('src/routes/_app/assistant.tsx', f1);


let f2 = fs.readFileSync('src/lib/assistant.functions.ts', 'utf8');
f2 = f2.replace(/Всяко съдържание трябва да съответства строго на Салафитската методология \(Quran & Sunnah upon the understanding of the Salaf\)\. Без бида \(нововъведения\), без слаби \(da'if\) хадиси\./,
    "Всяко съдържание трябва да съответства строго на Салафитската методология (Quran & Sunnah upon the understanding of the Salaf). Без бида (нововъведения), без слаби (da'if) хадиси. " + addition);
fs.writeFileSync('src/lib/assistant.functions.ts', f2);
console.log('Fixed prompts!');
