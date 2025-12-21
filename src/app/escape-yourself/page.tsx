"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Play,
  RotateCcw,
  Trophy,
  Smartphone,
  MousePointerClick,
  Gauge,
} from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

// Types
interface Point {
  x: number;
  y: number;
  t: number; // timestamp relative to round start
}

interface Ghost {
  id: number;
  path: Point[];
  currentIndex: number;
}

type GamePhase = "intro" | "playing" | "gameover" | "leaderboard";

// Constants
const PLAYER_RADIUS = 12;
const GHOST_RADIUS = 10;
const TARGET_RADIUS = 30;
const COLLISION_DISTANCE = PLAYER_RADIUS + GHOST_RADIUS - 4;
const TARGET_HIT_DISTANCE = PLAYER_RADIUS + TARGET_RADIUS;
const RECORDING_INTERVAL = 16; // ~60fps

// Custom Cursor Component
function PlayerCursor({ x, y, trail }: { x: number; y: number; trail: Point[] }) {
  return (
    <>
      {/* Trail */}
      {trail.slice(-8).map((point, i) => (
        <div
          key={i}
          className="pointer-events-none absolute rounded-full"
          style={{
            left: point.x - 4,
            top: point.y - 4,
            width: 8,
            height: 8,
            background: `rgba(0, 217, 255, ${0.1 + i * 0.05})`,
            boxShadow: `0 0 ${4 + i}px rgba(0, 217, 255, ${0.2 + i * 0.05})`,
          }}
        />
      ))}
      {/* Main cursor */}
      <div
        className="pointer-events-none absolute"
        style={{
          left: x - PLAYER_RADIUS,
          top: y - PLAYER_RADIUS,
          width: PLAYER_RADIUS * 2,
          height: PLAYER_RADIUS * 2,
        }}
      >
        <div
          className="h-full w-full rounded-full"
          style={{
            background: "radial-gradient(circle, #00D9FF 0%, #0099CC 50%, transparent 70%)",
            boxShadow: "0 0 20px #00D9FF, 0 0 40px rgba(0, 217, 255, 0.5), inset 0 0 10px rgba(255,255,255,0.3)",
          }}
        />
      </div>
    </>
  );
}

// Ghost Cursor Component
function GhostCursor({ x, y, opacity }: { x: number; y: number; opacity: number }) {
  return (
    <div
      className="pointer-events-none absolute"
      style={{
        left: x - GHOST_RADIUS,
        top: y - GHOST_RADIUS,
        width: GHOST_RADIUS * 2,
        height: GHOST_RADIUS * 2,
        opacity: opacity * (0.7 + Math.random() * 0.3), // Glitch flicker
      }}
    >
      <div
        className="h-full w-full rounded-full"
        style={{
          background: "radial-gradient(circle, #FF4444 0%, #CC0000 50%, transparent 70%)",
          boxShadow: "0 0 15px #FF4444, 0 0 30px rgba(255, 68, 68, 0.4)",
          filter: "blur(0.5px)",
        }}
      />
    </div>
  );
}

