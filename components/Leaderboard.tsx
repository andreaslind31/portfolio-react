"use client";

import { useEffect, useState } from "react";

interface ScoreEntry {
  name: string;
  score: number;
  date: string;
}

export default function Leaderboard({
  game,
  scoreLabel = "Score",
  refreshTrigger,
  highlightName,
}: {
  game: "tetris" | "wordle";
  scoreLabel?: string;
  refreshTrigger?: number;
  highlightName?: string;
}) {
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/leaderboard?game=${game}`)
      .then((res) => {
        if (!res.ok) return res.json().then((d) => Promise.reject(d.error));
        return res.json();
      })
      .then((data: ScoreEntry[]) => setScores(data))
      .catch((err) =>
        setError(typeof err === "string" ? err : "Failed to load leaderboard.")
      )
      .finally(() => setLoading(false));
  }, [game, refreshTrigger]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 w-full">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
        Leaderboard
      </h2>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-6 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
      )}

      {!loading && !error && scores.length === 0 && (
        <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">
          No scores yet. Be the first!
        </p>
      )}

      {!loading && !error && scores.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <th className="pb-2 pr-2">#</th>
                <th className="pb-2 pr-2">Name</th>
                <th className="pb-2 pr-2 text-right">{scoreLabel}</th>
                <th className="pb-2 text-right hidden sm:table-cell">Date</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((entry, i) => {
                const isHighlighted =
                  highlightName &&
                  entry.name === highlightName &&
                  i === scores.findIndex((s) => s.name === highlightName);

                return (
                  <tr
                    key={`${entry.name}-${entry.score}-${i}`}
                    className={
                      isHighlighted
                        ? "bg-blue-50 dark:bg-blue-900/20"
                        : i % 2 === 0
                        ? "bg-gray-50/50 dark:bg-gray-700/20"
                        : ""
                    }
                  >
                    <td className="py-1.5 pr-2 tabular-nums text-gray-400 dark:text-gray-500 font-medium">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                    </td>
                    <td
                      className={`py-1.5 pr-2 truncate max-w-[120px] ${
                        isHighlighted
                          ? "text-blue-600 dark:text-blue-400 font-semibold"
                          : "text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {entry.name}
                    </td>
                    <td className="py-1.5 pr-2 text-right tabular-nums font-medium text-gray-900 dark:text-white">
                      {entry.score.toLocaleString()}
                    </td>
                    <td className="py-1.5 text-right text-gray-400 dark:text-gray-500 hidden sm:table-cell">
                      {entry.date}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
