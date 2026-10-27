import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SALAFI_WORKERS_ROSTER,
  testWorkerSkillDirect,
  runMultiWorkerPipelineDirect,
} from "../team-pipeline.functions";

test("Salafi Workers Roster - All 5 roles (Manager + 4 Workers) have maximal skills defined", () => {
  assert.strictEqual(SALAFI_WORKERS_ROSTER.length, 5, "Expected 5 team members in roster");

  const expectedRoles = ["manager", "copywriter", "hodja", "video_editor", "seo_worker"];
  for (const role of expectedRoles) {
    const member = SALAFI_WORKERS_ROSTER.find((m) => m.id === role);
    assert.ok(member, `Missing roster member for role: ${role}`);
    assert.ok(member.skills.length >= 5, `Expected at least 5 skills for ${role}, got ${member.skills.length}`);
    for (const skill of member.skills) {
      assert.ok(skill.id, `Skill missing ID in ${role}`);
      assert.ok(skill.name, `Skill missing name in ${role}`);
      assert.ok(skill.icon, `Skill missing icon in ${role}`);
      assert.ok(skill.description, `Skill missing description in ${role}`);
      assert.ok(skill.executionDetail, `Skill missing execution detail in ${role}`);
    }
  }

  const totalSkills = SALAFI_WORKERS_ROSTER.reduce((acc, m) => acc + m.skills.length, 0);
  assert.ok(totalSkills >= 25, `Expected at least 25 total skills across team, got ${totalSkills}`);
});

test("testWorkerSkillDirect - Individual skill tests return professional outputs", async () => {
  // Test Manager skill
  const managerRes = await testWorkerSkillDirect({
    workerId: "manager",
    skillId: "manager_theological_briefing",
    sampleInput: "Търпението при беда",
  });
  assert.strictEqual(managerRes.success, true);
  assert.ok(managerRes.output.includes("РЕЖИСЬОРСКИ БРИФ"));

  // Test Copywriter skill
  const copywriterRes = await testWorkerSkillDirect({
    workerId: "copywriter",
    skillId: "copywriter_viral_hook",
    sampleInput: "Покайване и милост",
  });
  assert.strictEqual(copywriterRes.success, true);
  assert.ok(copywriterRes.output.includes("ВИРАЛНА КУКА"));

  // Test Hodja skill
  const hodjaRes = await testWorkerSkillDirect({
    workerId: "hodja",
    skillId: "hodja_daleel_authentication",
    sampleInput: "Аллах е близо до Своите раби",
  });
  assert.strictEqual(hodjaRes.success, true);
  assert.ok(hodjaRes.output.includes("САЛАФИ"));

  // Test Video Editor skill
  const videoRes = await testWorkerSkillDirect({
    workerId: "video_editor",
    skillId: "video_tiktok_safe_zone",
  });
  assert.strictEqual(videoRes.success, true);
  assert.ok(videoRes.output.includes("760px"));

  // Test SEO Worker skill
  const seoRes = await testWorkerSkillDirect({
    workerId: "seo_worker",
    skillId: "seo_search_optimized_title",
    sampleInput: "Силата на сутрешната дуа",
  });
  assert.strictEqual(seoRes.success, true);
  assert.ok(seoRes.output.includes("SEO"));
});
