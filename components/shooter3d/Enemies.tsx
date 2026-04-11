"use client";

import { useRef, useMemo, useEffect } from "react";
import { useFrame, useThree, useLoader } from "@react-three/fiber";
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
  strafeDir: number;
  burstCount: number;
  chargeTimer: number;
  // Sprite state
  isShooting: boolean;
  shootFrame: number;
  lastMoveDir: THREE.Vector3;
}

// ── Sprite asset paths ──────────────────────────────────
const BASE = "/game-assets/enemies/imp";
const ROTATION_DIRS = [
  "south",
  "south-west",
  "west",
  "north-west",
  "north",
  "north-east",
  "east",
  "south-east",
] as const;

const ATTACK_DIRS = ["south", "south-east", "south-west"] as const;
const ATTACK_FRAME_COUNT = 6;

// ── Preload all textures ────────────────────────────────
function useEnemyTextures() {
  // Rotation idle sprites
  const rotationTextures = useLoader(
    THREE.TextureLoader,
    ROTATION_DIRS.map((dir) => `${BASE}/rotations/${dir}.png`)
  );

  // Attack animation frames (south, south-east, south-west × 6 frames)
  const attackTextures = useLoader(
    THREE.TextureLoader,
    ATTACK_DIRS.flatMap((dir) =>
      Array.from(
        { length: ATTACK_FRAME_COUNT },
        (_, i) =>
          `${BASE}/animations/Fireball-e746cbc0/${dir}/frame_${String(i).padStart(3, "0")}.png`
      )
    )
  );

  // Set nearest-neighbor filtering for pixel art crispness
  useMemo(() => {
    [...rotationTextures, ...attackTextures].forEach((tex) => {
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      tex.colorSpace = THREE.SRGBColorSpace;
    });
  }, [rotationTextures, attackTextures]);

  return { rotationTextures, attackTextures };
}

/**
 * Given the angle from the camera to the enemy (in world space),
 * and the enemy's facing direction, pick the right sprite rotation index.
 *
 * The 8 directions are indexed 0-7 starting from "south" (facing camera)
 * going clockwise: S, SW, W, NW, N, NE, E, SE.
 */
function getDirectionIndex(
  enemyPos: THREE.Vector3,
  enemyFacingDir: THREE.Vector3,
  cameraPos: THREE.Vector3
): number {
  // Vector from enemy to camera
  const toCamera = new THREE.Vector3()
    .subVectors(cameraPos, enemyPos)
    .setY(0)
    .normalize();

  // Angle between enemy's facing direction and the direction to camera
  const facing = enemyFacingDir.clone().setY(0).normalize();

  // Cross product Y gives sign, dot gives cosine
  const dot = facing.x * toCamera.x + facing.z * toCamera.z;
  const cross = facing.x * toCamera.z - facing.z * toCamera.x;
  let angle = Math.atan2(cross, dot); // radians, -PI to PI

  // Normalize to 0-2PI
  if (angle < 0) angle += Math.PI * 2;

  // Quantize to 8 directions (each spans PI/4 = 45°)
  const index = Math.round((angle / (Math.PI * 2)) * 8) % 8;
  return index;
}

/**
 * For attack animation, map the 8-dir index to the nearest available
 * attack direction (only south, south-east, south-west have frames).
 * Returns the attack dir index (0=south, 1=south-east, 2=south-west)
 * or falls back to south.
 */
function getAttackDirIndex(dirIndex: number): number {
  // Map: 0=S→0, 1=SW→2, 2=W→2, 3=NW→2, 4=N→0, 5=NE→1, 6=E→1, 7=SE→1
  const mapping = [0, 2, 2, 2, 0, 1, 1, 1];
  return mapping[dirIndex];
}

// ── Single enemy sprite ─────────────────────────────────
interface EnemyMeshProps {
  enemy: EnemyData;
  playerPosition: THREE.Vector3;
  rotationTextures: THREE.Texture[];
  attackTextures: THREE.Texture[];
}

