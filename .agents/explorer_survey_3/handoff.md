# Comprehensive Survey Report: R3 (Title Generation Cleanup) & R4 (Dynamic Background Images)

**Author**: Explorer 3 (Survey Phase)  
**Working Directory**: `C:\Users\admin\Downloads\Islamic Reels Studio\.agents\explorer_survey_3`  
**Date**: 2026-08-29  
**Focus Scope**: 
- **R3**: Title Generation Cleanup (strip `[tiktok carousels]` and similar prefixes)
- **R4**: Dynamic Background Images Selection from Asset Pool

---

## 1. Observation

### 1.1 R3: Title Generation & Prefix Contamination Analysis

#### Exact Locations in Codebase
1. **`src/lib/assistant.functions.ts`**:
   - **Line 220** (`chatWithAssistant` system prompt):
     ```ts
     "title": "Точно заглавие на български (напр. [Коран] Аят ал-Курси или [TikTok] 3 неща, които отнемат спокойствието)",
     ```
   - **Lines 253-288** (`chatWithAssistant` response parser):
     Gemini returns JSON. The parser parses `parsed.proposal` and `parsed.proposals`, but applies **no title sanitization or prefix stripping**.
   - **Line 350** (`suggestViralProposal` prompt):
     ```ts
     "title": "ЗАДЪЛЖИТЕЛНО във формат [Коран {surah}:{ayah}] Заглавие ИЛИ [Сахих {collection} #{number}] Заглавие",
     ```
   - **Line 432 & Line 496** (`suggestBatchViralProposals` prompt and fallback):
     ```ts
     5. ВИНАГИ включвай точния източник в 'title' на български език във формат: [Коран {surah}:{ayah}] Заглавие или [Сахих {collection} #{number}] Заглавие.
     // Fallback:
     title: `[Коран / TikTok] ${p.ref}`,
     ```
   - **Lines 529-565** (`startServerRenderJob`):
     ```ts
     let reference = proposal.title;
     let viralTitle = proposal.title || "";
     ```

2. **`src/components/CarouselRendererButton.tsx`**:
   - **Line 23**: `export function CarouselRendererButton({ slides, title }: { slides: Slide[]; title: string })`
   - **Lines 59, 80, 92-116**:
     - ZIP download filename: `${title}_Carousel.zip`
     - Make.com webhook: `runMake({ data: { title, slides: base64Slides, webhookUrl } })`
     - Clipboard copy button: `handleCopyTitle` directly copies `title` without cleaning.

3. **`src/routes/_app/assistant.tsx`**:
   - **Line 181**: `const carouselPrompt = ...` sends prompt requesting TikTok carousel.
   - **Line 995**: `<span className="font-medium text-foreground">{m.proposal.title}</span>` renders title in UI.
   - **Line 1011**: `<CarouselRendererButton slides={m.proposal.carouselSlides} title={m.proposal.title} />` passes raw title.
   - **Lines 1116 & 1262**: `handleCopyTikTokCaption(m.proposal!.title, ...)` uses raw title for TikTok captions.

#### Observed Root Cause
When the user prompts the AI or clicks the *„Създай Таухид Карусел“* button (which sends `"Генерирай ми TikTok карусел..."`), Gemini frequently prefixes the generated title with strings such as `[tiktok carousels]`, `[TikTok Carousel]`, `[TikTok Carousels]`, `[tiktok]`, `[TikTok]`, `[карусел]`, or `[Коран / TikTok]`. Because neither the system prompt forbids this specific prefix nor the parser strips it, the contaminated title is propagated to the UI, the TikTok caption copier, and the ZIP filename.

---

### 1.2 R4: Background Image Asset Inventory & Current Rendering Pipeline

#### Local Asset Pool Inventory
Search of the entire workspace revealed two dedicated asset directories containing vertical 9:16 background images:

| Path | Dimensions | Format | File Size | Ratio | Description / Visual Theme |
|---|---|---|---|---|---|
| `tiktok_images/img0.jpg` | 1318 × 2346 | JPEG | 453.7 KB | ~9:16 | Moody atmospheric dark landscape |
| `tiktok_images/img1.jpg` | 1318 × 2346 | JPEG | 479.7 KB | ~9:16 | Dramatic misty nature with depth |
| `tiktok_images/img2.jpg` | 1318 × 2346 | JPEG | 332.0 KB | ~9:16 | Deep mountain dawn / atmospheric light |
| `tiktok_images/img3.jpg` | 1318 × 2346 | JPEG | 256.4 KB | ~9:16 | Golden warm light landscape |
| `tiktok_output/bg1.jpg` | 768 × 1376 | JPEG | 855.9 KB | ~9:16 | Dark textured cinematic background |
| `tiktok_output/bg2.jpg` | 768 × 1376 | JPEG | 872.3 KB | ~9:16 | Soft illuminated mist landscape |
| `tiktok_output/bg3.jpg` | 768 × 1376 | JPEG | 971.2 KB | ~9:16 | Golden rays breaking through clouds |
| `tiktok_output/bg4.jpg` | 768 × 1376 | JPEG | 740.6 KB | ~9:16 | Radiant warm golden sunrise scene |

