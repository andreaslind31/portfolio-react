"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import {
  createWallTexture,
  createFloorTexture,
  createCeilingTexture,
  createTrimTexture,
  createCrateTexture,
} from "./Textures";

// ── Warmer, brighter Doom-inspired palette ──────────────
const FLOOR_COLOR = "#4a3d30";
const WALL_COLOR = "#5a4838";
const TRIM_COLOR = "#5a4028";
const CEILING_COLOR = "#3a3025";
const EMISSIVE_CYAN = "#00d4ff";
const EMISSIVE_PURPLE = "#cc66ff";
const EMISSIVE_RED = "#ff4455";
const EMISSIVE_ORANGE = "#ffa844";
const EMISSIVE_GREEN = "#44ff88";

// ── Arena dimensions (exported for game logic) ──────────
export const ARENA_HALF_W = 25;
export const ARENA_HALF_D = 30;
const WALL_H = 5;
const WALL_T = 0.5;

// ── Spawn portal positions (exported for enemy spawning) ─
export const SPAWN_PORTALS: [number, number, number][] = [
  [0, 0, -ARENA_HALF_D + 2], // North room
  [0, 0, ARENA_HALF_D - 2], // South room
  [ARENA_HALF_W - 2, 0, 0], // East room
  [-ARENA_HALF_W + 2, 0, 0], // West room
];

// ── Wall collision boxes for enemy AI [cx, cz, halfW, halfD] ─
// These match the interior wall geometry so enemies can't walk through.
export const WALL_COLLIDERS: [number, number, number, number][] = [
  // ── North corridor walls ──
  [-5, -14, 0.5, 7],
  [5, -14, 0.5, 7],
  // North room side walls
  [-12, -22, 0.5, 4],
  [12, -22, 0.5, 4],
  [-8.5, -18, 3.5, 0.5],
  [8.5, -18, 3.5, 0.5],

  // ── South corridor walls ──
  [-5, 14, 0.5, 7],
  [5, 14, 0.5, 7],
  // South room side walls
  [-12, 22, 0.5, 4],
  [12, 22, 0.5, 4],
  [-8.5, 18, 3.5, 0.5],
  [8.5, 18, 3.5, 0.5],
  // Reactor core
  [0, 23, 2.2, 2.2],

  // ── East corridor walls ──
  [14, -5, 7, 0.5],
  [14, 5, 7, 0.5],
  // East room side walls
  [22, -8, 4, 0.5],
  [22, 8, 4, 0.5],
  [18, -6.5, 0.5, 1.5],
  [18, 6.5, 0.5, 1.5],

  // ── West corridor walls ──
  [-14, -5, 7, 0.5],
  [-14, 5, 7, 0.5],
  // West room side walls
  [-22, -8, 4, 0.5],
  [-22, 8, 4, 0.5],
  [-18, -6.5, 0.5, 1.5],
  [-18, 6.5, 0.5, 1.5],
  // Catwalk support
  [-17, 0, 1.2, 5],

  // ── Central hub ──
  // Central platform
  [0, 0, 4.2, 4.2],
  // Corner cover crates
  [8, -8, 1.5, 1.5],
  [-8, -8, 1.5, 1.5],
  [8, 8, 1.5, 1.5],
  [-8, 8, 1.5, 1.5],
  // Half-height walls at corridor entrances
  [3.5, -8, 0.7, 1.7],
  [-3.5, -8, 0.7, 1.7],
  [3.5, 8, 0.7, 1.7],
  [-3.5, 8, 0.7, 1.7],

  // ── Crates in rooms ──
  [-10, -24, 1.2, 0.8],
  [-10, -21, 1.2, 0.8],
  [10, -24, 1.2, 0.8],
  [-20, -6, 0.8, 0.8],
  [-20, -3, 1, 1],
  [-20, 3, 0.8, 0.8],
  [-20, 6, 1, 1],
];

// ═══════════════════════════════════════════════════════════
// Reusable building blocks
// ═══════════════════════════════════════════════════════════

function GlowStrip({
  position,
  scale,
  color = EMISSIVE_CYAN,
  intensity = 2,
}: {
  position: [number, number, number];
  scale: [number, number, number];
  color?: string;
  intensity?: number;
}) {
  return (
    <mesh position={position}>
      <boxGeometry args={scale} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={intensity}
        toneMapped={false}
      />
    </mesh>
  );
}

