export default function Footer() {
  return (
    <footer className="mt-16 py-8 border-t border-gray-200 text-center text-sm text-gray-500">
      <p>
        Built with{" "}
        <a
          href="https://nextjs.org"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Next.js
        </a>
        {" "}&middot;{" "}
        Data from{" "}
        <a
          href="https://docs.github.com/en/rest"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          GitHub API
        </a>
      </p>
    </footer>
  );
}
