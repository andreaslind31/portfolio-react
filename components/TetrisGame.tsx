"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useTheme } from "@/hooks/useTheme";

const COLS = 10;
const ROWS = 20;
const CELL = 28;
const PREVIEW_CELL = 20;

const COLORS = [
  "#00f0f0", // 0 = I (cyan)
  "#f0f000", // 1 = O (yellow)
  "#a000f0", // 2 = T (purple)
  "#00f000", // 3 = S (green)
  "#f00000", // 4 = Z (red)
  "#0000f0", // 5 = J (blue)
  "#f0a000", // 6 = L (orange)
];

const SHAPES = [
  [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], // I
  [[1, 1], [1, 1]],                                             // O
  [[0, 1, 0], [1, 1, 1], [0, 0, 0]],                           // T
  [[0, 1, 1], [1, 1, 0], [0, 0, 0]],                           // S
  [[1, 1, 0], [0, 1, 1], [0, 0, 0]],                           // Z
  [[1, 0, 0], [1, 1, 1], [0, 0, 0]],                           // J
  [[0, 0, 1], [1, 1, 1], [0, 0, 0]],                           // L
];

type Board = number[][]; // ROWS×COLS, 0=empty, 1–7=piece type+1

function rotateMatrix(m: number[][]): number[][] {
  const n = m.length;
  const r: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) r[j][n - 1 - i] = m[i][j];
  return r;
}

function getShape(type: number, rotation: number): number[][] {
  let s = SHAPES[type];
  for (let r = 0; r < rotation % 4; r++) s = rotateMatrix(s);
  return s;
}

function getCells(type: number, rotation: number): [number, number][] {
  const s = getShape(type, rotation);
  const cells: [number, number][] = [];
  for (let r = 0; r < s.length; r++)
    for (let c = 0; c < s[r].length; c++) if (s[r][c]) cells.push([r, c]);
  return cells;
}

function isValid(board: Board, type: number, rot: number, x: number, y: number): boolean {
  for (const [dr, dc] of getCells(type, rot)) {
    const nr = y + dr, nc = x + dc;
    if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) return false;
    if (board[nr][nc]) return false;
  }
  return true;
}

function createBoard(): Board {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function shuffle(arr: number[]): number[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function drawCellAt(ctx: CanvasRenderingContext2D, px: number, py: number, color: string, size: number) {
  ctx.fillStyle = color;
  ctx.fillRect(px + 1, py + 1, size - 2, size - 2);
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.fillRect(px + 1, py + 1, size - 2, 2);
  ctx.fillRect(px + 1, py + 1, 2, size - 4);
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fillRect(px + 1, py + size - 3, size - 2, 2);
  ctx.fillRect(px + size - 3, py + 3, 2, size - 4);
}

interface Engine {
  draw: () => void;
  drawPreview: () => void;
  move: (dx: number) => void;
  rotate: () => void;
  softDrop: () => void;
  hardDrop: () => void;
  togglePause: () => void;
  start: () => void;
}

function RepeatButton({
  onAction,
  children,
  className,
  label,
}: {
  onAction: () => void;
  children: React.ReactNode;
  className?: string;
  label: string;
}) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    timeoutRef.current = null;
    intervalRef.current = null;
  }, []);

  const begin = useCallback(() => {
    onAction();
    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(onAction, 75);
    }, 180);
  }, [onAction]);

  useEffect(() => stop, [stop]);

  return (
    <button
      onTouchStart={(e) => { e.preventDefault(); begin(); }}
      onTouchEnd={stop}
      onTouchCancel={stop}
      onMouseDown={begin}
      onMouseUp={stop}
      onMouseLeave={stop}
      className={className}
      aria-label={label}
      type="button"
    >
      {children}
    </button>
  );
}

