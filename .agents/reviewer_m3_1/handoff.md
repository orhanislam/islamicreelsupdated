# Review & Adversarial Challenge Report: Milestone 3 (Video Rendering Engines Hardening)

**Reviewer**: Reviewer 1 (Milestone 3)
**Verdict**: **APPROVE**
**Integrity Status**: **VERIFIED CLEAN** (No hardcoding, no dummy implementations, no bypasses)

---

## 1. Observation

### Codebase Implementations Inspected
1. **`src/lib/render-video.ts`**:
   - `configureCanvasSize(ios, quality, platformProfile)`: Correctly derives scaled geometry via `scaleSafeZone` (scale $1.0$ for 1080p, $720/1080 = 2/3$ for 720p).
   - `chooseFontSize`: Implements decremental font search from `maxSize` (up to 112px down to 64px scaled) to `minSize` (36px scaled) with step $-2$, asserting that all wrapped lines satisfy `measureText(lineStr).width <= maxWidth + 0.01` and fit within `maxLinesPerPage`.
   - `wrapWords`: Safely wraps words by width budget and gracefully chunks oversized single tokens into sub-strings if a single unbroken word exceeds `maxWidth`.
   - `drawReferencePill`: Positioned at `sz.SAFE_TOP` ($300\text{px}$ on 1080p, $200\text{px}$ on 720p), centered horizontally at `sz.CENTER_X` ($480\text{px}$ for TikTok), with width capped at `sz.W_SAFE` ($760\text{px}$) and clamped via `clampToSafeZone`.
   - Subtitle Rendering & Active Karaoke Pop:
     - Anchor calculation: `maxAllowedBottomY = sz.BOTTOM_MAX_Y - Math.ceil(activePhrase.fontSize * 0.35 * 1.14)` and `targetBottomY = Math.min(rawAnchorY, maxAllowedBottomY)`.
     - Active word scale pop ($1.14\times$) and glow are applied with `ctx.translate(centerX, y)` / `ctx.scale(1.14, 1.14)` / `ctx.translate(-centerX, -y)`.
     - Ceiling clamp: `minTopY = sz.SAFE_TOP + Math.round(REFERENCE_PILL_STANDARDS.FONT_SIZE * scale + REFERENCE_PILL_STANDARDS.PAD_Y * 2 * scale + REFERENCE_PILL_STANDARDS.MIN_VERTICAL_GAP * scale)` ($380\text{px}$ on 1080p) prevents any upward subtitle collision with the reference pill.

2. **`src/lib/render.functions.ts`**:
   - `estimateTextWidth(text, fontSize)`: Implements fine-grained Cyrillic/Bulgarian and Latin font metrics for proportional calculation.
   - `wrapTextToSafeWidth(words, fontSize, maxLineWidth)`: Dynamically builds line arrays bounded by `maxLineWidth` ($760\text{px}$ for TikTok).
   - `generateAssSubtitles(data, audioDur)`:
     - Formats standard ASS header with `PlayResX: sz.W` (1080) and `PlayResY: sz.H` (1920).
     - Declares `[V4+ Styles]` with asymmetric margins (`MarginL: 100`, `MarginR: 220` for TikTok) to guarantee right sidebar button clearance.
     - Reference badge placed at `\pos(placement.posX, sz.SAFE_TOP + 40)` ($480, 340$ for TikTok).
     - Full Ayah Quran blocks auto-fit from $fs=98$ down to $fs=28$ checking `totalHeight <= maxAllowedHeight` and `maxSingleWordWidth <= maxLineWidth`.
     - Phrase/Word dialogue lines generate exact `\pos(placement.posX, placement.posY)` tags with millisecond-accurate highlighting.
   - Server Maintenance Timers: Cleaned with `.unref()` on `bootTimer` and `maintInterval` to prevent process hanging.

### Test Execution Observations
Live execution of the test suites via terminal commands:
- `npx jiti src/lib/__tests__/verify-video-hardening.test.ts`: **29 / 29 PASS (100%)**
- `npx jiti src/lib/__tests__/verify-photo-hardening.test.ts`: **26 / 26 PASS (100%)**
- `npx jiti src/lib/__tests__/verify-safe-zone.test.ts`: **53 / 53 PASS (100%)**
- `npx jiti src/lib/__tests__/e2e-safe-zones-and-layout.test.ts`: **63 / 63 PASS (100%)**
- `npm test`: **ALL PASS (100%)**

