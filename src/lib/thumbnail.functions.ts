import { createServerFn } from "@tanstack/react-start";
import sharp from "sharp";
import { geminiChat } from "./gemini";
import { pexelsPhotoQuery } from "./pexels.functions";
import { getSafeZone, TIKTOK_SAFE_ZONE, type SafeZoneGeometry } from "./safe-zone";

export interface ThumbnailRequest {
  title: string;
  category?: string;
  subtitle?: string;
  accentColor?: string;
  profile?: string;
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
  const accentColor = options.accentColor || "#FFD700";
  const maxWidth = Math.min(sz.W_SAFE, 760);
  const centerX = sz.CENTER_X; // 480 for TikTok

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
      const y = 880 + (i - (displayLines.length - 1) / 2) * lineHeight;
      const isGold =
        i === 0 ||
        line.includes("АЛЛАХ") ||
        line.includes("КОРАН") ||
        line.includes("РАЙ") ||
        line.includes("ALLAH") ||
        line.includes("QURAN");
      const color = isGold ? accentColor : "#FFFFFF";
      return `<text x="${centerX}" y="${y}" font-family="Arial, sans-serif" font-weight="900" font-size="${fontSize}" fill="${color}" text-anchor="middle" letter-spacing="-1">${escapeXml(line)}</text>`;
    })
    .join("\n");

  const svg = `
<svg width="${sz.W}" height="${sz.H}" viewBox="0 0 ${sz.W} ${sz.H}" xmlns="http://www.w3.org/2000/svg">
  <!-- Semi-transparent overlay to make text readable over any image -->
  <rect width="${sz.W}" height="${sz.H}" fill="#000000" fill-opacity="0.45"/>

  <!-- Main Viral Title -->
  ${titleSvgLines}
</svg>`;

  return { svg, fontSize, lines: displayLines, centerX, maxLineWidth };
}

export const generateViralThumbnail = createServerFn({ method: "POST" })
  .validator((input: ThumbnailRequest) => {
    return {
      title: input.title || "Ислямска Мъдрост",
      category: input.category || "СВЕЩЕН ХАДИС • TIKTOK VIRAL",
      subtitle: input.subtitle || "ISLAMIC REELS STUDIO",
      accentColor: input.accentColor || "#FFD700",
      profile: input.profile || "tiktok",
    };
  })
  .handler(async ({ data }): Promise<{ base64: string; dataUrl: string }> => {
    const finalTitle = data.title.toUpperCase();
    const { svg } = buildViralThumbnailSvg({
      title: finalTitle,
      accentColor: data.accentColor,
      profile: data.profile,
    });

    let jpgBuf: Buffer;

    try {
      const apiKey = process.env.PEXELS_API_KEY;
      if (!apiKey) throw new Error("No Pexels API Key");

      const photos = await pexelsPhotoQuery(apiKey, finalTitle, 15);
      if (photos && photos.length > 0) {
        const randomPhoto = photos[Math.floor(Math.random() * Math.min(5, photos.length))];
        const res = await fetch(randomPhoto.src.large2x);
        if (!res.ok) throw new Error("Failed to fetch image");
        const photoBuffer = Buffer.from(await res.arrayBuffer());

        jpgBuf = await sharp(photoBuffer)
          .resize(1080, 1920, { fit: "cover", position: "center" })
          .composite([{ input: Buffer.from(svg), gravity: "center" }])
          .jpeg({ quality: 92, mozjpeg: true })
          .toBuffer();
      } else {
        throw new Error("No photos found");
      }
    } catch (err) {
      console.error(
        "Failed to generate pexels thumbnail background, falling back to basic overlay",
        err,
      );
      // Fallback: render SVG with a solid background if fetching Pexels fails
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
  });
