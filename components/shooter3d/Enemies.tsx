"use client";

import { useRef, useMemo } from "react";
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

// ── Sprite configuration ────────────────────────────────
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

// Sprite sets: small imp (drone/sentinel) and heavy imp (heavy)
const SPRITE_SETS = {
  imp: {
    base: "/game-assets/enemies/imp",
    attackAnim: "Fireball-e746cbc0",
  },
  impHeavy: {
    base: "/game-assets/enemies/imp-heavy",
    attackAnim: "Cross_Punch-b0a0bfd2",
  },
} as const;

type SpriteSetKey = keyof typeof SPRITE_SETS;

interface SpriteTextures {
  rotations: THREE.Texture[];
  attacks: THREE.Texture[];
}

// ── Preload all textures for a sprite set ───────────────
function useSpriteSet(key: SpriteSetKey): SpriteTextures {
  const cfg = SPRITE_SETS[key];

  const rotations = useLoader(
    THREE.TextureLoader,
    ROTATION_DIRS.map((dir) => `${cfg.base}/rotations/${dir}.png`)
  );

  const attacks = useLoader(
    THREE.TextureLoader,
    ATTACK_DIRS.flatMap((dir) =>
      Array.from(
        { length: ATTACK_FRAME_COUNT },
        (_, i) =>
          `${cfg.base}/animations/${cfg.attackAnim}/${dir}/frame_${String(i).padStart(3, "0")}.png`
      )
    )
  );

  useMemo(() => {
    [...rotations, ...attacks].forEach((tex) => {
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      tex.colorSpace = THREE.SRGBColorSpace;
    });
  }, [rotations, attacks]);

  return { rotations, attacks };
}

// ── Direction helpers ───────────────────────────────────

function getDirectionIndex(
  enemyPos: THREE.Vector3,
  enemyFacingDir: THREE.Vector3,
  cameraPos: THREE.Vector3
): number {
  const toCamera = new THREE.Vector3()
    .subVectors(cameraPos, enemyPos)
    .setY(0)
    .normalize();

  const facing = enemyFacingDir.clone().setY(0).normalize();

  const dot = facing.x * toCamera.x + facing.z * toCamera.z;
  const cross = facing.x * toCamera.z - facing.z * toCamera.x;
  let angle = Math.atan2(cross, dot);

  if (angle < 0) angle += Math.PI * 2;

  return Math.round((angle / (Math.PI * 2)) * 8) % 8;
}

function getAttackDirIndex(dirIndex: number): number {
  // Map 8 dirs → 3 available attack dirs: 0=south, 1=south-east, 2=south-west
  const mapping = [0, 2, 2, 2, 0, 1, 1, 1];
  return mapping[dirIndex];
}

// ── Single enemy sprite ─────────────────────────────────

interface EnemySpriteProps {
  enemy: EnemyData;
  textures: SpriteTextures;
}

function EnemySprite({ enemy, textures }: EnemySpriteProps) {
  const groupRef = useRef<THREE.Group>(null);
  const spriteMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const { camera } = useThree();

  const spriteScale =
    enemy.type === "heavy" ? 2.8 : enemy.type === "sentinel" ? 2.2 : 1.8;
  const hoverHeight = enemy.type === "heavy" ? 0.0 : 0.2;

  const color =
    enemy.type === "drone"
      ? "#ff2255"
      : enemy.type === "sentinel"
        ? "#ff8800"
        : "#ff0044";

  useFrame((state) => {
    if (!groupRef.current || !enemy.alive) return;

    // Position + bob
    const bob =
      Math.sin(state.clock.elapsedTime * 2 + enemy.bobOffset) * 0.08;
    groupRef.current.position.set(
      enemy.position.x,
      enemy.position.y + hoverHeight + bob,
      enemy.position.z
    );

    // Billboard: face camera (Y axis only)
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
        const attackDir = getAttackDirIndex(dirIdx);
        const frameIdx = Math.min(
          Math.floor(enemy.shootFrame),
          ATTACK_FRAME_COUNT - 1
        );
        const texIdx = attackDir * ATTACK_FRAME_COUNT + frameIdx;
        spriteMatRef.current.map = textures.attacks[texIdx];
      } else {
        spriteMatRef.current.map = textures.rotations[dirIdx];
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
          map={textures.rotations[0]}
          transparent
          alphaTest={0.1}
          side={THREE.DoubleSide}
          depthWrite={true}
        />
      </mesh>

      {/* Health bar */}
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
            position={[-(1 - enemy.hp / enemy.maxHp) * 0.6, 0, 0.001]}
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
  const impTextures = useSpriteSet("imp");
  const heavyTextures = useSpriteSet("impHeavy");

  return (
    <group>
      {enemies.map((enemy) => (
        <EnemySprite
          key={enemy.id}
          enemy={enemy}
          textures={enemy.type === "heavy" ? heavyTextures : impTextures}
        />
      ))}
    </group>
  );
}
