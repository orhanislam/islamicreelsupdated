import assert from "node:assert/strict";
import {
  recordRejectedScriptureDirect,
  getGenerationHistoryDirect,
  deleteGenerationEntryDirect,
  getExcludedScripturesOneMonth,
  checkProposalOneMonthCooldown,
} from "../generation-history.functions";

async function runTests() {
  console.log("🧪 Starting Rejected Scripture History & Cooldown Test Suite...\n");

  const testTitle = `[Коран 13:28] Покоят на Сърцата Тест_${Date.now()}`;
  const testSurah = 13;
  const testAyah = 28;

  // 1. Record rejected proposal directly
  console.log("1. Recording rejected proposal into history...");
  const recorded = await recordRejectedScriptureDirect({
    title: testTitle,
    type: "explained_video",
    surah: testSurah,
    ayah: testAyah,
    count: 1,
    arabicText: "الَّذِينَ آمَنُوا وَتَطْمَئِنُّ قُلُوبُهُمْ بِذِكْرِ اللَّهِ",
    scriptWorkflow: {
      dalilText: "Онези, които вярват и сърцата им се успокояват при споменаването на Аллах.",
      explanation: "Обяснение: Истинският покой се намира единствено в споменаването на Аллах.",
    },
  });

  assert.ok(recorded.id, "Recorded entry must have an ID");
  assert.equal(recorded.type, "ayah", "Type should be resolved to ayah");
  assert.equal(recorded.surah, 13);
  assert.equal(recorded.ayah, 28);
  assert.equal(recorded.status, "completed", "Must be recorded as completed to trigger cooldown");
  console.log("   ✓ Entry successfully recorded with ID:", recorded.id);

  // 2. Verify it is present in getGenerationHistoryDirect
  console.log("\n2. Checking presence in generation history direct...");
  const history = await getGenerationHistoryDirect();
  const foundInHistory = history.find((h) => h.id === recorded.id);
  assert.ok(foundInHistory, "Entry must exist in generation history file");
  console.log("   ✓ Found entry in generation history list!");

  // 3. Verify getExcludedScripturesOneMonth contains this rejected ayah
  console.log("\n3. Checking 1-month exclusion data...");
  const exclusionData = await getExcludedScripturesOneMonth();
  const excludedAyah = exclusionData.ayahList.find(
    (a) => a.surah === testSurah && a.ayah === testAyah
  );
  assert.ok(excludedAyah, "Excluded ayahList must contain Surah 13:28");
  assert.equal(excludedAyah.daysRemaining, 30, "Should have 30 days remaining");
  assert.ok(
    exclusionData.formattedExclusionPrompt.includes("13:28"),
    "Formatted exclusion prompt must mention 13:28"
  );
  console.log("   ✓ Surah 13:28 is strictly excluded for 30 days!");

  // 4. Test checkProposalOneMonthCooldown blocks any attempt to propose 13:28
  console.log("\n4. Checking that checkProposalOneMonthCooldown blocks 13:28...");
  const collisionCheck = checkProposalOneMonthCooldown(
    {
      title: "[Коран 13:28] Покоят на Сърцата",
      type: "explained_video",
      surah: 13,
      ayah: 28,
    } as any,
    exclusionData.items
  );
  assert.equal(collisionCheck.isBlocked, true, "13:28 must be blocked!");
  assert.ok(collisionCheck.reason, "Collision must provide a reason");
  console.log("   ✓ Collision detected and blocked:", collisionCheck.reason);

  // 5. Test manual deletion from history (simulating user clicking delete in /history)
  console.log("\n5. Testing deletion from history (user lifts cooldown)...");
  await deleteGenerationEntryDirect(recorded.id);

  const updatedHistory = await getGenerationHistoryDirect();
  const deletedFromHistory = updatedHistory.find((h) => h.id === recorded.id);
  assert.equal(deletedFromHistory, undefined, "Item must be removed from history file");

  const updatedExclusion = await getExcludedScripturesOneMonth();
  const excludedAfterDelete = updatedExclusion.ayahList.find(
    (a) => a.title === testTitle
  );
  assert.equal(excludedAfterDelete, undefined, "Item must be removed from exclusion list");
  console.log("   ✓ Item successfully deleted and cooldown lifted!");

  // 6. Test recording a rejected hadith
  console.log("\n6. Testing rejected hadith recording and cooldown...");
  const hadithTitle = `[Сахих Муслим #2749] 99-те части от Милостта Тест_${Date.now()}`;
  const recordedHadith = await recordRejectedScriptureDirect({
    title: hadithTitle,
    type: "explained_video",
    collection: "muslim",
    number: 2749,
    scriptWorkflow: {
      dalilText: "Аллах притежава сто милости...",
      explanation: "Обяснение: Милостта на Всевишния е необятна.",
    },
  });

  assert.equal(recordedHadith.type, "hadith");
  assert.equal(recordedHadith.collection, "muslim");
  assert.equal(Number(recordedHadith.hadithNumber), 2749);

  const hadithExclusion = await getExcludedScripturesOneMonth();
  const excludedHadith = hadithExclusion.hadithList.find(
    (h) => h.collection === "muslim" && String(h.number) === "2749"
  );
  assert.ok(excludedHadith, "Muslim #2749 must be in excluded hadith list");

  const hadithCollision = checkProposalOneMonthCooldown(
    {
      title: "[Сахих Муслим #2749] Милостта",
      type: "explained_video",
      collection: "muslim",
      number: 2749,
    } as any,
    hadithExclusion.items
  );
  assert.equal(hadithCollision.isBlocked, true, "Muslim #2749 must be blocked");
  console.log("   ✓ Hadith rejection successfully recorded and blocked for 30 days!");

  // Clean up test hadith
  await deleteGenerationEntryDirect(recordedHadith.id);
  console.log("   ✓ Cleaned up test hadith entry.");

  console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY! 100% VERIFIED!\n");
}

runTests().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});
