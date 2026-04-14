"use client";

import * as THREE from "three";

/**
 * Procedural texture generator using OffscreenCanvas / Canvas2D.
 * Creates gritty, Doom-inspired textures at runtime — no image files needed.
 */

function createCanvas(w: number, h: number): {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
} {
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(w, h);
    return { canvas, ctx: canvas.getContext("2d")! };
  }
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  return { canvas, ctx: canvas.getContext("2d")! };
}

function addNoise(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  w: number,
  h: number,
  amount: number
) {
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const n = (Math.random() - 0.5) * amount;
    data[i] = Math.max(0, Math.min(255, data[i] + n));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n));
  }
  ctx.putImageData(imageData, 0, 0);
}

function toTexture(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  repeatX: number = 1,
  repeatY: number = 1
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas as HTMLCanvasElement);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestMipmapLinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ── Wall texture: metal panels with rivets and seams ────

export function createWallTexture(): THREE.CanvasTexture {
  const S = 128;
  const { canvas, ctx } = createCanvas(S, S);

  // Base — dark grey-brown
  ctx.fillStyle = "#2a2830";
  ctx.fillRect(0, 0, S, S);

  // Panel grid (2×2 panels)
  const panelSize = S / 2;
  for (let px = 0; px < 2; px++) {
    for (let py = 0; py < 2; py++) {
      const x = px * panelSize;
      const y = py * panelSize;

      // Panel face — slight color variation
      const shade = 38 + Math.floor(Math.random() * 12);
      ctx.fillStyle = `rgb(${shade}, ${shade - 4}, ${shade + 2})`;
      ctx.fillRect(x + 3, y + 3, panelSize - 6, panelSize - 6);

      // Bevel — lighter top/left, darker bottom/right
      ctx.fillStyle = "#3a3840";
      ctx.fillRect(x + 2, y + 2, panelSize - 4, 2);
      ctx.fillRect(x + 2, y + 2, 2, panelSize - 4);
      ctx.fillStyle = "#1a1820";
      ctx.fillRect(x + 2, y + panelSize - 4, panelSize - 4, 2);
      ctx.fillRect(x + panelSize - 4, y + 2, 2, panelSize - 4);

      // Rivets in corners
      ctx.fillStyle = "#4a4850";
      for (const [rx, ry] of [
        [x + 8, y + 8],
        [x + panelSize - 10, y + 8],
        [x + 8, y + panelSize - 10],
        [x + panelSize - 10, y + panelSize - 10],
      ]) {
        ctx.beginPath();
        ctx.arc(rx, ry, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Seam lines
  ctx.fillStyle = "#151318";
  ctx.fillRect(panelSize - 1, 0, 2, S);
  ctx.fillRect(0, panelSize - 1, S, 2);

  addNoise(ctx, S, S, 15);
  return toTexture(canvas);
}

// ── Floor texture: industrial grate / tile pattern ──────

export function createFloorTexture(): THREE.CanvasTexture {
  const S = 128;
  const { canvas, ctx } = createCanvas(S, S);

  // Dark base
  ctx.fillStyle = "#1e1c22";
  ctx.fillRect(0, 0, S, S);

  // Tile grid (4×4)
  const tileSize = S / 4;
  for (let tx = 0; tx < 4; tx++) {
    for (let ty = 0; ty < 4; ty++) {
      const x = tx * tileSize;
      const y = ty * tileSize;

      const shade = 28 + Math.floor(Math.random() * 10);
      ctx.fillStyle = `rgb(${shade}, ${shade - 2}, ${shade + 4})`;
      ctx.fillRect(x + 1, y + 1, tileSize - 2, tileSize - 2);

      // Subtle cross groove in each tile
      ctx.fillStyle = "#181620";
      ctx.fillRect(x + tileSize / 2 - 1, y + 4, 1, tileSize - 8);
      ctx.fillRect(x + 4, y + tileSize / 2 - 1, tileSize - 8, 1);
    }
  }

  // Grid seams
  ctx.fillStyle = "#0e0c12";
  for (let i = 0; i <= 4; i++) {
    ctx.fillRect(i * tileSize - 1, 0, 2, S);
    ctx.fillRect(0, i * tileSize - 1, S, 2);
  }

  addNoise(ctx, S, S, 12);
  return toTexture(canvas);
}

// ── Ceiling texture: dark tech panels ───────────────────

export function createCeilingTexture(): THREE.CanvasTexture {
  const S = 128;
  const { canvas, ctx } = createCanvas(S, S);

  ctx.fillStyle = "#18161e";
  ctx.fillRect(0, 0, S, S);

  // Large panels (2×2)
  const ps = S / 2;
  for (let px = 0; px < 2; px++) {
    for (let py = 0; py < 2; py++) {
      const x = px * ps;
      const y = py * ps;

      ctx.fillStyle = `rgb(${22 + Math.floor(Math.random() * 8)}, ${20 + Math.floor(Math.random() * 6)}, ${26 + Math.floor(Math.random() * 8)})`;
      ctx.fillRect(x + 2, y + 2, ps - 4, ps - 4);

      // Inner recessed rectangle
      ctx.fillStyle = "#12101a";
      ctx.fillRect(x + 10, y + 10, ps - 20, ps - 20);

      // Center detail
      ctx.fillStyle = "#1e1c26";
      ctx.fillRect(x + ps / 2 - 6, y + ps / 2 - 6, 12, 12);
    }
  }

  // Seams
  ctx.fillStyle = "#0a0810";
  ctx.fillRect(ps - 1, 0, 2, S);
  ctx.fillRect(0, ps - 1, S, 2);

  addNoise(ctx, S, S, 10);
  return toTexture(canvas);
}

// ── Trim/platform texture: hazard industrial ────────────

export function createTrimTexture(): THREE.CanvasTexture {
  const S = 64;
  const { canvas, ctx } = createCanvas(S, S);

  ctx.fillStyle = "#2a2428";
  ctx.fillRect(0, 0, S, S);

  // Hazard diagonal stripes (subtle)
  ctx.fillStyle = "#322c30";
  for (let i = -S; i < S * 2; i += 12) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + S, S);
    ctx.lineTo(i + S + 4, S);
    ctx.lineTo(i + 4, 0);
    ctx.fill();
  }

  // Edge highlight
  ctx.fillStyle = "#3a3438";
  ctx.fillRect(0, 0, S, 2);
  ctx.fillRect(0, S - 2, S, 2);

  addNoise(ctx, S, S, 18);
  return toTexture(canvas);
}

// ── Crate texture: wooden/metal crate ───────────────────

export function createCrateTexture(): THREE.CanvasTexture {
  const S = 64;
  const { canvas, ctx } = createCanvas(S, S);

  ctx.fillStyle = "#2e2620";
  ctx.fillRect(0, 0, S, S);

  // Planks
  ctx.fillStyle = "#342e26";
  ctx.fillRect(3, 3, S - 6, S - 6);

  // Cross braces
  ctx.fillStyle = "#3a3228";
  ctx.fillRect(0, S / 2 - 3, S, 6);
  ctx.fillRect(S / 2 - 3, 0, 6, S);

  // Corner bolts
  ctx.fillStyle = "#4a4440";
  for (const [bx, by] of [[6, 6], [S - 8, 6], [6, S - 8], [S - 8, S - 8]]) {
    ctx.fillRect(bx, by, 3, 3);
  }

  // Edge darkening
  ctx.fillStyle = "#1a1610";
  ctx.fillRect(0, 0, S, 2);
  ctx.fillRect(0, S - 2, S, 2);
  ctx.fillRect(0, 0, 2, S);
  ctx.fillRect(S - 2, 0, 2, S);

  addNoise(ctx, S, S, 20);
  return toTexture(canvas);
}
