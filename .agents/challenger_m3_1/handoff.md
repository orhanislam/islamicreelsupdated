# Milestone 3 Adversarial Challenge Report: Video Rendering Engines Hardening

## 1. Observation

Adversarial stress testing and white-box geometry audits were conducted against `src/lib/render-video.ts`, `src/lib/render.functions.ts`, and `src/lib/safe-zone.ts` via the dedicated test harness `src/lib/__tests__/adversarial-m3-challenger.test.ts`.

### 1.1 Forbidden Zones Non-Crossing (TikTok $X \in [860, 1080]\text{px}$, $Y \in [1520, 1920]\text{px}$)
- **Right Sidebar Exclusion Zone ($X \in [860, 1080]\text{px}$)**:
  - On 1080p TikTok (`W = 1080`, `SAFE_LEFT = 100`, `SAFE_RIGHT = 220`, `CENTER_X = 480`, `W_SAFE = 760`):
    - Subtitle lines centered at $X = 480\text{px}$ with `maxWidth = 760\text{px}` occupy $X \in [100, 860]\text{px}$.
    - Tested with 120-word Ayat al-Kursi, 150-word unbroken streams, and compound Bulgarian/Arabic transliterations (`непротивоконституционствувателствувайте`): all line bounding boxes strictly respect $X_{\text{right}} \le 860.00\text{px}$ and $X_{\text{left}} \ge 100.00\text{px}$.
    - Active word $1.14\times$ scale pop maintains safe clearance from action buttons.
  - On 720p TikTok (`W = 720`, `SAFE_LEFT = 67`, `SAFE_RIGHT = 147`, `BOTTOM_MAX_Y = 1013`): lines occupy $X \in [67, 573]\text{px}$, strictly excluding $X \in [573.33, 720]\text{px}$.
- **Bottom Caption Exclusion Zone ($Y \in [1520, 1920]\text{px}$)**:
  - Lower-third anchor $Y = 1420\text{px}$ with active word pop factor $1.14\times$ descender clamp:
    `maxAllowedBottomY = sz.BOTTOM_MAX_Y - Math.ceil(fontSize * 0.35 * 1.14) = 1481px`.
  - The bottom-most rendered text edge across all tested phrases reaches at most $Y = 1459\text{px} \ll 1520\text{px}$.
  - Zero pixel breaches into the bottom caption area $[1520, 1920]\text{px}$ were observed.

### 1.2 Server ASS Subtitles (`render.functions.ts`)
- `generateAssSubtitles` produces valid ASS v4.00+ scripts:
  - Header: `PlayResX: 1080`, `PlayResY: 1920`.
  - Asymmetric Margins: `MarginL: 100`, `MarginR: 220` present in `[V4+ Styles]`.
  - Reference dialogue: `\pos(480, 340)` with `\an8` (top-center, bottom at $Y \approx 410\text{px}$).
  - Subtitle dialogue: `\pos(480, 1420)` with `\an2` (bottom-center).
  - Multi-line Ayahs: auto-fit decremental scaling (`fs` from 98 down to 28) strictly enforces `totalHeight <= maxAllowedHeight` ($960\text{px}$), guaranteeing subtitle top $\ge 460\text{px}$.
  - Clearance between Reference Badge ($410\text{px}$) and Subtitle Top ($\ge 460\text{px}$) is $\ge 50\text{px} > 24\text{px}$ with **0 pixel collisions**.

### 1.3 Client Video Canvas Vulnerability Discovered (`render-video.ts`)
- **Location**: `src/lib/render-video.ts`, lines 1116–1124 and line 881.
- **Verbatim Code**:
  ```ts
  // render-video.ts lines 1116-1124
  const minTopY =
    sz.SAFE_TOP +
    Math.round(
      REFERENCE_PILL_STANDARDS.FONT_SIZE * scale +
        REFERENCE_PILL_STANDARDS.PAD_Y * 2 * scale +
        REFERENCE_PILL_STANDARDS.MIN_VERTICAL_GAP * scale,
    );
  baseY = Math.max(minTopY, baseY);
  ```
- **Empirical Collision Reproduction (`ADV 4.1`)**:
  - Scenario: 7-word phrase with long words (e.g. `величествен`, `благословение`, `всемилостив`) rendered in 720p resolution (`scale = 2/3`).
  - In `chooseFontSize` (line 881), `verticalForText` is passed as full `sz.H_SAFE = 813px`.
  - Because 8 lines $\times 101\text{px} = 808\text{px} \le 813\text{px}$, `chooseFontSize` selects `fontSize = 75px` (`lineHeight = 101px`).
  - In lower-third mode, bottom anchor is `rawAnchorY = 913px`. Backing up 8 lines gives $913 - (7 \times 101) = 206\text{px}$.
  - `baseY` is clamped by `Math.max(minTopY, baseY)` to `minTopY = 253px`.
  - Because `ctx.textBaseline = "alphabetic"`, `baseY` is the baseline of line 0. The top of glyph ascenders reaches $y = 253 - (75 \times 0.85) = 189.25\text{px}$.
  - The Reference Badge sits at $Y \in [200, 237]\text{px}$.
  - **Result**: The text at $Y \in [189.25, 237]\text{px}$ overlaps with the Reference Badge by **$47.75\text{px}$** (pixel collision).

