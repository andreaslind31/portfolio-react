"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import * as THREE from "three";
import Player from "./Player";
import Level from "./Level";
import Weapon from "./Weapon";
import HUD from "./HUD";
import Enemies, { type EnemyData } from "./Enemies";
import Projectiles, { type ProjectileData } from "./Projectiles";
import PostProcessing from "./PostProcessing";

// ── Game constants ───────────────────────────────────────
const MAX_HEALTH = 100;
const ENEMY_DAMAGE = 10;
const PLAYER_BULLET_DAMAGE = 25;
const ARENA_W = 30;
const ARENA_D = 40;
const PROJECTILE_SPEED = 40;
const PROJECTILE_LIFE = 3; // seconds
const ENEMY_SHOOT_COOLDOWN = 2; // seconds
const ENEMY_PROJECTILE_SPEED = 15;
const HIT_RADIUS = 1.0;
const PLAYER_HIT_RADIUS = 0.8;

// ── Spawn config per wave ────────────────────────────────
function getWaveConfig(wave: number) {
  const base = 2 + wave;
  const drones = Math.min(base, 8);
  const sentinels = wave >= 3 ? Math.floor((wave - 2) / 2) : 0;
  const heavies = wave >= 5 ? Math.floor((wave - 4) / 3) : 0;
  return { drones, sentinels, heavies };
}

let nextId = 1;

function spawnEnemies(wave: number): EnemyData[] {
  const config = getWaveConfig(wave);
  const enemies: EnemyData[] = [];

  const spawn = (type: EnemyData["type"], count: number, hp: number, speed: number) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 8 + Math.random() * 8;
      enemies.push({
        id: nextId++,
        position: new THREE.Vector3(
          Math.cos(angle) * dist,
          1.5,
          Math.sin(angle) * dist
        ),
        hp,
        maxHp: hp,
        type,
        alive: true,
        speed,
        bobOffset: Math.random() * Math.PI * 2,
      });
    }
  };

  spawn("drone", config.drones, 25 + wave * 5, 3 + wave * 0.2);
  spawn("sentinel", config.sentinels, 40 + wave * 5, 2);
  spawn("heavy", config.heavies, 80 + wave * 10, 1.2);

  return enemies;
}

// ── Hit flash overlay ────────────────────────────────────
function DamageFlash({ flash }: { flash: boolean }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "radial-gradient(ellipse at center, transparent 40%, #ff225544 100%)",
        pointerEvents: "none",
        opacity: flash ? 1 : 0,
        transition: "opacity 0.15s",
      }}
    />
  );
}

