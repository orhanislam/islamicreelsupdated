import assert from "node:assert";
import { CANDIDATE_QURAN_VERSES, selectGuaranteedUniqueScriptureDirect } from "../scripture-selector";
import { isInvalidSacredQuoteText, auditAndRefineProposal } from "../smart-script-auditor";
import { buildExplainedNarrationText } from "../assistant.functions";
import { getBulgarianQuranAyahDirect } from "../quran.functions";

async function runTests() {
  console.log("=== RUNNING VERIFICATION SUITE FOR QURAN AYAH TRANSLATIONS ===");

  // TEST 1: CANDIDATE_QURAN_VERSES has all entries with non-empty ayahTextBg
  console.log("[TEST 1] Verifying all CANDIDATE_QURAN_VERSES have pre-stored Bulgarian translations...");
  assert.ok(CANDIDATE_QURAN_VERSES.length >= 45, `Expected >= 45 verses, found ${CANDIDATE_QURAN_VERSES.length}`);
  for (const v of CANDIDATE_QURAN_VERSES) {
    assert.ok(v.ayahTextBg, `Verse ${v.surah}:${v.ayah} is missing ayahTextBg!`);
    assert.ok(v.ayahTextBg.length > 20, `Verse ${v.surah}:${v.ayah} ayahTextBg is too short (${v.ayahTextBg.length} chars)`);
    assert.strictEqual(
      isInvalidSacredQuoteText(v.ayahTextBg),
      false,
      `Verse ${v.surah}:${v.ayah} ayahTextBg failed validity check: ${v.ayahTextBg}`
    );
  }
  console.log(`✔ TEST 1 PASSED: All ${CANDIDATE_QURAN_VERSES.length} candidate verses have complete authentic Bulgarian translations.`);

  // TEST 2: Verify specific verses like 3:185 (the user's reported bug)
  console.log("[TEST 2] Verifying Surah Aal-i-Imraan 3:185 specifically...");
  const v185 = CANDIDATE_QURAN_VERSES.find((v) => v.surah === 3 && v.ayah === 185);
  assert.ok(v185, "Surah 3:185 not found in candidates!");
  assert.ok(v185.ayahTextBg?.includes("Всяка душа ще вкуси смъртта"), `Unexpected 3:185 text: ${v185.ayahTextBg}`);
  assert.ok(v185.ayahTextBg?.includes("Деня на възкресението"), `Missing resurrection day in 3:185: ${v185.ayahTextBg}`);
  console.log(`✔ TEST 2 PASSED: Surah 3:185 authentic Bulgarian text verified: "${v185.ayahTextBg}"`);

  // TEST 3: isInvalidSacredQuoteText guards against intro phrases
  console.log("[TEST 3] Verifying isInvalidSacredQuoteText guards...");
  assert.strictEqual(isInvalidSacredQuoteText("В Свещения Коран, Аллах Всевишният повелява:"), true);
  assert.strictEqual(isInvalidSacredQuoteText("В Свещения Коран, Аллах Всевишният повелява"), true);
  assert.strictEqual(isInvalidSacredQuoteText("„В Свещения Коран, Аллах Всевишният повелява:“"), true);
  assert.strictEqual(isInvalidSacredQuoteText("Пратеникът на Аллах ﷺ ни учи:"), true);
  assert.strictEqual(isInvalidSacredQuoteText("Чуй какво казва Аллах Всевишният в Корана:"), true);
  assert.strictEqual(isInvalidSacredQuoteText(""), true);
  assert.strictEqual(isInvalidSacredQuoteText("Кратък текст"), true);
  // Real translations must pass
  assert.strictEqual(isInvalidSacredQuoteText("Всяка душа ще вкуси смъртта и вашите награди напълно ще ви се изплатят в Деня на възкресението."), false);
  console.log("✔ TEST 3 PASSED: All intro phrases and corruptions accurately identified and rejected.");

  // TEST 4: selectGuaranteedUniqueScriptureDirect returns authentic Dalil for Quran
  console.log("[TEST 4] Verifying selectGuaranteedUniqueScriptureDirect for Quran...");
  const selected = await selectGuaranteedUniqueScriptureDirect({ sourcePreference: "quran" });
  assert.strictEqual(selected.type, "quran");
  assert.ok(selected.dalilTextBg, "selected.dalilTextBg is empty!");
  assert.strictEqual(isInvalidSacredQuoteText(selected.dalilTextBg), false, `dalilTextBg is invalid: ${selected.dalilTextBg}`);
  console.log(`✔ TEST 4 PASSED: Randomly selected [Сура ${selected.surah}:${selected.ayah}] with authentic Dalil: "${selected.dalilTextBg.slice(0, 60)}..."`);

  // TEST 5: getBulgarianQuranAyahDirect works reliably
  console.log("[TEST 5] Verifying getBulgarianQuranAyahDirect...");
  const direct3185 = await getBulgarianQuranAyahDirect({ surah: 3, ayah: 185 });
  assert.ok(direct3185.text.includes("Всяка душа ще вкуси смъртта"), `Unexpected text: ${direct3185.text}`);
  console.log(`✔ TEST 5 PASSED: getBulgarianQuranAyahDirect returned authentic text: "${direct3185.text.slice(0, 60)}..."`);

  // TEST 6: Smart Script Auditor auto-heals corrupted/intro-phrase Quran Dalil
  console.log("[TEST 6] Verifying Smart Script Auditor self-healing on Quran proposal...");
  const corruptedProposal: any = {
    title: "[Коран 3:185] Преходността на Дуня и Истинският Успех",
    type: "quran",
    surah: 3,
    ayah: 185,
    count: 1,
    fullDalilText: "В Свещения Коран, Аллах Всевишният повелява:", // Bug reproduction!
    scriptWorkflow: {
      hookQuestion: "Замисляли ли сте се колко бързо отминават дните Ви?",
      hookContext: "Често забравяте, че земният живот е само временен престой.",
      dalilIntro: "В Свещения Коран, Аллах Всевишният повелява:",
      dalilText: "В Свещения Коран, Аллах Всевишният повелява:", // Bug reproduction!
      explanation: "Обяснение: Смъртта е неизбежна реалност за всяко живо същество.",
      actionStep: "Помнете смъртта ежедневно и вършете добри дела.",
    },
  };

  const { proposal: healedProposal, report } = auditAndRefineProposal(corruptedProposal, { maxPasses: 3 });
  assert.ok(healedProposal.fullDalilText?.includes("Всяка душа ще вкуси смъртта"), `fullDalilText was not healed: ${healedProposal.fullDalilText}`);
  assert.ok(healedProposal.scriptWorkflow?.dalilText?.includes("Всяка душа ще вкуси смъртта"), `scriptWorkflow.dalilText was not healed: ${healedProposal.scriptWorkflow?.dalilText}`);
  assert.strictEqual(isInvalidSacredQuoteText(healedProposal.fullDalilText), false);
  console.log("✔ TEST 6 PASSED: Smart Script Auditor successfully healed corrupt Dalil and injected authentic Ayah translation.");

  // TEST 7: buildExplainedNarrationText never duplicates intro string
  console.log("[TEST 7] Verifying buildExplainedNarrationText double-intro prevention...");
  const narration = buildExplainedNarrationText({
    viralTitle: "[Коран 3:185] Преходността на Дуня",
    reference: "Сура Aal-i-Imraan, сура 3, аят 185",
    quoteText: "В Свещения Коран, Аллах Всевишният повелява:", // Corrupt quote passed
    isQuran: true,
    summaryBg: "Всяка душа ще вкуси смъртта.",
    scriptWorkflow: {
      hookQuestion: "Замисляли ли сте се за смъртта?",
      hookContext: "Всеки миг ни доближава до нея.",
      dalilIntro: "В Свещения Коран, Аллах Всевишният повелява:",
      dalilText: "В Свещения Коран, Аллах Всевишният повелява:",
      explanation: "Обяснение: Смъртта е сигурна.",
      actionStep: "Правете добри дела.",
    },
  });

  assert.ok(!narration.includes("„В Свещения Коран, Аллах Всевишният повелява:“"), `Narration still has duplicate intro: ${narration}`);
  console.log("✔ TEST 7 PASSED: Narration generation prevented duplicate intro string.");

  console.log("\n🎉 ALL 7 QURAN AYAH VERIFICATION TESTS PASSED WITH 100% SUCCESS!");
}

runTests().catch((err) => {
  console.error("❌ Test suite failed:", err);
  process.exit(1);
});
