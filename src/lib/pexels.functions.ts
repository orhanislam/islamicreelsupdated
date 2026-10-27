// Content-aware Pexels search & Salafi-compliant video sourcing engine.
// Combines 0ms Bulgarian/Arabic theological taxonomy dictionary lookup,
// Gemini 3.6 Flash director fallback, 4-tier Salafi Halal compliance filtering,
// and a guaranteed local vertical 9:16 Halal video fallback pool.

import { createServerFn } from "@tanstack/react-start";
import { geminiChat, geminiImageAnalysis } from "./gemini";
import {
  LOCAL_HALAL_VIDEO_POOL,
  CuratedHalalVideoAsset,
  getLocalHalalVideoFallback,
  getHalalVideoByConceptId,
  getCuratedHalalVideoFallbackDirect,
} from "./backgrounds.functions";

export type Mood = "calm" | "majestic" | "reflective" | "hopeful" | "solemn";
export type Analysis = { theme: string; mood: Mood; queries: string[] };

export interface SemanticBRollSegment {
  url: string;
  start: number;
  end: number;
  duration: number;
  theme: string;
  conceptId: string;
  query: string;
  textSnippet: string;
}

// ============================================================================
// 1. DATA CONTRACTS (matching PROJECT.md § Interface Contracts)
// ============================================================================

export interface SlideVideoResult {
  slideIndex: number;
  videoUrl: string;
  source: "pexels" | "local_fallback";
  duration: number;
  width: number;
  height: number;
  theme: string;
}

export interface CarouselSlideInput {
  text: string;
  topTitle?: string;
  imagePrompt?: string;
  mainText?: string;
  quoteText?: string;
  commentaryText?: string;
  bottomText?: string;
}

export type SlideVideoInput = CarouselSlideInput;

export type PexelsPhoto = {
  id: number;
  src: { portrait: string; large2x: string; original: string };
  alt?: string;
  photographer?: string;
};

export type PexelsVideoFile = {
  quality: string;
  width: number;
  height: number;
  link: string;
  file_type: string;
  fps?: number;
  size?: number;
};

export type PexelsVideoPic = { picture: string };

export type PexelsVideo = {
  id: number;
  duration?: number;
  video_files: PexelsVideoFile[];
  video_pictures: PexelsVideoPic[];
  user?: { name: string };
  url?: string;
};

export type Out = {
  id: number;
  link: string;
  poster: string;
  photographer: string;
  score: number;
  duration: number;
};

// In-process cache for visual theme analyses
const _cache = new Map<string, Analysis>();
function cacheKey(text: string, avoid?: string[]) {
  return `${(avoid ?? []).join("|")}::${text.slice(0, 400)}`;
}

// ============================================================================
// 2. TIER 1 SALAFI GUARDRAIL: Query Sanitizer
// ============================================================================

export const TIER1_FORBIDDEN_QUERY_TOKENS =
  /\b(man|men|woman|women|person|people|human|humans|boy|boys|girl|girls|child|children|baby|babies|kid|kids|toddler|toddlers|teen|teenager|adult|adults|elder|elders|couple|couples|crowd|crowds|pedestrian|pedestrians|tourist|tourists|model|models|lady|ladies|guy|guys|dancer|dancers|singer|singers|actor|actress|swimmer|runner|jogger|family|father|mother|brother|sister|son|daughter|husband|wife|friend|friends|face|faces|head|heads|hand|hands|arm|arms|leg|legs|foot|feet|body|bodies|eye|eyes|lip|lips|mouth|mouths|smile|smiling|finger|fingers|skin|hair|beard|silhouette|silhouettes|shadow|walking|running|standing|sitting|praying|reading|working|talking|looking|holding|posing|dancing|sleeping|animal|animals|dog|dogs|puppy|puppies|cat|cats|kitten|kittens|bird|birds|horse|horses|lion|lions|tiger|tigers|bear|bears|elephant|elephants|camel|camels|sheep|goat|goats|cow|cows|cattle|monkey|monkeys|fish|fishes|wildlife|pet|pets|insect|insects|butterfly|butterflies|music|musical|instrument|instruments|guitar|guitars|piano|pianos|violin|violins|drum|drums|flute|flutes|trumpet|trumpets|saxophone|saxophones|cello|cellos|harp|harps|oud|band|orchestra|concert|cross|crucifix|church|churches|monastery|cathedral|synagogue|temple|temples|statue|statues|idol|idols|sculpture|sculptures|figurine|figurines|sheikh|sheikhs|shaykh|shaykhs|imam|imams|scholar|scholars|worshipper|worshippers|worshiper|worshipers|pilgrim|pilgrims|congregation|congregations|monk|monks|priest|priests|pastor|pastors|melody|melodies|note|notes|sheet\s*music|music\s*sheet|songbook|score)\b/gi;

export const TIER1_POSITIVE_NATURE_ANCHORS =
  /\b(nature|landscape|mountain|mountains|valley|valleys|forest|forests|trees|wood|woods|river|rivers|stream|streams|lake|lakes|sea|ocean|waves|waterfall|waterfalls|sky|clouds|sunset|sunsets|sunrise|sunrises|sunlight|sunbeams|stars|starry|milky\s*way|galaxy|nebula|desert|sand\s*dunes|dune|dunes|meadow|meadows|water|rain|raindrops|fog|mist|fire|flames|flame|embers|ember|lava|sparks|smoke)\b/i;

export const TIER1_POSITIVE_ARCH_ANCHORS =
  /\b(architecture|arch|arches|columns|marble|geometric|patterns|ancient\s+ruins)\b/i;

export function sanitizeSearchQuery(query: string): string {
  if (!query || typeof query !== "string") {
    return "vibrant golden sunset nature landscape vertical";
  }

  // 1. Strip forbidden human/animal/instrument tokens
  let cleaned = query.replace(TIER1_FORBIDDEN_QUERY_TOKENS, " ");
  // Collapse whitespace
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  // 2. Check if clean query is empty after stripping
  if (!cleaned || cleaned.length < 2) {
    return "vibrant golden sunset nature landscape vertical";
  }

  // 3. Enforce positive anchors
  const hasNature = TIER1_POSITIVE_NATURE_ANCHORS.test(cleaned);
  const hasArch = TIER1_POSITIVE_ARCH_ANCHORS.test(cleaned);

  if (/\b(mosque|masjid)\b/i.test(cleaned) && !cleaned.toLowerCase().includes("no people")) {
    cleaned += " architecture no people";
  } else if (!hasNature && !hasArch) {
    if (/\b(dome|building|wall|hall)\b/i.test(cleaned)) {
      cleaned += " architecture no people";
    } else {
      cleaned += " nature landscape";
    }
  }

  if (!cleaned.toLowerCase().includes("vertical")) {
    cleaned += " vertical";
  }

  return cleaned.trim();
}

export const sanitizeSalafiQuery = sanitizeSearchQuery;

// ============================================================================
// 3. TIER 2 SALAFI GUARDRAIL: Metadata Blacklist Hard Exclusion Gate
// ============================================================================

export const TIER2_HARAM_METADATA_REGEX =
  /\b(man|men|woman|women|people|person|human|humans|face|faces|girl|girls|boy|boys|child|children|kid|kids|baby|babies|toddler|toddlers|teen|teenager|adult|adults|couple|couples|crowd|crowds|model|models|portrait|lady|ladies|guy|guys|pedestrian|pedestrians|tourist|tourists|dancer|dancers|singer|singers|jogger|runner|swimmer|family|father|mother|brother|sister|son|daughter|husband|wife|body|bodies|hand|hands|feet|foot|leg|legs|arm|arms|head|heads|finger|fingers|skin|hair|beard|silhouette|silhouettes|shadow|shadows|walk|walking|run|running|jump|jumping|dance|dancing|sing|singing|pray|praying|sleep|sleeping|sit|sitting|stand|standing|look|looking|hold|holding|smile|smiling|laugh|laughing|animal|animals|dog|dogs|puppy|puppies|cat|cats|kitten|kittens|bird|birds|horse|horses|lion|lions|tiger|tigers|bear|bears|elephant|elephants|camel|camels|sheep|goat|goats|cow|cows|cattle|monkey|monkeys|fish|fishes|wildlife|pet|pets|insect|insects|butterfly|butterflies|piano|guitar|violin|drum|drums|flute|trumpet|saxophone|cello|harp|oud|music|musical|instrument|instruments|concert|orchestra|band|statue|statues|idol|idols|sculpture|sculptures|figurine|figurines|cross|crucifix|church|synagogue|temple|sheikh|sheikhs|shaykh|shaykhs|imam|imams|scholar|scholars|worshipper|worshippers|worshiper|worshipers|pilgrim|pilgrims|congregation|congregations|monk|monks|priest|priests|pastor|pastors|melody|melodies|note|notes|sheet\s*music|music\s*sheet|songbook|score)\b/i;

