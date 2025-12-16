"use server";

import { geminiService, GeminiResponse } from "@/lib/gemini";

export interface SlotResult {
  protagonist: string;
  setting: string;
  goal: string;
}

export async function generateLogline(
  slots: SlotResult
): Promise<GeminiResponse<string>> {
  try {
    const prompt = `You are a creative Hollywood screenwriter with a great sense of humor. Generate a funny, creative, and slightly absurd movie logline based on these three random elements:

PROTAGONIST: ${slots.protagonist}
SETTING: ${slots.setting}
GOAL: ${slots.goal}

Write a single compelling movie logline (1-2 sentences) that creatively combines all three elements. Make it sound like a real movie pitch but with a comedic twist. Be creative and unexpected!

Just respond with the logline, nothing else.`;

    const result = await geminiService.generateText(prompt);
    return result;
  } catch (error: unknown) {
    console.error("generateLogline error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorString = String(error);
    
    // Check if it's a quota error
    const isQuotaError =
      errorString.includes("429") ||
      errorString.includes("RESOURCE_EXHAUSTED") ||
      errorString.includes("quota") ||
      errorString.includes("rate limit") ||
      errorString.includes("Too Many Requests");
    
    return {
      success: false,
      error: errorMessage,
      isQuotaError,
    };
  }
}

export async function generatePosterDescription(
  logline: string,
  title: string,
  hasUserPhoto: boolean
): Promise<GeminiResponse<string>> {
  const photoContext = hasUserPhoto
    ? "The user has uploaded their photo to be the main character."
    : "Create a generic but compelling main character.";

  const prompt = `Based on this movie logline and title, describe what the movie poster should look like in vivid detail. This description will be used to generate an image.

TITLE: ${title}
LOGLINE: ${logline}
${photoContext}

Describe the poster in 2-3 sentences, focusing on:
- The main visual composition
- The mood and color palette
- Key elements that should appear

Just respond with the description, nothing else.`;

  return geminiService.generateText(prompt);
}

export async function analyzeUserPhoto(
  imageBase64: string,
  mimeType: string
): Promise<GeminiResponse<string>> {
  const prompt = `Briefly describe this person's appearance in a fun, movie-star way. Focus on their most striking features that would look great on a movie poster. Keep it to 1-2 sentences and be complimentary!`;

  return geminiService.generateWithImage(prompt, imageBase64, mimeType);
}
