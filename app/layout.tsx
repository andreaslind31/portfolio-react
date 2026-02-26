// React: This is a Root Layout — it wraps every page in the app.
// Vue equivalent: App.vue with <router-view /> (or Nuxt's app.vue with <NuxtPage />).
// In React/Next.js, layouts are nested via the file system (app/layout.tsx).
// In Vue/Nuxt, you'd use layouts/ directory or definePageMeta({ layout: 'default' }).

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import ThemeToggle from "@/components/ThemeToggle";
import SpotlightBackground from "@/components/SpotlightBackground";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

// React/Next.js: Exporting a `metadata` object sets <head> tags automatically.
// Vue equivalent: useHead() composable in Nuxt, or definePageMeta() for page-level meta.
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
  // React: suppressHydrationWarning tells React to ignore the mismatch between
  // server-rendered HTML and client HTML (since our theme script modifies the class
  // before React hydrates). No Vue equivalent needed — Vue handles this differently.
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* React: dangerouslySetInnerHTML is React's version of Vue's v-html.
            Named "dangerously" as a reminder that injecting raw HTML can be an XSS risk.
            Here it's safe because we control the script content. */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${inter.className} bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white min-h-screen transition-colors`}
      >
        <SpotlightBackground />
        <ThemeToggle />
        {/* React: {children} renders whatever page component matches the current route.
            Vue equivalent: <slot /> in a layout, or <router-view /> / <NuxtPage /> for routing. */}
        {children}
      </body>
    </html>
  );
}
