"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LifeSuggestionsAdminRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900">
      <p className="text-gray-400">Redirecting to admin panel...</p>
    </div>
  );
}
