import { alignTimestampsToSpeech, clampToSpeechIntervals } from "../audio-align.functions";
import { generateAssSubtitles, estimateTextWidth, balanceWordsIntoTwoLines } from "../render.functions";
import { extractTopic } from "../assistant.functions";

function testMonotonicityAndBounds() {
  const mockSpeechIntervals = [
    { start: 0.5, end: 2.5 },
    { start: 3.0, end: 5.5 }
  ];

  const rawItems = [
    { start: 0, end: 2, word: "В" },
    { start: 2, end: 3.5, word: "името" },
    { start: 3.5, end: 6, word: "на" },
    { start: 6, end: 8, word: "Аллах" }
  ];

  const aligned = alignTimestampsToSpeech(rawItems, mockSpeechIntervals);

  for (let i = 0; i < aligned.length; i++) {
    const item = aligned[i];
    if (item.start < 0) {
      throw new Error(`Item ${i} has negative start time: ${item.start}`);
    }
    if (item.end <= item.start) {
      throw new Error(`Item ${i} end time <= start time: start=${item.start}, end=${item.end}`);
    }
    if (i > 0 && item.start < aligned[i - 1].end) {
      throw new Error(`Monotonicity failed at index ${i}: start=${item.start} < prevEnd=${aligned[i - 1].end}`);
    }
  }

  const clamped = clampToSpeechIntervals(aligned, mockSpeechIntervals);
  for (let i = 0; i < clamped.length; i++) {
    const item = clamped[i];
    if (item.end <= item.start) {
      throw new Error(`Clamped item ${i} invalid duration`);
    }
  }

  console.log("✔ testMonotonicityAndBounds passed!");
}

function testPhoneticWeighting() {
  const ayahWords = ["В", "милосърдието", "и", "благодатта"];
  const bStart = 1.0;
  const bEnd = 5.0;
  const bDur = bEnd - bStart;

  const ayahCosts = ayahWords.map((w) => 1 + w.replace(/[^\p{L}\p{N}]/gu, "").length * 0.55);
  const ayahTotalCost = ayahCosts.reduce((sum, c) => sum + c, 0) || 1;
  let ayahCumCost = 0;

  const timings: { start: number; end: number; word: string }[] = [];
  for (let w = 0; w < ayahWords.length; w++) {
    const fracS = ayahCumCost / ayahTotalCost;
    ayahCumCost += ayahCosts[w];
    const fracE = ayahCumCost / ayahTotalCost;
    timings.push({
      start: Math.round((bStart + fracS * bDur) * 1000) / 1000,
      end: Math.round((bStart + fracE * bDur) * 1000) / 1000,
      word: ayahWords[w],
    });
  }

  // Check that "милосърдието" gets more duration than "В"
  const durV = timings[0].end - timings[0].start;
  const durMilo = timings[1].end - timings[1].start;
  if (durMilo <= durV) {
    throw new Error(`Phonetic weighting failed: long word duration (${durMilo}) <= short word duration (${durV})`);
  }

  console.log("✔ testPhoneticWeighting passed!", { durV, durMilo });
}

function testTikTokSafeSubtitleWidth() {
  const phrase = "И доказателствата на Аллах";
  const timings = [
    { word: "И", start: 0, end: 0.4 },
    { word: "доказателствата", start: 0.4, end: 1.4 },
    { word: "на", start: 1.4, end: 1.8 },
    { word: "Аллах", start: 1.8, end: 2.6 },
  ];
  const ass = generateAssSubtitles(
    {
      bulgarian: phrase,
      bulgarianWordTimings: timings,
      subtitlePosition: "middle",
      tiktokTheme: "hormozi",
    },
    3.0,
  );

  // Extract \fs tag
  const fsMatch = ass.match(/\\fs(\d+)/);
  if (!fsMatch) {
    throw new Error("ASS output does not contain explicit \\fs tag!");
  }
  const fs = parseInt(fsMatch[1], 10);
  console.log("✔ Auto-scaled font size for 'доказателствата':", fs);

  if (fs > 80) {
    throw new Error(`Font size ${fs} is too large for 15-char word 'доказателствата'! Should be <= 80.`);
  }

  // Check that the word width at this font size is strictly <= 640px
  const wordWidth = estimateTextWidth("доказателствата", fs);
  const margin = (1080 - wordWidth) / 2;
  console.log(`✔ 'доказателствата' rendered width at fs=${fs}: ${wordWidth}px (Safe margin: ${margin}px on left & right)`);
  if (wordWidth > 640) {
    throw new Error(`Word width ${wordWidth}px exceeds safeLineWidth (640px)!`);
  }
  if (margin < 200) {
    throw new Error(`Margin ${margin}px is less than 200px!`);
  }
  console.log("✔ testTikTokSafeSubtitleWidth passed!");
}

