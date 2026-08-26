import { createServerFn } from "@tanstack/react-start";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { type TawheedPillar, TAWHEED_TAXONOMY } from "./tawheed-taxonomy";

export type UsageHistoryEntry = {
  type: "quran" | "hadith" | "carousel";
  identifier: string; // e.g. "quran:2:255", "hadith:nawawi40:1", or "carousel:rububiyyah:qadr"
  title?: string;
  hook?: string;
  pillar?: TawheedPillar;
  subtopicId?: string;
  timestamp: number;
};

export interface CarouselHistoryEntry {
  id: string;
  type: "carousel";
  pillar?: TawheedPillar;
  subtopicId?: string;
  title: string;
  hook: string;
  premise?: string;
  timestamp: number;
}

export type AiMemory = {
  userName?: string;
  preferredStyle?: "hormozi" | "emerald" | "neon" | "classic";
  customInstructions: string[];
  learnedFacts: string[];
  usageHistory?: UsageHistoryEntry[];
  carouselHistory?: CarouselHistoryEntry[];
};

export const getMemoryFilePath = () => {
  const dir = path.join(os.homedir(), ".islamicreels_jobs");
  return path.join(dir, "assistant_memory.json");
};

export async function ensureMemoryDir() {
  const dir = path.join(os.homedir(), ".islamicreels_jobs");
  await fs.mkdir(dir, { recursive: true }).catch(() => {});
}

let memoryLock: Promise<unknown> = Promise.resolve();

function withMemoryLock<T>(action: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    memoryLock = memoryLock
      .catch(() => {})
      .then(action)
      .then(resolve, reject);
  });
}

async function _readAiMemoryRaw(): Promise<AiMemory> {
  try {
    const filePath = getMemoryFilePath();
    const txt = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(txt);
    return {
      customInstructions: parsed.customInstructions || [
        "Винаги бъди изключително учтив и уважителен към ислямските текстове.",
        "Предпочитай красиви фонови видеа с висока резолюция 9:16.",
      ],
      learnedFacts: parsed.learnedFacts || [],
      usageHistory: Array.isArray(parsed.usageHistory) ? parsed.usageHistory : [],
      carouselHistory: Array.isArray(parsed.carouselHistory) ? parsed.carouselHistory : [],
      userName: parsed.userName,
      preferredStyle: parsed.preferredStyle,
    };
  } catch {
    return {
      customInstructions: [
        "Винаги бъди изключително учтив и уважителен към ислямските текстове.",
        "Предпочитай красиви фонови видеа с висока резолюция 9:16.",
      ],
      learnedFacts: [],
      usageHistory: [],
      carouselHistory: [],
    };
  }
}

async function _writeAiMemoryRaw(memory: AiMemory): Promise<AiMemory> {
  await ensureMemoryDir();
  const filePath = getMemoryFilePath();

  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const now = Date.now();

  // Auto-prune usageHistory older than 30 days before saving
  if (memory.usageHistory) {
    memory.usageHistory = memory.usageHistory.filter(
      (entry) => now - entry.timestamp <= thirtyDaysMs,
    );
  } else {
    memory.usageHistory = [];
  }

  // Auto-prune carouselHistory (older than 30 days and keep latest 100)
  if (memory.carouselHistory) {
    memory.carouselHistory = memory.carouselHistory
      .filter((entry) => now - entry.timestamp <= thirtyDaysMs)
      .slice(-100);
  } else {
    memory.carouselHistory = [];
  }

  await fs.writeFile(filePath, JSON.stringify(memory, null, 2), "utf-8");
  return memory;
}

export async function readAiMemory(): Promise<AiMemory> {
  return withMemoryLock(() => _readAiMemoryRaw());
}

export async function writeAiMemory(memory: AiMemory): Promise<AiMemory> {
  return withMemoryLock(() => _writeAiMemoryRaw(memory));
}

export function findTaxonomyMatch(title: string, summary?: string, hook?: string) {
  const query = `${title} ${summary || ""} ${hook || ""}`.toLowerCase();
  for (const item of TAWHEED_TAXONOMY) {
    if (
      query.includes(item.id.toLowerCase()) ||
      query.includes(item.titleBg.toLowerCase()) ||
      item.titleBg.toLowerCase().includes(title.toLowerCase())
    ) {
      return item;
    }
  }
  return undefined;
}

export async function recordCarouselProposalUsageDirect(
  entry: Omit<CarouselHistoryEntry, "timestamp"> & { timestamp?: number },
): Promise<void> {
  if (!entry || !entry.title) return;
  return withMemoryLock(async () => {
    const memory = await _readAiMemoryRaw();
    const carouselHistory = memory.carouselHistory || [];
    const now = entry.timestamp || Date.now();

    const matchedTaxonomy =
      !entry.pillar || !entry.subtopicId
        ? findTaxonomyMatch(entry.title, entry.premise, entry.hook)
        : undefined;

    const finalPillar = entry.pillar || matchedTaxonomy?.pillar || "rububiyyah";
    const finalSubtopicId = entry.subtopicId || matchedTaxonomy?.id || `carousel:${Date.now()}`;

    const normalizedHook = (entry.hook || entry.title).trim();

    // Check for exact duplicate hook in recent history
    const existingIdx = carouselHistory.findIndex(
      (x) => x.hook.toLowerCase() === normalizedHook.toLowerCase(),
    );

    if (existingIdx === -1) {
      const record: CarouselHistoryEntry = {
        id: entry.id || `carousel_${now}_${Math.random().toString(36).substring(2, 7)}`,
        type: "carousel",
        pillar: finalPillar,
        subtopicId: finalSubtopicId,
        title: entry.title,
        hook: normalizedHook,
        premise: entry.premise || "",
        timestamp: now,
      };

      carouselHistory.push(record);
      memory.carouselHistory = carouselHistory;

      // Also maintain backward-compatible usageHistory entry
      const usageHistory = memory.usageHistory || [];
      const usageId = `carousel:${finalSubtopicId}`;
      if (!usageHistory.find((x) => x.identifier === usageId)) {
        usageHistory.push({
          type: "carousel",
          identifier: usageId,
          title: entry.title,
          hook: normalizedHook,
          pillar: finalPillar,
          subtopicId: finalSubtopicId,
          timestamp: now,
        });
        memory.usageHistory = usageHistory;
      }

      await _writeAiMemoryRaw(memory);
    }
  });
}

