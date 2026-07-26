import assert from 'assert';

// Mock localStorage
class MockLocalStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] !== undefined ? this.store[key] : null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

global.window = {
  localStorage: new MockLocalStorage()
};

const VIRAL_QURAN_PRESETS = [
  { surah: 112, ayah: 1, count: 4, title: "Сура Ал-Ихляс (112:1-4)", prompt: "Направи TikTok видео за Сура Ал-Ихляс (112:1-4) със спокоен кинематографичен фон" },
  { surah: 2, ayah: 255, count: 1, title: "Аят ал-Курси (2:255)", prompt: "Направи TikTok видео за Аят Алкарси (Сура 2 аят 255) с нощно небе и звезди" },
  { surah: 94, ayah: 5, count: 2, title: "Сура Аш-Шарх (94:5-6)", prompt: "Направи TikTok видео за Сура Аш-Шарх (94:5-6) - С всяка трудност идва облекчение" },
  { surah: 103, ayah: 1, count: 3, title: "Сура Ал-Аср (103:1-3)", prompt: "Направи TikTok видео за Сура Ал-Аср (103:1-3) за времето и спасението" },
  { surah: 113, ayah: 1, count: 5, title: "Сура Ал-Фаляк (113:1-5)", prompt: "Направи TikTok видео за Сура Ал-Фаляк (113:1-5) за защита при изгрев слънце" },
  { surah: 114, ayah: 1, count: 6, title: "Сура Ан-Нас (114:1-6)", prompt: "Направи TikTok видео за Сура Ан-Нас (114:1-6) за духовно спокойствие" },
  { surah: 108, ayah: 1, count: 3, title: "Сура Ал-Каусар (108:1-3)", prompt: "Направи TikTok видео за Сура Ал-Каусар (108:1-3) за райското изобилие" },
  { surah: 67, ayah: 1, count: 3, title: "Сура Ал-Мулк (67:1-3)", prompt: "Направи TikTok видео за Сура Ал-Мулк (67:1-3) за величието на сътворението" },
  { surah: 55, ayah: 13, count: 1, title: "Сура Ар-Рахман (55:13)", prompt: "Направи TikTok видео за Сура Ар-Рахман (55:13) - Кое от благата на вашия Господ ще излъжете?" },
  { surah: 39, ayah: 53, count: 1, title: "Сура Аз-Зумар (39:53)", prompt: "Направи TikTok видео за Сура Аз-Зумар (39:53) - Не губете надежда в милостта на Аллах" }
];

const VIRAL_HADITH_PRESETS = [
  { collection: "nawawi40", number: 1, title: "Хадис № 1 на Навауи (Намеренията)", prompt: "Направи вирално TikTok видео за Хадис № 1 на Навауи (Делата се ценят според намеренията)" },
  { collection: "bukhari", number: 6424, title: "Сахих ал-Бухари #6424 (Изпитанията)", prompt: "Направи вирално TikTok видео за Сахих ал-Бухари #6424 за скритата милост в изпитанията" },
  { collection: "nawawi40", number: 5, title: "Хадис № 5 на Навауи (Чистота на вярата)", prompt: "Направи вирално TikTok видео за Хадис № 5 на Навауи за искреността в религията" },
  { collection: "muslim", number: 2564, title: "Сахих Муслим #2564 (Добротата)", prompt: "Направи вирално TikTok видео за Сахих Муслим #2564 за силата на благородните обръщения" },
  { collection: "tirmidhi", number: 1987, title: "Сунан Ат-Тирмизи #1987 (Търпението)", prompt: "Направи вирално TikTok видео за Сахих Хадис от Тирмизи за вътрешния мир и сабр" },
  { collection: "nawawi40", number: 13, title: "Хадис № 13 на Навауи (Братска обич)", prompt: "Направи вирално TikTok видео за Хадис № 13 на Навауи - Никога не си истински вярващ, докато не пожелаеш за брата си това, което желаеш за себе си" }
];

function simulateQuranClick(usedKeys) {
  const unpicked = VIRAL_QURAN_PRESETS.filter(
    (p) => !usedKeys.includes(`quran:${p.surah}:${p.ayah}`)
  );
  const pool = unpicked.length > 0 ? unpicked : VIRAL_QURAN_PRESETS;
  const selected = pool[Math.floor(Math.random() * pool.length)];
  const key = `quran:${selected.surah}:${selected.ayah}`;

  const updated = unpicked.length <= 1 ? [key] : [...usedKeys, key];
  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.setItem("islamic_used_quran_keys", JSON.stringify(updated));
  }
  return { selected, key, updated };
}

