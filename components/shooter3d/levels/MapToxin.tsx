"use client";

import { memo } from "react";
import { RigidBody } from "@react-three/rapier";
import {
  ArenaShell, Wall, GlowStrip, CeilingLight, EnergyPillar,
  SpawnPortal, Crate, Ramp, Catwalk,
  useMapTextures, type MapLayout,
  WALL_H, EMISSIVE_BLOOD, EMISSIVE_FIRE, EMISSIVE_LAVA,
} from "./LevelBase";

const HW = 45;
const HD = 50;
const W = HW * 2;
const D = HD * 2;

export const LAYOUT: MapLayout = {
  ARENA_HALF_W: HW,
  ARENA_HALF_D: HD,
  SPAWN_PORTALS: [
    [-30, 0, -35], [30, 0, -35],
    [-30, 0, 35], [30, 0, 35],
    [0, 0, -HD + 3], [0, 0, HD - 3],
  ],
  WALL_COLLIDERS: [
    // Main N-S corridor walls
    [-4, 0, 0.5, HD - 2], [4, 0, 0.5, HD - 2],
    // E-W corridor walls
    [0, -4, HW - 2, 0.5], [0, 4, HW - 2, 0.5],

    // NW room
    [-30, -30, 8, 0.5], [-30, -40, 8, 0.5],
    [-38, -35, 0.5, 5], [-22, -35, 0.5, 5],
    [-28, -34, 1.5, 1.5],
    // NE room
    [30, -30, 8, 0.5], [30, -40, 8, 0.5],
    [38, -35, 0.5, 5], [22, -35, 0.5, 5],
    [28, -36, 1.5, 1.5],
    // SW room
    [-30, 30, 8, 0.5], [-30, 40, 8, 0.5],
    [-38, 35, 0.5, 5], [-22, 35, 0.5, 5],
    // SE room
    [30, 30, 8, 0.5], [30, 40, 8, 0.5],
    [38, 35, 0.5, 5], [22, 35, 0.5, 5],

    // Connecting passages (narrow)
    [-14, -35, 0.5, 5], [-18, -30, 4, 0.5],
    [14, -35, 0.5, 5], [18, -30, 4, 0.5],
    [-14, 35, 0.5, 5], [-18, 30, 4, 0.5],
    [14, 35, 0.5, 5], [18, 30, 4, 0.5],

    // Half-height walls at intersections
    [-3, -10, 2, 0.5], [3, -10, 2, 0.5],
    [-3, 10, 2, 0.5], [3, 10, 2, 0.5],
    [-12, -3, 0.5, 2], [-12, 3, 0.5, 2],
    [12, -3, 0.5, 2], [12, 3, 0.5, 2],

    // Toxic vats
    [-30, -10, 1.8, 1.8], [30, -10, 1.8, 1.8],
    [-30, 10, 1.8, 1.8], [30, 10, 1.8, 1.8],

    // Catwalks
    [0, -25, 2, 6], [0, 25, 2, 6],

    // Corridor cover crates
    [0, -18, 1, 1], [0, 18, 1, 1],
    [-20, 0, 1, 1], [20, 0, 1, 1],
  ],
};