function Wall({
  position,
  rotation,
  size,
  texture,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  size: [number, number, number];
  texture?: THREE.CanvasTexture;
}) {
  // Scale UV repeat based on wall dimensions
  const mat = useMemo(() => {
    if (texture) {
      const t = texture.clone();
      // Repeat based on the largest face dimensions
      const maxDim = Math.max(size[0], size[2]);
      const heightDim = size[1];
      t.repeat.set(maxDim / 2, heightDim / 2);
      t.wrapS = THREE.RepeatWrapping;
      t.wrapT = THREE.RepeatWrapping;
      t.needsUpdate = true;
      return new THREE.MeshStandardMaterial({
        map: t,
        metalness: 0.3,
        roughness: 0.7,
        emissive: new THREE.Color(WALL_COLOR),
        emissiveIntensity: 0.05,
      });
    }
    return new THREE.MeshStandardMaterial({
      color: WALL_COLOR,
      metalness: 0.3,
      roughness: 0.7,
      emissive: new THREE.Color(WALL_COLOR),
      emissiveIntensity: 0.05,
    });
  }, [texture, size]);

  return (
    <RigidBody type="fixed" position={position} rotation={rotation} colliders="cuboid">
      <mesh castShadow receiveShadow material={mat}>
        <boxGeometry args={size} />
      </mesh>
    </RigidBody>
  );
}

function CeilingLight({
  position,
  color = EMISSIVE_CYAN,
  intensity = 10,
  flicker = false,
}: {
  position: [number, number, number];
  color?: string;
  intensity?: number;
  flicker?: boolean;
}) {
  const lightRef = useRef<THREE.PointLight>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const flickerOffset = useRef(Math.random() * 100);

  useFrame((state) => {
    if (!flicker || !lightRef.current || !matRef.current) return;
    const t = state.clock.elapsedTime + flickerOffset.current;
    // Irregular flicker using combined sine waves
    const flick = Math.sin(t * 15) * Math.sin(t * 7.3) * Math.sin(t * 3.1);
    const on = flick > -0.3; // mostly on, occasional dropout
    const mult = on ? (0.7 + Math.random() * 0.3) : 0.05;
    lightRef.current.intensity = intensity * mult;
    matRef.current.emissiveIntensity = on ? 3 * mult : 0.2;
  });

  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[1.5, 0.1, 0.3]} />
        <meshStandardMaterial
          ref={matRef}
          color={color}
          emissive={color}
          emissiveIntensity={3}
          toneMapped={false}
        />
      </mesh>
      <pointLight ref={lightRef} position={[0, -0.5, 0]} color={color} intensity={intensity} distance={18} decay={2} />
    </group>
  );
}

function EnergyPillar({
  position,
  color = EMISSIVE_CYAN,
}: {
  position: [number, number, number];
  color?: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 1.5 + Math.sin(state.clock.elapsedTime * 2) * 0.5;
    }
  });

  return (
    <group position={position}>
      <mesh castShadow>
        <cylinderGeometry args={[0.3, 0.4, 0.3, 8]} />
        <meshStandardMaterial color={TRIM_COLOR} metalness={0.3} roughness={0.5} emissive={TRIM_COLOR} emissiveIntensity={0.06} />
      </mesh>
      <mesh ref={meshRef} position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.15, 2.7, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} toneMapped={false} transparent opacity={0.8} />
      </mesh>
      <mesh position={[0, 3, 0]} castShadow>
        <cylinderGeometry args={[0.4, 0.3, 0.3, 8]} />
        <meshStandardMaterial color={TRIM_COLOR} metalness={0.3} roughness={0.5} emissive={TRIM_COLOR} emissiveIntensity={0.06} />
      </mesh>
    </group>
  );
}

