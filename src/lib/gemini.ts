export type GeminiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; isQuotaError: boolean };

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

// ============================================================================
// TEXT GENERATION (gemini-2.5-flash) - Free Tier Key with OpenAI Fallback
// ============================================================================

function getFlashApiKey(): string | null {
  return process.env.GEMINI_FLASH_API_KEY || null;
}

function getOpenAIApiKey(): string | null {
  return process.env.OPENAI_API_KEY || null;
}

function isRetryableError(status: number, errorString: string): boolean {
  return (
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    errorString.includes("429") ||
    errorString.includes("RESOURCE_EXHAUSTED") ||
    errorString.includes("quota") ||
    errorString.includes("rate limit") ||
    errorString.includes("Too Many Requests")
  );
}

function handleError(error: unknown): GeminiResponse<never> {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorString = String(error);

  const isQuotaError = isRetryableError(0, errorString);

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
 * Fallback to OpenAI GPT-4o-mini when Gemini fails
 */
async function openAIGenerateText(params: {
  prompt: string;
  systemInstruction?: string;
}): Promise<GeminiResponse<string>> {
  const apiKey = getOpenAIApiKey();
  if (!apiKey) {
    return { success: false, error: "OpenAI API key not configured", isQuotaError: false };
  }

  try {
    const messages: { role: string; content: string }[] = [];
    if (params.systemInstruction) {
      messages.push({ role: "system", content: params.systemInstruction });
    }
    messages.push({ role: "user", content: params.prompt });

    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        max_tokens: 2000,
      }),
      cache: "no-store",
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const details = typeof json === "object" ? JSON.stringify(json) : String(json);
      throw new Error(`OpenAI API Error [${res.status}]: ${details}`);
    }

    const text = json?.choices?.[0]?.message?.content || "";
    return { success: true, data: text };
  } catch (error: unknown) {
    return handleError(error);
  }
}

/**
 * Generate text using Gemini 2.5 Flash with OpenAI fallback
 */
export async function geminiGenerateText(params: {
  prompt: string;
  systemInstruction?: string;
}): Promise<GeminiResponse<string>> {
  const geminiKey = getFlashApiKey();
  
  // Try Gemini first if key exists
  if (geminiKey) {
    try {
      const model = "gemini-2.5-flash";
      const url = `${BASE_URL}/models/${model}:generateContent?key=${encodeURIComponent(geminiKey)}`;

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
      
      // Check if we should fallback to OpenAI
      if (!res.ok && isRetryableError(res.status, JSON.stringify(json))) {
        console.log(`Gemini returned ${res.status}, falling back to OpenAI...`);
        return openAIGenerateText(params);
      }
      
      if (!res.ok) {
        const details = typeof json === "object" ? JSON.stringify(json) : String(json);
        throw new Error(`Gemini API Error [${res.status}]: ${details}`);
      }

      const text = extractText(json);
      return { success: true, data: text };
    } catch (error: unknown) {
      const errorString = String(error);
      // Fallback to OpenAI on retryable errors
      if (isRetryableError(0, errorString)) {
        console.log(`Gemini error, falling back to OpenAI: ${errorString}`);
        return openAIGenerateText(params);
      }
      return handleError(error);
    }
  }
  
  // No Gemini key, try OpenAI directly
  return openAIGenerateText(params);
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
    if (!apiKey) {
      return { success: false, error: "GEMINI_FLASH_API_KEY is not configured", isQuotaError: false };
    }
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
    if (!apiKey) {
      return { success: false, error: "GEMINI_FLASH_API_KEY is not configured", isQuotaError: false };
    }
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
