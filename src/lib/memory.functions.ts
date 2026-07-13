import { createServerFn } from "@tanstack/react-start";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export type AiMemory = {
  userName?: string;
  preferredStyle?: "hormozi" | "emerald" | "neon" | "classic";
  customInstructions: string[];
  learnedFacts: string[];
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
      };
    }
  });

export const updateAiMemory = createServerFn({ method: "POST" })
  .validator((input: { memory: AiMemory }) => input)
  .handler(async ({ data: { memory } }): Promise<AiMemory> => {
    await ensureMemoryDir();
    const filePath = getMemoryFilePath();
    await fs.writeFile(filePath, JSON.stringify(memory, null, 2), "utf-8");
    return memory;
  });
