import { createServerFn } from "@tanstack/react-start";
import { geminiChat, geminiGenerateImage } from "./gemini";

const PROMPT_SYSTEM = `Ти си арт-директор за вирално ислямско съдържание в TikTok. Получаваш ислямски текст (аят или хадис) и измисляш 3 различни визуални идеи за вертикален фон 9:16. ВАЖНИ ПРАВИЛА:
- БЕЗ хора, БЕЗ животни, БЕЗ лица, БЕЗ ръце, БЕЗ силуети на хора.
- БЕЗ арабска калиграфия върху изображението, БЕЗ текст изобщо.
- БЕЗ изображения на Кааба, джамии с разпознаваеми минарета, само ако са далечни и абстрактни.
- Разрешени: красива природа (планини, океан, пустиня по залез, гори, водопади, звездно небе, мъгла, дъжд по прозорец), архитектурни детайли (арки, геометрични шарки, мраморни подове), интериор (стара библиотека, стара книга с лъч светлина, перо и мастило, свещ, чаша чай), текстури (злато, мрамор, кадифе, перголи).
- Стил: кинематографично, дълбочина на полето, мек филмов цвят, премиум, емоционално резониращ с темата на текста.
Върни JSON масив с 3 обекта: [{"label":"кратко име на български","prompt":"подробен английски prompt за image gen"}]. САМО JSON, без обяснения.`;

export const suggestBackgrounds = createServerFn({ method: "POST" })
  .inputValidator((input: { text: string; sourceRef: string }) => input)
  .handler(async ({ data }) => {
    const raw = await geminiChat(
      "gemini-3.6-flash",
      [
        { role: "system", content: PROMPT_SYSTEM },
        { role: "user", content: `Източник: ${data.sourceRef}\n\nТекст:\n${data.text}` },
      ],
      true,
    );
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error("Невалиден отговор от AI");
    }
    const arr = Array.isArray(parsed)
      ? parsed
      : Array.isArray((parsed as { suggestions?: unknown }).suggestions)
        ? (parsed as { suggestions: unknown[] }).suggestions
        : Array.isArray((parsed as { ideas?: unknown }).ideas)
          ? (parsed as { ideas: unknown[] }).ideas
          : [];
    const suggestions = (arr as Array<{ label?: string; prompt?: string }>)
      .filter((s) => s && typeof s.prompt === "string")
      .slice(0, 3)
      .map((s) => ({ label: s.label ?? "Идея", prompt: s.prompt! }));
    if (!suggestions.length) throw new Error("Няма предложения");
    return { suggestions };
  });

export const generateBackground = createServerFn({ method: "POST" })
  .inputValidator((input: { prompt?: string }) => input)
  .handler(async ({ data }) => {
    // Generate image via Gemini Imagen and return base64 straight to client.
    const safePrompt = data && data.prompt ? data.prompt : "beautiful cinematic islamic background";
    const { base64, mimeType } = await geminiGenerateImage(safePrompt);
    return { base64, mimeType };
  });

// ============================================================================
// 1. RESTORED LOCAL IMAGE BACKGROUND POOL (Backwards Compatibility & ZIP mode)
// ============================================================================
export const LOCAL_BACKGROUND_POOL: string[] = [
  "tiktok_images/img0.jpg",
  "tiktok_images/img1.jpg",
  "tiktok_images/img2.jpg",
  "tiktok_images/img3.jpg",
  "tiktok_output/bg1.jpg",
  "tiktok_output/bg2.jpg",
  "tiktok_output/bg3.jpg",
  "tiktok_output/bg4.jpg",
];

// ============================================================================
// 2. CURATED LOCAL HALAL VIDEO FALLBACK POOL (Milestone M1)
// 8 Core Theological Themes: 100% Salafi-compliant (0 humans, 0 faces, 0 music)
// ============================================================================
export interface CuratedHalalVideoAsset {
  id: string;
  title?: string;
  themeBg: string;
  themeEn: string;
  theme: string;
  mood: "calm" | "majestic" | "reflective" | "hopeful" | "solemn";
  tags: string[];
  filename: string;
  url: string;
  fallbackRemoteUrl: string;
  sourceImageRef: string;
  duration: number;
  width: number;
  height: number;
  role?: "hook" | "context" | "dalil" | "cta";
}

export type HalalVideoAsset = CuratedHalalVideoAsset;
export type CuratedHalalVideo = CuratedHalalVideoAsset;

