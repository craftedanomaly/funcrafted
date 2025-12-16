"use client";

import { useState, useCallback, useRef } from "react";
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
} from "lucide-react";
import Image from "next/image";

interface ImageItem {
  id: string;
  filename: string;
  url: string;
  isAI: boolean;
  source?: string;
  createdAt: string;
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

export default function AdminAiOrNotPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [images, setImages] = useState<ImageItem[]>([]);
  const [addMode, setAddMode] = useState<"upload" | "link" | null>(null);

  // Drag-drop state
  const [isDragging, setIsDragging] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Link form state
  const [newUrl, setNewUrl] = useState("");
  const [newIsAI, setNewIsAI] = useState(true);
  const [newSource, setNewSource] = useState("");

  const getAuthHeader = useCallback(() => {
    return "Basic " + btoa(`${username}:${password}`);
  }, [username, password]);

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
  };

  // Handle files from drag-drop or file input
  const handleFilesSelected = (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (fileArray.length === 0) return;

    const newItems: UploadItem[] = fileArray.map((file) => ({
      id: `upload_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      file,
      preview: URL.createObjectURL(file),
      status: "pending" as const,
      isAI: true,
      source: "",
    }));

    setUploadQueue((prev) => [...prev, ...newItems]);
    setAddMode("upload");
  };

  // Drag-drop handlers
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

  // Update upload item
  const updateUploadItem = (id: string, updates: Partial<UploadItem>) => {
    setUploadQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  // Remove from queue
  const removeFromQueue = (id: string) => {
    setUploadQueue((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return prev.filter((i) => i.id !== id);
    });
  };

  // Upload all pending files
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

  // Clear completed uploads
  const clearCompleted = () => {
    setUploadQueue((prev) => {
      prev.filter((i) => i.status === "success").forEach((i) => URL.revokeObjectURL(i.preview));
      return prev.filter((i) => i.status !== "success");
    });
    if (uploadQueue.every((i) => i.status === "success")) {
      setAddMode(null);
    }
  };

  // Add link
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

  // Login screen
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
              AI or Not Admin
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Manage game images
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

  // Admin dashboard
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-4">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">AI or Not Admin</h1>
            <p className="text-sm text-gray-400">
              {images.length} images in database
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-xl bg-gray-700 px-4 py-2 text-sm text-white hover:bg-gray-600"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>

        {/* Add Image Section */}
        <div className="mb-8 rounded-2xl bg-gray-800 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Add Images</h2>

          {/* Drag-Drop Zone - Always visible */}
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

          {/* Add Link Button */}
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

                {/* Queue Items */}
                <div className="max-h-96 space-y-2 overflow-y-auto">
                  {uploadQueue.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 rounded-xl bg-gray-700 p-3"
                    >
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
                              onClick={() => updateUploadItem(item.id, { isAI: !item.isAI })}
                              className={`flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold text-white ${
                                item.isAI ? "bg-[#2EA7F2]" : "bg-[#76D95B]"
                              }`}
                            >
                              {item.isAI ? <Bot className="h-3 w-3" /> : <User className="h-3 w-3" />}
                              {item.isAI ? "AI" : "Real"}
                            </button>
                            {/* Source Input */}
                            <input
                              type="text"
                              value={item.source}
                              onChange={(e) => updateUploadItem(item.id, { source: e.target.value })}
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
                          onClick={() => removeFromQueue(item.id)}
                          className="flex-shrink-0 rounded-lg p-1 text-gray-400 hover:bg-gray-600 hover:text-white"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Upload Button */}
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
                  <label className="mb-2 block text-sm font-medium text-gray-300">
                    Image URL
                  </label>
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
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Plus className="h-5 w-5" />
                    )}
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
          <h2 className="mb-4 text-lg font-semibold text-white">
            Images ({images.length})
          </h2>

          {images.length === 0 ? (
            <p className="text-center text-gray-400 py-8">
              No images yet. Add some above!
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {images.map((img) => (
                <div
                  key={img.id}
                  className="overflow-hidden rounded-xl bg-gray-700"
                >
                  <div className="relative aspect-square">
                    <Image
                      src={img.url}
                      alt={img.id}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    <div
                      className={`absolute left-2 top-2 rounded-full px-3 py-1 text-xs font-bold text-white ${
                        img.isAI ? "bg-[#2EA7F2]" : "bg-[#76D95B]"
                      }`}
                    >
                      {img.isAI ? "AI" : "Real"}
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    {/* Toggle */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Type:</span>
                      <button
                        onClick={() =>
                          handleUpdateImage(img.id, { isAI: !img.isAI })
                        }
                        className={`flex items-center gap-2 rounded-lg px-3 py-1 text-sm font-semibold text-white ${
                          img.isAI ? "bg-[#2EA7F2]" : "bg-[#76D95B]"
                        }`}
                      >
                        {img.isAI ? (
                          <>
                            <Bot className="h-4 w-4" /> AI
                          </>
                        ) : (
                          <>
                            <User className="h-4 w-4" /> Real
                          </>
                        )}
                      </button>
                    </div>

                    {/* Source */}
                    <div>
                      <label className="mb-1 block text-xs text-gray-400">
                        Source:
                      </label>
                      <input
                        type="text"
                        value={img.source || ""}
                        onChange={(e) =>
                          handleUpdateImage(img.id, { source: e.target.value })
                        }
                        placeholder="Add source..."
                        className="w-full rounded-lg bg-gray-600 px-3 py-2 text-sm text-white placeholder-gray-500"
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <a
                        href={img.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-gray-600 py-2 text-sm text-white hover:bg-gray-500"
                      >
                        <ExternalLink className="h-4 w-4" />
                        View
                      </a>
                      <button
                        onClick={() => handleDeleteImage(img.id)}
                        className="flex items-center justify-center gap-1 rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
