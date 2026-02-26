"use client";

import { useEffect } from "react";

export default function SpotlightBackground() {
  useEffect(() => {
    // Disable on touch devices
    if (window.matchMedia("(hover: none)").matches) return;

    const handleMouseMove = (e: MouseEvent) => {
      document.documentElement.style.setProperty(
        "--spotlight-x",
        `${e.clientX}px`
      );
      document.documentElement.style.setProperty(
        "--spotlight-y",
        `${e.clientY}px`
      );
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return <div className="spotlight-bg" aria-hidden="true" />;
}