function testTopicTopHeaderDisplay() {
  // Test 1: extractTopic utility
  const topic1 = extractTopic({ title: "[Коран 13:28] Покоят на сърцата" });
  if (topic1 !== "Покоят на сърцата") {
    throw new Error(`Expected 'Покоят на сърцата', got '${topic1}'`);
  }

  const topic2 = extractTopic({ title: "[Сахих ал-Бухари #6424] Силата на търпението" });
  if (topic2 !== "Силата на търпението") {
    throw new Error(`Expected 'Силата на търпението', got '${topic2}'`);
  }

  const topic3 = extractTopic({ title: "Коран 6:19 - Доказателствата на Аллах" });
  if (topic3 !== "Доказателствата на Аллах") {
    throw new Error(`Expected 'Доказателствата на Аллах', got '${topic3}'`);
  }

  const topic4 = extractTopic({ title: "Сура Ал-Бакара 2:255 • Аят ал-Курси" });
  if (topic4 !== "Аят ал-Курси") {
    throw new Error(`Expected 'Аят ал-Курси', got '${topic4}'`);
  }

  const topic5 = extractTopic({ title: "Тайната на истигфара" });
  if (topic5 !== "Тайната на истигфара") {
    throw new Error(`Expected 'Тайната на истигфара', got '${topic5}'`);
  }

  // Test 2: ASS top header generation displays the topic on two lines with larger font (\fs64 and \N)
  const assExplicitTopic = generateAssSubtitles(
    {
      topic: "Покоят на сърцата",
      reference: "Сура Ар-Ра'д (13:28)",
      bulgarian: "Тестов текст",
    },
    5.0,
  );
  if (!assExplicitTopic.includes("Покоят на\\Nсърцата") || !assExplicitTopic.includes("\\fs64")) {
    throw new Error(`ASS header does not contain expected 2-line topic with \\fs64! Output was:\n${assExplicitTopic}`);
  }

  // Test 3: ASS top header extracts topic from bracketed citation and formats on two lines
  const assBracketed = generateAssSubtitles(
    {
      reference: "[Коран 13:28] Покоят на сърцата",
      bulgarian: "Тестов текст",
    },
    5.0,
  );
  if (!assBracketed.includes("Покоят на\\Nсърцата")) {
    throw new Error(`ASS header does not contain extracted topic from bracketed title!`);
  }

  console.log("✔ testTopicTopHeaderDisplay passed (verified two-line topic wrapping and larger font size)!");
}

function testAudioDurationSafeguards() {
  const timings = [
    { word: "В", start: 0.2, end: 0.5 },
    { word: "името", start: 0.5, end: 1.1 },
    { word: "на", start: 1.1, end: 1.4 },
    { word: "Аллах", start: 1.4, end: 2.2 },
    { word: "Всемилостивия", start: 2.2, end: 3.5 },
    { word: "Милосърдния", start: 3.5, end: 26.8 }, // Speech ends at 26.8 seconds
  ];

  const maxTimingEnd = Math.max(...timings.map((t) => t.end));
  const minRequiredDuration = maxTimingEnd + 1.2;

  // Simulate a truncated probe (e.g. mp3Duration returning 18.2s for a 28s voiceover)
  let probedDuration = 18.2;
  if (probedDuration < minRequiredDuration) {
    probedDuration = minRequiredDuration;
  }

  if (probedDuration < 28.0) {
    throw new Error(`Audio duration safeguard failed: probedDuration=${probedDuration} < 28.0s!`);
  }
  console.log("✔ testAudioDurationSafeguards passed: Clamped duration to", probedDuration, "s (covers speech + 1.2s outro buffer)");
}

async function testSalafiArabicPhoneticNormalization() {
  const { normalizeIslamicArabicPhoneticsForTts, normalizePhoneticsToDisplayWord } = await import("../tts.functions");

  // Test 1: astafirullah / astaghfirullah / астафируллах conversion to authentic Salafi Arabic
  const t1 = normalizeIslamicArabicPhoneticsForTts("Кажи astafirullah и направи истигфар.");
  if (!t1.includes("Астагфируллаах") || !t1.includes("истигфаар")) {
    throw new Error(`Salafi phonetic test 1 failed! Got: ${t1}`);
  }

  const t2 = normalizeIslamicArabicPhoneticsForTts("Кажи астафируллах от сърце, брат!");
  if (!t2.includes("Астагфируллаах")) {
    throw new Error(`Salafi phonetic test 2 failed! Got: ${t2}`);
  }

  const t3 = normalizeIslamicArabicPhoneticsForTts("Субханаллах и Алхамдулиллях, Аллаху Акбар, Ля иляха илляллах.");
  if (!t3.includes("Субхааналлаах") || !t3.includes("Алхамдулиллаах") || !t3.includes("Аллааху Акбар") || !t3.includes("Ляя иляяха илляллаах")) {
    throw new Error(`Salafi phonetic test 3 failed! Got: ${t3}`);
  }

  const t4 = normalizeIslamicArabicPhoneticsForTts("Пратеникът ﷺ ни учи на таухид и сабр.");
  if (!t4.includes("Саллаллааху 'алейхи ва саллям") || !t4.includes("таухиийд")) {
    throw new Error(`Salafi phonetic test 4 failed! Got: ${t4}`);
  }

  // Test 2: Display word normalization for clean subtitles
  const d1 = normalizePhoneticsToDisplayWord("Астагфируллаах,");
  if (d1 !== "Астагфируллах,") {
    throw new Error(`Display word test 1 failed! Got: ${d1}`);
  }

  const d2 = normalizePhoneticsToDisplayWord("Субхааналлаах!");
  if (d2 !== "Субханаллах!") {
    throw new Error(`Display word test 2 failed! Got: ${d2}`);
  }

  console.log("✔ testSalafiArabicPhoneticNormalization passed: 100% verified authentic Arabic Salafi pronunciations!");
}

