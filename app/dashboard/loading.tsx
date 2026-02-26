export default function DashboardLoading() {
  return (
    <main className="relative z-10 max-w-5xl mx-auto px-4 py-12">
      <div className="mb-8">
        <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-3" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6"
          >
            <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-3" />
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-8">
        <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-6" />
        <div className="flex items-end gap-1 h-48">
          {Array.from({ length: 30 }, (_, i) => (
            <div
              key={i}
              className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-t animate-pulse"
              style={{ height: `${20 + Math.random() * 80}%` }}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6"
          >
            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
            {[1, 2, 3, 4, 5].map((j) => (
              <div
                key={j}
                className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-3"
              />
            ))}
          </div>
        ))}
      </div>
    </main>
  );
}
