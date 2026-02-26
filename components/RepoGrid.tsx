// React: "use client" tells Next.js this component runs in the browser (not server-only).
// Without it, components are Server Components by default and can't use state or effects.
// Vue equivalent: All Vue components run client-side by default. In Nuxt, you'd need to
// explicitly opt into server components, which is the opposite of React's model.
"use client";

import { useState, useMemo } from "react";
import { GitHubRepo } from "@/lib/github";
import RepoCard from "./RepoCard";
import ScrollReveal from "./ScrollReveal";
import GlowCard from "./GlowCard";

export default function RepoGrid({ repos }: { repos: GitHubRepo[] }) {
  // React: useState returns [value, setter]. You MUST use the setter to update state.
  // Calling setSelectedLanguage triggers a full component re-render.
  // Vue equivalent: const selectedLanguage = ref("All") — then just assign selectedLanguage.value = "Go".
  // Key difference: Vue tracks reactivity at the property level (fine-grained), React re-renders the whole component.
  const [selectedLanguage, setSelectedLanguage] = useState<string>("All");

  // React: useMemo caches a computed value, only recalculating when dependencies [repos] change.
  // Vue equivalent: const languages = computed(() => { ... })
  // Both serve the same purpose — derived/cached values. Vue's computed() auto-tracks dependencies,
  // while React's useMemo requires you to list them explicitly in the dependency array.
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
            // React: Event handlers are camelCase props (onClick, onChange, onSubmit).
            // Vue equivalent: @click="selectedLanguage = lang" or @click="setLanguage(lang)"
            // React has no v-model — data flows one way. You always need an explicit handler.
            onClick={() => setSelectedLanguage(lang)}
            // React: Dynamic classes use template literals or string concatenation.
            // Vue equivalent: :class="{ 'bg-blue-600 text-white': selectedLanguage === lang }"
            // Vue's :class object/array syntax is more ergonomic for conditional classes.
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
        {filteredRepos.map((repo, index) => (
          <ScrollReveal
            key={repo.name}
            animation="fade-up"
            delay={Math.min(index * 75, 600)}
          >
            <GlowCard>
              <RepoCard repo={repo} />
            </GlowCard>
          </ScrollReveal>
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
