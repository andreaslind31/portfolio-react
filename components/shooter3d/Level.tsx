"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RigidBody } from "@react-three/rapier";
import * as THREE from "three";

// ── Sci-fi palette ──────────────────────────────────────
const FLOOR_COLOR = "#2a2a42";
const FLOOR_DARK = "#1e1e35";
const WALL_COLOR = "#263556";
const TRIM_COLOR = "#1a4a7a";
const CEILING_COLOR = "#151525";
const EMISSIVE_CYAN = "#00d4ff";
const EMISSIVE_PURPLE = "#7b2ff7";
const EMISSIVE_RED = "#ff2255";
const EMISSIVE_ORANGE = "#ff8800";
const EMISSIVE_GREEN = "#00ff88";

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
  color = WALL_COLOR,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  size: [number, number, number];
  color?: string;
}) {
  return (
    <RigidBody type="fixed" position={position} rotation={rotation} colliders="cuboid">
      <mesh castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color={color} metalness={0.7} roughness={0.3} />
      </mesh>
    </RigidBody>
  );
}

function CeilingLight({
  position,
  color = EMISSIVE_CYAN,
  intensity = 6,
}: {
  position: [number, number, number];
  color?: string;
  intensity?: number;
}) {
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[1.5, 0.1, 0.3]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={3}
          toneMapped={false}
        />
      </mesh>
      <pointLight position={[0, -0.5, 0]} color={color} intensity={intensity} distance={18} decay={2} />
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
        <meshStandardMaterial color={TRIM_COLOR} metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh ref={meshRef} position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.15, 2.7, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} toneMapped={false} transparent opacity={0.8} />
      </mesh>
      <mesh position={[0, 3, 0]} castShadow>
        <cylinderGeometry args={[0.4, 0.3, 0.3, 8]} />
        <meshStandardMaterial color={TRIM_COLOR} metalness={0.9} roughness={0.1} />
      </mesh>
      <pointLight position={[0, 1.5, 0]} color={color} intensity={3} distance={8} decay={2} />
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
        <meshStandardMaterial color={TRIM_COLOR} metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[1.2, 1.5, 0]} castShadow>
        <boxGeometry args={[0.2, 3, 0.3]} />
        <meshStandardMaterial color={TRIM_COLOR} metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[0, 3.1, 0]} castShadow>
        <boxGeometry args={[2.6, 0.2, 0.3]} />
        <meshStandardMaterial color={TRIM_COLOR} metalness={0.9} roughness={0.1} />
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
      <pointLight position={[0, 1.5, 0]} color={color} intensity={4} distance={8} decay={2} />
    </group>
  );
}

