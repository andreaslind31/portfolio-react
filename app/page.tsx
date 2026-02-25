// React: This is a Server Component (the default in Next.js App Router).
// It runs ONLY on the server — never ships JavaScript to the browser.
// Vue equivalent: Nuxt 3 has experimental server components, but typically you'd use
// useAsyncData() or useFetch() in <script setup> to fetch data server-side.

import { getGitHubUser, getGitHubRepos, getGitHubContributions } from "@/lib/github";
import Header from "@/components/Header";
import SkillsOverview from "@/components/SkillsOverview";
import GitHubStats from "@/components/GitHubStats";
import ContributionHeatmap from "@/components/ContributionHeatmap";
import RepoGrid from "@/components/RepoGrid";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ScrollReveal";

// React: Server Components can be async functions — you can await directly in the component.
// Vue equivalent: In Nuxt, you'd use const { data } = await useFetch('/api/...') inside <script setup>.
// The key difference: React Server Components never hydrate on the client, so they add zero JS bundle size.
export default async function Home() {
  const [user, repos, contributions] = await Promise.all([
    getGitHubUser(),
    getGitHubRepos(),
    getGitHubContributions(),
  ]);

  // React: JSX is returned directly from the function — no <template> block needed.
  // Vue equivalent: The <template> section of an SFC (.vue file).
  // In React, markup and logic live together. In Vue, they're separated into <template>, <script>, <style>.
  return (
    <main className="max-w-5xl mx-auto px-4 py-12 space-y-8">
      {/* React: Props are passed like HTML attributes. <Header user={user} />
          Vue equivalent: <Header :user="user" /> (v-bind shorthand) */}
      <ScrollReveal animation="fade-up">
        <Header user={user} />
      </ScrollReveal>
      <ScrollReveal animation="fade-up" delay={100}>
        <SkillsOverview repos={repos} />
      </ScrollReveal>
      <ScrollReveal animation="fade-up" delay={150}>
        <GitHubStats user={user} repos={repos} />
      </ScrollReveal>
      {contributions.length > 0 && (
        <ScrollReveal animation="fade-up" delay={175}>
          <ContributionHeatmap contributions={contributions} />
        </ScrollReveal>
      )}
      <ScrollReveal animation="fade-up" delay={200}>
        <RepoGrid repos={repos} />
      </ScrollReveal>
      <ScrollReveal animation="fade-up" delay={100}>
        <ContactSection user={user} />
      </ScrollReveal>
      <ScrollReveal animation="fade-in" delay={100}>
        <Footer />
      </ScrollReveal>
    </main>
  );
}
