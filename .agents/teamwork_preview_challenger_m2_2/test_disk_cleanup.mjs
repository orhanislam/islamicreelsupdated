import fs from "fs/promises";
import path from "path";
import os from "os";

// Replicate activeRenderSessionFiles and aggressivelyCleanServerDisk exact implementation logic for empirical verification
const activeRenderSessionFiles = new Set();

async function testCleanupLogic(tmpDirs, forceAll = false) {
  const now = Date.now();
  for (const tmpDir of tmpDirs) {
    try {
      const tmpFiles = await fs.readdir(tmpDir).catch(() => []);
      const prefixes = ["reel_", "render_", "audio_", "frame_", "bg_", "export_"];
      for (const f of tmpFiles) {
        const matchesPrefix = prefixes.some((p) => f.startsWith(p));
        if (matchesPrefix) {
          const fp = path.join(tmpDir, f);
          if (activeRenderSessionFiles.has(fp)) continue; // PROTECTION
          const st = await fs.stat(fp).catch(() => null);
          const threshold = forceAll ? 0 : 30 * 60 * 1000;
          if (st && now - st.mtimeMs >= threshold) {
            await fs.rm(fp, { recursive: true, force: true }).catch(() => {});
          }
        }
      }
    } catch {}
  }
}

async function runEmpiricalTest() {
  console.log("=== EMPIRICAL TEST: aggressivelyCleanServerDisk ===");
  const testDir = path.resolve("./.agents/teamwork_preview_challenger_m2_2/test_tmp");
  
  await fs.mkdir(testDir, { recursive: true });

  const nowSec = Math.floor(Date.now() / 1000);
  const minSec = 60;

  const testFiles = [
    { name: "reel_old_35m.txt", ageMins: 35, expectedDeleteNormal: true, expectedDeleteForce: true },
    { name: "reel_new_5m.txt", ageMins: 5, expectedDeleteNormal: false, expectedDeleteForce: true },
    { name: "render_old_40m.txt", ageMins: 40, expectedDeleteNormal: true, expectedDeleteForce: true },
    { name: "audio_old_60m.txt", ageMins: 60, expectedDeleteNormal: true, expectedDeleteForce: true },
    { name: "frame_old_45m.txt", ageMins: 45, expectedDeleteNormal: true, expectedDeleteForce: true },
    { name: "bg_old_50m.txt", ageMins: 50, expectedDeleteNormal: true, expectedDeleteForce: true },
    { name: "export_old_90m.txt", ageMins: 90, expectedDeleteNormal: true, expectedDeleteForce: true },
    { name: "important_user_doc.txt", ageMins: 120, expectedDeleteNormal: false, expectedDeleteForce: false },
    { name: "other_system_process.log", ageMins: 500, expectedDeleteNormal: false, expectedDeleteForce: false },
    { name: "reel_active_100m.txt", ageMins: 100, isActive: true, expectedDeleteNormal: false, expectedDeleteForce: false },
  ];

  async function populate() {
    // Clear test directory
    const existing = await fs.readdir(testDir).catch(() => []);
    for (const f of existing) {
      await fs.rm(path.join(testDir, f), { recursive: true, force: true }).catch(() => {});
    }
    activeRenderSessionFiles.clear();

    for (const tf of testFiles) {
      const filePath = path.join(testDir, tf.name);
      await fs.writeFile(filePath, `dummy content for ${tf.name}`);
      const mtimeSec = nowSec - tf.ageMins * minSec;
      await fs.utimes(filePath, mtimeSec, mtimeSec);
      if (tf.isActive) {
        activeRenderSessionFiles.add(filePath);
      }
    }
  }

  // TEST 1: forceAll = false
  console.log("\n--- TEST 1: forceAll = false (Normal scheduled cleanup) ---");
  await populate();
  await testCleanupLogic([testDir], false);
  const remaining1 = new Set(await fs.readdir(testDir));

  let passed1 = true;
  for (const tf of testFiles) {
    const exists = remaining1.has(tf.name);
    const shouldExist = !tf.expectedDeleteNormal;
    if (exists !== shouldExist) {
      console.error(`FAIL: ${tf.name} exists=${exists}, expected=${shouldExist}`);
      passed1 = false;
    } else {
      console.log(`PASS: ${tf.name} exists=${exists} (Expected)`);
    }
  }

  // TEST 2: forceAll = true
  console.log("\n--- TEST 2: forceAll = true (Emergency maintenance cleanup) ---");
  await populate();
  await testCleanupLogic([testDir], true);
  const remaining2 = new Set(await fs.readdir(testDir));

  let passed2 = true;
  for (const tf of testFiles) {
    const exists = remaining2.has(tf.name);
    const shouldExist = !tf.expectedDeleteForce;
    if (exists !== shouldExist) {
      console.error(`FAIL: ${tf.name} exists=${exists}, expected=${shouldExist}`);
      passed2 = false;
    } else {
      console.log(`PASS: ${tf.name} exists=${exists} (Expected)`);
    }
  }

  // Cleanup test folder
  await fs.rm(testDir, { recursive: true, force: true }).catch(() => {});

  if (passed1 && passed2) {
    console.log("\n>>> ALL DISK CLEANUP EMPIRICAL TESTS PASSED! <<<");
  } else {
    console.error("\n>>> SOME DISK CLEANUP TESTS FAILED! <<<");
    process.exit(1);
  }
}

runEmpiricalTest().catch((e) => {
  console.error(e);
  process.exit(1);
});
