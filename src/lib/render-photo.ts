// Client-side TikTok-format photo renderer. Composites background + (optional)
// Arabic + Bulgarian translation + reference badge onto a 1080x1920 canvas,
// returns a PNG blob. The Bulgarian block auto-fits to the safe area so the
// translation never spills off-screen, regardless of length.

import {
  getSafeZone,
  REFERENCE_PILL_STANDARDS,
  clampToSafeZone,
  type SafeZoneGeometry,
} from "./safe-zone";

export type RenderOptions = {
  backgroundUrl?: string | null;
  arabic?: string;
  bulgarian: string;
  reference: string;
  style: "minimal" | "centered" | "lower-third" | "bottom";
  tiktokTheme?: "hormozi" | "gold" | "emerald" | "neon" | "classic" | "fire" | "box";
  pacingMode?: "punchy" | "ayah";
  subtitlePosition?: "tiktok" | "reels" | "shorts" | "center";
  subtitleSlicingMode?: "phrase" | "single";
  customKeywords?: string[];
};

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Не успях да заредя фоновото изображение"));
    img.src = src;
  });
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, W: number, H: number) {
  const r = Math.max(W / img.width, H / img.height);
  const w = img.width * r;
  const h = img.height * r;
  ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
}

export function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const lines: string[] = [];
  let line = "";

  for (const w of words) {
    // If a single unbroken word exceeds maxWidth, break it into character chunks
    if (ctx.measureText(w).width > maxWidth) {
      if (line) {
        lines.push(line);
        line = "";
      }
      let chunk = "";
      for (const char of w) {
        if (ctx.measureText(chunk + char).width > maxWidth && chunk) {
          lines.push(chunk);
          chunk = char;
        } else {
          chunk += char;
        }
      }
      if (chunk) line = chunk;
      continue;
    }

    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }

  if (line) lines.push(line);

  // Avoid an orphan last line (<40% width of previous) — pull a word down.
  if (lines.length >= 2) {
    const last = lines[lines.length - 1];
    const prev = lines[lines.length - 2];
    if (ctx.measureText(last).width < ctx.measureText(prev).width * 0.4) {
      const prevWords = prev.split(" ");
      if (prevWords.length > 2) {
        const moved = prevWords.pop()!;
        const newPrev = prevWords.join(" ");
        const newLast = `${moved} ${last}`;
        if (
          ctx.measureText(newPrev).width <= maxWidth &&
          ctx.measureText(newLast).width <= maxWidth
        ) {
          lines[lines.length - 2] = newPrev;
          lines[lines.length - 1] = newLast;
        }
      }
    }
  }

  return lines;
}

/**
 * Find the largest font that fits `text` into the available bounding box.
 * Returns the font size, wrapped lines, lineHeight, and total block height.
 */
export function autoFit(
  ctx: CanvasRenderingContext2D,
  text: string,
  family: string,
  weight: number,
  maxWidth: number,
  maxHeight: number,
  range: { min: number; max: number },
  lineHeightRatio = 1.32,
): { fontSize: number; lines: string[]; lineHeight: number; totalHeight: number } {
  for (let size = range.max; size >= range.min; size -= 2) {
    ctx.font = `${weight} ${size}px ${family}`;
    const lines = wrap(ctx, text, maxWidth);
    const lh = Math.round(size * lineHeightRatio);
    const totalHeight = lines.length * lh;
    if (totalHeight <= maxHeight) {
      return { fontSize: size, lines, lineHeight: lh, totalHeight };
    }
  }
  // Fallback at min size to guarantee readability and bounded layout
  const size = range.min;
  ctx.font = `${weight} ${size}px ${family}`;
  const lines = wrap(ctx, text, maxWidth);
  const lh = Math.round(size * lineHeightRatio);
  return { fontSize: size, lines, lineHeight: lh, totalHeight: lines.length * lh };
}