---

## 2. Logic Chain

1. **Premise 1**: Requirement R3 and Milestone 3 acceptance criteria mandate: "Verify zero pixel collision between Reference badge and subtitle blocks across all styles and platforms."
2. **Premise 2**: In `render-video.ts`, the reference pill occupies $Y \in [\text{SAFE\_TOP}, \text{SAFE\_TOP} + \text{pillH}]$.
3. **Premise 3**: In canvas 2D text rendering with `ctx.textBaseline = "alphabetic"`, `ctx.fillText(text, x, y)` positions characters such that the letter body and ascenders extend upwards from $y$ by $\approx 0.85 \times \text{fontSize}$.
4. **Premise 4**: `render-video.ts` line 1123 sets the baseline `baseY = Math.max(minTopY, baseY)` where `minTopY = sz.SAFE_TOP + pillH + gap`. This sets the baseline at the bottom of the required gap, rather than setting the top of the glyph bounding box at the bottom of the gap.
5. **Premise 5**: Furthermore, `chooseFontSize` is given `maxHeight = sz.H_SAFE` ($1220\text{px}$ on 1080p, $813\text{px}$ on 720p) instead of the actual lower-third available height ($\approx 980\text{px}$ on 1080p, $\approx 620\text{px}$ on 720p), permitting oversized multi-line blocks that exceed the lower-third vertical span.
6. **Inference**: Under 720p resolution and multi-line wrapping (7–8 lines), `baseY` is forced into `minTopY`, causing line 0 glyph ascenders to collide directly into the Reference badge by up to $47.75\text{px}$.
7. **Conclusion**: While Server ASS rendering and 1080p single-line rendering are resilient, Client Video canvas rendering violates the zero-pixel collision guarantee under 720p multi-line inputs.

---

## 3. Caveats

- **Authentic 1080p Short Phrases**: In 1080p mode with short 3-to-5 word phrases (1-2 lines), `baseY` remains at $\approx 1220\text{px}$, leaving $> 800\text{px}$ of clearance from the reference badge ($356\text{px}$). The collision vulnerability manifests primarily under 720p scaling or when phrases wrap to 7+ lines.
- **Server ASS Rendering**: Server ASS generation in `render.functions.ts` is completely free of this bug because it correctly bounds `maxAllowedHeight = placement.posY - minSubtitleTopY` ($960\text{px}$) and decrements `fs` until the text block fits below $Y = 460\text{px}$.

---

## 4. Conclusion

**Verdict: REJECT**

Milestone 3 cannot be approved in its current state due to the confirmed reference badge collision vulnerability in `render-video.ts`.

### Required Worker Remediations:
1. **Fix `baseY` Baseline Offset in `render-video.ts`**:
   In `render-video.ts` lines 1116–1124, update the baseline floor to account for font ascent:
   ```ts
   const fontAscent = Math.ceil(activePhrase.fontSize * 0.85);
   const minTopY =
     sz.SAFE_TOP +
     Math.round(
       REFERENCE_PILL_STANDARDS.FONT_SIZE * scale +
         REFERENCE_PILL_STANDARDS.PAD_Y * 2 * scale +
         REFERENCE_PILL_STANDARDS.MIN_VERTICAL_GAP * scale,
     ) + fontAscent;
   baseY = Math.max(minTopY, baseY);
   ```
2. **Constrain `maxHeight` in `chooseFontSize` for Lower-Third Layout**:
   In `render-video.ts` line 881, pass the actual available lower-third vertical budget rather than full `sz.H_SAFE`:
   ```ts
   const availableVertical = isCenter
     ? sz.H_SAFE
     : Math.max(200, rawAnchorY - (sz.SAFE_TOP + Math.round(56 * scale + 24 * scale)));
   const { fontSize: fs, lineHeight: lh } = chooseFontSize(
     ctx,
     text,
     maxW,
     availableVertical,
     scale,
   );
   ```

---

## 5. Verification Method

To independently reproduce the empirical collision finding and verify the test suites:

```powershell
# 1. Run Challenger Adversarial Verification Suite
npx jiti src/lib/__tests__/adversarial-m3-challenger.test.ts

# 2. Run Milestone 3 Hardening Suite
npx jiti src/lib/__tests__/verify-video-hardening.test.ts

# 3. Run Core Project Tests
npm test
```
