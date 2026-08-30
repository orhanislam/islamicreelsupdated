/**
 * Unified Safe Zone Geometry Registry
 * Islamic Reels Studio
 *
 * Centralized, platform-accurate safe zone geometries for TikTok, Instagram Reels,
 * YouTube Shorts, Universal, and Center profiles across Canvas renderers,
 * Server FFmpeg ASS subtitles, SVG thumbnail generators, and Live UI previews.
 */

export type PlatformSafeZoneProfile = "tiktok" | "reels" | "shorts" | "universal" | "center";

export interface SafeZoneGeometry {
  /** Canvas full width in pixels (1080 for 1080p, 720 for 720p) */
  readonly W: number;
  /** Canvas full height in pixels (1920 for 1080p, 1280 for 720p) */
  readonly H: number;
  /** Inset from top in pixels (headers, status bar, tabs) */
  readonly SAFE_TOP: number;
  /** Inset from bottom in pixels (captions, sounds, handles) */
  readonly SAFE_BOTTOM: number;
  /** Inset from left in pixels (margin) */
  readonly SAFE_LEFT: number;
  /** Inset from right in pixels (sidebar buttons: like, comment, share) */
  readonly SAFE_RIGHT: number;
  /** Usable safe width: W - SAFE_LEFT - SAFE_RIGHT */
  readonly W_SAFE: number;
  /** Usable safe height: H - SAFE_TOP - SAFE_BOTTOM */
  readonly H_SAFE: number;
  /** Optical center X coordinate: SAFE_LEFT + W_SAFE / 2 */
  readonly CENTER_X: number;
  /** Maximum bottom Y coordinate for text/elements: H - SAFE_BOTTOM */
  readonly BOTTOM_MAX_Y: number;
  /** Minimum top Y coordinate for text/elements: SAFE_TOP */
  readonly TOP_MIN_Y: number;
}

