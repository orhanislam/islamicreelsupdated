# Comprehensive Survey & Architectural Analysis: R1 (Text Formatting & Differentiation)

## 1. Executive Summary

Requirement **R1 (Text Formatting & Differentiation)** mandates modifying the carousel generation and rendering logic to clearly differentiate sacred Quran/Hadith text from human commentary using **intervals (line spacing)** and **distinct colors** in the final generated TikTok photo carousel slides.

Our architectural survey of the Islamic Reels Studio codebase examined all files across the prompt generation, parsing, schema, memory, and rendering pipelines:
- `src/lib/carousel.functions.ts`
- `src/lib/assistant.functions.ts`
- `src/lib/render-carousel.ts`
- `src/components/CarouselRendererButton.tsx`
- `src/routes/_app/assistant.tsx`
- `src/lib/memory.functions.ts`
- `src/lib/tawheed-taxonomy.ts`

### Key Finding:
Currently, Slide 3 (the Dalil slide) and general carousel slides concatenate the sacred text (e.g. `„Всеки, който се бои от Аллах...“`) and the human commentary/transition (e.g. `А ето как да приложиш това спасение в живота си още днес...`) into a single string in `mainText`. In `render-carousel.ts`, the entire `mainText` is wrapped into lines and drawn on Canvas with identical typography (`700 65px 'Montserrat'`), identical color (`#ffedb3`), and zero vertical separation between divine words and human words.

This analysis provides a complete map of the pipeline, data structures, and a concrete multi-tier design (schema extension + intelligent in-text parser + dual-styled Canvas rendering) that solves R1 with 100% backward compatibility.

---

## 2. Complete Pipeline Architecture & File Mapping

```
[User Trigger / AI Chat]
       │
       ├─► src/routes/_app/assistant.tsx (Quick Action Button: `handleGenerateCarousel` / Chat)
       │         │
       │         ▼
       ├─► src/lib/assistant.functions.ts (`chatWithAssistant`, `suggestBatchViralProposals`)
       │         │
       │         ▼ (Calls Gemini AI / Tawheed Taxonomy)
       │   `injectAuthenticCarouselText()` (Lines 33–113)
       │         │
       │         ▼
       ├─► src/lib/carousel.functions.ts (`generateCarouselScriptDirect`, `buildCarouselSystemPrompt`)
       │         │
       │         ▼
[Carousel Slide Data Schema]
       │   - topTitle: string
       │   - mainText: string (Concatenates Dalil + Commentary)
       │   - bottomText: string
       │   - footerText: string
       │   - imagePrompt: string
       │
       ▼
[Client UI Preview & Actions]
       │
       ├─► src/routes/_app/assistant.tsx (Lines 998–1013: 4-Slide Card Grid)
       │         │
       │         ▼
       └─► src/components/CarouselRendererButton.tsx (`handleGenerate` / `handleSendToMake`)
                 │
                 ▼
[Canvas Rendering Engine]
       └─► src/lib/render-carousel.ts (`renderCarouselSlide`)
                 │
                 ├─► HTML5 Canvas (1080x1920)
                 ├─► Draws Background + Dark Vignette Overlay
                 ├─► Draws `topTitle` (#f3d179)
                 ├─► Draws `mainText` (#ffedb3 - uniform, no interval, no quote differentiation)
                 └─► Draws `bottomText` (#f3d179)
```

---

## 3. Detailed File & Interface Investigation

### 3.1 `src/lib/carousel.functions.ts`
- **Interfaces**:
  ```ts
  export interface CarouselSlideData {
    topTitle: string;
    mainText: string;
    bottomText: string;
    footerText: string;
    imagePrompt: string;
  }

  export interface GenerateCarouselInput {
    topic?: string;
    recentTopicIds?: string[];
    pillar?: "rububiyyah" | "uluhiyyah" | "asma_was_sifat";
  }
  ```
