# Milestone 4 Investigation & Architectural Blueprint
## Safe Zone Overlay Guide Component (`SafeZoneOverlayGuide.tsx`) & Live Preview Audio Player Docking

### Executive Summary
This investigation covers the implementation design for:
1. **Interactive Safe Zone Overlay Visual Guide (`src/components/SafeZoneOverlayGuide.tsx`)**: An overlay displaying platform-accurate boundary buffers (Top Header: 15.6%, Bottom Action/Captions: 20.8%, Right Sidebar Buttons: 20.4%, and Active Safe Corridor: 760×1220px) with platform switching (`tiktok`, `reels`, `shorts`, `universal`, `center`) and simulated UI wireframe elements.
2. **Preview Toolbar Toggle Switch**: A clean button ("Safe Zone водачи" / "Show Safe Zones") and platform quick-switch selector in `src/routes/_app/create.tsx`.
3. **Live Preview Audio Player Relocation & Docking**: Moving the `<audio>` element from its obstructive `absolute bottom-4` position inside the 9:16 video frame to a dedicated docked transport card beneath the frame, ensuring lower-third subtitles are 100% visible at all times.

---

## 1. Observation

### 1.1 Existing Safe Zone Registry Geometry (`src/lib/safe-zone.ts`)
`src/lib/safe-zone.ts` already provides standardized geometry definitions, helper functions, and normalized coordinate calculations:
- `TIKTOK_SAFE_ZONE`: `SAFE_TOP: 300`, `SAFE_BOTTOM: 400`, `SAFE_LEFT: 100`, `SAFE_RIGHT: 220`, `W_SAFE: 760`, `H_SAFE: 1220`, `CENTER_X: 480` (lines 153–160).
  - Top Buffer: $300 / 1920 \approx 15.625\%$
  - Bottom Buffer: $400 / 1920 \approx 20.833\%$
  - Right Sidebar: $220 / 1080 \approx 20.370\%$
  - Left Margin: $100 / 1080 \approx 9.259\%$
- `REELS_SAFE_ZONE`: `SAFE_TOP: 240` (12.5%), `SAFE_BOTTOM: 340` (17.7%), `SAFE_LEFT: 80` (7.4%), `SAFE_RIGHT: 160` (14.8%), `W_SAFE: 840`, `H_SAFE: 1340`, `CENTER_X: 500` (lines 170–177).
- `SHORTS_SAFE_ZONE`: `SAFE_TOP: 220` (11.5%), `SAFE_BOTTOM: 380` (19.8%), `SAFE_LEFT: 80` (7.4%), `SAFE_RIGHT: 180` (16.7%), `W_SAFE: 820`, `H_SAFE: 1320`, `CENTER_X: 490` (lines 187–194).
- `UNIVERSAL_SAFE_ZONE`: Strictest common bounds (`SAFE_TOP: 300`, `SAFE_BOTTOM: 400`, `SAFE_LEFT: 100`, `SAFE_RIGHT: 220`) (lines 200–207).
- Helper functions available: `getSafeZone(profile)`, `getNormalizedSafeZone(profile)`, `getSafeOverlayCss(profile)`, `getSafeCorridor(profile)`.

