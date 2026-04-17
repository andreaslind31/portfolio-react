"use client";

import { useRef, useMemo, memo } from "react";
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

// ── Doom palette ────────────────────────────────────────
const FLOOR_COLOR = "#4a3828";
const WALL_COLOR = "#5c4a3a";
const TRIM_COLOR = "#6b5540";
const CEILING_COLOR = "#2a2018";
const EMISSIVE_FIRE = "#ff6622";
const EMISSIVE_LAVA = "#cc3300";
const EMISSIVE_BLOOD = "#8B0000";
const EMISSIVE_RUST = "#aa5522";
const EMISSIVE_SICK = "#556b2f";

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

interface GlowStripProps {
  position: [number, number, number];
  scale: [number, number, number];
  color?: string;
  intensity?: number;
}

function GlowStrip({
  position,
  scale,
  color = EMISSIVE_FIRE,
  intensity = 0.8,
}: GlowStripProps) {
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

interface WallProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  size: [number, number, number];
  texture?: THREE.CanvasTexture;
}

function Wall({
  position,
  rotation,
  size,
  texture,
}: WallProps) {
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

interface CeilingLightProps {
  position: [number, number, number];
  color?: string;
  intensity?: number;
  flicker?: boolean;
}

function CeilingLight({
  position,
  color = EMISSIVE_FIRE,
  intensity = 3,
  flicker = false,
}: CeilingLightProps) {
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
          emissiveIntensity={1.2}
          toneMapped={false}
        />
      </mesh>
      <pointLight ref={lightRef} position={[0, -0.5, 0]} color={color} intensity={intensity} distance={18} decay={2} />
    </group>
  );
}

interface EnergyPillarProps {
  position: [number, number, number];
  color?: string;
}

function EnergyPillar({ position, color = EMISSIVE_FIRE }: EnergyPillarProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.8 + Math.sin(state.clock.elapsedTime * 2) * 0.3;
    }
  });

  return (
    <group position={position}>
      <mesh castShadow>
        <cylinderGeometry args={[0.3, 0.4, 0.3, 8]} />
        <meshStandardMaterial color={TRIM_COLOR} metalness={0.1} roughness={0.85} emissive={TRIM_COLOR} emissiveIntensity={0.03} />
      </mesh>
      <mesh ref={meshRef} position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.15, 2.7, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1} toneMapped={false} transparent opacity={0.8} />
      </mesh>
      <mesh position={[0, 3, 0]} castShadow>
        <cylinderGeometry args={[0.4, 0.3, 0.3, 8]} />
        <meshStandardMaterial color={TRIM_COLOR} metalness={0.1} roughness={0.85} emissive={TRIM_COLOR} emissiveIntensity={0.03} />
      </mesh>
      <pointLight position={[0, 1.5, 0]} color={color} intensity={1.5} distance={8} decay={2} />
    </group>
  );
}

interface SpawnPortalProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  color?: string;
}

function SpawnPortal({ position, rotation, color = EMISSIVE_BLOOD }: SpawnPortalProps) {
  const ringRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (ringRef.current) {
      const mat = ringRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.8 + Math.sin(state.clock.elapsedTime * 3) * 0.5;
      ringRef.current.rotation.z = state.clock.elapsedTime * 0.5;
    }
  });

  return (
    <group position={position} rotation={rotation}>
      {/* Arch frame */}
      <mesh position={[-1.2, 1.5, 0]} castShadow>
        <boxGeometry args={[0.2, 3, 0.3]} />
        <meshStandardMaterial color={TRIM_COLOR} metalness={0.1} roughness={0.85} emissive={TRIM_COLOR} emissiveIntensity={0.03} />
      </mesh>
      <mesh position={[1.2, 1.5, 0]} castShadow>
        <boxGeometry args={[0.2, 3, 0.3]} />
        <meshStandardMaterial color={TRIM_COLOR} metalness={0.1} roughness={0.85} emissive={TRIM_COLOR} emissiveIntensity={0.03} />
      </mesh>
      <mesh position={[0, 3.1, 0]} castShadow>
        <boxGeometry args={[2.6, 0.2, 0.3]} />
        <meshStandardMaterial color={TRIM_COLOR} metalness={0.1} roughness={0.85} emissive={TRIM_COLOR} emissiveIntensity={0.03} />
      </mesh>
      {/* Spinning energy ring */}
      <mesh ref={ringRef} position={[0, 1.5, 0]}>
        <torusGeometry args={[1, 0.05, 8, 24]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1} toneMapped={false} transparent opacity={0.7} />
      </mesh>
      {/* Inner glow plane */}
      <mesh position={[0, 1.5, 0]}>
        <planeGeometry args={[2, 3]} />
        <meshBasicMaterial color={color} transparent opacity={0.08} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <pointLight position={[0, 1.5, 0]} color={color} intensity={2} distance={8} decay={2} />
    </group>
  );
}

