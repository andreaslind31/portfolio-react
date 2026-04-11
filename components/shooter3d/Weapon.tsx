"use client";

import { useRef, useCallback, useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

export type WeaponType = "blaster" | "shotgun" | "plasma";

export interface WeaponConfig {
  cooldown: number;
  recoil: number;
  color: string;
  flashColor: string;
  damage: number;
  speed: number;
  spread: number; // 0 = perfect accuracy, higher = more spread
  pellets: number; // shots per click
  projectileSize: number;
  projectileLife: number;
}

export const WEAPON_CONFIGS: Record<WeaponType, WeaponConfig> = {
  blaster: {
    cooldown: 0.15,
    recoil: 0.08,
    color: "#00d4ff",
    flashColor: "#00ffff",
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
    color: "#ff8800",
    flashColor: "#ffaa44",
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
    color: "#44ff44",
    flashColor: "#88ff88",
    damage: 60,
    speed: 25,
    spread: 0,
    pellets: 1,
    projectileSize: 2.5,
    projectileLife: 4,
  },
};

interface WeaponProps {
  locked: boolean;
  weaponType: WeaponType;
  ammo: number; // -1 = infinite
  onShoot?: (origin: THREE.Vector3, direction: THREE.Vector3) => void;
}

const BOB_SPEED = 8;
const BOB_AMOUNT = 0.015;
const RECOIL_RECOVERY = 8;

export default function Weapon({ locked, weaponType, ammo, onShoot }: WeaponProps) {
  const groupRef = useRef<THREE.Group>(null);
  const muzzleFlashRef = useRef<THREE.Mesh>(null);
  const muzzleLightRef = useRef<THREE.PointLight>(null);
  const lastShot = useRef(0);
  const recoil = useRef(0);
  const bobPhase = useRef(0);
  const keys = useRef<Set<string>>(new Set());
  const { camera } = useThree();

  const config = WEAPON_CONFIGS[weaponType];

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => keys.current.add(e.code);
    const onKeyUp = (e: KeyboardEvent) => keys.current.delete(e.code);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  const handleClick = useCallback(() => {
    if (!locked) return;
    if (ammo === 0) return; // out of ammo (but -1 = infinite)
    const now = performance.now() / 1000;
    if (now - lastShot.current < config.cooldown) return;
    lastShot.current = now;
    recoil.current = config.recoil;

    if (muzzleFlashRef.current) {
      muzzleFlashRef.current.visible = true;
      muzzleFlashRef.current.scale.setScalar(
        weaponType === "plasma" ? 1.5 : weaponType === "shotgun" ? 1.2 : 0.8 + Math.random() * 0.4
      );
      muzzleFlashRef.current.rotation.z = Math.random() * Math.PI * 2;
      if (muzzleLightRef.current) muzzleLightRef.current.intensity = 15;
      setTimeout(() => {
        if (muzzleFlashRef.current) muzzleFlashRef.current.visible = false;
        if (muzzleLightRef.current) muzzleLightRef.current.intensity = 0;
      }, 50);
    }

    const dir = new THREE.Vector3(0, 0, -1);
    dir.applyQuaternion(camera.quaternion);
    onShoot?.(camera.position.clone(), dir);
  }, [locked, camera, onShoot, config, ammo, weaponType]);

  useEffect(() => {
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [handleClick]);

  // Weapon switch with 1/2/3 keys
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Handled in ShooterGame3D, not here
    };
  }, []);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const moving =
      keys.current.has("KeyW") || keys.current.has("KeyS") ||
      keys.current.has("KeyA") || keys.current.has("KeyD");

    if (moving) {
      bobPhase.current += delta * BOB_SPEED;
    } else {
      bobPhase.current += delta * 2;
    }
    const bobX = moving ? Math.sin(bobPhase.current) * BOB_AMOUNT : 0;
    const bobY = moving ? Math.abs(Math.cos(bobPhase.current)) * BOB_AMOUNT : 0;

    recoil.current = THREE.MathUtils.lerp(recoil.current, 0, delta * RECOIL_RECOVERY);

    const weaponPos = new THREE.Vector3(0.3 + bobX, -0.28 + bobY, -0.5 + recoil.current);
    weaponPos.applyQuaternion(camera.quaternion);
    weaponPos.add(camera.position);

    groupRef.current.position.copy(weaponPos);
    groupRef.current.quaternion.copy(camera.quaternion);
  });

  return (
    <group ref={groupRef}>
      {/* ── BLASTER ── */}
      {weaponType === "blaster" && (
        <>
          <mesh position={[0, 0, -0.15]} castShadow>
            <boxGeometry args={[0.06, 0.06, 0.4]} />
            <meshStandardMaterial color="#2a2a3e" metalness={0.9} roughness={0.1} />
          </mesh>
          <mesh position={[0, -0.02, 0.05]} castShadow>
            <boxGeometry args={[0.08, 0.1, 0.18]} />
            <meshStandardMaterial color="#1a1a2e" metalness={0.85} roughness={0.15} />
          </mesh>
          <mesh position={[0, -0.1, 0.08]} rotation={[0.3, 0, 0]} castShadow>
            <boxGeometry args={[0.05, 0.12, 0.06]} />
            <meshStandardMaterial color="#1a1a2e" metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0, -0.22]}>
            <torusGeometry args={[0.045, 0.01, 8, 12]} />
            <meshStandardMaterial color="#00d4ff" emissive="#00d4ff" emissiveIntensity={2} toneMapped={false} />
          </mesh>
          <mesh position={[0, 0, -0.30]}>
            <torusGeometry args={[0.04, 0.008, 8, 12]} />
            <meshStandardMaterial color="#00d4ff" emissive="#00d4ff" emissiveIntensity={2} toneMapped={false} />
          </mesh>
          <mesh position={[0.04, 0, -0.1]}>
            <boxGeometry args={[0.008, 0.02, 0.3]} />
            <meshStandardMaterial color="#00d4ff" emissive="#00d4ff" emissiveIntensity={3} toneMapped={false} />
          </mesh>
          <mesh position={[-0.04, 0, -0.1]}>
            <boxGeometry args={[0.008, 0.02, 0.3]} />
            <meshStandardMaterial color="#00d4ff" emissive="#00d4ff" emissiveIntensity={3} toneMapped={false} />
          </mesh>
        </>
      )}

      {/* ── SHOTGUN ── */}
      {weaponType === "shotgun" && (
        <>
          {/* Double barrel */}
          <mesh position={[0.02, 0.01, -0.18]} castShadow>
            <cylinderGeometry args={[0.025, 0.025, 0.45, 8]} />
            <meshStandardMaterial color="#3a3a3a" metalness={0.9} roughness={0.1} />
          </mesh>
          <mesh position={[-0.02, 0.01, -0.18]} castShadow>
            <cylinderGeometry args={[0.025, 0.025, 0.45, 8]} />
            <meshStandardMaterial color="#3a3a3a" metalness={0.9} roughness={0.1} />
          </mesh>
          {/* Stock/body */}
          <mesh position={[0, -0.01, 0.05]} castShadow>
            <boxGeometry args={[0.07, 0.08, 0.22]} />
            <meshStandardMaterial color="#4a3020" metalness={0.3} roughness={0.7} />
          </mesh>
          {/* Grip */}
          <mesh position={[0, -0.09, 0.1]} rotation={[0.3, 0, 0]} castShadow>
            <boxGeometry args={[0.05, 0.12, 0.05]} />
            <meshStandardMaterial color="#3a2515" metalness={0.3} roughness={0.7} />
          </mesh>
          {/* Pump */}
          <mesh position={[0, -0.02, -0.08]} castShadow>
            <boxGeometry args={[0.06, 0.05, 0.12]} />
            <meshStandardMaterial color="#ff8800" emissive="#ff8800" emissiveIntensity={0.5} toneMapped={false} />
          </mesh>
          {/* Orange glow strips */}
          <mesh position={[0.04, 0, -0.05]}>
            <boxGeometry args={[0.006, 0.015, 0.2]} />
            <meshStandardMaterial color="#ff8800" emissive="#ff8800" emissiveIntensity={2} toneMapped={false} />
          </mesh>
          <mesh position={[-0.04, 0, -0.05]}>
            <boxGeometry args={[0.006, 0.015, 0.2]} />
            <meshStandardMaterial color="#ff8800" emissive="#ff8800" emissiveIntensity={2} toneMapped={false} />
          </mesh>
        </>
      )}

      {/* ── PLASMA CANNON ── */}
      {weaponType === "plasma" && (
        <>
          {/* Wide barrel */}
          <mesh position={[0, 0, -0.15]} castShadow>
            <cylinderGeometry args={[0.05, 0.04, 0.4, 8]} />
            <meshStandardMaterial color="#2a3a2e" metalness={0.8} roughness={0.2} />
          </mesh>
          {/* Receiver */}
          <mesh position={[0, -0.02, 0.05]} castShadow>
            <boxGeometry args={[0.1, 0.1, 0.2]} />
            <meshStandardMaterial color="#1a2a1e" metalness={0.8} roughness={0.2} />
          </mesh>
          {/* Grip */}
          <mesh position={[0, -0.1, 0.08]} rotation={[0.3, 0, 0]} castShadow>
            <boxGeometry args={[0.05, 0.12, 0.06]} />
            <meshStandardMaterial color="#1a2a1e" metalness={0.7} roughness={0.3} />
          </mesh>
          {/* Energy chamber */}
          <mesh position={[0, 0.03, -0.05]}>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshStandardMaterial color="#44ff44" emissive="#44ff44" emissiveIntensity={4} toneMapped={false} />
          </mesh>
          {/* Green coils */}
          <mesh position={[0, 0, -0.2]}>
            <torusGeometry args={[0.055, 0.012, 8, 12]} />
            <meshStandardMaterial color="#44ff44" emissive="#44ff44" emissiveIntensity={2} toneMapped={false} />
          </mesh>
          <mesh position={[0, 0, -0.3]}>
            <torusGeometry args={[0.05, 0.01, 8, 12]} />
            <meshStandardMaterial color="#44ff44" emissive="#44ff44" emissiveIntensity={2} toneMapped={false} />
          </mesh>
          {/* Side glow strips */}
          <mesh position={[0.05, 0, -0.1]}>
            <boxGeometry args={[0.008, 0.02, 0.3]} />
            <meshStandardMaterial color="#44ff44" emissive="#44ff44" emissiveIntensity={3} toneMapped={false} />
          </mesh>
          <mesh position={[-0.05, 0, -0.1]}>
            <boxGeometry args={[0.008, 0.02, 0.3]} />
            <meshStandardMaterial color="#44ff44" emissive="#44ff44" emissiveIntensity={3} toneMapped={false} />
          </mesh>
        </>
      )}

      {/* Muzzle flash — color matches weapon */}
      <mesh ref={muzzleFlashRef} position={[0, 0, -0.38]} visible={false}>
        <planeGeometry args={[0.15, 0.15]} />
        <meshBasicMaterial
          color={config.flashColor}
          transparent
          opacity={0.9}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      <pointLight
        ref={muzzleLightRef}
        position={[0, 0, -0.4]}
        color={config.color}
        intensity={0}
        distance={5}
        decay={2}
      />
    </group>
  );
}
