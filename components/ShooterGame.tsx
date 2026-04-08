"use client";

import { useEffect, useState, useRef, useCallback } from "react";

// ── Constants ──────────────────────────────────────────────────────
const W = 800;
const H = 450;
const GRAVITY = 0.5;
const PLAYER_SPEED = 4;
const JUMP_FORCE = -10;
const BULLET_SPEED = 12;
const SHOOT_COOLDOWN = 8; // frames
const MAX_PARTICLES = 200;
const SHAKE_DECAY = 0.85;

// Player dimensions
const PW = 24;
const PH = 32;

// ── Types ──────────────────────────────────────────────────────────
interface Vec2 {
  x: number;
  y: number;
}

interface Platform {
  x: number;
  y: number;
  w: number;
}

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  friendly: boolean;
  life: number;
}

type EnemyType = "melee" | "ranged" | "flying" | "boss";

interface Enemy {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  type: EnemyType;
  color: string;
  points: number;
  shootTimer: number;
  sineOffset: number;
  sineBase: number;
  onGround: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  onGround: boolean;
  jumpsLeft: number;
  hp: number;
  maxHp: number;
  shootCooldown: number;
  invincible: number;
  facingRight: boolean;
}

interface GameState {
  player: Player;
  bullets: Bullet[];
  enemies: Enemy[];
  particles: Particle[];
  platforms: Platform[];
  wave: number;
  score: number;
  enemiesToSpawn: number;
  spawnTimer: number;
  waveAnnounce: number;
  shakeX: number;
  shakeY: number;
  phase: "playing" | "waveAnnounce" | "dead";
}

interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  jump: boolean;
  mouseX: number;
  mouseY: number;
  mouseDown: boolean;
  jumpPressed: boolean;
}

// ── Platforms ───────────────────────────────────────────────────────
const PLATFORMS: Platform[] = [
  { x: 0, y: H - 20, w: W },           // ground
  { x: 100, y: 330, w: 180 },           // low left
  { x: 520, y: 330, w: 180 },           // low right
  { x: 280, y: 260, w: 240 },           // mid center
  { x: 50, y: 190, w: 160 },            // high left
  { x: 590, y: 190, w: 160 },           // high right
];

// ── Helper functions ───────────────────────────────────────────────
function aabb(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function createPlayer(): Player {
  return {
    x: W / 2 - PW / 2,
    y: H - 20 - PH,
    vx: 0,
    vy: 0,
    onGround: false,
    jumpsLeft: 2,
    hp: 100,
    maxHp: 100,
    shootCooldown: 0,
    invincible: 0,
    facingRight: true,
  };
}

function createEnemy(type: EnemyType, wave: number, side: "left" | "right"): Enemy {
  const hpScale = 1 + (wave - 1) * 0.15;
  const x = side === "left" ? -30 : W + 10;
  const base: Partial<Enemy> = {
    x,
    vx: 0,
    vy: 0,
    shootTimer: 60 + Math.random() * 60,
    sineOffset: Math.random() * Math.PI * 2,
    sineBase: 0,
    onGround: false,
  };

  switch (type) {
    case "melee":
      return {
        ...base,
        y: H - 20 - 28,
        w: 22,
        h: 28,
        hp: Math.round(30 * hpScale),
        maxHp: Math.round(30 * hpScale),
        type: "melee",
        color: "#ff3366",
        points: 100,
        vx: side === "left" ? 3 : -3,
      } as Enemy;
    case "ranged":
      return {
        ...base,
        y: H - 20 - 28,
        w: 22,
        h: 28,
        hp: Math.round(40 * hpScale),
        maxHp: Math.round(40 * hpScale),
        type: "ranged",
        color: "#ff8800",
        points: 200,
        vx: side === "left" ? 1.5 : -1.5,
      } as Enemy;
    case "flying":
      return {
        ...base,
        y: 80 + Math.random() * 150,
        w: 24,
        h: 24,
        hp: Math.round(25 * hpScale),
        maxHp: Math.round(25 * hpScale),
        type: "flying",
        color: "#cc44ff",
        points: 150,
        vx: side === "left" ? 1.8 : -1.8,
        sineBase: 80 + Math.random() * 150,
      } as Enemy;
    case "boss":
      return {
        ...base,
        y: H - 20 - 56,
        w: 48,
        h: 56,
        hp: Math.round(200 * hpScale),
        maxHp: Math.round(200 * hpScale),
        type: "boss",
        color: "#ff0044",
        points: 1000,
        vx: side === "left" ? 1 : -1,
        shootTimer: 40,
      } as Enemy;
  }
}

function spawnParticles(
  particles: Particle[],
  x: number,
  y: number,
  color: string,
  count: number
) {
  for (let i = 0; i < count; i++) {
    if (particles.length >= MAX_PARTICLES) break;
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 4;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1,
      life: 20 + Math.random() * 20,
      maxLife: 20 + Math.random() * 20,
      color,
      size: 2 + Math.random() * 3,
    });
  }
}

