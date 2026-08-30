# Handoff Report: Milestone 3 Video Rendering Hardening Test Strategy

**Author**: Explorer 3 (Milestone 3 — Video Hardening Test Strategy)  
**Target File**: `c:\Users\admin\Downloads\Islamic Reels Studio\.agents\explorer_m3_3\handoff.md`  
**Test Suite Under Specification**: `src/lib/__tests__/verify-video-hardening.test.ts`  
**Workspace**: `c:\Users\admin\Downloads\Islamic Reels Studio`  
**Date**: 2026-08-30  

---

## 1. Observation

Direct observations from static codebase analysis, geometry registry inspection, and test harness execution:

### 1.1 Geometry Registry Standards (`src/lib/safe-zone.ts`)
1. **TikTok Profile Constants (1080p)**:
   - Line 153–160:
     - `W = 1080, H = 1920`
     - `SAFE_TOP = 300` (status bar, tabs, search)
     - `SAFE_BOTTOM = 400` (captions, handle, audio disk)
     - `SAFE_LEFT = 100` (left screen margin)
     - `SAFE_RIGHT = 220` (right sidebar action buttons: like, comment, bookmark, share)
     - Derived metrics: `W_SAFE = 760px`, `H_SAFE = 1220px`, `CENTER_X = 480px`, `BOTTOM_MAX_Y = 1520px`, `TOP_MIN_Y = 300px`.
2. **Instagram Reels Profile Constants (1080p)**:
   - Line 170–177: `SAFE_TOP = 240, SAFE_BOTTOM = 340, SAFE_LEFT = 80, SAFE_RIGHT = 160`.
   - Derived metrics: `W_SAFE = 840px, H_SAFE = 1340px, CENTER_X = 500px, BOTTOM_MAX_Y = 1580px`.
3. **YouTube Shorts Profile Constants (1080p)**:
   - Line 187–194: `SAFE_TOP = 220, SAFE_BOTTOM = 380, SAFE_LEFT = 80, SAFE_RIGHT = 180`.
   - Derived metrics: `W_SAFE = 820px, H_SAFE = 1320px, CENTER_X = 490px, BOTTOM_MAX_Y = 1540px`.
4. **Symmetrical Center Profile Constants (1080p)**:
   - Line 213–220: `SAFE_TOP = 300, SAFE_BOTTOM = 300, SAFE_LEFT = 100, SAFE_RIGHT = 100`.
   - Derived metrics: `W_SAFE = 880px, H_SAFE = 1320px, CENTER_X = 540px, BOTTOM_MAX_Y = 1620px`.
5. **Reference Pill Standards**:
   - Line 233–239: `DEFAULT_Y = 300, FONT_SIZE = 28, PAD_X = 28, PAD_Y = 14, MIN_VERTICAL_GAP = 24`.
6. **Resolution Scaling (`scaleSafeZone`)**:
   - Line 271–291: Scales safe insets proportionally to 720p ($720 \times 1280$, scale factor $S = 720 / 1080 = 2/3$).
   - For TikTok 720p: `SAFE_TOP = 200, SAFE_BOTTOM = 267, SAFE_LEFT = 67, SAFE_RIGHT = 147, W_SAFE = 506, H_SAFE = 813, CENTER_X = 320, BOTTOM_MAX_Y = 1013`.
7. **ASS Style Helpers**:
   - Line 425–454 (`getASSSubtitlePlacement`): `alignment = 2` (lower-third), `posX = 480` (TikTok), `posY = Math.min(BOTTOM_MAX_Y - 100, Math.round(H * 0.74)) = 1420px`.
   - Line 459–478 (`getSafeAssStyles`):
     - `tiktok`: `marginL = 100, marginR = 220, marginV = 400, align = 2, posX = 480, posY = 1520, refPosX = 480, refPosY = 340`.
     - `reels`: `marginL = 80, marginR = 160, marginV = 340, align = 2, posX = 500, posY = 1580, refPosX = 500, refPosY = 280`.
     - `shorts`: `marginL = 80, marginR = 180, marginV = 380, align = 2, posX = 490, posY = 1540, refPosX = 490, refPosY = 260`.
     - `center`: `marginL = 100, marginR = 100, marginV = 960, align = 5, posX = 540, posY = 960, refPosX = 540, refPosY = 340`.