// Target Component
function Target({ x, y }: { x: number; y: number }) {
  return (
    <motion.div
      className="pointer-events-none absolute"
      style={{
        left: x - TARGET_RADIUS,
        top: y - TARGET_RADIUS,
        width: TARGET_RADIUS * 2,
        height: TARGET_RADIUS * 2,
      }}
      animate={{
        scale: [1, 1.1, 1],
        opacity: [0.8, 1, 0.8],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      <div
        className="h-full w-full rounded-full"
        style={{
          background: "radial-gradient(circle, #00FF94 0%, #00CC77 40%, transparent 70%)",
          boxShadow: "0 0 25px #00FF94, 0 0 50px rgba(0, 255, 148, 0.4)",
        }}
      />
    </motion.div>
  );
}

export default function EscapeYourselfPage() {
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [currentLoop, setCurrentLoop] = useState(1);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showCollision, setShowCollision] = useState(false);
  const [controlMode, setControlMode] = useState<"mouse" | "touch">("mouse");
  const [hasPointerDrag, setHasPointerDrag] = useState(false);
  
  // Leaderboard state
  const [nickname, setNickname] = useState("");
  const [leaderboard, setLeaderboard] = useState<{ nickname: string; score: number }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const fetchLeaderboardEntries = useCallback(async () => {
    try {
      const res = await fetch("/api/leaderboard/escape-yourself?limit=10");
      const data = await res.json();
      if (data.success) {
        setLeaderboard(data.data.entries || []);
      }
    } catch (error) {
      console.error("Leaderboard fetch error:", error);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboardEntries();
  }, [fetchLeaderboardEntries]);

  // Game refs for 60fps performance
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const roundStartTimeRef = useRef<number>(0);
  const gameStartTimeRef = useRef<number>(0);
  const scoreRef = useRef<number>(0);

  // Player state (refs for performance)
  const playerPosRef = useRef({ x: 0, y: 0 });
  const [playerPos, setPlayerPos] = useState({ x: 0, y: 0 });
  const trailRef = useRef<Point[]>([]);
  const [trail, setTrail] = useState<Point[]>([]);

  // Recording state
  const currentPathRef = useRef<Point[]>([]);
  const lastRecordTimeRef = useRef<number>(0);

  // Ghosts state
  const ghostsRef = useRef<Ghost[]>([]);
  const [ghostPositions, setGhostPositions] = useState<{ id: number; x: number; y: number }[]>([]);

  // Target state
  const [targetPos, setTargetPos] = useState({ x: 300, y: 300 });

  // Game dimensions
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Initialize dimensions
  useEffect(() => {
    const updateDimensions = () => {
      if (gameAreaRef.current) {
        const rect = gameAreaRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // Pre-detect coarse pointers (mobile / touch-first devices)
  useEffect(() => {
    if (typeof window === "undefined" || !("matchMedia" in window)) return;
    const query = window.matchMedia("(pointer: coarse)");
    if (query.matches) {
      setControlMode("touch");
    }
  }, []);

  // Spawn target at random position (away from player)
  const spawnTarget = useCallback(() => {
    const padding = 60;
    let newX, newY;
    let attempts = 0;
    do {
      newX = padding + Math.random() * (dimensions.width - padding * 2);
      newY = padding + Math.random() * (dimensions.height - padding * 2);
      attempts++;
    } while (
      Math.hypot(newX - playerPosRef.current.x, newY - playerPosRef.current.y) < 150 &&
      attempts < 20
    );
    setTargetPos({ x: newX, y: newY });
  }, [dimensions]);

  // Start game
  const startGame = useCallback(() => {
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    
    playerPosRef.current = { x: centerX, y: centerY };
    setPlayerPos({ x: centerX, y: centerY });
    trailRef.current = [];
    setTrail([]);
    currentPathRef.current = [];
    ghostsRef.current = [];
    setGhostPositions([]);
    setCurrentLoop(1);
    setScore(0);
    scoreRef.current = 0;
    setElapsedTime(0);
    setHasSubmitted(false);
    setNickname("");
    setHasPointerDrag(false);
    
    const now = performance.now();
    roundStartTimeRef.current = now;
    gameStartTimeRef.current = now;
    lastRecordTimeRef.current = 0;
    lastSecondRef.current = 0;
    
    spawnTarget();
    setPhase("playing");
  }, [dimensions, spawnTarget]);

  const updatePlayerPosition = useCallback((clientX: number, clientY: number) => {
    if (!gameAreaRef.current) return;
    const rect = gameAreaRef.current.getBoundingClientRect();
    const x = Math.max(PLAYER_RADIUS, Math.min(clientX - rect.left, rect.width - PLAYER_RADIUS));
    const y = Math.max(PLAYER_RADIUS, Math.min(clientY - rect.top, rect.height - PLAYER_RADIUS));

    playerPosRef.current = { x, y };

    const now = performance.now();
    trailRef.current.push({ x, y, t: now });
    if (trailRef.current.length > 10) trailRef.current.shift();

    const elapsed = now - roundStartTimeRef.current;
    if (elapsed - lastRecordTimeRef.current >= RECORDING_INTERVAL) {
      currentPathRef.current.push({ x, y, t: elapsed });
      lastRecordTimeRef.current = elapsed;
    }
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (phase !== "playing") return;
      setControlMode(e.pointerType === "touch" ? "touch" : "mouse");
      setHasPointerDrag(true);
      gameAreaRef.current?.setPointerCapture(e.pointerId);
      updatePlayerPosition(e.clientX, e.clientY);
    },
    [phase, updatePlayerPosition]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (phase !== "playing") return;
      updatePlayerPosition(e.clientX, e.clientY);
    },
    [phase, updatePlayerPosition]
  );

  const handlePointerEnd = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    setHasPointerDrag(false);
    if (gameAreaRef.current?.hasPointerCapture(e.pointerId)) {
      gameAreaRef.current.releasePointerCapture(e.pointerId);
    }
  }, []);

  const handlePointerLeave = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!hasPointerDrag) return;
      handlePointerEnd(e);
    },
    [hasPointerDrag, handlePointerEnd]
  );

  const ControlIcon = controlMode === "touch" ? Smartphone : MousePointerClick;
  const loopProgress = Math.min((currentLoop - 1) / 10, 1);
  const loopProgressPercent = Math.round(loopProgress * 100);
  const progressWidth = `${Math.max(loopProgressPercent, 6)}%`;
  const topLoopersPreview = leaderboard.slice(0, 3);

  // Check collision with ghosts
  const checkGhostCollision = useCallback(() => {
    const px = playerPosRef.current.x;
    const py = playerPosRef.current.y;
    
    for (const ghost of ghostsRef.current) {
      if (ghost.path.length === 0) continue;
      const idx = Math.min(ghost.currentIndex, ghost.path.length - 1);
      const gp = ghost.path[idx];
      const dist = Math.hypot(px - gp.x, py - gp.y);
      if (dist < COLLISION_DISTANCE) {
        return true;
      }
    }
    return false;
  }, []);

  // Check target hit
  const checkTargetHit = useCallback(() => {
    const px = playerPosRef.current.x;
    const py = playerPosRef.current.y;
    const dist = Math.hypot(px - targetPos.x, py - targetPos.y);
    return dist < TARGET_HIT_DISTANCE;
  }, [targetPos]);

  // Complete round
  const completeRound = useCallback(() => {
    // Save current path as new ghost
    if (currentPathRef.current.length > 0) {
      ghostsRef.current.push({
        id: currentLoop,
        path: [...currentPathRef.current],
        currentIndex: 0,
      });
    }
    
    // Add score: +20 for completing loop
    scoreRef.current += 20;
    setScore(scoreRef.current);
    
    // Reset for next round
    currentPathRef.current = [];
    roundStartTimeRef.current = performance.now();
    lastRecordTimeRef.current = 0;
    
    // Reset all ghost indices
    ghostsRef.current.forEach((g) => (g.currentIndex = 0));
    
    setCurrentLoop((prev) => prev + 1);
    spawnTarget();
  }, [currentLoop, spawnTarget]);

  // Game over
  const gameOver = useCallback(() => {
    // Show collision effect first
    setShowCollision(true);
    cancelAnimationFrame(animationFrameRef.current);
    
    // Delay game over screen for visual feedback
    setTimeout(() => {
      setShowCollision(false);
      setPhase("gameover");
      
      // Final score is already calculated with time penalty
      const finalScore = Math.max(0, scoreRef.current);
      setScore(finalScore);
      if (finalScore > highScore) {
        setHighScore(finalScore);
      }
      
      // Fetch leaderboard
      fetch("/api/leaderboard/escape-yourself?limit=10")
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setLeaderboard(data.data.entries || []);
          }
        })
        .catch(console.error);
    }, 500);
  }, [highScore]);

  // Submit score
  const submitScore = async () => {
    if (!nickname.trim() || hasSubmitted) return;
    
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/leaderboard/escape-yourself", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: nickname.trim().slice(0, 12), score: score }),
      });
      const data = await res.json();
      if (data.success) {
        setHasSubmitted(true);
        // Refresh leaderboard
        const lbRes = await fetch("/api/leaderboard/escape-yourself?limit=10");
        const lbData = await lbRes.json();
        if (lbData.success) {
          setLeaderboard(lbData.data.entries || []);
        }
        setPhase("leaderboard");
      }
    } catch (error) {
      console.error("Submit error:", error);
    }
    setIsSubmitting(false);
  };

  // Main game loop (60fps)
  const lastSecondRef = useRef<number>(0);
  
  const gameLoop = useCallback((timestamp: number) => {
    if (phase !== "playing") return;
    
    const elapsed = timestamp - roundStartTimeRef.current;
    const totalElapsed = timestamp - gameStartTimeRef.current;
    const currentSecond = Math.floor(totalElapsed / 1000);
    
    // Apply -1 score per second
    if (currentSecond > lastSecondRef.current) {
      const secondsPassed = currentSecond - lastSecondRef.current;
      scoreRef.current = Math.max(0, scoreRef.current - secondsPassed);
      lastSecondRef.current = currentSecond;
    }
    
    // Update ghost positions
    const newGhostPositions: { id: number; x: number; y: number }[] = [];
    
    for (const ghost of ghostsRef.current) {
      // Find the right position based on elapsed time
      while (
        ghost.currentIndex < ghost.path.length - 1 &&
        ghost.path[ghost.currentIndex + 1].t <= elapsed
      ) {
        ghost.currentIndex++;
      }
      
      if (ghost.path.length > 0) {
        const idx = Math.min(ghost.currentIndex, ghost.path.length - 1);
        newGhostPositions.push({
          id: ghost.id,
          x: ghost.path[idx].x,
          y: ghost.path[idx].y,
        });
      }
    }
    
    // Check collisions
    if (checkGhostCollision()) {
      gameOver();
      return;
    }
    
    // Check target hit
    if (checkTargetHit()) {
      completeRound();
    }
    
    // Update React state (throttled for performance)
    if (timestamp - lastTimeRef.current > 16) {
      setPlayerPos({ ...playerPosRef.current });
      setTrail([...trailRef.current]);
      setGhostPositions(newGhostPositions);
      setElapsedTime(Math.floor(totalElapsed / 1000));
      setScore(Math.max(0, scoreRef.current));
      lastTimeRef.current = timestamp;
    }
    
    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [phase, checkGhostCollision, checkTargetHit, completeRound, gameOver]);

  // Start/stop game loop
  useEffect(() => {
    if (phase === "playing") {
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [phase, gameLoop]);

  return (
    <div className="relative flex min-h-screen flex-col bg-gradient-to-b from-[#030303] via-[#050505] to-[#0A0A0A] text-white">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-10 top-20 h-64 w-64 rounded-full bg-[#00D9FF]/10 blur-[120px]" />
        <div className="absolute right-10 bottom-10 h-72 w-72 rounded-full bg-[#FF6B9D]/10 blur-[140px]" />
      </div>
      <Header />

      <main className="flex flex-1 justify-center px-4 pb-12 pt-24 sm:px-6 sm:pt-28">
        <div className="w-full max-w-6xl space-y-4">
          {/* Back Button */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-400 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Games
            </Link>
            <span className="text-xs uppercase tracking-[0.2em] text-gray-500">
              Escape Yourself · Mobile Ready Loop Challenge
            </span>
          </div>

          {/* Status + Tips */}
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-white/5 p-5 shadow-[0_10px_40px_rgba(0,0,0,0.35)] lg:col-span-2">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Current Loop</p>
                  <div className="text-3xl font-semibold text-white">
                    {currentLoop}
                    <span className="ml-2 text-sm text-gray-500">/ 10+</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-black/40 px-3 py-1 text-xs text-gray-300">
                  <Gauge className="h-4 w-4 text-[#00FF94]" />
                  <span>{score} pts · {elapsedTime}s</span>
                </div>
              </div>
              <div className="mt-4 h-2 rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#00D9FF] via-[#00FF94] to-[#FFD23F]"
                  style={{ width: progressWidth }}
                />
              </div>
              <p className="mt-3 text-sm text-gray-400">
                Reach the glowing target, then outrun your own past trails. Every loop spawns a ghost
                replica hunting you down.
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-gradient-to-b from-white/10 to-white/5 p-5 text-gray-200">
              <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Control Mode</p>
              <div className="mt-3 flex items-center gap-3 text-white">
                <div className="rounded-2xl bg-black/30 p-2">
                  <ControlIcon className="h-6 w-6 text-[#00D9FF]" />
                </div>
                <div>
                  <p className="text-base font-semibold capitalize">{controlMode}</p>
                  <p className="text-sm text-gray-400">
                    {controlMode === "touch" ? "Drag with your finger anywhere inside the arena." : "Hover or drag your cursor smoothly to stay ahead."}
                  </p>
                </div>
              </div>
              <ul className="mt-4 space-y-2 text-xs text-gray-400">
                <li>• Hold to start dragging on touch devices</li>
                <li>• Release or lift to pause movement</li>
                <li>• Stay away from the neon ghosts</li>
              </ul>
            </div>
          </div>

          {/* Mini leaderboard */}
          <div className="rounded-2xl border border-white/5 bg-black/30 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Live Leaderboard</p>
                <h3 className="text-lg font-semibold">Top Loopers</h3>
              </div>
              <button
                onClick={() => setPhase("leaderboard")}
                className="text-xs font-semibold uppercase tracking-widest text-[#FFD23F] underline-offset-4 hover:underline"
              >
                View full board
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {topLoopersPreview.length === 0 ? (
                <p className="text-sm text-gray-500">Be the first to upload a run.</p>
              ) : (
                topLoopersPreview.map((entry, idx) => (
                  <div
                    key={entry.nickname + idx}
                    className="flex items-center justify-between rounded-xl bg-white/[0.04] px-4 py-2 text-sm text-gray-200"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-gray-500">#{idx + 1}</span>
                      <span className="font-semibold tracking-wide text-white">{entry.nickname}</span>
                    </div>
                    <span className="text-[#00FF94]">Loop {entry.score}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Game Container - Full Width */}
          <div className="relative w-full rounded-3xl border border-white/5 bg-white/5 p-3 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
            {/* HUD */}
            {phase === "playing" && (
              <div className="absolute left-2 md:left-4 top-2 md:top-4 z-20 flex flex-wrap gap-2 md:gap-4">
                <div className="rounded-lg bg-black/50 px-2 md:px-4 py-1 md:py-2 backdrop-blur-sm">
                  <span className="font-mono text-xs md:text-lg text-[#00D9FF]">
                    LOOP: <span className="text-white">{currentLoop}</span>
                  </span>
                </div>
                <div className="rounded-lg bg-black/50 px-2 md:px-4 py-1 md:py-2 backdrop-blur-sm">
                  <span className="font-mono text-xs md:text-lg text-[#00FF94]">
                    SCORE: <span className="text-white">{score}</span>
                  </span>
                </div>
                <div className="rounded-lg bg-black/50 px-2 md:px-4 py-1 md:py-2 backdrop-blur-sm">
                  <span className="font-mono text-xs md:text-lg text-[#FF6B9D]">
                    TIME: <span className="text-white">{elapsedTime}s</span>
                  </span>
                </div>
              </div>
            )}

            {/* Game Area - Viewport Fit */}
            <div
              ref={gameAreaRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerEnd}
              onPointerLeave={handlePointerLeave}
              className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#050505] via-[#0F1217] to-[#1E1A24]"
              style={{
                cursor: phase === "playing" ? "none" : "default",
                height: "clamp(320px, 70vh, 720px)",
                touchAction: "none",
              }}
            >
              {/* Collision Flash Overlay */}
              <AnimatePresence>
                {showCollision && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0.5, 1, 0] }}
                    transition={{ duration: 0.5 }}
                    className="absolute inset-0 z-50 pointer-events-none"
                    style={{
                      background: "radial-gradient(circle, rgba(255,0,0,0.6) 0%, rgba(255,0,0,0.3) 50%, transparent 70%)",
                      boxShadow: "inset 0 0 100px rgba(255,0,0,0.8)",
                    }}
                  />
                )}
              </AnimatePresence>

              {/* Grid Background */}
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage: `
                    linear-gradient(rgba(0, 217, 255, 0.3) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(0, 217, 255, 0.3) 1px, transparent 1px)
                  `,
                  backgroundSize: "40px 40px",
                }}
              />

              {/* Intro Screen */}
              <AnimatePresence>
                {phase === "intro" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm"
                  >
                    <motion.h1
                      initial={{ y: -20 }}
                      animate={{ y: 0 }}
                      className="mb-2 text-2xl md:text-4xl lg:text-5xl font-bold text-white"
                    >
                      ESCAPE <span className="text-[#00D9FF]">YOURSELF</span>
                    </motion.h1>
                    <p className="mb-6 md:mb-8 max-w-md text-center text-gray-400 text-sm md:text-base px-4">
                      Reach the target. Each loop, your past self hunts you.
                      <br />
                      <span className="text-[#FF4444]">Don&apos;t touch your ghosts.</span>
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={startGame}
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#00D9FF] to-[#00FF94] px-6 md:px-8 py-3 md:py-4 text-base md:text-lg font-bold text-black"
                    >
                      <Play className="h-5 w-5" />
                      INITIATE LOOP
                    </motion.button>
                    {highScore > 0 && (
                      <p className="mt-4 text-sm text-gray-500">
                        Best: Loop {highScore}
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Game Over Screen */}
              <AnimatePresence>
                {phase === "gameover" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm"
                  >
                    <motion.div
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      className="text-center"
                    >
                      <h2 className="mb-2 text-2xl md:text-3xl font-bold text-[#FF4444]">
                        PARADOX CREATED
                      </h2>
                      <div className="mb-6 space-y-1">
                        <p className="text-gray-400">
                          Loops: <span className="text-white font-bold">{currentLoop - 1}</span>
                          {" · "}Time: <span className="text-white font-bold">{elapsedTime}s</span>
                        </p>
                        <p className="text-2xl font-bold text-[#00FF94]">
                          SCORE: {score}
                        </p>
                      </div>

                      {/* Nickname Input */}
                      {!hasSubmitted && (
                        <div className="mb-6">
                          <p className="mb-2 text-sm text-gray-500">Enter your nickname:</p>
                          <div className="flex items-center justify-center gap-2">
                            <input
                              type="text"
                              value={nickname}
                              onChange={(e) => setNickname(e.target.value.slice(0, 12))}
                              placeholder="Player"
                              maxLength={12}
                              className="w-40 rounded-lg bg-gray-800 px-4 py-3 text-center font-mono text-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00D9FF]"
                            />
                            <button
                              onClick={submitScore}
                              disabled={nickname.length < 1 || isSubmitting}
                              className="rounded-lg bg-[#00D9FF] px-4 py-3 font-bold text-black disabled:opacity-50"
                            >
                              {isSubmitting ? "..." : "SAVE"}
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-4">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={startGame}
                          className="flex items-center gap-2 rounded-xl bg-gray-700 px-6 py-3 font-semibold text-white"
                        >
                          <RotateCcw className="h-4 w-4" />
                          TRY AGAIN
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setPhase("leaderboard")}
                          className="flex items-center gap-2 rounded-xl bg-[#FFD23F] px-6 py-3 font-semibold text-black"
                        >
                          <Trophy className="h-4 w-4" />
                          LEADERBOARD
                        </motion.button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Leaderboard Screen */}
              <AnimatePresence>
                {phase === "leaderboard" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm p-8"
                  >
                    <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold text-[#FFD23F]">
                      <Trophy className="h-6 w-6" />
                      TOP LOOPERS
                    </h2>

                    <div className="mb-6 w-full max-w-xs space-y-2">
                      {leaderboard.length === 0 ? (
                        <p className="text-center text-gray-500">No entries yet</p>
                      ) : (
                        leaderboard.map((entry, i) => (
                          <div
                            key={i}
                            className={`flex items-center justify-between rounded-lg px-4 py-2 ${
                              i === 0
                                ? "bg-[#FFD23F]/20 text-[#FFD23F]"
                                : i === 1
                                ? "bg-gray-400/20 text-gray-300"
                                : i === 2
                                ? "bg-[#CD7F32]/20 text-[#CD7F32]"
                                : "bg-gray-800/50 text-gray-400"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-6 text-center font-mono">{i + 1}</span>
                              <span className="font-mono tracking-wider">{entry.nickname}</span>
                            </div>
                            <span className="font-bold">LOOP {entry.score}</span>
                          </div>
                        ))
                      )}
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={startGame}
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#00D9FF] to-[#00FF94] px-8 py-3 font-bold text-black"
                    >
                      <Play className="h-4 w-4" />
                      PLAY AGAIN
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Game Elements */}
              {phase === "playing" && (
                <>
                  {/* Target */}
                  <Target x={targetPos.x} y={targetPos.y} />

                  {/* Ghosts */}
                  {ghostPositions.map((ghost) => (
                    <GhostCursor
                      key={ghost.id}
                      x={ghost.x}
                      y={ghost.y}
                      opacity={0.8}
                    />
                  ))}

                  {/* Player */}
                  <PlayerCursor x={playerPos.x} y={playerPos.y} trail={trail} />
                </>
              )}
            </div>

            {/* Instructions */}
            {phase === "intro" && (
              <div className="mt-4 text-center text-sm text-gray-400">
                {controlMode === "touch"
                  ? "Tap and drag anywhere inside the arena to glide. Every target hit adds a looped ghost of you."
                  : "Move or drag your cursor within the arena. Each loop records your path and turns it into a neon hunter."}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
