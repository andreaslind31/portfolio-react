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
  aiState: "patrol" | "engage" | "strafe" | "charge" | "retreat";
  strafeDir: number;
  burstCount: number;
  chargeTimer: number;
  isShooting: boolean;
  shootFrame: number;
  lastMoveDir: THREE.Vector3;
  // Death animation
  dying: boolean;
  deathTimer: number;
}

// ── Type-specific visual config ─────────────────────────
export const ENEMY_COLORS = {
  drone: { tint: "#ffffff", glow: "#ff2255", projectile: "#ff2255", name: "DRONE" },
  sentinel: { tint: "#ffffff", glow: "#ff8800", projectile: "#ffaa00", name: "SENTINEL" },
  heavy: { tint: "#ffffff", glow: "#9933ff", projectile: "#cc44ff", name: "HEAVY" },
} as const;

// ── Sprite configuration ────────────────────────────────
const ROTATION_DIRS = [
  "south", "south-west", "west", "north-west",
  "north", "north-east", "east", "south-east",
] as const;

const ATTACK_DIRS = ["south", "south-east", "south-west"] as const;
const ATTACK_FRAME_COUNT = 6;

const SPRITE_SETS = {
  imp: {
    base: "/game-assets/enemies/imp",
    attackAnim: "Fireball-e746cbc0",
  },
  impSentinel: {
    base: "/game-assets/enemies/giant_kicking_imp",
    attackAnim: "Flying_Kick-5baba02b",
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

  const colors = ENEMY_COLORS[enemy.type];

  // Color tint applied to sprite (multiply with texture)
  const tintColor = useMemo(() => new THREE.Color(colors.tint), [colors.tint]);

  const DEATH_DURATION = 0.6;

  useFrame((state) => {
    if (!groupRef.current) return;
    if (!enemy.alive && !enemy.dying) {
      groupRef.current.visible = false;
      return;
    }

    groupRef.current.visible = true;

    // Death animation: flash red, shrink Y, fade out
    if (enemy.dying) {
      const t = Math.min(enemy.deathTimer / DEATH_DURATION, 1);
      // Collapse downward
      groupRef.current.scale.set(1 + t * 0.3, Math.max(0, 1 - t), 1);
      groupRef.current.position.set(
        enemy.position.x,
        enemy.position.y - t * 0.5,
        enemy.position.z
      );
      // Fade + flash
      if (spriteMatRef.current) {
        spriteMatRef.current.opacity = 1 - t;
        spriteMatRef.current.color.setRGB(1, 1 - t * 0.7, 1 - t * 0.7); // flash red
      }
      // Billboard
      groupRef.current.lookAt(
        camera.position.x,
        groupRef.current.position.y,
        camera.position.z
      );
      return;
    }

    // Alive — normal rendering
    const bob =
      Math.sin(state.clock.elapsedTime * 2 + enemy.bobOffset) * 0.08;
    groupRef.current.position.set(
      enemy.position.x,
      enemy.position.y + hoverHeight + bob,
      enemy.position.z
    );
    groupRef.current.scale.set(1, 1, 1);

    // Billboard
    groupRef.current.lookAt(
      camera.position.x,
      groupRef.current.position.y,
      camera.position.z
    );

    // Pick sprite direction
    if (spriteMatRef.current) {
      spriteMatRef.current.opacity = 1;
      spriteMatRef.current.color.set(tintColor);

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
      {/* Sprite plane with color tint */}
      <mesh position={[0, spriteScale / 2, 0]}>
        <planeGeometry args={[spriteScale, spriteScale]} />
        <meshBasicMaterial
          ref={spriteMatRef}
          map={textures.rotations[0]}
          color={tintColor}
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
            <meshBasicMaterial color={colors.glow} side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}

      {/* Glow light matching type color */}
      <pointLight
        position={[0, spriteScale / 2, 0]}
        color={colors.glow}
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

function getTextureSet(
  type: EnemyData["type"],
  sets: { drone: SpriteTextures; sentinel: SpriteTextures; heavy: SpriteTextures }
): SpriteTextures {
  return sets[type];
}

export default function Enemies({ enemies, playerPosition }: EnemiesProps) {
  const droneTextures = useSpriteSet("imp");
  const sentinelTextures = useSpriteSet("impSentinel");
  const heavyTextures = useSpriteSet("impHeavy");

  const sets = { drone: droneTextures, sentinel: sentinelTextures, heavy: heavyTextures };

  return (
    <group>
      {enemies.map((enemy) => (
        <EnemySprite
          key={enemy.id}
          enemy={enemy}
          textures={getTextureSet(enemy.type, sets)}
        />
      ))}
    </group>
  );
}
