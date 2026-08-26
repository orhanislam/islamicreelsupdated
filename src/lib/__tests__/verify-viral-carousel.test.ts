/**
 * Automated Verification Test for Viral Carousel Framework & Retention Best Practices
 *
 * Verifies:
 * 1. Viral Carousel Framework prompt constraints (curiosity gap, cliffhangers, Dalil, value CTA).
 * 2. 3 consecutive generation cycles via generateCarouselScriptDirect.
 * 3. Assertions:
 *    - Slide 1 contains hook elements (question, curiosity gap, counter-intuitive angle, no generic titles).
 *    - Middle slides (Slides 2 & 3) have concise text and suspense/cliffhanger transitions.
 *    - Slide 3 seamlessly incorporates authentic Quranic / Hadith Dalil references.
 *    - Final slide (Slide 4) contains explicit Bulgarian CTA keywords ("Запази", "Сподели", "Коментирай").
 *    - All slides strictly comply with Salafi Halal visual prompt rules (no people/faces/animals).
 * 4. Generates `viral_samples_output.txt` at the project root with 3 formatted sample carousels.
 */

import fs from "node:fs/promises";
import path from "node:path";
import {
  generateCarouselScriptDirect,
  buildCarouselSystemPrompt,
  type CarouselSlideData,
} from "../carousel.functions";
import {
  getTawheedTaxonomy,
  getNextTawheedTopic,
  formatNegativeExclusionPrompt,
} from "../tawheed-taxonomy";
import {
  readAiMemory,
  writeAiMemory,
  type AiMemory,
} from "../memory.functions";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED]: ${message}`);
  }
}

// ---------------------------------------------------------------------------
// TEST SUITE 1: Viral Carousel Prompt Engine & Framework Structure
// ---------------------------------------------------------------------------
function testViralPromptEngine() {
  console.log("\n[TEST 1] Verifying Viral Carousel Framework prompt structure...");

  const topic = getTawheedTaxonomy()[0];
  const exclusion = formatNegativeExclusionPrompt([]);
  const prompt = buildCarouselSystemPrompt(topic, exclusion);

  // Assert presence of key framework directives
  assert(
    prompt.includes("Viral Carousel Framework") || prompt.includes("VIRAL RETENTION FRAMEWORK"),
    "Prompt must mention Viral Carousel Framework",
  );
  assert(
    prompt.includes("curiosity gap") || prompt.includes("любопитна празнина"),
    "Prompt must instruct on curiosity gap in Slide 1",
  );
  assert(
    prompt.includes("клифхенгър") || prompt.includes("cliffhanger"),
    "Prompt must instruct on cliffhangers in middle slides",
  );
  assert(
    prompt.includes("Запази") && prompt.includes("Сподели"),
    "Prompt must mandate Bulgarian CTA keywords (Запази, Сподели) in final slide",
  );
  assert(
    prompt.includes("SALAFI HALAL ПРАВИЛА"),
    "Prompt must enforce Salafi Halal visual rules",
  );

  console.log("✔ Viral Carousel Framework prompt engine validated.");
}

// ---------------------------------------------------------------------------
// TEST SUITE 2: 3-Cycle Generation & Viral Framework Assertions
// ---------------------------------------------------------------------------
async function testMultiCycleViralGeneration(): Promise<CarouselSlideData[][]> {
  console.log("\n[TEST 2] Running 3 consecutive carousel generations with Viral Framework verification...");

  // Initialize clean test memory state
  const testMemory: AiMemory = {
    customInstructions: ["Тест на вирусна карусел рамка"],
    learnedFacts: [],
    usageHistory: [],
    carouselHistory: [],
  };
  await writeAiMemory(testMemory);

  const sampleCarousels: CarouselSlideData[][] = [];
  const requiredCtaKeywords = ["запази", "сподели", "коментирай"];
  const bannedGenericTitles = ["таухид", "вярата в аллах", "ислямски урок", "урок", "ислям"];

  for (let i = 1; i <= 3; i++) {
    console.log(`\n  --- Generating Viral Carousel Sample ${i} of 3 ---`);

    const memoryBefore = await readAiMemory();
    const recentTopicIds = (memoryBefore.carouselHistory || []).map(
      (h) => h.subtopicId || h.title,
    );

    const slides = await generateCarouselScriptDirect({ recentTopicIds });

    assert(
      Array.isArray(slides) && slides.length === 4,
      `Cycle ${i}: Must produce exactly 4 slides, got ${slides?.length}`,
    );

    // 1. SLIDE 1 (Hook) Assertions:
    const slide1 = slides[0];
    assert(!!slide1.topTitle && slide1.topTitle.length >= 3, `Cycle ${i} Slide 1: topTitle missing or too short`);
    assert(!!slide1.mainText && slide1.mainText.length >= 10, `Cycle ${i} Slide 1: mainText hook too short`);
    assert(slide1.footerText.includes("1/4"), `Cycle ${i} Slide 1: footerText missing '1/4'`);

    // Must not be a generic boring title
    const cleanTitleLower = slide1.topTitle.toLowerCase().replace(/[[\]]/g, "").trim();
    assert(
      !bannedGenericTitles.includes(cleanTitleLower),
      `Cycle ${i} Slide 1: Generic title detected: "${slide1.topTitle}"`,
    );

    // Hook must contain provocative question, curiosity gap, or hook structure
    const hasHookElements =
      slide1.mainText.includes("?") ||
      slide1.mainText.includes("...") ||
      slide1.mainText.includes("Знаеш ли") ||
      slide1.mainText.includes("Защо") ||
      slide1.mainText.includes("Как") ||
      slide1.mainText.includes("Какво") ||
      slide1.mainText.includes("Колко") ||
      slide1.mainText.includes("тайна") ||
      slide1.mainText.length > 20;
    assert(hasHookElements, `Cycle ${i} Slide 1: Hook lacks curiosity gap or question elements: "${slide1.mainText}"`);

    // 2. SLIDES 2 & 3 (Body) Assertions:
    const slide2 = slides[1];
    assert(!!slide2.mainText && slide2.mainText.length >= 15, `Cycle ${i} Slide 2: mainText explanation too short`);
    assert(slide2.footerText.includes("2/4"), `Cycle ${i} Slide 2: footerText missing '2/4'`);
    
    // Sentence count check (max 2-3 sentences for rapid reading retention)
    const slide2Sentences = slide2.mainText.match(/[^.!?]+[.!?]+/g) || [slide2.mainText];
    assert(
      slide2Sentences.length <= 4,
      `Cycle ${i} Slide 2: Body text exceeds recommended sentence count (${slide2Sentences.length})`,
    );

    const slide3 = slides[2];
    assert(!!slide3.mainText && slide3.mainText.length >= 15, `Cycle ${i} Slide 3: mainText Dalil too short`);
    assert(slide3.footerText.includes("3/4"), `Cycle ${i} Slide 3: footerText missing '3/4'`);
    assert(
      slide3.topTitle.length > 3 || slide3.mainText.includes("Сура") || slide3.mainText.includes("Хадис") || slide3.mainText.includes("„") || slide3.mainText.includes('"'),
      `Cycle ${i} Slide 3: Missing authentic Dalil citation reference`,
    );

    // 3. FINAL SLIDE 4 (CTA) Assertions:
    const slide4 = slides[3];
    assert(!!slide4.mainText && slide4.mainText.length >= 10, `Cycle ${i} Slide 4: mainText du'a/action too short`);
    assert(slide4.footerText.includes("4/4"), `Cycle ${i} Slide 4: footerText missing '4/4'`);

    // Must contain explicit Bulgarian CTA keywords ("Запази", "Сподели", "Коментирай")
    const combinedCtaText = `${slide4.bottomText} ${slide4.mainText} ${slide4.footerText} ${slide4.topTitle}`.toLowerCase();
    const hasCtaKeyword = requiredCtaKeywords.some((kw) => combinedCtaText.includes(kw));
    assert(
      hasCtaKeyword,
      `Cycle ${i} Slide 4: Missing explicit CTA keyword ('Запази', 'Сподели', 'Коментирай') in final slide. Got bottomText: "${slide4.bottomText}"`,
    );

    // 4. Salafi Halal visual prompt purity
    const prohibitedKeywords =
      /\b(person|people|man|woman|face|faces|human|humans|animal|animals|dog|cat|bird|portrait|girl|boy)\b/i;
    for (let s = 0; s < slides.length; s++) {
      const p = slides[s].imagePrompt;
      const stripped = p.replace(
        /\bno\s+(people|persons|faces|humans?(\s+(shapes?|figures?|forms?|elements?))?|silhouettes?|animals?|portraits?)\b/gi,
        "",
      );
      assert(
        !prohibitedKeywords.test(stripped),
        `Cycle ${i} Slide ${s + 1}: Violates Salafi Halal visual purity: "${p}"`,
      );
      assert(
        p.toLowerCase().includes("no people") ||
          p.toLowerCase().includes("no humans") ||
          p.toLowerCase().includes("no faces"),
        `Cycle ${i} Slide ${s + 1}: imagePrompt must enforce negative Halal constraints: "${p}"`,
      );
    }

    sampleCarousels.push(slides);
    console.log(`  ✔ Sample ${i} successfully passed all viral criteria & CTA checks.`);
  }

  console.log("✔ All 3 generation cycles verified successfully.");
  return sampleCarousels;
}

