import { GitHubRepo } from "@/lib/github";
import { languageColors } from "@/lib/languageColors";
import SkillsBar from "@/components/SkillsBar";

export default function SkillsOverview({ repos }: { repos: GitHubRepo[] }) {
  const langCounts: Record<string, number> = {};
  for (const repo of repos) {
    if (repo.language) {
      langCounts[repo.language] = (langCounts[repo.language] || 0) + 1;
    }
  }

  const sorted = Object.entries(langCounts).sort(([, a], [, b]) => b - a);
  const maxCount = sorted[0]?.[1] ?? 1;
  const totalWithLang = repos.filter((r) => r.language).length;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
        Skills & Technologies
      </h2>
      <div className="space-y-2">
        {sorted.map(([lang, count]) => (
          <div key={lang} className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: languageColors[lang] || "#6B7280" }}
            />
            <span className="w-20 text-xs text-gray-700 dark:text-gray-300 shrink-0 truncate">
              {lang}
            </span>
            <div className="flex-1">
              <SkillsBar
                percentage={(count / maxCount) * 100}
                color={languageColors[lang] || "#6B7280"}
              />
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0 w-14 text-right">
              {count} {count === 1 ? "repo" : "repos"}
            </span>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
        Based on primary language of {totalWithLang} repositories
      </p>
    </div>
  );
}
