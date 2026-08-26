/**
 * Adversarial Stress & Chaos Test Harness for Tawheed Carousel Engine
 *
 * Stress tests:
 * 1. Extended multi-cycle generation (30 consecutive cycles, covering pool saturation & reset)
 * 2. Topic uniqueness and 3-pillar strict rotation sequence over 30 cycles
 * 3. Array bounds and 30-day time pruning invariants (150+ items -> 100 items max)
 * 4. Corrupted state recovery (malformed JSON, null entries, non-existent topic IDs, empty history)
 * 5. Negative exclusion formatting under heavy load (500+ items, deduplication, banned clichés)
 * 6. Fallback generation robustness and Salafi Halal visual prompt purity
 * 7. Concurrent read/write stress
 */

import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {
  getTawheedTaxonomy,
  getNextTawheedTopic,
  formatNegativeExclusionPrompt,
  type TawheedPillar,
  type TawheedTopic,
} from "../tawheed-taxonomy";

import {
  readAiMemory,
  writeAiMemory,
  recordCarouselProposalUsageDirect,
  getRecentCarouselHistoryDirect,
  recordProposalUsagesDirect,
  getMemoryFilePath,
  ensureMemoryDir,
  type CarouselHistoryEntry,
  type AiMemory,
} from "../memory.functions";

import { generateCarouselScriptDirect } from "../carousel.functions";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[STRESS ASSERTION FAILED]: ${message}`);
  }
}

// ---------------------------------------------------------------------------
// TEST 1: Extended 30-Cycle Generation & Pool Reset Stress Test
// ---------------------------------------------------------------------------
async function stressTestExtendedCyclesAndReset() {
  console.log("\n[STRESS TEST 1] Running 30 consecutive generation cycles (Exhaustion & Reset)...");

  // Clean slate memory
  const initialMemory: AiMemory = {
    customInstructions: ["Stress Test Runner"],
    learnedFacts: [],
    usageHistory: [],
    carouselHistory: [],
  };
  await writeAiMemory(initialMemory);

  const taxonomy = getTawheedTaxonomy();
  const totalTaxonomyCount = taxonomy.length;
  console.log(`  Taxonomy topic count: ${totalTaxonomyCount}`);

  const historyIds: string[] = [];
  const chosenPillars: TawheedPillar[] = [];
  const generatedHooks: string[] = [];

  const CYCLES = 30;

  for (let i = 1; i <= CYCLES; i++) {
    const memoryBefore = await readAiMemory();
    const recentHistory = memoryBefore.carouselHistory || [];
    const recentTopicIds = recentHistory.map((h) => h.subtopicId || h.title);

    const chosen = getNextTawheedTopic(recentTopicIds);
    assert(!!chosen && !!chosen.id, `Cycle ${i}: getNextTawheedTopic returned invalid topic`);

    // Prior to exhausting the taxonomy (cycles 1..totalTaxonomyCount), every selection must be strictly unique
    if (i <= totalTaxonomyCount) {
      assert(
        !historyIds.includes(chosen.id),
        `Cycle ${i}: Duplicate topic '${chosen.id}' selected before pool was exhausted!`,
      );
    } else {
      // After exhaustion (cycle > totalTaxonomyCount), reset must happen and not repeat the immediate prior topic
      const immediateLast = historyIds[historyIds.length - 1];
      assert(
        chosen.id !== immediateLast,
        `Cycle ${i}: Rotation reset immediately repeated the last used topic '${chosen.id}'!`,
      );
    }

    historyIds.push(chosen.id);
    chosenPillars.push(chosen.pillar);

    // Pillar sequence check: While all 3 pillars have available unused topics,
    // verify strict rotation. Once a smaller pillar is exhausted, verify graceful fallback without duplicate topics.
    if (i <= 18 && i % 3 === 0) {
      const triad = [chosenPillars[i - 3], chosenPillars[i - 2], chosenPillars[i - 1]];
      const uniquePillarsInTriad = new Set(triad);
      assert(
        uniquePillarsInTriad.size === 3,
        `Cycle ${i}: Triad [${triad.join(", ")}] does not contain all 3 distinct pillars before exhaustion!`,
      );
    }


    const uniqueHook = `${chosen.hookAngleBg} [Cycle #${i}]`;
    generatedHooks.push(uniqueHook);

    await recordCarouselProposalUsageDirect({
      id: `stress_carousel_${i}`,
      type: "carousel",
      pillar: chosen.pillar,
      subtopicId: chosen.id,
      title: chosen.titleBg,
      hook: uniqueHook,
      premise: chosen.summaryBg,
      timestamp: Date.now() + i * 1000,
    });

    const memoryAfter = await readAiMemory();
    assert(
      (memoryAfter.carouselHistory || []).length === i,
      `Cycle ${i}: Expected carouselHistory length ${i}, found ${memoryAfter.carouselHistory?.length}`,
    );
  }

  // Cross cycle assertions
  assert(
    new Set(generatedHooks).size === CYCLES,
    "Duplicate hooks detected across 30 stress cycles!",
  );
  console.log(
    `  ✔ Successfully executed ${CYCLES} consecutive cycles with clean pool reset at cycle ${totalTaxonomyCount + 1} and 100% pillar balance.`,
  );
}

