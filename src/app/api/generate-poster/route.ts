import { NextRequest, NextResponse } from "next/server";
import { geminiGenerateImage } from "@/lib/gemini";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { protagonist, setting, goal, movieTitle, logline, stylePrompt } = await request.json();

    const title = typeof movieTitle === "string" ? movieTitle.trim() : "";
    const log = typeof logline === "string" ? logline.trim() : "";

    const prompt = `Create a CINEMATIC MOVIE POSTER in a STRICT 9:16 PORTRAIT (vertical) aspect ratio.

Title: ${title || "Untitled Film"}
Logline: ${log || ""}
Protagonist: ${protagonist}
Setting: ${setting}
Goal: ${goal}

Style: ${typeof stylePrompt === "string" ? stylePrompt : "Dramatic lighting, high contrast, theatrical poster style."}

Layout constraints:
- 9:16 portrait composition (phone wallpaper / Instagram story).
- Leave clear space at the TOP for the title.
- Center a strong main character silhouette.
- High contrast, cinematic color grading.
- No extra text besides the title area suggestion.`;

    const result = await geminiGenerateImage({ prompt });
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("generatePoster API error:", error);
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
