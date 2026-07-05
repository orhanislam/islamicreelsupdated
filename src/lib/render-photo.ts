// Client-side TikTok-format photo renderer. Composites background + (optional)
// Arabic + Bulgarian translation + reference badge onto a 1080x1920 canvas,
// returns a PNG blob. The Bulgarian block auto-fits to the safe area so the
// translation never spills off-screen, regardless of length.

export type RenderOptions = {
  backgroundUrl?: string | null;
  arabic?: string;
  bulgarian: string;
  reference: string;
  style: "minimal" | "centered" | "lower-third";
};

const W = 1080;
const H = 1920;

// TikTok-safe layout. UI overlays sit in the top ~280 and bottom ~360px,
// so we keep all critical text comfortably within these margins.
const SAFE = { top: 320, bottom: 280, side: 180 };

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Не успях да заредя фоновото изображение"));
    img.src = src;
  });
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement) {
  const r = Math.max(W / img.width, H / img.height);
  const w = img.width * r;
  const h = img.height * r;
  ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = test;
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
        lines[lines.length - 2] = prevWords.join(" ");
        lines[lines.length - 1] = `${moved} ${last}`;
      }
    }
  }
  return lines;
}

/**
 * Find the largest font that fits `text` into the available box.
 * Returns the font size and resulting wrapped lines.
 */
function autoFit(
  ctx: CanvasRenderingContext2D,
  text: string,
  family: string,
  weight: number,
  maxWidth: number,
  maxHeight: number,
  range: { min: number; max: number },
  lineHeightRatio = 1.32,
): { fontSize: number; lines: string[]; lineHeight: number } {
  for (let size = range.max; size >= range.min; size -= 2) {
    ctx.font = `${weight} ${size}px ${family}`;
    const lines = wrap(ctx, text, maxWidth);
    const lh = Math.round(size * lineHeightRatio);
    if (lines.length * lh <= maxHeight) {
      return { fontSize: size, lines, lineHeight: lh };
    }
  }
  // Fall through: even at min size — accept overflow but keep min legible size.
  const size = range.min;
  ctx.font = `${weight} ${size}px ${family}`;
  const lines = wrap(ctx, text, maxWidth);
  return { fontSize: size, lines, lineHeight: Math.round(size * lineHeightRatio) };
}

function drawReferencePill(ctx: CanvasRenderingContext2D, text: string) {
  ctx.font = "500 28px 'Inter', system-ui, sans-serif";
  const tw = ctx.measureText(text).width;
  const padX = 28;
  const padY = 14;
  const pillW = tw + padX * 2;
  const pillH = 28 + padY * 2;
  const x = (W - pillW) / 2;
  const y = H - 160 - pillH / 2;
  // Glass-gold capsule
  ctx.save();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  roundRect(ctx, x, y, pillW, pillH, pillH / 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(212, 175, 55, 0.65)";
  ctx.lineWidth = 1.5;
  roundRect(ctx, x, y, pillW, pillH, pillH / 2);
  ctx.stroke();
  ctx.fillStyle = "#f4c95d";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, W / 2, y + pillH / 2 + 1);
  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
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
  yStart: number,
  lineHeight: number,
  fill: string,
) {
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  // soft drop shadow + thin stroke for legibility on any background
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 2;
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(0,0,0,0.45)";
  ctx.lineWidth = 2;
  lines.forEach((ln, i) => {
    const y = yStart + i * lineHeight;
    ctx.strokeText(ln, W / 2, y);
    ctx.fillStyle = fill;
    ctx.fillText(ln, W / 2, y);
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
  } catch { /* best-effort */ }

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // background
  if (opts.backgroundUrl) {
    try {
      const img = await loadImage(opts.backgroundUrl);
      drawCover(ctx, img);
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

  // Subtle corner accents (skipped on minimal)
  if (opts.style !== "minimal") {
    ctx.strokeStyle = "rgba(212,175,55,0.55)";
    ctx.lineWidth = 2;
    const m = 80, cl = 70;
    ctx.beginPath();
    ctx.moveTo(m, m + cl); ctx.lineTo(m, m); ctx.lineTo(m + cl, m);
    ctx.moveTo(W - m - cl, m); ctx.lineTo(W - m, m); ctx.lineTo(W - m, m + cl);
    ctx.moveTo(m, H - m - cl); ctx.lineTo(m, H - m); ctx.lineTo(m + cl, H - m);
    ctx.moveTo(W - m - cl, H - m); ctx.lineTo(W - m, H - m); ctx.lineTo(W - m, H - m - cl);
    ctx.stroke();
  }

  const maxW = W - SAFE.side * 2;

  // Compute Arabic block (if shown) — capped at ~28% of canvas height
  let arabicBlock: { lines: string[]; lineHeight: number; fontSize: number } | null = null;
  if (opts.arabic && opts.style !== "minimal") {
    arabicBlock = autoFit(
      ctx, opts.arabic, "'Amiri', 'Scheherazade New', serif", 600,
      maxW, H * 0.28,
      { min: 36, max: 64 },
      1.4,
    );
  }

  // Bulgarian block: fits in the remaining vertical area between safe top/bottom.
  const verticalForBg =
    H - SAFE.top - SAFE.bottom - (arabicBlock ? arabicBlock.lines.length * arabicBlock.lineHeight + 60 : 0);
  const bg = autoFit(
    ctx, opts.bulgarian, "'Cormorant Garamond', Georgia, serif", 700,
    maxW, Math.max(420, verticalForBg),
    { min: 42, max: 84 },
    1.32,
  );

  // Layout
  if (opts.style === "lower-third") {
    if (arabicBlock) {
      ctx.font = `600 ${arabicBlock.fontSize}px 'Amiri', 'Scheherazade New', serif`;
      ctx.direction = "rtl";
      drawText(ctx, arabicBlock.lines, SAFE.top, arabicBlock.lineHeight, "#fff");
      ctx.direction = "ltr";
    }
    ctx.font = `700 ${bg.fontSize}px 'Cormorant Garamond', Georgia, serif`;
    const block = bg.lines.length * bg.lineHeight;
    drawText(ctx, bg.lines, H - SAFE.bottom - block + bg.lineHeight * 0.75, bg.lineHeight, "#fff");
  } else if (opts.style === "minimal") {
    ctx.font = `700 ${bg.fontSize}px 'Cormorant Garamond', Georgia, serif`;
    const block = bg.lines.length * bg.lineHeight;
    drawText(ctx, bg.lines, (H - block) / 2 + bg.lineHeight * 0.75, bg.lineHeight, "#fff");
  } else {
    // centered: arabic in upper third, Bulgarian middle/lower
    if (arabicBlock) {
      ctx.font = `600 ${arabicBlock.fontSize}px 'Amiri', 'Scheherazade New', serif`;
      ctx.direction = "rtl";
      drawText(ctx, arabicBlock.lines, SAFE.top + arabicBlock.lineHeight * 0.75, arabicBlock.lineHeight, "#fff");
      ctx.direction = "ltr";
    }
    ctx.font = `700 ${bg.fontSize}px 'Cormorant Garamond', Georgia, serif`;
    const yStart = arabicBlock
      ? SAFE.top + arabicBlock.lines.length * arabicBlock.lineHeight + 80 + bg.lineHeight * 0.75
      : H / 2 - (bg.lines.length * bg.lineHeight) / 2 + bg.lineHeight * 0.75;
    drawText(ctx, bg.lines, yStart, bg.lineHeight, "#fff");
  }

  drawReferencePill(ctx, opts.reference);

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
