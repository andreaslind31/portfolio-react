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
import PostProcessing from "./PostProcessing";
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
  startAmbientHum,
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

// ── Spawn config per wave ────────────────────────────────
function getWaveConfig(wave: number) {
  // Mix of all three types from wave 1 for variety
  const drones = Math.min(1 + wave, 6);
  const sentinels = Math.max(1, Math.floor(wave / 2) + 1);
  const heavies = Math.max(1, Math.floor((wave + 1) / 3));
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
    const strafe = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(e.strafeDir);
    e.position.addScaledVector(strafe, e.speed * 0.3 * dt);
    e.position.addScaledVector(dir, e.speed * 0.2 * dt);
    if (Math.random() < 0.02) e.strafeDir *= -1;
  }
  e.lastMoveDir.copy(dir);
}

// ── Wall collision for enemies ───────────────────────────
const ENEMY_RADIUS = 0.6;

function resolveWallCollisions(pos: THREE.Vector3) {
  for (const [cx, cz, hw, hd] of WALL_COLLIDERS) {
    const padW = hw + ENEMY_RADIUS;
    const padD = hd + ENEMY_RADIUS;

    // Check if enemy center is inside the padded AABB
    const dx = pos.x - cx;
    const dz = pos.z - cz;

    if (Math.abs(dx) < padW && Math.abs(dz) < padD) {
      // Find shortest push-out axis
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
  currentWeapon: WeaponType;
  damageBoostEnd: number;
  setWeaponAmmo: React.Dispatch<React.SetStateAction<Record<WeaponType, number>>>;
  setCurrentWeapon: React.Dispatch<React.SetStateAction<WeaponType>>;
  setSpeedBoostEnd: React.Dispatch<React.SetStateAction<number>>;
  setDamageBoostEnd: React.Dispatch<React.SetStateAction<number>>;
  lastPowerupSpawn: React.MutableRefObject<number>;
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

        // Resolve wall collisions
        resolveWallCollisions(e.position);

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

        if (e.type === "drone") {
          if (now - lastShot > DRONE_SHOOT_CD && dist < 18) {
            enemyShootTimers.current.set(e.id, now);
            fireEnemyProjectile(e, playerPos.current, setProjectiles);
            e.isShooting = true;
            e.shootFrame = 0;
          }
        } else if (e.type === "sentinel") {
          const lastBurst = sentinelBurstTimers.current.get(e.id) || 0;
          if (e.burstCount > 0 && now - lastShot > SENTINEL_SHOOT_CD && dist < 22) {
            enemyShootTimers.current.set(e.id, now);
            e.burstCount--;
            fireEnemyProjectile(e, playerPos.current, setProjectiles);
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
          if (now - lastShot > HEAVY_MELEE_CD && dist < HEAVY_MELEE_RANGE) {
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
            // Check if this projectile is explosive (rocket)
            const isExplosive = p.size && p.size >= 3 && p.color === "#ff4444";
            const explosionRadius = isExplosive ? 5 : 0;

            let directHit = false;
            for (const e of enemies) {
              if (!e.alive) continue;
              const enemyWorldPos = e.position.clone();
              enemyWorldPos.y += 1.0;
              if (p.position.distanceTo(enemyWorldPos) < HIT_RADIUS) {
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
                    ...createImpactSparks(p.position.clone(), hitNormal, "#00d4ff", 6),
                  ]);
                  playHitSound();
                  setHitMarker(true);
                  setTimeout(() => setHitMarker(false), 100);

                  const weaponDmg = WEAPON_CONFIGS[currentWeapon].damage;
                  const dmgMult = state.clock.elapsedTime < damageBoostEnd ? DAMAGE_BOOST_MULTIPLIER : 1;
                  e.hp -= weaponDmg * dmgMult;
                  if (e.hp <= 0) {
                    e.alive = false;
                    const points = e.type === "drone" ? 100 : e.type === "sentinel" ? 200 : 500;
                    setScore((s) => s + points);
                    setKills((k) => k + 1);
                    const deathColor = e.type === "drone" ? "#ff2255" : e.type === "sentinel" ? "#ff8800" : "#ff0044";
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

    // ── Update pickups (collection) ──
    setPickups((prev) =>
      prev
        .map((pk) => {
          if (!pk.alive) return pk;
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
          return pk;
        })
        .filter((pk) => pk.alive)
    );

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
    ...createDeathExplosion(pos, "#ff4444", 25),
  ]);
  setExplosions((ex) => [
    ...ex,
    { id: nextId++, position: pos.clone(), color: "#ff4444", startTime: state.clock.elapsedTime, duration: 0.6, size: 2.5 },
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
        const points = e.type === "drone" ? 100 : e.type === "sentinel" ? 200 : 500;
        setScore((s) => s + points);
        setKills((k) => k + 1);
        const deathColor = e.type === "drone" ? "#ff2255" : e.type === "sentinel" ? "#ff8800" : "#ff0044";
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
  speed: number = ENEMY_PROJECTILE_SPEED
) {
  const shootDir = new THREE.Vector3()
    .subVectors(playerPosition, e.position)
    .normalize();
  // Add slight inaccuracy (less for sentinels, more for heavies)
  const inaccuracy = e.type === "sentinel" ? 0.05 : e.type === "heavy" ? 0.15 : 0.1;
  shootDir.x += (Math.random() - 0.5) * inaccuracy;
  shootDir.y += (Math.random() - 0.5) * inaccuracy * 0.5;
  shootDir.z += (Math.random() - 0.5) * inaccuracy;
  shootDir.normalize();

  const colors = ENEMY_COLORS[e.type];
  const projSize = e.type === "heavy" ? 2.5 : e.type === "sentinel" ? 1.5 : 1;

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
  const [gameState, setGameState] = useState<"menu" | "playing" | "gameover">(
    "menu"
  );
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

  const playerPos = useRef(new THREE.Vector3(0, 2, 5));
  const playerYaw = useRef(0);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const shakeIntensity = useRef(0);
  const lastPowerupSpawn = useRef(0);
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

  const handleStart = useCallback(() => {
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

      const config = WEAPON_CONFIGS[currentWeapon];
      const ammo = weaponAmmo[currentWeapon];
      if (ammo === 0) return;

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
    },
    [gameState, currentWeapon, weaponAmmo]
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
            toneMappingExposure: 1.6,
          }}
          camera={{ fov: 75, near: 0.1, far: 100 }}
        >
          <Suspense fallback={null}>
            <fog attach="fog" args={["#0e0e1e", 30, 65]} />
            <Physics gravity={[0, -15, 0]}>
              <Player locked={locked} />
              <Level />
            </Physics>
            <Weapon locked={locked} weaponType={currentWeapon} ammo={weaponAmmo[currentWeapon]} onShoot={handleShoot} />
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
              currentWeapon={currentWeapon}
              damageBoostEnd={damageBoostEnd}
              setWeaponAmmo={setWeaponAmmo}
              setCurrentWeapon={setCurrentWeapon}
              setSpeedBoostEnd={setSpeedBoostEnd}
              setDamageBoostEnd={setDamageBoostEnd}
              lastPowerupSpawn={lastPowerupSpawn}
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
      />

      <DamageFlash flash={damageFlash} />
    </div>
  );
}
