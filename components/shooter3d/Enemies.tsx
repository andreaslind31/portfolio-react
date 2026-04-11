"use client";

import { useRef } from "react";
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
  // AI state
  aiState: "patrol" | "engage" | "strafe" | "charge" | "retreat";
  strafeDir: number; // 1 or -1
  burstCount: number; // shots remaining in burst (sentinel)
  chargeTimer: number; // charge windup (heavy)
}

interface EnemyMeshProps {
  enemy: EnemyData;
  playerPosition: THREE.Vector3;
}

function EnemyMesh({ enemy, playerPosition }: EnemyMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!groupRef.current || !enemy.alive) return;

    // Bob up and down
    const bobSpeed = enemy.type === "drone" ? 4 : enemy.type === "sentinel" ? 2.5 : 1.5;
    const bobAmt = enemy.type === "heavy" ? 0.1 : 0.2;
    const bob = Math.sin(state.clock.elapsedTime * bobSpeed + enemy.bobOffset) * bobAmt;
    const hoverHeight = enemy.type === "heavy" ? 1.0 : 1.5;
    groupRef.current.position.copy(enemy.position);
    groupRef.current.position.y += bob + hoverHeight;

    // Face player
    const lookTarget = playerPosition.clone();
    lookTarget.y = groupRef.current.position.y;
    groupRef.current.lookAt(lookTarget);

    // Charging heavy tilts forward
    if (enemy.type === "heavy" && enemy.aiState === "charge") {
      groupRef.current.rotation.x = -0.3;
    }

    // Pulse glow
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshStandardMaterial;
      const pulseSpeed = enemy.aiState === "charge" ? 12 : 5;
      mat.emissiveIntensity = 3 + Math.sin(state.clock.elapsedTime * pulseSpeed + enemy.bobOffset) * 1.5;
    }
  });

  const color =
    enemy.type === "drone"
      ? "#ff2255"
      : enemy.type === "sentinel"
        ? "#ff8800"
        : "#ff0044";
  const eyeColor =
    enemy.type === "drone"
      ? "#ff0044"
      : enemy.type === "sentinel"
        ? "#ffaa00"
        : "#ff0000";

  return (
    <group ref={groupRef} visible={enemy.alive}>
      {/* Main body */}
      <mesh castShadow>
        {enemy.type === "drone" ? (
          <octahedronGeometry args={[0.5, 0]} />
        ) : enemy.type === "sentinel" ? (
          <boxGeometry args={[0.7, 0.9, 0.7]} />
        ) : (
          <sphereGeometry args={[0.8, 8, 6]} />
        )}
        <meshStandardMaterial color="#3a3a55" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Eye / sensor */}
      <mesh ref={glowRef} position={[0, 0, enemy.type === "heavy" ? 0.5 : 0.3]}>
        <sphereGeometry args={[enemy.type === "heavy" ? 0.25 : 0.18, 8, 8]} />
        <meshStandardMaterial
          color={eyeColor}
          emissive={eyeColor}
          emissiveIntensity={4}
          toneMapped={false}
        />
      </mesh>

      {/* ── Drone thrusters ── */}
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
          <mesh position={[0.4, -0.06, 0]}>
            <boxGeometry args={[0.15, 0.03, 0.08]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} toneMapped={false} />
          </mesh>
          <mesh position={[-0.4, -0.06, 0]}>
            <boxGeometry args={[0.15, 0.03, 0.08]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} toneMapped={false} />
          </mesh>
          {/* Tail fin */}
          <mesh position={[0, 0.15, 0.35]}>
            <boxGeometry args={[0.04, 0.25, 0.15]} />
            <meshStandardMaterial color="#1a1a2e" metalness={0.8} roughness={0.2} />
          </mesh>
        </>
      )}

      {/* ── Sentinel antenna + side sensors ── */}
      {enemy.type === "sentinel" && (
        <>
          <mesh position={[0, 0.55, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.3, 6]} />
            <meshStandardMaterial color="#ff8800" emissive="#ff8800" emissiveIntensity={2} toneMapped={false} />
          </mesh>
          {/* Side sensor pods */}
          <mesh position={[0.45, 0, 0]}>
            <boxGeometry args={[0.2, 0.25, 0.25]} />
            <meshStandardMaterial color="#1a1a2e" metalness={0.9} roughness={0.1} />
          </mesh>
          <mesh position={[-0.45, 0, 0]}>
            <boxGeometry args={[0.2, 0.25, 0.25]} />
            <meshStandardMaterial color="#1a1a2e" metalness={0.9} roughness={0.1} />
          </mesh>
          {/* Barrel (forward-facing) */}
          <mesh position={[0.45, 0, 0.2]}>
            <cylinderGeometry args={[0.04, 0.04, 0.2, 6]} />
            <meshStandardMaterial color="#ff8800" emissive="#ff8800" emissiveIntensity={1} toneMapped={false} />
          </mesh>
          <mesh position={[-0.45, 0, 0.2]}>
            <cylinderGeometry args={[0.04, 0.04, 0.2, 6]} />
            <meshStandardMaterial color="#ff8800" emissive="#ff8800" emissiveIntensity={1} toneMapped={false} />
          </mesh>
        </>
      )}

      {/* ── Heavy armor plates + cannon ── */}
      {enemy.type === "heavy" && (
        <>
          {/* Front armor */}
          <mesh position={[0, 0, -0.3]}>
            <boxGeometry args={[1.2, 0.9, 0.2]} />
            <meshStandardMaterial color="#1a1a2e" metalness={0.9} roughness={0.1} />
          </mesh>
          {/* Side plates */}
          <mesh position={[0.6, 0, 0]}>
            <boxGeometry args={[0.15, 0.7, 0.8]} />
            <meshStandardMaterial color="#1a1a2e" metalness={0.9} roughness={0.1} />
          </mesh>
          <mesh position={[-0.6, 0, 0]}>
            <boxGeometry args={[0.15, 0.7, 0.8]} />
            <meshStandardMaterial color="#1a1a2e" metalness={0.9} roughness={0.1} />
          </mesh>
          {/* Heavy cannon */}
          <mesh position={[0, -0.1, 0.6]}>
            <cylinderGeometry args={[0.15, 0.15, 0.5, 8]} />
            <meshStandardMaterial color="#ff0044" emissive="#ff0044" emissiveIntensity={1.5} toneMapped={false} />
          </mesh>
          {/* Charge glow ring (visible during charge) */}
          {enemy.aiState === "charge" && (
            <mesh position={[0, 0, 0.85]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.2, 0.04, 6, 12]} />
              <meshStandardMaterial color="#ff0044" emissive="#ff0044" emissiveIntensity={5} toneMapped={false} />
            </mesh>
          )}
        </>
      )}

      {/* Health bar */}
      {enemy.hp < enemy.maxHp && (
        <group position={[0, enemy.type === "heavy" ? 1 : 0.8, 0]}>
          <mesh>
            <planeGeometry args={[0.8, 0.08]} />
            <meshBasicMaterial color="#333" transparent opacity={0.6} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[-(1 - enemy.hp / enemy.maxHp) * 0.4, 0, 0.001]}>
            <planeGeometry args={[(enemy.hp / enemy.maxHp) * 0.8, 0.06]} />
            <meshBasicMaterial color={color} side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}

      {/* Point light for glow */}
      <pointLight color={color} intensity={enemy.aiState === "charge" ? 6 : 3} distance={8} decay={2} />
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
        <EnemyMesh
          key={enemy.id}
          enemy={enemy}
          playerPosition={playerPosition}
        />
      ))}
    </group>
  );
}
