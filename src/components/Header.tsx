"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

export function Header() {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-40 border-b border-gray-800 bg-[#0D0D0D]/90 backdrop-blur-xl"
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <motion.div
            whileHover={{ rotate: 180, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Sparkles className="h-7 w-7 text-[#FFD23F]" />
          </motion.div>
          <span className="bg-gradient-to-r from-[#FF6B9D] via-[#FFD23F] to-[#00FF94] bg-clip-text text-xl font-bold text-transparent">
            fun.crafted
          </span>
        </Link>

        <nav className="flex items-center gap-6">
          <Link
            href="/"
            className="text-sm font-medium text-gray-400 transition-colors hover:text-white"
          >
            Games
          </Link>
          <a
            href="https://craftedanomaly.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-gray-400 transition-colors hover:text-white"
          >
            About
          </a>
        </nav>
      </div>
    </motion.header>
  );
}
