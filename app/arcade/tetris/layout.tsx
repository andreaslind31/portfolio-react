import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tetris | Arcade | Andreas Lind",
};

export default function TetrisLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
