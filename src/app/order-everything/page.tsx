"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Trophy, Package, Loader2, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { generateOrder, OrderResult } from "./actions";
import { useAchievements, Achievement } from "./useAchievements";
import { addLeaderboardEntry, getLeaderboard, LeaderboardEntry } from "@/lib/firebase";

const GAME_ID = "order-everything";

const COLORS = {
  pink: "#FF6B9D",
  purple: "#9B5DE5",
  blue: "#00BBF9",
  green: "#00F5D4",
  yellow: "#FEE440",
};

async function celebrate() {
  const confettiModule = await import("canvas-confetti");
  const confetti = confettiModule.default;
  const end = Date.now() + 3000;
  const frame = () => {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: [COLORS.pink, COLORS.purple, COLORS.blue, COLORS.green, COLORS.yellow],
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: [COLORS.pink, COLORS.purple, COLORS.blue, COLORS.green, COLORS.yellow],
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}

function TrophyCabinet({ isOpen, onClose, achievements }: { isOpen: boolean; onClose: () => void; achievements: Achievement[] }) {
  if (!isOpen) return null;
  const unlocked = achievements.filter(a => a.unlocked);
  const locked = achievements.filter(a => !a.unlocked);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
        className="bg-white rounded-3xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-500" /> Trophy Cabinet
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
        </div>
        <div className="mb-4 text-sm text-gray-500">{unlocked.length} / {achievements.length} Unlocked</div>
        {unlocked.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-green-600 mb-3">✅ UNLOCKED</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {unlocked.map(ach => (
                <div key={ach.id} className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-2xl p-3 text-center">
                  <div className="text-3xl mb-1">{ach.icon}</div>
                  <div className="font-semibold text-sm text-gray-800">{ach.name}</div>
                  <div className="text-xs text-gray-500">{ach.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {locked.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-400 mb-3">🔒 LOCKED</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {locked.map(ach => (
                <div key={ach.id} className="bg-gray-100 border-2 border-gray-200 rounded-2xl p-3 text-center opacity-50">
                  <div className="text-3xl mb-1">🔒</div>
                  <div className="font-semibold text-sm text-gray-600">???</div>
                  <div className="text-xs text-gray-400">{ach.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function LeaderboardModal({ isOpen, onClose, entries, isLoading }: { isOpen: boolean; onClose: () => void; entries: LeaderboardEntry[]; isLoading: boolean }) {
  if (!isOpen) return null;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
        className="bg-gradient-to-br from-red-900 to-red-950 rounded-3xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto shadow-2xl border-2 border-red-700"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-red-200">💀 Hall of Shame</h2>
          <button onClick={onClose} className="p-2 hover:bg-red-800 rounded-full text-red-300"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-red-300 text-sm mb-4">The World&apos;s Worst Consumers</p>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-red-400" /></div>
        ) : entries.length === 0 ? (
          <div className="text-center py-8 text-red-400">No destroyers yet!</div>
        ) : (
          <div className="space-y-2">
            {entries.slice(0, 10).map((entry, i) => (
              <motion.div key={entry.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className={`flex items-center gap-3 p-3 rounded-xl ${i === 0 ? "bg-yellow-500/20 border border-yellow-500/50" : i === 1 ? "bg-gray-400/20" : i === 2 ? "bg-orange-600/20" : "bg-red-800/30"}`}>
                <div className={`text-2xl font-bold ${i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-300" : i === 2 ? "text-orange-400" : "text-red-400"}`}>#{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white truncate">{entry.nickname}</div>
                  <div className="text-xs text-red-300 truncate">{(entry as any).itemName || "Unknown"}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-red-200">{entry.score.toLocaleString()}</div>
                  <div className="text-xs text-red-400">kg CO2</div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function AchievementToast({ achievements, onClose }: { achievements: Achievement[]; onClose: () => void }) {
  useEffect(() => {
    if (achievements.length > 0) {
      const timer = setTimeout(onClose, 5000);
      return () => clearTimeout(timer);
    }
  }, [achievements, onClose]);
  if (achievements.length === 0) return null;
  return (
    <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="fixed bottom-6 right-6 z-50">
      <div className="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-2xl p-4 shadow-2xl max-w-xs">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-white" />
          <span className="font-bold text-white">Achievement Unlocked!</span>
        </div>
        {achievements.map(ach => (
          <div key={ach.id} className="flex items-center gap-2 text-white/90">
            <span className="text-xl">{ach.icon}</span>
            <span className="text-sm font-medium">{ach.name}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function OrderStep({ step, index, isActive }: { step: { icon: string; title: string; desc: string }; index: number; isActive: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: isActive ? 1 : 0.5, x: 0 }} transition={{ delay: index * 0.5 }} className="flex gap-4">
      <div className="flex flex-col items-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: index * 0.5 + 0.2, type: "spring" }}
          className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${isActive ? "bg-gradient-to-br from-pink-400 to-purple-500 shadow-lg" : "bg-gray-200"}`}>
          {step.icon}
        </motion.div>
        {index < 4 && <motion.div initial={{ height: 0 }} animate={{ height: 40 }} transition={{ delay: index * 0.5 + 0.3 }}
          className={`w-1 ${isActive ? "bg-gradient-to-b from-purple-400 to-pink-400" : "bg-gray-200"}`} />}
      </div>
      <div className="flex-1 pb-4">
        <h3 className={`font-bold ${isActive ? "text-gray-800" : "text-gray-400"}`}>{step.title}</h3>
        <p className={`text-sm ${isActive ? "text-gray-600" : "text-gray-400"}`}>{step.desc}</p>
      </div>
    </motion.div>
  );
}

export default function OrderEverythingPage() {
  const [itemName, setItemName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<OrderResult | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTrophies, setShowTrophies] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [showNicknameInput, setShowNicknameInput] = useState(false);
  const [nickname, setNickname] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [orderedItem, setOrderedItem] = useState("");

  const { getAllAchievements, processOrder, newlyUnlocked, clearNewlyUnlocked, lifetimeScore, unlockedCount, totalCount } = useAchievements();

  const loadLeaderboard = async () => {
    setLeaderboardLoading(true);
    try {
      const entries = await getLeaderboard(GAME_ID, 10);
      setLeaderboardEntries(entries);
    } catch (e) { console.error(e); }
    setLeaderboardLoading(false);
  };

  const handleOrder = async () => {
    if (!itemName.trim()) return;
    setIsLoading(true);
    setError(null);
    setResult(null);
    setCurrentStep(0);
    setShowResult(false);
    setSubmitted(false);
    setOrderedItem(itemName.trim());

    const res = await generateOrder(itemName);
    setIsLoading(false);

    if (!res.success) {
      setError(res.error);
      return;
    }

    setResult(res.data);
    processOrder(itemName.trim(), res.data.totalImpactValue, res.data.unlockedAchievements);

    // Animate steps
    for (let i = 0; i <= res.data.steps.length; i++) {
      await new Promise(r => setTimeout(r, 600));
      setCurrentStep(i);
    }

    await new Promise(r => setTimeout(r, 500));
    setShowResult(true);
    celebrate();
  };

  const handleSubmitScore = async () => {
    if (!nickname.trim() || !result) return;
    setIsSubmitting(true);
    try {
      await addLeaderboardEntry(GAME_ID, nickname.trim(), result.totalImpactValue);
      setSubmitted(true);
      setShowNicknameInput(false);
    } catch (e) { console.error(e); }
    setIsSubmitting(false);
  };

  const resetOrder = () => {
    setResult(null);
    setShowResult(false);
    setItemName("");
    setCurrentStep(0);
    setSubmitted(false);
    setShowNicknameInput(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent mb-2">
              EverythingNow™
            </h1>
            <p className="text-gray-500">Order Anything. Destroy Everything. 🌍💀</p>
            <div className="flex justify-center gap-4 mt-4">
              <button onClick={() => { setShowTrophies(true); }} className="flex items-center gap-2 px-4 py-2 bg-yellow-100 hover:bg-yellow-200 rounded-full text-sm font-medium text-yellow-700 transition-colors">
                <Trophy className="w-4 h-4" /> {unlockedCount}/{totalCount}
              </button>
              <button onClick={() => { setShowLeaderboard(true); loadLeaderboard(); }} className="flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 rounded-full text-sm font-medium text-red-700 transition-colors">
                💀 Hall of Shame
              </button>
            </div>
            <div className="mt-2 text-xs text-gray-400">Lifetime Impact: {lifetimeScore.toLocaleString()} kg CO2</div>
          </motion.div>

          {/* Input */}
          {!result && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl p-6 shadow-xl mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">What would you like to order?</label>
              <div className="flex gap-3">
                <input type="text" value={itemName} onChange={e => setItemName(e.target.value)} onKeyDown={e => e.key === "Enter" && handleOrder()}
                  placeholder="e.g., Burger, iPhone, Private Jet..." disabled={isLoading}
                  className="flex-1 px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-purple-400 focus:outline-none text-lg" />
                <button onClick={handleOrder} disabled={isLoading || !itemName.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold rounded-2xl hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-2">
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Package className="w-5 h-5" />}
                  Order!
                </button>
              </div>
              {error && <p className="mt-3 text-red-500 text-sm">{error}</p>}
            </motion.div>
          )}

          {/* Order Tracking */}
          {result && !showResult && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-3xl p-6 shadow-xl">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Package className="w-6 h-6 text-purple-500" /> Tracking: {orderedItem}
              </h2>
              <div className="space-y-2">
                {result.steps.map((step, i) => (
                  <OrderStep key={i} step={step} index={i} isActive={i <= currentStep} />
                ))}
              </div>
            </motion.div>
          )}

          {/* Result */}
          {showResult && result && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl p-8 shadow-xl text-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }}
                className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br from-red-400 to-orange-500 flex items-center justify-center">
                <span className="text-5xl">🔥</span>
              </motion.div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Order Complete!</h2>
              <p className="text-gray-500 mb-6">{orderedItem}</p>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                className="bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl p-6 mb-6">
                <div className="text-5xl font-black text-white mb-2">{result.totalImpactLabel}</div>
                <div className="text-white/80">Carbon Footprint Generated! 🎉</div>
              </motion.div>
              <p className="text-lg text-gray-600 mb-6 italic">&quot;{result.finalMessage}&quot;</p>
              
              {!submitted && !showNicknameInput && (
                <button onClick={() => setShowNicknameInput(true)}
                  className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white font-bold rounded-2xl hover:opacity-90 mb-4">
                  💀 Add to Hall of Shame
                </button>
              )}
              
              {showNicknameInput && !submitted && (
                <div className="flex gap-2 justify-center mb-4">
                  <input type="text" value={nickname} onChange={e => setNickname(e.target.value)} placeholder="Your shameful name..."
                    className="px-4 py-2 rounded-xl border-2 border-gray-200 focus:border-red-400 focus:outline-none" maxLength={20} />
                  <button onClick={handleSubmitScore} disabled={isSubmitting || !nickname.trim()}
                    className="px-4 py-2 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 disabled:opacity-50">
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Submit"}
                  </button>
                </div>
              )}
              
              {submitted && <p className="text-green-600 font-medium mb-4">✅ Added to Hall of Shame!</p>}
              
              <button onClick={resetOrder} className="px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-2xl hover:bg-gray-200">
                Order Something Else
              </button>
            </motion.div>
          )}
        </div>

        <Link href="/" className="mt-8 inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Games
        </Link>
      </main>

      <AnimatePresence>
        <TrophyCabinet isOpen={showTrophies} onClose={() => setShowTrophies(false)} achievements={getAllAchievements()} />
        <LeaderboardModal isOpen={showLeaderboard} onClose={() => setShowLeaderboard(false)} entries={leaderboardEntries} isLoading={leaderboardLoading} />
        <AchievementToast achievements={newlyUnlocked} onClose={clearNewlyUnlocked} />
      </AnimatePresence>

      <Footer />
    </div>
  );
}
