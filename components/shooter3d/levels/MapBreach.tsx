"use client";

import { memo } from "react";
import {
  ArenaShell, Wall, GlowStrip, CeilingLight, EnergyPillar,
  SpawnPortal, Crate, Ramp, SolidPlatform, Catwalk,
  useMapTextures, type MapLayout,
  WALL_H, EMISSIVE_FIRE, EMISSIVE_BLOOD, EMISSIVE_LAVA, EMISSIVE_RUST,
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
    [-20, 0, -30],
    [20, 0, 30],
  ],
  WALL_COLLIDERS: [
    // Central platform
    [0, 0, 5.5, 5.5],
    // Hub corner cover
    [12, -12, 1.5, 1.5], [-12, -12, 1.5, 1.5],
    [12, 12, 1.5, 1.5], [-12, 12, 1.5, 1.5],
    // Hub half-walls
    [5.5, -12, 0.7, 1.7], [-5.5, -12, 0.7, 1.7],
    [5.5, 12, 0.7, 1.7], [-5.5, 12, 0.7, 1.7],

    // North corridor walls
    [-5, -22, 0.5, 12], [5, -22, 0.5, 12],
    // North alcoves (indentations in corridor walls)
    [-9, -18, 2, 2], [9, -22, 2, 2],
    // North room (Armory)
    [-16, -40, 0.5, 6], [16, -40, 0.5, 6],
    [-10.5, -34, 5.5, 0.5], [10.5, -34, 5.5, 0.5],
    // Armory crates
    [-14, -42, 1.2, 0.8], [-14, -39, 1.2, 0.8],
    [14, -42, 1.2, 0.8], [0, -44, 2, 1],

    // South corridor walls
    [-5, 22, 0.5, 12], [5, 22, 0.5, 12],
    [-9, 18, 2, 2], [9, 26, 2, 2],
    // South room (Barracks)
    [-16, 40, 0.5, 6], [16, 40, 0.5, 6],
    [-10.5, 34, 5.5, 0.5], [10.5, 34, 5.5, 0.5],
    // Barracks pillars
    [-8, 38, 0.8, 0.8], [8, 38, 0.8, 0.8],
    [-8, 42, 0.8, 0.8], [8, 42, 0.8, 0.8],

    // East corridor walls
    [22, -5, 12, 0.5], [22, 5, 12, 0.5],
    [18, -9, 2, 2], [26, 9, 2, 2],
    // East room (Command center)
    [40, -12, 0.5, 4], [40, 12, 0.5, 4],
    [34, -8, 0.5, 4], [34, 8, 0.5, 4],
    // Observation deck catwalk
    [38, 0, 2, 8],

    // West corridor walls
    [-22, -5, 12, 0.5], [-22, 5, 12, 0.5],
    [-18, -9, 2, 2], [-26, 9, 2, 2],
    // West room (Storage)
    [-40, -12, 0.5, 4], [-40, 12, 0.5, 4],
    [-34, -8, 0.5, 4], [-34, 8, 0.5, 4],
    // Storage crate maze
    [-36, -4, 1.5, 1.5], [-36, 4, 1.5, 1.5],
    [-39, 0, 1, 2],
  ],
};