export function isMetadataHaram(video: PexelsVideo): boolean {
  if (
    !video ||
    typeof video !== "object" ||
    !video.id ||
    !Number.isFinite(Number(video.id)) ||
    Number(video.id) <= 0 ||
    Object.keys(video).length === 0
  ) {
    return true;
  }
  const meta = JSON.stringify(video).toLowerCase();
  return TIER2_HARAM_METADATA_REGEX.test(meta);
}

// ============================================================================
// 4. TIER 3 SALAFI GUARDRAIL: Multi-Frame Gemini Vision Verification (Fail-Closed)
// ============================================================================

export interface HalalVideoAuditRecord {
  videoId: number | string;
  status: "HALAL" | "HARAM";
  auditedAt: string;
  reason?: string;
  url?: string;
  duration?: number;
  width?: number;
  height?: number;
}

export interface HalalCacheSchema {
  version: 1;
  lastUpdated: string;
  records: Record<string, HalalVideoAuditRecord>;
}

const _halalMemoryCache = new Map<string, HalalVideoAuditRecord>();
let _cacheLoadedFromDisk = false;
let _cacheLock: Promise<unknown> = Promise.resolve();

function withHalalCacheLock<T>(action: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    _cacheLock = _cacheLock
      .catch(() => {})
      .then(action)
      .then(resolve, reject);
  });
}

export function getHalalCacheFilePath(): string {
  const home = process.env.USERPROFILE || process.env.HOME || ".";
  return `${home}/.islamicreels_jobs/halal_verified_videos.json`.replace(/\\/g, "/");
}

export async function ensureHalalCacheDir(): Promise<string> {
  const fs = await import("fs/promises");
  const path = await import("path");
  const os = await import("os");
  const dir = path.join(os.homedir(), ".islamicreels_jobs");
  await fs.mkdir(dir, { recursive: true }).catch(() => {});
  return dir;
}

export async function loadHalalDiskCache(): Promise<void> {
  if (_cacheLoadedFromDisk) return;
  try {
    const fs = await import("fs/promises");
    const filePath = getHalalCacheFilePath();
    const content = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(content) as HalalCacheSchema;
    if (parsed && parsed.records && typeof parsed.records === "object") {
      for (const [k, v] of Object.entries(parsed.records)) {
        _halalMemoryCache.set(String(k), v);
      }
    }
  } catch {
    // Cache file does not exist yet
  } finally {
    _cacheLoadedFromDisk = true;
  }
}

export async function getCachedHalalStatus(
  videoId: number | string,
): Promise<"HALAL" | "HARAM" | null> {
  await loadHalalDiskCache();
  const hit = _halalMemoryCache.get(String(videoId));
  return hit ? hit.status : null;
}

export async function setCachedHalalStatus(
  videoId: number | string,
  status: "HALAL" | "HARAM",
  reason = "",
  meta?: Partial<HalalVideoAuditRecord>,
): Promise<void> {
  await loadHalalDiskCache();
  const idStr = String(videoId);
  const record: HalalVideoAuditRecord = {
    videoId,
    status,
    auditedAt: new Date().toISOString(),
    reason: reason || (status === "HALAL" ? "Vision AI verified" : "Rejected by Salafi audit"),
    ...meta,
  };
  _halalMemoryCache.set(idStr, record);

  await withHalalCacheLock(async () => {
    try {
      await ensureHalalCacheDir();
      const fs = await import("fs/promises");
      const filePath = getHalalCacheFilePath();
      const recordsObj: Record<string, HalalVideoAuditRecord> = {};
      for (const [k, v] of _halalMemoryCache.entries()) {
        recordsObj[k] = v;
      }
      const schema: HalalCacheSchema = {
        version: 1,
        lastUpdated: new Date().toISOString(),
        records: recordsObj,
      };
      await fs.writeFile(filePath, JSON.stringify(schema, null, 2), "utf-8");
    } catch (err) {
      console.warn("[pexels] Failed to write halal cache to disk:", err);
    }
  });
}

export async function checkVideoForHaram(video: PexelsVideo): Promise<boolean> {
  if (!video || !video.id) return true;

  // 1. Check persistent disk cache first
  const cachedStatus = await getCachedHalalStatus(video.id);
  if (cachedStatus === "HALAL") return false;
  if (cachedStatus === "HARAM") return true;

  // 2. Fail-closed: Must have preview pictures to audit
  const pics = video.video_pictures;
  if (!pics || pics.length === 0) {
    console.warn(
      `[pexels] Video ${video.id} has no video_pictures to audit. Rejecting (fail-closed).`,
    );
    return true;
  }

  try {
    // Sample 5 frames across the video to better catch moving people
    const len = pics.length;
    const indices = [0, Math.floor(len * 0.25), Math.floor(len * 0.5), Math.floor(len * 0.75), len - 1];
    const uniqueIndices = [...new Set(indices)];

    const downloadedImages = await Promise.all(
      uniqueIndices.map(async (idx) => {
        try {
          const picUrl = pics[idx]?.picture;
          if (!picUrl) return null;
          const res = await fetch(picUrl);
          if (!res.ok) return null;
          const arrayBuffer = await res.arrayBuffer();
          const base64Image = Buffer.from(arrayBuffer).toString("base64");
          const mimeType = res.headers.get("content-type") || "image/jpeg";
          return { base64: base64Image, mimeType };
        } catch {
          return null;
        }
      }),
    );

    const images = downloadedImages.filter(
      (img): img is { base64: string; mimeType: string } => img !== null,
    );
    if (images.length === 0) {
      console.warn(
        `[pexels] Failed to download keyframes for video ${video.id}. Rejecting (fail-closed).`,
      );
      return true;
    }

    const prompt = `You are an uncompromising Islamic compliance auditor adhering to orthodox Salafi standards.
Inspect these video keyframes with EXTREME ATTENTION TO THE BACKGROUND and DISTANCE. 
REJECT AND REPLY 'HARAM: <reason>' IF ANY OF THE FOLLOWING ARE VISIBLE IN ANY FRAME, NO MATTER HOW SMALL, FAR AWAY, BLURRY, OR OBSCURED:
1. ANY human beings (men, women, children, crowds, faces, silhouettes, shadows of people, people walking far away in the background). Even a tiny speck that looks like a person is HARAM.
2. ANY animals, birds in the sky, or living creatures.
3. Musical instruments, concerts, statues, crosses, or inappropriate clothing.

REPLY 'HALAL' ONLY IF ALL FRAMES ARE 100% EMPTY NATURE (mountains, oceans, clouds, deserts, etc) OR EMPTY ARCHITECTURE, WITH ABSOLUTELY ZERO ANIMATE BEINGS. Look extremely closely at the background before answering!
Reply with exactly 'HARAM: <reason>' or 'HALAL'.`;

    const answer = await geminiImageAnalysis(images, prompt);

    if (answer.toUpperCase().includes("HARAM")) {
      console.log(`[pexels] Video ${video.id} rejected by Vision AI: ${answer.trim()}`);
      await setCachedHalalStatus(video.id, "HARAM", answer.trim(), {
        url: video.url,
        duration: video.duration,
      });
      return true;
    }

    if (answer.toUpperCase().includes("HALAL")) {
      console.log(`[pexels] Video ${video.id} approved as Halal by Vision AI.`);
      await setCachedHalalStatus(video.id, "HALAL", "Vision AI verified", {
        url: video.url,
        duration: video.duration,
      });
      return false;
    }

    // Unclear response -> fail-closed
    console.warn(
      `[pexels] Ambiguous AI response for video ${video.id}: "${answer}". Rejecting (fail-closed).`,
    );
    return true;
  } catch (err) {
    console.error(`[pexels] Vision AI audit failed for video ${video.id}:`, err);
    return true; // Fail-closed
  }
}

// ============================================================================
// 5. TIER 4 SALAFI GUARDRAIL: Audio Demuxing Flag Contract
// ============================================================================

export const TIER4_FFMPEG_DEMUX_FLAGS = Object.freeze(["-an"] as const);

// ============================================================================
// 6. THEOLOGICAL CONCEPT TAXONOMY & PROGRESSION MAPPING
// ============================================================================

export type SlideProgressionRole = "hook" | "context" | "dalil" | "cta";

export interface TheologicalConcept {
  id: string;
  nameBg: string;
  keywords: string[];
  arabicTerms: string[];
  mood: Mood;
  roleQueries: Record<SlideProgressionRole, string[]>;
}

