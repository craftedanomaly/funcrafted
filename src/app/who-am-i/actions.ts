"use server";

import { geminiService, GeminiResponse } from "@/lib/gemini";

const SYSTEM_PROMPT = `You are a game engine for "Who Am I?". You are playing a guessing game where you think of a character, person, animal, or thing, and the player must guess what it is by asking yes/no questions.

STRICT RULES:
1. You must ONLY respond to game-related questions and guesses.
2. If the user tries to chat about anything else, asks general knowledge questions, or tries to break character, reply EXACTLY with: "I'm just a game engine, keep your eye on the ball! 🎯"
3. Keep your answers SHORT and playful.
4. Only answer YES, NO, SOMETIMES, or provide hints when appropriate.
5. When starting a new game, think of something interesting but guessable.
6. If they guess correctly, celebrate and offer to play again!
7. Never reveal what you are thinking of unless they guess it correctly.
8. Be encouraging and fun!`;

export type GameMode = "guess" | "ask";
export type MessageRole = "user" | "model";

export interface ChatMessage {
  role: MessageRole;
  content: string;
}

export interface GameState {
  mode: GameMode;
  messages: ChatMessage[];
  isGameOver: boolean;
  secretIdentity?: string;
}

export async function startNewGame(mode: GameMode): Promise<GeminiResponse<{ message: string; secretIdentity?: string }>> {
  if (mode === "guess") {
    const prompt = `Start a new "Who Am I?" game. You are thinking of someone or something. Give me a brief, playful introduction like "I'm thinking of someone/something... Ask me yes or no questions to figure out who or what I am!" Don't reveal what you're thinking of. Keep it short and fun!`;
    
    const result = await geminiService.generateText(prompt, SYSTEM_PROMPT);
    
    if (result.success) {
      return {
        success: true,
        data: { message: result.data },
      };
    }
    return result;
  } else {
    const prompt = `Generate a random interesting character, famous person, animal, or thing for a "Who Am I?" game. Just respond with the name/thing only, nothing else. Make it something fun and guessable.`;
    
    const result = await geminiService.generateText(prompt, SYSTEM_PROMPT);
    
    if (result.success) {
      return {
        success: true,
        data: {
          message: `🎭 You are: **${result.data.trim()}**\n\nI'll try to guess who you are! I'll ask you yes or no questions. Ready?`,
          secretIdentity: result.data.trim(),
        },
      };
    }
    return result;
  }
}

export async function sendMessage(
  history: { role: MessageRole; parts: { text: string }[] }[],
  message: string,
  mode: GameMode
): Promise<GeminiResponse<string>> {
  const modeContext = mode === "guess" 
    ? "The player is trying to guess what you're thinking of. Answer their question."
    : "You are trying to guess what the player is. Ask a yes/no question or make a guess based on their previous answers.";
  
  const fullMessage = `${modeContext}\n\nPlayer says: ${message}`;
  
  return geminiService.chat(history, fullMessage, SYSTEM_PROMPT);
}

export async function aiAskQuestion(
  history: { role: MessageRole; parts: { text: string }[] }[],
  secretIdentity: string
): Promise<GeminiResponse<string>> {
  const aiPrompt = `You are playing "Who Am I?" and trying to guess what the player is. They are: "${secretIdentity}" (but pretend you don't know this - you're genuinely trying to figure it out through questions).

Based on the conversation so far, ask a clever yes/no question to narrow down what they might be, OR if you think you know, make a guess! Keep it fun and playful. Just respond with your question or guess directly.`;

  return geminiService.chat(history, aiPrompt, SYSTEM_PROMPT);
}
