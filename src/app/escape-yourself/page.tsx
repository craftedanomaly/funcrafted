"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Play, RotateCcw, Trophy } from "lucide-react";
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
  const [highScore, setHighScore] = useState(0);
  
  // Leaderboard state
  const [nickname, setNickname] = useState("");
  const [leaderboard, setLeaderboard] = useState<{ nickname: string; score: number }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Game refs for 60fps performance
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const roundStartTimeRef = useRef<number>(0);

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
    setHasSubmitted(false);
    setNickname("");
    
    roundStartTimeRef.current = performance.now();
    lastRecordTimeRef.current = 0;
    
    spawnTarget();
    setPhase("playing");
  }, [dimensions, spawnTarget]);

  // Handle mouse move
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (phase !== "playing" || !gameAreaRef.current) return;
    
    const rect = gameAreaRef.current.getBoundingClientRect();
    const x = Math.max(PLAYER_RADIUS, Math.min(e.clientX - rect.left, dimensions.width - PLAYER_RADIUS));
    const y = Math.max(PLAYER_RADIUS, Math.min(e.clientY - rect.top, dimensions.height - PLAYER_RADIUS));
    
    playerPosRef.current = { x, y };
    
    // Add to trail
    const now = performance.now();
    trailRef.current.push({ x, y, t: now });
    if (trailRef.current.length > 10) trailRef.current.shift();
    
    // Record path
    const elapsed = now - roundStartTimeRef.current;
    if (elapsed - lastRecordTimeRef.current >= RECORDING_INTERVAL) {
      currentPathRef.current.push({ x, y, t: elapsed });
      lastRecordTimeRef.current = elapsed;
    }
  }, [phase, dimensions]);

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
    setPhase("gameover");
    cancelAnimationFrame(animationFrameRef.current);
    
    const finalScore = currentLoop - 1;
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
  }, [currentLoop, highScore]);

  // Submit score
  const submitScore = async () => {
    if (!nickname.trim() || hasSubmitted) return;
    
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/leaderboard/escape-yourself", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: nickname.trim().toUpperCase().slice(0, 3), score: currentLoop - 1 }),
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
  const gameLoop = useCallback((timestamp: number) => {
    if (phase !== "playing") return;
    
    const elapsed = timestamp - roundStartTimeRef.current;
    
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
    <div className="flex min-h-screen flex-col bg-[#0A0A0A]">
      <Header />

      <main className="flex flex-1 flex-col items-center justify-center p-4">
        {/* Back Button */}
        <div className="mb-4 w-full max-w-4xl">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Games
          </Link>
        </div>

        {/* Game Container */}
        <div className="relative w-full max-w-4xl">
          {/* HUD */}
          {phase === "playing" && (
            <div className="absolute left-4 top-4 z-20 rounded-lg bg-black/50 px-4 py-2 backdrop-blur-sm">
              <span className="font-mono text-lg text-[#00D9FF]">
                LOOP: <span className="text-white">{currentLoop}</span>
              </span>
            </div>
          )}

          {/* Game Area */}
          <div
            ref={gameAreaRef}
            onMouseMove={handleMouseMove}
            className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-gray-800 bg-gradient-to-br from-[#0D0D0D] to-[#1A1A1A]"
            style={{ cursor: phase === "playing" ? "none" : "default" }}
          >
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
                    className="mb-2 text-4xl font-bold text-white md:text-5xl"
                  >
                    ESCAPE <span className="text-[#00D9FF]">YOURSELF</span>
                  </motion.h1>
                  <p className="mb-8 max-w-md text-center text-gray-400">
                    Reach the target. Each loop, your past self hunts you.
                    <br />
                    <span className="text-[#FF4444]">Don&apos;t touch your ghosts.</span>
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={startGame}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#00D9FF] to-[#00FF94] px-8 py-4 text-lg font-bold text-black"
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
                    <h2 className="mb-2 text-3xl font-bold text-[#FF4444]">
                      PARADOX CREATED
                    </h2>
                    <p className="mb-6 text-gray-400">
                      You survived <span className="text-white font-bold">{currentLoop - 1}</span> loops
                    </p>

                    {/* Nickname Input */}
                    {!hasSubmitted && (
                      <div className="mb-6">
                        <p className="mb-2 text-sm text-gray-500">Enter your initials:</p>
                        <div className="flex items-center justify-center gap-2">
                          <input
                            type="text"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value.toUpperCase().slice(0, 3))}
                            placeholder="NEO"
                            maxLength={3}
                            className="w-24 rounded-lg bg-gray-800 px-4 py-3 text-center font-mono text-2xl text-white uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-[#00D9FF]"
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
            <div className="mt-4 text-center text-sm text-gray-500">
              Move your mouse to control. Reach the green target. Avoid your past selves.
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