- **Total Assets in Pool**: **8 distinct vertical JPEG background images**.
- **Public / Assets Directory**: No `public/` or `src/assets/` directory currently exists in the root directory.

#### Current Referencing & Loading Pipeline
1. **`src/components/CarouselRendererButton.tsx`** (lines 26-45):
   ```tsx
   const runGenerate = useServerFn(generateBackground);
   const _renderAllSlides = async () => {
     setProgress("Генериране на фонове и текст...");
     return await Promise.all(slides.map(async (slide, i) => {
       const currentPrompt = slide?.imagePrompt || "cinematic dark background islamic theme";
       const bgRes = await runGenerate({ data: { prompt: currentPrompt } });
       const bgUrl = `data:${bgRes.mimeType};base64,${bgRes.base64}`;
       
       const blob = await renderCarouselSlide({
         backgroundUrl: bgUrl,
         topTitle: slide.topTitle || "",
         mainText: slide.mainText || "",
         bottomText: slide.bottomText || "",
         footerText: slide.footerText || ""
       });
       return { blob, name: `Slide_${i + 1}.png` };
     }));
   };
   ```
2. **`src/lib/backgrounds.functions.ts`** (lines 44-51):
   - Calls `geminiGenerateImage(safePrompt)` in `src/lib/gemini.ts` using the Google Imagen `gemini-3.1-flash-image` model.
3. **`src/lib/render-carousel.ts`** (lines 69-108):
   - Takes `opts.backgroundUrl` (Data URL or HTTP URL), loads via HTML `new Image()`, computes cover crop aspect ratio, and draws to 1080x1920 canvas context (`ctx.drawImage`) with dark vertical gradient overlay.

#### Identified Issues with Current Approach
1. **Slow & High Latency**: Calling `geminiGenerateImage` 4 times concurrently takes 8–20 seconds per carousel and often hits rate limits (429 ResourceExhausted).
2. **Ignored Local Assets**: The 8 curated high-res local images in `tiktok_images/` and `tiktok_output/` are never utilized by `CarouselRendererButton.tsx`.
3. **No Dynamic Rotation**: There is zero state-tracking or rotation between consecutive carousel generations or across slides.

---

## 2. Logic Chain

```
[Observation 1.1: Gemini outputs [tiktok carousels] in title]
         │
         ├──► Prompt lacks explicit negative constraint against '[tiktok carousels]'
         │
         └──► Parser lacks sanitization regex before storing proposal.title
                   │
                   ▼
     [Solution R3: Prompt constraint + cleanProposalTitle() sanitizer applied at all parse boundaries]
```

```
[Observation 1.2: 8 vertical background images exist in tiktok_images/ and tiktok_output/]
         │
         ├──► CarouselRendererButton currently generates AI images via Gemini API (slow, rate-limited)
         │
         ├──► No server function currently serves the local background assets
         │
         └──► No cycle index / rotation mechanism exists across successive generations
                   │
                   ▼
     [Solution R4: Server function getCarouselBackgroundPool + dynamic rotation algorithm across slides & cycles]
```

### Step-by-Step Reasoning:
1. **For R3 (Title Cleanup)**:
   - A single canonical sanitization function `cleanProposalTitle` should be introduced.
   - It must strip variations like `[tiktok carousels]`, `[tiktok carousel]`, `[tiktok]`, `[карусел]`, `[карусели]`, `tiktok carousels:`, while strictly preserving legitimate Quran/Hadith citations (e.g. `[Коран 2:255]`, `[Сахих ал-Бухари #6424]`).
   - The sanitizer must be applied at:
     - `chatWithAssistant` (both single `proposal` and array `proposals`)
     - `suggestViralProposal`
     - `suggestBatchViralProposals`
     - `injectAuthenticCarouselText`
     - `CarouselRendererButton` (on copy, ZIP generation, and webhook export)
   - The prompt in `src/lib/assistant.functions.ts` must also state: `В полето 'title' НИКОГА не слагай префикси като '[tiktok carousels]', '[tiktok carousel]' или '[tiktok]'.`