export async function getRecentCarouselHistoryDirect(
  limit: number = 20,
): Promise<CarouselHistoryEntry[]> {
  const memory = await readAiMemory();
  const history = memory.carouselHistory || [];
  return history.slice(-limit);
}

export interface ProposalRecord {
  type?: string;
  title?: string;
  surah?: number | string;
  ayah?: number | string;
  collection?: string;
  number?: number | string;
  summaryBg?: string;
  subtopicId?: string;
  pillar?: TawheedPillar;
  carouselSlides?: Array<{
    topTitle?: string;
    mainText?: string;
    bottomText?: string;
    footerText?: string;
    imagePrompt?: string;
  }>;
}

export async function recordProposalUsagesDirect(proposals: Array<ProposalRecord>): Promise<void> {
  if (!proposals || proposals.length === 0) return;
  return withMemoryLock(async () => {
    const memory = await _readAiMemoryRaw();
    const history = memory.usageHistory || [];
    const carouselHistory = memory.carouselHistory || [];
    const now = Date.now();
    let hasNew = false;

    for (const p of proposals) {
      if (!p) continue;

      if (p.type === "carousel") {
        const slides = Array.isArray(p.carouselSlides) ? p.carouselSlides : [];
        const hookSlide = slides[0];
        const hookText = hookSlide?.mainText || hookSlide?.topTitle || p.summaryBg || p.title || "";
        const premiseText = p.summaryBg || slides[1]?.mainText || "";
        const matchedTaxonomy = findTaxonomyMatch(p.title || "", premiseText, hookText);

        const subtopicId = p.subtopicId || matchedTaxonomy?.id || `carousel_${now}`;
        const pillar = p.pillar || matchedTaxonomy?.pillar || "rububiyyah";
        const title = p.title || "Карусел";

        const existingCarousel = carouselHistory.find(
          (c) => c.hook.toLowerCase() === hookText.toLowerCase(),
        );

        if (!existingCarousel) {
          carouselHistory.push({
            id: `carousel_${now}_${Math.random().toString(36).substring(2, 7)}`,
            type: "carousel",
            pillar,
            subtopicId,
            title,
            hook: hookText,
            premise: premiseText,
            timestamp: now,
          });
          hasNew = true;
        }

        const identifier = `carousel:${subtopicId}`;
        if (!history.find((x) => x.identifier === identifier)) {
          history.push({
            type: "carousel",
            identifier,
            title,
            hook: hookText,
            pillar,
            subtopicId,
            timestamp: now,
          });
          hasNew = true;
        }
        continue;
      }

      let identifier = "";
      if (p.type === "quran" && p.surah && p.ayah) {
        identifier = `quran:${p.surah}:${p.ayah}`;
      } else if (p.type === "hadith" && p.collection && p.number) {
        identifier = `hadith:${p.collection}:${p.number}`;
      }

      if (identifier) {
        // Prevent immediate duplicates
        if (!history.find((x) => x.identifier === identifier)) {
          history.push({ type: p.type as "quran" | "hadith", identifier, timestamp: now });
          hasNew = true;
        }
      }
    }

    if (hasNew) {
      memory.usageHistory = history;
      memory.carouselHistory = carouselHistory;
      await _writeAiMemoryRaw(memory);
    }
  });
}

// ---------------------------------------------------------------------------
// TanStack Start Server Functions
// ---------------------------------------------------------------------------

export const getAiMemory = createServerFn({ method: "GET" }).handler(
  async (): Promise<AiMemory> => {
    return readAiMemory();
  },
);

export const updateAiMemory = createServerFn({ method: "POST" })
  .validator((input: { memory: AiMemory }) => input)
  .handler(async ({ data: { memory } }): Promise<AiMemory> => {
    return writeAiMemory(memory);
  });

export const recordCarouselProposalUsage = createServerFn({ method: "POST" })
  .validator(
    (input: { entry: Omit<CarouselHistoryEntry, "timestamp"> & { timestamp?: number } }) => input,
  )
  .handler(async ({ data: { entry } }): Promise<void> => {
    return recordCarouselProposalUsageDirect(entry);
  });

export const getRecentCarouselHistory = createServerFn({ method: "GET" })
  .validator((input?: { limit?: number }) => input)
  .handler(async ({ data }): Promise<CarouselHistoryEntry[]> => {
    const limit = data?.limit ?? 20;
    return getRecentCarouselHistoryDirect(limit);
  });

export const recordProposalUsages = createServerFn({ method: "POST" })
  .validator((input: { proposals: Array<ProposalRecord> }) => input)
  .handler(async ({ data: { proposals } }): Promise<void> => {
    return recordProposalUsagesDirect(proposals);
  });
