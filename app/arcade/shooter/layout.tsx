import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sector Breach | Arcade | Andreas Lind",
};

export default function ShooterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
