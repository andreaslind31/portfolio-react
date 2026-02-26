"use client";

import { useScrollSpy } from "@/hooks/useScrollSpy";

const sections = [
  { id: "about", label: "About" },
  { id: "stats", label: "Stats" },
  { id: "repos", label: "Repos" },
];

const sectionIds = sections.map((s) => s.id);

export default function SectionNav() {
  const activeId = useScrollSpy(sectionIds);

  return (
    <nav className="section-nav" aria-label="Section navigation">
      <ul className="flex flex-col gap-3">
        {sections.map(({ id, label }) => (
          <li key={id}>
            <a
              href={`#${id}`}
              className={`section-nav-link ${activeId === id ? "active" : ""}`}
            >
              <span className="section-nav-indicator" />
              <span className="section-nav-label">{label}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
