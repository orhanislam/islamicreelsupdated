# Project: Islamic Reels Studio UI Layout & Safe Zone Fixes

## Architecture
- **Framework**: TanStack Start + React 19 + Vite + Tailwind CSS v4
- **Shared Geometry Registry**: `src/lib/safe-zone.ts` defining standard Safe Zones (`TikTok`, `Instagram Reels`, `YouTube Shorts`, `Universal`)
- **Canvas Render Engines**:
  - Carousel Renderer: `src/lib/render-carousel.ts`
  - Single Photo Renderer: `src/lib/render-photo.ts`
  - Client Video Renderer: `src/lib/render-video.ts`
- **Server Media Engines**:
  - FFmpeg & ASS Subtitles: `src/lib/render.functions.ts`
  - Thumbnail Generator: `src/lib/thumbnail.functions.ts`
- **Interactive UI Preview**:
  - Studio Creator: `src/routes/_app/create.tsx`
  - Assistant Studio: `src/routes/_app/assistant.tsx`
  - Proposal Sanitizer: `src/lib/assistant.functions.ts`

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | Unified Safe Zone Geometry Registry | Standardized safe boundaries for TikTok (300/400/100/220), Reels, Shorts, and Universal 9:16 safe corridor | M1 | Survey & R2 |
| F2 | Photo Canvas Safe Zone Alignment | Update `render-photo.ts` to strictly adhere to safe margins (X: 100-860px, Y: 300-1520px) | M2 | Survey & R2 |
| F3 | Photo Reference Pill & Text Collision Prevention | Position Reference Pill at safe top and anchor Arabic text below pill with guaranteed vertical gap | M2 | Survey & R3 |
| F4 | Photo Dynamic Auto-Fit Engine | Dynamic decremental font scaling down to 24px and remove artificial height override `Math.max(420, ...)` to prevent overflow | M2 | Survey & R1 |
| F5 | Viral Thumbnail SVG Safe Bounding | Restrict thumbnail title SVG to safe corridor with dynamic font scaling to avoid right sidebar button clipping | M2 | Survey & R1, R2 |
| F6 | Client Video Safe Zone & Subtitle Alignment | Update `render-video.ts` to support `opts.subtitlePosition`, center at X=480px (TikTok) / X=500px, clamp bottom anchor to Y<=1520px | M3 | Survey & R2 |
| F7 | Client Video Reference Pill Clearance | Move video reference pill into safe top bounds (Y: 310-340px) | M3 | Survey & R3 |
| F8 | Server ASS Subtitle Safe Positioning & Margins | Configure ASS styles with asymmetric margins (`MarginL: 100`, `MarginR: 220`), dynamic `\pos` per platform profile | M3 | Survey & R2 |
| F9 | Server ASS Dynamic Text Slicing & Wrapping | Replace fixed word-count slicing with pixel/char-width measurement (<= 760px) and vertical collision cap to protect reference badge | M3 | Survey & R1, R3 |
| F10 | Live Preview 1:1 Export Alignment & Typography | Align preview subtitle placement with selected profile (lower-third Y~72-74% vs center Y~50%) and responsive fluid font scaling | M4 | Survey & R1, R2 |
| F11 | Safe Zone Overlay Visual Guide Component | Interactive visual guide overlay in `create.tsx` showing TikTok/Reels UI bounds with user toggle switch | M4 | Survey & R2 |
| F12 | Live Preview Audio Player Layout Separation | Dock or relocate preview audio player below the 9:16 frame to prevent covering bottom video captions | M4 | Survey & R2 |
| F13 | Citation Bracket Preservation | Fix `cleanProposalTitle` in `assistant.functions.ts` to preserve bracketed scripture references (e.g. `[Коран 2:255]`) | M4 | Survey & R3 |
| F14 | Comprehensive E2E Testing Suite (Tiers 1-4) | Requirement-driven opaque-box test suites verifying R1 (overflow), R2 (safe zones), R3 (overlap), and R4 (dynamic adaptation) across all engines | E2E | ORIGINAL_REQUEST |
| F15 | Adversarial Coverage Hardening (Tier 5) | White-box stress tests, extreme token counts, boundary fuzzing, and font metric regression tests | Final | Project Pattern |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Unified Safe Zone Geometry Registry | Create `src/lib/safe-zone.ts` with typed geometries for TikTok, Reels, Shorts, and Universal | none | DONE |
| M2 | Single Photo & Thumbnail Layout Hardening | Implement safe zone margins, dynamic auto-fit, reference pill collision fix in `render-photo.ts` and `thumbnail.functions.ts` | M1 | PLANNED |
| M3 | Video Rendering Engines Hardening | Update `render-video.ts` and `render.functions.ts` for safe zone alignment, profile selection, ASS script margins, and dynamic wrapping | M1 | PLANNED |
| M4 | Live UI Preview, Safe Zone Guides & Title Sanitizer | Implement safe zone visual guide toggle, responsive preview typography, audio player docking in `create.tsx`, and fix `assistant.functions.ts` | M1 | PLANNED |
| M_Final | 100% E2E Test Pass & Adversarial Hardening | Pass all Tiers 1-4 E2E tests, then run Tier 5 adversarial challenger hardening | M2, M3, M4, E2E | PLANNED |
| E2E | E2E Testing Track | Design test runner and test cases across Tiers 1-4 published via `TEST_READY.md` | none | IN_PROGRESS |

