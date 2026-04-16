"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export type PickupType =
  | "health"
  | "shotgun"
  | "plasma"
  | "rocket"
  | "speed"
  | "damage";

export interface PickupData {
  id: number;
  position: THREE.Vector3;
  type: PickupType;
  alive: boolean;
  spawnTime: number;
}

const PICKUP_CONFIG: Record<
  PickupType,
  { color: string; label: string }
> = {
  health: { color: "#00ff88", label: "HP" },
  shotgun: { color: "#ff8800", label: "SG" },
  plasma: { color: "#44ff44", label: "PL" },
  rocket: { color: "#ff4444", label: "RL" },
  speed: { color: "#00ddff", label: "SP" },
  damage: { color: "#ff4444", label: "DM" },
};

interface PickupMeshProps {
  pickup: PickupData;
}

function PickupMesh({ pickup }: PickupMeshProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current || !pickup.alive) return;
    groupRef.current.position.copy(pickup.position);
    groupRef.current.position.y += 0.8 + Math.sin(state.clock.elapsedTime * 3) * 0.15;
    groupRef.current.rotation.y = state.clock.elapsedTime * 2;
  });

  const cfg = PICKUP_CONFIG[pickup.type];

  return (
    <group ref={groupRef} visible={pickup.alive}>
      {/* Outer ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.35, 0.04, 8, 16]} />
        <meshStandardMaterial
          color={cfg.color}
          emissive={cfg.color}
          emissiveIntensity={2}
          toneMapped={false}
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* Type-specific inner symbol */}
      {pickup.type === "health" && (
        <group>
          <mesh>
            <boxGeometry args={[0.25, 0.08, 0.08]} />
            <meshStandardMaterial color={cfg.color} emissive={cfg.color} emissiveIntensity={3} toneMapped={false} />
          </mesh>
          <mesh>
            <boxGeometry args={[0.08, 0.25, 0.08]} />
            <meshStandardMaterial color={cfg.color} emissive={cfg.color} emissiveIntensity={3} toneMapped={false} />
          </mesh>
        </group>
      )}

      {pickup.type === "shotgun" && (
        <group>
          {/* Barrel shape */}
          <mesh rotation={[0, 0, Math.PI / 4]}>
            <boxGeometry args={[0.06, 0.35, 0.06]} />
            <meshStandardMaterial color={cfg.color} emissive={cfg.color} emissiveIntensity={3} toneMapped={false} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 4]} position={[0.05, 0.05, 0]}>
            <boxGeometry args={[0.06, 0.35, 0.06]} />
            <meshStandardMaterial color={cfg.color} emissive={cfg.color} emissiveIntensity={3} toneMapped={false} />
          </mesh>
        </group>
      )}

      {pickup.type === "plasma" && (
        <mesh>
          <sphereGeometry args={[0.15, 8, 8]} />
          <meshStandardMaterial color={cfg.color} emissive={cfg.color} emissiveIntensity={4} toneMapped={false} transparent opacity={0.9} />
        </mesh>
      )}

      {pickup.type === "rocket" && (
        <group>
          {/* Rocket body */}
          <mesh rotation={[0, 0, Math.PI / 6]}>
            <cylinderGeometry args={[0.05, 0.07, 0.3, 8]} />
            <meshStandardMaterial color={cfg.color} emissive={cfg.color} emissiveIntensity={2} toneMapped={false} />
          </mesh>
          {/* Nose cone */}
          <mesh position={[0.08, 0.13, 0]} rotation={[0, 0, Math.PI / 6]}>
            <coneGeometry args={[0.05, 0.1, 8]} />
            <meshStandardMaterial color="#ffaa44" emissive="#ffaa44" emissiveIntensity={2} toneMapped={false} />
          </mesh>
        </group>
      )}

      {pickup.type === "speed" && (
        <group>
          {/* Lightning bolt */}
          <mesh position={[0, 0.06, 0]} rotation={[0, 0, 0.2]}>
            <boxGeometry args={[0.06, 0.15, 0.06]} />
            <meshStandardMaterial color={cfg.color} emissive={cfg.color} emissiveIntensity={3} toneMapped={false} />
          </mesh>
          <mesh position={[0, -0.06, 0]} rotation={[0, 0, -0.2]}>
            <boxGeometry args={[0.06, 0.15, 0.06]} />
            <meshStandardMaterial color={cfg.color} emissive={cfg.color} emissiveIntensity={3} toneMapped={false} />
          </mesh>
        </group>
      )}

      {pickup.type === "damage" && (
        <mesh rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.2, 0.2, 0.08]} />
          <meshStandardMaterial color={cfg.color} emissive={cfg.color} emissiveIntensity={3} toneMapped={false} />
        </mesh>
      )}

      {/* Emissive materials provide glow without point light cost */}
    </group>
  );
}

interface PickupsProps {
  pickups: PickupData[];
}

export default function Pickups({ pickups }: PickupsProps) {
  return (
    <group>
      {pickups.filter((p) => p.alive).map((p) => (
        <PickupMesh key={p.id} pickup={p} />
      ))}
    </group>
  );
}