/** Animated spawn portal — glowing doorway where enemies appear */
function SpawnPortal({
  position,
  rotation,
  color = EMISSIVE_RED,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  color?: string;
}) {
  const ringRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (ringRef.current) {
      const mat = ringRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 1.5 + Math.sin(state.clock.elapsedTime * 3) * 1;
      ringRef.current.rotation.z = state.clock.elapsedTime * 0.5;
    }
  });

  return (
    <group position={position} rotation={rotation}>
      {/* Arch frame */}
      <mesh position={[-1.2, 1.5, 0]} castShadow>
        <boxGeometry args={[0.2, 3, 0.3]} />
        <meshStandardMaterial color={TRIM_COLOR} metalness={0.3} roughness={0.5} emissive={TRIM_COLOR} emissiveIntensity={0.06} />
      </mesh>
      <mesh position={[1.2, 1.5, 0]} castShadow>
        <boxGeometry args={[0.2, 3, 0.3]} />
        <meshStandardMaterial color={TRIM_COLOR} metalness={0.3} roughness={0.5} emissive={TRIM_COLOR} emissiveIntensity={0.06} />
      </mesh>
      <mesh position={[0, 3.1, 0]} castShadow>
        <boxGeometry args={[2.6, 0.2, 0.3]} />
        <meshStandardMaterial color={TRIM_COLOR} metalness={0.3} roughness={0.5} emissive={TRIM_COLOR} emissiveIntensity={0.06} />
      </mesh>
      {/* Spinning energy ring */}
      <mesh ref={ringRef} position={[0, 1.5, 0]}>
        <torusGeometry args={[1, 0.05, 8, 24]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} toneMapped={false} transparent opacity={0.7} />
      </mesh>
      {/* Inner glow plane */}
      <mesh position={[0, 1.5, 0]}>
        <planeGeometry args={[2, 3]} />
        <meshBasicMaterial color={color} transparent opacity={0.08} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {/* Emissive ring provides glow without point light */}
    </group>
  );
}

/** Cargo crate for cover / decoration */
function Crate({
  position,
  size = [1.2, 1.2, 1.2] as [number, number, number],
  stripeColor = EMISSIVE_ORANGE,
  texture,
}: {
  position: [number, number, number];
  size?: [number, number, number];
  stripeColor?: string;
  texture?: THREE.CanvasTexture;
}) {
  return (
    <RigidBody type="fixed" position={position} colliders="cuboid">
      <mesh castShadow receiveShadow>
        <boxGeometry args={size} />
        {texture ? (
          <meshStandardMaterial map={texture} metalness={0.3} roughness={0.7} />
        ) : (
          <meshStandardMaterial color={TRIM_COLOR} metalness={0.3} roughness={0.7} />
        )}
      </mesh>
      {/* Hazard stripe */}
      <mesh position={[0, 0, size[2] / 2 + 0.001]}>
        <planeGeometry args={[size[0] * 0.8, size[1] * 0.15]} />
        <meshStandardMaterial color={stripeColor} emissive={stripeColor} emissiveIntensity={1} toneMapped={false} />
      </mesh>
    </RigidBody>
  );
}

