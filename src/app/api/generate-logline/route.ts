import { NextRequest, NextResponse } from "next/server";
import { geminiGenerateText } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    const { protagonist, setting, goal, userPrompt, movieTitle } = await request.json();

    const titleLine = typeof movieTitle === "string" && movieTitle.trim()
      ? `MOVIE TITLE: ${movieTitle.trim()}`
      : "";

    const userLine = typeof userPrompt === "string" && userPrompt.trim()
      ? `USER PROMPT: ${userPrompt.trim()}`
      : "";

    const prompt = `Generate a funny 1-2 sentence movie logline. Be brief and punchy.

PROTAGONIST: ${protagonist}
SETTING: ${setting}
GOAL: ${goal}
${titleLine}
${userLine}

Logline only, no explanation:`;

    const result = await geminiGenerateText({ prompt });
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("generateLogline API error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorString = String(error);

    const isQuotaError =
      errorString.includes("429") ||
      errorString.includes("RESOURCE_EXHAUSTED") ||
      errorString.includes("quota") ||
      errorString.includes("rate limit") ||
      errorString.includes("Too Many Requests");

    return NextResponse.json({
      success: false,
      error: errorMessage,
      isQuotaError,
    });
  }
}
