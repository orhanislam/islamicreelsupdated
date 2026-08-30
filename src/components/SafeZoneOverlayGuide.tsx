import React from "react";
import {
  type PlatformSafeZoneProfile,
  type SafeZoneGeometry,
  getSafeZone,
  getNormalizedSafeZone,
  getSafeOverlayCss,
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
  const overlayCss = getSafeOverlayCss(targetProfile);

  const topPct = overlayCss.topPercent;
  const bottomPct = overlayCss.bottomPercent;
  const leftPct = overlayCss.leftPercent;
  const rightPct = overlayCss.rightPercent;
  const widthPct = `${(norm.width * 100).toFixed(3)}%`;
  const heightPct = `${(norm.height * 100).toFixed(3)}%`;
  const centerXSafePct = `${(((sz.CENTER_X - sz.SAFE_LEFT) / sz.W_SAFE) * 100).toFixed(3)}%`;

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
              {targetProfile === "tiktok"
                ? "Following | For You"
                : targetProfile === "reels"
                  ? "Reels"
                  : "Shorts"}
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
            {sz.SAFE_RIGHT}px
            <br />({rightPct})
          </span>
        )}
        {showPlatformUi && (
          <div className="flex flex-col items-center gap-2.5 text-white/70 py-1">
            <div className="size-6 rounded-full bg-white/20 border border-white/40 flex items-center justify-center text-[10px] font-bold">
              +
            </div>
            <Heart className="size-4 text-white/70" />
            <MessageCircle className="size-4 text-white/70" />
            <Bookmark className="size-4 text-white/70" />
            <Share2 className="size-4 text-white/70" />
            <Disc
              className="size-5 text-white/80 animate-spin"
              style={{ animationDuration: "6s" }}
            />
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
