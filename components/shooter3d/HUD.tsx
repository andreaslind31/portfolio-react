"use client";

import { useState, useEffect } from "react";
import type { WeaponType } from "./Weapon";
import { MAPS, type MapConfig } from "./Maps";

export type Difficulty = "easy" | "normal" | "hard" | "nightmare";

const DIFFICULTY_META: Record<Difficulty, { label: string; color: string; desc: string }> = {
  easy:      { label: "EASY",      color: "#4a90c8", desc: "Weakened foes. Generous pickups." },
  normal:    { label: "NORMAL",    color: "#8a7a3a", desc: "Baseline challenge." },
  hard:      { label: "HARD",      color: "#cc4400", desc: "Faster, tougher, meaner." },
  nightmare: { label: "NIGHTMARE", color: "#8B0000", desc: "No mercy. Scarce resources." },
};

export interface RadarDot {
  x: number;
  z: number;
  type: "drone" | "sentinel" | "heavy" | "boss";
  alive: boolean;
}

interface WeaponDisplay {
  name: string;
  color: string;
}

export interface ScorePopup {
  id: number;
  text: string;
  x: number;
  y: number;
  time: number;
}

const WEAPON_DISPLAY: Record<WeaponType, WeaponDisplay> = {
  blaster: { name: "PISTOL", color: "#c8a848" },
  shotgun: { name: "SHOTGUN", color: "#cc8844" },
  plasma: { name: "PLASMA", color: "#33aa33" },
  rocket: { name: "ROCKET", color: "#cc4400" },
};

interface HUDProps {
  health: number;
  maxHealth: number;
  armor: number;
  maxArmor: number;
  difficulty: Difficulty;
  onSelectDifficulty: (d: Difficulty) => void;
  playerMoving: boolean;
  score: number;
  wave: number;
  currentWeapon: WeaponType;
  weaponAmmo: Record<WeaponType, number>;
  locked: boolean;
  gameState: "menu" | "modeSelect" | "mapSelect" | "multiplayer" | "playing" | "gameover" | "victory";
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
  killStreakText: string;
  scorePopups: ScorePopup[];
  bossHp: number;
  bossMaxHp: number;
  comboMultiplier: number;
  comboTimer: number;
  // Settings
  mouseSensitivity: number;
  onSensitivityChange: (v: number) => void;
  // Game over stats
  shotsFired: number;
  shotsHit: number;
  gameStartTime: number;
  gameEndTime: number;
  weaponKills: Record<WeaponType, number>;
  // Map/mode selection
  gameMode: "waves" | "maps";
  unlockedMaps: string[];
  onSelectMode: (mode: "waves" | "maps") => void;
  onSelectMap: (mapId: string) => void;
  onBackToMenu: () => void;
  onNextMap: () => void;
  clearedMap?: MapConfig | null;
  hasNextMap: boolean;
  onMultiplayer: () => void;
  pendingMode: "waves" | "maps";
}