### 1.2 Audio Player Obstruction in `src/routes/_app/create.tsx`
In `src/routes/_app/create.tsx` (lines 1541–1559):
```tsx
{/* Audio Player that drives the preview */}
{(customAudioUrl || narrationUrl || content?.audioUrl) && (
  <div className="absolute bottom-4 left-4 right-4 z-20 pointer-events-auto bg-black/50 backdrop-blur-md rounded-xl p-2 flex items-center justify-center border border-white/10">
    <audio
      ref={audioPreviewRef}
      src={customAudioUrl || narrationUrl || content?.audioUrl || undefined}
      controls
      controlsList="nodownload noplaybackrate"
      onTimeUpdate={(e) => setPreviewTime(e.currentTarget.currentTime)}
      onPlay={() => {
        document.querySelectorAll<HTMLVideoElement>(".bg-preview-video").forEach(v => v.play().catch(() => {}));
      }}
      onPause={() => {
        document.querySelectorAll<HTMLVideoElement>(".bg-preview-video").forEach(v => v.pause());
      }}
      className="w-full h-8 [&::-webkit-media-controls-panel]:bg-transparent [&::-webkit-media-controls-panel]:text-white"
    />
  </div>
)}
```
- **Direct Cause of Bug**: This audio container is inside `<div className="preview-inner relative w-full aspect-[9/16] overflow-hidden">`.
- Because it has `absolute bottom-4 left-4 right-4`, it occupies the bottom 60–80px of the 9:16 video frame.
- The lower-third subtitle area (`Y = 72% - 78%`, or bottom 400px of 1920px canvas) is directly behind this opaque floating player, rendering the live karaoke subtitle text unreadable during playback.

### 1.3 Subtitle Alignment & Safe Profile State in `create.tsx`
- `subtitlePosition` state is already defined in `create.tsx` (line 112): `const [subtitlePosition, setSubtitlePosition] = useState<"tiktok" | "reels" | "shorts" | "center">("tiktok");`.
- In the existing Live Preview (lines 1500–1539), the subtitle text is currently placed inside a centered container (`items-center justify-center`), rather than respecting `subtitlePosition` (lower-third vs center).
- There is currently no `SafeZoneOverlayGuide` component or toggle button in the preview toolbar.

---

## 2. Logic Chain

1. **Overlay Geometry Derivation**:
   - `getNormalizedSafeZone(profile)` from `src/lib/safe-zone.ts` computes fractional metrics ($0.0 \dots 1.0$) for top, bottom, left, right, width, height, and optical center X.
   - By multiplying these fractions by $100\%$, CSS positioning (`top: topPct`, `height: heightPct`, etc.) dynamically scales to any screen size or preview container dimensions while preserving exact 9:16 social media proportions.

2. **Visual Differentiation of Safe vs Danger Zones**:
   - **Buffer (Danger) Zones**: Semi-transparent red/amber overlays (`bg-rose-500/15`, `bg-amber-500/15`) with dashed borders and descriptive dimension badges showing where TikTok/Reels UI elements obstruct the screen.
   - **Wireframe Mockups**: Optional semi-transparent platform icons (like, comment, bookmark, share, music disc) on the right sidebar and search/tabs on top provide creators with an immediate visual reference of real-world app interfaces.
   - **Active Safe Corridor**: A crisp green/cyan border (`border-emerald-400/80` with corner viewfinder brackets) highlighting the guaranteed collision-free corridor.
   - **Optical Center Guideline**: Vertical dashed cyan line at `CENTER_X` ($480\text{px} = 44.44\%$ on TikTok) displaying the leftward optical shift required to avoid right sidebar button collisions.

3. **Audio Docking Separation**:
   - Moving the `<audio>` element out of `preview-inner` and into a dedicated card below the 9:16 video frame completely clears the bottom $400\text{px}$ ($20.8\%$) of the canvas.
   - Subtitles rendered at the lower third ($Y \approx 72\text{--}74\%$) remain $100\%$ visible, unobstructed, and readable.
   - The audio controls become easier to interact with (larger hit area, restart button, live timestamp badge) without interfering with preview click events.

---

## 3. Implementation Specifications

### 3.1 New Component: `src/components/SafeZoneOverlayGuide.tsx`

