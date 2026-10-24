import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeIslamicArabicPhoneticsForTts } from "../tts.functions";
import { remapSalawatTimingsToBulgarian } from "../salawat-timings";
import { sanitizeTheologicalRespect } from "../theological-sanitizer";
import { normalizeIslamicTermsBulgarian } from "../translate.functions";
import { generateAssSubtitles } from "../render.functions";

describe("Salawat Phonetics and Bulgarian Written Meaning Verification", () => {
  it("1. normalizeIslamicArabicPhoneticsForTts converts Bulgarian salawat to authentic Arabic pronunciation", () => {
    const text1 = "Пратеникът на Аллах (мир да бъде с него) каза:";
    const tts1 = normalizeIslamicArabicPhoneticsForTts(text1);
    assert.match(tts1, /Саллаллааху\s+'алейхи\s+ва\s+саллям/i);
    assert.doesNotMatch(tts1, /мир\s+да\s+бъде\s+с\s+него/i);

    const text2 = "Пратеникът на Аллах, мир да бъде със него, каза:";
    const tts2 = normalizeIslamicArabicPhoneticsForTts(text2);
    assert.match(tts2, /Саллаллааху\s+'алейхи\s+ва\s+саллям/i);

    const text3 = "Пратеникът на Аллах (мир нему) каза:";
    const tts3 = normalizeIslamicArabicPhoneticsForTts(text3);
    assert.match(tts3, /Саллаллааху\s+'алейхи\s+ва\s+саллям/i);

    const text4 = "Пратеникът на Аллах (с.а.с.) ни завеща:";
    const tts4 = normalizeIslamicArabicPhoneticsForTts(text4);
    assert.match(tts4, /Саллаллааху\s+'алейхи\s+ва\s+саллям/i);

    const text5 = "Предава се от Абу Хурайра (Аллах да е доволен от него):";
    const tts5 = normalizeIslamicArabicPhoneticsForTts(text5);
    assert.match(tts5, /Радийаллааху\s+'анху/i);

    const text6 = "Аиша (Аллах да е доволен от нея) каза:";
    const tts6 = normalizeIslamicArabicPhoneticsForTts(text6);
    assert.match(tts6, /Радийаллааху\s+'анхаа/i);

    const text7 = "Сподвижниците (Аллах да е доволен от тях) казаха:";
    const tts7 = normalizeIslamicArabicPhoneticsForTts(text7);
    assert.match(tts7, /Радийаллааху\s+'анхум/i);
  });

  it("2. remapSalawatTimingsToBulgarian maps 4 Arabic salawat tokens to 5 Bulgarian meaning words with exact timing", () => {
    const inputTimings = [
      { word: "Пратеникът", start: 0.1, end: 0.8 },
      { word: "на", start: 0.8, end: 0.95 },
      { word: "Аллах,", start: 0.95, end: 1.5 },
      { word: "Саллаллааху", start: 1.6, end: 2.2 },
      { word: "'алейхи", start: 2.2, end: 2.5 },
      { word: "ва", start: 2.5, end: 2.65 },
      { word: "саллям,", start: 2.65, end: 3.1 },
      { word: "каза:", start: 3.2, end: 3.6 },
    ];

    const remapped = remapSalawatTimingsToBulgarian(inputTimings);
    assert.equal(remapped.length, 9, "Expected 9 total words after remapping 4 Arabic tokens to 5 Bulgarian tokens");

    const salawatSlice = remapped.slice(3, 8);
    const words = salawatSlice.map((t) => t.word);
    assert.deepEqual(words, ["мир", "да", "бъде", "с", "него,"], "Expected exact Bulgarian meaning with trailing comma");

    // Check bounds preservation
    assert.equal(salawatSlice[0].start, 1.6, "Start of 'мир' must match start of 'Саллаллааху'");
    assert.equal(salawatSlice[4].end, 3.1, "End of 'него,' must match end of 'саллям,'");

    // Monotonicity check
    for (let i = 0; i < remapped.length; i++) {
      assert.ok(remapped[i].end > remapped[i].start, `Timing at ${i} has non-positive duration`);
      if (i > 0) {
        assert.ok(remapped[i].start >= remapped[i - 1].start, `Timing at ${i} broke monotonicity`);
      }
    }
  });

  it("3. remapSalawatTimingsToBulgarian maps Sahabah honorific tokens correctly", () => {
    const inputTimings = [
      { word: "Предава", start: 0.1, end: 0.4 },
      { word: "се", start: 0.4, end: 0.5 },
      { word: "от", start: 0.5, end: 0.65 },
      { word: "Абу", start: 0.65, end: 0.9 },
      { word: "Хурайра,", start: 0.9, end: 1.3 },
      { word: "Радийаллааху", start: 1.4, end: 1.9 },
      { word: "'анху,", start: 1.9, end: 2.4 },
      { word: "че", start: 2.5, end: 2.7 },
    ];

    const remapped = remapSalawatTimingsToBulgarian(inputTimings);
    assert.equal(remapped.length, 12, "Expected 12 total tokens after remapping 2 Arabic tokens to 6 Bulgarian tokens");

    const sahabahSlice = remapped.slice(5, 11);
    const words = sahabahSlice.map((t) => t.word);
    assert.deepEqual(words, ["Аллах", "да", "е", "доволен", "от", "него,"], "Expected exact Bulgarian meaning");
    assert.equal(sahabahSlice[0].start, 1.4);
    assert.equal(sahabahSlice[5].end, 2.4);
  });

  it("4. Written text normalization enforces Bulgarian meaning (мир да бъде с него)", () => {
    // Both sanitizeTheologicalRespect and normalizeIslamicTermsBulgarian
    const rawArabicTransliteration = "Пратеникът на Аллах саллаллаху алейхи ва саллям каза на Али радияллаху анху";
    const written1 = sanitizeTheologicalRespect(rawArabicTransliteration);
    assert.match(written1, /мир\s+да\s+бъде\s+с\s+него/i);
    assert.match(written1, /Аллах\s+да\s+е\s+доволен\s+от\s+него/i);
    assert.doesNotMatch(written1, /саллаллаху\s+алейхи/i);

    const written2 = normalizeIslamicTermsBulgarian(rawArabicTransliteration);
    assert.match(written2, /мир\s+да\s+бъде\s+с\s+него/i);
    assert.match(written2, /Аллах\s+да\s+е\s+доволен\s+от\s+него/i);
  });

  it("5. generateAssSubtitles renders ALL CAPS Bulgarian meaning (МИР ДА БЪДЕ С НЕГО) in video subtitles", () => {
    const payload = {
      bulgarian: "Пратеникът на Аллах (мир да бъде с него) каза: Делата се съдят според намеренията.",
      bulgarianWordTimings: [
        { word: "Пратеникът", start: 0.1, end: 0.8 },
        { word: "на", start: 0.8, end: 0.95 },
        { word: "Аллах,", start: 0.95, end: 1.5 },
        { word: "Саллаллааху", start: 1.6, end: 2.2 },
        { word: "'алейхи", start: 2.2, end: 2.5 },
        { word: "ва", start: 2.5, end: 2.65 },
        { word: "саллям,", start: 2.65, end: 3.1 },
        { word: "каза:", start: 3.2, end: 3.6 },
        { word: "Делата", start: 3.7, end: 4.1 },
        { word: "се", start: 4.1, end: 4.25 },
        { word: "съдят", start: 4.25, end: 4.6 },
        { word: "според", start: 4.6, end: 4.9 },
        { word: "намеренията.", start: 4.9, end: 5.5 },
      ],
      subtitlePosition: "tiktok",
    };

    const ass = generateAssSubtitles(payload, 5.7);
    assert.match(ass, /МИР/);
    assert.match(ass, /БЪДЕ/);
    assert.match(ass, /НЕГО/);
    assert.doesNotMatch(ass, /САЛЛАЛЛААХУ/);
    assert.doesNotMatch(ass, /САЛЛЯМ/);

    // Verify dialogue text itself does not contain raw parentheses around "мир да бъде с него"
    const dialogueTexts = ass
      .split("\n")
      .filter((l) => l.startsWith("Dialogue:"))
      .map((l) => l.replace(/\{[^}]+\}/g, "").split(",").slice(9).join(","))
      .join(" ");
    assert.doesNotMatch(dialogueTexts, /[()]/, "Dialogue text should not contain bracket punctuation");
  });
});
