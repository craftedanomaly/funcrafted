"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ThumbsUp, MessageCircle, Share2, Send, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getLifeSuggestions, LifeSuggestion } from "@/lib/firebase";

function SkeletonCard() {
  return (
    <div className="animate-pulse">
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 rounded-full bg-gray-200" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 rounded bg-gray-200" />
          <div className="h-3 w-48 rounded bg-gray-200" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-4 w-full rounded bg-gray-200" />
        <div className="h-4 w-full rounded bg-gray-200" />
        <div className="h-4 w-3/4 rounded bg-gray-200" />
      </div>
      <div className="mt-4 flex justify-between border-t border-gray-100 pt-3">
        <div className="h-3 w-20 rounded bg-gray-200" />
        <div className="h-3 w-32 rounded bg-gray-200" />
      </div>
    </div>
  );
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const DEFAULT_NAMES = [
  "Brad Hustler",
  "Elon Grind",
  "Alpha Male 9000",
  "Chad KPI",
  "Linda Synergy",
  "Tiffany Pivot",
  "Gary WakeUpAt4",
  "Nancy Growth",
  "SaaS Prophet",
  "Coach Crypto",
];

const DEFAULT_TITLES = [
  "CEO of Breathing | Founder of SleepLess | Visionary",
  "Serial Founder | Professional Overachiever | Thought Leader",
  "Top 1% Performer | Hustle Scientist | Deck Builder",
  "Fractional Everything | Human Spreadsheet | Optimist",
  "Chief Vibes Officer | Disrupting Rest | Evangelist",
];

const DEFAULT_TIMES = ["Just now", "2h • Edited", "4h", "1d • Edited", "3d"]; 

function pickOne(list: string[], seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 2147483647;
  }
  return list[Math.abs(hash) % list.length];
}

function buildPostText(s: LifeSuggestion): string {
  const base = (s.text || "").trim();
  const hashtags = "\n\n#Grind #Hustle #Leadership #Mindset #Synergy";
  if (!base) return hashtags.trim();
  return base.includes("#") ? base : `${base}${hashtags}`;
}

