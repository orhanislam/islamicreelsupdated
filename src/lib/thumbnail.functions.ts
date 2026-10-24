import { createServerFn } from "@tanstack/react-start";
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";
import { geminiImageAnalysis } from "./gemini";
import {
  pexelsPhotoQuery,
  matchTheologicalConcept,
  sanitizeSearchQuery,
  TIER2_HARAM_METADATA_REGEX,
  type PexelsPhoto,
} from "./pexels.functions";
import { getSafeZone, TIKTOK_SAFE_ZONE, type SafeZoneGeometry } from "./safe-zone";

export interface ThumbnailRequest {
  title: string;
  category?: string;
  subtitle?: string;
  accentColor?: string;
  profile?: string;
  customBackgroundUrl?: string;
}

export const HARAM_THUMB_METADATA_REGEX =
  /\b(woman|women|girl|girls|female|lady|ladies|man|men|male|guy|guys|person|people|human|humans|couple|couples|crowd|crowds|silhouette|silhouettes|shadow|shadows|hiker|hikers|tourist|tourists|traveler|travelers|model|models|portrait|face|faces|walking|standing|sitting|feet|hands|praying|dancer|statue|idol|cross|instrument)\b/i;

export const HALAL_THUMBNAIL_VISION_PROMPT = `You are an uncompromising Islamic compliance auditor adhering to orthodox Salafi standards.
Inspect this candidate thumbnail image with EXTREME ATTENTION TO THE BACKGROUND, HORIZON, RIDGES, AND DISTANCE.
REJECT AND REPLY 'HARAM: <reason>' IF ANY OF THE FOLLOWING ARE VISIBLE ANYWHERE IN THE IMAGE, NO MATTER HOW SMALL, FAR AWAY, BLURRY, SILHOUETTED, OR DISTANT:
1. ANY human beings (men, women, children, people walking on sand dunes, ridges, hills, trails, silhouettes, crowds, faces, hands, bodies). Even a tiny speck on a dune or ridge that resembles a human or woman walking is STRICTLY HARAM.
2. ANY animals, living creatures, or birds.
3. Statues, idols, religious crosses, or musical instruments.

REPLY 'HALAL' ONLY IF THE IMAGE IS 100% PURE EMPTY NATURE (mountains, oceans, sand dunes, clouds, forests, rivers, waterfalls, sky) WITH ABSOLUTELY ZERO LIVING CREATURES OR HUMAN SILHOUETTES.
Reply with exactly 'HARAM: <reason>' or 'HALAL'.`;

/**
 * Validates candidate photo metadata against multi-tier Halal exclusions.
 */
export function isThumbnailMetadataHalal(photo: Partial<PexelsPhoto>): boolean {
  if (!photo) return false;
  const meta = `${photo.alt || ""} ${photo.photographer || ""}`.toLowerCase();
  if (TIER2_HARAM_METADATA_REGEX.test(meta)) return false;
  return !HARAM_THUMB_METADATA_REGEX.test(meta);
}

/**
 * Escape XML entities for safe SVG text embedding.
 */
export function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Calibrated character-width estimator for bold uppercase Arial/sans-serif.
 */
export function estimateTitleWidth(text: string, fontSize: number): number {
  let w = 0;
  for (const char of text) {
    if (char === " ") {
      w += fontSize * 0.28;
    } else if (/[.,!?:;'"„“”«»`()[\]-]/.test(char)) {
      w += fontSize * 0.32;
    } else if (/[щжюфмшЩЖЮШФМWwMm%@]/.test(char)) {
      w += fontSize * 0.85;
    } else if (/[iljt1I|!]/.test(char)) {
      w += fontSize * 0.3;
    } else if (/[A-ZА-Я]/.test(char)) {
      w += fontSize * 0.7;
    } else {
      w += fontSize * 0.6;
    }
  }
  return Math.round(w);
}

/**
 * Wrap title into lines respecting a maximum pixel width constraint.
 */
export function wrapTitleText(text: string, fontSize: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    // If a single unbroken word exceeds maxWidth, chunk it
    if (estimateTitleWidth(word, fontSize) > maxWidth) {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = "";
      }
      let chunk = "";
      for (const char of word) {
        if (estimateTitleWidth(chunk + char, fontSize) > maxWidth && chunk) {
          lines.push(chunk);
          chunk = char;
        } else {
          chunk += char;
        }
      }
      if (chunk) currentLine = chunk;
      continue;
    }

    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (estimateTitleWidth(testLine, fontSize) > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) lines.push(currentLine);

  // Avoid single orphan word on last line if previous line has >= 3 words
  if (lines.length >= 2) {
    const last = lines[lines.length - 1];
    const prev = lines[lines.length - 2];
    const prevWords = prev.split(" ");
    const lastWords = last.split(" ");
    if (lastWords.length === 1 && prevWords.length >= 3) {
      const moved = prevWords.pop()!;
      const newPrev = prevWords.join(" ");
      const newLast = `${moved} ${last}`;
      if (
        estimateTitleWidth(newPrev, fontSize) <= maxWidth &&
        estimateTitleWidth(newLast, fontSize) <= maxWidth
      ) {
        lines[lines.length - 2] = newPrev;
        lines[lines.length - 1] = newLast;
      }
    }
  }

  return lines;
}

