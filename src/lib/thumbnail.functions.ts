import { createServerFn } from "@tanstack/react-start";
import sharp from "sharp";
import { geminiChat } from "./gemini";

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
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#070a12"/>
      <stop offset="50%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#05070d"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="45%" r="60%">
      <stop offset="0%" stop-color="${data.accentColor}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Luxury Dark Background -->
  <rect width="1080" height="1920" fill="url(#bg)"/>
  <rect width="1080" height="1920" fill="url(#glow)"/>

  <!-- Geometric Luxury Border Frame -->
  <rect x="65" y="110" width="950" height="1700" rx="36" fill="none" stroke="${data.accentColor}" stroke-width="3" stroke-opacity="0.35"/>
  <rect x="85" y="130" width="910" height="1660" rx="28" fill="none" stroke="#FFFFFF" stroke-width="1" stroke-opacity="0.12"/>

  <!-- Top Category Badge -->
  <rect x="290" y="320" width="500" height="74" rx="37" fill="${data.accentColor}" fill-opacity="0.15" stroke="${data.accentColor}" stroke-width="2"/>
  <text x="540" y="367" font-family="Arial, sans-serif" font-weight="800" font-size="28" fill="${data.accentColor}" text-anchor="middle" letter-spacing="4">${esc(data.category.toUpperCase())}</text>

  <!-- Main Viral Title -->
  ${titleSvgLines}

  <!-- Bottom Studio Branding -->
  <line x1="440" y1="1540" x2="640" y2="1540" stroke="${data.accentColor}" stroke-width="4" stroke-linecap="round"/>
  <text x="540" y="1610" font-family="Arial, sans-serif" font-weight="700" font-size="32" fill="#94A3B8" text-anchor="middle" letter-spacing="6">${esc(data.subtitle.toUpperCase())}</text>
</svg>`;

    const jpgBuf = await sharp(Buffer.from(svg))
      .jpeg({ quality: 92, mozjpeg: true })
      .toBuffer();

    const base64 = jpgBuf.toString("base64");
    return {
      base64,
      dataUrl: `data:image/jpeg;base64,${base64}`,
    };
  });
