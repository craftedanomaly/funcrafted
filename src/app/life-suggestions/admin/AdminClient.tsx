"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  addLifeSuggestion,
  deleteLifeSuggestion,
  getLifeSuggestions,
  LifeSuggestion,
} from "@/lib/firebase";

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const PIN = "hustle101";

export default function AdminClient() {
  const [pin, setPin] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const didInitRef = useRef(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [text, setText] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [authorTitle, setAuthorTitle] = useState("");
  const [likes, setLikes] = useState("");

  const [items, setItems] = useState<LifeSuggestion[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1800);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await getLifeSuggestions();
      setItems(shuffle(all));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!unlocked) return;
    if (didInitRef.current) return;
    didInitRef.current = true;
    void refresh();
  }, [unlocked, items.length, loading, error, refresh]);

  const unlock = useCallback(() => {
    if (pin === PIN) {
      setUnlocked(true);
      setError(null);
    } else {
      setError("Wrong pin. Please recalibrate your grindset.");
    }
  }, [pin]);

  const onSubmit = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed) {
      setError("Text is required");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await addLifeSuggestion({
        text: trimmed,
        authorName: authorName.trim() || undefined,
        authorTitle: authorTitle.trim() || undefined,
        likes: likes.trim() ? Number(likes) : undefined,
      });

      setText("");
      setAuthorName("");
      setAuthorTitle("");
      setLikes("");
      showToast("Posted to Universe");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [text, authorName, authorTitle, likes, refresh, showToast]);

  const onDelete = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        await deleteLifeSuggestion(id);
        showToast("Deleted");
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    },
    [refresh, showToast]
  );

  return (
    <div className="min-h-screen bg-[#f3f2ef]">
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-10">
        <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3 text-sm text-gray-700 shadow-sm ring-1 ring-gray-200">
          <div>Life Suggestions Admin</div>
          <a href="/life-suggestions" className="font-semibold text-gray-900">
            Back to Feed
          </a>
        </div>

        {!unlocked && (
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
            <div className="text-sm font-semibold text-gray-900">Enter Secret Pin</div>
            <div className="mt-2 flex gap-2">
              <input
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="hustle101"
                className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none"
              />
              <button
                onClick={unlock}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Unlock
              </button>
            </div>
            {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
          </div>
        )}

        {unlocked && (
          <>
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-900">Post to Universe</div>
                <button
                  onClick={refresh}
                  className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-800"
                >
                  Refresh
                </button>
              </div>

              <div className="mt-3 grid gap-3">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Write something dangerously inspiring..."
                  className="min-h-[120px] w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none"
                />

                <div className="grid gap-3 md:grid-cols-3">
                  <input
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="Author name (optional)"
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none"
                  />
                  <input
                    value={authorTitle}
                    onChange={(e) => setAuthorTitle(e.target.value)}
                    placeholder="Author title (optional)"
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none"
                  />
                  <input
                    value={likes}
                    onChange={(e) => setLikes(e.target.value)}
                    placeholder="Base likes (optional)"
                    inputMode="numeric"
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none"
                  />
                </div>

                <button
                  onClick={onSubmit}
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  Post to Universe
                </button>

                {error && <div className="text-sm text-red-600">{error}</div>}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
              <div className="text-sm font-semibold text-gray-900">
                Existing Suggestions ({items.length})
              </div>

              {loading && <div className="mt-2 text-sm text-gray-600">Working...</div>}

              <div className="mt-3 grid gap-2">
                {items.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-gray-900">
                        {(s.authorName || "(random author)").toString()}
                      </div>
                      <div className="truncate text-xs text-gray-600">
                        {(s.authorTitle || "(random title)").toString()}
                      </div>
                      <div className="mt-2 max-h-20 overflow-hidden whitespace-pre-line text-sm text-gray-800">
                        {s.text}
                      </div>
                      <div className="mt-2 text-xs text-gray-600">
                        likes: {typeof s.likes === "number" ? s.likes : "(auto)"}
                      </div>
                    </div>
                    <button
                      onClick={() => s.id && onDelete(s.id)}
                      disabled={loading || !s.id}
                      className="rounded-lg p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {toast && (
          <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white shadow-lg">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