export const LOCAL_HALAL_VIDEO_POOL: CuratedHalalVideoAsset[] = [
  {
    id: "halal_vid_01_mountain_dawn",
    title: "Планински изгрев и светлина",
    themeBg: "планински изгрев и светлина",
    themeEn: "mountain sunrise golden dawn light",
    theme: "планински изгрев и светлина",
    mood: "hopeful",
    tags: ["mountain", "sunrise", "nature", "clouds", "hope", "tawheed"],
    filename: "halal_mountain_dawn.mp4",
    url: "https://images.pexels.com/videos/3175841/free-video-3175841.mp4",
    fallbackRemoteUrl: "https://images.pexels.com/videos/3175841/free-video-3175841.mp4",
    sourceImageRef: "tiktok_images/img0.jpg",
    duration: 10,
    width: 1080,
    height: 1920,
    role: "hook",
  },
  {
    id: "halal_vid_02_calm_river",
    title: "Спокойна река и зелена природа",
    themeBg: "спокойна река и зелена природа",
    themeEn: "calm river flowing water nature emerald",
    theme: "спокойна река и зелена природа",
    mood: "calm",
    tags: ["river", "water", "forest", "sabr", "peace", "calm"],
    filename: "halal_calm_river.mp4",
    url: "https://images.pexels.com/videos/3209828/free-video-3209828.mp4",
    fallbackRemoteUrl: "https://images.pexels.com/videos/3209828/free-video-3209828.mp4",
    sourceImageRef: "tiktok_images/img1.jpg",
    duration: 12,
    width: 1080,
    height: 1920,
    role: "context",
  },
  {
    id: "halal_vid_03_desert_sunset",
    title: "Пустиня по златен залез",
    themeBg: "пустиня по златен залез",
    themeEn: "golden desert dunes sunset warm light",
    theme: "пустиня по златен залез",
    mood: "reflective",
    tags: ["desert", "sunset", "dunes", "qadr", "warmth", "reflection"],
    filename: "halal_desert_sunset.mp4",
    url: "https://images.pexels.com/videos/5586616/pexels-photo-5586616.mp4",
    fallbackRemoteUrl: "https://images.pexels.com/videos/5586616/pexels-photo-5586616.mp4",
    sourceImageRef: "tiktok_images/img2.jpg",
    duration: 10,
    width: 1080,
    height: 1920,
    role: "dalil",
  },
  {
    id: "halal_vid_04_emerald_garden",
    title: "Райска градина и водопад",
    themeBg: "райска градина и водопад",
    themeEn: "emerald garden waterfall paradise lush nature",
    theme: "райска градина и водопад",
    mood: "majestic",
    tags: ["garden", "waterfall", "jannah", "paradise", "mercy", "rizq"],
    filename: "halal_emerald_garden.mp4",
    url: "https://images.pexels.com/videos/4434242/pexels-photo-4434242.mp4",
    fallbackRemoteUrl: "https://images.pexels.com/videos/4434242/pexels-photo-4434242.mp4",
    sourceImageRef: "tiktok_images/img3.jpg",
    duration: 10,
    width: 1080,
    height: 1920,
    role: "cta",
  },
  {
    id: "halal_vid_05_masjid_arches",
    title: "Мраморни ислямски арки и геометрия",
    themeBg: "мраморни ислямски арки и геометрия",
    themeEn: "islamic geometric arches marble architecture",
    theme: "мраморни ислямски арки и геометрия",
    mood: "solemn",
    tags: ["architecture", "arches", "marble", "masjid", "ibadah", "solemn"],
    filename: "halal_masjid_arches.mp4",
    url: "https://images.pexels.com/videos/856973/free-video-856973.mp4",
    fallbackRemoteUrl: "https://images.pexels.com/videos/856973/free-video-856973.mp4",
    sourceImageRef: "tiktok_output/bg1.jpg",
    duration: 8,
    width: 1080,
    height: 1920,
    role: "context",
  },
  {
    id: "halal_vid_06_night_stars",
    title: "Звездно небе и космическо величие",
    themeBg: "звездно небе и космическо величие",
    themeEn: "night sky stars timelapse universe cosmos",
    theme: "звездно небе и космическо величие",
    mood: "majestic",
    tags: ["night", "stars", "cosmos", "majesty", "creator", "tahajjud"],
    filename: "halal_night_stars.mp4",
    url: "https://images.pexels.com/videos/3141207/free-video-3141207.mp4",
    fallbackRemoteUrl: "https://images.pexels.com/videos/3141207/free-video-3141207.mp4",
    sourceImageRef: "tiktok_output/bg2.jpg",
    duration: 15,
    width: 1080,
    height: 1920,
    role: "hook",
  },
  {
    id: "halal_vid_07_turquoise_ocean",
    title: "Спокоен тюркоазен океан",
    themeBg: "спокоен тюркоазен океан",
    themeEn: "calm turquoise ocean sunset waves",
    theme: "спокоен тюркоазен океан",
    mood: "calm",
    tags: ["ocean", "sea", "sunset", "waves", "calm", "water"],
    filename: "halal_calm_ocean.mp4",
    url: "https://images.pexels.com/videos/2098989/pexels-video-2098989.mp4",
    fallbackRemoteUrl: "https://images.pexels.com/videos/2098989/pexels-video-2098989.mp4",
    sourceImageRef: "tiktok_output/bg3.jpg",
    duration: 12,
    width: 1080,
    height: 1920,
    role: "cta",
  },
  {
    id: "halal_vid_08_sunlit_spring",
    title: "Чист планински поток",
    themeBg: "чист планински поток",
    themeEn: "pure mountain spring stream flowing water",
    theme: "чист планински поток",
    mood: "hopeful",
    tags: ["spring", "stream", "mountain", "pure", "rizq", "light"],
    filename: "halal_mountain_spring.mp4",
    url: "https://images.pexels.com/videos/5359734/pexels-video-5359734.mp4",
    fallbackRemoteUrl: "https://images.pexels.com/videos/5359734/pexels-video-5359734.mp4",
    sourceImageRef: "tiktok_output/bg4.jpg",
    duration: 10,
    width: 1080,
    height: 1920,
    role: "dalil",
  },
];