export interface NormalizedSafeZone {
  /** Top inset as fraction [0.0 - 1.0] */
  readonly top: number;
  /** Bottom inset as fraction [0.0 - 1.0] */
  readonly bottom: number;
  /** Left inset as fraction [0.0 - 1.0] */
  readonly left: number;
  /** Right inset as fraction [0.0 - 1.0] */
  readonly right: number;
  /** Safe width as fraction [0.0 - 1.0] */
  readonly width: number;
  /** Safe height as fraction [0.0 - 1.0] */
  readonly height: number;
  /** Optical center X as fraction [0.0 - 1.0] */
  readonly centerX: number;
  /** Top-safe start Y as fraction [0.0 - 1.0] */
  readonly minY: number;
  /** Bottom-safe max Y as fraction [0.0 - 1.0] */
  readonly maxY: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SafeZoneMargins {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface ASSSubtitlePlacement {
  alignment: number;
  posX: number;
  posY: number;
  marginL: number;
  marginR: number;
  marginV: number;
}

export interface SafeCorridor {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export interface SafeOverlayCss {
  topPercent: string;
  bottomPercent: string;
  leftPercent: string;
  rightPercent: string;
  centerXPercent: string;
}

export interface SafeAssStyleConfig {
  marginL: number;
  marginR: number;
  marginV: number;
  align: number;
  posX: number;
  posY: number;
  refPosX: number;
  refPosY: number;
}

/**
 * Create a SafeZoneGeometry instance with derived metrics.
 */
export function createSafeZone(options: {
  W?: number;
  H?: number;
  SAFE_TOP: number;
  SAFE_BOTTOM: number;
  SAFE_LEFT: number;
  SAFE_RIGHT: number;
}): SafeZoneGeometry {
  const W = options.W ?? 1080;
  const H = options.H ?? 1920;
  const W_SAFE = Math.max(0, W - options.SAFE_LEFT - options.SAFE_RIGHT);
  const H_SAFE = Math.max(0, H - options.SAFE_TOP - options.SAFE_BOTTOM);
  const CENTER_X = options.SAFE_LEFT + W_SAFE / 2;
  const BOTTOM_MAX_Y = H - options.SAFE_BOTTOM;
  const TOP_MIN_Y = options.SAFE_TOP;

  return Object.freeze({
    W,
    H,
    SAFE_TOP: options.SAFE_TOP,
    SAFE_BOTTOM: options.SAFE_BOTTOM,
    SAFE_LEFT: options.SAFE_LEFT,
    SAFE_RIGHT: options.SAFE_RIGHT,
    W_SAFE,
    H_SAFE,
    CENTER_X,
    BOTTOM_MAX_Y,
    TOP_MIN_Y,
  });
}

/**
 * TikTok 9:16 Safe Zone (1080x1920)
 * Top: 180px (header, tabs — relaxed for photo carousels which have less UI)
 * Bottom: 280px (caption area — relaxed for carousels)
 * Left: 80px
 * Right: 100px (sidebar buttons are narrower on carousels)
 * W_SAFE: 900px, H_SAFE: 1460px, CENTER_X: 490px
 */
export const TIKTOK_SAFE_ZONE: SafeZoneGeometry = createSafeZone({
  W: 1080,
  H: 1920,
  SAFE_TOP: 180,
  SAFE_BOTTOM: 280,
  SAFE_LEFT: 80,
  SAFE_RIGHT: 100,
});

/**
 * Instagram Reels 9:16 Safe Zone (1080x1920)
 * Top: 240px (header, audio pill, camera)
 * Bottom: 340px (account handle, caption, audio)
 * Left: 80px
 * Right: 160px (action buttons)
 * W_SAFE: 840px, H_SAFE: 1340px, CENTER_X: 500px, BOTTOM_MAX_Y: 1580px, TOP_MIN_Y: 240px
 */
export const REELS_SAFE_ZONE: SafeZoneGeometry = createSafeZone({
  W: 1080,
  H: 1920,
  SAFE_TOP: 240,
  SAFE_BOTTOM: 340,
  SAFE_LEFT: 80,
  SAFE_RIGHT: 160,
});

/**
 * YouTube Shorts 9:16 Safe Zone (1080x1920)
 * Top: 220px (search, options)
 * Bottom: 380px (channel info, subscribe, title, sound button)
 * Left: 80px
 * Right: 180px (action sidebar)
 * W_SAFE: 820px, H_SAFE: 1320px, CENTER_X: 490px, BOTTOM_MAX_Y: 1540px, TOP_MIN_Y: 220px
 */
export const SHORTS_SAFE_ZONE: SafeZoneGeometry = createSafeZone({
  W: 1080,
  H: 1920,
  SAFE_TOP: 220,
  SAFE_BOTTOM: 380,
  SAFE_LEFT: 80,
  SAFE_RIGHT: 180,
});

/**
 * Universal Safe Zone Corridor (1080x1920)
 * Intersection of strictest platform constraints (Guaranteed safe on TikTok, Reels, and Shorts).
 */
export const UNIVERSAL_SAFE_ZONE: SafeZoneGeometry = createSafeZone({
  W: 1080,
  H: 1920,
  SAFE_TOP: 300,
  SAFE_BOTTOM: 400,
  SAFE_LEFT: 100,
  SAFE_RIGHT: 220,
});

/**
 * Symmetrical Centered Safe Zone (1080x1920)
 * For minimal or uncluttered layouts where true center alignment (X = 540) is desired.
 */
export const CENTER_SAFE_ZONE: SafeZoneGeometry = createSafeZone({
  W: 1080,
  H: 1920,
  SAFE_TOP: 300,
  SAFE_BOTTOM: 300,
  SAFE_LEFT: 100,
  SAFE_RIGHT: 100,
});

export const SOCIAL_SAFE_ZONES: Record<PlatformSafeZoneProfile, SafeZoneGeometry> = Object.freeze({
  tiktok: TIKTOK_SAFE_ZONE,
  reels: REELS_SAFE_ZONE,
  shorts: SHORTS_SAFE_ZONE,
  universal: UNIVERSAL_SAFE_ZONE,
  center: CENTER_SAFE_ZONE,
});

/**
 * Reference badge layout standards.
 */
export const REFERENCE_PILL_STANDARDS = Object.freeze({
  DEFAULT_Y: 300,
  FONT_SIZE: 28,
  PAD_X: 28,
  PAD_Y: 14,
  MIN_VERTICAL_GAP: 24,
});

/**
 * Retrieve the SafeZoneGeometry for a given platform profile.
 * Defaults to 'tiktok' if profile is omitted, null, or unrecognized.
 */
export function getSafeZone(platform?: PlatformSafeZoneProfile | string | null): SafeZoneGeometry {
  if (!platform || typeof platform !== "string") return TIKTOK_SAFE_ZONE;
  const key = platform.trim().toLowerCase() as PlatformSafeZoneProfile;
  return SOCIAL_SAFE_ZONES[key] || TIKTOK_SAFE_ZONE;
}

/**
 * Retrieve the bounding corridor coordinates.
 */
export function getSafeCorridor(platform?: PlatformSafeZoneProfile | string | null): SafeCorridor {
  const g = getSafeZone(platform);
  return {
    left: g.SAFE_LEFT,
    right: g.W - g.SAFE_RIGHT,
    top: g.SAFE_TOP,
    bottom: g.BOTTOM_MAX_Y,
    width: g.W_SAFE,
    height: g.H_SAFE,
    centerX: g.CENTER_X,
    centerY: g.SAFE_TOP + Math.round(g.H_SAFE / 2),
  };
}

/**
 * Scale a SafeZoneGeometry to a new resolution (e.g. 720p or responsive canvas).
 */
export function scaleSafeZone(
  geomOrProfile: SafeZoneGeometry | PlatformSafeZoneProfile | string,
  scale: number | { width: number; height: number },
): SafeZoneGeometry {
  const g =
    typeof geomOrProfile === "object" && geomOrProfile !== null
      ? geomOrProfile
      : getSafeZone(geomOrProfile);

  const scaleX = typeof scale === "number" ? scale : scale.width / g.W;
  const scaleY = typeof scale === "number" ? scale : scale.height / g.H;

  const W = Math.round(g.W * scaleX);
  const H = Math.round(g.H * scaleY);
  const SAFE_TOP = Math.round(g.SAFE_TOP * scaleY);
  const SAFE_BOTTOM = Math.round(g.SAFE_BOTTOM * scaleY);
  const SAFE_LEFT = Math.round(g.SAFE_LEFT * scaleX);
  const SAFE_RIGHT = Math.round(g.SAFE_RIGHT * scaleX);

  return createSafeZone({ W, H, SAFE_TOP, SAFE_BOTTOM, SAFE_LEFT, SAFE_RIGHT });
}

/**
 * Get normalized safe margins as fractions [0.0 - 1.0] for CSS percentage layout and SVG viewBox scaling.
 */
export function getNormalizedSafeZone(
  platform?: PlatformSafeZoneProfile | string | null,
): NormalizedSafeZone {
  const sz = getSafeZone(platform);
  return Object.freeze({
    top: sz.SAFE_TOP / sz.H,
    bottom: sz.SAFE_BOTTOM / sz.H,
    left: sz.SAFE_LEFT / sz.W,
    right: sz.SAFE_RIGHT / sz.W,
    width: sz.W_SAFE / sz.W,
    height: sz.H_SAFE / sz.H,
    centerX: sz.CENTER_X / sz.W,
    minY: sz.TOP_MIN_Y / sz.H,
    maxY: sz.BOTTOM_MAX_Y / sz.H,
  });
}

/**
 * Generate CSS percentage strings for interactive Live Preview UI overlays.
 */
export function getSafeOverlayCss(
  platform?: PlatformSafeZoneProfile | string | null,
): SafeOverlayCss {
  const g = getSafeZone(platform);
  return {
    topPercent: `${((g.SAFE_TOP / g.H) * 100).toFixed(3)}%`,
    bottomPercent: `${((g.SAFE_BOTTOM / g.H) * 100).toFixed(3)}%`,
    leftPercent: `${((g.SAFE_LEFT / g.W) * 100).toFixed(3)}%`,
    rightPercent: `${((g.SAFE_RIGHT / g.W) * 100).toFixed(3)}%`,
    centerXPercent: `${((g.CENTER_X / g.W) * 100).toFixed(3)}%`,
  };
}

/**
 * Check if a bounding box is completely contained within the safe zone corridor.
 * Supports both `isWithinSafeZone(box, profile)` and `isWithinSafeZone(x, y, w, h, profile)`.
 */
export function isWithinSafeZone(
  boxOrX: BoundingBox | number,
  platformOrY?: PlatformSafeZoneProfile | SafeZoneGeometry | string | null | number,
  width?: number,
  height?: number,
  platform?: PlatformSafeZoneProfile | SafeZoneGeometry | string | null,
): boolean {
  let box: BoundingBox;
  let targetPlatform: PlatformSafeZoneProfile | SafeZoneGeometry | string | null | undefined;

  if (typeof boxOrX === "object" && boxOrX !== null) {
    box = boxOrX;
    targetPlatform = platformOrY as
      PlatformSafeZoneProfile | SafeZoneGeometry | string | null | undefined;
  } else {
    box = {
      x: boxOrX as number,
      y: (platformOrY as number) ?? 0,
      width: width ?? 0,
      height: height ?? 0,
    };
    targetPlatform = platform;
  }

  const sz =
    typeof targetPlatform === "object" && targetPlatform !== null
      ? targetPlatform
      : getSafeZone(targetPlatform);

  const minX = sz.SAFE_LEFT;
  const maxX = sz.W - sz.SAFE_RIGHT;
  const minY = sz.TOP_MIN_Y;
  const maxY = sz.BOTTOM_MAX_Y;

  const boxRight = box.x + box.width;
  const boxBottom = box.y + box.height;

  return (
    box.x >= minX - 0.001 &&
    boxRight <= maxX + 0.001 &&
    box.y >= minY - 0.001 &&
    boxBottom <= maxY + 0.001
  );
}

/**
 * Clamp a bounding box to strictly fit within the safe zone boundaries.
 */
export function clampToSafeZone(
  box: BoundingBox,
  platformOrGeometry?: PlatformSafeZoneProfile | SafeZoneGeometry | string | null,
): BoundingBox {
  const sz =
    typeof platformOrGeometry === "object" && platformOrGeometry !== null
      ? platformOrGeometry
      : getSafeZone(platformOrGeometry);

  const minX = sz.SAFE_LEFT;
  const maxX = sz.W - sz.SAFE_RIGHT;
  const minY = sz.TOP_MIN_Y;
  const maxY = sz.BOTTOM_MAX_Y;

  const width = Math.min(box.width, sz.W_SAFE);
  const height = Math.min(box.height, sz.H_SAFE);

  let x = box.x;
  let y = box.y;

  if (x < minX) x = minX;
  if (x + width > maxX) x = maxX - width;

  if (y < minY) y = minY;
  if (y + height > maxY) y = maxY - height;

  return { x, y, width, height };
}

/**
 * Check if two rectangular boxes collide or violate a required vertical/horizontal gap.
 */
export function doBoxesCollide(boxA: BoundingBox, boxB: BoundingBox, minGap = 0): boolean {
  return !(
    boxA.x + boxA.width + minGap <= boxB.x ||
    boxB.x + boxB.width + minGap <= boxA.x ||
    boxA.y + boxA.height + minGap <= boxB.y ||
    boxB.y + boxB.height + minGap <= boxA.y
  );
}

/**
 * Calculate standard ASS subtitle alignment, coordinates, and margins for server-side FFmpeg rendering.
 */
export function getASSSubtitlePlacement(
  platform?: PlatformSafeZoneProfile | string | null,
  style?: "lower-third" | "bottom" | "center" | "minimal" | string,
): ASSSubtitlePlacement {
  const sz = getSafeZone(platform);
  const isCenter = style === "center" || platform === "center";

  if (isCenter) {
    return {
      alignment: 5, // Middle-Center
      posX: 540,
      posY: 960,
      marginL: sz.SAFE_LEFT,
      marginR: sz.SAFE_RIGHT,
      marginV: 960,
    };
  }

  // Lower-third / Bottom caption anchor
  const posY = Math.min(sz.BOTTOM_MAX_Y - 100, Math.round(sz.H * 0.74));

  return {
    alignment: 2, // Bottom-Center
    posX: sz.CENTER_X, // 480 for TikTok (shifted left to clear right sidebar action buttons)
    posY,
    marginL: sz.SAFE_LEFT,
    marginR: sz.SAFE_RIGHT,
    marginV: sz.H - posY,
  };
}

/**
 * Calculate ASS subtitle style parameters and coordinates for FFmpeg rendering.
 */
export function getSafeAssStyles(
  platform?: PlatformSafeZoneProfile | string | null,
  style?: "minimal" | "centered" | "lower-third" | "bottom" | string,
): SafeAssStyleConfig {
  const g = getSafeZone(platform);
  const isCenter = platform === "center" || style === "centered" || style === "minimal";
  const align = isCenter ? 5 : 2; // 5 = middle-center, 2 = bottom-center
  const posY = isCenter ? g.SAFE_TOP + Math.round(g.H_SAFE / 2) : g.BOTTOM_MAX_Y;

  return {
    marginL: g.SAFE_LEFT,
    marginR: g.SAFE_RIGHT,
    marginV: isCenter ? Math.round(g.H / 2) : g.SAFE_BOTTOM,
    align,
    posX: g.CENTER_X,
    posY,
    refPosX: g.CENTER_X,
    refPosY: g.SAFE_TOP + 40,
  };
}

/**
 * Calculate optical anchor Y coordinate for client video / canvas subtitles.
 */
export function getSubtitleAnchorY(
  platformOrGeometry?: PlatformSafeZoneProfile | SafeZoneGeometry | string | null,
  style?: "lower-third" | "bottom" | "center" | "minimal" | string,
): number {
  const sz =
    typeof platformOrGeometry === "object" && platformOrGeometry !== null
      ? platformOrGeometry
      : getSafeZone(platformOrGeometry);

  if (
    style === "center" ||
    (typeof platformOrGeometry === "string" && platformOrGeometry === "center")
  ) {
    return Math.round(sz.H / 2);
  }

  return Math.min(sz.BOTTOM_MAX_Y - 100, Math.round(sz.H * 0.74));
}
