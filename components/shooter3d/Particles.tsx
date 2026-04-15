"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export interface ParticleData {
  id: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: string;
  life: number;
  maxLife: number;
  size: number;
}

export interface ExplosionData {
  id: number;
  position: THREE.Vector3;
  color: string;
  startTime: number;
  duration: number;
  size: number;
}

let particleId = 0;

export function createImpactSparks(
  position: THREE.Vector3,
  normal: THREE.Vector3,
  color: string = "#00d4ff",
  count: number = 8
): ParticleData[] {
  const particles: ParticleData[] = [];
  for (let i = 0; i < count; i++) {
    const spread = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2
    )
      .add(normal)
      .normalize()
      .multiplyScalar(3 + Math.random() * 4);

    particles.push({
      id: particleId++,
      position: position.clone(),
      velocity: spread,
      color,
      life: 0.3 + Math.random() * 0.4,
      maxLife: 0.3 + Math.random() * 0.4,
      size: 0.03 + Math.random() * 0.04,
    });
  }
  return particles;
}

export function createDeathExplosion(
  position: THREE.Vector3,
  color: string = "#ff2255",
  count: number = 20
): ParticleData[] {
  const particles: ParticleData[] = [];
  for (let i = 0; i < count; i++) {
    const dir = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      Math.random() * 1.5,
      (Math.random() - 0.5) * 2
    )
      .normalize()
      .multiplyScalar(2 + Math.random() * 5);

    particles.push({
      id: particleId++,
      position: position.clone(),
      velocity: dir,
      color: Math.random() > 0.5 ? color : "#ffaa00",
      life: 0.4 + Math.random() * 0.6,
      maxLife: 0.4 + Math.random() * 0.6,
      size: 0.04 + Math.random() * 0.08,
    });
  }
  return particles;
}

const MAX_PARTICLES = 300;

/**
 * All particles share one InstancedMesh (single draw call).
 * A single useFrame updates all instance matrices and colors.
 */
function ParticlesBatch({ particles }: { particles: ParticleData[] }) {
  const instRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  useFrame((_, delta) => {
    if (!instRef.current) return;
    const mesh = instRef.current;

    let count = 0;
    for (let i = 0; i < particles.length && count < MAX_PARTICLES; i++) {
      const p = particles[i];
      if (p.life <= 0) continue;

      // Simulate (gravity + motion)
      p.velocity.y -= 9.8 * delta;
      p.position.addScaledVector(p.velocity, delta);
      p.life -= delta;

      const alpha = Math.max(0, p.life / p.maxLife);
      const scale = p.size * (0.5 + alpha * 1.5);

      dummy.position.copy(p.position);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(count, dummy.matrix);
      color.set(p.color).multiplyScalar(alpha);
      mesh.setColorAt(count, color);
      count++;
    }

    // Hide unused instances by scaling to 0
    dummy.scale.setScalar(0);
    dummy.updateMatrix();
    for (let i = count; i < MAX_PARTICLES; i++) {
      mesh.setMatrixAt(i, dummy.matrix);
    }

    mesh.count = MAX_PARTICLES;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={instRef}
      args={[undefined, undefined, MAX_PARTICLES]}
      frustumCulled={false}
    >
      <sphereGeometry args={[1, 6, 4]} />
      <meshBasicMaterial vertexColors transparent depthWrite={false} />
    </instancedMesh>
  );
}

// ── Explosion flash (kept as individual meshes since there are few) ──

function ExplosionFlash({ explosion }: { explosion: ExplosionData }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    const elapsed = state.clock.elapsedTime - explosion.startTime;
    const progress = Math.min(1, elapsed / explosion.duration);

    const scale = explosion.size * (0.5 + progress * 2);
    meshRef.current.scale.setScalar(scale);

    const mat = meshRef.current.material as THREE.MeshBasicMaterial;
    mat.opacity = (1 - progress) * 0.8;

    if (lightRef.current) {
      lightRef.current.intensity = (1 - progress) * 8;
    }

    if (progress >= 1) {
      meshRef.current.visible = false;
      if (lightRef.current) lightRef.current.intensity = 0;
    }
  });

  return (
    <group position={explosion.position.toArray()}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.3, 12, 8]} />
        <meshBasicMaterial
          color={explosion.color}
          transparent
          opacity={0.8}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <pointLight
        ref={lightRef}
        color={explosion.color}
        intensity={8}
        distance={10}
        decay={2}
      />
    </group>
  );
}

interface ParticlesProps {
  particles: ParticleData[];
  explosions: ExplosionData[];
}

export default function Particles({ particles, explosions }: ParticlesProps) {
  return (
    <group>
      <ParticlesBatch particles={particles} />
      {explosions.map((e) => (
        <ExplosionFlash key={e.id} explosion={e} />
      ))}
    </group>
  );
}
