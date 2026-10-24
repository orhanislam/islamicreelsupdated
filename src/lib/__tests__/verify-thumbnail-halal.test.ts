import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isThumbnailMetadataHalal,
  buildViralThumbnailSvg,
  fitThumbnailTitle,
  generateViralThumbnailCore,
} from "../thumbnail.functions";

test("Salafi Halal Thumbnail Filter - Metadata exclusion gate", () => {
  // 1. Should reject images containing humans, women, hikers, silhouettes
  const haramCases = [
    { id: 1, alt: "Woman walking on sand dunes during sunset", photographer: "John Doe" },
    { id: 2, alt: "Hikers on mountain ridge", photographer: "Jane Smith" },
    { id: 3, alt: "Silhouette of a person against sunset", photographer: "Alex" },
    { id: 4, alt: "Couple looking at the ocean waves", photographer: "Sarah" },
    { id: 5, alt: "Young girl in emerald forest", photographer: "Mike" },
    { id: 6, alt: "Crowd at landscape viewpoint", photographer: "Emma" },
    { id: 7, alt: "Man praying or sitting by the lake", photographer: "David" },
  ];

  for (const c of haramCases) {
    const isHalal = isThumbnailMetadataHalal(c);
    assert.strictEqual(
      isHalal,
      false,
      `Expected metadata to be rejected as HARAM for alt: "${c.alt}"`,
    );
  }

  // 2. Should approve 100% empty nature and landscapes
  const halalCases = [
    { id: 10, alt: "Empty desert sand dunes at golden sunset", photographer: "NatureLens" },
    { id: 11, alt: "Majestic snow mountain peaks under morning dawn", photographer: "WildPhotos" },
    { id: 12, alt: "Emerald calm river flowing through pristine forest", photographer: "EarthScapes" },
    { id: 13, alt: "Tranquil lake with morning mist and sunrise reflections", photographer: "ScenicEye" },
  ];

  for (const c of halalCases) {
    const isHalal = isThumbnailMetadataHalal(c);
    assert.strictEqual(
      isHalal,
      true,
      `Expected metadata to be accepted as HALAL for alt: "${c.alt}"`,
    );
  }
});

test("Thumbnail SVG Text Generation - All caps & auto-fit big letters", () => {
  const result = buildViralThumbnailSvg({
    title: "ПРЕДОПРЕДЕЛЕНИЕТО И СЪТВОРЕНИЕТО НА ЧОВЕКА",
  });
  console.log("buildViralThumbnailSvg result:", {
    fontSize: result.fontSize,
    lines: result.lines,
    svgLength: result.svg.length,
  });

  assert.ok(result.svg.includes("<svg"), "Should return valid SVG markup");
  assert.ok(
    result.svg.includes("ПРЕДОПРЕДЕЛЕНИ") && result.svg.includes("СЪТВОРЕНИЕТО"),
    "Should contain the uppercase title words",
  );
  assert.ok(
    result.svg.includes('font-weight="900"'),
    "Should apply extra bold font weight",
  );
  assert.ok(result.fontSize >= 54 && result.fontSize <= 76, "Font size should be in viral big letters range");
  assert.ok(result.lines.length <= 4, "Lines should not exceed 4 lines");
});

test("generateViralThumbnail - Fallback execution produces valid JPEG base64 and dataUrl", async () => {
  // Tests execution with guaranteed Halal local pool or safe rendering
  const thumb = await generateViralThumbnailCore({
    title: "ПРЕДОПРЕДЕЛЕНИЕТО И СЪТВОРЕНИЕТО НА ЧОВЕКА",
  });

  assert.ok(thumb.base64 && thumb.base64.length > 500, "Base64 payload should not be empty");
  assert.ok(thumb.dataUrl.startsWith("data:image/jpeg;base64,"), "Data URL must be a valid jpeg base64 URL");
});
