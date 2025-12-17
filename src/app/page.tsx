"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

// FunStats component with live play count
function FunStats() {
  const [totalPlays, setTotalPlays] = useState<number | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/game-stats");
        const data = await res.json();
        if (data.success) {
          setTotalPlays(data.data.total);
        }
      } catch (error) {
        console.error("Failed to fetch game stats:", error);
      }
    }
    fetchStats();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8 }}
      className="mt-8 md:mt-16 grid grid-cols-4 gap-2 md:gap-4 rounded-2xl md:rounded-3xl bg-[#1A1A1A] border border-gray-800 p-4 md:p-8"
    >
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1, type: "spring" }}
          className="text-2xl md:text-3xl font-bold text-[#FF6B9D]"
        >
          6
        </motion.div>
        <div className="text-xs md:text-sm text-gray-500">Games</div>
      </div>
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1.1, type: "spring" }}
          className="text-2xl md:text-3xl font-bold text-[#00D9FF]"
        >
          {totalPlays !== null ? totalPlays.toLocaleString() : "..."}
        </motion.div>
        <div className="text-xs md:text-sm text-gray-500">Times Played</div>
      </div>
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1.2, type: "spring" }}
          className="text-2xl md:text-3xl font-bold text-[#FFD23F]"
        >
          ∞
        </motion.div>
        <div className="text-xs md:text-sm text-gray-500">Fun</div>
      </div>
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1.3, type: "spring" }}
          className="text-2xl md:text-3xl font-bold text-[#00FF94]"
        >
          100%
        </motion.div>
        <div className="text-xs md:text-sm text-gray-500">AI Magic</div>
      </div>
    </motion.div>
  );
}

// SVG Icons for each game
const GameIcons = {
  orderEverything: (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <rect x="20" y="30" width="60" height="45" rx="5" fill="currentColor" opacity="0.3" />
      <rect x="30" y="20" width="40" height="15" rx="3" fill="currentColor" opacity="0.5" />
      <circle cx="35" cy="85" r="8" fill="currentColor" opacity="0.6" />
      <circle cx="65" cy="85" r="8" fill="currentColor" opacity="0.6" />
      <text x="50" y="60" fontSize="24" fill="currentColor" textAnchor="middle">🔥</text>
    </svg>
  ),
  procrastination: (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="4" opacity="0.3" />
      <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="251" strokeDashoffset="63" />
      <line x1="50" y1="50" x2="50" y2="25" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <line x1="50" y1="50" x2="70" y2="50" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="50" cy="50" r="4" fill="currentColor" />
    </svg>
  ),
  escape: (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <circle cx="50" cy="35" r="20" fill="currentColor" opacity="0.3" />
      <circle cx="30" cy="55" r="15" fill="currentColor" opacity="0.2" />
      <circle cx="70" cy="60" r="12" fill="currentColor" opacity="0.15" />
      <circle cx="50" cy="35" r="8" fill="currentColor" />
      <path d="M50 55 L65 75 L50 70 L35 75 Z" fill="currentColor" opacity="0.8" />
    </svg>
  ),
  aiOrNot: (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <circle cx="35" cy="45" r="25" fill="none" stroke="currentColor" strokeWidth="3" />
      <circle cx="35" cy="45" r="10" fill="currentColor" />
      <rect x="55" y="25" width="35" height="40" rx="5" fill="currentColor" opacity="0.3" />
      <rect x="60" y="30" width="25" height="8" fill="currentColor" opacity="0.5" />
      <rect x="60" y="42" width="18" height="6" fill="currentColor" opacity="0.5" />
      <rect x="60" y="52" width="22" height="6" fill="currentColor" opacity="0.5" />
    </svg>
  ),
  logline: (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <rect x="15" y="20" width="25" height="60" rx="3" fill="currentColor" opacity="0.3" />
      <rect x="38" y="20" width="25" height="60" rx="3" fill="currentColor" opacity="0.5" />
      <rect x="61" y="20" width="25" height="60" rx="3" fill="currentColor" opacity="0.7" />
      <text x="27" y="55" fontSize="20" fill="currentColor" textAnchor="middle">🎬</text>
      <text x="50" y="55" fontSize="20" fill="currentColor" textAnchor="middle">👤</text>
      <text x="73" y="55" fontSize="20" fill="currentColor" textAnchor="middle">🌍</text>
    </svg>
  ),
  whoAmI: (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <circle cx="50" cy="35" r="20" fill="currentColor" opacity="0.3" />
      <ellipse cx="50" cy="75" rx="30" ry="15" fill="currentColor" opacity="0.3" />
      <text x="50" y="45" fontSize="30" fill="currentColor" textAnchor="middle">?</text>
      <circle cx="30" cy="30" r="5" fill="currentColor" opacity="0.5" />
      <circle cx="70" cy="30" r="5" fill="currentColor" opacity="0.5" />
    </svg>
  ),
};

