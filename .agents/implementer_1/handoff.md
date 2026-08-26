# Handoff Report: Viral Carousel Generation Framework Implementation

## 1. What was Changed
- **`src/lib/carousel.functions.ts`**:
  - Upgraded `buildCarouselSystemPrompt` to enforce the **Viral Carousel Framework**:
    - **Slide 1 (Hook)**: Curiosity gap, provocative question, or counter-intuitive statement. Strictly bans generic titles (`Таухид`, `Вяра`, etc.) and existential clichés.
    - **Slide 2 (Body 1)**: Concise explanation (max 2-3 sentences), structured for rapid reading and retention, ending with a suspenseful cliffhanger transition to Slide 3.
    - **Slide 3 (Body 2 / Authentic Dalil)**: Direct citation of authentic Quran Ayah or Sahih Hadith dalil, structured concisely, ending with transition to action.
    - **Slide 4 (Final CTA)**: Specific, value-driven action with explicit Bulgarian CTA keywords (`Запази`, `Сподели`, `Коментирай`) and du'a/solution.
  - Upgraded deterministic `fallbackSlides` to strictly match the Viral Carousel Framework structure.
- **`src/lib/assistant.functions.ts`**:
  - Updated `chatWithAssistant` system prompt instructions for carousel creation to match the Viral Carousel Framework.
  - Updated `injectAuthenticCarouselText` to maintain body slide brevity, sentence chunking, cliffhangers, and ensure Slide 4 always carries explicit value CTA keywords.
  - Updated `suggestBatchViralProposals` carousel prompt template.
- **`src/routes/_app/assistant.tsx`**:
  - Updated `handleNextCarouselQuickAction` prompt template with Viral Carousel Framework rules.
  - Updated `handleGenerateCarouselClick` user prompt.
- **`package.json`**:
  - Added `"test:viral": "jiti src/lib/__tests__/verify-viral-carousel.test.ts"`.
- **`src/lib/__tests__/verify-viral-carousel.test.ts`**:
  - Comprehensive automated verification suite testing:
    1. Prompt framework directives validation.
    2. Multi-cycle (3 cycles) generation verifying Slide 1 hook, Slide 2/3 brevity and cliffhangers, Slide 3 Dalil, Slide 4 CTA keywords (`Запази`, `Сподели`, `Коментирай`), and Salafi Halal visual purity.
    3. Outputting `viral_samples_output.txt` at the project root with 3 formatted sample carousels.
- **`viral_samples_output.txt`**:
  - Generated deliverable at project root containing 3 sample carousels.

## 2. Why
To align the Islamic Reels Studio carousel pipeline with proven retention and virality mechanics on TikTok/Instagram Reels while strictly preserving orthodox Salafi theological authenticity (Quran, Sahih Sunnah, 3-pillar Tawheed taxonomy), negative exclusion engine, and Halal visual constraints (no animate beings/people/faces/animals).

## 3. Verification Record
- **Deep Verification (ran actual tests):**
  1. `npm run test:viral` — Ran 3 full generation cycles, validated hook curiosity gap, body length/transitions, authentic Dalils, CTA keywords (`Запази`, `Сподели`, `Коментирай`), and Halal visual prompts. Generated `viral_samples_output.txt`. **PASSED (3/3)**.
  2. `npm run test` — Ran `verify-tawheed-carousel.test.ts` (30-cycle diversity simulation, pillar balancing, negative exclusion) and `verify-sync.test.ts` (monotonicity, bounds, phonetic weighting). **PASSED (5/5)**.
  3. `npx jiti src/lib/__tests__/stress-carousel-engine.test.ts` — Ran 30-cycle exhaustion/reset, array bounds TTL pruning, corrupted state recovery, negative exclusion formatter stress, fallback purity, concurrency. **PASSED (6/6)**.
  4. `npx jiti src/lib/__tests__/adversarial-challenger.test.ts` — Ran 100-cycle simulation, mixed representations, hook deduplication, file lock stress. **PASSED (4/4)**.
  5. `npx jiti src/lib/__tests__/adversarial-diversity.test.ts` — Ran taxonomy cliché scans, hook bigram similarity, prompt generator scaling, 100-cycle rotation. **PASSED (5/5)**.
- **Deliverables Verified:**
  - File `viral_samples_output.txt` created at project root (size: 11,506 bytes, 113 lines) with 3 full sample carousels.

## 4. Known Issues
- `None` (All 23 verification, stress, and adversarial test suites passed 100%).

## 5. Untested Edge Cases & Next Step
- Review generated carousels in `viral_samples_output.txt`.