function MapBreachImpl() {
  const { wallTex, floorTex, ceilingTex } = useMapTextures(W, D);

  return (
    <group>
      <ArenaShell halfW={HW} halfD={HD} wallTex={wallTex} floorTex={floorTex} ceilingTex={ceilingTex} />

      {/* ═══ CENTRAL HUB ═══ */}
      <SolidPlatform position={[0, 0.5, 0]} size={[10, 2, 10]} glowColor={EMISSIVE_FIRE} />
      <Ramp position={[0, 0.6, -7]} rampRotation={[0.18, 0, 0]} size={[3.5, 0.5, 5]} />
      <Ramp position={[0, 0.6, 7]} rampRotation={[-0.18, 0, 0]} size={[3.5, 0.5, 5]} />
      <Ramp position={[-7, 0.6, 0]} rotation={[0, Math.PI / 2, 0]} rampRotation={[0.18, 0, 0]} size={[3.5, 0.5, 5]} />
      <Ramp position={[7, 0.6, 0]} rotation={[0, Math.PI / 2, 0]} rampRotation={[-0.18, 0, 0]} size={[3.5, 0.5, 5]} />

      {/* Hub corner cover */}
      {[[12,-12],[- 12,-12],[12,12],[-12,12]].map(([x,z],i) => (
        <Crate key={`hc-${i}`} position={[x, 0.7, z]} size={[2.5, 1.4, 2.5]} stripeColor={i<2?EMISSIVE_FIRE:EMISSIVE_LAVA} />
      ))}
      {/* Half-height walls at corridor entrances */}
      {[[5.5,-12],[-5.5,-12],[5.5,12],[-5.5,12]].map(([x,z],i) => (
        <Wall key={`hw-${i}`} position={[x, 1, z]} size={[1, 2, 3]} texture={wallTex} />
      ))}

      {/* Hub energy pillars */}
      <EnergyPillar position={[16, 0, 0]} color={EMISSIVE_FIRE} />
      <EnergyPillar position={[-16, 0, 0]} color={EMISSIVE_RUST} />
      <EnergyPillar position={[0, 0, -14]} color={EMISSIVE_BLOOD} />
      <EnergyPillar position={[0, 0, 14]} color={EMISSIVE_LAVA} />

      {/* ═══ NORTH CORRIDOR → ARMORY ═══ */}
      <Wall position={[-5, WALL_H/2, -22]} size={[0.5, WALL_H, 24]} texture={wallTex} />
      <Wall position={[5, WALL_H/2, -22]} size={[0.5, WALL_H, 24]} texture={wallTex} />
      <GlowStrip position={[-4.7, 0.15, -22]} scale={[0.08, 0.08, 24]} color={EMISSIVE_BLOOD} />
      <GlowStrip position={[4.7, 0.15, -22]} scale={[0.08, 0.08, 24]} color={EMISSIVE_BLOOD} />
      {/* Alcoves */}
      <Wall position={[-9, WALL_H/2, -16]} size={[0.5, WALL_H, 4]} texture={wallTex} />
      <Wall position={[-9, WALL_H/2, -20]} size={[4, WALL_H, 0.5]} texture={wallTex} />
      <Wall position={[9, WALL_H/2, -20]} size={[0.5, WALL_H, 4]} texture={wallTex} />
      <Wall position={[9, WALL_H/2, -24]} size={[4, WALL_H, 0.5]} texture={wallTex} />
      {/* Armory room */}
      <Wall position={[-16, WALL_H/2, -40]} size={[0.5, WALL_H, 12]} texture={wallTex} />
      <Wall position={[16, WALL_H/2, -40]} size={[0.5, WALL_H, 12]} texture={wallTex} />
      <Wall position={[-10.5, WALL_H/2, -34]} size={[11, WALL_H, 0.5]} texture={wallTex} />
      <Wall position={[10.5, WALL_H/2, -34]} size={[11, WALL_H, 0.5]} texture={wallTex} />
      <Crate position={[-14, 0.6, -42]} size={[2, 1.2, 1.2]} stripeColor={EMISSIVE_BLOOD} />
      <Crate position={[-14, 0.6, -39]} size={[2, 1.2, 1.2]} stripeColor={EMISSIVE_BLOOD} />
      <Crate position={[14, 0.6, -42]} size={[2, 1.2, 1.2]} stripeColor={EMISSIVE_BLOOD} />
      <Crate position={[0, 0.6, -44]} size={[3, 1.2, 2]} stripeColor={EMISSIVE_BLOOD} />
      <SpawnPortal position={[0, 0, -HD + 3]} color={EMISSIVE_BLOOD} />

      {/* ═══ SOUTH CORRIDOR → BARRACKS ═══ */}
      <Wall position={[-5, WALL_H/2, 22]} size={[0.5, WALL_H, 24]} texture={wallTex} />
      <Wall position={[5, WALL_H/2, 22]} size={[0.5, WALL_H, 24]} texture={wallTex} />
      <GlowStrip position={[-4.7, 0.15, 22]} scale={[0.08, 0.08, 24]} color={EMISSIVE_LAVA} />
      <GlowStrip position={[4.7, 0.15, 22]} scale={[0.08, 0.08, 24]} color={EMISSIVE_LAVA} />
      {/* Alcoves */}
      <Wall position={[-9, WALL_H/2, 16]} size={[0.5, WALL_H, 4]} texture={wallTex} />
      <Wall position={[-9, WALL_H/2, 20]} size={[4, WALL_H, 0.5]} texture={wallTex} />
      <Wall position={[9, WALL_H/2, 24]} size={[0.5, WALL_H, 4]} texture={wallTex} />
      <Wall position={[9, WALL_H/2, 28]} size={[4, WALL_H, 0.5]} texture={wallTex} />
      {/* Barracks room */}
      <Wall position={[-16, WALL_H/2, 40]} size={[0.5, WALL_H, 12]} texture={wallTex} />
      <Wall position={[16, WALL_H/2, 40]} size={[0.5, WALL_H, 12]} texture={wallTex} />
      <Wall position={[-10.5, WALL_H/2, 34]} size={[11, WALL_H, 0.5]} texture={wallTex} />
      <Wall position={[10.5, WALL_H/2, 34]} size={[11, WALL_H, 0.5]} texture={wallTex} />
      {/* Barracks pillars (cover) */}
      <EnergyPillar position={[-8, 0, 38]} color={EMISSIVE_LAVA} />
      <EnergyPillar position={[8, 0, 38]} color={EMISSIVE_LAVA} />
      <EnergyPillar position={[-8, 0, 42]} color={EMISSIVE_LAVA} />
      <EnergyPillar position={[8, 0, 42]} color={EMISSIVE_LAVA} />
      <SpawnPortal position={[0, 0, HD - 3]} rotation={[0, Math.PI, 0]} color={EMISSIVE_LAVA} />

      {/* ═══ EAST CORRIDOR → COMMAND CENTER ═══ */}
      <Wall position={[22, WALL_H/2, -5]} rotation={[0, Math.PI/2, 0]} size={[0.5, WALL_H, 24]} texture={wallTex} />
      <Wall position={[22, WALL_H/2, 5]} rotation={[0, Math.PI/2, 0]} size={[0.5, WALL_H, 24]} texture={wallTex} />
      <GlowStrip position={[22, 0.15, -4.7]} scale={[24, 0.08, 0.08]} color={EMISSIVE_BLOOD} />
      <GlowStrip position={[22, 0.15, 4.7]} scale={[24, 0.08, 0.08]} color={EMISSIVE_BLOOD} />
      {/* Alcoves */}
      <Wall position={[18, WALL_H/2, -9]} size={[0.5, WALL_H, 4]} texture={wallTex} />
      <Wall position={[22, WALL_H/2, -9]} size={[4, WALL_H, 0.5]} texture={wallTex} />
      <Wall position={[26, WALL_H/2, 9]} size={[0.5, WALL_H, 4]} texture={wallTex} />
      <Wall position={[30, WALL_H/2, 9]} size={[4, WALL_H, 0.5]} texture={wallTex} />
      {/* Command room */}
      <Wall position={[40, WALL_H/2, -12]} rotation={[0, Math.PI/2, 0]} size={[0.5, WALL_H, 8]} texture={wallTex} />
      <Wall position={[40, WALL_H/2, 12]} rotation={[0, Math.PI/2, 0]} size={[0.5, WALL_H, 8]} texture={wallTex} />
      <Wall position={[34, WALL_H/2, -8]} size={[0.5, WALL_H, 8]} texture={wallTex} />
      <Wall position={[34, WALL_H/2, 8]} size={[0.5, WALL_H, 8]} texture={wallTex} />
      {/* Observation deck */}
      <Catwalk position={[38, 2, 0]} size={[3, 0.5, 16]} glowColor={EMISSIVE_BLOOD} />
      <Ramp position={[36, 1, 10]} rotation={[0, Math.PI/2, 0]} rampRotation={[0.2, 0, 0]} size={[2.5, 0.5, 4]} />
      <SpawnPortal position={[HW - 3, 0, 0]} rotation={[0, -Math.PI/2, 0]} color={EMISSIVE_BLOOD} />

      {/* ═══ WEST CORRIDOR → STORAGE ═══ */}
      <Wall position={[-22, WALL_H/2, -5]} rotation={[0, Math.PI/2, 0]} size={[0.5, WALL_H, 24]} texture={wallTex} />
      <Wall position={[-22, WALL_H/2, 5]} rotation={[0, Math.PI/2, 0]} size={[0.5, WALL_H, 24]} texture={wallTex} />
      <GlowStrip position={[-22, 0.15, -4.7]} scale={[24, 0.08, 0.08]} color={EMISSIVE_RUST} />
      <GlowStrip position={[-22, 0.15, 4.7]} scale={[24, 0.08, 0.08]} color={EMISSIVE_RUST} />
      {/* Alcoves */}
      <Wall position={[-18, WALL_H/2, -9]} size={[0.5, WALL_H, 4]} texture={wallTex} />
      <Wall position={[-22, WALL_H/2, -9]} size={[4, WALL_H, 0.5]} texture={wallTex} />
      <Wall position={[-26, WALL_H/2, 9]} size={[0.5, WALL_H, 4]} texture={wallTex} />
      <Wall position={[-30, WALL_H/2, 9]} size={[4, WALL_H, 0.5]} texture={wallTex} />
      {/* Storage room */}
      <Wall position={[-40, WALL_H/2, -12]} rotation={[0, Math.PI/2, 0]} size={[0.5, WALL_H, 8]} texture={wallTex} />
      <Wall position={[-40, WALL_H/2, 12]} rotation={[0, Math.PI/2, 0]} size={[0.5, WALL_H, 8]} texture={wallTex} />
      <Wall position={[-34, WALL_H/2, -8]} size={[0.5, WALL_H, 8]} texture={wallTex} />
      <Wall position={[-34, WALL_H/2, 8]} size={[0.5, WALL_H, 8]} texture={wallTex} />
      {/* Crate maze */}
      <Crate position={[-36, 0.7, -4]} size={[2.5, 1.4, 2.5]} stripeColor={EMISSIVE_RUST} />
      <Crate position={[-36, 0.7, 4]} size={[2.5, 1.4, 2.5]} stripeColor={EMISSIVE_RUST} />
      <Crate position={[-39, 0.7, 0]} size={[2, 1.4, 3.5]} stripeColor={EMISSIVE_RUST} />
      <Crate position={[-36, 2.1, -4]} size={[1.5, 1, 1.5]} stripeColor={EMISSIVE_RUST} />
      <SpawnPortal position={[-HW + 3, 0, 0]} rotation={[0, Math.PI/2, 0]} color={EMISSIVE_RUST} />

      {/* Extra spawn portals in corridors */}
      <SpawnPortal position={[-20, 0, -30]} color={EMISSIVE_BLOOD} />
      <SpawnPortal position={[20, 0, 30]} rotation={[0, Math.PI, 0]} color={EMISSIVE_LAVA} />

      {/* ═══ LIGHTING ═══ */}
      <CeilingLight position={[0, WALL_H - 0.1, 0]} color={EMISSIVE_FIRE} intensity={4} />
      <CeilingLight position={[0, WALL_H - 0.1, -30]} color={EMISSIVE_BLOOD} flicker />
      <CeilingLight position={[0, WALL_H - 0.1, 30]} color={EMISSIVE_LAVA} />
      <CeilingLight position={[30, WALL_H - 0.1, 0]} color={EMISSIVE_BLOOD} flicker />
      <CeilingLight position={[-30, WALL_H - 0.1, 0]} color={EMISSIVE_RUST} />
    </group>
  );
}

const MapBreach = memo(MapBreachImpl);
export default MapBreach;
