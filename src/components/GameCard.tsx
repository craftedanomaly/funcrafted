"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface GameCardProps {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  gradient: string;
  bgColor?: string;
  delay?: number;
  size?: "normal" | "large";
  badge?: string;
}

export function GameCard({
  title,
  description,
  href,
  icon: Icon,
  gradient,
  bgColor,
  delay = 0,
  size = "normal",
  badge,
}: GameCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 100 }}
      className={size === "large" ? "md:col-span-2" : ""}
    >
      <Link href={href} className="group block h-full">
        <motion.div
          whileHover={{ scale: 1.02, y: -5 }}
          whileTap={{ scale: 0.98 }}
          className={`relative h-full overflow-hidden rounded-3xl bg-gradient-to-br ${gradient} p-1`}
        >
          <div className="relative h-full rounded-[22px] bg-[#1A1A1A] p-6 transition-colors group-hover:bg-[#222]">
            {/* Badge */}
            {badge && (
              <div className="absolute right-4 top-4 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                {badge}
              </div>
            )}

            {/* Floating icon background */}
            <motion.div
              className="absolute -right-4 -top-4 opacity-10 text-white"
              animate={{
                rotate: [0, 10, -10, 0],
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <Icon className="h-32 w-32" />
            </motion.div>

            <div className="relative z-10">
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.5 }}
                className={`mb-4 inline-flex rounded-2xl bg-gradient-to-br ${gradient} p-3`}
              >
                <Icon className="h-6 w-6 text-white" />
              </motion.div>

              <h3 className="mb-2 text-xl font-bold text-white">
                {title}
              </h3>
              <p className="text-sm text-gray-400">
                {description}
              </p>

              <motion.div
                className="mt-4 flex items-center gap-2 text-sm font-medium"
                initial={{ x: 0 }}
                whileHover={{ x: 5 }}
              >
                <span
                  className={`bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}
                >
                  Play Now
                </span>
                <motion.span
                  className="text-white"
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  →
                </motion.span>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}
