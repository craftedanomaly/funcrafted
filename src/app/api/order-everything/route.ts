import { NextRequest, NextResponse } from "next/server";
import { geminiGenerateText } from "@/lib/gemini";

const SYSTEM_PROMPT = `You are the cheerful AI of "EverythingNow™", a satirical e-commerce company that reveals the TRUE environmental cost of products.

LANGUAGE: Respond in the SAME LANGUAGE as the user's input. Turkish input → Turkish output. English → English. Any language works.

YOUR TASK: Generate a REALISTIC production timeline for the requested item, showing the ACTUAL steps required to make it - but describe everything with toxic positivity and dark humor.

IMPORTANT - BE REALISTIC:
- Research what actually goes into making the product
- For a BURGER: cattle farming → slaughterhouse → meat processing → packaging → cold chain transport → restaurant cooking
- For an iPHONE: rare earth mining → component manufacturing → assembly in China → quality testing → global shipping → retail
- For JEANS: cotton farming (water!) → dyeing (chemicals!) → cutting/sewing → washing → shipping → retail
- For a CAR: steel/aluminum mining → parts manufacturing → assembly line → painting → testing → dealer transport

Each step should mention REAL environmental impacts with actual numbers when possible:
- Water usage (liters)
- CO2 emissions (kg)
- Land use, deforestation
- Chemical pollution
- Labor conditions
- Energy consumption

TONE: Cheerful corporate-speak with emojis. Frame destruction as "progress" and "efficiency". Dark humor, not preachy.

RULES:
1. Generate EXACTLY 5 realistic production steps specific to that product
2. Each step = real production phase + environmental cost + cheerful spin
3. totalImpactValue = realistic CO2 estimate in kg (research typical values)
4. Assign 1-3 Achievement IDs from the provided list when appropriate

OUTPUT FORMAT: Return ONLY a single valid JSON object. Do not include explanations, markdown, or extra text.
IMPORTANT JSON RULES:
- Use double quotes for ALL keys and ALL string values.
- Do NOT use placeholder words like number/string. Use real values.

JSON EXAMPLE (shape only):
{
  "steps": [
    { "icon": "🐄", "title": "Farming", "desc": "..." },
    { "icon": "🏭", "title": "Processing", "desc": "..." },
    { "icon": "📦", "title": "Packaging", "desc": "..." },
    { "icon": "🚛", "title": "Transport", "desc": "..." },
    { "icon": "🛒", "title": "Delivery", "desc": "..." }
  ],
  "totalImpactValue": 123,
  "totalImpactLabel": "123 kg CO2",
  "finalMessage": "...",
  "unlockedAchievements": ["ACH_WATER"]
}`;

interface OrderResult {
  steps: { icon: string; title: string; desc: string }[];
  totalImpactValue: number;
  totalImpactLabel: string;
  finalMessage: string;
  unlockedAchievements: string[];
}

const ORDER_EVERYTHING_ROUTE_VERSION = "debug-v2";

function safeParseJSON(text: string): { parsed: OrderResult; debug: Record<string, unknown> } {
  const normalized = text
    .replace(/\uFEFF/g, "")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .trim();

  const firstBrace = normalized.indexOf("{");
  const lastBrace = normalized.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("No valid JSON object found in AI response");
  }

  let jsonOnly = normalized.slice(firstBrace, lastBrace + 1);

  // Some models wrap objects in double braces: {{ ... }}
  if (jsonOnly.startsWith("{{") && jsonOnly.endsWith("}}")) {
    jsonOnly = jsonOnly.slice(1, -1);
  }

  const debugBase = {
    firstBrace,
    lastBrace,
    textLength: normalized.length,
    jsonLength: jsonOnly.length,
    jsonStart: jsonOnly.slice(0, 200),
    jsonEnd: jsonOnly.slice(-200),
    firstCharCode: jsonOnly.length > 0 ? jsonOnly.charCodeAt(0) : null,
    secondCharCode: jsonOnly.length > 1 ? jsonOnly.charCodeAt(1) : null,
  };

  try {
    return { parsed: JSON.parse(jsonOnly) as OrderResult, debug: { ...debugBase, repaired: false } };
  } catch (e) {
    const repaired0 = jsonOnly
      .replace(/\bTrue\b/g, "true")
      .replace(/\bFalse\b/g, "false")
      .replace(/\bNone\b/g, "null")
      .replace(/,(\s*[}\]])/g, "$1");

    // Common model mistake: Python-style single quotes.
    const repaired1 = repaired0.startsWith("{'") || repaired0.includes("':") ? repaired0.replace(/'/g, '"') : repaired0;

    // Common model mistake: unquoted keys: { steps: [...] } -> { "steps": [...] }
    const repaired2 = repaired1.replace(/([\{,]\s*)([A-Za-z_][A-Za-z0-9_]*)(\s*:)/g, '$1"$2"$3');

    // Another common model mistake: smart quotes in the JSON blob itself.
    const repaired3 = repaired2.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");

    try {
      return {
        parsed: JSON.parse(repaired3) as OrderResult,
        debug: {
          ...debugBase,
          repaired: true,
          repairChanged: repaired3 !== jsonOnly,
          repairedStart: repaired3.slice(0, 200),
          repairedEnd: repaired3.slice(-200),
          originalParseError: e instanceof Error ? e.message : String(e),
        },
      };
    } catch (e2) {
      const err = new Error(
        `JSON parse failed. original=${e instanceof Error ? e.message : String(e)} repaired=${e2 instanceof Error ? e2.message : String(e2)}`
      ) as Error & { debug?: Record<string, unknown> };
      err.debug = {
        ...debugBase,
        repaired: true,
        repairChanged: repaired3 !== jsonOnly,
        repairedStart: repaired3.slice(0, 200),
        repairedEnd: repaired3.slice(-200),
        originalParseError: e instanceof Error ? e.message : String(e),
        repairedParseError: e2 instanceof Error ? e2.message : String(e2),
      };
      throw err;
    }
  }
}

