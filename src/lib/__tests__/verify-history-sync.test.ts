import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getGenerationHistoryDirect,
  recordGenerationEntryDirect,
  updateGenerationEntryDirect,
  deleteGenerationEntryDirect,
} from "../generation-history.functions";

describe("Generation History Sync & Persistence Engine", () => {
  it("records a video entry with queued status and updates to completed with downloadUrl", async () => {
    const testId = `test_job_${Date.now()}`;
    const item = await recordGenerationEntryDirect({
      id: testId,
      type: "hadith",
      title: "Сахих ал-Бухари #1 (Намеренията)",
      reference: "Сахих ал-Бухари #1",
      arabicText: "إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ",
      bulgarianText: "Делата се ценят според намеренията.",
      format: "video",
      status: "queued",
    });

    assert.equal(item.id, testId);
    assert.equal(item.status, "queued");

    // Update status to completed with videoUrl
    await updateGenerationEntryDirect(testId, {
      status: "completed",
      completedAt: Date.now(),
      videoUrl: `/api/download/${testId}?inline=1`,
      downloadUrl: `/api/download/${testId}?filename=bukhari_1.mp4`,
    });

    const list = await getGenerationHistoryDirect();
    const updated = list.find((x) => x.id === testId);
    assert.ok(updated, "Updated item must be found in generation history");
    assert.equal(updated.status, "completed");
    assert.equal(updated.videoUrl, `/api/download/${testId}?inline=1`);
    assert.equal(updated.downloadUrl, `/api/download/${testId}?filename=bukhari_1.mp4`);

    // Delete test item
    await deleteGenerationEntryDirect(testId);
    const listAfterDelete = await getGenerationHistoryDirect();
    assert.equal(listAfterDelete.find((x) => x.id === testId), undefined);
  });
});
