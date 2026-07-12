import fs from "node:fs";
import path from "node:path";

function getApiKey(): string {
  try {
    const envPath = path.resolve(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      const match = content.match(/GEMINI_API_KEY=["']?([^"'\r\n]+)["']?/);
      if (match && match[1]) return match[1].trim();
    }
  } catch {}
  return process.env.GEMINI_API_KEY || "";
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
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("GEMINI_API_KEY не е конфигуриран в .env");

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

  const fetchWithModel = async (modelName: string) => {
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

  // Pass 1: Try each model immediately
  for (const currentModel of uniqueModels) {
    const res = await fetchWithModel(currentModel).catch(() => null);
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

  // Pass 2: If all returned 429/busy, wait 2 seconds and retry the primary high-quota model
  await new Promise((r) => setTimeout(r, 2000));
  const retryRes = await fetchWithModel("gemini-1.5-flash").catch(() => null);
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
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("GEMINI_API_KEY не е конфигуриран в .env");

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
                text: `Generate a vertical 9:16 cinematic background image. No people, no animals, no text, no calligraphy. Premium quality.\n\n${prompt}`,
              },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ["IMAGE", "TEXT"],
          responseMimeType: "text/plain",
        },
      }),
    },
  );

  if (res.status === 429) throw new Error("Твърде много заявки към Gemini, опитай след малко");
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Imagen грешка ${res.status}: ${txt.slice(0, 200)}`);
  }

  const json = await res.json();
  // Gemini returns inline_data with base64 for generated images.
  const parts = json.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if (part.inlineData?.data) {
      return {
        base64: part.inlineData.data,
        mimeType: part.inlineData.mimeType || "image/png",
      };
    }
  }

  throw new Error("Gemini не генерира изображение. Опитай с различен prompt.");
}