export async function POST(request: NextRequest) {
  const reqId = crypto.randomUUID();
  const debugEnabled = process.env.NODE_ENV !== "production";
  let aiTextStart: string | undefined;
  let aiTextEnd: string | undefined;
  let parseDebug: Record<string, unknown> | undefined;

  try {
    if (debugEnabled) {
      console.error(`[order-everything:${reqId}] route=${ORDER_EVERYTHING_ROUTE_VERSION}`);
    }

    const body = await request.json();
    const { item } = body as { item?: string };

    if (!item || typeof item !== "string" || item.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Please enter an item name" },
        { status: 400 }
      );
    }

    const prompt = `Generate an order tracking timeline for: "${item.trim()}"`;

    const ai = await geminiGenerateText({
      prompt,
      systemInstruction: SYSTEM_PROMPT,
    });

    if (!ai.success) {
      return NextResponse.json(
        { success: false, error: ai.error },
        { status: 502 }
      );
    }

    if (!ai.data || !ai.data.trim()) {
      return NextResponse.json(
        { success: false, error: "AI returned empty response" },
        { status: 502 }
      );
    }

    aiTextStart = ai.data.slice(0, 600);
    aiTextEnd = ai.data.slice(-600);
    if (debugEnabled) {
      console.error(`[order-everything:${reqId}] aiTextStart=`, aiTextStart);
      console.error(`[order-everything:${reqId}] aiTextEnd=`, aiTextEnd);
    }

    let parsed: OrderResult;
    try {
      const parsedResult = safeParseJSON(ai.data.trim());
      parsed = parsedResult.parsed;
      parseDebug = parsedResult.debug;
    } catch (parseError) {
      const err = parseError as any;
      if (err?.debug && typeof err.debug === "object") {
        parseDebug = err.debug;
      }

      console.error(`[order-everything:${reqId}] RAW AI RESPONSE:\n`, ai.data);
      throw parseError;
    }

    if (!Array.isArray(parsed.steps) || parsed.steps.length !== 5) {
      throw new Error("Invalid steps array");
    }

    if (typeof parsed.totalImpactValue !== "number") {
      const coerced = parseInt(String(parsed.totalImpactValue).replace(/[^0-9]/g, ""), 10);
      parsed.totalImpactValue = Number.isFinite(coerced) ? coerced : 100;
    }

    if (!Array.isArray(parsed.unlockedAchievements)) {
      parsed.unlockedAchievements = [];
    }

    if (parsed.totalImpactValue < 10 && !parsed.unlockedAchievements.includes("ACH_CARBON_BABY")) {
      parsed.unlockedAchievements.push("ACH_CARBON_BABY");
    }
    if (parsed.totalImpactValue > 1000 && !parsed.unlockedAchievements.includes("ACH_CLIMATE")) {
      parsed.unlockedAchievements.push("ACH_CLIMATE");
    }
    if (parsed.totalImpactValue > 10000 && !parsed.unlockedAchievements.includes("ACH_EXTINCTION")) {
      parsed.unlockedAchievements.push("ACH_EXTINCTION");
    }

    return NextResponse.json(
      debugEnabled
        ? { success: true, data: parsed, debug: { reqId, parse: parseDebug } }
        : { success: true, data: parsed },
      { status: 200 }
    );
  } catch (error) {
    console.error("Order Everything error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to process order. Please try again!";
    return NextResponse.json(
      debugEnabled
        ? {
            success: false,
            error: errorMessage,
            debug: {
              routeVersion: ORDER_EVERYTHING_ROUTE_VERSION,
              reqId,
              aiTextStart: aiTextStart ?? null,
              aiTextEnd: aiTextEnd ?? null,
              parse: parseDebug ?? null,
            },
          }
        : { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
