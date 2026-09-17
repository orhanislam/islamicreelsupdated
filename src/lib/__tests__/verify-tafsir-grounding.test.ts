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
  if (arbitraryProposal.scriptWorkflow?.explanation?.includes("Този Сахих хадис ни учи на искреност към Всевишния Аллах, твърдост във вярата")) {
    throw new Error(`arbitraryProposal still contains forbidden generic boilerplate! Got: ${arbitraryProposal.scriptWorkflow?.explanation}`);
  }
  console.log("   ✓ Enriched arbitrary hadith with Salafi Shaykh AI badge and non-generic explanation:", arbitraryProposal.scriptWorkflow.sourceScholar);

  const muslim2749Proposal: any = {
    title: "[Сахих Муслим #2749] 99-те части от Милостта",
    type: "explained_video",
    collection: "muslim",
    number: 2749,
    scriptWorkflow: {
      hookQuestion: "Знаеш ли колко необятна е Милостта на Твоя Създател?",
      dalilText: "Аллах Всевишният създаде милостта в сто части...",
      explanation: "Обяснение: Този хадис разкрива необятната милост на Аллах Всевишният. Една част крепи добротата на земята, а 99 части са за вярващите в Съдния ден.",
      actionStep: "Направи искрено покаяние днес.",
    },
  };
  await enrichProposalWithAuthenticTafsir(muslim2749Proposal);
  if (!muslim2749Proposal.scriptWorkflow.explanation.includes("99 части са за вярващите")) {
    throw new Error(`enrichProposalWithAuthenticTafsir overwrote specific explanation! Got: ${muslim2749Proposal.scriptWorkflow.explanation}`);
  }
  console.log("   ✓ Verified enrichProposalWithAuthenticTafsir strictly preserves specific AI explanation for Muslim #2749!");

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
  if (narrationText.includes("Действие:") || narrationText.includes("Направи истигфар точно сега")) {
    throw new Error(`buildExplainedNarrationText leaked action step into video narration! Got:\n${narrationText}`);
  }
  console.log("   ✓ Verified buildExplainedNarrationText strictly uses 'Обяснение:' without scholar attribution or action step!");

  // 13. Test Hadith 19 (Nawawi 40 / Tirmidhi 2516) Full Text Preservation
  console.log("\n13. Testing Hadith 19 (Nawawi 40 / Tirmidhi 2516) full authentic text preservation...");
  const nawawi19 = getVerifiedHadithSharhDirect({ collection: "nawawi40", number: 19 });
  if (!nawawi19 || !nawawi19.hadithTextBg) {
    throw new Error("Missing hadithTextBg for Nawawi Hadith #19!");
  }
  if (!nawawi19.hadithTextBg.includes("Калемите са вдигнати и страниците са изсъхнали")) {
    throw new Error(`Hadith 19 is missing the famous pen and pages closing clause! Got: ${nawawi19.hadithTextBg}`);
  }
  if (!nawawi19.hadithTextBg.includes("ако целият народ се събере")) {
    throw new Error(`Hadith 19 is missing the benefit/harm decree clause! Got: ${nawawi19.hadithTextBg}`);
  }
  if (!nawawi19.hadithTextBg.includes("Пази заповедите на Аллах")) {
    throw new Error(`Hadith 19 text should clearly state 'Пази заповедите на Аллах'! Got: ${nawawi19.hadithTextBg}`);
  }
  console.log("   ✓ Nawawi 19 has full untruncated Bulgarian text with clear 'Пази заповедите на Аллах'.");

  const promptBlock19 = formatTafsirGroundingPrompt({ hadithSharh: nawawi19 });
  if (!promptBlock19.includes("ОФИЦИАЛЕН АВТЕНТИЧЕН ПЪЛЕН ТЕКСТ НА ХАДИСА") || !promptBlock19.includes("Калемите са вдигнати")) {
    throw new Error("formatTafsirGroundingPrompt failed to inject full Hadith 19 text!");
  }
  console.log("   ✓ formatTafsirGroundingPrompt correctly injects full Hadith 19 into Gemini grounding context.");

  // 14. Test Muslim #2749 (100 parts of Mercy)
  console.log("\n14. Testing Muslim #2749 (100 parts of Mercy)...");
  const muslim2749 = getVerifiedHadithSharhDirect({ collection: "muslim", number: 2749 });
  if (!muslim2749) {
    throw new Error("Muslim #2749 is missing from verified database!");
  }
  if (!muslim2749.hadithTextBg || !muslim2749.hadithTextBg.includes("деветдесет и девет части")) {
    throw new Error(`Muslim #2749 has invalid hadithTextBg: ${muslim2749.hadithTextBg}`);
  }
  if (!muslim2749.text.includes("деветдесет и девет части Всевишният е запазил за Съдния ден")) {
    throw new Error(`Muslim #2749 has generic explanation: ${muslim2749.text}`);
  }
  console.log("   ✓ Muslim #2749 verified with authentic full text and specific Sharh for 99 parts of Mercy.");

  // 15. Test auto-correction of truncated dalilText in enrichProposalWithAuthenticTafsir
  console.log("\n15. Testing auto-correction of truncated dalilText in enrichProposalWithAuthenticTafsir...");
  const truncatedProposal: any = {
    title: "[Хадис 19 от ан-Науауи] Пази Аллах и Той ще те пази",
    type: "explained_video",
    collection: "nawawi40",
    number: 19,
    scriptWorkflow: {
      hookQuestion: "Защо се страхуваш от хората, след като Аллах държи съдбата ти?",
      hookContext: "Често разчитаме на хората, а забравяме Твореца.",
      dalilIntro: "Пратеникът на Аллах ﷺ ни учи:",
      dalilText: "Пази Аллах и Той ще те пази! Пази Аллах и ще Го намериш пред себе си...", // Truncated fragment!
      explanation: "Обяснение: Упованието в Аллах носи спокойствие.",
      actionStep: "Поискай помощ само от Аллах днес.",
    },
  };
  await enrichProposalWithAuthenticTafsir(truncatedProposal);
  if (!truncatedProposal.scriptWorkflow.dalilText.includes("Калемите са вдигнати и страниците са изсъхнали")) {
    throw new Error(`enrichProposalWithAuthenticTafsir failed to replace truncated dalilText! Got: ${truncatedProposal.scriptWorkflow.dalilText}`);
  }
  console.log("   ✓ enrichProposalWithAuthenticTafsir successfully corrected truncated dalilText with full authentic text!");

  // 16. Test 0 scholar names in database explanation texts
  console.log("\n16. Verifying 0 scholar attributions in database texts...");
  const dbData = (await import("../data/verified-hadith-sharh.json")).default;
  for (const h of dbData.hadiths) {
    if (h.text && (h.text.includes("Salafi Shaykh AI разяснява") || h.text.includes("Усеймин"))) {
      throw new Error(`Forbidden attribution leaked in database for ${h.collection} #${h.number}: ${h.text}`);
    }
  }
  console.log(`   ✓ All ${dbData.hadiths.length} hadiths in database verified clean with 0 scholar attributions!`);

  // 17. Test Theological Respect & Tawheed Sanitizer (Elimination of "единичкият Творец")
  console.log("\n17. Testing Theological Respect & Tawheed Sanitizer (Elimination of 'единичкият Творец')...");
  const { sanitizeTheologicalRespect } = await import("../theological-sanitizer");
  const { normalizeIslamicTermsBulgarian } = await import("../translate.functions");
  const { normalizeIslamicArabicPhoneticsForTts } = await import("../tts.functions");

  // A. Direct sanitizer checks
  const t1 = sanitizeTheologicalRespect("Той е единичкият творец на всичко.");
  if (!t1.includes("Единственият Творец") || t1.includes("единичк")) {
    throw new Error(`sanitizeTheologicalRespect failed on 'единичкият творец': ${t1}`);
  }
  console.log("   ✓ 'единичкият творец' -> 'Единственият Творец' verified.");

  const t2 = sanitizeTheologicalRespect("Поклони се на единичния Творец.");
  if (!t2.includes("Единствения Творец") || t2.includes("единичн")) {
    throw new Error(`sanitizeTheologicalRespect failed on 'единичния Творец': ${t2}`);
  }
  console.log("   ✓ 'единичния Творец' -> 'Единствения Творец' verified.");

  const t3 = sanitizeTheologicalRespect("Той е единичък Творец.");
  if (!t3.includes("Единствен Творец") || t3.includes("единичък")) {
    throw new Error(`sanitizeTheologicalRespect failed on 'единичък Творец': ${t3}`);
  }
  console.log("   ✓ 'единичък Творец' -> 'Единствен Творец' verified.");

  const t4 = sanitizeTheologicalRespect("Вярвай в единичкия Създател.");
  if (!t4.includes("Единствения Създател")) {
    throw new Error(`sanitizeTheologicalRespect failed on 'единичкия Създател': ${t4}`);
  }
  console.log("   ✓ 'единичкия Създател' -> 'Единствения Създател' verified.");

  const t5 = sanitizeTheologicalRespect("Оня вижда всяко твое дело.");
  if (!t5.includes("Аллах Всевишният вижда")) {
    throw new Error(`sanitizeTheologicalRespect failed on 'оня': ${t5}`);
  }
  console.log("   ✓ 'оня' -> 'Аллах Всевишният' verified.");

  // B. Translation pipeline normalization check
  const transTest = normalizeIslamicTermsBulgarian("Служи на единичкия Творец с искрено сърце.");
  if (!transTest.includes("Единствения Творец") || transTest.includes("единичк")) {
    throw new Error(`normalizeIslamicTermsBulgarian failed to sanitize 'единичкия Творец': ${transTest}`);
  }
  console.log("   ✓ normalizeIslamicTermsBulgarian sanitizes diminutive forms.");

  // C. TTS phonetic pipeline check
  const ttsTest = normalizeIslamicArabicPhoneticsForTts("Служи на единичкия Творец.");
  if (!ttsTest.includes("Единствения Творец") || ttsTest.includes("единичк")) {
    throw new Error(`normalizeIslamicArabicPhoneticsForTts failed to sanitize 'единичкия Творец': ${ttsTest}`);
  }
  console.log("   ✓ normalizeIslamicArabicPhoneticsForTts sanitizes diminutive forms.");

  // D. Proposal enrichment check
  const tawheedProposal: any = {
    title: "Вяра в единичкия Творец",
    type: "explained_video",
    collection: "bukhari",
    number: 1,
    scriptWorkflow: {
      hookQuestion: "Знаеш ли кой е единичкият Творец?",
      hookContext: "Всичко на този свят се крепи на единичния Творец.",
      dalilIntro: "Пратеникът на Аллах ﷺ ни учи:",
      dalilText: "Делата се оценяват според намеренията...",
      explanation: "Обяснение: Той е единичният Творец на вселената.",
      actionStep: "Посвети делата си на единичкия Творец.",
    },
  };
  await enrichProposalWithAuthenticTafsir(tawheedProposal);
  if (
    tawheedProposal.title.includes("единичк") ||
    tawheedProposal.scriptWorkflow.hookQuestion.includes("единичк") ||
    tawheedProposal.scriptWorkflow.hookContext.includes("единичн") ||
    tawheedProposal.scriptWorkflow.explanation.includes("единичн") ||
    tawheedProposal.scriptWorkflow.actionStep.includes("единичк")
  ) {
    throw new Error(`enrichProposalWithAuthenticTafsir failed to sanitize theological terms: ${JSON.stringify(tawheedProposal)}`);
  }
  console.log("   ✓ enrichProposalWithAuthenticTafsir sanitizes all fields to 'Единственият Творец'.");

  // E. Narration text generation check
  const narration = buildExplainedNarrationText({
    viralTitle: "Кой е единичкият Творец?",
    themeBg: "Таухид",
    quoteText: "Делата се съдят по намеренията.",
    summaryBg: "Той е единичният Творец.",
    actionStep: "Поклони се на единичкия Творец.",
  });
  if (narration.includes("единичк") || narration.includes("единичн")) {
    throw new Error(`buildExplainedNarrationText produced unsanitized output: ${narration}`);
  }
  console.log("   ✓ buildExplainedNarrationText produces clean 'Единственият Творец' narration.");

  console.log("\n🎉 ALL AUTHENTIC TAFSIR & SHARH TESTS (INCLUDING TAWHEED 'ЕДИНСТВЕНИЯТ ТВОРЕЦ') PASSED 100%!");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});