```tsx
import React from "react";
import {
  type PlatformSafeZoneProfile,
  type SafeZoneGeometry,
  getSafeZone,
  getNormalizedSafeZone,
} from "@/lib/safe-zone";
import { Shield, Heart, MessageCircle, Bookmark, Share2, Disc, Search } from "lucide-react";

export interface SafeZoneOverlayGuideProps {
  /** Platform safe zone profile to display */
  profile?: PlatformSafeZoneProfile | string;
  /** Whether the visual guide overlay is visible */
  visible?: boolean;
  /** Whether to show descriptive measurement badges */
  showLabels?: boolean;
  /** Whether to render simulated social platform UI icons */
  showPlatformUi?: boolean;
  /** Additional CSS class names */
  className?: string;
}

export function SafeZoneOverlayGuide({
  profile = "tiktok",
  visible = true,
  showLabels = true,
  showPlatformUi = true,
  className = "",
}: SafeZoneOverlayGuideProps) {
  if (!visible) return null;

  const targetProfile = (profile?.toLowerCase() || "tiktok") as PlatformSafeZoneProfile;
  const sz: SafeZoneGeometry = getSafeZone(targetProfile);
  const norm = getNormalizedSafeZone(targetProfile);

  const topPct = `${(norm.top * 100).toFixed(2)}%`;
  const bottomPct = `${(norm.bottom * 100).toFixed(2)}%`;
  const leftPct = `${(norm.left * 100).toFixed(2)}%`;
  const rightPct = `${(norm.right * 100).toFixed(2)}%`;
  const widthPct = `${(norm.width * 100).toFixed(2)}%`;
  const heightPct = `${(norm.height * 100).toFixed(2)}%`;
  const centerXSafePct = `${(((sz.CENTER_X - sz.SAFE_LEFT) / sz.W_SAFE) * 100).toFixed(2)}%`;

  const profileLabels: Record<string, string> = {
    tiktok: "TikTok Safe Zone",
    reels: "Instagram Reels Safe Zone",
    shorts: "YouTube Shorts Safe Zone",
    universal: "Universal Corridor",
    center: "Centered Corridor",
  };

  return (
    <div
      className={`absolute inset-0 pointer-events-none z-30 select-none overflow-hidden font-ui transition-opacity duration-300 ${className}`}
      aria-label="Safe Zone Visual Overlay Guide"
    >
      {/* 1. TOP HEADER BUFFER ZONE */}
      <div
        style={{ top: 0, left: 0, right: 0, height: topPct }}
        className="absolute bg-rose-950/30 backdrop-blur-[0.5px] border-b-2 border-dashed border-rose-500/70 flex flex-col justify-between p-2"
      >
        <div className="flex items-center justify-between text-[10px] text-rose-300 font-mono">
          <span className="flex items-center gap-1 bg-rose-950/80 px-1.5 py-0.5 rounded border border-rose-500/40">
            <Search className="size-2.5" />
            Горна зона: {sz.SAFE_TOP}px ({topPct})
          </span>
          {showPlatformUi && (
            <span className="text-[10px] font-bold text-white/50 tracking-wider">
              {targetProfile === "tiktok" ? "Following | For You" : targetProfile === "reels" ? "Reels" : "Shorts"}
            </span>
          )}
        </div>
      </div>

      {/* 2. BOTTOM CAPTION & AUDIO BUFFER ZONE */}
      <div
        style={{ bottom: 0, left: 0, right: 0, height: bottomPct }}
        className="absolute bg-rose-950/30 backdrop-blur-[0.5px] border-t-2 border-dashed border-rose-500/70 flex flex-col justify-end p-2"
      >
        {showPlatformUi && (
          <div className="space-y-1 text-white/60 mb-1">
            <div className="h-2 w-24 bg-white/20 rounded-full" />
            <div className="h-1.5 w-40 bg-white/15 rounded-full" />
          </div>
        )}
        <div className="flex items-center justify-between text-[10px] text-rose-300 font-mono">
          <span className="bg-rose-950/80 px-1.5 py-0.5 rounded border border-rose-500/40">
            Долна зона: {sz.SAFE_BOTTOM}px ({bottomPct}) — Текст & Звук
          </span>
          <span className="text-[9px] text-rose-400/80">Y &gt; {sz.BOTTOM_MAX_Y}px</span>
        </div>
      </div>

      {/* 3. RIGHT SIDEBAR BUTTONS BUFFER ZONE */}
      <div
        style={{ top: topPct, bottom: bottomPct, right: 0, width: rightPct }}
        className="absolute bg-amber-950/30 backdrop-blur-[0.5px] border-l-2 border-dashed border-amber-500/70 flex flex-col items-center justify-between py-2"
      >
        {showLabels && (
          <span className="text-[9px] font-mono text-amber-300 bg-amber-950/80 px-1 py-0.5 rounded border border-amber-500/40 text-center leading-tight">
            {sz.SAFE_RIGHT}px<br />({rightPct})
          </span>
        )}
        {showPlatformUi && (
          <div className="flex flex-col items-center gap-2.5 text-white/70 py-1">
            <div className="size-6 rounded-full bg-white/20 border border-white/40 flex items-center justify-center text-[10px] font-bold">+</div>
            <Heart className="size-4 text-white/70" />
            <MessageCircle className="size-4 text-white/70" />
            <Bookmark className="size-4 text-white/70" />
            <Share2 className="size-4 text-white/70" />
            <Disc className="size-5 text-white/80 animate-spin" style={{ animationDuration: "6s" }} />
          </div>
        )}
      </div>

      {/* 4. LEFT MARGIN BUFFER */}
      <div
        style={{ top: topPct, bottom: bottomPct, left: 0, width: leftPct }}
        className="absolute bg-sky-950/20 border-r-2 border-dashed border-sky-500/40 flex items-center justify-center"
      >
        {showLabels && (
          <span className="text-[8px] font-mono text-sky-300 rotate-[-90deg] whitespace-nowrap opacity-60">
            {sz.SAFE_LEFT}px ({leftPct})
          </span>
        )}
      </div>

      {/* 5. ACTIVE SAFE CORRIDOR (GREEN BOX) */}
      <div
        style={{ top: topPct, left: leftPct, width: widthPct, height: heightPct }}
        className="absolute border-2 border-emerald-400/80 shadow-[0_0_20px_rgba(52,211,153,0.2)]"
      >
        {/* Viewfinder Corners */}
        <div className="absolute top-0 left-0 size-3 border-t-2 border-l-2 border-emerald-300" />
        <div className="absolute top-0 right-0 size-3 border-t-2 border-r-2 border-emerald-300" />
        <div className="absolute bottom-0 left-0 size-3 border-b-2 border-l-2 border-emerald-300" />
        <div className="absolute bottom-0 right-0 size-3 border-b-2 border-r-2 border-emerald-300" />

        {/* Optical Center X Guideline */}
        <div
          style={{ left: centerXSafePct }}
          className="absolute inset-y-0 border-r border-dashed border-cyan-400/50 flex flex-col justify-between items-center"
        >
          <span className="text-[8px] font-mono text-cyan-300 bg-cyan-950/80 px-1 rounded -translate-y-1">
            X={sz.CENTER_X}px
          </span>
        </div>

        {/* Center Y Guideline */}
        <div className="absolute inset-x-0 top-1/2 border-b border-dashed border-cyan-400/30" />

        {/* Reference Pill Anchor Indicator */}
        <div className="absolute top-2 inset-x-4 border border-dashed border-emerald-400/50 bg-emerald-950/40 rounded-full py-0.5 text-center text-[9px] text-emerald-300 font-mono">
          ▲ Позиция за [Източник / Аят] (Y ≈ {sz.SAFE_TOP + 10}px)
        </div>

        {/* Safe Corridor Header Badge */}
        <div className="absolute top-8 inset-x-0 flex justify-center">
          <span className="flex items-center gap-1 bg-emerald-950/90 text-emerald-300 text-[10px] font-mono px-2 py-0.5 rounded-full border border-emerald-500/50 shadow-xs">
            <Shield className="size-3 text-emerald-400" />
            {profileLabels[targetProfile] || "Safe Zone"}: {sz.W_SAFE} × {sz.H_SAFE} px
          </span>
        </div>

        {/* Lower-Third Subtitle Baseline Guide */}
        {targetProfile !== "center" && (
          <div className="absolute bottom-8 inset-x-4 border border-dashed border-amber-400/60 bg-amber-950/40 rounded-md py-1 text-center text-[9px] text-amber-300 font-mono">
            ▼ Базова линия за караоке субтитри (Y ≈ {Math.round(sz.H * 0.74)}px)
          </div>
        )}
      </div>
    </div>
  );
}
```

