"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ThumbsUp, MessageCircle, Share2, Send } from "lucide-react";
import { motion } from "framer-motion";
import { getLifeSuggestions, LifeSuggestion } from "@/lib/firebase";

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
      if (typeof navigator !== "undefined" && "share" in navigator) {
        await (navigator as Navigator & { share: (data: { text: string }) => Promise<void> }).share({
          text,
        });
        return;
      }

      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
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
    <div className="min-h-screen bg-[#f3f2ef]">
      <div className="mx-auto flex max-w-xl flex-col items-stretch gap-4 px-4 py-10 pb-28">
        <div className="rounded-xl bg-white px-4 py-3 text-sm text-gray-700 shadow-sm ring-1 ring-gray-200">
          Infinite Wisdom Generator
        </div>

        <div className="relative rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
          {loading && (
            <div className="text-sm text-gray-600">Summoning a thought leader...</div>
          )}

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
            <div className="space-y-2">
              <div className="text-sm font-semibold text-gray-900">No wisdom found</div>
              <div className="text-sm text-gray-700">
                Add a few suggestions in the admin panel.
              </div>
              <a
                href="/life-suggestions/admin"
                className="inline-flex rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white"
              >
                Go to Admin
              </a>
            </div>
          )}

          {!loading && !error && current && (
            <>
              <div className="flex items-start gap-3">
                <div className="relative h-12 w-12 overflow-hidden rounded-full ring-1 ring-gray-200">
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
                    <div className="truncate text-sm font-semibold text-gray-900">
                      {display.authorName}
                    </div>
                    <div className="text-xs text-gray-500">•</div>
                    <div className="text-xs text-gray-500">{display.time}</div>
                  </div>
                  <div className="truncate text-xs text-gray-600">
                    {display.authorTitle}
                  </div>
                </div>
              </div>

              <div className="mt-4 whitespace-pre-line text-[15px] leading-6 text-gray-900">
                {display.text}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-600">
                <div>{display.likes.toLocaleString()} likes</div>
                <div>12 comments • 3 reposts</div>
              </div>

              <div className="mt-2 grid grid-cols-4 gap-1 border-t border-gray-100 pt-2">
                <motion.button
                  onClick={onLike}
                  whileTap={{ scale: 0.98 }}
                  animate={liked ? { scale: [1, 1.04, 1] } : { scale: 1 }}
                  transition={{ duration: 0.18 }}
                  className={`flex items-center justify-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold transition ${
                    liked ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"
                  } ${liked ? "scale-[1.02]" : ""}`}
                >
                  <ThumbsUp className="h-4 w-4" />
                  Like
                </motion.button>
                <button className="flex items-center justify-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                  <MessageCircle className="h-4 w-4" />
                  Comment
                </button>
                <button
                  onClick={onShare}
                  className="flex items-center justify-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </button>
                <button className="flex items-center justify-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                  <Send className="h-4 w-4" />
                  Send
                </button>
              </div>
            </>
          )}

          {toast && (
            <div className="pointer-events-none absolute right-4 top-4 rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white shadow-lg">
              {toast}
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-6 left-0 right-0 z-40 px-4">
        <button
          onClick={next}
          disabled={loading || !!error || items.length === 0}
          className="mx-auto block w-full max-w-xl rounded-2xl bg-gray-900 px-4 py-4 text-center text-base font-bold text-white shadow-lg disabled:opacity-50"
        >
          Next Wisdom 💡
        </button>
      </div>
    </div>
  );
}
