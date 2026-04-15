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
    name: "SECTOR ONE",
    description: "Initial breach. Light resistance.",
    fogColor: "#2a1a12",
    ambientColor: "#aa7766",
    enemies: { drones: 8, sentinels: 2, heavies: 0, bosses: 0 },
    hpMult: 1.0,
    speedMult: 1.0,
  },
  {
    id: "map02",
    name: "REACTOR CORE",
    description: "The heart of the facility. Armored units.",
    fogColor: "#1a2a12",
    ambientColor: "#77aa66",
    enemies: { drones: 10, sentinels: 4, heavies: 2, bosses: 0 },
    hpMult: 1.2,
    speedMult: 1.1,
  },
  {
    id: "map03",
    name: "COMMS ARRAY",
    description: "High-security perimeter. Heavy resistance.",
    fogColor: "#2a1228",
    ambientColor: "#aa6688",
    enemies: { drones: 12, sentinels: 6, heavies: 4, bosses: 0 },
    hpMult: 1.4,
    speedMult: 1.2,
  },
  {
    id: "map04",
    name: "THE PIT",
    description: "Their overlord awaits. Bring everything.",
    fogColor: "#2a1212",
    ambientColor: "#cc5555",
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
