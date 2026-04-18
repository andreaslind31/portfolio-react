"use client";

import { memo } from "react";
import {
  ArenaShell, Wall, GlowStrip, CeilingLight, EnergyPillar,
  SpawnPortal, Crate, Ramp, SolidPlatform, Catwalk,
  useMapTextures, type MapLayout,
  WALL_H, EMISSIVE_FIRE, EMISSIVE_LAVA, EMISSIVE_BLOOD, EMISSIVE_RUST,
} from "./LevelBase";

const HW = 45;
const HD = 50;
const W = HW * 2;
const D = HD * 2;

export const LAYOUT: MapLayout = {
  ARENA_HALF_W: HW,
  ARENA_HALF_D: HD,
  SPAWN_PORTALS: [
    [0, 0, -HD + 3],
    [0, 0, HD - 3],
    [HW - 3, 0, 0],
    [-HW + 3, 0, 0],
    [30, 0, 10],
  ],
  WALL_COLLIDERS: [
    // North wide corridor
    [-6, -22, 0.5, 14], [6, -22, 0.5, 14],
    // Smelting room
    [-18, -42, 0.5, 6], [18, -42, 0.5, 6],
    [-12, -36, 6, 0.5], [12, -36, 6, 0.5],
    // Smelting pillars
    [-10, -40, 0.8, 0.8], [10, -40, 0.8, 0.8],
    [-10, -44, 0.8, 0.8], [10, -44, 0.8, 0.8],

    // South wide corridor
    [-6, 22, 0.5, 14], [6, 22, 0.5, 14],
    // Cooling chamber
    [-18, 42, 0.5, 6], [18, 42, 0.5, 6],
    [-12, 36, 6, 0.5], [12, 36, 6, 0.5],
    // Half-walls inside cooling chamber
    [-8, 40, 3, 0.5], [8, 40, 3, 0.5],
    [-8, 44, 3, 0.5], [8, 44, 3, 0.5],
    [0, 42, 0.5, 2],

    // East: Furnace chamber
    [30, -12, 0.5, 12], [30, 12, 0.5, 12],
    [16, -8, 0.5, 8], [16, 8, 0.5, 8],
    // East catwalks (enemy can't path through)
    [34, 0, 2, 10], [20, 0, 2, 10],
    // Bridge
    [27, 0, 5, 1.5],

    // West: Cooling tunnels (narrow winding)
    [-16, -5, 0.5, 5], [-16, 5, 0.5, 5],
    [-24, -8, 4, 0.5], [-24, 8, 4, 0.5],
    [-28, -5, 0.5, 3], [-28, 5, 0.5, 3],
    [-36, -8, 4, 0.5], [-36, 8, 4, 0.5],
    // Pump room
    [-40, -8, 0.5, 4], [-40, 8, 0.5, 4],
    [-34, -6, 0.5, 2], [-34, 6, 0.5, 2],
    // Pump room crates
    [-38, 0, 1.5, 1.5],
  ],
};

