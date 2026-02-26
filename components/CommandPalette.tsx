"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useTheme } from "@/hooks/useTheme";

interface Command {
  id: string;
  group: string;
  label: string;
  keywords: string[];
  action: () => void;
  icon: React.ReactNode;
}

const SearchIcon = () => (
  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const NavigationIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
  </svg>
);

const ThemeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

const ChartIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { dark, mounted, toggle } = useTheme();

  const commands: Command[] = useMemo(
    () => [
      // Navigation
      { id: "nav-about", group: "Navigation", label: "Go to About", keywords: ["about", "home", "intro", "header"], action: () => { window.location.href = "/#about"; }, icon: <NavigationIcon /> },
      { id: "nav-skills", group: "Navigation", label: "Go to Skills", keywords: ["skills", "tech", "languages"], action: () => { window.location.href = "/#skills"; }, icon: <NavigationIcon /> },
      { id: "nav-stats", group: "Navigation", label: "Go to Stats", keywords: ["stats", "github", "statistics"], action: () => { window.location.href = "/#stats"; }, icon: <NavigationIcon /> },
      { id: "nav-activity", group: "Navigation", label: "Go to Activity", keywords: ["activity", "contributions", "heatmap"], action: () => { window.location.href = "/#contributions"; }, icon: <NavigationIcon /> },
      { id: "nav-repos", group: "Navigation", label: "Go to Repos", keywords: ["repos", "repositories", "projects"], action: () => { window.location.href = "/#repos"; }, icon: <NavigationIcon /> },
      { id: "nav-contact", group: "Navigation", label: "Go to Contact", keywords: ["contact", "email", "reach"], action: () => { window.location.href = "/#contact"; }, icon: <NavigationIcon /> },
      // Actions
      { id: "action-theme", group: "Actions", label: dark ? "Switch to light mode" : "Switch to dark mode", keywords: ["theme", "dark", "light", "mode", "toggle"], action: () => { toggle(); }, icon: <ThemeIcon /> },
      // Links
      { id: "link-github", group: "Links", label: "Open GitHub Profile", keywords: ["github", "profile", "code"], action: () => { window.open("https://github.com/andreaslind01", "_blank"); }, icon: <ExternalLinkIcon /> },
      { id: "link-linkedin", group: "Links", label: "Open LinkedIn", keywords: ["linkedin", "social", "network"], action: () => { window.open("https://www.linkedin.com/in/andreas-lind31/", "_blank"); }, icon: <ExternalLinkIcon /> },
      { id: "link-email", group: "Links", label: "Send Email", keywords: ["email", "mail", "contact"], action: () => { window.location.href = "mailto:andreaslind31@gmail.com"; }, icon: <ExternalLinkIcon /> },
      { id: "link-dashboard", group: "Links", label: "View Dashboard", keywords: ["dashboard", "analytics", "stats", "visitors"], action: () => { window.location.href = "/dashboard"; }, icon: <ChartIcon /> },
    ],
    [dark, toggle]
  );

  const filtered = useMemo(() => {
    if (!query) return commands;
    const q = query.toLowerCase();
    return commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(q) ||
        cmd.keywords.some((k) => k.includes(q))
    );
  }, [query, commands]);

  const groups = useMemo(() => {
    const map = new Map<string, Command[]>();
    for (const cmd of filtered) {
      const list = map.get(cmd.group) || [];
      list.push(cmd);
      map.set(cmd.group, list);
    }
    return map;
  }, [filtered]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  }, []);

  const execute = useCallback(
    (cmd: Command) => {
      close();
      // Delay action slightly so the palette closes first
      requestAnimationFrame(() => cmd.action());
    },
    [close]
  );

  // Cmd+K / Ctrl+K toggle
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => {
          if (prev) {
            setQuery("");
            setActiveIndex(0);
          }
          return !prev;
        });
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when opening
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  // Reset active index when filtered results change
  useEffect(() => {
    setActiveIndex(0);
  }, [filtered.length]);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const active = listRef.current.querySelector("[data-active='true']");
    if (active) {
      active.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + filtered.length) % filtered.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[activeIndex]) {
        execute(filtered[activeIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  }

  if (!mounted || !open) return null;

  let itemIndex = -1;

  return (
    <div
      className="command-palette-backdrop"
      onClick={close}
      role="presentation"
    >
      <div
        className="command-palette-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="command-palette-input-wrap">
          <SearchIcon />
          <input
            ref={inputRef}
            type="text"
            className="command-palette-input"
            placeholder="Type a command..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            role="combobox"
            aria-expanded="true"
            aria-controls="command-palette-list"
            aria-activedescendant={
              filtered[activeIndex]
                ? `cmd-${filtered[activeIndex].id}`
                : undefined
            }
            aria-autocomplete="list"
          />
          <kbd className="command-palette-kbd">esc</kbd>
        </div>

        <div
          ref={listRef}
          id="command-palette-list"
          role="listbox"
          className="command-palette-list"
        >
          {filtered.length === 0 && (
            <div className="command-palette-empty">No results found.</div>
          )}
          {Array.from(groups.entries()).map(([group, cmds]) => (
            <div key={group}>
              <div className="command-palette-group">{group}</div>
              {cmds.map((cmd) => {
                itemIndex++;
                const isActive = itemIndex === activeIndex;
                const idx = itemIndex;
                return (
                  <div
                    key={cmd.id}
                    id={`cmd-${cmd.id}`}
                    role="option"
                    aria-selected={isActive}
                    data-active={isActive}
                    className={`command-palette-item ${isActive ? "command-palette-item-active" : ""}`}
                    onClick={() => execute(cmd)}
                    onMouseEnter={() => setActiveIndex(idx)}
                  >
                    <span className="command-palette-item-icon">{cmd.icon}</span>
                    <span>{cmd.label}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div className="command-palette-footer">
          <span><kbd className="command-palette-kbd-sm">&uarr;</kbd> <kbd className="command-palette-kbd-sm">&darr;</kbd> navigate</span>
          <span><kbd className="command-palette-kbd-sm">&crarr;</kbd> select</span>
          <span><kbd className="command-palette-kbd-sm">esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
