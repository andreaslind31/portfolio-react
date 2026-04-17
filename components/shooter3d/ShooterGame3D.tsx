"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import * as THREE from "three";
import Player from "./Player";
import Level, { ARENA_HALF_W, ARENA_HALF_D, SPAWN_PORTALS, WALL_COLLIDERS } from "./Level";
import Weapon, { type WeaponType, WEAPON_CONFIGS } from "./Weapon";
import HUD, { type RadarDot } from "./HUD";
import Enemies, { type EnemyData, ENEMY_COLORS } from "./Enemies";
import Projectiles, { type ProjectileData } from "./Projectiles";
import Particles, {
  type ParticleData,
  type ExplosionData,
  createImpactSparks,
  createDeathExplosion,
} from "./Particles";
import Pickups, { type PickupData, type PickupType } from "./Pickups";
import Doors from "./Doors";
import { MAPS, getUnlockedMaps, unlockMap, getNextMapId, type MapConfig } from "./Maps";
import DestructibleCrates, { type CrateData, createInitialCrates } from "./DestructibleCrates";
import PostProcessing from "./PostProcessing";
import { ConnectionManager, LobbyUI, RemotePlayers, KillFeed, createKillFeedEntry, Scoreboard } from "./multiplayer";
import type { ConnectionState, PlayerInfo, RemotePlayerData, KillFeedEntry } from "./multiplayer";
import {
  playBlasterSound,
  playShotgunSound,
  playPlasmaSound,
  playRocketSound,
  playHitSound,
  playExplosionSound,
  playDamageSound,
  playWaveStartSound,
  playPickupSound,
  playFootstepSound,
  playKillStreakSound,
  playDistantRumble,
  playPipeHiss,
  startAmbientHum,
  startCombatMusic,
} from "./SoundEngine";

// ── Game constants ───────────────────────────────────────
const MAX_HEALTH = 100;
const ENEMY_DAMAGE = 10;
const ENEMY_PROJECTILE_SPEED = 15;
const ENEMY_PROJECTILE_LIFE = 3;
const HIT_RADIUS = 1.0;
const PLAYER_HIT_RADIUS = 0.8;
const PICKUP_RADIUS = 1.5;
const HEALTH_PICKUP_AMOUNT = 25;

// ── Powerup spawning config ─────────────────────────────
const MAX_POWERUPS_ON_MAP = 2;
const POWERUP_RESPAWN_DELAY = 8; // seconds after all collected
const POWERUP_DESPAWN_TIME = 20; // seconds before despawn
const POWERUP_TYPES: PickupType[] = ["health", "shotgun", "plasma", "rocket", "speed", "damage"];
const SPEED_BOOST_DURATION = 8; // seconds
const DAMAGE_BOOST_DURATION = 8; // seconds
const DAMAGE_BOOST_MULTIPLIER = 2;

// Weapon ammo amounts given by pickups
const SHOTGUN_PICKUP_AMMO = 8;
const PLASMA_PICKUP_AMMO = 5;
const ROCKET_PICKUP_AMMO = 3;

// ── Shoot cooldowns per enemy type ──────────────────────
const DRONE_SHOOT_CD = 1.5;
const SENTINEL_SHOOT_CD = 0.25; // burst interval
const SENTINEL_BURST_PAUSE = 3; // pause between bursts
const HEAVY_MELEE_CD = 1.5; // seconds between melee hits
const HEAVY_MELEE_RANGE = 3.5;
const HEAVY_MELEE_DAMAGE = 20;

// ── Difficulty scaling ────────────────────────────────────
function getDifficultyMultiplier(wave: number) {
  return {
    speedMult: 1 + wave * 0.05,        // enemies get 5% faster each wave
    accuracyMult: 1 - wave * 0.03,     // inaccuracy reduces 3% per wave (min 0.3)
    shootCdMult: 1 - wave * 0.02,      // shoot cooldown reduces 2% per wave (min 0.5)
    hpMult: 1 + wave * 0.08,           // enemies get 8% more HP each wave
  };
}

// ── Spawn config per wave ────────────────────────────────
function getWaveConfig(wave: number) {
  const isBossWave = wave % 5 === 0 && wave > 0;
  if (isBossWave) {
    // Boss wave: boss + reduced escort
    return {
      drones: Math.min(2 + Math.floor(wave / 5), 5),
      sentinels: Math.floor(wave / 5),
      heavies: 0,
      boss: 1,
    };
  }
  // Normal wave
  const drones = Math.min(1 + wave, 6);
  const sentinels = Math.max(1, Math.floor(wave / 2) + 1);
  const heavies = Math.max(1, Math.floor((wave + 1) / 3));
  return { drones, sentinels, heavies, boss: 0 };
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
          0,
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
        isShooting: false,
        shootFrame: 0,
        lastMoveDir: new THREE.Vector3(0, 0, 1),
        dying: false,
        deathTimer: 0,
      });
    }
  };

  const diff = getDifficultyMultiplier(wave);

  spawn("drone", config.drones, (25 + wave * 5) * diff.hpMult, (4 + wave * 0.2) * diff.speedMult);
  spawn("sentinel", config.sentinels, (40 + wave * 5) * diff.hpMult, 2.5 * diff.speedMult);
  spawn("heavy", config.heavies, (80 + wave * 10) * diff.hpMult, 1.5 * diff.speedMult);
  if (config.boss > 0) {
    spawn("boss", config.boss, 400 + wave * 30, 2.0 * diff.speedMult);
  }

  return enemies;
}

// Spawn enemies for a specific map — fixed counts, no wave progression
function spawnMapEnemies(map: MapConfig): EnemyData[] {
  const enemies: EnemyData[] = [];

  const spawn = (
    type: EnemyData["type"],
    count: number,
    hp: number,
    speed: number
  ) => {
    for (let i = 0; i < count; i++) {
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
          0,
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
        isShooting: false,
        shootFrame: 0,
        lastMoveDir: new THREE.Vector3(0, 0, 1),
        dying: false,
        deathTimer: 0,
      });
    }
  };

  spawn("drone", map.enemies.drones, 30 * map.hpMult, 4 * map.speedMult);
  spawn("sentinel", map.enemies.sentinels, 50 * map.hpMult, 2.5 * map.speedMult);
  spawn("heavy", map.enemies.heavies, 100 * map.hpMult, 1.5 * map.speedMult);
  spawn("boss", map.enemies.bosses, 500 * map.hpMult, 2.0 * map.speedMult);

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
          "radial-gradient(ellipse at center, transparent 40%, #8B000066 100%)",
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
// Module-level scratch vector reused across AI calls (serial, not parallel)
const aiStrafe = new THREE.Vector3();

function updateDroneAI(
  e: EnemyData,
  dir: THREE.Vector3,
  dist: number,
  dt: number
) {
  // Fast, erratic movement — strafe while approaching
  const strafe = aiStrafe.set(-dir.z, 0, dir.x).multiplyScalar(e.strafeDir);

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

  // Track facing direction (toward player)
  e.lastMoveDir.copy(dir);

  // Randomly flip strafe direction
  if (Math.random() < 0.01) e.strafeDir *= -1;
}

function updateSentinelAI(
  e: EnemyData,
  dir: THREE.Vector3,
  dist: number,
  dt: number
) {
  const strafe = aiStrafe.set(-dir.z, 0, dir.x).multiplyScalar(e.strafeDir);

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

  e.lastMoveDir.copy(dir);

  if (Math.random() < 0.005) e.strafeDir *= -1;
}

