// This file is pure TypeScript — no React or Vue imports. It works identically in both frameworks.
// In Vue/Nuxt, you'd typically put this in composables/ (e.g., composables/useGitHub.ts)
// or server/api/ for server-side fetching. The fetch logic itself is framework-agnostic.

const GITHUB_USERNAME = "andreaslind31";

export interface GitHubUser {
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
  bio: string | null;
  location: string | null;
  company: string | null;
  blog: string;
  public_repos: number;
  followers: number;
  following: number;
}

export interface GitHubRepo {
  name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  stargazers_count: number;
  fork: boolean;
  topics: string[];
  updated_at: string;
}

export async function getGitHubUser(): Promise<GitHubUser> {
  try {
    const res = await fetch(
      `https://api.github.com/users/${GITHUB_USERNAME}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) throw new Error("Failed to fetch GitHub user");
    return res.json();
  } catch {
    // Return fallback data so the build doesn't crash
    return {
      login: GITHUB_USERNAME,
      name: "Andreas Lind",
      avatar_url: `https://avatars.githubusercontent.com/u/70567910?v=4`,
      html_url: `https://github.com/${GITHUB_USERNAME}`,
      bio: "Software developer based in Varberg.",
      location: "Varberg, Sweden",
      company: null,
      blog: "",
      public_repos: 0,
      followers: 0,
      following: 0,
    };
  }
}

export interface ContributionDay {
  date: string; // "2025-04-28"
  level: number; // 0-4
  count: number; // from tooltip text
}

export async function getGitHubContributions(): Promise<ContributionDay[]> {
  try {
    const res = await fetch(
      `https://github.com/users/${GITHUB_USERNAME}/contributions`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const html = await res.text();

    const contributions: ContributionDay[] = [];
    // Match each td with data-date and data-level, followed by a tool-tip with count
    const cellRegex =
      /data-date="(\d{4}-\d{2}-\d{2})"[^>]*data-level="([0-4])"[^>]*>[\s\S]*?<tool-tip[^>]*>([\s\S]*?)<\/tool-tip>/g;
    let match;
    while ((match = cellRegex.exec(html)) !== null) {
      const tooltipText = match[3].trim();
      const countMatch = tooltipText.match(/^(\d+)/);
      contributions.push({
        date: match[1],
        level: parseInt(match[2], 10),
        count: countMatch ? parseInt(countMatch[1], 10) : 0,
      });
    }

    // Fallback: if tooltip parsing failed, try date+level only
    if (contributions.length === 0) {
      const fallbackRegex =
        /data-date="(\d{4}-\d{2}-\d{2})"[^>]*data-level="([0-4])"/g;
      while ((match = fallbackRegex.exec(html)) !== null) {
        contributions.push({
          date: match[1],
          level: parseInt(match[2], 10),
          count: 0,
        });
      }
    }

    return contributions;
  } catch {
    return [];
  }
}

export async function getGitHubRepos(): Promise<GitHubRepo[]> {
  try {
    const res = await fetch(
      `https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100&sort=updated`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) throw new Error("Failed to fetch GitHub repos");
    const repos: GitHubRepo[] = await res.json();
    return repos.filter((repo) => !repo.fork);
  } catch {
    return [];
  }
}
