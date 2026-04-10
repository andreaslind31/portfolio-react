"use client";

import { useRef, useCallback, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

interface WeaponProps {
  locked: boolean;
  onShoot?: (origin: THREE.Vector3, direction: THREE.Vector3) => void;
}

const SHOOT_COOLDOWN = 0.15; // seconds between shots
const BOB_SPEED = 8;
const BOB_AMOUNT = 0.015;
const RECOIL_AMOUNT = 0.08;
const RECOIL_RECOVERY = 8;

export default function Weapon({ locked, onShoot }: WeaponProps) {
  const groupRef = useRef<THREE.Group>(null);
  const muzzleFlashRef = useRef<THREE.Mesh>(null);
  const lastShot = useRef(0);
  const recoil = useRef(0);
  const bobPhase = useRef(0);
  const isMoving = useRef(false);
  const keys = useRef<Set<string>>(new Set());
  const { camera } = useThree();

  // Track movement keys for weapon bob
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

  // Shoot handler
  const handleClick = useCallback(() => {
    if (!locked) return;
    const now = performance.now() / 1000;
    if (now - lastShot.current < SHOOT_COOLDOWN) return;
    lastShot.current = now;
    recoil.current = RECOIL_AMOUNT;

    // Show muzzle flash
    if (muzzleFlashRef.current) {
      muzzleFlashRef.current.visible = true;
      muzzleFlashRef.current.scale.setScalar(0.8 + Math.random() * 0.4);
      muzzleFlashRef.current.rotation.z = Math.random() * Math.PI * 2;
      setTimeout(() => {
        if (muzzleFlashRef.current) muzzleFlashRef.current.visible = false;
      }, 50);
    }

    // Fire ray from camera center
    const dir = new THREE.Vector3(0, 0, -1);
    dir.applyQuaternion(camera.quaternion);
    onShoot?.(camera.position.clone(), dir);
  }, [locked, camera, onShoot]);

  useEffect(() => {
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [handleClick]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    // Check if player is moving
    const moving =
      keys.current.has("KeyW") ||
      keys.current.has("KeyS") ||
      keys.current.has("KeyA") ||
      keys.current.has("KeyD");

    // Weapon bob
    if (moving) {
      bobPhase.current += delta * BOB_SPEED;
    } else {
      // Ease back to center
      bobPhase.current += delta * 2;
    }
    const bobX = moving ? Math.sin(bobPhase.current) * BOB_AMOUNT : 0;
    const bobY = moving
      ? Math.abs(Math.cos(bobPhase.current)) * BOB_AMOUNT
      : 0;

    // Recover recoil
    recoil.current = THREE.MathUtils.lerp(
      recoil.current,
      0,
      delta * RECOIL_RECOVERY
    );

    // Position weapon relative to camera
    const weaponPos = new THREE.Vector3(0.3 + bobX, -0.28 + bobY, -0.5 + recoil.current);
    weaponPos.applyQuaternion(camera.quaternion);
    weaponPos.add(camera.position);

    groupRef.current.position.copy(weaponPos);
    groupRef.current.quaternion.copy(camera.quaternion);
  });

  return (
    <group ref={groupRef}>
      {/* Gun body — main barrel */}
      <mesh position={[0, 0, -0.15]} castShadow>
        <boxGeometry args={[0.06, 0.06, 0.4]} />
        <meshStandardMaterial
          color="#2a2a3e"
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>

      {/* Gun body — receiver */}
      <mesh position={[0, -0.02, 0.05]} castShadow>
        <boxGeometry args={[0.08, 0.1, 0.18]} />
        <meshStandardMaterial
          color="#1a1a2e"
          metalness={0.85}
          roughness={0.15}
        />
      </mesh>

      {/* Grip */}
      <mesh position={[0, -0.1, 0.08]} rotation={[0.3, 0, 0]} castShadow>
        <boxGeometry args={[0.05, 0.12, 0.06]} />
        <meshStandardMaterial
          color="#1a1a2e"
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>

      {/* Energy coil on barrel */}
      <mesh position={[0, 0, -0.22]}>
        <torusGeometry args={[0.045, 0.01, 8, 12]} />
        <meshStandardMaterial
          color="#00d4ff"
          emissive="#00d4ff"
          emissiveIntensity={2}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, 0, -0.30]}>
        <torusGeometry args={[0.04, 0.008, 8, 12]} />
        <meshStandardMaterial
          color="#00d4ff"
          emissive="#00d4ff"
          emissiveIntensity={2}
          toneMapped={false}
        />
      </mesh>

      {/* Side glow strips */}
      <mesh position={[0.04, 0, -0.1]}>
        <boxGeometry args={[0.008, 0.02, 0.3]} />
        <meshStandardMaterial
          color="#00d4ff"
          emissive="#00d4ff"
          emissiveIntensity={3}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[-0.04, 0, -0.1]}>
        <boxGeometry args={[0.008, 0.02, 0.3]} />
        <meshStandardMaterial
          color="#00d4ff"
          emissive="#00d4ff"
          emissiveIntensity={3}
          toneMapped={false}
        />
      </mesh>

      {/* Muzzle flash */}
      <mesh ref={muzzleFlashRef} position={[0, 0, -0.38]} visible={false}>
        <planeGeometry args={[0.15, 0.15]} />
        <meshBasicMaterial
          color="#00ffff"
          transparent
          opacity={0.9}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Muzzle point light (brief flash handled by visibility toggle) */}
      <pointLight
        position={[0, 0, -0.4]}
        color="#00d4ff"
        intensity={0}
        distance={3}
      />
    </group>
  );
}
