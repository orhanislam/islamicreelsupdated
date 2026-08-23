const W = 1080;
const H = 1920;

export type CarouselSlideOptions = {
  backgroundUrl: string;
  topTitle: string;
  mainText: string;
  bottomText: string;
  footerText: string;
};

// Helper for wrapping text
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = words[0] || "";

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + " " + word).width;
    if (width < maxWidth) {
      currentLine += " " + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function stripEmojis(text: string) {
  if (!text) return text;
  return text.replace(/[\p{Extended_Pictographic}\p{Emoji_Presentation}\u2728\u2B50\u2600-\u26FF\u2700-\u27BF]/gu, '').replace(/\s+/g, ' ').trim();
}

function drawTextLine(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, font: string, fillStyle: string) {
  text = stripEmojis(text);
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  
  ctx.shadowColor = "rgba(0,0,0,0.8)";
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 4;
  
  ctx.lineJoin = "round";
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(0,0,0,0.6)";
  ctx.strokeText(text, x, y);
  
  ctx.fillStyle = fillStyle;
  ctx.fillText(text, x, y);

  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
}

export async function renderCarouselSlide(opts: CarouselSlideOptions): Promise<Blob> {
  try {
    // Attempt to load some standard system fonts or wait for a webfont. 
    // We will use Montserrat if available, else fallback to sans-serif.
    await document.fonts.load("700 60px 'Montserrat', sans-serif");
  } catch { /* best-effort */ }

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  try {
    const img = await loadImage(opts.backgroundUrl);
    
    // Draw cover
    const imgRatio = img.width / img.height;
    const canvasRatio = W / H;
    let sx = 0, sy = 0, sw = img.width, sh = img.height;
    if (imgRatio > canvasRatio) {
      sw = img.height * canvasRatio;
      sx = (img.width - sw) / 2;
    } else {
      sh = img.width / canvasRatio;
      sy = (img.height - sh) / 2;
    }
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
  } catch {
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, W, H);
  }

  // Dark gradient overlay
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "rgba(0,0,0,0.5)");
  grad.addColorStop(0.5, "rgba(0,0,0,0.2)");
  grad.addColorStop(1, "rgba(0,0,0,0.8)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Define fonts (using fallback standard fonts as well)
  const fontTop = "800 85px 'Montserrat', sans-serif";
  const fontMain = "700 65px 'Montserrat', sans-serif";
  const fontBottom = "700 50px 'Montserrat', sans-serif";
  const fontFooter = "500 40px 'Montserrat', sans-serif";

  const maxW = 820;

  // 1. Gather all lines
  ctx.font = fontTop;
  const titleLines: string[] = [];
  for (const raw of opts.topTitle.trim().split("\n")) {
    if (raw) titleLines.push(...wrap(ctx, raw, maxW));
  }

  ctx.font = fontMain;
  const mainLines: string[] = [];
  for (const raw of opts.mainText.trim().split("\n")) {
    if (raw) mainLines.push(...wrap(ctx, raw, maxW));
  }

  ctx.font = fontBottom;
  const bottomLines: string[] = [];
  for (const raw of opts.bottomText.trim().split("\n")) {
    if (raw) bottomLines.push(...wrap(ctx, raw, maxW));
  }

  // 2. Calculate heights and gaps
  const lhTitle = 95;
  const lhMain = 85;
  const lhBottom = 65;
  const gapTitleMain = 80;
  const gapMainBottom = 60;

  const titleH = titleLines.length * lhTitle;
  const mainH = mainLines.length * lhMain;
  const bottomH = bottomLines.length * lhBottom;

  let totalH = titleH + mainH + bottomH;
  if (titleH > 0 && mainH > 0) totalH += gapTitleMain;
  if (mainH > 0 && bottomH > 0) totalH += gapMainBottom;

  // Shift center to the left to avoid TikTok right-side buttons (likes, shares)
  const centerX = (W / 2) - 40;
  
  // Start drawing from dynamically centered Y
  let currentY = (H - totalH) / 2 - 50;

  // 3. Draw
  titleLines.forEach(line => {
    drawTextLine(ctx, line, centerX, currentY + (lhTitle / 2), fontTop, "#f3d179");
    currentY += lhTitle;
  });
  if (titleH > 0 && mainH > 0) currentY += gapTitleMain;

  mainLines.forEach(line => {
    drawTextLine(ctx, line, centerX, currentY + (lhMain / 2), fontMain, "#ffedb3");
    currentY += lhMain;
  });
  if (mainH > 0 && bottomH > 0) currentY += gapMainBottom;

  bottomLines.forEach(line => {
    drawTextLine(ctx, line, centerX, currentY + (lhBottom / 2), fontBottom, "#f3d179");
    currentY += lhBottom;
  });

  /* Footer text removed per user request */

  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png")
  );
}