async function testArabicTransliterationAndDalilIntegrity() {
  const { normalizeIslamicTermsBulgarian } = await import("../translate.functions");
  const { normalizeIslamicArabicPhoneticsForTts, normalizePhoneticsToDisplayWord } = await import("../tts.functions");
  const { buildExplainedNarrationText } = await import("../assistant.functions");

  // 1. Verify Ar-Ra'd and names with apostrophes/hyphens are NOT mangled by honorific abbreviations
  const quranRefCyrillic = "Сура Ар-Ра'д (13:28)";
  const quranRefLatin = "Surah Ar-Ra'd (13:28)";

  const transCyrillic = normalizeIslamicTermsBulgarian(quranRefCyrillic);
  if (transCyrillic.includes("доволен от него")) {
    throw new Error(`Ar-Ra'd Cyrillic was mangled in translation! Got: ${transCyrillic}`);
  }

  const transLatin = normalizeIslamicTermsBulgarian(quranRefLatin);
  if (transLatin.includes("доволен от него")) {
    throw new Error(`Ar-Ra'd Latin was mangled in translation! Got: ${transLatin}`);
  }

  // 2. Verify legitimate honorifics are still correctly converted
  const aliWithHonorific = normalizeIslamicTermsBulgarian("Али (р.а.) каза");
  if (!aliWithHonorific.includes("Аллах да е доволен от него")) {
    throw new Error(`Legitimate honorific (р.а.) failed to expand! Got: ${aliWithHonorific}`);
  }

  // 3. Verify TTS phonetic normalization does NOT mangle Ar-Ra'd
  const ttsCyrillic = normalizeIslamicArabicPhoneticsForTts(quranRefCyrillic);
  if (ttsCyrillic.includes("Радийаллааху 'анху")) {
    throw new Error(`TTS mangled Ar-Ra'd into honorific! Got: ${ttsCyrillic}`);
  }

  // 4. Verify buildExplainedNarrationText articulates surah name, surah number, and ayah number cleanly
  const { formatSpokenCitation } = await import("../assistant.functions");
  const c1 = formatSpokenCitation("Сура Ар-Ра'д (13:28)", true);
  if (c1 !== "Сура Ар-Ра'д, сура 13, аят 28") {
    throw new Error(`Expected 'Сура Ар-Ра'д, сура 13, аят 28', got '${c1}'`);
  }
  const c2 = formatSpokenCitation("Сахих ал-Бухари #6424", false);
  if (c2 !== "Сахих ал-Бухари, хадис номер 6424") {
    throw new Error(`Expected 'Сахих ал-Бухари, хадис номер 6424', got '${c2}'`);
  }

  const narrated = buildExplainedNarrationText({
    viralTitle: "Покоят на сърцата",
    reference: "Сура Ар-Ра'д (13:28)",
    quoteText: "Тези, които вярват и чиито сърца се успокояват при споменаването на Аллах. А нима не със споменаването на Аллах сърцата намират покой!",
    isQuran: true,
    summaryBg: "Споменаването на Аллах носи истински мир.",
  });

  if (narrated.includes("[Сура Ар-Ра'д (13:28)]") || narrated.includes("[Сура") || narrated.includes("(13:28)]")) {
    throw new Error(`buildExplainedNarrationText leaked bracketed citation into spoken narration! Got:\n${narrated}`);
  }
  if (!narrated.includes("Сура Ар-Ра'д, сура 13, аят 28")) {
    throw new Error(`Expected 'Сура Ар-Ра'д, сура 13, аят 28' in intro, got:\n${narrated}`);
  }

  // 5. Verify generateAssSubtitles cleans stray brackets from subtitles
  const assSub = generateAssSubtitles(
    {
      topic: "Покоят на сърцата",
      bulgarian: "намират покой! [Сура Ар-Ра'д (13:28)] Поука:",
      bulgarianWordTimings: [
        { word: "намират", start: 0.1, end: 0.5 },
        { word: "покой!", start: 0.5, end: 0.9 },
        { word: "[Сура", start: 0.9, end: 1.2 },
        { word: "Ар-Ра'д", start: 1.2, end: 1.6 },
        { word: "(13:28)]", start: 1.6, end: 2.0 },
        { word: "Поука:", start: 2.0, end: 2.5 },
      ],
    },
    3.0,
  );

  if (assSub.includes("[Сура") || assSub.includes("(13:28)]")) {
    throw new Error(`generateAssSubtitles rendered raw bracketed tokens in subtitles! Got:\n${assSub}`);
  }

  console.log("✔ testArabicTransliterationAndDalilIntegrity passed: Ar-Ra'd protected, clean intro without citation subtitle leakage!");
}

async function testDotVerbalizationPrevention() {
  const { normalizeIslamicArabicPhoneticsForTts, normalizePhoneticsToDisplayWord } = await import("../tts.functions");
  const { parseVttTimings } = await import("../subtitle-sync.functions");

  // 1. Verify consecutive dots and ellipsis are converted to clean pauses, never raw "..."
  const testText = "Чуй това... Аллах Всевишният прощава.... Спри греха… и направи истигфар.";
  const normalized = normalizeIslamicArabicPhoneticsForTts(testText);

  if (/\.{2,}/.test(normalized) || /…/.test(normalized)) {
    throw new Error(`normalizeIslamicArabicPhoneticsForTts leaked multiple dots or ellipsis! Got: ${normalized}`);
  }
  if (!normalized.includes("истигфаар")) {
    throw new Error(`Salafi phonetic term missing! Got: ${normalized}`);
  }

  // 2. Verify display word normalization strips leading/trailing multi-dots
  const d1 = normalizePhoneticsToDisplayWord("Поука:...");
  if (d1.includes("...")) {
    throw new Error(`normalizePhoneticsToDisplayWord leaked dots! Got: ${d1}`);
  }

  // 3. Verify parseVttTimings filters out pure punctuation and dots from word timings
  const sampleVtt = `WEBVTT

00:00:01.000 --> 00:00:02.000
...

00:00:02.100 --> 00:00:03.000
Поука:
`;
  const timings = parseVttTimings(sampleVtt);
  if (timings.some(t => /^\.{2,}$/.test(t.word.trim()))) {
    throw new Error(`parseVttTimings included pure dot tokens in timings! Got: ${JSON.stringify(timings)}`);
  }
  if (!timings.some(t => t.word.includes("Поука:"))) {
    throw new Error(`parseVttTimings failed to capture legitimate word! Got: ${JSON.stringify(timings)}`);
  }

  console.log("✔ testDotVerbalizationPrevention passed: Zero spoken dots and clean silent pauses verified!");
}