---

### 3.2 Integration in `src/routes/_app/create.tsx`

#### A. State & Import Setup
```tsx
import { SafeZoneOverlayGuide } from "@/components/SafeZoneOverlayGuide";
import { Shield, Eye, EyeOff, RotateCcw, Volume2 } from "lucide-react";

// Add state in CreatePage:
const [showSafeZoneGuide, setShowSafeZoneGuide] = useState<boolean>(false);
```

#### B. Preview Toolbar Controls (Top of Preview Card)
```tsx
<div className="flex items-center justify-between gap-3 flex-wrap">
  <div>
    <h2 className="text-2xl">Преглед и рендиране</h2>
    <p className="font-ui text-sm text-muted-foreground">
      TikTok / Reels формат 1080×1920 (30 FPS) — видео със синхронизиран караоке превод.
    </p>
  </div>
  <div className="flex gap-2 flex-wrap items-center">
    {/* Safe Zone Overlay Toggle & Platform Switcher */}
    <Button
      variant={showSafeZoneGuide ? "default" : "outline"}
      size="sm"
      onClick={() => setShowSafeZoneGuide(!showSafeZoneGuide)}
      className={
        showSafeZoneGuide
          ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
          : "border-border/60 text-muted-foreground hover:text-foreground"
      }
      title="Превключи Safe Zone водачи (TikTok / Reels / Shorts)"
    >
      <Shield className="size-3.5 mr-1.5" />
      {showSafeZoneGuide ? "Скрий Safe Zone" : "Safe Zone водачи"}
    </Button>

    {showSafeZoneGuide && (
      <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/40 text-xs">
        {(["tiktok", "reels", "shorts"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setSubtitlePosition(p)}
            className={`px-2 py-1 rounded-md text-xs font-medium transition-all ${
              subtitlePosition === p
                ? "bg-primary text-primary-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground hover:bg-background/40"
            }`}
          >
            {p === "tiktok" ? "TikTok" : p === "reels" ? "Reels" : "Shorts"}
          </button>
        ))}
      </div>
    )}

    {/* Existing Action Buttons (Render, Download, Caption, Thumbnail) */}
    ...
  </div>
</div>
```

