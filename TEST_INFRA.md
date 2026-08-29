# E2E Test Infra: TikTok Photo Carousel Generation Upgrade

## Test Philosophy
- Opaque-box, requirement-driven. Derived from `ORIGINAL_REQUEST.md`.
- Systematic 4-tier methodology: Category-Partition, Boundary Value Analysis, Pairwise Combinatorial Testing, Real-World Workload Testing.

## Feature Inventory
| # | Feature | Source (Requirement) | Tier 1 | Tier 2 | Tier 3 |
|---|---------|---------------------|:------:|:------:|:------:|
| 1 | Title Sanitization (strip `[tiktok carousels]`) | ORIGINAL_REQUEST §R3 | ≥5 | ≥5 | ✓ |
| 2 | Dynamic Background Rotation & Pool Loading | ORIGINAL_REQUEST §R4 | ≥5 | ≥5 | ✓ |
| 3 | Ayah/Hadith Dual-Color & Spacing Differentiation | ORIGINAL_REQUEST §R1 | ≥5 | ≥5 | ✓ |
| 4 | TikTok Safe Zone & Intelligent Wrapping | ORIGINAL_REQUEST §R2 | ≥5 | ≥5 | ✓ |

## Test Architecture
- Test runner: `jiti` / `vitest` / Node test scripts
- Automated suite: `src/lib/__tests__/verify-carousel-upgrade.test.ts`
- Pass/fail semantics: Exit code 0, all assertions pass, layout bounds strictly respected.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Complete 4-slide Tawheed Carousel Generation (Ayah al-Kursi) with Dynamic Background & Title Sanitization | F1, F2, F3, F4 | High |
| 2 | Multi-generation Consecutive Cycles asserting background rotation and non-repeating sequence | F2 | Medium |
| 3 | Extreme Long Hadith Quote Auto-Fit within TikTok Safe Zones with Zero Truncation | F3, F4 | High |
| 4 | Edge-case Title inputs (nested brackets, legacy prefixes, raw Quran citations) | F1 | Medium |
| 5 | Full Make.com webhook & ZIP export payload compliance | F1, F2, F3, F4 | High |

## Coverage Thresholds
- Tier 1 (Feature Coverage): ≥5 tests per feature (≥20 tests)
- Tier 2 (Boundary & Corner Cases): ≥5 tests per feature (≥20 tests)
- Tier 3 (Cross-Feature Combinations): ≥4 tests covering pairwise interactions
- Tier 4 (Real-World Application): ≥5 end-to-end application scenarios
- **Total Minimum Target**: ≥49 test assertions in suite