export const CURATED_HALAL_VIDEO_POOL = LOCAL_HALAL_VIDEO_POOL;

export function getVideoCacheDir(): string {
  const home = process.env.USERPROFILE || process.env.HOME || ".";
  return `${home}/.islamicreels_jobs/video_cache`.replace(/\\/g, "/");
}

export function getFallbackVideoDir(): string {
  return `${getVideoCacheDir()}/fallback`;
}

export async function ensureFallbackVideoExists(asset: CuratedHalalVideoAsset): Promise<string> {
  const fs = await import("fs/promises");
  const path = await import("path");
  const os = await import("os");
  const fallbackDir = path.join(os.homedir(), ".islamicreels_jobs", "video_cache", "fallback");
  await fs.mkdir(fallbackDir, { recursive: true }).catch(() => {});
  const targetPath = path.join(fallbackDir, asset.filename);

  try {
    const stat = await fs.stat(targetPath);
    if (stat.size > 50_000) return targetPath;
  } catch {
    // Target file does not exist yet on disk
  }

  // Attempt download if fallbackRemoteUrl is set
  if (asset.fallbackRemoteUrl) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(asset.fallbackRemoteUrl, { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        const buffer = Buffer.from(await res.arrayBuffer());
        if (buffer.length > 50_000) {
          const tmpPath = `${targetPath}.tmp.${Date.now()}`;
          await fs.writeFile(tmpPath, buffer);
          await fs.rename(tmpPath, targetPath);
          return targetPath;
        }
      }
    } catch (e) {
      console.warn(`[fallback-pool] Download failed for ${asset.filename}:`, e);
    }
  }

  // FFmpeg synthetic loop from local source image
  const sourceImageAbs = path.resolve(process.cwd(), asset.sourceImageRef);
  try {
    const stat = await fs.stat(sourceImageAbs).catch(() => null);
    if (stat) {
      const { exec } = await import("child_process");
      const { promisify } = await import("util");
      const execAsync = promisify(exec);
      const tmpPath = `${targetPath}.tmp.${Date.now()}.mp4`;
      const cmd = `ffmpeg -y -loop 1 -i "${sourceImageAbs}" -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,zoompan=z='min(zoom+0.0006,1.06)':d=240:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=30" -t 8 -c:v libx264 -pix_fmt yuv420p -an "${tmpPath}"`;
      await execAsync(cmd);
      await fs.rename(tmpPath, targetPath);
      return targetPath;
    }
  } catch (synthErr) {
    console.warn(`[fallback-pool] FFmpeg synthesis failed for ${asset.filename}:`, synthErr);
  }

  return targetPath;
}