export const THEOLOGICAL_CONCEPT_MAP: TheologicalConcept[] = [
  {
    id: "jahannam",
    nameBg: "Джехеннем и Предупреждение за Огъня",
    keywords: [
      "джехенем",
      "джехеннем",
      "джаханнам",
      "ад",
      "ада",
      "огън",
      "огъня",
      "пламък",
      "пламъци",
      "жарава",
      "наказание",
      "гибел",
      "съдния ден",
      "саир",
      "джахим",
      "страдание",
    ],
    arabicTerms: ["jahannam", "nar", "adhab", "sa'ir", "jahim", "waqood"],
    mood: "solemn",
    roleQueries: {
      hook: [
        "raging fire flames dark night vertical",
        "intense burning fire flames embers vertical",
      ],
      context: [
        "volcanic lava flowing glowing red night vertical",
        "burning embers rising dark smoke vertical",
      ],
      dalil: [
        "dramatic dark storm clouds lightning fire sky vertical",
        "raging fiery smoke dark apocalyptic sky vertical",
      ],
      cta: [
        "dark storm clouds parting twilight rays vertical",
        "somber sunset dark horizon landscape vertical",
      ],
    },
  },
  {
    id: "sakina",
    nameBg: "Покой на сърцето и спокойствие",
    keywords: [
      "покой",
      "покоят",
      "спокойствие",
      "мир",
      "сакина",
      "сърца",
      "сърцата",
      "душата",
      "утеха",
      "зикр",
      "помнене",
    ],
    arabicTerms: ["sakina", "itmi'nan", "dhikr", "qalb", "salam"],
    mood: "calm",
    roleQueries: {
      hook: [
        "tranquil peaceful lake morning sunrise mist calm water vertical",
        "serene calm mirror lake dawn water reflection vertical",
      ],
      context: [
        "morning mist rising over calm river nature vertical",
        "peaceful gentle morning lake reflections vertical",
      ],
      dalil: [
        "golden sunlight filtering through tranquil forest river vertical",
        "calm glass water reflecting warm sunrise sky vertical",
      ],
      cta: [
        "peaceful sunset calm water gentle ripples nature vertical",
        "golden serene sunset over tranquil lake vertical",
      ],
    },
  },
  {
    id: "dunya",
    nameBg: "Преходността на земния живот",
    keywords: [
      "дуня",
      "земния живот",
      "преходност",
      "смърт",
      "смъртта",
      "край",
      "времето",
      "живота",
      "залез",
      "измама",
    ],
    arabicTerms: ["dunya", "mawt", "ajal", "fana"],
    mood: "reflective",
    roleQueries: {
      hook: [
        "timelapse clouds passing mountains sunset twilight vertical",
        "dramatic sun setting horizon vast desert landscape vertical",
      ],
      context: [
        "wind blowing sand ripples desert sunset vertical",
        "ancient sand dunes golden sunset twilight shadows vertical",
      ],
      dalil: [
        "golden sunset dying light over vast horizon vertical",
        "lonely desert silhouette sunset dramatic sky vertical",
      ],
      cta: [
        "twilight fading into night sky solitary star vertical",
        "peaceful evening horizon calm twilight sky vertical",
      ],
    },
  },
  {
    id: "jannah",
    nameBg: "Рай и вечни градини",
    keywords: [
      "рай",
      "рая",
      "раят",
      "дженет",
      "дженнет",
      "градин",
      "вечност",
      "реки",
      "фирдаус",
      "извор",
      "наим",
    ],
    arabicTerms: ["jannah", "firdaws", "rawdah", "naim"],
    mood: "hopeful",
    roleQueries: {
      hook: [
        "emerald waterfall lush green nature vertical",
        "dense tropical paradise waterfall sunlight vertical",
      ],
      context: [
        "crystal clear river green valley landscape vertical",
        "flowing fresh stream mossy stones forest vertical",
      ],
      dalil: [
        "vibrant blooming garden sunbeams landscape vertical",
        "golden sunrays through lush garden flowers vertical",
      ],
      cta: [
        "peaceful turquoise mountain lake sunset vertical",
        "tranquil paradise lagoon golden hour calm vertical",
      ],
    },
  },
  {
    id: "sabr",
    nameBg: "Търпение и издръжливост",
    keywords: [
      "търпени",
      "сабр",
      "изпитани",
      "трудност",
      "болка",
      "буря",
      "скръб",
      "издръжливост",
      "тежест",
      "мъка",
    ],
    arabicTerms: ["sabr", "musibah", "ibtila", "balwa"],
    mood: "solemn",
    roleQueries: {
      hook: [
        "solitary pine tree mountain storm vertical",
        "dark misty mountain peak fog dramatic vertical",
      ],
      context: [
        "rugged stone cliff waves landscape vertical",
        "rocky coast turbulent sea calm horizon vertical",
      ],
      dalil: [
        "sunbeams breaking through storm clouds vertical",
        "dramatic storm clouds parting golden rays vertical",
      ],
      cta: [
        "calm ocean waves gentle sunrise vertical",
        "peaceful serene sea morning light landscape vertical",
      ],
    },
  },
  {
    id: "tahajjud",
    nameBg: "Нощна молитва и размисъл",
    keywords: [
      "тахаджуд",
      "нощна молитва",
      "среднощ",
      "нощ",
      "тишина",
      "мрак",
      "звезд",
      "луна",
      "фаджр",
      "сахар",
    ],
    arabicTerms: ["tahajjud", "qiyam", "layl", "sahar", "fajr"],
    mood: "reflective",
    roleQueries: {
      hook: [
        "deep starry night sky milky way vertical",
        "desert sand dunes starry night sky vertical",
      ],
      context: [
        "moonlight reflecting calm mountain lake vertical",
        "silent mountain lake moon reflection twilight vertical",
      ],
      dalil: [
        "ancient golden lantern dark night vertical",
        "warm lantern light glowing night atmosphere vertical",
      ],
      cta: [
        "blue hour dawn twilight horizon mountains vertical",
        "peaceful sunrise breaking after dark night vertical",
      ],
    },
  },
  {
    id: "tawbah",
    nameBg: "Покаяние и опрощение",
    keywords: [
      "покаяни",
      "тауба",
      "таууаб",
      "опрощени",
      "грех",
      "грехове",
      "прошка",
      "сълзи",
      "милост",
      "гаффар",
    ],
    arabicTerms: ["tawbah", "tawwab", "istighfar", "ghaffar"],
    mood: "calm",
    roleQueries: {
      hook: [
        "gentle rain falling ripples pond vertical",
        "raindrops rippling calm puddle nature vertical",
      ],
      context: [
        "dark clouds clearing golden sunlight vertical",
        "morning fog lifting revealing sunlit forest vertical",
      ],
      dalil: [
        "morning dew fresh green leaves dawn vertical",
        "pure water droplet rippling clear stream vertical",
      ],
      cta: [
        "calm misty forest sunrise pure light vertical",
        "fresh green valley morning golden glow vertical",
      ],
    },
  },
  {
    id: "masjids",
    nameBg: "Ислямска архитектура и мир",
    keywords: [
      "джами",
      "месджид",
      "минаре",
      "купол",
      "михраб",
      "мрамор",
      "арка",
      "свещен",
      "харам",
    ],
    arabicTerms: ["masjid", "mosque", "minaret", "qubba", "mihrab"],
    mood: "majestic",
    roleQueries: {
      hook: [
        "grand mosque minaret exterior twilight vertical",
        "majestic mosque dome twilight sky vertical",
      ],
      context: [
        "marble arches geometric shadow vertical",
        "ornate marble stone columns sunlight vertical",
      ],
      dalil: [
        "grand mosque dome golden sunset vertical",
        "islamic architecture dome golden hour landscape vertical",
      ],
      cta: [
        "white marble courtyard sunset glow vertical",
        "peaceful architectural arches evening light vertical",
      ],
    },
  },
  {
    id: "qadr",
    nameBg: "Божествено предопределение",
    keywords: [
      "кадр",
      "ал-кадр",
      "предопределени",
      "съдба",
      "божествен указ",
      "начертано",
      "космос",
      "вселен",
    ],
    arabicTerms: ["qadr", "qada", "taqdir", "lawh"],
    mood: "majestic",
    roleQueries: {
      hook: [
        "cosmic starry galaxy nebula space vertical",
        "deep space colorful cosmos stars vertical",
      ],
      context: [
        "towering mountain peaks above clouds vertical",
        "cloud inversion misty mountain peaks vertical",
      ],
      dalil: [
        "vast golden desert sand dunes sunset vertical",
        "rippled golden sand dunes sunset shadows vertical",
      ],
      cta: [
        "timeless mountain landscape morning dawn vertical",
        "eternal majestic canyon sunrise golden horizon vertical",
      ],
    },
  },
  {
    id: "rizq",
    nameBg: "Препитание и благодат",
    keywords: [
      "ризк",
      "препитани",
      "раззак",
      "берекет",
      "изобили",
      "блага",
      "жит",
      "пшениц",
      "реколт",
      "извор",
    ],
    arabicTerms: ["rizq", "razzaq", "barakah", "niamah"],
    mood: "hopeful",
    roleQueries: {
      hook: [
        "golden wheat field dramatic sunrise vertical",
        "golden wheat ears swaying morning breeze vertical",
      ],
      context: [
        "fertile green valley sunbeams mist vertical",
        "lush green agricultural terrace hills mist vertical",
      ],
      dalil: [
        "flowing fresh natural spring stream vertical",
        "crystal mountain river waterfall pure water vertical",
      ],
      cta: [
        "bountiful sunlit orchard green hills vertical",
        "warm sunset over peaceful fertile countryside vertical",
      ],
    },
  },
  {
    id: "tawakkul",
    nameBg: "Упование на Аллах",
    keywords: ["уповани", "тауаккул", "довери", "опора", "защита", "сигурност"],
    arabicTerms: ["tawakkul", "wakil", "hasbi"],
    mood: "calm",
    roleQueries: {
      hook: [
        "rugged mountain trail summit sunrise vertical",
        "steep mountain path golden sunrise vertical",
      ],
      context: [
        "vast canyon golden morning light vertical",
        "expansive grand canyon morning mist vertical",
      ],
      dalil: [
        "massive rock cliff unshakable calm sea vertical",
        "solid sea cliff enduring ocean waves vertical",
      ],
      cta: [
        "serene mountain valley golden horizon vertical",
        "peaceful panoramic mountain meadow calm sunset vertical",
      ],
    },
  },
  {
    id: "ikhlas",
    nameBg: "Искреност и чистота",
    keywords: ["ихляс", "искреност", "намерени", "чисто", "показуха", "рия"],
    arabicTerms: ["ikhlas", "mukhlis", "niyyah"],
    mood: "reflective",
    roleQueries: {
      hook: [
        "single crystal lantern night nature vertical",
        "solitary warm lantern glow dark night vertical",
      ],
      context: [
        "pure mountain spring water ripples vertical",
        "crystal clear river stones ripples nature vertical",
      ],
      dalil: [
        "white sunbeam shining through deep forest vertical",
        "radiant light ray piercing pine canopy vertical",
      ],
      cta: [
        "still mirror lake tranquil dawn vertical",
        "calm glass water reflection sunrise peaceful vertical",
      ],
    },
  },
  {
    id: "shukr",
    nameBg: "Благодарност за благата",
    keywords: ["шукр", "благодарност", "признателност", "умножаване", "дарове"],
    arabicTerms: ["shukr", "shakir", "hamd"],
    mood: "hopeful",
    roleQueries: {
      hook: [
        "radiant golden sunrise open field vertical",
        "vibrant golden hour sunrise meadows vertical",
      ],
      context: [
        "green lush meadows morning mist vertical",
        "dewy green grass hills sunbeams vertical",
      ],
      dalil: [
        "golden sun gentle waterfall rainbow vertical",
        "sunlight reflecting waterfall rainbow mist vertical",
      ],
      cta: [
        "warm sunset over calm ocean horizon vertical",
        "golden peaceful horizon evening calm sea vertical",
      ],
    },
  },
  {
    id: "dua",
    nameBg: "Зов и упование в молба",
    keywords: ["дуа", "молба", "зов", "отклик", "молитва", "близост"],
    arabicTerms: ["dua", "munajah", "qarib", "mujib"],
    mood: "reflective",
    roleQueries: {
      hook: [
        "solitary mountain peak sunset vast sky vertical",
        "high mountain summit sunset vista vertical",
      ],
      context: [
        "desert sand ripples golden hour sunset vertical",
        "vast golden sand dunes twilight horizon vertical",
      ],
      dalil: [
        "dramatic clouds parting golden sunbeams vertical",
        "celestial sunlight breaking stormy sky vertical",
      ],
      cta: [
        "tranquil mountain lake sunset twilight vertical",
        "calm alpine lake pink twilight reflections vertical",
      ],
    },
  },
  {
    id: "noor",
    nameBg: "Божествена светлина и напътствие",
    keywords: [
      "светлин",
      "слънц",
      "изгрев",
      "лъч",
      "зора",
      "утро",
      "напътстви",
      "истин",
      "нур",
      "озарява",
    ],
    arabicTerms: ["noor", "nur", "hidayah", "haqq", "shams"],
    mood: "hopeful",
    roleQueries: {
      hook: [
        "mountain sunrise golden dawn light nature vertical",
        "radiant golden sunrise open field nature vertical",
      ],
      context: [
        "golden sunbeams breaking through forest trees vertical",
        "warm morning sunrays misty valley landscape vertical",
      ],
      dalil: [
        "celestial golden light rays breaking through clouds vertical",
        "bright sunrise over mountain peaks clouds vertical",
      ],
      cta: [
        "warm golden hour sunlight calm meadow nature vertical",
        "peaceful sunrise horizon golden sky vertical",
      ],
    },
  },
  {
    id: "bahr",
    nameBg: "Безбрежно море и Божието величие",
    keywords: [
      "море",
      "морет",
      "океан",
      "вълн",
      "дълбин",
      "бряг",
      "кораб",
      "водата",
      "водите",
    ],
    arabicTerms: ["bahr", "yam", "mawj"],
    mood: "majestic",
    roleQueries: {
      hook: [
        "calm turquoise ocean sunset waves nature vertical",
        "deep blue ocean waves horizon landscape vertical",
      ],
      context: [
        "gentle ocean waves rolling sandy shore sunset vertical",
        "crystal turquoise sea waves aerial nature vertical",
      ],
      dalil: [
        "majestic ocean horizon golden sunbeams clouds vertical",
        "vast blue sea sunlight reflection nature vertical",
      ],
      cta: [
        "peaceful serene sea morning light landscape vertical",
        "calm ocean sunset golden ripples vertical",
      ],
    },
  },
];

