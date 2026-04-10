"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { RigidBody } from "@react-three/rapier";
import * as THREE from "three";

// Sci-fi material colors
const FLOOR_COLOR = "#1a1a2e";
const WALL_COLOR = "#16213e";
const TRIM_COLOR = "#0f3460";
const EMISSIVE_CYAN = "#00d4ff";
const EMISSIVE_PURPLE = "#7b2ff7";
const EMISSIVE_RED = "#ff2255";

/** A glowing strip — used for wall trims and lighting accents */
function GlowStrip({
  position,
  rotation,
  scale,
  color = EMISSIVE_CYAN,
  intensity = 2,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  scale: [number, number, number];
  color?: string;
  intensity?: number;
}) {
  return (
    <mesh position={position} rotation={rotation}>
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

/** A wall panel with metallic material */
function WallPanel({
  position,
  rotation,
  size,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  size: [number, number, number];
}) {
  return (
    <RigidBody type="fixed" position={position} rotation={rotation} colliders="cuboid">
      <mesh castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial
          color={WALL_COLOR}
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>
    </RigidBody>
  );
}

/** Hexagonal floor tile pattern */
function FloorTile({
  position,
  size,
}: {
  position: [number, number, number];
  size: [number, number, number];
}) {
  return (
    <mesh position={position} receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={FLOOR_COLOR}
        metalness={0.8}
        roughness={0.2}
      />
    </mesh>
  );
}

/** Animated energy pillar */
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
      {/* Base */}
      <mesh castShadow>
        <cylinderGeometry args={[0.3, 0.4, 0.3, 8]} />
        <meshStandardMaterial color={TRIM_COLOR} metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Glowing column */}
      <mesh ref={meshRef} position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.15, 2.7, 8]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={2}
          toneMapped={false}
          transparent
          opacity={0.8}
        />
      </mesh>
      {/* Top cap */}
      <mesh position={[0, 3, 0]} castShadow>
        <cylinderGeometry args={[0.4, 0.3, 0.3, 8]} />
        <meshStandardMaterial color={TRIM_COLOR} metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Point light */}
      <pointLight
        position={[0, 1.5, 0]}
        color={color}
        intensity={3}
        distance={8}
        decay={2}
      />
    </group>
  );
}

/** Ceiling light fixture */
function CeilingLight({
  position,
  color = EMISSIVE_CYAN,
}: {
  position: [number, number, number];
  color?: string;
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
      <pointLight
        position={[0, -0.5, 0]}
        color={color}
        intensity={4}
        distance={12}
        decay={2}
      />
    </group>
  );
}

