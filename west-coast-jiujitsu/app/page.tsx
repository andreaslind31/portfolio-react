"use client";

import dynamic from "next/dynamic";

const MembershipDashboard = dynamic(
  () => import("@/components/MembershipDashboard"),
  { ssr: false }
);

export default function Home() {
  return (
    <div className="memberships-page">
      <header className="memberships-header">
        <div className="memberships-header__brand">
          <div className="memberships-header__logo">WCJJ</div>
          <div>
            <h1 className="memberships-header__title">
              West Coast Jiu-Jitsu
            </h1>
            <p className="memberships-header__subtitle">
              Medlemshantering
            </p>
          </div>
        </div>
      </header>

      <main className="memberships-main">
        <MembershipDashboard />
      </main>

      <footer className="memberships-footer">
        <p>West Coast Jiu-Jitsu — Medlemshanteringssystem</p>
      </footer>
    </div>
  );
}