export const DEFAULT_ROLE_QUERIES: Record<SlideProgressionRole, string[]> = {
  hook: [
    "dark moody cinematic landscape mist mountains vertical",
    "dramatic clouds mountain ridge twilight vertical",
  ],
  context: [
    "majestic misty valley morning sunrise light landscape vertical",
    "morning light green valley mist vertical",
  ],
  dalil: [
    "golden divine sunbeams breaking through clouds nature vertical",
    "sunlight rays through majestic mountains vertical",
  ],
  cta: [
    "peaceful warm sunset golden hour calm lake nature vertical",
    "serene calm ocean golden hour horizon vertical",
  ],
};

export function detectSlideRole(
  slideIndex: number,
  text: string,
  topTitle = "",
): SlideProgressionRole {
  const combined = `${topTitle} ${text}`.toLowerCase();
  if (
    slideIndex === 0 ||
    /\[(тайната|парадокс|кука|хук|скритият)\]|плъзнете наляво/i.test(combined)
  ) {
    return "hook";
  }
  if (slideIndex === 1 || /божественият закон|скритата мъдрост|обяснение|тяло 1/i.test(combined)) {
    return "context";
  }
  if (slideIndex === 2 || /сура|хадис|далил|каза пратеникът|„.*“/i.test(combined)) {
    return "dalil";
  }
  if (slideIndex === 3 || /действие|дуа|запази|сподели|план за действие/i.test(combined)) {
    return "cta";
  }
  const roles: SlideProgressionRole[] = ["hook", "context", "dalil", "cta"];
  return roles[slideIndex % 4];
}

const GENERIC_HEART_SOUL_STEMS = new Set(["сърца", "сърцата", "душата", "сърце", "душа"]);

