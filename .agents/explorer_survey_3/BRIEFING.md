# BRIEFING — 2026-08-29T14:49:08Z

## Mission
Investigate R3 (Title Generation Cleanup - strip '[tiktok carousels]') and R4 (Dynamic Background Images selection from asset pool).

## 🔒 My Identity
- Archetype: explorer
- Roles: read-only investigation, codebase search, synthesis
- Working directory: C:\Users\admin\Downloads\Islamic Reels Studio\.agents\explorer_survey_3
- Original parent: 8bfda9e9-5272-49ec-a6bd-62bd513c6b61
- Milestone: Survey Phase - Explorer 3 (R3 & R4) Completed

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Follow Handoff Protocol (5 components)
- Output handoff.md in working directory
- Communicate via send_message with caller

## Current Parent
- Conversation ID: 8bfda9e9-5272-49ec-a6bd-62bd513c6b61
- Updated: 2026-08-29T14:49:08Z

## Investigation State
- **Explored paths**:
  - `src/lib/assistant.functions.ts`
  - `src/lib/carousel.functions.ts`
  - `src/lib/backgrounds.functions.ts`
  - `src/lib/render-carousel.ts`
  - `src/lib/render-photo.ts`
  - `src/components/CarouselRendererButton.tsx`
  - `src/routes/_app/assistant.tsx`
  - `src/routes/_app/create.tsx`
  - `tiktok_images/` & `tiktok_output/`
  - `src/lib/__tests__/verify-viral-carousel.test.ts`
- **Key findings**:
  - R3: Root cause of `[tiktok carousels]` prefix is unconstrained AI prompting and missing sanitization filter across `chatWithAssistant`, `suggestViralProposal`, and `suggestBatchViralProposals`. Concrete `cleanProposalTitle` sanitizer and prompt negative constraint designed.
  - R4: 8 high-res vertical 9:16 background JPEG images exist in `tiktok_images/` (4 images) and `tiktok_output/` (4 images). Current `CarouselRendererButton.tsx` relies on AI image generation which is slow and rate-limited. Concrete `getCarouselBackgrounds` server function with cycle rotation across generations and variety per slide designed.
- **Unexplored areas**: None for R3 and R4.

## Key Decisions Made
- Survey completed. Full findings, code locations, and design written to `handoff.md`.

## Artifact Index
- C:\Users\admin\Downloads\Islamic Reels Studio\.agents\explorer_survey_3\handoff.md — Final survey report for R3 and R4
