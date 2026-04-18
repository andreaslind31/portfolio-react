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
} from "../Textures";

// ── Doom palette (shared across all maps) ──────────────
export const FLOOR_COLOR = "#4a3828";
export const WALL_COLOR = "#5c4a3a";
export const TRIM_COLOR = "#6b5540";
export const CEILING_COLOR = "#2a2018";
export const EMISSIVE_FIRE = "#ff6622";
export const EMISSIVE_LAVA = "#cc3300";
export const EMISSIVE_BLOOD = "#8B0000";
export const EMISSIVE_RUST = "#aa5522";
export const EMISSIVE_SICK = "#556b2f";

export const WALL_H = 5;
export const WALL_T = 0.5;

// ── Map data interface ──────────────────────────────────
export interface MapLayout {
  ARENA_HALF_W: number;
  ARENA_HALF_D: number;
  WALL_COLLIDERS: [number, number, number, number][];
  SPAWN_PORTALS: [number, number, number][];
}

// ── Shared texture hook ─────────────────────────────────
export function useMapTextures(w: number, d: number) {
  const wallTex = useMemo(() => createWallTexture(), []);
  const floorTex = useMemo(() => {
    const t = createFloorTexture();
    t.repeat.set(w / 3, d / 3);
    return t;
  }, [w, d]);
  const ceilingTex = useMemo(() => {
    const t = createCeilingTexture();
    t.repeat.set(w / 4, d / 4);
    return t;
  }, [w, d]);
  const trimTex = useMemo(() => createTrimTexture(), []);
  const crateTex = useMemo(() => createCrateTexture(), []);
  return { wallTex, floorTex, ceilingTex, trimTex, crateTex };
}

// ═══════════════════════════════════════════════════════════
// Reusable building blocks
// ═══════════════════════════════════════════════════════════

// ── GlowStrip ───────────────────────────────────────────
export interface GlowStripProps {
  position: [number, number, number];
  scale: [number, number, number];
  color?: string;
  intensity?: number;
}

export function GlowStrip({ position, scale, color = EMISSIVE_FIRE, intensity = 0.8 }: GlowStripProps) {
  return (
    <mesh position={position}>
      <boxGeometry args={scale} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={intensity} toneMapped={false} />
    </mesh>
  );
}

// ── Wall ─────────────────────────────────────────────────
export interface WallProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  size: [number, number, number];
  texture?: THREE.CanvasTexture;
}

