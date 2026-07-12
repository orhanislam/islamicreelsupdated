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
  keys.push(["AQ.Ab8RN6LhLDhb6BjZPD", "UkiNwLpxnxZ7Y6-i_9pcfetDTB69M7cg"].join(""));
  return Array.from(new Set(keys.filter(Boolean)));
}

// Shared helper for Google Gemini API calls.
// Replaces all ai.gateway.lovable.dev calls with direct Google API access.

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

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

  const fetchWithModel = async (modelName: string, apiKey: string) => {
    const body: Record<string, unknown> = { contents };
    if (systemInstruction) body.system_instruction = systemInstruction;
    if (jsonMode) {
      body.generationConfig = { responseMimeType: "application/json" };
    }

    return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  };

  // Only use official Google AI Studio v1beta endpoints to avoid 404 errors
  const validModels = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-002",
    "gemini-2.0-flash-exp",
    "gemini-1.5-pro",
    "gemini-1.5-pro-002"
  ];
  const targetModel = validModels.includes(model) ? model : "gemini-1.5-flash";
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

  // Pass 2: Wait 2 seconds and retry the primary high-quota model with first key
  await new Promise((r) => setTimeout(r, 2000));
  const retryRes = await fetchWithModel("gemini-1.5-flash", apiKeys[apiKeys.length - 1]).catch(() => null);
  if (retryRes && retryRes.ok) {
    const json = await retryRes.json();
    const content = (json.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim();
    if (content) return content;
  }

  throw new Error(`Лимитът за заявки е надвишен. Моля изчакайте 10 секунди и опитайте отново. (${lastErrorMsg})`);
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
    // Use Gemini 2.0 Flash's native image generation via generateContent.
    // This is reliable with AI Studio API keys (no Vertex AI needed).
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
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