export default function TetrisGame({
  onScoreSubmit,
}: {
  onScoreSubmit?: (name: string, score: number) => Promise<string | null>;
}) {
  const { dark } = useTheme();
  const darkRef = useRef(dark);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);

  // Game state refs
  const boardRef = useRef<Board>(createBoard());
  const currentRef = useRef<{ type: number; x: number; y: number; rot: number } | null>(null);
  const nextTypeRef = useRef(0);
  const bagRef = useRef<number[]>([]);
  const scoreRef = useRef(0);
  const levelRef = useRef(1);
  const linesRef = useRef(0);
  const gameOverRef = useRef(false);
  const pausedRef = useRef(false);
  const startedRef = useRef(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const engineRef = useRef<Engine>(null!);

  // UI state
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lines, setLines] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [paused, setPaused] = useState(false);
  const [started, setStarted] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [controlsFlipped, setControlsFlipped] = useState(false);

  // Load controls preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("arcade-controls-flipped");
    if (saved === "true") setControlsFlipped(true);
  }, []);

  const toggleControls = useCallback(() => {
    setControlsFlipped((prev) => {
      const next = !prev;
      localStorage.setItem("arcade-controls-flipped", String(next));
      return next;
    });
  }, []);

  // Keep dark ref in sync + redraw
  useEffect(() => {
    darkRef.current = dark;
    engineRef.current?.draw();
    engineRef.current?.drawPreview();
  }, [dark]);

  // Initialize game engine
  useEffect(() => {
    function nextFromBag(): number {
      if (bagRef.current.length === 0) {
        bagRef.current = shuffle([0, 1, 2, 3, 4, 5, 6]);
      }
      return bagRef.current.pop()!;
    }

    function draw() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const isDark = darkRef.current;
      const board = boardRef.current;
      const cur = currentRef.current;

      // Background
      ctx.fillStyle = isDark ? "#0f0f17" : "#eeeef2";
      ctx.fillRect(0, 0, COLS * CELL, ROWS * CELL);

      // Grid
      ctx.strokeStyle = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.06)";
      ctx.lineWidth = 0.5;
      for (let r = 0; r <= ROWS; r++) {
        ctx.beginPath();
        ctx.moveTo(0, r * CELL);
        ctx.lineTo(COLS * CELL, r * CELL);
        ctx.stroke();
      }
      for (let c = 0; c <= COLS; c++) {
        ctx.beginPath();
        ctx.moveTo(c * CELL, 0);
        ctx.lineTo(c * CELL, ROWS * CELL);
        ctx.stroke();
      }

      // Placed pieces
      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++)
          if (board[r][c])
            drawCellAt(ctx, c * CELL, r * CELL, COLORS[board[r][c] - 1], CELL);

      if (cur && !gameOverRef.current) {
        // Ghost piece
        let ghostY = cur.y;
        while (isValid(board, cur.type, cur.rot, cur.x, ghostY + 1)) ghostY++;
        if (ghostY !== cur.y) {
          ctx.globalAlpha = 0.2;
          for (const [dr, dc] of getCells(cur.type, cur.rot))
            drawCellAt(ctx, (cur.x + dc) * CELL, (ghostY + dr) * CELL, COLORS[cur.type], CELL);
          ctx.globalAlpha = 1;
        }

        // Current piece
        for (const [dr, dc] of getCells(cur.type, cur.rot))
          drawCellAt(ctx, (cur.x + dc) * CELL, (cur.y + dr) * CELL, COLORS[cur.type], CELL);
      }
    }

    function drawPreview() {
      const canvas = previewRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const isDark = darkRef.current;
      ctx.fillStyle = isDark ? "#0f0f17" : "#eeeef2";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const type = nextTypeRef.current;
      const shape = SHAPES[type];
      const size = shape.length;
      const ox = (canvas.width - size * PREVIEW_CELL) / 2;
      const oy = (canvas.height - size * PREVIEW_CELL) / 2;

      for (let r = 0; r < size; r++)
        for (let c = 0; c < shape[r].length; c++)
          if (shape[r][c])
            drawCellAt(ctx, ox + c * PREVIEW_CELL, oy + r * PREVIEW_CELL, COLORS[type], PREVIEW_CELL);
    }

    function spawnPiece(): boolean {
      const type = nextTypeRef.current;
      nextTypeRef.current = nextFromBag();
      const x = Math.floor((COLS - SHAPES[type][0].length) / 2);
      const y = 0;

      if (!isValid(boardRef.current, type, 0, x, y)) {
        gameOverRef.current = true;
        setGameOver(true);
        if (tickRef.current) clearInterval(tickRef.current);
        draw();
        return false;
      }

      currentRef.current = { type, x, y, rot: 0 };
      drawPreview();
      draw();
      return true;
    }

    function getSpeed(): number {
      return Math.max(80, 800 - (levelRef.current - 1) * 70);
    }

    function startTick() {
      if (tickRef.current) clearInterval(tickRef.current);
      tickRef.current = setInterval(() => {
        if (pausedRef.current || gameOverRef.current || !startedRef.current) return;
        gameTick();
      }, getSpeed());
    }

    function lockPiece() {
      const cur = currentRef.current;
      if (!cur) return;

      const board = boardRef.current;
      for (const [dr, dc] of getCells(cur.type, cur.rot)) {
        const r = cur.y + dr, c = cur.x + dc;
        if (r >= 0 && r < ROWS && c >= 0 && c < COLS) board[r][c] = cur.type + 1;
      }

      // Clear lines
      let cleared = 0;
      for (let r = ROWS - 1; r >= 0; r--) {
        if (board[r].every((cell) => cell !== 0)) {
          board.splice(r, 1);
          board.unshift(Array(COLS).fill(0));
          cleared++;
          r++;
        }
      }

      if (cleared > 0) {
        const points = [0, 100, 300, 500, 800][cleared] * levelRef.current;
        scoreRef.current += points;
        linesRef.current += cleared;
        const newLevel = Math.floor(linesRef.current / 10) + 1;
        const levelChanged = newLevel !== levelRef.current;
        levelRef.current = newLevel;

        setScore(scoreRef.current);
        setLines(linesRef.current);
        setLevel(levelRef.current);

        if (levelChanged) startTick();
      }

      currentRef.current = null;
      spawnPiece();
    }

    function gameTick() {
      const cur = currentRef.current;
      if (!cur) return;

      if (isValid(boardRef.current, cur.type, cur.rot, cur.x, cur.y + 1)) {
        cur.y++;
        draw();
      } else {
        lockPiece();
      }
    }

    function move(dx: number) {
      if (pausedRef.current || gameOverRef.current) return;
      const cur = currentRef.current;
      if (!cur) return;
      if (isValid(boardRef.current, cur.type, cur.rot, cur.x + dx, cur.y)) {
        cur.x += dx;
        draw();
      }
    }

    function rotate() {
      if (pausedRef.current || gameOverRef.current) return;
      const cur = currentRef.current;
      if (!cur) return;

      const newRot = (cur.rot + 1) % 4;
      // Try wall kicks: (0,0), (-1,0), (+1,0), (0,-1), (-2,0), (+2,0)
      const kicks = [[0, 0], [-1, 0], [1, 0], [0, -1], [-2, 0], [2, 0]];
      for (const [dx, dy] of kicks) {
        if (isValid(boardRef.current, cur.type, newRot, cur.x + dx, cur.y + dy)) {
          cur.rot = newRot;
          cur.x += dx;
          cur.y += dy;
          draw();
          return;
        }
      }
    }

    function softDrop() {
      if (pausedRef.current || gameOverRef.current) return;
      const cur = currentRef.current;
      if (!cur) return;
      if (isValid(boardRef.current, cur.type, cur.rot, cur.x, cur.y + 1)) {
        cur.y++;
        draw();
      }
    }

    function hardDrop() {
      if (pausedRef.current || gameOverRef.current) return;
      const cur = currentRef.current;
      if (!cur) return;
      while (isValid(boardRef.current, cur.type, cur.rot, cur.x, cur.y + 1)) cur.y++;
      lockPiece();
    }

    function togglePause() {
      if (gameOverRef.current || !startedRef.current) return;
      pausedRef.current = !pausedRef.current;
      setPaused(pausedRef.current);
    }

    function start() {
      boardRef.current = createBoard();
      bagRef.current = [];
      scoreRef.current = 0;
      levelRef.current = 1;
      linesRef.current = 0;
      gameOverRef.current = false;
      pausedRef.current = false;
      startedRef.current = true;
      nextTypeRef.current = nextFromBag();

      setScore(0);
      setLevel(1);
      setLines(0);
      setGameOver(false);
      setPaused(false);
      setStarted(true);
      setSubmitted(false);
      setPlayerName("");

      spawnPiece();
      startTick();
    }

    engineRef.current = { draw, drawPreview, move, rotate, softDrop, hardDrop, togglePause, start };

    // Initial draw (empty board)
    draw();
    drawPreview();

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  // Keyboard input
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const engine = engineRef.current;
      if (!engine) return;

      if (e.key === " ") {
        e.preventDefault();
        if (!startedRef.current || gameOverRef.current) {
          engine.start();
          return;
        }
        engine.hardDrop();
        return;
      }

      if (!startedRef.current || gameOverRef.current) return;

      switch (e.key) {
        case "Escape":
          e.preventDefault();
          engine.togglePause();
          break;
        case "ArrowLeft":
          e.preventDefault();
          engine.move(-1);
          break;
        case "ArrowRight":
          e.preventDefault();
          engine.move(1);
          break;
        case "ArrowUp":
          e.preventDefault();
          engine.rotate();
          break;
        case "ArrowDown":
          e.preventDefault();
          engine.softDrop();
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSubmit = async () => {
    if (!onScoreSubmit || !playerName.trim() || submitting || submitted) return;
    setSubmitting(true);
    setSubmitError(null);
    const error = await onScoreSubmit(playerName.trim(), scoreRef.current);
    setSubmitting(false);
    if (error) {
      setSubmitError(error);
    } else {
      setSubmitted(true);
    }
  };

  return (
    <div className="arcade-container">
      <div className="arcade-game">
        {/* Game board */}
        <div className="arcade-board">
          <canvas
            ref={canvasRef}
            width={COLS * CELL}
            height={ROWS * CELL}
            className="arcade-canvas"
          />

          {/* Start overlay */}
          {!started && (
            <div className="arcade-overlay">
              <div className="arcade-overlay-content">
                <h2 className="arcade-title arcade-glow">TETRIS</h2>
                <p className="text-sm text-gray-400 mt-4">
                  Press <kbd className="arcade-kbd">SPACE</kbd> to start
                </p>
                <button
                  className="arcade-btn mt-4"
                  onClick={() => engineRef.current?.start()}
                  type="button"
                >
                  Start Game
                </button>
              </div>
            </div>
          )}

          {/* Pause overlay */}
          {paused && !gameOver && (
            <div className="arcade-overlay">
              <div className="arcade-overlay-content">
                <h2 className="text-2xl font-bold text-white">PAUSED</h2>
                <p className="text-sm text-gray-400 mt-2">
                  Press <kbd className="arcade-kbd">ESC</kbd> to resume
                </p>
              </div>
            </div>
          )}

          {/* Game over overlay */}
          {gameOver && (
            <div className="arcade-overlay">
              <div className="arcade-overlay-content">
                <h2 className="text-2xl font-bold text-red-400">GAME OVER</h2>
                <p className="text-3xl font-bold text-white mt-2">{score.toLocaleString()}</p>
                <p className="text-xs text-gray-400">points</p>

                {onScoreSubmit && !submitted && (
                  <div className="mt-4 flex flex-col gap-2">
                    <input
                      type="text"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value.slice(0, 16))}
                      onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
                      placeholder="Your name"
                      maxLength={16}
                      className="arcade-input"
                      autoFocus
                    />
                    <button
                      className="arcade-btn"
                      onClick={handleSubmit}
                      disabled={!playerName.trim() || submitting}
                      type="button"
                    >
                      {submitting ? "Submitting..." : "Submit Score"}
                    </button>
                    {submitError && (
                      <p className="text-xs text-red-400 mt-1">{submitError}</p>
                    )}
                  </div>
                )}

                {submitted && (
                  <p className="text-sm text-green-400 mt-3">Score submitted!</p>
                )}

                <button
                  className="arcade-btn-secondary mt-3"
                  onClick={() => { setSubmitError(null); engineRef.current?.start(); }}
                  type="button"
                >
                  Play Again
                </button>
              </div>
            </div>
          )}

          {/* CRT scanline overlay */}
          <div className="arcade-crt" />
        </div>

        {/* Side panel — desktop: vertical column, mobile: inline row */}
        <div className={`arcade-sidebar ${controlsFlipped ? "arcade-sidebar-flipped" : ""}`}>
          <div className="arcade-panel arcade-panel-next">
            <h3 className="arcade-panel-label">Next</h3>
            <canvas
              ref={previewRef}
              width={PREVIEW_CELL * 5}
              height={PREVIEW_CELL * 5}
              className="arcade-preview"
            />
          </div>
          <div className="arcade-panel-stats">
            <div className="arcade-panel arcade-panel-stat">
              <h3 className="arcade-panel-label">Score</h3>
              <p className="arcade-panel-value">{score.toLocaleString()}</p>
            </div>
            <div className="arcade-panel arcade-panel-stat">
              <h3 className="arcade-panel-label">Level</h3>
              <p className="arcade-panel-value">{level}</p>
            </div>
            <div className="arcade-panel arcade-panel-stat">
              <h3 className="arcade-panel-label">Lines</h3>
              <p className="arcade-panel-value">{lines}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Touch controls */}
      {started && !gameOver && (
        <div className="arcade-controls">
          <div className="arcade-controls-split">
            {/* Drop button */}
            <div className={`arcade-controls-group ${controlsFlipped ? "order-2" : "order-1"}`}>
              <button
                onTouchStart={(e) => { e.preventDefault(); engineRef.current?.hardDrop(); }}
                onClick={() => engineRef.current?.hardDrop()}
                className="arcade-control-btn arcade-control-action"
                aria-label="Hard drop"
                type="button"
              >
                <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M12 3v14m0 0l-4-4m4 4l4-4M5 21h14" />
                </svg>
                <span className="text-[10px] mt-0.5">Drop</span>
              </button>
            </div>

            {/* Arrow buttons: ↑ on top, ← ↓ → on bottom */}
            <div className={`arcade-controls-arrows ${controlsFlipped ? "order-1" : "order-2"}`}>
              <div className="arcade-controls-arrows-top">
                <button
                  onTouchStart={(e) => { e.preventDefault(); engineRef.current?.rotate(); }}
                  onClick={() => engineRef.current?.rotate()}
                  className="arcade-control-btn arcade-control-dpad"
                  aria-label="Rotate"
                  type="button"
                >
                  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path d="M5 15l7-7 7 7" />
                  </svg>
                </button>
              </div>
              <div className="arcade-controls-arrows-bottom">
                <RepeatButton
                  onAction={() => engineRef.current?.move(-1)}
                  className="arcade-control-btn arcade-control-dpad"
                  label="Move left"
                >
                  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path d="M15 19l-7-7 7-7" />
                  </svg>
                </RepeatButton>
                <RepeatButton
                  onAction={() => engineRef.current?.softDrop()}
                  className="arcade-control-btn arcade-control-dpad"
                  label="Soft drop"
                >
                  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path d="M19 9l-7 7-7-7" />
                  </svg>
                </RepeatButton>
                <RepeatButton
                  onAction={() => engineRef.current?.move(1)}
                  className="arcade-control-btn arcade-control-dpad"
                  label="Move right"
                >
                  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path d="M9 5l7 7-7 7" />
                  </svg>
                </RepeatButton>
              </div>
            </div>
          </div>

          {/* Swap button */}
          <button
            onClick={toggleControls}
            className="arcade-control-swap"
            aria-label="Swap control layout"
            type="button"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M7 16l-4-4m0 0l4-4m-4 4h18M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
            <span className="text-[10px] ml-1">Swap</span>
          </button>
        </div>
      )}
    </div>
  );
}
