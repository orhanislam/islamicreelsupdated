# BRIEFING — 2026-08-30T12:41:30Z

## Mission
Implement Milestone 4: Live UI Preview Hardening, SafeZoneOverlayGuide Component, Container Queries / Audio Relocation, and Title Sanitizer Scripture Bracket Preservation.

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: c:\Users\admin\Downloads\Islamic Reels Studio\.agents\worker_m4
- Original parent: 7bf2431e-525e-40db-859b-c45f88f2de9b
- Milestone: Milestone 4 (Live UI Preview, Safe Zone Guides & Title Sanitizer)

## 🔒 Key Constraints
- Exclusive write ownership:
  - `src/components/SafeZoneOverlayGuide.tsx`
  - `src/routes/_app/create.tsx`
  - `src/lib/assistant.functions.ts`
  - `src/lib/__tests__/verify-preview-hardening.test.ts`
- Preserve authentic theological scripture brackets in `cleanProposalTitle` (e.g. `[Коран 2:255]`, `[Сахих ал-Бухари #6424]`, `(112:1-4)`).
- Relocate preview audio element beneath 9:16 frame.
- Add `SafeZoneOverlayGuide` to `.preview-inner` with platform profile switching and toggle state.
- Align live preview subtitle vertical positioning to match `subtitlePosition` (`top-[72%]` vs `top-[50%]`) and reference badge to `top-[15.6%]`.
- Container query typography with fluid scaling.
- Pass 100% tests and ESLint.

## Current Parent
- Conversation ID: 7bf2431e-525e-40db-859b-c45f88f2de9b
- Updated: 2026-08-30T12:41:30Z

## Task Summary
- **What to build**: SafeZoneOverlayGuide component, UI preview hardening in `create.tsx`, scripture-preserving `cleanProposalTitle`, test suite `verify-preview-hardening.test.ts`.
- **Success criteria**: All tests pass, build passes, ESLint passes, 0 regressions across all milestones.

## Change Tracker
- **Files modified**:
  - `src/components/SafeZoneOverlayGuide.tsx`: Created visual overlay component for safe zones with platform switcher (TikTok, Reels, Shorts, Universal, Center), optical center line, and danger buffers.
  - `src/routes/_app/create.tsx`: Added `showSafeZones` toggle button and platform selector, container queries `[container-type:inline-size]` on `.preview-inner`, fluid `clamp()` font scaling, dynamic subtitle vertical anchoring (`top-[72%]` vs `top-[50%]`), aligned reference badge to `top-[15.6%]`, and relocated audio transport card beneath 9:16 preview.
  - `src/lib/assistant.functions.ts`: Fixed `cleanProposalTitle` to strip platform/viral/format metadata tags while strictly preserving authentic theological scripture brackets.
  - `src/lib/__tests__/verify-preview-hardening.test.ts`: Created 5-suite comprehensive test verifying title sanitizer, CSS overlays, responsive preview coords, audio docking, and exports.
- **Build status**: PASS (Vite + Nitro built in 3.31s with exit code 0)
- **Pending issues**: none

## Quality Status
- **Build/test result**: 100% PASS (18/18 verify-preview-hardening, 29/29 verify-video-hardening, 26/26 verify-photo-hardening, 53/53 verify-safe-zone, 63/63 e2e-safe-zones-and-layout, npm test PASS)
- **Lint status**: 0 errors on modified files
- **Tests added/modified**: `src/lib/__tests__/verify-preview-hardening.test.ts` (18 assertions across 5 suites)
