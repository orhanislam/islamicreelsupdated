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

export interface SlideSegments {
  isQuoteSlide: boolean;
  quoteText?: string;
  commentaryText?: string;
  normalText?: string;
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
  // If the last line contains only 1 word and previous line has >= 3 words, balance lines.
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
  if (opts.quoteText && opts.quoteText.trim()) {
    return {
      isQuoteSlide: true,
      quoteText: opts.quoteText.trim(),
      commentaryText: (opts.commentaryText || "").trim(),
    };
  }

  const raw = (opts.mainText || "").trim();
  if (!raw) {
    return { isQuoteSlide: false, normalText: "" };
  }

  // Check for Bulgarian/European quotes: „...“ or «...» or standard "..."
  const quoteMatch = raw.match(/^[„«"“]([\s\S]+?)[”»"“](?:\s*[\r\n\s]+([\s\S]*))?$/);
  if (quoteMatch) {
    return {
      isQuoteSlide: true,
      quoteText: quoteMatch[1].trim(),
      commentaryText: (quoteMatch[2] || "").trim(),
    };
  }

  const embeddedQuoteMatch = raw.match(/[„«"“]([\s\S]+?)[”»"“]/);
  if (embeddedQuoteMatch && embeddedQuoteMatch.index !== undefined) {
    const quoteText = embeddedQuoteMatch[1].trim();
    const before = raw.slice(0, embeddedQuoteMatch.index).trim();
    const after = raw.slice(embeddedQuoteMatch.index + embeddedQuoteMatch[0].length).trim();
    const commentary = [before, after].filter(Boolean).join(" ").trim();
    if (quoteText.length > 5) {
      return {
        isQuoteSlide: true,
        quoteText,
        commentaryText: commentary,
      };
    }
  }

  if (raw.includes("\n\n")) {
    const parts = raw.split(/\n\n+/);
    if (
      parts.length >= 2 &&
      (opts.topTitle.includes("Коран") ||
        opts.topTitle.includes("Хадис") ||
        opts.topTitle.includes("Сура") ||
        opts.topTitle.startsWith("["))
    ) {
      return {
        isQuoteSlide: true,
        quoteText: parts[0].replace(/^[„«"“]|[”»"“]$/g, "").trim(),
        commentaryText: parts.slice(1).join(" ").trim(),
      };
    }
  }

  return {
    isQuoteSlide: false,
    normalText: raw,
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

export function computeSlideLayout(
  ctx: CanvasRenderingContext2D,
  opts: CarouselSlideOptions,
  scale: number,
) {
  const maxWidth = TIKTOK_SAFE_ZONE.W_SAFE;
  const segments = parseSlideSegments(opts);

  const fontTop = `800 ${Math.round(54 * scale)}px 'Montserrat', sans-serif`;
  const lhTop = Math.round(68 * scale);

  const fontQuote = `800 ${Math.round(60 * scale)}px 'Montserrat', sans-serif`;
  const lhQuote = Math.round(76 * scale);

  const fontCommentary = `500 ${Math.round(46 * scale)}px 'Montserrat', sans-serif`;
  const lhCommentary = Math.round(62 * scale);

  const fontNormal = `700 ${Math.round(60 * scale)}px 'Montserrat', sans-serif`;
  const lhNormal = Math.round(76 * scale);

  const fontBottom = `700 ${Math.round(48 * scale)}px 'Montserrat', sans-serif`;
  const lhBottom = Math.round(64 * scale);

  const gapTopToBody = Math.round(44 * scale);
  const gapQuoteToCommentary = Math.round(52 * scale);
  const gapBodyToBottom = Math.round(44 * scale);

  ctx.font = fontTop;
  const topLines = wrapIntelligent((t) => ctx.measureText(t).width, opts.topTitle || "", maxWidth);

  let quoteLines: string[] = [];
  let commentaryLines: string[] = [];
  let normalLines: string[] = [];

  if (segments.isQuoteSlide) {
    const rawQuote = segments.quoteText || "";
    const qText = rawQuote.startsWith("„") || rawQuote.startsWith("«") ? rawQuote : `„${rawQuote}“`;
    ctx.font = fontQuote;
    quoteLines = wrapIntelligent((t) => ctx.measureText(t).width, qText, maxWidth);

    if (segments.commentaryText) {
      ctx.font = fontCommentary;
      commentaryLines = wrapIntelligent(
        (t) => ctx.measureText(t).width,
        segments.commentaryText,
        maxWidth,
      );
    }
  } else {
    ctx.font = fontNormal;
    normalLines = wrapIntelligent(
      (t) => ctx.measureText(t).width,
      segments.normalText || opts.mainText || "",
      maxWidth,
    );
  }

  ctx.font = fontBottom;
  const bottomLines = wrapIntelligent(
    (t) => ctx.measureText(t).width,
    opts.bottomText || "",
    maxWidth,
  );

  const topH = topLines.length * lhTop;
  let bodyH = 0;
  if (segments.isQuoteSlide) {
    bodyH += quoteLines.length * lhQuote;
    if (commentaryLines.length > 0) {
      bodyH += gapQuoteToCommentary + commentaryLines.length * lhCommentary;
    }
  } else {
    bodyH += normalLines.length * lhNormal;
  }

  const bottomH = bottomLines.length * lhBottom;

  let totalH = topH;
  if (topH > 0 && bodyH > 0) totalH += gapTopToBody;
  totalH += bodyH;
  if (bodyH > 0 && bottomH > 0) totalH += gapBodyToBottom;
  totalH += bottomH;

  return {
    scale,
    segments,
    topLines,
    lhTop,
    fontTop,
    quoteLines,
    lhQuote,
    fontQuote,
    commentaryLines,
    lhCommentary,
    fontCommentary,
    normalLines,
    lhNormal,
    fontNormal,
    bottomLines,
    lhBottom,
    fontBottom,
    gapTopToBody,
    gapQuoteToCommentary,
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

  const centerX = TIKTOK_SAFE_ZONE.CENTER_X; // 480px (safe from right-side TikTok buttons)
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

  // 2. Draw Body
  if (layout.segments.isQuoteSlide) {
    // Sacred Quran/Hadith quote in Radiant Gold
    layout.quoteLines.forEach((line) => {
      drawTextLine(
        ctx,
        line,
        centerX,
        currentY + layout.lhQuote / 2,
        layout.fontQuote,
        "#F3D179",
        true,
      );
      currentY += layout.lhQuote;
    });

    if (layout.commentaryLines.length > 0) {
      currentY += layout.gapQuoteToCommentary;
      // Human commentary in Crisp White
      layout.commentaryLines.forEach((line) => {
        drawTextLine(
          ctx,
          line,
          centerX,
          currentY + layout.lhCommentary / 2,
          layout.fontCommentary,
          "#FFFFFF",
        );
        currentY += layout.lhCommentary;
      });
    }
  } else {
    // Normal body text in Soft Crisp White
    layout.normalLines.forEach((line) => {
      drawTextLine(
        ctx,
        line,
        centerX,
        currentY + layout.lhNormal / 2,
        layout.fontNormal,
        "#FFFFFF",
      );
      currentY += layout.lhNormal;
    });
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
