"use client";

import { motion } from "framer-motion";
import { Brain, Clapperboard, Eye, Sparkles } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { GameCard } from "@/components/GameCard";

const games = [
  {
    title: "Who Am I?",
    description:
      "A classic guessing game powered by AI. Can you figure out who or what you are?",
    href: "/who-am-i",
    icon: Brain,
    gradient: "from-[#FF6B9D] to-[#C44DFF]",
    bgColor: "bg-[#FF6B9D]",
    size: "large" as const,
    badge: "AI Powered",
  },
  {
    title: "Logline Creator",
    description:
      "Spin the slots, get random elements, and let AI create a hilarious movie logline for you!",
    href: "/logline-slots",
    icon: Clapperboard,
    gradient: "from-[#FF8534] to-[#FFD23F]",
    bgColor: "bg-[#FF8534]",
    size: "normal" as const,
  },
  {
    title: "AI or Not?",
    description:
      "Test your skills! Can you tell the difference between AI-generated and real images?",
    href: "/ai-or-not",
    icon: Eye,
    gradient: "from-[#00D9FF] to-[#00FF94]",
    bgColor: "bg-[#00D9FF]",
    size: "normal" as const,
  },
];

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

        {/* Bento Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {games.map((game, index) => (
            <GameCard
              key={game.href}
              {...game}
              delay={0.5 + index * 0.1}
            />
          ))}
        </div>

        {/* Fun Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-16 grid grid-cols-3 gap-4 rounded-3xl bg-[#1A1A1A] border border-gray-800 p-8"
        >
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 1, type: "spring" }}
              className="text-3xl font-bold text-[#FF6B9D]"
            >
              3
            </motion.div>
            <div className="text-sm text-gray-500">
              Games
            </div>
          </div>
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 1.1, type: "spring" }}
              className="text-3xl font-bold text-[#FFD23F]"
            >
              ∞
            </motion.div>
            <div className="text-sm text-gray-500">Fun</div>
          </div>
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 1.2, type: "spring" }}
              className="text-3xl font-bold text-[#00FF94]"
            >
              100%
            </motion.div>
            <div className="text-sm text-gray-500">
              AI Magic
            </div>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
