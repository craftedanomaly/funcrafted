export type GeminiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; isQuotaError: boolean };

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta";
const OPENAI_URL = "https://api.openai.com/v1/responses";

// ============================================================================
// Gemini 2.5 Flash (primary) + GPT-5 Mini fallback (quota/rate-limit only)
// ============================================================================

const getGeminiKey = () => process.env.GEMINI_FLASH_API_KEY || null;
const getOpenAIKey = () => process.env.OPENAI_API_KEY || null;

// Fallback: 429, 503, and explicit quota/overload errors
function shouldFallback(status: number, body: string): boolean {
  if (status === 429 || status === 503) return true;
  const lower = body.toLowerCase();
  return lower.includes("resource_exhausted") || 
         lower.includes("quota") || 
         lower.includes("rate limit") ||
         lower.includes("too many requests") ||
         lower.includes("overloaded") ||
         lower.includes("unavailable");
}

function extractGeminiText(json: any): string {
  const parts = json?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts.map((p: any) => p?.text || "").filter(Boolean).join("");
}

function makeError(msg: string, isQuota = false): GeminiResponse<never> {
  return { success: false, error: msg, isQuotaError: isQuota };
}

// GPT-5 Mini via Responses API (conservative tokens)
async function gpt5MiniFallback(prompt: string, system?: string): Promise<GeminiResponse<string>> {
  const key = getOpenAIKey();
  if (!key) return makeError("OpenAI API key not configured");

  try {
    const input = system ? `${system}\n\n${prompt}` : prompt;
    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: "gpt-5-mini", input, max_output_tokens: 150 }),
      cache: "no-store",
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`OpenAI [${res.status}]: ${JSON.stringify(json)}`);
    return { success: true, data: json?.output_text || "" };
  } catch (e) {
    return makeError(e instanceof Error ? e.message : String(e));
  }
}

// Primary: Gemini 2.5 Flash
export async function geminiGenerateText(params: {
  prompt: string;
  systemInstruction?: string;
}): Promise<GeminiResponse<string>> {
  const key = getGeminiKey();
  if (!key) return gpt5MiniFallback(params.prompt, params.systemInstruction);

  try {
    const url = `${GEMINI_URL}/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(key)}`;
    const body: any = { contents: [{ role: "user", parts: [{ text: params.prompt }] }] };
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
    const jsonStr = JSON.stringify(json);

    // Fallback only on quota/rate-limit
    if (!res.ok && shouldFallback(res.status, jsonStr)) {
      return gpt5MiniFallback(params.prompt, params.systemInstruction);
    }
    if (!res.ok) return makeError(`Gemini [${res.status}]: ${jsonStr}`);

    return { success: true, data: extractGeminiText(json) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (shouldFallback(0, msg)) return gpt5MiniFallback(params.prompt, params.systemInstruction);
    return makeError(msg);
  }
}

// Chat with history (Gemini only, no fallback for chat)
export async function geminiChat(params: {
  history: { role: "user" | "model"; parts: { text: string }[] }[];
  message: string;
  systemInstruction?: string;
}): Promise<GeminiResponse<string>> {
  const key = getGeminiKey();
  if (!key) return makeError("GEMINI_FLASH_API_KEY is not configured");

  try {
    const url = `${GEMINI_URL}/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(key)}`;
    const contents = [...(params.history || []), { role: "user" as const, parts: [{ text: params.message }] }];
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
    if (!res.ok) return makeError(`Gemini [${res.status}]: ${JSON.stringify(json)}`);
    return { success: true, data: extractGeminiText(json) };
  } catch (e) {
    return makeError(e instanceof Error ? e.message : String(e));
  }
}

// Analyze image (Gemini only)
export async function geminiAnalyzeImage(params: {
  prompt: string;
  imageBase64: string;
  mimeType?: string;
  systemInstruction?: string;
}): Promise<GeminiResponse<string>> {
  const key = getGeminiKey();
  if (!key) return makeError("GEMINI_FLASH_API_KEY is not configured");

  try {
    const url = `${GEMINI_URL}/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(key)}`;
    const body: any = {
      contents: [{
        role: "user",
        parts: [
          { text: params.prompt },
          { inlineData: { data: params.imageBase64, mimeType: params.mimeType || "image/jpeg" } },
        ],
      }],
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
    if (!res.ok) return makeError(`Gemini [${res.status}]: ${JSON.stringify(json)}`);
    return { success: true, data: extractGeminiText(json) };
  } catch (e) {
    return makeError(e instanceof Error ? e.message : String(e));
  }
}

// ============================================================================
// IMAGE GENERATION (Paid Key)
// ============================================================================

const getImageKey = () => process.env.GEMINI_IMAGE_API_KEY || null;

export async function geminiGenerateImage(params: {
  prompt: string;
}): Promise<GeminiResponse<{ mimeType: string; base64: string }>> {
  const key = getImageKey();
  if (!key) return makeError("GEMINI_IMAGE_API_KEY is not configured");

  try {
    const url = `${GEMINI_URL}/models/gemini-3-pro-image-preview:generateContent?key=${encodeURIComponent(key)}`;
    const body = { contents: [{ role: "user", parts: [{ text: params.prompt }] }] };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) return makeError(`Gemini Image [${res.status}]: ${JSON.stringify(json)}`);

    const parts = json?.candidates?.[0]?.content?.parts;
    const inlineData = Array.isArray(parts)
      ? parts.find((p: any) => p?.inlineData?.data && p?.inlineData?.mimeType)?.inlineData
      : null;

    if (!inlineData?.data || !inlineData?.mimeType) {
      return makeError("Image model did not return inlineData");
    }
    return { success: true, data: { mimeType: inlineData.mimeType, base64: inlineData.data } };
  } catch (e) {
    return makeError(e instanceof Error ? e.message : String(e));
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
