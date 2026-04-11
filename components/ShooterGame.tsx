"use client";

import { useEffect, useState, useRef, useCallback } from "react";

// ── Canvas / Display ────────────────────────────────────────────────
const W = 800;
const H = 450;
const NUM_RAYS = W; // one ray per screen column

// ── Map ─────────────────────────────────────────────────────────────
const MAP_W = 24;
const MAP_H = 24;
// 0=empty, 1=concrete, 2=tech panel, 3=red metal, 4=pillar, 5=neon accent
// prettier-ignore
const WORLD_MAP: number[][] = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,2,2,0,0,0,0,0,4,0,0,0,4,0,0,0,0,2,2,0,0,1],
  [1,0,0,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,3,3,0,0,0,0,0,0,3,3,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,4,0,0,0,4,0,0,0,0,0,0,0,0,1],
  [1,0,0,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5],
  [1,0,0,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,4,0,0,0,4,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,3,3,0,0,0,0,0,0,3,3,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,0,0,1],
  [1,0,0,2,2,0,0,0,0,0,4,0,0,0,4,0,0,0,0,2,2,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,5,5,1,1,1,1,1,1,1,1,1,1],
];

// Wall colors by type [NS face, EW face]
const WALL_COLORS: Record<number, [string, string]> = {
  1: ["#556677", "#445566"], // concrete
  2: ["#336699", "#2255aa"], // tech panel
  3: ["#993333", "#772222"], // red metal
  4: ["#888888", "#777777"], // pillar
  5: ["#00ffcc", "#00cc99"], // neon accent
};

// ── Player constants ────────────────────────────────────────────────
const MOVE_SPEED = 0.06;
const ROT_SPEED = 0.04; // keyboard rotation
const MOUSE_SENS = 0.002;
const COLLISION_MARGIN = 0.2;
const MAX_RENDER_DIST = 20;
const FOV = Math.PI / 3; // 60 degrees

// ── Weapon definitions ──────────────────────────────────────────────
interface WeaponDef {
  name: string;
  damage: number;
  fireRate: number; // frames between shots
  spread: number; // radians
  pellets: number;
  maxAmmo: number; // 0 = infinite
  color: string;
}
const WEAPONS: WeaponDef[] = [
  { name: "Pulse Pistol", damage: 15, fireRate: 12, spread: 0, pellets: 1, maxAmmo: 0, color: "#ffff00" },
  { name: "Scatter Gun", damage: 12, fireRate: 40, spread: 0.12, pellets: 6, maxAmmo: 50, color: "#ff8800" },
  { name: "Plasma Rifle", damage: 25, fireRate: 8, spread: 0.02, pellets: 1, maxAmmo: 100, color: "#00ffff" },
];

// ── Monster definitions ─────────────────────────────────────────────
type MonsterType = "imp" | "demon" | "trooper" | "overlord";
interface MonsterDef {
  type: MonsterType;
  hp: number;
  speed: number;
  damage: number;
  range: number;
  points: number;
  color: string;
  size: number; // sprite size multiplier
  attackCooldown: number;
  melee: boolean;
}
const MONSTER_DEFS: Record<MonsterType, MonsterDef> = {
  imp: { type: "imp", hp: 40, speed: 1.5, damage: 10, range: 8, points: 100, color: "#44ff44", size: 0.6, attackCooldown: 90, melee: false },
  demon: { type: "demon", hp: 80, speed: 2.0, damage: 25, range: 1.5, points: 250, color: "#ff4444", size: 0.8, attackCooldown: 60, melee: true },
  trooper: { type: "trooper", hp: 60, speed: 1.2, damage: 15, range: 10, points: 200, color: "#4488ff", size: 0.65, attackCooldown: 75, melee: false },
  overlord: { type: "overlord", hp: 300, speed: 0.8, damage: 40, range: 6, points: 1000, color: "#ff00ff", size: 1.2, attackCooldown: 50, melee: false },
};

// ── AI State ────────────────────────────────────────────────────────
type AIState = "idle" | "chase" | "attack" | "hurt" | "dead";

interface Monster {
  x: number;
  y: number;
  type: MonsterType;
  hp: number;
  maxHp: number;
  state: AIState;
  stateTimer: number;
  attackCooldown: number;
  hurtTimer: number;
  deathTimer: number;
  speed: number;
  def: MonsterDef;
}