function updateHeavyAI(
  e: EnemyData,
  dir: THREE.Vector3,
  dist: number,
  dt: number
) {
  // Heavy: slow approach, then charge — melee only, never retreats
  if (dist > 10) {
    e.aiState = "engage";
    e.position.addScaledVector(dir, e.speed * dt);
    e.chargeTimer = 0;
  } else if (dist > HEAVY_MELEE_RANGE) {
    // Windup then charge toward player
    e.aiState = "charge";
    e.chargeTimer += dt;
    if (e.chargeTimer > 1) {
      e.position.addScaledVector(dir, e.speed * 3 * dt);
    } else {
      e.position.addScaledVector(dir, e.speed * 0.5 * dt);
    }
  } else {
    // In melee range — stay close, slight strafe
    e.aiState = "charge";
    const strafe = aiStrafe.set(-dir.z, 0, dir.x).multiplyScalar(e.strafeDir);
    e.position.addScaledVector(strafe, e.speed * 0.3 * dt);
    e.position.addScaledVector(dir, e.speed * 0.2 * dt);
    if (Math.random() < 0.02) e.strafeDir *= -1;
  }
  e.lastMoveDir.copy(dir);
}

// ── Boss AI ──────────────────────────────────────────────
const BOSS_MELEE_RANGE = 4.5;
const BOSS_MELEE_DAMAGE = 30;
const BOSS_SHOOT_CD = 1.0;
const BOSS_MELEE_CD = 1.2;

function updateBossAI(
  e: EnemyData,
  dir: THREE.Vector3,
  dist: number,
  dt: number
) {
  // Boss alternates between ranged and charge phases
  const phase = e.chargeTimer; // reuse chargeTimer as phase timer

  if (dist > 8) {
    // Approach + strafe while shooting
    e.aiState = "engage";
    e.position.addScaledVector(dir, e.speed * dt);
    const strafe = aiStrafe.set(-dir.z, 0, dir.x).multiplyScalar(e.strafeDir);
    e.position.addScaledVector(strafe, e.speed * 0.4 * dt);
    if (Math.random() < 0.01) e.strafeDir *= -1;
  } else if (dist > BOSS_MELEE_RANGE) {
    // Charge in!
    e.aiState = "charge";
    e.position.addScaledVector(dir, e.speed * 2.5 * dt);
  } else {
    // Melee range — strafe aggressively
    e.aiState = "charge";
    const strafe = aiStrafe.set(-dir.z, 0, dir.x).multiplyScalar(e.strafeDir);
    e.position.addScaledVector(strafe, e.speed * 0.6 * dt);
    e.position.addScaledVector(dir, e.speed * 0.2 * dt);
    if (Math.random() < 0.03) e.strafeDir *= -1;
  }

  e.chargeTimer += dt;
  e.lastMoveDir.copy(dir);
}

// ── Enemy separation force ──────────────────────────────
const SEPARATION_RADIUS = 2.0;
const SEPARATION_FORCE = 3.0;

function applySeparation(enemies: EnemyData[]) {
  for (let i = 0; i < enemies.length; i++) {
    const a = enemies[i];
    if (!a.alive) continue;
    for (let j = i + 1; j < enemies.length; j++) {
      const b = enemies[j];
      if (!b.alive) continue;
      const dx = a.position.x - b.position.x;
      const dz = a.position.z - b.position.z;
      const distSq = dx * dx + dz * dz;
      if (distSq < SEPARATION_RADIUS * SEPARATION_RADIUS && distSq > 0.01) {
        const dist = Math.sqrt(distSq);
        const overlap = SEPARATION_RADIUS - dist;
        const pushX = (dx / dist) * overlap * 0.5;
        const pushZ = (dz / dist) * overlap * 0.5;
        a.position.x += pushX;
        a.position.z += pushZ;
        b.position.x -= pushX;
        b.position.z -= pushZ;
      }
    }
  }
}

// ── Wall collision for enemies ───────────────────────────
const ENEMY_RADIUS = 0.6;

function resolveWallCollisions(pos: THREE.Vector3) {
  for (const [cx, cz, hw, hd] of WALL_COLLIDERS) {
    const padW = hw + ENEMY_RADIUS;
    const padD = hd + ENEMY_RADIUS;

    const dx = pos.x - cx;
    const dz = pos.z - cz;

    if (Math.abs(dx) < padW && Math.abs(dz) < padD) {
      const overlapX = padW - Math.abs(dx);
      const overlapZ = padD - Math.abs(dz);

      if (overlapX < overlapZ) {
        pos.x += dx > 0 ? overlapX : -overlapX;
      } else {
        pos.z += dz > 0 ? overlapZ : -overlapZ;
      }
    }
  }
}

