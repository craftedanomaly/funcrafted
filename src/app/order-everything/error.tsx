"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Order Everything Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-pink-50 p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">😵</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Oops! Something broke.</h2>
        <p className="text-gray-500 mb-6">
          The environment was destroyed a bit too hard. Our servers are coughing.
        </p>
        <p className="text-xs text-red-400 mb-6 font-mono bg-red-50 p-2 rounded">
          {error.message || "Unknown error"}
          {error.digest && <span className="block mt-1">Digest: {error.digest}</span>}
        </p>
        
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white font-bold rounded-2xl hover:bg-purple-700 transition-colors"
          >
            <RefreshCw className="w-5 h-5" /> Try Again
          </button>
          <Link
            href="/"
            className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" /> Back Home
          </Link>
        </div>
      </div>
    </div>
  );
}