// Games array - newest first
const games = [
  {
    title: "Order Everything",
    description: "A satirical carbon footprint calculator. Order anything, destroy the planet!",
    href: "/order-everything",
    gradient: "from-[#FF6B9D] to-[#9B5DE5]",
    icon: GameIcons.orderEverything,
    badge: "New",
  },
  {
    title: "Procrastination Simulator",
    description: "An interactive art piece. Watch time slip away as you avoid your tasks.",
    href: "/procrastination-simulator",
    gradient: "from-[#6B8E7B] to-[#4A6B5A]",
    icon: GameIcons.procrastination,
    badge: "Art",
  },
  {
    title: "Escape Yourself",
    description: "Survive the time loop! Reach the target while avoiding your past selves.",
    href: "/escape-yourself",
    gradient: "from-[#FF4444] to-[#CC2222]",
    icon: GameIcons.escape,
  },
  {
    title: "AI or Not?",
    description: "Test your skills! Can you tell the difference between AI-generated and real images?",
    href: "/ai-or-not",
    gradient: "from-[#00D9FF] to-[#0099CC]",
    icon: GameIcons.aiOrNot,
  },
  {
    title: "Logline Creator",
    description: "Spin the slots, get random elements, and let AI create a hilarious movie logline!",
    href: "/logline-slots",
    gradient: "from-[#FF8534] to-[#CC6A2A]",
    icon: GameIcons.logline,
    badge: "AI",
  },
  {
    title: "Who Am I?",
    description: "A classic guessing game powered by AI. Can you figure out who or what you are?",
    href: "/who-am-i",
    gradient: "from-[#FF6B9D] to-[#C44DFF]",
    icon: GameIcons.whoAmI,
    badge: "AI",
  },
];

// Uniform Game Card Component
function GameCard({ 
  title, 
  description, 
  href, 
  gradient, 
  icon, 
  badge, 
  delay = 0 
}: { 
  title: string; 
  description: string; 
  href: string; 
  gradient: string; 
  icon: React.ReactNode; 
  badge?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 100 }}
    >
      <Link href={href} className="group block">
        <motion.div
          whileHover={{ scale: 1.03, y: -5 }}
          whileTap={{ scale: 0.98 }}
          className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-[2px]`}
        >
          <div className="relative rounded-[14px] bg-[#1A1A1A] p-5 h-full min-h-[200px] flex flex-col">
            {/* Badge */}
            {badge && (
              <div className="absolute right-3 top-3 rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white/80">
                {badge}
              </div>
            )}
            
            {/* SVG Icon */}
            <div className={`w-16 h-16 mb-4 text-white bg-gradient-to-br ${gradient} rounded-xl p-3`}>
              {icon}
            </div>
            
            {/* Content */}
            <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
            <p className="text-sm text-gray-400 flex-1">{description}</p>
            
            {/* Play button */}
            <div className="mt-4 flex items-center gap-2">
              <span className={`text-sm font-medium bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
                Play Now
              </span>
              <motion.span
                className="text-white/60"
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                →
              </motion.span>
            </div>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0D0D0D] dark:bg-[#0D0D0D]">
      <Header />

      <main className="mx-auto max-w-6xl px-4 pb-20 pt-32">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#FF6B9D]/20 px-4 py-2 border border-[#FF6B9D]/30"
          >
            <Sparkles className="h-4 w-4 text-[#FFD23F]" />
            <span className="text-sm font-medium text-white">
              Play & Explore
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-4 text-5xl font-bold tracking-tight text-white md:text-6xl"
          >
            Welcome to{" "}
            <span className="bg-gradient-to-r from-[#FF6B9D] via-[#FFD23F] to-[#00FF94] bg-clip-text text-transparent">
              fun.crafted
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mx-auto max-w-2xl text-lg text-gray-400"
          >
            A collection of playful AI experiments. Pick a game and let the fun
            begin!
          </motion.p>
        </motion.div>

        {/* Uniform Grid - 3 columns on desktop, 2 on tablet, 1 on mobile */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {games.map((game, index) => (
            <GameCard
              key={game.href}
              {...game}
              delay={0.5 + index * 0.08}
            />
          ))}
        </div>

        {/* Fun Stats */}
        <FunStats />
      </main>

      <Footer />
    </div>
  );
}
