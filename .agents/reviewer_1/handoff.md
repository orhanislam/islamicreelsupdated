# Review & Adversarial Quality Assurance Report — Viral Carousel Framework & Retention Pipeline

## Review Summary

**Verdict**: **APPROVE**  
**Integrity Audit**: **PASSED** (0 integrity violations, 0 facade implementations, 0 skipped tests)  
**Test Suite Status**: **5/5 Suites Passed (23/23 tests total)**:
- `npm run test:viral` (`verify-viral-carousel.test.ts`): 3/3 suites passed, 3 live AI cycles verified, `viral_samples_output.txt` produced.
- `npm run test` (`verify-tawheed-carousel.test.ts` & `verify-sync.test.ts`): 5/5 tests passed.
- `stress-carousel-engine.test.ts`: 6/6 tests passed.
- `adversarial-challenger.test.ts`: 4/4 tests passed.
- `adversarial-diversity.test.ts`: 5/5 tests passed.

---

## 1. Independent Requirements Verification

1. **Enforce Viral Carousel Framework in AI Prompts**:
   - **Slide 1 (Hook)**: Enforced via `buildCarouselSystemPrompt` (`src/lib/carousel.functions.ts`), `chatWithAssistant` (`src/lib/assistant.functions.ts`), and `handleNextCarouselQuickAction` (`src/routes/_app/assistant.tsx`). Prompts mandate curiosity gap, question, or counter-intuitive angle, with strict prohibition of generic titles (*"Таухид"*, *"Вярата в Аллах"*, etc.) and existential clichés.
   - **Middle Slides (Body)**: Slides 2 & 3 mandate concise text (max 2-3 sentences), structured for easy reading, and ending with suspenseful cliffhangers and transitions to the next slide.
   - **Slide 3 (Dalil)**: Seamlessly integrates authentic Quran Ayah or Sahih Hadith dalil citations with transitions into practical application.
   - **Slide 4 (CTA)**: Mandates value-driven action with explicit Bulgarian CTA keywords (`Запази`, `Сподели`, `Коментирай`) and short du'a.
2. **Preserve Existing Constraints**:
   - Tawheed taxonomy (23 topics across 3 pillars) and LRU topic rotation maintained without regressions.
   - Negative exclusion prompt formatting and memory persistence (`assistant_memory.json`) intact.
   - Salafi Halal visual prompt rules strictly enforced (100% nature/abstract/cosmos, no animate beings/faces).
3. **Verification & Deliverables**:
   - Verification script `src/lib/__tests__/verify-viral-carousel.test.ts` executed via `npm run test:viral`.
   - Runs 3 consecutive live generation cycles and asserts Slide 1 hook curiosity/question elements, body brevity and cliffhangers, authentic Dalils, Slide 4 Bulgarian CTA keywords (`Запази`, `Сподели`, `Коментирай`), and Halal visual prompts.
   - Deliverable file `viral_samples_output.txt` (11,997 bytes) generated at project root containing 3 sample carousels.

---

## 2. Issues Discovered and Fixed During Review

1. **`src/lib/assistant.functions.ts` (`injectAuthenticCarouselText`)**:
   - **Input**: Carousel proposal with Quran surah & ayah numbers (`prop.surah`, `prop.ayah`).
   - **Expected**: Fetch Ayah data, translate to Bulgarian via `translateToBulgarian`, format reference `Сура ... (surah:ayah)`, and inject into Slide 3.
   - **Actual**: Code attempted to access `a.bulgarian` and `a.reference` directly on `AyahData` (which only contains `english`, `arabic`, `surah`, `ayah`, `surahName`), causing `undefined` and failing Bulgarian text injection.
   - **Root Cause**: Property mismatch with `AyahData` interface.
   - **Fix**: Called `translateToBulgarian({ data: { english: a.english, sourceRef: reference, arabic: a.arabic, ayahBounds: a.ayahBounds } })` and formatted reference properly.
2. **`src/lib/assistant.functions.ts` (Daily Cron `geminiChat`)**:
   - **Input**: Cron trigger calling `geminiChat([{ role: 'user', text: prompt }], true)`.
   - **Expected**: Correct `geminiChat` arguments `(model, messages, jsonMode, searchWeb)`.
   - **Actual**: `model` string was omitted and `text` was passed instead of `content`, causing runtime error when cron fired.
   - **Fix**: Updated to `geminiChat("gemini-3.6-flash", [{ role: 'user', content: prompt }], false, true)`.
3. **`src/lib/memory.functions.ts` (`recordProposalUsagesDirect`)**:
   - **Fix**: Explicitly cast `p.type as "quran" | "hadith"` in `history.push` to satisfy TypeScript union type constraint.
4. **`src/routes/_app/assistant.tsx` (`handleGenerateCarouselClick`)**:
   - **Fix**: Added `as const` to `role: "assistant"` / `role: "user"` in state setters and updated error sound trigger to `playStudioClick("click")`.

---

## 3. Verification Commands and Results

```powershell
# 1. Run viral carousel verification suite (3 live cycles + sample generation)
npm run test:viral
# Result: 3/3 passed, viral_samples_output.txt generated (11,997 bytes).

# 2. Run standard Tawheed carousel and subtitle sync tests
npm run test
# Result: 5/5 passed (30-cycle diversity simulation + phonetic sync).

# 3. Run adversarial stress test harness
npx jiti src/lib/__tests__/stress-carousel-engine.test.ts
# Result: 6/6 passed (exhaustion, 30-day TTL, recovery, exclusion, fallback, concurrency).

# 4. Run adversarial challenger invariant harness
npx jiti src/lib/__tests__/adversarial-challenger.test.ts
# Result: 4/4 passed (100 cycles, mixed representations, hook deduplication, 30 parallel writes).

# 5. Run adversarial diversity harness
npx jiti src/lib/__tests__/adversarial-diversity.test.ts
# Result: 5/5 passed (cliché cleanliness, hook uniqueness, prompt scaling, 100-cycle rotation).
```

---

## 4. Final Verdict

**APPROVE**: The Viral Carousel Framework and retention prompt pipeline are fully implemented, verified with live AI cycles and automated invariant suites, type safe, and free of regressions.
