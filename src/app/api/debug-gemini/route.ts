import { NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";

function fingerprint(key: string) {
  return crypto.createHash("sha256").update(key).digest("hex").slice(0, 12);
}

export async function GET() {
  const model = process.env.GEMINI_MODEL || "gemini-3-pro-preview";
  const imageModel = process.env.GEMINI_IMAGE_MODEL || "gemini-3-pro-image-preview";

  const apiKey = process.env.GEMINI_API_KEY || "";
  const hasKey = Boolean(apiKey);

  const result: Record<string, unknown> = {
    hasKey,
    keyFingerprint: hasKey ? fingerprint(apiKey) : null,
    model,
    imageModel,
    env: {
      hasGeminiModel: Boolean(process.env.GEMINI_MODEL),
      hasGeminiImageModel: Boolean(process.env.GEMINI_IMAGE_MODEL),
    },
  };

  if (!hasKey) {
    return NextResponse.json(result, { status: 200 });
  }

  // Optional: verify Gemini API is reachable with this key without leaking the key.
  const baseUrl = "https://generativelanguage.googleapis.com/v1beta";
  const safeUrl = `${baseUrl}/models`;
  const url = `${safeUrl}?key=${encodeURIComponent(apiKey)}`;

  try {
    const res = await fetch(url, { method: "GET", cache: "no-store" });
    const json = await res.json().catch(() => ({}));

    // Return only minimal info to avoid large payloads.
    const allModels = Array.isArray((json as any)?.models) ? (json as any).models : [];
    const models = allModels
      .map((m: any) => ({ name: m?.name, displayName: m?.displayName }))
      .slice(0, 15);

    const gemini3Matches = allModels
      .map((m: any) => ({ name: m?.name, displayName: m?.displayName }))
      .filter((m: any) => typeof m?.name === "string" && m.name.includes("gemini-3"))
      .slice(0, 30);

    async function checkModelMeta(modelName: string) {
      const safeMetaUrl = `${baseUrl}/${modelName}`;
      const metaUrl = `${safeMetaUrl}?key=${encodeURIComponent(apiKey)}`;
      const metaRes = await fetch(metaUrl, { method: "GET", cache: "no-store" });
      const metaJson = await metaRes.json().catch(() => ({}));
      return {
        url: safeMetaUrl,
        ok: metaRes.ok,
        status: metaRes.status,
        statusText: metaRes.statusText,
        errorStatus: (metaJson as any)?.error?.status,
        errorMessage: (metaJson as any)?.error?.message,
        displayName: (metaJson as any)?.displayName,
        name: (metaJson as any)?.name,
      };
    }

    async function checkGenerate(modelId: string) {
      const safeGenUrl = `${baseUrl}/models/${modelId}:generateContent`;
      const genUrl = `${safeGenUrl}?key=${encodeURIComponent(apiKey)}`;
      const body = {
        contents: [{ role: "user", parts: [{ text: "ping" }] }],
      };
      const genRes = await fetch(genUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      });
      const genJson = await genRes.json().catch(() => ({}));
      return {
        url: safeGenUrl,
        ok: genRes.ok,
        status: genRes.status,
        statusText: genRes.statusText,
        errorStatus: (genJson as any)?.error?.status,
        errorMessage: (genJson as any)?.error?.message,
      };
    }

    result.modelsEndpoint = {
      url: safeUrl,
      ok: res.ok,
      status: res.status,
      statusText: res.statusText,
      sample: models,
      gemini3Matches,
      errorStatus: (json as any)?.error?.status,
      errorMessage: (json as any)?.error?.message,
    };

    // Validate that configured models exist + whether they can actually generate.
    result.modelChecks = {
      meta: {
        text: await checkModelMeta(`models/${model}`),
        image: await checkModelMeta(`models/${imageModel}`),
      },
      generate: {
        text: await checkGenerate(model),
        image: await checkGenerate(imageModel),
      },
    };

    return NextResponse.json(result, { status: 200 });
  } catch (e: unknown) {
    result.modelsEndpoint = {
      url: safeUrl,
      ok: false,
      status: null,
      statusText: null,
      error: e instanceof Error ? e.message : String(e),
    };
    return NextResponse.json(result, { status: 200 });
  }
}