/**
 * Calculate dynamic auto-fit font size (76px down to 54px) and wrapped lines.
 */
export function fitThumbnailTitle(
  title: string,
  maxWidth = 760,
  maxLines = 4,
  range = { max: 76, min: 54 },
): { fontSize: number; lines: string[]; lineHeight: number } {
  const cleanTitle = title.trim().toUpperCase();
  if (!cleanTitle) {
    return { fontSize: range.max, lines: [], lineHeight: Math.round(range.max * 1.35) };
  }

  for (let size = range.max; size >= range.min; size -= 2) {
    const lines = wrapTitleText(cleanTitle, size, maxWidth);
    const lh = Math.round(size * 1.35);
    const allFit = lines.every((l) => estimateTitleWidth(l, size) <= maxWidth);
    if (lines.length <= maxLines && allFit) {
      return { fontSize: size, lines: lines.slice(0, maxLines), lineHeight: lh };
    }
  }

  // Fallback to min size
  const minSize = range.min;
  const lines = wrapTitleText(cleanTitle, minSize, maxWidth).slice(0, maxLines);
  return {
    fontSize: minSize,
    lines,
    lineHeight: Math.round(minSize * 1.35),
  };
}

/**
 * Generate safe SVG markup string with bounded title text.
 */
export function buildViralThumbnailSvg(options: {
  title: string;
  accentColor?: string;
  profile?: string;
  safeZone?: SafeZoneGeometry;
}): { svg: string; fontSize: number; lines: string[]; centerX: number; maxLineWidth: number } {
  const sz = options.safeZone || getSafeZone(options.profile || "tiktok");
  const maxWidth = Math.min(sz.W_SAFE, 780);
  // TikTok Profile 1:1 and Search 3:4 grid crop optical center is exactly canvas midpoint
  const centerX = Math.round(sz.W / 2); // 540 for 1080p
  const centerY = Math.round(sz.H / 2); // 960 for 1920p

  const {
    fontSize,
    lines: displayLines,
    lineHeight,
  } = fitThumbnailTitle(options.title, maxWidth, 4, { max: 76, min: 54 });

  let maxLineWidth = 0;
  const titleSvgLines = displayLines
    .map((line, i) => {
      const lineWidth = estimateTitleWidth(line, fontSize);
      if (lineWidth > maxLineWidth) maxLineWidth = lineWidth;
      const y = centerY + (i - (displayLines.length - 1) / 2) * lineHeight;
      // Clean professional cover: every line pure white with a soft drop shadow (no gold/yellow accents)
      return `<text x="${centerX}" y="${y}" font-family="Arial, sans-serif" font-weight="900" font-size="${fontSize}" fill="#FFFFFF" text-anchor="middle" letter-spacing="-1" filter="url(#coverTextShadow)">${escapeXml(line)}</text>`;
    })
    .join("\n");

  const svg = `
<svg width="${sz.W}" height="${sz.H}" viewBox="0 0 ${sz.W} ${sz.H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Soft drop shadow (built from primitives for maximum librsvg/sharp compatibility) -->
    <filter id="coverTextShadow" x="-20%" y="-50%" width="140%" height="200%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="7"/>
      <feOffset dx="0" dy="5" result="blurOffset"/>
      <feFlood flood-color="#000000" flood-opacity="0.85"/>
      <feComposite in2="blurOffset" operator="in" result="shadow"/>
      <feMerge>
        <feMergeNode in="shadow"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Semi-transparent overlay to make text readable over any image -->
  <rect width="${sz.W}" height="${sz.H}" fill="#000000" fill-opacity="0.45"/>

  <!-- Main Viral Title -->
  ${titleSvgLines}
</svg>`;

  return { svg, fontSize, lines: displayLines, centerX, maxLineWidth };
}

export async function generateViralThumbnailCore(
  data: ThumbnailRequest,
): Promise<{ base64: string; dataUrl: string }> {
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
