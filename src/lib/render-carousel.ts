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

function drawTextLine(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, font: string, fillStyle: string) {
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

  const maxW = W - 100;

  // TOP TITLE
  ctx.font = fontTop;
  const titleLines = [];
  for (const raw of opts.topTitle.trim().split("\n")) {
    titleLines.push(...wrap(ctx, raw, maxW));
  }
  titleLines.forEach((line, i) => {
    const y = 280 + (i * 90);
    drawTextLine(ctx, line, W/2, y, fontTop, "#f3d179");
  });

  // MAIN TEXT
  ctx.font = fontMain;
  const mainLines = [];
  for (const raw of opts.mainText.trim().split("\n")) {
    mainLines.push(...wrap(ctx, raw, maxW));
  }
  const mainStartY = 1000 - ((mainLines.length * 80) / 2);
  mainLines.forEach((line, i) => {
    const y = mainStartY + (i * 80);
    drawTextLine(ctx, line, W/2, y, fontMain, "#ffedb3");
  });

  // BOTTOM TEXT
  ctx.font = fontBottom;
  const bottomLines = [];
  for (const raw of opts.bottomText.trim().split("\n")) {
    bottomLines.push(...wrap(ctx, raw, maxW));
  }
  const bottomStartY = 1550 - ((bottomLines.length * 60) / 2);
  bottomLines.forEach((line, i) => {
    const y = bottomStartY + (i * 60);
    drawTextLine(ctx, line, W/2, y, fontBottom, "#f3d179");
  });

  // FOOTER TEXT
  ctx.font = fontFooter;
  const footerLines = [];
  for (const raw of opts.footerText.trim().split("\n")) {
    footerLines.push(...wrap(ctx, raw, maxW));
  }
  footerLines.forEach((line, i) => {
    const y = 1780 + (i * 45);
    drawTextLine(ctx, line, W/2, y, fontFooter, "#d1b366");
  });

  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png")
  );
}