function drawReferencePill(ctx: CanvasRenderingContext2D, text: string, sz: SafeZoneGeometry) {
  const fontSize = REFERENCE_PILL_STANDARDS.FONT_SIZE;
  const padX = REFERENCE_PILL_STANDARDS.PAD_X;
  const padY = REFERENCE_PILL_STANDARDS.PAD_Y;

  ctx.font = `500 ${fontSize}px 'Inter', system-ui, sans-serif`;
  const tw = ctx.measureText(text).width;
  const pillW = Math.min(tw + padX * 2, sz.W_SAFE);
  const pillH = fontSize + padY * 2; // 56px

  const rawX = sz.CENTER_X - pillW / 2;
  const rawY = sz.SAFE_TOP; // 300px

  const clamped = clampToSafeZone({ x: rawX, y: rawY, width: pillW, height: pillH }, sz);

  // Glass-gold capsule
  ctx.save();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  roundRect(ctx, clamped.x, clamped.y, clamped.width, clamped.height, clamped.height / 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(212, 175, 55, 0.65)";
  ctx.lineWidth = 1.5;
  roundRect(ctx, clamped.x, clamped.y, clamped.width, clamped.height, clamped.height / 2);
  ctx.stroke();

  ctx.fillStyle = "#f4c95d";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, clamped.x + clamped.width / 2, clamped.y + clamped.height / 2 + 1);
  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawText(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  yTop: number,
  lineHeight: number,
  fill: string,
  centerX: number,
) {
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 2;
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(0,0,0,0.45)";
  ctx.lineWidth = 2;

  const baselineOffset = Math.round(lineHeight * 0.75);

  lines.forEach((ln, i) => {
    const y = yTop + i * lineHeight + baselineOffset;
    ctx.strokeText(ln, centerX, y);
    ctx.fillStyle = fill;
    ctx.fillText(ln, centerX, y);
  });
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
}

export async function renderPhoto(opts: RenderOptions): Promise<Blob> {
  try {
    await Promise.all([
      document.fonts.load("600 64px 'Amiri'"),
      document.fonts.load("700 72px 'Cormorant Garamond'"),
      document.fonts.load("500 28px 'Inter'"),
    ]);
  } catch {
    /* best-effort font loading */
  }

  const sz = getSafeZone(opts.subtitlePosition || "tiktok");
  const W = sz.W;
  const H = sz.H;
  const maxW = sz.W_SAFE;
  const centerX = sz.CENTER_X;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Background
  if (opts.backgroundUrl) {
    try {
      const img = await loadImage(opts.backgroundUrl);
      drawCover(ctx, img, W, H);
    } catch {
      ctx.fillStyle = "#0d2a24";
      ctx.fillRect(0, 0, W, H);
    }
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#0d2a24");
    g.addColorStop(1, "#1a4d3e");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // Soft vignette + top/bottom darkening for legibility
  const ov = ctx.createLinearGradient(0, 0, 0, H);
  ov.addColorStop(0, "rgba(0,0,0,0.55)");
  ov.addColorStop(0.5, "rgba(0,0,0,0.18)");
  ov.addColorStop(1, "rgba(0,0,0,0.78)");
  ctx.fillStyle = ov;
  ctx.fillRect(0, 0, W, H);

  const vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.7);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);

  // Corner accents (skipped on minimal style)
  if (opts.style !== "minimal") {
    ctx.strokeStyle = "rgba(212,175,55,0.55)";
    ctx.lineWidth = 2;
    const m = 80;
    const cl = 70;
    ctx.beginPath();
    ctx.moveTo(m, m + cl);
    ctx.lineTo(m, m);
    ctx.lineTo(m + cl, m);
    ctx.moveTo(W - m - cl, m);
    ctx.lineTo(W - m, m);
    ctx.lineTo(W - m, m + cl);
    ctx.moveTo(m, H - m - cl);
    ctx.lineTo(m, H - m);
    ctx.lineTo(m + cl, H - m);
    ctx.moveTo(W - m - cl, H - m);
    ctx.lineTo(W - m, H - m);
    ctx.lineTo(W - m, H - m - cl);
    ctx.stroke();
  }

  // Draw Reference Pill at safe top (Y = 300px, H = 56px)
  if (opts.reference) {
    drawReferencePill(ctx, opts.reference, sz);
  }

  // Content start Y coordinate below Reference Pill
  const contentTopMinY = opts.reference
    ? sz.SAFE_TOP + 56 + REFERENCE_PILL_STANDARDS.MIN_VERTICAL_GAP
    : sz.SAFE_TOP; // 380px if reference present

  // Arabic Verse Anchoring
  let arabicBlock: {
    lines: string[];
    lineHeight: number;
    fontSize: number;
    totalHeight: number;
  } | null = null;

  if (opts.arabic && opts.style !== "minimal") {
    const arabicMaxH = Math.min(H * 0.28, sz.H_SAFE * 0.35);
    arabicBlock = autoFit(
      ctx,
      opts.arabic,
      "'Amiri', 'Scheherazade New', serif",
      600,
      maxW,
      arabicMaxH,
      { min: 32, max: 64 },
      1.4,
    );
  }

  const arabicBottomY = arabicBlock ? contentTopMinY + arabicBlock.totalHeight : contentTopMinY;

  // Available vertical space for Bulgarian translation
  const minGapBetweenArabicAndBg = 32;
  const bgStartMinY = arabicBlock ? arabicBottomY + minGapBetweenArabicAndBg : contentTopMinY;
  const availableBgHeight = Math.max(0, sz.BOTTOM_MAX_Y - bgStartMinY);

  const cleanBulgarian = opts.bulgarian.replace(/<[^>]+>/g, "").trim();
  const bg = autoFit(
    ctx,
    cleanBulgarian,
    "'Cormorant Garamond', Georgia, serif",
    700,
    maxW,
    availableBgHeight,
    { min: 24, max: 84 },
    1.32,
  );

  // Layout Rendering
  if (opts.style === "lower-third" || opts.style === "bottom") {
    if (arabicBlock) {
      ctx.font = `600 ${arabicBlock.fontSize}px 'Amiri', 'Scheherazade New', serif`;
      ctx.direction = "rtl";
      drawText(ctx, arabicBlock.lines, contentTopMinY, arabicBlock.lineHeight, "#fff", centerX);
      ctx.direction = "ltr";
    }

    ctx.font = `700 ${bg.fontSize}px 'Cormorant Garamond', Georgia, serif`;
    let bgTopY = sz.BOTTOM_MAX_Y - bg.totalHeight;
    if (arabicBlock && bgTopY < arabicBottomY + minGapBetweenArabicAndBg) {
      bgTopY = arabicBottomY + minGapBetweenArabicAndBg;
    }
    drawText(ctx, bg.lines, bgTopY, bg.lineHeight, "#fff", centerX);
  } else if (opts.style === "minimal") {
    ctx.font = `700 ${bg.fontSize}px 'Cormorant Garamond', Georgia, serif`;
    const bgTopY = bgStartMinY + Math.max(0, Math.round((availableBgHeight - bg.totalHeight) / 2));
    drawText(ctx, bg.lines, bgTopY, bg.lineHeight, "#fff", centerX);
  } else {
    // Centered style
    if (arabicBlock) {
      ctx.font = `600 ${arabicBlock.fontSize}px 'Amiri', 'Scheherazade New', serif`;
      ctx.direction = "rtl";
      drawText(ctx, arabicBlock.lines, contentTopMinY, arabicBlock.lineHeight, "#fff", centerX);
      ctx.direction = "ltr";

      ctx.font = `700 ${bg.fontSize}px 'Cormorant Garamond', Georgia, serif`;
      const remHeight = sz.BOTTOM_MAX_Y - arabicBottomY;
      const idealGap = Math.round((remHeight - bg.totalHeight) / 2);
      const extraGap = Math.max(minGapBetweenArabicAndBg, idealGap);
      const bgTopY = Math.min(arabicBottomY + extraGap, sz.BOTTOM_MAX_Y - bg.totalHeight);
      drawText(ctx, bg.lines, bgTopY, bg.lineHeight, "#fff", centerX);
    } else {
      ctx.font = `700 ${bg.fontSize}px 'Cormorant Garamond', Georgia, serif`;
      const bgTopY =
        bgStartMinY + Math.max(0, Math.round((availableBgHeight - bg.totalHeight) / 2));
      drawText(ctx, bg.lines, bgTopY, bg.lineHeight, "#fff", centerX);
    }
  }

  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png"),
  );
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result);
      const i = s.indexOf(",");
      resolve(i >= 0 ? s.slice(i + 1) : s);
    };
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}
