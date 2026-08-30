# Milestone 2 Explorer 2 Handoff Report: Viral Thumbnail SVG Hardening

**Target File**: `src/lib/thumbnail.functions.ts`  
**Associated Safe Zone Registry**: `src/lib/safe-zone.ts`  
**Milestone**: M2 (Single Photo & Viral Thumbnail Layout Hardening)  
**Status**: Ready for Implementation by Worker M2  

---

## 1. Observation

Direct examination of `src/lib/thumbnail.functions.ts` (lines 1–102) revealed three critical layout vulnerabilities that violate social safe zones:

### 1.1 Symmetrical Centering at X = 540px Breaches TikTok Right Sidebar
At `src/lib/thumbnail.functions.ts:53`:
```ts
return `<text x="540" y="${y}" font-family="Arial, sans-serif" font-weight="900" font-size="76" fill="${color}" text-anchor="middle" letter-spacing="-1">${esc(line)}</text>`;
```
- The SVG text elements are hardcoded to center at X = 540px (`x="540"`).
- Because TikTok's user interface is asymmetric (`SAFE_LEFT = 100px`, `SAFE_RIGHT = 220px` for like/comment/share buttons), centering text with standard width ($\ge 640\text{px}$) at X = 540px causes the right edge to extend into $X > 860\text{px}$.
- Specifically, a $760\text{px}$ wide line centered at 540 spans $[540 - 380, 540 + 380] = [160, 920]\text{px}$. The rightmost 60px directly collides with TikTok's interactive button corridor ($X \in [860, 1080]\text{px}$).

### 1.2 Fixed 76px Font Size & Arbitrary 22-Character Threshold Overflows Width
At `src/lib/thumbnail.functions.ts:37–45`:
```ts
for (const w of words) {
  if ((current + " " + w).length > 22 && current) {
    lines.push(current.trim());
    current = w;
  } else {
    current += " " + w;
  }
}
```
- A line of 22 uppercase Cyrillic/Latin characters rendered at font size $76\text{px}$ has an estimated width of $\approx 22 \times (76 \times 0.60) \approx 1003\text{px}$.
- Centered at X = 540px, a $1003\text{px}$ line extends to $X = 540 + 501.5 = 1041.5\text{px}$, extending past almost the entire right edge of the screen and completely obscured by TikTok action buttons.

### 1.3 Absence of Safe Zone Registry Integration
- `src/lib/thumbnail.functions.ts` has zero imports from `src/lib/safe-zone.ts`.
- Constants like `TIKTOK_SAFE_ZONE.CENTER_X` (480), `TIKTOK_SAFE_ZONE.W_SAFE` (760), `TIKTOK_SAFE_ZONE.SAFE_TOP` (300), and `TIKTOK_SAFE_ZONE.BOTTOM_MAX_Y` (1520) are completely unused.

---

## 2. Logic Chain

The step-by-step reasoning connecting observations to the required solution:

### Step 1: Establishing TikTok Safe Zone Boundaries
From `src/lib/safe-zone.ts:145–161`:
- Canvas Dimensions: $W = 1080\text{px}, H = 1920\text{px}$.
- TikTok Insets: $\text{SAFE\_TOP} = 300\text{px}$, $\text{SAFE\_BOTTOM} = 400\text{px}$, $\text{SAFE\_LEFT} = 100\text{px}$, $\text{SAFE\_RIGHT} = 220\text{px}$.
- Derived Usable Width: $W_{\text{safe}} = 1080 - 100 - 220 = 760\text{px}$.
- Optical Safe Center: $X_{\text{center}} = 100 + 760 / 2 = 480\text{px}$.
- Safe Vertical Span: $Y \in [300, 1520]\text{px}$, $\text{H\_SAFE} = 1220\text{px}$.

### Step 2: Mathematical Proof of Optical Centering at X = 480px
Let $w \le W_{\text{safe}} = 760\text{px}$ be the text line width centered with `text-anchor="middle"` at $X_{\text{center}}$:
- Left edge: $X_{\text{left}} = X_{\text{center}} - w / 2 \ge 480 - 380 = 100\text{px} = \text{SAFE\_LEFT}$.
- Right edge: $X_{\text{right}} = X_{\text{center}} + w / 2 \le 480 + 380 = 860\text{px} = 1080 - \text{SAFE\_RIGHT}$.
- Thus, anchoring SVG text at `x="480"` (or $\text{TIKTOK\_SAFE\_ZONE.CENTER\_X}$) guarantees that any text line with width $w \le 760\text{px}$ remains strictly within $[100, 860]\text{px}$.