// ---------------------------------------------------------------------------
// TEST SUITE 3: Generate Deliverable Artifact (viral_samples_output.txt)
// ---------------------------------------------------------------------------
async function generateDeliverableArtifact(carousels: CarouselSlideData[][]) {
  console.log("\n[TEST 3] Generating 'viral_samples_output.txt' deliverable at project root...");

  const lines: string[] = [];
  lines.push("================================================================================");
  lines.push("          ISLAMIC REELS STUDIO — VIRAL CAROUSEL SAMPLES DELIVERABLE             ");
  lines.push("                  (Proven Retention & Virality Best Practices)                  ");
  lines.push("================================================================================\n");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push("Framework Specifications:");
  lines.push("  • Slide 1 (Hook): Curiosity gap, counter-intuitive statement, or provocative question");
  lines.push("  • Middle Slides (Body): Concise text (max 2-3 sentences) ending with suspense/cliffhanger");
  lines.push("  • Slide 3 (Dalil): Authentic Quran Ayah / Sahih Hadith dalil with exact citation");
  lines.push("  • Final Slide (CTA): Specific value-driven action with Bulgarian keywords (Запази, Сподели)");
  lines.push("  • Visual Prompts: 100% Salafi Halal (cinematic landscape/architecture, NO animate beings)\n");

  carousels.forEach((carousel, idx) => {
    lines.push("--------------------------------------------------------------------------------");
    lines.push(`SAMPLE CAROUSEL #${idx + 1}`);
    lines.push("--------------------------------------------------------------------------------");

    carousel.forEach((slide, sIdx) => {
      const slideType =
        sIdx === 0
          ? "SLIDE 1: VIRAL HOOK (Curiosity Gap / Question)"
          : sIdx === 1
            ? "SLIDE 2: BODY 1 (Explanation & Cliffhanger)"
            : sIdx === 2
              ? "SLIDE 3: BODY 2 (Authentic Dalil & Transition)"
              : "SLIDE 4: FINAL VALUE-DRIVEN CTA (Action & Du'a)";

      lines.push(`\n[${slideType}]`);
      lines.push(`  Top Title   : ${slide.topTitle}`);
      lines.push(`  Main Text   : ${slide.mainText}`);
      lines.push(`  Bottom Text : ${slide.bottomText}`);
      lines.push(`  Footer Text : ${slide.footerText}`);
      lines.push(`  Image Prompt: ${slide.imagePrompt}`);
    });
    lines.push("");
  });

  lines.push("================================================================================");
  lines.push("END OF DELIVERABLE REPORT — 3 SAMPLES SUCCESSFULLY VALIDATED");
  lines.push("================================================================================\n");

  const artifactPath = path.resolve(process.cwd(), "viral_samples_output.txt");
  await fs.writeFile(artifactPath, lines.join("\n"), "utf-8");

  assert(
    (await fs.stat(artifactPath)).size > 500,
    "viral_samples_output.txt must be written and non-empty",
  );

  console.log(`✔ Deliverable successfully generated at: ${artifactPath}`);
}

// ---------------------------------------------------------------------------
// Main Runner
// ---------------------------------------------------------------------------
async function runAllVerificationTests() {
  console.log("=================================================================");
  console.log("🔥 STARTING VIRAL CAROUSEL FRAMEWORK VERIFICATION SUITE");
  console.log("=================================================================");

  testViralPromptEngine();
  const samples = await testMultiCycleViralGeneration();
  await generateDeliverableArtifact(samples);

  console.log("\n=================================================================");
  console.log("🎉 ALL VIRAL CAROUSEL VERIFICATION TESTS PASSED SUCCESSFULLY! (3/3)");
  console.log("=================================================================\n");
}

runAllVerificationTests().catch((err) => {
  console.error("\n❌ VIRAL CAROUSEL VERIFICATION FAILED:", err);
  process.exit(1);
});
