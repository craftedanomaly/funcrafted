"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  ArrowLeft,
  Bot,
  User,
  Clock,
  Trophy,
  Share2,
  RotateCcw,
  CheckCircle,
  XCircle,
  Timer,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getScoreMessage } from "./imageConfig";

interface ImageData {
  id: string;
  url: string;
  isAI: boolean;
  source?: string;
}

type GamePhase = "intro" | "playing" | "feedback" | "results";

interface GameResult {
  image: ImageData;
  userGuess: boolean | null;
  timeRemaining: number;
  correct: boolean;
  points: number;
}

const TOTAL_ROUNDS = 12;
const TIME_PER_ROUND = 10;

export default function AiOrNotPage() {
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [images, setImages] = useState<ImageData[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(TIME_PER_ROUND);
  const [results, setResults] = useState<GameResult[]>([]);
  const [totalScore, setTotalScore] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastResult, setLastResult] = useState<GameResult | null>(null);
  const [imageError, setImageError] = useState(false);
  const [isLoadingImages, setIsLoadingImages] = useState(false);

  const startGame = useCallback(async () => {
    setIsLoadingImages(true);
    try {
      const res = await fetch("/api/ai-or-not/images");
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        const gameImages = data.data.slice(0, TOTAL_ROUNDS);
        setImages(gameImages);
        setCurrentRound(0);
        setResults([]);
        setTotalScore(0);
        setTimeRemaining(TIME_PER_ROUND);
        setPhase("playing");
        setImageError(false);
      } else {
        alert("No images available. Please add images in the admin panel.");
      }
    } catch (error) {
      console.error("Failed to load images:", error);
      alert("Failed to load images. Please try again.");
    }
    setIsLoadingImages(false);
  }, []);

  const handleGuess = useCallback(
    (guessIsAI: boolean) => {
      if (phase !== "playing" || showFeedback) return;

      const currentImage = images[currentRound];
      const isCorrect = guessIsAI === currentImage.isAI;
      const points = isCorrect ? timeRemaining : 0;

      const result: GameResult = {
        image: currentImage,
        userGuess: guessIsAI,
        timeRemaining,
        correct: isCorrect,
        points,
      };

      setLastResult(result);
      setResults((prev) => [...prev, result]);
      setTotalScore((prev) => prev + points);
      setShowFeedback(true);
      setPhase("feedback");
    },
    [phase, showFeedback, images, currentRound, timeRemaining]
  );

  const handleTimeout = useCallback(() => {
    if (phase !== "playing" || showFeedback) return;

    const currentImage = images[currentRound];
    const result: GameResult = {
      image: currentImage,
      userGuess: null,
      timeRemaining: 0,
      correct: false,
      points: 0,
    };

    setLastResult(result);
    setResults((prev) => [...prev, result]);
    setShowFeedback(true);
    setPhase("feedback");
  }, [phase, showFeedback, images, currentRound]);

  const proceedToNext = useCallback(() => {
    setShowFeedback(false);
    setImageError(false);

    if (currentRound + 1 >= TOTAL_ROUNDS) {
      setPhase("results");
    } else {
      setCurrentRound((prev) => prev + 1);
      setTimeRemaining(TIME_PER_ROUND);
      setPhase("playing");
    }
  }, [currentRound]);

  // Timer effect
  useEffect(() => {
    if (phase !== "playing" || showFeedback) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, showFeedback, handleTimeout]);

  const handleShare = async () => {
    const scoreMessage = getScoreMessage(totalScore);
    const shareText = `🎮 AI or Not?\n\nI scored ${totalScore} points!\n${scoreMessage.emoji} ${scoreMessage.title}\n\nCan you beat my score?\nPlay at fun.craftedanomaly.com`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "AI or Not? - My Score",
          text: shareText,
        });
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      alert("Copied to clipboard!");
    }
  };

  const currentImage = images[currentRound];
  const scoreMessage = getScoreMessage(totalScore);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-[#76D95B]/20 via-white to-[#96D966]/20 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
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
            <div className="mb-4 inline-flex rounded-2xl bg-gradient-to-br from-[#76D95B] to-[#96D966] p-4">
              <Eye className="h-8 w-8 text-white" />
            </div>
            <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
              AI or Not?
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Can you spot the AI-generated images?
            </p>
          </motion.div>

          <AnimatePresence mode="wait">
            {/* Intro Phase */}
            {phase === "intro" && (
              <motion.div
                key="intro"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6 text-center"
              >
                <div className="rounded-2xl bg-white p-6 shadow-lg dark:bg-gray-800">
                  <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
                    How to Play
                  </h2>
                  <ul className="space-y-3 text-left text-gray-600 dark:text-gray-400">
                    <li className="flex items-start gap-3">
                      <Timer className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#76D95B]" />
                      <span>
                        You have <strong>10 seconds</strong> per image
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Eye className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#76D95B]" />
                      <span>
                        Decide if each image is <strong>AI-generated</strong> or{" "}
                        <strong>Real</strong>
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Trophy className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#76D95B]" />
                      <span>
                        Score = <strong>Seconds remaining</strong> when you
                        guess correctly
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="grid grid-cols-3 gap-4 rounded-2xl bg-gradient-to-r from-[#76D95B]/20 to-[#96D966]/20 p-4 dark:from-[#76D95B]/10 dark:to-[#96D966]/10">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[#76D95B] dark:text-[#96D966]">
                      {TOTAL_ROUNDS}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Images
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[#76D95B] dark:text-[#96D966]">
                      {TIME_PER_ROUND}s
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Per Image
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[#76D95B] dark:text-[#96D966]">
                      120
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Max Score
                    </div>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={startGame}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#76D95B] to-[#96D966] px-8 py-4 text-lg font-bold text-white shadow-lg"
                >
                  <Eye className="h-6 w-6" />
                  Start Game
                </motion.button>
              </motion.div>
            )}

            {/* Playing Phase */}
            {(phase === "playing" || phase === "feedback") && currentImage && (
              <motion.div
                key="playing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* Progress & Timer */}
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Round {currentRound + 1} / {TOTAL_ROUNDS}
                  </div>
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-amber-500" />
                    <span className="font-bold text-gray-900 dark:text-white">
                      {totalScore}
                    </span>
                  </div>
                </div>

                {/* Timer Bar */}
                <div className="relative h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  <motion.div
                    initial={{ width: "100%" }}
                    animate={{ width: `${(timeRemaining / TIME_PER_ROUND) * 100}%` }}
                    transition={{ duration: 0.5 }}
                    className={`h-full rounded-full ${
                      timeRemaining <= 3
                        ? "bg-red-500"
                        : timeRemaining <= 5
                        ? "bg-amber-500"
                        : "bg-[#76D95B]"
                    }`}
                  />
                </div>

                {/* Timer Display */}
                <div className="flex items-center justify-center gap-2">
                  <Clock
                    className={`h-5 w-5 ${
                      timeRemaining <= 3 ? "text-red-500 animate-pulse" : "text-gray-500"
                    }`}
                  />
                  <span
                    className={`text-2xl font-bold ${
                      timeRemaining <= 3
                        ? "text-red-500"
                        : "text-gray-900 dark:text-white"
                    }`}
                  >
                    {timeRemaining}s
                  </span>
                </div>

                {/* Image Display */}
                <motion.div
                  key={currentImage.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative aspect-square overflow-hidden rounded-2xl bg-gray-100 shadow-lg dark:bg-gray-800"
                >
                  {!imageError ? (
                    <Image
                      src={currentImage.url}
                      alt="Guess if this is AI or Real"
                      fill
                      className="object-cover"
                      onError={() => setImageError(true)}
                      unoptimized
                      priority
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center text-gray-500">
                      <Eye className="mb-2 h-12 w-12" />
                      <p className="text-sm">Image not found</p>
                      <p className="text-xs text-gray-400">
                        Add images to public/ai-or-not/
                      </p>
                    </div>
                  )}

                  {/* Feedback Overlay */}
                  <AnimatePresence>
                    {showFeedback && lastResult && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={`absolute inset-0 flex flex-col items-center justify-center ${
                          lastResult.correct
                            ? "bg-green-500/90"
                            : "bg-red-500/90"
                        }`}
                      >
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 300 }}
                        >
                          {lastResult.correct ? (
                            <CheckCircle className="h-20 w-20 text-white" />
                          ) : (
                            <XCircle className="h-20 w-20 text-white" />
                          )}
                        </motion.div>
                        <p className="mt-4 text-xl font-bold text-white">
                          {lastResult.correct ? "Correct!" : "Wrong!"}
                        </p>
                        <p className="mt-2 text-white/80">
                          This was{" "}
                          <strong>{lastResult.image.isAI ? "AI" : "Real"}</strong>
                        </p>
                        {lastResult.image.source && (
                          <p className="mt-1 text-xs text-white/60">
                            Source: {lastResult.image.source}
                          </p>
                        )}
                        {lastResult.correct && (
                          <p className="mt-1 text-white/80">
                            +{lastResult.points} points
                          </p>
                        )}
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={proceedToNext}
                          className="mt-4 rounded-full bg-white px-6 py-2 font-semibold text-gray-900"
                        >
                          {currentRound + 1 >= TOTAL_ROUNDS
                            ? "See Results"
                            : "Next Image"}
                        </motion.button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Guess Buttons */}
                {!showFeedback && (
                  <div className="grid grid-cols-2 gap-4">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleGuess(true)}
                      className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-[#2EA7F2] to-[#76D95B] p-4 font-bold text-white shadow-lg"
                    >
                      <Bot className="h-6 w-6" />
                      AI Generated
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleGuess(false)}
                      className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-[#76D95B] to-[#96D966] p-4 font-bold text-white shadow-lg"
                    >
                      <User className="h-6 w-6" />
                      Real Photo
                    </motion.button>
                  </div>
                )}
              </motion.div>
            )}

            {/* Results Phase */}
            {phase === "results" && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6 text-center"
              >
                {/* Score Display */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200 }}
                  className="rounded-2xl bg-gradient-to-br from-[#76D95B] to-[#96D966] p-8 text-white shadow-lg"
                >
                  <div className="mb-2 text-6xl">{scoreMessage.emoji}</div>
                  <h2 className="mb-2 text-2xl font-bold">{scoreMessage.title}</h2>
                  <p className="mb-4 text-white/80">{scoreMessage.description}</p>
                  <div className="text-5xl font-bold">{totalScore}</div>
                  <div className="text-sm text-white/60">points</div>
                </motion.div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl bg-white p-4 shadow dark:bg-gray-800">
                    <div className="text-2xl font-bold text-green-500">
                      {results.filter((r) => r.correct).length}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Correct
                    </div>
                  </div>
                  <div className="rounded-xl bg-white p-4 shadow dark:bg-gray-800">
                    <div className="text-2xl font-bold text-red-500">
                      {results.filter((r) => !r.correct).length}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Wrong
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleShare}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#2EA7F2] to-[#76D95B] px-6 py-3 font-semibold text-white shadow-lg"
                  >
                    <Share2 className="h-5 w-5" />
                    Share Score
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={startGame}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-gray-200 px-6 py-3 font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                  >
                    <RotateCcw className="h-5 w-5" />
                    Play Again
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <Footer />
    </div>
  );
}
