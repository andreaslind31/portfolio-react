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
    [-35, 0, -38], [35, 0, -38],
    [-35, 0, 38], [35, 0, 38],
    [0, 0, -20],
  ],
  WALL_COLLIDERS: [
    // Balcony inner edge (perimeter ring)
    // North side
    [0, -20, 20, 0.5],
    // South side
    [0, 20, 20, 0.5],
    // East side
    [20, 0, 0.5, 20],
    // West side
    [-20, 0, 0.5, 20],

    // NW supply room
    [-35, -38, 7, 0.5], [-35, -44, 7, 0.5],
    [-42, -41, 0.5, 3], [-28, -41, 0.5, 3],
    [-35, -42, 1.5, 1.5],
    // NE supply room
    [35, -38, 7, 0.5], [35, -44, 7, 0.5],
    [42, -41, 0.5, 3], [28, -41, 0.5, 3],
    [35, -42, 1.5, 1.5],
    // SW supply room
    [-35, 38, 7, 0.5], [-35, 44, 7, 0.5],
    [-42, 41, 0.5, 3], [-28, 41, 0.5, 3],
    // SE supply room
    [35, 38, 7, 0.5], [35, 44, 7, 0.5],
    [42, 41, 0.5, 3], [28, 41, 0.5, 3],

    // Short corridors to supply rooms
    [-28, -30, 0.5, 4], [-24, -30, 0.5, 4],
    [28, -30, 0.5, 4], [24, -30, 0.5, 4],
    [-28, 30, 0.5, 4], [-24, 30, 0.5, 4],
    [28, 30, 0.5, 4], [24, 30, 0.5, 4],

    // Central pit (decorative, not actually blocking)
    // [0, 0, 5, 5] — skip, pit is walkable
  ],
};

