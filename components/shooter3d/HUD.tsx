"use client";

import { useState, useEffect } from "react";

interface HUDProps {
  health: number;
  maxHealth: number;
  score: number;
  wave: number;
  ammo: number;
  locked: boolean;
  gameState: "menu" | "playing" | "gameover";
  onStart: () => void;
  onRestart: () => void;
  onScoreSubmit?: (name: string, score: number) => Promise<string | null>;
  finalScore?: number;
}

export default function HUD({
  health,
  maxHealth,
  score,
  wave,
  ammo,
  locked,
  gameState,
  onStart,
  onRestart,
  onScoreSubmit,
  finalScore,
}: HUDProps) {
  const [submitName, setSubmitName] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const healthPct = Math.max(0, (health / maxHealth) * 100);
  const healthColor =
    healthPct > 60 ? "#00d4ff" : healthPct > 30 ? "#ffaa00" : "#ff2255";

  const handleSubmit = async () => {
    if (!submitName.trim() || !onScoreSubmit) return;
    setSubmitting(true);
    const err = await onScoreSubmit(submitName.trim(), finalScore ?? score);
    setSubmitting(false);
    if (err) {
      setSubmitError(err);
    } else {
      setSubmitted(true);
    }
  };

  // Reset submission state on new game
  useEffect(() => {
    if (gameState === "playing") {
      setSubmitted(false);
      setSubmitError(null);
      setSubmitName("");
    }
  }, [gameState]);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: gameState === "playing" ? "none" : "auto",
        fontFamily: "'Courier New', monospace",
        userSelect: "none",
      }}
    >
      {/* ═══ PLAYING HUD ═══ */}
      {gameState === "playing" && (
        <>
          {/* Crosshair */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24">
              <circle
                cx="12"
                cy="12"
                r="8"
                fill="none"
                stroke="#00d4ff"
                strokeWidth="1"
                opacity="0.6"
              />
              <line x1="12" y1="2" x2="12" y2="8" stroke="#00d4ff" strokeWidth="1.5" opacity="0.8" />
              <line x1="12" y1="16" x2="12" y2="22" stroke="#00d4ff" strokeWidth="1.5" opacity="0.8" />
              <line x1="2" y1="12" x2="8" y2="12" stroke="#00d4ff" strokeWidth="1.5" opacity="0.8" />
              <line x1="16" y1="12" x2="22" y2="12" stroke="#00d4ff" strokeWidth="1.5" opacity="0.8" />
              <circle cx="12" cy="12" r="1.5" fill="#00d4ff" opacity="0.9" />
            </svg>
          </div>

          {/* Health bar — bottom left */}
          <div
            style={{
              position: "absolute",
              bottom: 30,
              left: 30,
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <div style={{ color: healthColor, fontSize: 12, letterSpacing: 2 }}>
              HEALTH
            </div>
            <div
              style={{
                width: 200,
                height: 8,
                background: "rgba(255,255,255,0.1)",
                borderRadius: 4,
                overflow: "hidden",
                border: `1px solid ${healthColor}44`,
              }}
            >
              <div
                style={{
                  width: `${healthPct}%`,
                  height: "100%",
                  background: healthColor,
                  boxShadow: `0 0 10px ${healthColor}`,
                  transition: "width 0.3s, background 0.3s",
                }}
              />
            </div>
          </div>

          {/* Score — top right */}
          <div
            style={{
              position: "absolute",
              top: 30,
              right: 30,
              textAlign: "right",
            }}
          >
            <div style={{ color: "#00d4ff", fontSize: 12, letterSpacing: 2 }}>
              SCORE
            </div>
            <div
              style={{
                color: "#fff",
                fontSize: 28,
                fontWeight: "bold",
                textShadow: "0 0 10px #00d4ff",
              }}
            >
              {score.toLocaleString()}
            </div>
          </div>

          {/* Wave — top left */}
          <div style={{ position: "absolute", top: 30, left: 30 }}>
            <div style={{ color: "#7b2ff7", fontSize: 12, letterSpacing: 2 }}>
              WAVE
            </div>
            <div
              style={{
                color: "#fff",
                fontSize: 28,
                fontWeight: "bold",
                textShadow: "0 0 10px #7b2ff7",
              }}
            >
              {wave}
            </div>
          </div>

          {/* Ammo — bottom right */}
          <div
            style={{
              position: "absolute",
              bottom: 30,
              right: 30,
              textAlign: "right",
            }}
          >
            <div style={{ color: "#00d4ff88", fontSize: 12, letterSpacing: 2 }}>
              ENERGY
            </div>
            <div
              style={{
                color: "#00d4ff",
                fontSize: 24,
                fontWeight: "bold",
                textShadow: "0 0 8px #00d4ff",
              }}
            >
              {ammo}
            </div>
          </div>

          {/* ESC hint */}
          <div
            style={{
              position: "absolute",
              top: 30,
              left: "50%",
              transform: "translateX(-50%)",
              color: "#ffffff44",
              fontSize: 11,
              letterSpacing: 1,
            }}
          >
            ESC to release cursor
          </div>
        </>
      )}

      {/* ═══ START MENU ═══ */}
      {gameState === "menu" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(4px)",
          }}
        >
          <h1
            style={{
              color: "#00d4ff",
              fontSize: 48,
              fontWeight: "bold",
              textShadow: "0 0 30px #00d4ff, 0 0 60px #00d4ff44",
              marginBottom: 8,
              letterSpacing: 6,
            }}
          >
            NEON STRIKER
          </h1>
          <p
            style={{
              color: "#7b2ff7",
              fontSize: 14,
              letterSpacing: 4,
              marginBottom: 40,
            }}
          >
            SCI-FI ARENA SHOOTER
          </p>

          <div
            style={{
              color: "#ffffffaa",
              fontSize: 13,
              lineHeight: 2,
              textAlign: "center",
              marginBottom: 40,
            }}
          >
            <div>
              <span style={{ color: "#00d4ff" }}>WASD</span> — Move
            </div>
            <div>
              <span style={{ color: "#00d4ff" }}>MOUSE</span> — Aim
            </div>
            <div>
              <span style={{ color: "#00d4ff" }}>CLICK</span> — Shoot
            </div>
            <div>
              <span style={{ color: "#00d4ff" }}>SPACE</span> — Jump
            </div>
          </div>

          <button
            onClick={onStart}
            style={{
              background: "transparent",
              border: "2px solid #00d4ff",
              color: "#00d4ff",
              padding: "14px 48px",
              fontSize: 18,
              letterSpacing: 4,
              cursor: "pointer",
              transition: "all 0.2s",
              textShadow: "0 0 10px #00d4ff",
              boxShadow: "0 0 20px #00d4ff44, inset 0 0 20px #00d4ff11",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#00d4ff22";
              e.currentTarget.style.boxShadow =
                "0 0 30px #00d4ff88, inset 0 0 30px #00d4ff22";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.boxShadow =
                "0 0 20px #00d4ff44, inset 0 0 20px #00d4ff11";
            }}
          >
            START GAME
          </button>

          <p
            style={{
              color: "#ffffff33",
              fontSize: 11,
              marginTop: 20,
              letterSpacing: 1,
            }}
          >
            Click to lock cursor • Desktop only
          </p>
        </div>
      )}

      {/* ═══ GAME OVER ═══ */}
      {gameState === "gameover" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(4px)",
          }}
        >
          <h2
            style={{
              color: "#ff2255",
              fontSize: 42,
              fontWeight: "bold",
              textShadow: "0 0 30px #ff2255",
              letterSpacing: 6,
              marginBottom: 8,
            }}
          >
            TERMINATED
          </h2>
          <div
            style={{
              color: "#ffffffaa",
              fontSize: 14,
              letterSpacing: 2,
              marginBottom: 8,
            }}
          >
            FINAL SCORE
          </div>
          <div
            style={{
              color: "#00d4ff",
              fontSize: 48,
              fontWeight: "bold",
              textShadow: "0 0 20px #00d4ff",
              marginBottom: 30,
            }}
          >
            {(finalScore ?? score).toLocaleString()}
          </div>

          {/* Score submission */}
          {onScoreSubmit && !submitted && (
            <div
              style={{
                display: "flex",
                gap: 8,
                marginBottom: 20,
                alignItems: "center",
              }}
            >
              <input
                type="text"
                value={submitName}
                onChange={(e) => setSubmitName(e.target.value.slice(0, 16))}
                placeholder="Enter name..."
                maxLength={16}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid #00d4ff44",
                  color: "#fff",
                  padding: "8px 12px",
                  fontSize: 14,
                  fontFamily: "'Courier New', monospace",
                  outline: "none",
                  width: 160,
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmit();
                }}
              />
              <button
                onClick={handleSubmit}
                disabled={submitting || !submitName.trim()}
                style={{
                  background: "#00d4ff22",
                  border: "1px solid #00d4ff",
                  color: "#00d4ff",
                  padding: "8px 16px",
                  fontSize: 13,
                  cursor: "pointer",
                  fontFamily: "'Courier New', monospace",
                  letterSpacing: 1,
                  opacity: submitting || !submitName.trim() ? 0.5 : 1,
                }}
              >
                {submitting ? "..." : "SUBMIT"}
              </button>
            </div>
          )}
          {submitError && (
            <div style={{ color: "#ff2255", fontSize: 12, marginBottom: 10 }}>
              {submitError}
            </div>
          )}
          {submitted && (
            <div
              style={{
                color: "#00d4ff",
                fontSize: 13,
                marginBottom: 20,
                letterSpacing: 1,
              }}
            >
              Score submitted!
            </div>
          )}

          <button
            onClick={onRestart}
            style={{
              background: "transparent",
              border: "2px solid #00d4ff",
              color: "#00d4ff",
              padding: "12px 40px",
              fontSize: 16,
              letterSpacing: 4,
              cursor: "pointer",
              textShadow: "0 0 10px #00d4ff",
              boxShadow: "0 0 20px #00d4ff44",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#00d4ff22";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            RETRY
          </button>
        </div>
      )}
    </div>
  );
}
