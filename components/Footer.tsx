export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="site-footer-divider" aria-hidden />
      <div className="site-footer-inner">
        <div className="site-footer-row">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Built with{" "}
            <a
              href="https://nextjs.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 animated-link font-medium"
            >
              Next.js
            </a>
            {" "}&middot;{" "}
            Data from{" "}
            <a
              href="https://docs.github.com/en/rest"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 animated-link font-medium"
            >
              GitHub API
            </a>
          </p>
          <a href="#about" className="site-footer-top">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
            Back to top
          </a>
        </div>
        <div className="site-footer-row site-footer-meta">
          <p className="text-xs text-gray-500 dark:text-gray-500">
            &copy; {year} Andreas Lind &middot; Crafted with care
          </p>
          <p className="hidden md:flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
            Press
            <kbd className="px-1.5 py-0.5 text-[0.65rem] rounded bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 font-mono">
              ⌘K
            </kbd>
            to open the command palette
          </p>
        </div>
      </div>
    </footer>
  );
}
