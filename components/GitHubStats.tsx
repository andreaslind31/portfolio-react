import { GitHubUser, GitHubRepo } from "@/lib/github";

export default function GitHubStats({
  user,
  repos,
}: {
  user: GitHubUser;
  repos: GitHubRepo[];
}) {
  const totalStars = repos.reduce((sum, r) => sum + r.stargazers_count, 0);

  const langCounts: Record<string, number> = {};
  for (const repo of repos) {
    if (repo.language) {
      langCounts[repo.language] = (langCounts[repo.language] || 0) + 1;
    }
  }
  const topLanguage =
    Object.entries(langCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? "—";

  const stats = [
    {
      label: "Total Stars",
      value: totalStars,
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ),
    },
    {
      label: "Repositories",
      value: repos.length,
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M4 2a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-6-6H4zm8 1.5L19.5 10H12V3.5zM6 14h12v2H6v-2zm0 4h8v2H6v-2z" />
        </svg>
      ),
    },
    {
      label: "Top Language",
      value: topLanguage,
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0L19.2 12l-4.6-4.6L16 6l6 6-6 6-1.4-1.4z" />
        </svg>
      ),
    },
    {
      label: "Followers",
      value: user.followers,
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center"
        >
          <div className="flex justify-center text-blue-500 dark:text-blue-400 mb-2">
            {stat.icon}
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {stat.value}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
}
