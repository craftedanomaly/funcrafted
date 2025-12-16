export type GeminiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; isQuotaError: boolean };

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

// ============================================================================
// TEXT GENERATION (gemini-2.5-flash) - Free Tier Key
// ============================================================================

function getFlashApiKey(): string {
  const apiKey = process.env.GEMINI_FLASH_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_FLASH_API_KEY is not configured");
  }
  return apiKey;
}

function handleError(error: unknown): GeminiResponse<never> {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorString = String(error);

  const isQuotaError =
    errorString.includes("429") ||
    errorString.includes("RESOURCE_EXHAUSTED") ||
    errorString.includes("quota") ||
    errorString.includes("rate limit") ||
    errorString.includes("Too Many Requests");

  return { success: false, error: errorMessage, isQuotaError };
}

function extractText(json: any): string {
  const parts = json?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .map((p: any) => (typeof p?.text === "string" ? p.text : ""))
    .filter(Boolean)
    .join("");
}

/**
 * Generate text using Gemini 2.5 Flash (Free Tier)
 */
export async function geminiGenerateText(params: {
  prompt: string;
  systemInstruction?: string;
}): Promise<GeminiResponse<string>> {
  try {
    const apiKey = getFlashApiKey();
    const model = "gemini-2.5-flash";
    const url = `${BASE_URL}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const body: any = {
      contents: [{ role: "user", parts: [{ text: params.prompt }] }],
    };
    if (params.systemInstruction) {
      body.systemInstruction = { role: "system", parts: [{ text: params.systemInstruction }] };
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const details = typeof json === "object" ? JSON.stringify(json) : String(json);
      throw new Error(`Gemini API Error [${res.status}]: ${details}`);
    }

    const text = extractText(json);
    return { success: true, data: text };
  } catch (error: unknown) {
    return handleError(error);
  }
}

/**
 * Chat with history using Gemini 2.5 Flash (Free Tier)
 */
export async function geminiChat(params: {
  history: { role: "user" | "model"; parts: { text: string }[] }[];
  message: string;
  systemInstruction?: string;
}): Promise<GeminiResponse<string>> {
  try {
    const apiKey = getFlashApiKey();
    const model = "gemini-2.5-flash";
    const url = `${BASE_URL}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const contents = [
      ...(Array.isArray(params.history) ? params.history : []),
      { role: "user" as const, parts: [{ text: params.message }] },
    ];

    const body: any = { contents };
    if (params.systemInstruction) {
      body.systemInstruction = { role: "system", parts: [{ text: params.systemInstruction }] };
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const details = typeof json === "object" ? JSON.stringify(json) : String(json);
      throw new Error(`Gemini API Error [${res.status}]: ${details}`);
    }

    const text = extractText(json);
    return { success: true, data: text };
  } catch (error: unknown) {
    return handleError(error);
  }
}

/**
 * Analyze image with text using Gemini 2.5 Flash (Free Tier)
 */
export async function geminiAnalyzeImage(params: {
  prompt: string;
  imageBase64: string;
  mimeType?: string;
  systemInstruction?: string;
}): Promise<GeminiResponse<string>> {
  try {
    const apiKey = getFlashApiKey();
    const model = "gemini-2.5-flash";
    const url = `${BASE_URL}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const body: any = {
      contents: [
        {
          role: "user",
          parts: [
            { text: params.prompt },
            { inlineData: { data: params.imageBase64, mimeType: params.mimeType || "image/jpeg" } },
          ],
        },
      ],
    };
    if (params.systemInstruction) {
      body.systemInstruction = { role: "system", parts: [{ text: params.systemInstruction }] };
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const details = typeof json === "object" ? JSON.stringify(json) : String(json);
      throw new Error(`Gemini API Error [${res.status}]: ${details}`);
    }

    const text = extractText(json);
    return { success: true, data: text };
  } catch (error: unknown) {
    return handleError(error);
  }
}

// ============================================================================
// IMAGE GENERATION (Imagen 3) - Paid Key
// ============================================================================

function getImageApiKey(): string {
  const apiKey = process.env.GEMINI_IMAGE_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_IMAGE_API_KEY is not configured");
  }
  return apiKey;
}

/**
 * Generate image using Gemini 3 Pro Image Preview (Paid Key)
 */
export async function geminiGenerateImage(params: {
  prompt: string;
}): Promise<GeminiResponse<{ mimeType: string; base64: string }>> {
  try {
    const apiKey = getImageApiKey();
    const model = "gemini-3-pro-image-preview";
    const url = `${BASE_URL}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const body: any = {
      contents: [{ role: "user", parts: [{ text: params.prompt }] }],
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const details = typeof json === "object" ? JSON.stringify(json) : String(json);
      throw new Error(`Gemini Image API Error [${res.status}]: ${details}`);
    }

    const parts = json?.candidates?.[0]?.content?.parts;
    const inlineData = Array.isArray(parts)
      ? parts.find((p: any) => p?.inlineData?.data && p?.inlineData?.mimeType)?.inlineData
      : null;

    if (!inlineData?.data || !inlineData?.mimeType) {
      return { success: false, error: "Image model did not return inlineData", isQuotaError: false };
    }

    return { success: true, data: { mimeType: inlineData.mimeType, base64: inlineData.data } };
  } catch (error: unknown) {
    return handleError(error);
  }
}

// Legacy export for backward compatibility
export const geminiService = {
  generateText: (prompt: string, systemInstruction?: string) =>
    geminiGenerateText({ prompt, systemInstruction }),
  chat: (
    history: { role: "user" | "model"; parts: { text: string }[] }[],
    message: string,
    systemInstruction?: string
  ) => geminiChat({ history, message, systemInstruction }),
  generateWithImage: (
    prompt: string,
    imageBase64: string,
    mimeType?: string,
    systemInstruction?: string
  ) => geminiAnalyzeImage({ prompt, imageBase64, mimeType, systemInstruction }),
  generateImage: (prompt: string) => geminiGenerateImage({ prompt }),
};
