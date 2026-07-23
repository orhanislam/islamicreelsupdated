import { createServerFn } from "@tanstack/react-start";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export type UsageHistoryEntry = {
  type: "quran" | "hadith";
  identifier: string; // e.g. "quran:2:255" or "hadith:nawawi40:1"
  timestamp: number;
};

export type AiMemory = {
  userName?: string;
  preferredStyle?: "hormozi" | "emerald" | "neon" | "classic";
  customInstructions: string[];
  learnedFacts: string[];
  usageHistory?: UsageHistoryEntry[];
};

const getMemoryFilePath = () => {
  const dir = path.join(os.homedir(), ".islamicreels_jobs");
  return path.join(dir, "assistant_memory.json");
};

async function ensureMemoryDir() {
  const dir = path.join(os.homedir(), ".islamicreels_jobs");
  await fs.mkdir(dir, { recursive: true }).catch(() => {});
}

export const getAiMemory = createServerFn({ method: "GET" })
  .handler(async (): Promise<AiMemory> => {
    try {
      const filePath = getMemoryFilePath();
      const txt = await fs.readFile(filePath, "utf-8");
      return JSON.parse(txt);
    } catch {
      return {
        customInstructions: [
          "Винаги бъди изключително учтив и уважителен към ислямските текстове.",
          "Предпочитай красиви фонови видеа с висока резолюция 9:16.",
        ],
        learnedFacts: [],
        usageHistory: [],
      };
    }
  });

export const updateAiMemory = createServerFn({ method: "POST" })
  .validator((input: { memory: AiMemory }) => input)
  .handler(async ({ data: { memory } }): Promise<AiMemory> => {
    await ensureMemoryDir();
    const filePath = getMemoryFilePath();
    
    // Auto-prune usageHistory older than 30 days before saving
    if (memory.usageHistory) {
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      const now = Date.now();
      memory.usageHistory = memory.usageHistory.filter(entry => (now - entry.timestamp) <= thirtyDaysMs);
    } else {
      memory.usageHistory = [];
    }

    await fs.writeFile(filePath, JSON.stringify(memory, null, 2), "utf-8");
    return memory;
  });

export const recordProposalUsages = createServerFn({ method: "POST" })
  .validator((input: { proposals: Array<any> }) => input)
  .handler(async ({ data: { proposals } }): Promise<void> => {
    if (!proposals || proposals.length === 0) return;
    
    const memory = await getAiMemory();
    const history = memory.usageHistory || [];
    const now = Date.now();
    let hasNew = false;

    for (const p of proposals) {
      if (!p) continue;
      let identifier = "";
      if (p.type === "quran" && p.surah && p.ayah) {
        identifier = `quran:${p.surah}:${p.ayah}`;
      } else if (p.type === "hadith" && p.collection && p.number) {
        identifier = `hadith:${p.collection}:${p.number}`;
      }

      if (identifier) {
        // Prevent immediate duplicates
        if (!history.find(x => x.identifier === identifier)) {
          history.push({ type: p.type, identifier, timestamp: now });
          hasNew = true;
        }
      }
    }

    if (hasNew) {
      memory.usageHistory = history;
      await updateAiMemory({ data: { memory } });
    }
  });
