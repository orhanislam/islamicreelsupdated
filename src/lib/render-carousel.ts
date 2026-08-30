import { TIKTOK_SAFE_ZONE, createSafeZone, type SafeZoneGeometry } from "./safe-zone";
export { TIKTOK_SAFE_ZONE, type SafeZoneGeometry };

/**
 * Carousel-specific safe zone — less aggressive than the video safe zone.
 * TikTok carousel images have smaller UI overlays than full-screen videos:
 * - Top: 150px (just the status bar + minimal header)
 * - Bottom: 260px (caption + handle — no audio disk or progress bar)
 * - Left: 80px
 * - Right: 140px (action buttons are smaller on carousel)
 * Gives H_SAFE ~1510px vs the video's 1220px → much more room for text.
 */
const CAROUSEL_SAFE_ZONE: SafeZoneGeometry = createSafeZone({
  W: 1080,
  H: 1920,
  SAFE_TOP: 120,
  SAFE_BOTTOM: 220,
  SAFE_LEFT: 60,
  SAFE_RIGHT: 120,
});

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
  const maxWidth = CAROUSEL_SAFE_ZONE.W_SAFE;
  const parsed = parseSlideSegments(opts);

  const fontTop = `800 ${Math.max(8, Math.round(76 * scale))}px 'Montserrat', sans-serif`;
  const lhTop = Math.max(10, Math.round(92 * scale));

  const fontQuote = `800 ${Math.max(8, Math.round(84 * scale))}px 'Montserrat', sans-serif`;
  const lhQuote = Math.max(10, Math.round(100 * scale));

  const fontCommentary = `500 ${Math.max(8, Math.round(84 * scale))}px 'Montserrat', sans-serif`;
  const lhCommentary = Math.max(10, Math.round(100 * scale));

  const fontBottom = `700 ${Math.max(8, Math.round(68 * scale))}px 'Montserrat', sans-serif`;
  const lhBottom = Math.max(10, Math.round(86 * scale));

  const gapTopToBody = Math.max(0, Math.round(60 * actualGapScale));
  const gapBetweenSegments = Math.max(0, Math.round(90 * actualGapScale));
  const gapBodyToBottom = Math.max(0, Math.round(70 * actualGapScale));

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

  // bottomText is NOT part of the flow — it is anchored absolutely at the bottom of the safe zone.
  // We still compute bottomLines/bottomH so the caller can reserve that space.
  ctx.font = fontBottom;
  const bottomLines = wrapIntelligent(
    (t) => ctx.measureText(t).width,
    opts.bottomText || "",
    maxWidth,
  );

  const topH = topLines.length * lhTop;
  const bottomH = bottomLines.length * lhBottom;

  // totalH only accounts for the flowing content (topTitle + body segments).
  // bottomText is rendered separately at an absolute anchor.
  let totalH = topH;
  if (topH > 0 && bodyH > 0) {
    totalH += gapTopToBody;
  }
  totalH += bodyH;

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
 * to ensure all flowing content (topTitle + body) fits within the body-only safe height.
 * bottomText and footerText are excluded — they are anchored absolutely at the bottom.
 */
