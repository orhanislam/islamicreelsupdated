import { getNextTawheedTopic, getTawheedTaxonomy } from "../tawheed-taxonomy";

const taxonomy = getTawheedTaxonomy();
console.log(`Total topics in taxonomy: ${taxonomy.length}`);

// Step 1: Simulate 23 cycles (all topics used once)
const history: string[] = [];
for (let i = 1; i <= 23; i++) {
  const next = getNextTawheedTopic(history);
  history.push(next.id);
  console.log(`Cycle ${i.toString().padStart(2, ' ')}: [${next.pillar}] ${next.id}`);
}

console.log("\n--- SIMULATING CYCLES 24 to 35 (AFTER POOL SATURATION) ---");
for (let i = 24; i <= 35; i++) {
  // Pass the full history of all 23+ topics (as would happen with history of size 25)
  const next = getNextTawheedTopic(history);
  history.push(next.id);
  console.log(`Cycle ${i.toString().padStart(2, ' ')}: [${next.pillar}] ${next.id}`);
}
