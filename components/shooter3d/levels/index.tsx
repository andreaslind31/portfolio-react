"use client";

import { memo } from "react";
import type { MapLayout } from "./LevelBase";

// Lazy imports to avoid loading all maps at once
import MapBreach, { LAYOUT as BREACH_LAYOUT } from "./MapBreach";
import MapFurnace, { LAYOUT as FURNACE_LAYOUT } from "./MapFurnace";
import MapToxin, { LAYOUT as TOXIN_LAYOUT } from "./MapToxin";
import MapHellsMaw, { LAYOUT as HELLSMAW_LAYOUT } from "./MapHellsMaw";

export type { MapLayout };

const MAP_COMPONENTS: Record<string, React.ComponentType> = {
  map01: MapBreach,
  map02: MapFurnace,
  map03: MapToxin,
  map04: MapHellsMaw,
};

const MAP_LAYOUTS: Record<string, MapLayout> = {
  map01: BREACH_LAYOUT,
  map02: FURNACE_LAYOUT,
  map03: TOXIN_LAYOUT,
  map04: HELLSMAW_LAYOUT,
};

export function getMapLayout(mapId: string): MapLayout {
  return MAP_LAYOUTS[mapId] || BREACH_LAYOUT;
}

interface LevelSelectorProps {
  mapId: string;
}

function LevelSelectorImpl({ mapId }: LevelSelectorProps) {
  const MapComponent = MAP_COMPONENTS[mapId] || MapBreach;
  return <MapComponent />;
}

const LevelSelector = memo(LevelSelectorImpl);
export default LevelSelector;
