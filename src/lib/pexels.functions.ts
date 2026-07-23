// Content-aware Pexels search.
// Gemini analyzes the ayah/hadith text → returns a Bulgarian theme,
// a mood, and 3–5 prioritized English visual queries (no people/animals/
// religious symbols). We then query Pexels in cascade until we get enough
// vertical candidates, score them, and return the best ones.

import { createServerFn } from "@tanstack/react-start";
import { geminiChat } from "@/lib/gemini";

type Mood = "calm" | "majestic" | "reflective" | "hopeful" | "solemn";
type Analysis = { theme: string; mood: Mood; queries: string[] };

// Tiny in-process LRU per warm worker. Saves repeated AI cost when the same
// batch row is re-rendered.
const _cache = new Map<string, Analysis>();
function cacheKey(text: string, avoid?: string[]) {
  return `${(avoid ?? []).join("|")}::${text.slice(0, 400)}`;
}

async function analyzeVisualThemes(text: string, avoid: string[] = []): Promise<Analysis> {
  const key = cacheKey(text, avoid);
  const hit = _cache.get(key);
  if (hit) return hit;

  const fallback: Analysis = {
    theme: "природа и светлина",
    mood: "calm",
    queries: ["vibrant golden sunset nature", "colorful clouds sunlight blue sky", "emerald green valley morning sun"],
  };

  const avoidLine = avoid.length
    ? `Избягвай теми/думи, които вече пробвахме: ${avoid.join(", ")}.`
    : "";

  try {
    const raw = await geminiChat(
      "gemini-2.5-flash",
      [
        {
          role: "system",
          content:
            "Анализираш ислямски текст (аят или хадис) и връщаш JSON със стоково-видео подсказки за вертикален TikTok фон.\n" +
            "Изисквания: БЕЗ хора/лица, БЕЗ животни, БЕЗ религиозни символи (джамии, Корани, тасбих, флагове), БЕЗ текст в кадъра. СТРИКТНИ SALAFI HALAL ПРИНЦИПИ: Забранени са всякакви човешки същества, части от тялото, лица или животни.\n" +
            "ВАЖНО ЗА ЦВЕТОВЕТЕ: НИКОГА не предлагай черно-бели, тъмни или мрачни (black and white / monochrome / grayscale / dark / gloomy / shadow / silhouette / storm / fog) видеа! Всички заявки ТРЯБВА да търсят ВАЙБРАНТНИ, СВЕТЛИ и ЦВЕТНИ кадри (напр. \"vibrant sunset\", \"golden hour nature\", \"colorful sky\", \"emerald green valley\", \"turquoise water\", \"warm sunlight\").\n" +
            "Предпочитай красива цветна природа (вода, слънчева светлина, планини, зелени гори, небе, изгрев/залез), архитектурни детайли, златен час, океан.\n" +
            "Извличаш СМИСЪЛА — ако текстът говори за търпение → тиха вода на слънце; за милост → дъжд над зелена долина със слънчева светлина; за светлина/напътствие → топъл изгрев, фенер, звезди; за съдния ден → бурен океан със залез; за знание → отворена книга на топла светлина; за рай → водопад, цветя, слънчева градина; за смърт/отвъдното → спокоен златен залез.\n" +
            "Върни СТРИКТЕН JSON: {\"theme\": string (на български, 2-4 думи), \"mood\": \"calm\"|\"majestic\"|\"reflective\"|\"hopeful\"|\"solemn\", \"queries\": string[3..5] (английски Pexels заявки, най-конкретната първа, всяка 2-4 думи)}.\n" +
            (avoidLine ? avoidLine + "\n" : ""),
        },
        { role: "user", content: text.slice(0, 1200) },
      ],
      true,
    );

    const parsed = JSON.parse(raw) as Partial<Analysis>;
    const queries = Array.isArray(parsed.queries)
      ? parsed.queries.map((q) => String(q).trim()).filter(Boolean).slice(0, 5)
      : [];
    if (!queries.length) throw new Error("no queries");
    const out: Analysis = {
      theme: String(parsed.theme || "природа").slice(0, 80),
      mood: (["calm", "majestic", "reflective", "hopeful", "solemn"] as const).includes(parsed.mood as Mood)
        ? (parsed.mood as Mood)
        : "calm",
      queries,
    };
    _cache.set(key, out);
    return out;
  } catch {
    return fallback;
  }
}