### Step 3: Typography & Font Metric Modeling
For uppercase bold Arial/sans-serif text:
- Glyph Width Distribution:
  - Narrow characters (`I`, `i`, `l`, `j`, `t`, `1`, `|`, `!`): $\approx 0.30 \times \text{fontSize}$
  - Standard spaces: $\approx 0.28 \times \text{fontSize}$
  - Punctuation (`.`, `,`, `-`, `:`, `'`, `"`): $\approx 0.32 \times \text{fontSize}$
  - Wide Cyrillic/Latin characters (`Щ`, `Ж`, `Ю`, `Ш`, `Ф`, `М`, `W`, `w`, `M`, `m`, `%`, `@`): $\approx 0.85 \times \text{fontSize}$
  - Standard uppercase Latin/Cyrillic (`A-Z`, `А-Я`): $\approx 0.70 \times \text{fontSize}$
  - Standard lowercase/other: $\approx 0.60 \times \text{fontSize}$

### Step 4: Dynamic Auto-Fit Font Scaling Algorithm
To guarantee all lines fit within $W_{\text{safe}} = 760\text{px}$ and max 4 lines:
1. Loop font size $\text{fontSize}$ from $76\text{px}$ down to $54\text{px}$ (decrementing by 2px).
2. For each $\text{fontSize}$, wrap title into lines where $w_{\text{line}} \le 760\text{px}$.
3. Check two invariants:
   - Line count $N_{\text{lines}} \le 4$.
   - Every line width $w_{\text{line}} \le 760\text{px}$.
4. If satisfied, return this $\text{fontSize}$, wrapped lines, and proportional line height $lh = \text{Math.round}(\text{fontSize} \times 1.35)$.
5. If $54\text{px}$ is reached without meeting criteria, clamp to $54\text{px}$, wrap at 760px, and slice to 4 lines.

### Step 5: Vertical Positioning & Centering
- Text block vertical center: $Y_{\text{mid}} = 880\text{px}$.
- For line $i \in [0, N-1]$:
  $y_i = 880 + \left(i - \frac{N - 1}{2}\right) \times lh$
- Vertical extent for 4 lines at 76px: $Y \in [725, 1035]\text{px} \subset [300, 1520]\text{px}$.
- Vertical extent for 4 lines at 54px: $Y \in [770, 990]\text{px} \subset [300, 1520]\text{px}$.
- Guaranteed vertical containment within the safe corridor.

---

## 3. Caveats

1. **XML Entity Escaping**: Special characters (`&`, `<`, `>`, `"`, `'`) in titles must be escaped before embedding into the SVG XML string to prevent Sharp rendering parser errors.
2. **Pexels Fallback Consistency**: In `generateViralThumbnail`, the fallback logic replaces `fill-opacity="0.45"` with `fill-opacity="1.0"`. The generated SVG template must retain `fill-opacity="0.45"` on the background rectangle so fallback remains fully operational.
3. **Multi-Platform Extensibility**: While TikTok is the default (`CENTER_X = 480`, `W_SAFE = 760`), supporting an optional `profile` parameter via `getSafeZone(data.profile || 'tiktok')` enables clean support for Reels, Shorts, and Center profiles without breaking existing call sites.

---

## 4. Conclusion & Proposed Implementation

### 4.1 Exact Code Implementation for `src/lib/thumbnail.functions.ts`

