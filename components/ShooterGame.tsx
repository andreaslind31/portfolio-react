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

type EnemyType = "soldier" | "drone" | "plane" | "tank";

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
    case "soldier":
      return {
        ...base,
        y: H - 20 - 30,
        w: 18,
        h: 30,
        hp: Math.round(30 * hpScale),
        maxHp: Math.round(30 * hpScale),
        type: "soldier",
        color: "#ff3366",
        points: 100,
        vx: side === "left" ? 2.5 : -2.5,
      } as Enemy;
    case "drone":
      return {
        ...base,
        y: 60 + Math.random() * 140,
        w: 26,
        h: 14,
        hp: Math.round(25 * hpScale),
        maxHp: Math.round(25 * hpScale),
        type: "drone",
        color: "#cc44ff",
        points: 150,
        vx: side === "left" ? 1.8 : -1.8,
        sineBase: 60 + Math.random() * 140,
      } as Enemy;
    case "plane":
      return {
        ...base,
        y: 30 + Math.random() * 60,
        w: 36,
        h: 16,
        hp: Math.round(40 * hpScale),
        maxHp: Math.round(40 * hpScale),
        type: "plane",
        color: "#ff8800",
        points: 200,
        vx: side === "left" ? 2.8 : -2.8,
        sineBase: 30 + Math.random() * 60,
      } as Enemy;
    case "tank":
      return {
        ...base,
        y: H - 20 - 36,
        w: 52,
        h: 36,
        hp: Math.round(250 * hpScale),
        maxHp: Math.round(250 * hpScale),
        type: "tank",
        color: "#44cc44",
        points: 1000,
        vx: side === "left" ? 0.7 : -0.7,
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
      g.enemies.push(createEnemy("tank", w, side));
    } else {
      const roll = Math.random();
      let type: EnemyType;
      if (w < 3) {
        // Early waves: soldiers and drones
        type = roll < 0.65 ? "soldier" : "drone";
      } else if (w < 6) {
        // Mid waves: add planes
        type = roll < 0.35 ? "soldier" : roll < 0.6 ? "drone" : "plane";
      } else {
        // Late waves: even mix
        type = roll < 0.3 ? "soldier" : roll < 0.55 ? "drone" : "plane";
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
        case "soldier": {
          // Soldiers run toward player on the ground, shoot when close
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
          // Shoot when in range
          e.shootTimer--;
          if (e.shootTimer <= 0 && Math.abs(distToPlayer) < 300) {
            const ecx = e.x + e.w / 2;
            const ecy = e.y + e.h * 0.3;
            const dx = p.x + PW / 2 - ecx;
            const dy = p.y + PH / 2 - ecy;
            const d = Math.sqrt(dx * dx + dy * dy) || 1;
            g.bullets.push({
              x: ecx, y: ecy,
              vx: (dx / d) * 5, vy: (dy / d) * 5,
              friendly: false, life: 70,
            });
            e.shootTimer = 90 - Math.min(g.wave * 2, 30);
          }
          break;
        }
        case "drone": {
          // Small hovering drone, bobs up/down, shoots down at player
          e.sineOffset += 0.05;
          e.x += distToPlayer > 0 ? 1.4 : -1.4;
          e.y = e.sineBase + Math.sin(e.sineOffset) * 20;
          e.shootTimer--;
          if (e.shootTimer <= 0) {
            const ecx = e.x + e.w / 2;
            const ecy = e.y + e.h;
            const dx = p.x + PW / 2 - ecx;
            const dy = p.y + PH / 2 - ecy;
            const d = Math.sqrt(dx * dx + dy * dy) || 1;
            g.bullets.push({
              x: ecx, y: ecy,
              vx: (dx / d) * 4, vy: (dy / d) * 4,
              friendly: false, life: 80,
            });
            e.shootTimer = 100 - Math.min(g.wave * 3, 40);
          }
          break;
        }
        case "plane": {
          // Fast jet that flies across screen, strafes with bursts
          e.x += e.vx;
          e.sineOffset += 0.02;
          e.y = e.sineBase + Math.sin(e.sineOffset) * 15;
          e.shootTimer--;
          if (e.shootTimer <= 0 && Math.abs(distToPlayer) < 350) {
            const ecx = e.x + e.w / 2;
            const ecy = e.y + e.h;
            // Drops bullets downward with slight tracking
            const dx = p.x + PW / 2 - ecx;
            const d = Math.abs(dx) || 1;
            g.bullets.push({
              x: ecx, y: ecy,
              vx: (dx / d) * 2, vy: 5,
              friendly: false, life: 70,
            });
            e.shootTimer = 50 - Math.min(g.wave * 2, 20);
          }
          break;
        }
        case "tank": {
          // Heavy tank: slow, on ground, fires spread cannon
          const speed = 0.6 + g.wave * 0.04;
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
          // Cannon spread shot
          e.shootTimer--;
          if (e.shootTimer <= 0) {
            const ecx = e.x + e.w / 2;
            const ecy = e.y + 6;
            const baseAngle = Math.atan2(
              p.y + PH / 2 - ecy,
              p.x + PW / 2 - ecx
            );
            for (let i = -2; i <= 2; i++) {
              const a = baseAngle + i * 0.18;
              g.bullets.push({
                x: ecx, y: ecy,
                vx: Math.cos(a) * 4, vy: Math.sin(a) * 4,
                friendly: false, life: 90,
              });
            }
            e.shootTimer = 70 - Math.min(g.wave * 2, 25);
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
        const dmg = e.type === "tank" ? 20 : 10;
        p.hp -= dmg;
        p.invincible = 30;
        g.shakeX = (Math.random() - 0.5) * 8;
        g.shakeY = (Math.random() - 0.5) * 8;
        spawnParticles(g.particles, p.x + PW / 2, p.y + PH / 2, "#00ffff", 6);
      }
    }

    // Remove enemies that fell off-screen
    for (let i = g.enemies.length - 1; i >= 0; i--) {
      const e = g.enemies[i];
      if (e.y > H + 100) {
        g.enemies.splice(i, 1);
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
                e.type === "tank" ? 30 : 12
              );
              g.shakeX = (Math.random() - 0.5) * (e.type === "tank" ? 12 : 4);
              g.shakeY = (Math.random() - 0.5) * (e.type === "tank" ? 12 : 4);
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
      const eDist = g.player.x + PW / 2 - (e.x + e.w / 2);

      if (e.type === "soldier") {
        // ── Soldier (18×30) ──
        const f = eDist > 0; // facing right
        // Boots
        ctx.fillStyle = "#442222";
        ctx.fillRect(e.x + 2, e.y + 26, 5, 4);
        ctx.fillRect(e.x + 11, e.y + 26, 5, 4);
        // Legs (camo pants)
        ctx.fillStyle = "#556633";
        ctx.fillRect(e.x + 3, e.y + 18, 4, 8);
        ctx.fillRect(e.x + 11, e.y + 18, 4, 8);
        // Torso (camo jacket)
        ctx.fillStyle = "#667744";
        ctx.fillRect(e.x + 2, e.y + 9, 14, 10);
        // Belt
        ctx.fillStyle = "#443322";
        ctx.fillRect(e.x + 2, e.y + 17, 14, 2);
        // Arms
        ctx.fillStyle = "#556633";
        if (f) {
          ctx.fillRect(e.x - 1, e.y + 10, 3, 8);
          ctx.fillRect(e.x + 16, e.y + 10, 3, 8);
        } else {
          ctx.fillRect(e.x - 1, e.y + 10, 3, 8);
          ctx.fillRect(e.x + 16, e.y + 10, 3, 8);
        }
        // Head
        ctx.fillStyle = "#ddaa88";
        ctx.fillRect(e.x + 5, e.y + 3, 8, 7);
        // Helmet
        ctx.fillStyle = "#556633";
        ctx.fillRect(e.x + 4, e.y, 10, 5);
        ctx.fillRect(e.x + 3, e.y + 3, 12, 2);
        // Eye
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(e.x + (f ? 10 : 6), e.y + 5, 2, 2);
        ctx.fillStyle = "#000000";
        ctx.fillRect(e.x + (f ? 11 : 6), e.y + 5, 1, 2);
        // Rifle
        ctx.fillStyle = "#888888";
        const gx = f ? e.x + 16 : e.x - 8;
        ctx.fillRect(gx, e.y + 11, 10, 2);
        ctx.fillStyle = "#666666";
        ctx.fillRect(gx + (f ? 8 : 0), e.y + 10, 2, 4);
        // Muzzle flash hint
        ctx.fillStyle = "#aa7744";
        ctx.fillRect(gx + (f ? 0 : 8), e.y + 14, 3, 2);
      } else if (e.type === "drone") {
        // ── Drone (26×14) ──
        const cx = e.x + e.w / 2;
        const cy = e.y + e.h / 2;
        // Landing skids
        ctx.fillStyle = "#666677";
        ctx.fillRect(e.x + 4, e.y + e.h - 2, 6, 2);
        ctx.fillRect(e.x + e.w - 10, e.y + e.h - 2, 6, 2);
        ctx.fillRect(e.x + 6, e.y + e.h - 4, 2, 2);
        ctx.fillRect(e.x + e.w - 8, e.y + e.h - 4, 2, 2);
        // Central body
        ctx.fillStyle = "#8855aa";
        ctx.fillRect(cx - 6, cy - 2, 12, 5);
        ctx.fillStyle = "#9966bb";
        ctx.fillRect(cx - 4, cy - 3, 8, 2);
        // Camera/sensor pod
        ctx.fillStyle = "#333344";
        ctx.fillRect(cx - 2, cy + 3, 4, 3);
        ctx.fillStyle = "#ff2222";
        ctx.fillRect(cx - 1, cy + 4, 2, 1);
        // Arms extending to rotors
        ctx.fillStyle = "#776699";
        ctx.fillRect(e.x + 2, cy - 1, cx - e.x - 6, 2);
        ctx.fillRect(cx + 5, cy - 1, cx - e.x - 6, 2);
        // Rotor mounts
        ctx.fillStyle = "#665588";
        ctx.fillRect(e.x + 1, cy - 3, 4, 4);
        ctx.fillRect(e.x + e.w - 5, cy - 3, 4, 4);
        // Spinning rotor blades (alternate frames for animation)
        ctx.fillStyle = "rgba(180, 140, 220, 0.6)";
        ctx.fillRect(e.x - 2, cy - 4, 10, 1);
        ctx.fillRect(e.x + e.w - 8, cy - 4, 10, 1);
        ctx.fillStyle = "rgba(180, 140, 220, 0.3)";
        ctx.beginPath();
        ctx.ellipse(e.x + 3, cy - 3, 6, 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(e.x + e.w - 3, cy - 3, 6, 2, 0, 0, Math.PI * 2);
        ctx.fill();
        // Status LED
        ctx.fillStyle = (Date.now() % 600 < 300) ? "#00ff44" : "#004400";
        ctx.fillRect(cx, cy - 2, 2, 2);
      } else if (e.type === "plane") {
        // ── Jet Fighter (36×16) ──
        const f = e.vx > 0; // facing right
        const mx = e.x; // left edge
        const my = e.y; // top edge
        if (f) {
          // Nose cone
          ctx.fillStyle = "#cc7700";
          ctx.beginPath();
          ctx.moveTo(mx + 36, my + 7);
          ctx.lineTo(mx + 36, my + 10);
          ctx.lineTo(mx + 30, my + 6);
          ctx.lineTo(mx + 30, my + 11);
          ctx.closePath();
          ctx.fill();
          // Fuselage
          ctx.fillStyle = e.color;
          ctx.fillRect(mx + 8, my + 5, 22, 7);
          // Cockpit canopy
          ctx.fillStyle = "#55ccff";
          ctx.fillRect(mx + 24, my + 6, 5, 3);
          ctx.fillStyle = "#44aadd";
          ctx.fillRect(mx + 25, my + 7, 3, 1);
          // Wings (swept back)
          ctx.fillStyle = "#dd8822";
          ctx.beginPath();
          ctx.moveTo(mx + 20, my + 5);
          ctx.lineTo(mx + 12, my);
          ctx.lineTo(mx + 10, my);
          ctx.lineTo(mx + 16, my + 5);
          ctx.closePath();
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(mx + 20, my + 12);
          ctx.lineTo(mx + 12, my + 16);
          ctx.lineTo(mx + 10, my + 16);
          ctx.lineTo(mx + 16, my + 12);
          ctx.closePath();
          ctx.fill();
          // Tail fins
          ctx.fillStyle = "#bb7711";
          ctx.beginPath();
          ctx.moveTo(mx + 10, my + 5);
          ctx.lineTo(mx + 5, my + 1);
          ctx.lineTo(mx + 8, my + 5);
          ctx.closePath();
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(mx + 10, my + 12);
          ctx.lineTo(mx + 5, my + 15);
          ctx.lineTo(mx + 8, my + 12);
          ctx.closePath();
          ctx.fill();
          // Engine exhaust glow
          ctx.fillStyle = "#ffcc44";
          ctx.fillRect(mx + 4, my + 7, 4, 3);
          ctx.fillStyle = "rgba(255, 200, 50, 0.4)";
          ctx.fillRect(mx, my + 7, 5, 3);
        } else {
          // Nose cone (mirrored)
          ctx.fillStyle = "#cc7700";
          ctx.beginPath();
          ctx.moveTo(mx, my + 7);
          ctx.lineTo(mx, my + 10);
          ctx.lineTo(mx + 6, my + 6);
          ctx.lineTo(mx + 6, my + 11);
          ctx.closePath();
          ctx.fill();
          // Fuselage
          ctx.fillStyle = e.color;
          ctx.fillRect(mx + 6, my + 5, 22, 7);
          // Cockpit canopy
          ctx.fillStyle = "#55ccff";
          ctx.fillRect(mx + 7, my + 6, 5, 3);
          ctx.fillStyle = "#44aadd";
          ctx.fillRect(mx + 8, my + 7, 3, 1);
          // Wings
          ctx.fillStyle = "#dd8822";
          ctx.beginPath();
          ctx.moveTo(mx + 16, my + 5);
          ctx.lineTo(mx + 24, my);
          ctx.lineTo(mx + 26, my);
          ctx.lineTo(mx + 20, my + 5);
          ctx.closePath();
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(mx + 16, my + 12);
          ctx.lineTo(mx + 24, my + 16);
          ctx.lineTo(mx + 26, my + 16);
          ctx.lineTo(mx + 20, my + 12);
          ctx.closePath();
          ctx.fill();
          // Tail fins
          ctx.fillStyle = "#bb7711";
          ctx.beginPath();
          ctx.moveTo(mx + 26, my + 5);
          ctx.lineTo(mx + 31, my + 1);
          ctx.lineTo(mx + 28, my + 5);
          ctx.closePath();
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(mx + 26, my + 12);
          ctx.lineTo(mx + 31, my + 15);
          ctx.lineTo(mx + 28, my + 12);
          ctx.closePath();
          ctx.fill();
          // Engine exhaust glow
          ctx.fillStyle = "#ffcc44";
          ctx.fillRect(mx + 28, my + 7, 4, 3);
          ctx.fillStyle = "rgba(255, 200, 50, 0.4)";
          ctx.fillRect(mx + 31, my + 7, 5, 3);
        }
      } else if (e.type === "tank") {
        // ── Tank (52×36) ──
        const f = eDist > 0;
        // Treads — outer track
        ctx.fillStyle = "#2a6a2a";
        ctx.fillRect(e.x, e.y + 24, e.w, 12);
        // Tread wheels
        ctx.fillStyle = "#1a4a1a";
        const wheelY = e.y + 27;
        for (let wx = e.x + 4; wx < e.x + e.w - 2; wx += 9) {
          ctx.beginPath();
          ctx.arc(wx + 3, wheelY + 3, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        // Tread segments
        ctx.fillStyle = "#336633";
        for (let tx = e.x + 1; tx < e.x + e.w - 1; tx += 5) {
          ctx.fillRect(tx, e.y + 24, 2, 1);
          ctx.fillRect(tx, e.y + 35, 2, 1);
        }
        // Hull body
        ctx.fillStyle = "#3a8a3a";
        ctx.beginPath();
        ctx.moveTo(e.x + 4, e.y + 24);
        ctx.lineTo(e.x + 10, e.y + 12);
        ctx.lineTo(e.x + e.w - 10, e.y + 12);
        ctx.lineTo(e.x + e.w - 4, e.y + 24);
        ctx.closePath();
        ctx.fill();
        // Hull top plate
        ctx.fillStyle = "#44aa44";
        ctx.fillRect(e.x + 10, e.y + 12, e.w - 20, 4);
        // Hull front slope highlight
        ctx.fillStyle = "#55bb55";
        const frontX = f ? e.x + e.w - 12 : e.x + 4;
        ctx.fillRect(frontX, e.y + 14, 8, 2);
        // Turret base
        ctx.fillStyle = "#3a9a3a";
        ctx.fillRect(e.x + 14, e.y + 6, 24, 10);
        // Turret top
        ctx.fillStyle = "#44bb44";
        ctx.fillRect(e.x + 16, e.y + 4, 20, 4);
        // Hatch
        ctx.fillStyle = "#2a7a2a";
        ctx.fillRect(e.x + 22, e.y + 4, 8, 3);
        ctx.fillStyle = "#338833";
        ctx.fillRect(e.x + 24, e.y + 5, 4, 1);
        // Cannon barrel
        ctx.fillStyle = "#2a7a2a";
        const barrelLen = 18;
        const barrelY = e.y + 9;
        if (f) {
          ctx.fillRect(e.x + 38, barrelY, barrelLen, 4);
          // Muzzle brake
          ctx.fillStyle = "#226622";
          ctx.fillRect(e.x + 38 + barrelLen - 3, barrelY - 1, 3, 6);
        } else {
          ctx.fillRect(e.x - barrelLen + 14, barrelY, barrelLen, 4);
          ctx.fillStyle = "#226622";
          ctx.fillRect(e.x - barrelLen + 14, barrelY - 1, 3, 6);
        }
        // Reactive armor blocks on hull side
        ctx.fillStyle = "#338833";
        ctx.fillRect(e.x + 6, e.y + 18, 6, 4);
        ctx.fillRect(e.x + 14, e.y + 18, 6, 4);
        ctx.fillRect(e.x + e.w - 12, e.y + 18, 6, 4);
        ctx.fillRect(e.x + e.w - 20, e.y + 18, 6, 4);
        // Exhaust pipes
        ctx.fillStyle = "#555555";
        const exX = f ? e.x + 2 : e.x + e.w - 5;
        ctx.fillRect(exX, e.y + 13, 3, 3);
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

    // ── Player (24×32) ──────────────────────────────────────────
    const p = g.player;
    if (p.invincible > 0 && Math.floor(p.invincible / 3) % 2 === 0) {
      // Flash when invincible — skip drawing
    } else {
      const f = p.facingRight;
      ctx.shadowColor = "#00ffff";
      ctx.shadowBlur = 8;
      // Boots (dark navy)
      ctx.fillStyle = "#1a2244";
      ctx.fillRect(p.x + 3, p.y + 28, 6, 4);
      ctx.fillRect(p.x + 15, p.y + 28, 6, 4);
      // Legs (navy tactical pants)
      ctx.fillStyle = "#223366";
      ctx.fillRect(p.x + 4, p.y + 20, 5, 8);
      ctx.fillRect(p.x + 15, p.y + 20, 5, 8);
      // Knee pads
      ctx.fillStyle = "#334488";
      ctx.fillRect(p.x + 4, p.y + 22, 5, 2);
      ctx.fillRect(p.x + 15, p.y + 22, 5, 2);
      // Torso (tactical vest — blue-grey)
      ctx.fillStyle = "#2a4477";
      ctx.fillRect(p.x + 3, p.y + 10, 18, 11);
      // Vest pouches / armor plates
      ctx.fillStyle = "#335599";
      ctx.fillRect(p.x + 5, p.y + 12, 5, 4);
      ctx.fillRect(p.x + 14, p.y + 12, 5, 4);
      // Vest center stripe
      ctx.fillStyle = "#1a3366";
      ctx.fillRect(p.x + 11, p.y + 10, 2, 11);
      // Belt + utility
      ctx.fillStyle = "#1a2244";
      ctx.fillRect(p.x + 3, p.y + 19, 18, 2);
      ctx.fillStyle = "#00cccc";
      ctx.fillRect(p.x + 10, p.y + 19, 4, 2);
      // Shoulder pads
      ctx.fillStyle = "#335599";
      ctx.fillRect(p.x + 1, p.y + 10, 3, 4);
      ctx.fillRect(p.x + 20, p.y + 10, 3, 4);
      // Arms
      ctx.fillStyle = "#2a4477";
      ctx.fillRect(p.x + 1, p.y + 13, 3, 7);
      ctx.fillRect(p.x + 20, p.y + 13, 3, 7);
      // Head
      ctx.fillStyle = "#ddbb99";
      ctx.fillRect(p.x + 7, p.y + 3, 10, 8);
      // Tactical helmet (dark blue)
      ctx.fillStyle = "#1a3060";
      ctx.fillRect(p.x + 5, p.y, 14, 5);
      ctx.fillRect(p.x + 6, p.y + 4, 12, 2);
      // Helmet rim
      ctx.fillStyle = "#224488";
      ctx.fillRect(p.x + 5, p.y + 4, 14, 1);
      // Cyan visor (neon glow)
      ctx.shadowBlur = 10;
      ctx.shadowColor = "#00ffff";
      ctx.fillStyle = "#00ffff";
      if (f) {
        ctx.fillRect(p.x + 13, p.y + 5, 5, 3);
        ctx.fillStyle = "#88ffff";
        ctx.fillRect(p.x + 15, p.y + 6, 2, 1);
      } else {
        ctx.fillRect(p.x + 6, p.y + 5, 5, 3);
        ctx.fillStyle = "#88ffff";
        ctx.fillRect(p.x + 7, p.y + 6, 2, 1);
      }
      ctx.shadowBlur = 0;
      // Weapon
      ctx.fillStyle = "#778899";
      const gunX = f ? p.x + 21 : p.x - 10;
      ctx.fillRect(gunX, p.y + 14, 13, 3);
      // Barrel
      ctx.fillStyle = "#556677";
      ctx.fillRect(gunX + (f ? 11 : 0), p.y + 13, 2, 5);
      // Stock
      ctx.fillStyle = "#3a3a3a";
      ctx.fillRect(gunX + (f ? 0 : 11), p.y + 15, 3, 2);
      // Muzzle glow when shooting
      if (p.shootCooldown > SHOOT_COOLDOWN - 3) {
        ctx.shadowColor = "#ffff00";
        ctx.shadowBlur = 8;
        ctx.fillStyle = "#ffff44";
        const muzzleX = f ? gunX + 13 : gunX - 2;
        ctx.fillRect(muzzleX, p.y + 13, 3, 4);
        ctx.shadowBlur = 0;
      }
      // Cyan chevron on shoulder (team marker)
      ctx.fillStyle = "#00cccc";
      ctx.fillRect(p.x + (f ? 20 : 1), p.y + 11, 3, 1);
      ctx.fillRect(p.x + (f ? 21 : 1), p.y + 12, 2, 1);
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
      ctx.shadowColor = g.wave % 5 === 0 ? "#44cc44" : "#00ffff";
      ctx.shadowBlur = 20;
      ctx.fillStyle = g.wave % 5 === 0 ? "#44cc44" : "#00ffff";
      const waveText = g.wave % 5 === 0 ? `TANK WAVE ${g.wave}` : `WAVE ${g.wave}`;
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