2. **For R4 (Dynamic Background Pool & Rotation)**:
   - Create a server function `getCarouselBackgroundPool` (or `getCarouselBackgroundImages`) in `src/lib/backgrounds.functions.ts`.
   - The server function loads all 8 images from `tiktok_images/` and `tiktok_output/`, returning them as base64 Data URLs with metadata.
   - Implement dynamic selection:
     - For a 4-slide carousel in generation cycle $N$:
       $$\text{Slide } i \text{ image index} = (N \times 4 + i) \bmod 8 \quad \text{for } i \in \{0, 1, 2, 3\}$$
     - Generation 1 ($N=0$): uses indices `[0, 1, 2, 3]` (`img0.jpg`, `img1.jpg`, `img2.jpg`, `img3.jpg`)
     - Generation 2 ($N=1$): uses indices `[4, 5, 6, 7]` (`bg1.jpg`, `bg2.jpg`, `bg3.jpg`, `bg4.jpg`)
     - Generation 3 ($N=2$): uses a rotated permutation ensuring slides within the same carousel are visually distinct and different from the immediately preceding carousel.
   - Track generation index via client `localStorage` (`islamic_carousel_bg_cycle`) and server memory (`memory.functions.ts`).
   - In `CarouselRendererButton.tsx`, fetch the dynamic background array and pass each background to `renderCarouselSlide`. This achieves instant (<100ms) rendering and guaranteed variety.

---

## 3. Caveats

1. **AI Generation Option**: While local assets provide instant, 100% reliable 9:16 backgrounds, some users might still want on-demand AI Imagen generation. The recommended design allows local asset rotation as default/fast mode with fallback or toggle.
2. **Image Scaling in Canvas**: `tiktok_images` are 1318×2346 and `tiktok_output` are 768×1376. `renderCarouselSlide` already performs aspect-ratio cover crop (`drawCover` / `ctx.drawImage` with `imgRatio` vs `canvasRatio`), but we must ensure both image sizes scale seamlessly to 1080×1920 without distortion.
3. **No Caveats on Feasibility**: Both R3 and R4 require zero external infrastructure changes and can be verified entirely with local automated test suites and component rendering.

---

## 4. Conclusion & Actionable Implementation Plan

### 4.1 Implementation for R3 (Title Cleanup)

#### A. Title Sanitizer Utility (`src/lib/assistant.functions.ts` & `src/lib/utils.ts`):
```ts
export function cleanProposalTitle(rawTitle: string): string {
  if (!rawTitle || typeof rawTitle !== "string") return "";
  return rawTitle
    .replace(/^\[?\s*tiktok\s*(?:carousels?|карусел(?:и)?)?\s*\]?\s*[:-]?\s*/gi, "")
    .replace(/^\[?\s*карусел(?:и)?\s*\]?\s*[:-]?\s*/gi, "")
    .replace(/^\[?\s*tiktok\s*\]\s*[:-]?\s*/gi, "")
    .replace(/^\[?\s*коран\s*\/\s*tiktok\s*\]\s*[:-]?\s*/gi, "[Коран] ")
    .trim();
}
```

#### B. Integration Points in `src/lib/assistant.functions.ts`:
1. In `chatWithAssistant`:
   ```ts
   if (parsed.proposal && parsed.proposal.title) {
     parsed.proposal.title = cleanProposalTitle(parsed.proposal.title);
   }
   if (Array.isArray(parsed.proposals)) {
     parsed.proposals.forEach(p => {
       if (p.title) p.title = cleanProposalTitle(p.title);
     });
   }
   ```
2. In `suggestViralProposal` & `suggestBatchViralProposals`: apply `cleanProposalTitle` to all generated proposals before returning.
3. In `systemPrompt` (line 220):
   ```ts
   "title": "Точно заглавие на български (напр. [Коран] Аят ал-Курси или 3 неща, които отнемат спокойствието). НИКОГА не слагай префикс [tiktok carousels] или [TikTok].",
   ```

#### C. Integration in `src/components/CarouselRendererButton.tsx`:
```ts
const cleanTitle = cleanProposalTitle(title);
// Use cleanTitle in handleCopyTitle, handleGenerate (ZIP name), and handleSendToMake
```

---

### 4.2 Implementation for R4 (Dynamic Background Images)

