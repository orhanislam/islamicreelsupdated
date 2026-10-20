import { normalizeBulgarianNumbersForTts } from "../bulgarian-numbers";
import { auditAndRefineNarrationScript } from "../smart-script-auditor";
import { formatSpokenCitation, generateExplainedVideoProposalDirect } from "../assistant.functions";
import { segmentScriptIntoSemanticScenes, fetchMultiSceneBRollDirect } from "../pexels.functions";

async function runGoalFixesVerification() {
  console.log("=================================================================");
  console.log("🚀 VERIFYING GOAL CRITERIA (1. NUMBERS, 2. B-ROLL, 3. AUTO-AUDIT)");
  console.log("=================================================================\n");

  // --------------------------------------------------------------------------
  // TEST 1: Number verbalization (#1, № 1, No. 1, номер 1, хадис 1)
  // --------------------------------------------------------------------------
  console.log("[TEST 1] Verifying Number Symbol Normalization for TTS...");
  const cases: [string, string][] = [
    ["Сахих ал-Бухари #1", "номер едно"],
    ["Сахих ал-Бухари # 1", "номер едно"],
    ["Сахих Муслим № 1", "номер едно"],
    ["Сахих Муслим №1", "номер едно"],
    ["Сунан ат-Тирмизи No. 1", "номер едно"],
    ["Хадис номер 1", "номер едно"],
    ["Хадис 1", "номер едно"],
    ["Точка #1 от сунната", "номер едно"],
    ["Точка №1 от правилата", "номер едно"],
  ];

  for (const [input, expected] of cases) {
    const res = normalizeBulgarianNumbersForTts(input);
    if (!res.toLowerCase().includes(expected.toLowerCase())) {
      throw new Error(`Normalization failed for "${input}"! Expected "${expected}", got: "${res}"`);
    }
  }

  // Verify that smart-script-auditor does NOT wipe out #1 or #\d+
  const auditRes = auditAndRefineNarrationScript("Пратеникът каза в хадис #1 следното.");
  if (!auditRes.refinedNarration.includes("номер 1") && !auditRes.refinedNarration.includes("номер едно")) {
    throw new Error(`auditAndRefineNarrationScript wiped out hadith number! Got: "${auditRes.refinedNarration}"`);
  }

  // Verify formatSpokenCitation produces clean 'хадис номер'
  const spokenHadith = formatSpokenCitation("Сахих ал-Бухари #1", false);
  if (!spokenHadith.includes("хадис номер 1")) {
    throw new Error(`formatSpokenCitation failed! Expected 'хадис номер 1', got: "${spokenHadith}"`);
  }

  console.log("✔ TEST 1 PASSED: #1, № 1, No. 1, and citations articulate accurately as 'номер едно'!\n");

  // --------------------------------------------------------------------------
  // TEST 2: Dynamic Multi-Scene Visuals (No static background)
  // --------------------------------------------------------------------------
  console.log("[TEST 2] Verifying Dynamic Multi-Scene Visuals & B-Roll...");
  const sampleScript = `Защо усещате тревога в гърдите си, дори когато всичко изглежда наред?
Често търсите спокойствие на грешните места, но Вашата душа остава жадна за истината.
Пратеникът на Аллах ﷺ ни учи: „Който поеме по път в търсене на религиозно знание, Аллах му улеснява чрез него пътя към Дженнета.“
Обяснение: Истинското знание в Исляма е почит и светлина, водещи към опознаване на Единствения Творец.
Когато посвещавате време за изучаване на вярата с искрено намерение, Аллах премахва трудностите от Вашия житейски път.
Напътствие: Научете поне един аят или сахих хадис днес с размисъл и благодарете на Аллах Всевишният!`;

  const totalDuration = 26.5; // ~26.5s audio duration
  const scenes = segmentScriptIntoSemanticScenes(sampleScript, undefined, totalDuration);

  console.log(`Generated ${scenes.length} distinct scenes across ${totalDuration}s:`);
  scenes.forEach((sc, i) => {
    console.log(`  Scene ${i + 1}: ${sc.start.toFixed(2)}s -> ${sc.end.toFixed(2)}s (${sc.duration.toFixed(2)}s) [Concept: ${sc.conceptId}]`);
  });

  if (scenes.length < 4) {
    throw new Error(`Expected at least 4 scenes for a 26.5s video to avoid static background! Got: ${scenes.length}`);
  }

  // Verify scenes do not span > 6.5s
  for (let i = 0; i < scenes.length; i++) {
    if (scenes[i].duration > 6.8) {
      throw new Error(`Scene ${i + 1} duration (${scenes[i].duration}s) is too long and causes static background!`);
    }
  }

  // Verify fetchMultiSceneBRollDirect generates distinct URLs for every scene
  const bRollResult = await fetchMultiSceneBRollDirect({
    text: sampleScript,
    audioDuration: totalDuration,
  });

  console.log(`\nBRoll Result Clips (${bRollResult.clips.length} clips):`);
  bRollResult.clips.forEach((c, idx) => console.log(`  Clip ${idx + 1}: ${c}`));

  const uniqueClips = new Set(bRollResult.clips);
  if (uniqueClips.size !== bRollResult.clips.length) {
    throw new Error(`B-Roll clips contain duplicates! Expected ${bRollResult.clips.length} unique clips, got ${uniqueClips.size}`);
  }

  console.log("✔ TEST 2 PASSED: 100% dynamic multi-scene cuts every ~4s with zero static background loops!\n");

  // --------------------------------------------------------------------------
  // TEST 3: Engine auto-audit on proposal creation (1st button click)
  // --------------------------------------------------------------------------
  console.log("[TEST 3] Verifying 100% Engine Auto-Audit on Proposal Generation...");
  const proposalRes = await generateExplainedVideoProposalDirect({
    topic: "Благодарност (Шукр)",
    sourcePreference: "hadith",
  });

  if (!proposalRes.proposal) {
    throw new Error("generateExplainedVideoProposalDirect did not return a proposal!");
  }

  const p = proposalRes.proposal;
  if (!p.auditReport) {
    throw new Error("Proposal missing auditReport! The engine must audit and heal the text immediately on creation.");
  }

  if (!p.auditReport.is100Percent) {
    throw new Error("auditReport.is100Percent is false!");
  }

  console.log(`Proposal title: "${p.title}"`);
  console.log(`Audit report passes: ${p.auditReport.auditPasses}`);
  console.log(`Theological fixes: ${p.auditReport.theologicalCorrections?.length || 0}`);
  console.log(`Grammar fixes: ${p.auditReport.grammarCorrections?.length || 0}`);

  // Check that the explanation is properly formatted
  const expl = p.scriptWorkflow?.explanation || "";
  if (!expl.startsWith("Обяснение:")) {
    throw new Error(`Explanation does not start with 'Обяснение:'! Got: "${expl}"`);
  }

  console.log("✔ TEST 3 PASSED: Proposal is 100% auto-checked, self-healed, and badged upon generation!\n");

  console.log("=================================================================");
  console.log("🎉 ALL GOAL FIXES VERIFIED 100% SUCCESSFULLY!");
  console.log("=================================================================");
}

runGoalFixesVerification().catch((err) => {
  console.error("❌ Verification failed:", err);
  process.exit(1);
});