// ------------ Pexels low-level helpers ------------

type PexelsPhoto = {
  id: number;
  src: { portrait: string; large2x: string; original: string };
  alt?: string;
  photographer?: string;
};

type PexelsVideoFile = { quality: string; width: number; height: number; link: string; file_type: string; fps?: number; size?: number };
type PexelsVideoPic = { picture: string };
type PexelsVideo = {
  id: number;
  duration?: number;
  video_files: PexelsVideoFile[];
  video_pictures: PexelsVideoPic[];
  user?: { name: string };
  url?: string;
};

async function pexelsPhotoQuery(key: string, query: string, perPage = 9) {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=portrait&size=large&per_page=${perPage}`;
  const res = await fetch(url, { headers: { Authorization: key } });
  if (!res.ok) throw new Error(`Pexels грешка ${res.status}`);
  const j = await res.json();
  return (j.photos ?? []) as PexelsPhoto[];
}

async function pexelsVideoQuery(key: string, query: string, perPage = 80) {
  const url = `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&orientation=portrait&size=medium&per_page=${perPage}`;
  const res = await fetch(url, { headers: { Authorization: key } });
  if (!res.ok) throw new Error(`Pexels грешка ${res.status}`);
  const j = await res.json();
  return (j.videos ?? []) as PexelsVideo[];
}

function scoreVideo(v: PexelsVideo, file: PexelsVideoFile, targetMin = 30): number {
  let s = 0;
  const meta = JSON.stringify(v).toLowerCase();

  // SALAFI HALAL FILTER: Strongly penalize videos with humans or animals in metadata
  const haramRegex = /\b(man|woman|men|women|people|person|face|faces|human|humans|girl|boy|crowd|animal|dog|cat|bird|fish)\b/i;
  if (haramRegex.test(meta)) {
    s -= 1000;
  }

  if (meta.includes("black and white") || meta.includes("monochrome") || meta.includes("grayscale") || meta.includes("greyscale") || meta.includes("silhouette") || meta.includes("dark sky")) {
    s -= 40; // Heavily penalize black and white / monochrome stock videos
  }
  const aspect = file.width > 0 ? file.height / file.width : 0;
  // Reward true vertical 9:16 orientation (aspect around 1.77)
  s += Math.max(0, 10 - Math.abs(aspect - 16 / 9) * 8);
  if (file.height >= 1280) s += 6;
  if (file.height >= 1920) s += 8;
  if (file.height >= 3840) s += 10; // 4K vertical bonus
  if ((file.fps ?? 0) >= 30) s += 5;
  if ((file.fps ?? 0) >= 60) s += 4;

  const d = v.duration ?? 10;
  if (d >= targetMin) s += 20;
  else if (d >= 15) s += 5;

  // Keyword bonuses for cinematic quality
  if (meta.includes("4k") || meta.includes("cinematic") || meta.includes("drone") || meta.includes("nature") || meta.includes("sunset") || meta.includes("waterfall") || meta.includes("stars")) {
    s += 8;
  }
  return s;
}

function pickBestFile(v: PexelsVideo): PexelsVideoFile | undefined {
  const mp4s = (v.video_files || []).filter((f) => f.file_type === "video/mp4");
  if (!mp4s.length) return (v.video_files || [])[0];
  // Sort by resolution quality: vertical orientation first, then highest pixel count up to crisp HD/4K
  mp4s.sort((a, b) => {
    const aVert = a.height >= a.width ? 1 : 0;
    const bVert = b.height >= b.width ? 1 : 0;
    if (aVert !== bVert) return bVert - aVert;
    const aTargetScore = Math.min(a.height, 3840);
    const bTargetScore = Math.min(b.height, 3840);
    return bTargetScore - aTargetScore || (b.width * b.height) - (a.width * a.height);
  });
  return mp4s[0];
}

// ------------ Public server functions ------------

export const searchPexelsPhotos = createServerFn({ method: "POST" })
  .inputValidator((input: { text: string; query?: string; avoid?: string[] }) => input)
  .handler(async ({ data }) => {
    const key = process.env.PEXELS_API_KEY;
    if (!key) throw new Error("Pexels не е конфигуриран");

    // Manual override wins.
    if (data.query?.trim()) {
      const photos = await pexelsPhotoQuery(key, data.query.trim());
      return {
        query: data.query.trim(),
        theme: "",
        mood: "calm" as Mood,
        queriesTried: [data.query.trim()],
        photos: photos.map((p) => ({
          id: p.id,
          url: p.src.portrait || p.src.large2x || p.src.original,
          full: p.src.original || p.src.large2x || p.src.portrait,
          alt: p.alt ?? "",
          photographer: p.photographer ?? "",
        })),
      };
    }

    const analysis = await analyzeVisualThemes(data.text, data.avoid);
    const tried: string[] = [];
    let chosenQuery = analysis.queries[0];
    let photos: PexelsPhoto[] = [];
    for (const q of analysis.queries) {
      tried.push(q);
      photos = await pexelsPhotoQuery(key, q);
      if (photos.length >= 3) { chosenQuery = q; break; }
    }
    return {
      query: chosenQuery,
      theme: analysis.theme,
      mood: analysis.mood,
      queriesTried: tried,
      photos: photos.map((p) => ({
        id: p.id,
        url: p.src.portrait || p.src.large2x || p.src.original,
        full: p.src.original || p.src.large2x || p.src.portrait,
        alt: p.alt ?? "",
        photographer: p.photographer ?? "",
      })),
    };
  });

type Out = { id: number; link: string; poster: string; photographer: string; score: number; duration: number };
function buildOut(vs: PexelsVideo[], targetMin = 30): Out[] {
  const all = vs
    .map((v) => {
      const file = pickBestFile(v);
      if (!file?.link) return null;
      return {
        id: v.id,
        link: file.link,
        poster: v.video_pictures?.[0]?.picture ?? "",
        photographer: v.user?.name ?? "",
        duration: v.duration ?? 0,
        score: scoreVideo(v, file, targetMin),
      };
    })
    .filter((x): x is Out => !!x);

  const matchingDuration = all.filter((x) => x.duration >= targetMin);
  if (targetMin >= 60 && matchingDuration.length === 0) {
    return [];
  }

  const pool = matchingDuration.length > 0 ? matchingDuration : [];
  pool.sort((a, b) => b.score - a.score);
  return pool.slice(0, 16);
}

export const searchPexelsVideos = createServerFn({ method: "POST" })
  .inputValidator((input: { text: string; query?: string; avoid?: string[]; minDuration?: number }) => input)
  .handler(async ({ data }) => {
    const key = process.env.PEXELS_API_KEY;
    if (!key) throw new Error("Pexels не е конфигуриран");
    const targetMin = data.minDuration ?? 30;

    if (data.query?.trim()) {
      const vs = await pexelsVideoQuery(key, data.query.trim());
      const built = buildOut(vs, targetMin);
      return {
        query: data.query.trim(),
        theme: "",
        mood: "calm" as Mood,
        queriesTried: [data.query.trim()],
        videos: built,
      };
    }

    const analysis = await analyzeVisualThemes(data.text, data.avoid);
    const tried: string[] = [];
    let chosenQuery = analysis.queries[0];
    let videos: Out[] = [];
    for (const q of analysis.queries) {
      tried.push(q);
      const vs = await pexelsVideoQuery(key, q);
      const built = buildOut(vs, targetMin);
      if (built.length >= 3) {
        chosenQuery = q;
        videos = built;
        break;
      }
      // Keep the best partial result as we go so we never return empty.
      if (built.length > videos.length) {
        videos = built;
        chosenQuery = q;
      }
    }

    return {
      query: chosenQuery,
      theme: analysis.theme,
      mood: analysis.mood,
      videos,
    };
  });

export const fetchMultiSceneBRoll = createServerFn({ method: "POST" })
  .validator((input: { query?: string }) => input)
  .handler(async ({ data }): Promise<{ clips: string[]; theme: string }> => {
    const key = process.env.PEXELS_API_KEY || "";
    const queries = data?.query ? [data.query] : ["mountain sunset", "night sky stars", "nature river calm"];
    const clips: string[] = [];

    for (const q of queries) {
      const vs = await pexelsVideoQuery(key, q);
      const built = buildOut(vs);
      for (const b of built) {
        if (!clips.includes(b.link) && clips.length < 3) {
          clips.push(b.link);
        }
      }
    }

    return {
      clips: clips.slice(0, 3),
      theme: data?.query || "Кинематографични B-Roll сцени",
    };
  });