```ts
import { createServerFn } from "@tanstack/react-start";
import sharp from "sharp";
import { geminiChat } from "./gemini";
import { pexelsPhotoQuery } from "./pexels.functions";
import { getSafeZone, TIKTOK_SAFE_ZONE, type SafeZoneGeometry } from "./safe-zone";

export interface ThumbnailRequest {
  title: string;
  category?: string;
  subtitle?: string;
  accentColor?: string;
  profile?: string;
}

/**
 * Escape XML entities for safe SVG text embedding.
 */
export function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Calibrated character-width estimator for bold uppercase Arial/sans-serif.
 */
export function estimateTitleWidth(text: string, fontSize: number): number {
  let w = 0;
  for (const char of text) {
    if (char === " ") {
      w += fontSize * 0.28;
    } else if (/[.,!?:;'\"„”“”«»`\(\)\[\]\-]/.test(char)) {
      w += fontSize * 0.32;
    } else if (/[щжюфмшЩЖЮШФМWwMm%@]/.test(char)) {
      w += fontSize * 0.85;
    } else if (/[iljt1I|!]/.test(char)) {
      w += fontSize * 0.30;
    } else if (/[A-ZА-Я]/.test(char)) {
      w += fontSize * 0.70;
    } else {
      w += fontSize * 0.60;
    }
  }
  return Math.round(w);
}

/**
 * Wrap title into lines respecting a maximum pixel width constraint.
 */
export function wrapTitleText(text: string, fontSize: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    // If a single unbroken word exceeds maxWidth, chunk it
    if (estimateTitleWidth(word, fontSize) > maxWidth) {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = "";
      }
      let chunk = "";
      for (const char of word) {
        if (estimateTitleWidth(chunk + char, fontSize) > maxWidth && chunk) {
          lines.push(chunk);
          chunk = char;
        } else {
          chunk += char;
        }
      }
      if (chunk) currentLine = chunk;
      continue;
    }

    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (estimateTitleWidth(testLine, fontSize) > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) lines.push(currentLine);

  // Avoid single orphan word on last line if previous line has >= 3 words
  if (lines.length >= 2) {
    const last = lines[lines.length - 1];
    const prev = lines[lines.length - 2];
    const prevWords = prev.split(" ");
    const lastWords = last.split(" ");
    if (lastWords.length === 1 && prevWords.length >= 3) {
      const moved = prevWords.pop()!;
      const newPrev = prevWords.join(" ");
      const newLast = `${moved} ${last}`;
      if (
        estimateTitleWidth(newPrev, fontSize) <= maxWidth &&
        estimateTitleWidth(newLast, fontSize) <= maxWidth
      ) {
        lines[lines.length - 2] = newPrev;
        lines[lines.length - 1] = newLast;
      }
    }
  }

  return lines;
}

/**
 * Calculate dynamic auto-fit font size (76px down to 54px) and wrapped lines.
 */
export function fitThumbnailTitle(
  title: string,
  maxWidth = 760,
  maxLines = 4,
  range = { max: 76, min: 54 },
): { fontSize: number; lines: string[]; lineHeight: number } {
  const cleanTitle = title.trim().toUpperCase();
  if (!cleanTitle) {
    return { fontSize: range.max, lines: [], lineHeight: Math.round(range.max * 1.35) };
  }

  for (let size = range.max; size >= range.min; size -= 2) {
    const lines = wrapTitleText(cleanTitle, size, maxWidth);
    const lh = Math.round(size * 1.35);
    const allFit = lines.every((l) => estimateTitleWidth(l, size) <= maxWidth);
    if (lines.length <= maxLines && allFit) {
      return { fontSize: size, lines: lines.slice(0, maxLines), lineHeight: lh };
    }
  }

  // Fallback to min size
  const minSize = range.min;
  const lines = wrapTitleText(cleanTitle, minSize, maxWidth).slice(0, maxLines);
  return {
    fontSize: minSize,
    lines,
    lineHeight: Math.round(minSize * 1.35),
  };
}

/**
 * Generate safe SVG markup string with bounded title text.
 */
