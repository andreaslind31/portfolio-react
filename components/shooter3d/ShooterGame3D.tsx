"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import * as THREE from "three";
import Player from "./Player";
import Level, { ARENA_HALF_W, ARENA_HALF_D, SPAWN_PORTALS } from "./Level";
import Weapon from "./Weapon";
import HUD, { type RadarDot } from "./HUD";
import Enemies, { type EnemyData } from "./Enemies";
import Projectiles, { type ProjectileData } from "./Projectiles";
import Particles, {
  type ParticleData,
  type ExplosionData,
  createImpactSparks,
  createDeathExplosion,
} from "./Particles";
import Pickups, { type PickupData } from "./Pickups";
import PostProcessing from "./PostProcessing";
import {
  playShootSound,
  playHitSound,
  playExplosionSound,
  playDamageSound,
  playWaveStartSound,
  playPickupSound,
  startAmbientHum,
} from "./SoundEngine";

// ── Game constants ───────────────────────────────────────
const MAX_HEALTH = 100;
const ENEMY_DAMAGE = 10;
const PLAYER_BULLET_DAMAGE = 25;
const PROJECTILE_SPEED = 40;
const PROJECTILE_LIFE = 3;
const ENEMY_PROJECTILE_SPEED = 15;
const HIT_RADIUS = 1.0;
const PLAYER_HIT_RADIUS = 0.8;
const PICKUP_RADIUS = 1.5;
const HEALTH_PICKUP_AMOUNT = 25;
const PICKUP_DROP_CHANCE = 0.35;

// ── Shoot cooldowns per enemy type ──────────────────────
const DRONE_SHOOT_CD = 1.5;
const SENTINEL_SHOOT_CD = 0.25; // burst interval
const SENTINEL_BURST_PAUSE = 3; // pause between bursts
const HEAVY_SHOOT_CD = 2.5;

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

  const spawn = (
    type: EnemyData["type"],
    count: number,
    hp: number,
    speed: number
  ) => {
    for (let i = 0; i < count; i++) {
      // Spawn near a random portal
      const portal =
        SPAWN_PORTALS[Math.floor(Math.random() * SPAWN_PORTALS.length)];
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        0,
        (Math.random() - 0.5) * 4
      );
      enemies.push({
        id: nextId++,
        position: new THREE.Vector3(
          portal[0] + offset.x,
          1.5,
          portal[2] + offset.z
        ),
        hp,
        maxHp: hp,
        type,
        alive: true,
        speed,
        bobOffset: Math.random() * Math.PI * 2,
        aiState: "engage",
        strafeDir: Math.random() > 0.5 ? 1 : -1,
        burstCount: type === "sentinel" ? 3 : 0,
        chargeTimer: 0,
      });
    }
  };

  spawn("drone", config.drones, 25 + wave * 5, 4 + wave * 0.2);
  spawn("sentinel", config.sentinels, 40 + wave * 5, 2.5);
  spawn("heavy", config.heavies, 80 + wave * 10, 1.5);

  return enemies;
}

// ── Hit flash overlay ────────────────────────────────────
function DamageFlash({ flash }: { flash: boolean }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background:
          "radial-gradient(ellipse at center, transparent 40%, #ff225544 100%)",
        pointerEvents: "none",
        opacity: flash ? 1 : 0,
        transition: "opacity 0.15s",
      }}
    />
  );
}

// ── Screen shake ─────────────────────────────────────────
function ScreenShake({
  shakeIntensity,
}: {
  shakeIntensity: React.MutableRefObject<number>;
}) {
  const { camera } = useThree();

  useFrame(() => {
    if (shakeIntensity.current > 0.001) {
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * shakeIntensity.current,
        (Math.random() - 0.5) * shakeIntensity.current,
        0
      );
      offset.applyQuaternion(camera.quaternion);
      camera.position.add(offset);
      shakeIntensity.current *= 0.88;
    }
  });

  return null;
}

// ── Enemy AI helpers ─────────────────────────────────────
function updateDroneAI(
  e: EnemyData,
  dir: THREE.Vector3,
  dist: number,
  dt: number
) {
  // Fast, erratic movement — strafe while approaching
  const strafe = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(
    e.strafeDir
  );

  if (dist > 8) {
    // Rush in, zigzagging
    e.position.addScaledVector(dir, e.speed * dt);
    e.position.addScaledVector(strafe, e.speed * 0.6 * dt);
  } else if (dist < 3) {
    e.position.addScaledVector(dir, -e.speed * 0.8 * dt);
  } else {
    // Orbit at medium range
    e.position.addScaledVector(strafe, e.speed * 0.8 * dt);
    e.position.addScaledVector(dir, e.speed * 0.15 * dt);
  }

  // Randomly flip strafe direction
  if (Math.random() < 0.01) e.strafeDir *= -1;
}