- **Prompt Definition (`buildCarouselSystemPrompt`, lines 27–88)**:
  - Slide 1: Hook (`topTitle`: dramatic label `[ТАЙНАТА НА ...]`, `mainText`: curiosity gap hook, `bottomText`: swipe prompt, `footerText`: `1/4 • Плъзнете наляво`).
  - Slide 2: Context (`topTitle`: subtitle `БОЖЕСТВЕНИЯТ ЗАКОН`, `mainText`: 2-3 sentences theological context + cliffhanger).
  - Slide 3: Dalil (`topTitle`: citation `${chosenTopic.dalilReference}`, `mainText`: `Цитат на самия Аят или Хадис в кавички на правилен български език ("${chosenTopic.dalilTextBg}"), с преход към действието.`).
  - Slide 4: CTA (`topTitle`: `ДЕЙСТВИЕ И ДУА`, `mainText`: short Du'a/action, `bottomText`: CTA with "Запази", "Сподели").
- **Fallback Slides (lines 165–195)**:
  - Slide 3 fallback:
    ```ts
    {
      topTitle: `[${chosenTopic.dalilReference}]`,
      mainText: `${chosenTopic.dalilTextBg} А ето как да приложиш това спасение в живота си още днес...`,
      bottomText: "Плъзни за духовното решение 👉",
      footerText: "3/4 • Плъзнете наляво",
      imagePrompt: `...`
    }
    ```

### 3.2 `src/lib/assistant.functions.ts`
- **Interfaces (`VideoProposal`, lines 13–31)**:
  ```ts
  export type VideoProposal = {
    title: string;
    type: "hadith" | "quran" | "tiktok" | "general" | "carousel";
    collection?: string;
    number?: number;
    surah?: number;
    ayah?: number;
    count?: number;
    summaryBg: string;
    themeBg: string;
    searchQuery: string;
    tiktokTheme?: "hormozi" | "emerald" | "neon" | "classic";
    bRollInterval?: number;
    useBRoll?: boolean;
    subtitlePosition?: "bottom" | "middle" | "lower-third";
    quality?: "high" | "720p";
    carouselSlides?: {
      topTitle: string;
      mainText: string;
      bottomText: string;
      footerText: string;
      imagePrompt: string;
    }[];
  };
  ```
- **Post-Processing (`injectAuthenticCarouselText`, lines 33–113)**:
  - Fetches authentic text from `fetchAyah` (Quran) or `fetchSunnahHadith` (Hadith) via Sunnah.com / Quran.com.
  - Translates to Bulgarian via `translateToBulgarian`.
  - Injects Dalil into Slide 3 (lines 87–97):
    ```ts
    const flatBulgarian = bulgarian.replace(/\r?\n|\r/g, " ");
    const cleanDalil = flatBulgarian.replace(/(^|\s+)(?:\(\d+\)|\[\d+\]|\d+\.)\s*/g, "$1").trim();
    const dalilSlide = {
      topTitle: `[${reference}]`,
      mainText: `„${cleanDalil}“ А ето как да приложиш това спасение в живота си още днес...`,
      bottomText: 'Плъзни за духовното решение 👉',
      footerText: '3/4 • Плъзнете наляво',
      imagePrompt: dalilPrompt,
    };
    ```

### 3.3 `src/lib/render-carousel.ts`
- **Function Signature & Options**:
  ```ts
  export type CarouselSlideOptions = {
    backgroundUrl: string;
    topTitle: string;
    mainText: string;
    bottomText: string;
    footerText: string;
  };

  export async function renderCarouselSlide(opts: CarouselSlideOptions): Promise<Blob>
  ```
- **Rendering Mechanism (Lines 69–180)**:
  1. Creates 1080x1920 `<canvas>` with 2D context.
  2. Loads background image (`loadImage`), scales with aspect ratio cover (`sx, sy, sw, sh`).
  3. Applies dark vertical gradient overlay (`rgba(0,0,0,0.5)` to `rgba(0,0,0,0.8)`).
  4. Wraps text with `wrap(ctx, text, maxW)` where `maxW = 820`.
  5. Computes layout heights:
     - `lhTitle = 95; lhMain = 85; lhBottom = 65;`
     - `gapTitleMain = 80; gapMainBottom = 60;`
  6. Draws lines:
     - `titleLines`: font `800 85px 'Montserrat'`, fillStyle `#f3d179` (Gold).
     - `mainLines`: font `700 65px 'Montserrat'`, fillStyle `#ffedb3` (Single pale gold color for all lines).
     - `bottomLines`: font `700 50px 'Montserrat'`, fillStyle `#f3d179` (Gold).

### 3.4 `src/components/CarouselRendererButton.tsx`
- Receives `{ slides: Slide[], title: string }`.
- In `_renderAllSlides` (lines 29–45):
  - Calls `generateBackground({ data: { prompt: slide.imagePrompt } })`.
  - Calls `renderCarouselSlide` for each slide with `{ backgroundUrl, topTitle, mainText, bottomText, footerText }`.
  - Zips all slide blobs into `${title}_Carousel.zip` or sends base64 slides to Make.com webhook.

---

## 4. Root Cause Analysis for R1 (Lack of Differentiation)

1. **Monolithic `mainText` Representation**:
   Both Gemini AI prompt generation and `injectAuthenticCarouselText` assemble the authentic Quran/Hadith quote and the human commentary/transition into a single contiguous string inside `slide.mainText`.

2. **Homogeneous Canvas Rendering**:
   In `render-carousel.ts`, `mainText` is split only by `\n` or wrapped across words into `mainLines`. The rendering loop iterates over all lines in `mainLines` and applies the exact same font (`700 65px 'Montserrat'`), line height (`lhMain = 85px`), and fill color (`#ffedb3`).

3. **Absence of Vertical Interval (Spacing)**:
   There is no separate vertical gap between the end of the quote and the beginning of the commentary. They look like a single uninterrupted sentence.

4. **Theological & UX Impact**:
   - The user cannot distinguish where the sacred words of Allah or the Prophet ﷺ end and where the human commentary begins.
   - On mobile screens (TikTok carousel), the eye does not catch the quote as the focal authority of the slide.

---

## 5. Recommended Technical Design for R1

To achieve complete visual differentiation with zero regression, we recommend a **Dual-Tier Architecture**:
1. **Schema Extension (Explicit Fields)**
2. **Resilient Delimiter & Quote Parser (In-Text Fallback)**
3. **Canvas Multi-Segment Dual-Color & Interval Renderer**

### 5.1 Enhanced Slide Interface
Extend `CarouselSlideData` in `carousel.functions.ts` and `CarouselSlideOptions` in `render-carousel.ts`:
```ts
export interface CarouselSlideData {
  topTitle: string;
  mainText: string;
  bottomText: string;
  footerText: string;
  imagePrompt: string;
  
  // R1 Holy Text Differentiation Fields (Optional for backward compatibility)
  quoteText?: string;        // Exact Quran Ayah or Sahih Hadith text (e.g. "„Не сполита земята...“")
  commentaryText?: string;   // Human commentary or transition (e.g. "А ето как да приложиш...")
  sourceBadge?: string;      // Explicit citation badge (e.g., "[Сура Ал-Хадид: 22-23]")
}

export type CarouselSlideOptions = {
  backgroundUrl: string;
  topTitle: string;
  mainText: string;
  bottomText: string;
  footerText: string;
  
  // R1 Differentiation Options
  quoteText?: string;
  commentaryText?: string;
  sourceBadge?: string;
};
```

### 5.2 Intelligent Text Segmentation Parser (`parseSlideSegments`)
A pure helper function in `render-carousel.ts` (or `carousel.functions.ts`):
```ts
export interface SlideTextSegments {
  isQuoteSlide: boolean;
  quoteText?: string;
  commentaryText?: string;
  generalText?: string;
}

export function parseSlideSegments(opts: { mainText: string; quoteText?: string; commentaryText?: string }): SlideTextSegments {
  // Tier 1: Explicit fields provided
  if (opts.quoteText && opts.quoteText.trim()) {
    return {
      isQuoteSlide: true,
      quoteText: opts.quoteText.trim(),
      commentaryText: opts.commentaryText?.trim() || undefined,
    };
  }

  const raw = (opts.mainText || "").trim();
  if (!raw) return { isQuoteSlide: false, generalText: "" };

  // Tier 2: In-Text Bulgarian Quotation Mark Detection: „ ... “ or " ... " or « ... »
  const quoteMatch = raw.match(/^([„"«][\s\S]+?["”»])\s*([\s\S]*)$/);
  if (quoteMatch) {
    const extractedQuote = quoteMatch[1].trim();
    const extractedCommentary = quoteMatch[2].trim();
    return {
      isQuoteSlide: true,
      quoteText: extractedQuote,
      commentaryText: extractedCommentary || undefined,
    };
  }

  // Tier 3: Delimiter detection (\n\n or transition markers)
  if (raw.includes("\n\n")) {
    const parts = raw.split(/\n\n+/);
    return {
      isQuoteSlide: true,
      quoteText: parts[0].trim(),
      commentaryText: parts.slice(1).join("\n\n").trim(),
    };
  }

  // Fallback: General standard text (Slides 1, 2, 4 without quotes)
  return {
    isQuoteSlide: false,
    generalText: raw,
  };
}
```

### 5.3 Canvas Rendering Engine Specifications (`render-carousel.ts`)

#### Visual Styling Matrix:
| Element | Typography & Size | Color | Line Height | Role & Meaning |
|---|---|---|---|---|
| **Top Title / Badge** | `800 80px 'Montserrat'` | `#F3D179` (Gold) | 90px | Hook / Category / Dalil Reference |
| **Holy Quran / Hadith Text** | `700 62px 'Montserrat'` | `#FFD700` (Radiant Divine Gold) | 82px | Sacred revelation, wrapped in `„...“` |
| **Interval Divider** | Blank gap: `55px` (or optional subtle separator) | N/A | 55px | Explicit visual boundary |
| **Human Commentary / Transition** | `600 48px 'Montserrat'` | `#E2E8F0` / `#FFFFFF` (Soft Crisp White) | 64px | Human reflection, action transition |
| **General Body Text** (Non-quote slides) | `700 65px 'Montserrat'` | `#FFEDB3` (Pale Gold / Warm Cream) | 85px | Body content for Slides 1, 2, 4 |
| **Bottom Swipe / Action** | `700 50px 'Montserrat'` | `#F3D179` (Gold) | 65px | TikTok swipe prompt / CTA |

#### Layout Calculation:
```ts
// Calculate heights
let totalH = titleH;
if (segments.isQuoteSlide) {
  const quoteH = quoteLines.length * lhQuote;
  const commentaryH = commentaryLines.length * lhCommentary;
  totalH += quoteH;
  if (commentaryH > 0) {
    totalH += gapQuoteCommentary + commentaryH;
  }
} else {
  totalH += generalLines.length * lhGeneral;
}
if (bottomH > 0) totalH += gapMainBottom + bottomH;

// Dynamic centering inside safe area
let currentY = (H - totalH) / 2 - 40;
```

---

## 6. Prompt & Post-Processing Adjustments

### 6.1 `src/lib/carousel.functions.ts` (`buildCarouselSystemPrompt`)
Update Slide 3 instruction:
```
3. Слайд 3 (Тяло 2 / Автентичен Далил от Коран или Сахих Хадис):
   - topTitle: Точен цитат и номер (напр. "${chosenTopic.dalilReference}").
   - mainText: Постави свещения цитат в кавички „${chosenTopic.dalilTextBg}“, последван от 1 празен ред и краткото човешко преходно изречение към действието.
```

### 6.2 `src/lib/assistant.functions.ts` (`injectAuthenticCarouselText`)
Update Dalil slide construction:
```ts
const dalilSlide = {
  topTitle: `[${reference}]`,
  mainText: `„${cleanDalil}“\n\nА ето как да приложиш това спасение в живота си още днес...`,
  quoteText: `„${cleanDalil}“`,
  commentaryText: `А ето как да приложиш това спасение в живота си още днес...`,
  bottomText: 'Плъзни за духовното решение 👉',
  footerText: '3/4 • Плъзнете наляво',
  imagePrompt: dalilPrompt,
};
```

---

## 7. Verification Strategy

1. **Automated Unit & Integration Tests**:
   - `npm test` (`verify-tawheed-carousel.test.ts` & `verify-sync.test.ts`).
   - `npm run test:viral` (`verify-viral-carousel.test.ts`).
   - New assertions in test suite checking that Slide 3 contains quote delimiters or explicit `quoteText` / `commentaryText`.
2. **Canvas Rendering Verification**:
   - Verify `parseSlideSegments` correctly separates quotes from commentary for diverse inputs (Bulgarian `„...“`, quotes with transitions, multi-line quotes).
   - Verify canvas render produces valid PNG blobs and correct line wrapping within 820px safe width.