export default function HUD({
  health,
  maxHealth,
  armor,
  maxArmor,
  difficulty,
  onSelectDifficulty,
  playerMoving,
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
  killStreakText,
  scorePopups,
  bossHp,
  bossMaxHp,
  comboMultiplier,
  comboTimer,
  mouseSensitivity,
  onSensitivityChange,
  shotsFired,
  shotsHit,
  gameStartTime,
  gameEndTime,
  weaponKills,
  gameMode,
  unlockedMaps,
  onSelectMode,
  onSelectMap,
  onBackToMenu,
  onNextMap,
  clearedMap,
  hasNextMap,
  onMultiplayer,
  pendingMode,
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
    healthPct > 60 ? "#8a7a3a" : healthPct > 30 ? "#8a7a3a" : "#8B0000";

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
          {/* Crosshair — blooms while moving */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            }}
          >
            {(() => {
              const bloom = playerMoving ? 6 : 0; // pixels the ticks push outward
              const ringR = (hitMarker ? 11 : 9) + bloom;
              const strokeColor = hitMarker ? "#8B0000" : "#7a8a3a";
              return (
                <svg width="40" height="40" viewBox="0 0 40 40">
                  {/* Outer ring — expands on hit and while moving */}
                  <circle
                    cx="20"
                    cy="20"
                    r={ringR}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={hitMarker ? 2 : 1}
                    opacity={hitMarker ? 1 : 0.5}
                    style={{ transition: "all 0.1s ease-out" }}
                  />
                  {/* Crosshair tick marks — pushed outward by `bloom` */}
                  <g style={{ transition: "all 0.1s ease-out" }} opacity="0.85">
                    <line x1="20" y1={8 - bloom} x2="20" y2={15 - bloom} stroke={strokeColor} strokeWidth="1.5" />
                    <line x1="20" y1={25 + bloom} x2="20" y2={32 + bloom} stroke={strokeColor} strokeWidth="1.5" />
                    <line x1={8 - bloom} y1="20" x2={15 - bloom} y2="20" stroke={strokeColor} strokeWidth="1.5" />
                    <line x1={25 + bloom} y1="20" x2={32 + bloom} y2="20" stroke={strokeColor} strokeWidth="1.5" />
                  </g>
                  {/* Center dot */}
                  <circle cx="20" cy="20" r={hitMarker ? 2.5 : 1.5} fill={strokeColor} opacity="0.9" />
                  {/* Hit X marks */}
                  {hitMarker && (
                    <>
                      <line x1="14" y1="14" x2="17" y2="17" stroke="#8B0000" strokeWidth="2" opacity="0.9" />
                      <line x1="26" y1="14" x2="23" y2="17" stroke="#8B0000" strokeWidth="2" opacity="0.9" />
                      <line x1="14" y1="26" x2="17" y2="23" stroke="#8B0000" strokeWidth="2" opacity="0.9" />
                      <line x1="26" y1="26" x2="23" y2="23" stroke="#8B0000" strokeWidth="2" opacity="0.9" />
                    </>
                  )}
                </svg>
              );
            })()}
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
                  background: "#8B0000",
                  borderRadius: 3,
                  opacity: 0.7,
                  boxShadow: "0 0 10px #8B0000",
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
            {/* Armor bar */}
            <div style={{ color: "#4a90c8", fontSize: 12, letterSpacing: 2, marginTop: 4 }}>
              ARMOR
            </div>
            <div
              style={{
                width: 200,
                height: 6,
                background: "rgba(255,255,255,0.08)",
                borderRadius: 3,
                overflow: "hidden",
                border: "1px solid #4a90c844",
              }}
            >
              <div
                style={{
                  width: `${Math.max(0, (armor / maxArmor) * 100)}%`,
                  height: "100%",
                  background: "#4a90c8",
                  boxShadow: "0 0 8px #4a90c8",
                  transition: "width 0.3s",
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
            <div style={{ color: "#7a8a3a", fontSize: 12, letterSpacing: 2 }}>
              SCORE
            </div>
            <div
              style={{
                color: "#fff",
                fontSize: 28,
                fontWeight: "bold",
                textShadow: "0 0 6px #7a8a3a",
              }}
            >
              {score.toLocaleString()}
            </div>
            {comboMultiplier > 1 && comboTimer > 0 && (
              <div style={{ color: "#ffdd44", fontSize: 14, fontWeight: "bold", textShadow: "0 0 8px #ffdd44", marginTop: 2 }}>
                x{comboMultiplier.toFixed(1)}
              </div>
            )}
          </div>

          {/* Wave / Map — top left */}
          <div style={{ position: "absolute", top: 30, left: 30 }}>
            <div style={{ color: "#8B4513", fontSize: 12, letterSpacing: 2 }}>
              WAVE
            </div>
            <div
              style={{
                color: "#fff",
                fontSize: 28,
                fontWeight: "bold",
                textShadow: "0 0 6px #8B4513",
              }}
            >
              {wave}
            </div>
          </div>

          {/* Kills — under wave */}
          <div style={{ position: "absolute", top: 72, left: 30 }}>
            <div style={{ color: "#8B000088", fontSize: 11, letterSpacing: 2 }}>
              KILLS
            </div>
            <div
              style={{
                color: "#8B0000",
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
            {(weaponAmmo.shotgun > 0 || weaponAmmo.plasma > 0 || weaponAmmo.rocket > 0) && (
            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 8 }}>
              {(["blaster", "shotgun", "plasma", "rocket"] as WeaponType[]).map((w) => {
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
                    {w === "blaster" ? "1" : w === "shotgun" ? "2" : w === "plasma" ? "3" : "4"}
                  </div>
                );
              })}
            </div>
            )}
          </div>

          {/* ═══ BOSS HEALTH BAR ═══ */}
          {bossHp > 0 && bossMaxHp > 0 && (
            <div
              style={{
                position: "absolute",
                top: 65,
                left: "50%",
                transform: "translateX(-50%)",
                textAlign: "center",
                width: 300,
              }}
            >
              <div style={{ color: "#ff0000", fontSize: 11, letterSpacing: 3, marginBottom: 4, textShadow: "0 0 8px #ff0000" }}>
                BOSS
              </div>
              <div
                style={{
                  width: "100%",
                  height: 10,
                  background: "rgba(255,255,255,0.1)",
                  borderRadius: 5,
                  overflow: "hidden",
                  border: "1px solid #ff000044",
                }}
              >
                <div
                  style={{
                    width: `${Math.max(0, (bossHp / bossMaxHp) * 100)}%`,
                    height: "100%",
                    background: "linear-gradient(90deg, #ff0000, #ff4444)",
                    boxShadow: "0 0 10px #ff0000",
                    transition: "width 0.2s",
                  }}
                />
              </div>
            </div>
          )}

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
              <circle cx="0" cy="0" r="48" fill="rgba(0,0,0,0.5)" stroke="#7a8a3a33" strokeWidth="1" />
              {/* Range rings */}
              <circle cx="0" cy="0" r="24" fill="none" stroke="#7a8a3a15" strokeWidth="0.5" />
              <circle cx="0" cy="0" r="48" fill="none" stroke="#7a8a3a22" strokeWidth="0.5" />
              {/* Cross lines */}
              <line x1="0" y1="-48" x2="0" y2="48" stroke="#7a8a3a15" strokeWidth="0.5" />
              <line x1="-48" y1="0" x2="48" y2="0" stroke="#7a8a3a15" strokeWidth="0.5" />
              {/* Forward direction indicator */}
              <polygon points="0,-46 -3,-40 3,-40" fill="#7a8a3a66" />
              {/* Enemy dots — rotated to match camera facing */}
              <g transform={`rotate(${(playerYaw * 180) / Math.PI})`}>
                {radarDots
                  .filter((d) => d.alive)
                  .map((dot, i) => {
                    const radarScale = 48 / 50; // 50 units = edge of radar (matches large maps)
                    const rx = dot.x * radarScale;
                    const rz = dot.z * radarScale;
                    // Clamp to radar bounds
                    const dist = Math.sqrt(rx * rx + rz * rz);
                    const clampedDist = Math.min(dist, 46);
                    const scale = dist > 0 ? clampedDist / dist : 0;
                    const cx = rx * scale;
                    const cy = rz * scale;
                    const dotColor =
                      dot.type === "drone"
                        ? "#8B0000"
                        : dot.type === "sentinel"
                          ? "#B22222"
                          : "#660000";
                    return (
                      <circle
                        key={i}
                        cx={cx}
                        cy={cy}
                        r={dot.type === "boss" ? 5 : dot.type === "heavy" ? 3.5 : 2.5}
                        fill={dotColor}
                        opacity={dist > 46 ? 0.4 : 0.9}
                      />
                    );
                  })}
              </g>
              {/* Player dot */}
              <circle cx="0" cy="0" r="2" fill="#7a8a3a" />
            </svg>
            <div
              style={{
                textAlign: "center",
                color: "#7a8a3a44",
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
                  color: "#8B4513",
                  fontSize: 16,
                  letterSpacing: 6,
                  marginBottom: 4,
                  textShadow: "0 0 8px #8B4513",
                }}
              >
                INCOMING
              </div>
              <div
                style={{
                  color: "#fff",
                  fontSize: 52,
                  fontWeight: "bold",
                  textShadow: "0 0 15px #8B0000, 0 0 30px #8B000044",
                  letterSpacing: 8,
                }}
              >
                WAVE {waveBannerNum}
              </div>
            </div>
          )}

          {/* ═══ KILL STREAK BANNER ═══ */}
          {killStreakText && (
            <div
              style={{
                position: "absolute",
                top: "25%",
                left: "50%",
                transform: "translateX(-50%)",
                color: "#ff4444",
                fontSize: 32,
                fontWeight: "bold",
                letterSpacing: 6,
                textShadow: "0 0 20px #ff4444, 0 0 40px #ff444444",
                textAlign: "center",
              }}
            >
              {killStreakText}
            </div>
          )}

          {/* ═══ SCORE POPUPS ═══ */}
          {scorePopups.map((popup) => (
            <div
              key={popup.id}
              style={{
                position: "absolute",
                left: `${popup.x}%`,
                top: `${popup.y}%`,
                color: "#ffdd44",
                fontSize: 20,
                fontWeight: "bold",
                textShadow: "0 0 8px #ffdd44",
                pointerEvents: "none",
                animation: "scorePopup 1s ease-out forwards",
              }}
            >
              {popup.text}
            </div>
          ))}
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
              color: "#8B0000",
              fontSize: 48,
              fontWeight: "bold",
              textShadow: "0 0 15px #8B0000, 0 0 30px #8B000044",
              marginBottom: 8,
              letterSpacing: 6,
            }}
          >
            DOOM STRIKER
          </h1>
          <p
            style={{
              color: "#8B4513",
              fontSize: 14,
              letterSpacing: 4,
              marginBottom: 40,
            }}
          >
            HELLFIRE ARENA
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
              <span style={{ color: "#7a8a3a" }}>WASD</span> — Move
            </div>
            <div>
              <span style={{ color: "#7a8a3a" }}>MOUSE</span> — Aim
            </div>
            <div>
              <span style={{ color: "#7a8a3a" }}>CLICK</span> — Shoot
            </div>
            <div>
              <span style={{ color: "#7a8a3a" }}>SPACE</span> — Jump
            </div>
            <div>
              <span style={{ color: "#7a8a3a" }}>1/2/3</span> — Switch weapon
            </div>
          </div>

          {/* Sensitivity slider */}
          <div style={{ marginBottom: 30, textAlign: "center" }}>
            <div style={{ color: "#ffffff88", fontSize: 11, letterSpacing: 2, marginBottom: 6 }}>
              MOUSE SENSITIVITY
            </div>
            <input
              type="range"
              min="0.0005"
              max="0.005"
              step="0.0005"
              value={mouseSensitivity}
              onChange={(e) => onSensitivityChange(parseFloat(e.target.value))}
              style={{ width: 180, accentColor: "#00d4ff" }}
            />
            <div style={{ color: "#00d4ff88", fontSize: 10, marginTop: 2 }}>
              {(mouseSensitivity * 1000).toFixed(1)}
            </div>
          </div>

          <button
            onClick={onStart}
            style={{
              background: "transparent",
              border: "2px solid #7a8a3a",
              color: "#7a8a3a",
              padding: "14px 48px",
              fontSize: 18,
              letterSpacing: 4,
              cursor: "pointer",
              transition: "all 0.2s",
              textShadow: "0 0 6px #7a8a3a",
              boxShadow: "0 0 10px #7a8a3a44, inset 0 0 10px #7a8a3a11",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#7a8a3a22";
              e.currentTarget.style.boxShadow =
                "0 0 15px #7a8a3a88, inset 0 0 15px #7a8a3a22";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.boxShadow =
                "0 0 10px #7a8a3a44, inset 0 0 10px #7a8a3a11";
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

      {/* ═══ MODE SELECT ═══ */}
      {gameState === "modeSelect" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(4px)",
          }}
        >
          <h2
            style={{
              color: "#00d4ff",
              fontSize: 32,
              fontWeight: "bold",
              letterSpacing: 6,
              textShadow: "0 0 20px #00d4ff",
              marginBottom: 10,
            }}
          >
            SELECT MODE
          </h2>
          <p style={{ color: "#7b2ff7", fontSize: 12, letterSpacing: 3, marginBottom: 24 }}>
            CHOOSE YOUR BATTLE
          </p>

          {/* Difficulty picker */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 28 }}>
            <div style={{ color: "#ffffff88", fontSize: 11, letterSpacing: 3, marginBottom: 10 }}>
              DIFFICULTY
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {(["easy", "normal", "hard", "nightmare"] as Difficulty[]).map((d) => {
                const meta = DIFFICULTY_META[d];
                const active = difficulty === d;
                return (
                  <button
                    key={d}
                    onClick={() => onSelectDifficulty(d)}
                    style={{
                      background: active ? `${meta.color}33` : "transparent",
                      border: `1px solid ${meta.color}${active ? "" : "66"}`,
                      color: meta.color,
                      padding: "8px 14px",
                      fontSize: 11,
                      letterSpacing: 2,
                      cursor: "pointer",
                      fontFamily: "'Courier New', monospace",
                      textShadow: active ? `0 0 8px ${meta.color}` : "none",
                      boxShadow: active ? `0 0 12px ${meta.color}55` : "none",
                      minWidth: 100,
                    }}
                  >
                    {meta.label}
                  </button>
                );
              })}
            </div>
            <div style={{ color: `${DIFFICULTY_META[difficulty].color}cc`, fontSize: 10, letterSpacing: 1, marginTop: 8, minHeight: 14 }}>
              {DIFFICULTY_META[difficulty].desc}
            </div>
          </div>

          <div style={{ display: "flex", gap: 24 }}>
            {/* Waves button */}
            <button
              onClick={() => onSelectMode("waves")}
              style={{
                background: "transparent",
                border: "2px solid #00d4ff",
                color: "#00d4ff",
                padding: "24px 32px",
                width: 240,
                cursor: "pointer",
                textShadow: "0 0 10px #00d4ff",
                boxShadow: "0 0 20px #00d4ff44",
                fontFamily: "'Courier New', monospace",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#00d4ff22"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <div style={{ fontSize: 24, fontWeight: "bold", letterSpacing: 4, marginBottom: 8 }}>
                WAVES
              </div>
              <div style={{ fontSize: 11, color: "#00d4ff99", lineHeight: 1.6 }}>
                Endless waves of increasing difficulty. Survive as long as you can.
              </div>
            </button>

            {/* Maps button */}
            <button
              onClick={() => onSelectMode("maps")}
              style={{
                background: "transparent",
                border: "2px solid #ff8800",
                color: "#ff8800",
                padding: "24px 32px",
                width: 240,
                cursor: "pointer",
                textShadow: "0 0 10px #ff8800",
                boxShadow: "0 0 20px #ff880044",
                fontFamily: "'Courier New', monospace",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#ff880022"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <div style={{ fontSize: 24, fontWeight: "bold", letterSpacing: 4, marginBottom: 8 }}>
                MAPS
              </div>
              <div style={{ fontSize: 11, color: "#ff880099", lineHeight: 1.6 }}>
                Campaign mode. Clear each map to unlock the next.
              </div>
            </button>
          </div>

          {/* Multiplayer button */}
          <button
            onClick={onMultiplayer}
            style={{
              marginTop: 16,
              background: "transparent",
              border: "2px solid #ff6622",
              color: "#ff6622",
              padding: "14px 40px",
              fontSize: 14,
              letterSpacing: 3,
              cursor: "pointer",
              textShadow: "0 0 10px #ff6622",
              boxShadow: "0 0 15px #ff662233",
              fontFamily: "'Courier New', monospace",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#ff662222"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            MULTIPLAYER
          </button>

          <button
            onClick={onBackToMenu}
            style={{
              marginTop: 20,
              background: "transparent",
              border: "1px solid #ffffff33",
              color: "#ffffff88",
              padding: "8px 24px",
              fontSize: 11,
              letterSpacing: 2,
              cursor: "pointer",
              fontFamily: "'Courier New', monospace",
            }}
          >
            ← BACK
          </button>
        </div>
      )}

      {/* ═══ MAP SELECT ═══ */}
      {gameState === "mapSelect" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(4px)",
            padding: 20,
          }}
        >
          <h2
            style={{
              color: "#ff8800",
              fontSize: 28,
              fontWeight: "bold",
              letterSpacing: 6,
              textShadow: "0 0 20px #ff8800",
              marginBottom: 6,
            }}
          >
            SELECT MAP
          </h2>
          <p style={{ color: "#ffffff66", fontSize: 11, letterSpacing: 2, marginBottom: 4 }}>
            {pendingMode === "waves" ? "WAVES MODE" : "CAMPAIGN MODE"}
          </p>
          <p style={{ color: "#ffffff44", fontSize: 10, letterSpacing: 2, marginBottom: 24 }}>
            {pendingMode === "waves"
              ? "All maps available — choose your arena"
              : `${unlockedMaps.length} / ${MAPS.length} UNLOCKED`}
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 16,
              maxWidth: 700,
            }}
          >
            {MAPS.map((map, idx) => {
              const unlocked = pendingMode === "waves" || unlockedMaps.includes(map.id);
              return (
                <button
                  key={map.id}
                  onClick={() => unlocked && onSelectMap(map.id)}
                  disabled={!unlocked}
                  style={{
                    background: "rgba(0,0,0,0.6)",
                    border: `2px solid ${unlocked ? map.ambientColor : "#33333366"}`,
                    padding: 0,
                    cursor: unlocked ? "pointer" : "not-allowed",
                    opacity: unlocked ? 1 : 0.35,
                    transition: "all 0.2s",
                    boxShadow: unlocked ? `0 0 20px ${map.ambientColor}44` : "none",
                    fontFamily: "'Courier New', monospace",
                    textAlign: "left",
                    overflow: "hidden",
                  }}
                  onMouseEnter={(e) => {
                    if (unlocked) e.currentTarget.style.boxShadow = `0 0 30px ${map.ambientColor}88`;
                  }}
                  onMouseLeave={(e) => {
                    if (unlocked) e.currentTarget.style.boxShadow = `0 0 20px ${map.ambientColor}44`;
                  }}
                >
                  {/* Procedural thumbnail */}
                  <div style={{ height: 80, background: map.fogColor, position: "relative", overflow: "hidden" }}>
                    <svg width="100%" height="80" viewBox="0 0 200 80" style={{ display: "block" }}>
                      {/* Cross-shaped facility diagram */}
                      <rect x="70" y="20" width="60" height="40" fill={map.ambientColor} opacity="0.3" />
                      <rect x="90" y="0" width="20" height="20" fill={map.ambientColor} opacity="0.25" />
                      <rect x="90" y="60" width="20" height="20" fill={map.ambientColor} opacity="0.25" />
                      <rect x="50" y="30" width="20" height="20" fill={map.ambientColor} opacity="0.25" />
                      <rect x="130" y="30" width="20" height="20" fill={map.ambientColor} opacity="0.25" />
                      {/* Center dot */}
                      <circle cx="100" cy="40" r="3" fill={map.ambientColor} />
                      {/* Enemy icons (red dots scattered) */}
                      {Array.from({ length: Math.min(idx + 3, 8) }).map((_, i) => {
                        const a = (i / 8) * Math.PI * 2;
                        return (
                          <circle
                            key={i}
                            cx={100 + Math.cos(a) * (20 + i * 2)}
                            cy={40 + Math.sin(a) * (15 + i * 1.5)}
                            r={map.enemies.bosses > 0 && i === 0 ? 4 : 2}
                            fill={map.enemies.bosses > 0 && i === 0 ? "#ff0000" : "#ff4444"}
                            opacity={0.8}
                          />
                        );
                      })}
                      {/* Lock overlay */}
                      {!unlocked && (
                        <>
                          <rect x="0" y="0" width="200" height="80" fill="rgba(0,0,0,0.7)" />
                          <text x="100" y="50" textAnchor="middle" fill="#ffffff66" fontSize="22">🔒</text>
                        </>
                      )}
                    </svg>
                  </div>
                  <div style={{ padding: 12 }}>
                    <div style={{ color: unlocked ? map.ambientColor : "#666", fontSize: 10, letterSpacing: 2, marginBottom: 2 }}>
                      {(idx + 1).toString().padStart(2, "0")} / {MAPS.length.toString().padStart(2, "0")}
                    </div>
                    <div style={{ color: unlocked ? "#fff" : "#666", fontSize: 14, fontWeight: "bold", letterSpacing: 3, marginBottom: 4 }}>
                      {map.name}
                    </div>
                    <div style={{ color: unlocked ? "#ffffff88" : "#444", fontSize: 10, lineHeight: 1.4, marginBottom: 6 }}>
                      {map.description}
                    </div>
                    <div style={{ color: unlocked ? "#ff8800" : "#444", fontSize: 10 }}>
                      {map.enemies.drones + map.enemies.sentinels + map.enemies.heavies + map.enemies.bosses} ENEMIES
                      {map.enemies.bosses > 0 && " • BOSS"}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => onSelectMode("waves")}
            style={{
              marginTop: 24,
              background: "transparent",
              border: "1px solid #ffffff33",
              color: "#ffffff88",
              padding: "8px 24px",
              fontSize: 11,
              letterSpacing: 2,
              cursor: "pointer",
              fontFamily: "'Courier New', monospace",
            }}
          >
            ← BACK
          </button>
        </div>
      )}

      {/* ═══ VICTORY (map cleared) ═══ */}
      {gameState === "victory" && clearedMap && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(4px)",
          }}
        >
          <h2
            style={{
              color: clearedMap.ambientColor,
              fontSize: 42,
              fontWeight: "bold",
              letterSpacing: 8,
              textShadow: `0 0 30px ${clearedMap.ambientColor}`,
              marginBottom: 8,
            }}
          >
            VICTORY
          </h2>
          <p style={{ color: "#ffffffaa", fontSize: 13, letterSpacing: 3, marginBottom: 4 }}>
            {clearedMap.name} CLEARED
          </p>
          <div style={{ color: "#00d4ff", fontSize: 36, fontWeight: "bold", textShadow: "0 0 15px #00d4ff", marginBottom: 4 }}>
            {score.toLocaleString()}
          </div>
          <div style={{ color: "#ffffff66", fontSize: 11, letterSpacing: 2, marginBottom: 24 }}>
            {kills} KILLS
            {gameEndTime > 0 && ` • ${Math.floor((gameEndTime - gameStartTime) / 1000)}s`}
            {shotsFired > 0 && ` • ${Math.round((shotsHit / shotsFired) * 100)}% ACCURACY`}
          </div>

          {hasNextMap ? (
            <button
              onClick={onNextMap}
              style={{
                background: "transparent",
                border: `2px solid ${clearedMap.ambientColor}`,
                color: clearedMap.ambientColor,
                padding: "12px 40px",
                fontSize: 16,
                letterSpacing: 4,
                cursor: "pointer",
                textShadow: `0 0 10px ${clearedMap.ambientColor}`,
                boxShadow: `0 0 20px ${clearedMap.ambientColor}44`,
                fontFamily: "'Courier New', monospace",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = `${clearedMap.ambientColor}22`; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              NEXT MAP
            </button>
          ) : (
            <div style={{ color: "#ffdd44", fontSize: 20, letterSpacing: 6, marginTop: 10, textShadow: "0 0 20px #ffdd44" }}>
              CAMPAIGN COMPLETE
            </div>
          )}

          <button
            onClick={onBackToMenu}
            style={{
              marginTop: 20,
              background: "transparent",
              border: "1px solid #ffffff33",
              color: "#ffffff88",
              padding: "8px 24px",
              fontSize: 11,
              letterSpacing: 2,
              cursor: "pointer",
              fontFamily: "'Courier New', monospace",
            }}
          >
            ← MAIN MENU
          </button>
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
              color: "#8B0000",
              fontSize: 42,
              fontWeight: "bold",
              textShadow: "0 0 15px #8B0000",
              letterSpacing: 6,
              marginBottom: 8,
            }}
          >
            YOU DIED
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
              color: "#7a8a3a",
              fontSize: 48,
              fontWeight: "bold",
              textShadow: "0 0 10px #7a8a3a",
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

          {/* Detailed stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 20px", marginBottom: 20, fontSize: 11, color: "#ffffff88", letterSpacing: 1 }}>
            <div>ACCURACY</div>
            <div style={{ color: "#00d4ff", textAlign: "right" }}>
              {shotsFired > 0 ? `${Math.round((shotsHit / shotsFired) * 100)}%` : "—"}
            </div>
            <div>TIME SURVIVED</div>
            <div style={{ color: "#00d4ff", textAlign: "right" }}>
              {gameEndTime > 0 ? `${Math.floor((gameEndTime - gameStartTime) / 1000)}s` : "—"}
            </div>
            <div>BEST WEAPON</div>
            <div style={{ color: "#00d4ff", textAlign: "right" }}>
              {(() => {
                const best = (Object.entries(weaponKills) as [WeaponType, number][])
                  .sort((a, b) => b[1] - a[1])[0];
                return best && best[1] > 0 ? `${WEAPON_DISPLAY[best[0]].name} (${best[1]})` : "—";
              })()}
            </div>
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
                  border: "1px solid #7a8a3a44",
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
                  background: "#7a8a3a22",
                  border: "1px solid #7a8a3a",
                  color: "#7a8a3a",
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
            <div style={{ color: "#8B0000", fontSize: 12, marginBottom: 10 }}>
              {submitError}
            </div>
          )}
          {submitted && (
            <div
              style={{
                color: "#7a8a3a",
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
              border: "2px solid #7a8a3a",
              color: "#7a8a3a",
              padding: "12px 40px",
              fontSize: 16,
              letterSpacing: 4,
              cursor: "pointer",
              textShadow: "0 0 6px #7a8a3a",
              boxShadow: "0 0 10px #7a8a3a44",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#7a8a3a22";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            {gameMode === "maps" ? "RETRY MAP" : "RETRY"}
          </button>
          {gameMode === "maps" && (
            <button
              onClick={() => onSelectMode("maps")}
              style={{
                marginTop: 12,
                background: "transparent",
                border: "1px solid #ffffff33",
                color: "#ffffff88",
                padding: "8px 24px",
                fontSize: 11,
                letterSpacing: 2,
                cursor: "pointer",
                fontFamily: "'Courier New', monospace",
              }}
            >
              ← BACK TO MAPS
            </button>
          )}
        </div>
      )}
    </div>
  );
}
