# Original User Request

## Initial Request — 2026-08-26T23:34:35+03:00

You are the SWE Light orchestrator for this project.

Working Directory: c:\Users\admin\Downloads\Islamic Reels Studio\.agents\swe_1
Original Request Path: c:\Users\admin\Downloads\Islamic Reels Studio\.agents\ORIGINAL_REQUEST.md

Task Details:
Build an update to the existing carousel generation prompt pipeline in the Islamic Reels Studio app to use proven virality and retention best practices.
1. Enforce Viral Carousel Framework in AI Prompts (in src/lib/assistant.functions.ts, src/lib/carousel.functions.ts, or related files):
   - Slide 1 (Hook): Must use a curiosity gap, question, or counter-intuitive statement. No generic titles.
   - Middle Slides (Body): Concise text (max 2-3 sentences), structured for easy reading, ending with a cliffhanger or transition to the next slide.
   - Final Slide (CTA): Must include a specific, value-driven action (e.g., "Save this checklist", "Share this reminder").
2. Maintain Existing Constraints: Do not break existing Tawheed taxonomy integration or memory/exclusion engine. Authentic Dalils must still be included seamlessly.
3. Verification & Deliverables:
   - A new or updated verification script (verify-viral-carousel.test.ts or similar) running successfully via Node/Bun.
   - The test runs the generator 3 times and asserts that Slide 1 text contains hook elements and the final slide contains explicit CTA keywords (e.g., "Запази", "Сподели", "Коментирай" in Bulgarian).
   - A text file `viral_samples_output.txt` is generated at the project root containing 3 sample carousels that visibly demonstrate the new viral structure.

Maintain your progress in your working directory (`progress.md` and `BRIEFING.md`). When finished, report back with your completion summary.

## 2026-08-29T14:44:50Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview
> Requested team: [none — teamwork routes from the description]

An upgrade to the existing Islamic Reels Studio web application. The goal is to improve the TikTok photo carousel generation logic (currently generating static images) to better format Ayah/Hadith text versus human commentary, ensure text fits within TikTok UI safe zones, strip specific prefixes from the AI-generated video title, and introduce dynamic background images using the existing local assets.

Working directory: `C:\Users\admin\Downloads\Islamic Reels Studio`
Integrity mode: development

## Requirements

### R1. Text Formatting & Differentiation
Modify the text rendering/AI generation logic to differentiate Quran/Hadith text from human words using intervals (spacing) and distinct colors in the final generated carousel slides.

### R2. TikTok Safe Zone & Text Wrapping
Update the carousel rendering layout (`CarouselRendererButton` or equivalent) to ensure all text remains completely inside the visible TikTok safe area, avoiding overlap with TikTok UI elements (like side buttons, footer titles, etc.). Text must be intelligently wrapped so it is fully readable and not cut off mid-sentence.

### R3. Title Generation Cleanup
Update the Gemini prompt/parsing logic in `src/lib/assistant.functions.ts` (or wherever the title is generated) to ensure any prefix like "[tiktok carousels]" is stripped out of the final title string before it is presented to the user.

### R4. Dynamic Background Images
Update the carousel generation to use different background images from the existing background image source (e.g., `tiktok_images` or `src/assets`), rather than the same one every time.

## Acceptance Criteria

### Verification
- [ ] Text in generated carousel images is visibly differentiated by color and spacing when it is an Ayah/Hadith vs human commentary.
- [ ] Rendered text is strictly within TikTok safe zones and does not cut off mid-sentence.
- [ ] The generated video/carousel title does not contain the string "[tiktok carousels]".
- [ ] Successive carousel generations pick different background images from the existing asset pool.

