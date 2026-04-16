/**
 * Shared multiplayer message protocol.
 * Used by both client and server.
 */

// ── Player identity ──────────────────────────────────────

export interface PlayerInfo {
  id: string;
  name: string;
  health: number;
  maxHealth: number;
  position: [number, number, number];
  rotation: [number, number]; // yaw, pitch
  weapon: string;
  score: number;
  kills: number;
  deaths: number;
  alive: boolean;
}

// ── Client → Server messages ─────────────────────────────

export type ClientMessage =
  | { type: "join"; name: string }
  | { type: "leave" }
  | { type: "playerState"; position: [number, number, number]; rotation: [number, number]; weapon: string }
  | { type: "shoot"; origin: [number, number, number]; direction: [number, number, number]; weapon: string }
  | { type: "startGame"; mode: "coop-waves" | "coop-maps" | "deathmatch"; mapId?: string }
  | { type: "chat"; text: string }
  | { type: "enemySync"; enemies: EnemySyncData[] }
  | { type: "enemyDamage"; enemyId: number; damage: number };

// ── Server → Client messages ─────────────────────────────

export type ServerMessage =
  | { type: "roomInfo"; roomCode: string; players: PlayerInfo[]; hostId: string; state: RoomState }
  | { type: "playerJoined"; player: PlayerInfo }
  | { type: "playerLeft"; playerId: string }
  | { type: "playerUpdate"; playerId: string; position: [number, number, number]; rotation: [number, number]; weapon: string }
  | { type: "playerShoot"; playerId: string; origin: [number, number, number]; direction: [number, number, number]; weapon: string }
  | { type: "playerDamage"; playerId: string; health: number; attackerId: string }
  | { type: "playerDeath"; playerId: string; killerId: string }
  | { type: "playerRespawn"; playerId: string; position: [number, number, number] }
  | { type: "gameStart"; mode: string; mapId?: string }
  | { type: "enemySync"; enemies: EnemySyncData[] }
  | { type: "enemyDamage"; enemyId: number; hp: number; killerId?: string }
  | { type: "waveStart"; wave: number }
  | { type: "victory" }
  | { type: "chat"; playerId: string; name: string; text: string }
  | { type: "error"; message: string };

export interface EnemySyncData {
  id: number;
  position: [number, number, number];
  hp: number;
  maxHp: number;
  type: string;
  alive: boolean;
  aiState: string;
  isShooting: boolean;
}

export type RoomState = "lobby" | "playing" | "finished";

// ── Room code generation ─────────────────────────────────

export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
