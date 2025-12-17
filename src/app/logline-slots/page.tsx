"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clapperboard,
  ArrowLeft,
  Sparkles,
  Share2,
  RotateCcw,
  Dices,
  ExternalLink,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { QuotaErrorOverlay } from "@/components/QuotaErrorOverlay";
import {
  protagonists,
  settings,
  goals,
  getRandomItem,
  SlotItem,
} from "./slotData";
import type { SlotResult } from "./actions";
import { GeminiResponse } from "@/lib/gemini";

type GamePhase = "slots" | "spinning" | "premise" | "logline" | "result";

interface SlotState {
  protagonist: SlotItem | null;
  setting: SlotItem | null;
  goal: SlotItem | null;
}

export default function LoglineSlotsPage() {
  const [phase, setPhase] = useState<GamePhase>("slots");
  const [slots, setSlots] = useState<SlotState>({
    protagonist: null,
    setting: null,
    goal: null,
  });
  const [logline, setLogline] = useState<string>("");
  const [movieTitle, setMovieTitle] = useState<string>("");
  const [userPrompt, setUserPrompt] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [showQuotaError, setShowQuotaError] = useState(false);
  const [posterDataUrl, setPosterDataUrl] = useState<string>("");
  const [posterStylePrompt, setPosterStylePrompt] = useState<string>("");

  const spinSlots = useCallback(async () => {
    setPhase("spinning");
    setIsLoading(true);

    // Final selection - pick these first
    const finalSlots = {
      protagonist: getRandomItem(protagonists),
      setting: getRandomItem(settings),
      goal: getRandomItem(goals),
    };

    // Animate through random items for visual effect
    const spinDuration = 2000;
    const intervalTime = 100;
    let elapsed = 0;

    await new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        setSlots({
          protagonist: getRandomItem(protagonists),
          setting: getRandomItem(settings),
          goal: getRandomItem(goals),
        });
        elapsed += intervalTime;

        if (elapsed >= spinDuration) {
          clearInterval(interval);
          setSlots(finalSlots);
          resolve();
        }
      }, intervalTime);
    });

    // Spin is visual only. After animation completes, show premise UI.
    setPhase("premise");
    setIsLoading(false);
  }, []);

  const handleCreateLogline = async () => {
    if (!slots.protagonist || !slots.setting || !slots.goal) return;
    setIsLoading(true);
    setPosterDataUrl("");
    setLogline("");

    const slotResult: SlotResult = {
      protagonist: slots.protagonist.label,
      setting: slots.setting.label,
      goal: slots.goal.label,
    };

    try {
      const response = await fetch("/api/generate-logline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...slotResult,
          movieTitle,
          userPrompt,
        }),
      });

      const result: GeminiResponse<string> = await response.json();
      if (result.success) {
        setLogline(result.data);
        setPhase("logline");
      } else if (result.isQuotaError) {
        setShowQuotaError(true);
        setPhase("slots");
      } else {
        setShowQuotaError(true);
        setPhase("slots");
      }
    } catch (error) {
      console.error("Create logline error:", error);
      setShowQuotaError(true);
      setPhase("slots");
    }

    setIsLoading(false);
  };

  const handleGeneratePoster = async () => {
    if (!slots.protagonist || !slots.setting || !slots.goal) return;
    if (!movieTitle.trim() || !logline.trim()) return;
    setIsLoading(true);

    const payload = {
      protagonist: slots.protagonist.label,
      setting: slots.setting.label,
      goal: slots.goal.label,
      movieTitle,
      logline,
      stylePrompt: posterStylePrompt,
    };

    try {
      const response = await fetch("/api/generate-poster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result: GeminiResponse<{ mimeType: string; base64: string }> = await response.json();
      if (result.success) {
        setPosterDataUrl(`data:${result.data.mimeType};base64,${result.data.base64}`);
        setPhase("result");
      } else if (result.isQuotaError) {
        setShowQuotaError(true);
      } else {
        setShowQuotaError(true);
      }
    } catch (error) {
      console.error("Generate poster error:", error);
      setShowQuotaError(true);
    }

    setIsLoading(false);
  };

  const handleReset = () => {
    setPhase("slots");
    setSlots({ protagonist: null, setting: null, goal: null });
    setLogline("");
    setMovieTitle("");
    setUserPrompt("");
    setPosterDataUrl("");
    setPosterStylePrompt("");
  };

  const handleShare = async () => {
    const shareText = `🎬 My AI Movie Logline:\n\n"${movieTitle}"\n\n${logline}\n\nCreate yours at fun.craftedanomaly.com`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: movieTitle,
          text: shareText,
        });
      } catch {
        // User cancelled or error
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      alert("Copied to clipboard!");
    }
  };

  const SlotReel = ({
    item,
    label,
    color,
  }: {
    item: SlotItem | null;
    label: string;
    color: string;
  }) => {
    const Icon = item?.icon;
    return (
      <div className="flex flex-col items-center">
        <span className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {label}
        </span>
        <motion.div
          animate={
            phase === "spinning" ? { y: [0, -10, 0], scale: [1, 1.1, 1] } : {}
          }
          transition={{ duration: 0.1, repeat: phase === "spinning" ? Infinity : 0 }}
          className={`flex h-20 w-20 md:h-28 md:w-28 items-center justify-center rounded-2xl bg-gradient-to-br ${color} p-1 shadow-lg`}
        >
          <div className="flex h-full w-full items-center justify-center rounded-xl bg-white dark:bg-gray-900">
            {Icon ? (
              <Icon className="h-10 w-10 md:h-14 md:w-14 text-gray-700 dark:text-gray-300" />
            ) : (
              <span className="text-2xl md:text-3xl">?</span>
            )}
          </div>
        </motion.div>
        <AnimatePresence mode="wait">
          {item && (
            <motion.p
              key={item.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-2 max-w-[120px] text-center text-xs text-gray-600 dark:text-gray-400"
            >
              {item.label}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-[#F2CD13]/20 via-white to-[#F2695C]/20 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
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
            <div className="mb-4 inline-flex rounded-2xl bg-gradient-to-br from-[#F2CD13] to-[#F2695C] p-4">
              <Clapperboard className="h-8 w-8 text-white" />
            </div>
            <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
              AI Logline Creator
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Spin the slots and let AI write your movie!
            </p>
          </motion.div>

          {/* Slot Machine */}
          <AnimatePresence mode="wait">
            {(phase === "slots" || phase === "spinning") && (
              <motion.div
                key="slots"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="space-y-8"
              >
                {/* Slot Reels */}
                <div className="flex items-center justify-center gap-2 md:gap-4 flex-wrap">
                  <SlotReel
                    item={slots.protagonist}
                    label="Protagonist"
                    color="from-[#2EA7F2] to-[#76D95B]"
                  />
                  <span className="mt-6 text-xl md:text-2xl font-bold text-gray-400 hidden sm:block">+</span>
                  <SlotReel
                    item={slots.setting}
                    label="Setting"
                    color="from-[#76D95B] to-[#96D966]"
                  />
                  <span className="mt-6 text-xl md:text-2xl font-bold text-gray-400 hidden sm:block">+</span>
                  <SlotReel
                    item={slots.goal}
                    label="Goal"
                    color="from-[#F2CD13] to-[#F2695C]"
                  />
                </div>

                {/* Spin Button */}
                <div className="flex justify-center">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={spinSlots}
                    disabled={phase === "spinning"}
                    className="inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-[#F2CD13] to-[#F2695C] px-8 py-4 text-lg font-bold text-white shadow-lg transition-shadow hover:shadow-xl hover:shadow-[#F2CD13]/25 disabled:opacity-50"
                  >
                    <Dices className={`h-6 w-6 ${phase === "spinning" ? "animate-spin" : ""}`} />
                    {phase === "spinning" ? "Spinning..." : "Spin the Slots!"}
                  </motion.button>
                </div>
              </motion.div>
            )}

            {phase === "premise" && (
              <motion.div
                key="premise"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Slot Icons Display */}
                <div className="flex items-center justify-center gap-2 md:gap-4 flex-wrap">
                  {slots.protagonist && (
                    <div className="flex flex-col items-center">
                      <div className="flex h-14 w-14 md:h-20 md:w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2EA7F2] to-[#76D95B] p-1 shadow-lg">
                        <div className="flex h-full w-full items-center justify-center rounded-xl bg-white dark:bg-gray-900">
                          <slots.protagonist.icon className="h-7 w-7 md:h-10 md:w-10 text-[#2EA7F2]" />
                        </div>
                      </div>
                      <span className="mt-1 text-[10px] md:text-xs text-gray-500 dark:text-gray-400">Protagonist</span>
                    </div>
                  )}
                  <span className="text-xl md:text-2xl font-bold text-gray-400 hidden sm:block">+</span>
                  {slots.setting && (
                    <div className="flex flex-col items-center">
                      <div className="flex h-14 w-14 md:h-20 md:w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#76D95B] to-[#96D966] p-1 shadow-lg">
                        <div className="flex h-full w-full items-center justify-center rounded-xl bg-white dark:bg-gray-900">
                          <slots.setting.icon className="h-7 w-7 md:h-10 md:w-10 text-[#76D95B]" />
                        </div>
                      </div>
                      <span className="mt-1 text-[10px] md:text-xs text-gray-500 dark:text-gray-400">Setting</span>
                    </div>
                  )}
                  <span className="text-xl md:text-2xl font-bold text-gray-400 hidden sm:block">+</span>
                  {slots.goal && (
                    <div className="flex flex-col items-center">
                      <div className="flex h-14 w-14 md:h-20 md:w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F2CD13] to-[#F2695C] p-1 shadow-lg">
                        <div className="flex h-full w-full items-center justify-center rounded-xl bg-white dark:bg-gray-900">
                          <slots.goal.icon className="h-7 w-7 md:h-10 md:w-10 text-[#F2695C]" />
                        </div>
                      </div>
                      <span className="mt-1 text-[10px] md:text-xs text-gray-500 dark:text-gray-400">Goal</span>
                    </div>
                  )}
                </div>

                <div className="rounded-2xl bg-white p-6 shadow-lg dark:bg-gray-800">
                  <div className="mb-3 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-[#F2CD13]" />
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Premise
                    </span>
                  </div>
                  <p className="text-lg text-gray-800 dark:text-gray-200">
                    <span className="font-semibold">{slots.protagonist?.label}</span>{" "}
                    <span>in</span>{" "}
                    <span className="font-semibold">{slots.setting?.label}</span>{" "}
                    <span>tries to</span>{" "}
                    <span className="font-semibold">{slots.goal?.label}</span>.
                  </p>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    Give your movie a title and a tiny prompt, then generate the logline.
                  </p>
                </div>

                <div className="space-y-3 rounded-2xl bg-white/60 p-6 backdrop-blur-sm dark:bg-gray-900/50">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Movie Title
                    </label>
                    <input
                      type="text"
                      value={movieTitle}
                      onChange={(e) => setMovieTitle(e.target.value)}
                      placeholder="e.g. Moon Dog: Love on the Dark Side"
                      className="w-full rounded-xl border-0 bg-white px-4 py-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-[#F2CD13] dark:bg-gray-800 dark:text-white dark:ring-gray-700"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Prompt (optional)
                    </label>
                    <input
                      type="text"
                      value={userPrompt}
                      onChange={(e) => setUserPrompt(e.target.value)}
                      placeholder="e.g. Make it rom-com + sci-fi, super punchy"
                      className="w-full rounded-xl border-0 bg-white px-4 py-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-[#F2CD13] dark:bg-gray-800 dark:text-white dark:ring-gray-700"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCreateLogline}
                    disabled={!movieTitle.trim() || isLoading}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#2EA7F2] to-[#76D95B] px-6 py-3 font-semibold text-white shadow-lg disabled:opacity-50"
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Sparkles className="h-5 w-5" />
                    )}
                    {isLoading ? "Writing..." : "Create Logline"}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleReset}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-gray-200 px-6 py-3 font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                  >
                    <RotateCcw className="h-5 w-5" />
                    Spin Again
                  </motion.button>
                </div>
              </motion.div>
            )}

            {phase === "logline" && (
              <motion.div
                key="logline"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Mini Slots Display */}
                <div className="flex items-center justify-center gap-2">
                  {slots.protagonist && (
                    <div className="rounded-lg bg-[#2EA7F2]/20 p-2 dark:bg-[#2EA7F2]/20">
                      <slots.protagonist.icon className="h-6 w-6 text-[#2EA7F2] dark:text-[#2EA7F2]" />
                    </div>
                  )}
                  <span className="text-gray-400">+</span>
                  {slots.setting && (
                    <div className="rounded-lg bg-[#76D95B]/20 p-2 dark:bg-[#76D95B]/20">
                      <slots.setting.icon className="h-6 w-6 text-[#76D95B] dark:text-[#76D95B]" />
                    </div>
                  )}
                  <span className="text-gray-400">+</span>
                  {slots.goal && (
                    <div className="rounded-lg bg-[#F2695C]/20 p-2 dark:bg-[#F2695C]/20">
                      <slots.goal.icon className="h-6 w-6 text-[#F2695C] dark:text-[#F2695C]" />
                    </div>
                  )}
                </div>

                {/* Logline Display */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="rounded-2xl bg-white p-6 shadow-lg dark:bg-gray-800"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-[#F2CD13]" />
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Your Movie Logline
                    </span>
                  </div>
                  <p className="text-lg italic text-gray-800 dark:text-gray-200">
                    &ldquo;{logline}&rdquo;
                  </p>
                </motion.div>

                <div className="rounded-2xl bg-white/60 p-6 backdrop-blur-sm dark:bg-gray-900/50">
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Poster style (optional)
                  </label>
                  <input
                    type="text"
                    value={posterStylePrompt}
                    onChange={(e) => setPosterStylePrompt(e.target.value)}
                    placeholder="e.g. 90s action poster, neon, grainy film"
                    className="w-full rounded-xl border-0 bg-white px-4 py-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-[#F2CD13] dark:bg-gray-800 dark:text-white dark:ring-gray-700"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleGeneratePoster}
                    disabled={isLoading}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#F2CD13] to-[#F2695C] px-6 py-3 font-semibold text-white shadow-lg disabled:opacity-50"
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Clapperboard className="h-5 w-5" />
                    )}
                    {isLoading ? "Generating Poster..." : "Create Movie Poster"}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleReset}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-gray-200 px-6 py-3 font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                  >
                    <RotateCcw className="h-5 w-5" />
                    Spin Again
                  </motion.button>
                </div>
              </motion.div>
            )}

            {phase === "result" && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Movie Poster */}
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 200 }}
                  className="relative mx-auto aspect-[2/3] max-w-sm overflow-hidden rounded-2xl bg-gradient-to-br from-[#F2CD13] via-[#F2695C] to-[#F2695C] p-1 shadow-2xl"
                >
                  {posterDataUrl ? (
                    <img
                      src={posterDataUrl}
                      alt="Generated movie poster"
                      className="h-full w-full rounded-xl object-cover"
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center rounded-xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6 text-center">
                      <Clapperboard className="mb-4 h-16 w-16 text-[#F2CD13]" />
                      <h2 className="mb-4 text-2xl font-bold text-white">
                        {movieTitle}
                      </h2>
                      <p className="text-sm italic text-gray-300">
                        &ldquo;{logline}&rdquo;
                      </p>
                      <div className="mt-6 text-xs text-gray-500">
                        🎬 A fun.crafted Production
                      </div>
                    </div>
                  )}
                </motion.div>

                {/* Share Buttons */}
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleShare}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#2EA7F2] to-[#76D95B] px-6 py-3 font-semibold text-white shadow-lg"
                  >
                    <Share2 className="h-5 w-5" />
                    Share
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleReset}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-gray-200 px-6 py-3 font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                  >
                    <RotateCcw className="h-5 w-5" />
                    Create Another
                  </motion.button>
                </div>

                {/* CTA Button */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="rounded-2xl bg-gradient-to-r from-[#2EA7F2] via-[#76D95B] to-[#F2CD13] p-1"
                >
                  <a
                    href="https://craftedanomaly.com/projects/behind-the-scenes"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-xl bg-white p-4 transition-colors hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800"
                  >
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">
                        🎲 Wanna play a boardgame like this?
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Check out &quot;Behind the Scenes&quot; - a physical card game!
                      </p>
                    </div>
                    <ExternalLink className="h-5 w-5 text-gray-400" />
                  </a>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
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