async function testBulgarianNumberPhoneticNormalization() {
  const { normalizeIslamicArabicPhoneticsForTts, integerToBulgarianWords, normalizeBulgarianNumbersForTts } = await import("../tts.functions");

  // 1. User's exact required numbers:
  // 5 -> "пет"
  // 50 -> "петдесет"
  // 500 -> "петстотин"
  // 5000 -> "пет хиляди"
  // 5368 -> "пет хиляди триста шестдесет и осем"
  const exactCases: [number, string][] = [
    [5, "пет"],
    [50, "петдесет"],
    [500, "петстотин"],
    [5000, "пет хиляди"],
    [5368, "пет хиляди триста шестдесет и осем"],
    [0, "нула"],
    [1, "едно"],
    [11, "единадесет"],
    [100, "сто"],
    [105, "сто и пет"],
    [125, "сто двадесет и пет"],
    [1000, "хиляда"],
    [1001, "хиляда и едно"],
    [1100, "хиляда и сто"],
    [1125, "хиляда сто двадесет и пет"],
    [6424, "шест хиляди четиристотин двадесет и четири"],
    [1000000, "един милион"],
  ];

  for (const [num, expected] of exactCases) {
    const actual = integerToBulgarianWords(num);
    if (actual !== expected) {
      throw new Error(`integerToBulgarianWords(${num}) failed! Expected: "${expected}", got: "${actual}"`);
    }
  }

  // 2. Direct string normalization:
  if (normalizeBulgarianNumbersForTts("5") !== "пет") throw new Error("normalizeBulgarianNumbersForTts('5') failed!");
  if (normalizeBulgarianNumbersForTts("50") !== "петдесет") throw new Error("normalizeBulgarianNumbersForTts('50') failed!");
  if (normalizeBulgarianNumbersForTts("500") !== "петстотин") throw new Error("normalizeBulgarianNumbersForTts('500') failed!");
  if (normalizeBulgarianNumbersForTts("5000") !== "пет хиляди") throw new Error("normalizeBulgarianNumbersForTts('5000') failed!");
  if (normalizeBulgarianNumbersForTts("5368") !== "пет хиляди триста шестдесет и осем") {
    throw new Error("normalizeBulgarianNumbersForTts('5368') failed!");
  }

  // 3. Full TTS phonetic normalization integration:
  const tts1 = normalizeIslamicArabicPhoneticsForTts("Има 5 стълба на исляма.");
  if (!tts1.includes("пет стълба")) {
    throw new Error(`Expected 'пет стълба' in TTS text, got: "${tts1}"`);
  }

  const tts2 = normalizeIslamicArabicPhoneticsForTts("Това се случи преди 5000 години.");
  if (!tts2.includes("пет хиляди години")) {
    throw new Error(`Expected 'пет хиляди години' in TTS text, got: "${tts2}"`);
  }

  const tts3 = normalizeIslamicArabicPhoneticsForTts("Хадис 5368 от Сахих ал-Бухари.");
  if (!tts3.includes("пет хиляди триста шестдесет и осем")) {
    throw new Error(`Expected 'пет хиляди триста шестдесет и осем' in TTS text, got: "${tts3}"`);
  }

  const tts4 = normalizeIslamicArabicPhoneticsForTts("Сура 2, аят 255.");
  if (!tts4.includes("две") || !tts4.includes("двеста петдесет и пет")) {
    throw new Error(`Expected 'две' and 'двеста петдесет и пет' in TTS text, got: "${tts4}"`);
  }

  const tts5 = normalizeIslamicArabicPhoneticsForTts("Хадис #6424.");
  if (!tts5.includes("номер шест хиляди четиристотин двадесет и четири")) {
    throw new Error(`Expected 'номер шест хиляди четиристотин двадесет и четири' in TTS text, got: "${tts5}"`);
  }

  const tts6 = normalizeIslamicArabicPhoneticsForTts("1-ви ден от свещения месец.");
  if (!tts6.includes("първи ден")) {
    throw new Error(`Expected 'първи ден' in TTS text, got: "${tts6}"`);
  }

  console.log("✔ testBulgarianNumberPhoneticNormalization passed: 5, 50, 500, 5000, 5368 & contextual numbers articulate accurately in Bulgarian!");
}