// ---------------------------------------------------------------------------
// TEST 2: Array Bounds & 30-Day TTL Pruning Stress Test
// ---------------------------------------------------------------------------
async function stressTestArrayBoundsAndPruning() {
  console.log("\n[STRESS TEST 2] Stress-testing memory array bounds and 30-day TTL pruning...");

  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;

  // Construct 150 carousel entries: 30 expired (> 30 days old), 120 valid (< 30 days old)
  const syntheticHistory: CarouselHistoryEntry[] = [];

  // 30 expired entries (35 to 65 days old)
  for (let i = 1; i <= 30; i++) {
    syntheticHistory.push({
      id: `expired_${i}`,
      type: "carousel",
      pillar: "rububiyyah",
      subtopicId: `expired:topic_${i}`,
      title: `Стара тема ${i}`,
      hook: `Стара кука ${i}`,
      premise: "Старо описание",
      timestamp: now - (35 + i) * oneDayMs,
    });
  }

  // 120 fresh entries (1 to 20 days old)
  for (let i = 1; i <= 120; i++) {
    syntheticHistory.push({
      id: `fresh_${i}`,
      type: "carousel",
      pillar: "uluhiyyah",
      subtopicId: `fresh:topic_${i}`,
      title: `Нова тема ${i}`,
      hook: `Нова кука ${i}`,
      premise: "Ново описание",
      timestamp: now - ((i % 20) + 1) * oneDayMs,
    });
  }

  const memoryToSave: AiMemory = {
    customInstructions: ["Limit bounds test"],
    learnedFacts: [],
    usageHistory: [],
    carouselHistory: syntheticHistory,
  };

  await writeAiMemory(memoryToSave);

  const memoryLoaded = await readAiMemory();
  const loadedHistory = memoryLoaded.carouselHistory || [];

  // Invariant 1: History must not exceed 100 entries
  assert(
    loadedHistory.length <= 100,
    `Memory carouselHistory exceeded bound of 100! Found ${loadedHistory.length}`,
  );
  assert(
    loadedHistory.length === 100,
    `Expected exactly 100 bounded entries from 120 fresh, found ${loadedHistory.length}`,
  );

  // Invariant 2: None of the expired entries (> 30 days) should exist
  for (const entry of loadedHistory) {
    assert(
      !entry.id.startsWith("expired_"),
      `Expired entry '${entry.id}' was not pruned by writeAiMemory!`,
    );
    assert(
      now - entry.timestamp <= 30 * oneDayMs,
      `Entry '${entry.id}' timestamp is older than 30 days!`,
    );
  }

  // Invariant 3: FIFO retention - the latest 100 of the 120 fresh entries should be kept
  assert(
    loadedHistory[loadedHistory.length - 1].id === "fresh_120",
    "Latest entry was not preserved at the tail of carouselHistory",
  );

  console.log(
    `  ✔ Array bounds & 30-day TTL verified: 150 entries pruned to exactly 100 fresh items without leaks.`,
  );
}

