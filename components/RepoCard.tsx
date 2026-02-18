import { GitHubRepo } from "@/lib/github";

const languageColors: Record<string, string> = {
  Go: "#00ADD8",
  "C#": "#239120",
  JavaScript: "#F7DF1E",
  TypeScript: "#3178C6",
  Vue: "#4FC08D",
  Svelte: "#FF3E00",
  HTML: "#E34F26",
  CSS: "#563D7C",
  Python: "#3572A5",
  Rust: "#DEA584",
  NSIS: "#A8B9CC",
};

export default function RepoCard({ repo }: { repo: GitHubRepo }) {
  return (
    <a
      href={repo.html_url}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-6 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
    >
      <h3 className="text-lg font-semibold text-blue-600 truncate">
        {repo.name}
      </h3>

      {repo.description && (
        <p className="text-sm text-gray-600 mt-2 line-clamp-2">
          {repo.description}
        </p>
      )}

      <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
        {repo.language && (
          <span className="flex items-center gap-1">
            <span
              className="w-3 h-3 rounded-full inline-block"
              style={{
                backgroundColor: languageColors[repo.language] || "#6B7280",
              }}
            />
            {repo.language}
          </span>
        )}

        {repo.stargazers_count > 0 && (
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            {repo.stargazers_count}
          </span>
        )}

        {repo.homepage && (
          <span className="text-blue-500">Live Demo</span>
        )}
      </div>

      {repo.topics.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {repo.topics.map((topic) => (
            <span
              key={topic}
              className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded-full"
            >
              {topic}
            </span>
          ))}
        </div>
      )}
    </a>
  );
}
