import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Neon Shooter | Arcade | Andreas Lind",
};

export default function ShooterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
