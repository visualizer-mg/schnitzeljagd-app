import React, { useRef, useEffect, useState, useCallback } from 'react';
import { colors, fonts } from '../theme';

// ─── Config ───
const CELL = 22;
const COLS = 21;
const ROWS = 21;
const MAZE_W = COLS * CELL;
const MAZE_H = ROWS * CELL;
const PANEL_H = 160;
const CANVAS_W = MAZE_W + 18;
const CANVAS_H = MAZE_H + PANEL_H + 10;
const PAD_X = Math.floor((CANVAS_W - MAZE_W) / 2);
const PAD_Y = 6;
const MOUSE_RADIUS = 7;
const CHEESE_RADIUS = 8;
const MOUSE_SPEED = 2.8;
const CAT_SPEED = 0.7;           // much slower — gives player room to breathe
const CAT_RADIUS = 8;
const CATCH_DIST = 14;
const BFS_INTERVAL = 400;        // recalc path every 400ms
const LIGHT_RADIUS = 70;         // visible radius during flicker
const FLICKER_ON_MS = 4000;      // light on duration
const FLICKER_OFF_MS = 2800;     // light off duration
const FLICKER_FADE_MS = 600;     // fade transition
const FLICKER_START_CHEESE = 4;  // flicker starts after this many cheeses

