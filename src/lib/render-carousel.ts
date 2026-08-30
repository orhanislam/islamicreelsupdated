import { TIKTOK_SAFE_ZONE, type SafeZoneGeometry } from "./safe-zone";
export { TIKTOK_SAFE_ZONE, type SafeZoneGeometry };

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
  quoteText?: string;
  commentaryText?: string;
  normalText?: string;
}

export function stripEmojis(text: string): string {
  if (!text) return "";
  return text
    .replace(
      /[\p{Extended_Pictographic}\p{Emoji_Presentation}\uFE0F\u200D\u2728\u2B50\u2600-\u26FF\u2700-\u27BF]/gu,
      "",
    )
    .replace(/\s+/g, " ")
    .trim();
}

export function stripOuterQuotes(text: string): string {
  if (!text) return "";
  return text
    .replace(/^[„«"“'‘\s]+|[”»"“'’\s]+$/g, "")
    .trim();
}

function splitOversizedWord(
  word: string,
  measureFn: (t: string) => number,
  maxWidth: number,
): string[] {
  if (measureFn(word) <= maxWidth) return [word];
  const chunks: string[] = [];
  let currentChunk = "";
  for (const char of word) {
    const candidate = currentChunk + char;
    if (measureFn(candidate) <= maxWidth || currentChunk === "") {
      currentChunk = candidate;
    } else {
      chunks.push(currentChunk);
      currentChunk = char;
    }
  }
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  return chunks;
}

/**
 * Intelligent text-wrapping with orphan word elimination and oversized token splitting.
 */
export function wrapIntelligent(
  measureFn: (text: string) => number,
  rawText: string,
  maxWidth: number,
): string[] {
  const clean = stripEmojis(rawText).trim();
  if (!clean) return [];

  const rawWords = clean.split(/\s+/).filter(Boolean);
  if (rawWords.length === 0) return [];

  const words: string[] = [];
  for (const w of rawWords) {
    if (measureFn(w) > maxWidth) {
      words.push(...splitOversizedWord(w, measureFn, maxWidth));
    } else {
      words.push(w);
    }
  }
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
      if (measureFn(newLast) <= maxWidth && measureFn(newPrev) <= maxWidth) {
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

  // Case 1: Explicit quoteText / commentaryText passed in opts
  if (opts.quoteText && opts.quoteText.trim() && stripOuterQuotes(opts.quoteText.trim()).length > 0) {
    const cleanQuote = stripOuterQuotes(opts.quoteText.trim());
    segments.push({ type: "sacred", text: opts.quoteText.trim() });
    let commentary = opts.commentaryText?.trim() || "";
    if (!commentary && opts.mainText) {
      let stripped = opts.mainText.trim();
      if (stripped.includes(opts.quoteText.trim())) {
        stripped = stripped.replace(opts.quoteText.trim(), "").trim();
      } else if (cleanQuote && stripped.includes(cleanQuote)) {
        stripped = stripped.replace(cleanQuote, "").trim();
      }
      stripped = stripped
        .replace(/^[„«"“'‘\s,.:;—–-]+/g, "")
        .replace(/[”»"“'’\s]+$/g, "")
        .trim();
      if (stripped && stripped !== opts.quoteText.trim() && stripped !== cleanQuote) {
        commentary = stripped;
      }
    }
    if (commentary) {
      segments.push({ type: "human", text: commentary });
    }
    return {
      isQuoteSlide: true,
      segments,
      quoteText: cleanQuote,
      commentaryText: commentary,
      normalText: "",
    };
  }

  const raw = (opts.mainText || opts.commentaryText || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
  if (!raw || !/[a-zA-Z\u0400-\u04FF\u0600-\u06FF0-9]/.test(raw)) {
    return { isQuoteSlide: false, segments: [], quoteText: "", commentaryText: "", normalText: "" };
  }

  // Quote pair regex respecting nested quotation styles:
  // 1. Bulgarian „...“ / „..."
  // 2. Guillemets «...»
  // 3. Curly “...” / “..."
  // 4. Straight quotes "..."
  const regex = /(„[\s\S]+?[“"”]|«[\s\S]+?»|“[\s\S]+?[”"]|"[^"\n]+?")/g;
  const parts = raw.split(regex);
  
  let hasSacred = false;

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    // Filter out ghost segments that contain only punctuation / symbols
    if (!/[a-zA-Z\u0400-\u04FF\u0600-\u06FF0-9]/.test(trimmed)) {
      continue;
    }
    if (
      trimmed.match(/^(„[\s\S]+?[“"”]|«[\s\S]+?»|“[\s\S]+?[”"]|"[^"\n]+?")$/) &&
      stripOuterQuotes(trimmed).length > 0
    ) {
      segments.push({ type: "sacred", text: trimmed });
      hasSacred = true;
    } else {
      segments.push({ type: "human", text: trimmed });
    }
  }

  // If there are no quotes, check if topTitle implies quote or if explicit quote keywords exist
  if (!hasSacred) {
    const lowerTitle = (opts.topTitle || "").toLowerCase();
    const isDalilTitle =
      lowerTitle.includes("коран") ||
      lowerTitle.includes("хадис") ||
      lowerTitle.includes("сура") ||
      lowerTitle.includes("аят") ||
      lowerTitle.includes("знамение") ||
      lowerTitle.includes("бухари") ||
      lowerTitle.includes("муслим") ||
      lowerTitle.includes("тирмизи") ||
      lowerTitle.includes("абу дауд") ||
      lowerTitle.includes("насаи") ||
      lowerTitle.includes("ибн маджа") ||
      lowerTitle.includes("quran") ||
      lowerTitle.includes("hadith") ||
      lowerTitle.includes("surah") ||
      lowerTitle.includes("bukhari") ||
      lowerTitle.includes("muslim") ||
      /\b\d+:\d+\b/.test(lowerTitle) ||
      /#\d+\b/.test(lowerTitle);

    if (isDalilTitle) {
      // If double newline separates quote from commentary
      if (raw.includes("\n\n")) {
        const paragraphs = raw.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
        if (paragraphs.length >= 2) {
          const quotePara = paragraphs[0];
          const commentaryPara = paragraphs.slice(1).join("\n\n");
          return {
            isQuoteSlide: true,
            segments: [
              { type: "sacred", text: quotePara },
              { type: "human", text: commentaryPara },
            ],
            quoteText: stripOuterQuotes(quotePara),
            commentaryText: commentaryPara,
            normalText: "",
          };
        }
      }

      return {
        isQuoteSlide: true,
        segments: [{ type: "sacred", text: raw }],
        quoteText: stripOuterQuotes(raw),
        commentaryText: "",
        normalText: "",
      };
    }

    return {
      isQuoteSlide: false,
      segments: [{ type: "human", text: raw }],
      quoteText: "",
      commentaryText: "",
      normalText: raw,
    };
  }

  const sacredTexts = segments
    .filter((s) => s.type === "sacred")
    .map((s) => stripOuterQuotes(s.text))
    .filter(Boolean);
  const humanTexts = segments
    .filter((s) => s.type === "human")
    .map((s) => s.text.trim())
    .filter(Boolean);

  return {
    isQuoteSlide: true,
    segments,
    quoteText: sacredTexts.join("\n\n"),
    commentaryText: humanTexts.join("\n\n"),
    normalText: "",
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
  const sizeMatch = font.match(/(\d+)px/);
  const fontSize = sizeMatch ? parseInt(sizeMatch[1], 10) : 50;
  ctx.lineWidth = Math.max(2, Math.min(6, Math.round(fontSize * 0.1)));
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

export interface SlideLayoutResult {
  scale: number;
  gapScale: number;
  parsed: SlideSegments;
  segments: SlideSegments;
  topLines: string[];
  lhTop: number;
  fontTop: string;
  layoutSegments: LayoutSegment[];
  quoteLines: string[];
  commentaryLines: string[];
  normalLines: string[];
  bottomLines: string[];
  lhBottom: number;
  fontBottom: string;
  lhQuote: number;
  lhCommentary: number;
  gapTopToBody: number;
  gapBetweenSegments: number;
  gapQuoteToCommentary: number;
  gapBodyToBottom: number;
  topH: number;
  bodyH: number;
  bottomH: number;
  totalH: number;
}

export function computeSlideLayout(
  ctx: CanvasRenderingContext2D,
  opts: CarouselSlideOptions,
  scale: number = 1.0,
  gapScale?: number,
): SlideLayoutResult {
  const actualGapScale = typeof gapScale === "number" ? gapScale : scale;
  const maxWidth = TIKTOK_SAFE_ZONE.W_SAFE;
  const parsed = parseSlideSegments(opts);

  const fontTop = `800 ${Math.max(8, Math.round(76 * scale))}px 'Montserrat', sans-serif`;
  const lhTop = Math.max(10, Math.round(92 * scale));

  const fontQuote = `800 ${Math.max(8, Math.round(84 * scale))}px 'Montserrat', sans-serif`;
  const lhQuote = Math.max(10, Math.round(102 * scale));

  const fontCommentary = `500 ${Math.max(8, Math.round(78 * scale))}px 'Montserrat', sans-serif`;
  const lhCommentary = Math.max(10, Math.round(96 * scale));

  const fontBottom = `700 ${Math.max(8, Math.round(68 * scale))}px 'Montserrat', sans-serif`;
  const lhBottom = Math.max(10, Math.round(86 * scale));

  const gapTopToBody = Math.max(0, Math.round(52 * actualGapScale));
  const gapBetweenSegments = Math.max(0, Math.round(64 * actualGapScale));
  const gapBodyToBottom = Math.max(0, Math.round(52 * actualGapScale));

  ctx.font = fontTop;
  const topLines = wrapIntelligent((t) => ctx.measureText(t).width, opts.topTitle || "", maxWidth);

  const layoutSegments: LayoutSegment[] = [];
  let bodyH = 0;

  for (const seg of parsed.segments) {
    if (seg.type === "sacred") {
      ctx.font = fontQuote;
      const lines = wrapIntelligent((t) => ctx.measureText(t).width, seg.text, maxWidth);
      if (lines.length > 0) {
        layoutSegments.push({ type: "sacred", lines, font: fontQuote, lh: lhQuote, color: "#F3D179" });
        bodyH += lines.length * lhQuote;
      }
    } else {
      ctx.font = fontCommentary;
      const lines = wrapIntelligent((t) => ctx.measureText(t).width, seg.text, maxWidth);
      if (lines.length > 0) {
        layoutSegments.push({ type: "human", lines, font: fontCommentary, lh: lhCommentary, color: "#FFFFFF" });
        bodyH += lines.length * lhCommentary;
      }
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
  if (topH > 0 && bodyH > 0) {
    totalH += gapTopToBody;
  } else if (topH > 0 && bottomH > 0) {
    totalH += gapTopToBody;
  }
  totalH += bodyH;
  if (bodyH > 0 && bottomH > 0) {
    totalH += gapBodyToBottom;
  }
  totalH += bottomH;

  const quoteLines = parsed.isQuoteSlide
    ? layoutSegments.filter((s) => s.type === "sacred").flatMap((s) => s.lines)
    : [];
  const commentaryLines = parsed.isQuoteSlide
    ? layoutSegments.filter((s) => s.type === "human").flatMap((s) => s.lines)
    : [];
  const normalLines = !parsed.isQuoteSlide
    ? layoutSegments.flatMap((s) => s.lines)
    : [];

  return {
    scale,
    gapScale: actualGapScale,
    parsed,
    segments: parsed,
    topLines,
    lhTop,
    fontTop,
    layoutSegments,
    quoteLines,
    commentaryLines,
    normalLines,
    bottomLines,
    lhBottom,
    fontBottom,
    lhQuote,
    lhCommentary,
    gapTopToBody,
    gapBetweenSegments,
    gapQuoteToCommentary: gapBetweenSegments,
    gapBodyToBottom,
    topH,
    bodyH,
    bottomH,
    totalH,
  };
}

/**
 * Dynamic auto-fit calculation that iteratively adjusts scale and gap spacing
 * to ensure all text lines and segments strictly fit within H_SAFE (1220px).
 */
export function fitSlideLayout(
  ctx: CanvasRenderingContext2D,
  opts: CarouselSlideOptions,
): SlideLayoutResult {
  const safeH = TIKTOK_SAFE_ZONE.H_SAFE;
  let scale = 1.0;
  let gapScale = 1.0;
  let layout = computeSlideLayout(ctx, opts, scale, gapScale);

  if (layout.totalH <= safeH) {
    return layout;
  }

  const hasMultipleSegments = layout.layoutSegments.length > 1;

  // 1. Proactive multi-segment gap compression to preserve font size (R2)
  if (hasMultipleSegments) {
    gapScale = Math.max(0.35, Math.min(1.0, safeH / layout.totalH));
    layout = computeSlideLayout(ctx, opts, scale, gapScale);
    if (layout.totalH <= safeH) {
      return layout;
    }
  }

  // 2. Initial proactive estimation based on height ratio
  scale = Math.min(1.0, Math.max(0.20, (safeH / layout.totalH) * 0.96));
  gapScale = hasMultipleSegments ? Math.max(0.25, Math.min(gapScale, scale * 0.85)) : scale;
  layout = computeSlideLayout(ctx, opts, scale, gapScale);

  // 3. Fine-tuning loop with dynamic gap balancing
  while (layout.totalH > safeH && (scale > 0.20 || gapScale > 0.10)) {
    if (hasMultipleSegments && gapScale > 0.30 && gapScale > scale * 0.5) {
      gapScale = Math.max(0.15, gapScale - 0.05);
    } else if (scale > 0.30) {
      scale = Math.max(0.25, scale - 0.03);
      gapScale = Math.min(gapScale, scale);
    } else if (gapScale > 0.10) {
      gapScale = Math.max(0.08, gapScale - 0.04);
    } else {
      scale = Math.max(0.15, scale - 0.02);
    }

    layout = computeSlideLayout(ctx, opts, scale, gapScale);
  }

  // 4. Ultimate safety fallback for extreme edge cases (e.g. 20+ segments / 2000+ chars)
  while (layout.totalH > safeH && scale > 0.05) {
    scale = Math.max(0.05, scale - 0.01);
    gapScale = Math.max(0.01, gapScale - 0.01);
    layout = computeSlideLayout(ctx, opts, scale, gapScale);
  }

  return layout;
}

export async function renderCarouselSlide(opts: CarouselSlideOptions): Promise<Blob> {
  if (typeof document !== "undefined" && document?.fonts && typeof document.fonts.load === "function") {
    try {
      await document.fonts.load("800 60px 'Montserrat', sans-serif");
      await document.fonts.load("700 60px 'Montserrat', sans-serif");
      await document.fonts.load("500 46px 'Montserrat', sans-serif");
    } catch {
      /* best-effort font loading */
    }
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

  // Dynamic auto-fit font scaling & gap balancing
  const layout = fitSlideLayout(ctx, opts);

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
  } else if (layout.topH > 0 && layout.bottomH > 0) {
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
