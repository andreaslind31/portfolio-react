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
}

interface ProjectilesProps {
  projectiles: ProjectileData[];
}

function ProjectileMesh({ projectile }: { projectile: ProjectileData }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!meshRef.current || !projectile.alive) return;
    meshRef.current.position.copy(projectile.position);
    // Orient along travel direction
    const lookTarget = projectile.position.clone().add(projectile.direction);
    meshRef.current.lookAt(lookTarget);
  });

  const color = projectile.friendly ? "#00d4ff" : "#ff2255";

  return (
    <mesh ref={meshRef} visible={projectile.alive}>
      {/* Elongated capsule shape for energy bolt */}
      <capsuleGeometry args={[0.03, 0.2, 4, 8]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={5}
        toneMapped={false}
      />
    </mesh>
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
