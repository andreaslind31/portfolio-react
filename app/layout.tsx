import type { Metadata } from "next";
import { Inter } from "next/font/google";
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} bg-gray-50 text-gray-900 min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
