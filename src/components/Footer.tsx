"use client";

import { motion } from "framer-motion";
import { Heart } from "lucide-react";

export function Footer() {
  return (
    <motion.footer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
      className="border-t border-white/10 bg-white/50 py-8 dark:bg-gray-950/50"
    >
      <div className="mx-auto max-w-6xl px-4 text-center">
        <p className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          Made with
          <motion.span
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <Heart className="h-4 w-4 fill-[#F2695C] text-[#F2695C]" />
          </motion.span>
          by{" "}
          <a
            href="https://craftedanomaly.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[#2EA7F2] hover:underline"
          >
            Crafted Anomaly
          </a>
        </p>
        <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
          Powered by Google Gemini AI
        </p>
      </div>
    </motion.footer>
  );
}