function MapFurnaceImpl() {
  const { wallTex, floorTex, ceilingTex } = useMapTextures(W, D);

  return (
    <group>
      <ArenaShell halfW={HW} halfD={HD} wallTex={wallTex} floorTex={floorTex} ceilingTex={ceilingTex} />

      {/* ═══ CENTRAL FOUNDRY (open, no platform) ═══ */}
      {/* Lava pillars around the open center */}
      {[[-12,-12],[12,-12],[-12,12],[12,12],[0,-15],[0,15]].map(([x,z],i) => (
        <EnergyPillar key={`fp-${i}`} position={[x, 0, z]} color={EMISSIVE_LAVA} />
      ))}
      {/* Floor glow accent */}
      <GlowStrip position={[0, 0.02, 0]} scale={[20, 0.02, 20]} color={EMISSIVE_LAVA} intensity={0.2} />

      {/* ═══ NORTH WIDE CORRIDOR → SMELTING ROOM ═══ */}
      <Wall position={[-6, WALL_H/2, -22]} size={[0.5, WALL_H, 28]} texture={wallTex} />
      <Wall position={[6, WALL_H/2, -22]} size={[0.5, WALL_H, 28]} texture={wallTex} />
      <GlowStrip position={[-5.7, 0.15, -22]} scale={[0.08, 0.08, 28]} color={EMISSIVE_LAVA} />
      <GlowStrip position={[5.7, 0.15, -22]} scale={[0.08, 0.08, 28]} color={EMISSIVE_LAVA} />
      {/* Smelting room */}
      <Wall position={[-18, WALL_H/2, -42]} size={[0.5, WALL_H, 12]} texture={wallTex} />
      <Wall position={[18, WALL_H/2, -42]} size={[0.5, WALL_H, 12]} texture={wallTex} />
      <Wall position={[-12, WALL_H/2, -36]} size={[12, WALL_H, 0.5]} texture={wallTex} />
      <Wall position={[12, WALL_H/2, -36]} size={[12, WALL_H, 0.5]} texture={wallTex} />
      <EnergyPillar position={[-10, 0, -40]} color={EMISSIVE_LAVA} />
      <EnergyPillar position={[10, 0, -40]} color={EMISSIVE_LAVA} />
      <EnergyPillar position={[-10, 0, -44]} color={EMISSIVE_FIRE} />
      <EnergyPillar position={[10, 0, -44]} color={EMISSIVE_FIRE} />
      <SpawnPortal position={[0, 0, -HD + 3]} color={EMISSIVE_LAVA} />

      {/* ═══ SOUTH WIDE CORRIDOR → COOLING CHAMBER ═══ */}
      <Wall position={[-6, WALL_H/2, 22]} size={[0.5, WALL_H, 28]} texture={wallTex} />
      <Wall position={[6, WALL_H/2, 22]} size={[0.5, WALL_H, 28]} texture={wallTex} />
      <GlowStrip position={[-5.7, 0.15, 22]} scale={[0.08, 0.08, 28]} color={EMISSIVE_FIRE} />
      <GlowStrip position={[5.7, 0.15, 22]} scale={[0.08, 0.08, 28]} color={EMISSIVE_FIRE} />
      <Wall position={[-18, WALL_H/2, 42]} size={[0.5, WALL_H, 12]} texture={wallTex} />
      <Wall position={[18, WALL_H/2, 42]} size={[0.5, WALL_H, 12]} texture={wallTex} />
      <Wall position={[-12, WALL_H/2, 36]} size={[12, WALL_H, 0.5]} texture={wallTex} />
      <Wall position={[12, WALL_H/2, 36]} size={[12, WALL_H, 0.5]} texture={wallTex} />
      {/* Cooling half-walls (creates narrow passages) */}
      <Wall position={[-8, 1, 40]} size={[6, 2, 0.5]} texture={wallTex} />
      <Wall position={[8, 1, 40]} size={[6, 2, 0.5]} texture={wallTex} />
      <Wall position={[-8, 1, 44]} size={[6, 2, 0.5]} texture={wallTex} />
      <Wall position={[8, 1, 44]} size={[6, 2, 0.5]} texture={wallTex} />
      <Wall position={[0, 1, 42]} size={[0.5, 2, 4]} texture={wallTex} />
      <SpawnPortal position={[0, 0, HD - 3]} rotation={[0, Math.PI, 0]} color={EMISSIVE_FIRE} />

      {/* ═══ EAST: FURNACE CHAMBER WITH CATWALKS ═══ */}
      <Wall position={[30, WALL_H/2, -12]} size={[0.5, WALL_H, 24]} texture={wallTex} />
      <Wall position={[30, WALL_H/2, 12]} size={[0.5, WALL_H, 24]} texture={wallTex} />
      <Wall position={[16, WALL_H/2, -8]} size={[0.5, WALL_H, 16]} texture={wallTex} />
      <Wall position={[16, WALL_H/2, 8]} size={[0.5, WALL_H, 16]} texture={wallTex} />
      {/* Two catwalks on east/west of chamber */}
      <Catwalk position={[34, 2, 0]} size={[3, 0.5, 20]} glowColor={EMISSIVE_LAVA} />
      <Catwalk position={[20, 2, 0]} size={[3, 0.5, 20]} glowColor={EMISSIVE_LAVA} />
      {/* Bridge connecting the catwalks */}
      <SolidPlatform position={[27, 1.5, 0]} size={[10, 0.5, 3]} glowColor={EMISSIVE_FIRE} />
      <Ramp position={[34, 1, 12]} rampRotation={[-0.2, 0, 0]} size={[2.5, 0.5, 4]} />
      <Ramp position={[20, 1, -12]} rampRotation={[0.2, 0, 0]} size={[2.5, 0.5, 4]} />
      <SpawnPortal position={[HW - 3, 0, 0]} rotation={[0, -Math.PI/2, 0]} color={EMISSIVE_LAVA} />

      {/* ═══ WEST: COOLING TUNNELS (narrow, winding) ═══ */}
      {/* First segment going west */}
      <Wall position={[-16, WALL_H/2, -5]} size={[0.5, WALL_H, 10]} texture={wallTex} />
      <Wall position={[-16, WALL_H/2, 5]} size={[0.5, WALL_H, 10]} texture={wallTex} />
      {/* Turn south */}
      <Wall position={[-24, WALL_H/2, -8]} size={[8, WALL_H, 0.5]} texture={wallTex} />
      <Wall position={[-24, WALL_H/2, 8]} size={[8, WALL_H, 0.5]} texture={wallTex} />
      {/* Second segment */}
      <Wall position={[-28, WALL_H/2, -5]} size={[0.5, WALL_H, 6]} texture={wallTex} />
      <Wall position={[-28, WALL_H/2, 5]} size={[0.5, WALL_H, 6]} texture={wallTex} />
      {/* Turn west again */}
      <Wall position={[-36, WALL_H/2, -8]} size={[8, WALL_H, 0.5]} texture={wallTex} />
      <Wall position={[-36, WALL_H/2, 8]} size={[8, WALL_H, 0.5]} texture={wallTex} />
      {/* Pump room */}
      <Wall position={[-40, WALL_H/2, -8]} size={[0.5, WALL_H, 8]} texture={wallTex} />
      <Wall position={[-40, WALL_H/2, 8]} size={[0.5, WALL_H, 8]} texture={wallTex} />
      <Wall position={[-34, WALL_H/2, -6]} size={[0.5, WALL_H, 4]} texture={wallTex} />
      <Wall position={[-34, WALL_H/2, 6]} size={[0.5, WALL_H, 4]} texture={wallTex} />
      <Crate position={[-38, 0.7, 0]} size={[2.5, 1.4, 2.5]} stripeColor={EMISSIVE_RUST} />
      <SpawnPortal position={[-HW + 3, 0, 0]} rotation={[0, Math.PI/2, 0]} color={EMISSIVE_RUST} />

      {/* Extra spawn portal */}
      <SpawnPortal position={[30, 0, 10]} rotation={[0, -Math.PI/2, 0]} color={EMISSIVE_LAVA} />

      {/* ═══ LIGHTING ═══ */}
      <CeilingLight position={[0, WALL_H - 0.1, 0]} color={EMISSIVE_LAVA} intensity={4} />
      <CeilingLight position={[0, WALL_H - 0.1, -40]} color={EMISSIVE_FIRE} flicker />
      <CeilingLight position={[0, WALL_H - 0.1, 40]} color={EMISSIVE_LAVA} />
      <CeilingLight position={[27, WALL_H - 0.1, 0]} color={EMISSIVE_LAVA} flicker />
      <CeilingLight position={[-30, WALL_H - 0.1, 0]} color={EMISSIVE_RUST} />
    </group>
  );
}

const MapFurnace = memo(MapFurnaceImpl);
export default MapFurnace;
