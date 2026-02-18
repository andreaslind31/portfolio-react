"use client";

import { useState, useMemo } from "react";
import { GitHubRepo } from "@/lib/github";
import RepoCard from "./RepoCard";

export default function RepoGrid({ repos }: { repos: GitHubRepo[] }) {
  const [selectedLanguage, setSelectedLanguage] = useState<string>("All");

  const languages = useMemo(() => {
    const langs = new Set(
      repos.map((r) => r.language).filter(Boolean) as string[]
    );
    return ["All", ...Array.from(langs).sort()];
  }, [repos]);

  const filteredRepos = useMemo(() => {
    if (selectedLanguage === "All") return repos;
    return repos.filter((r) => r.language === selectedLanguage);
  }, [repos, selectedLanguage]);

  return (
    <section>
      <h2 className="text-2xl font-bold mb-6">Repositories</h2>

      <div className="flex flex-wrap gap-2 mb-8">
        {languages.map((lang) => (
          <button
            key={lang}
            onClick={() => setSelectedLanguage(lang)}
            className={`px-3 py-1 text-sm rounded-full transition-colors cursor-pointer ${
              selectedLanguage === lang
                ? "bg-blue-600 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
            }`}
          >
            {lang}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRepos.map((repo) => (
          <RepoCard key={repo.name} repo={repo} />
        ))}
      </div>

      {filteredRepos.length === 0 && (
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">
          No repositories found for this language.
        </p>
      )}
    </section>
  );
}
