import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "West Coast Jiu-Jitsu — Medlemshantering",
  description:
    "Hantera medlemskap, utgångsdatum och medlemsinformation för West Coast Jiu-Jitsu.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sv">
      <body>{children}</body>
    </html>
  );
}