## Interface Contracts
### `src/lib/safe-zone.ts`
```ts
export type PlatformSafeZoneProfile = 'tiktok' | 'reels' | 'shorts' | 'universal' | 'center';

export interface SafeZoneGeometry {
  W: number;          // 1080
  H: number;          // 1920
  SAFE_TOP: number;   // e.g. 300
  SAFE_BOTTOM: number;// e.g. 400
  SAFE_LEFT: number;  // e.g. 100
  SAFE_RIGHT: number; // e.g. 220
  W_SAFE: number;     // W - SAFE_LEFT - SAFE_RIGHT (760)
  H_SAFE: number;     // H - SAFE_TOP - SAFE_BOTTOM (1220)
  CENTER_X: number;   // SAFE_LEFT + W_SAFE / 2 (480)
  BOTTOM_MAX_Y: number; // H - SAFE_BOTTOM (1520)
}

export const SOCIAL_SAFE_ZONES: Record<PlatformSafeZoneProfile, SafeZoneGeometry>;
export const TIKTOK_SAFE_ZONE: SafeZoneGeometry;
```

### `render-photo.ts` & `render-video.ts`
- Must import `SOCIAL_SAFE_ZONES` / `TIKTOK_SAFE_ZONE` from `src/lib/safe-zone.ts`.
- Subtitles and text blocks must never exceed `W_SAFE` or draw outside `[SAFE_TOP, BOTTOM_MAX_Y]`.
- Reference Pill must be placed at `SAFE_TOP` (or `SAFE_TOP + 10`), and succeeding text must start at `pillY + pillH + gap` (gap >= 24px).

## Code Layout
- `src/lib/safe-zone.ts` — Centralized safe zone constants and geometric calculation utilities.
- `src/lib/render-photo.ts` — Single photo canvas composer.
- `src/lib/render-video.ts` — Client video canvas + MediaRecorder generator.
- `src/lib/render.functions.ts` — Server FFmpeg ASS subtitle generator & renderer.
- `src/lib/thumbnail.functions.ts` — Viral thumbnail SVG overlay generator.
- `src/routes/_app/create.tsx` — Studio Creator UI & Live Preview player.
- `src/routes/_app/assistant.tsx` — AI Assistant Studio UI.
- `src/lib/assistant.functions.ts` — AI helper functions and proposal title sanitizer.
- `src/lib/__tests__/` — Test suites directory for unit, integration, and E2E tests.