export function fitSlideLayout(
  ctx: CanvasRenderingContext2D,
  opts: CarouselSlideOptions,
): SlideLayoutResult {
  let scale = 1.0;
  let gapScale = 1.0;
  let layout = computeSlideLayout(ctx, opts, scale, gapScale);

  // Calculate exact space taken by bottom elements (matches renderCarouselSlide logic)
  const FOOTER_LH = 64;
  const GAP_FOOTER_TO_BOTTOM = 20;
  const footerClean = (opts.footerText || "").trim();
  const footerBaselineY = CAROUSEL_SAFE_ZONE.BOTTOM_MAX_Y - 10;
  
  const bottomAnchorBaselineY = footerClean
    ? footerBaselineY - FOOTER_LH - GAP_FOOTER_TO_BOTTOM
    : CAROUSEL_SAFE_ZONE.BOTTOM_MAX_Y - 10;

  const getSafeH = (currentLayout: SlideLayoutResult) => {
    const bottomBlockTop = currentLayout.bottomLines.length > 0
      ? (bottomAnchorBaselineY - currentLayout.bottomH - GAP_FOOTER_TO_BOTTOM)
      : (footerClean ? footerBaselineY - FOOTER_LH - GAP_FOOTER_TO_BOTTOM : CAROUSEL_SAFE_ZONE.BOTTOM_MAX_Y);
    return bottomBlockTop - CAROUSEL_SAFE_ZONE.SAFE_TOP;
  };

  if (layout.totalH <= getSafeH(layout)) {
    return layout;
  }

  const hasMultipleSegments = layout.layoutSegments.length > 1;

  // 1. Proactive multi-segment gap compression to preserve font size (R2)
  if (hasMultipleSegments) {
    gapScale = Math.max(0.35, Math.min(1.0, getSafeH(layout) / layout.totalH));
    layout = computeSlideLayout(ctx, opts, scale, gapScale);
    if (layout.totalH <= getSafeH(layout)) {
      return layout;
    }
  }

  // 2. Initial proactive estimation based on height ratio
  scale = Math.min(1.0, Math.max(0.55, (getSafeH(layout) / layout.totalH) * 0.96));
  gapScale = hasMultipleSegments ? Math.max(0.25, Math.min(gapScale, scale * 0.85)) : scale;
  layout = computeSlideLayout(ctx, opts, scale, gapScale);

  // 3. Fine-tuning loop with dynamic gap balancing
  while (layout.totalH > getSafeH(layout) && (scale > 0.50 || gapScale > 0.10)) {
    if (hasMultipleSegments && gapScale > 0.30 && gapScale > scale * 0.5) {
      gapScale = Math.max(0.15, gapScale - 0.05);
    } else if (scale > 0.55) {
      scale = Math.max(0.50, scale - 0.03);
      gapScale = Math.min(gapScale, scale);
    } else if (gapScale > 0.10) {
      gapScale = Math.max(0.08, gapScale - 0.04);
    } else {
      scale = Math.max(0.45, scale - 0.02);
    }

    layout = computeSlideLayout(ctx, opts, scale, gapScale);
  }

  // 4. Ultimate safety fallback for extreme edge cases (e.g. 20+ segments / 2000+ chars)
  while (layout.totalH > getSafeH(layout) && scale > 0.40) {
    scale = Math.max(0.40, scale - 0.01);
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

  const W = CAROUSEL_SAFE_ZONE.W;
  const H = CAROUSEL_SAFE_ZONE.H;

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

  // Dynamic auto-fit font scaling & gap balancing (body content only, bottomText excluded)
  const layout = fitSlideLayout(ctx, opts);

  const centerX = CAROUSEL_SAFE_ZONE.CENTER_X;

  // ── FIXED-POSITION BOTTOM ELEMENTS ───────────────────────────────────────
  // These are anchored absolutely to the bottom of the TikTok safe zone so they
  // never overflow the canvas or get hidden by TikTok UI elements.

  // footerText: swipe indicator (e.g. "← Плъзнете наляво") — pinned at very bottom
  const FOOTER_FONT_SIZE = 52;
  const FOOTER_LH = 64;
  const FOOTER_FONT = `500 ${FOOTER_FONT_SIZE}px 'Montserrat', sans-serif`;
  const footerClean = stripEmojis((opts.footerText || "").trim());
  // Anchor baseline to 10px above BOTTOM_MAX_Y so nothing bleeds into TikTok UI
  const footerBaselineY = CAROUSEL_SAFE_ZONE.BOTTOM_MAX_Y - 10;

  if (footerClean) {
    ctx.font = FOOTER_FONT;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.shadowColor = "rgba(0,0,0,0.85)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 2;
    ctx.strokeStyle = "rgba(0,0,0,0.7)";
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.strokeText(footerClean, centerX, footerBaselineY);
    ctx.fillStyle = "rgba(255,255,255,0.60)";
    ctx.fillText(footerClean, centerX, footerBaselineY);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.textBaseline = "middle";
  }

  // bottomText: CTA (e.g. "Плъзни наляво за тайната") — anchored above footerText
  const GAP_FOOTER_TO_BOTTOM = 20;
  const bottomAnchorBaselineY = footerClean
    ? footerBaselineY - FOOTER_LH - GAP_FOOTER_TO_BOTTOM
    : CAROUSEL_SAFE_ZONE.BOTTOM_MAX_Y - 10;

  if (layout.bottomLines.length > 0) {
    // Draw lines bottom-up: last line sits at bottomAnchorBaselineY
    const totalBottomH = layout.bottomLines.length * layout.lhBottom;
    const bottomStartY = bottomAnchorBaselineY - totalBottomH;

    layout.bottomLines.forEach((line, i) => {
      drawTextLine(
        ctx,
        line,
        centerX,
        bottomStartY + i * layout.lhBottom + layout.lhBottom / 2,
        layout.fontBottom,
        "#F3D179",
        false,
      );
    });
  }

  // ── FLOWING BODY CONTENT ──────────────────────────────────────────────────
  // Compute available vertical space for body (everything above the bottom elements)
  const bottomBlockTop = layout.bottomLines.length > 0
    ? (bottomAnchorBaselineY - layout.bottomH - GAP_FOOTER_TO_BOTTOM)
    : (footerClean ? footerBaselineY - FOOTER_LH - GAP_FOOTER_TO_BOTTOM : CAROUSEL_SAFE_ZONE.BOTTOM_MAX_Y);

  // Vertically center the body block within the available space
  const bodyAreaHeight = bottomBlockTop - CAROUSEL_SAFE_ZONE.SAFE_TOP;
  let currentY =
    CAROUSEL_SAFE_ZONE.SAFE_TOP +
    Math.max(0, Math.round((bodyAreaHeight - layout.totalH) / 2));

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

  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png"),
  );
}
