import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getDiverseHalalThemeForThumbnail,
  DIVERSE_HALAL_NATURE_ANCHORS,
  generateViralThumbnailCore,
} from "../thumbnail.functions";

test("Thumbnail Diversity - Batch titles produce distinct, non-identical Halal nature themes", () => {
  const titles = [
    "ВРАТИТЕ НА СПАСЕНИЕТО",
    "ПЪЛНАТА НУЖДА ОТ ТВОРЕЦА",
    "ИСКРЕНОСТТА НА НАМЕРЕНИЕТО",
    "ИЗХОД ОТ ВСЯКА БЕДА",
    "СЪВЪРШЕНИЯТ ПЛАН НА ТВОРЕЦА",
    "ЧИСТОТАТА НА СЪРЦЕТО И НАМЕРЕНИЕТО",
    "СИЛАТА НА ИСКРЕНАТА ДУА",
    "БЕЗКРАЙНАТА МИЛОСТ ПРИ ВЪЗДАЯНИЕТО",
  ];

  const generatedThemes = titles.map((title, index) => {
    const seed = Math.abs(title.split("").reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) | 0, 0));
    return getDiverseHalalThemeForThumbnail({
      title,
      seed: seed + index,
    });
  });

  console.log("Generated Themes across the batch:");
  generatedThemes.forEach((th, i) => {
    console.log(`  [${i + 1}] "${titles[i]}" -> "${th}"`);
  });

  // Ensure high diversity: distinct themes across the batch
  const uniqueThemes = new Set(generatedThemes);
  assert.ok(
    uniqueThemes.size >= titles.length - 1,
    `Expected at least ${titles.length - 1} unique themes out of ${titles.length}, got ${uniqueThemes.size}`,
  );

  // Ensure no generic "peaceful golden sunrise sunset landscape" is statically used for everything
  const identicalCount = generatedThemes.filter(
    (t) => t === "peaceful golden sunrise sunset landscape",
  ).length;
  assert.strictEqual(
    identicalCount,
    0,
    "No theme should fall back to a single hardcoded identical query",
  );
});

test("Thumbnail Anchors - Pool contains at least 15 diverse Halal vertical nature prompts", () => {
  assert.ok(
    DIVERSE_HALAL_NATURE_ANCHORS.length >= 15,
    "Anchor pool must have at least 15 diverse prompts",
  );

  // Check that all anchors specify vertical orientation and pure nature
  for (const anchor of DIVERSE_HALAL_NATURE_ANCHORS) {
    assert.ok(anchor.includes("vertical"), `Anchor "${anchor}" must specify vertical orientation`);
    assert.ok(
      !/person|woman|man|people|human|face|crowd|dancer/i.test(anchor),
      `Anchor "${anchor}" must not contain any human or living creature references`,
    );
  }
});

test("Thumbnail Core - Batch generation produces distinct thumbnail files without throwing", async () => {
  const thumb1 = await generateViralThumbnailCore({
    title: "ВРАТИТЕ НА СПАСЕНИЕТО",
    jobId: "batch_test_1",
    batchIndex: 0,
  });

  const thumb2 = await generateViralThumbnailCore({
    title: "ПЪЛНАТА НУЖДА ОТ ТВОРЕЦА",
    jobId: "batch_test_2",
    batchIndex: 1,
  });

  assert.ok(thumb1.base64 && thumb1.dataUrl, "Thumb 1 generated");
  assert.ok(thumb2.base64 && thumb2.dataUrl, "Thumb 2 generated");
  assert.notStrictEqual(
    thumb1.base64,
    thumb2.base64,
    "Thumbnails for different titles must have different binary payloads",
  );
});
