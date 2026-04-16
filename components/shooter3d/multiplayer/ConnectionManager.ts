"use client";

import type { ClientMessage, ServerMessage, PlayerInfo, RoomState } from "./protocol";

export type ConnectionState = "disconnected" | "connecting" | "connected" | "error";

export interface RoomInfo {
  roomCode: string;
  roomId: string;
  players: PlayerInfo[];
  hostId: string;
  state: RoomState;
  localPlayerId: string;
}

export interface ConnectionCallbacks {
  onStateChange: (state: ConnectionState) => void;
  onRoomInfo: (info: RoomInfo) => void;
  onPlayerJoined: (player: PlayerInfo) => void;
  onPlayerLeft: (playerId: string) => void;
  onPlayerUpdate: (playerId: string, position: [number, number, number], rotation: [number, number], weapon: string) => void;
  onPlayerShoot: (playerId: string, origin: [number, number, number], direction: [number, number, number], weapon: string) => void;
  onPlayerDamage: (playerId: string, health: number, attackerId: string) => void;
  onPlayerDeath: (playerId: string, killerId: string) => void;
  onPlayerRespawn: (playerId: string, position: [number, number, number]) => void;
  onGameStart: (mode: string, mapId?: string) => void;
  onChat: (playerId: string, name: string, text: string) => void;
  onEnemySync: (enemies: import("./protocol").EnemySyncData[]) => void;
  onEnemyDamage: (enemyId: number, hp: number, killerId?: string) => void;
  onError: (message: string) => void;
}

const WORKER_URL = process.env.NEXT_PUBLIC_MULTIPLAYER_URL || "http://localhost:8787";
const SEND_RATE = 50; // ms between position updates (20Hz)

export class ConnectionManager {
  private ws: WebSocket | null = null;
  private callbacks: ConnectionCallbacks;
  private state: ConnectionState = "disconnected";
  private roomId: string = "";
  private roomCode: string = "";
  private localPlayerId: string = "";
  private sendTimer: ReturnType<typeof setInterval> | null = null;
  private pendingState: ClientMessage | null = null;

  constructor(callbacks: ConnectionCallbacks) {
    this.callbacks = callbacks;
  }

  async createRoom(playerName: string): Promise<string> {
    this.setState("connecting");
    try {
      const res = await fetch(`${WORKER_URL}/create`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to create room");
      const data = await res.json() as { roomId: string; roomCode: string };
      this.roomId = data.roomId;
      this.roomCode = data.roomCode;
      this.connect(playerName);
      return data.roomCode;
    } catch (e) {
      this.setState("error");
      throw e;
    }
  }

  joinRoom(roomId: string, playerName: string) {
    this.roomId = roomId;
    this.setState("connecting");
    this.connect(playerName);
  }

  private connect(playerName: string) {
    const wsUrl = `${WORKER_URL.replace("http", "ws")}/join/${this.roomId}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.setState("connected");
      this.send({ type: "join", name: playerName });
      this.startSendLoop();
    };

    this.ws.onmessage = (event) => {
      try {
        const msg: ServerMessage = JSON.parse(event.data);
        this.handleServerMessage(msg);
      } catch {}
    };

    this.ws.onclose = () => {
      this.setState("disconnected");
      this.stopSendLoop();
    };

    this.ws.onerror = () => {
      this.setState("error");
      this.stopSendLoop();
    };
  }

  disconnect() {
    if (this.ws) {
      this.send({ type: "leave" });
      this.ws.close();
      this.ws = null;
    }
    this.stopSendLoop();
    this.setState("disconnected");
  }

  // Queue a position update to be sent at the next tick
  queuePlayerState(position: [number, number, number], rotation: [number, number], weapon: string) {
    this.pendingState = { type: "playerState", position, rotation, weapon };
  }

  sendShoot(origin: [number, number, number], direction: [number, number, number], weapon: string) {
    this.send({ type: "shoot", origin, direction, weapon });
  }

  sendStartGame(mode: "coop-waves" | "coop-maps" | "deathmatch", mapId?: string) {
    this.send({ type: "startGame", mode, mapId });
  }

  sendChat(text: string) {
    this.send({ type: "chat", text });
  }

  sendEnemySync(enemies: import("./protocol").EnemySyncData[]) {
    this.send({ type: "enemySync", enemies });
  }

  sendEnemyDamage(enemyId: number, damage: number) {
    this.send({ type: "enemyDamage", enemyId, damage });
  }

  getState(): ConnectionState {
    return this.state;
  }

  getRoomCode(): string {
    return this.roomCode;
  }

  getLocalPlayerId(): string {
    return this.localPlayerId;
  }

  private send(msg: ClientMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private startSendLoop() {
    this.sendTimer = setInterval(() => {
      if (this.pendingState) {
        this.send(this.pendingState);
        this.pendingState = null;
      }
    }, SEND_RATE);
  }

  private stopSendLoop() {
    if (this.sendTimer) {
      clearInterval(this.sendTimer);
      this.sendTimer = null;
    }
  }

  private setState(state: ConnectionState) {
    this.state = state;
    this.callbacks.onStateChange(state);
  }

  private handleServerMessage(msg: ServerMessage) {
    switch (msg.type) {
      case "roomInfo":
        this.roomCode = msg.roomCode;
        this.localPlayerId = msg.players[msg.players.length - 1]?.id || "";
        this.callbacks.onRoomInfo({
          roomCode: msg.roomCode,
          roomId: this.roomId,
          players: msg.players,
          hostId: msg.hostId,
          state: msg.state,
          localPlayerId: this.localPlayerId,
        });
        break;
      case "playerJoined":
        this.callbacks.onPlayerJoined(msg.player);
        break;
      case "playerLeft":
        this.callbacks.onPlayerLeft(msg.playerId);
        break;
      case "playerUpdate":
        this.callbacks.onPlayerUpdate(msg.playerId, msg.position, msg.rotation, msg.weapon);
        break;
      case "playerShoot":
        this.callbacks.onPlayerShoot(msg.playerId, msg.origin, msg.direction, msg.weapon);
        break;
      case "playerDamage":
        this.callbacks.onPlayerDamage(msg.playerId, msg.health, msg.attackerId);
        break;
      case "playerDeath":
        this.callbacks.onPlayerDeath(msg.playerId, msg.killerId);
        break;
      case "playerRespawn":
        this.callbacks.onPlayerRespawn(msg.playerId, msg.position);
        break;
      case "gameStart":
        this.callbacks.onGameStart(msg.mode, msg.mapId);
        break;
      case "enemySync":
        this.callbacks.onEnemySync(msg.enemies);
        break;
      case "enemyDamage":
        this.callbacks.onEnemyDamage(msg.enemyId, msg.hp, msg.killerId);
        break;
      case "chat":
        this.callbacks.onChat(msg.playerId, msg.name, msg.text);
        break;
      case "error":
        this.callbacks.onError(msg.message);
        break;
    }
  }
}
