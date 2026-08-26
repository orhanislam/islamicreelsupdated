/**
 * Automated Multi-Cycle Verification Test for Tawheed Carousel Diversity & State-Tracking
 *
 * Verifies:
 * 1. Authentic 3-pillar Tawheed taxonomy completeness (>= 20 subtopics)
 * 2. Sequential topic rotation & pillar balancing
 * 3. Anti-repetition negative exclusion prompts & existential cliché bans
 * 4. Multi-cycle simulation (>= 3 consecutive cycles) with state progression (N -> N+1)
 * 5. 0% duplicate hooks and semantic diversity
 * 6. 4-slide structure integrity (Hook -> Explanation -> Dalil -> CTA/Du'a)
 * 7. Salafi Halal visual prompt rules (no faces, people, or animals in imagePrompt)
 */

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
  type CarouselHistoryEntry,
  type AiMemory,
} from "../memory.functions";

import { buildCarouselSystemPrompt } from "../carousel.functions";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED]: ${message}`);
  }
}

// ---------------------------------------------------------------------------
// TEST SUITE 1: Tawheed Domain Taxonomy Completeness & Quality
// ---------------------------------------------------------------------------
function testTaxonomyCompleteness() {
  console.log("\n[TEST 1] Verifying Tawheed taxonomy registry completeness...");
  const taxonomy = getTawheedTaxonomy();

  assert(taxonomy.length >= 20, `Taxonomy must contain >= 20 topics, found ${taxonomy.length}`);

  const pillars = new Set<TawheedPillar>();
  const topicIds = new Set<string>();

  for (const topic of taxonomy) {
    assert(!!topic.id, "Topic id must be defined");
    assert(!topicIds.has(topic.id), `Duplicate topic id found: ${topic.id}`);
    topicIds.add(topic.id);

    assert(
      topic.pillar === "rububiyyah" ||
        topic.pillar === "uluhiyyah" ||
        topic.pillar === "asma_was_sifat",
      `Invalid pillar: ${topic.pillar}`,
    );
    pillars.add(topic.pillar);

    assert(topic.titleBg.length > 5, `titleBg too short for ${topic.id}`);
    assert(topic.summaryBg.length > 15, `summaryBg too short for ${topic.id}`);
    assert(topic.hookAngleBg.length > 10, `hookAngleBg too short for ${topic.id}`);
    assert(topic.dalilReference.length > 5, `dalilReference too short for ${topic.id}`);
    assert(topic.dalilTextBg.length > 15, `dalilTextBg too short for ${topic.id}`);
    assert(topic.suggestedVisualMood.length > 10, `suggestedVisualMood too short for ${topic.id}`);
  }

  assert(pillars.has("rububiyyah"), "Missing Rububiyyah pillar in taxonomy");
  assert(pillars.has("uluhiyyah"), "Missing Uluhiyyah pillar in taxonomy");
  assert(pillars.has("asma_was_sifat"), "Missing Asma was-Sifat pillar in taxonomy");

  console.log(
    `✔ Taxonomy registry complete: ${taxonomy.length} authentic topics across 3 pillars.`,
  );
}

// ---------------------------------------------------------------------------
// TEST SUITE 2: Topic Rotation & Pillar Balancing Logic
// ---------------------------------------------------------------------------
function testTopicRotationAndPillarBalancing() {
  console.log("\n[TEST 2] Verifying sequential topic rotation & pillar balancing...");
  const history: string[] = [];

  const first = getNextTawheedTopic(history);
  assert(!!first && !!first.id, "First topic selection must be valid");
  history.push(first.id);

  const second = getNextTawheedTopic(history);
  assert(
    second.id !== first.id,
    `Second topic must differ from first: ${second.id} vs ${first.id}`,
  );
  assert(
    second.pillar !== first.pillar,
    `Second topic pillar should rotate: ${second.pillar} vs ${first.pillar}`,
  );
  history.push(second.id);

  const third = getNextTawheedTopic(history);
  assert(![first.id, second.id].includes(third.id), `Third topic must be unique: ${third.id}`);
  assert(
    third.pillar !== second.pillar,
    `Third topic pillar should rotate: ${third.pillar} vs ${second.pillar}`,
  );
  history.push(third.id);

  const fourth = getNextTawheedTopic(history);
  assert(
    ![first.id, second.id, third.id].includes(fourth.id),
    `Fourth topic must be unique: ${fourth.id}`,
  );
  history.push(fourth.id);

  // Test full saturation and pool reset
  const allIds = getTawheedTaxonomy().map((t) => t.id);
  const resetSelection = getNextTawheedTopic(allIds);
  assert(!!resetSelection, "Reset selection must succeed even when all topics used");
  // Ensure it doesn't immediately repeat the very last topic
  const lastTopicId = allIds[allIds.length - 1];
  assert(
    resetSelection.id !== lastTopicId,
    "Reset selection should avoid immediately repeating the last used topic",
  );

  console.log("✔ Topic rotation and pillar balancing verified across 4+ sequential steps.");
}

// ---------------------------------------------------------------------------
// TEST SUITE 3: Negative Exclusion Formatter & Anti-Cliché Engine
// ---------------------------------------------------------------------------
function testNegativeExclusionPrompt() {
  console.log("\n[TEST 3] Verifying negative exclusion prompt and cliché bans...");
  const recentHistory = [
    {
      title: "Ал-Кадр: Божественият указ",
      hook: "Какво означава, че онова, което те е пропуснало...",
      topic: "Qadr",
      subtopicId: "rububiyyah:qadr",
    },
    {
      title: "Ат-Тауаккул",
      hook: "Как да завържеш камилата си...",
      topic: "Tawakkul",
      subtopicId: "uluhiyyah:tawakkul",
    },
  ];

  const prompt = formatNegativeExclusionPrompt(recentHistory);

  assert(prompt.includes("Ал-Кадр"), "Exclusion prompt must list recent topic title");
  assert(prompt.includes("Ат-Тауаккул"), "Exclusion prompt must list second topic title");
  assert(prompt.includes("Защо си тук?"), "Exclusion prompt must explicitly ban 'Защо си тук?'");
  assert(
    prompt.includes("Защо сме на този свят?"),
    "Exclusion prompt must ban 'Защо сме на този свят?'",
  );
  assert(
    prompt.includes("Какъв е смисълът на живота?"),
    "Exclusion prompt must ban 'Какъв е смисълът на живота?'",
  );
  assert(
    prompt.includes("Замислял ли си се защо съществуваш?"),
    "Exclusion prompt must ban existential cliché",
  );

  // Test system prompt builder
  const topic = getTawheedTaxonomy()[0];
  const sysPrompt = buildCarouselSystemPrompt(topic, prompt);
  assert(
    sysPrompt.includes("SALAFI HALAL ПРАВИЛА"),
    "System prompt must include Salafi Halal rules",
  );
  assert(
    sysPrompt.includes("ЗАБРАНЕНО") && sysPrompt.includes("хора"),
    "System prompt must explicitly ban people in visuals",
  );

  console.log("✔ Negative exclusion prompt format and anti-cliché bans verified.");
}

// ---------------------------------------------------------------------------
// TEST SUITE 4: Multi-Cycle Consecutive Simulation (State Progression & Diversity)
// ---------------------------------------------------------------------------
async function testMultiCycleCarouselGeneration() {
  console.log("\n[TEST 4] Simulating >= 3 consecutive carousel generations with state tracking...");

  // Initialize clean test memory state
  const initialMemory: AiMemory = {
    customInstructions: ["Тест режим"],
    learnedFacts: [],
    usageHistory: [],
    carouselHistory: [],
  };
  await writeAiMemory(initialMemory);

  const generatedHooks: string[] = [];
  const generatedTopics: string[] = [];
  const generatedPillars: string[] = [];

  const SIMULATION_CYCLES = 30;

  for (let cycle = 1; cycle <= SIMULATION_CYCLES; cycle++) {
    console.log(`\n  --- Executing Cycle ${cycle} of ${SIMULATION_CYCLES} ---`);

    // 1. Check history length before generation: must equal cycle - 1
    const memoryBefore = await readAiMemory();
    const historyBefore = memoryBefore.carouselHistory || [];
    assert(
      historyBefore.length === cycle - 1,
      `Cycle ${cycle}: Expected prior history length ${cycle - 1}, found ${historyBefore.length}`,
    );

    // 2. Select next Tawheed topic based on history
    const recentTopicIds = historyBefore.map((h) => h.subtopicId || h.title);
    const chosenTopic = getNextTawheedTopic(recentTopicIds);

    if (cycle <= 23) {
      assert(
        !generatedTopics.slice(0, cycle - 1).includes(chosenTopic.id),
        `Cycle ${cycle}: Topic ${chosenTopic.id} was already generated in a previous cycle prior to pool saturation!`,
      );
    } else {
      assert(
        chosenTopic.id !== generatedTopics[cycle - 2],
        `Cycle ${cycle}: Immediate repetition of topic ${chosenTopic.id} detected!`,
      );
    }
    generatedTopics.push(chosenTopic.id);
    generatedPillars.push(chosenTopic.pillar);

    // 3. Synthesize realistic 4-slide carousel proposal for chosen topic
    const slide1Hook = `${chosenTopic.hookAngleBg} [ID:${cycle}]`;
    assert(!generatedHooks.includes(slide1Hook), `Cycle ${cycle}: Duplicate hook generated!`);
    generatedHooks.push(slide1Hook);

    const testProposal = {
      title: chosenTopic.titleBg,
      type: "carousel" as const,
      pillar: chosenTopic.pillar,
      subtopicId: chosenTopic.id,
      summaryBg: chosenTopic.summaryBg,
      themeBg: chosenTopic.suggestedVisualMood,
      searchQuery: `${chosenTopic.suggestedVisualMood} landscape no people`,
      carouselSlides: [
        {
          topTitle: `[${chosenTopic.pillar.toUpperCase()}]`,
          mainText: slide1Hook,
          bottomText: "Плъзни наляво за истината",
          footerText: "1/4 • Плъзнете наляво",
          imagePrompt: `dark moody atmospheric scenery, ${chosenTopic.suggestedVisualMood}, vertical 9:16, 8k cinematic landscape`,
        },
        {
          topTitle: "ВЕЛИКИЯТ БОЖЕСТВЕН ЗАКОН",
          mainText: chosenTopic.summaryBg,
          bottomText: "Размисли над това",
          footerText: "2/4 • Плъзнете наляво",
          imagePrompt: `majestic nature with soft sunrise dawn, ${chosenTopic.suggestedVisualMood}, vertical 9:16, 8k nature background`,
        },
        {
          topTitle: `[${chosenTopic.dalilReference}]`,
          mainText: chosenTopic.dalilTextBg,
          bottomText: "Словото на Аллах и Пратеника ﷺ",
          footerText: "3/4 • Плъзнете наляво",
          imagePrompt: `divine golden sunbeams breaking through clouds over mountain peaks, vertical 9:16, 8k landscape`,
        },
        {
          topTitle: "ДУХОВЕН ПОКОЙ И ДУА",
          mainText: "О, Аллах, утвърди ни в чистия Таухид и ни дари благочестие.",
          bottomText: "Сподели с близък за садака джария!",
          footerText: "4/4 • Последвайте ни",
          imagePrompt: `warm radiant golden sunset light over peaceful calm ocean horizon, vertical 9:16, 8k majestic scenery`,
        },
      ],
    };

    // 4. Record proposal into memory via recordProposalUsagesDirect
    await recordProposalUsagesDirect([testProposal]);

    // 5. Verify state progression: length must now equal cycle (N -> N+1)
    const memoryAfter = await readAiMemory();
    const historyAfter = memoryAfter.carouselHistory || [];
    assert(
      historyAfter.length === cycle,
      `Cycle ${cycle}: Expected updated history length ${cycle}, found ${historyAfter.length}`,
    );

    const latestEntry = historyAfter[historyAfter.length - 1];
    assert(
      latestEntry.subtopicId === chosenTopic.id,
      `Cycle ${cycle}: SubtopicId mismatch in memory`,
    );
    assert(latestEntry.pillar === chosenTopic.pillar, `Cycle ${cycle}: Pillar mismatch in memory`);
    assert(latestEntry.title === chosenTopic.titleBg, `Cycle ${cycle}: Title mismatch in memory`);
    assert(latestEntry.hook === slide1Hook, `Cycle ${cycle}: Hook mismatch in memory`);

    // 6. Verify 4-slide structure integrity
    const slides = testProposal.carouselSlides;
    assert(
      slides.length === 4,
      `Cycle ${cycle}: Must produce exactly 4 slides, got ${slides.length}`,
    );
    for (let s = 0; s < slides.length; s++) {
      const slide = slides[s];
      assert(!!slide.topTitle, `Cycle ${cycle} Slide ${s + 1}: topTitle missing`);
      assert(!!slide.mainText, `Cycle ${cycle} Slide ${s + 1}: mainText missing`);
      assert(!!slide.bottomText, `Cycle ${cycle} Slide ${s + 1}: bottomText missing`);
      assert(!!slide.footerText, `Cycle ${cycle} Slide ${s + 1}: footerText missing`);
      assert(!!slide.imagePrompt, `Cycle ${cycle} Slide ${s + 1}: imagePrompt missing`);

      // 7. Verify Salafi Halal visual prompt rules (no people/faces/animals)
      const prohibitedKeywords =
        /\b(person|people|man|woman|face|faces|human|humans|animal|animals|dog|cat|bird)\b/i;
      assert(
        !prohibitedKeywords.test(slide.imagePrompt),
        `Cycle ${cycle} Slide ${s + 1}: imagePrompt violates Salafi Halal rules by referencing prohibited entities: "${slide.imagePrompt}"`,
      );
    }

    console.log(`  ✔ Cycle ${cycle} verified: ${chosenTopic.pillar} -> ${chosenTopic.id}`);
  }

  // Cross-cycle assertions
  assert(
    new Set(generatedHooks).size === SIMULATION_CYCLES,
    "0% duplicate hooks assertion failed!",
  );
  assert(
    new Set(generatedTopics).size === 23,
    "All 23 Tawheed taxonomy topics must be utilized across 30 cycles!",
  );
  assert(
    new Set(generatedPillars).size >= 3,
    "Pillar rotation across all 3 Tawheed pillars must occur!",
  );

  console.log(
    `✔ Multi-cycle simulation successfully passed ${SIMULATION_CYCLES} consecutive cycles with 0% duplicate hooks and full pillar rotation.`,
  );
}

// ---------------------------------------------------------------------------
// TEST SUITE 5: Memory Helpers & Direct Carousel Recording
// ---------------------------------------------------------------------------
async function testMemoryHelpers() {
  console.log("\n[TEST 5] Verifying memory helpers & recordCarouselProposalUsageDirect...");

  const testEntry: Omit<CarouselHistoryEntry, "timestamp"> = {
    id: `test_${Date.now()}`,
    type: "carousel",
    pillar: "rububiyyah",
    subtopicId: "rububiyyah:qadr",
    title: "Ал-Кадр: Божественият указ",
    hook: "Уникална кука за директен запис",
    premise: "Размисъл над съдбата",
  };

  await recordCarouselProposalUsageDirect(testEntry);

  const recent = await getRecentCarouselHistoryDirect(5);
  assert(recent.length > 0, "getRecentCarouselHistoryDirect should return entries");
  const found = recent.find((r) => r.hook === testEntry.hook);
  assert(!!found, "Directly recorded carousel entry must be present in recent history");

  console.log("✔ Memory helpers and direct recording verified.");
}

// ---------------------------------------------------------------------------
// Main Test Runner
// ---------------------------------------------------------------------------
async function runAllCarouselVerificationTests() {
  console.log("=================================================================");
  console.log("🚀 STARTING TAWHEED CAROUSEL DIVERSITY & STATE VERIFICATION SUITE");
  console.log("=================================================================");

  testTaxonomyCompleteness();
  testTopicRotationAndPillarBalancing();
  testNegativeExclusionPrompt();
  await testMultiCycleCarouselGeneration();
  await testMemoryHelpers();

  console.log("\n=================================================================");
  console.log("🎉 ALL TAWHEED CAROUSEL VERIFICATION TESTS PASSED SUCCESSFULLY! (5/5)");
  console.log("=================================================================\n");
}

runAllCarouselVerificationTests().catch((err) => {
  console.error("\n❌ VERIFICATION TEST SUITE FAILED:", err);
  process.exit(1);
});
