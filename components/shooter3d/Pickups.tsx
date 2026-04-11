"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export interface PickupData {
  id: number;
  position: THREE.Vector3;
  type: "health" | "energy";
  alive: boolean;
  spawnTime: number;
}

interface PickupMeshProps {
  pickup: PickupData;
}

function PickupMesh({ pickup }: PickupMeshProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current || !pickup.alive) return;

    // Float and rotate
    groupRef.current.position.copy(pickup.position);
    groupRef.current.position.y += 0.8 + Math.sin(state.clock.elapsedTime * 3) * 0.15;
    groupRef.current.rotation.y = state.clock.elapsedTime * 2;
  });

  const color = pickup.type === "health" ? "#00ff88" : "#00d4ff";

  return (
    <group ref={groupRef} visible={pickup.alive}>
      {/* Outer ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.3, 0.04, 8, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={2}
          toneMapped={false}
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* Inner symbol */}
      {pickup.type === "health" ? (
        // Cross shape for health
        <group>
          <mesh>
            <boxGeometry args={[0.25, 0.08, 0.08]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={3}
              toneMapped={false}
            />
          </mesh>
          <mesh>
            <boxGeometry args={[0.08, 0.25, 0.08]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={3}
              toneMapped={false}
            />
          </mesh>
        </group>
      ) : (
        // Diamond for energy
        <mesh rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.18, 0.18, 0.08]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={3}
            toneMapped={false}
          />
        </mesh>
      )}

      {/* Glow light */}
      <pointLight color={color} intensity={2} distance={4} decay={2} />
    </group>
  );
}

interface PickupsProps {
  pickups: PickupData[];
}

export default function Pickups({ pickups }: PickupsProps) {
  return (
    <group>
      {pickups
        .filter((p) => p.alive)
        .map((p) => (
          <PickupMesh key={p.id} pickup={p} />
        ))}
    </group>
  );
}