// ── Particle ────────────────────────────────────────────────────────
interface Particle {
  x: number;
  y: number;
  z: number; // height
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

// ── Game State ──────────────────────────────────────────────────────
interface FPSGameState {
  // Player
  posX: number;
  posY: number;
  dirX: number;
  dirY: number;
  planeX: number;
  planeY: number;
  hp: number;
  armor: number;
  // Weapons
  currentWeapon: number;
  ammo: number[];
  fireCooldown: number;
  muzzleFlash: number;
  weaponBob: number;
  weaponRecoil: number;
  // Enemies
  monsters: Monster[];
  // Particles
  particles: Particle[];
  // Wave
  wave: number;
  score: number;
  enemiesRemaining: number;
  waveAnnounce: number;
  // Effects
  damageFlash: number;
  shakeX: number;
  shakeY: number;
  // Phase
  phase: "playing" | "waveAnnounce" | "dead";
}

interface InputState {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
  rotLeft: boolean;
  rotRight: boolean;
  shooting: boolean;
  mouseMovX: number;
}

// ── Helper functions ────────────────────────────────────────────────
function isWall(x: number, y: number): boolean {
  const mx = Math.floor(x);
  const my = Math.floor(y);
  if (mx < 0 || mx >= MAP_W || my < 0 || my >= MAP_H) return true;
  return WORLD_MAP[my][mx] !== 0;
}

function distSq(x1: number, y1: number, x2: number, y2: number): number {
  return (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

// DDA line-of-sight check: returns true if clear path from (x0,y0) to (x1,y1)
function hasLineOfSight(x0: number, y0: number, x1: number, y1: number): boolean {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 0.01) return true;
  const rdx = dx / dist;
  const rdy = dy / dist;

  let mapX = Math.floor(x0);
  let mapY = Math.floor(y0);
  const stepX = rdx < 0 ? -1 : 1;
  const stepY = rdy < 0 ? -1 : 1;
  let sideDistX = rdx === 0 ? 1e30 : (rdx < 0 ? (x0 - mapX) : (mapX + 1 - x0)) / Math.abs(rdx);
  let sideDistY = rdy === 0 ? 1e30 : (rdy < 0 ? (y0 - mapY) : (mapY + 1 - y0)) / Math.abs(rdy);
  const deltaDistX = rdx === 0 ? 1e30 : 1 / Math.abs(rdx);
  const deltaDistY = rdy === 0 ? 1e30 : 1 / Math.abs(rdy);

  for (let i = 0; i < 100; i++) {
    if (sideDistX < sideDistY) {
      sideDistX += deltaDistX;
      mapX += stepX;
    } else {
      sideDistY += deltaDistY;
      mapY += stepY;
    }
    const traveled = Math.min(sideDistX - deltaDistX, sideDistY - deltaDistY);
    if (traveled >= dist - 0.1) return true;
    if (mapX < 0 || mapX >= MAP_W || mapY < 0 || mapY >= MAP_H) return false;
    if (WORLD_MAP[mapY][mapX] !== 0) return false;
  }
  return false;
}

// Cast a single ray, return { dist, monsterHit } for hitscan weapon
function hitscanRay(
  ox: number, oy: number, rdx: number, rdy: number,
  monsters: Monster[]
): { dist: number; monsterIdx: number } {
  let mapX = Math.floor(ox);
  let mapY = Math.floor(oy);
  const stepX = rdx < 0 ? -1 : 1;
  const stepY = rdy < 0 ? -1 : 1;
  const deltaDistX = rdx === 0 ? 1e30 : Math.abs(1 / rdx);
  const deltaDistY = rdy === 0 ? 1e30 : Math.abs(1 / rdy);
  let sideDistX = rdx < 0 ? (ox - mapX) * deltaDistX : (mapX + 1 - ox) * deltaDistX;
  let sideDistY = rdy < 0 ? (oy - mapY) * deltaDistY : (mapY + 1 - oy) * deltaDistY;

  let wallDist = MAX_RENDER_DIST;
  for (let i = 0; i < 100; i++) {
    if (sideDistX < sideDistY) {
      sideDistX += deltaDistX;
      mapX += stepX;
    } else {
      sideDistY += deltaDistY;
      mapY += stepY;
    }
    if (mapX < 0 || mapX >= MAP_W || mapY < 0 || mapY >= MAP_H) break;
    if (WORLD_MAP[mapY][mapX] !== 0) {
      wallDist = Math.min(sideDistX - deltaDistX, sideDistY - deltaDistY);
      break;
    }
  }

  // Check monster intersections
  let closestMonster = -1;
  let closestDist = wallDist;
  for (let m = 0; m < monsters.length; m++) {
    const mon = monsters[m];
    if (mon.state === "dead") continue;
    const dx = mon.x - ox;
    const dy = mon.y - oy;
    // Project monster center onto ray
    const dot = dx * rdx + dy * rdy;
    if (dot <= 0) continue;
    // Perpendicular distance from monster center to ray
    const perpDist = Math.abs(dx * rdy - dy * rdx);
    const hitRadius = mon.def.size * 0.35;
    if (perpDist < hitRadius && dot < closestDist) {
      closestDist = dot;
      closestMonster = m;
    }
  }
  return { dist: closestDist, monsterIdx: closestMonster };
}

// ── Component ───────────────────────────────────────────────────────
interface ShooterGameProps {
  onScoreSubmit: (name: string, score: number) => Promise<string | null>;
}

export default function ShooterGame({ onScoreSubmit }: ShooterGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<FPSGameState | null>(null);
  const inputRef = useRef<InputState>({
    forward: false, back: false, left: false, right: false,
    rotLeft: false, rotRight: false, shooting: false, mouseMovX: 0,
  });
  const animRef = useRef<number>(0);
  const pointerLocked = useRef(false);
  const zBuffer = useRef<Float64Array>(new Float64Array(W));

  const [gamePhase, setGamePhase] = useState<"start" | "playing" | "gameover">("start");
  const [displayScore, setDisplayScore] = useState(0);
  const [displayWave, setDisplayWave] = useState(1);
  const [displayHp, setDisplayHp] = useState(100);
  const [isMobile, setIsMobile] = useState(false);

  // Score submission state
  const [submitName, setSubmitName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Mobile detection
  useEffect(() => {
    const check = () => {
      setIsMobile(
        /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(
          navigator.userAgent
        ) || (window.innerWidth < 800 && "ontouchstart" in window)
      );
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ── Create initial game state ───────────────────────────────────
  const createGameState = useCallback((): FPSGameState => {
    return {
      posX: 12, posY: 12,
      dirX: -1, dirY: 0,
      planeX: 0, planeY: 0.66, // FOV ~66 degrees
      hp: 100, armor: 0,
      currentWeapon: 0,
      ammo: [Infinity, 50, 100],
      fireCooldown: 0,
      muzzleFlash: 0,
      weaponBob: 0,
      weaponRecoil: 0,
      monsters: [],
      particles: [],
      wave: 0,
      score: 0,
      enemiesRemaining: 0,
      waveAnnounce: 120,
      damageFlash: 0,
      shakeX: 0, shakeY: 0,
      phase: "waveAnnounce",
    };
  }, []);

  // ── Spawn wave ────────────────────────────────────────────────────
  const spawnWave = useCallback((gs: FPSGameState) => {
    gs.wave++;
    const count = 3 + Math.floor(gs.wave * 1.5);
    const isBoss = gs.wave % 5 === 0;
    const hpScale = 1 + (gs.wave - 1) * 0.15;
    const newMonsters: Monster[] = [];

    for (let i = 0; i < count; i++) {
      let type: MonsterType;
      if (isBoss && i === 0) {
        type = "overlord";
      } else {
        const r = Math.random();
        type = r < 0.4 ? "imp" : r < 0.7 ? "demon" : "trooper";
      }
      const def = MONSTER_DEFS[type];

      // Find spawn position >6 tiles from player
      let sx = 0, sy = 0;
      for (let attempt = 0; attempt < 100; attempt++) {
        sx = 1.5 + Math.random() * (MAP_W - 3);
        sy = 1.5 + Math.random() * (MAP_H - 3);
        if (!isWall(sx, sy) && distSq(sx, sy, gs.posX, gs.posY) > 36) break;
      }

      newMonsters.push({
        x: sx, y: sy, type,
        hp: Math.round(def.hp * hpScale),
        maxHp: Math.round(def.hp * hpScale),
        state: "idle",
        stateTimer: 30 + Math.random() * 60,
        attackCooldown: def.attackCooldown,
        hurtTimer: 0,
        deathTimer: 0,
        speed: def.speed,
        def,
      });
    }

    gs.monsters = newMonsters;
    gs.enemiesRemaining = count;
    gs.waveAnnounce = 120;
    gs.phase = "waveAnnounce";
  }, []);

  // ── Hitscan fire ──────────────────────────────────────────────────
  const fireWeapon = useCallback((gs: FPSGameState) => {
    const wep = WEAPONS[gs.currentWeapon];
    if (gs.fireCooldown > 0) return;
    if (wep.maxAmmo > 0 && gs.ammo[gs.currentWeapon] <= 0) return;

    gs.fireCooldown = wep.fireRate;
    if (wep.maxAmmo > 0) gs.ammo[gs.currentWeapon]--;
    gs.muzzleFlash = 6;
    gs.weaponRecoil = 8;
    gs.shakeX += (Math.random() - 0.5) * 2;
    gs.shakeY += (Math.random() - 0.5) * 2;

    for (let p = 0; p < wep.pellets; p++) {
      const angle = Math.atan2(gs.dirY, gs.dirX) + (Math.random() - 0.5) * wep.spread;
      const rdx = Math.cos(angle);
      const rdy = Math.sin(angle);
      const hit = hitscanRay(gs.posX, gs.posY, rdx, rdy, gs.monsters);

      if (hit.monsterIdx >= 0) {
        const mon = gs.monsters[hit.monsterIdx];
        mon.hp -= wep.damage;
        mon.hurtTimer = 10;
        mon.state = "hurt";
        mon.stateTimer = 10;

        // Hit particles
        for (let j = 0; j < 5; j++) {
          gs.particles.push({
            x: mon.x, y: mon.y, z: 0.3 + Math.random() * 0.4,
            vx: (Math.random() - 0.5) * 0.05,
            vy: (Math.random() - 0.5) * 0.05,
            vz: Math.random() * 0.02,
            life: 20 + Math.random() * 15,
            maxLife: 35,
            color: mon.def.color,
            size: 3,
          });
        }

        if (mon.hp <= 0) {
          mon.state = "dead";
          mon.deathTimer = 45;
          gs.score += mon.def.points;
          gs.enemiesRemaining--;
          // Ammo drop 30%
          if (Math.random() < 0.3) {
            const wpIdx = 1 + Math.floor(Math.random() * 2);
            gs.ammo[wpIdx] = Math.min(gs.ammo[wpIdx] + 15, WEAPONS[wpIdx].maxAmmo);
          }
          // Death particles
          for (let j = 0; j < 10; j++) {
            gs.particles.push({
              x: mon.x, y: mon.y, z: 0.1 + Math.random() * 0.5,
              vx: (Math.random() - 0.5) * 0.08,
              vy: (Math.random() - 0.5) * 0.08,
              vz: Math.random() * 0.04,
              life: 30 + Math.random() * 20,
              maxLife: 50,
              color: mon.def.color,
              size: 4,
            });
          }
        }
      } else {
        // Wall hit spark
        const hx = gs.posX + rdx * hit.dist * 0.98;
        const hy = gs.posY + rdy * hit.dist * 0.98;
        for (let j = 0; j < 3; j++) {
          gs.particles.push({
            x: hx, y: hy, z: 0.3 + Math.random() * 0.4,
            vx: (Math.random() - 0.5) * 0.03,
            vy: (Math.random() - 0.5) * 0.03,
            vz: Math.random() * 0.01,
            life: 10 + Math.random() * 10,
            maxLife: 20,
            color: "#ffaa44",
            size: 2,
          });
        }
      }
    }
  }, []);

  // ── Start game ────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    const gs = createGameState();
    gameRef.current = gs;
    spawnWave(gs);
    setGamePhase("playing");
    setDisplayScore(0);
    setDisplayWave(1);
    setDisplayHp(100);
    setSubmitted(false);
    setSubmitting(false);
    setSubmitError(null);
    setSubmitName("");
    // Request pointer lock
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.requestPointerLock?.();
    }
  }, [createGameState, spawnWave]);

  // ── Score submit ──────────────────────────────────────────────────
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const name = submitName.trim();
      if (!name) return;
      setSubmitting(true);
      setSubmitError(null);
      const err = await onScoreSubmit(name, displayScore);
      if (err) {
        setSubmitError(err);
        setSubmitting(false);
      } else {
        setSubmitted(true);
        setSubmitting(false);
      }
    },
    [submitName, displayScore, onScoreSubmit]
  );

  // ── Main game loop ────────────────────────────────────────────────
  useEffect(() => {
    if (gamePhase !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Input handlers
    const onKeyDown = (e: KeyboardEvent) => {
      const inp = inputRef.current;
      switch (e.code) {
        case "KeyW": case "ArrowUp": inp.forward = true; break;
        case "KeyS": case "ArrowDown": inp.back = true; break;
        case "KeyA": inp.left = true; break;
        case "KeyD": inp.right = true; break;
        case "ArrowLeft": inp.rotLeft = true; break;
        case "ArrowRight": inp.rotRight = true; break;
        case "Digit1": if (gameRef.current) gameRef.current.currentWeapon = 0; break;
        case "Digit2": if (gameRef.current) gameRef.current.currentWeapon = 1; break;
        case "Digit3": if (gameRef.current) gameRef.current.currentWeapon = 2; break;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const inp = inputRef.current;
      switch (e.code) {
        case "KeyW": case "ArrowUp": inp.forward = false; break;
        case "KeyS": case "ArrowDown": inp.back = false; break;
        case "KeyA": inp.left = false; break;
        case "KeyD": inp.right = false; break;
        case "ArrowLeft": inp.rotLeft = false; break;
        case "ArrowRight": inp.rotRight = false; break;
      }
    };
    const onMouseMove = (e: MouseEvent) => {
      if (pointerLocked.current) {
        inputRef.current.mouseMovX += e.movementX;
      }
    };
    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        inputRef.current.shooting = true;
        // Try to acquire pointer lock on click
        if (!pointerLocked.current) {
          canvas.requestPointerLock?.();
        }
      }
    };
    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 0) inputRef.current.shooting = false;
    };
    const onWheel = (e: WheelEvent) => {
      if (!gameRef.current) return;
      const dir = e.deltaY > 0 ? 1 : -1;
      gameRef.current.currentWeapon = ((gameRef.current.currentWeapon + dir) % 3 + 3) % 3;
    };
    const onPointerLockChange = () => {
      pointerLocked.current = document.pointerLockElement === canvas;
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    document.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("wheel", onWheel);
    document.addEventListener("pointerlockchange", onPointerLockChange);

    // ── Game tick ────────────────────────────────────────────────
    const tick = () => {
      const gs = gameRef.current;
      if (!gs) return;
      const inp = inputRef.current;

      // ── Mouse rotation ────────────────────────────────────────
      if (inp.mouseMovX !== 0) {
        const rotAmount = -inp.mouseMovX * MOUSE_SENS;
        const cos = Math.cos(rotAmount);
        const sin = Math.sin(rotAmount);
        const odx = gs.dirX, ody = gs.dirY;
        gs.dirX = odx * cos - ody * sin;
        gs.dirY = odx * sin + ody * cos;
        const opx = gs.planeX, opy = gs.planeY;
        gs.planeX = opx * cos - opy * sin;
        gs.planeY = opx * sin + opy * cos;
        inp.mouseMovX = 0;
      }

      // Keyboard rotation
      if (inp.rotLeft || inp.rotRight) {
        const rotAmount = inp.rotLeft ? ROT_SPEED : -ROT_SPEED;
        const cos = Math.cos(rotAmount);
        const sin = Math.sin(rotAmount);
        const odx = gs.dirX, ody = gs.dirY;
        gs.dirX = odx * cos - ody * sin;
        gs.dirY = odx * sin + ody * cos;
        const opx = gs.planeX, opy = gs.planeY;
        gs.planeX = opx * cos - opy * sin;
        gs.planeY = opx * sin + opy * cos;
      }

      // ── Movement with wall collision ──────────────────────────
      if (gs.phase !== "dead") {
        let moveX = 0, moveY = 0;
        if (inp.forward) { moveX += gs.dirX * MOVE_SPEED; moveY += gs.dirY * MOVE_SPEED; }
        if (inp.back) { moveX -= gs.dirX * MOVE_SPEED; moveY -= gs.dirY * MOVE_SPEED; }
        if (inp.left) {
          moveX += gs.dirY * MOVE_SPEED;
          moveY -= gs.dirX * MOVE_SPEED;
        }
        if (inp.right) {
          moveX -= gs.dirY * MOVE_SPEED;
          moveY += gs.dirX * MOVE_SPEED;
        }
        // Separate X/Y collision for wall sliding
        if (!isWall(gs.posX + moveX + Math.sign(moveX) * COLLISION_MARGIN, gs.posY)) {
          gs.posX += moveX;
        }
        if (!isWall(gs.posX, gs.posY + moveY + Math.sign(moveY) * COLLISION_MARGIN)) {
          gs.posY += moveY;
        }
      }

      // Weapon bob
      if (inp.forward || inp.back || inp.left || inp.right) {
        gs.weaponBob += 0.12;
      }

      // ── Wave announce countdown ───────────────────────────────
      if (gs.phase === "waveAnnounce") {
        gs.waveAnnounce--;
        if (gs.waveAnnounce <= 0) {
          gs.phase = "playing";
        }
      }

      // ── Weapon firing ─────────────────────────────────────────
      if (gs.fireCooldown > 0) gs.fireCooldown--;
      if (gs.weaponRecoil > 0) gs.weaponRecoil *= 0.75;
      if (gs.muzzleFlash > 0) gs.muzzleFlash--;
      if (inp.shooting && gs.phase === "playing") {
        fireWeapon(gs);
      }

      // ── Monster AI ────────────────────────────────────────────
      for (let i = 0; i < gs.monsters.length; i++) {
        const mon = gs.monsters[i];
        if (mon.state === "dead") {
          mon.deathTimer--;
          continue;
        }

        if (mon.hurtTimer > 0) mon.hurtTimer--;

        const dx = gs.posX - mon.x;
        const dy = gs.posY - mon.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const ndx = dist > 0.01 ? dx / dist : 0;
        const ndy = dist > 0.01 ? dy / dist : 0;

        mon.stateTimer--;
        mon.attackCooldown--;

        switch (mon.state) {
          case "idle":
            if (dist < 12) {
              mon.state = "chase";
              mon.stateTimer = 60;
            }
            break;

          case "hurt":
            if (mon.stateTimer <= 0) {
              mon.state = "chase";
              mon.stateTimer = 30;
            }
            break;

          case "chase": {
            // Move toward player
            const spd = mon.speed * 0.02;
            const newX = mon.x + ndx * spd;
            const newY = mon.y + ndy * spd;
            if (!isWall(newX, mon.y)) mon.x = newX;
            if (!isWall(mon.x, newY)) mon.y = newY;

            // Attack if in range
            if (dist < mon.def.range && mon.attackCooldown <= 0) {
              if (mon.def.melee || hasLineOfSight(mon.x, mon.y, gs.posX, gs.posY)) {
                mon.state = "attack";
                mon.stateTimer = 15;
              }
            }
            break;
          }

          case "attack": {
            if (mon.stateTimer <= 0) {
              // Deal damage
              if (mon.def.melee) {
                if (dist < mon.def.range + 0.5) {
                  const dmg = mon.def.damage;
                  if (gs.armor > 0) {
                    const absorbed = Math.min(gs.armor, Math.floor(dmg * 0.5));
                    gs.armor -= absorbed;
                    gs.hp -= (dmg - absorbed);
                  } else {
                    gs.hp -= dmg;
                  }
                  gs.damageFlash = 10;
                  gs.shakeX += (Math.random() - 0.5) * 6;
                  gs.shakeY += (Math.random() - 0.5) * 6;
                }
              } else {
                // Ranged attack - check LOS
                if (hasLineOfSight(mon.x, mon.y, gs.posX, gs.posY)) {
                  // Overlord spread fire
                  const shots = mon.type === "overlord" ? 3 : 1;
                  for (let s = 0; s < shots; s++) {
                    const accuracy = mon.type === "trooper" ? 0.05 : 0.15;
                    const offX = (Math.random() - 0.5) * accuracy;
                    const offY = (Math.random() - 0.5) * accuracy;
                    const hitChance = mon.type === "trooper" ? 0.7 : 0.5;
                    if (Math.random() < hitChance) {
                      const dmg = mon.def.damage;
                      if (gs.armor > 0) {
                        const absorbed = Math.min(gs.armor, Math.floor(dmg * 0.5));
                        gs.armor -= absorbed;
                        gs.hp -= (dmg - absorbed);
                      } else {
                        gs.hp -= dmg;
                      }
                      gs.damageFlash = 8;
                      gs.shakeX += (Math.random() - 0.5) * 4;
                      gs.shakeY += (Math.random() - 0.5) * 4;
                    }
                    // Projectile particle for visual feedback
                    gs.particles.push({
                      x: mon.x, y: mon.y, z: 0.4,
                      vx: (ndx + offX) * 0.2,
                      vy: (ndy + offY) * 0.2,
                      vz: 0,
                      life: 15, maxLife: 15,
                      color: mon.def.color,
                      size: 4,
                    });
                  }
                }
              }
              mon.attackCooldown = mon.def.attackCooldown;
              mon.state = "chase";
              mon.stateTimer = 30;
            }
            break;
          }
        }
      }

      // Remove dead monsters whose death animation is done
      gs.monsters = gs.monsters.filter(m => !(m.state === "dead" && m.deathTimer <= 0));

      // ── Particles ─────────────────────────────────────────────
      for (let i = gs.particles.length - 1; i >= 0; i--) {
        const p = gs.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.z += p.vz;
        p.life--;
        if (p.life <= 0) gs.particles.splice(i, 1);
      }
      if (gs.particles.length > 200) gs.particles.splice(0, gs.particles.length - 200);

      // ── Damage flash / shake decay ────────────────────────────
      if (gs.damageFlash > 0) gs.damageFlash--;
      gs.shakeX *= 0.8;
      gs.shakeY *= 0.8;

      // ── Check death ───────────────────────────────────────────
      if (gs.hp <= 0 && gs.phase !== "dead") {
        gs.hp = 0;
        gs.phase = "dead";
        setTimeout(() => {
          setGamePhase("gameover");
          document.exitPointerLock?.();
        }, 1500);
      }

      // ── Check wave complete ───────────────────────────────────
      if (gs.phase === "playing" && gs.enemiesRemaining <= 0 && gs.monsters.length === 0) {
        gs.score += gs.wave * 250;
        // Armor bonus each wave
        gs.armor = Math.min(gs.armor + 15, 100);
        spawnWave(gs);
      }

      // ── Update React state ────────────────────────────────────
      setDisplayScore(gs.score);
      setDisplayWave(gs.wave);
      setDisplayHp(gs.hp);

      // ═══════════════════════════════════════════════════════════
      // ── RENDER ────────────────────────────────────────────────
      // ═══════════════════════════════════════════════════════════
      ctx.save();
      ctx.translate(Math.round(gs.shakeX), Math.round(gs.shakeY));

      // ── Ceiling & Floor gradients ─────────────────────────────
      // Ceiling
      const ceilGrad = ctx.createLinearGradient(0, 0, 0, H / 2);
      ceilGrad.addColorStop(0, "#111122");
      ceilGrad.addColorStop(1, "#222244");
      ctx.fillStyle = ceilGrad;
      ctx.fillRect(0, 0, W, H / 2);
      // Floor
      const floorGrad = ctx.createLinearGradient(0, H / 2, 0, H);
      floorGrad.addColorStop(0, "#333333");
      floorGrad.addColorStop(1, "#111111");
      ctx.fillStyle = floorGrad;
      ctx.fillRect(0, H / 2, W, H / 2);

      // ── Raycasting (DDA) ──────────────────────────────────────
      const zBuf = zBuffer.current;
      for (let x = 0; x < NUM_RAYS; x++) {
        const cameraX = 2 * x / W - 1;
        const rayDirX = gs.dirX + gs.planeX * cameraX;
        const rayDirY = gs.dirY + gs.planeY * cameraX;

        let mapX = Math.floor(gs.posX);
        let mapY = Math.floor(gs.posY);

        const deltaDistX = rayDirX === 0 ? 1e30 : Math.abs(1 / rayDirX);
        const deltaDistY = rayDirY === 0 ? 1e30 : Math.abs(1 / rayDirY);

        let stepX: number, stepY: number;
        let sideDistX: number, sideDistY: number;

        if (rayDirX < 0) {
          stepX = -1;
          sideDistX = (gs.posX - mapX) * deltaDistX;
        } else {
          stepX = 1;
          sideDistX = (mapX + 1 - gs.posX) * deltaDistX;
        }
        if (rayDirY < 0) {
          stepY = -1;
          sideDistY = (gs.posY - mapY) * deltaDistY;
        } else {
          stepY = 1;
          sideDistY = (mapY + 1 - gs.posY) * deltaDistY;
        }

        let side = 0;
        let hit = false;
        for (let i = 0; i < 64; i++) {
          if (sideDistX < sideDistY) {
            sideDistX += deltaDistX;
            mapX += stepX;
            side = 0;
          } else {
            sideDistY += deltaDistY;
            mapY += stepY;
            side = 1;
          }
          if (mapX < 0 || mapX >= MAP_W || mapY < 0 || mapY >= MAP_H) break;
          if (WORLD_MAP[mapY][mapX] > 0) {
            hit = true;
            break;
          }
        }

        if (!hit) { zBuf[x] = MAX_RENDER_DIST; continue; }

        const perpDist = side === 0
          ? (mapX - gs.posX + (1 - stepX) / 2) / rayDirX
          : (mapY - gs.posY + (1 - stepY) / 2) / rayDirY;

        zBuf[x] = perpDist;

        const lineHeight = Math.floor(H / perpDist);
        const drawStart = Math.max(0, Math.floor(-lineHeight / 2 + H / 2));
        const drawEnd = Math.min(H, Math.floor(lineHeight / 2 + H / 2));

        const wallType = WORLD_MAP[mapY][mapX];
        const colors = WALL_COLORS[wallType] || WALL_COLORS[1];
        const baseColor = side === 0 ? colors[0] : colors[1];

        // Distance fog
        const fogFactor = clamp(perpDist / MAX_RENDER_DIST, 0, 1);
        const r = parseInt(baseColor.slice(1, 3), 16);
        const g = parseInt(baseColor.slice(3, 5), 16);
        const b = parseInt(baseColor.slice(5, 7), 16);
        const fr = Math.round(r * (1 - fogFactor));
        const fg = Math.round(g * (1 - fogFactor));
        const fb = Math.round(b * (1 - fogFactor));

        ctx.fillStyle = `rgb(${fr},${fg},${fb})`;
        ctx.fillRect(x, drawStart, 1, drawEnd - drawStart);
      }

      // ── Sprite rendering (monsters + particles) ───────────────
      // Collect all drawable sprites
      interface SpriteEntry {
        x: number; y: number; z: number;
        dist: number;
        color: string;
        size: number;
        alpha: number;
        isMonster: boolean;
        monsterIdx: number;
        hurtFlash: boolean;
      }
      const sprites: SpriteEntry[] = [];

      for (let i = 0; i < gs.monsters.length; i++) {
        const mon = gs.monsters[i];
        const dx = mon.x - gs.posX;
        const dy = mon.y - gs.posY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const alpha = mon.state === "dead" ? clamp(mon.deathTimer / 30, 0, 1) : 1;
        sprites.push({
          x: mon.x, y: mon.y, z: 0, dist,
          color: mon.def.color,
          size: mon.def.size,
          alpha,
          isMonster: true,
          monsterIdx: i,
          hurtFlash: mon.hurtTimer > 0,
        });
      }

      for (const p of gs.particles) {
        const dx = p.x - gs.posX;
        const dy = p.y - gs.posY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        sprites.push({
          x: p.x, y: p.y, z: p.z, dist,
          color: p.color,
          size: p.size / 40,
          alpha: clamp(p.life / p.maxLife, 0, 1),
          isMonster: false,
          monsterIdx: -1,
          hurtFlash: false,
        });
      }

      // Sort far to near
      sprites.sort((a, b) => b.dist - a.dist);

      // Project and draw sprites
      for (const sp of sprites) {
        const sx = sp.x - gs.posX;
        const sy = sp.y - gs.posY;
        // Inverse camera matrix
        const invDet = 1.0 / (gs.planeX * gs.dirY - gs.dirX * gs.planeY);
        const transformX = invDet * (gs.dirY * sx - gs.dirX * sy);
        const transformY = invDet * (-gs.planeY * sx + gs.planeX * sy);

        if (transformY <= 0.1) continue;

        const spriteScreenX = Math.floor((W / 2) * (1 + transformX / transformY));

        // Sprite height / width on screen
        const sprHeight = Math.abs(Math.floor(H / transformY * sp.size));
        const sprWidth = sprHeight;

        const vOffset = sp.isMonster ? 0 : -sp.z * (H / transformY);
        const drawStartY = Math.floor(-sprHeight / 2 + H / 2 + vOffset);
        const drawEndY = drawStartY + sprHeight;
        const drawStartX = Math.floor(spriteScreenX - sprWidth / 2);
        const drawEndX = drawStartX + sprWidth;

        // Clip against screen and zBuffer
        const xStart = Math.max(0, drawStartX);
        const xEnd = Math.min(W, drawEndX);
        const yStart = Math.max(0, drawStartY);
        const yEnd = Math.min(H, drawEndY);

        if (sp.isMonster) {
          // Draw monster sprite (procedural pixel-art style)
          const mon = gs.monsters[sp.monsterIdx];
          if (!mon) continue;

          ctx.globalAlpha = sp.alpha;
          for (let stripe = xStart; stripe < xEnd; stripe++) {
            if (zBuf[stripe] < transformY) continue;

            const texX = (stripe - drawStartX) / sprWidth;

            // Simple procedural monster body
            const bodyLeft = 0.2, bodyRight = 0.8;
            const headTop = 0.0, headBot = 0.3;
            const bodyTop = 0.3, bodyBot = 0.85;
            const legBot = 1.0;

            for (let row = yStart; row < yEnd; row += 2) {
              const texY = (row - drawStartY) / sprHeight;
              let draw = false;
              let c = sp.hurtFlash ? "#ffffff" : sp.color;

              // Head
              if (texY >= headTop && texY < headBot) {
                const headCenterX = 0.5;
                const headRadius = 0.15;
                if (Math.abs(texX - headCenterX) < headRadius) {
                  draw = true;
                  // Eyes
                  if (texY > 0.1 && texY < 0.2) {
                    if ((texX > 0.38 && texX < 0.45) || (texX > 0.55 && texX < 0.62)) {
                      c = sp.hurtFlash ? "#ff0000" : "#ff0000";
                    }
                  }
                }
              }
              // Body
              if (texY >= bodyTop && texY < bodyBot) {
                const bodyWidth = lerp(0.25, 0.3, (texY - bodyTop) / (bodyBot - bodyTop));
                if (Math.abs(texX - 0.5) < bodyWidth) {
                  draw = true;
                  // Darker inner shading
                  if (Math.abs(texX - 0.5) > bodyWidth * 0.7) {
                    const r2 = parseInt(c.slice(1, 3), 16);
                    const g2 = parseInt(c.slice(3, 5), 16);
                    const b2 = parseInt(c.slice(5, 7), 16);
                    c = `rgb(${Math.floor(r2 * 0.6)},${Math.floor(g2 * 0.6)},${Math.floor(b2 * 0.6)})`;
                  }
                }
              }
              // Legs
              if (texY >= bodyBot && texY < legBot) {
                if ((texX > 0.3 && texX < 0.42) || (texX > 0.58 && texX < 0.7)) {
                  draw = true;
                  c = sp.hurtFlash ? "#ffffff" : `rgb(${Math.floor(parseInt(sp.color.slice(1, 3), 16) * 0.5)},${Math.floor(parseInt(sp.color.slice(3, 5), 16) * 0.5)},${Math.floor(parseInt(sp.color.slice(5, 7), 16) * 0.5)})`;
                }
              }

              if (draw) {
                // Distance fog on sprites too
                const fogFactor2 = clamp(sp.dist / MAX_RENDER_DIST, 0, 1);
                if (c.startsWith("#")) {
                  const r3 = parseInt(c.slice(1, 3), 16);
                  const g3 = parseInt(c.slice(3, 5), 16);
                  const b3 = parseInt(c.slice(5, 7), 16);
                  ctx.fillStyle = `rgb(${Math.floor(r3 * (1 - fogFactor2))},${Math.floor(g3 * (1 - fogFactor2))},${Math.floor(b3 * (1 - fogFactor2))})`;
                } else {
                  ctx.fillStyle = c;
                }
                ctx.fillRect(stripe, row, 1, 2);
              }
            }
          }
          ctx.globalAlpha = 1;

          // HP bar above monster
          if (mon.state !== "dead" && sp.dist < 12) {
            const barW = sprWidth * 0.8;
            const barH = 3;
            const barX = spriteScreenX - barW / 2;
            const barY = yStart - 8;
            if (barY > 0) {
              ctx.fillStyle = "#330000";
              ctx.fillRect(barX, barY, barW, barH);
              ctx.fillStyle = "#ff0000";
              ctx.fillRect(barX, barY, barW * (mon.hp / mon.maxHp), barH);
            }
          }
        } else {
          // Draw particle
          ctx.globalAlpha = sp.alpha;
          const fogFactor3 = clamp(sp.dist / MAX_RENDER_DIST, 0, 1);
          const pSize = Math.max(1, Math.floor(sprHeight * 0.15));
          if (sp.color.startsWith("#")) {
            const r4 = parseInt(sp.color.slice(1, 3), 16);
            const g4 = parseInt(sp.color.slice(3, 5), 16);
            const b4 = parseInt(sp.color.slice(5, 7), 16);
            ctx.fillStyle = `rgb(${Math.floor(r4 * (1 - fogFactor3))},${Math.floor(g4 * (1 - fogFactor3))},${Math.floor(b4 * (1 - fogFactor3))})`;
          } else {
            ctx.fillStyle = sp.color;
          }
          // Only draw if in front of walls
          const midX = spriteScreenX;
          if (midX >= 0 && midX < W && zBuf[clamp(midX, 0, W - 1)] >= transformY) {
            ctx.fillRect(spriteScreenX - pSize / 2, drawStartY, pSize, pSize);
          }
          ctx.globalAlpha = 1;
        }
      }

      // ── HUD ───────────────────────────────────────────────────

      // Crosshair
      ctx.strokeStyle = "#00ff00";
      ctx.lineWidth = 1;
      const cx = W / 2, cy = H / 2;
      ctx.beginPath();
      ctx.moveTo(cx - 10, cy); ctx.lineTo(cx - 4, cy);
      ctx.moveTo(cx + 4, cy); ctx.lineTo(cx + 10, cy);
      ctx.moveTo(cx, cy - 10); ctx.lineTo(cx, cy - 4);
      ctx.moveTo(cx, cy + 4); ctx.lineTo(cx, cy + 10);
      ctx.stroke();

      // Minimap (top-left)
      const mmScale = 5;
      const mmSize = MAP_W * mmScale;
      const mmX = 10, mmY = 10;
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = "#000000";
      ctx.fillRect(mmX, mmY, mmSize, mmSize);
      // Walls
      for (let my = 0; my < MAP_H; my++) {
        for (let mx = 0; mx < MAP_W; mx++) {
          if (WORLD_MAP[my][mx] > 0) {
            const wc = WALL_COLORS[WORLD_MAP[my][mx]];
            ctx.fillStyle = wc ? wc[0] : "#555";
            ctx.fillRect(mmX + mx * mmScale, mmY + my * mmScale, mmScale, mmScale);
          }
        }
      }
      // Player
      ctx.fillStyle = "#00ff00";
      ctx.fillRect(
        mmX + gs.posX * mmScale - 2,
        mmY + gs.posY * mmScale - 2,
        4, 4
      );
      // Player direction line
      ctx.strokeStyle = "#00ff00";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(mmX + gs.posX * mmScale, mmY + gs.posY * mmScale);
      ctx.lineTo(mmX + (gs.posX + gs.dirX * 2) * mmScale, mmY + (gs.posY + gs.dirY * 2) * mmScale);
      ctx.stroke();
      // Enemies on minimap
      for (const mon of gs.monsters) {
        if (mon.state === "dead") continue;
        ctx.fillStyle = mon.def.color;
        ctx.fillRect(mmX + mon.x * mmScale - 1.5, mmY + mon.y * mmScale - 1.5, 3, 3);
      }
      ctx.globalAlpha = 1;

      // Health bar (bottom-left)
      const barX2 = 10, barY2 = H - 40;
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(barX2, barY2, 160, 30);
      // HP
      ctx.fillStyle = "#330000";
      ctx.fillRect(barX2 + 4, barY2 + 4, 152, 10);
      const hpPct = clamp(gs.hp / 100, 0, 1);
      ctx.fillStyle = hpPct > 0.3 ? "#00ff44" : "#ff3300";
      ctx.fillRect(barX2 + 4, barY2 + 4, 152 * hpPct, 10);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 9px monospace";
      ctx.fillText(`HP ${Math.max(0, gs.hp)}`, barX2 + 6, barY2 + 12);
      // Armor
      ctx.fillStyle = "#001133";
      ctx.fillRect(barX2 + 4, barY2 + 17, 152, 10);
      const armorPct = clamp(gs.armor / 100, 0, 1);
      ctx.fillStyle = "#4488ff";
      ctx.fillRect(barX2 + 4, barY2 + 17, 152 * armorPct, 10);
      ctx.fillText(`ARM ${gs.armor}`, barX2 + 6, barY2 + 25);

      // Ammo + weapon (bottom-right)
      const wep = WEAPONS[gs.currentWeapon];
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(W - 180, H - 40, 170, 30);
      ctx.fillStyle = wep.color;
      ctx.font = "bold 10px monospace";
      ctx.fillText(wep.name, W - 176, H - 26);
      const ammoText = wep.maxAmmo === 0 ? "∞" : `${gs.ammo[gs.currentWeapon]}`;
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 14px monospace";
      ctx.fillText(ammoText, W - 176, H - 14);

      // Weapon slot indicators
      for (let wi = 0; wi < 3; wi++) {
        const slotX = W - 180 + wi * 57;
        const slotY = H - 60;
        ctx.fillStyle = wi === gs.currentWeapon ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.4)";
        ctx.fillRect(slotX, slotY, 53, 16);
        ctx.fillStyle = WEAPONS[wi].color;
        ctx.font = "bold 9px monospace";
        ctx.fillText(`${wi + 1} ${WEAPONS[wi].name.split(" ")[0]}`, slotX + 3, slotY + 12);
      }

      // Score + wave (top-right)
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(W - 160, 10, 150, 40);
      ctx.fillStyle = "#00ffff";
      ctx.font = "bold 14px monospace";
      ctx.shadowColor = "#00ffff";
      ctx.shadowBlur = 6;
      ctx.fillText(`SCORE ${gs.score.toLocaleString()}`, W - 155, 30);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 11px monospace";
      ctx.fillText(`WAVE ${gs.wave}`, W - 155, 44);
      ctx.shadowBlur = 0;

      // Wave announcement
      if (gs.phase === "waveAnnounce" && gs.waveAnnounce > 30) {
        ctx.save();
        ctx.globalAlpha = clamp((gs.waveAnnounce - 30) / 60, 0, 1);
        ctx.fillStyle = "#00ffff";
        ctx.font = "bold 36px monospace";
        ctx.shadowColor = "#00ffff";
        ctx.shadowBlur = 20;
        ctx.textAlign = "center";
        const waveText = gs.wave % 5 === 0 ? `BOSS WAVE ${gs.wave}` : `WAVE ${gs.wave}`;
        ctx.fillText(waveText, W / 2, H / 2 - 10);
        ctx.font = "16px monospace";
        ctx.fillStyle = "#ffffff";
        ctx.shadowBlur = 0;
        ctx.fillText("Get ready!", W / 2, H / 2 + 20);
        ctx.restore();
      }

      // ── First-person weapon sprite ────────────────────────────
      {
        const bobX = Math.sin(gs.weaponBob) * 6;
        const bobY = Math.abs(Math.cos(gs.weaponBob)) * 4;
        const recoilY = gs.weaponRecoil * 3;
        const wpX = W / 2 - 40 + bobX;
        const wpY = H - 100 + bobY + recoilY;

        const wpColor = wep.color;
        // Gun body
        ctx.fillStyle = "#333344";
        ctx.fillRect(wpX + 15, wpY + 10, 50, 25);
        ctx.fillStyle = "#444466";
        ctx.fillRect(wpX + 20, wpY + 12, 40, 20);
        // Barrel
        ctx.fillStyle = "#555577";
        ctx.fillRect(wpX + 60, wpY + 16, 25, 12);
        // Grip
        ctx.fillStyle = "#222233";
        ctx.fillRect(wpX + 25, wpY + 35, 15, 25);
        // Accent color
        ctx.fillStyle = wpColor;
        ctx.fillRect(wpX + 62, wpY + 18, 22, 8);
        ctx.fillRect(wpX + 20, wpY + 30, 35, 3);

        // Muzzle flash
        if (gs.muzzleFlash > 0) {
          ctx.globalAlpha = gs.muzzleFlash / 6;
          ctx.fillStyle = wpColor;
          ctx.fillRect(wpX + 80, wpY + 8, 20, 28);
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(wpX + 85, wpY + 14, 12, 16);
          ctx.globalAlpha = 1;
        }
      }

      // ── Damage flash overlay ──────────────────────────────────
      if (gs.damageFlash > 0) {
        ctx.globalAlpha = gs.damageFlash / 15;
        ctx.fillStyle = "#ff0000";
        ctx.fillRect(-20, -20, W + 40, H + 40);
        ctx.globalAlpha = 1;
      }

      // ── Death overlay ─────────────────────────────────────────
      if (gs.phase === "dead") {
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = "#000000";
        ctx.fillRect(-20, -20, W + 40, H + 40);
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#ff3333";
        ctx.font = "bold 32px monospace";
        ctx.textAlign = "center";
        ctx.fillText("YOU DIED", W / 2, H / 2);
        ctx.textAlign = "start";
      }

      // Pointer lock hint
      if (!pointerLocked.current && gs.phase !== "dead") {
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(W / 2 - 130, H - 28, 260, 22);
        ctx.fillStyle = "#aaaaaa";
        ctx.font = "11px monospace";
        ctx.textAlign = "center";
        ctx.fillText("Click to enable mouse look", W / 2, H - 13);
        ctx.textAlign = "start";
      }

      ctx.restore();

      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animRef.current);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("wheel", onWheel);
      document.removeEventListener("pointerlockchange", onPointerLockChange);
      document.exitPointerLock?.();
    };
  }, [gamePhase, fireWeapon, spawnWave]);

  // ── JSX ───────────────────────────────────────────────────────────
  return (
    <div className="arcade-container" style={{ userSelect: "none" }}>
      <div className="arcade-screen" style={{ position: "relative" }}>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          style={{
            width: "100%",
            maxWidth: W,
            background: "#000",
            display: "block",
            imageRendering: "pixelated",
            cursor: gamePhase === "playing" ? "none" : "default",
          }}
        />

        {/* Start screen overlay */}
        {gamePhase === "start" && (
          <div className="arcade-overlay">
            <div className="arcade-overlay-content">
              {isMobile ? (
                <p className="text-gray-400" style={{ fontSize: "0.85rem" }}>
                  This game requires a desktop browser with keyboard &amp; mouse.
                </p>
              ) : (
                <>
                  <h2
                    className="shooter-glow"
                    style={{
                      fontSize: "1.6rem",
                      fontWeight: 900,
                      letterSpacing: "0.15em",
                      color: "#00ffff",
                    }}
                  >
                    NEON DOOM
                  </h2>
                  <p className="text-gray-400 mt-2" style={{ fontSize: "0.8rem" }}>
                    Doom-style FPS &bull; Survive the waves
                  </p>

                  <div className="mt-4 space-y-1" style={{ fontSize: "0.75rem" }}>
                    <div className="flex justify-between text-gray-300">
                      <span>Move</span>
                      <span className="flex gap-1">
                        <kbd className="arcade-kbd">W</kbd>
                        <kbd className="arcade-kbd">A</kbd>
                        <kbd className="arcade-kbd">S</kbd>
                        <kbd className="arcade-kbd">D</kbd>
                      </span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Look</span>
                      <span className="text-gray-500">Mouse</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Shoot</span>
                      <span className="text-gray-500">Left Click</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Weapons</span>
                      <span className="flex gap-1">
                        <kbd className="arcade-kbd">1</kbd>
                        <kbd className="arcade-kbd">2</kbd>
                        <kbd className="arcade-kbd">3</kbd>
                      </span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Rotate</span>
                      <span className="flex gap-1">
                        <kbd className="arcade-kbd">&larr;</kbd>
                        <kbd className="arcade-kbd">&rarr;</kbd>
                      </span>
                    </div>
                  </div>
                  <button
                    className="arcade-btn mt-5"
                    style={{ maxWidth: "200px" }}
                    onClick={startGame}
                  >
                    Start Game
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Game over overlay */}
        {gamePhase === "gameover" && (
          <div className="arcade-overlay">
            <div className="arcade-overlay-content">
              <h2
                className="shooter-glow"
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 900,
                  color: "#ff3366",
                  letterSpacing: "0.1em",
                }}
              >
                GAME OVER
              </h2>
              <p className="text-gray-400 mt-2" style={{ fontSize: "0.875rem" }}>
                Wave {displayWave} &middot;{" "}
                <span style={{ color: "#00ffff" }}>
                  {displayScore.toLocaleString()}
                </span>{" "}
                pts
              </p>

              {!submitted ? (
                <form
                  onSubmit={handleSubmit}
                  className="mt-4 flex flex-col gap-2"
                  style={{ maxWidth: "220px", margin: "1rem auto 0" }}
                >
                  <input
                    type="text"
                    maxLength={16}
                    placeholder="Your name"
                    value={submitName}
                    onChange={(e) => setSubmitName(e.target.value)}
                    className="arcade-input"
                    autoFocus
                  />
                  {submitError && (
                    <p style={{ color: "#ff4444", fontSize: "0.75rem" }}>
                      {submitError}
                    </p>
                  )}
                  <button
                    type="submit"
                    className="arcade-btn"
                    disabled={!submitName.trim() || submitting}
                  >
                    {submitting ? "Submitting\u2026" : "Submit Score"}
                  </button>
                  <button
                    type="button"
                    className="arcade-btn-secondary"
                    onClick={startGame}
                  >
                    Play Again
                  </button>
                </form>
              ) : (
                <div className="mt-4 flex flex-col gap-2 items-center">
                  <p style={{ color: "#00ff88", fontSize: "0.8rem" }}>
                    Score submitted!
                  </p>
                  <button
                    className="arcade-btn"
                    style={{ maxWidth: "200px" }}
                    onClick={startGame}
                  >
                    Play Again
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
