import { createServerFn } from "@tanstack/react-start";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export type GenerationType = "ayah" | "hadith" | "carousel";

export interface GenerationHistoryItem {
  id: string;
  type: GenerationType;
  title: string;
  reference: string;
  surah?: number;
  ayah?: number;
  ayahEnd?: number;
  collection?: string;
  hadithNumber?: string | number;
  arabicText?: string;
  bulgarianText?: string;
  timestamp: number; // epoch ms
  format?: "video" | "photo" | "carousel";
  theme?: string;
  reciter?: string;
  videoUrl?: string;
  status?: "completed" | "rendering" | "queued" | "error";
}

const getHistoryFilePath = () => {
  const dir = path.join(os.homedir(), ".islamicreels_jobs");
  return path.join(dir, "generation_history.json");
};

async function ensureDir() {
  const dir = path.join(os.homedir(), ".islamicreels_jobs");
  await fs.mkdir(dir, { recursive: true }).catch(() => {});
}

let historyLock: Promise<unknown> = Promise.resolve();

function withHistoryLock<T>(action: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    historyLock = historyLock
      .catch(() => {})
      .then(action)
      .then(resolve, reject);
  });
}

function parseTypeAndDetails(title: string, data?: any): {
  type: GenerationType;
  reference: string;
  surah?: number;
  ayah?: number;
  ayahEnd?: number;
  collection?: string;
  hadithNumber?: string | number;
} {
  const cleanTitle = title || "";

  // Check if carousel
  if (
    cleanTitle.toLowerCase().includes("карусел") ||
    data?.type === "carousel" ||
    cleanTitle.startsWith("carousel:")
  ) {
    return {
      type: "carousel",
      reference: cleanTitle.replace(/^carousel:\s*/i, ""),
    };
  }

  // Check Hadith patterns
  const isHadith =
    cleanTitle.toLowerCase().includes("хадис") ||
    cleanTitle.toLowerCase().includes("bukhari") ||
    cleanTitle.toLowerCase().includes("muslim") ||
    cleanTitle.toLowerCase().includes("tirmidhi") ||
    cleanTitle.toLowerCase().includes("тирмизи") ||
    cleanTitle.toLowerCase().includes("бухари") ||
    cleanTitle.toLowerCase().includes("муслим") ||
    cleanTitle.toLowerCase().includes("навауи") ||
    data?.source_type === "hadith" ||
    data?.type === "hadith";

  if (isHadith) {
    let collection = data?.collection || "bukhari";
    const lower = cleanTitle.toLowerCase();
    if (lower.includes("муслим") || lower.includes("muslim")) {
      collection = "muslim";
    } else if (lower.includes("навауи") || lower.includes("nawawi")) {
      collection = "nawawi40";
    } else if (lower.includes("тирмизи") || lower.includes("tirmidhi")) {
      collection = "tirmidhi";
    }

    const numMatch = cleanTitle.match(/(?:№|#|\bномер\b|\bnumber\b)\s*(\d+)/i) || cleanTitle.match(/\b(\d+)\b$/);
    const hadithNum = data?.hadithNumber !== undefined ? data.hadithNumber : data?.number !== undefined ? data.number : numMatch ? parseInt(numMatch[1], 10) : undefined;

    return {
      type: "hadith",
      reference: cleanTitle,
      collection,
      hadithNumber: hadithNum,
    };
  }

  // Check Quran patterns
  const colonMatch = cleanTitle.match(/\b(\d{1,3})\s*[:.]\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?\b/);
  const surahMatch = cleanTitle.match(/(?:Сура|Surah)\s*(\d{1,3})/i);
  const ayahMatch = cleanTitle.match(/(?:Аят|Аяти|Ayah|Ayahs)\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?/i);

  let surah: number | undefined = data?.surah !== undefined ? Number(data.surah) : undefined;
  let ayah: number | undefined = data?.ayah !== undefined ? Number(data.ayah) : undefined;
  let ayahEnd: number | undefined = data?.ayahEnd !== undefined ? Number(data.ayahEnd) : undefined;

  if (surah === undefined || ayah === undefined) {
    if (colonMatch) {
      surah = parseInt(colonMatch[1], 10);
      ayah = parseInt(colonMatch[2], 10);
      if (colonMatch[3]) {
        ayahEnd = parseInt(colonMatch[3], 10);
      }
    } else {
      if (surahMatch) surah = parseInt(surahMatch[1], 10);
      if (ayahMatch) {
        ayah = parseInt(ayahMatch[1], 10);
        if (ayahMatch[2]) ayahEnd = parseInt(ayahMatch[2], 10);
      }
    }
  }

  if (data?.count && ayah && !ayahEnd) {
    ayahEnd = ayah + Number(data.count) - 1;
  }

  return {
    type: "ayah",
    reference: cleanTitle || (surah && ayah ? `Сура ${surah}:${ayah}${ayahEnd && ayahEnd > ayah ? `-${ayahEnd}` : ""}` : "Коран"),
    surah,
    ayah,
    ayahEnd,
  };
}

/**
 * Reads the generation history file, or triggers initial hydration if not present.
 */
async function _readGenerationHistoryRaw(): Promise<GenerationHistoryItem[]> {
  const filePath = getHistoryFilePath();
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch {
    // file doesn't exist yet, we will auto-hydrate
  }

  // Auto-hydration from historical stores
  const hydrated = await _hydrateFromHistoricalSources();
  await _writeGenerationHistoryRaw(hydrated).catch(() => {});
  return hydrated;
}

async function _writeGenerationHistoryRaw(items: GenerationHistoryItem[]): Promise<void> {
  await ensureDir();
  const filePath = getHistoryFilePath();
  const tmpPath = `${filePath}.tmp.${Date.now()}.${Math.random().toString(36).slice(2)}`;

  let success = false;
  try {
    await fs.writeFile(tmpPath, JSON.stringify(items, null, 2), "utf-8");
    await fs.rename(tmpPath, filePath);
    success = true;
  } finally {
    if (!success) {
      await fs.unlink(tmpPath).catch(() => {});
    }
  }
}

/**
 * Intelligently imports historical items from jobs.json, downloaded_jobs.json,
 * jobs_raw.txt, and assistant_memory.json.
 */
async function _hydrateFromHistoricalSources(): Promise<GenerationHistoryItem[]> {
  const items: GenerationHistoryItem[] = [];
  const seenKeys = new Set<string>();

  const addItem = (item: GenerationHistoryItem) => {
    const key = `${item.type}:${item.title.toLowerCase().trim()}:${Math.round(item.timestamp / 60000)}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      items.push(item);
    }
  };

  // 1. Check ~/.islamicreels_jobs/jobs.json
  try {
    const jobsPath = path.join(os.homedir(), ".islamicreels_jobs", "jobs.json");
    const raw = await fs.readFile(jobsPath, "utf-8");
    const jobs = JSON.parse(raw);
    if (Array.isArray(jobs)) {
      for (const j of jobs) {
        if (!j || !j.title) continue;
        const details = parseTypeAndDetails(j.title, j.data);
        addItem({
          id: j.id || `job_${j.createdAt || Date.now()}`,
          type: details.type,
          title: j.title,
          reference: details.reference,
          surah: details.surah,
          ayah: details.ayah,
          ayahEnd: details.ayahEnd,
          collection: details.collection,
          hadithNumber: details.hadithNumber,
          arabicText: j.data?.arabic || undefined,
          bulgarianText: j.data?.bulgarian || undefined,
          timestamp: j.createdAt || Date.now(),
          format: "video",
          theme: j.data?.tiktokTheme || j.data?.style || undefined,
          reciter: j.data?.reciter || undefined,
          status: j.status || "completed",
        });
      }
    }
  } catch {}

  // 2. Check downloaded_jobs.json in cwd
  try {
    const cwd = process.cwd();
    const djPath = path.join(cwd, "downloaded_jobs.json");
    let content = await fs.readFile(djPath, "utf16le").catch(() => "");
    if (!content) {
      content = await fs.readFile(djPath, "utf-8").catch(() => "");
    }
    if (content) {
      if (content.charCodeAt(0) === 0xfeff) content = content.slice(1);
      const dj = JSON.parse(content);
      if (Array.isArray(dj)) {
        for (const j of dj) {
          if (!j || !j.title) continue;
          const details = parseTypeAndDetails(j.title, j.data);
          addItem({
            id: j.id || `dj_${j.createdAt || Date.now()}`,
            type: details.type,
            title: j.title,
            reference: details.reference,
            surah: details.surah,
            ayah: details.ayah,
            ayahEnd: details.ayahEnd,
            collection: details.collection,
            hadithNumber: details.hadithNumber,
            arabicText: j.data?.arabic || undefined,
            bulgarianText: j.data?.bulgarian || undefined,
            timestamp: j.createdAt || Date.now(),
            format: "video",
            theme: j.data?.tiktokTheme || undefined,
            status: j.status || "completed",
          });
        }
      }
    }
  } catch {}

  // 3. Check jobs_raw.txt in cwd
  try {
    const cwd = process.cwd();
    const rawPath = path.join(cwd, "jobs_raw.txt");
    const txt = await fs.readFile(rawPath, "utf-8").catch(() => "");
    if (txt) {
      const startIdx = txt.indexOf("{");
      if (startIdx !== -1) {
        const json = JSON.parse(txt.slice(startIdx));
        const arr = json?.p?.v?.[0]?.a;
        if (Array.isArray(arr)) {
          for (const entry of arr) {
            const keys = entry?.p?.k;
            const values = entry?.p?.v;
            if (Array.isArray(keys) && Array.isArray(values)) {
              const obj: any = {};
              keys.forEach((k: string, i: number) => {
                const val = values[i];
                obj[k] = val?.s !== undefined ? val.s : val;
              });
              if (obj.title) {
                const details = parseTypeAndDetails(obj.title);
                addItem({
                  id: obj.id || `raw_${obj.createdAt || Date.now()}`,
                  type: details.type,
                  title: obj.title,
                  reference: details.reference,
                  surah: details.surah,
                  ayah: details.ayah,
                  ayahEnd: details.ayahEnd,
                  collection: details.collection,
                  hadithNumber: details.hadithNumber,
                  timestamp: typeof obj.createdAt === "number" ? obj.createdAt : Date.now(),
                  format: "video",
                  status: obj.status || "completed",
                });
              }
            }
          }
        }
      }
    }
  } catch {}

  // 4. Check ~/.islamicreels_jobs/assistant_memory.json
  try {
    const memPath = path.join(os.homedir(), ".islamicreels_jobs", "assistant_memory.json");
    const raw = await fs.readFile(memPath, "utf-8");
    const mem = JSON.parse(raw);

    // Add carouselHistory
    if (Array.isArray(mem.carouselHistory)) {
      for (const c of mem.carouselHistory) {
        if (!c || !c.title) continue;
        addItem({
          id: c.id || `car_${c.timestamp || Date.now()}`,
          type: "carousel",
          title: c.title,
          reference: c.subtopicId || c.title,
          bulgarianText: c.hook || c.premise || undefined,
          timestamp: c.timestamp || Date.now(),
          format: "carousel",
          status: "completed",
        });
      }
    }

    // Add usageHistory
    if (Array.isArray(mem.usageHistory)) {
      for (const u of mem.usageHistory) {
        if (!u || !u.identifier) continue;
        const details = parseTypeAndDetails(u.title || u.identifier);
        addItem({
          id: `uh_${u.identifier}_${u.timestamp}`,
          type: u.type || details.type,
          title: u.title || details.reference || u.identifier,
          reference: details.reference || u.identifier,
          surah: details.surah,
          ayah: details.ayah,
          ayahEnd: details.ayahEnd,
          collection: details.collection,
          hadithNumber: details.hadithNumber,
          bulgarianText: u.hook || undefined,
          timestamp: u.timestamp || Date.now(),
          format: u.type === "carousel" ? "carousel" : "video",
          status: "completed",
        });
      }
    }
  } catch {}

  // Sort descending by timestamp (newest first)
  items.sort((a, b) => b.timestamp - a.timestamp);
  return items;
}

// ---------------------------------------------------------------------------
// Direct API Functions
// ---------------------------------------------------------------------------

export async function getGenerationHistoryDirect(): Promise<GenerationHistoryItem[]> {
  return withHistoryLock(() => _readGenerationHistoryRaw());
}

export async function recordGenerationEntryDirect(
  entry: Omit<GenerationHistoryItem, "id"> & { id?: string },
): Promise<GenerationHistoryItem> {
  return withHistoryLock(async () => {
    const items = await _readGenerationHistoryRaw();
    const now = entry.timestamp || Date.now();
    const id = entry.id || `gen_${now}_${Math.random().toString(36).substring(2, 8)}`;

    const details = parseTypeAndDetails(entry.title || entry.reference, entry);

    const newItem: GenerationHistoryItem = {
      id,
      type: entry.type || details.type,
      title: entry.title || details.reference,
      reference: entry.reference || details.reference,
      surah: entry.surah ?? details.surah,
      ayah: entry.ayah ?? details.ayah,
      ayahEnd: entry.ayahEnd ?? details.ayahEnd,
      collection: entry.collection ?? details.collection,
      hadithNumber: entry.hadithNumber ?? details.hadithNumber,
      arabicText: entry.arabicText,
      bulgarianText: entry.bulgarianText,
      timestamp: now,
      format: entry.format || "video",
      theme: entry.theme,
      reciter: entry.reciter,
      videoUrl: entry.videoUrl,
      status: entry.status || "completed",
    };

    // Filter out potential immediate duplicate (same title within 2 minutes)
    const filtered = items.filter(
      (x) =>
        !(
          x.title.toLowerCase().trim() === newItem.title.toLowerCase().trim() &&
          Math.abs(x.timestamp - newItem.timestamp) < 2 * 60 * 1000
        ),
    );

    filtered.unshift(newItem);

    // Keep up to 500 generation history items
    const capped = filtered.slice(0, 500);
    await _writeGenerationHistoryRaw(capped);
    return newItem;
  });
}

export async function deleteGenerationEntryDirect(id: string): Promise<void> {
  return withHistoryLock(async () => {
    const items = await _readGenerationHistoryRaw();
    const filtered = items.filter((x) => x.id !== id);
    await _writeGenerationHistoryRaw(filtered);
  });
}

export async function clearGenerationHistoryDirect(): Promise<void> {
  return withHistoryLock(async () => {
    await _writeGenerationHistoryRaw([]);
  });
}

// ---------------------------------------------------------------------------
// TanStack Start Server Functions
// ---------------------------------------------------------------------------

export const listGenerationHistory = createServerFn({ method: "GET" }).handler(
  async (): Promise<GenerationHistoryItem[]> => {
    return getGenerationHistoryDirect();
  },
);

export const addGenerationHistoryEntry = createServerFn({ method: "POST" })
  .validator((input: { entry: Omit<GenerationHistoryItem, "id"> & { id?: string } }) => input)
  .handler(async ({ data: { entry } }): Promise<GenerationHistoryItem> => {
    return recordGenerationEntryDirect(entry);
  });

export const deleteGenerationHistoryEntry = createServerFn({ method: "POST" })
  .validator((input: { id: string }) => input)
  .handler(async ({ data: { id } }): Promise<{ success: boolean }> => {
    await deleteGenerationEntryDirect(id);
    return { success: true };
  });

export const clearAllGenerationHistory = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ success: boolean }> => {
    await clearGenerationHistoryDirect();
    return { success: true };
  },
);

// ---------------------------------------------------------------------------
// 1-Month (30 Days) Cooldown Engine for AI Assistant & Scripture Uniqueness
// ---------------------------------------------------------------------------

export const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function isItemWithinOneMonthCooldown(itemTimestamp: number, now = Date.now()): boolean {
  if (!itemTimestamp || typeof itemTimestamp !== "number") return false;
  const elapsed = now - itemTimestamp;
  // Allow up to 60s future clock skew
  return elapsed >= -60000 && elapsed < THIRTY_DAYS_MS;
}

export function getCooldownDaysRemaining(itemTimestamp: number, now = Date.now()): number {
  if (!itemTimestamp || typeof itemTimestamp !== "number") return 0;
  const elapsed = now - itemTimestamp;
  if (elapsed >= THIRTY_DAYS_MS || elapsed < -60000) return 0;
  return Math.max(1, Math.ceil((THIRTY_DAYS_MS - elapsed) / (24 * 60 * 60 * 1000)));
}

export interface ExcludedScripturesData {
  items: GenerationHistoryItem[];
  ayahKeys: Set<string>; // e.g. "112:1"
  hadithKeys: Set<string>; // e.g. "bukhari:6424"
  ayahList: Array<{
    surah: number;
    ayah: number;
    ayahEnd?: number;
    ref: string;
    title: string;
    daysRemaining: number;
    timestamp: number;
  }>;
  hadithList: Array<{
    collection: string;
    number: string | number;
    ref: string;
    title: string;
    daysRemaining: number;
    timestamp: number;
  }>;
  otherList: Array<{
    title: string;
    ref: string;
    daysRemaining: number;
    timestamp: number;
  }>;
  formattedExclusionPrompt: string;
}

export async function getExcludedScripturesOneMonth(now = Date.now()): Promise<ExcludedScripturesData> {
  const allHistory = await getGenerationHistoryDirect();
  const recentItems = allHistory.filter((item) => isItemWithinOneMonthCooldown(item.timestamp, now));

  const ayahKeys = new Set<string>();
  const hadithKeys = new Set<string>();
  const ayahList: ExcludedScripturesData["ayahList"] = [];
  const hadithList: ExcludedScripturesData["hadithList"] = [];
  const otherList: ExcludedScripturesData["otherList"] = [];

  const seenKeys = new Set<string>();

  for (const item of recentItems) {
    const daysRemaining = getCooldownDaysRemaining(item.timestamp, now);
    if (item.type === "ayah" || (item.surah && item.ayah)) {
      const s = Number(item.surah);
      const a = Number(item.ayah);
      const aEnd = item.ayahEnd ? Number(item.ayahEnd) : undefined;
      const key = `${s}:${a}${aEnd ? `-${aEnd}` : ""}`;

      if (s && a) {
        if (!seenKeys.has(`ayah:${key}`)) {
          seenKeys.add(`ayah:${key}`);
          ayahList.push({
            surah: s,
            ayah: a,
            ayahEnd: aEnd,
            ref: item.reference || `Сура ${s}:${a}`,
            title: item.title,
            daysRemaining,
            timestamp: item.timestamp,
          });
        }
        // Mark individual ayahs as keys too
        const end = aEnd || a;
        for (let num = a; num <= end; num++) {
          ayahKeys.add(`${s}:${num}`);
        }
      } else {
        if (!seenKeys.has(`other:${item.title}`)) {
          seenKeys.add(`other:${item.title}`);
          otherList.push({
            title: item.title,
            ref: item.reference || item.title,
            daysRemaining,
            timestamp: item.timestamp,
          });
        }
      }
    } else if (item.type === "hadith" || (item.collection && item.hadithNumber)) {
      const c = (item.collection || "bukhari").toLowerCase().trim();
      const n = item.hadithNumber || "";
      const key = `${c}:${n}`;

      if (n) {
        if (!seenKeys.has(`hadith:${key}`)) {
          seenKeys.add(`hadith:${key}`);
          hadithList.push({
            collection: c,
            number: n,
            ref: item.reference || item.title,
            title: item.title,
            daysRemaining,
            timestamp: item.timestamp,
          });
        }
        hadithKeys.add(key);
      } else {
        if (!seenKeys.has(`other:${item.title}`)) {
          seenKeys.add(`other:${item.title}`);
          otherList.push({
            title: item.title,
            ref: item.reference || item.title,
            daysRemaining,
            timestamp: item.timestamp,
          });
        }
      }
    } else {
      if (!seenKeys.has(`other:${item.title}`)) {
        seenKeys.add(`other:${item.title}`);
        otherList.push({
          title: item.title,
          ref: item.reference || item.title,
          daysRemaining,
          timestamp: item.timestamp,
        });
      }
    }
  }

  let formattedExclusionPrompt = "";
  if (recentItems.length > 0) {
    const lines: string[] = [
      `=== СТРИКТНО ЗАБРАНЕНИ АЯТИ И ХАДИСИ (1 МЕСЕЦ / 30 ДНИ ПАУЗА ЗА УНИКАЛНОСТ) ===`,
      `ПОТРЕБИТЕЛЯТ Е ЗАДАЛ СТРОГО ПРАВИЛО: Всеки генериран аят и хадис от регистъра има 1 МЕСЕЦ (30 дни) период на охлаждане!`,
      `СТРИКТНО Е ЗАБРАНЕНО ДА ГИ ПРЕДЛАГАШ, ДА ГИ ДАВАШ ИЛИ ДА ГЕНЕРИРАШ ВИДЕО ЗА ТЯХ ПРЕЗ ТОЗИ ПЕРИОД!`,
    ];

    if (ayahList.length > 0) {
      lines.push(`\n⛔ ЗАБРАНЕНИ АЯТИ ОТ КОРАНА (генерирани преди по-малко от 30 дни):`);
      ayahList.forEach((a) => {
        lines.push(`- Сура ${a.surah}:${a.ayah}${a.ayahEnd && a.ayahEnd > a.ayah ? `-${a.ayahEnd}` : ""} [${a.title}] (остават още ${a.daysRemaining} дни забрана)`);
      });
    }

    if (hadithList.length > 0) {
      lines.push(`\n⛔ ЗАБРАНЕНИ ХАДИСИ (генерирани преди по-малко от 30 дни):`);
      hadithList.forEach((h) => {
        lines.push(`- Хадис: ${h.ref || h.title} [${h.collection} #${h.number}] (остават още ${h.daysRemaining} дни забрана)`);
      });
    }

    if (otherList.length > 0) {
      lines.push(`\n⛔ ДРУГИ СКОРОШНО ГЕНЕРИРАНИ ТЕМИ (остават още до 30 дни забрана):`);
      otherList.slice(0, 10).forEach((o) => {
        lines.push(`- ${o.title} (остават още ${o.daysRemaining} дни забрана)`);
      });
    }

    lines.push(`\nИЗКЛЮЧИТЕЛНО ВАЖНО: Избери НАПЪЛНО ДРУГ, НЕПОВТОРЕН автентичен аят или Сахих хадис, който НЕ е в горния списък!`);
    lines.push(`========================================================================`);
    formattedExclusionPrompt = lines.join("\n");
  }

  return {
    items: recentItems,
    ayahKeys,
    hadithKeys,
    ayahList,
    hadithList,
    otherList,
    formattedExclusionPrompt,
  };
}

