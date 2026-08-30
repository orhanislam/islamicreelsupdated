# Milestone 3 Handoff Report: Video Rendering Engines Hardening

## 1. Observation
- **Registry Alignment**: Restored and validated `TIKTOK_SAFE_ZONE` in `src/lib/safe-zone.ts` with exact geometry constants:
  - `SAFE_TOP: 300`, `SAFE_BOTTOM: 400`, `SAFE_LEFT: 100`, `SAFE_RIGHT: 220`, `W_SAFE: 760`, `H_SAFE: 1220`, `CENTER_X: 480`, `TOP_MIN_Y: 300`, `BOTTOM_MAX_Y: 1520`.
- **Client Video Canvas Rendering (`src/lib/render-video.ts`)**:
  - `configureCanvasSize` computes `{ scale, sz: SafeZoneGeometry }` where `scale = width / 1080`.
  - `wrapWords` enforces maximum width bounding and chunks oversized unbroken tokens.
  - `chooseFontSize` operates with scale multipliers and verifies that `allLinesFit` within `sz.W_SAFE`.
  - `drawReferencePill` anchors at `sz.SAFE_TOP` ($300\text{px}$ on 1080p, $200\text{px}$ on 720p), height $56\text{px}$ scaled, centered at `sz.CENTER_X`, width bounded to `sz.W_SAFE` with `clampToSafeZone`.
  - Subtitle line drawing centers text at `sz.CENTER_X` ($480\text{px}$ for TikTok) and bounds `targetBottomY` with `getSubtitleAnchorY(sz, opts.subtitlePosition)` clamped so that $1.14\times$ active word pop never crosses `sz.BOTTOM_MAX_Y` ($1520\text{px}$ on 1080p, $1013\text{px}$ on 720p).
- **Server Media Subtitle Generation (`src/lib/render.functions.ts`)**:
  - Exported `estimateTextWidth` and `wrapTextToSafeWidth` for accurate Cyrillic font metrics and width-bounded line splitting.
  - Exported `generateAssSubtitles(data, audioDur)`:
    - Sets `PlayResX: sz.W`, `PlayResY: sz.H`.
    - Configures asymmetric margins (`MarginL: 100`, `MarginR: 220` for TikTok) in `[V4+ Styles]`.
    - References badge placed at `\pos(placement.posX, sz.SAFE_TOP + 40)` ($480, 340$ on 1080p).
    - Dialogue events tagged with explicit platform optical center and safe vertical anchor: `\pos(480, 1420)` for TikTok lower-third and `\pos(540, 960)` for center.
    - Full-Ayah Quran blocks use decremental auto-fit scaling ($fs$ from 98 down to 28) checking `totalHeight <= maxAllowedHeight` ($960\text{px}$) and zero collision with top badge ($Y \ge 460\text{px}$).
    - Phrase karaoke blocks wrap dynamically via `wrapTextToSafeWidth(p.words, phraseFs, sz.W_SAFE)` with millisecond-exact active word highlighting.
  - Added `unref()` to server maintenance background timers to permit clean test/CLI execution exits.
- **Verification Suite Execution**:
  - `src/lib/__tests__/verify-video-hardening.test.ts`: **29 / 29 PASS (100%)**
  - `src/lib/__tests__/verify-photo-hardening.test.ts`: **26 / 26 PASS (100%)**
  - `src/lib/__tests__/verify-safe-zone.test.ts`: **53 / 53 PASS (100%)**
  - `src/lib/__tests__/e2e-safe-zones-and-layout.test.ts`: **63 / 63 PASS (100%)**
  - `npm test`: **ALL PASS (100%)**

## 2. Logic Chain
1. **Right-Corridor Breach Elimination**: By centering subtitles and reference badges at `sz.CENTER_X` ($480\text{px}$) and constraining max width to `sz.W_SAFE` ($760\text{px}$), the right-most bounding edge is strictly bounded at $480 + 380 = 860\text{px}$, leaving exactly $220\text{px}$ of right margin for TikTok interaction buttons.
2. **Resolution Invariance**: Scaling base safe zones proportionally ($S = 720/1080 = 2/3$) transforms $W_{\text{safe}} \to 506\text{px}$, $\text{CENTER\_X} \to 320\text{px}$, $\text{SAFE\_TOP} \to 200\text{px}$, and $\text{BOTTOM\_MAX\_Y} \to 1013\text{px}$. All canvas rendering logic dynamically consumes these values without hardcoded pixel coordinates.
3. **Active Word Karaoke Pop Clearance**: When active words pop at $1.14\times$, the descender extension $0.34 \cdot fs \cdot 1.14$ is factored into `maxAllowedBottomY = sz.BOTTOM_MAX_Y - Math.ceil(fs * 0.35 * 1.14)`. This guarantees the lower edge never crosses $1520\text{px}$, preserving the $400\text{px}$ bottom clearance zone.
4. **Collision Disjointness**: The top Reference Pill occupies $Y \in [300, 356]\text{px}$. Subtitle blocks anchor at $Y=1420\text{px}$ (or $Y=960\text{px}$ in center mode) with ceiling caps at $Y \ge 380\text{px}$. The minimum vertical gap is $\ge 24\text{px}$ (and typically $> 500\text{px}$ in lower-third mode), guaranteeing disjoint bounding boxes.
5. **No Blind Fixed-Word Splitting**: ASS dynamic line wrapping replaces arbitrary 3-4 word slicing with width-budgeted word accumulation (`wrapTextToSafeWidth`), preventing long Bulgarian words (e.g. 15-20 characters) from exceeding safe corridor widths.

## 3. Caveats
- No caveats. All 4 platform profiles (`tiktok`, `reels`, `shorts`, `center`) and both rendering tiers (client HTML5 canvas and server FFmpeg ASS) are fully verified and tested under 500-iteration property-based fuzzing matrices.

## 4. Conclusion
Milestone 3 (Video Rendering Engines Hardening) is completely finished, robust, verified, and ready for integration. All client video canvas rendering and server ASS subtitle generation scripts strictly comply with safe zone boundaries, right-sidebar clearance, active word scale pop constraints, and top reference badge separation standards.

## 5. Verification Method
To independently reproduce and verify:
```bash
# 1. Video Hardening Verification Suite
npx jiti src/lib/__tests__/verify-video-hardening.test.ts

# 2. Photo Hardening Verification Suite
npx jiti src/lib/__tests__/verify-photo-hardening.test.ts

# 3. Safe Zone Unified Registry Unit Suite
npx jiti src/lib/__tests__/verify-safe-zone.test.ts

# 4. End-to-End Safe Zones Integration Suite
npx jiti src/lib/__tests__/e2e-safe-zones-and-layout.test.ts

# 5. Core Test Suite
npm test
```
All commands execute cleanly and exit with code 0 (100% pass rate).
