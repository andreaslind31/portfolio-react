"use client";

export interface MapEnemySpawn {
  drones: number;
  sentinels: number;
  heavies: number;
  bosses: number;
  snipers?: number;
  teleporters?: number;
  shieldedHeavies?: number;
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
    description: "The gate has broken. Demons pour through the rift.",
    fogColor: "#180808",
    ambientColor: "#cc3322", // ember
    enemies: { drones: 12, sentinels: 4, heavies: 1, bosses: 0 },
    hpMult: 1.25,
    speedMult: 1.15,
  },
  {
    id: "map02",
    name: "FURNACE",
    description: "The reactor burns. Armored fiends guard the core.",
    fogColor: "#1a0400",
    ambientColor: "#cc3300", // lava
    enemies: { drones: 14, sentinels: 6, heavies: 4, bosses: 0, snipers: 2, shieldedHeavies: 1 },
    hpMult: 1.5,
    speedMult: 1.25,
  },
  {
    id: "map03",
    name: "SLAUGHTER WORKS",
    description: "Blood-slick halls. The horde thickens.",
    fogColor: "#140404",
    ambientColor: "#a0202a", // crimson
    enemies: { drones: 14, sentinels: 8, heavies: 5, bosses: 0, snipers: 3, teleporters: 2, shieldedHeavies: 1 },
    hpMult: 1.75,
    speedMult: 1.35,
  },
  {
    id: "map04",
    name: "HELL'S MAW",
    description: "The overlord waits in blood and fire.",
    fogColor: "#1a0404",
    ambientColor: "#8B0000", // blood red
    enemies: { drones: 10, sentinels: 6, heavies: 4, bosses: 2, snipers: 3, teleporters: 3, shieldedHeavies: 2 },
    hpMult: 2.0,
    speedMult: 1.45,
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
