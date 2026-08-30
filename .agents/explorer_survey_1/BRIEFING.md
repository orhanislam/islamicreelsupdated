# BRIEFING — 2026-08-30T07:05:00Z

## Mission
Conduct a thorough codebase structure and UI component analysis for Islamic Reels Studio to pinpoint all layout, safe zone, container overflow, text overlap, and hardcoded dimension issues.

## 🔒 My Identity
- Archetype: explorer
- Roles: codebase structure analysis, UI component & layout analysis, safe zone & rendering audit
- Working directory: c:\Users\admin\Downloads\Islamic Reels Studio\.agents\explorer_survey_1
- Original parent: 7bf2431e-525e-40db-859b-c45f88f2de9b
- Milestone: Survey & Investigation

## 🔒 Key Constraints
- Read-only investigation — do NOT modify source code files.
- Deliver findings in handoff.md following 5-component report structure.

## Current Parent
- Conversation ID: 7bf2431e-525e-40db-859b-c45f88f2de9b
- Updated: 2026-08-30T07:05:00Z

## Investigation State
- **Explored paths**:
  - `package.json`, `PROJECT.md`, `styles.css`
  - `src/routes/_app/create.tsx`, `src/routes/_app/assistant.tsx`, `src/routes/_app/downloads.tsx`, `src/routes/_app/route.tsx`, `src/routes/index.tsx`, `src/routes/internal/render.tsx`
  - `src/components/CarouselRendererButton.tsx`, `src/components/ui/`
  - `src/lib/render-photo.ts`, `src/lib/render-video.ts`, `src/lib/render-carousel.ts`, `src/lib/render.functions.ts`, `src/lib/thumbnail.functions.ts`, `src/lib/assistant.functions.ts`, `src/lib/caption.functions.ts`
  - `src/lib/__tests__/` (17 automated test files)
- **Key findings**:
  - Full codebase mapped: React 19 + TanStack Start/Router + Vite 8 + Tailwind CSS v4.
  - Pinpointed 5 distinct rendering and preview systems with disparate, conflicting safe zone models and hardcoded dimensions:
    1. `render-photo.ts`: hardcoded `SAFE={top:320, bottom:280, side:180}`, `drawReferencePill` at `y=280` overlapping Arabic text (`y=320`), `autoFit` fallback overflow at `42px`, `Math.max(420, verticalForBg)` causing overflow, no collision detection in `lower-third` or `centered` modes.
    2. `render-video.ts`: symmetrical `side:180` and `bottom:280` ignoring TikTok right sidebar (220px) and bottom caption (400px), `targetBottomY = 0.74*H` pushing scaled text into bottom UI, `drawReferencePill` at `y=280` in top UI obstruction zone, horizontal center at `540` instead of safe center `480`.
    3. `render.functions.ts`: ASS subtitles centered at `540` (`\pos(540, 1350)`), naive word-count line wrapping (`wpl`) causing massive horizontal spill, 8-12 line Ayah texts expanding upward from `1350px` to collide with Reference badge at `y=380px`.
    4. `src/routes/_app/create.tsx`: Live preview DOM uses fixed `fontSize: "24px"` and `fontSize: "16px"`, placed dead center (50%) instead of lower-third (74%), lacking safe zone boundaries and overlapping with audio controls.
    5. `thumbnail.functions.ts`: SVG text hardcoded at `x=540`, `font-size="76"` with naive 22-char wrapping extending to `x=1005px` inside TikTok right sidebar.
    6. `render-carousel.ts`: Features correct `TIKTOK_SAFE_ZONE` (`W_SAFE:760, H_SAFE:1220, CENTER_X:480, SAFE_TOP:300, SAFE_BOTTOM:400, SAFE_LEFT:100, SAFE_RIGHT:220`) but its logic is isolated and unshared.
- **Unexplored areas**: None — full codebase survey complete.

## Key Decisions Made
- Documented exhaustive inventory of all 6 components, exact line numbers, mathematical coordinates, and architectural recommendations in handoff.md.

## Artifact Index
- handoff.md — Comprehensive 5-component survey and diagnostic report.
