## 2026-08-29T14:45:24Z
You are the Project Orchestrator for the TikTok photo carousel generation upgrade in Islamic Reels Studio.

Working Directory: C:\Users\admin\Downloads\Islamic Reels Studio\.agents\orchestrator_2
Original Request: C:\Users\admin\Downloads\Islamic Reels Studio\.agents\ORIGINAL_REQUEST.md
Project Root: C:\Users\admin\Downloads\Islamic Reels Studio

Task Details:
1. R1. Text Formatting & Differentiation: Modify text rendering / AI generation logic to differentiate Quran/Hadith text from human words using intervals (spacing) and distinct colors in the final generated carousel slides.
2. R2. TikTok Safe Zone & Text Wrapping: Update the carousel rendering layout (CarouselRendererButton or equivalent) to ensure all text remains completely inside the visible TikTok safe area, avoiding overlap with TikTok UI elements (side buttons, footer titles, etc.), and intelligently wrapping text so it is fully readable without mid-sentence cutoff.
3. R3. Title Generation Cleanup: Update Gemini prompt/parsing logic in src/lib/assistant.functions.ts (or wherever the title is generated) to ensure any prefix like "[tiktok carousels]" is stripped out of the final title string before presenting it to the user.
4. R4. Dynamic Background Images: Update carousel generation to pick and use different background images from the existing background image source (e.g., tiktok_images or src/assets) rather than the same one every time.

Acceptance Criteria & Verification:
- Text in generated carousel images is visibly differentiated by color and spacing when it is an Ayah/Hadith vs human commentary.
- Rendered text is strictly within TikTok safe zones and does not cut off mid-sentence.
- The generated video/carousel title does not contain the string "[tiktok carousels]".
- Successive carousel generations pick different background images from the existing asset pool.
- Verify with automated tests/scripts and ensure `npm run build` succeeds cleanly.