export interface CooldownCheckResult {
  isBlocked: boolean;
  reason?: string;
  daysRemaining?: number;
  matchedItem?: GenerationHistoryItem;
}

export function checkProposalOneMonthCooldown(
  proposal: {
    type?: string;
    title?: string;
    reference?: string;
    surah?: number | string;
    ayah?: number | string;
    count?: number | string;
    collection?: string;
    number?: number | string;
    hadithNumber?: number | string;
    summaryBg?: string;
    themeBg?: string;
  },
  recentItems: GenerationHistoryItem[],
  now = Date.now(),
): CooldownCheckResult {
  if (!proposal || !recentItems || recentItems.length === 0) {
    return { isBlocked: false };
  }

  const activeItems = recentItems.filter((item) => isItemWithinOneMonthCooldown(item.timestamp, now));
  if (activeItems.length === 0) {
    return { isBlocked: false };
  }

  const propSurah = proposal.surah !== undefined && proposal.surah !== "" ? Number(proposal.surah) : undefined;
  const propAyah = proposal.ayah !== undefined && proposal.ayah !== "" ? Number(proposal.ayah) : undefined;
  const propCount = proposal.count !== undefined && proposal.count !== "" ? Number(proposal.count) : 1;
  const propAyahEnd = propAyah ? propAyah + propCount - 1 : undefined;

  const propCollection = (proposal.collection || "").toLowerCase().trim();
  const propHadithNum = proposal.hadithNumber !== undefined ? String(proposal.hadithNumber).trim() : proposal.number !== undefined ? String(proposal.number).trim() : undefined;

  const cleanTitle = (proposal.title || "").toLowerCase();
  const cleanRef = (proposal.reference || "").toLowerCase();

  // Try extracting colon match from proposal title/reference if surah:ayah not explicitly set
  let extractedSurah = propSurah;
  let extractedAyah = propAyah;
  let extractedAyahEnd = propAyahEnd;
  if (!extractedSurah || !extractedAyah) {
    const colonMatch = (proposal.title || proposal.reference || "").match(/\b(\d{1,3})\s*[:.]\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?\b/);
    if (colonMatch) {
      extractedSurah = parseInt(colonMatch[1], 10);
      extractedAyah = parseInt(colonMatch[2], 10);
      if (colonMatch[3]) extractedAyahEnd = parseInt(colonMatch[3], 10);
    }
  }

  for (const item of activeItems) {
    const days = getCooldownDaysRemaining(item.timestamp, now);
    const itemSurah = item.surah !== undefined ? Number(item.surah) : undefined;
    const itemAyah = item.ayah !== undefined ? Number(item.ayah) : undefined;
    const itemAyahEnd = item.ayahEnd !== undefined ? Number(item.ayahEnd) : itemAyah;

    // 1. Check Ayah collision
    if (extractedSurah && extractedAyah) {
      if (itemSurah === extractedSurah) {
        if (itemAyah !== undefined) {
          const cStart = extractedAyah;
          const cEnd = extractedAyahEnd || extractedAyah;
          const iStart = itemAyah;
          const iEnd = itemAyahEnd || itemAyah;

          if (cStart <= iEnd && cEnd >= iStart) {
            return {
              isBlocked: true,
              reason: `Аят от Корана (Сура ${extractedSurah}:${cStart}${cEnd > cStart ? `-${cEnd}` : ""}) вече беше генериран на ${new Date(item.timestamp).toLocaleDateString("bg-BG")} и е в 30-дневна пауза (остават още ${days} ${days === 1 ? "ден" : "дни"}).`,
              daysRemaining: days,
              matchedItem: item,
            };
          }
        }
      }
    }

    // 2. Check Hadith collision
    if (propHadithNum && (proposal.type === "hadith" || propCollection || item.type === "hadith")) {
      const itemColl = (item.collection || "").toLowerCase().trim();
      const itemNum = item.hadithNumber !== undefined ? String(item.hadithNumber).trim() : undefined;

      const collMatches =
        !propCollection ||
        !itemColl ||
        propCollection === itemColl ||
        (propCollection.includes("bukhari") && itemColl.includes("bukhari")) ||
        (propCollection.includes("бухари") && itemColl.includes("bukhari")) ||
        (propCollection.includes("muslim") && itemColl.includes("muslim")) ||
        (propCollection.includes("муслим") && itemColl.includes("muslim")) ||
        (propCollection.includes("nawawi") && itemColl.includes("nawawi")) ||
        (propCollection.includes("навауи") && itemColl.includes("nawawi")) ||
        (propCollection.includes("tirmidhi") && itemColl.includes("tirmidhi")) ||
        (propCollection.includes("тирмизи") && itemColl.includes("tirmidhi"));

      if (collMatches && itemNum && propHadithNum === itemNum) {
        return {
          isBlocked: true,
          reason: `Хадис (${item.title || item.reference || `${itemColl} #${itemNum}`}) вече беше генериран на ${new Date(item.timestamp).toLocaleDateString("bg-BG")} и е в 30-дневна пауза (остават още ${days} ${days === 1 ? "ден" : "дни"}).`,
          daysRemaining: days,
          matchedItem: item,
        };
      }
    }

    // 3. Exact or high title/reference similarity check
    const iTitle = (item.title || "").toLowerCase().trim();
    const iRef = (item.reference || "").toLowerCase().trim();

    if (cleanTitle && iTitle) {
      if (cleanTitle === iTitle || (cleanTitle.length > 10 && iTitle.includes(cleanTitle)) || (iTitle.length > 10 && cleanTitle.includes(iTitle))) {
        return {
          isBlocked: true,
          reason: `Съдържание със заглавие „${item.title}“ вече беше генерирано на ${new Date(item.timestamp).toLocaleDateString("bg-BG")} и е в 30-дневна пауза (остават още ${days} ${days === 1 ? "ден" : "дни"}).`,
          daysRemaining: days,
          matchedItem: item,
        };
      }
    }

    if (cleanRef && iRef && cleanRef === iRef) {
      return {
        isBlocked: true,
        reason: `Цитат с референция „${item.reference}“ вече беше генериран на ${new Date(item.timestamp).toLocaleDateString("bg-BG")} и е в 30-дневна пауза (остават още ${days} ${days === 1 ? "ден" : "дни"}).`,
        daysRemaining: days,
        matchedItem: item,
      };
    }
  }

  return { isBlocked: false };
}

