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

  // 4. Test Verified Hadith Sharh (Shaykh Ibn Uthaymeen)
  console.log("\n4. Testing verified Hadith Sharh for Sahih al-Bukhari #1...");
  const bukhari1 = getVerifiedHadithSharhDirect({ collection: "bukhari", number: 1 });
  if (!bukhari1 || !bukhari1.scholar.includes("Усеймин")) {
    throw new Error("Failed to retrieve Shaykh al-Uthaymeen Sharh for Bukhari #1");
  }
  console.log("   ✓ Scholar:", bukhari1.scholar);
  console.log("   ✓ Work:", bukhari1.work);
  console.log("   ✓ Sharh text:", bukhari1.text);

  // 5. Test Hadith Sharh for Bukhari 6424 (Two blessings)
  console.log("\n5. Testing verified Hadith Sharh for Sahih al-Bukhari #6424...");
  const bukhari6424 = getVerifiedHadithSharhDirect({ collection: "bukhari", number: 6424 });
  if (!bukhari6424 || !bukhari6424.topic.includes("времето")) {
    throw new Error("Failed to retrieve Shaykh al-Uthaymeen Sharh for Bukhari #6424");
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
  if (!testHadithProposal.scriptWorkflow?.isAuthenticVerified || !testHadithProposal.scriptWorkflow.sourceScholar?.includes("Усеймин")) {
    throw new Error(`Proposal was not enriched with Shaykh al-Uthaymeen Sharh: ${JSON.stringify(testHadithProposal)}`);
  }
  console.log("   ✓ Enriched Hadith proposal with Shaykh al-Uthaymeen Sharh:", testHadithProposal.scriptWorkflow.sourceScholar);

  // 9. Test Tirmidhi Sharh (Tirmidhi #1987 and #2516)
  console.log("\n9. Testing Tirmidhi Hadiths Sharh...");
  const tirmidhi1987 = getVerifiedHadithSharhDirect({ collection: "tirmidhi", number: 1987 });
  if (!tirmidhi1987 || !tirmidhi1987.scholar.includes("Усеймин")) {
    throw new Error("Failed to retrieve Shaykh al-Uthaymeen Sharh for Tirmidhi #1987");
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
    if (!sharh || !sharh.scholar.includes("Усеймин")) {
      throw new Error(`Missing Shaykh al-Uthaymeen Sharh for Nawawi Hadith #${i}`);
    }
  }
  console.log("   ✓ All 42 Nawawi Hadiths verified with Shaykh al-Uthaymeen Sharh 100%!");

  // 11. Test dynamic Salafi AI fallback for arbitrary hadiths
  console.log("\n11. Testing dynamic Salafi AI fallback for arbitrary hadith numbers...");
  const arbitraryBukhari = getVerifiedHadithSharhDirect({ collection: "bukhari", number: 9999 });
  if (!arbitraryBukhari || arbitraryBukhari.sourceType !== "salafi_ai" || !arbitraryBukhari.scholar.includes("Salafi AI")) {
    throw new Error("Failed dynamic Salafi AI fallback for arbitrary Bukhari hadith");
  }
  console.log("   ✓ Dynamic Salafi AI fallback active for Bukhari:", arbitraryBukhari.scholar);
  console.log("   ✓ Salafi AI sourceType verified:", arbitraryBukhari.sourceType);

  const arbitraryProposal: any = {
    title: "[Сахих ал-Бухари #9999] Пример за неприсъстващ в базата хадис",
    type: "explained_video",
    collection: "bukhari",
    number: 9999,
  };
  await enrichProposalWithAuthenticTafsir(arbitraryProposal);
  if (arbitraryProposal.scriptWorkflow?.sourceType !== "salafi_ai") {
    throw new Error(`Expected sourceType to be salafi_ai, got ${arbitraryProposal.scriptWorkflow?.sourceType}`);
  }
  console.log("   ✓ Enriched arbitrary hadith with Salafi AI badge:", arbitraryProposal.scriptWorkflow.sourceScholar);

  if (testHadithProposal.scriptWorkflow?.sourceType !== "database") {
    throw new Error(`Expected testHadithProposal sourceType to be database, got ${testHadithProposal.scriptWorkflow?.sourceType}`);
  }
  console.log("   ✓ Verified database sourceType for Bukhari #6424:", testHadithProposal.scriptWorkflow.sourceType);

  console.log("\n🎉 ALL AUTHENTIC TAFSIR & SHARH TESTS (INCLUDING SALAFI AI & DATABASE GROUNDING) PASSED 100%!");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});