function simulateHadithClick(usedKeys) {
  const unpicked = VIRAL_HADITH_PRESETS.filter(
    (p) => !usedKeys.includes(`hadith:${p.collection}:${p.number}`)
  );
  const pool = unpicked.length > 0 ? unpicked : VIRAL_HADITH_PRESETS;
  const selected = pool[Math.floor(Math.random() * pool.length)];
  const key = `hadith:${selected.collection}:${selected.number}`;

  const updated = unpicked.length <= 1 ? [key] : [...usedKeys, key];
  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.setItem("islamic_used_hadith_keys", JSON.stringify(updated));
  }
  return { selected, key, updated };
}

console.log("=================================================");
console.log("  EMPIRICAL ANALYSIS OF SELECTION POOL TRUNCATION");
console.log("=================================================");

// Trace 30 Quran clicks step by step
console.log("\n[TRACE 1] Tracing 30 Consecutive Quran Selection Clicks:");
window.localStorage.clear();
let usedQuran = [];
let resets = [];

for (let i = 1; i <= 30; i++) {
  const res = simulateQuranClick(usedQuran);
  const resetOccurred = res.updated.length === 1;
  if (resetOccurred) resets.push(i);
  console.log(`Call ${i.toString().padStart(2, ' ')}: Picked ${res.key.padEnd(16, ' ')} | Updated Used Keys Length: ${res.updated.length} ${resetOccurred ? '<-- POOL RESET TRIGGERED!' : ''}`);
  usedQuran = res.updated;
}

console.log(`\nPool Reset Call Indexes:`, resets);
console.log(`Distance between resets: Call ${resets[0]} to Call ${resets[1]} = ${resets[1] - resets[0]} calls!`);
console.log(`Distance between resets: Call ${resets[1]} to Call ${resets[2]} = ${resets[2] - resets[1]} calls!`);

// Trace 20 Hadith clicks step by step
console.log("\n[TRACE 2] Tracing 20 Consecutive Hadith Selection Clicks:");
window.localStorage.clear();
let usedHadith = [];
let hadithResets = [];

for (let i = 1; i <= 20; i++) {
  const res = simulateHadithClick(usedHadith);
  const resetOccurred = res.updated.length === 1;
  if (resetOccurred) hadithResets.push(i);
  console.log(`Call ${i.toString().padStart(2, ' ')}: Picked ${res.key.padEnd(22, ' ')} | Updated Used Keys Length: ${res.updated.length} ${resetOccurred ? '<-- POOL RESET TRIGGERED!' : ''}`);
  usedHadith = res.updated;
}

console.log(`\nHadith Pool Reset Call Indexes:`, hadithResets);
console.log(`Distance between Hadith resets: Call ${hadithResets[0]} to Call ${hadithResets[1]} = ${hadithResets[1] - hadithResets[0]} calls!`);
console.log(`Distance between Hadith resets: Call ${hadithResets[1]} to Call ${hadithResets[2]} = ${hadithResets[2] - hadithResets[1]} calls!`);

// ------------------------------------------------------------------
// TEST 4: Vulnerability Mining & Edge Case Stress Testing
// ------------------------------------------------------------------
console.log("\n[TEST 4] Edge Case Mining (Corrupted / Malformed LocalStorage Data)");

window.localStorage.setItem("islamic_used_quran_keys", "null");

function currentAssistantInitializer(key) {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      return JSON.parse(window.localStorage.getItem(key) || "[]");
    } catch {
      return [];
    }
  }
  return [];
}

const currentInitVal = currentAssistantInitializer("islamic_used_quran_keys");
console.log(`- Storage = "null" -> current initializer returns:`, currentInitVal, `(type: ${typeof currentInitVal})`);

let crashedOnNull = false;
try {
  simulateQuranClick(currentInitVal);
} catch (err) {
  crashedOnNull = true;
  console.log(`- RESULT: CRASH CONFIRMED! TypeError: ${err.message}`);
}
assert.strictEqual(crashedOnNull, true, "Confirmed crash when localStorage holds 'null'");

console.log("=================================================");
console.log("  EMPIRICAL TRACE ANALYSIS COMPLETE             ");
console.log("=================================================");