function updateSentinelAI(
  e: EnemyData,
  dir: THREE.Vector3,
  dist: number,
  dt: number
) {
  const strafe = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(
    e.strafeDir
  );

  // Sentinels prefer medium range — stay 8-14 units away
  if (dist > 14) {
    e.position.addScaledVector(dir, e.speed * dt);
  } else if (dist < 8) {
    e.position.addScaledVector(dir, -e.speed * 0.6 * dt);
    e.position.addScaledVector(strafe, e.speed * 0.3 * dt);
  } else {
    // Strafe at optimal range
    e.position.addScaledVector(strafe, e.speed * 0.5 * dt);
  }

  if (Math.random() < 0.005) e.strafeDir *= -1;
}

function updateHeavyAI(
  e: EnemyData,
  dir: THREE.Vector3,
  dist: number,
  dt: number
) {
  // Heavy: slow approach, then charge when close enough
  if (dist > 10) {
    e.aiState = "engage";
    e.position.addScaledVector(dir, e.speed * dt);
    e.chargeTimer = 0;
  } else if (dist > 4) {
    // Windup charge
    e.aiState = "charge";
    e.chargeTimer += dt;
    if (e.chargeTimer > 1) {
      // Charge!
      e.position.addScaledVector(dir, e.speed * 3 * dt);
    } else {
      // Slow approach during windup
      e.position.addScaledVector(dir, e.speed * 0.3 * dt);
    }
  } else {
    // Too close, slow retreat and shoot
    e.aiState = "retreat";
    e.position.addScaledVector(dir, -e.speed * 0.4 * dt);
    e.chargeTimer = 0;
  }
}

