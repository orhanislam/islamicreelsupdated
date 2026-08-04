import fs from "node:fs";
import path from "node:path";

function getApiKeys(): string[] {
  const keys: string[] = [];
  try {
    const envPath = path.resolve(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      const matches = Array.from(content.matchAll(/GEMINI_API_KEY=["']?([^"'\r\n]+)["']?/g));
      if (matches.length > 0) {
        keys.push(matches[matches.length - 1][1].trim());
      }
    }
  } catch {}
  if (process.env.GEMINI_API_KEY) keys.push(process.env.GEMINI_API_KEY);
  return Array.from(new Set(keys.filter(Boolean)));
}

// Shared helper for Google Gemini API calls.
// Replaces all ai.gateway.lovable.dev calls with direct Google API access.

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

/**
 * Call the Google Gemini API (OpenAI-compatible endpoint) for chat completions.
 * Used by: captions, translations, suggestions, background ideas, Pexels analysis.
 */
export async function geminiChat(
  model: string,
  messages: ChatMessage[],
  jsonMode = false,
): Promise<string> {
  const apiKeys = getApiKeys();
  if (!apiKeys.length) throw new Error("GEMINI_API_KEY не е конфигуриран в .env");

  // Convert OpenAI messages to Gemini format
  let systemInstruction: any = undefined;
  const contents = messages
    .filter((m) => {
      if (m.role === "system") { systemInstruction = { parts: [{ text: m.content }] }; return false; }
      return true;
    })
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  if (contents.length === 0) {
    // Google Gemini API rejects generateContent if contents array is empty (INVALID_ARGUMENT 400).
    // Ensure there is always a user turn even if only system message was passed.
    contents.push({
      role: "user",
      parts: [{ text: systemInstruction?.parts?.[0]?.text || "Моля, изпълни инструкцията." }],
    });
  }

  const fetchWithModel = async (modelName: string, apiKey: string) => {
    const body: Record<string, unknown> = { contents };
    if (systemInstruction) body.system_instruction = systemInstruction;
    if (jsonMode) {
      body.generationConfig = { responseMimeType: "application/json", temperature: 1.2 };
    } else {
      body.generationConfig = { temperature: 1.2 };
    }

    return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  };

  // Prioritize gemini-3.6-flash first
  const validModels = [
    "gemini-3.6-flash",
    "gemini-3.5-flash-lite",
    "gemini-omni-flash-preview"
  ];
  const targetModel = model || "gemini-3.6-flash";
  const uniqueModels = Array.from(new Set([targetModel, ...validModels]));
  let lastErrorMsg = "";

  // Pass 1: Try each API key and each model immediately
  for (const currentKey of apiKeys) {
    for (const currentModel of uniqueModels) {
      const res = await fetchWithModel(currentModel, currentKey).catch(() => null);
      if (res && res.ok) {
        const json = await res.json();
        const content = (json.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim();
        if (content) return content;
      }
      if (res) {
        const txt = await res.text().catch(() => "");
        lastErrorMsg = `[${currentModel} статус ${res.status}] ${txt.slice(0, 150)}`;
      }
    }
  }

  // Pass 2: Wait 2 seconds and retry gemini-3.6-flash
  await new Promise((r) => setTimeout(r, 2000));
  const retryRes = await fetchWithModel("gemini-3.6-flash", apiKeys[apiKeys.length - 1]).catch(() => null);
  if (retryRes && retryRes.ok) {
    const json = await retryRes.json();
    const content = (json.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim();
    if (content) return content;
  }

  if (lastErrorMsg.includes("429") || lastErrorMsg.includes("quota") || lastErrorMsg.includes("ResourceExhausted")) {
    throw new Error(`Лимитът за заявки е надвишен. Моля изчакайте 10 секунди и опитайте отново. (${lastErrorMsg})`);
  }
  throw new Error(`Грешка при генерация от AI: ${lastErrorMsg || "Неуспешно свързване с Gemini API"}`);
}

/**
 * Analyzes an image (base64) using Gemini 2.5 Flash Vision.
 * Used for Haram filtering.
 */
export async function geminiImageAnalysis(
  images: { base64: string; mimeType: string }[],
  prompt: string,
): Promise<string> {
  const apiKeys = getApiKeys();
  if (!apiKeys.length) throw new Error("GEMINI_API_KEY не е конфигуриран в .env");

  const imageParts = images.map((img) => ({
    inlineData: { mimeType: img.mimeType, data: img.base64 },
  }));

  const contents = [
    {
      role: "user",
      parts: [
        { text: prompt },
        ...imageParts,
      ],
    },
  ];

  let lastErrorMsg = "";
  for (const apiKey of apiKeys) {
    try {
      const body = { contents, generationConfig: { temperature: 0.1 } };
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        lastErrorMsg = `${res.status} ${res.statusText} - ${await res.text()}`;
        continue;
      }
      const json = await res.json();
      const content = (json.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim();
      if (content) return content;
    } catch (e: any) {
      lastErrorMsg = e.message;
    }
  }
  throw new Error(`Грешка при визуален анализ от AI: ${lastErrorMsg}`);
}

/**
 * Generate an image using Google Imagen 3 via the Gemini API.
 * Used by: background image generation (replaces openai/gpt-image-2 via Lovable).
 */
export async function geminiGenerateImage(
  prompt: string,
): Promise<{ base64: string; mimeType: string }> {
  const apiKeys = getApiKeys();
  if (!apiKeys.length) throw new Error("GEMINI_API_KEY не е конфигуриран в .env");

  let lastError = "";
  for (const apiKey of apiKeys) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Generate a photorealistic, stunning vertical (9:16 aspect ratio) cinematic background image for an Islamic short video. Topic/Mood: ${prompt}. No text, no words, no people's faces. Pure atmospheric cinematic visuals.`,
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
          },
        }),
      },
    ).catch(() => null);

    if (res && res.ok) {
      const json = await res.json();
      const parts = json.candidates?.[0]?.content?.parts ?? [];
      for (const p of parts) {
        if (p.inlineData?.data) {
          return {
            base64: p.inlineData.data,
            mimeType: p.inlineData.mimeType || "image/png",
          };
        }
      }
    }
    if (res) {
      const errTxt = await res.text().catch(() => "");
      lastError = `[статус ${res.status}] ${errTxt.slice(0, 150)}`;
    }
  }

  throw new Error(`Грешка при генериране на изображение от Gemini: ${lastError}`);
}

