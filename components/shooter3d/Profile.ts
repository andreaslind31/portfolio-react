"use client";

import type { Difficulty } from "./ShooterGame3D";

// Persistent player profile stored under one localStorage key so future
// additions (skins, perks, cosmetics) have a consistent home. Legacy keys
// sectorBreachDifficulty and sectorBreachMapsUnlocked are migrated on first load.

export interface PlayerStats {
  totalKills: number;
  totalScore: number;
  bossesDefeated: number;
  runsCompleted: number;
}

export interface PlayerProfile {
  difficulty: Difficulty;
  unlockedMaps: string[];
  stats: PlayerStats;
}

const PROFILE_KEY = "sectorBreachProfile";
const LEGACY_DIFFICULTY_KEY = "sectorBreachDifficulty";
const LEGACY_MAPS_KEY = "sectorBreachMapsUnlocked";

const DEFAULT_PROFILE: PlayerProfile = {
  difficulty: "normal",
  unlockedMaps: ["map01"],
  stats: {
    totalKills: 0,
    totalScore: 0,
    bossesDefeated: 0,
    runsCompleted: 0,
  },
};

function isDifficulty(v: unknown): v is Difficulty {
  return v === "easy" || v === "normal" || v === "hard" || v === "nightmare";
}

// Load profile, migrating legacy keys if the consolidated blob is missing.
export function loadProfile(): PlayerProfile {
  if (typeof window === "undefined") return { ...DEFAULT_PROFILE };
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PlayerProfile>;
      return {
        difficulty: isDifficulty(parsed.difficulty) ? parsed.difficulty : "normal",
        unlockedMaps: Array.isArray(parsed.unlockedMaps) ? parsed.unlockedMaps : ["map01"],
        stats: {
          totalKills: parsed.stats?.totalKills ?? 0,
          totalScore: parsed.stats?.totalScore ?? 0,
          bossesDefeated: parsed.stats?.bossesDefeated ?? 0,
          runsCompleted: parsed.stats?.runsCompleted ?? 0,
        },
      };
    }
    // Migrate legacy keys.
    const legacyDiff = localStorage.getItem(LEGACY_DIFFICULTY_KEY);
    const legacyMaps = localStorage.getItem(LEGACY_MAPS_KEY);
    const migrated: PlayerProfile = {
      difficulty: isDifficulty(legacyDiff) ? legacyDiff : "normal",
      unlockedMaps: (() => {
        if (!legacyMaps) return ["map01"];
        try {
          const arr = JSON.parse(legacyMaps);
          return Array.isArray(arr) ? arr : ["map01"];
        } catch {
          return ["map01"];
        }
      })(),
      stats: { ...DEFAULT_PROFILE.stats },
    };
    saveProfile(migrated);
    return migrated;
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

export function saveProfile(p: PlayerProfile) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  } catch {
    // Storage unavailable / quota exceeded — ignore.
  }
}

// Convenience helpers for incremental updates so callers don't have to
// rehydrate the whole profile.
export function recordRun(statsDelta: Partial<PlayerStats>) {
  const p = loadProfile();
  p.stats.totalKills += statsDelta.totalKills ?? 0;
  p.stats.totalScore += statsDelta.totalScore ?? 0;
  p.stats.bossesDefeated += statsDelta.bossesDefeated ?? 0;
  p.stats.runsCompleted += statsDelta.runsCompleted ?? 0;
  saveProfile(p);
  return p;
}

// Perk predicate — based purely on lifetime stats. Returns the list of
// perk IDs the player has earned.
export function getUnlockedPerks(stats: PlayerStats): string[] {
  const out: string[] = [];
  if (stats.bossesDefeated >= 10) out.push("scavenger");
  if (stats.totalScore >= 10000) out.push("glassCannon");
  if (stats.bossesDefeated >= 25) out.push("quickdraw");
  return out;
}

export const PERK_DESCRIPTIONS: Record<string, { name: string; desc: string }> = {
  scavenger: { name: "SCAVENGER", desc: "+25% pickup duration" },
  glassCannon: { name: "GLASS CANNON", desc: "+25% damage, -25% HP" },
  quickdraw: { name: "QUICKDRAW", desc: "-20% weapon cooldowns" },
};
