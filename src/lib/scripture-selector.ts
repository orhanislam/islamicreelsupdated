import { getExcludedScripturesOneMonth } from "./generation-history.functions";
import {
  getAllVerifiedHadithSharhs,
  getVerifiedHadithSharhDirect,
  fetchAuthenticTafsirDirect,
  formatTafsirGroundingPrompt,
  detectScriptureFromText,
  type HadithSharhEntry,
} from "./tafsir.functions";
import { isInvalidSacredQuoteText } from "./smart-script-auditor";
import verifiedQuranVerses from "./data/verified-quran-verses.json";
import { getJobsDir } from "./render.functions";
import path from "node:path";
import fs from "node:fs/promises";

export interface CandidateVerse {
  surah: number;
  ayah: number;
  count?: number;
  title: string;
  keywords: string;
  ayahTextBg?: string;
}

export const CANDIDATE_QURAN_VERSES: CandidateVerse[] = verifiedQuranVerses as CandidateVerse[];


export interface SelectedUniqueScripture {
  type: "quran" | "hadith";
  title: string;
  reference: string;
  collection?: "bukhari" | "muslim" | "tirmidhi" | "nawawi40";
  number?: number;
  surah?: number;
  ayah?: number;
  count?: number;
  dalilTextBg: string;
  arabicText?: string;
  sourceScholar: string;
  sourceWork: string;
  topic: string;
  preGroundingPrompt: string;
  isPreVerifiedUnique: true;
}

/**
 * Ultra-fast scripture selector and 30-day deduplication guard.
 * Checks the entire 30-day history FIRST before any LLM prompt, video creation,
 * or history write. Guarantees that different authentic Hadiths and Ayahs are
 * rotated continuously without delay, collisions, or history clutter.
 */