---

## 2. Logic Chain

1. **R1 (Text Overflow Prevention) & Dynamic Auto-Fitting**:
   - In both client canvas (`chooseFontSize` + `wrapWords`) and server ASS (`wrapTextToSafeWidth` + decremental $fs$ loop), line width is strictly evaluated against `W_SAFE` ($760\text{px}$ on TikTok, $840\text{px}$ on Reels, $820\text{px}$ on Shorts).
   - Long Bulgarian compound words (e.g. 20+ characters) cannot overflow horizontally because `wrapWords` chunks oversized tokens and `wrapTextToSafeWidth` forces line breaks.

2. **R2 (Safe Zone Compliance & Right Sidebar Clearance)**:
   - TikTok UI elements occupy the bottom $400\text{px}$ (captions/audio) and right $220\text{px}$ (like/comment/share buttons).
   - Centering elements at `CENTER_X = 480px` with a maximum width of $760\text{px}$ bounds all subtitles to $X \in [100, 860]\text{px}$, leaving exactly $220\text{px}$ clearance on the right.
   - Vertical bottom boundary $Y \le 1520\text{px}$ is preserved even during active word $1.14\times$ karaoke scale pop because descender expansion ($0.35 \times fs \times 1.14$) is pre-deducted from `targetBottomY`.

3. **R3 (Text Overlap Prevention)**:
   - The reference pill occupies $Y \in [300, 356]\text{px}$.
   - Subtitle blocks anchor at $Y=1420\text{px}$ (lower-third) or $Y=960\text{px}$ (center) with a forced floor at $Y \ge 380\text{px}$, guaranteeing $\ge 24\text{px}$ vertical separation at all times.
   - Bounding boxes between reference badge and subtitle lines are verified disjoint (`doBoxesCollide` returns `false`).

4. **R4 (Dynamic Multi-Resolution Adaptation)**:
   - In 720p mode, all geometry metrics ($W=720, H=1280, W_{\text{safe}}=506, H_{\text{safe}}=813, \text{CENTER\_X}=320, \text{SAFE\_TOP}=200, \text{BOTTOM\_MAX\_Y}=1013$) are scaled proportionally via `scaleSafeZone`. Canvas rendering dynamically uses these scaled metrics without hardcoded absolute offsets.

---

## 3. Caveats

- In pure client-side browser recording on older iOS Safari builds, `MediaRecorder` support for WebM is absent; `renderVideo` correctly enforces MP4 container selection with user-facing guidance to switch to Server FFmpeg rendering if hardware encoder limits are exceeded.
- Server-side FFmpeg rendering requires `fluent-ffmpeg` and `@ffmpeg-installer/ffmpeg` (or system `ffmpeg`), which are present and operational in the workspace.

---

## 4. Conclusion

Milestone 3 (Video Rendering Engines Hardening) satisfies all functional requirements and acceptance criteria:
- **Verdict**: **APPROVE**
- Text overflow is completely prevented across all resolutions (1080p and 720p).
- TikTok and Instagram Reels safe zones (asymmetric right sidebar margin of 220px, bottom margin of 400px) are strictly respected.
- Active word karaoke $1.14\times$ pop is safely contained with zero boundary clipping.
- Server ASS subtitle scripts match the unified safe zone registry in geometry, margins, and optical centering.
- Zero text element collision occurs between reference badge and subtitle blocks.

---

## 5. Verification Method

To independently verify all claims:
```bash
# Run Video Hardening Verification Suite
npx jiti src/lib/__tests__/verify-video-hardening.test.ts

# Run Photo Hardening Verification Suite
npx jiti src/lib/__tests__/verify-photo-hardening.test.ts

# Run Unified Safe Zone Registry Unit Suite
npx jiti src/lib/__tests__/verify-safe-zone.test.ts

# Run End-to-End Safe Zones Integration Suite
npx jiti src/lib/__tests__/e2e-safe-zones-and-layout.test.ts

# Run Full Test Suite
npm test
```
All commands terminate with exit code 0 and 100% test pass rate.