#### C. Safe Zone Overlay Placement inside `preview-inner`
Inside `<div className="preview-inner relative w-full aspect-[9/16] overflow-hidden">`:
```tsx
{/* Safe Zone Visual Overlay Guide */}
<SafeZoneOverlayGuide profile={subtitlePosition} visible={showSafeZoneGuide} />
```

#### D. Subtitle Position Alignment in Live Preview
In `create.tsx` lines 1500–1539, update the subtitle container styling to reflect `subtitlePosition`:
- When `subtitlePosition === "center"`: `top-1/2 -translate-y-1/2`
- When `subtitlePosition !== "center"`: `top-[74%] -translate-y-1/2` with left margin $100\text{px}$ ($9.3\%$) and optical centering matching export output.

#### E. Docked Audio Controller (Below the 9:16 Video Frame)
Remove the floating `absolute bottom-4` audio player from inside `preview-inner` and dock it right beneath `preview-inner`:
```tsx
{/* DOCKED AUDIO CONTROLLER: Dedicated transport bar positioned below the 9:16 frame */}
{(customAudioUrl || narrationUrl || content?.audioUrl) && (
  <div className="mt-3 p-3.5 bg-card/90 backdrop-blur border border-border/50 rounded-xl shadow-xs space-y-2 font-ui">
    <div className="flex items-center justify-between text-xs">
      <div className="flex items-center gap-1.5 font-medium text-foreground">
        <Volume2 className="size-3.5 text-primary" />
        <span>Аудио възпроизвеждане & Караоке синхрон</span>
      </div>
      <span className="font-mono text-[11px] bg-muted/80 text-muted-foreground px-2 py-0.5 rounded border border-border/40">
        {previewTime.toFixed(1)}s
      </span>
    </div>
    <audio
      ref={audioPreviewRef}
      src={customAudioUrl || narrationUrl || content?.audioUrl || undefined}
      controls
      controlsList="nodownload noplaybackrate"
      onTimeUpdate={(e) => setPreviewTime(e.currentTarget.currentTime)}
      onPlay={() => {
        document.querySelectorAll<HTMLVideoElement>(".bg-preview-video").forEach((v) => v.play().catch(() => {}));
      }}
      onPause={() => {
        document.querySelectorAll<HTMLVideoElement>(".bg-preview-video").forEach((v) => v.pause());
      }}
      className="w-full h-8 [&::-webkit-media-controls-panel]:bg-transparent"
    />
    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
      <span>⚡ Управлява караоке анимацията и смяната на сцените</span>
      <button
        type="button"
        onClick={() => {
          if (audioPreviewRef.current) {
            audioPreviewRef.current.currentTime = 0;
            setPreviewTime(0);
            audioPreviewRef.current.play().catch(() => {});
          }
        }}
        className="text-primary hover:underline flex items-center gap-1 cursor-pointer font-medium"
      >
        <RotateCcw className="size-3" />
        Отначало
      </button>
    </div>
  </div>
)}
```