export const getOneMonthCooldownSummary = createServerFn({ method: "GET" }).handler(
  async () => {
    const data = await getExcludedScripturesOneMonth();
    return {
      activeCount: data.items.length,
      totalBlocked: data.items.length,
      ayahCount: data.ayahList.length,
      hadithCount: data.hadithList.length,
      otherCount: data.otherList.length,
      ayahs: data.ayahList.map((a) => ({
        ...a,
        key: `${a.surah}:${a.ayah}${a.ayahEnd ? `-${a.ayahEnd}` : ""}`,
      })),
      hadiths: data.hadithList.map((h) => ({
        ...h,
        key: `${h.collection}:${h.number}`,
      })),
      others: data.otherList.map((o, idx) => ({
        ...o,
        key: `other_${idx}_${o.ref}`,
      })),
    };
  },
);

export const checkScriptureCooldown = createServerFn({ method: "POST" })
  .validator((input: {
    type?: string;
    surah?: number | string;
    ayah?: number | string;
    count?: number | string;
    collection?: string;
    number?: number | string;
    hadithNumber?: number | string;
    title?: string;
    reference?: string;
  }) => input)
  .handler(async ({ data }): Promise<CooldownCheckResult> => {
    const exclusion = await getExcludedScripturesOneMonth();
    return checkProposalOneMonthCooldown(data, exclusion.items);
  });