// ── Game Loop (runs inside Canvas) ───────────────────────
function GameLoop({
  enemies,
  setEnemies,
  projectiles,
  setProjectiles,
  particles,
  setParticles,
  explosions,
  setExplosions,
  pickups,
  setPickups,
  playerPos,
  playerYaw,
  health,
  setHealth,
  setScore,
  gameState,
  setDamageFlash,
  setWave,
  wave,
  shakeIntensity,
  setHitMarker,
  setKills,
  setDamageDirection,
  setWaveAnnounce,
  setRadarDots,
}: {
  enemies: EnemyData[];
  setEnemies: React.Dispatch<React.SetStateAction<EnemyData[]>>;
  projectiles: ProjectileData[];
  setProjectiles: React.Dispatch<React.SetStateAction<ProjectileData[]>>;
  particles: ParticleData[];
  setParticles: React.Dispatch<React.SetStateAction<ParticleData[]>>;
  explosions: ExplosionData[];
  setExplosions: React.Dispatch<React.SetStateAction<ExplosionData[]>>;
  pickups: PickupData[];
  setPickups: React.Dispatch<React.SetStateAction<PickupData[]>>;
  playerPos: React.MutableRefObject<THREE.Vector3>;
  playerYaw: React.MutableRefObject<number>;
  health: number;
  setHealth: React.Dispatch<React.SetStateAction<number>>;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  gameState: "menu" | "playing" | "gameover";
  setDamageFlash: React.Dispatch<React.SetStateAction<boolean>>;
  setWave: React.Dispatch<React.SetStateAction<number>>;
  wave: number;
  shakeIntensity: React.MutableRefObject<number>;
  setHitMarker: React.Dispatch<React.SetStateAction<boolean>>;
  setKills: React.Dispatch<React.SetStateAction<number>>;
  setDamageDirection: React.Dispatch<React.SetStateAction<number | null>>;
  setWaveAnnounce: React.Dispatch<React.SetStateAction<number>>;
  setRadarDots: React.Dispatch<React.SetStateAction<RadarDot[]>>;
}) {
  const { camera } = useThree();
  const enemyShootTimers = useRef<Map<number, number>>(new Map());
  const sentinelBurstTimers = useRef<Map<number, number>>(new Map());
  const waveCleared = useRef(false);
  const radarUpdateTimer = useRef(0);

  useFrame((state, delta) => {
    if (gameState !== "playing") return;

    playerPos.current.copy(camera.position);

    // Extract yaw from camera quaternion
    const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, "YXZ");
    playerYaw.current = euler.y;

    const dt = Math.min(delta, 0.05);

    // ── Update radar (throttled to ~10fps) ──
    radarUpdateTimer.current += dt;
    if (radarUpdateTimer.current > 0.1) {
      radarUpdateTimer.current = 0;
      setRadarDots(
        enemies.map((e) => ({
          x: e.position.x - playerPos.current.x,
          z: e.position.z - playerPos.current.z,
          type: e.type,
          alive: e.alive,
        }))
      );
    }

    // ── Update enemies ──
    setEnemies((prev) =>
      prev.map((e) => {
        if (!e.alive) return e;

        const dir = new THREE.Vector3()
          .subVectors(playerPos.current, e.position)
          .setY(0)
          .normalize();
        const dist = new THREE.Vector3()
          .subVectors(playerPos.current, e.position)
          .setY(0)
          .length();

        // Type-specific AI
        switch (e.type) {
          case "drone":
            updateDroneAI(e, dir, dist, dt);
            break;
          case "sentinel":
            updateSentinelAI(e, dir, dist, dt);
            break;
          case "heavy":
            updateHeavyAI(e, dir, dist, dt);
            break;
        }

        // Clamp to arena bounds
        const margin = 1.5;
        e.position.x = THREE.MathUtils.clamp(
          e.position.x,
          -ARENA_HALF_W + margin,
          ARENA_HALF_W - margin
        );
        e.position.z = THREE.MathUtils.clamp(
          e.position.z,
          -ARENA_HALF_D + margin,
          ARENA_HALF_D - margin
        );

        // ── Shooting logic per type ──
        const lastShot = enemyShootTimers.current.get(e.id) || 0;
        const now = performance.now() / 1000;

        if (e.type === "drone") {
          if (now - lastShot > DRONE_SHOOT_CD && dist < 18) {
            enemyShootTimers.current.set(e.id, now);
            fireEnemyProjectile(e, playerPos.current, setProjectiles);
          }
        } else if (e.type === "sentinel") {
          const lastBurst = sentinelBurstTimers.current.get(e.id) || 0;
          if (e.burstCount > 0 && now - lastShot > SENTINEL_SHOOT_CD && dist < 22) {
            enemyShootTimers.current.set(e.id, now);
            e.burstCount--;
            fireEnemyProjectile(e, playerPos.current, setProjectiles);
            if (e.burstCount <= 0) {
              sentinelBurstTimers.current.set(e.id, now);
            }
          } else if (
            e.burstCount <= 0 &&
            now - lastBurst > SENTINEL_BURST_PAUSE
          ) {
            e.burstCount = 3;
          }
        } else if (e.type === "heavy") {
          if (now - lastShot > HEAVY_SHOOT_CD && dist < 16) {
            enemyShootTimers.current.set(e.id, now);
            // Heavy fires a slightly faster, higher damage projectile
            fireEnemyProjectile(
              e,
              playerPos.current,
              setProjectiles,
              ENEMY_PROJECTILE_SPEED * 1.2
            );
          }
        }

        return e;
      })
    );

    // ── Wave cleared? ──
    // Compute from render-state directly (not from inside a state updater,
    // which React 18 may defer in useFrame).
    const allDead = enemies.length > 0 && enemies.every((e) => !e.alive);
    if (allDead && !waveCleared.current) {
      waveCleared.current = true;
      setTimeout(() => {
        setWave((w) => {
          const next = w + 1;
          setEnemies(spawnEnemies(next));
          enemyShootTimers.current.clear();
          sentinelBurstTimers.current.clear();
          waveCleared.current = false;
          setWaveAnnounce(next);
          playWaveStartSound();
          return next;
        });
      }, 1500);
    }

    // ── Update projectiles ──
    setProjectiles((prev) =>
      prev
        .map((p) => {
          if (!p.alive) return p;

          p.position.addScaledVector(p.direction, p.speed * dt);
          p.life -= dt;

          if (
            p.life <= 0 ||
            Math.abs(p.position.x) > ARENA_HALF_W ||
            Math.abs(p.position.z) > ARENA_HALF_D ||
            p.position.y < -1 ||
            p.position.y > 6
          ) {
            if (p.friendly && p.life > 0) {
              const normal = new THREE.Vector3(0, 1, 0);
              setParticles((pp) => [
                ...pp,
                ...createImpactSparks(
                  p.position.clone(),
                  normal,
                  "#00d4ff",
                  5
                ),
              ]);
            }
            p.alive = false;
          }

          // Friendly projectile hits enemy
          if (p.friendly && p.alive) {
            for (const e of enemies) {
              if (!e.alive) continue;
              const enemyWorldPos = e.position.clone();
              enemyWorldPos.y += 1.5;
              if (p.position.distanceTo(enemyWorldPos) < HIT_RADIUS) {
                p.alive = false;

                const hitNormal = new THREE.Vector3()
                  .subVectors(p.position, enemyWorldPos)
                  .normalize();
                setParticles((pp) => [
                  ...pp,
                  ...createImpactSparks(
                    p.position.clone(),
                    hitNormal,
                    "#00d4ff",
                    6
                  ),
                ]);
                playHitSound();

                setHitMarker(true);
                setTimeout(() => setHitMarker(false), 100);

                e.hp -= PLAYER_BULLET_DAMAGE;
                if (e.hp <= 0) {
                  e.alive = false;
                  const points =
                    e.type === "drone"
                      ? 100
                      : e.type === "sentinel"
                        ? 200
                        : 500;
                  setScore((s) => s + points);
                  setKills((k) => k + 1);

                  const deathColor =
                    e.type === "drone"
                      ? "#ff2255"
                      : e.type === "sentinel"
                        ? "#ff8800"
                        : "#ff0044";
                  setParticles((pp) => [
                    ...pp,
                    ...createDeathExplosion(
                      enemyWorldPos.clone(),
                      deathColor,
                      15
                    ),
                  ]);
                  setExplosions((ex) => [
                    ...ex,
                    {
                      id: nextId++,
                      position: enemyWorldPos.clone(),
                      color: deathColor,
                      startTime: state.clock.elapsedTime,
                      duration: 0.4,
                      size: e.type === "heavy" ? 1.5 : 1,
                    },
                  ]);
                  playExplosionSound();
                  shakeIntensity.current = e.type === "heavy" ? 0.15 : 0.08;

                  if (Math.random() < PICKUP_DROP_CHANCE) {
                    setPickups((pk) => [
                      ...pk,
                      {
                        id: nextId++,
                        position: e.position.clone(),
                        type: "health",
                        alive: true,
                        spawnTime: state.clock.elapsedTime,
                      },
                    ]);
                  }
                }
                break;
              }
            }
          }

          // Enemy projectile hits player
          if (!p.friendly && p.alive) {
            if (
              p.position.distanceTo(playerPos.current) < PLAYER_HIT_RADIUS
            ) {
              p.alive = false;
              setHealth((h) => Math.max(0, h - ENEMY_DAMAGE));
              setDamageFlash(true);
              setTimeout(() => setDamageFlash(false), 150);
              playDamageSound();
              shakeIntensity.current = 0.12;

              const toProjectile = new THREE.Vector3()
                .subVectors(p.position, playerPos.current)
                .setY(0)
                .normalize();
              const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(
                camera.quaternion
              );
              forward.y = 0;
              forward.normalize();
              const angle = Math.atan2(
                forward.x * toProjectile.z - forward.z * toProjectile.x,
                forward.x * toProjectile.x + forward.z * toProjectile.z
              );
              setDamageDirection(angle);
            }
          }

          return p;
        })
        .filter((p) => p.alive)
    );

    // ── Update pickups ──
    setPickups((prev) =>
      prev
        .map((pk) => {
          if (!pk.alive) return pk;
          if (pk.position.distanceTo(playerPos.current) < PICKUP_RADIUS) {
            pk.alive = false;
            if (pk.type === "health") {
              setHealth((h) =>
                Math.min(MAX_HEALTH, h + HEALTH_PICKUP_AMOUNT)
              );
            }
            playPickupSound();
          }
          if (state.clock.elapsedTime - pk.spawnTime > 15) {
            pk.alive = false;
          }
          return pk;
        })
        .filter((pk) => pk.alive)
    );

    // ── Clean up ──
    setParticles((prev) => prev.filter((p) => p.life > 0));
    setExplosions((prev) =>
      prev.filter(
        (e) => state.clock.elapsedTime - e.startTime < e.duration + 0.1
      )
    );
  });

  return null;
}

