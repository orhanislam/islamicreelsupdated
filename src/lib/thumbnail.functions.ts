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

// In-memory set of recently used photo IDs to prevent duplicate thumbnails across runs
const inMemoryUsedPhotoIds = new Set<string>();

/**
 * 18 distinct, breathtaking 1080x1920 vertical Halal nature anchors.
 * Used for deterministic rotation to guarantee visual variety across every video in a batch.
 */
export const DIVERSE_HALAL_NATURE_ANCHORS = [
  "golden hour sunrise over majestic misty mountain valley vertical",
  "vast golden desert sand dunes with warm sunset shadows desert vertical",
  "emerald green pine forest with radiant morning sunbeams vertical",
  "peaceful turquoise alpine lake with pristine mountain reflection vertical",
  "dramatic golden clouds parting over calm twilight ocean horizon vertical",
  "lush canyon waterfall cascading into crystalline natural pool vertical",
  "gentle ocean waves foam rolling onto empty sandy shore at dusk vertical",
  "quiet winding river flowing through vibrant golden autumn forest vertical",
  "misty mountain peaks during peaceful pastel morning dawn vertical",
  "epic starry night sky with milky way over calm horizon vertical",
  "radiant sun rays piercing through towering green bamboo forest vertical",
  "serene alpine meadow with blooming wild flowers and snow peaks vertical",
  "calm mirror lake in early morning with rising mist vertical",
  "golden sunlight reflecting on gentle mountain stream ripples vertical",
  "dramatic red rock desert canyon with morning light beams vertical",
  "peaceful emerald green rolling hills under vast blue morning sky vertical",
  "tranquil twilight mountain silhouette under pink and purple dawn sky vertical",
  "morning dew on lush forest moss and crystalline river vertical",
];

async function getRecentlyUsedThumbnailPhotoIds(): Promise<Set<string>> {
  const fs = (await import("fs")).promises;
  const path = await import("path");
  const os = await import("os");
  const jobsDir = path.join(os.homedir(), ".islamicreels_jobs");
  const file = path.join(jobsDir, "used_thumbnail_photo_ids.json");
  const set = new Set<string>(inMemoryUsedPhotoIds);
  try {
    const raw = await fs.readFile(file, "utf-8");
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) {
      for (const id of arr) {
        if (id) set.add(String(id));
      }
    }
  } catch {}
  return set;
}

async function recordUsedThumbnailPhotoId(idOrUrl: string): Promise<void> {
  if (!idOrUrl) return;
  const fs = (await import("fs")).promises;
  const path = await import("path");
  const os = await import("os");
  const jobsDir = path.join(os.homedir(), ".islamicreels_jobs");
  await fs.mkdir(jobsDir, { recursive: true }).catch(() => {});
  const file = path.join(jobsDir, "used_thumbnail_photo_ids.json");

  inMemoryUsedPhotoIds.add(String(idOrUrl));
  try {
    let list: string[] = [];
    try {
      const raw = await fs.readFile(file, "utf-8");
      list = JSON.parse(raw);
      if (!Array.isArray(list)) list = [];
    } catch {}
    list.push(String(idOrUrl));
    if (list.length > 250) list = list.slice(-250);
    await fs.writeFile(file, JSON.stringify(list, null, 2), "utf-8");
  } catch {}
}

/**
 * Returns a diverse, non-repeating Halal nature theme tailored to the video's theology and title.
 */