// ── Enemy AI + projectile updater (runs inside Canvas) ───
function GameLoop({
  enemies,
  setEnemies,
  projectiles,
  setProjectiles,
  playerPos,
  health,
  setHealth,
  setScore,
  gameState,
  setDamageFlash,
  setWave,
  wave,
}: {
  enemies: EnemyData[];
  setEnemies: React.Dispatch<React.SetStateAction<EnemyData[]>>;
  projectiles: ProjectileData[];
  setProjectiles: React.Dispatch<React.SetStateAction<ProjectileData[]>>;
  playerPos: React.MutableRefObject<THREE.Vector3>;
  health: number;
  setHealth: React.Dispatch<React.SetStateAction<number>>;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  gameState: "menu" | "playing" | "gameover";
  setDamageFlash: React.Dispatch<React.SetStateAction<boolean>>;
  setWave: React.Dispatch<React.SetStateAction<number>>;
  wave: number;
}) {
  const { camera } = useThree();
  const enemyShootTimers = useRef<Map<number, number>>(new Map());
  const waveCleared = useRef(false);

  useFrame((_, delta) => {
    if (gameState !== "playing") return;

    // Sync player position ref
    playerPos.current.copy(camera.position);

    const clampedDelta = Math.min(delta, 0.05); // prevent big jumps

    // ── Update enemies (AI movement + shooting) ──
    let allDead = true;
    setEnemies((prev) =>
      prev.map((e) => {
        if (!e.alive) return e;
        allDead = false;

        // Move toward player
        const dir = new THREE.Vector3()
          .subVectors(playerPos.current, e.position)
          .setY(0)
          .normalize();

        const dist = playerPos.current.distanceTo(e.position);

        // Keep distance: approach if far, orbit if close
        if (dist > 5) {
          e.position.addScaledVector(dir, e.speed * clampedDelta);
        } else if (dist < 3) {
          e.position.addScaledVector(dir, -e.speed * 0.5 * clampedDelta);
        } else {
          // Strafe
          const strafe = new THREE.Vector3(-dir.z, 0, dir.x);
          e.position.addScaledVector(strafe, e.speed * 0.5 * clampedDelta);
        }

        // Clamp to arena bounds
        const margin = 1;
        e.position.x = THREE.MathUtils.clamp(
          e.position.x,
          -ARENA_W / 2 + margin,
          ARENA_W / 2 - margin
        );
        e.position.z = THREE.MathUtils.clamp(
          e.position.z,
          -ARENA_D / 2 + margin,
          ARENA_D / 2 - margin
        );

        // Shooting
        const lastShot = enemyShootTimers.current.get(e.id) || 0;
        const now = performance.now() / 1000;
        if (now - lastShot > ENEMY_SHOOT_COOLDOWN && dist < 20) {
          enemyShootTimers.current.set(e.id, now);
          const shootDir = new THREE.Vector3()
            .subVectors(playerPos.current, e.position)
            .normalize();
          setProjectiles((prev) => [
            ...prev,
            {
              id: nextId++,
              position: e.position.clone().add(new THREE.Vector3(0, 0, 0)),
              direction: shootDir,
              speed: ENEMY_PROJECTILE_SPEED,
              alive: true,
              friendly: false,
              life: PROJECTILE_LIFE,
            },
          ]);
        }

        return e;
      })
    );

    // ── Wave cleared? ──
    if (allDead && enemies.length > 0 && !waveCleared.current) {
      waveCleared.current = true;
      setTimeout(() => {
        setWave((w) => {
          const next = w + 1;
          setEnemies(spawnEnemies(next));
          enemyShootTimers.current.clear();
          waveCleared.current = false;
          return next;
        });
      }, 1500);
    }

    // ── Update projectiles ──
    setProjectiles((prev) =>
      prev
        .map((p) => {
          if (!p.alive) return p;

          // Move
          p.position.addScaledVector(p.direction, p.speed * clampedDelta);
          p.life -= clampedDelta;

          // Out of bounds or expired
          if (
            p.life <= 0 ||
            Math.abs(p.position.x) > ARENA_W / 2 ||
            Math.abs(p.position.z) > ARENA_D / 2 ||
            p.position.y < -1 ||
            p.position.y > 6
          ) {
            p.alive = false;
          }

          // Friendly projectile hits enemy
          if (p.friendly && p.alive) {
            for (const e of enemies) {
              if (!e.alive) continue;
              const enemyWorldPos = e.position.clone();
              enemyWorldPos.y += 1.5; // match visual position
              if (p.position.distanceTo(enemyWorldPos) < HIT_RADIUS) {
                p.alive = false;
                e.hp -= PLAYER_BULLET_DAMAGE;
                if (e.hp <= 0) {
                  e.alive = false;
                  const points =
                    e.type === "drone" ? 100 : e.type === "sentinel" ? 200 : 500;
                  setScore((s) => s + points);
                }
                break;
              }
            }
          }

          // Enemy projectile hits player
          if (!p.friendly && p.alive) {
            if (p.position.distanceTo(playerPos.current) < PLAYER_HIT_RADIUS) {
              p.alive = false;
              setHealth((h) => Math.max(0, h - ENEMY_DAMAGE));
              setDamageFlash(true);
              setTimeout(() => setDamageFlash(false), 150);
            }
          }

          return p;
        })
        .filter((p) => p.alive)
    );
  });

  return null;
}

// ── Main component ───────────────────────────────────────
interface ShooterGame3DProps {
  onScoreSubmit?: (name: string, score: number) => Promise<string | null>;
}

