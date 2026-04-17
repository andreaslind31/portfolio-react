"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

export interface RemotePlayerData {
  id: string;
  name: string;
  position: THREE.Vector3;
  targetPosition: THREE.Vector3; // for interpolation
  rotation: [number, number]; // yaw, pitch
  targetRotation: [number, number];
  weapon: string;
  health: number;
  alive: boolean;
  lastUpdate: number;
}

interface RemotePlayerMeshProps {
  player: RemotePlayerData;
}

function RemotePlayerMesh({ player }: RemotePlayerMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  useFrame((_, delta) => {
    if (!groupRef.current || !player.alive) {
      if (groupRef.current) groupRef.current.visible = false;
      return;
    }

    groupRef.current.visible = true;

    // Interpolate toward target position (smooths out 20Hz updates)
    player.position.lerp(player.targetPosition, Math.min(1, delta * 15));

    groupRef.current.position.copy(player.position);
    groupRef.current.position.y += 0.9; // center of player height

    // Billboard — face camera
    groupRef.current.lookAt(
      camera.position.x,
      groupRef.current.position.y,
      camera.position.z
    );
  });

  return (
    <group ref={groupRef}>
      {/* Player body — simple colored capsule shape */}
      <mesh position={[0, 0, 0]}>
        <capsuleGeometry args={[0.3, 0.8, 8, 16]} />
        <meshStandardMaterial
          color="#cc8844"
          emissive="#cc8844"
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Head */}
      <mesh position={[0, 0.7, 0]}>
        <sphereGeometry args={[0.22, 8, 8]} />
        <meshStandardMaterial
          color="#ddaa66"
          emissive="#ddaa66"
          emissiveIntensity={0.15}
        />
      </mesh>

      {/* Eye visor */}
      <mesh position={[0, 0.72, 0.18]}>
        <boxGeometry args={[0.3, 0.06, 0.05]} />
        <meshStandardMaterial
          color="#ff6622"
          emissive="#ff6622"
          emissiveIntensity={1.5}
          toneMapped={false}
        />
      </mesh>

      {/* Name tag — rendered as a plane with text (billboard) */}
      <group position={[0, 1.2, 0]}>
        <mesh>
          <planeGeometry args={[1.2, 0.2]} />
          <meshBasicMaterial
            color="#000000"
            transparent
            opacity={0.5}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
    </group>
  );
}

interface RemotePlayersProps {
  players: RemotePlayerData[];
}

export default function RemotePlayers({ players }: RemotePlayersProps) {
  return (
    <group>
      {players
        .filter((p) => p.alive)
        .map((p) => (
          <RemotePlayerMesh key={p.id} player={p} />
        ))}
    </group>
  );
}
