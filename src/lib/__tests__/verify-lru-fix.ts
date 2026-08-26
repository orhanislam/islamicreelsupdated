import { TAWHEED_TAXONOMY, TawheedTopic, TawheedPillar } from "../tawheed-taxonomy";

function getNextTawheedTopicFixed(recentTopicIdsOrTitles: string[] = []): TawheedTopic {
  if (!recentTopicIdsOrTitles || recentTopicIdsOrTitles.length === 0) {
    return TAWHEED_TAXONOMY[0];
  }

  const normalizedRecent = recentTopicIdsOrTitles.map((id) => id.toLowerCase().trim());

  // Filter out used topics in current rotation
  const unusedTopics = TAWHEED_TAXONOMY.filter((topic) => {
    const topicIdNorm = topic.id.toLowerCase();
    const titleBgNorm = topic.titleBg.toLowerCase();
    return !normalizedRecent.some(
      (r) =>
        r === topicIdNorm ||
        topicIdNorm.includes(r) ||
        r.includes(topicIdNorm) ||
        r === titleBgNorm ||
        titleBgNorm.includes(r),
    );
  });

  const pool = unusedTopics.length > 0 ? unusedTopics : [...TAWHEED_TAXONOMY];

  const last = normalizedRecent[normalizedRecent.length - 1];
  const lastUsedTopic = TAWHEED_TAXONOMY.find((t) => {
    return (
      last &&
      (last.includes(t.id.toLowerCase()) ||
        t.id.toLowerCase().includes(last) ||
        t.titleBg.toLowerCase().includes(last))
    );
  });

  const pillarOrder: TawheedPillar[] = ["rububiyyah", "uluhiyyah", "asma_was_sifat"];
  let targetPillar: TawheedPillar = "rububiyyah";
  if (lastUsedTopic) {
    const nextIdx = (pillarOrder.indexOf(lastUsedTopic.pillar) + 1) % pillarOrder.length;
    targetPillar = pillarOrder[nextIdx];
  }

  let candidates = pool.filter((t) => t.pillar === targetPillar);
  if (candidates.length === 0) {
    candidates = pool;
  }

  // Sort candidates by LRU (least recently used in normalizedRecent)
  candidates.sort((a, b) => {
    const aIdx = normalizedRecent.lastIndexOf(a.id.toLowerCase());
    const bIdx = normalizedRecent.lastIndexOf(b.id.toLowerCase());
    return aIdx - bIdx;
  });

  return candidates[0] || TAWHEED_TAXONOMY[0];
}

console.log("Testing proposed LRU fix over 100 consecutive cycles...");
const history: string[] = [];
const counts: Record<string, number> = {};

for (let i = 1; i <= 100; i++) {
  const chosen = getNextTawheedTopicFixed(history);
  history.push(chosen.id);
  counts[chosen.id] = (counts[chosen.id] || 0) + 1;
}

console.log("Topic frequency over 100 cycles:");
for (const [id, count] of Object.entries(counts)) {
  console.log(`  - ${id}: ${count} times`);
}

const minCount = Math.min(...Object.values(counts));
const maxCount = Math.max(...Object.values(counts));
console.log(`\nMin count: ${minCount}, Max count: ${maxCount}, Unique topics used: ${Object.keys(counts).length}/23`);
