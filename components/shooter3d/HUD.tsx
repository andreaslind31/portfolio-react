"use client";

import { useState, useEffect } from "react";
import type { WeaponType } from "./Weapon";

export interface RadarDot {
  x: number;
  z: number;
  type: "drone" | "sentinel" | "heavy";
  alive: boolean;
}

const WEAPON_DISPLAY: Record<WeaponType, { name: string; color: string }> = {
  blaster: { name: "BLASTER", color: "#00d4ff" },
  shotgun: { name: "SHOTGUN", color: "#ff8800" },
  plasma: { name: "PLASMA", color: "#44ff44" },
};

interface HUDProps {
  health: number;
  maxHealth: number;
  score: number;
  wave: number;
  currentWeapon: WeaponType;
  weaponAmmo: Record<WeaponType, number>;
  locked: boolean;
  gameState: "menu" | "playing" | "gameover";
  onStart: () => void;
  onRestart: () => void;
  onScoreSubmit?: (name: string, score: number) => Promise<string | null>;
  finalScore?: number;
  hitMarker: boolean;
  waveAnnounce: number;
  damageDirection: number | null;
  kills: number;
  radarDots: RadarDot[];
  playerYaw: number;
}

export default function HUD({
  health,
  maxHealth,
  score,
  wave,
  currentWeapon,
  weaponAmmo,
  locked,
  gameState,
  onStart,
  onRestart,
  onScoreSubmit,
  finalScore,
  hitMarker,
  waveAnnounce,
  damageDirection,
  kills,
  radarDots,
  playerYaw,
}: HUDProps) {
  const [submitName, setSubmitName] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showWaveBanner, setShowWaveBanner] = useState(false);
  const [waveBannerNum, setWaveBannerNum] = useState(0);
  const [showDmgDir, setShowDmgDir] = useState(false);
  const [dmgAngle, setDmgAngle] = useState(0);

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

  // Wave banner animation
  useEffect(() => {
    if (waveAnnounce > 0) {
      setWaveBannerNum(waveAnnounce);
      setShowWaveBanner(true);
      const timer = setTimeout(() => setShowWaveBanner(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [waveAnnounce]);

  // Damage direction indicator
  useEffect(() => {
    if (damageDirection !== null) {
      setDmgAngle(damageDirection);
      setShowDmgDir(true);
      const timer = setTimeout(() => setShowDmgDir(false), 500);
      return () => clearTimeout(timer);
    }
  }, [damageDirection]);

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
            <svg width="28" height="28" viewBox="0 0 28 28">
              {/* Outer ring — expands on hit */}
              <circle
                cx="14"
                cy="14"
                r={hitMarker ? 11 : 9}
                fill="none"
                stroke={hitMarker ? "#ff2255" : "#00d4ff"}
                strokeWidth={hitMarker ? 2 : 1}
                opacity={hitMarker ? 1 : 0.5}
                style={{ transition: "all 0.08s ease-out" }}
              />
              {/* Crosshair lines */}
              <line x1="14" y1="2" x2="14" y2="9" stroke={hitMarker ? "#ff2255" : "#00d4ff"} strokeWidth="1.5" opacity="0.8" />
              <line x1="14" y1="19" x2="14" y2="26" stroke={hitMarker ? "#ff2255" : "#00d4ff"} strokeWidth="1.5" opacity="0.8" />
              <line x1="2" y1="14" x2="9" y2="14" stroke={hitMarker ? "#ff2255" : "#00d4ff"} strokeWidth="1.5" opacity="0.8" />
              <line x1="19" y1="14" x2="26" y2="14" stroke={hitMarker ? "#ff2255" : "#00d4ff"} strokeWidth="1.5" opacity="0.8" />
              {/* Center dot */}
              <circle cx="14" cy="14" r={hitMarker ? 2.5 : 1.5} fill={hitMarker ? "#ff2255" : "#00d4ff"} opacity="0.9" />
              {/* Hit X marks */}
              {hitMarker && (
                <>
                  <line x1="8" y1="8" x2="11" y2="11" stroke="#ff2255" strokeWidth="2" opacity="0.9" />
                  <line x1="20" y1="8" x2="17" y2="11" stroke="#ff2255" strokeWidth="2" opacity="0.9" />
                  <line x1="8" y1="20" x2="11" y2="17" stroke="#ff2255" strokeWidth="2" opacity="0.9" />
                  <line x1="20" y1="20" x2="17" y2="17" stroke="#ff2255" strokeWidth="2" opacity="0.9" />
                </>
              )}
            </svg>
          </div>

          {/* Damage direction indicator */}
          {showDmgDir && (
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: `translate(-50%, -50%) rotate(${dmgAngle}rad)`,
                width: 160,
                height: 160,
                pointerEvents: "none",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 30,
                  height: 6,
                  background: "#ff2255",
                  borderRadius: 3,
                  opacity: 0.7,
                  boxShadow: "0 0 10px #ff2255",
                }}
              />
            </div>
          )}

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

          {/* Kills — under wave */}
          <div style={{ position: "absolute", top: 72, left: 30 }}>
            <div style={{ color: "#ff225588", fontSize: 11, letterSpacing: 2 }}>
              KILLS
            </div>
            <div
              style={{
                color: "#ff2255",
                fontSize: 18,
                fontWeight: "bold",
              }}
            >
              {kills}
            </div>
          </div>

          {/* Weapon & Ammo — bottom right */}
          <div
            style={{
              position: "absolute",
              bottom: 30,
              right: 30,
              textAlign: "right",
            }}
          >
            <div
              style={{
                color: WEAPON_DISPLAY[currentWeapon].color,
                fontSize: 11,
                letterSpacing: 2,
                marginBottom: 4,
              }}
            >
              {WEAPON_DISPLAY[currentWeapon].name}
            </div>
            <div
              style={{
                color: WEAPON_DISPLAY[currentWeapon].color,
                fontSize: 24,
                fontWeight: "bold",
                textShadow: `0 0 8px ${WEAPON_DISPLAY[currentWeapon].color}`,
              }}
            >
              {weaponAmmo[currentWeapon] === -1 ? "∞" : weaponAmmo[currentWeapon]}
            </div>
            {/* Weapon slots — only show when other weapons are available */}
            {(weaponAmmo.shotgun > 0 || weaponAmmo.plasma > 0) && (
            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 8 }}>
              {(["blaster", "shotgun", "plasma"] as WeaponType[]).map((w) => {
                const display = WEAPON_DISPLAY[w];
                const ammo = weaponAmmo[w];
                const active = currentWeapon === w;
                const available = ammo === -1 || ammo > 0;
                if (!available && !active) return null;
                return (
                  <div
                    key={w}
                    style={{
                      padding: "2px 6px",
                      fontSize: 9,
                      letterSpacing: 1,
                      border: `1px solid ${active ? display.color : display.color + "44"}`,
                      color: active ? display.color : display.color + "88",
                      background: active ? display.color + "22" : "transparent",
                      borderRadius: 2,
                    }}
                  >
                    {w === "blaster" ? "1" : w === "shotgun" ? "2" : "3"}
                  </div>
                );
              })}
            </div>
            )}
          </div>

          {/* ═══ MINI-RADAR ═══ */}
          <div
            style={{
              position: "absolute",
              bottom: 70,
              left: 30,
              width: 100,
              height: 100,
            }}
          >
            <svg
              width="100"
              height="100"
              viewBox="-50 -50 100 100"
              style={{ overflow: "visible" }}
            >
              {/* Background circle */}
              <circle cx="0" cy="0" r="48" fill="rgba(0,0,0,0.5)" stroke="#00d4ff33" strokeWidth="1" />
              {/* Range rings */}
              <circle cx="0" cy="0" r="24" fill="none" stroke="#00d4ff15" strokeWidth="0.5" />
              <circle cx="0" cy="0" r="48" fill="none" stroke="#00d4ff22" strokeWidth="0.5" />
              {/* Cross lines */}
              <line x1="0" y1="-48" x2="0" y2="48" stroke="#00d4ff15" strokeWidth="0.5" />
              <line x1="-48" y1="0" x2="48" y2="0" stroke="#00d4ff15" strokeWidth="0.5" />
              {/* Forward direction indicator */}
              <polygon points="0,-46 -3,-40 3,-40" fill="#00d4ff66" />
              {/* Enemy dots — rotated to match camera facing */}
              <g transform={`rotate(${(-playerYaw * 180) / Math.PI})`}>
                {radarDots
                  .filter((d) => d.alive)
                  .map((dot, i) => {
                    const radarScale = 48 / 30; // 30 units = edge of radar
                    const rx = dot.x * radarScale;
                    const rz = -dot.z * radarScale;
                    // Clamp to radar bounds
                    const dist = Math.sqrt(rx * rx + rz * rz);
                    const clampedDist = Math.min(dist, 46);
                    const scale = dist > 0 ? clampedDist / dist : 0;
                    const cx = rx * scale;
                    const cy = rz * scale;
                    const dotColor =
                      dot.type === "drone"
                        ? "#ff2255"
                        : dot.type === "sentinel"
                          ? "#ff8800"
                          : "#ff0044";
                    return (
                      <circle
                        key={i}
                        cx={cx}
                        cy={cy}
                        r={dot.type === "heavy" ? 3.5 : 2.5}
                        fill={dotColor}
                        opacity={dist > 46 ? 0.4 : 0.9}
                      />
                    );
                  })}
              </g>
              {/* Player dot */}
              <circle cx="0" cy="0" r="2" fill="#00d4ff" />
            </svg>
            <div
              style={{
                textAlign: "center",
                color: "#00d4ff44",
                fontSize: 9,
                letterSpacing: 2,
                marginTop: 2,
              }}
            >
              RADAR
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

          {/* ═══ WAVE ANNOUNCEMENT BANNER ═══ */}
          {showWaveBanner && (
            <div
              style={{
                position: "absolute",
                top: "35%",
                left: "50%",
                transform: "translateX(-50%)",
                textAlign: "center",
                animation: "waveBannerIn 0.3s ease-out",
              }}
            >
              <div
                style={{
                  color: "#7b2ff7",
                  fontSize: 16,
                  letterSpacing: 6,
                  marginBottom: 4,
                  textShadow: "0 0 15px #7b2ff7",
                }}
              >
                INCOMING
              </div>
              <div
                style={{
                  color: "#fff",
                  fontSize: 52,
                  fontWeight: "bold",
                  textShadow: "0 0 30px #00d4ff, 0 0 60px #00d4ff44",
                  letterSpacing: 8,
                }}
              >
                WAVE {waveBannerNum}
              </div>
            </div>
          )}
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
            <div>
              <span style={{ color: "#00d4ff" }}>1/2/3</span> — Switch weapon
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
              marginBottom: 10,
            }}
          >
            {(finalScore ?? score).toLocaleString()}
          </div>
          <div
            style={{
              color: "#ffffff66",
              fontSize: 13,
              letterSpacing: 2,
              marginBottom: 30,
            }}
          >
            WAVE {wave} • {kills} KILLS
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
