# Progress - Milestone 3: Video Rendering Engines Hardening

Last visited: 2026-08-30T15:05:00Z

## Completed Tasks
- [x] Restored `TIKTOK_SAFE_ZONE` constants in `src/lib/safe-zone.ts` to `SAFE_TOP: 300, SAFE_BOTTOM: 400, SAFE_LEFT: 100, SAFE_RIGHT: 220`.
- [x] Hardened Client Video Renderer (`src/lib/render-video.ts`):
  - Integrated `getSafeZone`, `scaleSafeZone`, `getSubtitleAnchorY`, `clampToSafeZone`, `REFERENCE_PILL_STANDARDS`.
  - Updated `configureCanvasSize` to return `{ scale, sz }`.
  - Hardened `wrapWords` with token chunking for words exceeding `maxWidth`.
  - Hardened `chooseFontSize` with `scale` multiplier and explicit `allLinesFit` line-width verification.
  - Hardened `drawReferencePill` anchored at `sz.SAFE_TOP` ($300\text{px}$ on 1080p, $200\text{px}$ on 720p), height $56\text{px}$ scaled, centered at `sz.CENTER_X`, bounded to `sz.W_SAFE` with `clampToSafeZone`.
  - Updated `drawFrame` subtitle centering to `sz.CENTER_X` ($480\text{px}$ for TikTok) and `targetBottomY` with `getSubtitleAnchorY(sz, opts.subtitlePosition)` clamped so $1.14\times$ active word karaoke pop never crosses `sz.BOTTOM_MAX_Y` ($1520\text{px}$ on 1080p / $1013\text{px}$ on 720p).
- [x] Hardened Server Media Generator (`src/lib/render.functions.ts`):
  - Added calibrated `estimateTextWidth` and `wrapTextToSafeWidth`.
  - Exported `generateAssSubtitles` compliant with `getSafeZone` and `getASSSubtitlePlacement`.
  - Configured asymmetric margins (`MarginL: 100`, `MarginR: 220` for TikTok) and Reference badge at `\pos(sz.CENTER_X, sz.SAFE_TOP + 40)`.
  - Implemented dynamic decremental auto-fit scaling for Quran full-ayah subtitle blocks ensuring `totalHeight <= maxAllowedHeight` and zero collision with the top badge.
  - Implemented safe-width wrapping for phrase karaoke subtitle blocks.
  - Fixed server maintenance timers with `unref()` to ensure clean CLI exits.
- [x] Implemented Comprehensive Verification Suite (`src/lib/__tests__/verify-video-hardening.test.ts`):
  - Suite 1: Client Video Subtitle Safe Bounds & Resolution Scaling (1080p & 720p).
  - Suite 2: Word Scale Pop ($1.14\times$) Non-Overflow & Bottom Clearance Zone.
  - Suite 3: Server ASS Subtitle Placement and Style Parameters.
  - Suite 4: ASS Dynamic Line Width Wrapping ($\le 760\text{px}$).
  - Suite 5: Zero Overlap Between Top Reference Badge and Subtitle Blocks.
  - Suite 6: Property-Based Fuzzing & Adversarial Stress Matrix (500 client + 500 server iterations).
- [x] Ran and verified all 6 project test suites with 100% pass rate:
  - `npx jiti src/lib/__tests__/verify-video-hardening.test.ts` (29/29 tests passed)
  - `npx jiti src/lib/__tests__/verify-photo-hardening.test.ts` (26/26 tests passed)
  - `npx jiti src/lib/__tests__/verify-safe-zone.test.ts` (53/53 tests passed)
  - `npx jiti src/lib/__tests__/e2e-safe-zones-and-layout.test.ts` (63/63 assertions passed)
  - `npm test` (all suites passed)
