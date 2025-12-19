export type GeminiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; isQuotaError: boolean };

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta";
const OPENAI_URL = "https://api.openai.com/v1/responses";
const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

type GeminiSystemInstruction = {
  role: "system";
  parts: { text: string }[];
};

type GeminiPart =
  | { text: string }
  | { inlineData: { data: string; mimeType: string } };

type GeminiContent = { role: string; parts: GeminiPart[] };

type GeminiGenerateContentRequest = {
  contents: GeminiContent[];
  systemInstruction?: GeminiSystemInstruction;
};

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: unknown[];
    };
  }>;
};

type OpenAIResponsesResponse = {
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

type OpenAIInputMessage = {
  role: "system" | "user";
  content: Array<{ type: "text"; text: string }>;
};

type OpenAIResponsesRequest = {
  model: string;
  input: OpenAIInputMessage[];
  max_output_tokens: number;
  text?: { format: { type: "json_object" } };
};

type OpenAIChatMessage = {
  role: "system" | "user";
  content: string;
};

type OpenAIChatCompletionsRequest = {
  model: string;
  messages: OpenAIChatMessage[];
  max_tokens?: number;
  response_format?: { type: "json_object" };
};

type OpenAIChatCompletionsResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

const getGeminiKey = () => process.env.GEMINI_FLASH_API_KEY || null;
const getOpenAIKey = () => process.env.OPENAI_API_KEY || null;
const getOpenAIFallbackModel = () =>
  process.env.OPENAI_FALLBACK_MODEL || "gpt-5-mini-2025-08-07";

// Only fallback on real quota / overload signals
function shouldFallback(status: number, body: string): boolean {
  if (status === 429 || status === 503) return true;
  const lower = body.toLowerCase();
  return (
    lower.includes("resource_exhausted") ||
    lower.includes("rate limit") ||
    lower.includes("too many requests") ||
    lower.includes("overloaded")
  );
}

function makeError(msg: string, isQuota = false): GeminiResponse<never> {
  return { success: false, error: msg, isQuotaError: isQuota };
}

function getTextFromGeminiPart(part: unknown): string | null {
  if (!part || typeof part !== "object") return null;
  if (!("text" in part)) return null;
  const text = (part as { text?: unknown }).text;
  return typeof text === "string" ? text : null;
}

function isInlineDataPart(
  part: unknown
): part is { inlineData: { data: string; mimeType: string } } {
  if (!part || typeof part !== "object") return false;
  if (!("inlineData" in part)) return false;
  const inlineData = (part as { inlineData?: unknown }).inlineData;
  if (!inlineData || typeof inlineData !== "object") return false;
  const data = (inlineData as { data?: unknown }).data;
  const mimeType = (inlineData as { mimeType?: unknown }).mimeType;
  return typeof data === "string" && typeof mimeType === "string";
}

function extractGeminiText(json: unknown): string {
  const parts = (json as GeminiGenerateContentResponse)?.candidates?.[0]?.content
    ?.parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .map(getTextFromGeminiPart)
    .filter((t): t is string => Boolean(t))
    .join("");
}

// Robust Responses API text extraction
function extractOpenAIResponsesText(json: unknown): string {
  const j = json as OpenAIResponsesResponse;
  if (typeof j?.output_text === "string" && j.output_text.trim()) {
    return j.output_text;
  }

  const output = j?.output;
  if (!Array.isArray(output)) return "";

  const chunks: string[] = [];
  for (const item of output) {
    if (item?.type !== "message") continue;
    const content = item?.content;
    if (!Array.isArray(content)) continue;
    for (const c of content) {
      if (c?.type === "output_text" && typeof c.text === "string") {
        chunks.push(c.text);
      }
    }
  }
  return chunks.join("");
}

function extractOpenAIChatCompletionsText(json: unknown): string {
  const j = json as OpenAIChatCompletionsResponse;
  const content = j?.choices?.[0]?.message?.content;
  return typeof content === "string" ? content : "";
}

function looksLikeMissingEndpoint(status: number, body: unknown): boolean {
  if (status === 404) return true;
  const s = typeof body === "string" ? body : JSON.stringify(body);
  const lower = s.toLowerCase();
  return (
    lower.includes("not found") ||
    lower.includes("unknown endpoint") ||
    lower.includes("no such endpoint")
  );
}

// GPT-5 Mini fallback via Responses API (safe + conservative)
async function gpt5MiniFallback(
  prompt: string,
  system?: string
): Promise<GeminiResponse<string>> {
  if (process.env.NODE_ENV !== "production") {
    console.error("[gemini] Falling back to GPT-5 Mini");
  }

  const key = getOpenAIKey();
  if (!key) return makeError("OpenAI API key not configured");

  try {
    const input: OpenAIInputMessage[] = [
      ...(system
        ? [{ role: "system" as const, content: [{ type: "text" as const, text: system }] }]
        : []),
      { role: "user" as const, content: [{ type: "text" as const, text: prompt }] },
    ];

    const responsesBody: OpenAIResponsesRequest = {
      model: getOpenAIFallbackModel(),
      input,
      max_output_tokens: 1500,
      text: {
        format: { type: "json_object" },
      },
    };

    const responsesRes = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(responsesBody),
      cache: "no-store",
    });

    const responsesJson: unknown = await responsesRes.json().catch(() => ({}));
    if (!responsesRes.ok) {
      if (looksLikeMissingEndpoint(responsesRes.status, responsesJson)) {
        if (process.env.NODE_ENV !== "production") {
          console.error("[gemini] /v1/responses unavailable; falling back to /v1/chat/completions");
        }
      } else {
        throw new Error(
          `OpenAI responses [${responsesRes.status}]: ${JSON.stringify(responsesJson)}`
        );
      }
    } else {
      const text = extractOpenAIResponsesText(responsesJson);
      if (process.env.NODE_ENV !== "production") {
        console.error(
          "[gemini] OpenAI response text length:",
          text.length,
          "first 200:",
          text.slice(0, 200)
        );
      }
      if (text.trim()) {
        return { success: true, data: text };
      }
    }

    const chatBody: OpenAIChatCompletionsRequest = {
      model: getOpenAIFallbackModel(),
      messages: [
        ...(system ? [{ role: "system" as const, content: system }] : []),
        { role: "user" as const, content: prompt },
      ],
      max_tokens: 1500,
      response_format: { type: "json_object" },
    };

    const chatRes = await fetch(OPENAI_CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(chatBody),
      cache: "no-store",
    });

    const chatJson: unknown = await chatRes.json().catch(() => ({}));
    if (!chatRes.ok) {
      throw new Error(
        `OpenAI chat.completions [${chatRes.status}]: ${JSON.stringify(chatJson)}`
      );
    }

    const chatText = extractOpenAIChatCompletionsText(chatJson);
    if (!chatText.trim()) {
      if (process.env.NODE_ENV !== "production") {
        console.error("OpenAI empty chat.completions response:", JSON.stringify(chatJson, null, 2));
      }
      return makeError("OpenAI returned empty response", true);
    }

    return { success: true, data: chatText };
  } catch (e) {
    return makeError(e instanceof Error ? e.message : String(e));
  }
}

