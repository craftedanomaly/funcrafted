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
    gradient: "from-[#2EA7F2] to-[#76D95B]",
    size: "large" as const,
  },
  {
    title: "AI Logline Creator",
    description:
      "Spin the slots, get random elements, and let AI create a hilarious movie logline for you!",
    href: "/logline-slots",
    icon: Clapperboard,
    gradient: "from-[#F2CD13] to-[#F2695C]",
    size: "normal" as const,
  },
  {
    title: "AI or Not?",
    description:
      "Test your skills! Can you tell the difference between AI-generated and real images?",
    href: "/ai-or-not",
    icon: Eye,
    gradient: "from-[#76D95B] to-[#96D966]",
    size: "normal" as const,
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2EA7F2]/15 via-white to-[#F2CD13]/15 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
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
            className="mb-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#2EA7F2]/20 via-[#76D95B]/20 to-[#F2CD13]/20 px-4 py-2 shadow-sm"
          >
            <Sparkles className="h-4 w-4 text-[#2EA7F2]" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              AI-Powered Fun
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-4 text-5xl font-bold tracking-tight text-gray-900 dark:text-white md:text-6xl"
          >
            Welcome to{" "}
            <span className="bg-gradient-to-r from-[#2EA7F2] via-[#76D95B] to-[#F2CD13] bg-clip-text text-transparent">
              fun.crafted
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-400"
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
          className="mt-16 grid grid-cols-3 gap-4 rounded-3xl bg-gradient-to-r from-[#2EA7F2]/10 via-[#76D95B]/10 to-[#F2CD13]/10 p-8 backdrop-blur-sm shadow-lg dark:bg-gray-900/50"
        >
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 1, type: "spring" }}
              className="text-3xl font-bold text-[#2EA7F2]"
            >
              3
            </motion.div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Games
            </div>
          </div>
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 1.1, type: "spring" }}
              className="text-3xl font-bold text-[#76D95B]"
            >
              ∞
            </motion.div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Fun</div>
          </div>
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 1.2, type: "spring" }}
              className="text-3xl font-bold text-[#F2CD13]"
            >
              100%
            </motion.div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              AI Magic
            </div>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
