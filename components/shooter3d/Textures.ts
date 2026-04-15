"use client";

import * as THREE from "three";

/**
 * Procedural texture generator using OffscreenCanvas / Canvas2D.
 * Creates bright, gritty, warm Doom-inspired industrial textures at runtime.
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

// ── Wall texture: warm brown/tan metal panels with rust accents ──

export function createWallTexture(): THREE.CanvasTexture {
  const S = 128;
  const { canvas, ctx } = createCanvas(S, S);

  // Warm base — medium brown-grey
  ctx.fillStyle = "#6a5948";
  ctx.fillRect(0, 0, S, S);

  // Panel grid (2×2 panels)
  const panelSize = S / 2;
  for (let px = 0; px < 2; px++) {
    for (let py = 0; py < 2; py++) {
      const x = px * panelSize;
      const y = py * panelSize;

      // Panel face — warm tan with variation
      const r = 110 + Math.floor(Math.random() * 25);
      const g = 92 + Math.floor(Math.random() * 20);
      const b = 72 + Math.floor(Math.random() * 18);
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(x + 3, y + 3, panelSize - 6, panelSize - 6);

      // Bright bevel — top/left
      ctx.fillStyle = "#9a8268";
      ctx.fillRect(x + 2, y + 2, panelSize - 4, 2);
      ctx.fillRect(x + 2, y + 2, 2, panelSize - 4);
      // Dark bevel — bottom/right
      ctx.fillStyle = "#3a3025";
      ctx.fillRect(x + 2, y + panelSize - 4, panelSize - 4, 2);
      ctx.fillRect(x + panelSize - 4, y + 2, 2, panelSize - 4);

      // Rivets in corners (brighter for visibility)
      ctx.fillStyle = "#8a7558";
      for (const [rx, ry] of [
        [x + 8, y + 8],
        [x + panelSize - 10, y + 8],
        [x + 8, y + panelSize - 10],
        [x + panelSize - 10, y + panelSize - 10],
      ]) {
        ctx.beginPath();
        ctx.arc(rx, ry, 2.5, 0, Math.PI * 2);
        ctx.fill();
        // Rivet highlight
        ctx.fillStyle = "#b8a080";
        ctx.beginPath();
        ctx.arc(rx - 0.5, ry - 0.5, 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#8a7558";
      }

      // Random rust streaks
      if (Math.random() < 0.4) {
        ctx.fillStyle = "#7a4a2a";
        const rx = x + 10 + Math.random() * (panelSize - 20);
        const ry = y + 10 + Math.random() * (panelSize - 30);
        ctx.fillRect(rx, ry, 1, 8 + Math.random() * 10);
      }
    }
  }

  // Dark seam lines
  ctx.fillStyle = "#2a2218";
  ctx.fillRect(panelSize - 1, 0, 2, S);
  ctx.fillRect(0, panelSize - 1, S, 2);

  addNoise(ctx, S, S, 20);
  return toTexture(canvas);
}

// ── Floor texture: industrial metal grating with brown warmth ──

export function createFloorTexture(): THREE.CanvasTexture {
  const S = 128;
  const { canvas, ctx } = createCanvas(S, S);

  // Warmer base
  ctx.fillStyle = "#3d3328";
  ctx.fillRect(0, 0, S, S);

  // Tile grid (4×4)
  const tileSize = S / 4;
  for (let tx = 0; tx < 4; tx++) {
    for (let ty = 0; ty < 4; ty++) {
      const x = tx * tileSize;
      const y = ty * tileSize;

      // Brighter warm floor tiles
      const r = 75 + Math.floor(Math.random() * 25);
      const g = 62 + Math.floor(Math.random() * 18);
      const b = 48 + Math.floor(Math.random() * 15);
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(x + 1, y + 1, tileSize - 2, tileSize - 2);

      // Diamond plate pattern — diagonal highlights
      ctx.fillStyle = "#8a7550";
      ctx.fillRect(x + tileSize / 2 - 1, y + 6, 2, tileSize - 12);
      ctx.fillRect(x + 6, y + tileSize / 2 - 1, tileSize - 12, 2);

      // Dark cross groove
      ctx.fillStyle = "#2a2218";
      ctx.fillRect(x + tileSize / 2, y + 4, 1, tileSize - 8);
      ctx.fillRect(x + 4, y + tileSize / 2, tileSize - 8, 1);
    }
  }

  // Dark seam grid
  ctx.fillStyle = "#1a1410";
  for (let i = 0; i <= 4; i++) {
    ctx.fillRect(i * tileSize - 1, 0, 2, S);
    ctx.fillRect(0, i * tileSize - 1, S, 2);
  }

  addNoise(ctx, S, S, 16);
  return toTexture(canvas);
}

// ── Ceiling texture: dark industrial with exposed girders ──

export function createCeilingTexture(): THREE.CanvasTexture {
  const S = 128;
  const { canvas, ctx } = createCanvas(S, S);

  // Medium-warm base
  ctx.fillStyle = "#3a3025";
  ctx.fillRect(0, 0, S, S);

  // Large panels (2×2)
  const ps = S / 2;
  for (let px = 0; px < 2; px++) {
    for (let py = 0; py < 2; py++) {
      const x = px * ps;
      const y = py * ps;

      const r = 60 + Math.floor(Math.random() * 20);
      const g = 50 + Math.floor(Math.random() * 15);
      const b = 38 + Math.floor(Math.random() * 12);
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(x + 2, y + 2, ps - 4, ps - 4);

      // Inner recessed rectangle (darker)
      ctx.fillStyle = "#2a2218";
      ctx.fillRect(x + 10, y + 10, ps - 20, ps - 20);

      // Center vent grate
      ctx.fillStyle = "#4a3828";
      ctx.fillRect(x + ps / 2 - 8, y + ps / 2 - 8, 16, 16);
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = "#1a1208";
        ctx.fillRect(x + ps / 2 - 7, y + ps / 2 - 7 + i * 4, 14, 2);
      }
    }
  }

  // Seams
  ctx.fillStyle = "#15100a";
  ctx.fillRect(ps - 1, 0, 2, S);
  ctx.fillRect(0, ps - 1, S, 2);

  addNoise(ctx, S, S, 14);
  return toTexture(canvas);
}

// ── Trim/platform texture: orange hazard stripes ────────────

export function createTrimTexture(): THREE.CanvasTexture {
  const S = 64;
  const { canvas, ctx } = createCanvas(S, S);

  ctx.fillStyle = "#5a4028";
  ctx.fillRect(0, 0, S, S);

  // Hazard diagonal stripes (brighter)
  ctx.fillStyle = "#a66830";
  for (let i = -S; i < S * 2; i += 12) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + S, S);
    ctx.lineTo(i + S + 6, S);
    ctx.lineTo(i + 6, 0);
    ctx.fill();
  }

  // Bright edge highlights
  ctx.fillStyle = "#7a5838";
  ctx.fillRect(0, 0, S, 2);
  ctx.fillRect(0, S - 2, S, 2);

  addNoise(ctx, S, S, 22);
  return toTexture(canvas);
}

// ── Crate texture: wooden/metal cargo crate with bolts ──────

export function createCrateTexture(): THREE.CanvasTexture {
  const S = 64;
  const { canvas, ctx } = createCanvas(S, S);

  // Warmer wood base
  ctx.fillStyle = "#5a3e26";
  ctx.fillRect(0, 0, S, S);

  // Main planks
  ctx.fillStyle = "#74502e";
  ctx.fillRect(3, 3, S - 6, S - 6);

  // Plank grain — vertical lines
  for (let i = 10; i < S - 6; i += 8) {
    ctx.fillStyle = `rgba(${40 + Math.random() * 30}, ${28 + Math.random() * 15}, ${18 + Math.random() * 10}, 0.5)`;
    ctx.fillRect(i, 3, 1, S - 6);
  }

  // Cross braces (darker metal)
  ctx.fillStyle = "#3a2818";
  ctx.fillRect(0, S / 2 - 4, S, 8);
  ctx.fillRect(S / 2 - 4, 0, 8, S);

  // Bolt highlights on braces
  ctx.fillStyle = "#9a7a4a";
  for (const [bx, by] of [[8, S / 2], [S - 10, S / 2], [S / 2, 8], [S / 2, S - 10]]) {
    ctx.beginPath();
    ctx.arc(bx, by, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Corner reinforcements
  ctx.fillStyle = "#5a4028";
  for (const [bx, by] of [[3, 3], [S - 10, 3], [3, S - 10], [S - 10, S - 10]]) {
    ctx.fillRect(bx, by, 7, 7);
    ctx.fillStyle = "#9a7a4a";
    ctx.fillRect(bx + 2, by + 2, 3, 3);
    ctx.fillStyle = "#5a4028";
  }

  // Edge darkening
  ctx.fillStyle = "#1a1008";
  ctx.fillRect(0, 0, S, 2);
  ctx.fillRect(0, S - 2, S, 2);
  ctx.fillRect(0, 0, 2, S);
  ctx.fillRect(S - 2, 0, 2, S);

  addNoise(ctx, S, S, 24);
  return toTexture(canvas);
}