export default function LifeSuggestionsClient() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<LifeSuggestion[]>([]);
  const [queue, setQueue] = useState<LifeSuggestion[]>([]);
  const [idx, setIdx] = useState(0);
  const didInitRef = useRef(false);

  const [liked, setLiked] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const current = queue[idx] || null;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await getLifeSuggestions();
      setItems(all);
      const shuffled = shuffle(all);
      setQueue(shuffled);
      setIdx(0);
      setLiked(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    void load();
  }, [load]);

  const next = useCallback(() => {
    const nextIndex = idx + 1;
    if (nextIndex < queue.length) {
      setIdx(nextIndex);
    } else {
      const reshuffled = shuffle(items);
      setQueue(reshuffled);
      setIdx(0);
    }
    setLiked(false);
  }, [idx, items, queue.length]);

  const display = useMemo(() => {
    const seed = current?.id || current?.text?.slice(0, 24) || "seed";
    const authorName = current?.authorName?.trim() || pickOne(DEFAULT_NAMES, `name:${seed}`);
    const authorTitle = current?.authorTitle?.trim() || pickOne(DEFAULT_TITLES, `title:${seed}`);
    const time = pickOne(DEFAULT_TIMES, `time:${seed}`);
    const avatarUrl = `https://i.pravatar.cc/150?u=${encodeURIComponent(`life-suggestions:${seed}`)}`;
    const baseLikes = typeof current?.likes === "number" ? current.likes : 1000 + (Math.abs(seed.length * 997) % 9000);
    const likes = baseLikes + (liked ? 1 : 0);
    const text = current ? buildPostText(current) : "";

    return { authorName, authorTitle, time, avatarUrl, likes, text };
  }, [current, liked]);

  const onLike = useCallback(() => {
    setLiked((v) => !v);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1800);
  }, []);

  const onShare = useCallback(async () => {
    if (!current) return;
    const text = buildPostText(current);

    try {
      const nav = typeof window !== "undefined" ? window.navigator : undefined;
      if (nav && "share" in nav && typeof nav.share === "function") {
        await nav.share({ text });
        return;
      }

      if (nav?.clipboard?.writeText) {
        await nav.clipboard.writeText(text);
        showToast("LinkedOut Post Copied!");
        return;
      }

      showToast("No share/clipboard support in this browser.");
    } catch {
      showToast("Sharing failed. Please pivot and try again.");
    }
  }, [current, showToast]);

  const empty = !loading && !error && items.length === 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f3f2ef] to-[#e8e6e1]">
      <div className="mx-auto flex max-w-xl flex-col items-stretch gap-4 px-4 py-10 pb-28">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-gray-200"
        >
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#0077B5] to-[#00A0DC]">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-900">Infinite Wisdom Generator</span>
          </div>
          <a
            href="/admin"
            className="text-xs font-medium text-gray-500 hover:text-gray-700"
          >
            Admin
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-md ring-1 ring-gray-200"
        >
          {loading && <SkeletonCard />}

          {error && (
            <div className="space-y-2">
              <div className="text-sm font-semibold text-red-600">Something failed to scale</div>
              <div className="text-sm text-gray-700">{error}</div>
              <button
                onClick={load}
                className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white"
              >
                Retry
              </button>
            </div>
          )}

          {empty && (
            <div className="space-y-3 text-center py-8">
              <div className="text-4xl">🧘</div>
              <div className="text-sm font-semibold text-gray-900">No wisdom found</div>
              <div className="text-sm text-gray-600">
                The universe is empty. Add some hustle culture wisdom.
              </div>
              <a
                href="/admin"
                className="inline-flex rounded-lg bg-gradient-to-r from-[#0077B5] to-[#00A0DC] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:shadow-md transition-shadow"
              >
                Go to Admin
              </a>
            </div>
          )}

          <AnimatePresence mode="wait">
            {!loading && !error && current && (
              <motion.div
                key={current.id || idx}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                <div className="flex items-start gap-3">
                  <div className="relative h-12 w-12 overflow-hidden rounded-full ring-2 ring-gray-100 shadow-sm">
                    <Image
                      src={display.avatarUrl}
                      alt={display.authorName}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-sm font-bold text-gray-900">
                        {display.authorName}
                      </div>
                      <span className="inline-flex items-center rounded bg-[#0077B5] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        ✓
                      </span>
                    </div>
                    <div className="truncate text-xs text-gray-600">
                      {display.authorTitle}
                    </div>
                    <div className="mt-0.5 text-xs text-gray-400">{display.time}</div>
                  </div>
                </div>

                <div className="mt-4 whitespace-pre-line text-[15px] leading-relaxed text-gray-900">
                  {display.text}
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <span className="inline-flex -space-x-1">
                      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[8px] text-white ring-1 ring-white">👍</span>
                      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] text-white ring-1 ring-white">❤️</span>
                      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-yellow-400 text-[8px] text-white ring-1 ring-white">😂</span>
                    </span>
                    <span className="ml-1">{display.likes.toLocaleString()}</span>
                  </div>
                  <div>12 comments • 3 reposts</div>
                </div>

                <div className="mt-2 grid grid-cols-4 gap-1 border-t border-gray-100 pt-2">
                  <motion.button
                    onClick={onLike}
                    whileTap={{ scale: 0.95 }}
                    animate={liked ? { scale: [1, 1.1, 1] } : { scale: 1 }}
                    transition={{ duration: 0.2 }}
                    className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-sm font-semibold transition-all ${
                      liked ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <ThumbsUp className={`h-4 w-4 ${liked ? "fill-blue-600" : ""}`} />
                    <span className="hidden sm:inline">Like</span>
                  </motion.button>
                  <button className="flex items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                    <MessageCircle className="h-4 w-4" />
                    <span className="hidden sm:inline">Comment</span>
                  </button>
                  <button
                    onClick={onShare}
                    className="flex items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <Share2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Share</span>
                  </button>
                  <button className="flex items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                    <Send className="h-4 w-4" />
                    <span className="hidden sm:inline">Send</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {toast && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="pointer-events-none absolute right-4 top-4 rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white shadow-lg"
              >
                {toast}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="fixed bottom-6 left-0 right-0 z-40 px-4"
      >
        <motion.button
          onClick={next}
          disabled={loading || !!error || items.length === 0}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="mx-auto flex w-full max-w-xl items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0077B5] to-[#00A0DC] px-4 py-4 text-base font-bold text-white shadow-lg disabled:opacity-50 transition-shadow hover:shadow-xl"
        >
          <span>Next Wisdom</span>
          <span className="text-lg">💡</span>
        </motion.button>
      </motion.div>
    </div>
  );
}
