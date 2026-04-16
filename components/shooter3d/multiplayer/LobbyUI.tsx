"use client";

import { useState } from "react";
import type { PlayerInfo, RoomState } from "./protocol";

interface LobbyUIProps {
  visible: boolean;
  roomCode: string;
  players: PlayerInfo[];
  hostId: string;
  localPlayerId: string;
  roomState: RoomState;
  connectionState: string;
  isHost: boolean;
  onHost: (name: string) => void;
  onJoin: (roomCode: string, name: string) => void;
  onStartGame: (mode: "coop-waves" | "coop-maps" | "deathmatch") => void;
  onLeave: () => void;
  onBack: () => void;
}

export default function LobbyUI({
  visible,
  roomCode,
  players,
  hostId,
  localPlayerId,
  roomState,
  connectionState,
  isHost,
  onHost,
  onJoin,
  onStartGame,
  onLeave,
  onBack,
}: LobbyUIProps) {
  const [playerName, setPlayerName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [screen, setScreen] = useState<"choice" | "hosting" | "joining" | "lobby">("choice");

  if (!visible) return null;

  const baseStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(0,0,0,0.85)",
    backdropFilter: "blur(4px)",
    fontFamily: "'Courier New', monospace",
    userSelect: "none",
    color: "#fff",
  };

  const btnStyle: React.CSSProperties = {
    background: "transparent",
    border: "2px solid #ff6622",
    color: "#ff6622",
    padding: "12px 32px",
    fontSize: 14,
    letterSpacing: 3,
    cursor: "pointer",
    fontFamily: "'Courier New', monospace",
    textShadow: "0 0 10px #ff662244",
    boxShadow: "0 0 15px #ff662233",
  };

  const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.08)",
    border: "1px solid #ff662244",
    color: "#fff",
    padding: "8px 12px",
    fontSize: 14,
    fontFamily: "'Courier New', monospace",
    outline: "none",
    width: 200,
    textAlign: "center",
    letterSpacing: 2,
  };

  // ── Choice screen: Host or Join ──
  if (screen === "choice") {
    return (
      <div style={baseStyle}>
        <h2 style={{ color: "#ff6622", fontSize: 28, letterSpacing: 6, textShadow: "0 0 20px #ff6622", marginBottom: 8 }}>
          MULTIPLAYER
        </h2>
        <p style={{ color: "#ffffff66", fontSize: 11, letterSpacing: 2, marginBottom: 30 }}>
          PLAY WITH FRIENDS
        </p>

        <div style={{ display: "flex", gap: 20, marginBottom: 20 }}>
          <button
            style={btnStyle}
            onClick={() => setScreen("hosting")}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#ff662222"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            HOST GAME
          </button>
          <button
            style={btnStyle}
            onClick={() => setScreen("joining")}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#ff662222"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            JOIN GAME
          </button>
        </div>

        <button
          onClick={onBack}
          style={{ background: "transparent", border: "1px solid #ffffff33", color: "#ffffff88", padding: "8px 24px", fontSize: 11, letterSpacing: 2, cursor: "pointer", fontFamily: "'Courier New', monospace" }}
        >
          ← BACK
        </button>
      </div>
    );
  }

  // ── Hosting: enter name, create room ──
  if (screen === "hosting") {
    return (
      <div style={baseStyle}>
        <h2 style={{ color: "#ff6622", fontSize: 24, letterSpacing: 4, marginBottom: 20 }}>
          HOST GAME
        </h2>
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: "#ffffff88", fontSize: 10, letterSpacing: 2, marginBottom: 6 }}>YOUR NAME</div>
          <input
            style={inputStyle}
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value.slice(0, 16))}
            placeholder="Enter name..."
            maxLength={16}
            onKeyDown={(e) => { if (e.key === "Enter" && playerName.trim()) { onHost(playerName.trim()); setScreen("lobby"); } }}
          />
        </div>
        <button
          style={{ ...btnStyle, opacity: !playerName.trim() ? 0.4 : 1 }}
          disabled={!playerName.trim()}
          onClick={() => { if (playerName.trim()) { onHost(playerName.trim()); setScreen("lobby"); } }}
        >
          CREATE ROOM
        </button>
        <button
          onClick={() => setScreen("choice")}
          style={{ marginTop: 16, background: "transparent", border: "1px solid #ffffff33", color: "#ffffff88", padding: "8px 24px", fontSize: 11, letterSpacing: 2, cursor: "pointer", fontFamily: "'Courier New', monospace" }}
        >
          ← BACK
        </button>
      </div>
    );
  }

  // ── Joining: enter room code + name ──
  if (screen === "joining") {
    return (
      <div style={baseStyle}>
        <h2 style={{ color: "#ff6622", fontSize: 24, letterSpacing: 4, marginBottom: 20 }}>
          JOIN GAME
        </h2>
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: "#ffffff88", fontSize: 10, letterSpacing: 2, marginBottom: 6 }}>ROOM CODE</div>
          <input
            style={{ ...inputStyle, fontSize: 20, letterSpacing: 8, textTransform: "uppercase" }}
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 4))}
            placeholder="XXXX"
            maxLength={4}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: "#ffffff88", fontSize: 10, letterSpacing: 2, marginBottom: 6 }}>YOUR NAME</div>
          <input
            style={inputStyle}
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value.slice(0, 16))}
            placeholder="Enter name..."
            maxLength={16}
            onKeyDown={(e) => { if (e.key === "Enter" && playerName.trim() && joinCode.length === 4) { onJoin(joinCode, playerName.trim()); setScreen("lobby"); } }}
          />
        </div>
        <button
          style={{ ...btnStyle, opacity: !playerName.trim() || joinCode.length !== 4 ? 0.4 : 1 }}
          disabled={!playerName.trim() || joinCode.length !== 4}
          onClick={() => { if (playerName.trim() && joinCode.length === 4) { onJoin(joinCode, playerName.trim()); setScreen("lobby"); } }}
        >
          JOIN
        </button>
        <button
          onClick={() => setScreen("choice")}
          style={{ marginTop: 16, background: "transparent", border: "1px solid #ffffff33", color: "#ffffff88", padding: "8px 24px", fontSize: 11, letterSpacing: 2, cursor: "pointer", fontFamily: "'Courier New', monospace" }}
        >
          ← BACK
        </button>
      </div>
    );
  }

  // ── Lobby: waiting for players, start game ──
  return (
    <div style={baseStyle}>
      <h2 style={{ color: "#ff6622", fontSize: 24, letterSpacing: 4, marginBottom: 4 }}>
        LOBBY
      </h2>
      <div style={{ fontSize: 11, color: "#ffffff66", letterSpacing: 2, marginBottom: 6 }}>
        {connectionState === "connecting" ? "CONNECTING..." : connectionState === "error" ? "CONNECTION FAILED" : "CONNECTED"}
      </div>

      {/* Room code */}
      <div style={{ marginBottom: 20, textAlign: "center" }}>
        <div style={{ color: "#ffffff88", fontSize: 10, letterSpacing: 2, marginBottom: 4 }}>ROOM CODE</div>
        <div style={{ color: "#ff6622", fontSize: 36, fontWeight: "bold", letterSpacing: 12, textShadow: "0 0 20px #ff6622" }}>
          {roomCode || "...."}
        </div>
        <div style={{ color: "#ffffff44", fontSize: 9, marginTop: 4 }}>
          Share this code with friends
        </div>
      </div>

      {/* Player list */}
      <div style={{ marginBottom: 20, width: 280 }}>
        <div style={{ color: "#ffffff88", fontSize: 10, letterSpacing: 2, marginBottom: 8, textAlign: "center" }}>
          PLAYERS ({players.length}/4)
        </div>
        {players.map((p) => (
          <div
            key={p.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "6px 12px",
              marginBottom: 4,
              background: p.id === localPlayerId ? "#ff662211" : "rgba(255,255,255,0.03)",
              border: `1px solid ${p.id === localPlayerId ? "#ff662244" : "#ffffff11"}`,
            }}
          >
            <span style={{ color: p.id === localPlayerId ? "#ff6622" : "#ffffffcc", fontSize: 13 }}>
              {p.name || "Connecting..."}
            </span>
            {p.id === hostId && (
              <span style={{ color: "#ff662288", fontSize: 9, letterSpacing: 1 }}>HOST</span>
            )}
          </div>
        ))}
        {players.length === 0 && (
          <div style={{ color: "#ffffff44", fontSize: 11, textAlign: "center", padding: 16 }}>
            Waiting for players...
          </div>
        )}
      </div>

      {/* Start game buttons (host only) */}
      {isHost && players.length >= 1 && (
        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", justifyContent: "center" }}>
          <button
            style={{ ...btnStyle, fontSize: 12, padding: "10px 20px" }}
            onClick={() => onStartGame("coop-waves")}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#ff662222"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            CO-OP WAVES
          </button>
          <button
            style={{ ...btnStyle, fontSize: 12, padding: "10px 20px", borderColor: "#556b2f", color: "#556b2f" }}
            onClick={() => onStartGame("coop-maps")}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#556b2f22"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            CO-OP MAPS
          </button>
          <button
            style={{ ...btnStyle, fontSize: 12, padding: "10px 20px", borderColor: "#cc3300", color: "#cc3300" }}
            onClick={() => onStartGame("deathmatch")}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#cc330022"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            DEATHMATCH
          </button>
        </div>
      )}

      {!isHost && (
        <div style={{ color: "#ffffff66", fontSize: 11, letterSpacing: 2, marginBottom: 16 }}>
          Waiting for host to start...
        </div>
      )}

      <button
        onClick={() => { onLeave(); setScreen("choice"); }}
        style={{ background: "transparent", border: "1px solid #ffffff33", color: "#ffffff88", padding: "8px 24px", fontSize: 11, letterSpacing: 2, cursor: "pointer", fontFamily: "'Courier New', monospace" }}
      >
        LEAVE ROOM
      </button>
    </div>
  );
}
