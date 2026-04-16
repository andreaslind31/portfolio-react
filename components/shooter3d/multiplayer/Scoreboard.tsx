"use client";

import type { PlayerInfo } from "./protocol";

interface ScoreboardProps {
  visible: boolean;
  players: PlayerInfo[];
  localPlayerId: string;
}

export default function Scoreboard({ visible, players, localPlayerId }: ScoreboardProps) {
  if (!visible || players.length === 0) return null;

  const sorted = [...players].sort((a, b) => b.score - a.score || b.kills - a.kills);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
        fontFamily: "'Courier New', monospace",
      }}
    >
      <div
        style={{
          background: "rgba(0,0,0,0.85)",
          border: "2px solid #ff662244",
          padding: 24,
          minWidth: 380,
        }}
      >
        <h3
          style={{
            color: "#ff6622",
            fontSize: 16,
            letterSpacing: 4,
            textAlign: "center",
            marginBottom: 16,
            textShadow: "0 0 10px #ff662244",
          }}
        >
          SCOREBOARD
        </h3>

        {/* Header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr 1fr",
            gap: 8,
            padding: "4px 8px",
            borderBottom: "1px solid #ffffff22",
            color: "#ffffff66",
            fontSize: 9,
            letterSpacing: 2,
          }}
        >
          <div>PLAYER</div>
          <div style={{ textAlign: "center" }}>KILLS</div>
          <div style={{ textAlign: "center" }}>DEATHS</div>
          <div style={{ textAlign: "right" }}>SCORE</div>
        </div>

        {/* Rows */}
        {sorted.map((p, i) => (
          <div
            key={p.id}
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr 1fr",
              gap: 8,
              padding: "6px 8px",
              background: p.id === localPlayerId ? "#ff662211" : "transparent",
              borderLeft: p.id === localPlayerId ? "2px solid #ff6622" : "2px solid transparent",
              fontSize: 12,
              color: p.alive ? "#ffffffcc" : "#ffffff66",
            }}
          >
            <div style={{ color: p.id === localPlayerId ? "#ff6622" : "#ffffffcc" }}>
              {i === 0 ? "👑 " : ""}{p.name}
              {!p.alive && " 💀"}
            </div>
            <div style={{ textAlign: "center", color: "#ff8844" }}>{p.kills}</div>
            <div style={{ textAlign: "center", color: "#8B0000" }}>{p.deaths}</div>
            <div style={{ textAlign: "right", color: "#ffcc44" }}>{p.score}</div>
          </div>
        ))}

        <div style={{ color: "#ffffff44", fontSize: 9, textAlign: "center", marginTop: 12, letterSpacing: 1 }}>
          HOLD TAB TO VIEW
        </div>
      </div>
    </div>
  );
}