---

## 4. Caveats

1. **Fullscreen Mode Styling**: When the user enters fullscreen mode via the container's fullscreen button (`#video-preview-container:fullscreen`), the docked audio player is below the 9:16 video canvas. Since fullscreen is primarily for final visual playback, this is the intended behavior.
2. **Dynamic Pacing Modes**: When the user switches between phrase-by-phrase and single-word pacing modes in `create.tsx`, the Live Preview updates dynamically during audio playback; the safe zone overlay remains persistent and aligned regardless of pacing mode.
3. **No Caveats** regarding geometry compatibility: all metrics directly consume `src/lib/safe-zone.ts` verified constants.

---

## 5. Conclusion

The proposed implementation:
1. Creates a modular, reusable `SafeZoneOverlayGuide.tsx` component that accurately visualizes platform boundaries ($15.6\%$ top, $20.8\%$ bottom, $20.4\%$ right, and $760\times 1220\text{px}$ safe corridor) with high aesthetic quality and platform switching.
2. Provides a clean, intuitive toggle button in the preview toolbar.
3. Permanently fixes the audio player obstruction by docking audio controls beneath the 9:16 preview frame, guaranteeing unencumbered visibility for lower-third captions and karaoke subtitles.

---

## 6. Verification Method

### 6.1 Unit & Regression Verification Command
Run safe zone test suite to ensure mathematical invariants remain unbroken:
```powershell
npx jiti src/lib/__tests__/verify-safe-zone.test.ts
```

### 6.2 Component & Integration Checklist
1. **File Existence**: Inspect that `src/components/SafeZoneOverlayGuide.tsx` exists and exports `SafeZoneOverlayGuide`.
2. **Visual Overlay Inspection**:
   - Toggle "Safe Zone водачи" in `create.tsx` — verify that the top (15.6%), bottom (20.8%), and right (20.4%) buffer zones appear with semi-transparent tinted backgrounds and dashed borders.
   - Switch platform profile between `tiktok`, `reels`, and `shorts` — verify that dimensions and badges update dynamically ($300\text{px} \to 240\text{px} \to 220\text{px}$ top; $400\text{px} \to 340\text{px} \to 380\text{px}$ bottom; $220\text{px} \to 160\text{px} \to 180\text{px}$ right).
3. **Audio Docking Inspection**:
   - Verify that `<audio>` element is located outside `preview-inner` in `create.tsx`.
   - Play audio with background video and karaoke subtitles — verify that subtitles in the lower third ($Y \approx 72\text{--}74\%$) are completely unobstructed.