export default function Level() {
  // Arena dimensions
  const arenaW = 30;
  const arenaD = 40;
  const wallH = 5;
  const wallThickness = 0.5;

  return (
    <group>
      {/* ═══ FLOOR ═══ */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh receiveShadow position={[0, -0.25, 0]}>
          <boxGeometry args={[arenaW, 0.5, arenaD]} />
          <meshStandardMaterial
            color={FLOOR_COLOR}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
      </RigidBody>

      {/* Floor grid lines */}
      <gridHelper
        args={[arenaW, 30, EMISSIVE_CYAN, "#0a0a1a"]}
        position={[0, 0.01, 0]}
      />

      {/* ═══ CEILING ═══ */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, wallH + 0.25, 0]}>
          <boxGeometry args={[arenaW, 0.5, arenaD]} />
          <meshStandardMaterial
            color={"#0a0a15"}
            metalness={0.9}
            roughness={0.1}
          />
        </mesh>
      </RigidBody>

      {/* ═══ WALLS ═══ */}
      {/* North wall */}
      <WallPanel
        position={[0, wallH / 2, -arenaD / 2]}
        size={[arenaW, wallH, wallThickness]}
      />
      {/* South wall */}
      <WallPanel
        position={[0, wallH / 2, arenaD / 2]}
        size={[arenaW, wallH, wallThickness]}
      />
      {/* East wall */}
      <WallPanel
        position={[arenaW / 2, wallH / 2, 0]}
        rotation={[0, Math.PI / 2, 0]}
        size={[arenaD, wallH, wallThickness]}
      />
      {/* West wall */}
      <WallPanel
        position={[-arenaW / 2, wallH / 2, 0]}
        rotation={[0, Math.PI / 2, 0]}
        size={[arenaD, wallH, wallThickness]}
      />

      {/* ═══ WALL GLOW STRIPS ═══ */}
      {/* Bottom strips along each wall */}
      <GlowStrip position={[0, 0.15, -arenaD / 2 + 0.3]} scale={[arenaW - 1, 0.08, 0.08]} />
      <GlowStrip position={[0, 0.15, arenaD / 2 - 0.3]} scale={[arenaW - 1, 0.08, 0.08]} />
      <GlowStrip position={[-arenaW / 2 + 0.3, 0.15, 0]} scale={[0.08, 0.08, arenaD - 1]} />
      <GlowStrip position={[arenaW / 2 - 0.3, 0.15, 0]} scale={[0.08, 0.08, arenaD - 1]} />

      {/* Mid-height strips */}
      <GlowStrip position={[0, 2.5, -arenaD / 2 + 0.3]} scale={[arenaW - 1, 0.05, 0.05]} color={EMISSIVE_PURPLE} />
      <GlowStrip position={[0, 2.5, arenaD / 2 - 0.3]} scale={[arenaW - 1, 0.05, 0.05]} color={EMISSIVE_PURPLE} />
      <GlowStrip position={[-arenaW / 2 + 0.3, 2.5, 0]} scale={[0.05, 0.05, arenaD - 1]} color={EMISSIVE_PURPLE} />
      <GlowStrip position={[arenaW / 2 - 0.3, 2.5, 0]} scale={[0.05, 0.05, arenaD - 1]} color={EMISSIVE_PURPLE} />

      {/* ═══ INTERIOR STRUCTURES ═══ */}
      {/* Central raised platform */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[6, 0.8, 6]} />
          <meshStandardMaterial
            color={TRIM_COLOR}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
      </RigidBody>
      <GlowStrip position={[0, 0.82, 0]} scale={[5.5, 0.04, 5.5]} color={EMISSIVE_CYAN} intensity={1} />

      {/* Corner cover blocks */}
      {[
        [8, 0, -12],
        [-8, 0, -12],
        [8, 0, 12],
        [-8, 0, 12],
      ].map(([x, y, z], i) => (
        <RigidBody key={`cover-${i}`} type="fixed" colliders="cuboid">
          <mesh position={[x, 1.25, z]} castShadow receiveShadow>
            <boxGeometry args={[3, 2.5, 3]} />
            <meshStandardMaterial
              color={TRIM_COLOR}
              metalness={0.7}
              roughness={0.3}
            />
          </mesh>
        </RigidBody>
      ))}

      {/* Side corridor walls (create corridors feel) */}
      {[
        [10, 0, -5, 1, wallH, 8],
        [-10, 0, -5, 1, wallH, 8],
        [10, 0, 5, 1, wallH, 8],
        [-10, 0, 5, 1, wallH, 8],
      ].map(([x, y, z, w, h, d], i) => (
        <RigidBody key={`corridor-${i}`} type="fixed" colliders="cuboid">
          <mesh position={[x, (h as number) / 2, z]} castShadow receiveShadow>
            <boxGeometry args={[w, h, d] as [number, number, number]} />
            <meshStandardMaterial
              color={WALL_COLOR}
              metalness={0.7}
              roughness={0.3}
            />
          </mesh>
        </RigidBody>
      ))}

      {/* ═══ ENERGY PILLARS ═══ */}
      <EnergyPillar position={[6, 0, -8]} color={EMISSIVE_CYAN} />
      <EnergyPillar position={[-6, 0, -8]} color={EMISSIVE_CYAN} />
      <EnergyPillar position={[6, 0, 8]} color={EMISSIVE_PURPLE} />
      <EnergyPillar position={[-6, 0, 8]} color={EMISSIVE_PURPLE} />
      <EnergyPillar position={[0, 0, -16]} color={EMISSIVE_RED} />
      <EnergyPillar position={[0, 0, 16]} color={EMISSIVE_RED} />

      {/* ═══ CEILING LIGHTS ═══ */}
      <CeilingLight position={[0, wallH - 0.1, -10]} />
      <CeilingLight position={[0, wallH - 0.1, 0]} color={EMISSIVE_PURPLE} />
      <CeilingLight position={[0, wallH - 0.1, 10]} />
      <CeilingLight position={[-8, wallH - 0.1, -15]} color={EMISSIVE_CYAN} />
      <CeilingLight position={[8, wallH - 0.1, -15]} color={EMISSIVE_CYAN} />
      <CeilingLight position={[-8, wallH - 0.1, 15]} color={EMISSIVE_PURPLE} />
      <CeilingLight position={[8, wallH - 0.1, 15]} color={EMISSIVE_PURPLE} />

      {/* ═══ AMBIENT + FILL LIGHTING ═══ */}
      <ambientLight intensity={0.15} color="#1a1a3e" />
      <hemisphereLight
        color="#0f3460"
        groundColor="#0a0a1a"
        intensity={0.3}
      />
    </group>
  );
}
