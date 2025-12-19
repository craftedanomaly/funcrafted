"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Link as LinkIcon,
  Trash2,
  Bot,
  User,
  LogOut,
  Plus,
  Image as ImageIcon,
  Loader2,
  ExternalLink,
  X,
  CheckCircle,
  AlertCircle,
  ZoomIn,
  ZoomOut,
  Square,
  CheckSquare,
  Trophy,
  RefreshCw,
  Save,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";
import Image from "next/image";
import {
  getLifeSuggestions,
  addLifeSuggestion,
  deleteLifeSuggestion,
  LifeSuggestion,
} from "@/lib/firebase";

interface ImageItem {
  id: string;
  filename: string;
  url: string;
  isAI: boolean;
  source?: string;
  createdAt: string;
}

interface LeaderboardEntry {
  id: string;
  nickname: string;
  score: number;
  gameId: string;
  createdAt: string;
}

interface ScoreRank {
  id?: string;
  minScore: number;
  maxScore: number;
  title: string;
  imageUrl: string;
  gameId: string;
}

interface UploadItem {
  id: string;
  file: File;
  preview: string;
  status: "pending" | "uploading" | "success" | "error";
  isAI: boolean;
  source: string;
  error?: string;
}

// Separate component to prevent re-renders on every keystroke
function UploadQueueItem({
  item,
  onUpdate,
  onRemove,
}: {
  item: UploadItem;
  onUpdate: (id: string, updates: Partial<UploadItem>) => void;
  onRemove: (id: string) => void;
}) {
  const [localSource, setLocalSource] = useState(item.source);

  return (
    <div className="flex items-center gap-3 rounded-xl bg-gray-700 p-3">
      {/* Preview */}
      <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg">
        <Image
          src={item.preview}
          alt="Preview"
          fill
          className="object-cover"
          unoptimized
        />
        {item.status === "uploading" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Loader2 className="h-6 w-6 animate-spin text-white" />
          </div>
        )}
        {item.status === "success" && (
          <div className="absolute inset-0 flex items-center justify-center bg-green-500/50">
            <CheckCircle className="h-6 w-6 text-white" />
          </div>
        )}
        {item.status === "error" && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-500/50">
            <AlertCircle className="h-6 w-6 text-white" />
          </div>
        )}
      </div>

      {/* Info & Controls */}
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm text-white">{item.file.name}</p>

        {item.status === "pending" && (
          <div className="mt-1 flex items-center gap-3">
            {/* AI Toggle */}
            <button
              onClick={() => onUpdate(item.id, { isAI: !item.isAI })}
              className={`flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold text-white ${
                item.isAI ? "bg-[#2EA7F2]" : "bg-[#76D95B]"
              }`}
            >
              {item.isAI ? <Bot className="h-3 w-3" /> : <User className="h-3 w-3" />}
              {item.isAI ? "AI" : "Real"}
            </button>
            {/* Source Input - uses local state, updates on blur */}
            <input
              type="text"
              value={localSource}
              onChange={(e) => setLocalSource(e.target.value)}
              onBlur={() => onUpdate(item.id, { source: localSource })}
              placeholder="Source..."
              className="flex-1 rounded bg-gray-600 px-2 py-0.5 text-xs text-white placeholder-gray-500"
            />
          </div>
        )}

        {item.status === "error" && (
          <p className="mt-1 text-xs text-red-400">{item.error}</p>
        )}
      </div>

      {/* Remove Button */}
      {item.status !== "uploading" && (
        <button
          onClick={() => onRemove(item.id)}
          className="flex-shrink-0 rounded-lg p-1 text-gray-400 hover:bg-gray-600 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      )}
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

export default function AdminClient() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<"images" | "leaderboard" | "ranks" | "suggestions">("images");

  // AI or Not State
  const [images, setImages] = useState<ImageItem[]>([]);
  const [addMode, setAddMode] = useState<"upload" | "link" | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [scoreRanks, setScoreRanks] = useState<ScoreRank[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newUrl, setNewUrl] = useState("");
  const [newIsAI, setNewIsAI] = useState(true);
  const [newSource, setNewSource] = useState("");
  const [gridSize, setGridSize] = useState<"small" | "medium" | "large">("medium");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<ImageItem | null>(null);

  // Life Suggestions State
  const [suggestions, setSuggestions] = useState<LifeSuggestion[]>([]);
  const [suggestionText, setSuggestionText] = useState("");
  const [suggestionAuthor, setSuggestionAuthor] = useState("");
  const [suggestionTitle, setSuggestionTitle] = useState("");
  const [suggestionLikes, setSuggestionLikes] = useState("");
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const didInitSuggestionsRef = useRef(false);

  const getAuthHeader = useCallback(() => {
    return "Basic " + btoa(`${username}:${password}`);
  }, [username, password]);

  // --- Fetchers ---

  const fetchImages = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/ai-or-not", {
        headers: { Authorization: getAuthHeader() },
      });

      if (res.status === 401) {
        setIsAuthenticated(false);
        setAuthError("Session expired");
        return;
      }

      const data = await res.json();
      if (data.success) {
        setImages(data.data.images || []);
      }
    } catch (error) {
      console.error("Fetch error:", error);
    }
    setIsLoading(false);
  }, [getAuthHeader]);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch("/api/leaderboard/ai-or-not?limit=100");
      const data = await res.json();
      if (data.success) {
        setLeaderboard(data.data.entries || []);
      }
    } catch (error) {
      console.error("Leaderboard fetch error:", error);
    }
  }, []);

  const fetchScoreRanks = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/score-ranks?gameId=ai-or-not", {
        headers: { Authorization: getAuthHeader() },
      });
      const data = await res.json();
      if (data.success) {
        setScoreRanks(data.data || []);
      }
    } catch (error) {
      console.error("Score ranks fetch error:", error);
    }
  }, [getAuthHeader]);

  const fetchSuggestions = useCallback(async () => {
    try {
      const all = await getLifeSuggestions();
      setSuggestions(shuffle(all));
    } catch (e) {
      setSuggestionError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  // --- Auth ---

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/admin/ai-or-not", {
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
        setImages(data.data.images || []);
        fetchLeaderboard();
        fetchScoreRanks();
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
    setImages([]);
    setLeaderboard([]);
    setScoreRanks([]);
    setSuggestions([]);
  };

  // --- Life Suggestions Logic ---

  useEffect(() => {
    if (isAuthenticated && activeTab === "suggestions" && !didInitSuggestionsRef.current) {
      didInitSuggestionsRef.current = true;
      void fetchSuggestions();
    }
  }, [isAuthenticated, activeTab, fetchSuggestions]);

  const handleAddSuggestion = async () => {
    const trimmed = suggestionText.trim();
    if (!trimmed) {
      setSuggestionError("Text is required");
      return;
    }

    setIsLoading(true);
    setSuggestionError(null);
    try {
      await addLifeSuggestion({
        text: trimmed,
        authorName: suggestionAuthor.trim() || undefined,
        authorTitle: suggestionTitle.trim() || undefined,
        likes: suggestionLikes.trim() ? Number(suggestionLikes) : undefined,
      });

      setSuggestionText("");
      setSuggestionAuthor("");
      setSuggestionTitle("");
      setSuggestionLikes("");
      await fetchSuggestions();
    } catch (e) {
      setSuggestionError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSuggestion = async (id: string) => {
    if (!confirm("Delete this suggestion?")) return;
    setIsLoading(true);
    setSuggestionError(null);
    try {
      await deleteLifeSuggestion(id);
      await fetchSuggestions();
    } catch (e) {
      setSuggestionError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  };

  // --- AI or Not Logic (Uploads, Deletes, etc.) ---
  
  const handleFilesSelected = (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (fileArray.length === 0) return;

    const newItems: UploadItem[] = fileArray.map((file) => {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      return {
        id: `upload_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        file,
        preview: URL.createObjectURL(file),
        status: "pending" as const,
        isAI: true,
        source: nameWithoutExt,
      };
    });

    setUploadQueue((prev) => [...prev, ...newItems]);
    setAddMode("upload");
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  const updateUploadItem = (id: string, updates: Partial<UploadItem>) => {
    setUploadQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const removeFromQueue = (id: string) => {
    setUploadQueue((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return prev.filter((i) => i.id !== id);
    });
  };

  const handleUploadAll = async () => {
    const pendingItems = uploadQueue.filter((item) => item.status === "pending");
    if (pendingItems.length === 0) return;

    setIsUploading(true);

    for (const item of pendingItems) {
      updateUploadItem(item.id, { status: "uploading" });

      try {
        const formData = new FormData();
        formData.append("file", item.file);
        formData.append("isAI", String(item.isAI));
        formData.append("source", item.source);

        const res = await fetch("/api/admin/ai-or-not", {
          method: "POST",
          headers: { Authorization: getAuthHeader() },
          body: formData,
        });

        const data = await res.json();
        if (data.success) {
          updateUploadItem(item.id, { status: "success" });
          setImages((prev) => [...prev, data.data]);
        } else {
          updateUploadItem(item.id, { status: "error", error: data.error || "Upload failed" });
        }
      } catch (error) {
        updateUploadItem(item.id, { status: "error", error: "Network error" });
      }
    }

    setIsUploading(false);
  };

  const clearCompleted = () => {
    setUploadQueue((prev) => {
      prev.filter((i) => i.status === "success").forEach((i) => URL.revokeObjectURL(i.preview));
      return prev.filter((i) => i.status !== "success");
    });
    if (uploadQueue.every((i) => i.status === "success")) {
      setAddMode(null);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === images.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(images.map((img) => img.id)));
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} images?`)) return;

    setIsLoading(true);
    const idsToDelete = Array.from(selectedIds);
    
    for (const id of idsToDelete) {
      try {
        const res = await fetch(`/api/admin/ai-or-not?id=${id}`, {
          method: "DELETE",
          headers: { Authorization: getAuthHeader() },
        });
        const data = await res.json();
        if (data.success) {
          setImages((prev) => prev.filter((img) => img.id !== id));
          setSelectedIds((prev) => {
            const newSet = new Set(prev);
            newSet.delete(id);
            return newSet;
          });
        }
      } catch (error) {
        console.error("Delete error:", error);
      }
    }
    
    setIsLoading(false);
    setIsSelectionMode(false);
  };

  const handleAddLink = async () => {
    if (!newUrl.trim()) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/ai-or-not", {
        method: "POST",
        headers: {
          Authorization: getAuthHeader(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: newUrl,
          isAI: newIsAI,
          source: newSource,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setImages((prev) => [...prev, data.data]);
        setAddMode(null);
        setNewUrl("");
        setNewIsAI(true);
        setNewSource("");
      } else {
        alert(data.error || "Failed to add image");
      }
    } catch (error) {
      console.error("Add error:", error);
      alert("Failed to add image");
    }
    setIsLoading(false);
  };

  const handleDeleteImage = async (id: string) => {
    if (!confirm("Are you sure you want to delete this image?")) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/ai-or-not?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: getAuthHeader() },
      });

      const data = await res.json();
      if (data.success) {
        setImages((prev) => prev.filter((img) => img.id !== id));
      } else {
        alert(data.error || "Failed to delete image");
      }
    } catch (error) {
      console.error("Delete error:", error);
    }
    setIsLoading(false);
  };

  const handleUpdateImage = async (
    id: string,
    updates: { isAI?: boolean; source?: string }
  ) => {
    try {
      const res = await fetch("/api/admin/ai-or-not", {
        method: "PATCH",
        headers: {
          Authorization: getAuthHeader(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, ...updates }),
      });

      const data = await res.json();
      if (data.success) {
        setImages((prev) =>
          prev.map((img) => (img.id === id ? { ...img, ...updates } : img))
        );
      }
    } catch (error) {
      console.error("Update error:", error);
    }
  };

  const deleteLeaderboardEntry = async (entryId: string) => {
    if (!confirm("Delete this entry?")) return;
    try {
      const res = await fetch(`/api/leaderboard/ai-or-not?entryId=${entryId}`, {
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
    if (!confirm("DELETE ALL leaderboard entries? This cannot be undone!")) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/leaderboard/ai-or-not?reset=true", {
        method: "DELETE",
        headers: { Authorization: getAuthHeader() },
      });
      const data = await res.json();
      if (data.success) {
        setLeaderboard([]);
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

  const updateRankField = (index: number, field: keyof ScoreRank, value: string) => {
    setScoreRanks((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const gridClasses = {
    small: "grid-cols-3 sm:grid-cols-4 lg:grid-cols-6",
    medium: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
    large: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  };

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl dark:bg-gray-800"
        >
          <div className="mb-6 text-center">
            <div className="mb-4 inline-flex rounded-2xl bg-gradient-to-br from-[#76D95B] to-[#96D966] p-4">
              <ImageIcon className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              FunCrafted Admin
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Manage all game data
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border-0 bg-gray-100 px-4 py-3 text-gray-900 focus:ring-2 focus:ring-[#76D95B] dark:bg-gray-700 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border-0 bg-gray-100 px-4 py-3 text-gray-900 focus:ring-2 focus:ring-[#76D95B] dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            {authError && (
              <p className="text-center text-sm text-red-500">{authError}</p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-gradient-to-r from-[#76D95B] to-[#96D966] py-3 font-semibold text-white disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="mx-auto h-5 w-5 animate-spin" />
              ) : (
                "Login"
              )}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // Dashboard
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-4">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">FunCrafted Admin</h1>
            <p className="text-sm text-gray-400">Unified admin panel</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-xl bg-gray-700 px-4 py-2 text-sm text-white hover:bg-gray-600"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab("images")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${
              activeTab === "images"
                ? "bg-[#00D9FF] text-white"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            <ImageIcon className="h-4 w-4" />
            Images
          </button>
          <button
            onClick={() => setActiveTab("leaderboard")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${
              activeTab === "leaderboard"
                ? "bg-[#FFD23F] text-black"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            <Trophy className="h-4 w-4" />
            Leaderboard
          </button>
          <button
            onClick={() => setActiveTab("ranks")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${
              activeTab === "ranks"
                ? "bg-[#FF6B9D] text-white"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            <Save className="h-4 w-4" />
            Score Ranks
          </button>
          <button
            onClick={() => setActiveTab("suggestions")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${
              activeTab === "suggestions"
                ? "bg-[#0077B5] text-white"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            <Lightbulb className="h-4 w-4" />
            Life Suggestions
          </button>
        </div>

        {/* --- Life Suggestions Tab --- */}
        {activeTab === "suggestions" && (
          <>
            <div className="rounded-2xl bg-gray-800 p-6 mb-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Add Life Suggestion</h2>
                <button
                  onClick={fetchSuggestions}
                  className="rounded-lg bg-gray-700 px-3 py-2 text-sm font-semibold text-gray-300 hover:bg-gray-600"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 grid gap-3">
                <textarea
                  value={suggestionText}
                  onChange={(e) => setSuggestionText(e.target.value)}
                  placeholder="Write something dangerously inspiring..."
                  className="min-h-[100px] w-full resize-none rounded-xl bg-gray-700 border-0 px-3 py-2 text-sm text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#0077B5]"
                />

                <div className="grid gap-3 md:grid-cols-3">
                  <input
                    value={suggestionAuthor}
                    onChange={(e) => setSuggestionAuthor(e.target.value)}
                    placeholder="Author name (optional)"
                    className="rounded-xl bg-gray-700 border-0 px-3 py-2 text-sm text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#0077B5]"
                  />
                  <input
                    value={suggestionTitle}
                    onChange={(e) => setSuggestionTitle(e.target.value)}
                    placeholder="Author title (optional)"
                    className="rounded-xl bg-gray-700 border-0 px-3 py-2 text-sm text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#0077B5]"
                  />
                  <input
                    value={suggestionLikes}
                    onChange={(e) => setSuggestionLikes(e.target.value)}
                    placeholder="Base likes (optional)"
                    inputMode="numeric"
                    className="rounded-xl bg-gray-700 border-0 px-3 py-2 text-sm text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#0077B5]"
                  />
                </div>

                <button
                  onClick={handleAddSuggestion}
                  disabled={isLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0077B5] px-4 py-3 text-sm font-bold text-white hover:bg-[#006090] disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  Post to Universe
                </button>

                {suggestionError && <div className="text-sm text-red-400">{suggestionError}</div>}
              </div>
            </div>

            <div className="rounded-2xl bg-gray-800 p-6">
              <div className="text-sm font-semibold text-white mb-4">
                Existing Suggestions ({suggestions.length})
              </div>

              {suggestions.length === 0 && (
                <p className="text-gray-500 text-center py-4">No suggestions yet.</p>
              )}

              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {suggestions.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-start justify-between gap-3 rounded-xl bg-gray-700 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-white">
                        {(s.authorName || "(random author)").toString()}
                      </div>
                      <div className="truncate text-xs text-gray-400">
                        {(s.authorTitle || "(random title)").toString()}
                      </div>
                      <div className="mt-2 max-h-20 overflow-hidden whitespace-pre-line text-sm text-gray-300">
                        {s.text}
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        likes: {typeof s.likes === "number" ? s.likes : "(auto)"}
                      </div>
                    </div>
                    <button
                      onClick={() => s.id && handleDeleteSuggestion(s.id)}
                      disabled={isLoading || !s.id}
                      className="rounded-lg p-2 text-gray-400 hover:bg-gray-600 hover:text-white disabled:opacity-50"
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

        {/* --- Images Tab --- */}
        {activeTab === "images" && (
          <>
            <div className="mb-8 rounded-2xl bg-gray-800 p-6">
              <h2 className="mb-4 text-lg font-semibold text-white">Add Images</h2>

              {/* Drag-Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative mb-4 cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
                  isDragging
                    ? "border-[#76D95B] bg-[#76D95B]/10"
                    : "border-gray-600 hover:border-gray-500"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => e.target.files && handleFilesSelected(e.target.files)}
                  className="hidden"
                />
                <Upload className={`mx-auto h-12 w-12 ${isDragging ? "text-[#76D95B]" : "text-gray-500"}`} />
                <p className="mt-2 text-gray-400">
                  <span className="font-semibold text-white">Click to upload</span> or drag and drop
                </p>
                <p className="text-sm text-gray-500">PNG, JPG, GIF, WebP (multiple files supported)</p>
              </div>

              {!addMode && (
                <button
                  onClick={() => setAddMode("link")}
                  className="flex items-center gap-2 rounded-xl bg-[#2EA7F2] px-6 py-3 font-semibold text-white hover:bg-[#2596db]"
                >
                  <LinkIcon className="h-5 w-5" />
                  Add Link Instead
                </button>
              )}

              {/* Upload Queue */}
              <AnimatePresence>
                {uploadQueue.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-white">
                        Upload Queue ({uploadQueue.length} files)
                      </h3>
                      <div className="flex gap-2">
                        {uploadQueue.some((i) => i.status === "success") && (
                          <button
                            onClick={clearCompleted}
                            className="text-xs text-gray-400 hover:text-white"
                          >
                            Clear completed
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="max-h-96 space-y-2 overflow-y-auto">
                      {uploadQueue.map((item) => (
                        <UploadQueueItem
                          key={item.id}
                          item={item}
                          onUpdate={updateUploadItem}
                          onRemove={removeFromQueue}
                        />
                      ))}
                    </div>

                    {uploadQueue.some((i) => i.status === "pending") && (
                      <button
                        onClick={handleUploadAll}
                        disabled={isUploading}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#76D95B] py-3 font-semibold text-white disabled:opacity-50"
                      >
                        {isUploading ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Upload className="h-5 w-5" />
                        )}
                        Upload {uploadQueue.filter((i) => i.status === "pending").length} Files
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Link Form */}
              <AnimatePresence>
                {addMode === "link" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 space-y-4"
                  >
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-300">Image URL</label>
                      <input
                        type="url"
                        value={newUrl}
                        onChange={(e) => setNewUrl(e.target.value)}
                        placeholder="https://example.com/image.jpg"
                        className="w-full rounded-xl bg-gray-700 px-4 py-3 text-white placeholder-gray-500"
                      />
                    </div>

                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-sm text-gray-300">
                        <span>Is AI Generated?</span>
                        <button
                          type="button"
                          onClick={() => setNewIsAI(!newIsAI)}
                          className={`relative h-6 w-12 rounded-full transition-colors ${
                            newIsAI ? "bg-[#2EA7F2]" : "bg-[#76D95B]"
                          }`}
                        >
                          <span
                            className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                              newIsAI ? "left-7" : "left-1"
                            }`}
                          />
                        </button>
                        <span className="font-semibold">
                          {newIsAI ? (
                            <span className="flex items-center gap-1 text-[#2EA7F2]">
                              <Bot className="h-4 w-4" /> AI
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[#76D95B]">
                              <User className="h-4 w-4" /> Real
                            </span>
                          )}
                        </span>
                      </label>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-300">
                        Source (shown after reveal)
                      </label>
                      <input
                        type="text"
                        value={newSource}
                        onChange={(e) => setNewSource(e.target.value)}
                        placeholder="e.g. Midjourney, Unsplash, Photo by John Doe"
                        className="w-full rounded-xl bg-gray-700 px-4 py-3 text-white placeholder-gray-500"
                      />
                    </div>

                    <div className="flex gap-4">
                      <button
                        onClick={handleAddLink}
                        disabled={isLoading}
                        className="flex items-center gap-2 rounded-xl bg-[#76D95B] px-6 py-3 font-semibold text-white disabled:opacity-50"
                      >
                        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
                        Add Link
                      </button>
                      <button
                        onClick={() => {
                          setAddMode(null);
                          setNewUrl("");
                          setNewSource("");
                        }}
                        className="rounded-xl bg-gray-600 px-6 py-3 font-semibold text-white"
                      >
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Image List */}
            <div className="rounded-2xl bg-gray-800 p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-lg font-semibold text-white">
                  Images ({images.length})
                  {selectedIds.size > 0 && <span className="ml-2 text-sm text-gray-400">({selectedIds.size} selected)</span>}
                </h2>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 rounded-lg bg-gray-700 p-1">
                    <button onClick={() => setGridSize("small")} className={`rounded p-1.5 ${gridSize === "small" ? "bg-gray-600 text-white" : "text-gray-400 hover:text-white"}`} title="Small grid"><ZoomOut className="h-4 w-4" /></button>
                    <button onClick={() => setGridSize("medium")} className={`rounded p-1.5 ${gridSize === "medium" ? "bg-gray-600 text-white" : "text-gray-400 hover:text-white"}`} title="Medium grid"><ImageIcon className="h-4 w-4" /></button>
                    <button onClick={() => setGridSize("large")} className={`rounded p-1.5 ${gridSize === "large" ? "bg-gray-600 text-white" : "text-gray-400 hover:text-white"}`} title="Large grid"><ZoomIn className="h-4 w-4" /></button>
                  </div>

                  <button
                    onClick={() => {
                      setIsSelectionMode(!isSelectionMode);
                      if (isSelectionMode) setSelectedIds(new Set());
                    }}
                    className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium ${isSelectionMode ? "bg-[#FF6B9D] text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}
                  >
                    {isSelectionMode ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />} Select
                  </button>

                  {isSelectionMode && (
                    <>
                      <button onClick={toggleSelectAll} className="rounded-lg bg-gray-700 px-3 py-1.5 text-sm font-medium text-gray-300 hover:bg-gray-600">
                        {selectedIds.size === images.length ? "Deselect All" : "Select All"}
                      </button>
                      {selectedIds.size > 0 && (
                        <button onClick={handleBatchDelete} disabled={isLoading} className="flex items-center gap-2 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50">
                          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete ({selectedIds.size})
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {images.length === 0 ? (
                <p className="text-center text-gray-400 py-8">No images yet. Add some above!</p>
              ) : (
                <div className={`grid gap-4 ${gridClasses[gridSize]}`}>
                  {images.map((img) => (
                    <div
                      key={img.id}
                      className={`group relative overflow-hidden rounded-xl bg-gray-700 ${isSelectionMode ? "cursor-pointer" : ""} ${selectedIds.has(img.id) ? "ring-2 ring-[#FF6B9D]" : ""}`}
                      onClick={isSelectionMode ? () => toggleSelection(img.id) : undefined}
                    >
                      <div className="relative aspect-square">
                        <Image src={img.url} alt={img.id} fill className="object-cover" unoptimized />
                        {isSelectionMode && (
                          <div className="absolute left-2 top-2 z-10">
                            <div className={`flex h-6 w-6 items-center justify-center rounded ${selectedIds.has(img.id) ? "bg-[#FF6B9D]" : "bg-black/50"}`}>
                              {selectedIds.has(img.id) && <CheckCircle className="h-4 w-4 text-white" />}
                            </div>
                          </div>
                        )}
                        <div className={`absolute ${isSelectionMode ? "left-10" : "left-2"} top-2 rounded-full px-3 py-1 text-xs font-bold text-white ${img.isAI ? "bg-[#2EA7F2]" : "bg-[#76D95B]"}`}>
                          {img.isAI ? "AI" : "Real"}
                        </div>
                        {!isSelectionMode && (
                          <button onClick={(e) => { e.stopPropagation(); setZoomedImage(img); }} className="absolute right-2 top-2 rounded-lg bg-black/50 p-2 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/70">
                            <ZoomIn className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      {gridSize !== "small" && !isSelectionMode && (
                        <div className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-400">Type:</span>
                            <button onClick={() => handleUpdateImage(img.id, { isAI: !img.isAI })} className={`flex items-center gap-2 rounded-lg px-3 py-1 text-sm font-semibold text-white ${img.isAI ? "bg-[#2EA7F2]" : "bg-[#76D95B]"}`}>
                              {img.isAI ? <><Bot className="h-4 w-4" /> AI</> : <><User className="h-4 w-4" /> Real</>}
                            </button>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-gray-400">Source:</label>
                            <input type="text" defaultValue={img.source || ""} onBlur={(e) => handleUpdateImage(img.id, { source: e.target.value })} placeholder="Add source..." className="w-full rounded-lg bg-gray-600 px-3 py-2 text-sm text-white placeholder-gray-500" />
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => setZoomedImage(img)} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-gray-600 py-2 text-sm text-white hover:bg-gray-500">
                              <ZoomIn className="h-4 w-4" /> View
                            </button>
                            <button onClick={() => handleDeleteImage(img.id)} className="flex items-center justify-center gap-1 rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-500">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <AnimatePresence>
              {zoomedImage && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={() => setZoomedImage(null)}>
                  <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
                    <Image src={zoomedImage.url} alt={zoomedImage.id} width={1200} height={1200} className="max-h-[80vh] w-auto rounded-xl object-contain" unoptimized />
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`rounded-full px-3 py-1 text-sm font-bold text-white ${zoomedImage.isAI ? "bg-[#2EA7F2]" : "bg-[#76D95B]"}`}>
                          {zoomedImage.isAI ? "AI Generated" : "Real Photo"}
                        </span>
                        {zoomedImage.source && <span className="text-sm text-gray-400">Source: {zoomedImage.source}</span>}
                      </div>
                      <button onClick={() => setZoomedImage(null)} className="rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600">Close</button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}

        {/* --- Leaderboard Tab --- */}
        {activeTab === "leaderboard" && (
          <div className="rounded-2xl bg-gray-800 p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">Leaderboard Entries ({leaderboard.length})</h2>
              <div className="flex gap-2">
                <button onClick={fetchLeaderboard} disabled={isLoading} className="flex items-center gap-2 rounded-lg bg-gray-700 px-4 py-2 text-sm text-white hover:bg-gray-600 disabled:opacity-50">
                  <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} /> Refresh
                </button>
                <button onClick={resetLeaderboard} disabled={isLoading || leaderboard.length === 0} className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-500 disabled:opacity-50">
                  <AlertTriangle className="h-4 w-4" /> Reset All
                </button>
              </div>
            </div>

            {leaderboard.length === 0 ? (
              <p className="py-10 text-center text-gray-500">No entries yet.</p>
            ) : (
              <div className="max-h-[70vh] space-y-2 overflow-y-auto">
                {leaderboard.map((entry, index) => (
                  <div key={entry.id} className="flex items-center gap-3 rounded-xl bg-gray-700 p-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-600 text-sm font-bold text-gray-200">{index + 1}</div>
                    <div className="flex-1">
                      <div className="font-medium text-white">{entry.nickname}</div>
                    </div>
                    <div className="text-lg font-bold text-[#00FF94]">{entry.score}</div>
                    <button onClick={() => deleteLeaderboardEntry(entry.id)} disabled={isLoading} className="rounded-lg p-2 text-gray-400 hover:bg-gray-600 hover:text-red-400 disabled:opacity-50">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- Score Ranks Tab --- */}
        {activeTab === "ranks" && (
          <div className="rounded-2xl bg-gray-800 p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">Score Ranks ({scoreRanks.length})</h2>
              <button onClick={fetchScoreRanks} disabled={isLoading} className="flex items-center gap-2 rounded-lg bg-gray-700 px-4 py-2 text-sm text-white hover:bg-gray-600 disabled:opacity-50">
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} /> Refresh
              </button>
            </div>

            {scoreRanks.length === 0 ? (
              <p className="py-10 text-center text-gray-500">No ranks configured.</p>
            ) : (
              <div className="space-y-4">
                {scoreRanks.map((rank, idx) => (
                  <div key={rank.id || idx} className="rounded-xl bg-gray-700 p-4">
                    <div className="mb-3 flex flex-wrap items-center gap-3">
                      <div className="rounded bg-gray-600 px-2 py-1 text-sm font-semibold text-gray-200">{rank.minScore} - {rank.maxScore} pts</div>
                      <div className="flex-1 text-sm font-medium text-white">{rank.title}</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      {rank.imageUrl && (
                        <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg">
                          <Image src={rank.imageUrl} alt={rank.title} fill className="object-cover" unoptimized />
                        </div>
                      )}
                      <div className="flex flex-1 items-center gap-2">
                        <input type="text" value={rank.imageUrl || ""} onChange={(e) => updateRankField(idx, "imageUrl", e.target.value)} placeholder="Image URL..." className="flex-1 rounded-lg bg-gray-600 px-3 py-2 text-sm text-white placeholder-gray-500" />
                        <label className="flex cursor-pointer items-center gap-1 rounded-lg bg-[#FF6B9D] px-3 py-2 text-sm font-medium text-white hover:bg-[#e55a8a]">
                          <Upload className="h-4 w-4" /> <span className="hidden sm:inline">Upload</span>
                          <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const formData = new FormData();
                            formData.append("file", file);
                            try {
                              const res = await fetch("/api/admin/rank-images", { method: "POST", headers: { Authorization: getAuthHeader() }, body: formData });
                              const data = await res.json();
                              if (data.success) updateRankField(idx, "imageUrl", data.data.url);
                              else alert(data.error || "Upload failed");
                            } catch (err) { alert("Upload failed"); }
                            e.target.value = "";
                          }} />
                        </label>
                      </div>
                      <button onClick={() => updateScoreRank(rank)} disabled={isLoading} className="flex items-center gap-2 rounded-lg bg-[#00D9FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#00c4e6] disabled:opacity-50">
                        <Save className="h-4 w-4" /> Save
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