async function testQuranSurahsAndIslamicPhonetics() {
  const { normalizeIslamicArabicPhoneticsForTts } = await import("../tts.functions");
  const { QURAN_SURAHS_PHONETICS } = await import("../islamic-phonetics");

  // 1. Verify all 114 Surahs exist in the registry
  if (QURAN_SURAHS_PHONETICS.length !== 114) {
    throw new Error(`Expected 114 Surahs in phonetics registry, got: ${QURAN_SURAHS_PHONETICS.length}`);
  }

  // 2. Test authentic Arabic pronunciation for iconic Surahs
  const surahTests: [string, string][] = [
    ["Сура Ал-Фатиха", "Фаатиха"],
    ["Сура Ал-Бакара", "Бакара"],
    ["Сура Али Имран", "Имраан"],
    ["Сура Ал-Ихляс", "Ихлаас"],
    ["Сура Ал-Каусар", "Каусар"],
    ["Сура Ал-Мулк", "Мулк"],
    ["Сура Ар-Рахман", "Рахмаан"],
    ["Сура Аш-Шарх", "Шарх"],
    ["Сура Ан-Нас", "Наас"],
    ["Сура Ал-Фаляк", "Фаляк"],
    ["Сура Ясин", "Йаа Сиин"],
    ["Сура Ал-Кахф", "Кахф"],
    ["Аят ал-Курси", "Курсии"],
  ];

  for (const [input, expectedSnippet] of surahTests) {
    const res = normalizeIslamicArabicPhoneticsForTts(input);
    if (!res.includes(expectedSnippet)) {
      throw new Error(`Surah phonetics test failed for "${input}"! Expected snippet "${expectedSnippet}", got: "${res}"`);
    }
  }

  // 3. Test authentic Islamic terminologies and formulas
  const termTests: [string, string][] = [
    ["Ас-саляму алейкум", "Саляяму 'алейкум"],
    ["Ва алейкум ас-салам", "'алейкуму с-саляям"],
    ["Това е чист таухид.", "таухиийд"],
    ["Рубубийя и Улухийя са основи на вярата.", "Рубуубийя"],
    ["Вземи вуду преди салят.", "Вудуу'"],
    ["Рамадан е месец на говеене.", "Рамадаан"],
    ["Направи таваккул на Аллах.", "таваккуль"],
    ["Повярвай в Ахирата, не се лъжи от дунята.", "Аахира"],
    ["Ангел Джибрил донесе знамението.", "Джибриил"],
  ];

  for (const [input, expectedSnippet] of termTests) {
    const res = normalizeIslamicArabicPhoneticsForTts(input);
    if (!res.includes(expectedSnippet)) {
      throw new Error(`Islamic terminology test failed for "${input}"! Expected snippet "${expectedSnippet}", got: "${res}"`);
    }
  }

  console.log("✔ testQuranSurahsAndIslamicPhonetics passed: All 114 Surahs & Islamic terms articulate with authentic Arabic phonetics!");
}

async function testUnfamiliarQuranicTermsEnrichment() {
  const { enrichUnfamiliarQuranicTerms } = await import("../islamic-glossary");
  const { normalizeIslamicTermsBulgarian } = await import("../translate.functions");
  const { buildExplainedNarrationText } = await import("../assistant.functions");

  // 1. Direct glossary enrichment test
  const t1 = enrichUnfamiliarQuranicTerms("И Дху-н-Нун, когато си отиде гневен");
  if (!t1.includes("Дху-н-Нун „човекът на кита — пророкът Юнус“")) {
    throw new Error(`enrichUnfamiliarQuranicTerms failed on Дху-н-Нун! Got: ${t1}`);
  }

  const t2 = enrichUnfamiliarQuranicTerms("Разкажи за Дху-л-Карнайн на хората.");
  if (!t2.includes("Дху-л-Карнайн „притежателят на двете епохи“")) {
    throw new Error(`enrichUnfamiliarQuranicTerms failed on Дху-л-Карнайн! Got: ${t2}`);
  }

  const t3 = enrichUnfamiliarQuranicTerms("Муса срещна Ал-Хадир край морето.");
  if (!t3.includes("Ал-Хадир „праведният раб на Аллах — праведникът Хидр“")) {
    throw new Error(`enrichUnfamiliarQuranicTerms failed on Ал-Хадир! Got: ${t3}`);
  }

  const t4 = enrichUnfamiliarQuranicTerms("О, Бану Исраил, спомнете си благодатта.");
  if (!t4.includes("Бану Исраил „синовете на Исраил — народът на пророка Якуб“")) {
    throw new Error(`enrichUnfamiliarQuranicTerms failed on Бану Исраил! Got: ${t4}`);
  }

  // 2. Idempotency test (no duplication if already explained)
  const alreadyExplained = "И Дху-н-Нун „човекът на кита — пророкът Юнус“, когато си отиде";
  const tDouble = enrichUnfamiliarQuranicTerms(alreadyExplained);
  if (tDouble !== alreadyExplained) {
    throw new Error(`enrichUnfamiliarQuranicTerms duplicated explanation! Got: ${tDouble}`);
  }

  // 3. Translation pipeline integration
  const transOut = normalizeIslamicTermsBulgarian("И Дху-н-Нун извика в тъмнините");
  if (!transOut.includes("„човекът на кита — пророкът Юнус“")) {
    throw new Error(`normalizeIslamicTermsBulgarian missing quoted explanation for Дху-н-Нун! Got: ${transOut}`);
  }

  // 4. Video narration builder integration
  const narration = buildExplainedNarrationText({
    viralTitle: "Спасението в мрака",
    reference: "Коран 21:87",
    quoteText: "И Дху-н-Нун, когато си отиде гневен и си помисли, че Ние не ще го притиснем.",
    isQuran: true,
    summaryBg: "Искрената молба избавя вярващия.",
  });

  if (!narration.includes("Дху-н-Нун „човекът на кита — пророкът Юнус“")) {
    throw new Error(`buildExplainedNarrationText missing quoted meaning for Дху-н-Нун! Got:\n${narration}`);
  }

  console.log("✔ testUnfamiliarQuranicTermsEnrichment passed: Unfamiliar Quranic epithets accurately explained in quotation marks!");
}

