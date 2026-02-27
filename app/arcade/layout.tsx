import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Arcade | Andreas Lind",
  description: "Play Tetris and compete on the global leaderboard.",
};

export default function ArcadeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
