# E2E Test Suite Ready: TikTok Photo Carousel Upgrade

## Test Runner
- **Primary Carousel Upgrade E2E Command**: `npx jiti src/lib/__tests__/verify-carousel-upgrade.test.ts`
- **Viral Carousel Verification**: `npx jiti src/lib/__tests__/verify-viral-carousel.test.ts`
- **Tawheed Diversity Test**: `npx jiti src/lib/__tests__/verify-tawheed-carousel.test.ts`
- **Full Test Suite**: `npm test`
- **Expected Result**: Exit code 0, 49/49 assertions passing, 0 compiler errors.

## Coverage Summary
| Tier | Count | Description |
|------|------:|-------------|
| **1. Feature Coverage** | 20 | 4 features × 5 tests (Title Sanitization, Dynamic Background Pool, Sacred/Human Differentiation, TikTok Safe Zone) |
| **2. Boundary & Corner Cases** | 20 | 4 features × 5 edge cases (Empty strings, extreme text lengths, unicode full-width brackets, single-word inputs, overflow) |
| **3. Pairwise Cross-Feature** | 4 | Combinations: Title + Safe Zone, Background Pool + Dual Color, Sacred Extraction + Auto-fit Downscaling, Multi-Slide Modulo Rotation |
| **4. Real-World Application Scenarios** | 5 | End-to-end: Complete 4-Slide Tawheed Carousel, 3-Cycle Consecutive Rotation, Long Hadith Safe Zone Auto-Fit, 10-Title Batch Validation, Make.com & ZIP Export Payload |
| **Total Test Assertions** | **49 / 49** | **100% Passed (Exit Code 0)** |

## Feature Checklist
| Feature | Tier 1 | Tier 2 | Tier 3 | Tier 4 | Status |
|---------|:------:|:------:|:------:|:------:|:------:|
| **F1: Title Generation Cleanup (R3)** (strip `[tiktok carousels]`, preserve `[Коран 2:255]`) | 5 | 5 | ✓ | ✓ | **VERIFIED** |
| **F2: Dynamic Background Pool & Rotation (R4)** (8 local assets, multi-cycle rotation) | 5 | 5 | ✓ | ✓ | **VERIFIED** |
| **F3: Sacred/Human Differentiation (R1)** (Gold quote, White commentary, vertical interval) | 5 | 5 | ✓ | ✓ | **VERIFIED** |
| **F4: TikTok Safe Zone Compliance (R2)** (corridor `[100, 860] × [300, 1520]`, auto-fit downscale) | 5 | 5 | ✓ | ✓ | **VERIFIED** |

## Key Test Assertions Executed
1. **Title Sanitizer (R3)**:
   - Strips `[tiktok carousels]`, `[tiktok carousel]`, `[tiktok]`, `[карусел]`, `[карусели]`, `[коран / tiktok]`, `【tiktok carousels】`.
   - Preserves authentic brackets: `[Коран 2:255] Аят ал-Курси`, `[Сахих ал-Бухари #6424]`.
2. **Dynamic Backgrounds (R4)**:
   - Verified 8 distinct vertical 9:16 assets on disk in `tiktok_images/` & `tiktok_output/`.
   - Multi-slide uniqueness (4 unique backgrounds per 4-slide carousel).
   - Multi-cycle rotation across generations with modulo index wrap-around.
3. **Sacred vs Commentary Differentiation (R1)**:
   - Dual-color assignment: Gold (`#f3d179` / `#ffd700`) for Quran/Hadith sacred text; White (`#ffffff`) for human commentary.
   - Dedicated vertical interval spacing (`>= 40px`) separating sacred quote and human commentary.
   - Quote parser handles Bulgarian `„...“`, Western `"..."`, and French `«...»` quotes.
4. **TikTok Safe Zone Layout (R2)**:
   - Exact geometry: `1080x1920` canvas, `SAFE_TOP=300`, `SAFE_BOTTOM=400`, `SAFE_LEFT=100`, `SAFE_RIGHT=220`, `W_SAFE=760`, `H_SAFE=1220`, `CENTER_X=480`.
   - Text bounding box strictly verified within horizontal corridor `[100px, 860px]` and vertical corridor `[300px, 1520px]`.
   - Dynamic auto-fit downscaling ensures long Hadiths (150+ words) never overflow `H_SAFE` (1220px).
