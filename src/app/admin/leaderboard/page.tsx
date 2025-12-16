"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  Trash2,
  LogOut,
  Loader2,
  RefreshCw,
  Image as ImageIcon,
  Save,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Image from "next/image";

interface LeaderboardEntry {
  id: string;
  nickname: string;
  score: number;
  gameId: string;
  createdAt: Date;
}

interface ScoreRank {
  id?: string;
  minScore: number;
  maxScore: number;
  title: string;
  imageUrl: string;
  gameId: string;
}

const GAME_OPTIONS = [
  { id: "ai-or-not", name: "AI or Not?" },
];

export default function AdminLeaderboardPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [selectedGame, setSelectedGame] = useState("ai-or-not");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [scoreRanks, setScoreRanks] = useState<ScoreRank[]>([]);
  const [expandedSection, setExpandedSection] = useState<"leaderboard" | "ranks" | null>("leaderboard");

  const getAuthHeader = useCallback(() => {
    return "Basic " + btoa(`${username}:${password}`);
  }, [username, password]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setIsLoading(true);

    try {
      const res = await fetch(`/api/admin/score-ranks?gameId=${selectedGame}`, {
        headers: { Authorization: "Basic " + btoa(`${username}:${password}`) },
      });

      if (res.status === 401) {
        setAuthError("Invalid username or password");
        setIsLoading(false);
        return;
      }

      const data = await res.json();
      if (data.success) {
        setIsAuthenticated(true);
        setScoreRanks(data.data || []);
        await fetchLeaderboard();
      }
    } catch (error) {
      setAuthError("Connection error");
    }
    setIsLoading(false);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUsername("");
    setPassword("");
    setLeaderboard([]);
    setScoreRanks([]);
  };

  const fetchLeaderboard = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/leaderboard/${selectedGame}?limit=100`);
      const data = await res.json();
      if (data.success) {
        setLeaderboard(data.data.entries || []);
      }
    } catch (error) {
      console.error("Fetch leaderboard error:", error);
    }
    setIsLoading(false);
  }, [selectedGame]);

  const fetchScoreRanks = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/score-ranks?gameId=${selectedGame}`, {
        headers: { Authorization: getAuthHeader() },
      });
      const data = await res.json();
      if (data.success) {
        setScoreRanks(data.data || []);
      }
    } catch (error) {
      console.error("Fetch score ranks error:", error);
    }
  }, [selectedGame, getAuthHeader]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchLeaderboard();
      fetchScoreRanks();
    }
  }, [isAuthenticated, selectedGame, fetchLeaderboard, fetchScoreRanks]);

  const deleteEntry = async (entryId: string) => {
    if (!confirm("Delete this entry?")) return;

    try {
      const res = await fetch(`/api/leaderboard/${selectedGame}?entryId=${entryId}`, {
        method: "DELETE",
        headers: { Authorization: getAuthHeader() },
      });
      const data = await res.json();
      if (data.success) {
        setLeaderboard((prev) => prev.filter((e) => e.id !== entryId));
      }
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const resetLeaderboard = async () => {
    if (!confirm(`Are you sure you want to DELETE ALL entries for ${selectedGame}? This cannot be undone!`)) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/leaderboard/${selectedGame}?reset=true`, {
        method: "DELETE",
        headers: { Authorization: getAuthHeader() },
      });
      const data = await res.json();
      if (data.success) {
        setLeaderboard([]);
        alert(`Deleted ${data.data.deletedCount} entries`);
      }
    } catch (error) {
      console.error("Reset error:", error);
    }
    setIsLoading(false);
  };

  const updateScoreRank = async (rank: ScoreRank) => {
    try {
      const res = await fetch("/api/admin/score-ranks", {
        method: "POST",
        headers: {
          Authorization: getAuthHeader(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(rank),
      });
      const data = await res.json();
      if (data.success) {
        await fetchScoreRanks();
      }
    } catch (error) {
      console.error("Update rank error:", error);
    }
  };

  const updateRankField = (index: number, field: keyof ScoreRank, value: string | number) => {
    setScoreRanks((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md rounded-2xl bg-gray-800 p-8 shadow-2xl"
        >
          <div className="mb-6 text-center">
            <div className="mb-4 inline-flex rounded-2xl bg-gradient-to-br from-[#FFD23F] to-[#FF8534] p-4">
              <Trophy className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Leaderboard Admin</h1>
            <p className="mt-2 text-sm text-gray-400">Manage leaderboards and score ranks</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl bg-gray-700 px-4 py-3 text-white focus:ring-2 focus:ring-[#FFD23F]"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl bg-gray-700 px-4 py-3 text-white focus:ring-2 focus:ring-[#FFD23F]"
                required
              />
            </div>

            {authError && <p className="text-center text-sm text-red-500">{authError}</p>}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-gradient-to-r from-[#FFD23F] to-[#FF8534] py-3 font-semibold text-white disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : "Login"}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-4">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Leaderboard Admin</h1>
            <p className="text-sm text-gray-400">Manage game leaderboards</p>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={selectedGame}
              onChange={(e) => setSelectedGame(e.target.value)}
              className="rounded-lg bg-gray-700 px-4 py-2 text-white"
            >
              {GAME_OPTIONS.map((game) => (
                <option key={game.id} value={game.id}>{game.name}</option>
              ))}
            </select>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-xl bg-gray-700 px-4 py-2 text-sm text-white hover:bg-gray-600"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>

        {/* Leaderboard Section */}
        <div className="mb-6 rounded-2xl bg-gray-800 overflow-hidden">
          <button
            onClick={() => setExpandedSection(expandedSection === "leaderboard" ? null : "leaderboard")}
            className="flex w-full items-center justify-between p-6 text-left"
          >
            <div className="flex items-center gap-3">
              <Trophy className="h-6 w-6 text-[#FFD23F]" />
              <div>
                <h2 className="text-lg font-semibold text-white">Leaderboard Entries</h2>
                <p className="text-sm text-gray-400">{leaderboard.length} entries</p>
              </div>
            </div>
            {expandedSection === "leaderboard" ? (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )}
          </button>

          <AnimatePresence>
            {expandedSection === "leaderboard" && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                className="overflow-hidden"
              >
                <div className="border-t border-gray-700 p-6">
                  {/* Actions */}
                  <div className="mb-4 flex gap-2">
                    <button
                      onClick={fetchLeaderboard}
                      disabled={isLoading}
                      className="flex items-center gap-2 rounded-lg bg-gray-700 px-4 py-2 text-sm text-white hover:bg-gray-600"
                    >
                      <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                      Refresh
                    </button>
                    <button
                      onClick={resetLeaderboard}
                      disabled={isLoading || leaderboard.length === 0}
                      className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-500 disabled:opacity-50"
                    >
                      <AlertTriangle className="h-4 w-4" />
                      Reset All
                    </button>
                  </div>

                  {/* Entries */}
                  {leaderboard.length === 0 ? (
                    <p className="py-8 text-center text-gray-500">No entries yet</p>
                  ) : (
                    <div className="max-h-96 space-y-2 overflow-y-auto">
                      {leaderboard.map((entry, index) => (
                        <div
                          key={entry.id}
                          className="flex items-center gap-3 rounded-lg bg-gray-700 p-3"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-600 font-bold text-gray-300">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-white">{entry.nickname}</div>
                          </div>
                          <div className="text-lg font-bold text-[#00FF94]">{entry.score}</div>
                          <button
                            onClick={() => deleteEntry(entry.id)}
                            className="rounded-lg p-2 text-gray-400 hover:bg-gray-600 hover:text-red-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Score Ranks Section */}
        <div className="rounded-2xl bg-gray-800 overflow-hidden">
          <button
            onClick={() => setExpandedSection(expandedSection === "ranks" ? null : "ranks")}
            className="flex w-full items-center justify-between p-6 text-left"
          >
            <div className="flex items-center gap-3">
              <ImageIcon className="h-6 w-6 text-[#FF6B9D]" />
              <div>
                <h2 className="text-lg font-semibold text-white">Score Ranks</h2>
                <p className="text-sm text-gray-400">{scoreRanks.length} ranks configured</p>
              </div>
            </div>
            {expandedSection === "ranks" ? (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )}
          </button>

          <AnimatePresence>
            {expandedSection === "ranks" && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                className="overflow-hidden"
              >
                <div className="border-t border-gray-700 p-6">
                  {scoreRanks.length === 0 ? (
                    <p className="py-8 text-center text-gray-500">No ranks configured</p>
                  ) : (
                    <div className="space-y-4">
                      {scoreRanks.map((rank, index) => (
                        <div key={rank.id || index} className="rounded-xl bg-gray-700 p-4">
                          <div className="mb-3 flex items-center gap-4">
                            <div className="text-sm text-gray-400">
                              {rank.minScore} - {rank.maxScore} pts
                            </div>
                            <div className="flex-1 font-medium text-white">{rank.title}</div>
                          </div>

                          <div className="flex items-center gap-3">
                            {rank.imageUrl && (
                              <div className="relative h-16 w-16 overflow-hidden rounded-lg">
                                <Image
                                  src={rank.imageUrl}
                                  alt={rank.title}
                                  fill
                                  className="object-cover"
                                  unoptimized
                                />
                              </div>
                            )}
                            <div className="flex-1">
                              <input
                                type="text"
                                value={rank.imageUrl || ""}
                                onChange={(e) => updateRankField(index, "imageUrl", e.target.value)}
                                placeholder="Image URL..."
                                className="w-full rounded-lg bg-gray-600 px-3 py-2 text-sm text-white placeholder-gray-500"
                              />
                            </div>
                            <button
                              onClick={() => updateScoreRank(rank)}
                              className="flex items-center gap-2 rounded-lg bg-[#00D9FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#00c4e6]"
                            >
                              <Save className="h-4 w-4" />
                              Save
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
