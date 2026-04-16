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

interface WeaponProps {
  locked: boolean;
  weaponType: WeaponType;
  ammo: number; // -1 = infinite
  onShoot?: (origin: THREE.Vector3, direction: THREE.Vector3) => void;
}

const BOB_SPEED = 8;
const BOB_AMOUNT = 0.015;
const RECOIL_RECOVERY = 12;
const CAM_KICK_RECOVERY = 8;
const SWAY_DAMPING = 0.12;

export default function Weapon({ locked, weaponType, ammo, onShoot }: WeaponProps) {
  const groupRef = useRef<THREE.Group>(null);
  const muzzleFlashRef = useRef<THREE.Mesh>(null);
  const muzzleFlashGlowRef = useRef<THREE.Mesh>(null);
  const muzzleLightRef = useRef<THREE.PointLight>(null);
  const lastShot = useRef(0);
  const recoil = useRef(0);
  const cameraKick = useRef(0); // upward camera kick from recoil
  const bobPhase = useRef(0);
  const swayX = useRef(0);
  const swayY = useRef(0);
  const keys = useRef<Set<string>>(new Set());
  const flashTimer = useRef(0);
  const { camera } = useThree();

  const config = WEAPON_CONFIGS[weaponType];

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => keys.current.add(e.code);
    const onKeyUp = (e: KeyboardEvent) => keys.current.delete(e.code);
    // Track mouse for sway
    const onMouseMove = (e: MouseEvent) => {
      swayX.current += e.movementX * 0.0008;
      swayY.current += e.movementY * 0.0008;
      // Clamp
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

    // Apply recoil pullback
    recoil.current = config.recoil;
    // Apply camera kick (weapon-specific)
    const kickAmount = weaponType === "rocket" ? 0.04 : weaponType === "shotgun" ? 0.03 : weaponType === "plasma" ? 0.02 : 0.008;
    cameraKick.current = Math.min(cameraKick.current + kickAmount, 0.08);

    // Show muzzle flash (longer than before)
    if (muzzleFlashRef.current) {
      muzzleFlashRef.current.visible = true;
      muzzleFlashRef.current.scale.setScalar(
        weaponType === "plasma" ? 1.8 : weaponType === "shotgun" ? 1.6 : weaponType === "rocket" ? 2.2 : 0.9 + Math.random() * 0.4
      );
      muzzleFlashRef.current.rotation.z = Math.random() * Math.PI * 2;
    }
    if (muzzleFlashGlowRef.current) {
      muzzleFlashGlowRef.current.visible = true;
      muzzleFlashGlowRef.current.scale.setScalar(
        weaponType === "rocket" ? 3 : weaponType === "shotgun" ? 2.2 : weaponType === "plasma" ? 2.5 : 1.4
      );
    }
    if (muzzleLightRef.current) muzzleLightRef.current.intensity = 20;
    flashTimer.current = weaponType === "rocket" ? 0.12 : weaponType === "shotgun" ? 0.1 : 0.06;

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

    // ── Muzzle flash timer ──
    if (flashTimer.current > 0) {
      flashTimer.current -= delta;
      if (flashTimer.current <= 0) {
        if (muzzleFlashRef.current) muzzleFlashRef.current.visible = false;
        if (muzzleFlashGlowRef.current) muzzleFlashGlowRef.current.visible = false;
        if (muzzleLightRef.current) muzzleLightRef.current.intensity = 0;
      } else {
        // Fade light during flash tail
        if (muzzleLightRef.current) {
          muzzleLightRef.current.intensity = 20 * (flashTimer.current / 0.1);
        }
      }
    }

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

    // Recover recoil (faster pullback response)
    recoil.current = THREE.MathUtils.lerp(recoil.current, 0, delta * RECOIL_RECOVERY);

    // Recover camera kick — apply to camera pitch
    if (cameraKick.current > 0.001) {
      // Apply pitch up
      const kickThisFrame = cameraKick.current * delta * 30;
      camera.rotation.x += kickThisFrame;
      cameraKick.current = THREE.MathUtils.lerp(cameraKick.current, 0, delta * CAM_KICK_RECOVERY);
    } else {
      cameraKick.current = 0;
    }

    // Damp sway toward 0
    swayX.current = THREE.MathUtils.lerp(swayX.current, 0, SWAY_DAMPING);
    swayY.current = THREE.MathUtils.lerp(swayY.current, 0, SWAY_DAMPING);

    // Position weapon — combine sway, bob, recoil, and tilt
    const weaponPos = new THREE.Vector3(
      0.3 + bobX - swayX.current,
      -0.28 + bobY - swayY.current,
      -0.5 + recoil.current
    );
    weaponPos.applyQuaternion(camera.quaternion);
    weaponPos.add(camera.position);

    groupRef.current.position.copy(weaponPos);

    // Weapon rotation — copy camera but add slight tilt from sway + recoil
    const tiltQuat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(
        recoil.current * 1.5, // nose up during recoil
        -swayX.current * 3, // tilt with sway
        swayX.current * 2,
        "YXZ"
      )
    );
    groupRef.current.quaternion.copy(camera.quaternion).multiply(tiltQuat);
  });

  return (
    <group ref={groupRef}>
      {/* ══════════════════════════════════════════════════
          BLASTER — Sci-fi energy pistol
          ══════════════════════════════════════════════════ */}
      {weaponType === "blaster" && (
        <>
          {/* Main barrel — octagonal outer, darker inner bore */}
          <mesh position={[0, 0.005, -0.18]} castShadow>
            <cylinderGeometry args={[0.028, 0.032, 0.38, 8]} />
            <meshStandardMaterial color="#3a3a50" metalness={0.85} roughness={0.15} />
          </mesh>
          <mesh position={[0, 0.005, -0.37]}>
            <cylinderGeometry args={[0.022, 0.022, 0.02, 8]} />
            <meshStandardMaterial color="#111118" metalness={0.9} roughness={0.1} />
          </mesh>
          {/* Barrel shroud / heat guard */}
          <mesh position={[0, 0.005, -0.25]}>
            <boxGeometry args={[0.07, 0.07, 0.16]} />
            <meshStandardMaterial color="#2a2a3e" metalness={0.8} roughness={0.2} />
          </mesh>
          {/* Ventilation slots on shroud */}
          {[-0.08, -0.04, 0, 0.04].map((z, i) => (
            <mesh key={`vent-${i}`} position={[0.036, 0.005, -0.22 + z * 2]}>
              <boxGeometry args={[0.005, 0.04, 0.015]} />
              <meshStandardMaterial color="#111118" metalness={0.5} roughness={0.5} />
            </mesh>
          ))}
          {/* Upper receiver */}
          <mesh position={[0, 0.025, -0.02]} castShadow>
            <boxGeometry args={[0.055, 0.04, 0.2]} />
            <meshStandardMaterial color="#2a2a3e" metalness={0.8} roughness={0.2} />
          </mesh>
          {/* Lower receiver / frame */}
          <mesh position={[0, -0.015, 0.01]} castShadow>
            <boxGeometry args={[0.06, 0.045, 0.22]} />
            <meshStandardMaterial color="#1e1e30" metalness={0.75} roughness={0.25} />
          </mesh>
          {/* Trigger guard */}
          <mesh position={[0, -0.045, 0.02]}>
            <boxGeometry args={[0.04, 0.015, 0.06]} />
            <meshStandardMaterial color="#222238" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[0, -0.04, -0.005]}>
            <boxGeometry args={[0.04, 0.025, 0.008]} />
            <meshStandardMaterial color="#222238" metalness={0.8} roughness={0.2} />
          </mesh>
          {/* Trigger */}
          <mesh position={[0, -0.035, 0.015]} rotation={[0.2, 0, 0]}>
            <boxGeometry args={[0.012, 0.02, 0.006]} />
            <meshStandardMaterial color="#888" metalness={0.9} roughness={0.1} />
          </mesh>
          {/* Grip — angled */}
          <mesh position={[0, -0.08, 0.06]} rotation={[0.35, 0, 0]} castShadow>
            <boxGeometry args={[0.042, 0.1, 0.05]} />
            <meshStandardMaterial color="#1a1a2e" metalness={0.5} roughness={0.5} />
          </mesh>
          {/* Grip texture lines */}
          {[0, 0.015, 0.03, -0.015, -0.03].map((y, i) => (
            <mesh key={`grip-${i}`} position={[0.022, -0.065 + y * 1.5, 0.055 + y * 0.4]} rotation={[0.35, 0, 0]}>
              <boxGeometry args={[0.003, 0.005, 0.05]} />
              <meshStandardMaterial color="#0e0e1e" metalness={0.3} roughness={0.7} />
            </mesh>
          ))}
          {/* Energy coils on barrel */}
          <mesh position={[0, 0.005, -0.28]}>
            <torusGeometry args={[0.038, 0.006, 8, 16]} />
            <meshStandardMaterial color="#00d4ff" emissive="#00d4ff" emissiveIntensity={2.5} toneMapped={false} />
          </mesh>
          <mesh position={[0, 0.005, -0.33]}>
            <torusGeometry args={[0.034, 0.005, 8, 16]} />
            <meshStandardMaterial color="#00d4ff" emissive="#00d4ff" emissiveIntensity={2} toneMapped={false} />
          </mesh>
          {/* Side glow strips */}
          <mesh position={[0.036, 0.005, -0.1]}>
            <boxGeometry args={[0.005, 0.015, 0.25]} />
            <meshStandardMaterial color="#00d4ff" emissive="#00d4ff" emissiveIntensity={3} toneMapped={false} />
          </mesh>
          <mesh position={[-0.036, 0.005, -0.1]}>
            <boxGeometry args={[0.005, 0.015, 0.25]} />
            <meshStandardMaterial color="#00d4ff" emissive="#00d4ff" emissiveIntensity={3} toneMapped={false} />
          </mesh>
          {/* Top rail / sight */}
          <mesh position={[0, 0.05, -0.08]}>
            <boxGeometry args={[0.02, 0.008, 0.15]} />
            <meshStandardMaterial color="#333348" metalness={0.9} roughness={0.1} />
          </mesh>
          {/* Front sight post */}
          <mesh position={[0, 0.055, -0.16]}>
            <boxGeometry args={[0.008, 0.012, 0.008]} />
            <meshStandardMaterial color="#00d4ff" emissive="#00d4ff" emissiveIntensity={1} toneMapped={false} />
          </mesh>
          {/* Magazine */}
          <mesh position={[0, -0.055, 0.04]}>
            <boxGeometry args={[0.035, 0.05, 0.04]} />
            <meshStandardMaterial color="#1a1a2e" metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0, -0.22]}>
            <torusGeometry args={[0.045, 0.01, 8, 12]} />
            <meshStandardMaterial color="#c8a848" emissive="#c8a848" emissiveIntensity={1} toneMapped={false} />
          </mesh>
          <mesh position={[0, 0, -0.30]}>
            <torusGeometry args={[0.04, 0.008, 8, 12]} />
            <meshStandardMaterial color="#c8a848" emissive="#c8a848" emissiveIntensity={1} toneMapped={false} />
          </mesh>
          <mesh position={[0.04, 0, -0.1]}>
            <boxGeometry args={[0.008, 0.02, 0.3]} />
            <meshStandardMaterial color="#c8a848" emissive="#c8a848" emissiveIntensity={1.5} toneMapped={false} />
          </mesh>
          <mesh position={[-0.04, 0, -0.1]}>
            <boxGeometry args={[0.008, 0.02, 0.3]} />
            <meshStandardMaterial color="#c8a848" emissive="#c8a848" emissiveIntensity={1.5} toneMapped={false} />
          </mesh>
        </>
      )}

      {/* ══════════════════════════════════════════════════
          SHOTGUN — Pump-action tactical shotgun
          ══════════════════════════════════════════════════ */}
      {weaponType === "shotgun" && (
        <>
          {/* Main barrel — over-under style */}
          <mesh position={[0, 0.02, -0.2]} castShadow>
            <cylinderGeometry args={[0.022, 0.022, 0.5, 10]} />
            <meshStandardMaterial color="#444444" metalness={0.9} roughness={0.1} />
          </mesh>
          {/* Under barrel / tube magazine */}
          <mesh position={[0, -0.005, -0.18]} castShadow>
            <cylinderGeometry args={[0.018, 0.018, 0.42, 10]} />
            <meshStandardMaterial color="#3a3a3a" metalness={0.85} roughness={0.15} />
          </mesh>
          {/* Barrel tip / choke */}
          <mesh position={[0, 0.02, -0.46]}>
            <cylinderGeometry args={[0.024, 0.022, 0.03, 10]} />
            <meshStandardMaterial color="#333333" metalness={0.9} roughness={0.1} />
          </mesh>
          {/* Muzzle bore (dark inside) */}
          <mesh position={[0, 0.02, -0.475]}>
            <cylinderGeometry args={[0.018, 0.018, 0.01, 10]} />
            <meshStandardMaterial color="#0a0a0a" metalness={0.5} roughness={0.5} />
          </mesh>
          {/* Pump */}
          <mesh position={[0, -0.02, -0.08]} castShadow>
            <boxGeometry args={[0.06, 0.05, 0.12]} />
            <meshStandardMaterial color="#cc8844" emissive="#cc8844" emissiveIntensity={0.25} toneMapped={false} />
          </mesh>
          {/* Orange glow strips */}
          <mesh position={[0.04, 0, -0.05]}>
            <boxGeometry args={[0.006, 0.015, 0.2]} />
            <meshStandardMaterial color="#cc8844" emissive="#cc8844" emissiveIntensity={1} toneMapped={false} />
          </mesh>
          <mesh position={[-0.04, 0, -0.05]}>
            <boxGeometry args={[0.006, 0.015, 0.2]} />
            <meshStandardMaterial color="#cc8844" emissive="#cc8844" emissiveIntensity={1} toneMapped={false} />
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
            <meshStandardMaterial color="#33aa33" emissive="#33aa33" emissiveIntensity={2} toneMapped={false} />
          </mesh>
          {/* Green coils */}
          <mesh position={[0, 0, -0.2]}>
            <torusGeometry args={[0.055, 0.012, 8, 12]} />
            <meshStandardMaterial color="#33aa33" emissive="#33aa33" emissiveIntensity={1} toneMapped={false} />
          </mesh>
          <mesh position={[0, 0, -0.3]}>
            <torusGeometry args={[0.05, 0.01, 8, 12]} />
            <meshStandardMaterial color="#33aa33" emissive="#33aa33" emissiveIntensity={1} toneMapped={false} />
          </mesh>
          {/* Side glow strips */}
          <mesh position={[0.05, 0, -0.1]}>
            <boxGeometry args={[0.008, 0.02, 0.3]} />
            <meshStandardMaterial color="#33aa33" emissive="#33aa33" emissiveIntensity={1.5} toneMapped={false} />
          </mesh>
          <mesh position={[-0.05, 0, -0.1]}>
            <boxGeometry args={[0.008, 0.02, 0.3]} />
            <meshStandardMaterial color="#33aa33" emissive="#33aa33" emissiveIntensity={1.5} toneMapped={false} />
          </mesh>
        </>
      )}

      {/* ── ROCKET LAUNCHER ── */}
      {weaponType === "rocket" && (
        <>
          {/* Wide tube barrel */}
          <mesh position={[0, 0, -0.12]} castShadow>
            <cylinderGeometry args={[0.045, 0.045, 0.5, 10]} />
            <meshStandardMaterial color="#4a3030" metalness={0.8} roughness={0.2} />
          </mesh>
          {/* Inner bore (darker) */}
          <mesh position={[0, 0, -0.38]}>
            <cylinderGeometry args={[0.035, 0.035, 0.02, 10]} />
            <meshStandardMaterial color="#1a0a0a" metalness={0.5} roughness={0.5} />
          </mesh>
          {/* Receiver body */}
          <mesh position={[0, 0.005, 0.02]} castShadow>
            <boxGeometry args={[0.065, 0.06, 0.2]} />
            <meshStandardMaterial color="#555555" metalness={0.8} roughness={0.2} />
          </mesh>
          {/* Ejection port */}
          <mesh position={[0.033, 0.015, 0.0]}>
            <boxGeometry args={[0.003, 0.025, 0.04]} />
            <meshStandardMaterial color="#222222" metalness={0.5} roughness={0.5} />
          </mesh>
          {/* Pump / forend */}
          <mesh position={[0, 0.005, -0.08]} castShadow>
            <boxGeometry args={[0.055, 0.05, 0.12]} />
            <meshStandardMaterial color="#5a3a20" metalness={0.2} roughness={0.8} />
          </mesh>
          {/* Pump grip ridges */}
          {[-0.04, -0.02, 0, 0.02, 0.04].map((z, i) => (
            <mesh key={`pump-${i}`} position={[0, 0.005, -0.08 + z]}>
              <boxGeometry args={[0.058, 0.052, 0.006]} />
              <meshStandardMaterial color="#4a2a15" metalness={0.15} roughness={0.85} />
            </mesh>
          ))}
          {/* Trigger guard */}
          <mesh position={[0, -0.03, 0.04]}>
            <boxGeometry args={[0.035, 0.012, 0.05]} />
            <meshStandardMaterial color="#444444" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[0, -0.028, 0.015]}>
            <boxGeometry args={[0.035, 0.02, 0.008]} />
            <meshStandardMaterial color="#444444" metalness={0.8} roughness={0.2} />
          </mesh>
          {/* Trigger */}
          <mesh position={[0, -0.022, 0.035]} rotation={[0.15, 0, 0]}>
            <boxGeometry args={[0.01, 0.018, 0.005]} />
            <meshStandardMaterial color="#888" metalness={0.9} roughness={0.1} />
          </mesh>
          {/* Pistol grip */}
          <mesh position={[0, -0.06, 0.08]} rotation={[0.4, 0, 0]} castShadow>
            <boxGeometry args={[0.04, 0.09, 0.045]} />
            <meshStandardMaterial color="#3a2010" metalness={0.15} roughness={0.85} />
          </mesh>
          {/* Stock — folded tactical */}
          <mesh position={[0, 0.01, 0.14]} castShadow>
            <boxGeometry args={[0.04, 0.04, 0.08]} />
            <meshStandardMaterial color="#444444" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.005, 0.2]} castShadow>
            <boxGeometry args={[0.035, 0.05, 0.06]} />
            <meshStandardMaterial color="#555555" metalness={0.7} roughness={0.3} />
          </mesh>
          {/* Orange energy strips */}
          <mesh position={[0.034, 0.005, -0.04]}>
            <boxGeometry args={[0.004, 0.012, 0.18]} />
            <meshStandardMaterial color="#ff8800" emissive="#ff8800" emissiveIntensity={1.5} toneMapped={false} />
          </mesh>
          <mesh position={[-0.034, 0.005, -0.04]}>
            <boxGeometry args={[0.004, 0.012, 0.18]} />
            <meshStandardMaterial color="#ff8800" emissive="#ff8800" emissiveIntensity={1.5} toneMapped={false} />
          </mesh>
          {/* Shell carrier — visible shells */}
          {[0, 1].map((i) => (
            <mesh key={`shell-${i}`} position={[0.035, -0.025, 0.04 + i * 0.025]}>
              <cylinderGeometry args={[0.008, 0.008, 0.025, 6]} />
              <meshStandardMaterial color="#cc8833" metalness={0.7} roughness={0.3} />
            </mesh>
          ))}
        </>
      )}

      {/* ══════════════════════════════════════════════════
          PLASMA CANNON — Heavy energy weapon
          ══════════════════════════════════════════════════ */}
      {weaponType === "plasma" && (
        <>
          {/* Wide barrel assembly */}
          <mesh position={[0, 0, -0.15]} castShadow>
            <cylinderGeometry args={[0.04, 0.035, 0.35, 10]} />
            <meshStandardMaterial color="#2a3a2e" metalness={0.75} roughness={0.25} />
          </mesh>
          {/* Barrel bore */}
          <mesh position={[0, 0, -0.33]}>
            <cylinderGeometry args={[0.03, 0.03, 0.02, 10]} />
            <meshStandardMaterial color="#0a1a0e" metalness={0.5} roughness={0.5} />
          </mesh>
          {/* Barrel flare / muzzle brake */}
          <mesh position={[0, 0, -0.32]}>
            <cylinderGeometry args={[0.05, 0.04, 0.04, 10]} />
            <meshStandardMaterial color="#1e2e22" metalness={0.8} roughness={0.2} />
          </mesh>
          {/* Cooling fins */}
          {[0, 1, 2, 3].map((i) => (
            <mesh key={`fin-${i}`} position={[0, 0, -0.12 - i * 0.05]}>
              <cylinderGeometry args={[0.05, 0.05, 0.008, 10]} />
              <meshStandardMaterial color="#223328" metalness={0.7} roughness={0.3} />
            </mesh>
          ))}
          {/* Upper receiver with vents */}
          <mesh position={[0, 0.02, 0.02]} castShadow>
            <boxGeometry args={[0.08, 0.05, 0.2]} />
            <meshStandardMaterial color="#1e2e22" metalness={0.7} roughness={0.3} />
          </mesh>
          {/* Side vents */}
          {[0, 1, 2].map((i) => (
            <group key={`svent-${i}`}>
              <mesh position={[0.042, 0.02, -0.02 + i * 0.03]}>
                <boxGeometry args={[0.004, 0.03, 0.012]} />
                <meshStandardMaterial color="#44ff44" emissive="#44ff44" emissiveIntensity={1} toneMapped={false} />
              </mesh>
              <mesh position={[-0.042, 0.02, -0.02 + i * 0.03]}>
                <boxGeometry args={[0.004, 0.03, 0.012]} />
                <meshStandardMaterial color="#44ff44" emissive="#44ff44" emissiveIntensity={1} toneMapped={false} />
              </mesh>
            </group>
          ))}
          {/* Lower frame */}
          <mesh position={[0, -0.015, 0.03]} castShadow>
            <boxGeometry args={[0.07, 0.035, 0.18]} />
            <meshStandardMaterial color="#1a2a1e" metalness={0.7} roughness={0.3} />
          </mesh>
          {/* Energy cell / chamber — glowing sphere */}
          <mesh position={[0, 0.03, 0.0]}>
            <sphereGeometry args={[0.025, 10, 10]} />
            <meshStandardMaterial color="#44ff44" emissive="#44ff44" emissiveIntensity={4} toneMapped={false} transparent opacity={0.9} />
          </mesh>
          {/* Energy conduits along barrel */}
          <mesh position={[0.035, 0, -0.1]}>
            <cylinderGeometry args={[0.006, 0.006, 0.2, 6]} />
            <meshStandardMaterial color="#44ff44" emissive="#44ff44" emissiveIntensity={1.5} toneMapped={false} />
          </mesh>
          <mesh position={[-0.035, 0, -0.1]}>
            <cylinderGeometry args={[0.006, 0.006, 0.2, 6]} />
            <meshStandardMaterial color="#44ff44" emissive="#44ff44" emissiveIntensity={1.5} toneMapped={false} />
          </mesh>
          {/* Coils */}
          <mesh position={[0, 0, -0.2]}>
            <torusGeometry args={[0.048, 0.008, 8, 16]} />
            <meshStandardMaterial color="#44ff44" emissive="#44ff44" emissiveIntensity={2} toneMapped={false} />
          </mesh>
          <mesh position={[0, 0, -0.28]}>
            <torusGeometry args={[0.044, 0.007, 8, 16]} />
            <meshStandardMaterial color="#44ff44" emissive="#44ff44" emissiveIntensity={2} toneMapped={false} />
          </mesh>
          {/* Trigger guard + trigger */}
          <mesh position={[0, -0.035, 0.04]}>
            <boxGeometry args={[0.035, 0.012, 0.04]} />
            <meshStandardMaterial color="#1a2a1e" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[0, -0.03, 0.03]} rotation={[0.15, 0, 0]}>
            <boxGeometry args={[0.01, 0.018, 0.005]} />
            <meshStandardMaterial color="#888" metalness={0.9} roughness={0.1} />
          </mesh>
          {/* Grip */}
          <mesh position={[0, -0.07, 0.07]} rotation={[0.3, 0, 0]} castShadow>
            <boxGeometry args={[0.042, 0.09, 0.048]} />
            <meshStandardMaterial color="#1a2a1e" metalness={0.4} roughness={0.6} />
          </mesh>
          {/* Rear stock / shoulder pad */}
          <mesh position={[0, 0, 0.15]} castShadow>
            <boxGeometry args={[0.06, 0.06, 0.06]} />
            <meshStandardMaterial color="#1e2e22" metalness={0.6} roughness={0.4} />
          </mesh>
          {/* Red warning stripes */}
          <mesh position={[0, 0.05, -0.05]}>
            <boxGeometry args={[0.1, 0.008, 0.15]} />
            <meshStandardMaterial color="#cc4400" emissive="#cc4400" emissiveIntensity={0.75} toneMapped={false} />
          </mesh>
          <mesh position={[0, -0.05, -0.05]}>
            <boxGeometry args={[0.1, 0.008, 0.15]} />
            <meshStandardMaterial color="#cc4400" emissive="#cc4400" emissiveIntensity={0.75} toneMapped={false} />
          </mesh>
          {/* Side glow strips */}
          <mesh position={[0.05, 0, -0.1]}>
            <boxGeometry args={[0.006, 0.015, 0.3]} />
            <meshStandardMaterial color="#cc4400" emissive="#cc4400" emissiveIntensity={1} toneMapped={false} />
          </mesh>
          <mesh position={[-0.05, 0, -0.1]}>
            <boxGeometry args={[0.006, 0.015, 0.3]} />
            <meshStandardMaterial color="#cc4400" emissive="#cc4400" emissiveIntensity={1} toneMapped={false} />
          </mesh>
          {/* Sight on top */}
          <mesh position={[0, 0.06, -0.15]}>
            <boxGeometry args={[0.02, 0.03, 0.08]} />
            <meshStandardMaterial color="#4a3030" metalness={0.9} roughness={0.1} />
          </mesh>
        </>
      )}

      {/* ══════════════════════════════════════════════════
          ROCKET LAUNCHER — Tube launcher
          ══════════════════════════════════════════════════ */}
      {weaponType === "rocket" && (
        <>
          {/* Main tube — large diameter */}
          <mesh position={[0, 0, -0.1]} castShadow>
            <cylinderGeometry args={[0.05, 0.05, 0.55, 12]} />
            <meshStandardMaterial color="#4a3530" metalness={0.7} roughness={0.3} />
          </mesh>
          {/* Inner bore (front) */}
          <mesh position={[0, 0, -0.38]}>
            <cylinderGeometry args={[0.04, 0.04, 0.02, 12]} />
            <meshStandardMaterial color="#1a0a0a" metalness={0.5} roughness={0.5} />
          </mesh>
          {/* Inner bore (rear exhaust) */}
          <mesh position={[0, 0, 0.16]}>
            <cylinderGeometry args={[0.04, 0.045, 0.02, 12]} />
            <meshStandardMaterial color="#1a0a0a" metalness={0.5} roughness={0.5} />
          </mesh>
          {/* Front flare / blast shield */}
          <mesh position={[0, 0, -0.36]}>
            <cylinderGeometry args={[0.058, 0.05, 0.04, 12]} />
            <meshStandardMaterial color="#3a2520" metalness={0.75} roughness={0.25} />
          </mesh>
          {/* Rear flare / exhaust bell */}
          <mesh position={[0, 0, 0.15]}>
            <cylinderGeometry args={[0.05, 0.06, 0.04, 12]} />
            <meshStandardMaterial color="#3a2520" metalness={0.75} roughness={0.25} />
          </mesh>
          {/* Handle / grip assembly (under tube) */}
          <mesh position={[0, -0.055, 0.02]} castShadow>
            <boxGeometry args={[0.06, 0.04, 0.14]} />
            <meshStandardMaterial color="#3a2520" metalness={0.7} roughness={0.3} />
          </mesh>
          {/* Pistol grip */}
          <mesh position={[0, -0.1, 0.06]} rotation={[0.35, 0, 0]} castShadow>
            <boxGeometry args={[0.04, 0.09, 0.04]} />
            <meshStandardMaterial color="#2a1510" metalness={0.3} roughness={0.7} />
          </mesh>
          {/* Grip ridges */}
          {[0, 1, 2, 3].map((i) => (
            <mesh key={`rgrip-${i}`} position={[0.021, -0.08 + i * 0.015, 0.06 + i * 0.005]} rotation={[0.35, 0, 0]}>
              <boxGeometry args={[0.003, 0.005, 0.04]} />
              <meshStandardMaterial color="#1a0a05" metalness={0.2} roughness={0.8} />
            </mesh>
          ))}
          {/* Trigger */}
          <mesh position={[0, -0.068, 0.02]} rotation={[0.15, 0, 0]}>
            <boxGeometry args={[0.012, 0.02, 0.005]} />
            <meshStandardMaterial color="#888" metalness={0.9} roughness={0.1} />
          </mesh>
          {/* Front grip / hand guard */}
          <mesh position={[0, -0.055, -0.1]} castShadow>
            <boxGeometry args={[0.05, 0.035, 0.08]} />
            <meshStandardMaterial color="#2a1510" metalness={0.3} roughness={0.7} />
          </mesh>
          {/* Optic sight */}
          <mesh position={[0, 0.06, -0.05]}>
            <boxGeometry args={[0.03, 0.025, 0.08]} />
            <meshStandardMaterial color="#333" metalness={0.8} roughness={0.2} />
          </mesh>
          {/* Sight lens */}
          <mesh position={[0, 0.06, -0.09]}>
            <cylinderGeometry args={[0.01, 0.01, 0.003, 8]} />
            <meshStandardMaterial color="#ff4444" emissive="#ff4444" emissiveIntensity={2} toneMapped={false} />
          </mesh>
          {/* Warning stripes — hazard markings */}
          <mesh position={[0, 0.052, -0.2]}>
            <boxGeometry args={[0.1, 0.006, 0.04]} />
            <meshStandardMaterial color="#ff4444" emissive="#ff4444" emissiveIntensity={1.2} toneMapped={false} />
          </mesh>
          <mesh position={[0, 0.052, 0.05]}>
            <boxGeometry args={[0.1, 0.006, 0.04]} />
            <meshStandardMaterial color="#ff4444" emissive="#ff4444" emissiveIntensity={1.2} toneMapped={false} />
          </mesh>
          <mesh position={[0, -0.052, -0.15]}>
            <boxGeometry args={[0.1, 0.006, 0.04]} />
            <meshStandardMaterial color="#ffaa00" emissive="#ffaa00" emissiveIntensity={0.8} toneMapped={false} />
          </mesh>
          {/* Side glow strips */}
          <mesh position={[0.052, 0, -0.05]}>
            <boxGeometry args={[0.005, 0.012, 0.35]} />
            <meshStandardMaterial color="#ff4444" emissive="#ff4444" emissiveIntensity={1.5} toneMapped={false} />
          </mesh>
          <mesh position={[-0.052, 0, -0.05]}>
            <boxGeometry args={[0.005, 0.012, 0.35]} />
            <meshStandardMaterial color="#ff4444" emissive="#ff4444" emissiveIntensity={1.5} toneMapped={false} />
          </mesh>
          {/* Shoulder rest */}
          <mesh position={[0, -0.02, 0.2]} castShadow>
            <boxGeometry args={[0.06, 0.07, 0.05]} />
            <meshStandardMaterial color="#4a3530" metalness={0.6} roughness={0.4} />
          </mesh>
          {/* Rubber pad on shoulder rest */}
          <mesh position={[0, -0.02, 0.226]}>
            <boxGeometry args={[0.055, 0.065, 0.008]} />
            <meshStandardMaterial color="#1a1a1a" metalness={0.1} roughness={0.9} />
          </mesh>
        </>
      )}

      {/* Muzzle flash — main bright core */}
      <mesh ref={muzzleFlashRef} position={[0, weaponType === "shotgun" ? 0.02 : 0, weaponType === "shotgun" ? -0.48 : -0.38]} visible={false}>
        <planeGeometry args={[weaponType === "shotgun" ? 0.2 : weaponType === "rocket" ? 0.25 : 0.15, weaponType === "shotgun" ? 0.2 : weaponType === "rocket" ? 0.25 : 0.15]} />
        <meshBasicMaterial
          color={config.flashColor}
          transparent
          opacity={1}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Outer glow halo — larger, translucent */}
      <mesh ref={muzzleFlashGlowRef} position={[0, weaponType === "shotgun" ? 0.02 : 0, weaponType === "shotgun" ? -0.5 : -0.4]} visible={false}>
        <planeGeometry args={[0.4, 0.4]} />
        <meshBasicMaterial
          color={config.color}
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <pointLight
        ref={muzzleLightRef}
        position={[0, 0, -0.4]}
        color={config.color}
        intensity={0}
        distance={8}
        decay={2}
      />
    </group>
  );
}
