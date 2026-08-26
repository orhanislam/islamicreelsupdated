# Task Briefing - Viral Carousel Prompt Pipeline Upgrade

## Objectives
1. **Viral Carousel Framework Integration**:
   - Update prompt templates and system prompts in `src/lib/carousel.functions.ts`, `src/lib/assistant.functions.ts`, and `src/routes/_app/assistant.tsx` to enforce proven virality and retention best practices.
   - **Slide 1 (Hook)**: Must use a curiosity gap, question, or counter-intuitive statement. Explicitly ban generic titles.
   - **Middle Slides (Body - Slides 2 & 3)**: Concise text (max 2-3 sentences), structured for rapid reading and high retention, ending with a cliffhanger or transition to the next slide (e.g. "Но ето тайната...", "Виж доказателството на следващия слайд...").
   - **Slide 3 (Authentic Dalil)**: Seamlessly embed Quran Ayah / Sahih Hadith with accurate reference without breaking theological authenticity.
   - **Final Slide (Slide 4 CTA)**: Must include a specific, value-driven action with explicit Bulgarian CTA keywords (e.g., "Запази", "Сподели", "Коментирай" - e.g. "Запази този чек-лист за следващата си молитва", "Сподели това напомняне за садака джария").
2. **Preserve Existing Architecture**:
   - Maintain full compatibility with the Tawheed 3-pillar taxonomy (`rububiyyah`, `uluhiyyah`, `asma_was_sifat`).
   - Preserve memory tracking, negative exclusions, LRU topic selection, and anti-cliché filters.
   - Maintain 100% Salafi Halal visual prompt guidelines (nature/architecture only, no humans/faces/animals).
3. **Verification & Deliverables**:
   - Verification test `src/lib/__tests__/verify-viral-carousel.test.ts` running via jiti/bun/node.
   - Test runs 3 full carousel generations asserting hook elements, body length/transitions, Dalil inclusion, and final slide CTA keywords ("Запази", "Сподели", "Коментирай").
   - Project root artifact `viral_samples_output.txt` containing 3 formatted sample carousels.
