"use client";

import { motion } from "framer-motion";
import { Heart } from "lucide-react";

export function Footer() {
  return (
    <motion.footer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
      className="border-t border-gray-800 bg-[#0D0D0D] py-8"
    >
      <div className="mx-auto max-w-6xl px-4 text-center">
        <p className="flex items-center justify-center gap-2 text-sm text-gray-500">
          Made with
          <motion.span
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <Heart className="h-4 w-4 fill-[#FF6B9D] text-[#FF6B9D]" />
          </motion.span>
          by{" "}
          <a
            href="https://craftedanomaly.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[#FFD23F] hover:underline"
          >
            Crafted Anomaly
          </a>
        </p>
        <p className="mt-2 text-xs text-gray-600">
          Powered by Google Gemini AI
        </p>
      </div>
    </motion.footer>
  );
}