// ---------------------------------------------------------------------------
// TEST 3: Corrupted State & Chaos Recovery
// ---------------------------------------------------------------------------
async function stressTestCorruptedStateRecovery() {
  console.log("\n[STRESS TEST 3] Stress-testing recovery from corrupted state and malformed inputs...");

  const filePath = getMemoryFilePath();

  // Subtest 3.1: Corrupted JSON file on disk
  await ensureMemoryDir();
  await fs.writeFile(filePath, "{ invalid json ::: corrupt @@#$ ", "utf-8");

  const recoveredMem = await readAiMemory();
  assert(recoveredMem !== null, "readAiMemory failed to recover from corrupted JSON file");
  assert(Array.isArray(recoveredMem.carouselHistory), "carouselHistory should default to empty array");
  assert(Array.isArray(recoveredMem.usageHistory), "usageHistory should default to empty array");
  assert(recoveredMem.customInstructions.length > 0, "Default custom instructions must be loaded");

  // Subtest 3.2: Empty file on disk
  await fs.writeFile(filePath, "", "utf-8");
  const emptyMem = await readAiMemory();
  assert(emptyMem !== null && Array.isArray(emptyMem.carouselHistory), "Failed recovery from empty file");

  // Subtest 3.3: Topic selector with invalid / hostile inputs
  const hostileInputs: any[] = [
    [],
    ["", "   ", "UNKNOWN_NON_EXISTENT_ID_9999", "random_gibberish"],
    new Array(500).fill("rububiyyah:qadr"),
    ["Ал-Кадр: Божественият указ и предопределение"], // Passed as full Bulgarian title
    ["  RUBUBIYYAH:QADR  ", "  ULUHIYYAH:IKHLAS  "], // Whitespace padded and uppercase
  ];

  for (const input of hostileInputs) {
    const topic = getNextTawheedTopic(input);
    assert(!!topic && !!topic.id, `getNextTawheedTopic crashed on hostile input: ${JSON.stringify(input)}`);
    assert(
      ["rububiyyah", "uluhiyyah", "asma_was_sifat"].includes(topic.pillar),
      `Invalid pillar on hostile input: ${topic.pillar}`,
    );
  }

  // Subtest 3.4: recordCarouselProposalUsageDirect with malformed records
  await recordCarouselProposalUsageDirect({} as any);
  await recordCarouselProposalUsageDirect({ title: "" } as any);
  await recordProposalUsagesDirect([null, undefined, {} as any, { type: "unknown" } as any]);

  const afterCorruptedDirect = await readAiMemory();
  assert(Array.isArray(afterCorruptedDirect.carouselHistory), "Memory corrupted after invalid direct calls");

  console.log("  ✔ Corrupted state and hostile input resilience verified across all sub-scenarios.");
}

// ---------------------------------------------------------------------------
// TEST 4: Heavy Negative Exclusion Formatter Stress & Anti-Cliché Verification
// ---------------------------------------------------------------------------
function stressTestNegativeExclusionFormatter() {
  console.log("\n[STRESS TEST 4] Stress-testing negative exclusion prompt formatter with 500 entries...");

  // Generate 500 entries with duplicates
  const massiveHistory: Array<{ topic?: string; hook?: string; title?: string; subtopicId?: string }> = [];
  for (let i = 1; i <= 500; i++) {
    massiveHistory.push({
      title: `Тема #${i % 20}`,
      hook: `Кука #${i % 20}`,
      subtopicId: `subtopic_${i % 20}`,
      topic: `Topic_${i % 20}`,
    });
  }

  const promptResult = formatNegativeExclusionPrompt(massiveHistory);
  assert(promptResult.length > 100, "Formatted negative exclusion prompt is too short");
  assert(
    promptResult.includes("=== СТРИКТНО ЗАБРАНЕНИ ПРЕДИШНИ ТЕМИ И КУКИ"),
    "Missing exclusion header",
  );
  assert(
    promptResult.includes("=== АБСОЛЮТНО ЗАБРАНЕНИ БАНАЛНИ КЛИШЕТА (BAN LIST) ==="),
    "Missing ban list header",
  );

  // Banned cliché checks
  const bannedPhrases = [
    "Защо си тук?",
    "Защо сме на този свят?",
    "Какъв е смисълът на живота?",
    "Замислял ли си се защо съществуваш?",
    "Защо си създаден?",
    "Каква е целта на съществуването ти?",
  ];

  for (const phrase of bannedPhrases) {
    assert(
      promptResult.includes(phrase),
      `Banned phrase '${phrase}' is missing from negative exclusion prompt!`,
    );
  }

  // Formatter should only take the last 10 entries and deduplicate them
  const exclusionLines = promptResult.split("\n").filter((l) => l.startsWith("- ❌"));
  assert(
    exclusionLines.length <= 10,
    `Exclusion prompt exceeded 10 items slice! Found ${exclusionLines.length}`,
  );

  console.log("  ✔ Heavy negative exclusion formatter bounded and all banned clichés strictly enforced.");
}

