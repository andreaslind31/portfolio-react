/**
 * Cloudflare Durable Object — Game Room Server
 *
 * Each room is an instance of this class. It manages:
 * - Player connections (WebSocket)
 * - Game state (lobby, playing, finished)
 * - Player position sync (broadcasts at 20Hz)
 * - Hit validation
 * - Enemy AI (in co-op mode)
 */

import type {
  ClientMessage,
  ServerMessage,
  PlayerInfo,
  RoomState,
} from "../components/shooter3d/multiplayer/protocol";
import { generateRoomCode } from "../components/shooter3d/multiplayer/protocol";

interface PlayerConnection {
  ws: WebSocket;
  info: PlayerInfo;
  lastUpdate: number;
}

export class GameRoom {
  private state: DurableObjectState;
  private players: Map<string, PlayerConnection> = new Map();
  private roomCode: string;
  private roomState: RoomState = "lobby";
  private hostId: string = "";
  private gameMode: string = "coop-waves";
  private wave: number = 0;

  constructor(state: DurableObjectState) {
    this.state = state;
    this.roomCode = generateRoomCode();
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Return room code for HTTP GET
    if (url.pathname === "/info") {
      return new Response(
        JSON.stringify({
          roomCode: this.roomCode,
          playerCount: this.players.size,
          state: this.roomState,
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // WebSocket upgrade
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    const playerId = crypto.randomUUID();

    server.accept();

    server.addEventListener("message", (event) => {
      try {
        const msg: ClientMessage = JSON.parse(event.data as string);
        this.handleMessage(playerId, msg);
      } catch (e) {
        this.sendTo(playerId, { type: "error", message: "Invalid message" });
      }
    });

    server.addEventListener("close", () => {
      this.handleDisconnect(playerId);
    });

    server.addEventListener("error", () => {
      this.handleDisconnect(playerId);
    });

    // Store connection temporarily — actual PlayerInfo created on "join" message
    this.players.set(playerId, {
      ws: server,
      info: {
        id: playerId,
        name: "",
        health: 100,
        maxHealth: 100,
        position: [0, 2, 5],
        rotation: [0, 0],
        weapon: "blaster",
        score: 0,
        kills: 0,
        deaths: 0,
        alive: true,
      },
      lastUpdate: Date.now(),
    });

    return new Response(null, { status: 101, webSocket: client });
  }

  private handleMessage(playerId: string, msg: ClientMessage) {
    const player = this.players.get(playerId);
    if (!player) return;

    switch (msg.type) {
      case "join":
        player.info.name = msg.name.slice(0, 16) || "Player";
        // Set host if first player
        if (this.players.size === 1 || !this.hostId) {
          this.hostId = playerId;
        }
        // Send room info to the joining player
        this.sendTo(playerId, {
          type: "roomInfo",
          roomCode: this.roomCode,
          players: this.getAllPlayerInfos(),
          hostId: this.hostId,
          state: this.roomState,
        });
        // Notify others
        this.broadcast(
          { type: "playerJoined", player: player.info },
          playerId
        );
        break;

      case "playerState":
        player.info.position = msg.position;
        player.info.rotation = msg.rotation;
        player.info.weapon = msg.weapon;
        player.lastUpdate = Date.now();
        // Broadcast to all other players
        this.broadcast(
          {
            type: "playerUpdate",
            playerId,
            position: msg.position,
            rotation: msg.rotation,
            weapon: msg.weapon,
          },
          playerId
        );
        break;

      case "shoot":
        // Broadcast shoot event so other clients can render the projectile
        this.broadcast(
          {
            type: "playerShoot",
            playerId,
            origin: msg.origin,
            direction: msg.direction,
            weapon: msg.weapon,
          },
          playerId
        );

        // Server-side PvP hit detection (deathmatch mode)
        if (this.gameMode === "deathmatch") {
          this.checkPvPHit(playerId, msg.origin, msg.direction, msg.weapon);
        }
        break;

      case "startGame":
        if (playerId !== this.hostId) {
          this.sendTo(playerId, {
            type: "error",
            message: "Only the host can start the game",
          });
          return;
        }
        this.roomState = "playing";
        this.gameMode = msg.mode;
        this.wave = 1;
        // Reset all players
        for (const [, p] of this.players) {
          p.info.health = 100;
          p.info.alive = true;
          p.info.score = 0;
          p.info.kills = 0;
          p.info.deaths = 0;
        }
        this.broadcastAll({
          type: "gameStart",
          mode: msg.mode,
          mapId: msg.mapId,
        });
        break;

      case "chat":
        this.broadcastAll({
          type: "chat",
          playerId,
          name: player.info.name,
          text: msg.text.slice(0, 200),
        });
        break;

      case "leave":
        this.handleDisconnect(playerId);
        break;
    }
  }

  private handleDisconnect(playerId: string) {
    const player = this.players.get(playerId);
    if (!player) return;

    try {
      player.ws.close();
    } catch {}

    this.players.delete(playerId);
    this.broadcastAll({ type: "playerLeft", playerId });

    // Transfer host if the host left
    if (playerId === this.hostId && this.players.size > 0) {
      this.hostId = this.players.keys().next().value!;
      this.broadcastAll({
        type: "roomInfo",
        roomCode: this.roomCode,
        players: this.getAllPlayerInfos(),
        hostId: this.hostId,
        state: this.roomState,
      });
    }
  }

  private sendTo(playerId: string, msg: ServerMessage) {
    const player = this.players.get(playerId);
    if (!player) return;
    try {
      player.ws.send(JSON.stringify(msg));
    } catch {}
  }

  private broadcast(msg: ServerMessage, excludeId?: string) {
    const data = JSON.stringify(msg);
    for (const [id, player] of this.players) {
      if (id === excludeId) continue;
      try {
        player.ws.send(data);
      } catch {}
    }
  }

  private broadcastAll(msg: ServerMessage) {
    this.broadcast(msg);
  }

  // Weapon damage values (mirrored from client)
  private static readonly WEAPON_DAMAGE: Record<string, number> = {
    blaster: 25, shotgun: 15, plasma: 60, rocket: 80,
  };

  private checkPvPHit(
    shooterId: string,
    origin: [number, number, number],
    direction: [number, number, number],
    weapon: string
  ) {
    const HIT_RADIUS = 1.2; // slightly generous for network lag
    const MAX_RANGE = 50;
    const damage = GameRoom.WEAPON_DAMAGE[weapon] || 25;

    const ox = origin[0], oy = origin[1], oz = origin[2];
    const dx = direction[0], dy = direction[1], dz = direction[2];
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const ndx = dx / len, ndy = dy / len, ndz = dz / len;

    for (const [targetId, target] of this.players) {
      if (targetId === shooterId) continue;
      if (!target.info.alive) continue;

      const px = target.info.position[0] - ox;
      const py = target.info.position[1] - oy;
      const pz = target.info.position[2] - oz;

      // Project target position onto ray
      const t = px * ndx + py * ndy + pz * ndz;
      if (t < 0 || t > MAX_RANGE) continue;

      // Distance from ray
      const cx = ox + ndx * t - target.info.position[0];
      const cy = oy + ndy * t - target.info.position[1];
      const cz = oz + ndz * t - target.info.position[2];
      const distSq = cx * cx + cy * cy + cz * cz;

      if (distSq < HIT_RADIUS * HIT_RADIUS) {
        target.info.health = Math.max(0, target.info.health - damage);
        this.broadcastAll({
          type: "playerDamage",
          playerId: targetId,
          health: target.info.health,
          attackerId: shooterId,
        });

        if (target.info.health <= 0) {
          target.info.alive = false;
          target.info.deaths++;
          const shooter = this.players.get(shooterId);
          if (shooter) {
            shooter.info.kills++;
            shooter.info.score += 100;
          }
          this.broadcastAll({
            type: "playerDeath",
            playerId: targetId,
            killerId: shooterId,
          });

          // Auto-respawn after 3 seconds
          setTimeout(() => {
            if (!this.players.has(targetId)) return;
            const spawnPoints: [number, number, number][] = [
              [0, 2, 5], [0, 2, -5], [5, 2, 0], [-5, 2, 0],
            ];
            const spawn = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
            target.info.alive = true;
            target.info.health = 100;
            target.info.position = spawn;
            this.broadcastAll({
              type: "playerRespawn",
              playerId: targetId,
              position: spawn,
            });
          }, 3000);
        }
        break; // Only hit one player per shot (except shotgun would need per-pellet)
      }
    }
  }

  private getAllPlayerInfos(): PlayerInfo[] {
    return Array.from(this.players.values()).map((p) => p.info);
  }
}

// ── Worker entry point ───────────────────────────────────

interface Env {
  GAME_ROOMS: DurableObjectNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Upgrade, Connection",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // POST /create — create a new room
    if (url.pathname === "/create" && request.method === "POST") {
      const roomId = env.GAME_ROOMS.newUniqueId();
      const room = env.GAME_ROOMS.get(roomId);
      const info = await room.fetch(new Request(url.origin + "/info"));
      const data = await info.json();
      return new Response(
        JSON.stringify({ roomId: roomId.toString(), ...(data as object) }),
        { headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // GET /join/:roomId — WebSocket upgrade to join a room
    const joinMatch = url.pathname.match(/^\/join\/(.+)$/);
    if (joinMatch) {
      const roomId = env.GAME_ROOMS.idFromString(joinMatch[1]);
      const room = env.GAME_ROOMS.get(roomId);
      return room.fetch(request);
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders });
  },
};
