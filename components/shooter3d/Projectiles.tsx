"use client";

import { useRef, useMemo } from "react";
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

const MAX_PROJECTILES = 64;

export default function Projectiles({ projectiles }: ProjectilesProps) {
  const instRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  useFrame(() => {
    if (!instRef.current) return;
    const mesh = instRef.current;

    let count = 0;
    for (let i = 0; i < projectiles.length && count < MAX_PROJECTILES; i++) {
      const p = projectiles[i];
      if (!p.alive) continue;

      const scale = (p.size ?? 1) * 0.15;

      dummy.position.copy(p.position);
      dummy.scale.set(scale * 0.4, scale * 0.4, scale);
      // Orient along direction
      const lookTarget = p.position.clone().add(p.direction);
      dummy.lookAt(lookTarget);
      dummy.updateMatrix();
      mesh.setMatrixAt(count, dummy.matrix);

      const c = p.color ?? (p.friendly ? "#c8a848" : "#8B0000");
      color.set(c);
      mesh.setColorAt(count, color);
      count++;
    }

    // Hide unused instances
    dummy.scale.setScalar(0);
    dummy.updateMatrix();
    for (let i = count; i < MAX_PROJECTILES; i++) {
      mesh.setMatrixAt(i, dummy.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={instRef}
      args={[undefined, undefined, MAX_PROJECTILES]}
      frustumCulled={false}
    >
      <sphereGeometry args={[1, 6, 4]} />
      <meshBasicMaterial vertexColors toneMapped={false} />
    </instancedMesh>
  );
}
