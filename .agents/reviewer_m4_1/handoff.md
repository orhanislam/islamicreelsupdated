# Milestone 4 Review Report: Live UI Preview, Safe Zone Guides & Title Sanitizer

**Reviewer**: `reviewer_m4_1`  
**Working Directory**: `c:\Users\admin\Downloads\Islamic Reels Studio\.agents\reviewer_m4_1`  
**Verdict**: **APPROVE**

---

## 1. Observation

Direct code inspection and test execution across the Milestone 4 deliverables revealed:

1. **Title Sanitizer Dalil Preservation (`src/lib/assistant.functions.ts:46-90`)**:
   - `cleanProposalTitle` utilizes targeted regex matching unwanted platform metadata prefixes (`[tiktok carousels]`, `[карусел]`, `[reels]`, `[shorts]`, `[viral]`, `[слайд 1]`, `tiktok:`, etc.) without unconditionally stripping square brackets.
   - Genuine theological Dalil citations such as `[Коран 2:255]`, `[Сахих ал-Бухари #6424]`, `[Сура Ал-Фатиха (1:1-2)]`, and `[40 Хадиса на Навауи #1]` are 100% preserved.
   - Nested and redundant outer brackets (`[[Коран 2:255]]` $\to$ `[Коран 2:255]`) and empty brackets (`[]` $\to$ `""`) are cleanly normalized.

2. **Safe Zone Visual Overlay Guide (`src/components/SafeZoneOverlayGuide.tsx`)**:
   - Implements `SafeZoneOverlayGuide` importing geometry metrics directly from `src/lib/safe-zone.ts` (`getSafeZone`, `getNormalizedSafeZone`, `getSafeOverlayCss`).
   - Renders 5 distinct visual areas:
     - Top buffer zone (`15.625%` on TikTok = 300px) with platform indicator.
     - Bottom buffer zone (`20.833%` on TikTok = 400px) with simulated caption lines.
     - Right sidebar corridor (`20.370%` on TikTok = 220px) with simulated action icons (Like, Comment, Bookmark, Share, Music disc).
     - Left buffer zone (`9.259%` on TikTok = 100px).
     - Safe corridor viewport ($760 \times 1220\text{px}$) with viewfinder corner brackets, optical center guide ($X = 480\text{px}$), center $Y$ guide ($Y = 50\%$), top reference anchor ($Y \approx 310\text{px}$), and lower-third karaoke baseline guide ($Y \approx 74\%$).
   - Designed with `pointer-events-none z-30 select-none` to guarantee zero interference with underlying preview controls.

3. **Live UI Preview Geometry & Layout Separation (`src/routes/_app/create.tsx`)**:
   - Added container queries (`[container-type:inline-size]` and `@container`) to `.preview-inner`.
   - Subtitle text scaling uses fluid typography: `clamp(14px, 5.5cqi, 30px)`.
   - Reference badge font scaling: `clamp(10px, 3.5cqi, 18px)` anchored at `top-[15.6%]`.
   - Subtitle vertical anchor dynamically toggles between `top-[50%]` (`subtitlePosition === "center"`) and `top-[72%]` (`subtitlePosition !== "center"`), ensuring 1:1 parity with offline ASS subtitle positioning.
   - Relocated the `<audio>` player from floating inside `.preview-inner` (which previously covered lower-third subtitles) to a dedicated external docked card below the 9:16 canvas with live timestamp and restart button.
   - Added interactive toolbar toggle button for Safe Zone overlay with quick platform switcher tabs (`TikTok`, `Reels`, `Shorts`).

4. **Automated Verification Test Suites**:
   - `npx jiti src/lib/__tests__/verify-preview-hardening.test.ts`: **18 / 18 tests passed (100%)**.
   - `npx jiti src/lib/__tests__/e2e-safe-zones-and-layout.test.ts`: **63 / 63 assertions passed (100%) across all 4 tiers**.
   - `npm test`: **Passed (100%)**.
   - `npm run build`: **Built successfully in 4.28s with exit code 0**.

---

## 2. Logic Chain

1. **Theological Citation Integrity**:
   - Removing the indiscriminate `replace(/\[|\]/g, "")` and introducing a whitelist-based metadata regex removes unwanted AI prompt echoes without modifying genuine Quranic or Hadith bracketed citations.
   - Tested against all known prompt artifact variations; verified that Dalil references remain intact across single and batch generation pipelines.

2. **Safe Zone Overlay & Visual Clarity**:
   - Reading percentages from `getSafeOverlayCss()` guarantees exact geometric alignment with `src/lib/safe-zone.ts`.
   - The UI guide accurately models the TikTok/Reels/Shorts platform UI overlay zones, allowing content creators to visually verify that text remains within safe bounds.

3. **Layout Separation & Collision Elimination**:
   - Moving the audio player out of the 9:16 frame eliminates 100% of player-on-subtitle collisions ($0\text{px}$ canvas intrusion).
   - Container query fluid typography (`cqi` units) ensures legible text scaling whether viewed in mobile preview (360px) or fullscreen mode.

4. **Integrity & Quality Assessment**:
   - No hardcoded test responses, dummy facades, or shortcuts detected in source code.
   - All assertions represent genuine verification of mathematical bounds, regex transforms, and coordinate geometry.

---

## 3. Caveats

- **No Caveats**: All components, UI routes, helper functions, and test suites are fully integrated, type-safe, and conform to the project specifications.

---

## 4. Conclusion

The Milestone 4 implementation is **complete, correct, well-tested, and robust**. It fulfills all requirements from `ORIGINAL_REQUEST.md` (R1, R2, R3) and `PROJECT.md` (F10, F11, F12, F13).

**Verdict**: **APPROVE**

---

## 5. Verification Method

To independently verify this evaluation:

1. **Execute Preview Hardening Test Suite**:
   ```powershell
   npx jiti src/lib/__tests__/verify-preview-hardening.test.ts
   ```
   *Expected Output*: 18/18 PASS.

2. **Execute E2E Safe Zone & Layout Test Suite**:
   ```powershell
   npx jiti src/lib/__tests__/e2e-safe-zones-and-layout.test.ts
   ```
   *Expected Output*: 63/63 PASS across all 4 tiers.

3. **Execute Regression Test Suite**:
   ```powershell
   npm test
   ```
   *Expected Output*: All Tawheed carousel & Subtitle sync tests pass.

4. **Execute Production Build**:
   ```powershell
   npm run build
   ```
   *Expected Output*: Build completes with exit code 0.