interface CrateProps {
  position: [number, number, number];
  size?: [number, number, number];
  color?: string;
  stripeColor?: string;
}

function Crate({
  position,
  size = [1.2, 1.2, 1.2] as [number, number, number],
  color = TRIM_COLOR,
  stripeColor = EMISSIVE_RUST,
}: CrateProps) {
  return (
    <RigidBody type="fixed" position={position} colliders="cuboid">
      <mesh castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color={color} metalness={0.1} roughness={0.85} emissive={color} emissiveIntensity={0.03} />
      </mesh>
      {/* Hazard stripe */}
      <mesh position={[0, 0, size[2] / 2 + 0.001]}>
        <planeGeometry args={[size[0] * 0.8, size[1] * 0.15]} />
        <meshStandardMaterial color={stripeColor} emissive={stripeColor} emissiveIntensity={0.4} toneMapped={false} />
      </mesh>
    </RigidBody>
  );
}

/** Computer terminal / console */
interface TerminalProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  screenColor?: string;
}

function Terminal({ position, rotation, screenColor = EMISSIVE_SICK }: TerminalProps) {
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
        <meshStandardMaterial color="#3a2a1a" metalness={0.1} roughness={0.85} emissive="#3a2a1a" emissiveIntensity={0.03} />
      </mesh>
      {/* Screen */}
      <mesh ref={screenRef} position={[0, 1, -0.05]} rotation={[-0.2, 0, 0]}>
        <planeGeometry args={[0.6, 0.4]} />
        <meshStandardMaterial color={screenColor} emissive={screenColor} emissiveIntensity={0.8} toneMapped={false} />
      </mesh>
    </group>
  );
}

interface RampProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  size?: [number, number, number];
  rampRotation?: [number, number, number];
}

function Ramp({
  position,
  rotation,
  size = [3, 0.2, 5] as [number, number, number],
  rampRotation = [-0.3, 0, 0] as [number, number, number],
}: RampProps) {
  return (
    <RigidBody type="fixed" position={position} rotation={rotation} colliders="cuboid">
      <mesh rotation={rampRotation} castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color={TRIM_COLOR} metalness={0.1} roughness={0.85} emissive={TRIM_COLOR} emissiveIntensity={0.03} />
      </mesh>
    </RigidBody>
  );
}

// ═══════════════════════════════════════════════════════════
// Main Level component
// ═══════════════════════════════════════════════════════════

