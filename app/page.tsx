import { getGitHubUser, getGitHubRepos } from "@/lib/github";
import Header from "@/components/Header";
import RepoGrid from "@/components/RepoGrid";
import Footer from "@/components/Footer";

export default async function Home() {
  const [user, repos] = await Promise.all([
    getGitHubUser(),
    getGitHubRepos(),
  ]);

  return (
    <main className="max-w-5xl mx-auto px-4 py-12">
      <Header user={user} />
      <RepoGrid repos={repos} />
      <Footer />
    </main>
  );
}
