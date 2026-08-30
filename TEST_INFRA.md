# E2E Test Infra: Islamic Reels Studio UI Layout & Safe Zone Fixes

## Test Philosophy
- **Opaque-Box, Requirement-Driven**: Tests are derived strictly from \ORIGINAL_REQUEST.md\ (R1: Prevent Text Overflow, R2: Respect Safe Zones, R3: Prevent Text Overlap, Acceptance Criteria) and \PROJECT.md\.
- **Progressive Testability & Isolation**: Self-contained executable tests that verify interface contracts, geometric bounds, and layout algorithms without brittle dependencies.
- **Systematic 4-Tier Test Architecture**:
  - **Tier 1**: Feature Coverage (>=5 test cases per feature across Carousel, Photo, Video, Server ASS, and Live Preview).
  - **Tier 2**: Boundary & Corner Cases (>=5 test cases per feature covering empty inputs, extreme text lengths, unbreakable tokens, font limit clamps, aspect ratios).
  - **Tier 3**: Cross-Feature Combinations (Pairwise combinations: photo lower-third + long text, video platform profiles, ASS karaoke scale vs reference pill, preview typography vs container sizes).
  - **Tier 4**: Real-World Application Scenarios (Realistic Quran & Hadith workloads: Ayatul Kursi full reel, Hadith Nawawi #1 4-slide carousel, Surah Al-Ikhlas photo post, TikTok viral caption reel, Sahih Muslim #2699 reel).

## Feature Inventory
| # | Feature | Source (Requirement) | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|---|---------|---------------------|:------:|:------:|:------:|:------:|
| F1 | Unified Safe Zone Geometry Registry (\safe-zone.ts\) | R2 (Safe Zones) | >=5 | >=5 | >=2 | >=2 |
| F2 | Photo Canvas Safe Zone Alignment & Auto-Fit (\ender-photo.ts\) | R1, R2, R3 | >=5 | >=5 | >=2 | >=2 |
| F3 | Client Video Safe Zone & Subtitle Alignment (\ender-video.ts\) | R1, R2, R3 | >=5 | >=5 | >=2 | >=2 |
| F4 | Server ASS Subtitle Safe Positioning & Slicing (\ender.functions.ts\) | R1, R2, R3 | >=5 | >=5 | >=2 | >=2 |
| F5 | Live UI Preview & Title Sanitizer (\create.tsx\, \ssistant.functions.ts\) | R1, R2, R3 | >=5 | >=5 | >=2 | >=2 |
| F6 | Carousel Multi-Slide Safe Corridor Engine (\ender-carousel.ts\) | R1, R2, R3 | >=5 | >=5 | >=2 | >=2 |

## Test Architecture & Framework
- **Test Runner**: \
px jiti src/lib/__tests__/e2e-safe-zones-and-layout.test.ts\
- **Language & Runtime**: TypeScript 5.8 / Node.js 24+
- **Execution Mode**: Direct headless execution with deterministic mock canvas metrics and mathematical verification of layout invariants.
- **Pass/Fail Semantics**: Exit code 0, 100% assertions passed, zero geometric collisions, zero bounding box breaches.

## Invariant Rubric & Oracles
1. **R1 Ч Prevent Text Overflow (Horizontal & Vertical)**:
   - Text bounding boxes must never exceed \W_SAFE\ (760px on TikTok 1080x1920).
   - Vertical bounding boxes must never exceed \H_SAFE\ (1220px on TikTok 1080x1920).
   - Dynamic decremental font scaling must gracefully reduce font size down to lower bounds without hardcoded overflow overrides.
2. **R2 Ч Respect Safe Zones (Platform Profiles)**:
   - TikTok: \SAFE_TOP = 300\, \SAFE_BOTTOM = 400\, \SAFE_LEFT = 100\, \SAFE_RIGHT = 220\ (X in [100, 860], Y in [300, 1520]).
   - Instagram Reels: \SAFE_TOP = 220\, \SAFE_BOTTOM = 320\, \SAFE_LEFT = 80\, \SAFE_RIGHT = 120\ (X in [80, 960], Y in [220, 1600]).
   - YouTube Shorts: \SAFE_TOP = 200\, \SAFE_BOTTOM = 360\, \SAFE_LEFT = 80\, \SAFE_RIGHT = 140\ (X in [80, 940], Y in [200, 1560]).
   - Universal: \SAFE_TOP = 300\, \SAFE_BOTTOM = 400\, \SAFE_LEFT = 100\, \SAFE_RIGHT = 220\.
3. **R3 Ч Prevent Text Overlap (Inter-element Clearances)**:
   - Reference Pill top anchor: >= \SAFE_TOP\ (300px).
   - Arabic / Subtitle text top anchor: >= \pillY + pillH + 24px\.
   - Sacred vs Commentary separation: vertical interval >= 48px.
   - Title Sanitizer: social bracket tags (e.g. \[tiktok carousels]\) stripped, scripture citation brackets (e.g. \[ оран 2:255]\) preserved 100%.

## Coverage Thresholds
- **Tier 1 (Feature Coverage)**: >=25 tests across all 5 engines.
- **Tier 2 (Boundary & Corner Cases)**: >=25 tests covering stress conditions.
- **Tier 3 (Cross-Feature Combinations)**: >=6 pairwise combinatorial tests.
- **Tier 4 (Real-World Application Scenarios)**: >=5 end-to-end Quran/Hadith workflows.
- **Total Minimum Target**: >=61 test assertions across all 4 tiers.
