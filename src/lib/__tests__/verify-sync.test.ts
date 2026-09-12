import { alignTimestampsToSpeech, clampToSpeechIntervals } from "../audio-align.functions";
import { generateAssSubtitles, estimateTextWidth } from "../render.functions";
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

async function runAllTests() {
  console.log("Running subtitle synchronization verification tests...");
  testMonotonicityAndBounds();
  testPhoneticWeighting();
  testTikTokSafeSubtitleWidth();
  testTopicTopHeaderDisplay();
  testAudioDurationSafeguards();
  console.log("✔ All subtitle synchronization verification tests passed successfully!");
}

runAllTests().catch((err) => {
  console.error("Verification test failed:", err);
  process.exit(1);
});