// ============================================================================
// TEXT GENERATION
// ============================================================================

async function geminiGenerateTextWithModel(params: {
  prompt: string;
  systemInstruction?: string;
}, model: string, key: string): Promise<GeminiResponse<string>> {
  try {
    const url = `${GEMINI_URL}/models/${model}:generateContent?key=${encodeURIComponent(
      key
    )}`;

    const body: GeminiGenerateContentRequest = {
      contents: [{ role: "user", parts: [{ text: params.prompt }] }],
    };
    if (params.systemInstruction) {
      body.systemInstruction = {
        role: "system",
        parts: [{ text: params.systemInstruction }],
      };
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const json = await res.json().catch(() => ({}));
    const jsonStr = JSON.stringify(json);

    if (!res.ok) {
      return makeError(`Gemini (${model}) [${res.status}]: ${jsonStr}`, shouldFallback(res.status, jsonStr));
    }

    const text = extractGeminiText(json);
    if (!text.trim()) {
      return makeError(`Gemini (${model}) returned empty response`, true);
    }

    return { success: true, data: text };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);

    return makeError(`Gemini (${model}) error: ${msg}`, shouldFallback(0, msg));
  }
}

export async function geminiGenerateText(params: {
  prompt: string;
  systemInstruction?: string;
}): Promise<GeminiResponse<string>> {
  const key = getGeminiKey();
  if (!key) return gpt5MiniFallback(params.prompt, params.systemInstruction);

  const modelsToTry = ["gemini-3-flash-preview", "gemini-2.5-flash"];
  let lastGeminiError: GeminiResponse<string> | null = null;

  for (const model of modelsToTry) {
    const attempt = await geminiGenerateTextWithModel(params, model, key);
    if (attempt.success) {
      if (process.env.NODE_ENV !== "production") {
        console.error(`[gemini] Using model: ${model}`);
      }
      return attempt;
    }
    lastGeminiError = attempt;
  }

  const openai = await gpt5MiniFallback(params.prompt, params.systemInstruction);
  if (openai.success) return openai;
  return lastGeminiError || openai;
}