function MapToxinImpl() {
  const { wallTex, floorTex, ceilingTex } = useMapTextures(W, D);

  return (
    <group>
      <ArenaShell halfW={HW} halfD={HD} wallTex={wallTex} floorTex={floorTex} ceilingTex={ceilingTex} />

      {/* ═══ MAIN N-S CORRIDOR ═══ */}
      <Wall position={[-4, WALL_H/2, 0]} size={[0.5, WALL_H, D - 4]} texture={wallTex} />
      <Wall position={[4, WALL_H/2, 0]} size={[0.5, WALL_H, D - 4]} texture={wallTex} />
      <GlowStrip position={[-3.7, 0.15, 0]} scale={[0.08, 0.08, D - 6]} color={EMISSIVE_BLOOD} />
      <GlowStrip position={[3.7, 0.15, 0]} scale={[0.08, 0.08, D - 6]} color={EMISSIVE_BLOOD} />

      {/* ═══ E-W CORRIDOR ═══ */}
      <Wall position={[0, WALL_H/2, -4]} rotation={[0, Math.PI/2, 0]} size={[0.5, WALL_H, W - 4]} texture={wallTex} />
      <Wall position={[0, WALL_H/2, 4]} rotation={[0, Math.PI/2, 0]} size={[0.5, WALL_H, W - 4]} texture={wallTex} />
      <GlowStrip position={[0, 0.15, -3.7]} scale={[W - 6, 0.08, 0.08]} color={EMISSIVE_BLOOD} />
      <GlowStrip position={[0, 0.15, 3.7]} scale={[W - 6, 0.08, 0.08]} color={EMISSIVE_BLOOD} />

      {/* ═══ NW ROOM ═══ */}
      <Wall position={[-30, WALL_H/2, -30]} size={[16, WALL_H, 0.5]} texture={wallTex} />
      <Wall position={[-30, WALL_H/2, -40]} size={[16, WALL_H, 0.5]} texture={wallTex} />
      <Wall position={[-38, WALL_H/2, -35]} size={[0.5, WALL_H, 10]} texture={wallTex} />
      <Wall position={[-22, WALL_H/2, -35]} size={[0.5, WALL_H, 10]} texture={wallTex} />
      <Crate position={[-28, 0.7, -34]} size={[2.5, 1.4, 2.5]} stripeColor={EMISSIVE_BLOOD} />
      <SpawnPortal position={[-30, 0, -35]} color={EMISSIVE_BLOOD} />

      {/* ═══ NE ROOM ═══ */}
      <Wall position={[30, WALL_H/2, -30]} size={[16, WALL_H, 0.5]} texture={wallTex} />
      <Wall position={[30, WALL_H/2, -40]} size={[16, WALL_H, 0.5]} texture={wallTex} />
      <Wall position={[38, WALL_H/2, -35]} size={[0.5, WALL_H, 10]} texture={wallTex} />
      <Wall position={[22, WALL_H/2, -35]} size={[0.5, WALL_H, 10]} texture={wallTex} />
      <Crate position={[28, 0.7, -36]} size={[2.5, 1.4, 2.5]} stripeColor={EMISSIVE_FIRE} />
      <SpawnPortal position={[30, 0, -35]} color={EMISSIVE_FIRE} />

      {/* ═══ SW ROOM ═══ */}
      <Wall position={[-30, WALL_H/2, 30]} size={[16, WALL_H, 0.5]} texture={wallTex} />
      <Wall position={[-30, WALL_H/2, 40]} size={[16, WALL_H, 0.5]} texture={wallTex} />
      <Wall position={[-38, WALL_H/2, 35]} size={[0.5, WALL_H, 10]} texture={wallTex} />
      <Wall position={[-22, WALL_H/2, 35]} size={[0.5, WALL_H, 10]} texture={wallTex} />
      <SpawnPortal position={[-30, 0, 35]} rotation={[0, Math.PI, 0]} color={EMISSIVE_BLOOD} />

      {/* ═══ SE ROOM ═══ */}
      <Wall position={[30, WALL_H/2, 30]} size={[16, WALL_H, 0.5]} texture={wallTex} />
      <Wall position={[30, WALL_H/2, 40]} size={[16, WALL_H, 0.5]} texture={wallTex} />
      <Wall position={[38, WALL_H/2, 35]} size={[0.5, WALL_H, 10]} texture={wallTex} />
      <Wall position={[22, WALL_H/2, 35]} size={[0.5, WALL_H, 10]} texture={wallTex} />
      <SpawnPortal position={[30, 0, 35]} rotation={[0, Math.PI, 0]} color={EMISSIVE_FIRE} />

      {/* ═══ CONNECTING PASSAGES (narrow) ═══ */}
      <Wall position={[-14, WALL_H/2, -35]} size={[0.5, WALL_H, 10]} texture={wallTex} />
      <Wall position={[-18, WALL_H/2, -30]} size={[8, WALL_H, 0.5]} texture={wallTex} />
      <Wall position={[14, WALL_H/2, -35]} size={[0.5, WALL_H, 10]} texture={wallTex} />
      <Wall position={[18, WALL_H/2, -30]} size={[8, WALL_H, 0.5]} texture={wallTex} />
      <Wall position={[-14, WALL_H/2, 35]} size={[0.5, WALL_H, 10]} texture={wallTex} />
      <Wall position={[-18, WALL_H/2, 30]} size={[8, WALL_H, 0.5]} texture={wallTex} />
      <Wall position={[14, WALL_H/2, 35]} size={[0.5, WALL_H, 10]} texture={wallTex} />
      <Wall position={[18, WALL_H/2, 30]} size={[8, WALL_H, 0.5]} texture={wallTex} />

      {/* ═══ HALF-HEIGHT WALLS AT INTERSECTIONS ═══ */}
      {[[-3,-10],[3,-10],[-3,10],[3,10]].map(([x,z],i) => (
        <Wall key={`hhNS-${i}`} position={[x, 1, z]} size={[3, 2, 0.5]} texture={wallTex} />
      ))}
      {[[-12,-3],[-12,3],[12,-3],[12,3]].map(([x,z],i) => (
        <Wall key={`hhEW-${i}`} position={[x, 1, z]} size={[0.5, 2, 3]} texture={wallTex} />
      ))}

      {/* ═══ BLOOD/LAVA VATS (decorative cylinders) ═══ */}
      {[[-30,-10],[30,-10],[-30,10],[30,10]].map(([x,z],i) => {
        const tint = i % 2 === 0 ? EMISSIVE_BLOOD : EMISSIVE_LAVA;
        return (
          <RigidBody key={`vat-${i}`} type="fixed" colliders="cuboid">
            <mesh position={[x, 1, z]}>
              <cylinderGeometry args={[1.5, 1.5, 2, 10]} />
              <meshStandardMaterial color={tint} emissive={tint} emissiveIntensity={0.7} toneMapped={false} transparent opacity={0.75} />
            </mesh>
          </RigidBody>
        );
      })}

      {/* ═══ ELEVATED PIPE CATWALKS ═══ */}
      <Catwalk position={[0, 2, -25]} size={[4, 0.5, 12]} glowColor={EMISSIVE_BLOOD} />
      <Ramp position={[0, 1, -18]} rampRotation={[-0.2, 0, 0]} size={[3, 0.5, 4]} />
      <Catwalk position={[0, 2, 25]} size={[4, 0.5, 12]} glowColor={EMISSIVE_BLOOD} />
      <Ramp position={[0, 1, 32]} rampRotation={[0.2, 0, 0]} size={[3, 0.5, 4]} />

      {/* ═══ CORRIDOR COVER ═══ */}
      <Crate position={[0, 0.7, -18]} size={[2, 1.4, 2]} stripeColor={EMISSIVE_BLOOD} />
      <Crate position={[0, 0.7, 18]} size={[2, 1.4, 2]} stripeColor={EMISSIVE_BLOOD} />
      <Crate position={[-20, 0.7, 0]} size={[2, 1.4, 2]} stripeColor={EMISSIVE_FIRE} />
      <Crate position={[20, 0.7, 0]} size={[2, 1.4, 2]} stripeColor={EMISSIVE_FIRE} />

      {/* Extra spawn portals at corridor ends */}
      <SpawnPortal position={[0, 0, -HD + 3]} color={EMISSIVE_BLOOD} />
      <SpawnPortal position={[0, 0, HD - 3]} rotation={[0, Math.PI, 0]} color={EMISSIVE_BLOOD} />

      {/* ═══ LIGHTING ═══ */}
      <CeilingLight position={[0, WALL_H - 0.1, 0]} color={EMISSIVE_BLOOD} intensity={3} />
      <CeilingLight position={[0, WALL_H - 0.1, -30]} color={EMISSIVE_BLOOD} flicker />
      <CeilingLight position={[0, WALL_H - 0.1, 30]} color={EMISSIVE_BLOOD} />
      <CeilingLight position={[-30, WALL_H - 0.1, 0]} color={EMISSIVE_FIRE} flicker />
      <CeilingLight position={[30, WALL_H - 0.1, 0]} color={EMISSIVE_FIRE} />
    </group>
  );
}

const MapToxin = memo(MapToxinImpl);
export default MapToxin;