// ─── Maze layout (1=wall, 0=path) ───
const MAZE = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,1],
  [1,0,1,0,1,0,1,1,1,0,1,0,1,1,1,0,1,0,1,0,1],
  [1,0,1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,1,0,1],
  [1,0,1,1,1,1,1,0,1,1,1,0,1,0,1,1,1,1,1,0,1],
  [1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
  [1,1,1,0,1,0,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1],
  [1,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1],
  [1,0,1,1,1,1,1,0,1,1,1,1,1,0,1,1,1,1,1,0,1],
  [1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,1],
  [1,1,1,1,1,0,1,1,1,0,1,1,1,1,1,1,1,0,1,0,1],
  [1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,1,1,1,0,1,1,1,0,1,1,1,1,1,1,1,0,1],
  [1,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,1],
  [1,1,1,0,1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,0,1],
  [1,0,0,0,1,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1],
  [1,0,1,1,1,1,1,0,1,1,1,1,1,0,1,0,1,1,1,1,1],
  [1,0,0,0,0,0,1,0,0,0,0,0,1,0,1,0,0,0,0,0,1],
  [1,0,1,0,1,0,1,1,1,1,1,0,1,0,1,1,1,1,1,0,1],
  [1,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

// 7 cheese positions — spread through the maze, no cheese at exit
const CHEESE_POSITIONS = [
  { col: 3, row: 3 },
  { col: 9, row: 5 },
  { col: 15, row: 7 },
  { col: 5, row: 11 },
  { col: 11, row: 13 },
  { col: 3, row: 17 },
  { col: 19, row: 19 },
];

const START = { col: 19, row: 19 };      // start bottom-right
const EXIT  = { col: 9, row: 1 };        // exit top-center — only appears after all 7 cheeses
const CAT_START = { col: 11, row: 11 };

// Speech bubbles — Maus beschwert sich immer mehr
const SPEECH_BUBBLES = [
  "Mmmh, lecker! Her damit!",
  "Mir wird... ein bisschen warm...",
  "Ist das normal dass alles wackelt?",
  "Ich glaub ich brauch ne Pause...",
  "Wer hat den Raum gedreht?!",
  "Nie... wieder... Käse...",
  "Okay... eins noch... dann Ausgang!",
];

// ─── Helpers ───
function cellCenter(col, row) {
  return {
    x: PAD_X + col * CELL + CELL / 2,
    y: PAD_Y + row * CELL + CELL / 2,
  };
}

function isWall(col, row) {
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return true;
  return MAZE[row][col] === 1;
}

function pixelToCell(px, py) {
  return {
    col: Math.floor((px - PAD_X) / CELL),
    row: Math.floor((py - PAD_Y) / CELL),
  };
}

function collidesWall(cx, cy, r) {
  const checks = [
    pixelToCell(cx - r, cy - r),
    pixelToCell(cx + r, cy - r),
    pixelToCell(cx - r, cy + r),
    pixelToCell(cx + r, cy + r),
  ];
  return checks.some(({ col, row }) => isWall(col, row));
}

// ─── BFS Pathfinding — shortest path from (sc,sr) to (tc,tr) ───
function bfsPath(sc, sr, tc, tr) {
  if (sc === tc && sr === tr) return [];
  const visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  const parent = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  const queue = [{ col: sc, row: sr }];
  visited[sr][sc] = true;
  const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];

  while (queue.length > 0) {
    const { col, row } = queue.shift();
    for (const [dc, dr] of dirs) {
      const nc = col + dc;
      const nr = row + dr;
      if (nc >= 0 && nc < COLS && nr >= 0 && nr < ROWS && !visited[nr][nc] && !isWall(nc, nr)) {
        visited[nr][nc] = true;
        parent[nr][nc] = { col, row };
        if (nc === tc && nr === tr) {
          // Reconstruct path
          const path = [];
          let cur = { col: nc, row: nr };
          while (cur && !(cur.col === sc && cur.row === sr)) {
            path.unshift(cur);
            cur = parent[cur.row][cur.col];
          }
          return path;
        }
        queue.push({ col: nc, row: nr });
      }
    }
  }
  return []; // no path found
}

// ─── Draw functions ───
function drawMouse(ctx, x, y, cheeseCount, time) {
  ctx.save();
  ctx.translate(x, y);
  if (cheeseCount >= 3) {
    const wobble = Math.sin(time * (0.003 + cheeseCount * 0.001)) * (cheeseCount * 0.8);
    ctx.rotate(wobble * Math.PI / 180);
  }
  // Body
  ctx.fillStyle = '#a0a0a0';
  ctx.beginPath();
  ctx.ellipse(0, 0, 6, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  // Ears
  ctx.fillStyle = '#d4a0a0';
  ctx.beginPath(); ctx.arc(-4, -7, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(4, -7, 3.5, 0, Math.PI * 2); ctx.fill();
  // Eyes
  ctx.fillStyle = '#222';
  ctx.beginPath(); ctx.arc(-2, -2, 1.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(2, -2, 1.2, 0, Math.PI * 2); ctx.fill();
  if (cheeseCount >= 5) {
    ctx.strokeStyle = '#222'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-3, -3); ctx.lineTo(-1, -1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-1, -3); ctx.lineTo(-3, -1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(1, -3); ctx.lineTo(3, -1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(3, -3); ctx.lineTo(1, -1); ctx.stroke();
  }
  // Nose
  ctx.fillStyle = '#ff9999';
  ctx.beginPath(); ctx.arc(0, 1, 1.5, 0, Math.PI * 2); ctx.fill();
  // Tail
  ctx.strokeStyle = '#c0a0a0'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, 8); ctx.quadraticCurveTo(5, 12, 2, 16); ctx.stroke();
  // Green face when sick
  if (cheeseCount >= 4) {
    ctx.fillStyle = `rgba(100, 200, 100, ${0.15 + cheeseCount * 0.05})`;
    ctx.beginPath(); ctx.ellipse(0, 0, 6, 8, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawCat(ctx, x, y, time) {
  ctx.save();
  ctx.translate(x, y);
  // Body
  ctx.fillStyle = '#e08040';
  ctx.beginPath();
  ctx.ellipse(0, 1, 7, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  // Stripes
  ctx.strokeStyle = '#b05820';
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-4, -3); ctx.lineTo(-4, 5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(0, 5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(4, -3); ctx.lineTo(4, 5); ctx.stroke();
  // Ears (pointy)
  ctx.fillStyle = '#e08040';
  ctx.beginPath(); ctx.moveTo(-5, -7); ctx.lineTo(-3, -13); ctx.lineTo(-1, -7); ctx.fill();
  ctx.beginPath(); ctx.moveTo(1, -7); ctx.lineTo(3, -13); ctx.lineTo(5, -7); ctx.fill();
  // Inner ears
  ctx.fillStyle = '#f0a0a0';
  ctx.beginPath(); ctx.moveTo(-4, -8); ctx.lineTo(-3, -11); ctx.lineTo(-2, -8); ctx.fill();
  ctx.beginPath(); ctx.moveTo(2, -8); ctx.lineTo(3, -11); ctx.lineTo(4, -8); ctx.fill();
  // Eyes — evil slits
  ctx.fillStyle = '#ffe800';
  ctx.beginPath(); ctx.ellipse(-3, -3, 2.5, 2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(3, -3, 2.5, 2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#111';
  ctx.fillRect(-3.3, -4.2, 0.8, 2.5);
  ctx.fillRect(2.7, -4.2, 0.8, 2.5);
  // Nose
  ctx.fillStyle = '#cc6666';
  ctx.beginPath(); ctx.arc(0, -0.5, 1.2, 0, Math.PI * 2); ctx.fill();
  // Whiskers
  ctx.strokeStyle = '#ccc'; ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.moveTo(-7, -1); ctx.lineTo(-14, -3); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-7, 1); ctx.lineTo(-14, 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(7, -1); ctx.lineTo(14, -3); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(7, 1); ctx.lineTo(14, 2); ctx.stroke();
  // Tail (animated)
  const tailSwing = Math.sin(time * 0.006) * 8;
  ctx.strokeStyle = '#e08040'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(0, 10); ctx.quadraticCurveTo(tailSwing, 16, tailSwing * 0.7, 20); ctx.stroke();
  ctx.restore();
}

function drawCheese(ctx, x, y, time) {
  ctx.save();
  ctx.translate(x, y);
  const pulse = 0.5 + Math.sin(time * 0.005) * 0.3;
  ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 8 * pulse;
  ctx.fillStyle = '#FFD700';
  ctx.beginPath(); ctx.moveTo(-8, 6); ctx.lineTo(0, -8); ctx.lineTo(8, 6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#DAA520';
  ctx.beginPath(); ctx.arc(-2, 1, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(3, 3, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawExit(ctx, x, y, time) {
  ctx.save();
  ctx.translate(x, y);
  const pulse = 0.6 + Math.sin(time * 0.004) * 0.4;
  ctx.strokeStyle = `rgba(126, 231, 135, ${pulse})`;
  ctx.lineWidth = 2;
  ctx.strokeRect(-CELL / 2 + 2, -CELL / 2 + 2, CELL - 4, CELL - 4);
  ctx.font = `bold 10px ${fonts.mono}`;
  ctx.fillStyle = colors.green;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('\u{1F6AA}', 0, 0);
  ctx.restore();
}

// ─── Detect touch device ───
const isTouchDevice = () =>
  typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

// ─── D-Pad Button Component ───
function DPadButton({ direction, icon, onPress, onRelease, style }) {
  const handleStart = (e) => {
    e.preventDefault();
    onPress();
  };
  const handleEnd = (e) => {
    e.preventDefault();
    onRelease();
  };
  return (
    <button
      onTouchStart={handleStart}
      onTouchEnd={handleEnd}
      onTouchCancel={handleEnd}
      onMouseDown={onPress}
      onMouseUp={onRelease}
      onMouseLeave={onRelease}
      style={{
        width: 62,
        height: 62,
        borderRadius: 14,
        border: '1px solid rgba(255,255,255,0.2)',
        background: 'rgba(255,255,255,0.08)',
        color: '#fff',
        fontSize: 26,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'manipulation',
        ...style,
      }}
    >
      {icon}
    </button>
  );
}

// ─── Main Component ───
export default function CheeseGame({ onWin, matrixClue }) {
  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const [gameState, setGameState] = useState('start');
  const [collected, setCollected] = useState(0);
  const [showBubble, setShowBubble] = useState(null);
  const [caught, setCaught] = useState(false);
  const [isTouch] = useState(() => isTouchDevice());

  // D-Pad key state — shared with game loop via ref
  const dpadKeys = useRef({ up: false, down: false, left: false, right: false });

  const initGame = useCallback(() => {
    const start = cellCenter(START.col, START.row);
    const catStart = cellCenter(CAT_START.col, CAT_START.row);
    gameRef.current = {
      mouse: { x: start.x, y: start.y },
      targetX: null,
      targetY: null,
      useMouseFollow: false,
      cat: { x: catStart.x, y: catStart.y, path: [], pathIndex: 0 },
      lastBfs: 0,
      cheeses: CHEESE_POSITIONS.map((c, i) => ({ ...c, collected: false, index: i })),
      collected: 0,
      running: true,
      bubbleTimer: 0,
      activeBubble: -1,
      won: false,
      exitOpen: false,
      flickerPhase: 0,        // 0 = light on, increases with time
      flickerStart: 0,
    };
  }, []);

  const startGame = useCallback(() => {
    initGame();
    setCollected(0);
    setShowBubble(null);
    setCaught(false);
    setGameState('playing');
  }, [initGame]);

  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const g = gameRef.current;
    let animId;

    // ─── Mouse follow (desktop only) ───
    const onMove = (e) => {
      if (isTouch && e.touches) return; // On touch devices, use D-Pad instead
      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_W / rect.width;
      const scaleY = CANVAS_H / rect.height;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      g.targetX = (clientX - rect.left) * scaleX;
      g.targetY = (clientY - rect.top) * scaleY;
      g.useMouseFollow = true;
    };

    // ─── Keyboard input ───
    const keys = { up: false, down: false, left: false, right: false };
    const onKeyDown = (e) => {
      if (e.key === 'ArrowUp' || e.key === 'w') { keys.up = true; e.preventDefault(); }
      if (e.key === 'ArrowDown' || e.key === 's') { keys.down = true; e.preventDefault(); }
      if (e.key === 'ArrowLeft' || e.key === 'a') { keys.left = true; e.preventDefault(); }
      if (e.key === 'ArrowRight' || e.key === 'd') { keys.right = true; e.preventDefault(); }
    };
    const onKeyUp = (e) => {
      if (e.key === 'ArrowUp' || e.key === 'w') keys.up = false;
      if (e.key === 'ArrowDown' || e.key === 's') keys.down = false;
      if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd') keys.right = false;
    };
    g.keys = keys;
    g.dpadKeys = dpadKeys; // ref to D-Pad state

    canvas.addEventListener('mousemove', onMove);
    if (!isTouch) {
      canvas.addEventListener('touchmove', onMove, { passive: false });
      canvas.addEventListener('touchstart', onMove, { passive: false });
    }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const loop = () => {
      if (!g.running) return;
      const now = Date.now();

      const isFrozen = false;

      // ─── Move mouse toward target (mouse/touch + keyboard) ───
      if (!isFrozen) {
        const speedMult = g.collected >= 5 ? 0.6 : g.collected >= 3 ? 0.8 : 1;
        const speed = MOUSE_SPEED * speedMult;

        // Keyboard + D-Pad movement (direct, responsive)
        const k = g.keys;
        const dp = g.dpadKeys ? g.dpadKeys.current : { up: false, down: false, left: false, right: false };
        let kx = 0, ky = 0;
        if (k.left || dp.left) kx -= 1;
        if (k.right || dp.right) kx += 1;
        if (k.up || dp.up) ky -= 1;
        if (k.down || dp.down) ky += 1;

        if (kx !== 0 || ky !== 0) {
          // Keyboard active → disable mouse follow
          g.useMouseFollow = false;
          const kLen = Math.sqrt(kx * kx + ky * ky);
          const mkx = (kx / kLen) * speed;
          const mky = (ky / kLen) * speed;
          const newKX = g.mouse.x + mkx;
          if (!collidesWall(newKX, g.mouse.y, MOUSE_RADIUS)) g.mouse.x = newKX;
          const newKY = g.mouse.y + mky;
          if (!collidesWall(g.mouse.x, newKY, MOUSE_RADIUS)) g.mouse.y = newKY;
        } else if (g.useMouseFollow && g.targetX !== null) {
          // Mouse/touch follow — only when user explicitly moved mouse/finger
          const dx = g.targetX - g.mouse.x;
          const dy = g.targetY - g.mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 2) {
            const moveX = (dx / dist) * speed;
            const moveY = (dy / dist) * speed;
            const newX = g.mouse.x + moveX;
            if (!collidesWall(newX, g.mouse.y, MOUSE_RADIUS)) g.mouse.x = newX;
            const newY = g.mouse.y + moveY;
            if (!collidesWall(g.mouse.x, newY, MOUSE_RADIUS)) g.mouse.y = newY;
          }
        }
      }

      // ─── Cat AI: BFS pathfinding toward mouse ───
      if (!isFrozen && now - g.lastBfs > BFS_INTERVAL) {
        const catCell = pixelToCell(g.cat.x, g.cat.y);
        const mouseCell = pixelToCell(g.mouse.x, g.mouse.y);
        g.cat.path = bfsPath(catCell.col, catCell.row, mouseCell.col, mouseCell.row);
        g.cat.pathIndex = 0;
        g.lastBfs = now;
      }

      // ─── Move cat along path ───
      if (!isFrozen && g.cat.path.length > 0) {
        const target = g.cat.path[g.cat.pathIndex] || g.cat.path[0];
        if (target) {
          const tp = cellCenter(target.col, target.row);
          const cdx = tp.x - g.cat.x;
          const cdy = tp.y - g.cat.y;
          const cdist = Math.sqrt(cdx * cdx + cdy * cdy);
          if (cdist > 2) {
            g.cat.x += (cdx / cdist) * CAT_SPEED;
            g.cat.y += (cdy / cdist) * CAT_SPEED;
          } else {
            // Reached this waypoint
            g.cat.x = tp.x;
            g.cat.y = tp.y;
            g.cat.pathIndex++;
            if (g.cat.pathIndex >= g.cat.path.length) {
              g.cat.path = [];
              g.cat.pathIndex = 0;
            }
          }
        }
      }

      // ─── Cat catches mouse → GAME OVER ───
      if (!isFrozen) {
        const catchDx = g.cat.x - g.mouse.x;
        const catchDy = g.cat.y - g.mouse.y;
        if (Math.sqrt(catchDx * catchDx + catchDy * catchDy) < CATCH_DIST) {
          g.running = false;
          setCaught(true);
          setGameState('lost');
        }
      }

      // ─── Collect cheese ───
      if (!isFrozen) {
        g.cheeses.forEach((c) => {
          if (c.collected) return;
          const cp = cellCenter(c.col, c.row);
          const cdx = g.mouse.x - cp.x;
          const cdy = g.mouse.y - cp.y;
          if (Math.sqrt(cdx * cdx + cdy * cdy) < MOUSE_RADIUS + CHEESE_RADIUS) {
            c.collected = true;
            g.collected++;
            g.activeBubble = c.index;
            g.bubbleTimer = now;
            // Update checkpoint
            g.lastCheckpoint = { x: g.mouse.x, y: g.mouse.y };
            setCollected(g.collected);
            setShowBubble(c.index);

            if (g.collected >= 7) {
              g.exitOpen = true; // exit now appears!
            }
          }
        });
      }

      // ─── Check if mouse reached exit (only when open) ───
      if (!isFrozen && g.exitOpen) {
        const ep = cellCenter(EXIT.col, EXIT.row);
        const exDx = g.mouse.x - ep.x;
        const exDy = g.mouse.y - ep.y;
        if (Math.sqrt(exDx * exDx + exDy * exDy) < MOUSE_RADIUS + 10) {
          g.running = false;
          g.won = true;
          setGameState('won');
        }
      }

      // Clear bubble after 3s
      if (g.activeBubble >= 0 && !g.won && now - g.bubbleTimer > 3000) {
        g.activeBubble = -1;
        setShowBubble(null);
      }

      // ─── Flicker calculation ───
      const flickerActive = g.collected >= FLICKER_START_CHEESE;
      let darkness = 0; // 0 = fully lit, 1 = fully dark
      if (flickerActive) {
        const cycle = FLICKER_ON_MS + FLICKER_OFF_MS;
        const phase = (now % cycle);
        if (phase < FLICKER_ON_MS - FLICKER_FADE_MS) {
          darkness = 0; // fully lit
        } else if (phase < FLICKER_ON_MS) {
          // Fading out
          darkness = (phase - (FLICKER_ON_MS - FLICKER_FADE_MS)) / FLICKER_FADE_MS;
        } else if (phase < FLICKER_ON_MS + FLICKER_OFF_MS - FLICKER_FADE_MS) {
          darkness = 1; // fully dark
        } else {
          // Fading in
          darkness = 1 - (phase - (FLICKER_ON_MS + FLICKER_OFF_MS - FLICKER_FADE_MS)) / FLICKER_FADE_MS;
        }
      }

      // ═══════════════════ DRAW ═══════════════════

      // Background
      ctx.fillStyle = colors.bgPrimary;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // ─── Maze ───
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const x = PAD_X + c * CELL;
          const y = PAD_Y + r * CELL;
          if (MAZE[r][c] === 1) {
            ctx.fillStyle = '#1c2333';
            ctx.fillRect(x, y, CELL, CELL);
            ctx.strokeStyle = '#263045'; ctx.lineWidth = 0.5;
            ctx.strokeRect(x, y, CELL, CELL);
          } else {
            ctx.fillStyle = '#0d1117';
            ctx.fillRect(x, y, CELL, CELL);
          }
        }
      }

      // Exit marker — only visible after all 7 cheeses
      if (g.exitOpen) {
        const exitPos = cellCenter(EXIT.col, EXIT.row);
        drawExit(ctx, exitPos.x, exitPos.y, now);
      }

      // Cheeses
      g.cheeses.forEach((c) => {
        if (c.collected) return;
        const cp = cellCenter(c.col, c.row);
        drawCheese(ctx, cp.x, cp.y, now);
      });

      // Cat
      drawCat(ctx, g.cat.x, g.cat.y, now);

      // Mouse character
      drawMouse(ctx, g.mouse.x, g.mouse.y, g.collected, now);

      // ─── Flicker darkness overlay ───
      if (darkness > 0) {
        // Dark overlay with radial cutout around mouse
        ctx.save();
        // Draw full dark rect
        ctx.fillStyle = `rgba(2, 4, 8, ${darkness * 0.92})`;
        ctx.fillRect(PAD_X, PAD_Y, MAZE_W, MAZE_H);
        // Cut out light circle around mouse using destination-out
        ctx.globalCompositeOperation = 'destination-out';
        const grad = ctx.createRadialGradient(
          g.mouse.x, g.mouse.y, 0,
          g.mouse.x, g.mouse.y, LIGHT_RADIUS
        );
        grad.addColorStop(0, `rgba(0,0,0,${darkness * 0.92})`);
        grad.addColorStop(0.7, `rgba(0,0,0,${darkness * 0.6})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(
          g.mouse.x - LIGHT_RADIUS, g.mouse.y - LIGHT_RADIUS,
          LIGHT_RADIUS * 2, LIGHT_RADIUS * 2
        );
        ctx.restore();
        // Re-draw mouse on top so it's always visible
        drawMouse(ctx, g.mouse.x, g.mouse.y, g.collected, now);
      }

      // (caught = game over, handled by lost screen)

      // ─── Speech bubble ───
      if (g.activeBubble >= 0) {
        const bubbleText = SPEECH_BUBBLES[g.activeBubble];
        ctx.font = `bold 11px ${fonts.sans}`;
        const textW = ctx.measureText(bubbleText).width;
        const bx = Math.max(PAD_X + 5, Math.min(CANVAS_W - PAD_X - textW - 20, g.mouse.x - textW / 2 - 8));
        const by = Math.max(PAD_Y + 5, g.mouse.y - 40);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        const bw = textW + 16;
        const bh = 24;
        ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 6); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(g.mouse.x - 4, by + bh);
        ctx.lineTo(g.mouse.x, by + bh + 6);
        ctx.lineTo(g.mouse.x + 4, by + bh);
        ctx.fill();
        ctx.fillStyle = '#1a1a1a'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(bubbleText, bx + 8, by + bh / 2);
      }

      // ─── Flicker warning indicator ───
      if (flickerActive && darkness > 0.5) {
        ctx.font = `bold 10px ${fonts.mono}`;
        ctx.fillStyle = colors.yellow;
        ctx.textAlign = 'center';
        ctx.fillText('\u26A1 LICHT FLACKERT', CANVAS_W / 2, PAD_Y + 14);
      }

      // ─── Bottom Panel ───
      const panelY = MAZE_H + PAD_Y + 8;
      ctx.fillStyle = colors.bgSecondary;
      ctx.fillRect(0, panelY - 4, CANVAS_W, PANEL_H + 4);
      ctx.strokeStyle = colors.border; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, panelY - 4); ctx.lineTo(CANVAS_W, panelY - 4); ctx.stroke();

      ctx.font = `bold 11px ${fonts.mono}`;
      ctx.fillStyle = colors.textMuted;
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText(`\u{1F9C0} K\u00C4SE GESAMMELT: ${g.collected} / 7`, CANVAS_W / 2, panelY + 2);

      // 7 slots
      const slotW = 58; const slotH = 58; const slotGap = 6;
      const totalSlotsW = 7 * slotW + 6 * slotGap;
      const startSlotX = (CANVAS_W - totalSlotsW) / 2;
      const slotY = panelY + 20;

      for (let i = 0; i < 7; i++) {
        const sx = startSlotX + i * (slotW + slotGap);
        const isCol = i < g.collected;
        ctx.fillStyle = isCol ? 'rgba(255, 215, 0, 0.08)' : 'rgba(255,255,255,0.03)';
        ctx.fillRect(sx, slotY, slotW, slotH);
        ctx.strokeStyle = isCol ? '#DAA520' : colors.borderSubtle;
        ctx.lineWidth = isCol ? 1.5 : 1;
        ctx.strokeRect(sx, slotY, slotW, slotH);

        if (isCol) {
          ctx.save();
          ctx.translate(sx + slotW / 2, slotY + slotH / 2 - 4);
          ctx.font = `20px ${fonts.sans}`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          const mouseEmojis = ['\u{1F42D}', '\u{1F42D}', '\u{1F605}', '\u{1F922}', '\u{1F92E}', '\u{1F480}', '\u2620\uFE0F'];
          ctx.fillText(mouseEmojis[i], 0, 0);
          ctx.restore();
          const sickColors = ['#7ee787', '#7ee787', '#d29922', '#d29922', '#FFA657', '#F47067', '#F47067'];
          ctx.font = `bold 9px ${fonts.mono}`;
          ctx.fillStyle = sickColors[i];
          ctx.textAlign = 'center';
          ctx.fillText(`#${i + 1}`, sx + slotW / 2, slotY + slotH - 4);
        } else {
          ctx.font = `18px ${fonts.sans}`;
          ctx.fillStyle = colors.textSubtle;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('?', sx + slotW / 2, slotY + slotH / 2);
        }
      }

      if (g.activeBubble >= 0) {
        ctx.fillStyle = colors.textSubtle;
        ctx.font = `italic 10px ${fonts.sans}`;
        ctx.textAlign = 'center';
        ctx.fillText(`"${SPEECH_BUBBLES[g.activeBubble]}"`, CANVAS_W / 2, slotY + slotH + 14);
      }

      if (g.collected >= 7) {
        ctx.font = `bold 14px ${fonts.mono}`;
        ctx.fillStyle = colors.green;
        ctx.textAlign = 'center';
        ctx.fillText('\u{1F6AA} AUSGANG OFFEN! Schnell raus!', CANVAS_W / 2, slotY + slotH + 32);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      canvas.removeEventListener('mousemove', onMove);
      if (!isTouch) {
        canvas.removeEventListener('touchmove', onMove);
        canvas.removeEventListener('touchstart', onMove);
      }
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      if (g) g.running = false;
    };
  }, [gameState, isTouch]);

  const overlay = (content) => (
    <div style={{
      position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(13, 17, 23, 0.92)', zIndex: 10,
    }}>
      {content}
    </div>
  );

  // D-Pad handlers
  const pressDir = (dir) => { dpadKeys.current[dir] = true; };
  const releaseDir = (dir) => { dpadKeys.current[dir] = false; };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100%', background: colors.bgPrimary,
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'relative',
        width: CANVAS_W,
        maxWidth: '100%',
        flex: isTouch && gameState === 'playing' ? '0 0 auto' : undefined,
      }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{
            display: 'block', width: '100%', height: 'auto',
            border: `1px solid ${colors.border}`, borderRadius: 8,
            cursor: gameState === 'playing' ? 'none' : 'default',
            touchAction: 'none', // Prevent scrolling on canvas
          }}
        />

        {gameState === 'start' && overlay(
          <>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🐭</div>
            <div style={{
              fontFamily: fonts.mono, fontSize: 'clamp(16px, 5vw, 22px)', color: colors.yellow,
              fontWeight: 'bold', letterSpacing: 2, marginBottom: 4,
            }}>
              DAS WEISSLACKER-MASSAKER
            </div>
            <div style={{
              fontFamily: fonts.mono, fontSize: 11, color: colors.textSubtle,
              letterSpacing: 1, marginBottom: 16,
            }}>
              ━━━ EIN KÄSE-LABYRINTH ━━━
            </div>
            <div style={{
              fontFamily: fonts.mono, fontSize: 'clamp(11px, 3vw, 13px)', color: colors.textMuted,
              textAlign: 'center', lineHeight: 1.7, maxWidth: 360, marginBottom: 24,
              padding: '0 16px',
            }}>
              Führe die Maus durch das Labyrinth<br />
              und sammle alle 7 Käsestücke!<br />
              <span style={{ color: colors.textSubtle, fontSize: 11 }}>
                {isTouch ? 'Steuerung: D-Pad unten' : 'Steuerung: Maus oder Pfeiltasten/WASD'}
              </span><br /><br />
              <span style={{ color: colors.orange }}>🐱 Vorsicht vor der Katze!</span><br />
              <span style={{ color: colors.yellow }}>⚡ Ab Käse #5 flackert das Licht...</span><br />
              <span style={{ color: colors.green }}>🚪 Ausgang erst nach allen 7 Käse!</span>
            </div>
            <button
              onClick={startGame}
              style={{
                fontFamily: fonts.mono, fontSize: 16, fontWeight: 'bold',
                color: '#fff', background: colors.greenDark,
                border: `1px solid ${colors.green}`, borderRadius: 6,
                padding: '12px 40px', cursor: 'pointer', letterSpacing: 1,
                minHeight: 48,
              }}
              onMouseEnter={(e) => e.target.style.background = colors.greenHover}
              onMouseLeave={(e) => e.target.style.background = colors.greenDark}
            >
              ▶ LOS GEHT'S
            </button>
          </>
        )}

        {gameState === 'won' && overlay(
          <>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🧀</div>
            <div style={{
              fontFamily: fonts.mono, fontSize: 20, color: colors.green,
              fontWeight: 'bold', letterSpacing: 2, marginBottom: 8,
            }}>
              ALLE KÄSE GEFUNDEN!
            </div>
            <div style={{
              fontFamily: fonts.mono, fontSize: 13, color: colors.textMuted,
              marginBottom: 20,
            }}>
              Die Maus hat überlebt... gerade so.
            </div>
            <div style={{
              background: 'rgba(46, 160, 67, 0.15)',
              border: `1px solid ${colors.green}`,
              borderRadius: 8, padding: '16px 32px',
              textAlign: 'center', marginBottom: 20,
            }}>
              <div style={{
                fontFamily: fonts.mono, fontSize: 11, color: colors.green,
                marginBottom: 6, letterSpacing: 2,
              }}>
                ★ DEIN MATRIX-CODE ★
              </div>
              <div style={{
                fontFamily: fonts.mono, fontSize: 12, color: colors.textMuted,
                marginBottom: 8,
              }}>
                Trage diese Zahlen in Clue <span style={{ color: colors.orange, fontWeight: 'bold' }}>C1</span> der Matrix ein:
              </div>
              <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                {(matrixClue || '3 8 4 6 1 2').split(' ').map((d, i) => (
                  <span key={i} style={{
                    width: 36, height: 40,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, fontFamily: fonts.mono, fontWeight: 'bold',
                    background: 'rgba(46, 160, 67, 0.15)',
                    border: `2px solid ${colors.green}`,
                    borderRadius: 6, color: colors.yellow,
                  }}>
                    {d}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={startGame}
                style={{
                  fontFamily: fonts.mono, fontSize: 13,
                  color: colors.text, background: colors.bgSecondary,
                  border: `1px solid ${colors.border}`, borderRadius: 6,
                  padding: '8px 20px', cursor: 'pointer', minHeight: 44,
                }}
              >
                ↻ NOCHMAL
              </button>
              {onWin && (
                <button
                  onClick={() => onWin(matrixClue || '3 8 4 6 1 2')}
                  style={{
                    fontFamily: fonts.mono, fontSize: 13, fontWeight: 'bold',
                    color: '#fff', background: colors.greenDark,
                    border: `1px solid ${colors.green}`, borderRadius: 6,
                    padding: '8px 20px', cursor: 'pointer', minHeight: 44,
                  }}
                >
                  ✓ WEITER
                </button>
              )}
            </div>
          </>
        )}

        {/* ─── Lost Screen (caught by cat) ─── */}
        {gameState === 'lost' && overlay(
          <>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🙀</div>
            <div style={{
              fontFamily: fonts.mono, fontSize: 20, color: colors.red,
              fontWeight: 'bold', letterSpacing: 2, marginBottom: 8,
            }}>
              ERWISCHT!
            </div>
            <div style={{
              fontFamily: fonts.mono, fontSize: 13, color: colors.textMuted,
              marginBottom: 6,
            }}>
              Die Katze hat die Maus geschnappt!
            </div>
            <div style={{
              fontFamily: fonts.mono, fontSize: 13, color: colors.textSubtle,
              marginBottom: 20,
            }}>
              {collected} / 7 Käse gesammelt.
            </div>
            <button
              onClick={startGame}
              style={{
                fontFamily: fonts.mono, fontSize: 16, fontWeight: 'bold',
                color: '#fff', background: '#6e2a2a',
                border: `1px solid ${colors.red}`, borderRadius: 6,
                padding: '12px 36px', cursor: 'pointer', letterSpacing: 1,
                minHeight: 48,
              }}
              onMouseEnter={(e) => e.target.style.background = '#8b3030'}
              onMouseLeave={(e) => e.target.style.background = '#6e2a2a'}
            >
              ↻ NOCHMAL VERSUCHEN
            </button>
          </>
        )}
      </div>

      {/* ─── D-Pad (touch devices only, during gameplay) ─── */}
      {isTouch && gameState === 'playing' && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          padding: '12px 0 max(12px, env(safe-area-inset-bottom))',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          touchAction: 'manipulation',
        }}>
          {/* Cheese counter (compact) */}
          <div style={{
            fontFamily: fonts.mono,
            fontSize: 13,
            color: colors.yellow,
            marginBottom: 4,
            letterSpacing: 1,
          }}>
            🧀 {collected} / 7
          </div>
          {/* Up */}
          <DPadButton
            direction="up"
            icon="▲"
            onPress={() => pressDir('up')}
            onRelease={() => releaseDir('up')}
          />
          {/* Left - Center - Right */}
          <div style={{ display: 'flex', gap: 4 }}>
            <DPadButton
              direction="left"
              icon="◀"
              onPress={() => pressDir('left')}
              onRelease={() => releaseDir('left')}
            />
            <div style={{
              width: 62,
              height: 62,
              borderRadius: 14,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
            }}>
              🐭
            </div>
            <DPadButton
              direction="right"
              icon="▶"
              onPress={() => pressDir('right')}
              onRelease={() => releaseDir('right')}
            />
          </div>
          {/* Down */}
          <DPadButton
            direction="down"
            icon="▼"
            onPress={() => pressDir('down')}
            onRelease={() => releaseDir('down')}
          />
        </div>
      )}
    </div>
  );
}
