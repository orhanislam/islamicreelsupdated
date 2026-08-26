## 2026-08-26T23:34:35+03:00

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
