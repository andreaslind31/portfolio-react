"use client";

import { useRef, useMemo } from "react";
import { useFrame, useThree, useLoader } from "@react-three/fiber";
import * as THREE from "three";

export type PickupType =
  | "health"
  | "armor"
  | "shotgun"
  | "plasma"
  | "rocket"
  | "speed"
  | "damage";

export interface PickupData {
  id: number;
  position: THREE.Vector3;
  type: PickupType;
  alive: boolean;
  spawnTime: number;
}

const PICKUP_CONFIG: Record<PickupType, { color: string; label: string }> = {
  health: { color: "#3a8a3a", label: "HP" },
  armor: { color: "#4a90c8", label: "AR" },
  shotgun: { color: "#8a7a3a", label: "SG" },
  plasma: { color: "#33aa33", label: "PL" },
  rocket: { color: "#8B4513", label: "RL" },
  speed: { color: "#7a8a3a", label: "SP" },
  damage: { color: "#8B0000", label: "DM" },
};

// Weapon pickup sprite paths (first idle frame)
const WEAPON_SPRITES: Partial<Record<PickupType, string>> = {
  shotgun: "/game-assets/weapons/Shotgun/SHOTGUN_0001.png",
  plasma: "/game-assets/weapons/MachineGun/MACHINEGUN_0001.png",
  rocket: "/game-assets/weapons/RocketLauncher/ROCKETLAUNCHER_0001.png",
};

const WEAPON_PICKUP_TYPES = new Set<PickupType>(["shotgun", "plasma", "rocket"]);

function useWeaponPickupTextures() {
  const textures = useLoader(
    THREE.TextureLoader,
    [
      WEAPON_SPRITES.shotgun!,
      WEAPON_SPRITES.plasma!,
      WEAPON_SPRITES.rocket!,
    ]
  );

  useMemo(() => {
    textures.forEach((tex) => {
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      tex.colorSpace = THREE.SRGBColorSpace;
    });
  }, [textures]);

  return { shotgun: textures[0], plasma: textures[1], rocket: textures[2] };
}

interface PickupMeshProps {
  pickup: PickupData;
  weaponTextures: Record<string, THREE.Texture>;
}

function PickupMesh({ pickup, weaponTextures }: PickupMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const isWeapon = WEAPON_PICKUP_TYPES.has(pickup.type);

  useFrame((state) => {
    if (!groupRef.current || !pickup.alive) return;
    groupRef.current.position.copy(pickup.position);
    groupRef.current.position.y += 0.8 + Math.sin(state.clock.elapsedTime * 3) * 0.15;

    if (isWeapon) {
      // Billboard: face camera
      groupRef.current.lookAt(
        camera.position.x,
        groupRef.current.position.y,
        camera.position.z
      );
    } else {
      groupRef.current.rotation.y = state.clock.elapsedTime * 2;
    }
  });

  const cfg = PICKUP_CONFIG[pickup.type];

  if (isWeapon) {
    const texture = weaponTextures[pickup.type];
    return (
      <group ref={groupRef} visible={pickup.alive}>
        <mesh>
          <planeGeometry args={[0.9, 0.9]} />
          <meshBasicMaterial
            map={texture}
            transparent
            alphaTest={0.1}
            side={THREE.DoubleSide}
            depthWrite={true}
          />
        </mesh>
        {/* Subtle glow ring behind the sprite */}
        <mesh position={[0, 0, -0.02]}>
          <planeGeometry args={[1.1, 1.1]} />
          <meshBasicMaterial
            color={cfg.color}
            transparent
            opacity={0.15}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      </group>
    );
  }

  // Armor pickup: tilted cube that reads as a shield chunk
  if (pickup.type === "armor") {
    return (
      <group ref={groupRef} visible={pickup.alive}>
        <mesh rotation={[0.4, 0, 0.4]}>
          <boxGeometry args={[0.4, 0.4, 0.4]} />
          <meshBasicMaterial color={cfg.color} toneMapped={false} />
        </mesh>
      </group>
    );
  }

  // Non-weapon pickups: octahedron geometry
  return (
    <group ref={groupRef} visible={pickup.alive}>
      <mesh>
        <octahedronGeometry args={[0.25, 0]} />
        <meshBasicMaterial color={cfg.color} toneMapped={false} />
      </mesh>
    </group>
  );
}

interface PickupsProps {
  pickups: PickupData[];
}

export default function Pickups({ pickups }: PickupsProps) {
  const weaponTextures = useWeaponPickupTextures();

  return (
    <group>
      {pickups.filter((p) => p.alive).map((p) => (
        <PickupMesh key={p.id} pickup={p} weaponTextures={weaponTextures} />
      ))}
    </group>
  );
}
