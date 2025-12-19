"use client";

import type { ElementType } from "react";
import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Trash2,
  Bot,
  User,
  LogOut,
  Image as ImageIcon,
  Loader2,
  X,
  CheckCircle,
  AlertCircle,
  ZoomIn,
  ZoomOut,
  CheckSquare,
  Trophy,
  RefreshCw,
  Save,
  Lightbulb,
  LayoutGrid,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  Menu,
} from "lucide-react";
import Image from "next/image";
import {
  getLifeSuggestions,
  addLifeSuggestion,
  deleteLifeSuggestion,
  LifeSuggestion,
  getGameLayout,
  saveGameLayout,
  GameLayoutItem,
} from "@/lib/firebase";

// Types
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

const DEFAULT_GAMES: GameLayoutItem[] = [
  { id: "life-suggestions", order: 0, visible: true },
  { id: "order-everything", order: 1, visible: true },
  { id: "procrastination-simulator", order: 2, visible: true },
  { id: "escape-yourself", order: 3, visible: true },
  { id: "ai-or-not", order: 4, visible: true },
  { id: "logline-slots", order: 5, visible: true },
  { id: "who-am-i", order: 6, visible: true },
];

// Helper Components
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
    <div className="flex items-center gap-4 rounded-xl bg-gray-800/50 p-3 ring-1 ring-gray-700/50 backdrop-blur-sm">
      <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-900">
        <Image src={item.preview} alt="Preview" fill className="object-cover" unoptimized />
        {item.status === "uploading" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <Loader2 className="h-6 w-6 animate-spin text-white" />
          </div>
        )}
        {item.status === "success" && (
          <div className="absolute inset-0 flex items-center justify-center bg-green-500/60">
            <CheckCircle className="h-6 w-6 text-white" />
          </div>
        )}
        {item.status === "error" && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-500/60">
            <AlertCircle className="h-6 w-6 text-white" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 space-y-2">
        <p className="truncate text-sm font-medium text-white">{item.file.name}</p>

        {item.status === "pending" && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onUpdate(item.id, { isAI: !item.isAI })}
              className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold transition-colors ${
                item.isAI ? "bg-blue-500/20 text-blue-400" : "bg-green-500/20 text-green-400"
              }`}
            >
              {item.isAI ? <Bot className="h-3 w-3" /> : <User className="h-3 w-3" />}
              {item.isAI ? "AI" : "Real"}
            </button>
            <input
              type="text"
              value={localSource}
              onChange={(e) => setLocalSource(e.target.value)}
              onBlur={() => onUpdate(item.id, { source: localSource })}
              placeholder="Source..."
              className="flex-1 rounded-md bg-gray-900/50 px-2 py-1 text-xs text-white placeholder-gray-500 ring-1 ring-gray-700 focus:ring-blue-500 outline-none"
            />
          </div>
        )}

        {item.status === "error" && <p className="text-xs text-red-400">{item.error}</p>}
      </div>

      {item.status !== "uploading" && (
        <button
          onClick={() => onRemove(item.id)}
          className="rounded-lg p-2 text-gray-400 hover:bg-red-500/20 hover:text-red-400 transition-colors"
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
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [authError, setAuthError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Tab State
  const [activeTab, setActiveTab] = useState<"images" | "leaderboard" | "ranks" | "suggestions" | "layout">("images");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Data States
  const [images, setImages] = useState<ImageItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [scoreRanks, setScoreRanks] = useState<ScoreRank[]>([]);
  const [suggestions, setSuggestions] = useState<LifeSuggestion[]>([]);
  const [gameLayout, setGameLayout] = useState<GameLayoutItem[]>([]);

  // UI States
  const [addMode, setAddMode] = useState<"upload" | "link" | null>(null);
  const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [gridSize, setGridSize] = useState<"small" | "medium" | "large">("medium");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<ImageItem | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Form States
  const [newUrl, setNewUrl] = useState("");
  const [newIsAI, setNewIsAI] = useState(true);
  const [newSource, setNewSource] = useState("");
  const [suggestionText, setSuggestionText] = useState("");
  const [suggestionAuthor, setSuggestionAuthor] = useState("");
  const [suggestionTitle, setSuggestionTitle] = useState("");
  const [suggestionLikes, setSuggestionLikes] = useState("");
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const didInitSuggestionsRef = useRef(false);
  const [layoutSaving, setLayoutSaving] = useState(false);
  const [layoutDirty, setLayoutDirty] = useState(false);

  // --- Initialization ---

  useEffect(() => {
    const saved = localStorage.getItem("admin_credentials");
    if (saved) {
      try {
        const { u, p } = JSON.parse(saved);
        if (u && p) {
          setUsername(u);
          setPassword(p);
          setRememberMe(true);
        }
      } catch {
        localStorage.removeItem("admin_credentials");
      }
    }
  }, []);

  const getAuthHeader = useCallback(() => {
    return "Basic " + btoa(`${username}:${password}`);
  }, [username, password]);

  // --- Fetchers ---

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    } catch {
      // silent fail
    }
    setIsLoading(false);
  }, [getAuthHeader]);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch("/api/leaderboard/ai-or-not?limit=100");
      const data = await res.json();
      if (data.success) setLeaderboard(data.data.entries || []);
    } catch (error) {
      console.error("Leaderboard error:", error);
    }
  }, []);

  const fetchScoreRanks = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/score-ranks?gameId=ai-or-not", {
        headers: { Authorization: getAuthHeader() },
      });
      const data = await res.json();
      if (data.success) setScoreRanks(data.data || []);
    } catch (error) {
      console.error("Ranks error:", error);
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

  const fetchLayout = useCallback(async () => {
    try {
      const layout = await getGameLayout();
      if (layout.length > 0) {
        setGameLayout(layout);
      } else {
        setGameLayout(DEFAULT_GAMES);
      }
      setLayoutDirty(false);
    } catch (e) {
      console.error("Layout error:", e);
      setGameLayout(DEFAULT_GAMES);
    }
  }, []);

  // --- Handlers ---

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
        if (rememberMe) {
          localStorage.setItem("admin_credentials", JSON.stringify({ u: username, p: password }));
        } else {
          localStorage.removeItem("admin_credentials");
        }
        setIsAuthenticated(true);
        setImages(data.data.images || []);
        fetchLeaderboard();
        fetchScoreRanks();
      }
    } catch {
      setAuthError("Connection error");
    }
    setIsLoading(false);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUsername("");
    setPassword("");
    setImages([]);
  };

  const handleFilesSelected = (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (fileArray.length === 0) return;
    const newItems: UploadItem[] = fileArray.map((file) => {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      return {
        id: `upload_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        file,
        preview: URL.createObjectURL(file),
        status: "pending",
        isAI: true,
        source: nameWithoutExt,
      };
    });
    setUploadQueue((prev) => [...prev, ...newItems]);
    setAddMode("upload");
  };

  const updateUploadItem = (id: string, updates: Partial<UploadItem>) => {
    setUploadQueue((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
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
      } catch {
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
    if (uploadQueue.every((i) => i.status === "success")) setAddMode(null);
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

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0 || !confirm(`Delete ${selectedIds.size} images?`)) return;
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
      } catch (e) {
        console.error(e);
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
        headers: { Authorization: getAuthHeader(), "Content-Type": "application/json" },
        body: JSON.stringify({ url: newUrl, isAI: newIsAI, source: newSource }),
      });
      const data = await res.json();
      if (data.success) {
        setImages((prev) => [...prev, data.data]);
        setAddMode(null);
        setNewUrl("");
        setNewIsAI(true);
        setNewSource("");
      } else {
        alert(data.error || "Failed");
      }
    } catch {
      alert("Failed");
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
      }
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  };

  const handleUpdateImage = async (id: string, updates: { isAI?: boolean; source?: string }) => {
    try {
      const res = await fetch("/api/admin/ai-or-not", {
        method: "PATCH",
        headers: { Authorization: getAuthHeader(), "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      });
      const data = await res.json();
      if (data.success) {
        setImages((prev) => prev.map((img) => (img.id === id ? { ...img, ...updates } : img)));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddSuggestion = async () => {
    if (!suggestionText.trim()) return;
    setIsLoading(true);
    try {
      await addLifeSuggestion({
        text: suggestionText.trim(),
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
    if (!confirm("Delete?")) return;
    setIsLoading(true);
    try {
      await deleteLifeSuggestion(id);
      await fetchSuggestions();
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveLayout = async () => {
    setLayoutSaving(true);
    try {
      await saveGameLayout(gameLayout);
      setLayoutDirty(false);
    } catch (e) {
      console.error(e);
    }
    setLayoutSaving(false);
  };

  const moveGame = (index: number, direction: "up" | "down") => {
    const newLayout = [...gameLayout];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newLayout.length) return;
    [newLayout[index], newLayout[targetIndex]] = [newLayout[targetIndex], newLayout[index]];
    newLayout.forEach((g, i) => (g.order = i));
    setGameLayout(newLayout);
    setLayoutDirty(true);
  };

  const toggleGameVisibility = (index: number) => {
    const newLayout = [...gameLayout];
    newLayout[index].visible = !newLayout[index].visible;
    setGameLayout(newLayout);
    setLayoutDirty(true);
  };

  // Effects
  useEffect(() => {
    if (isAuthenticated && activeTab === "suggestions" && !didInitSuggestionsRef.current) {
      didInitSuggestionsRef.current = true;
      void fetchSuggestions();
    }
  }, [isAuthenticated, activeTab, fetchSuggestions]);

  // Render Login
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0D0D0D] p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 via-[#0D0D0D] to-black">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md overflow-hidden rounded-3xl bg-gray-900/60 backdrop-blur-xl border border-gray-800 shadow-2xl"
        >
          <div className="p-8 pb-6 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FF6B9D] to-[#FFD23F] shadow-lg shadow-pink-500/20">
              <ImageIcon className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Admin Portal</h1>
            <p className="mt-2 text-sm text-gray-400">Authenticate to access controls</p>
          </div>

          <form onSubmit={handleLogin} className="p-8 pt-0 space-y-5">
            <div className="space-y-4">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                className="w-full rounded-xl bg-gray-950/50 border border-gray-800 px-5 py-3.5 text-white placeholder-gray-500 transition focus:border-[#FF6B9D] focus:ring-1 focus:ring-[#FF6B9D] outline-none"
                required
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full rounded-xl bg-gray-950/50 border border-gray-800 px-5 py-3.5 text-white placeholder-gray-500 transition focus:border-[#FF6B9D] focus:ring-1 focus:ring-[#FF6B9D] outline-none"
                required
              />
            </div>

            <label className="flex items-center gap-3 cursor-pointer group">
              <div className={`flex h-5 w-5 items-center justify-center rounded border transition-colors ${rememberMe ? "bg-[#FF6B9D] border-[#FF6B9D]" : "border-gray-600 bg-transparent"}`}>
                {rememberMe && <CheckSquare className="h-3.5 w-3.5 text-white" />}
              </div>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="hidden"
              />
              <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">Remember me on this device</span>
            </label>

            {authError && (
              <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center text-sm font-medium text-red-400">
                {authError}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-gradient-to-r from-[#FF6B9D] to-[#FFD23F] py-3.5 font-bold text-white shadow-lg shadow-pink-500/20 hover:shadow-pink-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
            >
              {isLoading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : "Sign In"}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // Render Dashboard
  const NavButton = ({ id, label, icon: Icon, color }: { id: typeof activeTab; label: string; icon: ElementType; color: string }) => (
    <button
      onClick={() => {
        setActiveTab(id);
        if (id === "layout") fetchLayout();
        if (window.innerWidth < 1024) setIsSidebarOpen(false);
      }}
      className={`group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
        activeTab === id
          ? `bg-gradient-to-r ${color} text-white shadow-lg`
          : "text-gray-400 hover:bg-gray-800 hover:text-white"
      }`}
    >
      <Icon className={`h-5 w-5 ${activeTab !== id ? "opacity-70 group-hover:opacity-100" : ""}`} />
      <span>{label}</span>
      {activeTab === id && (
        <motion.div layoutId="activeTabIndicator" className="ml-auto h-1.5 w-1.5 rounded-full bg-white" />
      )}
    </button>
  );

  return (
    <div className="flex h-screen bg-[#0D0D0D] text-white overflow-hidden">
      {/* Sidebar Overlay (Mobile) */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ x: isSidebarOpen ? 0 : "-100%" }}
        transition={{ type: "spring", bounce: 0, duration: 0.3 }}
        className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-gray-800 bg-[#111111] p-4 shadow-2xl lg:relative lg:translate-x-0`}
      >
        <div className="flex h-full flex-col">
          <div className="mb-8 flex items-center gap-3 px-2 pt-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF6B9D] to-[#FFD23F]">
              <Trophy className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-white">FunCrafted</h1>
              <p className="text-xs text-gray-500">Admin Control</p>
            </div>
          </div>

          <nav className="flex-1 space-y-2">
            <NavButton id="images" label="Image Gallery" icon={ImageIcon} color="from-[#00D9FF] to-[#0099CC]" />
            <NavButton id="leaderboard" label="Leaderboard" icon={Trophy} color="from-[#FFD23F] to-[#FFAA00]" />
            <NavButton id="ranks" label="Score Ranks" icon={Save} color="from-[#FF6B9D] to-[#FF4444]" />
            <NavButton id="suggestions" label="Suggestions" icon={Lightbulb} color="from-[#0077B5] to-[#00A0DC]" />
            <NavButton id="layout" label="Site Layout" icon={LayoutGrid} color="from-[#9B5DE5] to-[#7F3FBF]" />
          </nav>

          <div className="mt-auto border-t border-gray-800 pt-4">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-[#0D0D0D]">
        {/* Mobile Header */}
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-800 bg-[#0D0D0D]/80 px-4 py-3 backdrop-blur-md lg:hidden">
          <button onClick={() => setIsSidebarOpen(true)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-800">
            <Menu className="h-6 w-6" />
          </button>
          <span className="font-semibold">Admin</span>
          <div className="w-10" /> {/* Spacer */}
        </div>

        <div className="mx-auto max-w-7xl p-4 lg:p-8">
          {/* Header Area */}
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-white">
                {activeTab === "images" && "Image Gallery"}
                {activeTab === "leaderboard" && "Leaderboard"}
                {activeTab === "ranks" && "Score Ranks"}
                {activeTab === "suggestions" && "Life Suggestions"}
                {activeTab === "layout" && "Homepage Layout"}
              </h2>
              <p className="text-gray-400 mt-1">
                {activeTab === "images" && `Manage AI vs Real images (${images.length} total)`}
                {activeTab === "leaderboard" && "Review and manage high scores"}
                {activeTab === "ranks" && "Configure scoring tiers and images"}
                {activeTab === "suggestions" && "Curate hustler wisdom"}
                {activeTab === "layout" && "Customize homepage game order"}
              </p>
            </div>
            
            {/* Context Actions */}
            <div className="flex gap-2">
              {activeTab === "images" && (
                <>
                  <div className="flex items-center rounded-lg bg-gray-800 p-1">
                    <button onClick={() => setGridSize("small")} className={`rounded p-1.5 ${gridSize === "small" ? "bg-gray-700 text-white" : "text-gray-400"}`}><ZoomOut className="h-4 w-4" /></button>
                    <button onClick={() => setGridSize("medium")} className={`rounded p-1.5 ${gridSize === "medium" ? "bg-gray-700 text-white" : "text-gray-400"}`}><LayoutGrid className="h-4 w-4" /></button>
                    <button onClick={() => setGridSize("large")} className={`rounded p-1.5 ${gridSize === "large" ? "bg-gray-700 text-white" : "text-gray-400"}`}><ZoomIn className="h-4 w-4" /></button>
                  </div>
                  <button onClick={() => setIsSelectionMode(!isSelectionMode)} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${isSelectionMode ? "bg-pink-500 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}>
                    <CheckSquare className="h-4 w-4" /> Select
                  </button>
                </>
              )}
              {activeTab === "leaderboard" && (
                 <button onClick={fetchLeaderboard} className="flex items-center gap-2 rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium hover:bg-gray-700">
                   <RefreshCw className="h-4 w-4" /> Refresh
                 </button>
              )}
              {activeTab === "suggestions" && (
                 <button onClick={fetchSuggestions} className="flex items-center gap-2 rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium hover:bg-gray-700">
                   <RefreshCw className="h-4 w-4" /> Refresh
                 </button>
              )}
              {activeTab === "layout" && (
                 <button onClick={handleSaveLayout} disabled={!layoutDirty || layoutSaving} className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed">
                   {layoutSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                   Save Changes
                 </button>
              )}
            </div>
          </div>

          {/* Content Area */}
          <div className="space-y-6">
            {activeTab === "images" && (
              <>
                {/* Upload Zone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`relative rounded-3xl border-2 border-dashed transition-all ${
                    isDragging
                      ? "border-[#00D9FF] bg-[#00D9FF]/10"
                      : "border-gray-800 bg-gray-900/50 hover:border-gray-700"
                  }`}
                >
                  <div className="p-8 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-800">
                      <Upload className={`h-8 w-8 ${isDragging ? "text-[#00D9FF]" : "text-gray-500"}`} />
                    </div>
                    <div className="space-y-2">
                      <p className="text-lg font-medium text-white">Drop images here</p>
                      <p className="text-sm text-gray-500">or click the buttons below</p>
                    </div>
                    
                    <div className="mt-6 flex justify-center gap-4">
                      <button onClick={() => fileInputRef.current?.click()} className="rounded-xl bg-[#00D9FF] px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 hover:bg-[#00b8d9] transition-colors">
                        Choose Files
                      </button>
                      <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={(e) => e.target.files && handleFilesSelected(e.target.files)} className="hidden" />
                      
                      <button onClick={() => setAddMode("link")} className="rounded-xl bg-gray-800 px-6 py-2.5 text-sm font-semibold text-white hover:bg-gray-700 transition-colors">
                        Add from URL
                      </button>
                    </div>
                  </div>

                  {/* Queues & Forms */}
                  <AnimatePresence>
                    {(uploadQueue.length > 0 || addMode === "link") && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-gray-800 bg-gray-900/80">
                         {/* ... Include Queue/Link Form Logic here - same as before but styled ... */}
                         <div className="p-6 space-y-4">
                           {addMode === "link" && (
                             <div className="flex flex-col gap-4 rounded-xl bg-gray-800 p-4">
                                <input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="Image URL..." className="w-full rounded-lg bg-gray-900 px-4 py-2 text-white border border-gray-700" />
                                <div className="flex gap-4">
                                  <button onClick={() => setNewIsAI(!newIsAI)} className={`px-4 py-2 rounded-lg text-sm font-bold ${newIsAI ? "bg-blue-500/20 text-blue-400" : "bg-green-500/20 text-green-400"}`}>{newIsAI ? "AI Generated" : "Real Photo"}</button>
                                  <input value={newSource} onChange={e => setNewSource(e.target.value)} placeholder="Source..." className="flex-1 rounded-lg bg-gray-900 px-4 py-2 text-white border border-gray-700" />
                                  <button onClick={handleAddLink} disabled={isLoading} className="bg-green-600 px-6 py-2 rounded-lg text-white font-semibold">Add</button>
                                  <button onClick={() => setAddMode(null)} className="bg-gray-700 px-4 py-2 rounded-lg text-white">Cancel</button>
                                </div>
                             </div>
                           )}
                           
                           {uploadQueue.length > 0 && (
                             <div className="space-y-3">
                               {uploadQueue.map(item => <UploadQueueItem key={item.id} item={item} onUpdate={updateUploadItem} onRemove={removeFromQueue} />)}
                               {uploadQueue.some(i => i.status === "pending") && (
                                 <div className="flex justify-end gap-3 pt-2">
                                   <button onClick={clearCompleted} className="text-sm text-gray-500 hover:text-white">Clear Done</button>
                                   <button onClick={handleUploadAll} disabled={isUploading} className="bg-green-600 px-6 py-2 rounded-lg text-white font-semibold disabled:opacity-50">
                                     {isUploading ? "Uploading..." : "Upload All"}
                                   </button>
                                 </div>
                               )}
                             </div>
                           )}
                         </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Batch Actions */}
                {isSelectionMode && selectedIds.size > 0 && (
                  <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="fixed bottom-6 right-6 z-30 flex items-center gap-4 rounded-2xl bg-gray-900 p-4 shadow-2xl border border-gray-800">
                    <span className="text-sm font-medium text-white">{selectedIds.size} selected</span>
                    <button onClick={handleBatchDelete} className="flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-bold text-white hover:bg-red-600">
                      <Trash2 className="h-4 w-4" /> Delete
                    </button>
                    <button onClick={() => setSelectedIds(new Set())} className="text-sm text-gray-400 hover:text-white">Cancel</button>
                  </motion.div>
                )}

                {/* Grid */}
                <div className={`grid gap-4 ${
                  gridSize === "small" ? "grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8" :
                  gridSize === "medium" ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5" :
                  "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                }`}>
                  {images.map((img) => (
                    <div
                      key={img.id}
                      onClick={() => {
                        if (isSelectionMode) {
                          const newSet = new Set(selectedIds);
                          if (newSet.has(img.id)) newSet.delete(img.id); else newSet.add(img.id);
                          setSelectedIds(newSet);
                        } else {
                          setZoomedImage(img);
                        }
                      }}
                      className={`group relative aspect-square cursor-pointer overflow-hidden rounded-xl bg-gray-800 transition-all hover:scale-[1.02] ${selectedIds.has(img.id) ? "ring-4 ring-[#FF6B9D]" : "hover:ring-2 hover:ring-gray-600"}`}
                    >
                      <Image src={img.url} alt="" fill className="object-cover" unoptimized />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                      
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <span className={`px-2 py-1 rounded text-xs font-bold text-white ${img.isAI ? "bg-blue-500" : "bg-green-500"}`}>{img.isAI ? "AI" : "Real"}</span>
                      </div>
                      
                      {isSelectionMode && (
                        <div className={`absolute top-2 left-2 h-6 w-6 rounded-full border-2 flex items-center justify-center ${selectedIds.has(img.id) ? "bg-[#FF6B9D] border-[#FF6B9D]" : "border-white/50 bg-black/30"}`}>
                          {selectedIds.has(img.id) && <CheckCircle className="h-4 w-4 text-white" />}
                        </div>
                      )}

                      {!isSelectionMode && (
                        <div className="absolute inset-x-3 bottom-3 flex flex-col gap-2 rounded-2xl bg-black/70 p-3 text-xs opacity-0 backdrop-blur group-hover:opacity-100">
                          <div className="flex items-center justify-between text-white">
                            <span className="text-[10px] uppercase tracking-[0.2em] text-gray-300">Type</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateImage(img.id, { isAI: !img.isAI });
                              }}
                              className={`flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-semibold ${
                                img.isAI ? "bg-blue-500/30 text-blue-100" : "bg-green-500/30 text-green-100"
                              }`}
                            >
                              {img.isAI ? "Switch to Real" : "Switch to AI"}
                            </button>
                          </div>

                          <div>
                            <label className="text-[10px] uppercase tracking-[0.2em] text-gray-400">Source</label>
                            <input
                              defaultValue={img.source || ""}
                              placeholder="Add source..."
                              onClick={(e) => e.stopPropagation()}
                              onBlur={(e) => handleUpdateImage(img.id, { source: e.target.value })}
                              className="mt-1 w-full rounded-lg bg-white/10 px-3 py-1 text-xs text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#00D9FF]"
                            />
                          </div>

                          <div className="flex gap-2 text-xs">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setZoomedImage(img);
                              }}
                              className="flex-1 rounded-lg bg-white/10 py-1 text-white hover:bg-white/20"
                            >
                              View
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteImage(img.id);
                              }}
                              className="flex flex-1 items-center justify-center rounded-lg bg-red-500/60 py-1 text-white hover:bg-red-500"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {activeTab === "leaderboard" && (
              <div className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/50">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-900 text-gray-400">
                    <tr>
                      <th className="px-6 py-4 font-medium">Rank</th>
                      <th className="px-6 py-4 font-medium">Player</th>
                      <th className="px-6 py-4 font-medium">Score</th>
                      <th className="px-6 py-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {leaderboard.map((entry, i) => (
                      <tr key={entry.id} className="group hover:bg-gray-800/50">
                        <td className="px-6 py-4">
                          <span className={`flex h-8 w-8 items-center justify-center rounded-lg font-bold ${
                            i === 0 ? "bg-yellow-500/20 text-yellow-500" :
                            i === 1 ? "bg-gray-400/20 text-gray-400" :
                            i === 2 ? "bg-orange-500/20 text-orange-500" :
                            "bg-gray-800 text-gray-500"
                          }`}>
                            {i + 1}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-medium text-white">{entry.nickname}</td>
                        <td className="px-6 py-4 font-mono text-[#00FF94]">{entry.score.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => { if(confirm("Delete?")) {
                             fetch(`/api/leaderboard/ai-or-not?entryId=${entry.id}`, { method: "DELETE", headers: { Authorization: getAuthHeader() }}).then(() => {
                               setLeaderboard(l => l.filter(e => e.id !== entry.id));
                             });
                          }}} className="text-gray-500 hover:text-red-400">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "suggestions" && (
               <div className="grid gap-6 lg:grid-cols-[350px,1fr]">
                 <div className="space-y-4">
                   <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
                     <h3 className="mb-4 text-lg font-bold text-white">Add Wisdom</h3>
                     <div className="space-y-4">
                       <textarea
                         value={suggestionText}
                         onChange={e => setSuggestionText(e.target.value)}
                         placeholder="Type something enlightening..."
                         className="w-full rounded-xl bg-gray-950 p-4 text-sm text-white placeholder-gray-500 border border-gray-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none h-32"
                       />
                       <input
                         value={suggestionAuthor}
                         onChange={e => setSuggestionAuthor(e.target.value)}
                         placeholder="Author Name"
                         className="w-full rounded-xl bg-gray-950 px-4 py-3 text-sm text-white border border-gray-800 outline-none focus:border-blue-500"
                       />
                       <input
                         value={suggestionTitle}
                         onChange={e => setSuggestionTitle(e.target.value)}
                         placeholder="Author Title"
                         className="w-full rounded-xl bg-gray-950 px-4 py-3 text-sm text-white border border-gray-800 outline-none focus:border-blue-500"
                       />
                       <button
                         onClick={handleAddSuggestion}
                         disabled={isLoading || !suggestionText.trim()}
                         className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 py-3 font-bold text-white hover:opacity-90 disabled:opacity-50"
                       >
                         {isLoading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : "Post Suggestion"}
                       </button>
                       {suggestionError && (
                         <p className="text-sm text-red-400">{suggestionError}</p>
                       )}
                     </div>
                   </div>
                 </div>

                 <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 content-start">
                    {suggestions.map(s => (
                      <div key={s.id} className="relative group rounded-2xl border border-gray-800 bg-gray-900 p-5 hover:border-gray-700 transition-colors">
                        <div className="mb-3 flex items-start justify-between">
                          <div className="flex items-center gap-2">
                             <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500" />
                             <div>
                               <div className="text-xs font-bold text-white">{s.authorName || "Anonymous"}</div>
                               <div className="text-[10px] text-gray-500">{s.authorTitle || "Hustler"}</div>
                             </div>
                          </div>
                          <button onClick={() => s.id && handleDeleteSuggestion(s.id)} className="text-gray-600 hover:text-red-400">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <p className="text-sm text-gray-300 leading-relaxed">{s.text}</p>
                        <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1"><span className="text-blue-400">👍</span> {s.likes || 0}</span>
                        </div>
                      </div>
                    ))}
                 </div>
               </div>
            )}
            
            {activeTab === "ranks" && (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                 {scoreRanks.map((rank, idx) => (
                   <div key={idx} className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900">
                      <div className="relative h-32 bg-gray-800">
                        {rank.imageUrl ? (
                          <Image src={rank.imageUrl} alt="" fill className="object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-gray-600">No Image</div>
                        )}
                        <div className="absolute top-2 right-2 flex gap-1">
                          <label className="cursor-pointer rounded-lg bg-black/50 p-1.5 text-white hover:bg-black/70">
                            <Upload className="h-4 w-4" />
                            <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                               const file = e.target.files?.[0];
                               if(!file) return;
                               const fd = new FormData(); fd.append("file", file);
                               try {
                                 const res = await fetch("/api/admin/rank-images", { method:"POST", headers: {Authorization:getAuthHeader()}, body: fd});
                                 const d = await res.json();
                                 if(d.success) {
                                   const newRanks = [...scoreRanks];
                                   newRanks[idx].imageUrl = d.data.url;
                                   setScoreRanks(newRanks);
                                   // trigger save
                                   await fetch("/api/admin/score-ranks", { method:"POST", headers: {Authorization:getAuthHeader(), "Content-Type":"application/json"}, body: JSON.stringify(newRanks[idx]) });
                                 }
                               } catch(err) { console.error(err); }
                            }} />
                          </label>
                        </div>
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="flex justify-between items-center">
                           <span className="text-xs font-bold uppercase text-gray-500 tracking-wider">Rank Title</span>
                           <span className="text-xs font-mono text-purple-400">{rank.minScore}-{rank.maxScore}</span>
                        </div>
                        <div className="font-bold text-white text-lg">{rank.title}</div>
                      </div>
                   </div>
                 ))}
              </div>
            )}

            {activeTab === "layout" && (
              <div className="max-w-2xl mx-auto space-y-3">
                {gameLayout.map((game, index) => {
                   const gameNames: Record<string, string> = {
                    "life-suggestions": "Life Suggestions",
                    "order-everything": "Order Everything",
                    "procrastination-simulator": "Procrastination Simulator",
                    "escape-yourself": "Escape Yourself",
                    "ai-or-not": "AI or Not?",
                    "logline-slots": "Logline Creator",
                    "who-am-i": "Who Am I?",
                  };
                  return (
                    <motion.div layout key={game.id} className={`flex items-center gap-4 p-4 rounded-xl border ${game.visible ? "bg-gray-900 border-gray-800" : "bg-gray-900/50 border-gray-800/50 opacity-60"}`}>
                       <div className="flex flex-col gap-1">
                          <button onClick={() => moveGame(index, "up")} className="p-1 hover:text-white text-gray-500"><ChevronUp className="h-4 w-4" /></button>
                          <button onClick={() => moveGame(index, "down")} className="p-1 hover:text-white text-gray-500"><ChevronDown className="h-4 w-4" /></button>
                       </div>
                       <div className="flex-1">
                          <div className="font-bold text-white">{gameNames[game.id]}</div>
                          <div className="text-xs text-gray-500">{game.id}</div>
                       </div>
                       <button onClick={() => toggleGameVisibility(index)} className={`p-2 rounded-lg ${game.visible ? "bg-green-500/10 text-green-500" : "bg-gray-800 text-gray-500"}`}>
                         {game.visible ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                       </button>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Image Zoom Overlay */}
      <AnimatePresence>
        {zoomedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4"
            onClick={() => setZoomedImage(null)}
          >
            <div className="relative max-h-[90vh] w-full max-w-5xl" onClick={e => e.stopPropagation()}>
               <button onClick={() => setZoomedImage(null)} className="absolute -top-12 right-0 text-white hover:text-gray-300"><X className="h-8 w-8" /></button>
               <div className="relative aspect-[16/9] w-full h-full">
                 <Image src={zoomedImage.url} alt="" fill className="object-contain" unoptimized />
               </div>
               <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur px-6 py-3 rounded-full flex gap-6 text-white">
                 <div className="flex flex-col items-center">
                    <span className="text-xs text-gray-400">Type</span>
                    <span className="font-bold">{zoomedImage.isAI ? "AI Generated" : "Real Photo"}</span>
                 </div>
                 <div className="w-px bg-white/20" />
                 <div className="flex flex-col items-center">
                    <span className="text-xs text-gray-400">Source</span>
                    <span className="font-bold">{zoomedImage.source || "Unknown"}</span>
                 </div>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
