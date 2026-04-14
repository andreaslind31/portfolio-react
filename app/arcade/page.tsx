import Link from "next/link";

export default function ArcadeHubPage() {
  return (
    <main className="relative z-10 max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
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
          Pick a game, set a high score, climb the leaderboard.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/arcade/tetris" className="arcade-hub-card group">
          <div className="text-3xl mb-3">🧱</div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            Tetris
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Clear lines, stack blocks, chase the high score.
          </p>
        </Link>

        <Link href="/arcade/wordle" className="arcade-hub-card group">
          <div className="text-3xl mb-3">🔤</div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            Wordle
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Guess the 5-letter word. Build your win streak.
          </p>
        </Link>

        <Link href="/arcade/shooter" className="arcade-hub-card group">
          <div className="text-3xl mb-3">🔫</div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            Sector Breach
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Doom-style FPS. Breach the sector, survive the horde.
          </p>
        </Link>
      </div>
    </main>
  );
}
