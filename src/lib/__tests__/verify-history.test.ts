import { getGenerationHistoryDirect, recordGenerationEntryDirect } from "../generation-history.functions";

async function run() {
  console.log("Testing generation history functions...");
  const items = await getGenerationHistoryDirect();
  console.log("Total items loaded from historical sources:", items.length);
  if (items.length > 0) {
    console.log("Sample item 0:", {
      id: items[0].id,
      title: items[0].title,
      type: items[0].type,
      reference: items[0].reference,
      date: new Date(items[0].timestamp).toLocaleString("bg-BG"),
      format: items[0].format,
    });
  }

  // Test recording a new generation entry
  const recorded = await recordGenerationEntryDirect({
    type: "ayah",
    title: "Сура 112 (Ал-Ихляс) • Аят 1",
    reference: "Сура 112:1",
    surah: 112,
    ayah: 1,
    arabicText: "قُلْ هُوَ اللَّهُ أَحَدٌ",
    bulgarianText: "Кажи: Той е Аллах — Единственият!",
    timestamp: Date.now(),
    format: "video",
  });

  console.log("Successfully recorded new entry:", recorded.id, recorded.title);

  const updatedItems = await getGenerationHistoryDirect();
  console.log("Updated count:", updatedItems.length);
  const found = updatedItems.find((x) => x.id === recorded.id);
  if (!found) {
    throw new Error("Recorded entry not found in history!");
  }
  console.log("Verification passed successfully!");
}

run().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});