/** Computer terminal / console */
function Terminal({
  position,
  rotation,
  screenColor = EMISSIVE_CYAN,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  screenColor?: string;
}) {
  const screenRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (screenRef.current) {
      const mat = screenRef.current.material as THREE.MeshStandardMaterial;
      // Flicker
      mat.emissiveIntensity = 2 + Math.sin(state.clock.elapsedTime * 8) * 0.3;
    }
  });

  return (
    <group position={position} rotation={rotation}>
      {/* Console base */}
      <mesh position={[0, 0.4, 0]} castShadow>
        <boxGeometry args={[0.8, 0.8, 0.5]} />
        <meshStandardMaterial color="#2e2e48" metalness={0.3} roughness={0.5} emissive="#2e2e48" emissiveIntensity={0.06} />
      </mesh>
      {/* Screen */}
      <mesh ref={screenRef} position={[0, 1, -0.05]} rotation={[-0.2, 0, 0]}>
        <planeGeometry args={[0.6, 0.4]} />
        <meshStandardMaterial color={screenColor} emissive={screenColor} emissiveIntensity={2} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Ramp for verticality */
function Ramp({
  position,
  rotation,
  size = [3, 0.2, 5] as [number, number, number],
  rampRotation = [-0.3, 0, 0] as [number, number, number],
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  size?: [number, number, number];
  rampRotation?: [number, number, number];
}) {
  return (
    <RigidBody type="fixed" position={position} rotation={rotation} colliders="cuboid">
      <mesh rotation={rampRotation} castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color={TRIM_COLOR} metalness={0.3} roughness={0.5} emissive={TRIM_COLOR} emissiveIntensity={0.06} />
      </mesh>
    </RigidBody>
  );
}

// ═══════════════════════════════════════════════════════════
// Main Level component
// ═══════════════════════════════════════════════════════════

export default function Level() {
  const W = ARENA_HALF_W * 2; // 50
  const D = ARENA_HALF_D * 2; // 60

  // Create textures once
  const wallTex = useMemo(() => createWallTexture(), []);
  const floorTex = useMemo(() => {
    const t = createFloorTexture();
    t.repeat.set(W / 3, D / 3);
    return t;
  }, []);
  const ceilingTex = useMemo(() => {
    const t = createCeilingTexture();
    t.repeat.set(W / 4, D / 4);
    return t;
  }, []);
  const trimTex = useMemo(() => createTrimTexture(), []);
  const crateTex = useMemo(() => createCrateTexture(), []);

  return (
    <group>
      {/* ═══════════════════════════════════════════════════
          FLOOR + CEILING + OUTER WALLS
          ═══════════════════════════════════════════════════ */}

      {/* Main floor */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh receiveShadow position={[0, -0.25, 0]}>
          <boxGeometry args={[W, 0.5, D]} />
          <meshStandardMaterial
            map={floorTex}
            metalness={0.2}
            roughness={0.8}
            emissive={new THREE.Color(FLOOR_COLOR)}
            emissiveIntensity={0.04}
          />
        </mesh>
      </RigidBody>
      <gridHelper args={[W, 50, EMISSIVE_CYAN, "#0e0c14"]} position={[0, 0.01, 0]} />

      {/* Ceiling */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, WALL_H + 0.25, 0]}>
          <boxGeometry args={[W, 0.5, D]} />
          <meshStandardMaterial
            map={ceilingTex}
            metalness={0.2}
            roughness={0.8}
            emissive={new THREE.Color(CEILING_COLOR)}
            emissiveIntensity={0.06}
          />
        </mesh>
      </RigidBody>

      {/* Outer walls — North/South */}
      <Wall position={[0, WALL_H / 2, -ARENA_HALF_D]} size={[W, WALL_H, WALL_T]} texture={wallTex} />
      <Wall position={[0, WALL_H / 2, ARENA_HALF_D]} size={[W, WALL_H, WALL_T]} texture={wallTex} />
      {/* Outer walls — East/West */}
      <Wall position={[ARENA_HALF_W, WALL_H / 2, 0]} rotation={[0, Math.PI / 2, 0]} size={[D, WALL_H, WALL_T]} texture={wallTex} />
      <Wall position={[-ARENA_HALF_W, WALL_H / 2, 0]} rotation={[0, Math.PI / 2, 0]} size={[D, WALL_H, WALL_T]} texture={wallTex} />

      {/* Perimeter glow strips — floor level */}
      <GlowStrip position={[0, 0.15, -ARENA_HALF_D + 0.3]} scale={[W - 1, 0.08, 0.08]} />
      <GlowStrip position={[0, 0.15, ARENA_HALF_D - 0.3]} scale={[W - 1, 0.08, 0.08]} />
      <GlowStrip position={[-ARENA_HALF_W + 0.3, 0.15, 0]} scale={[0.08, 0.08, D - 1]} />
      <GlowStrip position={[ARENA_HALF_W - 0.3, 0.15, 0]} scale={[0.08, 0.08, D - 1]} />
      {/* Mid-height accent strips */}
      <GlowStrip position={[0, 2.5, -ARENA_HALF_D + 0.3]} scale={[W - 1, 0.05, 0.05]} color={EMISSIVE_PURPLE} />
      <GlowStrip position={[0, 2.5, ARENA_HALF_D - 0.3]} scale={[W - 1, 0.05, 0.05]} color={EMISSIVE_PURPLE} />
      <GlowStrip position={[-ARENA_HALF_W + 0.3, 2.5, 0]} scale={[0.05, 0.05, D - 1]} color={EMISSIVE_PURPLE} />
      <GlowStrip position={[ARENA_HALF_W - 0.3, 2.5, 0]} scale={[0.05, 0.05, D - 1]} color={EMISSIVE_PURPLE} />

      {/* ═══════════════════════════════════════════════════
          CENTRAL HUB — open area with raised platform
          ═══════════════════════════════════════════════════ */}

      {/* Central elevated platform */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[8, 1, 8]} />
          <meshStandardMaterial color={TRIM_COLOR} metalness={0.3} roughness={0.5} emissive={TRIM_COLOR} emissiveIntensity={0.06} />
        </mesh>
      </RigidBody>
      <GlowStrip position={[0, 1.02, 0]} scale={[7.5, 0.04, 7.5]} color={EMISSIVE_CYAN} intensity={1} />

      {/* Ramps to central platform — 4 sides */}
      <Ramp position={[0, 0.4, -5.5]} rampRotation={[0.2, 0, 0]} size={[3, 0.2, 4]} />
      <Ramp position={[0, 0.4, 5.5]} rampRotation={[-0.2, 0, 0]} size={[3, 0.2, 4]} />
      <Ramp position={[-5.5, 0.4, 0]} rotation={[0, Math.PI / 2, 0]} rampRotation={[0.2, 0, 0]} size={[3, 0.2, 4]} />
      <Ramp position={[5.5, 0.4, 0]} rotation={[0, Math.PI / 2, 0]} rampRotation={[-0.2, 0, 0]} size={[3, 0.2, 4]} />

      {/* ═══════════════════════════════════════════════════
          NORTH CORRIDOR — Weapon Bay
          ═══════════════════════════════════════════════════ */}

      {/* Corridor walls (narrow passage) */}
      <Wall position={[-5, WALL_H / 2, -14]} size={[0.5, WALL_H, 14]} texture={wallTex} />
      <Wall position={[5, WALL_H / 2, -14]} size={[0.5, WALL_H, 14]} texture={wallTex} />
      {/* Corridor glow strips */}
      <GlowStrip position={[-4.7, 0.15, -14]} scale={[0.08, 0.08, 14]} color={EMISSIVE_RED} />
      <GlowStrip position={[4.7, 0.15, -14]} scale={[0.08, 0.08, 14]} color={EMISSIVE_RED} />
      <GlowStrip position={[-4.7, 2.5, -14]} scale={[0.05, 0.05, 14]} color={EMISSIVE_RED} />
      <GlowStrip position={[4.7, 2.5, -14]} scale={[0.05, 0.05, 14]} color={EMISSIVE_RED} />

      {/* North room — wider opening */}
      <Wall position={[-12, WALL_H / 2, -22]} size={[0.5, WALL_H, 8]} texture={wallTex} />
      <Wall position={[12, WALL_H / 2, -22]} size={[0.5, WALL_H, 8]} texture={wallTex} />
      {/* North room side walls connecting corridor to room */}
      <Wall position={[-8.5, WALL_H / 2, -18]} size={[7, WALL_H, 0.5]} texture={wallTex} />
      <Wall position={[8.5, WALL_H / 2, -18]} size={[7, WALL_H, 0.5]} texture={wallTex} />

      {/* Weapon rack crates — now rendered as destructible by DestructibleCrates */}

      {/* Spawn portal — north */}
      <SpawnPortal position={[0, 0, -ARENA_HALF_D + 1.5]} color={EMISSIVE_RED} />

      {/* ═══════════════════════════════════════════════════
          SOUTH CORRIDOR — Reactor Room
          ═══════════════════════════════════════════════════ */}

      <Wall position={[-5, WALL_H / 2, 14]} size={[0.5, WALL_H, 14]} texture={wallTex} />
      <Wall position={[5, WALL_H / 2, 14]} size={[0.5, WALL_H, 14]} texture={wallTex} />
      <GlowStrip position={[-4.7, 0.15, 14]} scale={[0.08, 0.08, 14]} color={EMISSIVE_PURPLE} />
      <GlowStrip position={[4.7, 0.15, 14]} scale={[0.08, 0.08, 14]} color={EMISSIVE_PURPLE} />
      <GlowStrip position={[-4.7, 2.5, 14]} scale={[0.05, 0.05, 14]} color={EMISSIVE_PURPLE} />
      <GlowStrip position={[4.7, 2.5, 14]} scale={[0.05, 0.05, 14]} color={EMISSIVE_PURPLE} />

      {/* South room */}
      <Wall position={[-12, WALL_H / 2, 22]} size={[0.5, WALL_H, 8]} texture={wallTex} />
      <Wall position={[12, WALL_H / 2, 22]} size={[0.5, WALL_H, 8]} texture={wallTex} />
      <Wall position={[-8.5, WALL_H / 2, 18]} size={[7, WALL_H, 0.5]} texture={wallTex} />
      <Wall position={[8.5, WALL_H / 2, 18]} size={[7, WALL_H, 0.5]} texture={wallTex} />

      {/* Reactor core — elevated cylinder */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, 1, 23]} castShadow>
          <cylinderGeometry args={[2, 2, 2, 12]} />
          <meshStandardMaterial color={TRIM_COLOR} metalness={0.3} roughness={0.5} emissive={TRIM_COLOR} emissiveIntensity={0.06} />
        </mesh>
      </RigidBody>
      <GlowStrip position={[0, 2.1, 23]} scale={[3.5, 0.06, 3.5]} color={EMISSIVE_PURPLE} intensity={3} />
      <EnergyPillar position={[-3, 0, 21]} color={EMISSIVE_PURPLE} />
      <EnergyPillar position={[3, 0, 21]} color={EMISSIVE_PURPLE} />
      <EnergyPillar position={[-3, 0, 25]} color={EMISSIVE_PURPLE} />
      <EnergyPillar position={[3, 0, 25]} color={EMISSIVE_PURPLE} />

      <SpawnPortal position={[0, 0, ARENA_HALF_D - 1.5]} rotation={[0, Math.PI, 0]} color={EMISSIVE_PURPLE} />

      {/* ═══════════════════════════════════════════════════
          EAST CORRIDOR — Server Room
          ═══════════════════════════════════════════════════ */}

      <Wall position={[14, WALL_H / 2, -5]} rotation={[0, Math.PI / 2, 0]} size={[0.5, WALL_H, 14]} texture={wallTex} />
      <Wall position={[14, WALL_H / 2, 5]} rotation={[0, Math.PI / 2, 0]} size={[0.5, WALL_H, 14]} texture={wallTex} />
      <GlowStrip position={[14, 0.15, -4.7]} scale={[14, 0.08, 0.08]} color={EMISSIVE_CYAN} />
      <GlowStrip position={[14, 0.15, 4.7]} scale={[14, 0.08, 0.08]} color={EMISSIVE_CYAN} />

      {/* East room */}
      <Wall position={[22, WALL_H / 2, -8]} rotation={[0, Math.PI / 2, 0]} size={[0.5, WALL_H, 8]} texture={wallTex} />
      <Wall position={[22, WALL_H / 2, 8]} rotation={[0, Math.PI / 2, 0]} size={[0.5, WALL_H, 8]} texture={wallTex} />
      <Wall position={[18, WALL_H / 2, -6.5]} size={[0.5, WALL_H, 3]} texture={wallTex} />
      <Wall position={[18, WALL_H / 2, 6.5]} size={[0.5, WALL_H, 3]} texture={wallTex} />

      {/* Server racks */}
      <Terminal position={[20, 0, -6.5]} screenColor={EMISSIVE_CYAN} />
      <Terminal position={[20, 0, -4.5]} screenColor={EMISSIVE_CYAN} />
      <Terminal position={[20, 0, -2.5]} screenColor={EMISSIVE_GREEN} />
      <Terminal position={[20, 0, 2.5]} screenColor={EMISSIVE_CYAN} />
      <Terminal position={[20, 0, 4.5]} screenColor={EMISSIVE_CYAN} />
      <Terminal position={[20, 0, 6.5]} screenColor={EMISSIVE_GREEN} />

      <SpawnPortal position={[ARENA_HALF_W - 1.5, 0, 0]} rotation={[0, -Math.PI / 2, 0]} color={EMISSIVE_CYAN} />

      {/* ═══════════════════════════════════════════════════
          WEST CORRIDOR — Cargo Bay
          ═══════════════════════════════════════════════════ */}

      <Wall position={[-14, WALL_H / 2, -5]} rotation={[0, Math.PI / 2, 0]} size={[0.5, WALL_H, 14]} texture={wallTex} />
      <Wall position={[-14, WALL_H / 2, 5]} rotation={[0, Math.PI / 2, 0]} size={[0.5, WALL_H, 14]} texture={wallTex} />
      <GlowStrip position={[-14, 0.15, -4.7]} scale={[14, 0.08, 0.08]} color={EMISSIVE_ORANGE} />
      <GlowStrip position={[-14, 0.15, 4.7]} scale={[14, 0.08, 0.08]} color={EMISSIVE_ORANGE} />

      {/* West room */}
      <Wall position={[-22, WALL_H / 2, -8]} rotation={[0, Math.PI / 2, 0]} size={[0.5, WALL_H, 8]} texture={wallTex} />
      <Wall position={[-22, WALL_H / 2, 8]} rotation={[0, Math.PI / 2, 0]} size={[0.5, WALL_H, 8]} texture={wallTex} />
      <Wall position={[-18, WALL_H / 2, -6.5]} size={[0.5, WALL_H, 3]} texture={wallTex} />
      <Wall position={[-18, WALL_H / 2, 6.5]} size={[0.5, WALL_H, 3]} texture={wallTex} />

      {/* Cargo stacks — now rendered as destructible by DestructibleCrates */}

      {/* Elevated catwalk in cargo bay */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[-17, 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[2, 0.15, 10]} />
          <meshStandardMaterial color={TRIM_COLOR} metalness={0.3} roughness={0.5} emissive={TRIM_COLOR} emissiveIntensity={0.06} />
        </mesh>
      </RigidBody>
      <GlowStrip position={[-17, 2.08, 0]} scale={[1.8, 0.03, 9.5]} color={EMISSIVE_ORANGE} intensity={1} />
      {/* Ramp up to catwalk */}
      <Ramp position={[-16.5, 1, 6.5]} rotation={[0, Math.PI / 2, 0]} rampRotation={[0.22, 0, 0]} size={[2.5, 0.15, 5]} />

      <SpawnPortal position={[-ARENA_HALF_W + 1.5, 0, 0]} rotation={[0, Math.PI / 2, 0]} color={EMISSIVE_ORANGE} />

      {/* ═══════════════════════════════════════════════════
          CENTRAL HUB — Cover and details
          ═══════════════════════════════════════════════════ */}

      {/* Diagonal cover blocks in hub quadrants */}
      {[
        [8, -8],
        [-8, -8],
        [8, 8],
        [-8, 8],
      ].map(([x, z], i) => (
        <Crate
          key={`hub-cover-${i}`}
          position={[x, 0.7, z]}
          size={[2.5, 1.4, 2.5]}
          stripeColor={i < 2 ? EMISSIVE_CYAN : EMISSIVE_PURPLE}
          texture={crateTex}
        />
      ))}

      {/* Half-height walls for corridor entrances (cover) */}
      {[
        [3.5, -8, 1, 2, 3],
        [-3.5, -8, 1, 2, 3],
        [3.5, 8, 1, 2, 3],
        [-3.5, 8, 1, 2, 3],
      ].map(([x, z, w, h, d], i) => (
        <RigidBody key={`halfwall-${i}`} type="fixed" colliders="cuboid">
          <mesh position={[x, h / 2, z]} castShadow receiveShadow>
            <boxGeometry args={[w, h, d]} />
            <meshStandardMaterial color={WALL_COLOR} metalness={0.7} roughness={0.3} />
          </mesh>
        </RigidBody>
      ))}

      {/* Hub energy pillars */}
      <EnergyPillar position={[10, 0, 0]} color={EMISSIVE_CYAN} />
      <EnergyPillar position={[-10, 0, 0]} color={EMISSIVE_ORANGE} />
      <EnergyPillar position={[0, 0, -9]} color={EMISSIVE_RED} />
      <EnergyPillar position={[0, 0, 9]} color={EMISSIVE_PURPLE} />

      {/* ═══════════════════════════════════════════════════
          LIGHTING
          ═══════════════════════════════════════════════════ */}

      {/* Central hub lights */}
      {/* Hub — 1 central light only */}
      <CeilingLight position={[0, WALL_H - 0.1, 0]} color={EMISSIVE_CYAN} intensity={10} />

      {/* Corridors — 1 light per corridor (down from 3 each) */}
      <CeilingLight position={[0, WALL_H - 0.1, -16]} color={EMISSIVE_RED} flicker />
      <CeilingLight position={[0, WALL_H - 0.1, 16]} color={EMISSIVE_PURPLE} flicker />
      <CeilingLight position={[16, WALL_H - 0.1, 0]} color={EMISSIVE_CYAN} />
      <CeilingLight position={[-16, WALL_H - 0.1, 0]} color={EMISSIVE_ORANGE} flicker />

      {/* Strong ambient to compensate for fewer point lights */}
      <ambientLight intensity={1.0} color="#aa8870" />
      <hemisphereLight color="#cc9977" groundColor="#4a3020" intensity={0.8} />
    </group>
  );
}
