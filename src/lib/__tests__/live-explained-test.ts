import { generateExplainedVideoProposalDirect, buildExplainedNarrationText } from "../assistant.functions";

async function main() {
  console.log("=== Testing generateExplainedVideoProposalDirect live generation ===");
  const res = await generateExplainedVideoProposalDirect({});
  console.log("\n--- Full Assistant Reply ---");
  console.log(res.reply);
  console.log("\n--- Proposal Object ---");
  console.log(JSON.stringify(res.proposal, null, 2));

  if (res.proposal) {
    const p = res.proposal;
    const isQuran = Boolean(p.surah && p.ayah);
    const spokenNarration = buildExplainedNarrationText({
      viralTitle: p.title,
      reference: isQuran ? `Коран ${p.surah}:${p.ayah}` : `${p.collection} #${p.number}`,
      quoteText: p.scriptWorkflow?.dalilText || p.title,
      isQuran,
      scriptWorkflow: p.scriptWorkflow,
      summaryBg: p.summaryBg,
    });

    console.log("\n--- Spoken Video Narration (What TTS will say and display) ---");
    console.log(spokenNarration);

    console.log("\n--- Verification Checklist ---");
    const issues: string[] = [];

    // 1. Tawheed checks
    if (/единичк|единичн/i.test(JSON.stringify(res))) {
      issues.push("ERROR: Found forbidden diminutive 'единичк/единичн' in proposal!");
    } else {
      console.log("✓ Tawheed check: No diminutive 'единичк/единичн'");
    }

    // 2. Scholar attribution check in video narration
    if (/salafi shaykh ai|шейх ас-са'ди|шейх ал-усеймин|ибн касир|тефсир ас-са'ди/i.test(spokenNarration)) {
      issues.push("ERROR: Scholar attribution leaked into spoken video narration!");
    } else {
      console.log("✓ Video narration check: Clean explanation without scholar name attribution");
    }

    // 3. Action step in video narration check
    if (spokenNarration.includes("Действие:") || /направи истигфар|сподели за садака/i.test(spokenNarration)) {
      issues.push("ERROR: Action step leaked into spoken video narration!");
    } else {
      console.log("✓ Video narration check: Ends strictly with Explanation, no Action step");
    }

    // 4. Halal visual theme check
    const query = (p.searchQuery || "").toLowerCase();
    if (/person|people|face|human|man|woman|hand|music|instrument|piano/i.test(query)) {
      issues.push(`ERROR: Forbidden visual terms in searchQuery: ${query}`);
    } else {
      console.log("✓ Halal visual check: 0% people, 0% faces, 0% music in searchQuery");
    }

    // 5. Structure check
    if (p.scriptWorkflow?.hookQuestion && p.scriptWorkflow?.dalilText && p.scriptWorkflow?.explanation) {
      console.log("✓ Structure check: HookQuestion, DalilText, Explanation present");
    } else {
      issues.push("ERROR: Missing workflow components in proposal.scriptWorkflow!");
    }

    if (issues.length > 0) {
      console.error("\n❌ Issues found:", issues);
      process.exit(1);
    } else {
      console.log("\n🎉 ALL SALAFI AND FORMATTING PRINCIPLES PASSED 100%!");
      process.exit(0);
    }
  }
}

main().catch((e) => {
  console.error("Test execution failed:", e);
  process.exit(1);
});
