export default function Footer() {
  return (
    <footer className="mt-16 py-8 border-t border-gray-200 dark:border-gray-700 text-center text-sm text-gray-500 dark:text-gray-400">
      <p>
        Built with{" "}
        <a
          href="https://nextjs.org"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 dark:text-blue-400 animated-link"
        >
          Next.js
        </a>
        {" "}&middot;{" "}
        Data from{" "}
        <a
          href="https://docs.github.com/en/rest"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 dark:text-blue-400 animated-link"
        >
          GitHub API
        </a>
        {" "}&middot;{" "}
        <a
          href="/arcade"
          className="text-blue-600 dark:text-blue-400 animated-link"
        >
          Arcade
        </a>
      </p>
      <p className="mt-2 hidden md:block text-gray-400 dark:text-gray-500">
        Press{" "}
        <kbd className="px-1.5 py-0.5 text-xs rounded bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400">
          ⌘K
        </kbd>
        {" "}to open the command palette
      </p>
    </footer>
  );
}