// ── Component ──────────────────────────────────────────────────────
export default function ShooterGame({
  onScoreSubmit,
}: {
  onScoreSubmit: (name: string, score: number) => Promise<string | null>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameState | null>(null);
  const inputRef = useRef<InputState>({
    left: false,
    right: false,
    up: false,
    down: false,
    jump: false,
    mouseX: W / 2,
    mouseY: H / 2,
    mouseDown: false,
    jumpPressed: false,
  });
  const animFrameRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const [gamePhase, setGamePhase] = useState<"start" | "playing" | "gameover">("start");
  const [displayScore, setDisplayScore] = useState(0);
  const [displayWave, setDisplayWave] = useState(1);
  const [displayHp, setDisplayHp] = useState(100);
  const [submitName, setSubmitName] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  // Detect touch device
  useEffect(() => {
    setIsTouchDevice(
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0
    );
  }, []);

  // ── Game init ──────────────────────────────────────────────────
  const initGame = useCallback((): GameState => {
    return {
      player: createPlayer(),
      bullets: [],
      enemies: [],
      particles: [],
      platforms: PLATFORMS,
      wave: 1,
      score: 0,
      enemiesToSpawn: 0,
      spawnTimer: 0,
      waveAnnounce: 90, // ~1.5s at 60fps
      shakeX: 0,
      shakeY: 0,
      phase: "waveAnnounce",
    };
  }, []);

  // ── Start wave ─────────────────────────────────────────────────
  function startWave(g: GameState) {
    const w = g.wave;
    const isBoss = w % 5 === 0;
    const baseCount = 3 + Math.floor(w * 1.5);
    g.enemiesToSpawn = isBoss ? baseCount + 1 : baseCount;
    g.spawnTimer = 0;
    g.waveAnnounce = 120;
    g.phase = "waveAnnounce";
  }

  // ── Spawn single enemy ─────────────────────────────────────────
  function spawnNextEnemy(g: GameState) {
    const w = g.wave;
    const isBoss = w % 5 === 0;
    const side: "left" | "right" = Math.random() < 0.5 ? "left" : "right";

    if (isBoss && g.enemiesToSpawn === 1) {
      g.enemies.push(createEnemy("boss", w, side));
    } else {
      const roll = Math.random();
      let type: EnemyType;
      if (w < 3) {
        type = roll < 0.7 ? "melee" : "ranged";
      } else if (w < 6) {
        type = roll < 0.4 ? "melee" : roll < 0.7 ? "ranged" : "flying";
      } else {
        type = roll < 0.3 ? "melee" : roll < 0.6 ? "ranged" : "flying";
      }
      g.enemies.push(createEnemy(type, w, side));
    }
    g.enemiesToSpawn--;
  }

  // ── Update ─────────────────────────────────────────────────────
  function update(g: GameState, input: InputState) {
    const p = g.player;

    // Wave announcement countdown
    if (g.phase === "waveAnnounce") {
      g.waveAnnounce--;
      if (g.waveAnnounce <= 0) {
        g.phase = "playing";
      }
    }

    // ── Player movement ────────────────────────────────────────
    if (input.left) {
      p.vx = -PLAYER_SPEED;
      p.facingRight = false;
    } else if (input.right) {
      p.vx = PLAYER_SPEED;
      p.facingRight = true;
    } else {
      p.vx = 0;
    }

    // Jump
    if (input.jump && !input.jumpPressed && p.jumpsLeft > 0) {
      p.vy = JUMP_FORCE;
      p.jumpsLeft--;
      p.onGround = false;
      input.jumpPressed = true;
    }
    if (!input.jump) {
      input.jumpPressed = false;
    }

    // Gravity
    p.vy += GRAVITY;
    p.x += p.vx;
    p.y += p.vy;
    p.onGround = false;

    // Platform collision
    for (const plat of g.platforms) {
      if (
        p.vy >= 0 &&
        p.x + PW > plat.x &&
        p.x < plat.x + plat.w &&
        p.y + PH >= plat.y &&
        p.y + PH - p.vy <= plat.y + 4
      ) {
        p.y = plat.y - PH;
        p.vy = 0;
        p.onGround = true;
        p.jumpsLeft = 2;
      }
    }

    // World bounds
    if (p.x < 0) p.x = 0;
    if (p.x + PW > W) p.x = W - PW;
    if (p.y > H) {
      p.hp = 0;
    }

    // Invincibility timer
    if (p.invincible > 0) p.invincible--;

    // ── Shooting ───────────────────────────────────────────────
    if (p.shootCooldown > 0) p.shootCooldown--;
    if (input.mouseDown && p.shootCooldown <= 0) {
      const cx = p.x + PW / 2;
      const cy = p.y + PH / 2;
      const dx = input.mouseX - cx;
      const dy = input.mouseY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      g.bullets.push({
        x: cx,
        y: cy,
        vx: (dx / dist) * BULLET_SPEED,
        vy: (dy / dist) * BULLET_SPEED,
        friendly: true,
        life: 60,
      });
      p.shootCooldown = SHOOT_COOLDOWN;
    }

    // ── Enemy spawning ─────────────────────────────────────────
    if (g.phase === "playing" && g.enemiesToSpawn > 0) {
      g.spawnTimer--;
      if (g.spawnTimer <= 0) {
        spawnNextEnemy(g);
        g.spawnTimer = 30 + Math.random() * 30;
      }
    }

    // ── Enemy AI ───────────────────────────────────────────────
    for (const e of g.enemies) {
      const distToPlayer = p.x + PW / 2 - (e.x + e.w / 2);

      switch (e.type) {
        case "melee": {
          const speed = 2.5 + g.wave * 0.1;
          e.vx = distToPlayer > 0 ? speed : -speed;
          e.vy += GRAVITY;
          e.x += e.vx;
          e.y += e.vy;
          e.onGround = false;
          for (const plat of g.platforms) {
            if (
              e.vy >= 0 &&
              e.x + e.w > plat.x &&
              e.x < plat.x + plat.w &&
              e.y + e.h >= plat.y &&
              e.y + e.h - e.vy <= plat.y + 4
            ) {
              e.y = plat.y - e.h;
              e.vy = 0;
              e.onGround = true;
            }
          }
          // Jump if player is above
          if (e.onGround && p.y < e.y - 40 && Math.abs(distToPlayer) < 200) {
            e.vy = -8;
            e.onGround = false;
          }
          break;
        }
        case "ranged": {
          const rangeDist = Math.abs(distToPlayer);
          if (rangeDist > 250) {
            e.vx = distToPlayer > 0 ? 1.5 : -1.5;
          } else if (rangeDist < 150) {
            e.vx = distToPlayer > 0 ? -1 : 1;
          } else {
            e.vx = 0;
          }
          e.vy += GRAVITY;
          e.x += e.vx;
          e.y += e.vy;
          e.onGround = false;
          for (const plat of g.platforms) {
            if (
              e.vy >= 0 &&
              e.x + e.w > plat.x &&
              e.x < plat.x + plat.w &&
              e.y + e.h >= plat.y &&
              e.y + e.h - e.vy <= plat.y + 4
            ) {
              e.y = plat.y - e.h;
              e.vy = 0;
              e.onGround = true;
            }
          }
          // Shoot at player
          e.shootTimer--;
          if (e.shootTimer <= 0 && rangeDist < 400) {
            const ecx = e.x + e.w / 2;
            const ecy = e.y + e.h / 2;
            const dx = p.x + PW / 2 - ecx;
            const dy = p.y + PH / 2 - ecy;
            const d = Math.sqrt(dx * dx + dy * dy) || 1;
            g.bullets.push({
              x: ecx,
              y: ecy,
              vx: (dx / d) * 5,
              vy: (dy / d) * 5,
              friendly: false,
              life: 90,
            });
            e.shootTimer = 80 - Math.min(g.wave * 2, 30);
          }
          break;
        }
        case "flying": {
          e.sineOffset += 0.04;
          e.x += distToPlayer > 0 ? 1.2 : -1.2;
          e.y = e.sineBase + Math.sin(e.sineOffset) * 30;
          // Shoot occasionally
          e.shootTimer--;
          if (e.shootTimer <= 0) {
            const ecx = e.x + e.w / 2;
            const ecy = e.y + e.h / 2;
            const dx = p.x + PW / 2 - ecx;
            const dy = p.y + PH / 2 - ecy;
            const d = Math.sqrt(dx * dx + dy * dy) || 1;
            g.bullets.push({
              x: ecx,
              y: ecy,
              vx: (dx / d) * 4,
              vy: (dy / d) * 4,
              friendly: false,
              life: 80,
            });
            e.shootTimer = 100 - Math.min(g.wave * 3, 40);
          }
          break;
        }
        case "boss": {
          const speed = 0.8 + g.wave * 0.05;
          e.vx = distToPlayer > 0 ? speed : -speed;
          e.vy += GRAVITY;
          e.x += e.vx;
          e.y += e.vy;
          e.onGround = false;
          for (const plat of g.platforms) {
            if (
              e.vy >= 0 &&
              e.x + e.w > plat.x &&
              e.x < plat.x + plat.w &&
              e.y + e.h >= plat.y &&
              e.y + e.h - e.vy <= plat.y + 4
            ) {
              e.y = plat.y - e.h;
              e.vy = 0;
              e.onGround = true;
            }
          }
          // Spread shot
          e.shootTimer--;
          if (e.shootTimer <= 0) {
            const ecx = e.x + e.w / 2;
            const ecy = e.y + e.h / 3;
            const baseAngle = Math.atan2(
              p.y + PH / 2 - ecy,
              p.x + PW / 2 - ecx
            );
            for (let i = -2; i <= 2; i++) {
              const a = baseAngle + i * 0.2;
              g.bullets.push({
                x: ecx,
                y: ecy,
                vx: Math.cos(a) * 4.5,
                vy: Math.sin(a) * 4.5,
                friendly: false,
                life: 90,
              });
            }
            e.shootTimer = 60 - Math.min(g.wave * 2, 20);
          }
          break;
        }
      }

      // Keep enemies in bounds horizontally (loosely)
      if (e.x < -100) e.x = -100;
      if (e.x > W + 80) e.x = W + 80;

      // Melee damage to player
      if (
        p.invincible <= 0 &&
        aabb(p.x, p.y, PW, PH, e.x, e.y, e.w, e.h)
      ) {
        const dmg = e.type === "boss" ? 20 : 10;
        p.hp -= dmg;
        p.invincible = 30;
        g.shakeX = (Math.random() - 0.5) * 8;
        g.shakeY = (Math.random() - 0.5) * 8;
        spawnParticles(g.particles, p.x + PW / 2, p.y + PH / 2, "#00ffff", 6);
      }
    }

    // ── Bullets ────────────────────────────────────────────────
    for (let i = g.bullets.length - 1; i >= 0; i--) {
      const b = g.bullets[i];
      b.x += b.vx;
      b.y += b.vy;
      b.life--;

      // Off screen or expired
      if (b.life <= 0 || b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20) {
        g.bullets.splice(i, 1);
        continue;
      }

      if (b.friendly) {
        // Hit enemies
        for (let j = g.enemies.length - 1; j >= 0; j--) {
          const e = g.enemies[j];
          if (aabb(b.x - 3, b.y - 3, 6, 6, e.x, e.y, e.w, e.h)) {
            e.hp -= 20;
            g.bullets.splice(i, 1);
            spawnParticles(g.particles, b.x, b.y, e.color, 4);
            if (e.hp <= 0) {
              g.score += e.points;
              spawnParticles(
                g.particles,
                e.x + e.w / 2,
                e.y + e.h / 2,
                e.color,
                e.type === "boss" ? 30 : 12
              );
              g.shakeX = (Math.random() - 0.5) * (e.type === "boss" ? 12 : 4);
              g.shakeY = (Math.random() - 0.5) * (e.type === "boss" ? 12 : 4);
              g.enemies.splice(j, 1);
            }
            break;
          }
        }
      } else {
        // Hit player
        if (
          p.invincible <= 0 &&
          aabb(b.x - 3, b.y - 3, 6, 6, p.x, p.y, PW, PH)
        ) {
          p.hp -= 15;
          p.invincible = 20;
          g.shakeX = (Math.random() - 0.5) * 6;
          g.shakeY = (Math.random() - 0.5) * 6;
          spawnParticles(g.particles, b.x, b.y, "#00ffff", 5);
          g.bullets.splice(i, 1);
        }
      }
    }

    // ── Particles ──────────────────────────────────────────────
    for (let i = g.particles.length - 1; i >= 0; i--) {
      const pt = g.particles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.vy += 0.05;
      pt.life--;
      if (pt.life <= 0) {
        g.particles.splice(i, 1);
      }
    }

    // ── Screen shake decay ─────────────────────────────────────
    g.shakeX *= SHAKE_DECAY;
    g.shakeY *= SHAKE_DECAY;

    // ── Wave completion ────────────────────────────────────────
    if (
      g.phase === "playing" &&
      g.enemiesToSpawn <= 0 &&
      g.enemies.length === 0
    ) {
      g.score += g.wave * 250;
      g.wave++;
      startWave(g);
    }

    // ── Death check ────────────────────────────────────────────
    if (p.hp <= 0) {
      p.hp = 0;
      g.phase = "dead";
    }
  }

  // ── Render ─────────────────────────────────────────────────────
  function render(ctx: CanvasRenderingContext2D, g: GameState, input: InputState) {
    ctx.save();
    ctx.translate(Math.round(g.shakeX), Math.round(g.shakeY));

    // Background
    ctx.fillStyle = "#0a0a0f";
    ctx.fillRect(-10, -10, W + 20, H + 20);

    // Grid lines (subtle)
    ctx.strokeStyle = "rgba(0, 255, 255, 0.03)";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // ── Platforms ───────────────────────────────────────────────
    ctx.shadowColor = "#00ffff";
    ctx.shadowBlur = 8;
    for (const plat of g.platforms) {
      const isGround = plat.y === H - 20;
      ctx.fillStyle = isGround ? "#1a1a2e" : "#1a1a2e";
      ctx.fillRect(plat.x, plat.y, plat.w, isGround ? 20 : 6);
      // Top edge glow
      ctx.fillStyle = isGround ? "#00cccc" : "#00aaaa";
      ctx.fillRect(plat.x, plat.y, plat.w, 2);
    }
    ctx.shadowBlur = 0;

    // ── Particles (no shadow for performance) ──────────────────
    for (const pt of g.particles) {
      const alpha = pt.life / pt.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
    }
    ctx.globalAlpha = 1;

    // ── Enemies ────────────────────────────────────────────────
    ctx.shadowColor = "#ff0044";
    ctx.shadowBlur = 10;
    for (const e of g.enemies) {
      ctx.shadowColor = e.color;
      ctx.fillStyle = e.color;

      if (e.type === "boss") {
        // Boss: larger, with details
        ctx.fillRect(e.x, e.y, e.w, e.h);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(e.x + 10, e.y + 12, 8, 8);
        ctx.fillRect(e.x + 30, e.y + 12, 8, 8);
        ctx.fillStyle = "#0a0a0f";
        ctx.fillRect(e.x + 13, e.y + 15, 3, 3);
        ctx.fillRect(e.x + 33, e.y + 15, 3, 3);
      } else if (e.type === "flying") {
        // Flying: diamond shape
        ctx.beginPath();
        ctx.moveTo(e.x + e.w / 2, e.y);
        ctx.lineTo(e.x + e.w, e.y + e.h / 2);
        ctx.lineTo(e.x + e.w / 2, e.y + e.h);
        ctx.lineTo(e.x, e.y + e.h / 2);
        ctx.closePath();
        ctx.fill();
      } else {
        // Melee/Ranged: rectangles
        ctx.fillRect(e.x, e.y, e.w, e.h);
        if (e.type === "ranged") {
          // Gun arm
          const gunSide = e.x + e.w / 2 < W / 2 ? e.w : -4;
          ctx.fillStyle = "#ffaa00";
          ctx.fillRect(e.x + gunSide, e.y + e.h / 2 - 2, 8, 4);
        }
      }

      // HP bar for non-full-hp enemies
      if (e.hp < e.maxHp) {
        ctx.shadowBlur = 0;
        const barW = e.w;
        const barH = 3;
        const barY = e.y - 6;
        ctx.fillStyle = "#330000";
        ctx.fillRect(e.x, barY, barW, barH);
        ctx.fillStyle = e.color;
        ctx.fillRect(e.x, barY, barW * (e.hp / e.maxHp), barH);
        ctx.shadowBlur = 10;
      }
    }
    ctx.shadowBlur = 0;

    // ── Bullets ────────────────────────────────────────────────
    ctx.shadowBlur = 6;
    for (const b of g.bullets) {
      if (b.friendly) {
        ctx.shadowColor = "#ffff00";
        ctx.fillStyle = "#ffff00";
      } else {
        ctx.shadowColor = "#ff4444";
        ctx.fillStyle = "#ff4444";
      }
      ctx.beginPath();
      ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // ── Player ─────────────────────────────────────────────────
    const p = g.player;
    if (p.invincible > 0 && Math.floor(p.invincible / 3) % 2 === 0) {
      // Flash when invincible
    } else {
      ctx.shadowColor = "#00ffff";
      ctx.shadowBlur = 12;
      ctx.fillStyle = "#00e5ff";
      ctx.fillRect(p.x, p.y, PW, PH);

      // Visor
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#ffffff";
      if (p.facingRight) {
        ctx.fillRect(p.x + 14, p.y + 8, 8, 4);
      } else {
        ctx.fillRect(p.x + 2, p.y + 8, 8, 4);
      }
      ctx.shadowBlur = 0;
    }

    // ── Crosshair ──────────────────────────────────────────────
    ctx.strokeStyle = "rgba(255, 255, 0, 0.6)";
    ctx.lineWidth = 1.5;
    const mx = input.mouseX;
    const my = input.mouseY;
    ctx.beginPath();
    ctx.moveTo(mx - 10, my);
    ctx.lineTo(mx - 4, my);
    ctx.moveTo(mx + 4, my);
    ctx.lineTo(mx + 10, my);
    ctx.moveTo(mx, my - 10);
    ctx.lineTo(mx, my - 4);
    ctx.moveTo(mx, my + 4);
    ctx.lineTo(mx, my + 10);
    ctx.stroke();

    // ── HUD ────────────────────────────────────────────────────
    // HP bar
    const hpBarW = 150;
    const hpBarH = 12;
    const hpX = 20;
    const hpY = 16;
    ctx.fillStyle = "rgba(255, 0, 0, 0.3)";
    ctx.fillRect(hpX, hpY, hpBarW, hpBarH);
    const hpRatio = p.hp / p.maxHp;
    const hpColor = hpRatio > 0.5 ? "#00ff88" : hpRatio > 0.25 ? "#ffaa00" : "#ff3333";
    ctx.fillStyle = hpColor;
    ctx.fillRect(hpX, hpY, hpBarW * hpRatio, hpBarH);
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 1;
    ctx.strokeRect(hpX, hpY, hpBarW, hpBarH);

    // HP text
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`HP ${p.hp}/${p.maxHp}`, hpX + 4, hpY + 10);

    // Score
    ctx.textAlign = "right";
    ctx.font = "bold 18px monospace";
    ctx.shadowColor = "#00ffff";
    ctx.shadowBlur = 6;
    ctx.fillStyle = "#00ffff";
    ctx.fillText(`${g.score}`, W - 20, 28);
    ctx.shadowBlur = 0;

    // Wave indicator
    ctx.font = "bold 12px monospace";
    ctx.fillStyle = "#aaaaaa";
    ctx.fillText(`WAVE ${g.wave}`, W - 20, 44);

    // ── Wave announcement ──────────────────────────────────────
    if (g.phase === "waveAnnounce" && g.waveAnnounce > 0) {
      const alpha = Math.min(1, g.waveAnnounce / 30);
      ctx.globalAlpha = alpha;
      ctx.textAlign = "center";
      ctx.font = "bold 36px monospace";
      ctx.shadowColor = g.wave % 5 === 0 ? "#ff0044" : "#00ffff";
      ctx.shadowBlur = 20;
      ctx.fillStyle = g.wave % 5 === 0 ? "#ff0044" : "#00ffff";
      const waveText = g.wave % 5 === 0 ? `BOSS WAVE ${g.wave}` : `WAVE ${g.wave}`;
      ctx.fillText(waveText, W / 2, H / 2 - 20);
      ctx.font = "14px monospace";
      ctx.fillStyle = "#888888";
      ctx.shadowBlur = 0;
      ctx.fillText("Get ready!", W / 2, H / 2 + 15);
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  // ── Game loop ──────────────────────────────────────────────────
  const startGame = useCallback(() => {
    const g = initGame();
    gameRef.current = g;
    startWave(g);
    setGamePhase("playing");
    setDisplayScore(0);
    setDisplayWave(1);
    setDisplayHp(100);
    setSubmitted(false);
    setSubmitError(null);
    setSubmitName("");
  }, [initGame]);

  useEffect(() => {
    if (gamePhase !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let running = true;

    function loop() {
      if (!running) return;
      const g = gameRef.current;
      if (!g || !ctx) return;

      if (g.phase !== "dead") {
        update(g, inputRef.current);
      }

      render(ctx, g, inputRef.current);

      // Sync display state
      setDisplayScore(g.score);
      setDisplayWave(g.wave);
      setDisplayHp(g.player.hp);

      if (g.phase === "dead") {
        setGamePhase("gameover");
        return;
      }

      animFrameRef.current = requestAnimationFrame(loop);
    }

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      running = false;
      cancelAnimationFrame(animFrameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gamePhase]);

  // ── Input handlers ─────────────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (gamePhase !== "playing") return;
      const inp = inputRef.current;
      switch (e.code) {
        case "KeyA":
        case "ArrowLeft":
          inp.left = true;
          break;
        case "KeyD":
        case "ArrowRight":
          inp.right = true;
          break;
        case "KeyW":
        case "ArrowUp":
          inp.up = true;
          break;
        case "KeyS":
        case "ArrowDown":
          inp.down = true;
          break;
        case "Space":
          e.preventDefault();
          inp.jump = true;
          break;
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      const inp = inputRef.current;
      switch (e.code) {
        case "KeyA":
        case "ArrowLeft":
          inp.left = false;
          break;
        case "KeyD":
        case "ArrowRight":
          inp.right = false;
          break;
        case "KeyW":
        case "ArrowUp":
          inp.up = false;
          break;
        case "KeyS":
        case "ArrowDown":
          inp.down = false;
          break;
        case "Space":
          inp.jump = false;
          break;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [gamePhase]);

  // Mouse input (relative to canvas)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function getCanvasCoords(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect();
      const scaleX = W / rect.width;
      const scaleY = H / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    }

    function onMouseMove(e: MouseEvent) {
      const { x, y } = getCanvasCoords(e);
      inputRef.current.mouseX = x;
      inputRef.current.mouseY = y;
    }

    function onMouseDown(e: MouseEvent) {
      if (e.button === 0) {
        inputRef.current.mouseDown = true;
        const { x, y } = getCanvasCoords(e);
        inputRef.current.mouseX = x;
        inputRef.current.mouseY = y;
      }
    }

    function onMouseUp(e: MouseEvent) {
      if (e.button === 0) {
        inputRef.current.mouseDown = false;
      }
    }

    function onContextMenu(e: Event) {
      e.preventDefault();
    }

    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("contextmenu", onContextMenu);

    return () => {
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("contextmenu", onContextMenu);
    };
  }, []);

  // ── Score submit ───────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = submitName.trim();
    if (!name || submitting || submitted) return;
    setSubmitting(true);
    setSubmitError(null);
    const err = await onScoreSubmit(name, displayScore);
    setSubmitting(false);
    if (err) {
      setSubmitError(err);
    } else {
      setSubmitted(true);
    }
  };

  // ── Draw start/gameover screens on canvas ──────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (gamePhase === "start" || gamePhase === "gameover") {
      // Dark bg
      ctx.fillStyle = "#0a0a0f";
      ctx.fillRect(0, 0, W, H);

      // Grid
      ctx.strokeStyle = "rgba(0, 255, 255, 0.03)";
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = 0; y < H; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }

      // Platforms
      for (const plat of PLATFORMS) {
        const isGround = plat.y === H - 20;
        ctx.fillStyle = "#1a1a2e";
        ctx.fillRect(plat.x, plat.y, plat.w, isGround ? 20 : 6);
        ctx.fillStyle = "#00aaaa";
        ctx.fillRect(plat.x, plat.y, plat.w, 2);
      }
    }
  }, [gamePhase]);

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="shooter-container" ref={containerRef}>
      <div className="shooter-board">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="shooter-canvas"
          style={{ cursor: gamePhase === "playing" ? "none" : "default" }}
        />

        {/* Start overlay */}
        {gamePhase === "start" && (
          <div className="arcade-overlay">
            <div className="arcade-overlay-content">
              <h2
                className="arcade-title shooter-glow"
                style={{ fontSize: "2rem", color: "#00ffff" }}
              >
                NEON SHOOTER
              </h2>
              <p
                className="mt-3 text-gray-400"
                style={{ fontSize: "0.8rem" }}
              >
                Survive the waves. Climb the leaderboard.
              </p>

              {isTouchDevice ? (
                <div className="mt-4">
                  <p className="text-gray-400" style={{ fontSize: "0.75rem" }}>
                    This game requires a keyboard &amp; mouse.
                  </p>
                  <p className="text-gray-500 mt-1" style={{ fontSize: "0.7rem" }}>
                    Please play on a desktop device.
                  </p>
                </div>
              ) : (
                <>
                  <div
                    className="mt-4 text-left mx-auto"
                    style={{ maxWidth: "240px" }}
                  >
                    <p className="text-gray-400 mb-2" style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                      Controls
                    </p>
                    <div className="flex flex-col gap-1.5" style={{ fontSize: "0.75rem" }}>
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
                        <span>Jump</span>
                        <kbd className="arcade-kbd">SPACE</kbd>
                      </div>
                      <div className="flex justify-between text-gray-300">
                        <span>Aim</span>
                        <span className="text-gray-500">Mouse</span>
                      </div>
                      <div className="flex justify-between text-gray-300">
                        <span>Shoot</span>
                        <span className="text-gray-500">Click</span>
                      </div>
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
                    {submitting ? "Submitting…" : "Submit Score"}
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
