# Handoff Report — Tawheed Domain Taxonomy & Testing Architecture

## 1. Observation

1. **`package.json` Test Environment**:
   - `package.json` (lines 6-14) contains scripts `"dev"`, `"build"`, `"start"`, `"build:dev"`, `"preview"`, `"lint"`, `"format"`. It currently lacks a `"test"` script.
   - Node.js runtime is `v24.18.0`.
   - `jiti` is available in `node_modules/.bin/jiti`.
   - Running `./node_modules/.bin/jiti src/lib/__tests__/verify-sync.test.ts` completed with exit code 0:
     ```
     Running subtitle synchronization verification tests...
     ✔ testMonotonicityAndBounds passed!
     ✔ testPhoneticWeighting passed! { durV: 0.3600000000000001, durMilo: 1.768 }
     ✔ All subtitle synchronization verification tests passed successfully!
     ```

2. **Memory and Usage History Recording (`src/lib/memory.functions.ts`)**:
   - Lines 6-10:
     ```typescript
     export type UsageHistoryEntry = {
       type: "quran" | "hadith";
       identifier: string; // e.g. "quran:2:255" or "hadith:nawawi40:1"
       timestamp: number;
     };
     ```
   - Lines 77-85:
     ```typescript
     for (const p of proposals) {
       if (!p) continue;
       let identifier = "";
       if (p.type === "quran" && p.surah && p.ayah) {
         identifier = `quran:${p.surah}:${p.ayah}`;
       } else if (p.type === "hadith" && p.collection && p.number) {
         identifier = `hadith:${p.collection}:${p.number}`;
       }
     ```
   - Proposal type `"carousel"` is omitted, so `identifier` remains `""` and no carousel generation history is ever stored in `usageHistory`.

3. **Carousel Generation Entry Points**:
   - `src/lib/carousel.functions.ts` (lines 21-38): `generateCarouselScript` accepts `{ topic: string }` without tracking history or consulting a Tawheed taxonomy.
   - `src/routes/_app/assistant.tsx` (line 798): Quick action toolbar sends a generic prompt: `"Генерирай ми TikTok карусел на силна ислямска тема... Избери тема свързана с Таухид..."` without selecting specific subtopics or injecting past carousel hooks.
   - `src/routes/_app/assistant.tsx` (lines 86-108): `localStorage` tracks `usedQuranKeys` and `usedHadithKeys`, but no carousel topic keys.

---

## 2. Logic Chain

1. **Why Topics Repeated (Observation #2 & #3 $\rightarrow$ Root Cause)**:
   - When the user requested carousels, the LLM received open-ended prompts without explicit sub-topic assignment or a negative exclusion list of past generated topics/hooks.
   - Because `recordProposalUsages` explicitly ignored `type === "carousel"`, `memory.usageHistory` was never populated with carousel topics.
   - Without an active memory context or negative constraints, LLMs default to high-probability generic monotheistic hooks (e.g. "Защо си тук?" / "Why are you here?").

2. **Tawheed Taxonomy Solution (Observation #2 $\rightarrow$ Architectural Design)**:
   - Defining a structured 3-pillar taxonomy (Ar-Rububiyyah, Al-Uluhiyyah, Al-Asma was-Sifat) with 25+ specific subtopics provides a discrete pool for deterministic or randomized non-repeating selection.
   - Rotating across pillars ensures that every consecutive generation touches a completely different dimension of Tawheed.

3. **State Tracking Solution (Observation #2 & #3 $\rightarrow$ Implementation Strategy)**:
   - Extending `UsageHistoryEntry` to include `type: "carousel"`, `category`, `subtopic`, `hook`, and `title` ensures both `assistant_memory.json` (server) and `localStorage` (client) retain generation records.
   - Reading `usageHistory` and passing past hooks as negative constraints ("СТРИКТНО ЗАБРАНЕНО Е ДА ПОВТАРЯШ СЛЕДНИТЕ ТЕМИ...") prevents the LLM from generating similar themes.

4. **Testing Architecture (Observation #1 $\rightarrow$ Verification Strategy)**:
   - Since `jiti` is already present and proven to execute TypeScript tests seamlessly without compilation steps, a multi-iteration test script (`src/lib/__tests__/verify-tawheed-carousel.test.ts`) can be added and registered in `package.json` as `"test:carousel"`.

---

## 3. Caveats

1. **Live Gemini API Calls in Tests**:
   - Automated CI environments or tests run without network access or valid `GEMINI_API_KEY` in `.env` will fail if tests require live network calls. The test suite should support both a deterministic mock simulation and a live API mode.
2. **Quota Management**:
   - Running dozens of consecutive live LLM generations in tests may hit Gemini rate limits (429). The test suite should focus on $\ge 3$ consecutive cycles to keep verification rapid and quota-safe.
3. **No Code Implementation in Explorer Phase**:
   - As per explorer archetype constraints, source code was surveyed and analyzed without modifying implementation files.

---

## 4. Conclusion

1. The root cause of topic repetition is the complete absence of carousel history persistence in `src/lib/memory.functions.ts` combined with generic prompts lacking structured Tawheed sub-topic selection.
2. A comprehensive 3-pillar Tawheed taxonomy with 25+ authentic subtopics has been designed and mapped to Quranic and Sahih Hadith dalils.
3. A verification test design running $\ge 3$ consecutive carousel cycles has been formulated to prove state persistence, 0% duplicate hooks, valid taxonomy categorization, and 4-slide format adherence.
4. The test execution environment is validated using `jiti` with Node.js v24.18.0.

---

## 5. Verification Method

To independently verify these findings:

1. **Check package.json and Test Runner Execution**:
   ```powershell
   ./node_modules/.bin/jiti src/lib/__tests__/verify-sync.test.ts
   ```
   *Expected result*: Exits with code 0 and logs passing tests.

2. **Inspect Memory File & Typing**:
   - Inspect `src/lib/memory.functions.ts` (lines 6-10 and 77-85) to confirm `carousel` type is omitted from `UsageHistoryEntry` and `recordProposalUsages`.

3. **Inspect Carousel Prompt Logic**:
   - Inspect `src/routes/_app/assistant.tsx` (lines 798-812) and `src/lib/carousel.functions.ts` (lines 21-38) to confirm lack of taxonomy injection and history exclusion.

4. **Future Implementation Verification Command**:
   ```powershell
   ./node_modules/.bin/jiti src/lib/__tests__/verify-tawheed-carousel.test.ts
   ```
