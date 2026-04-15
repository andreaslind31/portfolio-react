"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import Leaderboard from "@/components/Leaderboard";

// Dynamic import to avoid SSR issues with Three.js / WebGL
const ShooterGame3D = dynamic(
  () => import("@/components/shooter3d/ShooterGame3D"),
  { ssr: false }
);

export default function ShooterPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [highlightName, setHighlightName] = useState<string | undefined>();

  const handleScoreSubmit = async (
    name: string,
    score: number
  ): Promise<string | null> => {
    try {
      const res = await fetch("/api/leaderboard?game=shooter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, score }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        return data?.error || `Submission failed (${res.status})`;
      }
      setHighlightName(name);
      setRefreshKey((k) => k + 1);
      return null;
    } catch {
      return "Network error. Could not reach the server.";
    }
  };

  return (
    <main className="relative z-10 w-full max-w-[1500px] mx-auto px-4 py-8">
      <div className="mb-6">
        <a
          href="/arcade"
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          &larr; Back to Arcade
        </a>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
          Sector Breach
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Doom-style FPS. Survive the waves, set a high
          score.
        </p>
      </div>

      <div className="flex flex-col gap-6 items-stretch">
        <ShooterGame3D onScoreSubmit={handleScoreSubmit} />
        <div className="w-full max-w-md mx-auto">
          <Leaderboard
            game="shooter"
            refreshTrigger={refreshKey}
            highlightName={highlightName}
          />
        </div>
      </div>
    </main>
  );
}