export function getDiverseHalalThemeForThumbnail(data: {
  title: string;
  topic?: string;
  summaryBg?: string;
  themeBg?: string;
  searchQuery?: string;
  seed: number;
}): string {
  const combinedText = `${data.title} ${data.topic || ""} ${data.summaryBg || ""} ${data.themeBg || ""}`.toLowerCase();
  const seed = Math.abs(data.seed || 0);

  // 1. Explicit clean nature search query from proposal if available
  if (data.searchQuery && !/person|man|woman|people|face|girl|human|crowd/i.test(data.searchQuery)) {
    const cleanQ = sanitizeSearchQuery(data.searchQuery);
    if (cleanQ.length > 5 && !cleanQ.includes("islamic reels")) {
      return `${cleanQ} vertical`;
    }
  }

  // 2. High-precision theological concepts with multiple rotated prompts
  if (/огън|пламък|ад|джехен|наказани/i.test(combinedText)) {
    const fireThemes = [
      "dramatic dark storm clouds lightning fire sky vertical",
      "volcanic black rock red sunset dark dramatic sky vertical",
      "dark glowing crimson horizon sunset storm landscape vertical",
    ];
    return fireThemes[seed % fireThemes.length];
  }

  if (/рай|дженет|градин|вечност/i.test(combinedText)) {
    const paradiseThemes = [
      "lush emerald green waterfall cascading into crystal turquoise river vertical",
      "pristine paradise mountain river emerald green nature vertical",
      "crystal clear mountain spring flowing through lush garden forest vertical",
      "vibrant green alpine meadow flowers with snow mountain backdrop vertical",
    ];
    return paradiseThemes[seed % paradiseThemes.length];
  }

  if (/покаяни|тауба|прошк|милост|надежд|спасени/i.test(combinedText)) {
    const mercyThemes = [
      "radiant golden sunbeams breaking through morning mist over calm lake vertical",
      "warm golden sunrise dawn over peaceful quiet mountains vertical",
      "serene dawn sky morning sunlight filtering through misty valley vertical",
      "gentle morning light over vast calm ocean horizon vertical",
    ];
    return mercyThemes[seed % mercyThemes.length];
  }

  if (/покой|спокой|сърц|сакина|мир|зикир/i.test(combinedText)) {
    const peaceThemes = [
      "tranquil peaceful lake morning sunrise mist calm water vertical",
      "serene calm mirror lake dawn water reflection vertical",
      "golden sunlight filtering through tranquil pine forest river vertical",
      "quiet mountain river flowing over smooth river stones vertical",
    ];
    return peaceThemes[seed % peaceThemes.length];
  }

  if (/намерени|ихляс|чистот|искрен/i.test(combinedText)) {
    const ikhlasThemes = [
      "white sunbeam shining through deep emerald forest vertical",
      "crystal clear pure mountain spring water ripples nature vertical",
      "radiant morning light ray piercing tall pine canopy vertical",
      "solitary tranquil alpine lake crystal reflection peaceful dawn vertical",
    ];
    return ikhlasThemes[seed % ikhlasThemes.length];
  }

  if (/търпени|сабр|изпитани|трудн|беда/i.test(combinedText)) {
    const sabrThemes = [
      "dramatic storm clouds breaking into golden sunlight dawn vertical",
      "calm ocean waves gently washing empty sandy beach sunset vertical",
      "majestic solitary mountain peak emerging from sea of clouds vertical",
      "ancient pine tree on rugged mountain cliff morning light vertical",
    ];
    return sabrThemes[seed % sabrThemes.length];
  }

  if (/дуа|молба|нощ|нощн|тахаджуд|витри/i.test(combinedText)) {
    const duaThemes = [
      "quiet starry night sky with stars over peaceful desert horizon vertical",
      "deep blue twilight sky with evening star over calm mountains vertical",
      "peaceful starry galaxy universe sky calm nature landscape vertical",
    ];
    return duaThemes[seed % duaThemes.length];
  }

  if (/творец|план|сътворен|господ|предопредел|мощ|величи/i.test(combinedText)) {
    const majestyThemes = [
      "vast majestic mountain range golden hour aerial vertical",
      "grand canyon majestic morning sunlight peaceful nature vertical",
      "epic golden sunrise over vast cloud inversion mountains vertical",
      "vast endless desert sand dunes golden sunset dramatic vertical",
    ];
    return majestyThemes[seed % majestyThemes.length];
  }

  if (/благодарност|шукр|изобили|дарове/i.test(combinedText)) {
    const shukrThemes = [
      "radiant golden sunrise open meadow rolling hills vertical",
      "golden sunlight reflecting on gentle waterfall rainbow mist vertical",
      "green lush meadows morning mist sunbeams nature vertical",
    ];
    return shukrThemes[seed % shukrThemes.length];
  }

  if (/дуня|преходн|земният живот|смърт/i.test(combinedText)) {
    const dunyaThemes = [
      "autumn golden amber leaves gentle sunset landscape vertical",
      "quiet desert ripples golden evening twilight landscape vertical",
      "solitary autumn tree in golden twilight meadow vertical",
    ];
    return dunyaThemes[seed % dunyaThemes.length];
  }

  // 3. Fallback to concept map
  const concept = matchTheologicalConcept(combinedText);
  if (concept && concept.roleQueries?.dalil && concept.roleQueries.dalil.length > 0) {
    return concept.roleQueries.dalil[seed % concept.roleQueries.dalil.length];
  }

  // 4. Guaranteed diverse Halal nature rotation across the 18 diverse themes
  return DIVERSE_HALAL_NATURE_ANCHORS[seed % DIVERSE_HALAL_NATURE_ANCHORS.length];
}