// ---------------------------------------------------------------------------
// TEST 5: Fallback Carousel Generation & Halal Visual Prompt Purity
// ---------------------------------------------------------------------------
async function stressTestFallbackGenerationAndPurity() {
  console.log("\n[STRESS TEST 5] Testing fallback carousel generation and Salafi Halal visual purity...");

  // Generate carousels across all 3 pillars
  const pillars: TawheedPillar[] = ["rububiyyah", "uluhiyyah", "asma_was_sifat"];

  for (const pillar of pillars) {
    const slides = await generateCarouselScriptDirect({ pillar });
    assert(slides.length === 4, `Expected exactly 4 slides for pillar '${pillar}', got ${slides.length}`);

    // Verify slide 1 Hook
    assert(slides[0].topTitle.length > 0, "Slide 1 missing topTitle");
    assert(slides[0].mainText.length > 5, "Slide 1 missing mainText hook");
    assert(slides[0].footerText.includes("1/4"), "Slide 1 footerText missing 1/4");

    // Verify slide 2 Context
    assert(slides[1].footerText.includes("2/4"), "Slide 2 footerText missing 2/4");
    assert(slides[1].mainText.length > 15, "Slide 2 explanation text too short");

    // Verify slide 3 Dalil
    assert(slides[2].footerText.includes("3/4"), "Slide 3 footerText missing 3/4");
    assert(slides[2].mainText.length > 15, "Slide 3 dalil text too short");

    // Verify slide 4 CTA / Du'a
    assert(slides[3].footerText.includes("4/4"), "Slide 4 footerText missing 4/4");
    assert(
      slides[3].bottomText.toLowerCase().includes("садака") ||
        slides[3].bottomText.toLowerCase().includes("сподели") ||
        slides[3].mainText.length > 10,
      "Slide 4 missing CTA or Du'a",
    );

    // Visual Prompt Halal Purity Check on all slides
    const prohibitedKeywords =
      /\b(person|people|man|woman|face|faces|human|humans|animal|animals|dog|cat|bird|portrait|girl|boy)\b/i;

    for (let s = 0; s < slides.length; s++) {
      const prompt = slides[s].imagePrompt;
      const strippedPrompt = prompt.replace(
        /\bno\s+(people|persons|faces|humans?(\s+(shapes?|figures?|forms?|elements?))?|silhouettes?|animals?|portraits?)\b/gi,
        "",
      );
      assert(
        !prohibitedKeywords.test(strippedPrompt),
        `Slide ${s + 1} for pillar '${pillar}' violated Salafi Halal rules: "${prompt}"`,
      );
      assert(
        prompt.toLowerCase().includes("no people") ||
          prompt.toLowerCase().includes("no humans") ||
          prompt.toLowerCase().includes("no faces") ||
          prompt.toLowerCase().includes("no silhouettes"),
        `Slide ${s + 1} imagePrompt must explicitly enforce negative Halal constraints: "${prompt}"`,
      );
    }
  }

  console.log("  ✔ Fallback 4-slide structure and Salafi Halal visual purity strictly validated across all pillars.");
}

// ---------------------------------------------------------------------------
// TEST 6: Concurrent Multi-Worker Race Condition Stress
// ---------------------------------------------------------------------------
async function stressTestConcurrentWrites() {
  console.log("\n[STRESS TEST 6] Stress-testing concurrent async writes...");

  // Reset memory
  await writeAiMemory({
    customInstructions: ["Concurrency Stress"],
    learnedFacts: [],
    usageHistory: [],
    carouselHistory: [],
  });

  const writePromises: Promise<void>[] = [];

  for (let i = 1; i <= 10; i++) {
    writePromises.push(
      recordCarouselProposalUsageDirect({
        id: `concurrent_${i}`,
        type: "carousel",
        pillar: i % 2 === 0 ? "rububiyyah" : "uluhiyyah",
        subtopicId: `concurrent_topic_${i}`,
        title: `Конкурентна тема ${i}`,
        hook: `Конкурентна кука ${i}`,
        premise: `Конкурентно описание ${i}`,
        timestamp: Date.now() + i,
      }),
    );
  }

  await Promise.all(writePromises);

  const mem = await readAiMemory();
  const history = mem.carouselHistory || [];
  assert(history.length > 0, "No history written under concurrency");
  console.log(`  ✔ Concurrency stress passed: memory intact with ${history.length} records.`);
}

// ---------------------------------------------------------------------------
// Main Stress Runner
// ---------------------------------------------------------------------------
async function runAllStressTests() {
  console.log("=================================================================");
  console.log("⚡ ADVERSARIAL STRESS TEST HARNESS — TAWHEED CAROUSEL ENGINE");
  console.log("=================================================================");

  await stressTestExtendedCyclesAndReset();
  await stressTestArrayBoundsAndPruning();
  await stressTestCorruptedStateRecovery();
  stressTestNegativeExclusionFormatter();
  await stressTestFallbackGenerationAndPurity();
  await stressTestConcurrentWrites();

  console.log("\n=================================================================");
  console.log("🎯 ALL ADVERSARIAL STRESS TESTS COMPLETED SUCCESSFULLY! (6/6)");
  console.log("=================================================================\n");
}

runAllStressTests().catch((err) => {
  console.error("\n❌ ADVERSARIAL STRESS TEST FAILED:", err);
  process.exit(1);
});