/** Cargo crate for cover / decoration */
function Crate({
  position,
  size = [1.2, 1.2, 1.2] as [number, number, number],
  color = TRIM_COLOR,
  stripeColor = EMISSIVE_ORANGE,
}: {
  position: [number, number, number];
  size?: [number, number, number];
  color?: string;
  stripeColor?: string;
}) {
  return (
    <RigidBody type="fixed" position={position} colliders="cuboid">
      <mesh castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.4} />
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
        <meshStandardMaterial color="#1a1a2e" metalness={0.8} roughness={0.2} />
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
        <meshStandardMaterial color={TRIM_COLOR} metalness={0.7} roughness={0.3} />
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

  return (
    <group>
      {/* ═══════════════════════════════════════════════════
          FLOOR + CEILING + OUTER WALLS
          ═══════════════════════════════════════════════════ */}

      {/* Main floor */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh receiveShadow position={[0, -0.25, 0]}>
          <boxGeometry args={[W, 0.5, D]} />
          <meshStandardMaterial color={FLOOR_COLOR} metalness={0.8} roughness={0.2} />
        </mesh>
      </RigidBody>
      <gridHelper args={[W, 50, EMISSIVE_CYAN, "#0a0a1a"]} position={[0, 0.01, 0]} />

      {/* Ceiling */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, WALL_H + 0.25, 0]}>
          <boxGeometry args={[W, 0.5, D]} />
          <meshStandardMaterial color={CEILING_COLOR} metalness={0.9} roughness={0.1} />
        </mesh>
      </RigidBody>

      {/* Outer walls — North/South */}
      <Wall position={[0, WALL_H / 2, -ARENA_HALF_D]} size={[W, WALL_H, WALL_T]} />
      <Wall position={[0, WALL_H / 2, ARENA_HALF_D]} size={[W, WALL_H, WALL_T]} />
      {/* Outer walls — East/West */}
      <Wall position={[ARENA_HALF_W, WALL_H / 2, 0]} rotation={[0, Math.PI / 2, 0]} size={[D, WALL_H, WALL_T]} />
      <Wall position={[-ARENA_HALF_W, WALL_H / 2, 0]} rotation={[0, Math.PI / 2, 0]} size={[D, WALL_H, WALL_T]} />

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
          <meshStandardMaterial color={TRIM_COLOR} metalness={0.8} roughness={0.2} />
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
      <Wall position={[-5, WALL_H / 2, -14]} size={[0.5, WALL_H, 14]} />
      <Wall position={[5, WALL_H / 2, -14]} size={[0.5, WALL_H, 14]} />
      {/* Corridor glow strips */}
      <GlowStrip position={[-4.7, 0.15, -14]} scale={[0.08, 0.08, 14]} color={EMISSIVE_RED} />
      <GlowStrip position={[4.7, 0.15, -14]} scale={[0.08, 0.08, 14]} color={EMISSIVE_RED} />
      <GlowStrip position={[-4.7, 2.5, -14]} scale={[0.05, 0.05, 14]} color={EMISSIVE_RED} />
      <GlowStrip position={[4.7, 2.5, -14]} scale={[0.05, 0.05, 14]} color={EMISSIVE_RED} />

      {/* North room — wider opening */}
      <Wall position={[-12, WALL_H / 2, -22]} size={[0.5, WALL_H, 8]} />
      <Wall position={[12, WALL_H / 2, -22]} size={[0.5, WALL_H, 8]} />
      {/* North room side walls connecting corridor to room */}
      <Wall position={[-8.5, WALL_H / 2, -18]} size={[7, WALL_H, 0.5]} />
      <Wall position={[8.5, WALL_H / 2, -18]} size={[7, WALL_H, 0.5]} />

      {/* Weapon rack crates */}
      <Crate position={[-10, 0.6, -24]} size={[2, 1.2, 1.2]} stripeColor={EMISSIVE_RED} />
      <Crate position={[-10, 0.6, -21]} size={[2, 1.2, 1.2]} stripeColor={EMISSIVE_RED} />
      <Crate position={[10, 0.6, -24]} size={[2, 1.2, 1.2]} stripeColor={EMISSIVE_RED} />

      {/* Spawn portal — north */}
      <SpawnPortal position={[0, 0, -ARENA_HALF_D + 1.5]} color={EMISSIVE_RED} />

      {/* ═══════════════════════════════════════════════════
          SOUTH CORRIDOR — Reactor Room
          ═══════════════════════════════════════════════════ */}

      <Wall position={[-5, WALL_H / 2, 14]} size={[0.5, WALL_H, 14]} />
      <Wall position={[5, WALL_H / 2, 14]} size={[0.5, WALL_H, 14]} />
      <GlowStrip position={[-4.7, 0.15, 14]} scale={[0.08, 0.08, 14]} color={EMISSIVE_PURPLE} />
      <GlowStrip position={[4.7, 0.15, 14]} scale={[0.08, 0.08, 14]} color={EMISSIVE_PURPLE} />
      <GlowStrip position={[-4.7, 2.5, 14]} scale={[0.05, 0.05, 14]} color={EMISSIVE_PURPLE} />
      <GlowStrip position={[4.7, 2.5, 14]} scale={[0.05, 0.05, 14]} color={EMISSIVE_PURPLE} />

      {/* South room */}
      <Wall position={[-12, WALL_H / 2, 22]} size={[0.5, WALL_H, 8]} />
      <Wall position={[12, WALL_H / 2, 22]} size={[0.5, WALL_H, 8]} />
      <Wall position={[-8.5, WALL_H / 2, 18]} size={[7, WALL_H, 0.5]} />
      <Wall position={[8.5, WALL_H / 2, 18]} size={[7, WALL_H, 0.5]} />

      {/* Reactor core — elevated cylinder */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, 1, 23]} castShadow>
          <cylinderGeometry args={[2, 2, 2, 12]} />
          <meshStandardMaterial color={TRIM_COLOR} metalness={0.9} roughness={0.1} />
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

      <Wall position={[14, WALL_H / 2, -5]} rotation={[0, Math.PI / 2, 0]} size={[0.5, WALL_H, 14]} />
      <Wall position={[14, WALL_H / 2, 5]} rotation={[0, Math.PI / 2, 0]} size={[0.5, WALL_H, 14]} />
      <GlowStrip position={[14, 0.15, -4.7]} scale={[14, 0.08, 0.08]} color={EMISSIVE_CYAN} />
      <GlowStrip position={[14, 0.15, 4.7]} scale={[14, 0.08, 0.08]} color={EMISSIVE_CYAN} />

      {/* East room */}
      <Wall position={[22, WALL_H / 2, -8]} rotation={[0, Math.PI / 2, 0]} size={[0.5, WALL_H, 8]} />
      <Wall position={[22, WALL_H / 2, 8]} rotation={[0, Math.PI / 2, 0]} size={[0.5, WALL_H, 8]} />
      <Wall position={[18, WALL_H / 2, -6.5]} size={[0.5, WALL_H, 3]} />
      <Wall position={[18, WALL_H / 2, 6.5]} size={[0.5, WALL_H, 3]} />

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

      <Wall position={[-14, WALL_H / 2, -5]} rotation={[0, Math.PI / 2, 0]} size={[0.5, WALL_H, 14]} />
      <Wall position={[-14, WALL_H / 2, 5]} rotation={[0, Math.PI / 2, 0]} size={[0.5, WALL_H, 14]} />
      <GlowStrip position={[-14, 0.15, -4.7]} scale={[14, 0.08, 0.08]} color={EMISSIVE_ORANGE} />
      <GlowStrip position={[-14, 0.15, 4.7]} scale={[14, 0.08, 0.08]} color={EMISSIVE_ORANGE} />

      {/* West room */}
      <Wall position={[-22, WALL_H / 2, -8]} rotation={[0, Math.PI / 2, 0]} size={[0.5, WALL_H, 8]} />
      <Wall position={[-22, WALL_H / 2, 8]} rotation={[0, Math.PI / 2, 0]} size={[0.5, WALL_H, 8]} />
      <Wall position={[-18, WALL_H / 2, -6.5]} size={[0.5, WALL_H, 3]} />
      <Wall position={[-18, WALL_H / 2, 6.5]} size={[0.5, WALL_H, 3]} />

      {/* Cargo stacks */}
      <Crate position={[-20, 0.6, -6]} stripeColor={EMISSIVE_ORANGE} />
      <Crate position={[-20, 1.8, -6]} size={[1, 1, 1]} stripeColor={EMISSIVE_ORANGE} />
      <Crate position={[-20, 0.6, -3]} size={[1.5, 1.2, 1.5]} stripeColor={EMISSIVE_ORANGE} />
      <Crate position={[-20, 0.6, 3]} stripeColor={EMISSIVE_ORANGE} />
      <Crate position={[-20, 0.6, 6]} size={[1.5, 1.2, 1.5]} stripeColor={EMISSIVE_ORANGE} />
      <Crate position={[-20, 1.8, 6]} size={[1, 1, 1]} stripeColor={EMISSIVE_ORANGE} />

      {/* Elevated catwalk in cargo bay */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[-17, 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[2, 0.15, 10]} />
          <meshStandardMaterial color={TRIM_COLOR} metalness={0.8} roughness={0.2} />
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
      <CeilingLight position={[0, WALL_H - 0.1, 0]} color={EMISSIVE_CYAN} intensity={8} />
      <CeilingLight position={[-6, WALL_H - 0.1, -6]} />
      <CeilingLight position={[6, WALL_H - 0.1, -6]} />
      <CeilingLight position={[-6, WALL_H - 0.1, 6]} color={EMISSIVE_PURPLE} />
      <CeilingLight position={[6, WALL_H - 0.1, 6]} color={EMISSIVE_PURPLE} />

      {/* North corridor lights */}
      <CeilingLight position={[0, WALL_H - 0.1, -12]} color={EMISSIVE_RED} />
      <CeilingLight position={[0, WALL_H - 0.1, -18]} color={EMISSIVE_RED} />
      <CeilingLight position={[0, WALL_H - 0.1, -24]} color={EMISSIVE_RED} />

      {/* South corridor lights */}
      <CeilingLight position={[0, WALL_H - 0.1, 12]} color={EMISSIVE_PURPLE} />
      <CeilingLight position={[0, WALL_H - 0.1, 18]} color={EMISSIVE_PURPLE} />
      <CeilingLight position={[0, WALL_H - 0.1, 24]} color={EMISSIVE_PURPLE} />

      {/* East corridor lights */}
      <CeilingLight position={[12, WALL_H - 0.1, 0]} color={EMISSIVE_CYAN} />
      <CeilingLight position={[18, WALL_H - 0.1, 0]} color={EMISSIVE_CYAN} />
      <CeilingLight position={[22, WALL_H - 0.1, 0]} color={EMISSIVE_GREEN} />

      {/* West corridor lights */}
      <CeilingLight position={[-12, WALL_H - 0.1, 0]} color={EMISSIVE_ORANGE} />
      <CeilingLight position={[-18, WALL_H - 0.1, 0]} color={EMISSIVE_ORANGE} />

      {/* Global ambient */}
      <ambientLight intensity={0.4} color="#334466" />
      <hemisphereLight color="#4466aa" groundColor="#1a1a2e" intensity={0.5} />
    </group>
  );
}
