"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Send,
  RotateCcw,
  ArrowLeft,
  Sparkles,
  User,
  Bot,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { QuotaErrorOverlay } from "@/components/QuotaErrorOverlay";
import type { GeminiResponse } from "@/lib/gemini";

type GameMode = "guess" | "ask";
type MessageRole = "user" | "model";

interface ChatMessage {
  role: MessageRole;
  content: string;
}

export default function WhoAmIPage() {
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showQuotaError, setShowQuotaError] = useState(false);
  const [secretIdentity, setSecretIdentity] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleStartGame = async (mode: GameMode) => {
    setIsLoading(true);
    setGameMode(mode);
    setMessages([]);
    setSecretIdentity(null);

    try {
      const response = await fetch("/api/who-am-i", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", mode }),
      });
      const result: GeminiResponse<{ message: string; secretIdentity?: string }> = await response.json();

      if (result.success) {
        setMessages([{ role: "model", content: result.data.message }]);
        if (result.data.secretIdentity) {
          setSecretIdentity(result.data.secretIdentity);
        }
      } else if (result.isQuotaError) {
        setShowQuotaError(true);
        setGameMode(null);
      } else {
        setShowQuotaError(true);
        setGameMode(null);
      }
    } catch (error) {
      console.error("Start game error:", error);
      setShowQuotaError(true);
      setGameMode(null);
    }

    setIsLoading(false);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    const history = messages.map((msg) => ({
      role: msg.role as "user" | "model",
      parts: [{ text: msg.content }],
    }));

    try {
      const response = await fetch("/api/who-am-i", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "chat", mode: gameMode, history, message: userMessage }),
      });
      const result: GeminiResponse<string> = await response.json();

      if (result.success) {
        setMessages((prev) => [...prev, { role: "model", content: result.data }]);

        // If in "ask" mode, AI should ask a follow-up question
        if (gameMode === "ask" && secretIdentity) {
          const updatedHistory = [
            ...history,
            { role: "user" as const, parts: [{ text: userMessage }] },
            { role: "model" as const, parts: [{ text: result.data }] },
          ];

          setTimeout(async () => {
            try {
              const aiResponse = await fetch("/api/who-am-i", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "aiAsk", history: updatedHistory, secretIdentity }),
              });
              const aiQuestion: GeminiResponse<string> = await aiResponse.json();
              
              if (aiQuestion.success) {
                setMessages((prev) => [
                  ...prev,
                  { role: "model", content: aiQuestion.data },
                ]);
              }
            } catch (error) {
              console.error("AI question error:", error);
            }
            setIsLoading(false);
          }, 1000);
          return;
        }
      } else if (result.isQuotaError) {
        setShowQuotaError(true);
      } else {
        setShowQuotaError(true);
      }
    } catch (error) {
      console.error("Send message error:", error);
      setShowQuotaError(true);
    }

    setIsLoading(false);
  };

  const handleReset = () => {
    setGameMode(null);
    setMessages([]);
    setSecretIdentity(null);
    setInputValue("");
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-[#2EA7F2]/20 via-white to-[#76D95B]/20 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <Header />

      <main className="flex flex-1 flex-col pt-20">
        <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
          {/* Back Button */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-6"
          >
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Games
            </Link>
          </motion.div>

          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 text-center"
          >
            <div className="mb-4 inline-flex rounded-2xl bg-gradient-to-br from-[#2EA7F2] to-[#76D95B] p-4">
              <Brain className="h-8 w-8 text-white" />
            </div>
            <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
              Who Am I?
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              A classic guessing game powered by AI
            </p>
          </motion.div>

          {/* Mode Selection */}
          {!gameMode && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-4"
            >
              <p className="text-center text-gray-700 dark:text-gray-300">
                Choose your game mode:
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleStartGame("guess")}
                  disabled={isLoading}
                  className="rounded-2xl bg-gradient-to-br from-[#2EA7F2] to-[#76D95B] p-6 text-left text-white transition-shadow hover:shadow-lg hover:shadow-[#2EA7F2]/25 disabled:opacity-50"
                >
                  <User className="mb-3 h-8 w-8" />
                  <h3 className="mb-1 text-lg font-bold">I Guess</h3>
                  <p className="text-sm text-white/80">
                    AI thinks of something, you ask questions to guess it!
                  </p>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleStartGame("ask")}
                  disabled={isLoading}
                  className="rounded-2xl bg-gradient-to-br from-[#F2CD13] to-[#F2695C] p-6 text-left text-white transition-shadow hover:shadow-lg hover:shadow-[#F2CD13]/25 disabled:opacity-50"
                >
                  <Bot className="mb-3 h-8 w-8" />
                  <h3 className="mb-1 text-lg font-bold">AI Guesses</h3>
                  <p className="text-sm text-white/80">
                    You become someone/something, AI asks questions to guess!
                  </p>
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Chat Interface */}
          {gameMode && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-1 flex-col"
            >
              {/* Messages Container */}
              <div className="mb-4 flex-1 space-y-4 overflow-y-auto rounded-2xl bg-white/50 p-4 backdrop-blur-sm dark:bg-gray-900/50">
                <AnimatePresence mode="popLayout">
                  {messages.map((message, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={`flex ${
                        message.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                          message.role === "user"
                            ? "bg-gradient-to-br from-[#2EA7F2] to-[#76D95B] text-white"
                            : "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white"
                        }`}
                      >
                        <p className="whitespace-pre-wrap text-sm">
                          {message.content}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className="flex items-center gap-2 rounded-2xl bg-gray-100 px-4 py-3 dark:bg-gray-800">
                      <Loader2 className="h-4 w-4 animate-spin text-[#2EA7F2]" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Thinking...
                      </span>
                    </div>
                  </motion.div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleReset}
                  className="rounded-xl bg-gray-200 p-3 text-gray-700 transition-colors hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  title="New Game"
                >
                  <RotateCcw className="h-5 w-5" />
                </motion.button>

                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder={
                    gameMode === "guess"
                      ? "Ask a yes/no question or make a guess..."
                      : "Answer yes, no, or give a hint..."
                  }
                  disabled={isLoading}
                  className="flex-1 rounded-xl border-0 bg-white px-4 py-3 text-gray-900 placeholder-gray-500 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-[#2EA7F2] disabled:opacity-50 dark:bg-gray-800 dark:text-white dark:ring-gray-700 dark:placeholder-gray-400"
                />

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isLoading}
                  className="rounded-xl bg-gradient-to-br from-[#2EA7F2] to-[#76D95B] p-3 text-white transition-opacity disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </motion.button>
              </div>
            </motion.div>
          )}
        </div>
      </main>

      <Footer />

      <QuotaErrorOverlay
        isVisible={showQuotaError}
        onRetry={() => setShowQuotaError(false)}
      />
    </div>
  );
}
