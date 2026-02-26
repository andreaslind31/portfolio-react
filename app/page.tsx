import { getGitHubUser, getGitHubRepos, getGitHubContributions } from "@/lib/github";
import Header from "@/components/Header";
import SkillsOverview from "@/components/SkillsOverview";
import GitHubStats from "@/components/GitHubStats";
import ContributionHeatmap from "@/components/ContributionHeatmap";
import RepoGrid from "@/components/RepoGrid";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ScrollReveal";
import GlowCard from "@/components/GlowCard";
import SectionNav from "@/components/SectionNav";

export default async function Home() {
  const [user, repos, contributions] = await Promise.all([
    getGitHubUser(),
    getGitHubRepos(),
    getGitHubContributions(),
  ]);

  return (
    <>
      <SectionNav />
      <main className="relative z-10 max-w-5xl mx-auto px-4 py-12 space-y-8">
        <section id="about">
          <ScrollReveal animation="fade-up" className="page-enter page-enter-1">
            <Header user={user} />
          </ScrollReveal>
        </section>
        <section id="skills">
          <ScrollReveal animation="fade-up" className="page-enter page-enter-2">
            <GlowCard>
              <SkillsOverview repos={repos} />
            </GlowCard>
          </ScrollReveal>
        </section>
        <section id="stats">
          <ScrollReveal animation="fade-up" className="page-enter page-enter-3">
            <GlowCard>
              <GitHubStats user={user} repos={repos} />
            </GlowCard>
          </ScrollReveal>
        </section>
        {contributions.length > 0 && (
          <section id="contributions">
            <ScrollReveal animation="fade-up" className="page-enter page-enter-4">
              <GlowCard>
                <ContributionHeatmap contributions={contributions} />
              </GlowCard>
            </ScrollReveal>
          </section>
        )}
        <section id="repos">
          <ScrollReveal animation="fade-up" className="page-enter page-enter-5">
            <RepoGrid repos={repos} />
          </ScrollReveal>
        </section>
        <section id="contact">
          <ScrollReveal animation="fade-up" className="page-enter page-enter-6">
            <GlowCard>
              <ContactSection user={user} />
            </GlowCard>
          </ScrollReveal>
        </section>
        <ScrollReveal animation="fade-in" className="page-enter page-enter-7">
          <Footer />
        </ScrollReveal>
      </main>
    </>
  );
}