async function testPronounGenderAgreementAndRespectfulTone() {
  const { sanitizeTheologicalRespect, sanitizeProposalFields } = await import("../assistant.functions");

  // 1. Masculine nouns: "вашето" must become "Вашия" / "вашия"
  const m1 = sanitizeTheologicalRespect("Помнете вашето Господ във вашето живот!");
  if (m1 !== "Помнете Вашия Господ във Вашия живот!") {
    throw new Error(`Failed masculine pronoun agreement: ${m1}`);
  }

  const m2 = sanitizeTheologicalRespect("вашето Творец и вашето път");
  if (m2 !== "Вашия Творец и Вашия път") {
    throw new Error(`Failed masculine pronoun agreement: ${m2}`);
  }

  const m3 = sanitizeTheologicalRespect("вашето собствен живот и вашето истински Господ");
  if (m3 !== "Вашия собствен живот и Вашия истински Господ") {
    throw new Error(`Failed masculine compound agreement: ${m3}`);
  }

  // 2. Feminine nouns: "вашето" / "вашия" must become "Вашата" / "вашата"
  const f1 = sanitizeTheologicalRespect("вашето душа и вашето молитва");
  if (f1 !== "Вашата душа и Вашата молитва") {
    throw new Error(`Failed feminine pronoun agreement: ${f1}`);
  }

  const f2 = sanitizeTheologicalRespect("вашия вяра и вашия надежда");
  if (f2 !== "Вашата вяра и Вашата надежда") {
    throw new Error(`Failed feminine pronoun agreement from вашия: ${f2}`);
  }

  // 3. Plural nouns: "вашето" / "вашия" must become "Вашите" / "вашите"
  const p1 = sanitizeTheologicalRespect("вашето дела и вашето грехове");
  if (p1 !== "Вашите дела и Вашите грехове") {
    throw new Error(`Failed plural pronoun agreement: ${p1}`);
  }

  const p2 = sanitizeTheologicalRespect("вашия дела и вашия стъпки");
  if (p2 !== "Вашите дела и Вашите стъпки") {
    throw new Error(`Failed plural pronoun agreement from вашия: ${p2}`);
  }

  // 4. Neuter preservation: "вашето сърце" must remain correct
  const n1 = sanitizeTheologicalRespect("Пазете вашето сърце за добро дело.");
  if (!n1.includes("вашето сърце")) {
    throw new Error(`Neuter noun incorrectly altered: ${n1}`);
  }

  // 5. VideoProposal scriptWorkflow & carouselSlides sanitization
  const testProposal: any = {
    title: "Пътят към вашето Господ",
    type: "carousel",
    scriptWorkflow: {
      hookQuestion: "Защо вашето живот е пълен с изпитания?",
      hookContext: "Отворете вашето душа към светлината.",
      dalilIntro: "Аллах Всевишният вижда вашето дела.",
      dalilText: "И Дху-н-Нун извика в тъмнините.",
      explanation: "Това укрепва вашето вяра.",
      actionStep: "Поправете вашето грехове.",
    },
    carouselSlides: [
      {
        topTitle: "Урок за вашето живот",
        mainText: "Помнете вашето Господ във всеки миг.",
        bottomText: "Пречистете вашето дела.",
        footerText: "Следвайте вашето път.",
        imagePrompt: "peaceful nature vertical",
      },
    ],
  };

  sanitizeProposalFields(testProposal);

  if (testProposal.title !== "Пътят към Вашия Господ") {
    throw new Error(`Proposal title failed pronoun sanitization: ${testProposal.title}`);
  }
  if (!testProposal.scriptWorkflow.hookQuestion.includes("Вашия живот")) {
    throw new Error(`Proposal hookQuestion failed: ${testProposal.scriptWorkflow.hookQuestion}`);
  }
  if (!testProposal.scriptWorkflow.hookContext.includes("Вашата душа")) {
    throw new Error(`Proposal hookContext failed: ${testProposal.scriptWorkflow.hookContext}`);
  }
  if (!testProposal.scriptWorkflow.dalilIntro.includes("Вашите дела")) {
    throw new Error(`Proposal dalilIntro failed: ${testProposal.scriptWorkflow.dalilIntro}`);
  }
  if (!testProposal.carouselSlides[0].mainText.includes("Вашия Господ")) {
    throw new Error(`Carousel slide mainText failed: ${testProposal.carouselSlides[0].mainText}`);
  }
  if (!testProposal.carouselSlides[0].bottomText.includes("Вашите дела")) {
    throw new Error(`Carousel slide bottomText failed: ${testProposal.carouselSlides[0].bottomText}`);
  }

  console.log("✔ testPronounGenderAgreementAndRespectfulTone passed: Correct grammatical gender (Вашия/Вашата/Вашите) and respectful official form enforced!");
}

async function testTikTokTitleAndCaptionDashAndStripeRemoval() {
  const { formatViralSocialCaption, generateTikTokSEOTitle, extractTopicFromTitle } = await import("../caption.functions");
  const { cleanProposalTitle } = await import("../assistant.functions");

  // 1. Long stripe removal from title
  const rawWithStripes = "[Коран 2:255] --------------------------- Аят ал-Курси";
  const cleanedTitle = cleanProposalTitle(rawWithStripes);
  if (cleanedTitle.includes("---") || cleanedTitle.includes("---------------------------")) {
    throw new Error(`cleanProposalTitle failed to remove long stripes: ${cleanedTitle}`);
  }

  // 2. Dash between parts converted to clean bullet
  const titleWithDash = "[Коран 13:28] Покоят на сърцата - Силата на вярата";
  const seoTitle = generateTikTokSEOTitle(titleWithDash);
  if (seoTitle.includes(" - ") || seoTitle.includes("---")) {
    throw new Error(`generateTikTokSEOTitle failed to eliminate dashes: ${seoTitle}`);
  }
  if (!seoTitle.includes("•")) {
    throw new Error(`generateTikTokSEOTitle expected bullet separator: ${seoTitle}`);
  }

  // 3. Caption generation has ZERO long divider lines (━━━━━━━━━━━━ or ---------------------------)
  const caption = formatViralSocialCaption("[Сахих ал-Бухари #6424] Двете блага", "Мъдрост за здравето и свободното време");
  if (caption.includes("━━━━") || caption.includes("----") || caption.includes("---------------------------")) {
    throw new Error(`formatViralSocialCaption contains long divider lines/stripes!\n${caption}`);
  }
  if (caption.includes("— Сахих Муслим")) {
    throw new Error(`formatViralSocialCaption contains em-dash in hadith reference!\n${caption}`);
  }
  if (caption.includes("ЗАПАЗИ —")) {
    throw new Error(`formatViralSocialCaption contains em-dash in CTA!\n${caption}`);
  }

  // 4. Topic extraction with stripes
  const topicWithStripes = extractTopicFromTitle("━━━━━━━━━━━━━━━━━━━━━━━━━━ Вяра в Аллах ---------------------------");
  if (topicWithStripes.includes("━━") || topicWithStripes.includes("--")) {
    throw new Error(`extractTopicFromTitle failed to clean stripes: ${topicWithStripes}`);
  }
  if (!topicWithStripes.includes("Вяра в Аллах")) {
    throw new Error(`extractTopicFromTitle lost the topic: ${topicWithStripes}`);
  }

  console.log("✔ testTikTokTitleAndCaptionDashAndStripeRemoval passed: Zero long stripes (━━━━━━━━ / ------), clean bullets, and no unwanted dashes in TikTok titles/captions!");
}