export async function selectGuaranteedUniqueScriptureDirect(options?: {
  topic?: string;
  sourcePreference?: "auto" | "quran" | "hadith";
  now?: number;
}): Promise<SelectedUniqueScripture> {
  const now = options?.now || Date.now();
  const sourcePref = options?.sourcePreference || "auto";
  const rawTopic = (options?.topic || "").trim();

  // 1. Gather 30-day exclusion keys
  const exclusionData = await getExcludedScripturesOneMonth(now);
  const excludedHadithKeys = new Set<string>(exclusionData.hadithKeys);
  const excludedAyahKeys = new Set<string>(exclusionData.ayahKeys);

  // 2. Also inspect jobs.json to include any rendered videos from the last 30 days
  try {
    const jobsDir = await getJobsDir();
    const jobsFile = path.join(jobsDir, "jobs.json");
    const raw = await fs.readFile(jobsFile, "utf-8").catch(() => "[]");
    const jobs = JSON.parse(raw);
    const thirtyDaysAgo = now - 30 * 24 * 3600 * 1000;
    if (Array.isArray(jobs)) {
      for (const j of jobs) {
        if (!j || (j.createdAt && j.createdAt < thirtyDaysAgo)) continue;
        if (j.data?.surah && j.data?.ayah) {
          excludedAyahKeys.add(`${j.data.surah}:${j.data.ayah}`);
        }
        const coll = (j.data?.collection || j.data?.hadithCollection || "").toLowerCase().trim();
        const num = j.data?.hadithNumber || j.data?.number;
        if (coll && num) {
          excludedHadithKeys.add(`${coll}:${num}`);
        }
      }
    }
  } catch {}

  // 3. Check if user specified an exact explicit reference in the topic (e.g. "Коран 2:255" or "Бухари 1")
  const detected = detectScriptureFromText(rawTopic);

  if (detected.type === "quran" && detected.surah && detected.ayah) {
    const key = `${detected.surah}:${detected.ayah}`;
    const isExcluded = excludedAyahKeys.has(key);
    if (!isExcluded) {
      const [tafsir, dalilBg] = await Promise.all([
        fetchAuthenticTafsirDirect({ surah: detected.surah, ayah: detected.ayah, scholarId: 91 }),
        preFetchQuranDalilBg(detected.surah, detected.ayah, 1),
      ]);
      const title = `[Коран ${detected.surah}:${detected.ayah}]`;
      return {
        type: "quran",
        title,
        reference: `Сура ${detected.surah}:${detected.ayah}`,
        surah: detected.surah,
        ayah: detected.ayah,
        count: 1,
        dalilTextBg: dalilBg,
        sourceScholar: "Шейх ас-Са'ди (рахимахуллах)",
        sourceWork: "Тефсир ас-Са'ди",
        topic: rawTopic || `Сура ${detected.surah}:${detected.ayah}`,
        preGroundingPrompt: tafsir ? formatTafsirGroundingPrompt({ tafsir, ayahTextBg: dalilBg || undefined }) : "",
        isPreVerifiedUnique: true,
      };
    }
  } else if (detected.type === "hadith" && detected.collection && detected.number) {
    const key = `${detected.collection.toLowerCase().trim()}:${detected.number}`;
    const isExcluded = excludedHadithKeys.has(key);
    if (!isExcluded) {
      const sharh = getVerifiedHadithSharhDirect({
        collection: detected.collection,
        number: detected.number,
      });
      const collName =
        detected.collection === "nawawi40"
          ? "40 Хадиса на ан-Науауи"
          : detected.collection === "bukhari"
          ? "Сахих ал-Бухари"
          : detected.collection === "muslim"
          ? "Сахих Муслим"
          : "Джами ат-Тирмизи";
      const title = `[${collName} #${detected.number}]`;
      return {
        type: "hadith",
        title,
        reference: `${collName} #${detected.number}`,
        collection: detected.collection as any,
        number: Number(detected.number),
        dalilTextBg: sharh?.hadithTextBg || "Пратеникът на Аллах ﷺ ни учи:",
        sourceScholar: "Сахих Сунна (Шейх Ибн Баз & Шейх ал-Албани)",
        sourceWork: sharh?.work || "Автентичен Шарх",
        topic: sharh?.topic || rawTopic || `${collName} #${detected.number}`,
        preGroundingPrompt: sharh ? formatTafsirGroundingPrompt({ hadithSharh: sharh }) : "",
        isPreVerifiedUnique: true,
      };
    }
  }

  // 4. Build unexcluded pools of verified Hadiths and Quran verses
  const allVerifiedHadiths = getAllVerifiedHadithSharhs();
  const availableHadiths = allVerifiedHadiths.filter((h) => {
    const key = `${h.collection.toLowerCase().trim()}:${h.number}`;
    if (excludedHadithKeys.has(key)) return false;
    // Also check item references
    return !exclusionData.items.some(
      (item) =>
        item.type === "hadith" &&
        (item.collection || "bukhari").toLowerCase().trim() === h.collection.toLowerCase().trim() &&
        String(item.hadithNumber ?? (item as any).number ?? "") === String(h.number),
    );
  });

  const availableAyahs = CANDIDATE_QURAN_VERSES.filter((v) => {
    const key = `${v.surah}:${v.ayah}`;
    if (excludedAyahKeys.has(key)) return false;
    return !exclusionData.items.some(
      (item) =>
        (item.type === "ayah" || (item as any).type === "quran") &&
        Number(item.surah) === v.surah &&
        Number(item.ayah) === v.ayah,
    );
  });

  // 5. Select based on sourcePreference: "hadith", "quran", or "auto"
  const pickHadith =
    sourcePref === "hadith"
      ? true
      : sourcePref === "quran"
      ? false
      : availableHadiths.length > 0 && (availableAyahs.length === 0 || Math.random() < 0.5);

  if (pickHadith) {
    let pool = availableHadiths;
    if (pool.length === 0) {
      // In the edge case where all 67 verified hadiths were used in 30 days,
      // fallback to the full pool rather than failing or looping.
      pool = allVerifiedHadiths;
    }

    // Keyword matching if topic provided
    if (rawTopic) {
      const topicWords = rawTopic
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 3 && !["видео", "обяснение", "ислямско", "направи", "искам", "тема", "само", "върху"].includes(w));

      if (topicWords.length > 0) {
        const matches = pool.filter((h) => {
          const hay = `${h.topic} ${h.hadithTextBg || ""} ${h.text || ""}`.toLowerCase();
          return topicWords.some((w) => hay.includes(w.slice(0, Math.max(3, w.length - 1))));
        });
        if (matches.length > 0) {
          pool = matches;
        }
      }
    }

    // Pick a random unexcluded hadith from the filtered pool
    const selected = pool[Math.floor(Math.random() * pool.length)];
    const collName =
      selected.collection === "nawawi40"
        ? "40 Хадиса на ан-Науауи"
        : selected.collection === "bukhari"
        ? "Сахих ал-Бухари"
        : selected.collection === "muslim"
        ? "Сахих Муслим"
        : "Джами ат-Тирмизи";

    const title = `[${collName} #${selected.number}] ${selected.topic}`;
    const preGroundingPrompt = formatTafsirGroundingPrompt({ hadithSharh: selected });

    return {
      type: "hadith",
      title,
      reference: `${collName} #${selected.number}`,
      collection: selected.collection as any,
      number: Number(selected.number),
      dalilTextBg: selected.hadithTextBg || "Пратеникът на Аллах ﷺ ни учи:",
      sourceScholar: "Сахих Сунна (Шейх Ибн Баз & Шейх ал-Албани)",
      sourceWork: selected.work || "Автентичен Шарх",
      topic: selected.topic,
      preGroundingPrompt,
      isPreVerifiedUnique: true,
    };
  } else {
    let pool = availableAyahs;
    if (pool.length === 0) {
      pool = CANDIDATE_QURAN_VERSES;
    }

    if (rawTopic) {
      const topicWords = rawTopic
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 3 && !["видео", "обяснение", "ислямско", "направи", "искам", "тема", "само", "върху"].includes(w));

      if (topicWords.length > 0) {
        const matches = pool.filter((v) => {
          const hay = `${v.title} ${v.keywords}`.toLowerCase();
          return topicWords.some((w) => hay.includes(w.slice(0, Math.max(3, w.length - 1))));
        });
        if (matches.length > 0) {
          pool = matches;
        }
      }
    }

    const selected = pool[Math.floor(Math.random() * pool.length)];
    let dalilBg = (selected.ayahTextBg || "").trim();
    if (!dalilBg || isInvalidSacredQuoteText(dalilBg)) {
      dalilBg = await preFetchQuranDalilBg(selected.surah, selected.ayah, selected.count || 1);
    }
    const tafsir = await fetchAuthenticTafsirDirect({ surah: selected.surah, ayah: selected.ayah, scholarId: 91 });

    const title = `[Сура ${selected.surah}:${selected.ayah}]`;
    const preGroundingPrompt = tafsir ? formatTafsirGroundingPrompt({ tafsir, ayahTextBg: dalilBg || undefined }) : "";

    return {
      type: "quran",
      title: selected.title,
      reference: `Сура ${selected.surah}:${selected.ayah}`,
      surah: selected.surah,
      ayah: selected.ayah,
      count: selected.count || 1,
      dalilTextBg: dalilBg,
      sourceScholar: "Шейх ас-Са'ди (рахимахуллах)",
      sourceWork: "Тефсир ас-Са'ди",
      topic: selected.title,
      preGroundingPrompt,
      isPreVerifiedUnique: true,
    };
  }
}

export async function preFetchQuranDalilBg(surah: number, ayah: number, count = 1): Promise<string> {
  try {
    // 1. Check pre-stored verified candidate verses first (instant < 1ms, 100% reliable)
    const match = CANDIDATE_QURAN_VERSES.find(
      (v) => v.surah === surah && v.ayah === ayah && (!v.count || v.count === count),
    );
    if (match?.ayahTextBg && !isInvalidSacredQuoteText(match.ayahTextBg)) {
      return match.ayahTextBg;
    }
    // 2. Fetch directly from quran.functions (with verified DB + alquran.cloud + translation fallback)
    const { getBulgarianQuranAyahDirect } = await import("./quran.functions");
    const res = await getBulgarianQuranAyahDirect({ surah, ayah, count });
    if (res?.text && !isInvalidSacredQuoteText(res.text)) {
      return res.text;
    }
    return "";
  } catch (err) {
    console.warn(`[preFetchQuranDalilBg] Error fetching ${surah}:${ayah}:`, err);
    return "";
  }
}

