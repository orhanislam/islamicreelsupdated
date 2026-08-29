# Handoff Report — Explorer 1 (Survey: R1 Text Formatting & Differentiation)

## 1. Observation

Direct code observations from the codebase investigation:

1. **Slide Data Structures**:
   - `src/lib/carousel.functions.ts` (lines 13–19):
     ```ts
     export interface CarouselSlideData {
       topTitle: string;
       mainText: string;
       bottomText: string;
       footerText: string;
       imagePrompt: string;
     }
     ```
   - `src/lib/assistant.functions.ts` (lines 30):
     `carouselSlides?: { topTitle: string; mainText: string; bottomText: string; footerText: string; imagePrompt: string }[];`
   - `src/lib/render-carousel.ts` (lines 4–10):
     ```ts
     export type CarouselSlideOptions = {
       backgroundUrl: string;
       topTitle: string;
       mainText: string;
       bottomText: string;
       footerText: string;
     };
     ```

2. **Concatenation of Sacred Dalil and Human Commentary**:
   - `src/lib/carousel.functions.ts` (lines 68–69):
     `topTitle: Точен цитат и номер (напр. "${chosenTopic.dalilReference}").`
     `mainText: Цитат на самия Аят или Хадис в кавички на правилен български език ("${chosenTopic.dalilTextBg}"), с преход към действието.`
   - `src/lib/carousel.functions.ts` (lines 181–183):
     `topTitle: \`[\${chosenTopic.dalilReference}]\`,`
     `mainText: \`\${chosenTopic.dalilTextBg} А ето как да приложиш това спасение в живота си още днес...\`,`
   - `src/lib/assistant.functions.ts` (lines 91–97):
     ```ts
     const dalilSlide = {
       topTitle: `[${reference}]`,
       mainText: `„${cleanDalil}“ А ето как да приложиш това спасение в живота си още днес...`,
       bottomText: 'Плъзни за духовното решение 👉',
       footerText: '3/4 • Плъзнете наляво',
       imagePrompt: dalilPrompt,
     };
     ```

3. **Homogeneous Canvas Rendering Without Intervals or Distinct Colors**:
   - `src/lib/render-carousel.ts` (lines 124–128):
     ```ts
     ctx.font = fontMain;
     const mainLines: string[] = [];
     for (const raw of opts.mainText.trim().split("\n")) {
       if (raw) mainLines.push(...wrap(ctx, raw, maxW));
     }
     ```
   - `src/lib/render-carousel.ts` (lines 138, 164–167):
     ```ts
     const lhMain = 85;
     ...
     mainLines.forEach(line => {
       drawTextLine(ctx, line, centerX, currentY + (lhMain / 2), fontMain, "#ffedb3");
       currentY += lhMain;
     });
     ```
   - Every line in `mainLines` is rendered with font `700 65px 'Montserrat'` and fillStyle `#ffedb3`. There is no visual separation, no color contrast, and no line gap between the sacred text and the human commentary.

4. **Reference Implementation in `render-photo.ts`**:
   - `src/lib/render-photo.ts` (lines 100–124, 227–278) demonstrates auto-fitting, gold capsule badges (`drawReferencePill`), and distinct font hierarchies for Arabic vs Bulgarian translations.

5. **Test Infrastructure Execution**:
   - Running `npm test` executes `jiti src/lib/__tests__/verify-tawheed-carousel.test.ts && jiti src/lib/__tests__/verify-sync.test.ts` which exited code 0 (5/5 Tawheed tests + sync tests passed).
   - Running `npm run test:viral` executes `jiti src/lib/__tests__/verify-viral-carousel.test.ts`.

---

## 2. Logic Chain