### 1.2 Client Video Renderer Inspection (`src/lib/render-video.ts`)
1. **Canvas Sizing & Initial Safe Insets**:
   - Lines 30–33 & 36–47:
     ```ts
     let W = 1080;
     let H = 1920;
     let SAFE = { top: 320, bottom: 280, side: 180 };
     ```
     *Current state*: Uses legacy symmetric margins `SAFE = { top: 320, bottom: 280, side: 180 }` and `W / 2` centering rather than importing `getSafeZone(opts.subtitlePosition)` and `sz.CENTER_X`.
2. **Reference Pill Drawing**:
   - Lines 249–282: `drawReferencePill(ctx, text)` places pill at `y = 280 * scale` (breaching `SAFE_TOP = 300px` by 20px). Must be moved to `sz.SAFE_TOP = 300px` (or `200px` on 720p).
3. **Word Scale Pop Karaoke Transform**:
   - Lines 961–980:
     ```ts
     if (isActive) {
       ctx.translate(centerX, y);
       ctx.scale(1.14, 1.14);
       ctx.translate(-centerX, -y);
       ...
     }
     ```
     Applies $1.14\times$ zoom scaling centered on each active word.
4. **Bottom Anchor Calculation**:
   - Lines 918–925:
     ```ts
     const targetBottomY = H * 0.74; // 1420.8px on 1080p
     const baseY = targetBottomY - (activePhrase.lines.length - 1) * activePhrase.lineHeight;
     ```

### 1.3 Server ASS Subtitle Generator Inspection (`src/lib/render.functions.ts`)
1. **ASS Style Generation**:
   - Lines 308–360: Hardcodes `bulgarianMarginV = 1350` and `pos(540, 380)` for reference pill.
   - Does not yet use asymmetric `MarginL: 100, MarginR: 220` or dynamic `getSafeAssStyles(opts.subtitlePosition)`.
2. **Ayah Subtitle Line Wrapping**:
   - Lines 548–565: Uses fixed word-per-line slicing (`for (let i = 0; i < ayahWords.length; i += wpl)`) without character/pixel width measurement, risking line overflow beyond $760\text{px}$ on long Bulgarian words.

---

## 2. Logic Chain

From the observations above, we establish the formal requirements and invariants that `src/lib/__tests__/verify-video-hardening.test.ts` must assert:

```
[Observation 1.1: TIKTOK_SAFE_ZONE W_SAFE=760, CENTER_X=480, [100, 860], [300, 1520]]
    │
    ▼
[Logic Step 1: Subtitle Corridor Invariant]
For every phrase & line, lineLeft >= 100px, lineRight <= 860px, lineWidth <= 760px.
Scaled for 720p: lineLeft >= 67px, lineRight <= 573px, lineWidth <= 506px.
    │
    ▼
[Observation 1.2: Word Scale Pop 1.14x transform around (centerX, y)]
    │
    ▼
[Logic Step 2: Pop Expansion Physics & Bottom Caption Clearance]
- Vertical: baseline y = 1420px; descent 0.25*fs*1.14 + stroke <= 40px; y_max = 1460px <= 1520px (CLEARANCE >= 60px).
- Horizontal: outermost words expand by dx = 0.07*w_word; line layout with center X=480 maintains X in [100, 860].
    │
    ▼
[Observation 1.1 & 1.3: ASS Subtitle Profiles & Styles]
    │
    ▼
[Logic Step 3: Server ASS Parameter Verification]
- Check getSafeAssStyles across all 4 profiles (tiktok, reels, shorts, center).
- Check ASS [V4+ Styles] and [Events] Dialogue \pos(X, Y) strings match geometry registry.
    │
    ▼
[Observation 1.3: Ayah Fixed Slicing vs 760px Bound]
    │
    ▼
[Logic Step 4: Dynamic Line Width Wrapping Invariant]
- Calibrated font metrics engine verifies every generated ASS line measures <= 760px.
- Unbroken compound words scale down or wrap cleanly.
    │
    ▼
[Observation 1.1 & 1.2: Reference Pill at SAFE_TOP=300px; Subtitle Top >= 940px (lower-third) / 760px (center)]
    │
    ▼
[Logic Step 5: Reference Pill Zero Overlap Invariant]
- Pill box [300, 356] and Subtitle box [760, 1420] maintain vertical gap >= 404px >> 24px minimum gap.
- doBoxesCollide(pillBox, subtitleBox, 24) === false for all profiles and multi-page texts.
```

