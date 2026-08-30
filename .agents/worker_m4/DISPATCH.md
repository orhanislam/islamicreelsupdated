## 2026-08-30T12:33:07Z
You are the Worker for Milestone 4 (Live UI Preview, Safe Zone Guides & Title Sanitizer).
Your working directory is: c:\Users\admin\Downloads\Islamic Reels Studio\.agents\worker_m4
The project workspace is: c:\Users\admin\Downloads\Islamic Reels Studio

Read ORIGINAL_REQUEST.md at:
c:\Users\admin\Downloads\Islamic Reels Studio\.agents\ORIGINAL_REQUEST.md

Read PROJECT.md at:
c:\Users\admin\Downloads\Islamic Reels Studio\PROJECT.md

Read Milestone 4 Explorer handoff reports at:
- c:\Users\admin\Downloads\Islamic Reels Studio\.agents\explorer_m4_1\handoff.md
- c:\Users\admin\Downloads\Islamic Reels Studio\.agents\explorer_m4_2\handoff.md
- c:\Users\admin\Downloads\Islamic Reels Studio\.agents\explorer_m4_3\handoff.md

Your exclusive write ownership for this milestone:
- `src/components/SafeZoneOverlayGuide.tsx`
- `src/routes/_app/create.tsx`
- `src/lib/assistant.functions.ts`
- `src/lib/__tests__/verify-preview-hardening.test.ts`

Task Instructions:
1. Create `src/components/SafeZoneOverlayGuide.tsx`:
   - Interactive React component displaying semi-transparent safe zone boundaries (top header buffer 15.6%, bottom caption area 20.8%, right sidebar button corridor 20.4%, left margin 9.3%, optical center guide X=480px / 44.4%) with platform profile switching (`tiktok`, `reels`, `shorts`, `universal`, `center`).
   - Uses `getNormalizedSafeZone` and `getSafeOverlayCss` from `src/lib/safe-zone.ts`.
2. Update `src/routes/_app/create.tsx`:
   - Integrate `SafeZoneOverlayGuide` into `.preview-inner` with a toggle state `showSafeZones` and toggle button in the preview toolbar.
   - Align live preview subtitle vertical positioning to match `subtitlePosition` (`top-[72%]` for lower-third vs `top-[50%]` for center).
   - Align scripture reference badge to `top-[15.6%]`.
   - Use container query / fluid typography (`[container-type:inline-size]` on `.preview-inner`, font sizes `clamp(14px, 5.5cqi, 30px)` and `clamp(10px, 3.5cqi, 18px)`).
   - Relocate the preview `<audio>` player element from floating inside `.preview-inner` at `bottom-4` to a docked audio transport card beneath the 9:16 frame.
3. Update `src/lib/assistant.functions.ts`:
   - Fix `cleanProposalTitle` to strip only unwanted metadata tags (e.g. `[TikTok Carousel]`, `[Карусели]`, `[Слайд 1]`, `[Viral]`) while strictly preserving authentic theological scripture brackets (e.g. `[Коран 2:255]`, `[Сахих ал-Бухари #6424]`, `(112:1-4)`).
4. Implement `src/lib/__tests__/verify-preview-hardening.test.ts` containing all 5 test suites from `explorer_m4_3`'s report (title sanitizer bracket preservation, SafeZoneOverlayGuide CSS mappings, preview coordinate alignment, audio layout clearance, and build verification).
5. Run all verification and regression tests:
   - `npx jiti src/lib/__tests__/verify-preview-hardening.test.ts`
   - `npx jiti src/lib/__tests__/verify-photo-carousel-upgrade.test.ts`
   - `npx jiti src/lib/__tests__/verify-video-hardening.test.ts`
   - `npx jiti src/lib/__tests__/verify-photo-hardening.test.ts`
   - `npx jiti src/lib/__tests__/verify-safe-zone.test.ts`
   - `npx jiti src/lib/__tests__/e2e-safe-zones-and-layout.test.ts`
   - `npm test`
   - `npm run build`
   - `npx eslint src/components/SafeZoneOverlayGuide.tsx src/routes/_app/create.tsx src/lib/assistant.functions.ts src/lib/__tests__/verify-preview-hardening.test.ts`
6. Ensure 100% tests and build pass with exit code 0.
7. Write your complete handoff report to:
   c:\Users\admin\Downloads\Islamic Reels Studio\.agents\worker_m4\handoff.md
