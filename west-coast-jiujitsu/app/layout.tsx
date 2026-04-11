import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "West Coast Jiu-Jitsu — Membership Tracker",
  description:
    "Track and manage gym memberships, expiration dates, and member information for West Coast Jiu-Jitsu.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
