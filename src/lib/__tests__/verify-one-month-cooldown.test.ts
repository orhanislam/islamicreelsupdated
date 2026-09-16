import assert from "node:assert/strict";
import {
  isItemWithinOneMonthCooldown,
  getCooldownDaysRemaining,
  checkProposalOneMonthCooldown,
  THIRTY_DAYS_MS,
  type HistoryItem,
} from "../generation-history.functions";

console.log("🧪 Starting 1-Month Cooldown & Anti-Duplicate Test Suite...\n");

const now = Date.now();
const dayMs = 24 * 60 * 60 * 1000;

// 1. Test isItemWithinOneMonthCooldown & getCooldownDaysRemaining
console.log("1. Testing cooldown window calculations...");
const recentTimestamp = now - 5 * dayMs; // 5 days ago
const boundaryTimestamp = now - 29 * dayMs; // 29 days ago
const expiredTimestamp = now - 32 * dayMs; // 32 days ago

assert.equal(isItemWithinOneMonthCooldown(recentTimestamp, now), true, "5 days ago must be in cooldown");
assert.equal(isItemWithinOneMonthCooldown(boundaryTimestamp, now), true, "29 days ago must be in cooldown");
assert.equal(isItemWithinOneMonthCooldown(expiredTimestamp, now), false, "32 days ago must NOT be in cooldown");

const daysRemRecent = getCooldownDaysRemaining(recentTimestamp, now);
assert.ok(daysRemRecent >= 24 && daysRemRecent <= 25, `Expected ~25 days remaining, got ${daysRemRecent}`);

const daysRemExpired = getCooldownDaysRemaining(expiredTimestamp, now);
assert.equal(daysRemExpired, 0, "Expired item must have 0 days remaining");
console.log("   ✓ Window calculations passed!");

// 2. Test checkProposalOneMonthCooldown with Quran proposals
console.log("\n2. Testing Quran collision detection...");
const mockHistory: HistoryItem[] = [
  {
    id: "job-1",
    timestamp: now - 10 * dayMs, // active (10 days old)
    title: "Аят ал-Курси (Сура 2, аят 255)",
    type: "quran",
    surah: 2,
    ayah: 255,
    reference: "Сура 2:255",
  },
  {
    id: "job-2",
    timestamp: now - 35 * dayMs, // expired (35 days old)
    title: "Сура Ал-Ихляс (112:1-4)",
    type: "quran",
    surah: 112,
    ayah: 1,
    ayahEnd: 4,
    reference: "Сура 112:1-4",
  },
  {
    id: "job-3",
    timestamp: now - 2 * dayMs, // active (2 days old)
    title: "Сахих ал-Бухари #6424 (Изпитанията)",
    type: "hadith",
    hadithCollection: "bukhari",
    hadithNumber: 6424,
    reference: "Сахих ал-Бухари #6424",
  },
  {
    id: "job-4",
    timestamp: now - 3 * dayMs, // active (3 days old)
    title: "Хадис № 1 на Навауи (Намеренията)",
    type: "hadith",
    hadithCollection: "nawawi40",
    hadithNumber: 1,
    reference: "40 хадиса на Навауи № 1",
  }
];

// Test Quran exact hit
const kursHit = checkProposalOneMonthCooldown(
  {
    title: "Аят Ал-Курси - Дълбоко напомняне",
    type: "quran",
    surah: 2,
    ayah: 255,
  },
  mockHistory,
  now
);
assert.equal(kursHit.isBlocked, true, "Ayat al-Kursi (2:255) must be blocked within 30 days");
assert.ok(kursHit.matchedItem?.title.includes("255"), "Matched item must be Ayat al-Kursi");

// Test Quran expired hit (Surah 112 generated 35 days ago -> should NOT be blocked)
const ikhlasExpiredCheck = checkProposalOneMonthCooldown(
  {
    title: "Сура Ал-Ихляс",
    type: "quran",
    surah: 112,
    ayah: 1,
    count: 4,
  },
  mockHistory,
  now
);
assert.equal(ikhlasExpiredCheck.isBlocked, false, "Surah 112 generated >30 days ago should NOT be blocked");

// Test Quran range overlap hit:
// If history has Surah 2:255 and proposal covers Surah 2:254-256
const rangeOverlapHit = checkProposalOneMonthCooldown(
  {
    title: "Сура Ал-Бакара (2:254-256)",
    type: "quran",
    surah: 2,
    ayah: 254,
    count: 3,
  },
  mockHistory,
  now
);
assert.equal(rangeOverlapHit.isBlocked, true, "Range overlapping 2:255 must be blocked");

// Test Quran ungenerated surah
const fatihaCheck = checkProposalOneMonthCooldown(
  {
    title: "Сура Ал-Фатиха (1:1-7)",
    type: "quran",
    surah: 1,
    ayah: 1,
    count: 7,
  },
  mockHistory,
  now
);
assert.equal(fatihaCheck.isBlocked, false, "Surah 1 (not in history) must be allowed");
console.log("   ✓ Quran collision detection passed!");

// 3. Test Hadith collision detection
console.log("\n3. Testing Hadith collision detection...");

// Bukhari #6424 exact hit with standard naming
const bukhariHit = checkProposalOneMonthCooldown(
  {
    title: "Вирален клип за Сахих ал-Бухари #6424",
    type: "hadith",
    hadithCollection: "bukhari",
    hadithNumber: 6424,
  },
  mockHistory,
  now
);
assert.equal(bukhariHit.isBlocked, true, "Bukhari #6424 within 30 days must be blocked");

// Bukhari #6424 hit via Bulgarian collection name
const bukhariBgHit = checkProposalOneMonthCooldown(
  {
    title: "Бухари хадис за изпитанията",
    type: "hadith",
    hadithCollection: "Сахих ал-Бухари",
    hadithNumber: 6424,
  },
  mockHistory,
  now
);
assert.equal(bukhariBgHit.isBlocked, true, "Bukhari #6424 with BG collection name must be blocked");

// Nawawi #1 hit
const nawawiHit = checkProposalOneMonthCooldown(
  {
    title: "Делата се оценяват според намеренията",
    type: "hadith",
    hadithCollection: "nawawi40",
    hadithNumber: 1,
  },
  mockHistory,
  now
);
assert.equal(nawawiHit.isBlocked, true, "Nawawi #1 within 30 days must be blocked");

// Nawawi #5 (different number) -> allowed
const nawawi5Check = checkProposalOneMonthCooldown(
  {
    title: "Хадис № 5 на Навауи",
    type: "hadith",
    hadithCollection: "nawawi40",
    hadithNumber: 5,
  },
  mockHistory,
  now
);
assert.equal(nawawi5Check.isBlocked, false, "Nawawi #5 (not generated) must be allowed");

// Sahih Muslim #2564 (different collection) -> allowed
const muslimCheck = checkProposalOneMonthCooldown(
  {
    title: "Сахих Муслим #2564",
    type: "hadith",
    hadithCollection: "muslim",
    hadithNumber: 2564,
  },
  mockHistory,
  now
);
assert.equal(muslimCheck.isBlocked, false, "Muslim #2564 (not generated) must be allowed");

console.log("   ✓ Hadith collision detection passed!");

console.log("\n🎉 ALL 1-MONTH COOLDOWN TESTS PASSED SUCCESSFULLY!");