// ============================================================================
// CHAT (Gemini only, no fallback)
// ============================================================================

export async function geminiChat(params: {
  history: { role: "user" | "model"; parts: { text: string }[] }[];
  message: string;
  systemInstruction?: string;
}): Promise<GeminiResponse<string>> {
  const key = getGeminiKey();
  if (!key) return makeError("GEMINI_FLASH_API_KEY is not configured");

  try {
    const url = `${GEMINI_URL}/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
      key
    )}`;

    const contents = [
      ...(params.history || []),
      { role: "user" as const, parts: [{ text: params.message }] },
    ];

    const body: GeminiGenerateContentRequest = { contents };
    if (params.systemInstruction) {
      body.systemInstruction = {
        role: "system",
        parts: [{ text: params.systemInstruction }],
      };
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return makeError(`Gemini [${res.status}]: ${JSON.stringify(json)}`);
    }

    const text = extractGeminiText(json);
    return { success: true, data: text };
  } catch (e) {
    return makeError(e instanceof Error ? e.message : String(e));
  }
}

// ============================================================================
// IMAGE ANALYSIS (Gemini only)
// ============================================================================

export async function geminiAnalyzeImage(params: {
  prompt: string;
  imageBase64: string;
  mimeType?: string;
  systemInstruction?: string;
}): Promise<GeminiResponse<string>> {
  const key = getGeminiKey();
  if (!key) return makeError("GEMINI_FLASH_API_KEY is not configured");

  try {
    const url = `${GEMINI_URL}/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
      key
    )}`;

    const body: GeminiGenerateContentRequest = {
      contents: [
        {
          role: "user",
          parts: [
            { text: params.prompt },
            {
              inlineData: {
                data: params.imageBase64,
                mimeType: params.mimeType || "image/jpeg",
              },
            },
          ],
        },
      ],
    };

    if (params.systemInstruction) {
      body.systemInstruction = {
        role: "system",
        parts: [{ text: params.systemInstruction }],
      };
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return makeError(`Gemini [${res.status}]: ${JSON.stringify(json)}`);
    }

    const text = extractGeminiText(json);
    return { success: true, data: text };
  } catch (e) {
    return makeError(e instanceof Error ? e.message : String(e));
  }
}

// ============================================================================
// IMAGE GENERATION (Paid key)
// ============================================================================

const getImageKey = () => process.env.GEMINI_IMAGE_API_KEY || null;

export async function geminiGenerateImage(params: {
  prompt: string;
}): Promise<GeminiResponse<{ mimeType: string; base64: string }>> {
  const key = getImageKey();
  if (!key) return makeError("GEMINI_IMAGE_API_KEY is not configured");

  try {
    const url = `${GEMINI_URL}/models/gemini-3-pro-image-preview:generateContent?key=${encodeURIComponent(
      key
    )}`;

    const body: GeminiGenerateContentRequest = {
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
      return makeError(`Gemini Image [${res.status}]: ${JSON.stringify(json)}`);
    }

    const parts = (json as GeminiGenerateContentResponse)?.candidates?.[0]?.content
      ?.parts;
    const inlineData = Array.isArray(parts)
      ? parts.find(isInlineDataPart)?.inlineData
      : null;

    if (!inlineData?.data || !inlineData?.mimeType) {
      return makeError("Image model did not return inlineData");
    }

    return {
      success: true,
      data: { mimeType: inlineData.mimeType, base64: inlineData.data },
    };
  } catch (e) {
    return makeError(e instanceof Error ? e.message : String(e));
  }
}

// Legacy export
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