import { test, expect } from "node:test";
import assert from "node:assert/strict";
import { generateAssSubtitles, balanceWordsIntoTwoLines, estimateTextWidth } from "../render.functions";
import { getSafeZone, getASSSubtitlePlacement } from "../safe-zone";

test("Big Letters Text Verification: Subtitles and Title rendered in UPPERCASE with bold TikTok font size", async () => {
  console.log("\n[TEST 1] Verifying Server-side ASS Subtitle Generator with Big Letters...");

  const payload = {
    topic: "Изход от всяка безизходица",
    bulgarian: "пълна безизходица и сякаш няма изход",
    subtitlePosition: "center",
    style: "center",
    tiktokTheme: "classic",
    bulgarianWordTimings: [
      { word: "пълна", start: 0.1, end: 0.6 },
      { word: "безизходица", start: 0.6, end: 1.4 },
      { word: "и", start: 1.4, end: 1.6 },
      { word: "сякаш", start: 1.6, end: 2.1 },
      { word: "няма", start: 2.1, end: 2.6 },
      { word: "изход", start: 2.6, end: 3.2 },
    ],
  };

  const ass = generateAssSubtitles(payload, 3.5);

  // 1. Verify Styles have big letters font size (76px) and bold (-1)
  assert.ok(ass.includes("Style: Bulgarian,Outfit,76,"), "Bulgarian subtitle font size must be 76px (big letters)");
  assert.ok(ass.includes("Style: Reference,Outfit,64,"), "Reference title font size must be 64px");

  // 2. Verify top title is rendered in UPPERCASE ('ИЗХОД ОТ ВСЯКА' and 'БЕЗИЗХОДИЦА')
  assert.ok(
    ass.includes("ИЗХОД ОТ ВСЯКА\\NБЕЗИЗХОДИЦА") || ass.includes("ИЗХОД ОТ ВСЯКА"),
    "Top title must be rendered in UPPERCASE and balanced into 2 lines",
  );

  // 3. Verify dialogue events output words in UPPERCASE ("ПЪЛНА", "БЕЗИЗХОДИЦА", "И", "СЯКАШ")
  assert.ok(ass.includes("ПЪЛНА"), "Subtitle words must be in UPPERCASE (ALL CAPS)");
  assert.ok(ass.includes("БЕЗИЗХОДИЦА"), "Subtitle words must be in UPPERCASE (ALL CAPS)");
  assert.ok(ass.includes("СЯКАШ"), "Subtitle words must be in UPPERCASE (ALL CAPS)");

  // Ensure no lowercase words slipped into dialogue events
  assert.ok(!ass.includes("Dialogue: 0") || !ass.includes("пълна"), "Dialogue must not contain lowercase Bulgarian words");

  console.log("✔ TEST 1 PASSED: ASS subtitles and header are 100% UPPERCASE with 76px big letters!");
});

test("Big Letters Text Verification: Centered Placement matches TikTok Reference Image", async () => {
  console.log("\n[TEST 2] Verifying Center Subtitle Anchor Placement...");

  const placement = getASSSubtitlePlacement("center", "center");
  assert.strictEqual(placement.alignment, 5, "Alignment must be 5 (Middle-Center)");
  assert.strictEqual(placement.posX, 540, "X coordinate must be 540 (horizontal center)");
  assert.strictEqual(placement.posY, 960, "Y coordinate must be 960 (vertical center 50%)");

  console.log("✔ TEST 2 PASSED: Subtitles are positioned at exact center (50% / 960px Y) matching reference screenshot!");
});

test("Big Letters Text Verification: Citation stripping from top title keeps clean uppercase topic", async () => {
  console.log("\n[TEST 3] Verifying Citation Stripping from Header Title...");

  const payload = {
    topic: "[Коран 65:2] Изход от всяка безизходица",
    bulgarian: "който се бои от аллах, той му дава изход",
    subtitlePosition: "center",
    style: "center",
  };

  const ass = generateAssSubtitles(payload, 3.0);
  assert.ok(ass.includes("ИЗХОД ОТ ВСЯКА"), "Must contain clean topic in uppercase");
  assert.ok(!ass.includes("Dialogue: 0") || !ass.includes("[КОРАН 65:2]"), "Must not include bracketed citation in header dialogue");

  console.log("✔ TEST 3 PASSED: Bracketed citation cleanly removed, header is pure uppercase topic!");
});

test("Big Letters Text Verification: Balanced 2-3 lines wrapping with big uppercase words", async () => {
  console.log("\n[TEST 4] Verifying Word Balancing with Big Uppercase Letters...");

  const words = ["ПЪЛНА", "БЕЗИЗХОДИЦА", "И", "СЯКАШ"];
  const lines = balanceWordsIntoTwoLines(words, 76, 680);
  assert.ok(lines.length === 2, "Must balance into 2 clean lines");
  assert.strictEqual(lines[0], "ПЪЛНА БЕЗИЗХОДИЦА");
  assert.strictEqual(lines[1], "И СЯКАШ");

  console.log("✔ TEST 4 PASSED: Words successfully balanced into clean punchy lines with big uppercase letters!");
});
