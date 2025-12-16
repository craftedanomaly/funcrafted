export type OpenAITextResponse =
  | { success: true; data: string }
  | { success: false; error: string; isQuotaError: boolean };

function getApiKey(): string {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  return apiKey;
}

function getDefaultModel(): string {
  return process.env.OPENAI_MODEL || "gpt-4o-mini";
}

function isQuotaErrorFromMessage(msg: string): boolean {
  return (
    msg.includes("429") ||
    msg.toLowerCase().includes("rate limit") ||
    msg.toLowerCase().includes("quota") ||
    msg.toLowerCase().includes("insufficient_quota")
  );
}

/**
 * Non-streaming text generation using Chat Completions API.
 */
export async function openaiGenerateText(params: {
  system?: string;
  user: string;
  model?: string;
  maxTokens?: number;
}): Promise<OpenAITextResponse> {
  try {
    const apiKey = getApiKey();
    const model = params.model || getDefaultModel();

    const messages: { role: string; content: string }[] = [];
    if (params.system) {
      messages.push({ role: "system", content: params.system });
    }
    messages.push({ role: "user", content: params.user });

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: params.maxTokens || 150,
        temperature: 0.8,
      }),
      cache: "no-store",
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg =
        typeof json?.error?.message === "string"
          ? json.error.message
          : `OpenAI request failed (${res.status})`;

      return {
        success: false,
        error: msg,
        isQuotaError: isQuotaErrorFromMessage(msg) || res.status === 429,
      };
    }

    const text = (json?.choices?.[0]?.message?.content || "").trim();
    if (!text) {
      return {
        success: false,
        error: "OpenAI returned empty response",
        isQuotaError: false,
      };
    }

    return { success: true, data: text };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      success: false,
      error: msg,
      isQuotaError: isQuotaErrorFromMessage(msg),
    };
  }
}

/**
 * Streaming text generation using Chat Completions API.
 * Returns a ReadableStream for SSE responses.
 */
export async function openaiGenerateTextStream(params: {
  system?: string;
  user: string;
  model?: string;
  maxTokens?: number;
}): Promise<{ stream: ReadableStream<Uint8Array> } | { error: string; isQuotaError: boolean }> {
  try {
    const apiKey = getApiKey();
    const model = params.model || getDefaultModel();

    const messages: { role: string; content: string }[] = [];
    if (params.system) {
      messages.push({ role: "system", content: params.system });
    }
    messages.push({ role: "user", content: params.user });

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: params.maxTokens || 150,
        temperature: 0.8,
        stream: true,
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      const msg =
        typeof json?.error?.message === "string"
          ? json.error.message
          : `OpenAI request failed (${res.status})`;

      return {
        error: msg,
        isQuotaError: isQuotaErrorFromMessage(msg) || res.status === 429,
      };
    }

    if (!res.body) {
      return { error: "No response body", isQuotaError: false };
    }

    // Transform OpenAI SSE to clean text stream
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const transformStream = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        const text = decoder.decode(chunk, { stream: true });
        const lines = text.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const json = JSON.parse(data);
              const delta = json?.choices?.[0]?.delta?.content || "";
              if (delta) {
                controller.enqueue(encoder.encode(delta));
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      },
    });

    return { stream: res.body.pipeThrough(transformStream) };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      error: msg,
      isQuotaError: isQuotaErrorFromMessage(msg),
    };
  }
}
