"use client";

import { useRef } from "react";
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

// ── Particle factory helpers ──────────────────────────────

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

// ── Single particle mesh ──────────────────────────────────

function ParticleMesh({ particle }: { particle: ParticleData }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    // Gravity
    particle.velocity.y -= 9.8 * delta;

    // Move
    particle.position.addScaledVector(particle.velocity, delta);
    particle.life -= delta;

    // Update mesh
    meshRef.current.position.copy(particle.position);

    // Fade out
    const alpha = Math.max(0, particle.life / particle.maxLife);
    const scale = particle.size * (0.5 + alpha * 0.5);
    meshRef.current.scale.setScalar(scale / particle.size);

    const mat = meshRef.current.material as THREE.MeshBasicMaterial;
    mat.opacity = alpha;
  });

  return (
    <mesh ref={meshRef} position={particle.position.toArray()}>
      <sphereGeometry args={[particle.size, 6, 4]} />
      <meshBasicMaterial
        color={particle.color}
        transparent
        opacity={1}
        depthWrite={false}
      />
    </mesh>
  );
}

// ── Explosion flash ring ──────────────────────────────────

function ExplosionFlash({ explosion }: { explosion: ExplosionData }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    const elapsed = state.clock.elapsedTime - explosion.startTime;
    const progress = Math.min(1, elapsed / explosion.duration);

    // Expand ring
    const scale = explosion.size * (0.5 + progress * 2);
    meshRef.current.scale.setScalar(scale);

    // Fade out
    const mat = meshRef.current.material as THREE.MeshBasicMaterial;
    mat.opacity = (1 - progress) * 0.8;

    // Light fade
    if (lightRef.current) {
      lightRef.current.intensity = (1 - progress) * 8;
    }

    // Kill when done
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

// ── Main Particles renderer ──────────────────────────────

interface ParticlesProps {
  particles: ParticleData[];
  explosions: ExplosionData[];
}

export default function Particles({ particles, explosions }: ParticlesProps) {
  return (
    <group>
      {particles
        .filter((p) => p.life > 0)
        .map((p) => (
          <ParticleMesh key={p.id} particle={p} />
        ))}
      {explosions.map((e) => (
        <ExplosionFlash key={e.id} explosion={e} />
      ))}
    </group>
  );
}
