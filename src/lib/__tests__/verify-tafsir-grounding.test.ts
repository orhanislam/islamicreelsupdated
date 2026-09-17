import {
  fetchAuthenticTafsirDirect,
  getVerifiedHadithSharhDirect,
  formatTafsirGroundingPrompt,
} from "../tafsir.functions";

async function runTests() {
  console.log("🧪 Starting Authentic Tafsir & Sharh Grounding Test Suite...\n");

  // 1. Test Quran Tafsir as-Sa'di (Arabic - ID 91)
  console.log("1. Testing Tafsir as-Sa'di (91) for Surah 112:1...");
  const sadi112 = await fetchAuthenticTafsirDirect({ surah: 112, ayah: 1, scholarId: 91 });
  if (!sadi112 || !sadi112.text) {
    throw new Error("Failed to fetch Tafsir as-Sa'di for 112:1");
  }
  console.log("   ✓ Retrieved Tafsir as-Sa'di text:", sadi112.text.slice(0, 120), "...");
  console.log("   ✓ Scholar:", sadi112.scholar);

  // 2. Test Local Cache for Tafsir as-Sa'di
  console.log("\n2. Testing local cache for Tafsir as-Sa'di...");
  const cachedSadi = await fetchAuthenticTafsirDirect({ surah: 112, ayah: 1, scholarId: 91 });
  if (!cachedSadi || cachedSadi.source !== "local_cache") {
    throw new Error("Expected cached result for second fetch!");
  }
  console.log("   ✓ Correctly returned from local_cache!");

  // 3. Test Tafsir Ibn Kathir (English - ID 169)
  console.log("\n3. Testing Tafsir Ibn Kathir (169) for Surah 13:28...");
  const ibnKathir13 = await fetchAuthenticTafsirDirect({ surah: 13, ayah: 28, scholarId: 169 });
  if (!ibnKathir13 || !ibnKathir13.text) {
    throw new Error("Failed to fetch Tafsir Ibn Kathir for 13:28");
  }
  console.log("   ✓ Retrieved Ibn Kathir text:", ibnKathir13.text.slice(0, 120), "...");

  // 4. Test Verified Hadith Sharh (Salafi Shaykh AI)
  console.log("\n4. Testing verified Hadith Sharh for Sahih al-Bukhari #1...");
  const bukhari1 = getVerifiedHadithSharhDirect({ collection: "bukhari", number: 1 });
  if (!bukhari1 || !bukhari1.scholar.includes("Salafi Shaykh AI")) {
    throw new Error("Failed to retrieve Salafi Shaykh AI Sharh for Bukhari #1");
  }
  console.log("   ✓ Scholar:", bukhari1.scholar);
  console.log("   ✓ Work:", bukhari1.work);
  console.log("   ✓ Sharh text:", bukhari1.text);

  // 5. Test Hadith Sharh for Bukhari 6424 (Two blessings)
  console.log("\n5. Testing verified Hadith Sharh for Sahih al-Bukhari #6424...");
  const bukhari6424 = getVerifiedHadithSharhDirect({ collection: "bukhari", number: 6424 });
  if (!bukhari6424 || !bukhari6424.scholar.includes("Salafi Shaykh AI")) {
    throw new Error("Failed to retrieve Salafi Shaykh AI Sharh for Bukhari #6424");
  }
  console.log("   ✓ Retrieved Sharh for Bukhari 6424:", bukhari6424.text);

  // 6. Test Prompt Grounding Formatter
  console.log("\n6. Testing prompt grounding formatter...");
  const promptBlock = formatTafsirGroundingPrompt({ tafsir: sadi112 });
  if (!promptBlock.includes("ОФИЦИАЛЕН АВТЕНТИЧЕН ТЕКСТ") || !promptBlock.includes("СТРОГА ЗАПОВЕД")) {
    throw new Error("Grounding prompt format mismatch!");
  }
  console.log("   ✓ Grounding prompt block formatted successfully!");

  // 7. Test detectScriptureFromText
  console.log("\n7. Testing detectScriptureFromText...");
  const { detectScriptureFromText, enrichProposalWithAuthenticTafsir } = await import("../tafsir.functions");
  const quranDet1 = detectScriptureFromText("Направи видео за Сура Ал-Ихляс");
  if (quranDet1.type !== "quran" || quranDet1.surah !== 112) {
    throw new Error(`Failed to detect Surah Al-Ikhlas: ${JSON.stringify(quranDet1)}`);
  }
  console.log("   ✓ Detected Surah Al-Ikhlas (112:1)");

  const quranDet2 = detectScriptureFromText("Искам обяснение за аят 13:28 от Корана");
  if (quranDet2.type !== "quran" || quranDet2.surah !== 13 || quranDet2.ayah !== 28) {
    throw new Error(`Failed to detect 13:28: ${JSON.stringify(quranDet2)}`);
  }
  console.log("   ✓ Detected 13:28 (Ar-Ra'd)");

  const hadithDet = detectScriptureFromText("Обясни Хадис 1 от Бухари за нийета");
  if (hadithDet.type !== "hadith" || hadithDet.collection !== "bukhari" || hadithDet.number !== 1) {
    throw new Error(`Failed to detect Bukhari 1: ${JSON.stringify(hadithDet)}`);
  }
  console.log("   ✓ Detected Bukhari #1");

  // 8. Test enrichProposalWithAuthenticTafsir
  console.log("\n8. Testing enrichProposalWithAuthenticTafsir...");
  const testProposal: any = {
    title: "[Коран 13:28] Покоят на сърцата",
    type: "explained_video",
    surah: 13,
    ayah: 28,
  };
  await enrichProposalWithAuthenticTafsir(testProposal);
  if (!testProposal.scriptWorkflow?.isAuthenticVerified || !testProposal.scriptWorkflow.sourceScholar?.includes("ас-Са'ди")) {
    throw new Error(`Proposal was not enriched with Tafsir as-Sa'di: ${JSON.stringify(testProposal)}`);
  }
  console.log("   ✓ Enriched Quran proposal with Tafsir as-Sa'di metadata:", testProposal.scriptWorkflow.sourceScholar);

  const testHadithProposal: any = {
    title: "[Сахих ал-Бухари #6424] Двете блага",
    type: "explained_video",
    collection: "bukhari",
    number: 6424,
  };
  await enrichProposalWithAuthenticTafsir(testHadithProposal);
  if (!testHadithProposal.scriptWorkflow?.isAuthenticVerified || !testHadithProposal.scriptWorkflow.sourceScholar?.includes("Salafi Shaykh AI")) {
    throw new Error(`Proposal was not enriched with Salafi Shaykh AI Sharh: ${JSON.stringify(testHadithProposal)}`);
  }
  if (testHadithProposal.scriptWorkflow.explanation?.includes("Усеймин")) {
    throw new Error(`Explanation contains forbidden scholar reference: ${testHadithProposal.scriptWorkflow.explanation}`);
  }
  console.log("   ✓ Enriched Hadith proposal with Salafi Shaykh AI Sharh:", testHadithProposal.scriptWorkflow.sourceScholar);

  // 9. Test Tirmidhi Sharh (Tirmidhi #1987 and #2516)
  console.log("\n9. Testing Tirmidhi Hadiths Sharh...");
  const tirmidhi1987 = getVerifiedHadithSharhDirect({ collection: "tirmidhi", number: 1987 });
  if (!tirmidhi1987 || !tirmidhi1987.scholar.includes("Salafi Shaykh AI")) {
    throw new Error("Failed to retrieve Salafi Shaykh AI Sharh for Tirmidhi #1987");
  }
  console.log("   ✓ Retrieved Sharh for Tirmidhi 1987:", tirmidhi1987.text.slice(0, 100), "...");

  const tirmidhiDet = detectScriptureFromText("Направи видео за Сунан Ат-Тирмизи #1987 за сабра");
  if (tirmidhiDet.type !== "hadith" || tirmidhiDet.collection !== "tirmidhi" || tirmidhiDet.number !== 1987) {
    throw new Error(`Failed to detect Tirmidhi 1987: ${JSON.stringify(tirmidhiDet)}`);
  }
  console.log("   ✓ Detected Tirmidhi #1987 citation");

  // 10. Test full Nawawi 1-42 coverage
  console.log("\n10. Testing coverage of all 42 Nawawi Hadiths...");
  for (let i = 1; i <= 42; i++) {
    const sharh = getVerifiedHadithSharhDirect({ collection: "nawawi40", number: i });
    if (!sharh || !sharh.scholar.includes("Salafi Shaykh AI")) {
      throw new Error(`Missing Salafi Shaykh AI Sharh for Nawawi Hadith #${i}`);
    }
    if (sharh.text.includes("Усеймин")) {
      throw new Error(`Nawawi #${i} contains Uthaymeen text!`);
    }
  }
  console.log("   ✓ All 42 Nawawi Hadiths verified with Salafi Shaykh AI Sharh 100% (0% Uthaymeen)!");

  // 11. Test dynamic Salafi Shaykh AI fallback for arbitrary hadiths
  console.log("\n11. Testing dynamic Salafi Shaykh AI fallback for arbitrary hadith numbers...");
  const arbitraryBukhari = getVerifiedHadithSharhDirect({ collection: "bukhari", number: 9999 });
  if (!arbitraryBukhari || arbitraryBukhari.sourceType !== "salafi_ai" || !arbitraryBukhari.scholar.includes("Salafi Shaykh AI")) {
    throw new Error("Failed dynamic Salafi Shaykh AI fallback for arbitrary Bukhari hadith");
  }
  console.log("   ✓ Dynamic Salafi Shaykh AI fallback active for Bukhari:", arbitraryBukhari.scholar);
  console.log("   ✓ Salafi Shaykh AI sourceType verified:", arbitraryBukhari.sourceType);

  const arbitraryProposal: any = {
    title: "[Сахих ал-Бухари #9999] Пример за неприсъстващ в базата хадис",
    type: "explained_video",
    collection: "bukhari",
    number: 9999,
  };
  await enrichProposalWithAuthenticTafsir(arbitraryProposal);
  if (arbitraryProposal.scriptWorkflow?.sourceType !== "salafi_ai" || arbitraryProposal.scriptWorkflow?.sourceScholar !== "Salafi Shaykh AI") {
    throw new Error(`Expected sourceScholar to be Salafi Shaykh AI, got ${arbitraryProposal.scriptWorkflow?.sourceScholar}`);
  }
  console.log("   ✓ Enriched arbitrary hadith with Salafi Shaykh AI badge:", arbitraryProposal.scriptWorkflow.sourceScholar);

  if (testHadithProposal.scriptWorkflow?.sourceType !== "salafi_ai") {
    throw new Error(`Expected testHadithProposal sourceType to be salafi_ai, got ${testHadithProposal.scriptWorkflow?.sourceType}`);
  }
  console.log("   ✓ Verified salafi_ai sourceType for Bukhari #6424:", testHadithProposal.scriptWorkflow.sourceType);

  // 12. Test Clean Video Explanation (No scholar attribution in video narration, strictly "Обяснение:")
  console.log("\n12. Testing clean video narration explanation (strictly 'Обяснение:', 0 scholar attribution)...");
  const { stripScholarAttribution, buildExplainedNarrationText } = await import("../assistant.functions");

  const sampleAttributed1 = "Salafi Shaykh AI пояснява, че искреността е основа на вярата.";
  const cleaned1 = stripScholarAttribution(sampleAttributed1);
  if (cleaned1.includes("Salafi Shaykh AI") || cleaned1.includes("пояснява, че") || !cleaned1.startsWith("Искреността")) {
    throw new Error(`stripScholarAttribution failed on Salafi AI intro! Got: ${cleaned1}`);
  }
  console.log("   ✓ stripScholarAttribution removed 'Salafi Shaykh AI пояснява, че':", cleaned1);

  const sampleAttributed2 = "Поука: Шейх ас-Са'ди пояснява в своя Тефсир, че сърцата намират покой при споменаване на Аллах.";
  const cleaned2 = stripScholarAttribution(sampleAttributed2);
  if (cleaned2.includes("ас-Са'ди") || cleaned2.includes("Поука") || !cleaned2.startsWith("Сърцата")) {
    throw new Error(`stripScholarAttribution failed on as-Sa'di intro! Got: ${cleaned2}`);
  }
  console.log("   ✓ stripScholarAttribution removed as-Sa'di intro and 'Поука:':", cleaned2);

  const narrationText = buildExplainedNarrationText({
    viralTitle: "Покоят на сърцата",
    reference: "Коран 13:28",
    quoteText: "Онези, които вярват и сърцата им намират покой при споменаването на Аллах.",
    isQuran: true,
    scriptWorkflow: {
      hookQuestion: "Защо душата ти се чувства тревожна?",
      hookContext: "Когато светът те притисне, има едно спасение.",
      dalilIntro: "В Свещения Коран, Аллах Всевишният повелява:",
      dalilText: "Онези, които вярват и сърцата им намират покой при споменаването на Аллах.",
      explanation: "Salafi Shaykh AI пояснява, че истинският мир не идва от богатство, а от връзката с Твореца.",
      actionStep: "Направи истигфар точно сега. Сподели за садака джария!",
    },
  });

  if (narrationText.includes("Поука:")) {
    throw new Error(`buildExplainedNarrationText still contains 'Поука:'! Got:\n${narrationText}`);
  }
  if (!narrationText.includes("Обяснение: Истинският мир не идва от богатство, а от връзката с Твореца.")) {
    throw new Error(`buildExplainedNarrationText missing clean 'Обяснение:' block! Got:\n${narrationText}`);
  }
  if (narrationText.includes("Salafi Shaykh AI пояснява")) {
    throw new Error(`buildExplainedNarrationText leaked scholar attribution into video! Got:\n${narrationText}`);
  }
  console.log("   ✓ Verified buildExplainedNarrationText strictly uses 'Обяснение:' without scholar attribution!");

  console.log("\n🎉 ALL AUTHENTIC TAFSIR & SHARH TESTS (EXCLUSIVELY SALAFI SHAYKH AI & CLEAN EXPLANATION) PASSED 100%!");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});


