import React, { useRef, useEffect, useState, useCallback } from 'react';
import { colors, fonts } from '../theme';

// ─── Config ───
const CELL = 22;
const COLS = 21;
const ROWS = 21;
const MAZE_W = COLS * CELL;
const MAZE_H = ROWS * CELL;
const PANEL_H = 30;
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
const FLICKER_START_CHEESE = 10;  // flicker starts after this many cheeses
const TOTAL_CHEESE = 15;

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

// 15 cheese positions — spread as far apart as possible
const CHEESE_POSITIONS = [
  { col: 1, row: 1 },
  { col: 19, row: 1 },
  { col: 9, row: 3 },
  { col: 3, row: 5 },
  { col: 15, row: 5 },
  { col: 7, row: 7 },
  { col: 19, row: 7 },
  { col: 1, row: 9 },
  { col: 9, row: 11 },
  { col: 19, row: 11 },
  { col: 3, row: 13 },
  { col: 15, row: 15 },
  { col: 5, row: 17 },
  { col: 19, row: 17 },
  { col: 1, row: 19 },
];

const START = { col: 19, row: 19 };      // start bottom-right
const CAT_START = { col: 11, row: 11 };

// Precompute all valid path cells for dynamic exit placement
const PATH_CELLS = [];
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    if (MAZE[r][c] === 0) PATH_CELLS.push({ col: c, row: r });
  }
}

// Sound paths
const SFX_HAPPY = './assets/cheese-sounds/happy.mp3';
const SFX_BURP = './assets/cheese-sounds/burp.wav';
const SFX_EAT1 = './assets/cheese-sounds/eat1.wav';
const SFX_EAT2 = './assets/cheese-sounds/eat2.mp3';

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