export async function generateViralThumbnailCore(
  data: ThumbnailRequest,
): Promise<{ base64: string; dataUrl: string }> {
  // Dynamically import server-only native node modules
  const sharp = (await import("sharp")).default;
  const fs = await import("fs/promises");
  const path = await import("path");

  const finalTitle = (data.title || data.topic || "ИСЛЯМСКА МЪДРОСТ").toUpperCase();
  const { svg } = buildViralThumbnailSvg({
    title: finalTitle,
    accentColor: data.accentColor,
    profile: data.profile,
  });

  // Calculate unique integer seed for deterministic yet distinct rotation across batch items
  const seedString = `${finalTitle}_${data.jobId || ""}_${data.batchIndex ?? ""}`;
  const seed = Math.abs(seedString.split("").reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) | 0, 0));

  let chosenBuffer: Buffer | null = null;
  let chosenPhotoId: string | null = null;

  // Option 1: Custom background image URL if explicitly provided (ensure not an MP4 video)
  if (data.customBackgroundUrl) {
    const isVideoUrl =
      /\.(mp4|mov|webm)(\?.*)?$/i.test(data.customBackgroundUrl) ||
      data.customBackgroundUrl.includes("/video-files/");
    if (!isVideoUrl) {
      try {
        const customRes = await fetch(data.customBackgroundUrl);
        const contentType = customRes.headers.get("content-type") || "";
        if (customRes.ok && (contentType.startsWith("image/") || !contentType.startsWith("video/"))) {
          chosenBuffer = Buffer.from(await customRes.arrayBuffer());
        }
      } catch (err) {
        console.warn("[thumbnail] Failed to fetch customBackgroundUrl, continuing with Halal search:", err);
      }
    }
  }

  // Option 2: Sourcing via Pexels with 3-Tier Halal Guardrails & Multi-Page Deduplication
  if (!chosenBuffer) {
    try {
      const apiKey = process.env.PEXELS_API_KEY;
      if (!apiKey) throw new Error("No Pexels API Key");

      const baseTheme = getDiverseHalalThemeForThumbnail({
        title: finalTitle,
        topic: data.topic,
        summaryBg: data.summaryBg,
        themeBg: data.themeBg,
        searchQuery: data.searchQuery,
        seed,
      });

      // Tier 1: Query Sanitization + Anti-animate negative prompt
      const rawQuery = `${baseTheme} empty nature landscape no people no person no woman`;
      const photoQuery = sanitizeSearchQuery(rawQuery);

      // Vary the Pexels page (1-3) based on seed to discover fresh photos
      const pageToQuery = (seed % 3) + 1;
      console.log(`[thumbnail] Searching Halal photos for "${finalTitle}": "${photoQuery}" (page ${pageToQuery})`);
      const photos = await pexelsPhotoQuery(apiKey, photoQuery, 30, pageToQuery);

      // Tier 2: Metadata & Alt-Text Hard Exclusion Gate
      const candidatePhotos = (photos || []).filter(isThumbnailMetadataHalal);
      console.log(`[thumbnail] Found ${photos?.length || 0} photos, ${candidatePhotos.length} passed Tier 2 metadata filter.`);

      // Deduplication: Avoid reusing photos recently used for other thumbnails
      const usedPhotoIds = await getRecentlyUsedThumbnailPhotoIds();
      const freshCandidates = candidatePhotos.filter((p) => {
        if (!p.id) return true;
        const idStr = String(p.id);
        const origUrl = p.src?.original || "";
        return !usedPhotoIds.has(idStr) && !usedPhotoIds.has(origUrl);
      });

      const poolToScan = freshCandidates.length > 0 ? freshCandidates : candidatePhotos;

      // Reorder candidates with seed offset so two similar queries don't start at candidate 0
      const startOffset = poolToScan.length > 0 ? seed % poolToScan.length : 0;
      const reorderedCandidates = [
        ...poolToScan.slice(startOffset),
        ...poolToScan.slice(0, startOffset),
      ];

      // Tier 3: Gemini Vision AI Verification (Fail-Closed)
      for (const candidate of reorderedCandidates.slice(0, 8)) {
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
            chosenPhotoId = String(candidate.id);
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

  // Record photo ID so subsequent videos in this batch or future runs won't duplicate it
  if (chosenPhotoId) {
    recordUsedThumbnailPhotoId(chosenPhotoId).catch(() => {});
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
      const candidateFile = localCandidates[seed % localCandidates.length];
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

  let jpgBuf: Buffer | null = null;
  if (chosenBuffer) {
    try {
      jpgBuf = await sharp(chosenBuffer)
        .resize(1080, 1920, { fit: "cover", position: "center" })
        .composite([{ input: Buffer.from(svg), gravity: "center" }])
        .jpeg({ quality: 92, mozjpeg: true })
        .toBuffer();
    } catch (sharpErr) {
      console.warn("[thumbnail] Sharp compositing failed on chosenBuffer:", sharpErr);
      jpgBuf = null;
    }
  }

  if (!jpgBuf) {
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
      jobId: input.jobId,
      topic: input.topic,
      summaryBg: input.summaryBg,
      themeBg: input.themeBg,
      searchQuery: input.searchQuery,
      mp4FilePath: input.mp4FilePath,
      batchIndex: input.batchIndex,
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
  caption?: string;
  mp4FilePath?: string;
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

  // If jobData was not explicitly provided, attempt to recover it from jobs.json
  let jobData = params.jobData;
  if (!jobData) {
    try {
      const jobsFile = path.join(jobsDir, "jobs.json");
      const raw = await fs.readFile(jobsFile, "utf-8").catch(() => "{}");
      const jobs = JSON.parse(raw);
      const found =
        jobs[params.jobId] || Object.values(jobs).find((j: any) => j && j.id === params.jobId);
      if (found) {
        jobData = found.data || found.jobData || found;
      }
    } catch {}
  }

  // Extract clean viral headline for the thumbnail
  let rawTitle = params.title || jobData?.topic || "Ислямска мъдрост";
  if (rawTitle.includes("•")) {
    const parts = rawTitle.split("•").map((s: string) => s.trim()).filter(Boolean);
    if (parts.length > 1) rawTitle = parts[1];
  }
  if (rawTitle.includes("]")) {
    const after = rawTitle.split("]").slice(1).join("]").replace(/^[:\-–—\s]+/, "").trim();
    if (after) rawTitle = after;
  }
  const thumbTitle =
    rawTitle.replace(/^["„“'«»\s]+|["„“'«»\s]+$/g, "").trim().toUpperCase() || "ИСЛЯМСКА МЪДРОСТ";

  const isQuran = !/бухари|муслим|тирмизи|навауи|науауи|хадис|bukhari|muslim|tirmidhi|nawawi/i.test(
    `${params.title} ${jobData?.scriptureReference || ""}`,
  );
  const category =
    params.category || (isQuran ? "СВЕЩЕН КОРАН • ТЕФСИР" : "СВЕЩЕН ХАДИС • TIKTOK VIRAL");

  const thumbRes = await generateViralThumbnailCore({
    title: thumbTitle,
    category,
    subtitle: "ISLAMIC REELS STUDIO",
    accentColor: "#FFD700",
    profile: "tiktok",
    jobId: params.jobId,
    topic: jobData?.topic || rawTitle,
    summaryBg: jobData?.summaryBg || params.caption,
    themeBg: jobData?.themeBg,
    searchQuery: jobData?.searchQuery,
    mp4FilePath: params.mp4FilePath,
    customBackgroundUrl: jobData?.thumbnailUrl || jobData?.coverUrl,
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