export default function ShooterGame3D({ onScoreSubmit }: ShooterGame3DProps) {
  const [gameState, setGameState] = useState<"menu" | "playing" | "gameover">(
    "menu"
  );
  const [health, setHealth] = useState(MAX_HEALTH);
  const [score, setScore] = useState(0);
  const [wave, setWave] = useState(1);
  const [ammo, setAmmo] = useState(999);
  const [locked, setLocked] = useState(false);
  const [enemies, setEnemies] = useState<EnemyData[]>([]);
  const [projectiles, setProjectiles] = useState<ProjectileData[]>([]);
  const [damageFlash, setDamageFlash] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  const playerPos = useRef(new THREE.Vector3(0, 2, 5));
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // Detect touch device
  useEffect(() => {
    setIsTouchDevice("ontouchstart" in window || navigator.maxTouchPoints > 0);
  }, []);

  // Watch health for game over
  useEffect(() => {
    if (health <= 0 && gameState === "playing") {
      setFinalScore(score);
      setGameState("gameover");
      document.exitPointerLock?.();
      setLocked(false);
    }
  }, [health, gameState, score]);

  // Pointer lock change listener
  useEffect(() => {
    const handleChange = () => {
      const isLocked = document.pointerLockElement === canvasContainerRef.current;
      setLocked(isLocked);
      // If user escapes, don't change game state — they can re-click
    };
    document.addEventListener("pointerlockchange", handleChange);
    return () => document.removeEventListener("pointerlockchange", handleChange);
  }, []);

  const handleStart = useCallback(() => {
    setGameState("playing");
    setHealth(MAX_HEALTH);
    setScore(0);
    setWave(1);
    setAmmo(999);
    setProjectiles([]);
    nextId = 1;
    setEnemies(spawnEnemies(1));

    // Request pointer lock on the canvas container
    canvasContainerRef.current?.requestPointerLock?.();
  }, []);

  const handleRestart = useCallback(() => {
    handleStart();
  }, [handleStart]);

  const handleShoot = useCallback(
    (origin: THREE.Vector3, direction: THREE.Vector3) => {
      if (gameState !== "playing") return;
      setProjectiles((prev) => [
        ...prev,
        {
          id: nextId++,
          position: origin.clone(),
          direction: direction.clone().normalize(),
          speed: PROJECTILE_SPEED,
          alive: true,
          friendly: true,
          life: PROJECTILE_LIFE,
        },
      ]);
    },
    [gameState]
  );

  if (isTouchDevice) {
    return (
      <div
        style={{
          width: "100%",
          maxWidth: 900,
          aspectRatio: "16/9",
          background: "#0a0a15",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#00d4ff",
          fontFamily: "'Courier New', monospace",
          fontSize: 14,
          textAlign: "center",
          padding: 20,
          border: "1px solid #00d4ff33",
        }}
      >
        This game requires a keyboard and mouse.
        <br />
        Please play on a desktop or laptop.
      </div>
    );
  }

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        maxWidth: 900,
        aspectRatio: "16/9",
        borderRadius: 8,
        overflow: "hidden",
        border: "1px solid #00d4ff33",
        background: "#0a0a15",
      }}
    >
      <div
        ref={canvasContainerRef}
        style={{ width: "100%", height: "100%", cursor: locked ? "none" : "pointer" }}
        onClick={() => {
          if (gameState === "playing" && !locked) {
            canvasContainerRef.current?.requestPointerLock?.();
          }
        }}
      >
        <Canvas
          shadows
          gl={{
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.2,
          }}
          camera={{ fov: 75, near: 0.1, far: 100 }}
        >
          <Suspense fallback={null}>
            <fog attach="fog" args={["#0a0a15", 15, 45]} />
            <Physics gravity={[0, -15, 0]}>
              <Player locked={locked} />
              <Level />
            </Physics>
            <Weapon locked={locked} onShoot={handleShoot} />
            <Enemies enemies={enemies} playerPosition={playerPos.current} />
            <Projectiles projectiles={projectiles} />
            <GameLoop
              enemies={enemies}
              setEnemies={setEnemies}
              projectiles={projectiles}
              setProjectiles={setProjectiles}
              playerPos={playerPos}
              health={health}
              setHealth={setHealth}
              setScore={setScore}
              gameState={gameState}
              setDamageFlash={setDamageFlash}
              setWave={setWave}
              wave={wave}
            />
            <PostProcessing />
          </Suspense>
        </Canvas>
      </div>

      <HUD
        health={health}
        maxHealth={MAX_HEALTH}
        score={score}
        wave={wave}
        ammo={ammo}
        locked={locked}
        gameState={gameState}
        onStart={handleStart}
        onRestart={handleRestart}
        onScoreSubmit={onScoreSubmit}
        finalScore={finalScore}
      />

      <DamageFlash flash={damageFlash} />
    </div>
  );
}