export function Wall({ position, rotation, size, texture }: WallProps) {
  const mat = useMemo(() => {
    if (texture) {
      const t = texture.clone();
      const maxDim = Math.max(size[0], size[2]);
      const heightDim = size[1];
      t.repeat.set(maxDim / 2, heightDim / 2);
      t.wrapS = THREE.RepeatWrapping;
      t.wrapT = THREE.RepeatWrapping;
      t.needsUpdate = true;
      return new THREE.MeshStandardMaterial({
        map: t, metalness: 0.3, roughness: 0.7,
        emissive: new THREE.Color(WALL_COLOR), emissiveIntensity: 0.05,
      });
    }
    return new THREE.MeshStandardMaterial({
      color: WALL_COLOR, metalness: 0.3, roughness: 0.7,
      emissive: new THREE.Color(WALL_COLOR), emissiveIntensity: 0.05,
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

// ── CeilingLight ─────────────────────────────────────────
export interface CeilingLightProps {
  position: [number, number, number];
  color?: string;
  intensity?: number;
  flicker?: boolean;
}

export function CeilingLight({ position, color = EMISSIVE_FIRE, intensity = 3, flicker = false }: CeilingLightProps) {
  const lightRef = useRef<THREE.PointLight>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const flickerOffset = useRef(Math.random() * 100);

  useFrame((state) => {
    if (!flicker || !lightRef.current || !matRef.current) return;
    const t = state.clock.elapsedTime + flickerOffset.current;
    const flick = Math.sin(t * 15) * Math.sin(t * 7.3) * Math.sin(t * 3.1);
    const on = flick > -0.3;
    const mult = on ? (0.7 + Math.random() * 0.3) : 0.05;
    lightRef.current.intensity = intensity * mult;
    matRef.current.emissiveIntensity = on ? 3 * mult : 0.2;
  });

  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[1.5, 0.1, 0.3]} />
        <meshStandardMaterial ref={matRef} color={color} emissive={color} emissiveIntensity={1.2} toneMapped={false} />
      </mesh>
      <pointLight ref={lightRef} position={[0, -0.5, 0]} color={color} intensity={intensity} distance={18} decay={2} />
    </group>
  );
}

// ── EnergyPillar ─────────────────────────────────────────
export interface EnergyPillarProps {
  position: [number, number, number];
  color?: string;
}

export function EnergyPillar({ position, color = EMISSIVE_FIRE }: EnergyPillarProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (meshRef.current) {
      (meshRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
        0.8 + Math.sin(state.clock.elapsedTime * 2) * 0.3;
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
    </group>
  );
}

// ── SpawnPortal ──────────────────────────────────────────
export interface SpawnPortalProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  color?: string;
}

export function SpawnPortal({ position, rotation, color = EMISSIVE_BLOOD }: SpawnPortalProps) {
  const ringRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (ringRef.current) {
      (ringRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
        0.8 + Math.sin(state.clock.elapsedTime * 3) * 0.5;
      ringRef.current.rotation.z = state.clock.elapsedTime * 0.5;
    }
  });

  return (
    <group position={position} rotation={rotation}>
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
      <mesh ref={ringRef} position={[0, 1.5, 0]}>
        <torusGeometry args={[1, 0.05, 8, 24]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1} toneMapped={false} transparent opacity={0.7} />
      </mesh>
      <mesh position={[0, 1.5, 0]}>
        <planeGeometry args={[2, 3]} />
        <meshBasicMaterial color={color} transparent opacity={0.08} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

// ── Crate ────────────────────────────────────────────────
export interface CrateProps {
  position: [number, number, number];
  size?: [number, number, number];
  color?: string;
  stripeColor?: string;
}

export function Crate({ position, size = [1.2, 1.2, 1.2] as [number, number, number], color = TRIM_COLOR, stripeColor = EMISSIVE_RUST }: CrateProps) {
  return (
    <RigidBody type="fixed" position={position} colliders="cuboid">
      <mesh castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color={color} metalness={0.1} roughness={0.85} emissive={color} emissiveIntensity={0.03} />
      </mesh>
      <mesh position={[0, 0, size[2] / 2 + 0.001]}>
        <planeGeometry args={[size[0] * 0.8, size[1] * 0.15]} />
        <meshStandardMaterial color={stripeColor} emissive={stripeColor} emissiveIntensity={0.4} toneMapped={false} />
      </mesh>
    </RigidBody>
  );
}

// ── Terminal ─────────────────────────────────────────────
export interface TerminalProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  screenColor?: string;
}

export function Terminal({ position, rotation, screenColor = EMISSIVE_FIRE }: TerminalProps) {
  const screenRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (screenRef.current) {
      (screenRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
        2 + Math.sin(state.clock.elapsedTime * 8) * 0.3;
    }
  });

  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0.4, 0]} castShadow>
        <boxGeometry args={[0.8, 0.8, 0.5]} />
        <meshStandardMaterial color="#3a2a1a" metalness={0.1} roughness={0.85} emissive="#3a2a1a" emissiveIntensity={0.03} />
      </mesh>
      <mesh ref={screenRef} position={[0, 1, -0.05]} rotation={[-0.2, 0, 0]}>
        <planeGeometry args={[0.6, 0.4]} />
        <meshStandardMaterial color={screenColor} emissive={screenColor} emissiveIntensity={0.8} toneMapped={false} />
      </mesh>
    </group>
  );
}

// ── Ramp (solid, thick) ──────────────────────────────────
export interface RampProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  size?: [number, number, number];
  rampRotation?: [number, number, number];
}

export function Ramp({ position, rotation, size = [3, 0.5, 5] as [number, number, number], rampRotation = [-0.3, 0, 0] as [number, number, number] }: RampProps) {
  return (
    <RigidBody type="fixed" position={position} rotation={rotation} colliders="cuboid">
      <mesh rotation={rampRotation} castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color={TRIM_COLOR} metalness={0.1} roughness={0.85} emissive={TRIM_COLOR} emissiveIntensity={0.03} />
      </mesh>
    </RigidBody>
  );
}

// ── SolidPlatform (thick, won't clip) ────────────────────
export interface SolidPlatformProps {
  position: [number, number, number];
  size: [number, number, number];
  color?: string;
  glowColor?: string;
}

export function SolidPlatform({ position, size, color = TRIM_COLOR, glowColor = EMISSIVE_FIRE }: SolidPlatformProps) {
  return (
    <>
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={position} castShadow receiveShadow>
          <boxGeometry args={size} />
          <meshStandardMaterial color={color} metalness={0.1} roughness={0.85} emissive={color} emissiveIntensity={0.03} />
        </mesh>
      </RigidBody>
      <GlowStrip
        position={[position[0], position[1] + size[1] / 2 + 0.02, position[2]]}
        scale={[size[0] - 0.5, 0.04, size[2] - 0.5]}
        color={glowColor}
        intensity={0.4}
      />
    </>
  );
}