// ── Line-of-sight check (2D ray vs AABB) ─────────────────
// Returns true if no wall blocks the line from A to B in the XZ plane
function hasLineOfSight(
  ax: number, az: number,
  bx: number, bz: number
): boolean {
  const dx = bx - ax;
  const dz = bz - az;
  const len = Math.sqrt(dx * dx + dz * dz);
  if (len < 0.01) return true;
  const ndx = dx / len;
  const ndz = dz / len;
  // Inverse direction for slab test
  const invDx = ndx !== 0 ? 1 / ndx : 1e10;
  const invDz = ndz !== 0 ? 1 / ndz : 1e10;

  for (const [cx, cz, hw, hd] of WALL_COLLIDERS) {
    const minX = cx - hw;
    const maxX = cx + hw;
    const minZ = cz - hd;
    const maxZ = cz + hd;

    // Slab intersection test
    let tmin = (minX - ax) * invDx;
    let tmax = (maxX - ax) * invDx;
    if (tmin > tmax) { const tmp = tmin; tmin = tmax; tmax = tmp; }

    let tzmin = (minZ - az) * invDz;
    let tzmax = (maxZ - az) * invDz;
    if (tzmin > tzmax) { const tmp = tzmin; tzmin = tzmax; tzmax = tmp; }

    if (tmin > tzmax || tzmin > tmax) continue;

    const tenter = Math.max(tmin, tzmin);
    const texit = Math.min(tmax, tzmax);

    // Hit if intersection is within the segment [0, len]
    if (tenter < len && texit > 0.1) {
      return false; // wall blocks line of sight
    }
  }
  return true;
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
  currentWeapon,
  damageBoostEnd,
  setWeaponAmmo,
  setCurrentWeapon,
  setSpeedBoostEnd,
  setDamageBoostEnd,
  lastPowerupSpawn,
  lastKillTime,
  footstepTimer,
  setKillStreak,
  setKillStreakText,
  setScorePopups,
  crates,
  setCrates,
  ambientSoundTimer,
  comboMultiplier,
  setComboMultiplier,
  setComboTimer,
  setShotsFired,
  setShotsHit,
  setWeaponKills,
  combatMusic,
  speedBoostEnd,
  setPlayerSpeedMult,
  gameMode,
  onMapCleared,
  connectionManager,
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
  gameState: "menu" | "modeSelect" | "mapSelect" | "multiplayer" | "playing" | "gameover" | "victory";
  setDamageFlash: React.Dispatch<React.SetStateAction<boolean>>;
  setWave: React.Dispatch<React.SetStateAction<number>>;
  wave: number;
  shakeIntensity: React.MutableRefObject<number>;
  setHitMarker: React.Dispatch<React.SetStateAction<boolean>>;
  setKills: React.Dispatch<React.SetStateAction<number>>;
  setDamageDirection: React.Dispatch<React.SetStateAction<number | null>>;
  setWaveAnnounce: React.Dispatch<React.SetStateAction<number>>;
  setRadarDots: React.Dispatch<React.SetStateAction<RadarDot[]>>;
  currentWeapon: WeaponType;
  damageBoostEnd: number;
  setWeaponAmmo: React.Dispatch<React.SetStateAction<Record<WeaponType, number>>>;
  setCurrentWeapon: React.Dispatch<React.SetStateAction<WeaponType>>;
  setSpeedBoostEnd: React.Dispatch<React.SetStateAction<number>>;
  setDamageBoostEnd: React.Dispatch<React.SetStateAction<number>>;
  lastPowerupSpawn: React.MutableRefObject<number>;
  lastKillTime: React.MutableRefObject<number>;
  footstepTimer: React.MutableRefObject<number>;
  setKillStreak: React.Dispatch<React.SetStateAction<number>>;
  setKillStreakText: React.Dispatch<React.SetStateAction<string>>;
  setScorePopups: React.Dispatch<React.SetStateAction<{ id: number; text: string; x: number; y: number; time: number }[]>>;
  crates: CrateData[];
  setCrates: React.Dispatch<React.SetStateAction<CrateData[]>>;
  ambientSoundTimer: React.MutableRefObject<number>;
  comboMultiplier: number;
  setComboMultiplier: React.Dispatch<React.SetStateAction<number>>;
  setComboTimer: React.Dispatch<React.SetStateAction<number>>;
  setShotsFired: React.Dispatch<React.SetStateAction<number>>;
  setShotsHit: React.Dispatch<React.SetStateAction<number>>;
  setWeaponKills: React.Dispatch<React.SetStateAction<Record<WeaponType, number>>>;
  combatMusic: React.MutableRefObject<{ setIntensity: (v: number) => void; stop: () => void } | null>;
  speedBoostEnd: number;
  setPlayerSpeedMult: React.Dispatch<React.SetStateAction<number>>;
  gameMode: "waves" | "maps";
  onMapCleared: () => void;
  connectionManager: React.MutableRefObject<ConnectionManager | null>;
}) {
  const { camera } = useThree();
  const enemyShootTimers = useRef<Map<number, number>>(new Map());
  const sentinelBurstTimers = useRef<Map<number, number>>(new Map());
  const waveCleared = useRef(false);
  const radarUpdateTimer = useRef(0);
  // Pre-allocated scratch vectors to avoid per-frame GC pressure
  const scratchDir = useRef(new THREE.Vector3());
  const scratchStrafe = useRef(new THREE.Vector3());
  const scratchEuler = useRef(new THREE.Euler(0, 0, 0, "YXZ"));
  const scratchEnemyPos = useRef(new THREE.Vector3());
  const musicUpdateTimer = useRef(0);
  const particleCleanupTimer = useRef(0);

  useFrame((state, delta) => {
    if (gameState !== "playing") return;

    // Measure movement BEFORE updating playerPos
    const posDelta = playerPos.current.distanceTo(camera.position);
    const isPlayerMoving = posDelta > 0.02;
    playerPos.current.copy(camera.position);

    scratchEuler.current.setFromQuaternion(camera.quaternion, "YXZ");
    playerYaw.current = scratchEuler.current.y;

    const dt = Math.min(delta, 0.05);

    // ── Difficulty scaling ──
    const diff = getDifficultyMultiplier(wave);

    // ── Send local player state to multiplayer server ──
    if (connectionManager.current && connectionManager.current.getState() === "connected") {
      const pos: [number, number, number] = [
        playerPos.current.x,
        playerPos.current.y,
        playerPos.current.z,
      ];
      connectionManager.current.queuePlayerState(
        pos,
        [playerYaw.current, camera.rotation.x],
        currentWeapon
      );
    }

    // ── Footstep sound ──
    footstepTimer.current += dt;
    const stepInterval = 0.35; // seconds between footsteps
    if (isPlayerMoving && footstepTimer.current > stepInterval) {
      footstepTimer.current = 0;
      playFootstepSound();
    }
    if (!isPlayerMoving) footstepTimer.current = stepInterval * 0.8; // nearly ready for next step

    // ── Advance death timers (mutate in place, no setState) ──
    for (const e of enemies) {
      if (e.dying) {
        e.deathTimer += dt;
        if (e.deathTimer >= 0.6) {
          e.dying = false;
        }
      }
    }

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

    // ── Update enemies (mutate in place, no setState — avoids per-frame re-render) ──
    for (const e of enemies) {
      if (!e.alive) continue;

        // Reuse scratch vectors — avoids per-enemy-per-frame GC pressure
        scratchDir.current.subVectors(playerPos.current, e.position).setY(0);
        const dist = scratchDir.current.length();
        scratchDir.current.normalize();
        const dir = scratchDir.current;

        // If no line of sight, force strafe movement to navigate around walls
        const los = hasLineOfSight(e.position.x, e.position.z, playerPos.current.x, playerPos.current.z);
        if (!los) {
          e.position.x += (-dir.z) * e.strafeDir * e.speed * 0.7 * dt;
          e.position.z += dir.x * e.strafeDir * e.speed * 0.7 * dt;
          if (Math.random() < 0.02) e.strafeDir *= -1;
          e.lastMoveDir.copy(dir);
          // Wall collision handled by post-separation resolve below
          continue;
        }

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
          case "boss":
            updateBossAI(e, dir, dist, dt);
            break;
        }

        // Wall collision + arena clamping done in batch after separation below

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

        // Advance shoot animation (6 frames at 10fps = 0.6s)
        if (e.isShooting) {
          e.shootFrame += dt * 10;
          if (e.shootFrame >= 6) {
            e.isShooting = false;
            e.shootFrame = 0;
          }
        }

        // Only shoot if line of sight to player is clear (reuse cached LOS)
        const canSee = los;

        if (e.type === "drone") {
          const cd = DRONE_SHOOT_CD * Math.max(0.5, diff.shootCdMult);
          if (canSee && now - lastShot > cd && dist < 18) {
            enemyShootTimers.current.set(e.id, now);
            fireEnemyProjectile(e, playerPos.current, setProjectiles, ENEMY_PROJECTILE_SPEED, diff.accuracyMult);
            e.isShooting = true;
            e.shootFrame = 0;
          }
        } else if (e.type === "sentinel") {
          const lastBurst = sentinelBurstTimers.current.get(e.id) || 0;
          const cd = SENTINEL_SHOOT_CD * Math.max(0.5, diff.shootCdMult);
          if (canSee && e.burstCount > 0 && now - lastShot > cd && dist < 22) {
            enemyShootTimers.current.set(e.id, now);
            e.burstCount--;
            fireEnemyProjectile(e, playerPos.current, setProjectiles, ENEMY_PROJECTILE_SPEED, diff.accuracyMult);
            e.isShooting = true;
            e.shootFrame = 0;
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
          // Melee only — punch when in range
          if (canSee && now - lastShot > HEAVY_MELEE_CD && dist < HEAVY_MELEE_RANGE) {
            enemyShootTimers.current.set(e.id, now);
            // Play punch animation
            e.isShooting = true;
            e.shootFrame = 0;
            // Deal direct damage to player
            setHealth((h) => Math.max(0, h - HEAVY_MELEE_DAMAGE));
            setDamageFlash(true);
            setTimeout(() => setDamageFlash(false), 150);
            playDamageSound();
            shakeIntensity.current = 0.2;

            // Damage direction from heavy
            const toEnemy = new THREE.Vector3()
              .subVectors(e.position, playerPos.current)
              .setY(0)
              .normalize();
            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(
              camera.quaternion
            );
            forward.y = 0;
            forward.normalize();
            const angle = Math.atan2(
              forward.x * toEnemy.z - forward.z * toEnemy.x,
              forward.x * toEnemy.x + forward.z * toEnemy.z
            );
            setDamageDirection(angle);
          }
        } else if (e.type === "boss") {
          // Boss: ranged attack at distance, melee when close
          if (canSee && dist < BOSS_MELEE_RANGE) {
            // Melee slam
            if (now - lastShot > BOSS_MELEE_CD) {
              enemyShootTimers.current.set(e.id, now);
              e.isShooting = true;
              e.shootFrame = 0;
              setHealth((h) => Math.max(0, h - BOSS_MELEE_DAMAGE));
              setDamageFlash(true);
              setTimeout(() => setDamageFlash(false), 150);
              playDamageSound();
              shakeIntensity.current = 0.3;

              const toEnemy = new THREE.Vector3()
                .subVectors(e.position, playerPos.current)
                .setY(0).normalize();
              const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
              forward.y = 0; forward.normalize();
              setDamageDirection(Math.atan2(
                forward.x * toEnemy.z - forward.z * toEnemy.x,
                forward.x * toEnemy.x + forward.z * toEnemy.z
              ));
            }
          } else if (canSee && dist < 20) {
            // Ranged: fire 3 projectiles in a spread
            if (now - lastShot > BOSS_SHOOT_CD) {
              enemyShootTimers.current.set(e.id, now);
              e.isShooting = true;
              e.shootFrame = 0;
              for (let s = -1; s <= 1; s++) {
                const shootDir = new THREE.Vector3()
                  .subVectors(playerPos.current, e.position).normalize();
                shootDir.x += s * 0.12;
                shootDir.normalize();
                setProjectiles((prev) => [...prev, {
                  id: nextId++,
                  position: e.position.clone().add(new THREE.Vector3(0, 1.5, 0)),
                  direction: shootDir,
                  speed: ENEMY_PROJECTILE_SPEED * 1.3,
                  alive: true,
                  friendly: false,
                  life: ENEMY_PROJECTILE_LIFE,
                  color: "#ff0000",
                  size: 2,
                }]);
              }
            }
          }
        }

    }

    // ── Enemy separation ──
    applySeparation(enemies);

    // Re-resolve wall collisions after separation (separation can push into walls)
    for (const e of enemies) {
      if (!e.alive) continue;
      resolveWallCollisions(e.position);
    }

    // ── Wave cleared? ──
    // Compute from render-state directly (not from inside a state updater,
    // which React 18 may defer in useFrame).
    const allDead = enemies.length > 0 && enemies.every((e) => !e.alive && !e.dying);
    if (allDead && !waveCleared.current) {
      waveCleared.current = true;
      if (gameMode === "maps") {
        // Map cleared — trigger victory after a short delay
        setTimeout(() => {
          onMapCleared();
          waveCleared.current = false;
        }, 1500);
      } else {
        // Waves mode — spawn next wave
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
    }

    // ── Update projectiles (mutate in place) ──
    for (const p of projectiles) {
      if (!p.alive) continue;

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
                  "#cc8844",
                  5
                ),
              ]);
            }
            p.alive = false;
          }

          // Friendly projectile hits enemy
          if (p.friendly && p.alive) {
            // Check if this projectile is explosive (rocket)
            const isExplosive = p.size && p.size >= 3 && p.color === "#cc4400";
            const explosionRadius = isExplosive ? 5 : 0;

            let directHit = false;
            for (const e of enemies) {
              if (!e.alive) continue;
              // Fast squared-distance check (avoids clone + sqrt)
              const dx = p.position.x - e.position.x;
              const dy = p.position.y - (e.position.y + 1.0);
              const dz = p.position.z - e.position.z;
              const distSq = dx * dx + dy * dy + dz * dz;
              if (distSq < HIT_RADIUS * HIT_RADIUS) {
                // Only clone when we actually hit (rare, not per-frame)
                const enemyWorldPos = e.position.clone();
                enemyWorldPos.y += 1.0;
                directHit = true;
                p.alive = false;

                if (isExplosive) {
                  // Rocket: splash damage to ALL enemies in radius
                  rocketExplode(
                    p.position.clone(), enemies, state, currentWeapon,
                    damageBoostEnd, explosionRadius, setParticles,
                    setExplosions, setScore, setKills, setHitMarker,
                    shakeIntensity
                  );
                } else {
                  // Normal hit: single target
                  const hitNormal = new THREE.Vector3()
                    .subVectors(p.position, enemyWorldPos)
                    .normalize();
                  setParticles((pp) => [
                    ...pp,
                    ...createImpactSparks(p.position.clone(), hitNormal, "#cc8844", 6),
                  ]);
                  playHitSound();
                  setShotsHit((h) => h + 1);
                  setHitMarker(true);
                  setTimeout(() => setHitMarker(false), 100);

                  const weaponDmg = WEAPON_CONFIGS[currentWeapon].damage;
                  const dmgMult = state.clock.elapsedTime < damageBoostEnd ? DAMAGE_BOOST_MULTIPLIER : 1;
                  e.hp -= weaponDmg * dmgMult;
                  if (e.hp <= 0) {
                    e.alive = false;
                    e.dying = true;
                    e.deathTimer = 0;
                    const basePoints = e.type === "drone" ? 100 : e.type === "sentinel" ? 200 : e.type === "boss" ? 2000 : 500;
                    // Combo multiplier — compute new value inline to avoid stale closure
                    const newCombo = Math.min(comboMultiplier + 0.5, 5);
                    setComboTimer(3);
                    setComboMultiplier(newCombo);
                    const points = Math.round(basePoints * newCombo);
                    setScore((s) => s + points);
                    setKills((k) => k + 1);
                    const deathColor = e.type === "drone" ? "#8B0000" : e.type === "sentinel" ? "#B22222" : "#660000";
                    setParticles((pp) => [
                      ...pp,
                      ...createDeathExplosion(enemyWorldPos.clone(), deathColor, 15),
                    ]);
                    setExplosions((ex) => [
                      ...ex,
                      { id: nextId++, position: enemyWorldPos.clone(), color: deathColor, startTime: state.clock.elapsedTime, duration: 0.4, size: e.type === "heavy" ? 1.5 : 1 },
                    ]);
                    playExplosionSound();
                    shakeIntensity.current = e.type === "heavy" ? 0.15 : 0.08;

                    // Score popup
                    setScorePopups((prev) => [
                      ...prev,
                      { id: nextId++, text: `+${points}`, x: 50 + (Math.random() - 0.5) * 10, y: 40 + (Math.random() - 0.5) * 10, time: state.clock.elapsedTime },
                    ]);

                    // Kill streak
                    const now = performance.now() / 1000;
                    if (now - lastKillTime.current < 2) {
                      setKillStreak((s) => {
                        const streak = s + 1;
                        if (streak >= 2) {
                          const labels = ["", "", "DOUBLE KILL", "TRIPLE KILL", "QUAD KILL", "RAMPAGE"];
                          setKillStreakText(labels[Math.min(streak, 5)]);
                          playKillStreakSound(streak);
                          setTimeout(() => setKillStreakText(""), 1500);
                        }
                        return streak;
                      });
                    } else {
                      setKillStreak(1);
                    }
                    lastKillTime.current = now;
                  }
                }
                break;
              }
            }

            // Rocket that hit a wall (died from bounds) should also explode
            if (!p.alive && isExplosive && !directHit) {
              rocketExplode(
                p.position.clone(), enemies, state, currentWeapon,
                damageBoostEnd, explosionRadius, setParticles,
                setExplosions, setScore, setKills, setHitMarker,
                shakeIntensity
              );
            }
          }

          // Friendly projectile hits destructible crate
          if (p.friendly && p.alive) {
            for (const c of crates) {
              if (!c.alive) continue;
              const crateCenter = c.position.clone();
              crateCenter.y += c.size[1] / 2;
              const dx = Math.abs(p.position.x - crateCenter.x);
              const dy = Math.abs(p.position.y - crateCenter.y);
              const dz = Math.abs(p.position.z - crateCenter.z);
              if (dx < c.size[0] / 2 + 0.3 && dy < c.size[1] / 2 + 0.3 && dz < c.size[2] / 2 + 0.3) {
                p.alive = false;
                const weaponDmg = WEAPON_CONFIGS[currentWeapon].damage;
                c.hp -= weaponDmg;
                playHitSound();
                setParticles((pp) => [
                  ...pp,
                  ...createImpactSparks(p.position.clone(), new THREE.Vector3(0, 1, 0), "#ff8800", 4),
                ]);
                if (c.hp <= 0) {
                  c.alive = false;
                  c.dying = true;
                  c.deathTimer = 0;
                  playExplosionSound();
                  setParticles((pp) => [
                    ...pp,
                    ...createDeathExplosion(crateCenter, "#ff8800", 10),
                  ]);
                  // Small chance to spawn a pickup from destroyed crate
                  if (Math.random() < 0.3) {
                    const types: PickupType[] = ["health", "shotgun", "plasma", "rocket"];
                    setPickups((pk) => [
                      ...pk,
                      {
                        id: nextId++,
                        position: c.position.clone(),
                        type: types[Math.floor(Math.random() * types.length)],
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

    }

    // ── Update pickups (mutate in place) ──
    for (const pk of pickups) {
      if (!pk.alive) continue;
      if (pk.position.distanceTo(playerPos.current) < PICKUP_RADIUS) {
        pk.alive = false;
        playPickupSound();

        switch (pk.type) {
          case "health":
            setHealth((h) => Math.min(MAX_HEALTH, h + HEALTH_PICKUP_AMOUNT));
            break;
          case "shotgun":
            setWeaponAmmo((prev) => ({
              ...prev,
              shotgun: prev.shotgun + SHOTGUN_PICKUP_AMMO,
            }));
            setCurrentWeapon("shotgun");
            break;
          case "plasma":
            setWeaponAmmo((prev) => ({
              ...prev,
              plasma: prev.plasma + PLASMA_PICKUP_AMMO,
            }));
            setCurrentWeapon("plasma");
            break;
          case "rocket":
            setWeaponAmmo((prev) => ({
              ...prev,
              rocket: prev.rocket + ROCKET_PICKUP_AMMO,
            }));
            setCurrentWeapon("rocket");
            break;
          case "speed":
            setSpeedBoostEnd(state.clock.elapsedTime + SPEED_BOOST_DURATION);
            break;
          case "damage":
            setDamageBoostEnd(state.clock.elapsedTime + DAMAGE_BOOST_DURATION);
            break;
        }
      }
      if (state.clock.elapsedTime - pk.spawnTime > POWERUP_DESPAWN_TIME) {
        pk.alive = false;
      }
    }

    // ── Spawn powerups (max 1-2, only when none on map, with delay) ──
    const alivePickups = pickups.filter((p) => p.alive).length;
    if (alivePickups === 0) {
      if (lastPowerupSpawn.current === 0) {
        // First time — start the delay timer
        lastPowerupSpawn.current = state.clock.elapsedTime;
      } else if (
        state.clock.elapsedTime - lastPowerupSpawn.current > POWERUP_RESPAWN_DELAY
      ) {
        // Spawn 1-2 new powerups
        const count = Math.random() < 0.4 ? 2 : 1;
        const newPickups: PickupData[] = [];
        for (let i = 0; i < count; i++) {
          const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
          // Random position in the arena (avoid center platform)
          let px: number, pz: number;
          do {
            px = (Math.random() - 0.5) * (ARENA_HALF_W * 2 - 6);
            pz = (Math.random() - 0.5) * (ARENA_HALF_D * 2 - 6);
          } while (Math.abs(px) < 5 && Math.abs(pz) < 5); // avoid center
          newPickups.push({
            id: nextId++,
            position: new THREE.Vector3(px, 0, pz),
            type,
            alive: true,
            spawnTime: state.clock.elapsedTime,
          });
        }
        setPickups(newPickups);
        lastPowerupSpawn.current = state.clock.elapsedTime;
      }
    }

    // ── Throttled cleanup (once per second) ──
    particleCleanupTimer.current += dt;
    if (particleCleanupTimer.current > 1.0) {
      particleCleanupTimer.current = 0;
      setParticles((prev) => prev.filter((p) => p.life > 0));
      setProjectiles((prev) => prev.filter((p) => p.alive));
      setPickups((prev) => prev.filter((p) => p.alive));
      setExplosions((prev) =>
        prev.filter(
          (e) => state.clock.elapsedTime - e.startTime < e.duration + 0.1
        )
      );
      setScorePopups((prev) =>
        prev.filter((p) => state.clock.elapsedTime - p.time < 1)
      );
    }

    // ── Advance crate death timers (mutate in place) ──
    for (const c of crates) {
      if (c.dying) {
        c.deathTimer += dt;
        if (c.deathTimer >= 0.4) c.dying = false;
      }
    }

    // ── Environmental ambient sounds (random intervals) ──
    ambientSoundTimer.current += dt;
    if (ambientSoundTimer.current > 5 + Math.random() * 10) {
      ambientSoundTimer.current = 0;
      if (Math.random() > 0.5) {
        playDistantRumble();
      } else {
        playPipeHiss();
      }
    }

    // ── Speed boost check ──
    setPlayerSpeedMult(state.clock.elapsedTime < speedBoostEnd ? 1.5 : 1);

    // ── Combo timer decay ──
    setComboTimer((t) => {
      if (t > 0) {
        const newT = t - dt;
        if (newT <= 0) {
          setComboMultiplier(1); // Reset multiplier when combo expires
          return 0;
        }
        return newT;
      }
      return 0;
    });

    // ── Update combat music intensity (throttled to 4x/sec) ──
    musicUpdateTimer.current += dt;
    if (combatMusic.current && musicUpdateTimer.current > 0.25) {
      musicUpdateTimer.current = 0;
      const aliveCount = enemies.filter((e) => e.alive).length;
      const nearestDist = enemies.reduce((min, e) => {
        if (!e.alive) return min;
        return Math.min(min, e.position.distanceTo(playerPos.current));
      }, 100);
      const proximity = Math.max(0, 1 - nearestDist / 20);
      const density = Math.min(1, aliveCount / 8);
      combatMusic.current.setIntensity(Math.max(proximity, density));
    }
  });

  return null;
}

// Helper to fire an enemy projectile
// Rocket explosion — splash damage to all enemies in radius
function rocketExplode(
  pos: THREE.Vector3,
  enemies: EnemyData[],
  state: { clock: { elapsedTime: number } },
  currentWeapon: WeaponType,
  damageBoostEnd: number,
  radius: number,
  setParticles: React.Dispatch<React.SetStateAction<ParticleData[]>>,
  setExplosions: React.Dispatch<React.SetStateAction<ExplosionData[]>>,
  setScore: React.Dispatch<React.SetStateAction<number>>,
  setKills: React.Dispatch<React.SetStateAction<number>>,
  setHitMarker: React.Dispatch<React.SetStateAction<boolean>>,
  shakeIntensity: React.MutableRefObject<number>
) {
  // Big explosion visual
  setParticles((pp) => [
    ...pp,
    ...createDeathExplosion(pos, "#cc4400", 25),
  ]);
  setExplosions((ex) => [
    ...ex,
    { id: nextId++, position: pos.clone(), color: "#cc4400", startTime: state.clock.elapsedTime, duration: 0.6, size: 2.5 },
  ]);
  playExplosionSound();
  shakeIntensity.current = 0.25;
  setHitMarker(true);
  setTimeout(() => setHitMarker(false), 150);

  const weaponDmg = WEAPON_CONFIGS[currentWeapon].damage;
  const dmgMult = state.clock.elapsedTime < damageBoostEnd ? DAMAGE_BOOST_MULTIPLIER : 1;

  // Damage all enemies in radius (falloff with distance)
  for (const e of enemies) {
    if (!e.alive) continue;
    const enemyWorldPos = e.position.clone();
    enemyWorldPos.y += 1.0;
    const dist = pos.distanceTo(enemyWorldPos);
    if (dist < radius) {
      const falloff = 1 - dist / radius; // 1 at center, 0 at edge
      const damage = weaponDmg * dmgMult * falloff;
      e.hp -= damage;
      playHitSound();

      if (e.hp <= 0) {
        e.alive = false;
        e.dying = true;
        e.deathTimer = 0;
        const points = e.type === "drone" ? 100 : e.type === "sentinel" ? 200 : e.type === "boss" ? 2000 : 500;
        setScore((s) => s + points);
        setKills((k) => k + 1);
        const deathColor = e.type === "drone" ? "#8B0000" : e.type === "sentinel" ? "#B22222" : "#660000";
        setParticles((pp) => [
          ...pp,
          ...createDeathExplosion(enemyWorldPos.clone(), deathColor, 12),
        ]);
      }
    }
  }
}

function fireEnemyProjectile(
  e: EnemyData,
  playerPosition: THREE.Vector3,
  setProjectiles: React.Dispatch<React.SetStateAction<ProjectileData[]>>,
  speed: number = ENEMY_PROJECTILE_SPEED,
  accuracyMult: number = 1
) {
  const shootDir = new THREE.Vector3()
    .subVectors(playerPosition, e.position)
    .normalize();
  // Inaccuracy per type, reduced by difficulty scaling
  const baseInaccuracy = e.type === "sentinel" ? 0.05 : e.type === "boss" ? 0.06 : e.type === "heavy" ? 0.15 : 0.1;
  const inaccuracy = baseInaccuracy * Math.max(0.3, accuracyMult);
  shootDir.x += (Math.random() - 0.5) * inaccuracy;
  shootDir.y += (Math.random() - 0.5) * inaccuracy * 0.5;
  shootDir.z += (Math.random() - 0.5) * inaccuracy;
  shootDir.normalize();

  const colors = ENEMY_COLORS[e.type];
  const projSize = e.type === "boss" ? 2 : e.type === "heavy" ? 2.5 : e.type === "sentinel" ? 1.5 : 1;

  setProjectiles((prev) => [
    ...prev,
    {
      id: nextId++,
      position: e.position.clone().add(new THREE.Vector3(0, 1.0, 0)),
      direction: shootDir,
      speed,
      alive: true,
      friendly: false,
      life: ENEMY_PROJECTILE_LIFE,
      color: colors.projectile,
      size: projSize,
    },
  ]);
}

// ── Main component ───────────────────────────────────────
interface ShooterGame3DProps {
  onScoreSubmit?: (name: string, score: number) => Promise<string | null>;
}

export default function ShooterGame3D({ onScoreSubmit }: ShooterGame3DProps) {
  const [gameState, setGameState] = useState<"menu" | "modeSelect" | "mapSelect" | "multiplayer" | "playing" | "gameover" | "victory">(
    "menu"
  );
  const [gameMode, setGameMode] = useState<"waves" | "maps">("waves");
  const [selectedMapId, setSelectedMapId] = useState<string>("map01");
  const [unlockedMaps, setUnlockedMaps] = useState<string[]>(["map01"]);
  // Multiplayer state
  const [mpConnectionState, setMpConnectionState] = useState<ConnectionState>("disconnected");
  const [mpRoomCode, setMpRoomCode] = useState("");
  const [mpPlayers, setMpPlayers] = useState<PlayerInfo[]>([]);
  const [mpHostId, setMpHostId] = useState("");
  const [mpLocalId, setMpLocalId] = useState("");
  const connectionManager = useRef<ConnectionManager | null>(null);
  const [remotePlayers, setRemotePlayers] = useState<RemotePlayerData[]>([]);
  const [killFeedEntries, setKillFeedEntries] = useState<KillFeedEntry[]>([]);
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [health, setHealth] = useState(MAX_HEALTH);
  const [score, setScore] = useState(0);
  const [wave, setWave] = useState(1);
  const [currentWeapon, setCurrentWeapon] = useState<WeaponType>("blaster");
  const [weaponAmmo, setWeaponAmmo] = useState<Record<WeaponType, number>>({
    blaster: -1, // infinite
    shotgun: 0,
    plasma: 0,
    rocket: 0,
  });
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
  const [speedBoostEnd, setSpeedBoostEnd] = useState(0);
  const [damageBoostEnd, setDamageBoostEnd] = useState(0);
  const [killStreak, setKillStreak] = useState(0);
  const [killStreakText, setKillStreakText] = useState("");
  const [scorePopups, setScorePopups] = useState<
    { id: number; text: string; x: number; y: number; time: number }[]
  >([]);
  const [crates, setCrates] = useState<CrateData[]>([]);
  // Settings
  const [mouseSensitivity, setMouseSensitivity] = useState(0.002);
  const [playerSpeedMult, setPlayerSpeedMult] = useState(1);
  // Combo system
  const [comboMultiplier, setComboMultiplier] = useState(1);
  const [comboTimer, setComboTimer] = useState(0);
  // Game stats
  const [shotsFired, setShotsFired] = useState(0);
  const [shotsHit, setShotsHit] = useState(0);
  const [gameStartTime, setGameStartTime] = useState(0);
  const [gameEndTime, setGameEndTime] = useState(0);
  const [weaponKills, setWeaponKills] = useState<Record<WeaponType, number>>({
    blaster: 0, shotgun: 0, plasma: 0, rocket: 0,
  });

  const playerPos = useRef(new THREE.Vector3(0, 2, 5));
  const playerYaw = useRef(0);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const shakeIntensity = useRef(0);
  const lastPowerupSpawn = useRef(0);
  const lastKillTime = useRef(0);
  const ambientSoundTimer = useRef(0);
  const footstepTimer = useRef(0);
  const stopAmbient = useRef<(() => void) | null>(null);
  const combatMusic = useRef<{ setIntensity: (v: number) => void; stop: () => void } | null>(null);

  useEffect(() => {
    setIsTouchDevice("ontouchstart" in window || navigator.maxTouchPoints > 0);
    setUnlockedMaps(getUnlockedMaps());
  }, []);

  useEffect(() => {
    if (health <= 0 && gameState === "playing") {
      setFinalScore(score);
      setGameEndTime(Date.now());
      setGameState("gameover");
      document.exitPointerLock?.();
      setLocked(false);
      stopAmbient.current?.();
      stopAmbient.current = null;
      combatMusic.current?.stop();
      combatMusic.current = null;
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
      combatMusic.current?.stop();
    };
  }, []);

  // Weapon switching with 1/2/3 keys
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (gameState !== "playing") return;
      if (e.code === "Digit1") setCurrentWeapon("blaster");
      if (e.code === "Digit2" && weaponAmmo.shotgun > 0) setCurrentWeapon("shotgun");
      if (e.code === "Digit3" && weaponAmmo.plasma > 0) setCurrentWeapon("plasma");
      if (e.code === "Digit4" && weaponAmmo.rocket > 0) setCurrentWeapon("rocket");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [gameState, weaponAmmo]);

  // Tab key for scoreboard (multiplayer)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Tab" && gameState === "playing") {
        e.preventDefault();
        setShowScoreboard(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Tab") setShowScoreboard(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [gameState]);

  // Internal game initializer — shared between waves and maps
  const startGame = useCallback((mode: "waves" | "maps", mapId?: string) => {
    setGameMode(mode);
    if (mode === "maps" && mapId) setSelectedMapId(mapId);

    setGameState("playing");
    setHealth(MAX_HEALTH);
    setScore(0);
    setWave(1);
    setCurrentWeapon("blaster");
    setWeaponAmmo({ blaster: -1, shotgun: 0, plasma: 0, rocket: 0 });
    setKills(0);
    setSpeedBoostEnd(0);
    setDamageBoostEnd(0);
    lastPowerupSpawn.current = 0;
    lastKillTime.current = 0;
    setKillStreak(0);
    setKillStreakText("");
    setScorePopups([]);
    setCrates(createInitialCrates());
    ambientSoundTimer.current = 0;
    setComboMultiplier(1);
    setComboTimer(0);
    setShotsFired(0);
    setShotsHit(0);
    setGameStartTime(Date.now());
    setGameEndTime(0);
    setWeaponKills({ blaster: 0, shotgun: 0, plasma: 0, rocket: 0 });
    setProjectiles([]);
    setParticles([]);
    setExplosions([]);
    setPickups([]);
    setRadarDots([]);
    setHitMarker(false);
    setWaveAnnounce(mode === "waves" ? 1 : 0);
    setDamageDirection(null);
    nextId = 1;
    shakeIntensity.current = 0;

    // Spawn enemies — for maps, spawn the map's fixed enemy set; for waves, start wave 1
    if (mode === "maps" && mapId) {
      const map = MAPS.find((m) => m.id === mapId);
      if (map) setEnemies(spawnMapEnemies(map));
    } else {
      setEnemies(spawnEnemies(1));
    }

    stopAmbient.current?.();
    stopAmbient.current = startAmbientHum();
    combatMusic.current?.stop();
    combatMusic.current = startCombatMusic();
    playWaveStartSound();

    canvasContainerRef.current?.requestPointerLock?.();
  }, []);

  // Entry from main menu — goes to mode select
  const handleStart = useCallback(() => {
    setGameState("modeSelect");
  }, []);

  const handleSelectMode = useCallback((mode: "waves" | "maps") => {
    if (mode === "waves") {
      startGame("waves");
    } else {
      setGameState("mapSelect");
    }
  }, [startGame]);

  const handleSelectMap = useCallback((mapId: string) => {
    startGame("maps", mapId);
  }, [startGame]);

  const handleBackToMenu = useCallback(() => {
    setGameState("menu");
  }, []);

  const handleNextMap = useCallback(() => {
    const next = getNextMapId(selectedMapId);
    if (next) startGame("maps", next);
  }, [selectedMapId, startGame]);

  const handleMapCleared = useCallback(() => {
    // Unlock next map and go to victory screen
    const next = getNextMapId(selectedMapId);
    if (next) {
      unlockMap(next);
      setUnlockedMaps(getUnlockedMaps());
    }
    setGameEndTime(Date.now());
    setGameState("victory");
    document.exitPointerLock?.();
    setLocked(false);
    stopAmbient.current?.();
    stopAmbient.current = null;
    combatMusic.current?.stop();
    combatMusic.current = null;
  }, [selectedMapId]);

  const handleRestart = useCallback(() => {
    // Retry in the current mode — replay current map in maps mode, restart waves otherwise
    if (gameMode === "maps") {
      startGame("maps", selectedMapId);
    } else {
      startGame("waves");
    }
  }, [gameMode, selectedMapId, startGame]);

  // ── Multiplayer handlers ──
  const handleMultiplayer = useCallback(() => {
    setGameState("multiplayer");
    if (!connectionManager.current) {
      connectionManager.current = new ConnectionManager({
        onStateChange: setMpConnectionState,
        onRoomInfo: (info) => {
          setMpRoomCode(info.roomCode);
          setMpPlayers(info.players);
          setMpHostId(info.hostId);
          setMpLocalId(info.localPlayerId);
        },
        onPlayerJoined: (player) => {
          setMpPlayers((prev) => [...prev, player]);
          // Add to 3D remote players
          setRemotePlayers((prev) => [
            ...prev.filter((p) => p.id !== player.id),
            {
              id: player.id,
              name: player.name,
              position: new THREE.Vector3(...player.position),
              targetPosition: new THREE.Vector3(...player.position),
              rotation: player.rotation,
              targetRotation: player.rotation,
              weapon: player.weapon,
              health: player.health,
              alive: player.alive,
              lastUpdate: Date.now(),
            },
          ]);
        },
        onPlayerLeft: (playerId) => {
          setMpPlayers((prev) => prev.filter((p) => p.id !== playerId));
          setRemotePlayers((prev) => prev.filter((p) => p.id !== playerId));
        },
        onPlayerUpdate: (playerId, position, rotation, weapon) => {
          setRemotePlayers((prev) => {
            const existing = prev.find((p) => p.id === playerId);
            if (existing) {
              existing.targetPosition.set(...position);
              existing.targetRotation = rotation;
              existing.weapon = weapon;
              existing.lastUpdate = Date.now();
              return [...prev];
            }
            return prev;
          });
        },
        onPlayerShoot: (playerId, origin, direction, weapon) => {
          // Render remote player's projectile
          const config = WEAPON_CONFIGS[weapon as WeaponType] || WEAPON_CONFIGS.blaster;
          const newProjectiles: ProjectileData[] = [];
          for (let i = 0; i < config.pellets; i++) {
            const dir = new THREE.Vector3(...direction);
            if (config.spread > 0) {
              dir.x += (Math.random() - 0.5) * config.spread * 2;
              dir.y += (Math.random() - 0.5) * config.spread;
              dir.z += (Math.random() - 0.5) * config.spread * 2;
              dir.normalize();
            }
            newProjectiles.push({
              id: nextId++,
              position: new THREE.Vector3(...origin),
              direction: dir,
              speed: config.speed,
              alive: true,
              friendly: true,
              life: config.projectileLife,
              color: config.color,
              size: config.projectileSize,
            });
          }
          setProjectiles((prev) => [...prev, ...newProjectiles]);
        },
        onPlayerDamage: (_playerId, health, _attackerId) => {
          // If this is our player being damaged
          setHealth(health);
          setDamageFlash(true);
          setTimeout(() => setDamageFlash(false), 150);
          playDamageSound();
          shakeIntensity.current = 0.12;
        },
        onPlayerDeath: (playerId, killerId) => {
          setRemotePlayers((prev) =>
            prev.map((p) => p.id === playerId ? { ...p, alive: false } : p)
          );
          // Add to kill feed
          const killer = mpPlayers.find((p) => p.id === killerId);
          const victim = mpPlayers.find((p) => p.id === playerId);
          if (killer && victim) {
            setKillFeedEntries((prev) => [
              ...prev.slice(-20),
              createKillFeedEntry(killer.name, victim.name, "weapon"),
            ]);
          }
        },
        onPlayerRespawn: (playerId, position) => {
          setRemotePlayers((prev) =>
            prev.map((p) => {
              if (p.id === playerId) {
                p.targetPosition.set(...position);
                p.position.set(...position);
                return { ...p, alive: true, health: 100 };
              }
              return p;
            })
          );
        },
        onGameStart: (mode, mapId) => {
          // Start the game when host presses start — initialize based on mode
          if (mode === "coop-waves" || mode === "deathmatch") {
            startGame("waves");
          } else if (mode === "coop-maps" && mapId) {
            startGame("maps", mapId);
          } else {
            startGame("waves");
          }
        },
        onEnemySync: (syncedEnemies) => {
          // Non-host: update local enemies from host's authoritative state
          // This is received at ~10Hz from the host via server relay
          // For now, just log — full integration needs enemy state reconciliation
          // TODO: reconcile local enemy positions with synced data
        },
        onEnemyDamage: (_enemyId, _hp, _killerId) => {
          // Host receives this from non-host players when they hit an enemy
          // TODO: apply damage to local enemy and re-sync
        },
        onChat: (_playerId, name, text) => {
          // Show chat as a kill feed-style entry
          setKillFeedEntries((prev) => [
            ...prev.slice(-20),
            { id: Date.now(), killerName: name, victimName: text, weapon: "chat", timestamp: Date.now() },
          ]);
        },
        onError: (msg) => { console.error("Multiplayer error:", msg); },
      });
    }
  }, [startGame]);

  const handleMpHost = useCallback((name: string) => {
    connectionManager.current?.createRoom(name);
  }, []);

  const handleMpJoin = useCallback((roomCode: string, name: string) => {
    // TODO: look up roomId from roomCode (needs server endpoint)
    connectionManager.current?.joinRoom(roomCode, name);
  }, []);

  const handleMpStartGame = useCallback((mode: "coop-waves" | "coop-maps" | "deathmatch") => {
    connectionManager.current?.sendStartGame(mode);
  }, []);

  const handleMpLeave = useCallback(() => {
    connectionManager.current?.disconnect();
    setMpPlayers([]);
    setMpRoomCode("");
    setMpHostId("");
    setMpLocalId("");
    setGameState("modeSelect");
  }, []);

  const handleShoot = useCallback(
    (origin: THREE.Vector3, direction: THREE.Vector3) => {
      if (gameState !== "playing") return;

      const config = WEAPON_CONFIGS[currentWeapon];
      const ammo = weaponAmmo[currentWeapon];
      if (ammo === 0) return;

      // Track shots fired (per pellet for accurate accuracy calc)
      setShotsFired((s) => s + config.pellets);

      // Per-weapon sound
      switch (currentWeapon) {
        case "blaster": playBlasterSound(); break;
        case "shotgun": playShotgunSound(); break;
        case "plasma": playPlasmaSound(); break;
        case "rocket": playRocketSound(); break;
      }

      // Per-weapon screen shake on fire
      const fireShake = currentWeapon === "rocket" ? 0.12
        : currentWeapon === "shotgun" ? 0.08
        : currentWeapon === "plasma" ? 0.05
        : 0;
      if (fireShake > 0) shakeIntensity.current = Math.max(shakeIntensity.current, fireShake);

      // Deduct ammo (skip if infinite = -1)
      if (ammo > 0) {
        setWeaponAmmo((prev) => {
          const newAmmo = { ...prev, [currentWeapon]: prev[currentWeapon] - 1 };
          if (newAmmo[currentWeapon] <= 0 && currentWeapon !== "blaster") {
            setTimeout(() => setCurrentWeapon("blaster"), 0);
          }
          return newAmmo;
        });
      }

      // Create projectiles
      const newProjectiles: ProjectileData[] = [];
      for (let i = 0; i < config.pellets; i++) {
        const dir = direction.clone().normalize();
        if (config.spread > 0) {
          // Cone-shaped spread: random angle within cone, random rotation around axis
          const spreadAngle = config.spread * Math.sqrt(Math.random()); // sqrt for uniform disc
          const rotAngle = Math.random() * Math.PI * 2;
          // Create perpendicular axes
          const up = new THREE.Vector3(0, 1, 0);
          const right = new THREE.Vector3().crossVectors(dir, up).normalize();
          const actualUp = new THREE.Vector3().crossVectors(right, dir).normalize();
          // Offset direction within cone
          dir.addScaledVector(right, Math.cos(rotAngle) * spreadAngle);
          dir.addScaledVector(actualUp, Math.sin(rotAngle) * spreadAngle);
          dir.normalize();
        }
        newProjectiles.push({
          id: nextId++,
          position: origin.clone(),
          direction: dir,
          speed: config.speed + (config.pellets > 1 ? (Math.random() - 0.5) * 5 : 0), // slight speed variation for shotgun
          alive: true,
          friendly: true,
          life: config.projectileLife,
          color: config.color,
          size: config.projectileSize,
        });
      }

      setProjectiles((prev) => [...prev, ...newProjectiles]);

      // Broadcast shoot to multiplayer
      if (connectionManager.current?.getState() === "connected") {
        connectionManager.current.sendShoot(
          [origin.x, origin.y, origin.z],
          [direction.x, direction.y, direction.z],
          currentWeapon
        );
      }
    },
    [gameState, currentWeapon, weaponAmmo]
  );

  if (isTouchDevice) {
    return (
      <div
        style={{
          width: "100%",
          maxWidth: 1400,
          aspectRatio: "16/9",
          background: "#0d0905",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#7a8a3a",
          fontFamily: "'Courier New', monospace",
          fontSize: 14,
          textAlign: "center",
          padding: 20,
          border: "1px solid #8B451333",
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
        maxWidth: 1400,
        aspectRatio: "16/9",
        margin: "0 auto",
        borderRadius: 8,
        overflow: "hidden",
        border: "1px solid #8B451333",
        background: "#0d0905",
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
          shadows={false}
          dpr={[1, 1.5]}
          gl={{
            antialias: true,
            toneMapping: THREE.ReinhardToneMapping,
            toneMappingExposure: 1.0,
          }}
          camera={{ fov: 75, near: 0.1, far: 100 }}
        >
          <Suspense fallback={null}>
            <fog attach="fog" args={["#1a1008", 20, 50]} />
            <Physics gravity={[0, -15, 0]}>
              <Player locked={locked} sensitivity={mouseSensitivity} speedMultiplier={playerSpeedMult} />
              <Level />
            </Physics>
            <Weapon locked={locked} weaponType={currentWeapon} ammo={weaponAmmo[currentWeapon]} onShoot={handleShoot} />
            <Enemies enemies={enemies} playerPosition={playerPos.current} />
            <Projectiles projectiles={projectiles} />
            <Particles particles={particles} explosions={explosions} />
            <Pickups pickups={pickups} />
            <DestructibleCrates crates={crates} />
            <Doors />
            <RemotePlayers players={remotePlayers} />
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
              currentWeapon={currentWeapon}
              damageBoostEnd={damageBoostEnd}
              setWeaponAmmo={setWeaponAmmo}
              setCurrentWeapon={setCurrentWeapon}
              setSpeedBoostEnd={setSpeedBoostEnd}
              setDamageBoostEnd={setDamageBoostEnd}
              lastPowerupSpawn={lastPowerupSpawn}
              lastKillTime={lastKillTime}
              footstepTimer={footstepTimer}
              setKillStreak={setKillStreak}
              setKillStreakText={setKillStreakText}
              setScorePopups={setScorePopups}
              crates={crates}
              setCrates={setCrates}
              ambientSoundTimer={ambientSoundTimer}
              comboMultiplier={comboMultiplier}
              setComboMultiplier={setComboMultiplier}
              setComboTimer={setComboTimer}
              setShotsFired={setShotsFired}
              setShotsHit={setShotsHit}
              setWeaponKills={setWeaponKills}
              combatMusic={combatMusic}
              speedBoostEnd={speedBoostEnd}
              setPlayerSpeedMult={setPlayerSpeedMult}
              gameMode={gameMode}
              onMapCleared={handleMapCleared}
              connectionManager={connectionManager}
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
        currentWeapon={currentWeapon}
        weaponAmmo={weaponAmmo}
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
        killStreakText={killStreakText}
        scorePopups={scorePopups}
        bossHp={enemies.find((e) => e.type === "boss" && e.alive)?.hp ?? 0}
        bossMaxHp={enemies.find((e) => e.type === "boss")?.maxHp ?? 0}
        comboMultiplier={comboMultiplier}
        comboTimer={comboTimer}
        mouseSensitivity={mouseSensitivity}
        onSensitivityChange={setMouseSensitivity}
        shotsFired={shotsFired}
        shotsHit={shotsHit}
        gameStartTime={gameStartTime}
        gameEndTime={gameEndTime}
        weaponKills={weaponKills}
        gameMode={gameMode}
        unlockedMaps={unlockedMaps}
        onSelectMode={handleSelectMode}
        onSelectMap={handleSelectMap}
        onBackToMenu={handleBackToMenu}
        onNextMap={handleNextMap}
        clearedMap={MAPS.find((m) => m.id === selectedMapId) ?? null}
        hasNextMap={getNextMapId(selectedMapId) !== null}
        onMultiplayer={handleMultiplayer}
      />

      <DamageFlash flash={damageFlash} />

      {/* CSS vignette — replaces WebGL EffectComposer (zero GPU cost) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          boxShadow: "inset 0 0 150px 60px rgba(0,0,0,0.65)",
        }}
      />

      {/* Multiplayer kill feed */}
      <KillFeed entries={killFeedEntries} />

      {/* Multiplayer scoreboard (Tab to show) */}
      <Scoreboard
        visible={showScoreboard && mpPlayers.length > 0}
        players={mpPlayers}
        localPlayerId={mpLocalId}
      />

      {/* Multiplayer lobby overlay */}
      <LobbyUI
        visible={gameState === "multiplayer"}
        roomCode={mpRoomCode}
        players={mpPlayers}
        hostId={mpHostId}
        localPlayerId={mpLocalId}
        roomState="lobby"
        connectionState={mpConnectionState}
        isHost={mpLocalId === mpHostId}
        onHost={handleMpHost}
        onJoin={handleMpJoin}
        onStartGame={handleMpStartGame}
        onLeave={handleMpLeave}
        onBack={() => setGameState("modeSelect")}
      />
    </div>
  );
}
