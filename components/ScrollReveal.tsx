"use client";

import { useInView } from "@/hooks/useInView";

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  animation?: "fade-up" | "fade-in";
}

export default function ScrollReveal({
  children,
  className = "",
  delay = 0,
  animation = "fade-up",
}: ScrollRevealProps) {
  const { ref, isInView } = useInView();

  return (
    <div
      ref={ref}
      className={`scroll-reveal ${animation} ${isInView ? "in-view" : ""} h-full ${className}`}
      style={delay > 0 ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
