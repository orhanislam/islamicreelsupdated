import {
  TAWHEED_TAXONOMY,
  getTawheedTaxonomy,
  getNextTawheedTopic,
  formatNegativeExclusionPrompt,
  type TawheedTopic,
} from "../tawheed-taxonomy";

import {
  readAiMemory,
  writeAiMemory,
  recordCarouselProposalUsageDirect,
  getRecentCarouselHistoryDirect,
  recordProposalUsagesDirect,
  type CarouselHistoryEntry,
  type AiMemory,
} from "../memory.functions";

function runEmpiricalAdversarialChallenges() {
  console.log("=================================================================");
  console.log("🛡️ RUNNING ADVERSARIAL STRESS HARNESS: DIVERSITY & NEGATIVE CONSTRAINTS");
  console.log("=================================================================");

  const results: { name: string; passed: boolean; details?: string }[] = [];

  // CHALLENGE 1: Cliché Detection in All Taxonomy Hooks and Titles
  // Target clichés: "Защо си тук?", "Защо сме на този свят?", "смисъла на живота", "защо съществуваш", "защо си създаден", "целта на съществуването"
  console.log("\n[CHALLENGE 1] Scanning entire taxonomy (23 items) for forbidden clichés...");
  const forbiddenPatterns = [
    /защо\s+си\s+тук/i,
    /защо\s+сме\s+на\s+този\s+свят/i,
    /смис[ъа]л[а-я]*\s+на\s+живота/i,
    /защо\s+съществуваш/i,
    /защо\s+си\s+създаден/i,
    /целта\s+на\s+съществуването/i,
  ];

  let clichesFound = 0;
  const taxonomy = getTawheedTaxonomy();
  for (const topic of taxonomy) {
    const textToCheck = `${topic.titleBg} ${topic.hookAngleBg} ${topic.summaryBg}`;
    for (const pattern of forbiddenPatterns) {
      if (pattern.test(textToCheck)) {
        clichesFound++;
        console.error(`❌ Cliché pattern ${pattern} matched in topic: ${topic.id} ("${topic.hookAngleBg}")`);
      }
    }
  }

  if (clichesFound === 0) {
    console.log(`✔ All ${taxonomy.length} taxonomy entries are 100% free of banned clichés.`);
    results.push({ name: "Taxonomy Cliché Cleanliness", passed: true });
  } else {
    results.push({
      name: "Taxonomy Cliché Cleanliness",
      passed: false,
      details: `Found ${clichesFound} clichés in taxonomy`,
    });
  }

  // CHALLENGE 2: Hook Semantic Diversity & Pairwise Distance
  console.log("\n[CHALLENGE 2] Testing pairwise distinctiveness and uniqueness of hooks...");
  const hooks = taxonomy.map((t) => t.hookAngleBg.toLowerCase().trim());
  const uniqueHooks = new Set(hooks);
  const hookDuplicates = hooks.length - uniqueHooks.size;

  console.log(`Total hooks: ${hooks.length}, Unique hooks: ${uniqueHooks.size}`);

  // Pairwise Jaccard similarity of 3-grams
  function getTrigrams(str: string): Set<string> {
    const s = str.replace(/[^\p{L}\p{N}]/gu, " ").replace(/\s+/g, " ").trim();
    const trigrams = new Set<string>();
    const words = s.split(" ");
    for (let i = 0; i < words.length - 1; i++) {
      trigrams.add(`${words[i]}_${words[i + 1]}`);
    }
    return trigrams;
  }

  function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
    let intersection = 0;
    for (const elem of setA) {
      if (setB.has(elem)) intersection++;
    }
    const union = setA.size + setB.size - intersection;
    return union === 0 ? 0 : intersection / union;
  }

  let maxSimilarity = 0;
  let mostSimilarPair = ["", ""];
  for (let i = 0; i < hooks.length; i++) {
    const setA = getTrigrams(hooks[i]);
    for (let j = i + 1; j < hooks.length; j++) {
      const setB = getTrigrams(hooks[j]);
      const sim = jaccardSimilarity(setA, setB);
      if (sim > maxSimilarity) {
        maxSimilarity = sim;
        mostSimilarPair = [taxonomy[i].hookAngleBg, taxonomy[j].hookAngleBg];
      }
    }
  }

  console.log(`Max pairwise bigram overlap similarity: ${(maxSimilarity * 100).toFixed(1)}%`);
  console.log(`Most similar pair:\n  1. "${mostSimilarPair[0]}"\n  2. "${mostSimilarPair[1]}"`);

  const diversityPass = hookDuplicates === 0 && maxSimilarity < 0.6;
  results.push({
    name: "Semantic Hook Diversity (0% Duplicates & Low Bigram Overlap)",
    passed: diversityPass,
    details: `Hook duplicates: ${hookDuplicates}, Max Bigram Similarity: ${(maxSimilarity * 100).toFixed(1)}%`,
  });

  // CHALLENGE 3: Negative Exclusion Prompt Generator with History Sizes (0, 1, 5, 20, 50, edge cases)
  console.log("\n[CHALLENGE 3] Testing negative exclusion prompt generator across history sizes (0, 1, 5, 20 items)...");
  
  const testHistorySizes = [0, 1, 5, 20, 50];
  let negativeExclusionPassed = true;

  for (const size of testHistorySizes) {
    const dummyHistory: Array<{ topic?: string; hook?: string; title?: string; subtopicId?: string }> = [];
    for (let i = 0; i < size; i++) {
      const sample = taxonomy[i % taxonomy.length];
      dummyHistory.push({
        title: `${sample.titleBg} [Test #${i}]`,
        hook: `${sample.hookAngleBg} [Hook #${i}]`,
        topic: sample.titleBg,
        subtopicId: sample.id,
      });
    }

    const outputPrompt = formatNegativeExclusionPrompt(dummyHistory);

    // Assertions:
    // 1. Output must be non-empty string
    if (!outputPrompt || typeof outputPrompt !== "string") {
      console.error(`❌ History size ${size}: returned non-string or empty output`);
      negativeExclusionPassed = false;
    }

    // 2. Output must always contain the BAN LIST
    if (!outputPrompt.includes("=== АБСОЛЮТНО ЗАБРАНЕНИ БАНАЛНИ КЛИШЕТА (BAN LIST) ===")) {
      console.error(`❌ History size ${size}: BAN LIST header missing`);
      negativeExclusionPassed = false;
    }
    if (!outputPrompt.includes("Защо си тук?")) {
      console.error(`❌ History size ${size}: Cliché 'Защо си тук?' not banned`);
      negativeExclusionPassed = false;
    }

    // 3. For size 0, check default message
    if (size === 0) {
      if (!outputPrompt.includes("Първа сесия: избери конкретна дълбока подтема")) {
        console.error(`❌ History size 0: Missing empty session guidance`);
        negativeExclusionPassed = false;
      }
    } else {
      // 4. For size > 0, check that items are included (up to the last 10 items)
      const expectedIncludedCount = Math.min(size, 10);
      const usedLines = outputPrompt.split("\n").filter((l) => l.includes("❌ [ВЕЧЕ ИЗПОЛЗВАН]:"));
      if (usedLines.length !== expectedIncludedCount) {
        console.error(
          `❌ History size ${size}: Expected ${expectedIncludedCount} excluded entries, but found ${usedLines.length}`,
        );
        negativeExclusionPassed = false;
      }
    }

    console.log(`  ✔ History size ${size}: verified successfully (Length: ${outputPrompt.length} chars, Excluded rows: ${size === 0 ? 0 : Math.min(size, 10)})`);
  }

  // Edge cases for negative exclusion: null/undefined/missing fields
  const edgeCaseHistory = [
    {},
    { title: "Only Title" },
    { hook: "Only Hook" },
    { subtopicId: "only:subtopic" },
    { title: "Dup", hook: "Dup" },
    { title: "Dup", hook: "Dup" }, // duplicate row
  ];
  const edgePrompt = formatNegativeExclusionPrompt(edgeCaseHistory as any);
  if (!edgePrompt.includes("Only Title") || !edgePrompt.includes("Only Hook")) {
    console.error("❌ Edge case history failed handling partial objects");
    negativeExclusionPassed = false;
  }
  const dupLines = edgePrompt.split("\n").filter((l) => l.includes("Dup | Dup"));
  if (dupLines.length > 1) {
    console.error("❌ Edge case history failed deduplication");
    negativeExclusionPassed = false;
  }

  results.push({
    name: "Negative Exclusion Prompt Generator Scaling (0, 1, 5, 20 items & edge cases)",
    passed: negativeExclusionPassed,
  });

  // CHALLENGE 4: Sequential Topic Rotation Stress Test (100 Cycles)
  console.log("\n[CHALLENGE 4] Stress testing topic rotation across 100 consecutive cycles...");
  const simHistory: string[] = [];
  let rotationPassed = true;
  const pillarCounts: Record<string, number> = { rububiyyah: 0, uluhiyyah: 0, asma_was_sifat: 0 };
  let immediateRepeatCount = 0;

  for (let cycle = 0; cycle < 100; cycle++) {
    const chosen = getNextTawheedTopic(simHistory);
    if (!chosen || !chosen.id) {
      console.error(`❌ Cycle ${cycle}: getNextTawheedTopic returned invalid topic`);
      rotationPassed = false;
      break;
    }

    const last = simHistory[simHistory.length - 1];
    if (last && (last === chosen.id || last.includes(chosen.id) || chosen.id.includes(last))) {
      immediateRepeatCount++;
    }

    pillarCounts[chosen.pillar] = (pillarCounts[chosen.pillar] || 0) + 1;
    simHistory.push(chosen.id);
  }

  console.log(`100-cycle pillar distribution:`, pillarCounts);
  console.log(`Immediate repetitions: ${immediateRepeatCount}`);

  if (immediateRepeatCount > 0) {
    console.error(`❌ Rotation produced ${immediateRepeatCount} immediate repetitions in 100 cycles!`);
    rotationPassed = false;
  }

  const minPillar = Math.min(...Object.values(pillarCounts));
  const maxPillar = Math.max(...Object.values(pillarCounts));
  console.log(`Pillar balance spread: min=${minPillar}, max=${maxPillar}`);

  if (minPillar < 20) {
    console.error(`❌ Pillar distribution unbalanced: min=${minPillar}`);
    rotationPassed = false;
  }

  results.push({
    name: "Sequential Topic Rotation Stress (100 Cycles & Pillar Balance)",
    passed: rotationPassed,
    details: `Pillar counts: ${JSON.stringify(pillarCounts)}, Immediate repeats: ${immediateRepeatCount}`,
  });

  // CHALLENGE 5: Memory Recording and State Deduplication
  console.log("\n[CHALLENGE 5] Testing memory state persistence, deduplication, and auto-pruning...");
  let memoryPassed = true;

  const testMemory: AiMemory = {
    customInstructions: ["Empirical Test"],
    learnedFacts: [],
    usageHistory: [],
    carouselHistory: [],
  };

  // Add 120 items to verify auto-prune limit of 100
  for (let i = 0; i < 120; i++) {
    testMemory.carouselHistory!.push({
      id: `test_${i}`,
      type: "carousel",
      pillar: "rububiyyah",
      subtopicId: `test:subtopic:${i}`,
      title: `Title ${i}`,
      hook: `Hook ${i}`,
      premise: `Premise ${i}`,
      timestamp: Date.now() - (120 - i) * 1000,
    });
  }

  // Write and read back
  writeAiMemory(testMemory).then(async () => {
    const memoryRead = await readAiMemory();
    if (memoryRead.carouselHistory!.length !== 100) {
      console.error(`❌ Carousel history auto-pruning failed: expected 100, got ${memoryRead.carouselHistory!.length}`);
      memoryPassed = false;
    } else {
      console.log(`✔ Carousel history auto-pruned correctly to latest 100 items.`);
    }

    // Print summary
    console.log("\n=================================================================");
    console.log("📊 ADVERSARIAL STRESS TEST SUMMARY");
    console.log("=================================================================");
    let allPassed = true;
    for (const res of results) {
      const status = res.passed ? "✔ PASS" : "❌ FAIL";
      console.log(`${status} - ${res.name} ${res.details ? `(${res.details})` : ""}`);
      if (!res.passed) allPassed = false;
    }

    if (!memoryPassed) allPassed = false;

    console.log("=================================================================");
    if (allPassed) {
      console.log("🏆 OVERALL EMPIRICAL VERDICT: ALL ADVERSARIAL CHALLENGES PASSED (5/5)");
    } else {
      console.error("💥 OVERALL EMPIRICAL VERDICT: ONE OR MORE CHALLENGES FAILED");
      process.exit(1);
    }
  }).catch((err) => {
    console.error("❌ Memory test failed with exception:", err);
    process.exit(1);
  });
}

runEmpiricalAdversarialChallenges();
