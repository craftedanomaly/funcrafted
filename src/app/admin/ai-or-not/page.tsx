"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Upload,
  Link as LinkIcon,
  Trash2,
  Bot,
  User,
  Save,
  LogOut,
  Plus,
  Image as ImageIcon,
  Loader2,
  ExternalLink,
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

interface Manifest {
  images: ImageItem[];
  updatedAt: string;
}

export default function AdminAiOrNotPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [images, setImages] = useState<ImageItem[]>([]);
  const [addMode, setAddMode] = useState<"upload" | "link" | null>(null);

  // Add form state
  const [newUrl, setNewUrl] = useState("");
  const [newIsAI, setNewIsAI] = useState(true);
  const [newSource, setNewSource] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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

  const handleAddImage = async () => {
    if (addMode === "link" && !newUrl.trim()) return;
    if (addMode === "upload" && !selectedFile) return;

    setIsLoading(true);

    try {
      let res: Response;

      if (addMode === "upload" && selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("isAI", String(newIsAI));
        formData.append("source", newSource);

        res = await fetch("/api/admin/ai-or-not", {
          method: "POST",
          headers: { Authorization: getAuthHeader() },
          body: formData,
        });
      } else {
        res = await fetch("/api/admin/ai-or-not", {
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
      }

      const data = await res.json();
      if (data.success) {
        setImages((prev) => [...prev, data.data]);
        setAddMode(null);
        setNewUrl("");
        setNewIsAI(true);
        setNewSource("");
        setSelectedFile(null);
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
          <h2 className="mb-4 text-lg font-semibold text-white">Add Image</h2>

          {!addMode ? (
            <div className="flex gap-4">
              <button
                onClick={() => setAddMode("upload")}
                className="flex items-center gap-2 rounded-xl bg-[#76D95B] px-6 py-3 font-semibold text-white hover:bg-[#68c350]"
              >
                <Upload className="h-5 w-5" />
                Upload File
              </button>
              <button
                onClick={() => setAddMode("link")}
                className="flex items-center gap-2 rounded-xl bg-[#2EA7F2] px-6 py-3 font-semibold text-white hover:bg-[#2596db]"
              >
                <LinkIcon className="h-5 w-5" />
                Add Link
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {addMode === "upload" ? (
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">
                    Select Image File
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="w-full rounded-xl bg-gray-700 px-4 py-3 text-white file:mr-4 file:rounded-lg file:border-0 file:bg-[#76D95B] file:px-4 file:py-2 file:text-white"
                  />
                </div>
              ) : (
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
              )}

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
                  onClick={handleAddImage}
                  disabled={isLoading}
                  className="flex items-center gap-2 rounded-xl bg-[#76D95B] px-6 py-3 font-semibold text-white disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Plus className="h-5 w-5" />
                  )}
                  Add Image
                </button>
                <button
                  onClick={() => {
                    setAddMode(null);
                    setNewUrl("");
                    setNewSource("");
                    setSelectedFile(null);
                  }}
                  className="rounded-xl bg-gray-600 px-6 py-3 font-semibold text-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
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