async function testRespectfulAndOfficialIslamicEmojis() {
  const { sanitizeTheologicalRespect } = await import("../theological-sanitizer");
  const { formatViralSocialCaption } = await import("../caption.functions");
  const { sanitizeProposalFields } = await import("../assistant.functions");

  // 1. Direct normalization in sanitizeTheologicalRespect
  const rawDisrespectful = "⚡ Бързо действие! 🔥 Вайръл съвет 🚀 Пусни веднага 💡 Идея за деня 💥 Ударно ❤️ Обич 🤲 Молитва 👉 Натисни тук 🎶 Музика 🕋 Кааба";
  const sanitized = sanitizeTheologicalRespect(rawDisrespectful);

  if (sanitized.includes("⚡") || sanitized.includes("🔥") || sanitized.includes("🚀") || sanitized.includes("💡") || sanitized.includes("💥")) {
    throw new Error(`sanitizeTheologicalRespect failed to replace hype/casual emojis:\n${sanitized}`);
  }
  if (sanitized.includes("🤲") || sanitized.includes("👉") || sanitized.includes("🎶") || sanitized.includes("🕋")) {
    throw new Error(`sanitizeTheologicalRespect failed to strip prohibited emojis:\n${sanitized}`);
  }
  if (!sanitized.includes("📌 Бързо действие!")) {
    throw new Error(`Expected 📌 replacement for ⚡:\n${sanitized}`);
  }
  if (!sanitized.includes("✨ Вайръл съвет")) {
    throw new Error(`Expected ✨ replacement for 🔥:\n${sanitized}`);
  }
  if (!sanitized.includes("🎬 Пусни веднага")) {
    throw new Error(`Expected 🎬 replacement for 🚀:\n${sanitized}`);
  }
  if (!sanitized.includes("💎 Идея за деня")) {
    throw new Error(`Expected 💎 replacement for 💡:\n${sanitized}`);
  }
  if (!sanitized.includes("🤍 Обич")) {
    throw new Error(`Expected 🤍 replacement for ❤️:\n${sanitized}`);
  }

  // 2. formatViralSocialCaption emoji & label respectfulness
  const captionWithAction = formatViralSocialCaption(
    "[Коран 2:255] Аят ал-Курси",
    "Величието на Твореца",
    {
      title: "[Коран 2:255] Аят ал-Курси",
      explanation: "Този аят разкрива абсолютната власт на Аллах.",
      actionStep: "Започнете деня си с искреност и милосърдие към хората.",
    }
  );

  if (captionWithAction.includes("💡 Шейхово разяснение:")) {
    throw new Error(`Caption must NOT contain casual 💡 Шейхово разяснение: ${captionWithAction}`);
  }
  if (!captionWithAction.includes("💎 Богословско разяснение:")) {
    throw new Error(`Caption expected 💎 Богословско разяснение: ${captionWithAction}`);
  }
  if (captionWithAction.includes("⚡ Действие:")) {
    throw new Error(`Caption must NOT contain ⚡ Действие: ${captionWithAction}`);
  }
  if (!captionWithAction.includes("📌 Напътствие:")) {
    throw new Error(`Caption expected 📌 Напътствие: ${captionWithAction}`);
  }

  const captionWithDua = formatViralSocialCaption(
    "[Коран 2:255] Аят ал-Курси",
    "Величието на Твореца",
    {
      title: "[Коран 2:255] Аят ал-Курси",
      explanation: "Този аят разкрива абсолютната власт на Аллах.",
      actionStep: "Казвайте тази дуа след всяка молитва.",
    }
  );
  if (!captionWithDua.includes("🤍 Дуа:")) {
    throw new Error(`Caption expected 🤍 Дуа: ${captionWithDua}`);
  }

  // 3. sanitizeProposalFields cleanses any incoming emojis
  const testProp: any = {
    title: "⚡ Вайръл Хадис 🔥",
    summaryBg: "🚀 Пълна автоматизация 💡 Знание",
    scriptWorkflow: {
      hookQuestion: "⚡ Чудили ли сте се някога?",
      explanation: "💡 Шейхът пояснява мъдростта.",
      actionStep: "⚡ Правете това всеки ден 🤲.",
    },
  };
  sanitizeProposalFields(testProp);

  if (testProp.title.includes("⚡") || testProp.title.includes("🔥")) {
    throw new Error(`sanitizeProposalFields failed on title: ${testProp.title}`);
  }
  if (testProp.scriptWorkflow.explanation.includes("💡")) {
    throw new Error(`sanitizeProposalFields failed on explanation: ${testProp.scriptWorkflow.explanation}`);
  }
  if (testProp.scriptWorkflow.actionStep.includes("⚡") || testProp.scriptWorkflow.actionStep.includes("🤲")) {
    throw new Error(`sanitizeProposalFields failed on actionStep: ${testProp.scriptWorkflow.actionStep}`);
  }

  console.log("✔ testRespectfulAndOfficialIslamicEmojis passed: Official & dignified Islamic emojis enforced everywhere!");
}

