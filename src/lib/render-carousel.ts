export const TIKTOK_SAFE_ZONE = {
  W: 1080,
  H: 1920,
  SAFE_TOP: 300,
  SAFE_BOTTOM: 400,
  SAFE_LEFT: 100,
  SAFE_RIGHT: 220,
  get W_SAFE() {
    return this.W - this.SAFE_LEFT - this.SAFE_RIGHT; // 760px
  },
  get H_SAFE() {
    return this.H - this.SAFE_TOP - this.SAFE_BOTTOM; // 1220px
  },
  get CENTER_X() {
    return this.SAFE_LEFT + this.W_SAFE / 2; // 480px
  },
};

export type CarouselSlideOptions = {
  backgroundUrl: string;
  topTitle: string;
  mainText: string;
  bottomText: string;
  footerText?: string;
  quoteText?: string;
  commentaryText?: string;
};

export interface TextSegment {
  type: "sacred" | "human";
  text: string;
}

export interface SlideSegments {
  isQuoteSlide: boolean;
  segments: TextSegment[];
}

export function stripEmojis(text: string): string {
  if (!text) return "";
  return text
    .replace(
      /[\p{Extended_Pictographic}\p{Emoji_Presentation}\u2728\u2B50\u2600-\u26FF\u2700-\u27BF]/gu,
      "",
    )
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Intelligent text-wrapping with orphan word elimination.
 */
export function wrapIntelligent(
  measureFn: (text: string) => number,
  rawText: string,
  maxWidth: number,
): string[] {
  const clean = stripEmojis(rawText).trim();
  if (!clean) return [];

  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const lines: string[] = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const candidate = currentLine + " " + word;
    if (measureFn(candidate) <= maxWidth) {
      currentLine = candidate;
    } else {
      lines.push(currentLine.trim());
      currentLine = word;
    }
  }
  if (currentLine.trim()) {
    lines.push(currentLine.trim());
  }

  // Orphan word elimination:
  if (lines.length >= 2) {
    const lastLine = lines[lines.length - 1];
    const prevLine = lines[lines.length - 2];
    const lastWords = lastLine.split(/\s+/);
    const prevWords = prevLine.split(/\s+/);

    if (lastWords.length === 1 && prevWords.length >= 3) {
      const stolenWord = prevWords.pop()!;
      const newPrev = prevWords.join(" ");
      const newLast = stolenWord + " " + lastLine;
      if (measureFn(newLast) <= maxWidth) {
        lines[lines.length - 2] = newPrev;
        lines[lines.length - 1] = newLast;
      }
    }
  }

  return lines;
}

/**
 * Parse slide text segments to extract sacred quote vs human commentary.
 */