1. **Premise 1 (Observation 1 & 2)**: The carousel AI prompt generators and post-processing helpers (`buildCarouselSystemPrompt`, `generateCarouselScriptDirect`, `injectAuthenticCarouselText`) represent slide text using a monolithic string in `mainText`, combining the holy Quran/Hadith quote (in Bulgarian quotes `„...“`) with human transition commentary.
2. **Premise 2 (Observation 3)**: In `render-carousel.ts`, the Canvas engine wraps `mainText` into lines and iterates over them with uniform line height (`lhMain = 85px`), uniform font size (`65px`), and a single fill color (`#ffedb3`).
3. **Inference (R1 Gap)**: Because there is neither structural differentiation in the data nor parser/styling differentiation in the Canvas renderer, the generated carousel images fail requirement R1 — the audience cannot distinguish divine revelation from human commentary.
4. **Solution Formulation**:
   - Adding optional fields `quoteText?: string`, `commentaryText?: string`, `sourceBadge?: string` to `CarouselSlideData` and `CarouselSlideOptions` provides explicit structural differentiation.
   - Adding an in-text segmentation parser (`parseSlideSegments`) that detects Bulgarian quotation marks `„...“`, standard quotes `"..."`, `«...»`, or dual newlines `\n\n` guarantees backward compatibility with raw AI responses and legacy data.
   - Updating `renderCarouselSlide` in `src/lib/render-carousel.ts` to render `quoteText` in Radiant Gold (`#FFD700` / `#F3D179`, 62px, bold), insert a dedicated vertical interval (`gapQuoteCommentary = 55px`), and render `commentaryText` in Soft Crisp White (`#FFFFFF` / `#E2E8F0`, 48px, medium/semi-bold) completes the visual and theological differentiation.

---

## 3. Caveats

1. **Non-Quote Slides**: Slides 1, 2, and 4 typically contain only human words (Hook, Theological Context, CTA/Du'a). The segmentation engine must safely fall back to single-block general rendering when no quote marks or explicit `quoteText` exist.
2. **Multi-Dalil Slides**: In rare cases where a slide contains two quotes (e.g. Ayah + Hadith), the quotation regex should parse all quoted blocks or format multiple paragraphs with consistent gold styling.
3. **No Code Implementation**: Per the explorer role constraints, no source code has been altered during this survey phase.

---

## 4. Conclusion

Requirement R1 is fully analyzed. The architectural blueprint to achieve text differentiation is:
1. **Schema**: Extend `CarouselSlideData` and `CarouselSlideOptions` with optional `quoteText`, `commentaryText`, `sourceBadge`.
2. **Prompt & Post-Processing**: In `carousel.functions.ts` and `assistant.functions.ts` (`injectAuthenticCarouselText`), format Slide 3 with clear quotation marks and newline separation (`„${cleanDalil}“\n\n${transitionText}`).
3. **Canvas Engine**: In `render-carousel.ts`, parse segments and render:
   - Quran/Hadith quote in **Radiant Gold (`#FFD700` / `#F3D179`)** at 62px.
   - **55px Vertical Interval** between quote and commentary.
   - Human commentary in **Soft Crisp White (`#FFFFFF` / `#E2E8F0`)** at 48px.
   - Top Title / Reference in **Gold Capsule / Badge (`#F3D179`)**.
   - Bottom CTA in **Action Gold / Emerald (`#F3D179` / `#34D399`)**.

---

## 5. Verification Method

1. **Unit & Taxonomy Test**:
   ```powershell
   npm test
   ```
   *Expected result*: Exit code 0, all 5 Tawheed carousel tests and subtitle sync tests pass.

2. **Viral Carousel Framework Test**:
   ```powershell
   npm run test:viral
   ```
   *Expected result*: Exit code 0, validates 3 consecutive carousel generation cycles and generates `viral_samples_output.txt`.

3. **Visual Invalidation Conditions**:
   - If Slide 3 in the generated canvas image renders Quran/Hadith text in the same color as the human commentary → FAIL.
   - If there is no extra spacing/interval between the quote and the transition sentence → FAIL.
   - If legacy single-string `mainText` without `quoteText` fails to render → FAIL.