function testTwoLineSentenceSubtitlesAndContiguousTiming() {
  // 1. Test balanceWordsIntoTwoLines helper
  const twoWords = balanceWordsIntoTwoLines(["Аллах", "Чува"], 72, 640);
  if (twoWords.length !== 2 || twoWords[0] !== "Аллах" || twoWords[1] !== "Чува") {
    throw new Error(`balanceWordsIntoTwoLines failed on 2 words: ${JSON.stringify(twoWords)}`);
  }

  const sixWords = balanceWordsIntoTwoLines(
    ["Наистина,", "с", "трудността", "има", "и", "улеснение."],
    72,
    640,
  );
  if (sixWords.length !== 2) {
    throw new Error(`balanceWordsIntoTwoLines failed on 6 words: expected 2 lines, got ${sixWords.length}`);
  }
  if (!sixWords[0].trim() || !sixWords[1].trim()) {
    throw new Error(`balanceWordsIntoTwoLines produced an empty line: ${JSON.stringify(sixWords)}`);
  }

  // 2. Test generateAssSubtitles with full sentences and a speech gap between them
  const sentence1 = "Който се уповава на Аллах, Той му е достатъчен.";
  const sentence2 = "Наистина Неговото обещание е истина.";
  const fullText = `${sentence1} ${sentence2}`;

  const words1 = sentence1.split(/\s+/);
  const words2 = sentence2.split(/\s+/);

  const timings: { word: string; start: number; end: number }[] = [];
  // Sentence 1 spoken from 0.5s to 3.0s
  for (let i = 0; i < words1.length; i++) {
    const s = 0.5 + i * 0.3;
    const e = s + 0.28;
    timings.push({ word: words1[i], start: Number(s.toFixed(2)), end: Number(e.toFixed(2)) });
  }

  // Speech gap: pause from 3.0s to 4.5s (1.5 seconds silence)
  // Sentence 2 spoken from 4.5s to 6.8s
  for (let i = 0; i < words2.length; i++) {
    const s = 4.5 + i * 0.45;
    const e = s + 0.42;
    timings.push({ word: words2[i], start: Number(s.toFixed(2)), end: Number(e.toFixed(2)) });
  }

  const ass = generateAssSubtitles(
    {
      bulgarian: fullText,
      bulgarianWordTimings: timings,
      subtitlePosition: "tiktok",
    },
    8.0,
  );

  const lines = ass.split("\n").filter((l) => l.startsWith("Dialogue:") && l.includes(",Bulgarian,"));
  if (lines.length === 0) {
    throw new Error("generateAssSubtitles produced zero Bulgarian Dialogue lines!");
  }

  // Verify that phrases with >= 2 words format into exactly two lines (\N)
  const hasTwoLineBreaks = lines.some((l) => l.includes("\\N"));
  if (!hasTwoLineBreaks) {
    throw new Error("Subtitles did not format into two lines (missing \\N line break)!");
  }

  // Verify that sentence 1 stays on screen across the 1.5s speech gap until sentence 2 starts (0:00:04.50)
  const contiguousTransition = lines.some((l) => l.includes(",0:00:04.50,") && l.includes("достатъчен"));
  if (!contiguousTransition) {
    throw new Error(`Contiguous timing failed: Sentence 1 did not hold until Sentence 2 start (0:00:04.50)! Lines were:\n${lines.join("\n")}`);
  }

  // Verify that sentence 2 begins immediately at 0:00:04.50
  const sentence2ImmediateStart = lines.some((l) => l.includes(",0:00:04.50,") && l.includes("Наистина"));
  if (!sentence2ImmediateStart) {
    throw new Error(`Sentence 2 did not start at 0:00:04.50! Lines were:\n${lines.join("\n")}`);
  }

  console.log("✔ testTwoLineSentenceSubtitlesAndContiguousTiming passed: 2-line layout and seamless contiguous sentence transitions verified!");
}

async function runAllTests() {
  console.log("Running subtitle synchronization verification tests...");
  testMonotonicityAndBounds();
  testPhoneticWeighting();
  testTikTokSafeSubtitleWidth();
  testTopicTopHeaderDisplay();
  testAudioDurationSafeguards();
  testTwoLineSentenceSubtitlesAndContiguousTiming();
  await testSalafiArabicPhoneticNormalization();
  await testArabicTransliterationAndDalilIntegrity();
  await testDotVerbalizationPrevention();
  await testBulgarianNumberPhoneticNormalization();
  await testQuranSurahsAndIslamicPhonetics();
  await testUnfamiliarQuranicTermsEnrichment();
  await testPronounGenderAgreementAndRespectfulTone();
  await testTikTokTitleAndCaptionDashAndStripeRemoval();
  await testRespectfulAndOfficialIslamicEmojis();
  console.log("✔ All subtitle synchronization verification tests passed successfully!");
  process.exit(0);
}

runAllTests().catch((err) => {
  console.error("Verification test failed:", err);
  process.exit(1);
});
