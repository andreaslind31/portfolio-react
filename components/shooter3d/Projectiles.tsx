"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export interface ProjectileData {
  id: number;
  position: THREE.Vector3;
  direction: THREE.Vector3;
  speed: number;
  alive: boolean;
  friendly: boolean;
  life: number;
  color?: string;
  size?: number;
}

interface ProjectilesProps {
  projectiles: ProjectileData[];
}

function ProjectileMesh({ projectile }: { projectile: ProjectileData }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!meshRef.current || !projectile.alive) return;
    meshRef.current.position.copy(projectile.position);
    const lookTarget = projectile.position.clone().add(projectile.direction);
    meshRef.current.lookAt(lookTarget);
  });

  const color = projectile.color ?? (projectile.friendly ? "#c8a848" : "#8B0000");
  const radius = (projectile.size ?? 1) * 0.03;
  const length = (projectile.size ?? 1) * 0.2;

  return (
    <group>
      <mesh ref={meshRef} visible={projectile.alive}>
        <capsuleGeometry args={[radius, length, 4, 8]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={2}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

export default function Projectiles({ projectiles }: ProjectilesProps) {
  return (
    <group>
      {projectiles.map((p) => (
        <ProjectileMesh key={p.id} projectile={p} />
      ))}
    </group>
  );
}
