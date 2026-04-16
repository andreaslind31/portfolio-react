"use client";

import { useRef, useCallback, useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

export type WeaponType = "blaster" | "shotgun" | "plasma" | "rocket";

export interface WeaponConfig {
  cooldown: number;
  recoil: number;
  color: string;
  flashColor: string;
  damage: number;
  speed: number;
  spread: number;
  pellets: number;
  projectileSize: number;
  projectileLife: number;
  explosive?: boolean;
  explosionRadius?: number;
}

export const WEAPON_CONFIGS: Record<WeaponType, WeaponConfig> = {
  blaster: {
    cooldown: 0.15,
    recoil: 0.08,
    color: "#c8a848",
    flashColor: "#ffcc66",
    damage: 25,
    speed: 40,
    spread: 0,
    pellets: 1,
    projectileSize: 1,
    projectileLife: 3,
  },
  shotgun: {
    cooldown: 0.6,
    recoil: 0.18,
    color: "#cc8844",
    flashColor: "#ddaa66",
    damage: 18,
    speed: 35,
    spread: 0.08,
    pellets: 5,
    projectileSize: 0.7,
    projectileLife: 1.5,
  },
  plasma: {
    cooldown: 0.8,
    recoil: 0.15,
    color: "#33aa33",
    flashColor: "#55bb55",
    damage: 60,
    speed: 25,
    spread: 0,
    pellets: 1,
    projectileSize: 2.5,
    projectileLife: 4,
  },
  rocket: {
    cooldown: 1.2,
    recoil: 0.25,
    color: "#cc4400",
    flashColor: "#dd6633",
    damage: 80,
    speed: 20,
    spread: 0,
    pellets: 1,
    projectileSize: 3,
    projectileLife: 5,
    explosive: true,
    explosionRadius: 5,
  },
};

// ── Sprite animation config ─────────────────────────────
const SPRITE_INFO: Record<
  WeaponType,
  { dir: string; prefix: string; frameCount: number; frameDuration: number; scale: number }
> = {
  blaster: { dir: "Glock", prefix: "GLOCK", frameCount: 7, frameDuration: 0.045, scale: 0.65 },
  shotgun: { dir: "Shotgun", prefix: "SHOTGUN", frameCount: 6, frameDuration: 0.085, scale: 0.7 },
  plasma: { dir: "MachineGun", prefix: "MACHINEGUN", frameCount: 7, frameDuration: 0.035, scale: 0.7 },
  rocket: { dir: "RocketLauncher", prefix: "ROCKETLAUNCHER", frameCount: 7, frameDuration: 0.07, scale: 0.75 },
};

interface WeaponProps {
  locked: boolean;
  weaponType: WeaponType;
  ammo: number; // -1 = infinite
  onShoot?: (origin: THREE.Vector3, direction: THREE.Vector3) => void;
}

const BOB_SPEED = 8;
const BOB_AMOUNT = 0.008;
const CAM_KICK_RECOVERY = 10;
const SWAY_DAMPING = 0.12;

export default function Weapon({ locked, weaponType, ammo, onShoot }: WeaponProps) {
  const groupRef = useRef<THREE.Group>(null);
  const spriteMatRef = useRef<THREE.SpriteMaterial>(null);
  const muzzleLightRef = useRef<THREE.PointLight>(null);
  const lastShot = useRef(0);
  const cameraKick = useRef(0);
  const bobPhase = useRef(0);
  const swayX = useRef(0);
  const swayY = useRef(0);
  const keys = useRef<Set<string>>(new Set());
  const animFrame = useRef(0); // 0 = idle, 1+ = firing animation
  const animTimer = useRef(0);
  const flashTimer = useRef(0);
  const { camera } = useThree();

  const config = WEAPON_CONFIGS[weaponType];

  // Pre-load all weapon sprite textures (pixel-art, nearest-neighbor)
  const allTextures = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const result: Partial<Record<WeaponType, THREE.Texture[]>> = {};
    (["blaster", "shotgun", "plasma", "rocket"] as WeaponType[]).forEach((type) => {
      const info = SPRITE_INFO[type];
      result[type] = Array.from({ length: info.frameCount }, (_, i) => {
        const path = `/game-assets/weapons/${info.dir}/${info.prefix}_${String(i + 1).padStart(4, "0")}.png`;
        const tex = loader.load(path);
        tex.magFilter = THREE.NearestFilter;
        tex.minFilter = THREE.NearestFilter;
        tex.colorSpace = THREE.SRGBColorSpace;
        return tex;
      });
    });
    return result as Record<WeaponType, THREE.Texture[]>;
  }, []);

  // Reset animation on weapon switch
  useEffect(() => {
    animFrame.current = 0;
    animTimer.current = 0;
  }, [weaponType]);

  // Dispose textures on unmount
  useEffect(() => {
    return () => {
      Object.values(allTextures).forEach((texArr) => texArr.forEach((t) => t.dispose()));
    };
  }, [allTextures]);

  // Key & mouse tracking for sway/bob
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => keys.current.add(e.code);
    const onKeyUp = (e: KeyboardEvent) => keys.current.delete(e.code);
    const onMouseMove = (e: MouseEvent) => {
      swayX.current += e.movementX * 0.0008;
      swayY.current += e.movementY * 0.0008;
      swayX.current = THREE.MathUtils.clamp(swayX.current, -0.03, 0.03);
      swayY.current = THREE.MathUtils.clamp(swayY.current, -0.02, 0.02);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("mousemove", onMouseMove);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  const handleClick = useCallback(() => {
    if (!locked) return;
    if (ammo === 0) return;
    const now = performance.now() / 1000;
    if (now - lastShot.current < config.cooldown) return;
    lastShot.current = now;

    // Start fire animation (frame 0 is idle, 1+ is firing sequence)
    animFrame.current = 1;
    animTimer.current = 0;

    // Subtle camera kick — sprites already show recoil visually
    const kickAmount =
      weaponType === "rocket" ? 0.03 : weaponType === "shotgun" ? 0.025 : weaponType === "plasma" ? 0.015 : 0.006;
    cameraKick.current = Math.min(cameraKick.current + kickAmount, 0.06);

    // Muzzle flash light for dynamic scene lighting
    if (muzzleLightRef.current) muzzleLightRef.current.intensity = 15;
    flashTimer.current = 0.1;

    const dir = new THREE.Vector3(0, 0, -1);
    dir.applyQuaternion(camera.quaternion);
    onShoot?.(camera.position.clone(), dir);
  }, [locked, camera, onShoot, config, ammo, weaponType]);

  useEffect(() => {
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [handleClick]);

  useFrame((_state, delta) => {
    if (!groupRef.current) return;

    // ── Advance sprite animation ──
    const spriteInfo = SPRITE_INFO[weaponType];
    if (animFrame.current > 0) {
      animTimer.current += delta;
      if (animTimer.current >= spriteInfo.frameDuration) {
        animTimer.current = 0;
        animFrame.current++;
        if (animFrame.current >= spriteInfo.frameCount) {
          animFrame.current = 0; // Back to idle
        }
      }
    }

    // Update sprite texture
    if (spriteMatRef.current) {
      const tex = allTextures[weaponType][animFrame.current];
      if (spriteMatRef.current.map !== tex) {
        spriteMatRef.current.map = tex;
        spriteMatRef.current.needsUpdate = true;
      }
    }

    // ── Muzzle flash light fade ──
    if (flashTimer.current > 0) {
      flashTimer.current -= delta;
      if (muzzleLightRef.current) {
        muzzleLightRef.current.intensity = flashTimer.current > 0 ? 15 * (flashTimer.current / 0.1) : 0;
      }
    }

    // ── Camera kick recovery ──
    if (cameraKick.current > 0.001) {
      camera.rotation.x += cameraKick.current * delta * 25;
      cameraKick.current = THREE.MathUtils.lerp(cameraKick.current, 0, delta * CAM_KICK_RECOVERY);
    } else {
      cameraKick.current = 0;
    }

    // ── Movement bob & sway ──
    const moving =
      keys.current.has("KeyW") || keys.current.has("KeyS") || keys.current.has("KeyA") || keys.current.has("KeyD");

    bobPhase.current += delta * (moving ? BOB_SPEED : 2);
    const bobY = moving ? Math.abs(Math.cos(bobPhase.current)) * BOB_AMOUNT : 0;

    swayX.current = THREE.MathUtils.lerp(swayX.current, 0, SWAY_DAMPING);
    swayY.current = THREE.MathUtils.lerp(swayY.current, 0, SWAY_DAMPING);

    // ── Position weapon group in front of camera ──
    const offset = new THREE.Vector3(0.02 - swayX.current * 0.5, -0.2 + bobY - swayY.current * 0.5, -0.45);
    offset.applyQuaternion(camera.quaternion);
    offset.add(camera.position);

    groupRef.current.position.copy(offset);
    groupRef.current.quaternion.copy(camera.quaternion);
  });

  const spriteScale = SPRITE_INFO[weaponType].scale;

  return (
    <group ref={groupRef}>
      {/* DOOM-style weapon sprite */}
      <sprite renderOrder={999} scale={[spriteScale, spriteScale, 1]}>
        <spriteMaterial
          ref={spriteMatRef}
          map={allTextures[weaponType]?.[0]}
          transparent
          depthTest={false}
          depthWrite={false}
        />
      </sprite>

      {/* Muzzle flash dynamic light */}
      <pointLight
        ref={muzzleLightRef}
        position={[0, 0.1, -0.15]}
        color={config.flashColor}
        intensity={0}
        distance={8}
        decay={2}
      />
    </group>
  );
}
