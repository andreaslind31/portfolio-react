"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { createCrateTexture } from "./Textures";

export interface CrateData {
  id: number;
  position: THREE.Vector3;
  size: [number, number, number];
  hp: number;
  alive: boolean;
  dying: boolean;
  deathTimer: number;
}

// Initial crate positions matching the old static crates in Level.tsx
export function createInitialCrates(): CrateData[] {
  let id = 10000; // offset to not conflict with enemy/projectile IDs
  const crates: { pos: [number, number, number]; size: [number, number, number]; hp: number }[] = [
    // North weapon bay
    { pos: [-10, 0.6, -24], size: [2, 1.2, 1.2], hp: 40 },
    { pos: [-10, 0.6, -21], size: [2, 1.2, 1.2], hp: 40 },
    { pos: [10, 0.6, -24], size: [2, 1.2, 1.2], hp: 40 },
    // West cargo bay
    { pos: [-20, 0.6, -6], size: [1.2, 1.2, 1.2], hp: 30 },
    { pos: [-20, 0.6, -3], size: [1.5, 1.2, 1.5], hp: 35 },
    { pos: [-20, 0.6, 3], size: [1.2, 1.2, 1.2], hp: 30 },
    { pos: [-20, 0.6, 6], size: [1.5, 1.2, 1.5], hp: 35 },
  ];
  return crates.map((c) => ({
    id: id++,
    position: new THREE.Vector3(...c.pos),
    size: c.size,
    hp: c.hp,
    alive: true,
    dying: false,
    deathTimer: 0,
  }));
}

function CrateMesh({ crate, texture }: { crate: CrateData; texture: THREE.CanvasTexture }) {
  const groupRef = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    if (!crate.alive && !crate.dying) {
      groupRef.current.visible = false;
      return;
    }

    groupRef.current.visible = true;

    if (crate.dying) {
      const t = Math.min(crate.deathTimer / 0.4, 1);
      groupRef.current.scale.set(1 + t * 0.2, Math.max(0, 1 - t), 1 + t * 0.2);
      if (matRef.current) {
        matRef.current.opacity = 1 - t;
      }
      return;
    }

    groupRef.current.scale.set(1, 1, 1);
    if (matRef.current) {
      matRef.current.opacity = 1;
    }
  });

  return (
    <group ref={groupRef} position={crate.position.toArray()}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={crate.size} />
        <meshStandardMaterial
          ref={matRef}
          map={texture}
          metalness={0.3}
          roughness={0.7}
          transparent
        />
      </mesh>
      {/* Hazard stripe */}
      <mesh position={[0, 0, crate.size[2] / 2 + 0.001]}>
        <planeGeometry args={[crate.size[0] * 0.8, crate.size[1] * 0.15]} />
        <meshStandardMaterial
          color="#ff8800"
          emissive="#ff8800"
          emissiveIntensity={1}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

interface DestructibleCratesProps {
  crates: CrateData[];
}

export default function DestructibleCrates({ crates }: DestructibleCratesProps) {
  // Create texture once, shared across all crates
  const texture = useMemo(() => createCrateTexture(), []);

  return (
    <group>
      {crates.map((c) => (
        <CrateMesh key={c.id} crate={c} texture={texture} />
      ))}
    </group>
  );
}