---

## 3. Caveats

1. **Canvas Rendering Context in Node.js / Jiti**:
   - In Node.js testing environments, `HTMLCanvasElement` is not natively present unless mocked or run in jsdom.
   - The test suite uses a calibrated high-precision mock canvas font metrics engine (`createCalibratedMeasure` and `createMockCanvasContext`) matching production `Outfit` and `Inter` typefaces, exactly following the proven pattern in `verify-photo-hardening.test.ts`.
2. **Browser MediaRecorder vs ASS Server**:
   - `renderVideo` executes inside browser WebRTC/Canvas environments; its layout mathematical core (`wrapWords`, `chooseFontSize`, `getSafeZone`, `getSubtitleAnchorY`, active word transform calculations) is pure geometry and can be 100% verified deterministically in unit tests.
3. **No Direct Production Code Modifications**:
   - In accordance with explorer role constraints, this report specifies and analyzes the test suite without altering production source files.

---

## 4. Conclusion & Test Specification for `verify-video-hardening.test.ts`

The test suite `src/lib/__tests__/verify-video-hardening.test.ts` is organized into **6 comprehensive test suites** covering all 5 prompt requirements plus adversarial fuzzing:

### Test Suite Architecture Summary

| Suite # | Suite Name | Scope & Verification Invariants | Number of Tests |
|---|---|---|---|
| **Suite 1** | **Client Video Subtitle Safe Bounds & Scaling** | Verifies 1080p ($X \in [100, 860], Y \in [300, 1520]$) and 720p ($X \in [67, 573], Y \in [200, 1013]$) containment across `tiktok`, `reels`, `shorts`, `center` | 6 tests |
| **Suite 2** | **Word Scale Pop (1.14x) & Bottom Clearance** | Verifies $1.14\times$ active word karaoke transform clearance ($\ge 60\text{px}$ from bottom $Y=1520$, non-overflow on edge words) | 5 tests |
| **Suite 3** | **Server ASS Subtitle Placement & Styles** | Verifies ASS header, style definitions, asymmetric margins (`MarginL: 100`, `MarginR: 220`), and `\pos(X, Y)` tags across all profiles | 6 tests |
| **Suite 4** | **ASS Dynamic Line Width Wrapping** | Verifies no generated line exceeds $W_{\text{safe}} = 760\text{px}$ under calibrated Cyrillic metrics; dynamic auto-fit for long Hadiths & Ayahs | 5 tests |
| **Suite 5** | **Reference Badge Non-Collision & Gap Guarantee** | Verifies zero overlap ($\text{gap} \ge 24\text{px}$) between top Reference Pill ($Y=300$) and multi-line subtitle blocks across lower-third and center | 5 tests |
| **Suite 6** | **Property-Based Fuzzing & Stress Matrix** | 1,000 randomized layout iterations (500 client video + 500 server ASS) checking safe bounds, scale pop, and non-collision | 2 tests (1,000 iterations) |
| **Total** | **Full Milestone 3 Verification Suite** | **Comprehensive end-to-end verification of all video rendering hardening invariants** | **29 Test Cases (1,027 executions)** |