export function getLocalHalalVideoFallback(
  indexOrOptions: number | { slideIndex?: number; mood?: string; theme?: string } = 0,
): CuratedHalalVideoAsset {
  const pool = LOCAL_HALAL_VIDEO_POOL;
  const rawIdx =
    typeof indexOrOptions === "number"
      ? indexOrOptions
      : (indexOrOptions && typeof indexOrOptions === "object" ? indexOrOptions.slideIndex ?? 0 : 0);
  const floored = Math.floor(Math.abs(Number(rawIdx))) || 0;
  const safeInt = Number.isFinite(floored) ? floored : 0;
  const safeIdx = safeInt % pool.length;
  return pool[safeIdx] || pool[0];
}

export async function getCuratedHalalVideoFallbackDirect(
  slideIndex = 0,
  theme = "Ислямска природа",
): Promise<{
  slideIndex: number;
  videoUrl: string;
  source: "local_fallback";
  duration: number;
  width: number;
  height: number;
  theme: string;
}> {
  const pool = LOCAL_HALAL_VIDEO_POOL;
  const floored = Math.floor(Math.abs(Number(slideIndex))) || 0;
  const safeInt = Number.isFinite(floored) ? floored : 0;
  const safeIdx = safeInt % pool.length;
  const asset = pool[safeIdx] || pool[0];
  return {
    slideIndex,
    videoUrl: asset.url,
    source: "local_fallback",
    duration: asset.duration,
    width: asset.width,
    height: asset.height,
    theme: theme || asset.themeBg,
  };
}

export async function getCuratedHalalVideoFallback(options?: {
  slideIndex?: number;
  mood?: string;
  theme?: string;
}): Promise<{
  videoPath: string;
  videoUrl: string;
  asset: CuratedHalalVideoAsset;
}> {
  const pool = LOCAL_HALAL_VIDEO_POOL;
  const rawIdx = options?.slideIndex ?? 0;
  const floored = Math.floor(Math.abs(Number(rawIdx))) || 0;
  const safeInt = Number.isFinite(floored) ? floored : 0;
  const safeIdx = safeInt % pool.length;
  let match = options?.mood ? pool.find((p) => p.mood === options.mood) : undefined;
  if (!match) {
    match = pool[safeIdx] || pool[0];
  }
  const filePath = await ensureFallbackVideoExists(match);
  return {
    videoPath: filePath,
    videoUrl: filePath,
    asset: match,
  };
}

export async function getCarouselBackgroundsDirect(data?: {
  count?: number;
  cycleIndex?: number;
}): Promise<{ backgrounds: string[] }> {
  const count = Math.max(1, Math.min(20, Math.floor(Number(data?.count)) || 4));
  const rawCycle = Number(data?.cycleIndex);
  const cycleIndex = Math.max(0, Number.isFinite(rawCycle) ? (Math.floor(rawCycle) || 0) : 0);
  const fs = await import("fs/promises");
  const path = await import("path");

  const pool = LOCAL_BACKGROUND_POOL;
  const backgrounds: string[] = [];

  for (let i = 0; i < count; i++) {
    const rawAssetIdx = cycleIndex * count + i;
    const flooredIdx = Math.floor(Math.abs(Number(rawAssetIdx))) || 0;
    const safeInt = Number.isFinite(flooredIdx) ? flooredIdx : 0;
    const assetIdx = safeInt % pool.length;
    const relPath = pool[assetIdx] || pool[0];
    const absPath = path.resolve(process.cwd(), relPath);

    try {
      const buf = await fs.readFile(absPath);
      const base64 = buf.toString("base64");
      backgrounds.push(`data:image/jpeg;base64,${base64}`);
    } catch (err) {
      console.warn(`[getCarouselBackgrounds] Failed to read ${relPath}:`, err);
      backgrounds.push(
        `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920"><rect width="1080" height="1920" fill="%23111827"/></svg>`,
      );
    }
  }

  return { backgrounds };
}

export const getCarouselBackgrounds = createServerFn({ method: "POST" })
  .validator((input: { count?: number; cycleIndex?: number } | undefined) => input || {})
  .handler(
    async ({
      data,
    }: {
      data?: { count?: number; cycleIndex?: number };
    }): Promise<{ backgrounds: string[] }> => {
      return getCarouselBackgroundsDirect(data);
    },
  );