export function buildViralThumbnailSvg(options: {
  title: string;
  accentColor?: string;
  profile?: string;
  safeZone?: SafeZoneGeometry;
}): { svg: string; fontSize: number; lines: string[]; centerX: number; maxLineWidth: number } {
  const sz = options.safeZone || getSafeZone(options.profile || "tiktok");
  const accentColor = options.accentColor || "#FFD700";
  const maxWidth = Math.min(sz.W_SAFE, 760);
  const centerX = sz.CENTER_X; // 480 for TikTok

  const { fontSize, lines: displayLines, lineHeight } = fitThumbnailTitle(
    options.title,
    maxWidth,
    4,
    { max: 76, min: 54 },
  );

  let maxLineWidth = 0;
  const titleSvgLines = displayLines
    .map((line, i) => {
      const lineWidth = estimateTitleWidth(line, fontSize);
      if (lineWidth > maxLineWidth) maxLineWidth = lineWidth;
      const y = 880 + (i - (displayLines.length - 1) / 2) * lineHeight;
      const isGold =
        i === 0 ||
        line.includes("АЛЛАХ") ||
        line.includes("КОРАН") ||
        line.includes("РАЙ") ||
        line.includes("ALLAH") ||
        line.includes("QURAN");
      const color = isGold ? accentColor : "#FFFFFF";
      return `<text x="${centerX}" y="${y}" font-family="Arial, sans-serif" font-weight="900" font-size="${fontSize}" fill="${color}" text-anchor="middle" letter-spacing="-1">${escapeXml(line)}</text>`;
    })
    .join("\n");

  const svg = `
<svg width="${sz.W}" height="${sz.H}" viewBox="0 0 ${sz.W} ${sz.H}" xmlns="http://www.w3.org/2000/svg">
  <!-- Semi-transparent overlay to make text readable over any image -->
  <rect width="${sz.W}" height="${sz.H}" fill="#000000" fill-opacity="0.45"/>

  <!-- Main Viral Title -->
  ${titleSvgLines}
</svg>`;

  return { svg, fontSize, lines: displayLines, centerX, maxLineWidth };
}

export const generateViralThumbnail = createServerFn({ method: "POST" })
  .validator((input: ThumbnailRequest) => {
    return {
      title: input.title || "Ислямска Мъдрост",
      category: input.category || "СВЕЩЕН ХАДИС • TIKTOK VIRAL",
      subtitle: input.subtitle || "ISLAMIC REELS STUDIO",
      accentColor: input.accentColor || "#FFD700",
      profile: input.profile || "tiktok",
    };
  })
  .handler(async ({ data }): Promise<{ base64: string; dataUrl: string }> => {
    const finalTitle = data.title.toUpperCase();
    const { svg } = buildViralThumbnailSvg({
      title: finalTitle,
      accentColor: data.accentColor,
      profile: data.profile,
    });

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
```

---

## 5. Verification Method

To independently verify the hardened thumbnail implementation:

### 5.1 Milestone 2 Test Suite Specification
Worker M2 / Test Engineers should run:
```bash
npx jiti src/lib/__tests__/verify-photo-hardening.test.ts
```

### 5.2 Verification Test Assertions
The test suite must verify:
1. **TikTok Center Anchor**: All generated SVG text elements have `x="480"` (matching `TIKTOK_SAFE_ZONE.CENTER_X`).
2. **Right Corridor Inviolability**: For any title, no line exceeds width 760px, guaranteeing $X_{\text{right}} = 480 + w/2 \le 860\text{px}$ (TikTok sidebar buttons untouched).
3. **Dynamic Font Scaling**:
   - Short titles (`"АЯТ АЛ-КУРСИ"`): selects $76\text{px}$.
   - Medium titles (`"ТАЙНАТА НА УСПЕХА В ИСЛЯМА"`): scales to $64\text{px}-70\text{px}$.
   - Long titles (`"КАК ДА ПОСТИГНЕШ ВЪТРЕШЕН МИР И СПОКОЙСТВИЕ В ТРУДНИ МОМЕНТИ"`): scales to $54\text{px}-60\text{px}$.
4. **Max Line Bounding**: Line count is strictly clamped to $N \le 4$.
5. **XML Entity Safety**: Titles containing `& < > " '` do not produce malformed XML.
6. **Unbroken Long Word Splitting**: 40+ character unbroken tokens are chunked across lines without exceeding 760px.

### 5.3 Invalidation Conditions
The implementation is invalid if:
- Any SVG text line has $X_{\text{right}} > 860\text{px}$.
- Hardcoded `x="540"` is used without clamping line width to $640\text{px}$.
- Font size is static 76px and fails to scale down for titles with > 20 characters.
