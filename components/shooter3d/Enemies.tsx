"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export interface EnemyData {
  id: number;
  position: THREE.Vector3;
  hp: number;
  maxHp: number;
  type: "drone" | "sentinel" | "heavy";
  alive: boolean;
  speed: number;
  bobOffset: number;
}

interface EnemyMeshProps {
  enemy: EnemyData;
  playerPosition: THREE.Vector3;
}

/** Sci-fi drone enemy mesh */
function DroneMesh({ enemy, playerPosition }: EnemyMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!groupRef.current || !enemy.alive) return;

    // Bob up and down
    const bob = Math.sin(state.clock.elapsedTime * 3 + enemy.bobOffset) * 0.2;
    groupRef.current.position.copy(enemy.position);
    groupRef.current.position.y += bob + 1.5;

    // Face player
    const lookTarget = playerPosition.clone();
    lookTarget.y = groupRef.current.position.y;
    groupRef.current.lookAt(lookTarget);

    // Pulse glow
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 1.5 + Math.sin(state.clock.elapsedTime * 5 + enemy.bobOffset) * 0.5;
    }
  });

  const color = enemy.type === "drone" ? "#ff2255" : enemy.type === "sentinel" ? "#ff8800" : "#ff0044";
  const eyeColor = enemy.type === "drone" ? "#ff0044" : "#ffaa00";

  return (
    <group ref={groupRef} visible={enemy.alive}>
      {/* Main body */}
      <mesh castShadow>
        {enemy.type === "drone" ? (
          <octahedronGeometry args={[0.5, 0]} />
        ) : enemy.type === "sentinel" ? (
          <boxGeometry args={[0.7, 0.9, 0.7]} />
        ) : (
          <sphereGeometry args={[0.7, 8, 6]} />
        )}
        <meshStandardMaterial
          color="#2a2a3e"
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Eye / sensor */}
      <mesh ref={glowRef} position={[0, 0, 0.3]}>
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshStandardMaterial
          color={eyeColor}
          emissive={eyeColor}
          emissiveIntensity={2}
          toneMapped={false}
        />
      </mesh>

      {/* Side thrusters */}
      {enemy.type === "drone" && (
        <>
          <mesh position={[0.4, 0, 0]}>
            <boxGeometry args={[0.3, 0.08, 0.15]} />
            <meshStandardMaterial color="#1a1a2e" metalness={0.9} roughness={0.1} />
          </mesh>
          <mesh position={[-0.4, 0, 0]}>
            <boxGeometry args={[0.3, 0.08, 0.15]} />
            <meshStandardMaterial color="#1a1a2e" metalness={0.9} roughness={0.1} />
          </mesh>
          {/* Thruster glow */}
          <mesh position={[0.4, -0.06, 0]}>
            <boxGeometry args={[0.15, 0.03, 0.08]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={2}
              toneMapped={false}
            />
          </mesh>
          <mesh position={[-0.4, -0.06, 0]}>
            <boxGeometry args={[0.15, 0.03, 0.08]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={2}
              toneMapped={false}
            />
          </mesh>
        </>
      )}

      {/* Sentinel antenna */}
      {enemy.type === "sentinel" && (
        <mesh position={[0, 0.55, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.3, 6]} />
          <meshStandardMaterial
            color="#ff8800"
            emissive="#ff8800"
            emissiveIntensity={2}
            toneMapped={false}
          />
        </mesh>
      )}

      {/* Heavy armor plates */}
      {enemy.type === "heavy" && (
        <>
          <mesh position={[0, 0, -0.2]}>
            <boxGeometry args={[1, 0.8, 0.15]} />
            <meshStandardMaterial color="#1a1a2e" metalness={0.9} roughness={0.1} />
          </mesh>
          <mesh position={[0, 0, 0.5]}>
            <cylinderGeometry args={[0.12, 0.12, 0.3, 8]} />
            <meshStandardMaterial
              color="#ff0044"
              emissive="#ff0044"
              emissiveIntensity={2}
              toneMapped={false}
            />
          </mesh>
        </>
      )}

      {/* Health bar */}
      {enemy.hp < enemy.maxHp && (
        <group position={[0, 0.8, 0]}>
          {/* Background */}
          <mesh>
            <planeGeometry args={[0.8, 0.08]} />
            <meshBasicMaterial color="#333" transparent opacity={0.6} side={THREE.DoubleSide} />
          </mesh>
          {/* Fill */}
          <mesh position={[-(1 - enemy.hp / enemy.maxHp) * 0.4, 0, 0.001]}>
            <planeGeometry args={[(enemy.hp / enemy.maxHp) * 0.8, 0.06]} />
            <meshBasicMaterial color={color} side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}

      {/* Point light for glow effect */}
      <pointLight color={color} intensity={1} distance={4} decay={2} />
    </group>
  );
}

interface EnemiesProps {
  enemies: EnemyData[];
  playerPosition: THREE.Vector3;
}

export default function Enemies({ enemies, playerPosition }: EnemiesProps) {
  return (
    <group>
      {enemies.map((enemy) => (
        <DroneMesh
          key={enemy.id}
          enemy={enemy}
          playerPosition={playerPosition}
        />
      ))}
    </group>
  );
}