function EnemySprite({
  enemy,
  playerPosition,
  rotationTextures,
  attackTextures,
}: EnemyMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const spriteMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const { camera } = useThree();

  // Size scales per enemy type
  const spriteScale = enemy.type === "heavy" ? 2.8 : enemy.type === "sentinel" ? 2.2 : 1.8;
  const hoverHeight = enemy.type === "heavy" ? 0.0 : 0.2;

  const color =
    enemy.type === "drone"
      ? "#ff2255"
      : enemy.type === "sentinel"
        ? "#ff8800"
        : "#ff0044";

  useFrame((state) => {
    if (!groupRef.current || !enemy.alive) return;

    // Position
    const bob =
      Math.sin(state.clock.elapsedTime * 2 + enemy.bobOffset) * 0.08;
    groupRef.current.position.set(
      enemy.position.x,
      enemy.position.y + hoverHeight + bob,
      enemy.position.z
    );

    // Billboard: always face camera (only Y rotation)
    groupRef.current.lookAt(
      camera.position.x,
      groupRef.current.position.y,
      camera.position.z
    );

    // Pick sprite direction
    if (spriteMatRef.current) {
      const dirIdx = getDirectionIndex(
        enemy.position,
        enemy.lastMoveDir,
        camera.position
      );

      if (enemy.isShooting) {
        // Attack animation
        const attackDir = getAttackDirIndex(dirIdx);
        const frameIdx = Math.min(
          enemy.shootFrame,
          ATTACK_FRAME_COUNT - 1
        );
        const texIdx = attackDir * ATTACK_FRAME_COUNT + frameIdx;
        spriteMatRef.current.map = attackTextures[texIdx];
      } else {
        // Idle rotation
        spriteMatRef.current.map = rotationTextures[dirIdx];
      }
      spriteMatRef.current.needsUpdate = true;
    }
  });

  return (
    <group ref={groupRef} visible={enemy.alive}>
      {/* Sprite plane */}
      <mesh position={[0, spriteScale / 2, 0]}>
        <planeGeometry args={[spriteScale, spriteScale]} />
        <meshBasicMaterial
          ref={spriteMatRef}
          map={rotationTextures[0]}
          transparent
          alphaTest={0.1}
          side={THREE.DoubleSide}
          depthWrite={true}
        />
      </mesh>

      {/* Health bar — above sprite */}
      {enemy.hp < enemy.maxHp && (
        <group position={[0, spriteScale + 0.3, 0]}>
          <mesh>
            <planeGeometry args={[1.2, 0.1]} />
            <meshBasicMaterial
              color="#333"
              transparent
              opacity={0.7}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh
            position={[
              -(1 - enemy.hp / enemy.maxHp) * 0.6,
              0,
              0.001,
            ]}
          >
            <planeGeometry
              args={[(enemy.hp / enemy.maxHp) * 1.2, 0.08]}
            />
            <meshBasicMaterial color={color} side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}

      {/* Glow light */}
      <pointLight
        position={[0, spriteScale / 2, 0]}
        color={color}
        intensity={enemy.aiState === "charge" ? 5 : 2}
        distance={8}
        decay={2}
      />
    </group>
  );
}

// ── Main Enemies renderer ───────────────────────────────
interface EnemiesProps {
  enemies: EnemyData[];
  playerPosition: THREE.Vector3;
}

export default function Enemies({ enemies, playerPosition }: EnemiesProps) {
  const { rotationTextures, attackTextures } = useEnemyTextures();

  return (
    <group>
      {enemies.map((enemy) => (
        <EnemySprite
          key={enemy.id}
          enemy={enemy}
          playerPosition={playerPosition}
          rotationTextures={rotationTextures}
          attackTextures={attackTextures}
        />
      ))}
    </group>
  );
}
