"use client";

import { useEffect, useState } from "react";

export default function SkillsBar({
  percentage,
  color,
}: {
  percentage: number;
  color: string;
}) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    requestAnimationFrame(() => {
      setWidth(percentage);
    });
  }, [percentage]);

  return (
    <div
      className="h-4 rounded"
      style={{
        width: `${width}%`,
        minWidth: "2rem",
        backgroundColor: color,
        transition: "width 0.7s ease-out",
      }}
    />
  );
}
