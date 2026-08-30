# BRIEFING — 2026-08-30T07:06:55Z

## Mission
Analyze how `src/lib/safe-zone.ts` should be structured to cleanly replace redundant hardcoded constants across all rendering modules without breaking backward compatibility, specifying exact bounding box calculations, center points, max allowed text width, and vertical span.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigator, analyzer, synthesizer
- Working directory: c:\Users\admin\Downloads\Islamic Reels Studio\.agents\explorer_m1_2
- Original parent: 7bf2431e-525e-40db-859b-c45f88f2de9b
- Milestone: M1 (Unified Safe Zone Geometry Registry)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement in `src/` (write only within working directory)
- Replace redundant hardcoded constants across all rendering modules
- Maintain backward compatibility
- Specify exact bounding box calculations, center points (X=480 for TikTok, X=500 for Reels/Shorts), max allowed text width ($W_{safe} = 760\text{px}$), and safe vertical span ($Y \in [300, 1520]\text{px}$)

## Current Parent
- Conversation ID: 7bf2431e-525e-40db-859b-c45f88f2de9b
- Updated: 2026-08-30T07:06:55Z

## Investigation State
- **Explored paths**:
  - `src/lib/render-photo.ts` (evaluated hardcoded SAFE margins, pill collision, auto-fit overflow)
  - `src/lib/render-video.ts` (evaluated canvas scaling, centering at X=540 vs 480, subtitle positioning)
  - `src/lib/render-carousel.ts` (analyzed existing TIKTOK_SAFE_ZONE, wrapIntelligent, fitSlideLayout)
  - `src/lib/render.functions.ts` (evaluated ASS subtitle generation, symmetric margins 100/100, \pos coordinates)
  - `src/lib/thumbnail.functions.ts` (evaluated SVG overlay center X=540, wrapping thresholds)
  - `src/routes/_app/create.tsx` (evaluated UI preview layout, audio player overlap, missing visual guide overlay)
  - `src/lib/assistant.functions.ts` (evaluated cleanProposalTitle scripture bracket stripping)
  - `src/lib/__tests__/*.test.ts` (verified existing test suite requirements and backward compatibility requirements)
- **Key findings**:
  - `TIKTOK_SAFE_ZONE` in `render-carousel.ts` can be cleanly moved into `src/lib/safe-zone.ts` and re-exported from `render-carousel.ts` to preserve 100% backward compatibility with all test suites.
  - Social profiles calculated: TikTok (X=480, Y in [300, 1520]), Reels (X=500, Y in [280, 1560]), Shorts (X=500, Y in [280, 1540]), Universal (X=480, Y in [300, 1520]), Center (X=540, Y in [300, 1620]).
  - Maximum safe width $W_{safe} = 760\text{px}$ for TikTok/Universal.
  - Complete helper function design ready (`getSafeZone`, `getSafeCorridor`, `scaleSafeZone`, `isWithinSafeZone`, `getSafeAssStyles`, `getSafeOverlayCss`).
- **Unexplored areas**: None for M1 scope.

## Key Decisions Made
- Structured complete architecture for `src/lib/safe-zone.ts` with TypeScript types, immutable profile registry, scaled helper methods, and ASS/CSS helper methods.
- Designed seamless backward compatibility path via re-export in `render-carousel.ts`.

## Artifact Index
- `.agents/explorer_m1_2/DISPATCH.md` — Dispatch log
- `.agents/explorer_m1_2/BRIEFING.md` — Agent briefing & memory
- `.agents/explorer_m1_2/progress.md` — Heartbeat / progress log
- `.agents/explorer_m1_2/handoff.md` — Final structured handoff report