export function matchTheologicalConcept(text: string): TheologicalConcept | null {
  if (!text) return null;
  const norm = text.toLowerCase();
  let bestConcept: TheologicalConcept | null = null;
  let bestScore = 0;

  for (const concept of THEOLOGICAL_CONCEPT_MAP) {
    let score = 0;
    for (const kw of concept.keywords) {
      if (norm.includes(kw)) {
        // Give concrete physical/theological imagery higher weight than generic "сърце/душа"
        if (concept.id === "sakina" && GENERIC_HEART_SOUL_STEMS.has(kw)) {
          score += 3;
        } else if (
          concept.id === "jahannam" ||
          concept.id === "jannah" ||
          concept.id === "tawbah" ||
          concept.id === "bahr" ||
          concept.id === "tahajjud" ||
          concept.id === "sabr" ||
          concept.id === "noor"
        ) {
          score += 12;
        } else {
          score += 9;
        }
      }
    }
    for (const ar of concept.arabicTerms) {
      if (norm.includes(ar)) {
        score += 12;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestConcept = concept;
    }
  }
  return bestConcept;
}

/**
 * Segments a spoken Bulgarian script into timed semantic B-Roll scenes.
 * Instead of switching every 3 seconds blindly, each scene corresponds to the actual
 * spoken sentence/clause and its theological/visual concept (e.g. Fire -> Rain -> Paradise -> Peace).
 */
export function segmentScriptIntoSemanticScenes(
  text: string,
  wordTimings?: Array<{ word?: string; start: number; end: number }>,
  totalDuration?: number,
): Array<{
  text: string;
  start: number;
  end: number;
  duration: number;
  conceptId: string;
  themeBg: string;
  query: string;
  fallbackUrl: string;
}> {
  const cleanText = (text || "")
    .replace(/<break[^>]*\/>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const rawWords = cleanText ? cleanText.split(/\s+/).filter(Boolean) : [];
  const validTimings = Array.isArray(wordTimings)
    ? wordTimings.filter((t) => Number.isFinite(Number(t?.start)) && Number.isFinite(Number(t?.end)))
    : [];

  const maxTimingEnd =
    validTimings.length > 0
      ? Math.max(...validTimings.map((t) => Number(t.end) || 0))
      : 0;

  const estDur =
    totalDuration && totalDuration > 0
      ? totalDuration
      : maxTimingEnd > 0
        ? Number((maxTimingEnd + 0.15).toFixed(2))
        : Math.max(10, rawWords.length / 2.4);

  if (rawWords.length === 0) {
    const fb = getHalalVideoByConceptId("sakina", 0);
    return [
      {
        text: "",
        start: 0,
        end: estDur,
        duration: estDur,
        conceptId: "sakina",
        themeBg: fb.themeBg,
        query: "tranquil peaceful lake morning sunrise mist calm water vertical",
        fallbackUrl: fb.url,
      },
    ];
  }

  // Align word timings 1-to-1 with rawWords
  const alignedWords: Array<{ word: string; start: number; end: number }> = [];
  if (validTimings.length === rawWords.length) {
    for (let i = 0; i < rawWords.length; i++) {
      alignedWords.push({
        word: rawWords[i],
        start: Number(validTimings[i].start),
        end: Number(validTimings[i].end),
      });
    }
  } else if (validTimings.length > 0 && validTimings[0].word) {
    for (const t of validTimings) {
      alignedWords.push({
        word: String(t.word || ""),
        start: Number(t.start),
        end: Number(t.end),
      });
    }
  } else {
    const costs = rawWords.map((w) => {
      let c = 1 + w.replace(/[^\p{L}\p{N}]/gu, "").length * 0.55;
      if (/[.!?…]$/.test(w)) c += 3.0;
      else if (/[,;:—]$/.test(w)) c += 1.5;
      return c;
    });
    const totalCost = costs.reduce((a, b) => a + b, 0) || 1;
    let cum = 0;
    for (let i = 0; i < rawWords.length; i++) {
      const s = (cum / totalCost) * estDur;
      cum += costs[i];
      const e = (cum / totalCost) * estDur;
      alignedWords.push({ word: rawWords[i], start: s, end: e });
    }
  }

  // Group into sentence/clause units
  interface RawClause {
    words: string[];
    start: number;
    end: number;
    concept: TheologicalConcept | null;
  }

  const clauses: RawClause[] = [];
  let curWords: string[] = [];
  let curStart = alignedWords[0]?.start ?? 0;

  for (let i = 0; i < alignedWords.length; i++) {
    const item = alignedWords[i];
    if (curWords.length === 0) {
      curStart = item.start;
    }
    curWords.push(item.word);

    const endsSentence = /[.!?…]$/.test(item.word);
    const endsMajorClause = /[;:—]$/.test(item.word) && curWords.length >= 5;
    const endsCommaClause = /,$/.test(item.word) && curWords.length >= 8;
    const isLast = i === alignedWords.length - 1;

    // Also check if the upcoming words trigger a distinct concrete concept after a comma
    let nextTriggersNewConcept = false;
    if (/[,;:—]$/.test(item.word) && curWords.length >= 3 && i + 1 < alignedWords.length) {
      const curConcept = matchTheologicalConcept(curWords.join(" "));
      const lookaheadWords = alignedWords
        .slice(i + 1, Math.min(alignedWords.length, i + 8))
        .map((x) => x.word)
        .join(" ");
      const nextConcept = matchTheologicalConcept(lookaheadWords);
      if (nextConcept && (!curConcept || nextConcept.id !== curConcept.id)) {
        nextTriggersNewConcept = true;
      }
    }

    if (endsSentence || endsMajorClause || endsCommaClause || nextTriggersNewConcept || isLast) {
      const clauseText = curWords.join(" ");
      clauses.push({
        words: [...curWords],
        start: curStart,
        end: item.end,
        concept: matchTheologicalConcept(clauseText),
      });
      curWords = [];
    }
  }

  // Merge tiny fragments (<3.2s) into natural, dynamic visual scenes:
  // - Reels/TikTok short-form standard: Visual transition every 3.5 to 5.5 seconds.
  // - Prevents static single-background loops where the video shows the same background almost the entire time.
  const mergedScenes: RawClause[] = [];
  for (const cl of clauses) {
    if (mergedScenes.length === 0) {
      mergedScenes.push({ ...cl });
      continue;
    }
    const prev = mergedScenes[mergedScenes.length - 1];
    const prevDur = prev.end - prev.start;
    const combinedDur = cl.end - prev.start;

    const prevId = prev.concept?.id || null;
    const curId = cl.concept?.id || null;

    const hasDifferentExplicitConcept = prevId && curId && prevId !== curId;
    const newExplicitConceptAfterGeneric = !prevId && curId && prevDur >= 2.0;

    // Never merge across distinct explicit theological concepts (e.g. Fire -> Rain -> Paradise)!
    if (hasDifferentExplicitConcept || newExplicitConceptAfterGeneric) {
      mergedScenes.push({ ...cl });
    } else if (prevDur < 3.2 || combinedDur <= 5.5) {
      prev.words.push(...cl.words);
      prev.end = cl.end;
      if (!prev.concept && cl.concept) {
        prev.concept = cl.concept;
      }
    } else {
      mergedScenes.push({ ...cl });
    }
  }

  // If any single scene is still too long (> 6.5s), subdivide it into balanced sub-scenes
  // so the video maintains engaging visual cuts instead of a static background.
  const balancedScenes: RawClause[] = [];
  for (const sc of mergedScenes) {
    const scDur = sc.end - sc.start;
    if (scDur > 6.5 && sc.words.length >= 8) {
      const partsCount = Math.min(3, Math.ceil(scDur / 5.0));
      const wordsPerPart = Math.ceil(sc.words.length / partsCount);
      const timePerPart = scDur / partsCount;
      for (let p = 0; p < partsCount; p++) {
        const pStart = sc.start + p * timePerPart;
        const pEnd = p === partsCount - 1 ? sc.end : sc.start + (p + 1) * timePerPart;
        const pWords = sc.words.slice(p * wordsPerPart, (p + 1) * wordsPerPart);
        balancedScenes.push({
          words: pWords.length > 0 ? pWords : sc.words,
          start: Number(pStart.toFixed(2)),
          end: Number(pEnd.toFixed(2)),
          concept: sc.concept,
        });
      }
    } else {
      balancedScenes.push(sc);
    }
  }

  // Strictly avoid creating long static scenes: allow dynamic cuts every 3.5 - 5.5s
  const MAX_ALLOWED_SCENES = Math.max(5, Math.min(10, Math.ceil(estDur / 3.5)));
  while (balancedScenes.length > MAX_ALLOWED_SCENES) {
    let mergeIdx = -1;
    let minCombined = Infinity;
    for (let i = 0; i < balancedScenes.length - 1; i++) {
      const a = balancedScenes[i];
      const b = balancedScenes[i + 1];
      const isConflicting = a.concept?.id && b.concept?.id && a.concept.id !== b.concept.id;
      const combined = (b.end - a.start);
      // Strictly prevent creating scenes longer than 6.0s
      if (!isConflicting && combined <= 6.0 && combined < minCombined) {
        minCombined = combined;
        mergeIdx = i;
      }
    }
    if (mergeIdx === -1) break;
    balancedScenes[mergeIdx].words.push(...balancedScenes[mergeIdx + 1].words);
    balancedScenes[mergeIdx].end = balancedScenes[mergeIdx + 1].end;
    if (!balancedScenes[mergeIdx].concept && balancedScenes[mergeIdx + 1].concept) {
      balancedScenes[mergeIdx].concept = balancedScenes[mergeIdx + 1].concept;
    }
    balancedScenes.splice(mergeIdx + 1, 1);
  }

  // Build final contiguous timed segments covering [0, estDur]
  const roles: SlideProgressionRole[] = ["hook", "context", "dalil", "cta"];
  const FallbackOrder = ["noor", "sakina", "dunya", "jannah", "tahajjud", "rizq"];
  const usedQueries = new Set<string>();

  return balancedScenes.map((scene, idx) => {
    const isFirst = idx === 0;
    const isLast = idx === balancedScenes.length - 1;
    const start = isFirst ? 0 : Number(balancedScenes[idx].start.toFixed(2));
    const rawEnd = isLast
      ? estDur
      : Number(balancedScenes[idx + 1].start.toFixed(2));
    const end = Math.max(Number((start + 0.5).toFixed(2)), rawEnd);
    const duration = Number((end - start).toFixed(2));

    const role = roles[idx % roles.length];
    const concept =
      scene.concept ||
      THEOLOGICAL_CONCEPT_MAP.find(
        (c) => c.id === FallbackOrder[idx % FallbackOrder.length],
      ) ||
      THEOLOGICAL_CONCEPT_MAP[0];

    const roleCandidates = concept.roleQueries[role] || DEFAULT_ROLE_QUERIES[role];
    let chosenQuery = roleCandidates[0] || DEFAULT_ROLE_QUERIES[role][0];
    for (const q of roleCandidates) {
      if (!usedQueries.has(q)) {
        chosenQuery = q;
        break;
      }
    }
    usedQueries.add(chosenQuery);

    const fallbackAsset = getHalalVideoByConceptId(concept.id, idx);

    return {
      text: scene.words.join(" "),
      start,
      end,
      duration,
      conceptId: concept.id,
      themeBg: concept.nameBg,
      query: sanitizeSearchQuery(chosenQuery),
      fallbackUrl: fallbackAsset.url,
    };
  });
}

// ============================================================================
// 7. VISUAL THEME ANALYZER (Fallback & Auxiliary)
// ============================================================================

export async function analyzeVisualThemes(text: string, avoid: string[] = []): Promise<Analysis> {
  const key = cacheKey(text, avoid);
  const hit = _cache.get(key);
  if (hit) return hit;

  const fallback: Analysis = {
    theme: "природа и светлина",
    mood: "calm",
    queries: [
      "vibrant golden sunset nature vertical",
      "colorful clouds sunlight blue sky vertical",
      "emerald green valley morning sun vertical",
    ],
  };

  const avoidLine = avoid.length
    ? `Избягвай теми/думи, които вече пробвахме: ${avoid.join(", ")}.`
    : "";

  try {
    const raw = await geminiChat(
      "gemini-3.1-pro",
      [
        {
          role: "system",
          content:
            "Анализираш ислямски текст (аят или хадис) и връщаш JSON със стоково-видео подсказки за вертикален TikTok фон.\n" +
            "Изисквания: БЕЗ хора/лица, БЕЗ животни, БЕЗ религиозни символи (джамии, Корани, тасбих, флагове), БЕЗ текст в кадъра. СТРИКТНИ SALAFI HALAL ПРИНЦИПИ: Забранени са всякакви човешки същества (мъже, жени, деца, бебета), части от тялото (ръце, крака, лица) или животни. Също така СА ЗАБРАНЕНИ: музикални инструменти (пиано, китара), книги (books), закрити помещения (indoor, room), мебели (table).\n" +
            'ВАЖНО ЗА ЦВЕТОВЕТЕ: НИКОГА не предлагай черно-бели, тъмни или мрачни (black and white / monochrome / grayscale / dark / gloomy / shadow / silhouette / storm / fog) видеа! Всички заявки ТРЯБВА да търсят ВАЙБРАНТНИ, СВЕТЛИ и ЦВЕТНИ кадри (напр. "vibrant sunset", "golden hour nature", "colorful sky", "emerald green valley", "turquoise water", "warm sunlight").\n' +
            "Предпочитай красива цветна природа (вода, слънчева светлина, планини, зелени гори, небе, изгрев/залез), архитектурни детайли, златен час, океан.\n" +
            "Извличаш СМИСЪЛА — ако текстът говори за търпение → тиха вода на слънце; за милост → дъжд над зелена долина със слънчева светлина; за светлина/напътствие → топъл изгрев, фенер, звезди; за съдния ден → бурен океан със залез; за знание → отворена книга на топла светлина; за рай → водопад, цветя, слънчева градина; за смърт/отвъдното → спокоен златен залез.\n" +
            'МНОГО ВАЖНО: ВСЯКА една заявка в масива "queries" задължително трябва да завършва с "no people empty" за да филтрираме резултатите в Pexels.\n' +
            'Върни СТРИКТЕН JSON: {"theme": string (на български, 2-4 думи), "mood": "calm"|"majestic"|"reflective"|"hopeful"|"solemn", "queries": string[3..5] (английски Pexels заявки, завършващи с " no people empty")}.\n' +
            (avoidLine ? avoidLine + "\n" : ""),
        },
        { role: "user", content: text.slice(0, 1200) },
      ],
      true,
    );

    const parsed = JSON.parse(raw) as Partial<Analysis>;
    const queries = Array.isArray(parsed.queries)
      ? parsed.queries
          .map((q) => sanitizeSearchQuery(String(q)))
          .filter(Boolean)
          .slice(0, 5)
      : [];
    if (!queries.length) throw new Error("no queries");
    const out: Analysis = {
      theme: String(parsed.theme || "природа").slice(0, 80),
      mood: (["calm", "majestic", "reflective", "hopeful", "solemn"] as const).includes(
        parsed.mood as Mood,
      )
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

// ============================================================================
// 8. PEXELS API CLIENT & SCORING
// ============================================================================

export async function pexelsPhotoQuery(key: string, query: string, perPage = 25, page = 1) {
  const safeQuery = sanitizeSearchQuery(query);
  const pageParam = Math.max(1, Number(page) || 1);
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(safeQuery)}&orientation=portrait&size=large&per_page=${perPage}&page=${pageParam}`;
  const res = await fetch(url, { headers: { Authorization: key } });
  if (!res.ok) throw new Error(`Pexels грешка ${res.status}`);
  const j = await res.json();
  return (j.photos ?? []) as PexelsPhoto[];
}

export async function pexelsVideoQuery(key: string, query: string, perPage = 80) {
  const safeQuery = sanitizeSearchQuery(query);
  const url = `https://api.pexels.com/videos/search?query=${encodeURIComponent(safeQuery)}&orientation=portrait&per_page=${perPage}`;
  const res = await fetch(url, { headers: { Authorization: key } });
  if (!res.ok) throw new Error(`Pexels грешка ${res.status}`);
  const j = await res.json();
  return (j.videos ?? []) as PexelsVideo[];
}

export function scoreVideo(v: PexelsVideo, file: PexelsVideoFile, targetMin = 30): number {
  let s = 0;
  // Tier 2: Hard blacklist check
  if (isMetadataHaram(v)) {
    return -9999;
  }

  const meta = JSON.stringify(v).toLowerCase();
  if (
    meta.includes("black and white") ||
    meta.includes("monochrome") ||
    meta.includes("grayscale") ||
    meta.includes("greyscale") ||
    meta.includes("silhouette") ||
    meta.includes("dark sky")
  ) {
    s -= 40;
  }
  const aspect = file.width > 0 ? file.height / file.width : 0;
  s += Math.max(0, 10 - Math.abs(aspect - 16 / 9) * 8);
  if (file.height >= 1920 && file.width >= 1080) {
    s += 25; // Strongly reward true Full HD 1080p+ vertical streams
  } else if (file.height >= 1280) {
    s -= 10; // Penalize 720p streams when 1080p streams exist
  } else {
    s -= 35; // Heavily penalize SD (<720p) streams
  }
  if (file.height >= 3840) s += 10;
  if ((file.fps ?? 0) >= 30) s += 5;
  if ((file.fps ?? 0) >= 60) s += 4;

  const d = v.duration ?? 10;
  if (d >= targetMin) s += 20;
  else if (d >= 15) s += 5;

  if (
    meta.includes("4k") ||
    meta.includes("cinematic") ||
    meta.includes("drone") ||
    meta.includes("nature") ||
    meta.includes("sunset") ||
    meta.includes("waterfall") ||
    meta.includes("stars")
  ) {
    s += 8;
  }
  return s;
}

export function pickBestFile(v: PexelsVideo): PexelsVideoFile | undefined {
  const allMp4s = (v.video_files || []).filter((f) => f.file_type === "video/mp4");
  const cleanMp4s = allMp4s.filter((f) => !String(f.link || "").includes("images.pexels.com/videos/"));
  const mp4s = cleanMp4s.length > 0 ? cleanMp4s : allMp4s;
  if (!mp4s.length) return (v.video_files || [])[0];
  mp4s.sort((a, b) => {
    // 1. Vertical orientation first (height >= width)
    const aVert = a.height >= a.width ? 1 : 0;
    const bVert = b.height >= b.width ? 1 : 0;
    if (aVert !== bVert) return bVert - aVert;

    // 2. Strictly prefer True Full HD+ (height >= 1920 && width >= 1080) over 720p/540p/SD!
    // Never pick a 720p (1280) file when a 1080p (1920), 2K (2560), or 4K (3840) file exists!
    const aIsFullHdPlus = a.height >= 1920 && a.width >= 1080 ? 1 : 0;
    const bIsFullHdPlus = b.height >= 1920 && b.width >= 1080 ? 1 : 0;
    if (aIsFullHdPlus !== bIsFullHdPlus) return bIsFullHdPlus - aIsFullHdPlus;

    // 3. Among Full HD+ files: prefer native 1080x1920 or clean 2K/4K master, then higher FPS and bitrate
    if (aIsFullHdPlus && bIsFullHdPlus) {
      const aDiff = Math.abs(a.height - 1920);
      const bDiff = Math.abs(b.height - 1920);
      if (aDiff !== bDiff) return aDiff - bDiff;
      const aFps = Math.min(60, a.fps || 30);
      const bFps = Math.min(60, b.fps || 30);
      if (aFps !== bFps) return bFps - aFps;
      return (b.size || 0) - (a.size || 0);
    }

    // 4. Fallback if only sub-1080p files exist: pick the highest available resolution
    if (a.height !== b.height) return b.height - a.height;
    return (b.width || 0) - (a.width || 0);
  });
  return mp4s[0];
}

export function buildOut(vs: PexelsVideo[], targetMin = 30): Out[] {
  // Tier 2 filter: remove any haram metadata immediately
  const halalOnly = vs.filter((v) => !isMetadataHaram(v));

  const all = halalOnly
    .map((v) => {
      const file = pickBestFile(v);
      if (!file?.link) return null;
      const score = scoreVideo(v, file, targetMin);
      if (score < -500) return null; // Reject hard-penalized
      return {
        id: v.id,
        link: file.link,
        poster: v.video_pictures?.[0]?.picture ?? "",
        photographer: v.user?.name ?? "",
        duration: v.duration ?? 0,
        score,
      };
    })
    .filter((x): x is Out => !!x);

  const matchingDuration = all.filter((x) => x.duration >= targetMin);
  if (targetMin >= 60 && matchingDuration.length === 0) {
    return [];
  }

  const pool = matchingDuration.length > 0 ? matchingDuration : all;
  pool.sort((a, b) => b.score - a.score);
  return pool;
}

export async function getHalalVideos(
  vs: PexelsVideo[],
  targetMin: number,
  neededCount = 3,
): Promise<Out[]> {
  const built = buildOut(vs, targetMin);
  const candidates = built.slice(0, Math.max(neededCount * 3, 8));

  const safeVideos: Out[] = [];
  for (const outVid of candidates) {
    if (safeVideos.length >= neededCount) break;
    const originalPexelsVideo = vs.find((v) => v.id === outVid.id);
    if (!originalPexelsVideo) continue;
    const isHaram = await checkVideoForHaram(originalPexelsVideo);
    if (!isHaram) {
      safeVideos.push(outVid);
    }
  }

  return safeVideos;
}

// ============================================================================
// 9. PUBLIC SEARCH & SERVER FUNCTIONS
// ============================================================================

export const searchPexelsPhotos = createServerFn({ method: "POST" })
  .inputValidator((input: { text: string; query?: string; avoid?: string[] }) => input)
  .handler(async ({ data }) => {
    const key = process.env.PEXELS_API_KEY;
    if (!key) throw new Error("Pexels не е конфигуриран");

    if (data.query?.trim()) {
      const safeQ = sanitizeSearchQuery(data.query.trim());
      const photos = await pexelsPhotoQuery(key, safeQ);
      return {
        query: safeQ,
        theme: "",
        mood: "calm" as Mood,
        queriesTried: [safeQ],
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
      const safeQ = sanitizeSearchQuery(q);
      tried.push(safeQ);
      photos = await pexelsPhotoQuery(key, safeQ);
      if (photos.length >= 3) {
        chosenQuery = safeQ;
        break;
      }
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

export async function searchPexelsVideosDirect(data: {
  text: string;
  query?: string;
  avoid?: string[];
  minDuration?: number;
}) {
  const key = process.env.PEXELS_API_KEY;
  if (!key) throw new Error("Pexels не е конфигуриран");
  const targetMin = data.minDuration ?? 30;

  if (data.query?.trim()) {
    const safeQ = sanitizeSearchQuery(data.query.trim());
    const vs = await pexelsVideoQuery(key, safeQ);
    const safeBuilt = await getHalalVideos(vs, targetMin, 4);
    return {
      query: safeQ,
      theme: "",
      mood: "calm" as Mood,
      queriesTried: [safeQ],
      videos: safeBuilt,
    };
  }

  const analysis = await analyzeVisualThemes(data.text, data.avoid);
  const tried: string[] = [];
  let chosenQuery = analysis.queries[0];
  let videos: Out[] = [];
  for (const q of analysis.queries) {
    const safeQ = sanitizeSearchQuery(q);
    tried.push(safeQ);
    const vs = await pexelsVideoQuery(key, safeQ);
    const safeBuilt = await getHalalVideos(vs, targetMin, 3);
    if (safeBuilt.length >= 3) {
      chosenQuery = safeQ;
      videos = safeBuilt;
      break;
    }
    if (safeBuilt.length > videos.length) {
      videos = safeBuilt;
      chosenQuery = safeQ;
    }
  }

  return {
    query: chosenQuery,
    theme: analysis.theme,
    mood: analysis.mood,
    videos,
  };
}

export const searchPexelsVideos = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { text: string; query?: string; avoid?: string[]; minDuration?: number }) => input,
  )
  .handler(async ({ data }) => {
    return await searchPexelsVideosDirect(data);
  });

export async function fetchMultiSceneBRollDirect(data: {
  query?: string;
  text?: string;
  wordTimings?: Array<{ word?: string; start: number; end: number }>;
  audioDuration?: number;
}): Promise<{
  clips: string[];
  theme: string;
  segments: SemanticBRollSegment[];
}> {
  const key = process.env.PEXELS_API_KEY || "";
  const rawScenes = segmentScriptIntoSemanticScenes(
    data?.text || data?.query || "",
    data?.wordTimings,
    data?.audioDuration,
  );

  // Ensure dynamic multi-scene pacing: at least 3 scenes if duration >= 10s
  let scenes = rawScenes;
  if (scenes.length < 3 && scenes.length > 0) {
    const totalD = scenes.reduce((sum, s) => sum + s.duration, 0);
    if (totalD >= 9.0) {
      // Split the longest scene into 2 or 3 sub-scenes
      const newScenes: typeof rawScenes = [];
      for (const sc of scenes) {
        if (sc.duration >= 7.0 && newScenes.length < 5) {
          const half = Number((sc.duration / 2).toFixed(2));
          newScenes.push(
            { ...sc, end: sc.start + half, duration: half },
            { ...sc, start: sc.start + half, duration: Number((sc.duration - half).toFixed(2)) }
          );
        } else {
          newScenes.push(sc);
        }
      }
      if (newScenes.length > scenes.length) {
        scenes = newScenes;
      }
    }
  }

  const segments: SemanticBRollSegment[] = [];
  const clips: string[] = [];
  const usedUrls = new Set<string>();

  for (let i = 0; i < scenes.length; i++) {
    const sc = scenes[i];
    const safeQuery = sanitizeSearchQuery(sc.query);
    let chosenUrl = "";

    if (key) {
      try {
        const vs = await pexelsVideoQuery(key, safeQuery, 15);
        const halalVideos = await getHalalVideos(vs, 5, 3);
        const bestClip = halalVideos.find((b) => !usedUrls.has(b.link));
        if (bestClip?.link) {
          chosenUrl = bestClip.link;
        }
      } catch (err) {
        console.warn(`[pexels] Error fetching semantic B-roll for "${safeQuery}":`, err);
      }
    }

    if (!chosenUrl || usedUrls.has(chosenUrl)) {
      // Concept-specific Halal fallback
      const conceptAsset = getHalalVideoByConceptId(sc.conceptId, i);
      if (!usedUrls.has(conceptAsset.url)) {
        chosenUrl = conceptAsset.url;
      } else {
        // Pick any unused clip from curated pool to guarantee visual variety across every scene!
        const unusedAsset = LOCAL_HALAL_VIDEO_POOL.find((a) => !usedUrls.has(a.url));
        if (unusedAsset) {
          chosenUrl = unusedAsset.url;
        } else {
          const altAsset = getLocalHalalVideoFallback(i);
          chosenUrl = altAsset.url;
        }
      }
    }

    usedUrls.add(chosenUrl);
    clips.push(chosenUrl);
    segments.push({
      url: chosenUrl,
      start: sc.start,
      end: sc.end,
      duration: sc.duration,
      theme: sc.themeBg,
      conceptId: sc.conceptId,
      query: safeQuery,
      textSnippet: sc.text.slice(0, 120),
    });
  }

  const summaryThemes = Array.from(new Set(segments.map((s) => s.theme))).join(" • ");

  return {
    clips,
    theme: summaryThemes || data?.query || "Контекстни сцени според текста",
    segments,
  };
}

export const fetchMultiSceneBRoll = createServerFn({ method: "POST" })
  .validator(
    (input: {
      query?: string;
      text?: string;
      wordTimings?: Array<{ word?: string; start: number; end: number }>;
      audioDuration?: number;
    }) => input,
  )
  .handler(
    async ({
      data,
    }): Promise<{
      clips: string[];
      theme: string;
      segments: SemanticBRollSegment[];
    }> => {
      return fetchMultiSceneBRollDirect(data || {});
    },
  );

// ============================================================================
// 10. CORE ENGINE: fetchCarouselSlideVideos (PROJECT.md Interface Contract)
// ============================================================================

export async function fetchCarouselSlideVideos(
  slides: CarouselSlideInput[],
): Promise<SlideVideoResult[]> {
  const pexelsKey = process.env.PEXELS_API_KEY?.trim() || "";
  const results: SlideVideoResult[] = [];
  const usedVideoUrls = new Set<string>();

  if (!Array.isArray(slides) || slides.length === 0) {
    return [];
  }

  // Safe helper to pick and deduplicate assets from LOCAL_HALAL_VIDEO_POOL
  const pickFromLocalPool = (slideIdx: number, theme: string, conceptId?: string): SlideVideoResult => {
    const safeIdx = Math.floor(Math.abs(Number(slideIdx) || 0)) % LOCAL_HALAL_VIDEO_POOL.length;
    let asset = conceptId ? getHalalVideoByConceptId(conceptId, safeIdx) : LOCAL_HALAL_VIDEO_POOL[safeIdx];
    let fallbackUrl = asset.url;

    if (usedVideoUrls.has(fallbackUrl)) {
      for (let alt = 0; alt < LOCAL_HALAL_VIDEO_POOL.length; alt++) {
        const candidate =
          LOCAL_HALAL_VIDEO_POOL[(safeIdx + alt) % LOCAL_HALAL_VIDEO_POOL.length];
        if (!usedVideoUrls.has(candidate.url)) {
          asset = candidate;
          fallbackUrl = candidate.url;
          break;
        }
      }
    }
    usedVideoUrls.add(fallbackUrl);

    return {
      slideIndex: slideIdx,
      videoUrl: fallbackUrl,
      source: "local_fallback",
      duration: asset.duration,
      width: asset.width,
      height: asset.height,
      theme: theme || asset.themeBg || "Ислямска природа",
    };
  };

  // Helper to safely truncate incoming string inputs (max 500 chars)
  const truncateField = (val: unknown): string =>
    typeof val === "string" ? val.slice(0, 500) : "";

  // --------------------------------------------------------------------------
  // FAST-PATH: Missing / Empty PEXELS_API_KEY
  // Immediately return from LOCAL_HALAL_VIDEO_POOL without wasting slow Gemini API calls
  // --------------------------------------------------------------------------
  if (!pexelsKey) {
    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i] || ({} as CarouselSlideInput);
      const textTrunc = truncateField(slide.text);
      const titleTrunc = truncateField(slide.topTitle);
      const fullText = [
        titleTrunc,
        textTrunc,
        truncateField(slide.mainText),
        truncateField(slide.quoteText),
        truncateField(slide.commentaryText),
        truncateField(slide.bottomText),
        truncateField(slide.imagePrompt),
      ]
        .filter(Boolean)
        .join(" ")
        .slice(0, 500);

      let chosenTheme = "Ислямска природа";
      const matchedConcept = matchTheologicalConcept(fullText);
      if (matchedConcept) {
        chosenTheme = matchedConcept.nameBg;
      }

      results.push(pickFromLocalPool(i, chosenTheme, matchedConcept?.id));
    }
    return results;
  }

  // --------------------------------------------------------------------------
  // STANDARD PATH: Query Pexels with 4-Tier Salafi Guardrails
  // --------------------------------------------------------------------------
  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i] || ({} as CarouselSlideInput);
    const textTrunc = truncateField(slide.text);
    const titleTrunc = truncateField(slide.topTitle);
    const fullText = [
      titleTrunc,
      textTrunc,
      truncateField(slide.mainText),
      truncateField(slide.quoteText),
      truncateField(slide.commentaryText),
      truncateField(slide.bottomText),
      truncateField(slide.imagePrompt),
    ]
      .filter(Boolean)
      .join(" ")
      .slice(0, 500);

    const role = detectSlideRole(i, fullText, titleTrunc);

    // --- Step 1: Query Resolution (Dual-Tier) ---
    let chosenTheme = "Ислямска природа";
    let candidateQueries: string[] = [];

    // Tier 1: Fast 0ms Dictionary Match
    const matchedConcept = matchTheologicalConcept(fullText);
    if (matchedConcept) {
      chosenTheme = matchedConcept.nameBg;
      candidateQueries = [...(matchedConcept.roleQueries[role] || [])];
    }

    // Tier 2: Gemini 3.6 Flash Fallback ONLY if pexelsKey is present
    if (pexelsKey && !candidateQueries.length && fullText.trim().length > 0) {
      try {
        const sysPrompt = `You are a cinematic stock video director for vertical 9:16 Islamic Reels.
The slide role is '${role}'. Analyze this slide text and generate 3 high-converting English Pexels video search queries.
STRICT SALAFI RULES: NO humans, NO faces, NO animals, NO musical instruments, NO dark/monochrome.
Return JSON ONLY: { "theme": string (Bulgarian), "queries": string[] }`;

        const raw = await geminiChat(
          "gemini-3.1-pro",
          [
            { role: "system", content: sysPrompt },
            { role: "user", content: fullText },
          ],
          true,
        );

        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed?.queries) && parsed.queries.length > 0) {
          candidateQueries = parsed.queries;
          chosenTheme = parsed.theme || chosenTheme;
        }
      } catch (err) {
        console.warn(`[fetchCarouselSlideVideos] Gemini fallback failed for slide ${i}:`, err);
      }
    }

    // Safety fallback: default role progression queries
    if (!candidateQueries.length) {
      candidateQueries = DEFAULT_ROLE_QUERIES[role] || DEFAULT_ROLE_QUERIES.hook;
    }

    // --- Step 2: Query Pexels & Filter Candidates ---
    let selectedVideo: SlideVideoResult | null = null;

    if (pexelsKey) {
      for (const query of candidateQueries) {
        if (selectedVideo) break;
        const safeQuery = sanitizeSearchQuery(query);

        try {
          const vs = await pexelsVideoQuery(pexelsKey, safeQuery, 20);
          const scored = buildOut(vs, 8); // Minimum 8s duration for looping

          for (const cand of scored) {
            if (usedVideoUrls.has(cand.link)) continue; // Cross-slide deduplication

            const originalVid = vs.find((v) => v.id === cand.id);
            if (originalVid) {
              const isHaram = await checkVideoForHaram(originalVid);
              if (isHaram) continue;
            }

            // Successfully passed all 4 tiers
            usedVideoUrls.add(cand.link);
            selectedVideo = {
              slideIndex: i,
              videoUrl: cand.link,
              source: "pexels",
              duration: cand.duration || 15,
              width: 1080,
              height: 1920,
              theme: chosenTheme,
            };
            break;
          }
        } catch (err) {
          console.warn(`[fetchCarouselSlideVideos] Pexels query "${safeQuery}" error:`, err);
        }
      }
    }

    // --- Step 3: Local Halal Fallback Pool ---
    if (!selectedVideo) {
      selectedVideo = pickFromLocalPool(i, chosenTheme, matchedConcept?.id);
    }

    results.push(selectedVideo);
  }

  return results;
}

export const fetchCarouselSlideVideosDirect = fetchCarouselSlideVideos;

export const fetchCarouselSlideVideosFn = createServerFn({ method: "POST" })
  .validator((input: { slides: CarouselSlideInput[] }) => input)
  .handler(async ({ data }): Promise<SlideVideoResult[]> => {
    return fetchCarouselSlideVideos(data.slides);
  });

export const getCarouselSlideVideos = fetchCarouselSlideVideosFn;