// Helper to fire an enemy projectile
function fireEnemyProjectile(
  e: EnemyData,
  playerPosition: THREE.Vector3,
  setProjectiles: React.Dispatch<React.SetStateAction<ProjectileData[]>>,
  speed: number = ENEMY_PROJECTILE_SPEED
) {
  const shootDir = new THREE.Vector3()
    .subVectors(playerPosition, e.position)
    .normalize();
  // Add slight inaccuracy
  shootDir.x += (Math.random() - 0.5) * 0.1;
  shootDir.y += (Math.random() - 0.5) * 0.05;
  shootDir.z += (Math.random() - 0.5) * 0.1;
  shootDir.normalize();

  setProjectiles((prev) => [
    ...prev,
    {
      id: nextId++,
      position: e.position.clone().add(new THREE.Vector3(0, 1.5, 0)),
      direction: shootDir,
      speed,
      alive: true,
      friendly: false,
      life: PROJECTILE_LIFE,
    },
  ]);
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
  const [particles, setParticles] = useState<ParticleData[]>([]);
  const [explosions, setExplosions] = useState<ExplosionData[]>([]);
  const [pickups, setPickups] = useState<PickupData[]>([]);
  const [damageFlash, setDamageFlash] = useState(false);
  const [hitMarker, setHitMarker] = useState(false);
  const [kills, setKills] = useState(0);
  const [waveAnnounce, setWaveAnnounce] = useState(0);
  const [damageDirection, setDamageDirection] = useState<number | null>(null);
  const [radarDots, setRadarDots] = useState<RadarDot[]>([]);
  const [finalScore, setFinalScore] = useState(0);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  const playerPos = useRef(new THREE.Vector3(0, 2, 5));
  const playerYaw = useRef(0);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const shakeIntensity = useRef(0);
  const stopAmbient = useRef<(() => void) | null>(null);

  useEffect(() => {
    setIsTouchDevice("ontouchstart" in window || navigator.maxTouchPoints > 0);
  }, []);

  useEffect(() => {
    if (health <= 0 && gameState === "playing") {
      setFinalScore(score);
      setGameState("gameover");
      document.exitPointerLock?.();
      setLocked(false);
      stopAmbient.current?.();
      stopAmbient.current = null;
    }
  }, [health, gameState, score]);

  useEffect(() => {
    const handleChange = () => {
      const isLocked =
        document.pointerLockElement === canvasContainerRef.current;
      setLocked(isLocked);
    };
    document.addEventListener("pointerlockchange", handleChange);
    return () =>
      document.removeEventListener("pointerlockchange", handleChange);
  }, []);

  useEffect(() => {
    return () => {
      stopAmbient.current?.();
    };
  }, []);

  const handleStart = useCallback(() => {
    setGameState("playing");
    setHealth(MAX_HEALTH);
    setScore(0);
    setWave(1);
    setAmmo(999);
    setKills(0);
    setProjectiles([]);
    setParticles([]);
    setExplosions([]);
    setPickups([]);
    setRadarDots([]);
    setHitMarker(false);
    setWaveAnnounce(1);
    setDamageDirection(null);
    nextId = 1;
    shakeIntensity.current = 0;
    setEnemies(spawnEnemies(1));

    stopAmbient.current?.();
    stopAmbient.current = startAmbientHum();
    playWaveStartSound();

    canvasContainerRef.current?.requestPointerLock?.();
  }, []);

  const handleRestart = useCallback(() => {
    handleStart();
  }, [handleStart]);

  const handleShoot = useCallback(
    (origin: THREE.Vector3, direction: THREE.Vector3) => {
      if (gameState !== "playing") return;
      playShootSound();
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
        style={{
          width: "100%",
          height: "100%",
          cursor: locked ? "none" : "pointer",
        }}
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
            <fog attach="fog" args={["#0a0a15", 20, 55]} />
            <Physics gravity={[0, -15, 0]}>
              <Player locked={locked} />
              <Level />
            </Physics>
            <Weapon locked={locked} onShoot={handleShoot} />
            <Enemies enemies={enemies} playerPosition={playerPos.current} />
            <Projectiles projectiles={projectiles} />
            <Particles particles={particles} explosions={explosions} />
            <Pickups pickups={pickups} />
            <ScreenShake shakeIntensity={shakeIntensity} />
            <GameLoop
              enemies={enemies}
              setEnemies={setEnemies}
              projectiles={projectiles}
              setProjectiles={setProjectiles}
              particles={particles}
              setParticles={setParticles}
              explosions={explosions}
              setExplosions={setExplosions}
              pickups={pickups}
              setPickups={setPickups}
              playerPos={playerPos}
              playerYaw={playerYaw}
              health={health}
              setHealth={setHealth}
              setScore={setScore}
              gameState={gameState}
              setDamageFlash={setDamageFlash}
              setWave={setWave}
              wave={wave}
              shakeIntensity={shakeIntensity}
              setHitMarker={setHitMarker}
              setKills={setKills}
              setDamageDirection={setDamageDirection}
              setWaveAnnounce={setWaveAnnounce}
              setRadarDots={setRadarDots}
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
        hitMarker={hitMarker}
        waveAnnounce={waveAnnounce}
        damageDirection={damageDirection}
        kills={kills}
        radarDots={radarDots}
        playerYaw={playerYaw.current}
      />

      <DamageFlash flash={damageFlash} />
    </div>
  );
}
