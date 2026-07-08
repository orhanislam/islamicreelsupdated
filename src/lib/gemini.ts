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
  const apiKey = process.env.GEMINI_API_KEY;
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

  const modelsToTry = [
    model, // Primary (usually gemini-2.5-flash)
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
  ];

  let res: Response | null = null;
  for (const m of modelsToTry) {
    res = await fetchWithModel(m);
    if (res.ok) break;
    if (res.status === 429) {
      console.warn(`[gemini] 429 Too Many Requests on ${m}, waiting 1.5s before retry...`);
      await new Promise((r) => setTimeout(r, 1500));
      res = await fetchWithModel(m);
      if (res.ok) break;
    }
    console.warn(`[gemini] Failed on ${m} with status ${res.status}, trying next model...`);
  }

  if (!res?.ok) {
    const txt = await res?.text().catch(() => "");
    throw new Error(`Gemini грешка ${res?.status}: ${txt?.slice(0, 200) || "Всички резервни модели са изчерпани или грешни"}`);
  }

  const json = await res.json();
  const content = (json.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim();
  return content;
}

/**
 * Generate an image using Google Imagen 3 via the Gemini API.
 * Used by: background image generation (replaces openai/gpt-image-2 via Lovable).
 */
export async function geminiGenerateImage(
  prompt: string,
): Promise<{ base64: string; mimeType: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
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
