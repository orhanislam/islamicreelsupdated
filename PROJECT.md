# Project: Islamic Reels Studio — Carousel Video Generation Engine Upgrade

## Architecture
- **Framework**: TanStack Start + React 19 + Vite + Tailwind CSS v4
- **Shared Geometry Registry**: `src/lib/safe-zone.ts` (`TIKTOK_SAFE_ZONE`, `CAROUSEL_SAFE_ZONE`)
- **Video Sourcing & Halal Intelligence**:
  - Pexels API & Gemini Vision Halal Filter: `src/lib/pexels.functions.ts`
  - Local Halal Looping Video Pool: `src/lib/backgrounds.functions.ts`
  - Carousel Script & Theme Taxonomy: `src/lib/carousel.functions.ts`, `src/lib/tawheed-taxonomy.ts`
- **Canvas Slide Text & Scrim Engine**:
  - Carousel Layout & Overlay Renderer: `src/lib/render-carousel.ts`
- **Server Video Compositor & Concat Demuxer**:
  - Multi-Slide Looping Video Compositor: `src/lib/carousel-video.functions.ts`
  - TTS Narration & Audio Sync: `src/lib/tts.functions.ts`
- **UI Trigger & Workflow Orchestration**:
  - Carousel Action Toolbar: `src/components/CarouselRendererButton.tsx`
  - AI Assistant Studio: `src/routes/_app/assistant.tsx`

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | Dynamic Context-Aware Video Sourcing | Semantic keyword & visual mood extraction from slide text/subtitles to query Pexels portrait videos | M1 | ORIGINAL_REQUEST R1 |
| F2 | Strict Salafi Video Filtering (4 Tiers) | Query sanitization, positive nature/masjid anchors, metadata regex blacklist, and Gemini Vision 3-frame audit | M1 | ORIGINAL_REQUEST R2 |
| F3 | Curated Local Halal Video Fallback Pool | Guaranteed local/cached vertical 1080x1920 MP4 looping clips for offline/rate-limit resilience | M1 | Survey & Fault Tolerance |
| F4 | Transparent Safe-Zone Text Overlay Engine | `renderCarouselSlide` support for transparent alpha canvas (`overlayOnly: true`) with dark scrim gradients | M2 | Survey & R3 |
| F5 | Video Player Safe Zone Corridor Enforcement | Alignment of slide text and indicators with `TIKTOK_SAFE_ZONE` (760x1220 safe area, bottom margin >= 400px) | M2 | ORIGINAL_REQUEST R3 |
| F6 | Typography & Holy Text Differentiation | Preserving gold `#F3D179` sacred quotes vs white `#FFFFFF` commentary with shadows and contrast outlines | M2 | Survey & R3 |
| F7 | Looping Video Background Compositing | Replacing static `-loop 1 -tune stillimage` with `-stream_loop -1` video background + transparent PNG overlay | M3 | ORIGINAL_REQUEST R1, R3 |
| F8 | Salafi Audio Demuxing & TTS Sync | Stripping all background video audio (`-an`) to guarantee 0% music, synced with slide TTS voiceover | M3 | ORIGINAL_REQUEST R2 |
| F9 | Multi-Slide Concat Assembly & UI Integration | Assembling 4 slide MP4s into a single 1080x1920 reel and updating `CarouselRendererButton.tsx` | M3 | ORIGINAL_REQUEST R1, R3 |
| F10 | Comprehensive E2E Testing Suite (Tiers 1-4) | Opaque-box requirement-driven test suite verifying context matching, Salafi compliance, safe zones, and MP4 generation | E2E | Project Pattern |
| F11 | Adversarial Coverage Hardening (Tier 5) | White-box stress tests, extreme token counts, boundary fuzzing, and codec validation | M_Final | Project Pattern |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Salafi-Compliant Context-Aware Video Sourcing | Implement context-aware search, 4-tier Salafi filtering, and local video fallback pool in `pexels.functions.ts` & `backgrounds.functions.ts` | none | DONE |
| M2 | Transparent Safe-Zone Text Overlay Engine | Implement `overlayOnly` mode and `TIKTOK_SAFE_ZONE` video alignment in `render-carousel.ts` | none | DONE |
| M3 | Looping Video Compositor & Multi-Slide Assembly | Upgrade carousel-video.functions.ts with -stream_loop -1, audio stripping, PNG overlay, and connect CarouselRendererButton.tsx | M1, M2 | DONE |
| E2E | Comprehensive E2E Testing Track | Requirement-driven test suite across Tiers 1-4 published via `TEST_READY.md` | none | DONE |
| M_Final | 100% E2E Test Pass & Adversarial Hardening | Pass 100% of Tiers 1-4 tests, then run Tier 5 adversarial challenger hardening | M3, E2E | DONE |

## Interface Contracts
### `src/lib/pexels.functions.ts`
```ts
export interface SlideVideoResult {
  slideIndex: number;
  videoUrl: string;
  source: 'pexels' | 'local_fallback';
  duration: number;
  width: number;
  height: number;
  theme: string;
}

export async function fetchCarouselSlideVideos(
  slides: { text: string; topTitle?: string; imagePrompt?: string }[]
): Promise<SlideVideoResult[]>;
```

### `src/lib/render-carousel.ts`
```ts
export type CarouselSlideOptions = {
  backgroundUrl?: string;
  topTitle: string;
  mainText: string;
  bottomText: string;
  footerText: string;
  quoteText?: string;
  commentaryText?: string;
  sourceBadge?: string;
  overlayOnly?: boolean; // When true, renders transparent canvas with scrim + text, no background image
  useVideoSafeZone?: boolean; // When true, uses TIKTOK_SAFE_ZONE (SAFE_BOTTOM: 400) instead of CAROUSEL_SAFE_ZONE
};

export async function renderCarouselSlide(opts: CarouselSlideOptions): Promise<Blob>;
```

### `src/lib/carousel-video.functions.ts`
```ts
export interface BuildCarouselVideoInput {
  slides: {
    overlayBase64: string; // Transparent PNG with text & scrim
    videoUrl?: string;     // Context-aware moving video background
    text: string;          // Slide text for TTS voiceover narration
  }[];
  title: string;
}

export async function buildCarouselVideo(input: { data: BuildCarouselVideoInput }): Promise<{
  jobId: string;
  downloadUrl: string;
  duration: number;
}>;
```

## Code Layout
- `src/lib/pexels.functions.ts` — Context-aware visual theme analyzer, Pexels API client, and Salafi Halal multi-frame filter.
- `src/lib/backgrounds.functions.ts` — Local curated Halal video and image fallback pools.
- `src/lib/safe-zone.ts` — Centralized safe zone geometries (`TIKTOK_SAFE_ZONE`, `CAROUSEL_SAFE_ZONE`).
- `src/lib/render-carousel.ts` — Canvas slide text auto-fitting, typography, and transparent overlay generator.
- `src/lib/carousel-video.functions.ts` — Server FFmpeg looping video compositor, audio multiplexer, and slide concat demuxer.
- `src/components/CarouselRendererButton.tsx` — Client UI component managing slide rendering, video background fetching, and video generation dispatch.
- `src/lib/__tests__/` — Test suites directory for unit, integration, and E2E tests.