// ── Catwalk (thick, with support pillars) ────────────────
export interface CatwalkProps {
  position: [number, number, number];
  size: [number, number, number];
  glowColor?: string;
}

export function Catwalk({ position, size, glowColor = EMISSIVE_RUST }: CatwalkProps) {
  return (
    <>
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={position} castShadow receiveShadow>
          <boxGeometry args={[size[0], 0.5, size[2]]} />
          <meshStandardMaterial color={TRIM_COLOR} metalness={0.1} roughness={0.85} emissive={TRIM_COLOR} emissiveIntensity={0.03} />
        </mesh>
      </RigidBody>
      <GlowStrip
        position={[position[0], position[1] + 0.27, position[2]]}
        scale={[size[0] - 0.2, 0.03, size[2] - 0.2]}
        color={glowColor}
        intensity={0.4}
      />
      {/* Support pillars */}
      {[-size[2] / 2 + 0.5, size[2] / 2 - 0.5].map((z, i) => (
        <mesh key={i} position={[position[0], position[1] / 2, position[2] + z]}>
          <boxGeometry args={[0.3, position[1], 0.3]} />
          <meshStandardMaterial color={TRIM_COLOR} metalness={0.1} roughness={0.85} emissive={TRIM_COLOR} emissiveIntensity={0.03} />
        </mesh>
      ))}
    </>
  );
}

// ── Floor + Ceiling + Outer Walls (shared across maps) ───
export interface ArenaShellProps {
  halfW: number;
  halfD: number;
  wallTex: THREE.CanvasTexture;
  floorTex: THREE.CanvasTexture;
  ceilingTex: THREE.CanvasTexture;
}

export function ArenaShell({ halfW, halfD, wallTex, floorTex, ceilingTex }: ArenaShellProps) {
  const W = halfW * 2;
  const D = halfD * 2;

  return (
    <>
      {/* Floor */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh receiveShadow position={[0, -0.25, 0]}>
          <boxGeometry args={[W, 0.5, D]} />
          <meshStandardMaterial map={floorTex} metalness={0.2} roughness={0.8} emissive={new THREE.Color(FLOOR_COLOR)} emissiveIntensity={0.04} />
        </mesh>
      </RigidBody>
      <gridHelper args={[W, Math.round(W), "#5c4a3a", "#2a2018"]} position={[0, 0.01, 0]} />

      {/* Ceiling */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, WALL_H + 0.25, 0]}>
          <boxGeometry args={[W, 0.5, D]} />
          <meshStandardMaterial map={ceilingTex} metalness={0.2} roughness={0.8} emissive={new THREE.Color(CEILING_COLOR)} emissiveIntensity={0.06} />
        </mesh>
      </RigidBody>

      {/* Outer walls */}
      <Wall position={[0, WALL_H / 2, -halfD]} size={[W, WALL_H, WALL_T]} texture={wallTex} />
      <Wall position={[0, WALL_H / 2, halfD]} size={[W, WALL_H, WALL_T]} texture={wallTex} />
      <Wall position={[halfW, WALL_H / 2, 0]} rotation={[0, Math.PI / 2, 0]} size={[D, WALL_H, WALL_T]} texture={wallTex} />
      <Wall position={[-halfW, WALL_H / 2, 0]} rotation={[0, Math.PI / 2, 0]} size={[D, WALL_H, WALL_T]} texture={wallTex} />

      {/* Perimeter glow strips — hellfire channel ringing the arena */}
      <GlowStrip position={[0, 0.15, -halfD + 0.3]} scale={[W - 1, 0.08, 0.08]} color={EMISSIVE_BLOOD} />
      <GlowStrip position={[0, 0.15, halfD - 0.3]} scale={[W - 1, 0.08, 0.08]} color={EMISSIVE_BLOOD} />
      <GlowStrip position={[-halfW + 0.3, 0.15, 0]} scale={[0.08, 0.08, D - 1]} color={EMISSIVE_BLOOD} />
      <GlowStrip position={[halfW - 0.3, 0.15, 0]} scale={[0.08, 0.08, D - 1]} color={EMISSIVE_BLOOD} />

      {/* Ambient light — dim, blood-tinted hellish wash */}
      <ambientLight intensity={0.22} color="#3a1410" />
      <hemisphereLight color="#5a2418" groundColor="#1a0a08" intensity={0.28} />
    </>
  );
}
