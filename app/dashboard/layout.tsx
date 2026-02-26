import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | Andreas Lind",
  description: "Visitor analytics dashboard for Andreas Lind's portfolio.",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
