"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

export interface DoorData {
  position: [number, number, number];
  rotation?: [number, number, number];
  color: string;
}

// Corridor entrance doors — slide upward when player is near
const DOOR_OPEN_DIST = 6;
const DOOR_HEIGHT = 4.5;
const DOOR_SPEED = 5;

function Door({
  position,
  rotation,
  color,
}: DoorData) {
  const meshRef = useRef<THREE.Mesh>(null);
  const openAmount = useRef(0);
  const { camera } = useThree();

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    const doorPos = new THREE.Vector3(...position);
    const dist = doorPos.distanceTo(camera.position);
    const shouldOpen = dist < DOOR_OPEN_DIST;

    // Smooth open/close
    const target = shouldOpen ? 1 : 0;
    openAmount.current += (target - openAmount.current) * Math.min(1, delta * DOOR_SPEED);

    // Slide door upward
    meshRef.current.position.y = position[1] + openAmount.current * DOOR_HEIGHT;
  });

  return (
    <group rotation={rotation}>
      <mesh ref={meshRef} position={position} castShadow receiveShadow>
        <boxGeometry args={[3.5, DOOR_HEIGHT, 0.3]} />
        <meshStandardMaterial
          color="#2a2428"
          metalness={0.5}
          roughness={0.5}
          emissive="#2a2428"
          emissiveIntensity={0.04}
        />
      </mesh>
      {/* Door frame glow strips */}
      <mesh position={[position[0] - 1.8, position[1], position[2]]}>
        <boxGeometry args={[0.05, DOOR_HEIGHT, 0.35]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.5}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[position[0] + 1.8, position[1], position[2]]}>
        <boxGeometry args={[0.05, DOOR_HEIGHT, 0.35]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.5}
          toneMapped={false}
        />
      </mesh>
      {/* Top frame */}
      <mesh position={[position[0], position[1] + DOOR_HEIGHT / 2 + 0.15, position[2]]}>
        <boxGeometry args={[3.7, 0.3, 0.35]} />
        <meshStandardMaterial color="#2a2428" metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
  );
}

// Door positions at corridor entrances
export const DOOR_CONFIGS: DoorData[] = [
  // North corridor entrance
  { position: [0, DOOR_HEIGHT / 2, -7.5], color: "#ff2255" },
  // South corridor entrance
  { position: [0, DOOR_HEIGHT / 2, 7.5], color: "#7b2ff7" },
  // East corridor entrance
  { position: [7.5, DOOR_HEIGHT / 2, 0], rotation: [0, Math.PI / 2, 0], color: "#00d4ff" },
  // West corridor entrance
  { position: [-7.5, DOOR_HEIGHT / 2, 0], rotation: [0, Math.PI / 2, 0], color: "#ff8800" },
];

export default function Doors() {
  return (
    <group>
      {DOOR_CONFIGS.map((door, i) => (
        <Door key={i} {...door} />
      ))}
    </group>
  );
}
