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
  Medal,
  Loader2,
  Send,
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

type GamePhase = "intro" | "playing" | "feedback" | "results" | "leaderboard";

interface LeaderboardEntry {
  id: string;
  nickname: string;
  score: number;
  createdAt: Date;
}

interface ScoreRank {
  id: string;
  minScore: number;
  maxScore: number;
  title: string;
  imageUrl?: string;
}

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

  // Leaderboard state
  const [nickname, setNickname] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [playerRank, setPlayerRank] = useState<ScoreRank | null>(null);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);

  const startGame = useCallback(async () => {
    setIsLoadingImages(true);
    setHasSubmitted(false);
    setNickname("");
    setPlayerRank(null);
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

  // Fetch leaderboard and ranks
  const fetchLeaderboard = useCallback(async () => {
    setIsLoadingLeaderboard(true);
    try {
      const res = await fetch("/api/leaderboard/ai-or-not?limit=20");
      const data = await res.json();
      if (data.success) {
        setLeaderboard(data.data.entries || []);
      }
    } catch (error) {
      console.error("Failed to fetch leaderboard:", error);
    }
    setIsLoadingLeaderboard(false);
  }, []);

  // Fetch rank for current score
  const fetchRankForScore = useCallback(async (score: number) => {
    try {
      const res = await fetch("/api/leaderboard/ai-or-not?limit=1");
      const data = await res.json();
      if (data.success && data.data.ranks) {
        const ranks = data.data.ranks as ScoreRank[];
        const matchingRank = ranks.find((r) => score >= r.minScore && score <= r.maxScore);
        if (matchingRank) {
          setPlayerRank(matchingRank);
        }
      }
    } catch (error) {
      console.error("Failed to fetch rank:", error);
    }
  }, []);

  // Submit score to leaderboard
  const submitScore = async () => {
    if (!nickname.trim() || hasSubmitted) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/leaderboard/ai-or-not", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: nickname.trim(), score: totalScore }),
      });
      const data = await res.json();
      if (data.success) {
        setHasSubmitted(true);
        setPlayerRank(data.data.rank);
        await fetchLeaderboard();
        setPhase("leaderboard");
      }
    } catch (error) {
      console.error("Failed to submit score:", error);
    }
    setIsSubmitting(false);
  };

  // Skip leaderboard entry
  const skipLeaderboard = async () => {
    await fetchLeaderboard();
    setPhase("leaderboard");
  };

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
      // Calculate final score and fetch rank
      const finalScore = results.reduce((sum, r) => sum + r.points, 0) + (lastResult?.points || 0);
      fetchRankForScore(finalScore);
      setPhase("results");
    } else {
      setCurrentRound((prev) => prev + 1);
      setTimeRemaining(TIME_PER_ROUND);
      setPhase("playing");
    }
  }, [currentRound, results, lastResult, fetchRankForScore]);

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

                <div className="grid grid-cols-3 gap-2 md:gap-4 rounded-2xl bg-gradient-to-r from-[#76D95B]/20 to-[#96D966]/20 p-3 md:p-4 dark:from-[#76D95B]/10 dark:to-[#96D966]/10">
                  <div className="text-center">
                    <div className="text-xl md:text-2xl font-bold text-[#76D95B] dark:text-[#96D966]">
                      {TOTAL_ROUNDS}
                    </div>
                    <div className="text-[10px] md:text-xs text-gray-600 dark:text-gray-400">
                      Images
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl md:text-2xl font-bold text-[#76D95B] dark:text-[#96D966]">
                      {TIME_PER_ROUND}s
                    </div>
                    <div className="text-[10px] md:text-xs text-gray-600 dark:text-gray-400">
                      Per Image
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl md:text-2xl font-bold text-[#76D95B] dark:text-[#96D966]">
                      120
                    </div>
                    <div className="text-[10px] md:text-xs text-gray-600 dark:text-gray-400">
                      Max Score
                    </div>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={startGame}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#76D95B] to-[#96D966] px-6 md:px-8 py-3 md:py-4 text-base md:text-lg font-bold text-white shadow-lg"
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
                  <div className="grid grid-cols-2 gap-2 md:gap-4">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleGuess(true)}
                      className="flex items-center justify-center gap-1.5 md:gap-2 rounded-2xl bg-gradient-to-br from-[#2EA7F2] to-[#76D95B] p-3 md:p-4 text-sm md:text-base font-bold text-white shadow-lg"
                    >
                      <Bot className="h-5 w-5 md:h-6 md:w-6" />
                      AI Generated
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleGuess(false)}
                      className="flex items-center justify-center gap-1.5 md:gap-2 rounded-2xl bg-gradient-to-br from-[#76D95B] to-[#96D966] p-3 md:p-4 text-sm md:text-base font-bold text-white shadow-lg"
                    >
                      <User className="h-5 w-5 md:h-6 md:w-6" />
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
                {/* Score Display with Rank */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200 }}
                  className="rounded-2xl bg-gradient-to-br from-[#00D9FF] to-[#00FF94] p-6 md:p-8 text-white shadow-lg"
                >
                  {playerRank ? (
                    <>
                      {playerRank.imageUrl && (
                        <div className="mb-4 flex justify-center">
                          <Image
                            src={playerRank.imageUrl}
                            alt={playerRank.title}
                            width={100}
                            height={100}
                            className="rounded-xl"
                            unoptimized
                          />
                        </div>
                      )}
                      <h2 className="mb-2 text-xl md:text-2xl font-bold">{playerRank.title}</h2>
                    </>
                  ) : (
                    <>
                      <div className="mb-2 text-5xl md:text-6xl">{scoreMessage.emoji}</div>
                      <h2 className="mb-2 text-xl md:text-2xl font-bold">{scoreMessage.title}</h2>
                      <p className="mb-4 text-white/80 text-sm md:text-base">{scoreMessage.description}</p>
                    </>
                  )}
                  <div className="text-4xl md:text-5xl font-bold">{totalScore}</div>
                  <div className="text-sm text-white/60">points</div>
                </motion.div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl bg-[#1A1A1A] p-4 shadow">
                    <div className="text-2xl font-bold text-[#00FF94]">
                      {results.filter((r) => r.correct).length}
                    </div>
                    <div className="text-sm text-gray-400">
                      Correct
                    </div>
                  </div>
                  <div className="rounded-xl bg-[#1A1A1A] p-4 shadow">
                    <div className="text-2xl font-bold text-[#FF6B9D]">
                      {results.filter((r) => !r.correct).length}
                    </div>
                    <div className="text-sm text-gray-400">
                      Wrong
                    </div>
                  </div>
                </div>

                {/* Leaderboard Entry Form */}
                <div className="rounded-xl bg-[#1A1A1A] p-6">
                  <h3 className="mb-4 text-lg font-semibold text-white">
                    <Trophy className="mr-2 inline h-5 w-5 text-[#FFD23F]" />
                    Join the Leaderboard!
                  </h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder="Enter your nickname..."
                      maxLength={20}
                      className="flex-1 rounded-xl bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00D9FF]"
                      onKeyDown={(e) => e.key === "Enter" && submitScore()}
                    />
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={submitScore}
                      disabled={!nickname.trim() || isSubmitting}
                      className="rounded-xl bg-gradient-to-r from-[#00D9FF] to-[#00FF94] px-6 py-3 font-semibold text-white disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Send className="h-5 w-5" />
                      )}
                    </motion.button>
                  </div>
                  <button
                    onClick={skipLeaderboard}
                    className="mt-3 text-sm text-gray-500 hover:text-gray-300"
                  >
                    Skip and view leaderboard →
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleShare}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#FF6B9D] to-[#C44DFF] px-6 py-3 font-semibold text-white shadow-lg"
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

            {/* Leaderboard Phase */}
            {phase === "leaderboard" && (
              <motion.div
                key="leaderboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Player Rank Card */}
                {playerRank && (
                  <motion.div
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    className="rounded-2xl bg-gradient-to-br from-[#FFD23F] to-[#FF8534] p-6 text-center text-white shadow-lg"
                  >
                    {playerRank.imageUrl && (
                      <div className="mb-4 flex justify-center">
                        <Image
                          src={playerRank.imageUrl}
                          alt={playerRank.title}
                          width={120}
                          height={120}
                          className="rounded-xl"
                          unoptimized
                        />
                      </div>
                    )}
                    <h3 className="text-xl font-bold">{playerRank.title}</h3>
                    <p className="mt-2 text-white/80">Score: {totalScore} points</p>
                  </motion.div>
                )}

                {/* Your Score Summary */}
                <div className="rounded-xl bg-[#1A1A1A] p-4 text-center">
                  <div className="text-3xl font-bold text-[#00FF94]">{totalScore}</div>
                  <div className="text-sm text-gray-400">Your Score</div>
                </div>

                {/* Leaderboard */}
                <div className="rounded-xl bg-[#1A1A1A] p-6">
                  <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
                    <Trophy className="h-5 w-5 text-[#FFD23F]" />
                    Top Players
                  </h3>

                  {isLoadingLeaderboard ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                    </div>
                  ) : leaderboard.length === 0 ? (
                    <p className="py-8 text-center text-gray-500">
                      No entries yet. Be the first!
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {leaderboard.map((entry, index) => (
                        <div
                          key={entry.id}
                          className={`flex items-center gap-3 rounded-lg p-3 ${
                            index === 0
                              ? "bg-gradient-to-r from-[#FFD23F]/20 to-transparent"
                              : index === 1
                              ? "bg-gradient-to-r from-gray-400/20 to-transparent"
                              : index === 2
                              ? "bg-gradient-to-r from-[#CD7F32]/20 to-transparent"
                              : "bg-gray-800/50"
                          }`}
                        >
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-full font-bold ${
                              index === 0
                                ? "bg-[#FFD23F] text-black"
                                : index === 1
                                ? "bg-gray-400 text-black"
                                : index === 2
                                ? "bg-[#CD7F32] text-white"
                                : "bg-gray-700 text-gray-300"
                            }`}
                          >
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-white">
                              {entry.nickname}
                            </div>
                          </div>
                          <div className="text-lg font-bold text-[#00FF94]">
                            {entry.score}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={startGame}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#00D9FF] to-[#00FF94] px-6 py-3 font-semibold text-white shadow-lg"
                  >
                    <RotateCcw className="h-5 w-5" />
                    Play Again
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleShare}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-gray-700 px-6 py-3 font-semibold text-white"
                  >
                    <Share2 className="h-5 w-5" />
                    Share Score
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
