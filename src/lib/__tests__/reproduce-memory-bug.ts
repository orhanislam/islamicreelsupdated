import {
  readAiMemory,
  writeAiMemory,
  recordCarouselProposalUsageDirect,
} from "../memory.functions";

async function testMemoryDedupBug() {
  console.log("Testing memory duplicate check bug...");

  // Reset memory
  await writeAiMemory({
    customInstructions: [],
    learnedFacts: [],
    usageHistory: [],
    carouselHistory: [],
  });

  // Record generation #1 of Qadr
  await recordCarouselProposalUsageDirect({
    id: "gen_1",
    type: "carousel",
    pillar: "rububiyyah",
    subtopicId: "rububiyyah:qadr",
    title: "Ал-Кадр: Божественият указ и предопределение",
    hook: "Кука #1 за съдбата (Седмица 1)",
    premise: "Описание 1",
    timestamp: Date.now() - 10000,
  });

  const mem1 = await readAiMemory();
  console.log(`After Gen 1: carouselHistory count = ${mem1.carouselHistory?.length}`);

  // Record generation #2 of Qadr (completely different hook & premise)
  await recordCarouselProposalUsageDirect({
    id: "gen_2",
    type: "carousel",
    pillar: "rububiyyah",
    subtopicId: "rububiyyah:qadr",
    title: "Ал-Кадр: Божественият указ и предопределение",
    hook: "Кука #2 за съдбата: Напълно нова и различна кука (Седмица 3)",
    premise: "Напълно ново описание 2",
    timestamp: Date.now(),
  });

  const mem2 = await readAiMemory();
  console.log(`After Gen 2: carouselHistory count = ${mem2.carouselHistory?.length}`);
  console.log("History entries:", mem2.carouselHistory?.map(c => ({ id: c.id, hook: c.hook })));
}

testMemoryDedupBug().catch(console.error);