function LevelImpl() {
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
      <gridHelper args={[W, 50, "#5c4a3a", "#2a2018"]} position={[0, 0.01, 0]} />

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
      <GlowStrip position={[0, 0.15, -ARENA_HALF_D + 0.3]} scale={[W - 1, 0.08, 0.08]} color={EMISSIVE_RUST} />
      <GlowStrip position={[0, 0.15, ARENA_HALF_D - 0.3]} scale={[W - 1, 0.08, 0.08]} color={EMISSIVE_RUST} />
      <GlowStrip position={[-ARENA_HALF_W + 0.3, 0.15, 0]} scale={[0.08, 0.08, D - 1]} color={EMISSIVE_RUST} />
      <GlowStrip position={[ARENA_HALF_W - 0.3, 0.15, 0]} scale={[0.08, 0.08, D - 1]} color={EMISSIVE_RUST} />
      {/* Mid-height accent strips */}
      <GlowStrip position={[0, 2.5, -ARENA_HALF_D + 0.3]} scale={[W - 1, 0.05, 0.05]} color={EMISSIVE_BLOOD} />
      <GlowStrip position={[0, 2.5, ARENA_HALF_D - 0.3]} scale={[W - 1, 0.05, 0.05]} color={EMISSIVE_BLOOD} />
      <GlowStrip position={[-ARENA_HALF_W + 0.3, 2.5, 0]} scale={[0.05, 0.05, D - 1]} color={EMISSIVE_BLOOD} />
      <GlowStrip position={[ARENA_HALF_W - 0.3, 2.5, 0]} scale={[0.05, 0.05, D - 1]} color={EMISSIVE_BLOOD} />

      {/* ═══════════════════════════════════════════════════
          CENTRAL HUB — open area with raised platform
          ═══════════════════════════════════════════════════ */}

      {/* Central elevated platform */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[8, 1, 8]} />
          <meshStandardMaterial color={TRIM_COLOR} metalness={0.1} roughness={0.85} emissive={TRIM_COLOR} emissiveIntensity={0.03} />
        </mesh>
      </RigidBody>
      <GlowStrip position={[0, 1.02, 0]} scale={[7.5, 0.04, 7.5]} color={EMISSIVE_FIRE} intensity={0.4} />

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
      <GlowStrip position={[-4.7, 0.15, -14]} scale={[0.08, 0.08, 14]} color={EMISSIVE_BLOOD} />
      <GlowStrip position={[4.7, 0.15, -14]} scale={[0.08, 0.08, 14]} color={EMISSIVE_BLOOD} />
      <GlowStrip position={[-4.7, 2.5, -14]} scale={[0.05, 0.05, 14]} color={EMISSIVE_BLOOD} />
      <GlowStrip position={[4.7, 2.5, -14]} scale={[0.05, 0.05, 14]} color={EMISSIVE_BLOOD} />

      {/* North room — wider opening */}
      <Wall position={[-12, WALL_H / 2, -22]} size={[0.5, WALL_H, 8]} texture={wallTex} />
      <Wall position={[12, WALL_H / 2, -22]} size={[0.5, WALL_H, 8]} texture={wallTex} />
      {/* North room side walls connecting corridor to room */}
      <Wall position={[-8.5, WALL_H / 2, -18]} size={[7, WALL_H, 0.5]} texture={wallTex} />
      <Wall position={[8.5, WALL_H / 2, -18]} size={[7, WALL_H, 0.5]} texture={wallTex} />

      {/* Weapon rack crates */}
      <Crate position={[-10, 0.6, -24]} size={[2, 1.2, 1.2]} stripeColor={EMISSIVE_BLOOD} />
      <Crate position={[-10, 0.6, -21]} size={[2, 1.2, 1.2]} stripeColor={EMISSIVE_BLOOD} />
      <Crate position={[10, 0.6, -24]} size={[2, 1.2, 1.2]} stripeColor={EMISSIVE_BLOOD} />

      {/* Spawn portal — north */}
      <SpawnPortal position={[0, 0, -ARENA_HALF_D + 1.5]} color={EMISSIVE_BLOOD} />

      {/* ═══════════════════════════════════════════════════
          SOUTH CORRIDOR — Reactor Room
          ═══════════════════════════════════════════════════ */}

      <Wall position={[-5, WALL_H / 2, 14]} size={[0.5, WALL_H, 14]} />
      <Wall position={[5, WALL_H / 2, 14]} size={[0.5, WALL_H, 14]} />
      <GlowStrip position={[-4.7, 0.15, 14]} scale={[0.08, 0.08, 14]} color={EMISSIVE_LAVA} />
      <GlowStrip position={[4.7, 0.15, 14]} scale={[0.08, 0.08, 14]} color={EMISSIVE_LAVA} />
      <GlowStrip position={[-4.7, 2.5, 14]} scale={[0.05, 0.05, 14]} color={EMISSIVE_LAVA} />
      <GlowStrip position={[4.7, 2.5, 14]} scale={[0.05, 0.05, 14]} color={EMISSIVE_LAVA} />

      {/* South room */}
      <Wall position={[-12, WALL_H / 2, 22]} size={[0.5, WALL_H, 8]} texture={wallTex} />
      <Wall position={[12, WALL_H / 2, 22]} size={[0.5, WALL_H, 8]} texture={wallTex} />
      <Wall position={[-8.5, WALL_H / 2, 18]} size={[7, WALL_H, 0.5]} texture={wallTex} />
      <Wall position={[8.5, WALL_H / 2, 18]} size={[7, WALL_H, 0.5]} texture={wallTex} />

      {/* Reactor core — elevated cylinder */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, 1, 23]} castShadow>
          <cylinderGeometry args={[2, 2, 2, 12]} />
          <meshStandardMaterial color={TRIM_COLOR} metalness={0.1} roughness={0.85} emissive={TRIM_COLOR} emissiveIntensity={0.03} />
        </mesh>
      </RigidBody>
      <GlowStrip position={[0, 2.1, 23]} scale={[3.5, 0.06, 3.5]} color={EMISSIVE_LAVA} intensity={1.2} />
      <EnergyPillar position={[-3, 0, 21]} color={EMISSIVE_LAVA} />
      <EnergyPillar position={[3, 0, 21]} color={EMISSIVE_LAVA} />
      <EnergyPillar position={[-3, 0, 25]} color={EMISSIVE_LAVA} />
      <EnergyPillar position={[3, 0, 25]} color={EMISSIVE_LAVA} />

      <SpawnPortal position={[0, 0, ARENA_HALF_D - 1.5]} rotation={[0, Math.PI, 0]} color={EMISSIVE_LAVA} />

      {/* ═══════════════════════════════════════════════════
          EAST CORRIDOR — Server Room
          ═══════════════════════════════════════════════════ */}

      <Wall position={[14, WALL_H / 2, -5]} rotation={[0, Math.PI / 2, 0]} size={[0.5, WALL_H, 14]} />
      <Wall position={[14, WALL_H / 2, 5]} rotation={[0, Math.PI / 2, 0]} size={[0.5, WALL_H, 14]} />
      <GlowStrip position={[14, 0.15, -4.7]} scale={[14, 0.08, 0.08]} color={EMISSIVE_SICK} />
      <GlowStrip position={[14, 0.15, 4.7]} scale={[14, 0.08, 0.08]} color={EMISSIVE_SICK} />

      {/* East room */}
      <Wall position={[22, WALL_H / 2, -8]} rotation={[0, Math.PI / 2, 0]} size={[0.5, WALL_H, 8]} texture={wallTex} />
      <Wall position={[22, WALL_H / 2, 8]} rotation={[0, Math.PI / 2, 0]} size={[0.5, WALL_H, 8]} texture={wallTex} />
      <Wall position={[18, WALL_H / 2, -6.5]} size={[0.5, WALL_H, 3]} texture={wallTex} />
      <Wall position={[18, WALL_H / 2, 6.5]} size={[0.5, WALL_H, 3]} texture={wallTex} />

      {/* Server racks */}
      <Terminal position={[20, 0, -6.5]} screenColor={EMISSIVE_SICK} />
      <Terminal position={[20, 0, -4.5]} screenColor={EMISSIVE_SICK} />
      <Terminal position={[20, 0, -2.5]} screenColor={EMISSIVE_FIRE} />
      <Terminal position={[20, 0, 2.5]} screenColor={EMISSIVE_SICK} />
      <Terminal position={[20, 0, 4.5]} screenColor={EMISSIVE_SICK} />
      <Terminal position={[20, 0, 6.5]} screenColor={EMISSIVE_FIRE} />

      <SpawnPortal position={[ARENA_HALF_W - 1.5, 0, 0]} rotation={[0, -Math.PI / 2, 0]} color={EMISSIVE_SICK} />

      {/* ═══════════════════════════════════════════════════
          WEST CORRIDOR — Cargo Bay
          ═══════════════════════════════════════════════════ */}

      <Wall position={[-14, WALL_H / 2, -5]} rotation={[0, Math.PI / 2, 0]} size={[0.5, WALL_H, 14]} />
      <Wall position={[-14, WALL_H / 2, 5]} rotation={[0, Math.PI / 2, 0]} size={[0.5, WALL_H, 14]} />
      <GlowStrip position={[-14, 0.15, -4.7]} scale={[14, 0.08, 0.08]} color={EMISSIVE_RUST} />
      <GlowStrip position={[-14, 0.15, 4.7]} scale={[14, 0.08, 0.08]} color={EMISSIVE_RUST} />

      {/* West room */}
      <Wall position={[-22, WALL_H / 2, -8]} rotation={[0, Math.PI / 2, 0]} size={[0.5, WALL_H, 8]} texture={wallTex} />
      <Wall position={[-22, WALL_H / 2, 8]} rotation={[0, Math.PI / 2, 0]} size={[0.5, WALL_H, 8]} texture={wallTex} />
      <Wall position={[-18, WALL_H / 2, -6.5]} size={[0.5, WALL_H, 3]} texture={wallTex} />
      <Wall position={[-18, WALL_H / 2, 6.5]} size={[0.5, WALL_H, 3]} texture={wallTex} />

      {/* Cargo stacks */}
      <Crate position={[-20, 0.6, -6]} stripeColor={EMISSIVE_RUST} />
      <Crate position={[-20, 1.8, -6]} size={[1, 1, 1]} stripeColor={EMISSIVE_RUST} />
      <Crate position={[-20, 0.6, -3]} size={[1.5, 1.2, 1.5]} stripeColor={EMISSIVE_RUST} />
      <Crate position={[-20, 0.6, 3]} stripeColor={EMISSIVE_RUST} />
      <Crate position={[-20, 0.6, 6]} size={[1.5, 1.2, 1.5]} stripeColor={EMISSIVE_RUST} />
      <Crate position={[-20, 1.8, 6]} size={[1, 1, 1]} stripeColor={EMISSIVE_RUST} />

      {/* Elevated catwalk in cargo bay */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[-17, 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[2, 0.15, 10]} />
          <meshStandardMaterial color={TRIM_COLOR} metalness={0.1} roughness={0.85} emissive={TRIM_COLOR} emissiveIntensity={0.03} />
        </mesh>
      </RigidBody>
      <GlowStrip position={[-17, 2.08, 0]} scale={[1.8, 0.03, 9.5]} color={EMISSIVE_RUST} intensity={0.4} />
      {/* Ramp up to catwalk */}
      <Ramp position={[-16.5, 1, 6.5]} rotation={[0, Math.PI / 2, 0]} rampRotation={[0.22, 0, 0]} size={[2.5, 0.15, 5]} />

      <SpawnPortal position={[-ARENA_HALF_W + 1.5, 0, 0]} rotation={[0, Math.PI / 2, 0]} color={EMISSIVE_RUST} />

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
          stripeColor={i < 2 ? EMISSIVE_FIRE : EMISSIVE_LAVA}
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
      <EnergyPillar position={[10, 0, 0]} color={EMISSIVE_FIRE} />
      <EnergyPillar position={[-10, 0, 0]} color={EMISSIVE_RUST} />
      <EnergyPillar position={[0, 0, -9]} color={EMISSIVE_BLOOD} />
      <EnergyPillar position={[0, 0, 9]} color={EMISSIVE_LAVA} />

      {/* ═══════════════════════════════════════════════════
          LIGHTING
          ═══════════════════════════════════════════════════ */}

      {/* Central hub lights */}
      <CeilingLight position={[0, WALL_H - 0.1, 0]} color={EMISSIVE_FIRE} intensity={4} />
      <CeilingLight position={[-6, WALL_H - 0.1, -6]} />
      <CeilingLight position={[6, WALL_H - 0.1, -6]} />
      <CeilingLight position={[-6, WALL_H - 0.1, 6]} color={EMISSIVE_LAVA} />
      <CeilingLight position={[6, WALL_H - 0.1, 6]} color={EMISSIVE_LAVA} />

      {/* North corridor lights */}
      <CeilingLight position={[0, WALL_H - 0.1, -12]} color={EMISSIVE_BLOOD} />
      <CeilingLight position={[0, WALL_H - 0.1, -18]} color={EMISSIVE_BLOOD} />
      <CeilingLight position={[0, WALL_H - 0.1, -24]} color={EMISSIVE_BLOOD} />

      {/* South corridor lights */}
      <CeilingLight position={[0, WALL_H - 0.1, 12]} color={EMISSIVE_LAVA} />
      <CeilingLight position={[0, WALL_H - 0.1, 18]} color={EMISSIVE_LAVA} />
      <CeilingLight position={[0, WALL_H - 0.1, 24]} color={EMISSIVE_LAVA} />

      {/* East corridor lights */}
      <CeilingLight position={[12, WALL_H - 0.1, 0]} color={EMISSIVE_SICK} />
      <CeilingLight position={[18, WALL_H - 0.1, 0]} color={EMISSIVE_SICK} />
      <CeilingLight position={[22, WALL_H - 0.1, 0]} color={EMISSIVE_FIRE} />

      {/* West corridor lights */}
      <CeilingLight position={[-12, WALL_H - 0.1, 0]} color={EMISSIVE_RUST} />
      <CeilingLight position={[-18, WALL_H - 0.1, 0]} color={EMISSIVE_RUST} />

      {/* Global ambient */}
      <ambientLight intensity={0.25} color="#3a2a1a" />
      <hemisphereLight color="#5c4a3a" groundColor="#2a2018" intensity={0.3} />
    </group>
  );
}

// Memoized — Level has no props and never needs to re-render after mount
const Level = memo(LevelImpl);
export default Level;
