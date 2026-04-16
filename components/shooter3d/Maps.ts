"use client";

export interface MapEnemySpawn {
  drones: number;
  sentinels: number;
  heavies: number;
  bosses: number;
}

export interface MapConfig {
  id: string;
  name: string;
  description: string;
  fogColor: string; // scene fog tint
  ambientColor: string;
  enemies: MapEnemySpawn;
  hpMult: number;
  speedMult: number;
}

export const MAPS: MapConfig[] = [
  {
    id: "map01",
    name: "THE BREACH",
    description: "Entry point. Infested with lesser demons.",
    fogColor: "#1a1008",
    ambientColor: "#aa5522", // rust
    enemies: { drones: 8, sentinels: 2, heavies: 0, bosses: 0 },
    hpMult: 1.0,
    speedMult: 1.0,
  },
  {
    id: "map02",
    name: "FURNACE",
    description: "The reactor burns. Armored fiends guard the core.",
    fogColor: "#1a0800",
    ambientColor: "#cc3300", // lava
    enemies: { drones: 10, sentinels: 4, heavies: 2, bosses: 0 },
    hpMult: 1.2,
    speedMult: 1.1,
  },
  {
    id: "map03",
    name: "TOXIN REFINERY",
    description: "Poisoned halls. The horde thickens.",
    fogColor: "#0a1208",
    ambientColor: "#556b2f", // sick green
    enemies: { drones: 12, sentinels: 6, heavies: 4, bosses: 0 },
    hpMult: 1.4,
    speedMult: 1.2,
  },
  {
    id: "map04",
    name: "HELL'S MAW",
    description: "The overlord waits in blood and fire.",
    fogColor: "#1a0404",
    ambientColor: "#8B0000", // blood red
    enemies: { drones: 8, sentinels: 4, heavies: 3, bosses: 1 },
    hpMult: 1.5,
    speedMult: 1.25,
  },
];

const STORAGE_KEY = "sectorBreachMapsUnlocked";

export function getUnlockedMaps(): string[] {
  if (typeof window === "undefined") return [MAPS[0].id];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const arr = JSON.parse(stored);
      if (Array.isArray(arr) && arr.length > 0) return arr;
    }
  } catch {}
  return [MAPS[0].id];
}

export function unlockMap(id: string) {
  if (typeof window === "undefined") return;
  try {
    const current = getUnlockedMaps();
    if (!current.includes(id)) {
      current.push(id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    }
  } catch {}
}

export function isMapUnlocked(id: string): boolean {
  return getUnlockedMaps().includes(id);
}

export function getNextMapId(currentId: string): string | null {
  const idx = MAPS.findIndex((m) => m.id === currentId);
  if (idx < 0 || idx >= MAPS.length - 1) return null;
  return MAPS[idx + 1].id;
}
