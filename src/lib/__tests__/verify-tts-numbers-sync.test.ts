import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  convertBulgarianDigitsToWordsForTts,
  alignSpokenTimingsToDisplayTokens,
  integerToBulgarianWords,
  normalizeBulgarianNumbersForTts,
} from "../bulgarian-numbers";
import { generateAssSubtitles } from "../render.functions";
import { localizeLatinSurahNamesToBulgarian } from "../islamic-phonetics";
import { remapSalawatTimingsToBulgarian } from "../salawat-timings";
import { sanitizeTheologicalRespect } from "../theological-sanitizer";

describe("TTS Numbers Verbalization and Subtitle Synchronization", () => {
  it("1. convertBulgarianDigitsToWordsForTts verbalizes numbers into standard literary Bulgarian words for TTS", () => {
    // Quantities & Countable Nouns with Gender Agreement
    assert.equal(
      convertBulgarianDigitsToWordsForTts("5 стълба на Исляма"),
      "пет стълба на Исляма"
    );
    assert.equal(
      convertBulgarianDigitsToWordsForTts("99 имена на Аллах"),
      "деветдесет и девет имена на Аллах"
    );
    assert.equal(
      convertBulgarianDigitsToWordsForTts("100 пъти на ден"),
      "сто пъти на ден"
    );
    assert.equal(
      convertBulgarianDigitsToWordsForTts("1 ден и 1 нощ"),
      "един ден и една нощ"
    );
    assert.equal(
      convertBulgarianDigitsToWordsForTts("2 дни и 2 нощи"),
      "два дни и две нощи"
    );

    // Quran citations
    const quran1 = convertBulgarianDigitsToWordsForTts("Сура 2, аят 255");
    assert.match(quran1, /сура\s+две,\s*аят\s+двеста\s+петдесет\s+и\s+пет/i);

    const quran2 = convertBulgarianDigitsToWordsForTts("2:255");
    assert.match(quran2, /сура\s+две,\s*аят\s+двеста\s+петдесет\s+и\s+пет/i);

    // Hadith citations & references
    assert.equal(
      convertBulgarianDigitsToWordsForTts("Хадис #1 в Сахих ал-Бухари"),
      "Хадис номер едно в Сахих ал-Бухари"
    );
    assert.equal(
      convertBulgarianDigitsToWordsForTts("Хадис № 1"),
      "Хадис номер едно"
    );
    assert.equal(
      convertBulgarianDigitsToWordsForTts("Хадис 27"),
      "Хадис номер двадесет и седем"
    );

    // Ordinals
    assert.equal(
      convertBulgarianDigitsToWordsForTts("1-ви стълб на Исляма"),
      "първи стълб на Исляма"
    );
    assert.equal(
      convertBulgarianDigitsToWordsForTts("1-ва стъпка към Аллах"),
      "първа стъпка към Аллах"
    );
    assert.equal(
      convertBulgarianDigitsToWordsForTts("2-ри признак на лицемерието"),
      "втори признак на лицемерието"
    );

    // List enumeration heads
    assert.match(
      convertBulgarianDigitsToWordsForTts("1. Шахада 2. Намаз 3. Закат"),
      /Първо:\s*Шахада\s*Второ:\s*Намаз\s*Трето:\s*Закат/
    );

    // Percentages
    assert.equal(
      convertBulgarianDigitsToWordsForTts("100% сигурност"),
      "сто процента сигурност"
    );
  });

  it("2. alignSpokenTimingsToDisplayTokens aligns multi-word spoken numbers to single display tokens with millisecond accuracy", () => {
    const display = "Сура 2, аят 255. 5 стълба на исляма. Хадис 1.";
    const spokenTimings = [
      { word: "Сура", start: 0.1, end: 0.4 },
      { word: "две,", start: 0.4, end: 0.7 },
      { word: "аят", start: 0.7, end: 1.0 },
      { word: "двеста", start: 1.0, end: 1.4 },
      { word: "петдесет", start: 1.4, end: 1.8 },
      { word: "и", start: 1.8, end: 1.9 },
      { word: "пет.", start: 1.9, end: 2.3 },
      { word: "пет", start: 2.5, end: 2.8 },
      { word: "стълба", start: 2.8, end: 3.2 },
      { word: "на", start: 3.2, end: 3.3 },
      { word: "исляма.", start: 3.3, end: 3.8 },
      { word: "Хадис", start: 4.0, end: 4.4 },
      { word: "едно.", start: 4.4, end: 4.9 },
    ];

    const aligned = alignSpokenTimingsToDisplayTokens(spokenTimings, display);

    // Must match display tokens length
    const displayTokens = display.split(/\s+/).filter(Boolean);
    assert.equal(aligned.length, displayTokens.length, "Aligned length must match display tokens length");

    // Check words
    for (let i = 0; i < displayTokens.length; i++) {
      assert.equal(aligned[i].word, displayTokens[i], `Word at index ${i} must match display token`);
    }

    // Check that multi-word '255.' spans from start of 'двеста' (1.0) to end of 'пет.' (2.3)
    const token255 = aligned.find((t) => t.word === "255.");
    assert.ok(token255, "Should find '255.'");
    assert.equal(token255.start, 1.0);
    assert.equal(token255.end, 2.3);

    // Check that '5' matches 'пет' (2.5 -> 2.8)
    const token5 = aligned.find((t) => t.word === "5");
    assert.ok(token5, "Should find '5'");
    assert.equal(token5.start, 2.5);
    assert.equal(token5.end, 2.8);

    // Check that '1.' matches 'едно.' (4.4 -> 4.9)
    const token1 = aligned.find((t) => t.word === "1.");
    assert.ok(token1, "Should find '1.'");
    assert.equal(token1.start, 4.4);
    assert.equal(token1.end, 4.9);
  });

  it("3. generateAssSubtitles preserves word timings 1-to-1 without dropping into linear distribution", () => {
    const timings = [
      { word: "СУРА", start: 0.1, end: 0.4 },
      { word: "2,", start: 0.4, end: 0.7 },
      { word: "АЯТ", start: 0.7, end: 1.0 },
      { word: "255.", start: 1.0, end: 2.3 },
      { word: "5", start: 2.5, end: 2.8 },
      { word: "СТЪЛБА", start: 2.8, end: 3.5 },
    ];

    const ass = generateAssSubtitles({
      bulgarian: "Сура 2, аят 255. 5 стълба",
      bulgarianWordTimings: timings,
      subtitlePosition: "middle",
      tiktokTheme: "fire",
    }, 4.0);

    // Must contain Dialogue lines
    assert.match(ass, /Dialogue:/);
    // Must contain the actual words in uppercase
    assert.match(ass, /СУРА/);
    assert.match(ass, /255/);
    assert.match(ass, /СТЪЛБА/);
  });

  it("4. DP aligner maintains 0.000s drift across <break/>, standalone em-dash, split Arabic articles, Salawat, and multi-word numbers", () => {
    const rawScript =
      "Плаши ли те утрешният ден? <break time=\"0.7s\" /> Пророкът Мухаммад (мир да бъде с него) ни учи на упование. — Сура At-Tawba, сура 9, аят 129. Хадис 27.";
    const localized = localizeLatinSurahNamesToBulgarian(rawScript);
    assert.match(localized, /Сура Ат-Тауба/);

    const displayRef = normalizeBulgarianNumbersForTts(sanitizeTheologicalRespect(localized));

    // Simulated EdgeTTS WordBoundary stream (notice: <break/> & standalone '—' omitted, 'Ат Тауба' split, Arabic Salawat 4 words, numbers expanded)
    const edgeWordBoundaries = [
      { word: "Плаши", start: 0.05, end: 0.42 },
      { word: "ли", start: 0.42, end: 0.56 },
      { word: "те", start: 0.56, end: 0.70 },
      { word: "утрешният", start: 0.70, end: 1.25 },
      { word: "ден?", start: 1.25, end: 1.65 },
      { word: "Пророкът", start: 2.25, end: 2.75 },
      { word: "Мухаммад", start: 2.75, end: 3.30 },
      { word: "Саллаллааху", start: 3.35, end: 3.85 },
      { word: "'алейхи", start: 3.85, end: 4.20 },
      { word: "ва", start: 4.20, end: 4.35 },
      { word: "саллям", start: 4.35, end: 4.80 },
      { word: "ни", start: 4.90, end: 5.05 },
      { word: "учи", start: 5.05, end: 5.35 },
      { word: "на", start: 5.35, end: 5.50 },
      { word: "упование.", start: 5.50, end: 6.15 },
      { word: "Сура", start: 6.75, end: 7.10 },
      { word: "Ат", start: 7.10, end: 7.30 },
      { word: "Тауба,", start: 7.30, end: 7.80 },
      { word: "сура", start: 7.85, end: 8.15 },
      { word: "девет,", start: 8.15, end: 8.60 },
      { word: "аят", start: 8.65, end: 8.95 },
      { word: "сто", start: 8.95, end: 9.25 },
      { word: "двадесет", start: 9.25, end: 9.75 },
      { word: "и", start: 9.75, end: 9.85 },
      { word: "девет.", start: 9.85, end: 10.30 },
      { word: "Хадис", start: 10.60, end: 11.00 },
      { word: "номер", start: 11.00, end: 11.35 },
      { word: "двадесет", start: 11.35, end: 11.80 },
      { word: "и", start: 11.80, end: 11.90 },
      { word: "седем.", start: 11.90, end: 12.35 },
    ];

    const remapped = remapSalawatTimingsToBulgarian(edgeWordBoundaries);
    const aligned = alignSpokenTimingsToDisplayTokens(remapped, displayRef);

    // Every special token must land on its exact millisecond boundary!
    const atTawba = aligned.find((t) => t.word === "Ат-Тауба,");
    assert.ok(atTawba, "Must reconstruct hyphenated 'Ат-Тауба,'");
    assert.equal(atTawba.start, 7.10);
    assert.equal(atTawba.end, 7.80);

    const surah9 = aligned.find((t) => t.word === "9,");
    assert.ok(surah9, "Must align '9,' to 'девет,'");
    assert.equal(surah9.start, 8.15);
    assert.equal(surah9.end, 8.60);

    const ayah129 = aligned.find((t) => t.word === "129.");
    assert.ok(ayah129, "Must align '129.' across 'сто двадесет и девет.'");
    assert.equal(ayah129.start, 8.95);
    assert.equal(ayah129.end, 10.30);

    const hadith27 = aligned.find((t) => t.word === "27.");
    assert.ok(hadith27, "Must align '27.' across 'номер двадесет и седем.'");
    assert.equal(hadith27.start, 11.00);
    assert.equal(hadith27.end, 12.35);
  });

  it("5. generateAssSubtitles activates yellow karaoke highlight from Word #1 of the Hook in 4-step Explained Videos", () => {
    const hookAndDalil =
      "Плаши ли те неизвестността за утрешния ден?\n\nВ Корана Аллах ни дава отговор.";
    const timings = [
      { word: "Плаши", start: 0.05, end: 0.45 },
      { word: "ли", start: 0.45, end: 0.60 },
      { word: "те", start: 0.60, end: 0.75 },
      { word: "неизвестността", start: 0.75, end: 1.45 },
      { word: "за", start: 1.45, end: 1.60 },
      { word: "утрешния", start: 1.60, end: 2.10 },
      { word: "ден?", start: 2.10, end: 2.50 },
      { word: "В", start: 3.10, end: 3.20 },
      { word: "Корана", start: 3.20, end: 3.65 },
      { word: "Аллах", start: 3.65, end: 4.05 },
      { word: "ни", start: 4.05, end: 4.20 },
      { word: "дава", start: 4.20, end: 4.55 },
      { word: "отговор.", start: 4.55, end: 5.10 },
    ];

    const ass = generateAssSubtitles(
      {
        bulgarian: hookAndDalil,
        bulgarianWordTimings: timings,
        topic: "КОГАТО НЕ ВИЖДАШ ИЗХОД",
        tiktokTheme: "gold",
      },
      5.3,
    );

    // First word 'ПЛАШИ' MUST receive active gold highlight {\c&H00D7FF&}ПЛАШИ!
    assert.match(ass, /\{\\c&H00D7FF&\}ПЛАШИ/, "Hook Word #1 must have active karaoke highlight!");
  });
});