---

### Detailed Test Specifications

#### Suite 1: Client Video Subtitle Safe Bounds & Resolution Scaling
- **Test 1.1**: `TikTok 1080p: Subtitle line widths and bounding boxes strictly satisfy W_safe = 760px and X in [100, 860]px`
  - Validates optical center $X = 480\text{px}$.
  - Computes `lineLeft = 480 - lineWidth / 2` and `lineRight = 480 + lineWidth / 2`.
  - Asserts `lineLeft >= 100` and `lineRight <= 860`.
- **Test 1.2**: `TikTok 720p: Subtitle lines downscale proportionally to W_safe = 506px and X in [67, 573]px`
  - Validates optical center $X = 320\text{px}$.
  - Computes `lineLeft = 320 - lineWidth / 2` and `lineRight = 320 + lineWidth / 2`.
  - Asserts `lineLeft >= 67` and `lineRight <= 573`.
- **Test 1.3**: `Instagram Reels Profile: Subtitle lines contained in X in [80, 920]px, W_safe = 840px, CenterX = 500px`
  - Asserts `isWithinSafeZone(lineBox, 'reels') === true`.
- **Test 1.4**: `YouTube Shorts Profile: Subtitle lines contained in X in [80, 900]px, W_safe = 820px, CenterX = 490px`
  - Asserts `isWithinSafeZone(lineBox, 'shorts') === true`.
- **Test 1.5**: `Centered Profile: Subtitle lines centered at X = 540px in corridor X in [100, 980]px`
  - Asserts `isWithinSafeZone(lineBox, 'center') === true`.
- **Test 1.6**: `Reference Pill 1080p & 720p: Top placement at SAFE_TOP with complete corridor containment`
  - 1080p: $Y \in [300, 356]\text{px}$, 720p: $Y \in [200, 237]\text{px}$.
  - Asserts `isWithinSafeZone(pillBox, profile) === true`.

#### Suite 2: Word Scale Pop (1.14x) Non-Overflow & Bottom Clearance Zone
- **Test 2.1**: `Active Word 1.14x Pop: Bottom-most word edge maintains >= 60px clearance above Y = 1520px in 1080p`
  - Target anchor: $Y_{\text{target}} = 1420\text{px}$.
  - Font sizes tested: $fs \in [36, 48, 64, 75, 88, 98, 112]\text{px}$.
  - Active descent reach $= Y_{\text{target}} + 0.25 \times fs \times 1.14 + \text{strokeWidth} \le 1460\text{px}$.
  - Clearance $= 1520 - Y_{\text{max}} \ge 60\text{px}$.
- **Test 2.2**: `Active Word 1.14x Pop: Leftmost and rightmost words on wrapped lines never breach X in [100, 860]px`
  - Left edge word with $1.14\times$ pop expands leftward by $0.07 \times w_{\text{word}}$.
  - Asserts `x_left_pop >= 100` and `x_right_pop <= 860`.
- **Test 2.3**: `720p Active Word Pop: Bottom clearance >= 38px above Y = 1013px`
  - Target anchor: $Y_{\text{target}} = 947\text{px}$. Max reach $\le 975\text{px}$.
  - Asserts $Y_{\text{reach}} \le 1013\text{px}$.
- **Test 2.4**: `Adversarial long Cyrillic words under 1.14x scale pop`
  - Tests: "Благословението", "Справедливостта", "Предупреждението".
  - Asserts `isWithinSafeZone(activeWordBox, 'tiktok') === true`.
- **Test 2.5**: `Center Profile 1.14x Pop: Stays within Y in [300, 1620]px`
  - Center anchor $Y = 960\text{px}$. Active word pop extends vertically to $[730, 1190]\text{px}$.
  - Asserts $Y_{\min} \ge 300\text{px}$ and $Y_{\max} \le 1620\text{px}$.

