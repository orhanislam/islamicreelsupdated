import { createServerFn } from "@tanstack/react-start";
import sharp from "sharp";
import { geminiChat } from "./gemini";
import { pexelsPhotoQuery } from "./pexels.functions";

export interface ThumbnailRequest {
  title: string;
  category?: string;
  subtitle?: string;
  accentColor?: string;
}

export const generateViralThumbnail = createServerFn({ method: "POST" })
  .validator((input: ThumbnailRequest) => {
    return {
      title: input.title || "Ислямска Мъдрост",
      category: input.category || "СВЕЩЕН ХАДИС • TIKTOK VIRAL",
      subtitle: input.subtitle || "ISLAMIC REELS STUDIO",
      accentColor: input.accentColor || "#FFD700",
    };
  })
  .handler(async ({ data }): Promise<{ base64: string; dataUrl: string }> => {
    // Enhance boring reference titles into viral titles using AI
    let finalTitle = data.title;
    try {
      const prompt = `Дадено е следното заглавие за ислямско TikTok видео: "${data.title}".
Ако това вече е закачливо изречение (например "Когато Аллах те обича..." или "Търпението е ключът"), върни го АБСОЛЮТНО СЪЩОТО.
Ако обаче е просто суха референция (например "Сура Ал-Фатиха 1:1" или "Сахих Бухари"), генерирай много кратко, емоционално и грабващо вайръл заглавие (2-4 думи) на Български език, което отговаря на същността на този текст.
Върни САМО финалното заглавие, БЕЗ кавички, БЕЗ обяснения, БЕЗ препинателни знаци в края.`;
      
      const aiResponse = await geminiChat("gemini-2.5-flash", [{ role: "user", content: prompt }]);
      if (aiResponse && aiResponse.trim()) {
        finalTitle = aiResponse.replace(/["']/g, "").trim();
      }
    } catch (e) {
      console.error("Failed to enhance thumbnail title", e);
    }

    // Escape XML entities for SVG
    const esc = (str: string) =>
      str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");

    // Split title into 2-3 lines if long
    const words = finalTitle.split(" ");
    const lines: string[] = [];
    let current = "";
    for (const w of words) {
      if ((current + " " + w).length > 22 && current) {
        lines.push(current.trim());
        current = w;
      } else {
        current += " " + w;
      }
    }
    if (current.trim()) lines.push(current.trim());
    const displayLines = lines.slice(0, 4);

    const titleSvgLines = displayLines
      .map((line, i) => {
        const y = 880 + (i - (displayLines.length - 1) / 2) * 110;
        const isGold = i === 0 || line.includes("Аллах") || line.includes("Коран") || line.includes("Рай");
        const color = isGold ? data.accentColor : "#FFFFFF";
        return `<text x="540" y="${y}" font-family="Arial, sans-serif" font-weight="900" font-size="76" fill="${color}" text-anchor="middle" letter-spacing="-1">${esc(line)}</text>`;
      })
      .join("\n");

    const svg = `
<svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">
  <!-- Semi-transparent overlay to make text readable over any image -->
  <rect width="1080" height="1920" fill="#000000" fill-opacity="0.45"/>

  <!-- Main Viral Title -->
  ${titleSvgLines}
</svg>`;

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
      console.error("Failed to generate pexels thumbnail background, falling back to basic overlay", err);
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