/**
 * Uses Gemini to perfectly align translated text (Bulgarian) to exact Arabic word timings.
 * Returns an array of word timings for the target language.
 */
export async function alignCrossLingualSubtitles(
  ayahBounds: any[]
): Promise<{ word: string; start: number; end: number }[]> {
  const apiKeys = getApiKeys();
  if (!apiKeys.length) throw new Error("GEMINI_API_KEY не е конфигуриран в .env");

  const promptText = `Ти си експерт по видео субтитри и лингвистика. Твоята задача е да синхронизираш БЪЛГАРСКИТЕ преведени думи с точните времеви маркери (start/end) на изговорените АРАБСКИ думи.
По-долу има списък с аяти. За всеки аят имаш:
1. Арабските думи и техните точни времеви маркери в секунди.
2. Българският превод за този аят.

Моля, разпредели българските думи по време, така че да съвпадат максимално точно със смисъла на арабските думи. Ако една българска дума покрива няколко арабски, събери времето им. Ако няколко български думи покриват една арабска, раздели времето й по равно между тях. Българските думи трябва да са в оригиналния си ред. Времевите маркери трябва да са плавни и логични (да не избързват).

ВЪРНИ САМО ВАЛИДЕН JSON масив от обекти, без markdown форматиране, без обяснения. Формат:
[
  { "word": "Слава", "start": 0.52, "end": 0.95 },
  { "word": "на", "start": 0.95, "end": 1.2 }
]

Ето данните за синхронизация:
${ayahBounds.map(a => `
АЯТ ${a.ayah}:
Български превод: ${a.bulgarian}
Арабски тайминги: ${JSON.stringify(a.segments?.map((s:any) => ({ word: s.arabic, start: s.start, end: s.end })) || [])}
`).join('\n')}
`;

  try {
    const rawResponse = await geminiChat("gemini-3.6-flash", [
      { role: "user", content: promptText }
    ], false);
    
    const jsonStr = rawResponse.replace(/```json/g, "").replace(/```/g, "").trim();
    const timings = JSON.parse(jsonStr);
    return Array.isArray(timings) ? timings : [];
  } catch (e) {
    console.warn("[gemini] Cross-lingual alignment failed to parse JSON:", e);
    return [];
  }
}