#### Suite 3: Server ASS Subtitle Placement and Style Parameters
- **Test 3.1**: `ASS Style Config: getSafeAssStyles generates exact margins and alignments for all 4 profiles`
  - `tiktok`: `{ marginL: 100, marginR: 220, marginV: 400, align: 2, posX: 480, posY: 1520 }`.
  - `reels`: `{ marginL: 80, marginR: 160, marginV: 340, align: 2, posX: 500, posY: 1580 }`.
  - `shorts`: `{ marginL: 80, marginR: 180, marginV: 380, align: 2, posX: 490, posY: 1540 }`.
  - `center`: `{ marginL: 100, marginR: 100, marginV: 960, align: 5, posX: 540, posY: 960 }`.
- **Test 3.2**: `ASS Script Header: PlayResX is 1080 and PlayResY is 1920 (strict 9:16 vertical standard)`
  - Asserts presence of `PlayResX: 1080` and `PlayResY: 1920`.
- **Test 3.3**: `ASS Dialogue Events: \\pos(X, Y) tags strictly match platform optical center and safe vertical anchor`
  - Parses generated `\pos(x, y)` from Dialogue strings across all profiles.
  - Asserts $x = \text{sz.CENTER\_X}$ and $y \le \text{sz.BOTTOM\_MAX\_Y}$.
- **Test 3.4**: `ASS Asymmetric Margins: MarginL=100 and MarginR=220 present in TikTok Bulgarian style header`
  - Asserts style line contains `,100,220,` matching asymmetric safe zone.
- **Test 3.5**: `ASS Reference Badge: Dialogue positioned at safe top \\pos(CENTER_X, 340)`
  - Asserts reference position is $Y = 340\text{px}$ (within safe top $[300, 380]\text{px}$).
- **Test 3.6**: `ASS Theme Color Escapes: Valid BGR ASS color tags (&H32CD32&, &H0000B7FF&, &H00FFFFFF&)`
  - Asserts colors conform to `&H[0-9A-Fa-f]{6,8}&` format with balanced curly brackets.

#### Suite 4: ASS Dynamic Line Width Wrapping (No Line Exceeding 760px)
- **Test 4.1**: `Calibrated Cyrillic Font Metric Measurement of Subtitle Texts`
  - Measures sample Bulgarian phrases across font sizes $36\text{px}-112\text{px}$.
  - Asserts linear metric monotonicity and character width accuracy.
- **Test 4.2**: `Ayah-Level Multi-Line Wrapping: 100% of wrapped lines measure <= 760px`
  - Tests Ayat al-Kursi (2:255), Surah Al-Ikhlas (112:1-4), Surah Al-Baqarah (2:286).
  - Asserts every line in formatted `\N`-joined ASS text measures $\le 760\text{px}$.
- **Test 4.3**: `Hadith Multi-Sentence Wrapping: Dynamic line splitting respects W_safe = 760px`
  - Tests Hadith on Good Intentions (Nawawi 1), Hadith on Patience.
  - Asserts all wrapped lines satisfy $\text{measuredWidth} \le 760\text{px}$.
- **Test 4.4**: `Extreme Unbroken Compound Words: Auto-fit decremental font scaling prevents overflow`
  - Tests long unbroken words ("Четиринадесетгодишният", "Самоусъвършенстване").
  - Asserts font downscaling maintains line width $\le 760\text{px}$.
- **Test 4.5**: `Phrase-Level Word Slicing: Single-word and phrase-mode lines adhere to W_safe`
  - Asserts phrase chunks measure $\le 760\text{px}$.

#### Suite 5: Zero Overlap Between Top Reference Badge and Subtitle Blocks
- **Test 5.1**: `Lower-Third Subtitle Clearance from Top Reference Pill: Gap >= 500px >> 24px`
  - Pill Box: $[300, 356]\text{px}$. Subtitle Box: $[940, 1420]\text{px}$.
  - Asserts `doBoxesCollide(pillBox, subtitleBox, 24) === false`.
