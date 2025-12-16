"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Flame, RefreshCw } from "lucide-react";

interface QuotaErrorOverlayProps {
  isVisible: boolean;
  onRetry?: () => void;
  retryDisabled?: boolean;
}

export function QuotaErrorOverlay({
  isVisible,
  onRetry,
  retryDisabled = false,
}: QuotaErrorOverlayProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="mx-4 max-w-md rounded-3xl bg-gradient-to-br from-[#F2CD13] via-[#F2695C] to-[#F2695C] p-1"
          >
            <div className="rounded-[22px] bg-white px-8 py-10 text-center dark:bg-gray-900">
              <motion.div
                animate={{
                  rotate: [0, -10, 10, -10, 10, 0],
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  repeatDelay: 2,
                }}
                className="mb-6 inline-block"
              >
                <div className="relative">
                  <Flame className="h-20 w-20 text-[#F2695C]" />
                  <motion.div
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="absolute inset-0 blur-xl"
                  >
                    <Flame className="h-20 w-20 text-[#F2CD13]" />
                  </motion.div>
                </div>
              </motion.div>

              <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">
                Whoops!
              </h2>
              <p className="mb-2 text-lg text-gray-700 dark:text-gray-300">
                Too many people are playing right now.
              </p>
              <p className="mb-6 text-lg text-gray-700 dark:text-gray-300">
                My AI brain is fried! 🔥
              </p>

              <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
                Try again in a minute...
              </p>

              {onRetry && (
                <motion.button
                  whileHover={{ scale: retryDisabled ? 1 : 1.05 }}
                  whileTap={{ scale: retryDisabled ? 1 : 0.95 }}
                  onClick={onRetry}
                  disabled={retryDisabled}
                  className={`inline-flex items-center gap-2 rounded-full px-6 py-3 font-semibold text-white transition-all ${
                    retryDisabled
                      ? "cursor-not-allowed bg-gray-400"
                      : "bg-gradient-to-r from-[#F2CD13] to-[#F2695C] hover:shadow-lg hover:shadow-[#F2695C]/25"
                  }`}
                >
                  <RefreshCw
                    className={`h-5 w-5 ${retryDisabled ? "animate-spin" : ""}`}
                  />
                  {retryDisabled ? "Cooling down..." : "Try Again"}
                </motion.button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