// Corner assist — nudge mouse toward cell center to slide around corners
function cornerAssist(mouseX, mouseY, dx, dy, speed, r) {
  const nudge = speed * 0.6;
  const cell = pixelToCell(mouseX, mouseY);
  const center = cellCenter(cell.col, cell.row);

  // Moving horizontally but stuck? Try nudging vertically toward cell center
  if (dx !== 0 && dy === 0) {
    const offsetY = center.y - mouseY;
    if (Math.abs(offsetY) > 1) {
      const nudgeY = Math.sign(offsetY) * Math.min(nudge, Math.abs(offsetY));
      if (!collidesWall(mouseX + dx * speed, mouseY + nudgeY, r)) {
        return { x: mouseX + dx * speed, y: mouseY + nudgeY };
      }
    }
  }
  // Moving vertically but stuck? Try nudging horizontally toward cell center
  if (dy !== 0 && dx === 0) {
    const offsetX = center.x - mouseX;
    if (Math.abs(offsetX) > 1) {
      const nudgeX = Math.sign(offsetX) * Math.min(nudge, Math.abs(offsetX));
      if (!collidesWall(mouseX + nudgeX, mouseY + dy * speed, r)) {
        return { x: mouseX + nudgeX, y: mouseY + dy * speed };
      }
    }
  }
  return null; // no assist needed
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
  // (sick face removed)
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

function drawExit(ctx, x, y, time, darkness) {
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
  // Label "Ausgang" only when it's light (no darkness)
  if (!darkness || darkness < 0.1) {
    ctx.font = `bold 10px ${fonts.mono}`;
    ctx.fillStyle = colors.green;
    ctx.fillText('Ausgang', 0, CELL / 2 + 10);
  }
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
  const musicRef = useRef(null);
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
      exitPos: null, // set dynamically when all cheese collected
      flickerPhase: 0,        // 0 = light on, increases with time
      flickerStart: 0,
    };
  }, []);

  const startMusic = () => {
    try {
      if (musicRef.current) { musicRef.current.pause(); musicRef.current = null; }
      const music = new Audio(SFX_HAPPY);
      music.loop = true;
      music.volume = 0.4;
      music.play().catch(() => {});
      musicRef.current = music;
    } catch(e) {}
  };

  const stopMusic = () => {
    if (musicRef.current) { musicRef.current.pause(); musicRef.current = null; }
  };

  const startGame = useCallback(() => {
    initGame();
    setCollected(0);
    setShowBubble(null);
    setCaught(false);
    setGameState('playing');
    startMusic();
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
          const newKY = g.mouse.y + mky;
          let movedX = false, movedY = false;
          if (!collidesWall(newKX, g.mouse.y, MOUSE_RADIUS)) { g.mouse.x = newKX; movedX = true; }
          if (!collidesWall(g.mouse.x, newKY, MOUSE_RADIUS)) { g.mouse.y = newKY; movedY = true; }
          // Corner assist — if stuck, nudge around corner
          if (!movedX || !movedY) {
            const assist = cornerAssist(g.mouse.x, g.mouse.y, kx, ky, speed, MOUSE_RADIUS);
            if (assist) { g.mouse.x = assist.x; g.mouse.y = assist.y; }
          }
        } else if (g.useMouseFollow && g.targetX !== null) {
          // Mouse/touch follow — only when user explicitly moved mouse/finger
          const dx = g.targetX - g.mouse.x;
          const dy = g.targetY - g.mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 2) {
            const moveX = (dx / dist) * speed;
            const moveY = (dy / dist) * speed;
            const newX = g.mouse.x + moveX;
            const newY = g.mouse.y + moveY;
            let movedX = false, movedY = false;
            if (!collidesWall(newX, g.mouse.y, MOUSE_RADIUS)) { g.mouse.x = newX; movedX = true; }
            if (!collidesWall(g.mouse.x, newY, MOUSE_RADIUS)) { g.mouse.y = newY; movedY = true; }
            // Corner assist — nudge around corners for smoother movement
            if (!movedX || !movedY) {
              const dirX = dx !== 0 ? Math.sign(dx) : 0;
              const dirY = dy !== 0 ? Math.sign(dy) : 0;
              const assist = cornerAssist(g.mouse.x, g.mouse.y, dirX, dirY, speed, MOUSE_RADIUS);
              if (assist) { g.mouse.x = assist.x; g.mouse.y = assist.y; }
            }
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
          stopMusic();
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

            // Play eat sound alternating
            try {
              const eatSrc = g.collected % 2 === 1 ? SFX_EAT1 : SFX_EAT2;
              const eatAudio = new Audio(eatSrc);
              eatAudio.volume = 0.5;
              eatAudio.play().catch(() => {});
            } catch(e) {}

            if (g.collected >= TOTAL_CHEESE) {
              // Pick the path cell farthest from mouse as exit
              const mx = g.mouse.x, my = g.mouse.y;
              let bestDist = -1, bestCell = PATH_CELLS[0];
              PATH_CELLS.forEach(pc => {
                const cp = cellCenter(pc.col, pc.row);
                const d = (cp.x - mx) ** 2 + (cp.y - my) ** 2;
                if (d > bestDist) { bestDist = d; bestCell = pc; }
              });
              g.exitPos = { col: bestCell.col, row: bestCell.row };
              g.exitOpen = true;
            }
          }
        });
      }

      // ─── Check if mouse reached exit (only when open) ───
      if (!isFrozen && g.exitOpen && g.exitPos) {
        const ep = cellCenter(g.exitPos.col, g.exitPos.row);
        const exDx = g.mouse.x - ep.x;
        const exDy = g.mouse.y - ep.y;
        if (Math.sqrt(exDx * exDx + exDy * exDy) < MOUSE_RADIUS + 10) {
          g.running = false;
          g.won = true;
          setGameState('won');
          // Restart music from beginning, lower volume for win screen
          if (musicRef.current) {
            musicRef.current.currentTime = 0;
            musicRef.current.volume = 0.2;
          }
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

      // Exit marker — only visible after all 15 cheeses
      if (g.exitOpen && g.exitPos) {
        const exitPixel = cellCenter(g.exitPos.col, g.exitPos.row);
        drawExit(ctx, exitPixel.x, exitPixel.y, now, darkness);
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

      // (speech bubbles removed)

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
      ctx.fillText(`\u{1F9C0} K\u00C4SE: ${g.collected} / ${TOTAL_CHEESE}`, CANVAS_W / 2, panelY + 2);

      if (g.collected >= TOTAL_CHEESE) {
        ctx.font = `bold 12px ${fonts.mono}`;
        ctx.fillStyle = colors.green;
        ctx.textAlign = 'center';
        ctx.fillText('\u{1F6AA} AUSGANG OFFEN! Schnell raus!', CANVAS_W / 2, panelY + 18);
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
      stopMusic();
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
            <div style={{
              fontFamily: fonts.mono, fontSize: 'clamp(14px, 4.5vw, 20px)', color: colors.yellow,
              fontWeight: 'bold', letterSpacing: 2, marginBottom: 12, textAlign: 'center',
            }}>
              🐭 DAS WEISSLACKER-MASSAKER 🐭
            </div>
            <img
              src="./assets/cheese-sounds/weisslacker1zu1.webp"
              alt="Weisslacker"
              style={{
                width: '60%', maxWidth: 180, borderRadius: 10,
                marginBottom: 14, border: `2px solid ${colors.yellow}`,
              }}
            />
            <div style={{
              fontFamily: fonts.mono, fontSize: 'clamp(11px, 3vw, 13px)', color: colors.textMuted,
              textAlign: 'center', lineHeight: 1.7, maxWidth: 360, marginBottom: 10,
              padding: '0 16px',
            }}>
              Steuere die Maus durch das Labyrinth<br />
              und friss alle 15 Käsestücke.<br />
              <span style={{ color: colors.textSubtle, fontSize: 11 }}>
                Die Maus wird durch Antippen der Pfeiltasten gesteuert.
              </span>
            </div>
            <div style={{
              fontFamily: fonts.mono, fontSize: 'clamp(11px, 3vw, 13px)', color: colors.textMuted,
              textAlign: 'center', lineHeight: 1.9, maxWidth: 360, marginBottom: 10,
              padding: '0 16px',
            }}>
              <span style={{ color: colors.orange }}>🐱 Vorsicht vor der Katze!</span><br />
              <span style={{ color: colors.yellow }}>⚡ Ab Käse #10 flackert das Licht...</span><br />
              <span style={{ color: colors.green }}>🚪 Finde am Schluss den Ausgang</span>
            </div>
            <div style={{
              fontFamily: fonts.mono, fontSize: 'clamp(11px, 3vw, 12px)', color: colors.textSubtle,
              textAlign: 'center', lineHeight: 1.6, maxWidth: 340, marginBottom: 20,
              padding: '0 16px', fontStyle: 'italic',
            }}>
              Wenn du es schaffst, schaltest du<br />
              einen Matrix-Clue frei...<br />
              Viel Erfolg!
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
            {/* Win video — autoplay, no controls */}
            <video
              src="./assets/cheese-sounds/win-video.mp4"
              autoPlay
              loop
              playsInline
              muted={false}
              style={{
                width: '100%', maxWidth: 340, borderRadius: 10,
                marginBottom: 16, border: `2px solid ${colors.green}`,
              }}
            />
            <div style={{
              background: 'rgba(46, 160, 67, 0.15)',
              border: `1px solid ${colors.green}`,
              borderRadius: 8, padding: '16px 32px',
              textAlign: 'center', marginBottom: 20,
            }}>
              <div style={{
                fontFamily: fonts.mono, fontSize: 14, color: colors.textSecondary,
                marginBottom: 12, lineHeight: 1.5,
              }}>
                Herzlichen Glückwunsch!<br />Du hast einen Matrix Clue freigeschaltet:
              </div>
              <div style={{
                fontSize: 24, fontFamily: fonts.mono, fontWeight: 'bold',
                color: colors.yellow, letterSpacing: 2,
              }}>
                {matrixClue || 'C1: 3 - 8 - 4 - 6 - 1 - 2'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => { try { new Audio(SFX_BURP).play().catch(()=>{}); } catch(e){} startGame(); }}
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
                  onClick={() => { try { new Audio(SFX_BURP).play().catch(()=>{}); } catch(e){} stopMusic(); onWin(matrixClue || '3 8 4 6 1 2'); }}
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
