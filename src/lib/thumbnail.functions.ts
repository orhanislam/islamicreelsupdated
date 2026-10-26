import { createServerFn } from "@tanstack/react-start";
import { geminiImageAnalysis } from "./gemini";
import {
  pexelsPhotoQuery,
  matchTheologicalConcept,
  sanitizeSearchQuery,
} from "./pexels.functions";
import {
  buildViralThumbnailSvg,
  isThumbnailMetadataHalal,
  HALAL_THUMBNAIL_VISION_PROMPT,
  type ThumbnailRequest,
} from "./thumbnail-client";

export * from "./thumbnail-client";

export async function generateViralThumbnailCore(
  data: ThumbnailRequest,
): Promise<{ base64: string; dataUrl: string }> {
  // Dynamically import server-only native node modules
  const sharp = (await import("sharp")).default;
  const fs = await import("fs/promises");
  const path = await import("path");

  const finalTitle = (data.title || "ИСЛЯМСКА МЪДРОСТ").toUpperCase();
  const { svg } = buildViralThumbnailSvg({
    title: finalTitle,
    accentColor: data.accentColor,
    profile: data.profile,
  });

  let chosenBuffer: Buffer | null = null;

  // Option 1: Custom background URL if explicitly provided
  if (data.customBackgroundUrl) {
    try {
      const customRes = await fetch(data.customBackgroundUrl);
      if (customRes.ok) {
        chosenBuffer = Buffer.from(await customRes.arrayBuffer());
      }
    } catch (err) {
      console.warn("[thumbnail] Failed to fetch customBackgroundUrl, continuing with Halal search:", err);
    }
  }

  // Option 2: Sourcing via Pexels with 3-Tier Halal Guardrails
  if (!chosenBuffer) {
    try {
      const apiKey = process.env.PEXELS_API_KEY;
      if (!apiKey) throw new Error("No Pexels API Key");

      // Concept-aware English translation with strict empty nature anchors
      let baseTheme = "peaceful golden sunrise sunset landscape";
      const concept = matchTheologicalConcept(finalTitle);
      if (concept && concept.roleQueries && concept.roleQueries.dalil && concept.roleQueries.dalil.length > 0) {
        baseTheme = concept.roleQueries.dalil[0];
      } else if (/огън|пламък|ад|джехен|наказани/i.test(finalTitle)) {
        baseTheme = "fire flames dark night";
      } else if (/рай|дженет|градин|реки|вечност/i.test(finalTitle)) {
        baseTheme = "paradise river waterfall emerald nature";
      } else if (/покой|спокой|сърц|мир/i.test(finalTitle)) {
        baseTheme = "tranquil peaceful lake morning sunrise";
      } else if (/пустин|пясък|дюн|сахар|сътворен|предопредел/i.test(finalTitle)) {
        baseTheme = "golden desert sand dunes sunset warm";
      }

      // Tier 1: Query Sanitization + Anti-animate negative prompt
      const rawQuery = `${baseTheme} empty nature landscape no people no person no woman`;
      const photoQuery = sanitizeSearchQuery(rawQuery);

      console.log(`[thumbnail] Searching Halal photos for "${finalTitle}": "${photoQuery}"`);
      const photos = await pexelsPhotoQuery(apiKey, photoQuery, 25);

      // Tier 2: Metadata & Alt-Text Hard Exclusion Gate
      const candidatePhotos = (photos || []).filter(isThumbnailMetadataHalal);
      console.log(`[thumbnail] Found ${photos?.length || 0} photos, ${candidatePhotos.length} passed Tier 2 metadata filter.`);

      // Tier 3: Gemini Vision AI Verification (Fail-Closed)
      for (const candidate of candidatePhotos.slice(0, 5)) {
        try {
          const imgUrl = candidate.src.large2x || candidate.src.portrait || candidate.src.original;
          const res = await fetch(imgUrl);
          if (!res.ok) continue;
          const rawBuffer = Buffer.from(await res.arrayBuffer());

          // Lightweight 512x910 preview for ultra-fast Vision AI inspection
          const preview = await sharp(rawBuffer)
            .resize(512, 910, { fit: "cover" })
            .jpeg({ quality: 80 })
            .toBuffer();

          const aiVerdict = await geminiImageAnalysis(
            [{ base64: preview.toString("base64"), mimeType: "image/jpeg" }],
            HALAL_THUMBNAIL_VISION_PROMPT,
          );

          if (aiVerdict.toUpperCase().includes("HALAL")) {
            console.log(`[thumbnail] Photo ${candidate.id} verified 100% Halal by Vision AI.`);
            chosenBuffer = rawBuffer;
            break;
          } else {
            console.warn(
              `[thumbnail] Photo ${candidate.id} rejected by Halal Vision AI: ${aiVerdict.trim()}`,
            );
          }
        } catch (vErr) {
          console.warn(`[thumbnail] Vision AI check failed for photo ${candidate.id}:`, vErr);
        }
      }
    } catch (err) {
      console.warn("[thumbnail] Halal Pexels search encountered error:", err);
    }
  }

  // Option 3: Guaranteed 100% Halal Local Curated Pool Fallback
  if (!chosenBuffer) {
    try {
      const localCandidates = [
        "tiktok_images/img0.jpg",
        "tiktok_images/img1.jpg",
        "tiktok_images/img2.jpg",
        "tiktok_images/img3.jpg",
      ];
      const hash = finalTitle.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const candidateFile = localCandidates[Math.abs(hash) % localCandidates.length];
      const localPath = path.resolve(process.cwd(), candidateFile);

      const exists = await fs.stat(localPath).catch(() => null);
      if (exists) {
        console.log(`[thumbnail] Using guaranteed Halal local background asset: ${candidateFile}`);
        chosenBuffer = await fs.readFile(localPath);
      }
    } catch (lErr) {
      console.warn("[thumbnail] Local Halal pool fallback failed:", lErr);
    }
  }

  let jpgBuf: Buffer;
  if (chosenBuffer) {
    jpgBuf = await sharp(chosenBuffer)
      .resize(1080, 1920, { fit: "cover", position: "center" })
      .composite([{ input: Buffer.from(svg), gravity: "center" }])
      .jpeg({ quality: 92, mozjpeg: true })
      .toBuffer();
  } else {
    // Emergency Fallback: Render dynamic dark emerald gradient canvas
    const fallbackSvg = svg.replace('fill-opacity="0.45"', 'fill-opacity="1.0"');
    jpgBuf = await sharp(Buffer.from(fallbackSvg))
      .jpeg({ quality: 92, mozjpeg: true })
      .toBuffer();
  }

  const base64 = jpgBuf.toString("base64");
  return {
    base64,
    dataUrl: `data:image/jpeg;base64,${base64}`,
  };
}