- **Test 5.2**: `Center Subtitle Placement Clearance from Top Reference Pill: Gap >= 380px >> 24px`
  - Pill Box: $[300, 356]\text{px}$. Center Subtitle Box: $[740, 1180]\text{px}$.
  - Asserts `doBoxesCollide(pillBox, subtitleBox, 24) === false`.
- **Test 5.3**: `Worst-Case Massive Multi-Line Block Collision Ceiling Cap (Subtitle Top >= 380px)`
  - Extreme 8-line block: Subtitle top clamped $\ge 380\text{px}$ ($\text{SAFE\_TOP} + 56 + 24$).
  - Asserts zero overlap with reference badge.
- **Test 5.4**: `Multi-Page Pagination: Every subtitle page maintains >= 24px vertical separation from reference badge`
  - Tests paginated long text across 3 pages.
  - Asserts `doBoxesCollide(pillBox, pageBox, 24) === false` for all pages.
- **Test 5.5**: `Multi-Profile Non-Overlap Matrix across TikTok, Reels, Shorts, and Center`
  - Asserts non-collision across all platform profiles.

#### Suite 6: Property-Based Fuzzing & Adversarial Stress Matrix
- **Test 6.1**: `500 Randomized Client Video Subtitle Layout Fuzzing Iterations`
  - Fuzzes random word counts (1 to 60 words), random Cyrillic vocabulary, random profiles, and random resolutions.
  - Asserts 100% of generated lines satisfy:
    1. $\text{lineWidth} \le W_{\text{safe}}$.
    2. `isWithinSafeZone(lineBox, profile) === true`.
    3. Active word pop $Y_{\max} \le \text{sz.BOTTOM\_MAX\_Y}$.
    4. `doBoxesCollide(pillBox, subtitleBox, 24) === false`.
- **Test 6.2**: `500 Randomized Server ASS Script Generation Fuzzing Iterations`
  - Fuzzes random scripture references, translation texts, and timing durations.
  - Asserts 100% of generated ASS scripts satisfy:
    1. Valid ASS syntax (`[Script Info]`, `[V4+ Styles]`, `[Events]`).
    2. `MarginL` and `MarginR` match profile.
    3. All wrapped lines measure $\le 760\text{px}$.
    4. Dialogue `\pos(x, y)` inside safe corridor.
    5. Zero collision between reference badge and subtitle lines.

---

## 5. Verification Method

### 5.1 Independent Re-Verification Commands
1. **Run Safe Zone Unit Tests**:
   ```bash
   npx jiti src/lib/__tests__/verify-safe-zone.test.ts
   ```
   *Expected Output*: 53 / 53 unit tests passing (100% success).
2. **Run Photo Hardening Verification Tests**:
   ```bash
   npx jiti src/lib/__tests__/verify-photo-hardening.test.ts
   ```
   *Expected Output*: 28 / 28 test suites passing (100% success).
3. **Execute Video Hardening Verification Test Suite (once implemented by Worker M3)**:
   ```bash
   npx jiti src/lib/__tests__/verify-video-hardening.test.ts
   ```
   *Expected Output*: 29 / 29 test suites passing (1,027 test assertions clean).
4. **Full Test Suite & Build Compilation Check**:
   ```bash
   npm run build
   ```

### 5.2 Invalidation Conditions
- Any subtitle text line exceeding $W_{\text{safe}} = 760\text{px}$ in 1080p ($506\text{px}$ in 720p).
- Any active word with $1.14\times$ pop reaching $Y > 1520\text{px}$ in 1080p ($> 1013\text{px}$ in 720p).
- Any collision between the top Reference Pill ($Y=300\text{px}$) and subtitle lines violating $\text{gap} \ge 24\text{px}$.
- Any asymmetric margin violation (e.g. TikTok `MarginR !== 220` or center alignment $\ne 5$).
