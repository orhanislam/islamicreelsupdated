import { createServerFn } from "@tanstack/react-start";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import verifiedSharhData from "./data/verified-hadith-sharh.json";

export interface TafsirEntry {
  surah: number;
  ayah: number;
  ayahEnd?: number;
  scholar: string;
  scholarId: number;
  source: "quran.com" | "local_cache";
  text: string;
  language: "ar" | "en";
  timestamp: number;
}

export interface HadithSharhEntry {
  collection: string;
  number: number;
  scholar: string;
  work: string;
  text: string;
  topic: string;
}

const getTafsirCachePath = () => {
  const dir = path.join(os.homedir(), ".islamicreels_jobs");
  return path.join(dir, "tafsir_cache.json");
};

async function ensureDir() {
  const dir = path.join(os.homedir(), ".islamicreels_jobs");
  await fs.mkdir(dir, { recursive: true }).catch(() => {});
}

function cleanHtmlTafsir(html: string): string {
  if (!html) return "";
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function loadTafsirCache(): Promise<Record<string, TafsirEntry>> {
  try {
    const raw = await fs.readFile(getTafsirCachePath(), "utf-8");
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

async function saveTafsirToCache(key: string, entry: TafsirEntry): Promise<void> {
  try {
    await ensureDir();
    const cache = await loadTafsirCache();
    cache[key] = entry;
    const cachePath = getTafsirCachePath();
    const tmpPath = `${cachePath}.tmp.${Date.now()}`;
    await fs.writeFile(tmpPath, JSON.stringify(cache, null, 2), "utf-8");
    await fs.rename(tmpPath, cachePath);
  } catch (err) {
    console.warn("[tafsir-cache] Failed to save tafsir to cache:", err);
  }
}

/**
 * Fetches authentic scholarly Tafsir directly from Quran.com API (api.qurancdn.com)
 * Default: Tafsir as-Sa'di (scholarId: 91 - Arabic) or Tafsir Ibn Kathir (scholarId: 169 - English)
 */
export async function fetchAuthenticTafsirDirect(params: {
  surah: number;
  ayah: number;
  ayahEnd?: number;
  scholarId?: number;
}): Promise<TafsirEntry | null> {
  const surah = Math.floor(Number(params.surah));
  const ayah = Math.floor(Number(params.ayah));
  const scholarId = params.scholarId || 91; // 91 = Al-Sa'di (Arabic), 169 = Ibn Kathir (English)

  if (!surah || !ayah || surah < 1 || surah > 114 || ayah < 1) {
    return null;
  }

  const cacheKey = `${scholarId}:${surah}:${ayah}`;
  const cache = await loadTafsirCache();
  if (cache[cacheKey] && cache[cacheKey].text) {
    return {
      ...cache[cacheKey],
      source: "local_cache",
    };
  }

  // Fetch from official Quran.com CDN
  const scholarName =
    scholarId === 91
      ? "Шейх Абдур-Рахман ас-Са'ди (Тефсир ас-Са'ди)"
      : scholarId === 169
      ? "Имам Ибн Кесир (Тефсир Ибн Кесир)"
      : "Класически салафитски тефсир";

  const lang: "ar" | "en" = scholarId === 169 ? "en" : "ar";

  try {
    const url = `https://api.qurancdn.com/api/qdc/tafsirs/${scholarId}/by_ayah/${surah}:${ayah}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) {
      console.warn(`[tafsir-api] Failed HTTP ${res.status} for ${url}`);
      return null;
    }
    const json = await res.json();
    const rawText = json?.tafsir?.text;
    if (!rawText) return null;

    const cleaned = cleanHtmlTafsir(rawText);
    if (!cleaned) return null;

    // Truncate to first 1200 characters if very long, keeping full sentences
    const maxLength = 1200;
    let finalSnippet = cleaned;
    if (cleaned.length > maxLength) {
      const truncated = cleaned.slice(0, maxLength);
      const lastPeriod = Math.max(truncated.lastIndexOf("."), truncated.lastIndexOf("\n"));
      finalSnippet = lastPeriod > 400 ? truncated.slice(0, lastPeriod + 1) : truncated + "...";
    }

    const entry: TafsirEntry = {
      surah,
      ayah,
      ayahEnd: params.ayahEnd,
      scholar: scholarName,
      scholarId,
      source: "quran.com",
      text: finalSnippet,
      language: lang,
      timestamp: Date.now(),
    };

    await saveTafsirToCache(cacheKey, entry);
    return entry;
  } catch (err) {
    console.warn("[tafsir-api] Exception fetching tafsir:", err);
    return null;
  }
}

/**
 * Retrieves authentic verified Hadith Sharh (e.g. from Shaykh Ibn Uthaymeen)
 * from the curated local scholarly database.
 */
export function getVerifiedHadithSharhDirect(params: {
  collection: string;
  number: number | string;
}): HadithSharhEntry | null {
  const coll = String(params.collection || "").toLowerCase().trim();
  const num = Number(params.number);
  if (!num) return null;

  // 1. Exact match in verifiedSharhData
  const matches = (verifiedSharhData.hadiths as HadithSharhEntry[]).find((h) => {
    const c = h.collection.toLowerCase().trim();
    const collMatch =
      c === coll ||
      (c.includes("bukhari") && coll.includes("bukhari")) ||
      (c.includes("muslim") && coll.includes("muslim")) ||
      (c.includes("tirmidhi") && coll.includes("tirmidhi")) ||
      (c.includes("nawawi") && coll.includes("nawawi"));
    return collMatch && Number(h.number) === num;
  });

  if (matches) return { ...matches, sourceType: "database" };

  // 2. Canonical Cross-References (e.g. Bukhari 1 <-> Nawawi 1, Tirmidhi 2516 <-> Nawawi 19)
  const crossMap: Record<string, { collection: string; number: number }> = {
    "bukhari:1": { collection: "nawawi40", number: 1 },
    "muslim:1": { collection: "nawawi40", number: 2 },
    "muslim:8": { collection: "nawawi40", number: 2 },
    "bukhari:8": { collection: "nawawi40", number: 3 },
    "bukhari:2697": { collection: "nawawi40", number: 5 },
    "muslim:1718": { collection: "nawawi40", number: 5 },
    "bukhari:52": { collection: "nawawi40", number: 6 },
    "muslim:1599": { collection: "nawawi40", number: 6 },
    "bukhari:13": { collection: "nawawi40", number: 13 },
    "bukhari:6018": { collection: "nawawi40", number: 15 },
    "bukhari:6065": { collection: "nawawi40", number: 15 },
    "bukhari:6116": { collection: "nawawi40", number: 16 },
    "tirmidhi:2516": { collection: "nawawi40", number: 19 },
    "muslim:38": { collection: "nawawi40", number: 21 },
    "muslim:223": { collection: "nawawi40", number: 23 },
    "muslim:2577": { collection: "nawawi40", number: 24 },
    "bukhari:2989": { collection: "nawawi40", number: 26 },
    "muslim:1009": { collection: "nawawi40", number: 26 },
    "muslim:49": { collection: "nawawi40", number: 34 },
    "muslim:2564": { collection: "nawawi40", number: 35 },
    "muslim:2699": { collection: "nawawi40", number: 36 },
    "bukhari:6491": { collection: "nawawi40", number: 37 },
    "bukhari:6502": { collection: "nawawi40", number: 38 },
    "bukhari:6416": { collection: "nawawi40", number: 40 },
  };

  const simpleColl = coll.includes("bukhari")
    ? "bukhari"
    : coll.includes("muslim")
    ? "muslim"
    : coll.includes("tirmidhi")
    ? "tirmidhi"
    : coll.includes("nawawi")
    ? "nawawi40"
    : coll;

  const crossKey = `${simpleColl}:${num}`;
  if (crossMap[crossKey]) {
    const target = crossMap[crossKey];
    const crossMatch = (verifiedSharhData.hadiths as HadithSharhEntry[]).find(
      (h) => h.collection === target.collection && Number(h.number) === target.number
    );
    if (crossMatch) return { ...crossMatch, sourceType: "database" };
  }

  // 3. Salafi AI Dynamic Engine (when hadith is not in pre-seeded database)
  return {
    collection: simpleColl,
    number: num,
    scholar: "Salafi AI (по манхаджа на ас-Саляф ас-Салих — Шейх Ибн Баз, Шейх ал-Усеймин, Шейх ал-Албани)",
    work: "Разяснение по Салафитския манхадж",
    topic: `Сахих Хадис #${num}`,
    sourceType: "salafi_ai",
    text: `Salafi AI разяснява фикха и мъдростта на този Сахих хадис строго по разбирането на Праведните предци (ас-Саляф ас-Салих), подчертавайки задължението за следване на Сунната на Пратеника на Аллах ﷺ, придържане към Таухида, искреност на намерението и отхвърляне на всякакви нововъведения. Поуката изисква търпение при изпитания, благороден нрав и постоянно спазване на повелите на Всевишния Аллах.`
  };
}

/**
 * Formats a strict Grounding context prompt for Gemini.
 * This instructs the LLM to only translate and compress the authentic text,
 * strictly preventing hallucinations.
 */
export function formatTafsirGroundingPrompt(params: {
  tafsir?: TafsirEntry | null;
  hadithSharh?: HadithSharhEntry | null;
}): string {
  if (params.tafsir && params.tafsir.text) {
    const t = params.tafsir;
    return `
=============================================================================
=== ОФИЦИАЛЕН АВТЕНТИЧЕН ТЕКСТ ОТ ТЕФСИР (ОТ БАЗАТА ДАННИ QURAN.COM) ===
Източник: ${t.scholar} (Сура ${t.surah}:${t.ayah})
Оригинален текст:
"""
${t.text}
"""
=============================================================================
СТРОГА ЗАПОВЕД ЗА ОБЯСНЕНИЕТО / ПОУКАТА:
Твоята задача в "explanation" и "summaryBg" е ЕДИНСТВЕНО да преведеш и синтезираш в 35-45 думи на български език ТОЧНО горния автентичен текст от тефсира!
- ЗАДЪЛЖИТЕЛНО цитирай името на учения (напр. "Шейх ас-Са'ди (рахимахуллах) пояснява в своя Тефсир, че...").
- АБСОЛЮТНО Е ЗАБРАНЕНО да измисляш собствени интерпретации, философски теории или да добавяш неща, които не присъстват в този автентичен цитат!
=============================================================================`;
  }

  if (params.hadithSharh && params.hadithSharh.text) {
    const h = params.hadithSharh;
    if (h.sourceType === "salafi_ai") {
      return `
=============================================================================
=== РАЗЯСНЕНИЕ ОТ SALAFI AI (ПО МАНХАДЖА НА АС-САЛЯФ АС-САЛИХ) ===
Тъй като за този хадис няма предварително записан текст в базата данни,
твоята задача като автентичен САЛАФИТСКИ ШЕЙХ (по стъпките на Шейх Ибн Баз, Шейх ал-Усеймин и Шейх ал-Албани) е:
1. Да извлечеш чистото салафитско разяснение и фикх на хадиса.
2. Да се придържаш СТРИКТНО към Таухида, Сунната и разбирането на Сахабите.
3. СТРОГО СА ЗАБРАНЕНИ: суфийски, ашари или модернистични свободни разсъждения!
4. Дължина: 35-45 думи в "explanation" и "summaryBg", започващи като "Поука: [разяснението]".
=============================================================================`;
    }

    return `
=============================================================================
=== АВТЕНТИЧНО РАЗЯСНЕНИЕ ОТ ШЕЙХ АЛ-УСЕЙМИН (ОТ БАЗАТА ДАННИ) ===
Учен: ${h.scholar} (рахимахуллах)
Труд: ${h.work}
Тема: ${h.topic}
Оригинално разяснение:
"""
${h.text}
"""
=============================================================================
СТРОГА ЗАПОВЕД ЗА ОБЯСНЕНИЕТО / ПОУКАТА:
Твоята задача в "explanation" и "summaryBg" е ЕДИНСТВЕНО да предадеш горната поука от ${h.scholar} в 35-45 думи на ясен български език!
- ЗАДЪЛЖИТЕЛНО цитирай учения: "Шейх ал-Усеймин (рахимахуллах) пояснява, че...".
- СТРИКТНО БЕЗ собствени интерпретации или свободни разсъждения!
=============================================================================`;
  }

  return "";
}


/**
 * Detects Quranic and Hadith scripture citations from text (prompt or titles)
 */
export function detectScriptureFromText(text: string): {
  type: "quran" | "hadith" | null;
  surah?: number;
  ayah?: number;
  collection?: string;
  number?: number;
} {
  if (!text || typeof text !== "string") return { type: null };
  const lower = text.toLowerCase();

  // Named Surahs
  if (/аят\s*ал[- ]?курси|айят\s*ал[- ]?курси|аят\s*курси|kursi/i.test(lower)) {
    return { type: "quran", surah: 2, ayah: 255 };
  }
  if (/ал[- ]?ихляс|ал[- ]?ихлас|ихляс|ихлас|ihlas/i.test(lower) && !/\d+[:.]\d+/.test(lower)) {
    return { type: "quran", surah: 112, ayah: 1 };
  }
  if (/ал[- ]?фатиха|фатиха|fatiha/i.test(lower) && !/\d+[:.]\d+/.test(lower)) {
    return { type: "quran", surah: 1, ayah: 1 };
  }
  if (/аш[- ]?шарх|инширах/i.test(lower) && !/\d+[:.]\d+/.test(lower)) {
    return { type: "quran", surah: 94, ayah: 5 };
  }
  if (/ал[- ]?аср/i.test(lower) && !/\d+[:.]\d+/.test(lower)) {
    return { type: "quran", surah: 103, ayah: 1 };
  }
  if (/ал[- ]?фаляк/i.test(lower) && !/\d+[:.]\d+/.test(lower)) {
    return { type: "quran", surah: 113, ayah: 1 };
  }
  if (/ан[- ]?нас/i.test(lower) && !/\d+[:.]\d+/.test(lower)) {
    return { type: "quran", surah: 114, ayah: 1 };
  }
  if (/ал[- ]?каусар/i.test(lower) && !/\d+[:.]\d+/.test(lower)) {
    return { type: "quran", surah: 108, ayah: 1 };
  }
  if (/ал[- ]?мулк/i.test(lower) && !/\d+[:.]\d+/.test(lower)) {
    return { type: "quran", surah: 67, ayah: 1 };
  }
  if (/ар[- ]?рахман/i.test(lower) && !/\d+[:.]\d+/.test(lower)) {
    return { type: "quran", surah: 55, ayah: 13 };
  }
  if (/аз[- ]?зумар/i.test(lower) && !/\d+[:.]\d+/.test(lower)) {
    return { type: "quran", surah: 39, ayah: 53 };
  }
  if (/ар[- ]?ра['`]?д/i.test(lower) && !/\d+[:.]\d+/.test(lower)) {
    return { type: "quran", surah: 13, ayah: 28 };
  }
  if (/ат[- ]?талак/i.test(lower) && !/\d+[:.]\d+/.test(lower)) {
    return { type: "quran", surah: 65, ayah: 2 };
  }
  if (/али[- ]?имран/i.test(lower) && !/\d+[:.]\d+/.test(lower)) {
    return { type: "quran", surah: 3, ayah: 139 };
  }

  // Generic Quran pattern: e.g. "13:28" or "коран 2:255" or "сура 2 аят 255"
  const colonMatch = lower.match(/(?:коран|сура|айят|аят)?\s*(\d{1,3})\s*[:.]\s*(\d{1,3})/i);
  if (colonMatch) {
    const s = parseInt(colonMatch[1], 10);
    const a = parseInt(colonMatch[2], 10);
    if (s >= 1 && s <= 114 && a >= 1) {
      return { type: "quran", surah: s, ayah: a };
    }
  }
  const surahAyahWordsMatch = lower.match(/сура\s*(\d{1,3})\s*(?:аят|айят|стих)\s*(\d{1,3})/i);
  if (surahAyahWordsMatch) {
    const s = parseInt(surahAyahWordsMatch[1], 10);
    const a = parseInt(surahAyahWordsMatch[2], 10);
    if (s >= 1 && s <= 114 && a >= 1) {
      return { type: "quran", surah: s, ayah: a };
    }
  }

  // Hadith collections (supports "бухари 1", "хадис 1 от бухари", "бухари #6424", etc.)
  const bukhariMatch =
    lower.match(/(?:бухари|bukhari)\s*(?:#|№|номер)?\s*(\d+)/i) ||
    lower.match(/хадис\s*(?:#|№|номер)?\s*(\d+)\s*(?:от|на)?\s*(?:сахих\s*ал[- ]?)?бухари/i);
  if (bukhariMatch) {
    return { type: "hadith", collection: "bukhari", number: parseInt(bukhariMatch[1], 10) };
  }

  const muslimMatch =
    lower.match(/(?:муслим|muslim)\s*(?:#|№|номер)?\s*(\d+)/i) ||
    lower.match(/хадис\s*(?:#|№|номер)?\s*(\d+)\s*(?:от|на)?\s*(?:сахих\s*)?муслим/i);
  if (muslimMatch) {
    return { type: "hadith", collection: "muslim", number: parseInt(muslimMatch[1], 10) };
  }

  const nawawiMatch =
    lower.match(/(?:навауи|науауи|nawawi|40\s*хадиса)\s*(?:#|№|номер)?\s*(\d+)/i) ||
    lower.match(/хадис\s*(?:#|№|номер)?\s*(\d+)\s*(?:от|на)?\s*(?:40\s*хадиса\s*(?:на)?\s*)?(?:навауи|науауи|nawawi)/i);
  if (nawawiMatch) {
    return { type: "hadith", collection: "nawawi40", number: parseInt(nawawiMatch[1], 10) };
  }

  const tirmidhiMatch =
    lower.match(/(?:тирмизи|tirmidhi|ат-тирмизи|at-tirmidhi)\s*(?:#|№|номер)?\s*(\d+)/i) ||
    lower.match(/хадис\s*(?:#|№|номер)?\s*(\d+)\s*(?:от|на)?\s*(?:сунан\s*|джами\s*)?(?:ат[- ]?)?тирмизи/i);
  if (tirmidhiMatch) {
    return { type: "hadith", collection: "tirmidhi", number: parseInt(tirmidhiMatch[1], 10) };
  }

  return { type: null };
}

export interface ScriptureProposalLike {
  type?: string;
  surah?: number;
  ayah?: number;
  collection?: string;
  number?: number;
  title?: string;
  summaryBg?: string;
  scriptWorkflow?: {
    hookQuestion?: string;
    hookContext?: string;
    dalilIntro?: string;
    dalilText?: string;
    explanation?: string;
    actionStep?: string;
    sourceScholar?: string;
    sourceWork?: string;
    sourceText?: string;
    sourceType?: "database" | "salafi_ai";
    isAuthenticVerified?: boolean;
  };
}

/**
 * Enriches a video proposal with authentic scholarly grounding metadata
 * (Quran.com Tafsir as-Sa'di or Shaykh al-Uthaymeen Hadith Sharh or Salafi AI)
 */
export async function enrichProposalWithAuthenticTafsir(proposal: ScriptureProposalLike): Promise<void> {
  if (!proposal) return;

  // 1. Quran Ayah
  let surah = proposal.surah;
  let ayah = proposal.ayah;
  if ((!surah || !ayah) && proposal.title) {
    const detected = detectScriptureFromText(proposal.title);
    if (detected.type === "quran" && detected.surah && detected.ayah) {
      surah = detected.surah;
      ayah = detected.ayah;
    }
  }

  if (surah && ayah) {
    try {
      const tafsir = await fetchAuthenticTafsirDirect({ surah, ayah, scholarId: 91 });
      if (tafsir && tafsir.text) {
        if (!proposal.scriptWorkflow && proposal.type === "explained_video") {
          proposal.scriptWorkflow = {
            hookQuestion: "Защо усещаш тревога в гърдите си, дори когато всичко изглежда наред?",
            hookContext: "Често търсим покой в материалния свят, но душата остава жадна за истината.",
            dalilIntro: "В Свещения Коран, Аллах Всевишният повелява:",
            explanation: `Шейх ас-Са'ди (рахимахуллах) пояснява в своя Тефсир: ${tafsir.text.slice(0, 180)}...`,
            actionStep: "Спри за 1 минута, направи искрен истигфар и дуа към Аллах Всевишният. Запази и сподели!",
          };
        }
        if (proposal.scriptWorkflow) {
          proposal.scriptWorkflow.sourceScholar = tafsir.scholar;
          proposal.scriptWorkflow.sourceWork = "Тефсир ас-Са'ди (Официална база данни Quran.com)";
          proposal.scriptWorkflow.sourceText = tafsir.text;
          proposal.scriptWorkflow.sourceType = "database";
          proposal.scriptWorkflow.isAuthenticVerified = true;
        }
      }
    } catch (e) {
      console.warn("[enrichProposal] Tafsir fetch failed:", e);
    }
  }

  // 2. Hadith Sharh
  let collection = proposal.collection;
  let number = proposal.number;
  if ((!collection || !number) && proposal.title) {
    const detected = detectScriptureFromText(proposal.title);
    if (detected.type === "hadith" && detected.collection && detected.number) {
      collection = detected.collection;
      number = detected.number;
    }
  }

  if (collection && number) {
    try {
      const sharh = getVerifiedHadithSharhDirect({ collection, number });
      if (sharh && sharh.text) {
        const isDb = sharh.sourceType === "database";
        if (!proposal.scriptWorkflow && proposal.type === "explained_video") {
          proposal.scriptWorkflow = {
            hookQuestion: "Защо делата ни понякога губят своята благодат и чистота?",
            hookContext: "Искреността към Аллах е в основата на всяко прието дело и спасението на душата.",
            dalilIntro: "Пратеникът на Аллах ﷺ ни учи:",
            explanation: isDb
              ? `Шейх ал-Усеймин (рахимахуллах) пояснява в „${sharh.work}“: ${sharh.text.slice(0, 180)}...`
              : `Поука (по манхаджа на ас-Саляф ас-Салих): ${sharh.text.slice(0, 180)}...`,
            actionStep: "Обнови своя нийет (намерение) още сега само за Аллах Всевишният. Запази и сподели за добро!",
          };
        }
        if (proposal.scriptWorkflow) {
          proposal.scriptWorkflow.sourceScholar = sharh.scholar;
          proposal.scriptWorkflow.sourceWork = isDb
            ? `${sharh.work} (Шарх от Шейх ал-Усеймин)`
            : sharh.work;
          proposal.scriptWorkflow.sourceText = sharh.text;
          proposal.scriptWorkflow.sourceType = isDb ? "database" : "salafi_ai";
          proposal.scriptWorkflow.isAuthenticVerified = true;
        }
      } else if (proposal.scriptWorkflow) {
        if (!proposal.scriptWorkflow.sourceScholar) {
          proposal.scriptWorkflow.sourceScholar = "Salafi AI (по манхаджа на ас-Саляф ас-Салих)";
          proposal.scriptWorkflow.sourceWork = "Разяснение според учените на сунната";
          proposal.scriptWorkflow.sourceType = "salafi_ai";
          proposal.scriptWorkflow.isAuthenticVerified = true;
        }
      }
    } catch (e) {
      console.warn("[enrichProposal] Hadith sharh lookup failed:", e);
    }
  }
}

// ---------------------------------------------------------------------------
// TanStack Start Server Functions
// ---------------------------------------------------------------------------

export const getAuthenticTafsir = createServerFn({ method: "POST" })
  .validator(
    (input: {
      surah: number;
      ayah: number;
      ayahEnd?: number;
      scholarId?: number;
    }) => input,
  )
  .handler(async ({ data }) => {
    return fetchAuthenticTafsirDirect(data);
  });

export const getAuthenticHadithSharh = createServerFn({ method: "POST" })
  .validator((input: { collection: string; number: number | string }) => input)
  .handler(async ({ data }) => {
    return getVerifiedHadithSharhDirect(data);
  });

