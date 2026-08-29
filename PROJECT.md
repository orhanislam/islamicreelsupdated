# Project: TikTok Photo Carousel Generation Upgrade

## Architecture
Islamic Reels Studio generates 4-slide TikTok photo carousels (1080x1920 9:16) with Tawheed theological authenticity and viral structure. The system consists of:
1. **AI Generation & Prompt Engine** (`src/lib/assistant.functions.ts`, `src/lib/carousel.functions.ts`): Produces structured 4-slide carousel scripts with Hook, Body, Dalil (Quran/Hadith), and CTA, accompanied by sanitized titles and prompt instructions.
2. **Background Asset Service** (`src/lib/backgrounds.functions.ts`): Dynamically serves and rotates high-resolution vertical background assets from local pools (`tiktok_images/`, `tiktok_output/`).
3. **Canvas Rendering Engine** (`src/lib/render-carousel.ts`): Client/server-compatible Canvas 2D renderer formatting text within TikTok UI safe zones with intelligent word wrapping, auto-fit dynamic scaling, and dual-color differentiation for Quran/Hadith vs human commentary.
4. **Interactive UI & Export Layer** (`src/components/CarouselRendererButton.tsx`, `src/routes/_app/assistant.tsx`): Integrates slide generation, background fetching, live progress, ZIP bundle download, title copying, and Make.com webhook automation.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Title Sanitizer & Prompt Cleanup (R3) | Strip `[tiktok carousels]` and similar prefixes from titles while preserving Quran/Hadith citations | M1 | ORIGINAL_REQUEST R3 |
| 2 | Dynamic Background Pool & Rotation (R4) | Serve 8 local background assets from `tiktok_images/` & `tiktok_output/` with multi-slide and inter-generation rotation | M2 | ORIGINAL_REQUEST R4 |
| 3 | Quran/Hadith Differentiation & Spacing (R1) | Dual-color styling (gold for sacred text, crisp white for commentary) with dedicated vertical interval spacing | M3 | ORIGINAL_REQUEST R1 |
| 4 | TikTok Safe Zone & Intelligent Wrapping (R2) | Exact 1080x1920 safe zone margins (`SAFE_TOP=300`, `SAFE_BOTTOM=400`, `SAFE_LEFT=100`, `SAFE_RIGHT=220`, `CENTER_X=480`) + auto-fit downscaling | M4 | ORIGINAL_REQUEST R2 |
| 5 | E2E Testing Suite & Quality Assurance | 4-Tier requirement-driven opaque-box test suite + Tier 5 adversarial coverage hardening | M5 | ORIGINAL_REQUEST Acceptance |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Title Generation Cleanup (R3) | `src/lib/assistant.functions.ts`, `src/components/CarouselRendererButton.tsx`, `src/routes/_app/assistant.tsx` | None | DONE |
| M2 | Dynamic Background Images (R4) | `src/lib/backgrounds.functions.ts`, `src/components/CarouselRendererButton.tsx` | None | DONE |
| M3 | Ayah/Hadith Differentiation (R1) | `src/lib/carousel.functions.ts`, `src/lib/assistant.functions.ts`, `src/lib/render-carousel.ts` | None | DONE |
| M4 | TikTok Safe Zone & Wrapping (R2) | `src/lib/render-carousel.ts`, `src/components/CarouselRendererButton.tsx` | M3 | DONE |
| M5 | E2E Testing Track & Final Hardening | `src/lib/__tests__/`, `TEST_READY.md`, E2E test execution & verification | M1, M2, M3, M4 | DONE |

## Interface Contracts

### M1: Title Sanitizer Contract
```ts
export function cleanProposalTitle(rawTitle: string): string;
// Strips: [tiktok carousels], [tiktok carousel], [tiktok], [карусел], [карусели], [коран / tiktok]
// Preserves: [Коран 2:255] Аят ал-Курси, [Сахих ал-Бухари #6424]
```

### M2: Dynamic Backgrounds Contract
```ts
export const LOCAL_BACKGROUND_POOL: string[];
export const getCarouselBackgrounds: ServerFunction<{ count?: number; cycleIndex?: number }, { backgrounds: string[] }>;
```

### M3: Slide Segment & Dual-Color Contract
```ts
export interface CarouselSlideData {
  topTitle: string;
  mainText: string;
  bottomText: string;
  footerText: string;
  imagePrompt: string;
  quoteText?: string;
  commentaryText?: string;
  sourceBadge?: string;
}

export type CarouselSlideOptions = {
  backgroundUrl: string;
  topTitle: string;
  mainText: string;
  bottomText: string;
  footerText: string;
  quoteText?: string;
  commentaryText?: string;
};
```

### M4: Safe Zone Layout Contract
```ts
export const TIKTOK_SAFE_ZONE = {
  W: 1080,
  H: 1920,
  SAFE_TOP: 300,
  SAFE_BOTTOM: 400,
  SAFE_LEFT: 100,
  SAFE_RIGHT: 220,
  get W_SAFE() { return this.W - this.SAFE_LEFT - this.SAFE_RIGHT; }, // 760px
  get H_SAFE() { return this.H - this.SAFE_TOP - this.SAFE_BOTTOM; }, // 1220px
  get CENTER_X() { return this.SAFE_LEFT + this.W_SAFE / 2; },         // 480px
};
```

## Code Layout
- `src/lib/assistant.functions.ts`: Gemini assistant prompts, proposal parsers, and title sanitization.
- `src/lib/carousel.functions.ts`: 4-slide viral carousel prompt generation, schema, and taxonomy injection.
- `src/lib/backgrounds.functions.ts`: Local background pool loader and dynamic rotation server function.
- `src/lib/render-carousel.ts`: Canvas 2D 1080x1920 rendering engine with safe zones, wrapping, auto-fit, and dual-color segmentation.
- `src/components/CarouselRendererButton.tsx`: Client component rendering slides, dynamic background fetching, ZIP export, Make.com webhook.
- `src/routes/_app/assistant.tsx`: Main assistant view consuming sanitized titles and carousel proposals.
- `src/lib/__tests__/`: Automated unit and integration test suite.
- `tiktok_images/`, `tiktok_output/`: High-resolution vertical background image assets.
