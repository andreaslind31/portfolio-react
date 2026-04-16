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
  health: { color: "#3a8a3a", label: "HP" },
  shotgun: { color: "#8a7a3a", label: "SG" },
  plasma: { color: "#33aa33", label: "PL" },
  rocket: { color: "#8B4513", label: "RL" },
  speed: { color: "#7a8a3a", label: "SP" },
  damage: { color: "#8B0000", label: "DM" },
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
      <mesh>
        <octahedronGeometry args={[0.25, 0]} />
        <meshBasicMaterial
          color={cfg.color}
          toneMapped={false}
        />
      </mesh>
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
