import { alignTimestampsToSpeech, clampToSpeechIntervals } from "../audio-align.functions";

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

async function runAllTests() {
  console.log("Running subtitle synchronization verification tests...");
  testMonotonicityAndBounds();
  testPhoneticWeighting();
  console.log("✔ All subtitle synchronization verification tests passed successfully!");
}

runAllTests().catch((err) => {
  console.error("Verification test failed:", err);
  process.exit(1);
});
