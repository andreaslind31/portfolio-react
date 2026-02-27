"use client";

import { useState } from "react";
import TetrisGame from "@/components/TetrisGame";
import Leaderboard from "@/components/Leaderboard";

export default function ArcadePage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [highlightName, setHighlightName] = useState<string | undefined>();

  const handleScoreSubmit = async (
    name: string,
    score: number
  ): Promise<string | null> => {
    try {
      const res = await fetch("/api/leaderboard", {
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
    <main className="relative z-10 max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <a
          href="/"
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          &larr; Back to portfolio
        </a>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
          Arcade
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          A retro Tetris easter egg. Clear lines, set a high score.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <TetrisGame onScoreSubmit={handleScoreSubmit} />
        <div className="w-full lg:w-80 lg:flex-shrink-0">
          <Leaderboard
            refreshTrigger={refreshKey}
            highlightName={highlightName}
          />
        </div>
      </div>
    </main>
  );
}
