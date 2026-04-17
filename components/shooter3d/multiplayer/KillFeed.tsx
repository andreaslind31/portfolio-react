"use client";

export interface KillFeedEntry {
  id: number;
  killerName: string;
  victimName: string;
  weapon: string;
  timestamp: number;
}

interface KillFeedProps {
  entries: KillFeedEntry[];
}

let feedId = 0;
export function createKillFeedEntry(
  killerName: string,
  victimName: string,
  weapon: string
): KillFeedEntry {
  return {
    id: feedId++,
    killerName,
    victimName,
    weapon,
    timestamp: Date.now(),
  };
}

export default function KillFeed({ entries }: KillFeedProps) {
  // Only show last 5 entries, fade after 5 seconds
  const recent = entries.filter((e) => Date.now() - e.timestamp < 5000).slice(-5);

  if (recent.length === 0) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: 90,
        right: 20,
        display: "flex",
        flexDirection: "column",
        gap: 4,
        pointerEvents: "none",
        fontFamily: "'Courier New', monospace",
      }}
    >
      {recent.map((entry) => {
        const age = Date.now() - entry.timestamp;
        const opacity = age < 4000 ? 0.9 : 0.9 * (1 - (age - 4000) / 1000);
        return (
          <div
            key={entry.id}
            style={{
              background: "rgba(0,0,0,0.6)",
              padding: "3px 10px",
              fontSize: 11,
              color: "#ffffffcc",
              opacity: Math.max(0, opacity),
              display: "flex",
              gap: 6,
              alignItems: "center",
            }}
          >
            <span style={{ color: "#ff6622" }}>{entry.killerName}</span>
            <span style={{ color: "#ffffff66", fontSize: 9 }}>[{entry.weapon}]</span>
            <span style={{ color: "#8B0000" }}>{entry.victimName}</span>
          </div>
        );
      })}
    </div>
  );
}