export function parseSlideSegments(opts: CarouselSlideOptions): SlideSegments {
  const segments: TextSegment[] = [];

  if (opts.quoteText && opts.quoteText.trim()) {
    segments.push({ type: "sacred", text: opts.quoteText.trim() });
    if (opts.commentaryText && opts.commentaryText.trim()) {
      segments.push({ type: "human", text: opts.commentaryText.trim() });
    }
    return { isQuoteSlide: true, segments };
  }

  const raw = (opts.mainText || "").trim();
  if (!raw) {
    return { isQuoteSlide: false, segments: [] };
  }

  // Split by quotes „...“ or «...» or "..."
  const regex = /([„«"“][\s\S]+?[”»"“])/g;
  const parts = raw.split(regex);
  
  let hasSacred = false;

  for (const part of parts) {
    if (!part.trim()) continue;
    if (part.match(/^[„«"“][\s\S]+?[”»"“]$/)) {
      segments.push({ type: "sacred", text: part.trim() });
      hasSacred = true;
    } else {
      segments.push({ type: "human", text: part.trim() });
    }
  }

  // If there are no quotes, treat as one human block unless the title implies it's a quote
  if (!hasSacred) {
    if (
      opts.topTitle.includes("Коран") ||
      opts.topTitle.includes("Хадис") ||
      opts.topTitle.includes("Сура") ||
      opts.topTitle.startsWith("[")
    ) {
      return {
        isQuoteSlide: true,
        segments: [{ type: "sacred", text: raw }],
      };
    }
    return {
      isQuoteSlide: false,
      segments: [{ type: "human", text: raw }],
    };
  }

  return {
    isQuoteSlide: true,
    segments,
  };
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

function drawTextLine(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  font: string,
  fillStyle: string,
  isGlow = false,
) {
  text = stripEmojis(text);
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.shadowColor = isGlow ? "rgba(243, 209, 121, 0.45)" : "rgba(0, 0, 0, 0.9)";
  ctx.shadowBlur = isGlow ? 22 : 16;
  ctx.shadowOffsetY = 4;

  ctx.lineJoin = "round";
  ctx.lineWidth = 6;
  ctx.strokeStyle = "rgba(0, 0, 0, 0.85)";
  ctx.strokeText(text, x, y);

  ctx.fillStyle = fillStyle;
  ctx.fillText(text, x, y);

  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
}

export interface LayoutSegment {
  type: "sacred" | "human";
  lines: string[];
  font: string;
  lh: number;
  color: string;
}

export function computeSlideLayout(
  ctx: CanvasRenderingContext2D,
  opts: CarouselSlideOptions,
  scale: number,
) {
  const maxWidth = TIKTOK_SAFE_ZONE.W_SAFE;
  const parsed = parseSlideSegments(opts);

  const fontTop = `800 ${Math.round(54 * scale)}px 'Montserrat', sans-serif`;
  const lhTop = Math.round(68 * scale);

  const fontQuote = `800 ${Math.round(60 * scale)}px 'Montserrat', sans-serif`;
  const lhQuote = Math.round(76 * scale);

  const fontCommentary = `500 ${Math.round(46 * scale)}px 'Montserrat', sans-serif`;
  const lhCommentary = Math.round(62 * scale);

  const fontBottom = `700 ${Math.round(48 * scale)}px 'Montserrat', sans-serif`;
  const lhBottom = Math.round(64 * scale);

  const gapTopToBody = Math.round(44 * scale);
  const gapBetweenSegments = Math.round(52 * scale);
  const gapBodyToBottom = Math.round(44 * scale);

  ctx.font = fontTop;
  const topLines = wrapIntelligent((t) => ctx.measureText(t).width, opts.topTitle || "", maxWidth);

  const layoutSegments: LayoutSegment[] = [];
  let bodyH = 0;

  for (const seg of parsed.segments) {
    if (seg.type === "sacred") {
      ctx.font = fontQuote;
      const lines = wrapIntelligent((t) => ctx.measureText(t).width, seg.text, maxWidth);
      layoutSegments.push({ type: "sacred", lines, font: fontQuote, lh: lhQuote, color: "#F3D179" });
      bodyH += lines.length * lhQuote;
    } else {
      ctx.font = fontCommentary;
      const lines = wrapIntelligent((t) => ctx.measureText(t).width, seg.text, maxWidth);
      layoutSegments.push({ type: "human", lines, font: fontCommentary, lh: lhCommentary, color: "#FFFFFF" });
      bodyH += lines.length * lhCommentary;
    }
  }

  if (layoutSegments.length > 1) {
    bodyH += (layoutSegments.length - 1) * gapBetweenSegments;
  }

  ctx.font = fontBottom;
  const bottomLines = wrapIntelligent(
    (t) => ctx.measureText(t).width,
    opts.bottomText || "",
    maxWidth,
  );

  const topH = topLines.length * lhTop;
  const bottomH = bottomLines.length * lhBottom;

  let totalH = topH;
  if (topH > 0 && bodyH > 0) totalH += gapTopToBody;
  totalH += bodyH;
  if (bodyH > 0 && bottomH > 0) totalH += gapBodyToBottom;
  totalH += bottomH;

  return {
    scale,
    parsed,
    topLines,
    lhTop,
    fontTop,
    layoutSegments,
    bottomLines,
    lhBottom,
    fontBottom,
    gapTopToBody,
    gapBetweenSegments,
    gapBodyToBottom,
    topH,
    bodyH,
    bottomH,
    totalH,
  };
}

export async function renderCarouselSlide(opts: CarouselSlideOptions): Promise<Blob> {
  try {
    await document.fonts.load("700 60px 'Montserrat', sans-serif");
  } catch {
    /* best-effort font loading */
  }

  const W = TIKTOK_SAFE_ZONE.W;
  const H = TIKTOK_SAFE_ZONE.H;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  try {
    const img = await loadImage(opts.backgroundUrl);
    const imgRatio = img.width / img.height;
    const canvasRatio = W / H;
    let sx = 0,
      sy = 0,
      sw = img.width,
      sh = img.height;
    if (imgRatio > canvasRatio) {
      sw = img.height * canvasRatio;
      sx = (img.width - sw) / 2;
    } else {
      sh = img.width / canvasRatio;
      sy = (img.height - sh) / 2;
    }
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
  } catch {
    ctx.fillStyle = "#111827";
    ctx.fillRect(0, 0, W, H);
  }

  // Dark gradient overlay to guarantee text legibility
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "rgba(0, 0, 0, 0.65)");
  grad.addColorStop(0.5, "rgba(0, 0, 0, 0.35)");
  grad.addColorStop(1, "rgba(0, 0, 0, 0.85)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Dynamic auto-fit font scaling
  let scale = 1.0;
  let layout = computeSlideLayout(ctx, opts, scale);

  if (layout.totalH > TIKTOK_SAFE_ZONE.H_SAFE) {
    scale = Math.max(0.6, (TIKTOK_SAFE_ZONE.H_SAFE / layout.totalH) * 0.95);
    layout = computeSlideLayout(ctx, opts, scale);

    while (layout.totalH > TIKTOK_SAFE_ZONE.H_SAFE && scale > 0.55) {
      scale -= 0.05;
      layout = computeSlideLayout(ctx, opts, scale);
    }
  }

  const centerX = TIKTOK_SAFE_ZONE.CENTER_X; 
  let currentY =
    TIKTOK_SAFE_ZONE.SAFE_TOP + Math.max(0, (TIKTOK_SAFE_ZONE.H_SAFE - layout.totalH) / 2);

  // 1. Draw Top Title (Gold)
  layout.topLines.forEach((line) => {
    drawTextLine(ctx, line, centerX, currentY + layout.lhTop / 2, layout.fontTop, "#F3D179");
    currentY += layout.lhTop;
  });
  if (layout.topH > 0 && layout.bodyH > 0) {
    currentY += layout.gapTopToBody;
  }

  // 2. Draw Body Segments (Alternating Gold/White with intervals)
  for (let i = 0; i < layout.layoutSegments.length; i++) {
    const seg = layout.layoutSegments[i];
    const isGlow = seg.type === "sacred";
    
    seg.lines.forEach((line) => {
      drawTextLine(
        ctx,
        line,
        centerX,
        currentY + seg.lh / 2,
        seg.font,
        seg.color,
        isGlow
      );
      currentY += seg.lh;
    });

    // Add interval between segments
    if (i < layout.layoutSegments.length - 1) {
      currentY += layout.gapBetweenSegments;
    }
  }

  if (layout.bodyH > 0 && layout.bottomH > 0) {
    currentY += layout.gapBodyToBottom;
  }

  // 3. Draw Bottom CTA (Gold accent)
  layout.bottomLines.forEach((line) => {
    drawTextLine(
      ctx,
      line,
      centerX,
      currentY + layout.lhBottom / 2,
      layout.fontBottom,
      "#F3D179",
    );
    currentY += layout.lhBottom;
  });

  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png"),
  );
}
