import Image from "next/image";
import { GitHubUser } from "@/lib/github";

// React: Props are received via destructuring the function argument.
// The type annotation { user }: { user: GitHubUser } provides TypeScript typing inline.
// Vue equivalent: const props = defineProps<{ user: GitHubUser }>()
// Then you'd access props.user in the script and just `user` in the template.
export default function Header({ user }: { user: GitHubUser }) {
  return (
    // React: className is used instead of class (class is a reserved word in JavaScript).
    // Vue equivalent: Just use class="..." in the template — Vue handles the mapping for you.
    <header className="flex flex-col md:flex-row items-center gap-8 mb-12">
      {/* React/Next.js: <Image> is Next.js's optimized image component (lazy loading, resizing).
          Vue equivalent: <NuxtImg> in Nuxt, or a third-party like vue-lazyload. */}
      <Image
        src={user.avatar_url}
        alt={user.name || user.login}
        width={150}
        height={150}
        className="rounded-full shadow-lg"
        priority
      />

      <div className="text-center md:text-left">
        <h1 className="text-4xl font-bold">{user.name || user.login}</h1>

        {/* React: {condition && <JSX>} is the pattern for conditional rendering.
            Vue equivalent: <p v-if="user.bio">{{ user.bio }}</p>
            React has no directives — you use plain JavaScript expressions inside {}. */}
        {user.bio && (
          <p className="text-lg text-gray-600 dark:text-gray-300 mt-2">{user.bio}</p>
        )}

        <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-4 text-sm text-gray-500 dark:text-gray-400">
          {user.location && (
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {user.location}
            </span>
          )}
          {user.company && (
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              {user.company}
            </span>
          )}
        </div>

        <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-4">
          <a
            href={user.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="cta-primary"
          >
            <svg className="w-5 h-5 relative z-10" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            <span className="relative z-10">View GitHub Profile</span>
          </a>
          <span className="text-sm text-gray-500 dark:text-gray-400 self-center">
            {user.public_repos} repos &middot; {user.followers} followers
          </span>
        </div>
        <div className="flex justify-center md:justify-start gap-3 mt-3">
          <a href="/dashboard" className="cta-secondary">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Dashboard
          </a>
          <a href="/arcade" className="cta-secondary">
            <svg className="w-4 h-4" viewBox="0 0 640 512" fill="currentColor">
              <path d="M448 128C554 128 640 214 640 320C640 426 554 512 448 512L192 512C86 512 0 426 0 320C0 214 86 128 192 128L448 128zM192 240C178.7 240 168 250.7 168 264L168 296L136 296C122.7 296 112 306.7 112 320C112 333.3 122.7 344 136 344L168 344L168 376C168 389.3 178.7 400 192 400C205.3 400 216 389.3 216 376L216 344L248 344C261.3 344 272 333.3 272 320C272 306.7 261.3 296 248 296L216 296L216 264C216 250.7 205.3 240 192 240zM432 336C414.3 336 400 350.3 400 368C400 385.7 414.3 400 432 400C449.7 400 464 385.7 464 368C464 350.3 449.7 336 432 336zM496 240C478.3 240 464 254.3 464 272C464 289.7 478.3 304 496 304C513.7 304 528 289.7 528 272C528 254.3 513.7 240 496 240z" />
            </svg>
            Arcade
          </a>
        </div>
      </div>
    </header>
  );
}