function MapHellsMawImpl() {
  const { wallTex, floorTex, ceilingTex } = useMapTextures(W, D);

  return (
    <group>
      <ArenaShell halfW={HW} halfD={HD} wallTex={wallTex} floorTex={floorTex} ceilingTex={ceilingTex} />

      {/* ═══ CENTRAL ARENA (40x40 clear space) ═══ */}
      {/* Central decorative pit (cosmetic, glowing red) */}
      <mesh position={[0, -0.04, 0]}>
        <boxGeometry args={[10, 0.02, 10]} />
        <meshStandardMaterial color={EMISSIVE_BLOOD} emissive={EMISSIVE_BLOOD} emissiveIntensity={0.8} toneMapped={false} />
      </mesh>
      <GlowStrip position={[0, 0.01, 0]} scale={[11, 0.01, 11]} color={EMISSIVE_FIRE} intensity={0.3} />

      {/* ═══ 8 PILLARS IN CIRCLE AROUND PIT ═══ */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const x = Math.cos(angle) * 14;
        const z = Math.sin(angle) * 14;
        return <EnergyPillar key={`pit-p-${i}`} position={[x, 0, z]} color={i % 2 === 0 ? EMISSIVE_BLOOD : EMISSIVE_FIRE} />;
      })}

      {/* ═══ PERIMETER BALCONY (elevated ring) ═══ */}
      {/* North balcony */}
      <Catwalk position={[0, 2, -24]} size={[40, 0.5, 4]} glowColor={EMISSIVE_BLOOD} />
      {/* South balcony */}
      <Catwalk position={[0, 2, 24]} size={[40, 0.5, 4]} glowColor={EMISSIVE_BLOOD} />
      {/* East balcony */}
      <Catwalk position={[24, 2, 0]} size={[4, 0.5, 44]} glowColor={EMISSIVE_BLOOD} />
      {/* West balcony */}
      <Catwalk position={[-24, 2, 0]} size={[4, 0.5, 44]} glowColor={EMISSIVE_BLOOD} />

      {/* Balcony inner walls (prevent enemies from walking at balcony level through) */}
      <Wall position={[0, WALL_H/2, -20]} size={[40, WALL_H, 0.5]} texture={wallTex} />
      <Wall position={[0, WALL_H/2, 20]} size={[40, WALL_H, 0.5]} texture={wallTex} />
      <Wall position={[20, WALL_H/2, 0]} size={[0.5, WALL_H, 40]} texture={wallTex} />
      <Wall position={[-20, WALL_H/2, 0]} size={[0.5, WALL_H, 40]} texture={wallTex} />

      {/* 4 ramps up to balcony */}
      <Ramp position={[0, 1, -18]} rampRotation={[0.2, 0, 0]} size={[4, 0.5, 6]} />
      <Ramp position={[0, 1, 18]} rampRotation={[-0.2, 0, 0]} size={[4, 0.5, 6]} />
      <Ramp position={[-18, 1, 0]} rotation={[0, Math.PI/2, 0]} rampRotation={[0.2, 0, 0]} size={[4, 0.5, 6]} />
      <Ramp position={[18, 1, 0]} rotation={[0, Math.PI/2, 0]} rampRotation={[-0.2, 0, 0]} size={[4, 0.5, 6]} />

      {/* ═══ NW SUPPLY ROOM ═══ */}
      <Wall position={[-35, WALL_H/2, -38]} size={[14, WALL_H, 0.5]} texture={wallTex} />
      <Wall position={[-35, WALL_H/2, -44]} size={[14, WALL_H, 0.5]} texture={wallTex} />
      <Wall position={[-42, WALL_H/2, -41]} size={[0.5, WALL_H, 6]} texture={wallTex} />
      <Wall position={[-28, WALL_H/2, -41]} size={[0.5, WALL_H, 6]} texture={wallTex} />
      <Crate position={[-35, 0.7, -42]} size={[2.5, 1.4, 2.5]} stripeColor={EMISSIVE_BLOOD} />
      {/* Corridor to NW room */}
      <Wall position={[-28, WALL_H/2, -30]} size={[0.5, WALL_H, 8]} texture={wallTex} />
      <Wall position={[-24, WALL_H/2, -30]} size={[0.5, WALL_H, 8]} texture={wallTex} />
      <SpawnPortal position={[-35, 0, -38]} color={EMISSIVE_BLOOD} />

      {/* ═══ NE SUPPLY ROOM ═══ */}
      <Wall position={[35, WALL_H/2, -38]} size={[14, WALL_H, 0.5]} texture={wallTex} />
      <Wall position={[35, WALL_H/2, -44]} size={[14, WALL_H, 0.5]} texture={wallTex} />
      <Wall position={[42, WALL_H/2, -41]} size={[0.5, WALL_H, 6]} texture={wallTex} />
      <Wall position={[28, WALL_H/2, -41]} size={[0.5, WALL_H, 6]} texture={wallTex} />
      <Crate position={[35, 0.7, -42]} size={[2.5, 1.4, 2.5]} stripeColor={EMISSIVE_FIRE} />
      <Wall position={[28, WALL_H/2, -30]} size={[0.5, WALL_H, 8]} texture={wallTex} />
      <Wall position={[24, WALL_H/2, -30]} size={[0.5, WALL_H, 8]} texture={wallTex} />
      <SpawnPortal position={[35, 0, -38]} color={EMISSIVE_FIRE} />

      {/* ═══ SW SUPPLY ROOM ═══ */}
      <Wall position={[-35, WALL_H/2, 38]} size={[14, WALL_H, 0.5]} texture={wallTex} />
      <Wall position={[-35, WALL_H/2, 44]} size={[14, WALL_H, 0.5]} texture={wallTex} />
      <Wall position={[-42, WALL_H/2, 41]} size={[0.5, WALL_H, 6]} texture={wallTex} />
      <Wall position={[-28, WALL_H/2, 41]} size={[0.5, WALL_H, 6]} texture={wallTex} />
      <Wall position={[-28, WALL_H/2, 30]} size={[0.5, WALL_H, 8]} texture={wallTex} />
      <Wall position={[-24, WALL_H/2, 30]} size={[0.5, WALL_H, 8]} texture={wallTex} />
      <SpawnPortal position={[-35, 0, 38]} rotation={[0, Math.PI, 0]} color={EMISSIVE_BLOOD} />

      {/* ═══ SE SUPPLY ROOM ═══ */}
      <Wall position={[35, WALL_H/2, 38]} size={[14, WALL_H, 0.5]} texture={wallTex} />
      <Wall position={[35, WALL_H/2, 44]} size={[14, WALL_H, 0.5]} texture={wallTex} />
      <Wall position={[42, WALL_H/2, 41]} size={[0.5, WALL_H, 6]} texture={wallTex} />
      <Wall position={[28, WALL_H/2, 41]} size={[0.5, WALL_H, 6]} texture={wallTex} />
      <Wall position={[28, WALL_H/2, 30]} size={[0.5, WALL_H, 8]} texture={wallTex} />
      <Wall position={[24, WALL_H/2, 30]} size={[0.5, WALL_H, 8]} texture={wallTex} />
      <SpawnPortal position={[35, 0, 38]} rotation={[0, Math.PI, 0]} color={EMISSIVE_FIRE} />

      {/* Center edge spawn */}
      <SpawnPortal position={[0, 0, -20]} color={EMISSIVE_BLOOD} />

      {/* ═══ LIGHTING ═══ */}
      <CeilingLight position={[0, WALL_H - 0.1, 0]} color={EMISSIVE_BLOOD} intensity={4} />
      <CeilingLight position={[-35, WALL_H - 0.1, -41]} color={EMISSIVE_FIRE} flicker />
      <CeilingLight position={[35, WALL_H - 0.1, -41]} color={EMISSIVE_FIRE} />
      <CeilingLight position={[-35, WALL_H - 0.1, 41]} color={EMISSIVE_BLOOD} flicker />
      <CeilingLight position={[35, WALL_H - 0.1, 41]} color={EMISSIVE_BLOOD} />
    </group>
  );
}

const MapHellsMaw = memo(MapHellsMawImpl);
export default MapHellsMaw;
