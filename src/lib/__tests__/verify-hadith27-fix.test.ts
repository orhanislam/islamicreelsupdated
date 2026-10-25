import assert from "node:assert/strict";
import { detectScriptureFromText, getVerifiedHadithSharhDirect } from "../tafsir.functions";
import { formatSpokenCitation, buildExplainedNarrationText } from "../assistant.functions";
import { validateAndHealHadithDaleel, auditAndRefineProposal } from "../smart-script-auditor";
import { fetchSunnahHadithDirect } from "../sunnah.functions";

async function runHadith27Verification() {
  console.log("=================================================================");
  console.log("🚀 VERIFYING HADITH 27 & 40 NAWAWI COLLECTIONS ACCURACY FIX");
  console.log("=================================================================\n");

  // --------------------------------------------------------------------------
  // TEST 1: detectScriptureFromText matches various user prompts for Hadith 27
  // --------------------------------------------------------------------------
  console.log("[TEST 1] Verifying detectScriptureFromText for Hadith 27...");
  const promptCases = [
    "hadith 27 hadith book collections of forty",
    "hadith 27 collections of forty",
    "40 hadith 27",
    "40 hadith hadith 27",
    "hadith 27 nawawi",
    "nawawi 27",
    "хадис 27 от 40 хадиса на навауи",
    "хадис 27 навауи",
    "науауи #27",
    "[40 Хадиса на ан-Науауи #27] Праведността и гласът на съвестта",
  ];

  for (const p of promptCases) {
    const res = detectScriptureFromText(p);
    assert.equal(res.type, "hadith", `Failed for: "${p}" - expected hadith, got ${res.type}`);
    assert.equal(res.collection, "nawawi40", `Failed collection for: "${p}" - got ${res.collection}`);
    assert.equal(res.number, 27, `Failed number for: "${p}" - got ${res.number}`);
    console.log(`   ✓ "${p}" -> nawawi40 #27`);
  }

  // --------------------------------------------------------------------------
  // TEST 2: validateAndHealHadithDaleel preserves and extracts 27, NEVER defaults to 1
  // --------------------------------------------------------------------------
  console.log("\n[TEST 2] Verifying validateAndHealHadithDaleel extracts #27 from title...");
  
  // Case A: Missing number but title has [40 Хадиса на ан-Науауи #27]
  const propA: any = {
    title: "[40 Хадиса на ан-Науауи #27] Праведността и гласът на съвестта",
    type: "explained_video",
    collection: "nawawi40",
  };
  validateAndHealHadithDaleel(propA);
  assert.equal(propA.number, 27, `Expected propA.number to be 27, got ${propA.number}`);
  console.log(`   ✓ Title with [40 Хадиса на ан-Науауи #27] healed number to: ${propA.number}`);

  // Case B: Erroneously set to 1 while title explicitly specifies #27 -> AUTO HEAL
  const propB: any = {
    title: "[40 Хадиса на ан-Науауи #27] Праведността и гласът на съвестта",
    type: "explained_video",
    collection: "nawawi40",
    number: 1, // Buggy state
  };
  validateAndHealHadithDaleel(propB);
  assert.equal(propB.number, 27, `Expected propB.number auto-healed to 27 from title, got ${propB.number}`);
  console.log(`   ✓ Mismatched number=1 auto-healed to title number: ${propB.number}`);

  // Case C: Full audit loop via auditAndRefineProposal
  const propC: any = {
    title: "[40 Хадиса на ан-Науауи #27] Праведността и гласът на съвестта",
    type: "explained_video",
    scriptWorkflow: {
      hookQuestion: "Защо усещате тревога в гърдите си?",
      hookContext: "Грехът винаги тревожи сърцето.",
      dalilIntro: "Пратеникът на Аллах ﷺ ни учи:",
      dalilText: "Праведността е благонравието...",
      explanation: "Обяснение: Праведността носи покой.",
      actionStep: "Напътствие: Правете истигфар.",
    },
  };
  const audited = auditAndRefineProposal(propC);
  assert.equal(audited.proposal.number, 27, `Full audit should maintain hadith 27, got ${audited.proposal.number}`);
  assert.equal(audited.proposal.collection, "nawawi40");
  console.log(`   ✓ Full audit pipeline preserved: ${audited.proposal.collection} #${audited.proposal.number}`);

  // --------------------------------------------------------------------------
  // TEST 3: formatSpokenCitation produces "40 Хадиса на ан-Навауи, хадис номер 27"
  // --------------------------------------------------------------------------
  console.log("\n[TEST 3] Verifying formatSpokenCitation for Hadith 27...");
  const citationCases = [
    "[40 Хадиса на ан-Науауи #27] Праведността и гласът на съвестта",
    "40 Хадиса на ан-Навауи • Хадис № 27",
    "40 Хадиса на Навауи #27",
    "[40 Хадиса на Навауи #27]",
  ];

  for (const c of citationCases) {
    const spoken = formatSpokenCitation(c, false);
    assert.match(spoken, /40\s+хадиса\s+на\s+ан-навауи/i, `Should contain collection name in "${spoken}"`);
    assert.match(spoken, /27/, `Should contain number 27 in "${spoken}"`);
    assert.doesNotMatch(spoken, /\b1\b/, `Must NEVER contain number 1 in "${spoken}"`);
    console.log(`   ✓ "${c}" -> spoken citation: "${spoken}"`);
  }

  // --------------------------------------------------------------------------
  // TEST 4: buildExplainedNarrationText includes citation for #27, NEVER #1
  // --------------------------------------------------------------------------
  console.log("\n[TEST 4] Verifying buildExplainedNarrationText narration script...");
  const narration = buildExplainedNarrationText({
    viralTitle: "Праведността и гласът на съвестта",
    reference: "40 Хадиса на ан-Навауи • Хадис № 27",
    quoteText: "Праведността е благородният нрав, а грехът е онова, което се колебае в гърдите Ви.",
    isQuran: false,
    scriptWorkflow: {
      hookQuestion: "Защо усещате дълбоко вътрешно смущение, когато сърцето се докосне до греха?",
      hookContext: "Това чисто усещане е компасът на Вашата вяра.",
      dalilIntro: "Пратеникът на Аллах ﷺ ни учи:",
      dalilText: "Праведността е благородният нрав, а грехът е онова, което се колебае в гърдите Ви.",
      explanation: "Обяснение: Праведността се корени в благородния нрав, а грехът оставя тревога в здравото сърце.",
      actionStep: "Напътствие: Пречистете Вашите намерения пред Единствения Творец и споделете за добро!",
    },
  });

  assert.match(narration, /хадис номер 27/i, "Narration must mention hadith number 27");
  assert.doesNotMatch(narration, /хадис номер 1\b/i, "Narration must NOT mention hadith number 1");
  assert.doesNotMatch(narration, /първият хадис/i, "Narration must NOT say first hadith");
  console.log("   ✓ Narration verified: includes hadith 27 citation, 0% reference to hadith 1.");

  // --------------------------------------------------------------------------
  // TEST 5: Direct Fetch of Hadith 27 via fetchSunnahHadithDirect
  // --------------------------------------------------------------------------
  console.log("\n[TEST 5] Testing fetchSunnahHadithDirect for nawawi40 #27...");
  const h27 = await fetchSunnahHadithDirect("nawawi40", 27, false);
  assert.equal(h27.number, 27);
  assert.equal(h27.collection, "nawawi40");
  assert.ok(h27.arabic.length > 20, "Must have authentic Arabic text");
  assert.ok(h27.english.length > 20, "Must have authentic English text");
  console.log(`   ✓ Successfully fetched Nawawi #27: "${h27.reference}" (${h27.arabic.slice(0, 50)}...)`);

  // --------------------------------------------------------------------------
  // TEST 6: getVerifiedHadithSharhDirect for Nawawi #27 has hadithTextBg
  // --------------------------------------------------------------------------
  console.log("\n[TEST 6] Testing getVerifiedHadithSharhDirect for nawawi40 #27...");
  const sharh27 = getVerifiedHadithSharhDirect({ collection: "nawawi40", number: 27 });
  assert.ok(sharh27, "Sharh 27 must exist");
  assert.ok(sharh27.hadithTextBg, "Sharh 27 must have authentic Bulgarian hadithTextBg");
  assert.match(sharh27.hadithTextBg, /Праведността/i);
  console.log(`   ✓ Sharh 27 verified with hadithTextBg: "${sharh27.hadithTextBg}"`);

  console.log("\n=================================================================");
  console.log("🎉 ALL TESTS PASSED! HADITH 27 NUMBERING IS 100% BULLETPROOF!");
  console.log("=================================================================\n");
}

runHadith27Verification().catch((err) => {
  console.error("Test failed:", err);
  process.exitCode = 1;
});