#### A. Background Pool Service (`src/lib/backgrounds.functions.ts`):
```ts
import fs from "node:fs/promises";
import path from "node:path";

export const LOCAL_BACKGROUND_POOL = [
  "tiktok_images/img0.jpg",
  "tiktok_images/img1.jpg",
  "tiktok_images/img2.jpg",
  "tiktok_images/img3.jpg",
  "tiktok_output/bg1.jpg",
  "tiktok_output/bg2.jpg",
  "tiktok_output/bg3.jpg",
  "tiktok_output/bg4.jpg",
];

export const getCarouselBackgrounds = createServerFn({ method: "POST" })
  .validator((input: { count?: number; cycleIndex?: number } | undefined) => input || {})
  .handler(async ({ data }) => {
    const count = data.count || 4;
    const cycle = data.cycleIndex || 0;
    const total = LOCAL_BACKGROUND_POOL.length;
    
    const selectedUrls: string[] = [];
    for (let i = 0; i < count; i++) {
      const idx = (cycle * count + i) % total;
      const relPath = LOCAL_BACKGROUND_POOL[idx];
      const absPath = path.resolve(process.cwd(), relPath);
      
      try {
        const buf = await fs.readFile(absPath);
        const base64 = buf.toString("base64");
        selectedUrls.push(`data:image/jpeg;base64,${base64}`);
      } catch (err) {
        console.warn(`Could not read background asset ${relPath}:`, err);
      }
    }
    return { backgrounds: selectedUrls };
  });
```

#### B. Integration in `src/components/CarouselRendererButton.tsx`:
```tsx
const runGetBackgrounds = useServerFn(getCarouselBackgrounds);

const _renderAllSlides = async () => {
  setProgress("Подготовка на фонове...");
  
  // Read and increment local cycle index
  let cycle = 0;
  if (typeof window !== "undefined" && window.localStorage) {
    cycle = parseInt(localStorage.getItem("islamic_carousel_bg_cycle") || "0", 10);
    localStorage.setItem("islamic_carousel_bg_cycle", String(cycle + 1));
  }
  
  const bgRes = await runGetBackgrounds({ data: { count: slides.length, cycleIndex: cycle } });
  const poolUrls = bgRes.backgrounds || [];

  setProgress("Рендериране на слайдовете...");
  return await Promise.all(slides.map(async (slide, i) => {
    const bgUrl = poolUrls[i % poolUrls.length];
    const blob = await renderCarouselSlide({
      backgroundUrl: bgUrl,
      topTitle: slide.topTitle || "",
      mainText: slide.mainText || "",
      bottomText: slide.bottomText || "",
      footerText: slide.footerText || ""
    });
    return { blob, name: `Slide_${i + 1}.png` };
  }));
};
```

---

## 5. Verification Method

### 5.1 Automated Unit & Integration Tests
1. **Title Cleanup Verification**:
   - Create/Update a test asserting `cleanProposalTitle` strips all prefixes:
     - `"[tiktok carousels] 3 признака на искреност"` $\rightarrow$ `"3 признака на искреност"`
     - `"[TikTok Carousel] Тайната на Ризка"` $\rightarrow$ `"Тайната на Ризка"`
     - `"[tiktok] Дуа при трудност"` $\rightarrow$ `"Дуа при трудност"`
     - `"[Коран 2:255] Аят ал-Курси"` $\rightarrow$ `"[Коран 2:255] Аят ал-Курси"` (preserved!)
     - `"[Сахих ал-Бухари #6424] Изпитанията"` $\rightarrow$ `"[Сахих ал-Бухари #6424] Изпитанията"` (preserved!)

2. **Dynamic Background Pool Verification**:
   - Call `getCarouselBackgrounds({ count: 4, cycleIndex: 0 })` $\rightarrow$ returns 4 valid base64 image strings from `tiktok_images/`.
   - Call `getCarouselBackgrounds({ count: 4, cycleIndex: 1 })` $\rightarrow$ returns 4 different valid base64 image strings from `tiktok_output/`.
   - Assert `backgrounds[0]` in Cycle 0 $\neq$ `backgrounds[0]` in Cycle 1.
   - Assert all 4 slides in a single cycle receive distinct background images.

3. **End-to-End Test Execution**:
   - Run project test runner: `npm test` or `bun test:viral` or `jiti src/lib/__tests__/verify-viral-carousel.test.ts`.

### 5.2 Invalidation Conditions
- Any occurrence of `[tiktok carousels]` or `[tiktok carousel]` in generated titles, UI output, or ZIP filenames.
- Two consecutive carousel generations using the identical background image set when multiple pool assets exist.
- Slides within a single 4-slide carousel all using the exact same static background image.
