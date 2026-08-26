# E2E Test Infra: Islamic Reels Studio — Tawheed Diversity & State Tracking

## Test Philosophy
- Opaque-box, requirement-driven verification derived strictly from `ORIGINAL_REQUEST.md`.
- Verifies state-tracked topic generation, authentic Tawheed diversity, 0% hook duplicates, and strict adherence to 4-slide carousel standards without depending on mock mocks.

## Feature Inventory & Test Mapping
| # | Feature | Source (Requirement) | Tier 1 (Feature) | Tier 2 (Boundary/Edge) | Tier 3 (Cross-Feature) | Tier 4 (Real-World) |
|---|---------|----------------------|:----------------:|:----------------------:|:----------------------:|:-------------------:|
| 1 | Diverse Tawheed Topics (R1) | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 2 | State Tracking Mechanism (R2) | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| 3 | Cliché & Duplicate Avoidance | ORIGINAL_REQUEST §R1, §R2 | 5 | 5 | ✓ | ✓ |
| 4 | 4-Slide Halal Carousel Structure | ORIGINAL_REQUEST §Verification | 5 | 5 | ✓ | ✓ |

## Test Architecture
- **Runner**: Node.js v24.18.0 with `jiti` (`./node_modules/.bin/jiti src/lib/__tests__/verify-tawheed-carousel.test.ts`) or `npm run test:carousel`.
- **Location**: `src/lib/__tests__/verify-tawheed-carousel.test.ts`.
- **Pass/Fail Semantics**:
  - Exit code 0 on complete pass across all test assertions.
  - Non-zero exit code with detailed assertion failure message on any violation.
- **Coverage Assertions**:
  1. Multi-cycle simulation ($\ge 3$ consecutive generations).
  2. Sequential state progression: $N_{history} = N - 1$ at start of cycle $N$, and $N_{history} = N$ at end of cycle $N$.
  3. Pillar rotation and diversity: cycles cover distinct Tawheed categories (Rububiyyah, Uluhiyyah, Asma was-Sifat).
  4. 0% duplicate hooks and semantic diversity.
  5. 4-slide structure integrity: Slide 1 (Hook), Slide 2 (Explanation), Slide 3 (Authentic Quran/Hadith dalil), Slide 4 (CTA/Du'a).
  6. Visual prompt compliance: Salafi Halal rules (no faces/people/animals in `imagePrompt`).