export const generateViralThumbnail = createServerFn({ method: "POST" })
  .validator((input: ThumbnailRequest) => {
    return {
      title: input.title || "Ислямска Мъдрост",
      category: input.category || "СВЕЩЕН ХАДИС • TIKTOK VIRAL",
      subtitle: input.subtitle || "ISLAMIC REELS STUDIO",
      accentColor: input.accentColor || "#FFD700",
      profile: input.profile || "tiktok",
      customBackgroundUrl: input.customBackgroundUrl,
    };
  })
  .handler(async ({ data }) => {
    return generateViralThumbnailCore(data);
  });

/**
 * Ensures a high-resolution viral thumbnail exists on disk for a given render job.
 * If not already present, generates it using generateViralThumbnailCore and saves it
 * to `<jobsDir>/<jobId>_thumbnail.jpg`. Returns the local path, buffer, base64 and dataUrl.
 */
export async function ensureJobThumbnailOnDisk(params: {
  jobId: string;
  title: string;
  category?: string;
  jobData?: any;
}): Promise<{
  filePath: string;
  buffer: Buffer;
  base64: string;
  dataUrl: string;
}> {
  const fs = (await import("fs")).promises;
  const path = await import("path");
  const os = await import("os");

  const jobsDir = path.join(os.homedir(), ".islamicreels_jobs");
  await fs.mkdir(jobsDir, { recursive: true }).catch(() => {});
  const filePath = path.join(jobsDir, `${params.jobId}_thumbnail.jpg`);

  const stat = await fs.stat(filePath).catch(() => null);
  if (stat && stat.size > 5000) {
    const buffer = await fs.readFile(filePath);
    const base64 = buffer.toString("base64");
    return {
      filePath,
      buffer,
      base64,
      dataUrl: `data:image/jpeg;base64,${base64}`,
    };
  }

  // Extract clean viral headline for the thumbnail
  let rawTitle = params.title || params.jobData?.topic || "Ислямска мъдрост";
  if (rawTitle.includes("•")) {
    const parts = rawTitle.split("•").map((s: string) => s.trim()).filter(Boolean);
    if (parts.length > 1) rawTitle = parts[1];
  }
  if (rawTitle.includes("]")) {
    const after = rawTitle.split("]").slice(1).join("]").replace(/^[:\-–—\s]+/, "").trim();
    if (after) rawTitle = after;
  }
  const thumbTitle = rawTitle.replace(/^["„“'«»\s]+|["„“'«»\s]+$/g, "").trim().toUpperCase() || "ИСЛЯМСКА МЪДРОСТ";

  const isQuran = !/бухари|муслим|тирмизи|навауи|науауи|хадис|bukhari|muslim|tirmidhi|nawawi/i.test(
    `${params.title} ${params.jobData?.scriptureReference || ""}`,
  );
  const category =
    params.category || (isQuran ? "СВЕЩЕН КОРАН • ТЕФСИР" : "СВЕЩЕН ХАДИС • TIKTOK VIRAL");

  const thumbRes = await generateViralThumbnailCore({
    title: thumbTitle,
    category,
    subtitle: "ISLAMIC REELS STUDIO",
    accentColor: "#FFD700",
    profile: "tiktok",
    customBackgroundUrl: params.jobData?.backgroundUrl || params.jobData?.backgroundVideoUrl,
  });

  const buffer = Buffer.from(thumbRes.base64, "base64");
  await fs.writeFile(filePath, buffer);
  console.log(
    `[thumbnail] Generated and cached server thumbnail for ${params.jobId}: ${filePath} (${buffer.length} bytes)`,
  );

  return {
    filePath,
    buffer,
    base64: thumbRes.base64,
    dataUrl: thumbRes.dataUrl,
  };
}

export const getServerJobThumbnail = createServerFn({ method: "POST" })
  .validator((input: { jobId: string; title?: string }) => input)
  .handler(async ({ data: { jobId, title } }) => {
    return ensureJobThumbnailOnDisk({ jobId, title: title || "Ислямска мъдрост" });
  });

