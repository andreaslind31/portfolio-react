import type { Metadata } from "next";
import { Inter } from "next/font/google";
import ThemeToggle from "@/components/ThemeToggle";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Andreas Lind | Developer Portfolio",
  description:
    "Portfolio of Andreas Lind - Software developer based in Varberg. Go, C#, Vue, and more.",
  openGraph: {
    title: "Andreas Lind | Developer Portfolio",
    description: "Software developer based in Varberg.",
    images: ["https://avatars.githubusercontent.com/u/70567910?v=4"],
  },
};

const themeScript = `
  (function() {
    var theme = localStorage.getItem('theme');
    if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
  })();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${inter.className} bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white min-h-screen transition-colors`}
      >
        <ThemeToggle />
        {children}
      </body>
    </html>
  );
}
