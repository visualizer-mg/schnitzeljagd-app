import React, { useState, useEffect, useCallback, useRef } from 'react';
import { colors, fonts } from '../theme';

// ═══════════════════════════════════════════════════════
// MEMORY GAME — Andrea
// Level 1: Klassisches Memory (16 Paare, 4×8 Grid)
// Level 2: Simon Says (3 → 5 Karten merken)
// Level 3: Snake (16 Bilder fressen auf 4×8 Grid)
// Matrix-Clue D2: 7, 8, 1, 2
// ═══════════════════════════════════════════════════════

// ── Sound helpers ──
const SFX = {
  swipe: './assets/memory-cards/swipe.wav',
  clicked: './assets/memory-cards/clicked2.mp3',
  eat: './assets/memory-cards/eat.wav',
  match: './assets/memory-cards/plip_and_plop2.mp3',
  levelUp: './assets/memory-cards/level_complete.wav',
  winning: './assets/memory-cards/winning.mp3',
  happy: './assets/memory-cards/happy.mp3',
  sneaky: './assets/memory-cards/sneaky_snakes.mp3',
};

const MUSIC_VOLUME = 0.6;
const SFX_VOLUME = 0.6;

function playSound(src, volume) {
  try {
    const audio = new Audio(src);
    audio.volume = volume != null ? volume : SFX_VOLUME;
    audio.play().catch(() => {});
  } catch {}
}

// Background music manager
let bgMusic = null;
let currentTrack = null;

function switchMusic(src) {
  if (currentTrack === src && bgMusic && !bgMusic.paused) return;
  if (bgMusic) { bgMusic.pause(); bgMusic.currentTime = 0; }
  bgMusic = new Audio(src);
  bgMusic.loop = true;
  bgMusic.volume = MUSIC_VOLUME;
  bgMusic.play().catch(() => {});
  currentTrack = src;
}

function stopBgMusic() {
  if (bgMusic) { bgMusic.pause(); bgMusic.currentTime = 0; }
  currentTrack = null;
}

const CARD_IMAGES = [
  'memory_0000.jpg',
  'memory_0001_hair4.jpg',
  'memory_0002_hair3.jpg',
  'memory_0003_hair2.jpg',
  'memory_0004_hair1.jpg',
  'memory_0005_view-cartoon-animated-3d-penguin-scooter.jpg',
  'memory_0006_view-3d-bird-with-soccer-ball.jpg',
  'memory_0007_ursa-major-constellation-with-bear.jpg',
  'memory_0008_pink-elephant-3d-illustration.jpg',
  'memory_0009_cd0487ce-7649-4e22-a32d-853f3d39f42d.jpg',
  'memory_0010_front-view-3d-tree-with-leaves-trunk.jpg',
  'memory_0011_adorable-beagle-dog-studio.jpg',
  'memory_0012_10200878.jpg',
  'memory_0013_8501971.jpg',
  'memory_0014_3d-cartoon-black-cat-icon-rendering.jpg',
  'memory_0016.jpg',
];

const MATRIX_CLUE = 'D2: 7, 8, 1, 2';
const FLIP_BACK_DELAY = 750;
const COLS = 4;
const ROWS = 8;
const TOTAL = COLS * ROWS;

// Simon Says
const SIMON_ROUNDS = [3, 5];
const SIMON_FLASH_DURATION = 800;
const SIMON_PAUSE = 400;

// Snake v3
const SNAKE_COLS = 32;
const SNAKE_ROWS = 32;
const SNAKE_TICK_MS = 120;
const SNAKE_TOTAL_FOOD = 64; // each of 16 images × 4
const SNAKE_VISIBLE_FOOD = 2; // max 2 visible at once
const SNAKE_COLOR = '#f9c318';
const SNAKE_HEAD_IMG = './assets/memory-cards/snake_head.png';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function createCards() {
  const pairs = CARD_IMAGES.flatMap((img, idx) => [
    { id: idx * 2, pairId: idx, image: img },
    { id: idx * 2 + 1, pairId: idx, image: img },
  ]);
  return shuffle(pairs);
}

function pickRandomIndices(count, total) {
  const indices = Array.from({ length: total }, (_, i) => i);
  return shuffle(indices).slice(0, count);
}

// ── Confetti / Celebration ──
function Celebration() {
  const [particles, setParticles] = useState([]);
  useEffect(() => {
    const emojis = ['⭐', '🎉', '🌟', '✨', '💫', '🎊', '🏆', '🐕', '❤️', '🎯'];
    const p = [];
    for (let wave = 0; wave < 3; wave++) {
      for (let i = 0; i < 12; i++) {
        p.push({
          id: wave * 12 + i,
          emoji: emojis[Math.floor(Math.random() * emojis.length)],
          x: Math.random() * 100,
          delay: wave * 0.4 + Math.random() * 0.3,
          duration: 1.5 + Math.random() * 1,
          size: 16 + Math.random() * 16,
        });
      }
    }
    setParticles(p);
  }, []);
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 10 }}>
      {particles.map(p => (
        <span key={p.id} style={{
          position: 'absolute', left: `${p.x}%`, bottom: '-20px', fontSize: p.size,
          animation: `memoryFloat ${p.duration}s ease-out ${p.delay}s forwards`, opacity: 0,
        }}>{p.emoji}</span>
      ))}
    </div>
  );
}

// ── Single Card (Level 1 + 2) ──
function Card({ card, isFlipped, isMatched, onClick, gridWidth, gridHeight, highlight }) {
  const cardByWidth = Math.floor(gridWidth / COLS);
  const cardByHeight = gridHeight ? Math.floor(gridHeight / ROWS) : cardByWidth;
  const cardSize = Math.min(cardByWidth, cardByHeight);
  return (
    <div onClick={onClick} style={{
      width: cardSize, height: cardSize, perspective: 600,
      cursor: isMatched ? 'default' : 'pointer',
    }}>
      <div style={{
        width: '100%', height: '100%', position: 'relative',
        transformStyle: 'preserve-3d', transition: 'transform 0.4s ease',
        transform: isFlipped || isMatched ? 'rotateY(180deg)' : 'rotateY(0deg)',
      }}>
        <div style={{
          position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden',
          borderRadius: 8,
          background: highlight ? 'linear-gradient(135deg, #3a5a3c 0%, #2a4a2c 50%, #3a5a3c 100%)'
            : 'linear-gradient(135deg, #2a3a5c 0%, #1a2744 50%, #2a3a5c 100%)',
          border: highlight ? '2px solid rgba(126, 231, 135, 0.6)' : '2px solid rgba(108, 182, 255, 0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: highlight ? '0 0 16px rgba(126, 231, 135, 0.4)' : '0 2px 8px rgba(0,0,0,0.3)',
          transition: 'all 0.3s ease',
        }}>
          <span style={{ fontSize: cardSize * 0.35, opacity: 0.4 }}>🃏</span>
        </div>
        <div style={{
          position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)', borderRadius: 8, overflow: 'hidden',
          border: isMatched ? '2px solid rgba(126, 231, 135, 0.7)' : '2px solid rgba(108, 182, 255, 0.5)',
          boxShadow: isMatched ? '0 0 12px rgba(126, 231, 135, 0.3)' : '0 2px 8px rgba(0,0,0,0.3)',
        }}>
          <img src={`./assets/memory-cards/${card.image}`} alt="" style={{
            width: '100%', height: '100%', objectFit: 'cover', opacity: isMatched ? 0.7 : 1,
          }} draggable={false} />
          {isMatched && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(126, 231, 135, 0.15)',
            }}>
              <span style={{ fontSize: cardSize * 0.3 }}>✓</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// SNAKE GAME v3 — Canvas, 32×32, fullscreen swipe
// ═══════════════════════════════════════════════════════

const FOOD_IMG_CELLS = 3; // food image spans 3×3 cells
const FOOD_MIN_DIST = 6; // min distance between food items (cells)

function SnakeGame({ images, onWin, gridContainerWidth }) {
  const canvasPixelW = Math.min(gridContainerWidth, 400);
  const cellPx = Math.floor(canvasPixelW / SNAKE_COLS);
  const canvasPixelH = cellPx * SNAKE_ROWS;

  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);
  const headImgRef = useRef(null);
  const foodImgsRef = useRef({});
  const allFoodImages = useRef([...images, ...images, ...images, ...images]); // 64 items

  const INIT_SNAKE = [{ x: 16, y: 16 }, { x: 15, y: 16 }, { x: 14, y: 16 }];
  const snakeRef = useRef([...INIT_SNAKE]);
  const dirRef = useRef({ x: 1, y: 0 });
  const foodQueueRef = useRef([]);
  const activeFoodRef = useRef([]);
  const eatenCountRef = useRef(0);
  const gameOverRef = useRef(false);
  const startedRef = useRef(false);
  const wonRef = useRef(false);
  const tickRef = useRef(null);
  const touchStartRef = useRef(null);

  const [eatenCount, setEatenCount] = useState(0);
  const [snakeLen, setSnakeLen] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);

  // Prevent page scroll/reload during snake
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    document.body.style.overscrollBehavior = 'none';
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      document.body.style.overscrollBehavior = '';
    };
  }, []);

  // Preload images
  useEffect(() => {
    const img = new Image();
    img.src = SNAKE_HEAD_IMG;
    headImgRef.current = img;
    images.forEach(src => {
      if (!foodImgsRef.current[src]) {
        const i = new Image();
        i.src = `./assets/memory-cards/${src}`;
        foodImgsRef.current[src] = i;
      }
    });
  }, [images]);

  // Get random position that doesn't overlap with snake or other food (min distance)
  function getRandomFreePos(occupied, activeFood) {
    const margin = 2; // keep food away from edges
    for (let attempts = 0; attempts < 300; attempts++) {
      const x = margin + Math.floor(Math.random() * (SNAKE_COLS - margin * 2));
      const y = margin + Math.floor(Math.random() * (SNAKE_ROWS - margin * 2));
      // Check snake overlap (3×3 area around food)
      let blocked = false;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (occupied.has(`${x + dx},${y + dy}`)) { blocked = true; break; }
        }
        if (blocked) break;
      }
      if (blocked) continue;
      // Check distance to other active food
      const tooClose = activeFood.some(f =>
        Math.abs(f.x - x) < FOOD_MIN_DIST && Math.abs(f.y - y) < FOOD_MIN_DIST
      );
      if (tooClose) continue;
      return { x, y };
    }
    // Fallback: less strict
    for (let attempts = 0; attempts < 100; attempts++) {
      const x = 1 + Math.floor(Math.random() * (SNAKE_COLS - 2));
      const y = 1 + Math.floor(Math.random() * (SNAKE_ROWS - 2));
      if (!occupied.has(`${x},${y}`)) return { x, y };
    }
    return { x: 5, y: 5 };
  }

  const initFood = useCallback(() => {
    const shuffled = shuffle([...allFoodImages.current]);
    const queue = shuffled.map((img, i) => ({ image: img, id: i }));
    const active = [];
    const occupied = new Set(snakeRef.current.map(s => `${s.x},${s.y}`));
    for (let i = 0; i < SNAKE_VISIBLE_FOOD && queue.length > 0; i++) {
      const item = queue.shift();
      const pos = getRandomFreePos(occupied, active);
      active.push({ ...item, x: pos.x, y: pos.y });
    }
    foodQueueRef.current = queue;
    activeFoodRef.current = active;
  }, []);

  // Draw
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const c = cellPx;

    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle grid
    ctx.strokeStyle = 'rgba(108, 182, 255, 0.04)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= SNAKE_COLS; x++) {
      ctx.beginPath(); ctx.moveTo(x * c, 0); ctx.lineTo(x * c, canvasPixelH); ctx.stroke();
    }
    for (let y = 0; y <= SNAKE_ROWS; y++) {
      ctx.beginPath(); ctx.moveTo(0, y * c); ctx.lineTo(canvasPixelW, y * c); ctx.stroke();
    }

    // Food — size shrinks as you eat more: 3×3 → 2×2 → 1×1
    const eaten = eatenCountRef.current;
    const foodCells = eaten >= 42 ? 1 : eaten >= 20 ? 2 : 3;
    const foodSize = c * foodCells;
    const foodOffset = Math.floor(foodCells / 2); // centering offset in cells
    activeFoodRef.current.forEach(f => {
      const img = foodImgsRef.current[f.image];
      const fx = f.x * c - foodOffset * c;
      const fy = f.y * c - foodOffset * c;
      if (img && img.complete) {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(fx, fy, foodSize, foodSize, foodCells > 1 ? 3 : 2);
        ctx.clip();
        ctx.drawImage(img, fx, fy, foodSize, foodSize);
        ctx.restore();
        ctx.strokeStyle = 'rgba(249, 195, 24, 0.6)';
        ctx.lineWidth = foodCells === 1 ? 1 : 1.5;
        ctx.beginPath();
        ctx.roundRect(fx, fy, foodSize, foodSize, foodCells > 1 ? 3 : 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(249, 195, 24, 0.3)';
        ctx.fillRect(fx, fy, foodSize, foodSize);
      }
    });

    // Snake body
    const snake = snakeRef.current;
    snake.forEach((seg, i) => {
      if (i === 0) return;
      const alpha = 1 - (i / (snake.length + 5)) * 0.6;
      ctx.fillStyle = `rgba(249, 195, 24, ${alpha})`;
      ctx.beginPath();
      ctx.roundRect(seg.x * c + 1, seg.y * c + 1, c - 2, c - 2, 2);
      ctx.fill();
    });

    // Snake head
    const head = snake[0];
    if (head) {
      const dir = dirRef.current;
      const hImg = headImgRef.current;
      if (hImg && hImg.complete) {
        ctx.save();
        ctx.translate(head.x * c + c / 2, head.y * c + c / 2);
        if (dir.x === 1) ctx.rotate(Math.PI);
        else if (dir.x === -1) ctx.rotate(0);
        else if (dir.y === -1) ctx.rotate(Math.PI / 2);
        else if (dir.y === 1) ctx.rotate(-Math.PI / 2);
        ctx.drawImage(hImg, -c / 2, -c / 2, c, c);
        ctx.restore();
      } else {
        ctx.fillStyle = SNAKE_COLOR;
        ctx.beginPath();
        ctx.roundRect(head.x * c, head.y * c, c, c, 3);
        ctx.fill();
      }
    }

    // Border
    ctx.strokeStyle = gameOverRef.current ? 'rgba(255,80,80,0.6)' : 'rgba(108,182,255,0.2)';
    ctx.lineWidth = gameOverRef.current ? 3 : 2;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
  }, [cellPx, canvasPixelW, canvasPixelH]);

  useEffect(() => { initFood(); draw(); }, [initFood, draw]);

  // Tick
  useEffect(() => {
    if (!started || gameOver) return;
    tickRef.current = setInterval(() => {
      if (gameOverRef.current || wonRef.current) return;
      const dir = dirRef.current;
      const snake = snakeRef.current;
      const head = snake[0];
      const nh = { x: head.x + dir.x, y: head.y + dir.y };

      if (nh.x < 0 || nh.x >= SNAKE_COLS || nh.y < 0 || nh.y >= SNAKE_ROWS) {
        gameOverRef.current = true; setGameOver(true); draw(); return;
      }
      if (snake.slice(2).some(s => s.x === nh.x && s.y === nh.y)) {
        gameOverRef.current = true; setGameOver(true); draw(); return;
      }

      const active = activeFoodRef.current;
      // Hit radius shrinks with food size: 3×3→1, 2×2→1, 1×1→0
      const ec = eatenCountRef.current;
      const hitRadius = ec >= 42 ? 0 : 1;
      const foodIdx = active.findIndex(f =>
        Math.abs(f.x - nh.x) <= hitRadius && Math.abs(f.y - nh.y) <= hitRadius
      );

      let newSnake;
      if (foodIdx >= 0) {
        // Grow: +1 normally, +2 in hard phase (42+)
        const growExtra = ec >= 32;
        newSnake = growExtra ? [nh, ...snake, snake[snake.length - 1]] : [nh, ...snake];
        const newActive = active.filter((_, i) => i !== foodIdx);
        const occupied = new Set(newSnake.map(s => `${s.x},${s.y}`));
        if (foodQueueRef.current.length > 0) {
          const nextItem = foodQueueRef.current.shift();
          const pos = getRandomFreePos(occupied, newActive);
          newActive.push({ ...nextItem, x: pos.x, y: pos.y });
        }
        activeFoodRef.current = newActive;
        eatenCountRef.current += 1;
        setEatenCount(eatenCountRef.current);
        playSound(SFX.eat, 1.0);
        if (eatenCountRef.current >= SNAKE_TOTAL_FOOD) {
          wonRef.current = true;
          snakeRef.current = newSnake;
          setSnakeLen(newSnake.length);
          draw();
          stopBgMusic();
          playSound(SFX.winning, 1.0);
          if (onWin) onWin();
          clearInterval(tickRef.current);
          return;
        }
      } else {
        newSnake = [nh, ...snake.slice(0, -1)];
      }
      snakeRef.current = newSnake;
      setSnakeLen(newSnake.length);
      draw();
    }, SNAKE_TICK_MS);
    return () => clearInterval(tickRef.current);
  }, [started, gameOver, draw, onWin]);

  // Keyboard
  useEffect(() => {
    const handleKey = (e) => {
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault();
      const dir = dirRef.current;
      let changed = false;
      switch (e.key) {
        case 'ArrowUp': case 'w': case 'W':
          if (dir.y !== 1) { dirRef.current = { x: 0, y: -1 }; changed = true; } break;
        case 'ArrowDown': case 's': case 'S':
          if (dir.y !== -1) { dirRef.current = { x: 0, y: 1 }; changed = true; } break;
        case 'ArrowLeft': case 'a': case 'A':
          if (dir.x !== 1) { dirRef.current = { x: -1, y: 0 }; changed = true; } break;
        case 'ArrowRight': case 'd': case 'D':
          if (dir.x !== -1) { dirRef.current = { x: 1, y: 0 }; changed = true; } break;
      }
      if (changed && !startedRef.current) { startedRef.current = true; setStarted(true); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Swipe — global touch handlers on wrapper
  const handleTouchStart = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);

  const handleTouchMove = useCallback((e) => {
    e.preventDefault(); // prevent scroll/reload
  }, []);

  const handleTouchEnd = useCallback((e) => {
    e.preventDefault();
    if (!touchStartRef.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 15) return;
    const dir = dirRef.current;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0 && dir.x !== -1) dirRef.current = { x: 1, y: 0 };
      else if (dx < 0 && dir.x !== 1) dirRef.current = { x: -1, y: 0 };
    } else {
      if (dy > 0 && dir.y !== -1) dirRef.current = { x: 0, y: 1 };
      else if (dy < 0 && dir.y !== 1) dirRef.current = { x: 0, y: -1 };
    }
    if (!startedRef.current) { startedRef.current = true; setStarted(true); }
    touchStartRef.current = null;
  }, []);

  // D-pad
  const handleDpad = (dx, dy) => {
    const dir = dirRef.current;
    if (dx !== 0 && dir.x !== -dx) dirRef.current = { x: dx, y: 0 };
    if (dy !== 0 && dir.y !== -dy) dirRef.current = { x: 0, y: dy };
    if (!startedRef.current) { startedRef.current = true; setStarted(true); }
  };

  const restart = () => {
    if (tickRef.current) clearInterval(tickRef.current);
    snakeRef.current = [...INIT_SNAKE];
    dirRef.current = { x: 1, y: 0 };
    gameOverRef.current = false; startedRef.current = false; wonRef.current = false;
    eatenCountRef.current = 0;
    setSnakeLen(3); setEatenCount(0); setGameOver(false); setStarted(false);
    initFood();
    setTimeout(() => draw(), 50);
  };

  return (
    <div
      ref={wrapperRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        width: '100%', minHeight: '100vh', touchAction: 'none',
        userSelect: 'none', WebkitUserSelect: 'none',
        paddingBottom: 20,
      }}
    >
      {/* Stats */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: 340,
        marginBottom: 8, padding: '6px 12px',
        background: colors.bgSecondary, borderRadius: 8, border: `1px solid ${colors.border}`,
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 9, color: colors.textSubtle, fontFamily: fonts.mono }}>GEFRESSEN</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: SNAKE_COLOR, fontFamily: fonts.mono }}>
            {eatenCount}/{SNAKE_TOTAL_FOOD}
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 9, color: colors.textSubtle, fontFamily: fonts.mono }}>LÄNGE</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: colors.text, fontFamily: fonts.mono }}>{snakeLen}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 9, color: colors.textSubtle, fontFamily: fonts.mono }}>STATUS</div>
          <div style={{ fontSize: 14, fontWeight: 700, fontFamily: fonts.mono,
            color: gameOver ? colors.red : (started ? SNAKE_COLOR : colors.textSubtle),
          }}>
            {gameOver ? 'CRASH' : (started ? 'LIVE' : 'BEREIT')}
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden' }}>
        <canvas
          ref={canvasRef}
          width={SNAKE_COLS * cellPx}
          height={SNAKE_ROWS * cellPx}
          style={{ display: 'block', touchAction: 'none', borderRadius: 8 }}
        />
        {!started && !gameOver && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', background: 'rgba(1,4,9,0.6)', zIndex: 5,
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🐍</div>
            <div style={{ fontSize: 14, color: colors.text, fontFamily: fonts.mono, marginBottom: 6 }}>
              Swipe oder Pfeiltasten
            </div>
            <div style={{ fontSize: 12, color: colors.textSubtle, fontFamily: fonts.mono }}>
              Friss alle 64 Bilder!
            </div>
          </div>
        )}
        {gameOver && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', background: 'rgba(1,4,9,0.7)', zIndex: 5,
          }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>💀</div>
            <div style={{ fontSize: 14, color: colors.red, fontFamily: fonts.mono, marginBottom: 12 }}>
              Crash! {eatenCount}/{SNAKE_TOTAL_FOOD} gefressen
            </div>
            <button onClick={restart} style={{
              padding: '8px 20px', background: SNAKE_COLOR, color: '#000',
              border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
              fontFamily: fonts.sans, cursor: 'pointer',
            }}>Nochmal</button>
          </div>
        )}
      </div>

      {/* D-Pad */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 56px)',
        gridTemplateRows: 'repeat(3, 48px)', gap: 4, marginTop: 16,
      }}>
        <div />
        <button onClick={() => handleDpad(0, -1)} style={dpadBtnStyle}>▲</button>
        <div />
        <button onClick={() => handleDpad(-1, 0)} style={dpadBtnStyle}>◀</button>
        <div />
        <button onClick={() => handleDpad(1, 0)} style={dpadBtnStyle}>▶</button>
        <div />
        <button onClick={() => handleDpad(0, 1)} style={dpadBtnStyle}>▼</button>
        <div />
      </div>
    </div>
  );
}

const dpadBtnStyle = {
  background: 'rgba(249, 195, 24, 0.08)',
  border: '1px solid rgba(249, 195, 24, 0.3)',
  borderRadius: 10,
  color: '#f9c318',
  fontSize: 20,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'sans-serif',
  WebkitTapHighlightColor: 'transparent',
  userSelect: 'none',
};


// ═══════════════════════════════════════════════════════
// MAIN GAME COMPONENT
// ═══════════════════════════════════════════════════════

export default function MemoryGame({ matrixClue, onWin }) {
  // gamePhase: 'memory' | 'transition12' | 'simon' | 'transition23' | 'snake' | 'won'
  const [gamePhase, setGamePhase] = useState('memory');

  // ── Level 1: Memory ──
  const [cards, setCards] = useState(() => createCards());
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState(new Set());
  const [moves, setMoves] = useState(0);
  const [locked, setLocked] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const gridRef = useRef(null);
  const [gridWidth, setGridWidth] = useState(340);
  const [gridHeight, setGridHeight] = useState(600);
  const timerRef = useRef(null);

  // ── Level 2: Simon Says ──
  const [simonRound, setSimonRound] = useState(0);
  const [simonSequence, setSimonSequence] = useState([]);
  const [simonPhase, setSimonPhase] = useState('idle');
  const [simonFlashIndex, setSimonFlashIndex] = useState(-1);
  const [simonInputIndex, setSimonInputIndex] = useState(0);
  const [simonCorrectCards, setSimonCorrectCards] = useState(new Set());
  const [simonWrongCard, setSimonWrongCard] = useState(-1);
  const simonTimeoutRef = useRef(null);

  // Background music — start happy, switch on phase
  useEffect(() => {
    switchMusic(SFX.happy);
    return () => stopBgMusic();
  }, []);

  // Switch music when entering snake phase
  useEffect(() => {
    if (gamePhase === 'snake') {
      switchMusic(SFX.sneaky);
    } else if (gamePhase === 'memory' || gamePhase === 'simon') {
      switchMusic(SFX.happy);
    }
  }, [gamePhase]);

  // Grid measurement — fit cards to available viewport height
  useEffect(() => {
    const measure = () => {
      if (gridRef.current) {
        setGridWidth(Math.min(gridRef.current.getBoundingClientRect().width, 400));
      }
      // Available height = viewport minus header (~50px), stats bar (~50px), title (~50px), padding (~40px), reset button (~50px)
      const availH = window.innerHeight - 240;
      setGridHeight(Math.max(availH, 200));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // Timer
  useEffect(() => {
    if (startTime && gamePhase === 'memory') {
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [startTime, gamePhase]);

  useEffect(() => () => { if (simonTimeoutRef.current) clearTimeout(simonTimeoutRef.current); }, []);

  // ── Level 1 click ──
  const handleCardClick = useCallback((index) => {
    if (gamePhase !== 'memory' || locked) return;
    if (flipped.includes(index) || matched.has(cards[index].pairId)) return;
    if (!startTime) setStartTime(Date.now());
    playSound(SFX.swipe);

    const newFlipped = [...flipped, index];
    if (newFlipped.length === 1) {
      setFlipped(newFlipped);
    } else if (newFlipped.length === 2) {
      setFlipped(newFlipped);
      setMoves(m => m + 1);
      setLocked(true);
      const [first, second] = newFlipped;
      if (cards[first].pairId === cards[second].pairId) {
        playSound(SFX.match, 1.0);
        const newMatched = new Set(matched);
        newMatched.add(cards[first].pairId);
        setTimeout(() => {
          setMatched(newMatched);
          setFlipped([]);
          setLocked(false);
          if (newMatched.size === CARD_IMAGES.length) { playSound(SFX.levelUp, 1.0); setGamePhase('transition12'); }
        }, 400);
      } else {
        setTimeout(() => { setFlipped([]); setLocked(false); }, FLIP_BACK_DELAY);
      }
    }
  }, [flipped, matched, cards, locked, startTime, gamePhase]);

  // ── Transition → Simon ──
  const startSimon = useCallback(() => {
    setMatched(new Set());
    setFlipped([]);
    setSimonRound(0);
    setSimonPhase('idle');
    setSimonInputIndex(0);
    setSimonCorrectCards(new Set());
    setSimonWrongCard(-1);
    setGamePhase('simon');
  }, []);

  const startSimonRound = useCallback((roundIndex) => {
    const count = SIMON_ROUNDS[roundIndex];
    const seq = pickRandomIndices(count, TOTAL);
    setSimonSequence(seq);
    setSimonInputIndex(0);
    setSimonCorrectCards(new Set());
    setSimonWrongCard(-1);
    setSimonPhase('showing');
    let i = 0;
    const playNext = () => {
      if (i < seq.length) {
        setSimonFlashIndex(seq[i]);
        simonTimeoutRef.current = setTimeout(() => {
          setSimonFlashIndex(-1);
          i++;
          simonTimeoutRef.current = setTimeout(playNext, SIMON_PAUSE);
        }, SIMON_FLASH_DURATION);
      } else {
        setSimonFlashIndex(-1);
        setSimonPhase('input');
      }
    };
    simonTimeoutRef.current = setTimeout(playNext, 800);
  }, []);

  const replaySequence = useCallback(() => {
    if (simonPhase === 'showing') return;
    setSimonPhase('showing');
    setSimonCorrectCards(new Set());
    setSimonInputIndex(0);
    setSimonWrongCard(-1);
    let i = 0;
    const playNext = () => {
      if (i < simonSequence.length) {
        setSimonFlashIndex(simonSequence[i]);
        simonTimeoutRef.current = setTimeout(() => {
          setSimonFlashIndex(-1);
          i++;
          simonTimeoutRef.current = setTimeout(playNext, SIMON_PAUSE);
        }, SIMON_FLASH_DURATION);
      } else {
        setSimonFlashIndex(-1);
        setSimonPhase('input');
      }
    };
    simonTimeoutRef.current = setTimeout(playNext, 500);
  }, [simonSequence, simonPhase]);

  const handleSimonClick = useCallback((index) => {
    if (gamePhase !== 'simon' || simonPhase !== 'input') return;
    playSound(SFX.clicked);
    if (index === simonSequence[simonInputIndex]) {
      const newCorrect = new Set(simonCorrectCards);
      newCorrect.add(index);
      setSimonCorrectCards(newCorrect);
      const nextInput = simonInputIndex + 1;
      setSimonInputIndex(nextInput);
      if (nextInput === simonSequence.length) {
        const nextRound = simonRound + 1;
        if (nextRound >= SIMON_ROUNDS.length) {
          setSimonPhase('round-win');
          playSound(SFX.levelUp, 1.0);
          simonTimeoutRef.current = setTimeout(() => setGamePhase('transition23'), 1200);
        } else {
          setSimonPhase('round-win');
          simonTimeoutRef.current = setTimeout(() => {
            setSimonRound(nextRound);
            startSimonRound(nextRound);
          }, 1500);
        }
      }
    } else {
      setSimonWrongCard(index);
      setSimonPhase('wrong');
      simonTimeoutRef.current = setTimeout(() => {
        setSimonWrongCard(-1);
        replaySequence();
      }, 1000);
    }
  }, [gamePhase, simonPhase, simonSequence, simonInputIndex, simonCorrectCards, simonRound, startSimonRound, replaySequence]);

  useEffect(() => {
    if (gamePhase === 'simon' && simonPhase === 'idle') {
      simonTimeoutRef.current = setTimeout(() => startSimonRound(0), 1500);
    }
  }, [gamePhase, simonPhase, startSimonRound]);

  // ── Transition → Snake ──
  const startSnake = () => setGamePhase('snake');
  const handleSnakeWin = () => setGamePhase('won');

  // ── Reset ──
  const resetGame = () => {
    if (simonTimeoutRef.current) clearTimeout(simonTimeoutRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    setCards(createCards());
    setFlipped([]); setMatched(new Set()); setMoves(0); setLocked(false);
    setStartTime(null); setElapsed(0); setGamePhase('memory');
    setSimonRound(0); setSimonSequence([]); setSimonPhase('idle');
    setSimonFlashIndex(-1); setSimonInputIndex(0);
    setSimonCorrectCards(new Set()); setSimonWrongCard(-1);
  };

  // ── DEV jump ──
  const devJumpTo = (phase) => {
    if (simonTimeoutRef.current) clearTimeout(simonTimeoutRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    if (phase === 'memory') { resetGame(); return; }
    setFlipped([]); setMatched(new Set()); setMoves(42); setElapsed(120); setLocked(false);
    setSimonWrongCard(-1); setSimonFlashIndex(-1); setSimonInputIndex(0);
    setSimonCorrectCards(new Set()); setSimonSequence([]);
    if (phase === 'simon') { setSimonRound(0); setSimonPhase('idle'); setGamePhase('simon'); }
    else if (phase === 'snake') { setGamePhase('snake'); }
    else if (phase === 'won') { setGamePhase('won'); }
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const clue = matrixClue || MATRIX_CLUE;

  // Card states
  const getCardState = (index) => {
    if (gamePhase === 'memory') {
      return { isFlipped: flipped.includes(index), isMatched: matched.has(cards[index].pairId), highlight: false };
    }
    if (gamePhase === 'simon') {
      return { isFlipped: simonFlashIndex === index, isMatched: false, highlight: simonCorrectCards.has(index) };
    }
    return { isFlipped: false, isMatched: false, highlight: false };
  };

  const currentLevel = gamePhase === 'memory' || gamePhase === 'transition12' ? 1
    : gamePhase === 'simon' || gamePhase === 'transition23' ? 2
    : gamePhase === 'snake' ? 3 : 3;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '8px 8px', fontFamily: fonts.sans, position: 'relative',
      maxWidth: 440, margin: '0 auto',
    }}>
      <style>{`
        @keyframes memoryFloat {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(-70vh) rotate(360deg); opacity: 0; }
        }
        @keyframes simonPulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
        @keyframes wrongShake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-4px); } 40% { transform: translateX(4px); }
          60% { transform: translateX(-3px); } 80% { transform: translateX(3px); }
        }
      `}</style>

      {/* Header */}
      <div style={{ width: '100%', textAlign: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: colors.text, fontFamily: fonts.heading || fonts.sans }}>
          {gamePhase === 'memory' || gamePhase === 'transition12' ? '🃏 Memory' :
           gamePhase === 'simon' || gamePhase === 'transition23' ? '🧠 Simon Says' :
           gamePhase === 'snake' ? '🐍 Snake' : '🏆 Geschafft!'}
        </div>
        <div style={{ fontSize: 11, color: colors.textSubtle, fontFamily: fonts.mono, marginTop: 2 }}>
          {gamePhase === 'memory' && 'Level 1 — Finde alle 16 Paare!'}
          {gamePhase === 'simon' && `Level 2 — Runde ${simonRound + 1}/${SIMON_ROUNDS.length}: Merk dir ${SIMON_ROUNDS[Math.min(simonRound, SIMON_ROUNDS.length - 1)]} Karten!`}
          {gamePhase === 'snake' && 'Level 3 — Friss alle 16 Bilder!'}
          {gamePhase === 'won' && 'Alle 3 Level gemeistert!'}
        </div>
      </div>

      {/* ═══ Level 1: Memory ═══ */}
      {gamePhase === 'memory' && (
        <>
          <div style={{
            display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: 340,
            marginBottom: 10, padding: '6px 12px',
            background: colors.bgSecondary, borderRadius: 8, border: `1px solid ${colors.border}`,
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: colors.textSubtle, fontFamily: fonts.mono }}>ZÜGE</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: colors.text, fontFamily: fonts.mono }}>{moves}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: colors.textSubtle, fontFamily: fonts.mono }}>PAARE</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: colors.green, fontFamily: fonts.mono }}>
                {matched.size}/{CARD_IMAGES.length}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: colors.textSubtle, fontFamily: fonts.mono }}>ZEIT</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: colors.text, fontFamily: fonts.mono }}>
                {formatTime(elapsed)}
              </div>
            </div>
          </div>
          <div ref={gridRef} style={{
            display: 'grid', gridTemplateColumns: `repeat(${COLS}, auto)`, gap: 0,
            justifyContent: 'center', position: 'relative',
          }}>
            {cards.map((card, index) => {
              const state = getCardState(index);
              return (
                <Card key={card.id} card={card} isFlipped={state.isFlipped}
                  isMatched={state.isMatched} highlight={state.highlight}
                  onClick={() => handleCardClick(index)} gridWidth={gridWidth} gridHeight={gridHeight} />
              );
            })}
          </div>
        </>
      )}

      {/* ═══ Level 2: Simon Says ═══ */}
      {gamePhase === 'simon' && (
        <>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            width: '100%', maxWidth: 340, marginBottom: 10, padding: '8px 12px',
            background: colors.bgSecondary, borderRadius: 8, border: `1px solid ${colors.border}`,
          }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {SIMON_ROUNDS.map((count, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: i < simonRound ? colors.green : i === simonRound ? colors.accent : 'rgba(255,255,255,0.15)',
                  }} />
                  <span style={{ fontSize: 10, fontFamily: fonts.mono,
                    color: i === simonRound ? colors.text : colors.textSubtle }}>{count}</span>
                </div>
              ))}
            </div>
            <div style={{
              fontSize: 11, fontFamily: fonts.mono,
              color: simonPhase === 'showing' ? colors.orange : simonPhase === 'input' ? colors.green
                : simonPhase === 'wrong' ? colors.red : simonPhase === 'round-win' ? colors.green : colors.textSubtle,
              animation: simonPhase === 'showing' ? 'simonPulse 1s ease infinite' : 'none',
            }}>
              {simonPhase === 'idle' && 'Bereit...'}
              {simonPhase === 'showing' && 'Schau zu!'}
              {simonPhase === 'input' && `${simonInputIndex}/${simonSequence.length}`}
              {simonPhase === 'wrong' && 'Falsch!'}
              {simonPhase === 'round-win' && 'Richtig!'}
            </div>
            <button onClick={replaySequence} disabled={simonPhase !== 'input'} style={{
              background: 'transparent',
              border: `1px solid ${simonPhase === 'input' ? colors.accent : colors.borderSubtle}`,
              borderRadius: 6, color: simonPhase === 'input' ? colors.accent : colors.textSubtle,
              fontSize: 10, fontFamily: fonts.mono, padding: '4px 10px',
              cursor: simonPhase === 'input' ? 'pointer' : 'default',
              opacity: simonPhase === 'input' ? 1 : 0.4,
            }}>🔁 Nochmal</button>
          </div>
          <div ref={gridRef} style={{
            display: 'grid', gridTemplateColumns: `repeat(${COLS}, auto)`, gap: 0,
            justifyContent: 'center', position: 'relative',
          }}>
            {cards.map((card, index) => {
              const state = getCardState(index);
              return (
                <div key={card.id} style={{
                  ...(simonWrongCard === index ? {
                    boxShadow: '0 0 20px rgba(255, 80, 80, 0.7)',
                    border: '2px solid rgba(255, 80, 80, 0.8)', borderRadius: 8,
                  } : {}),
                  animation: simonWrongCard === index ? 'wrongShake 0.4s ease' : 'none',
                }}>
                  <Card card={card} isFlipped={state.isFlipped} isMatched={state.isMatched}
                    highlight={state.highlight} onClick={() => handleSimonClick(index)} gridWidth={gridWidth} gridHeight={gridHeight} />
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ═══ Level 3: Snake ═══ */}
      {gamePhase === 'snake' && (
        <SnakeGame
          images={CARD_IMAGES}
          onWin={handleSnakeWin}
          gridContainerWidth={Math.min(gridWidth, 400)}
        />
      )}

      {/* ═══ TRANSITION POPUPS ═══ */}

      {/* Level 1 → 2 */}
      {gamePhase === 'transition12' && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(1, 4, 9, 0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 20,
        }}>
          <div style={{
            background: colors.bgSecondary, border: `2px solid ${colors.green}`, borderRadius: 16,
            padding: '32px 28px', maxWidth: 360, width: '100%', textAlign: 'center',
            boxShadow: '0 0 40px rgba(126, 231, 135, 0.15)',
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: colors.green, fontFamily: fonts.heading || fonts.sans, marginBottom: 6 }}>
              Glückwunsch!
            </div>
            <div style={{ fontSize: 14, color: colors.text, lineHeight: 1.6, marginBottom: 4 }}>
              Alle Paare gefunden!
            </div>
            <div style={{ fontSize: 12, color: colors.textMuted, fontFamily: fonts.mono, marginBottom: 20 }}>
              {moves} Züge · {formatTime(elapsed)}
            </div>
            <div style={{
              padding: '12px 16px', background: 'rgba(255, 166, 87, 0.08)',
              border: '1px solid rgba(255, 166, 87, 0.3)', borderRadius: 10, marginBottom: 20,
            }}>
              <div style={{ fontSize: 13, color: colors.orange, fontWeight: 600, marginBottom: 6 }}>
                ...aber das war erst Level 1
              </div>
              <div style={{ fontSize: 12, color: colors.textMuted, lineHeight: 1.5 }}>
                Die Karten drehen sich wieder um. Merk dir die Reihenfolge in der sie aufleuchten!
              </div>
            </div>
            <button onClick={startSimon} style={{
              width: '100%', padding: '12px 28px',
              background: `linear-gradient(135deg, ${colors.accent}, #4a9eff)`,
              color: '#fff', border: 'none', borderRadius: 10, fontSize: 16,
              fontWeight: 700, fontFamily: fonts.sans, cursor: 'pointer',
            }}>
              Ready for Level 2? 🧠
            </button>
          </div>
        </div>
      )}

      {/* Level 2 → 3 */}
      {gamePhase === 'transition23' && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(1, 4, 9, 0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 20,
        }}>
          <div style={{
            background: colors.bgSecondary, border: `2px solid ${colors.green}`, borderRadius: 16,
            padding: '32px 28px', maxWidth: 360, width: '100%', textAlign: 'center',
            boxShadow: '0 0 40px rgba(126, 231, 135, 0.15)',
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🧠</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: colors.green, fontFamily: fonts.heading || fonts.sans, marginBottom: 6 }}>
              Level 2 geschafft!
            </div>
            <div style={{ fontSize: 14, color: colors.text, lineHeight: 1.6, marginBottom: 20 }}>
              Starkes Gedächtnis!
            </div>
            <div style={{
              padding: '12px 16px', background: 'rgba(126, 231, 135, 0.06)',
              border: '1px solid rgba(126, 231, 135, 0.2)', borderRadius: 10, marginBottom: 20,
            }}>
              <div style={{ fontSize: 13, color: colors.orange, fontWeight: 600, marginBottom: 6 }}>
                ...aber da kommt noch was
              </div>
              <div style={{ fontSize: 12, color: colors.textMuted, lineHeight: 1.5 }}>
                Steuere die Schlange und friss alle 16 Bilder!
              </div>
            </div>
            <button onClick={startSnake} style={{
              width: '100%', padding: '12px 28px',
              background: `linear-gradient(135deg, #22c55e, #16a34a)`,
              color: '#fff', border: 'none', borderRadius: 10, fontSize: 16,
              fontWeight: 700, fontFamily: fonts.sans, cursor: 'pointer',
            }}>
              Ready for Level 3? 🐍
            </button>
          </div>
        </div>
      )}

      {/* ═══ WIN SCREEN ═══ */}
      {gamePhase === 'won' && (
        <div style={{
          marginTop: 16, padding: '16px 24px', position: 'relative',
          background: 'rgba(126, 231, 135, 0.1)', border: `2px solid ${colors.green}`,
          borderRadius: 12, textAlign: 'center', width: '100%', maxWidth: 340,
        }}>
          <Celebration />
          <div style={{ fontSize: 24, marginBottom: 6 }}>🎉🧠🐍</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: colors.green, fontFamily: fonts.sans }}>
            Herzlichen Glückwunsch!
          </div>
          <div style={{ fontSize: 13, color: colors.text, marginTop: 8, lineHeight: 1.6 }}>
            Du hast einen Matrix Clue freigeschaltet:
          </div>
          <div style={{
            marginTop: 12, padding: '14px 16px',
            background: colors.bgSecondary, borderRadius: 8, border: `1px solid ${colors.accent}`,
            boxShadow: '0 0 20px rgba(108, 182, 255, 0.15)',
          }}>
            <div style={{ fontSize: 9, color: colors.textSubtle, fontFamily: fonts.mono, marginBottom: 4, letterSpacing: 1 }}>
              MATRIX CLUE
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: colors.accent, fontFamily: fonts.mono, letterSpacing: 2 }}>
              {clue}
            </div>
          </div>
          <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 8, fontFamily: fonts.mono }}>
            {moves} Züge · {formatTime(elapsed)}
          </div>
        </div>
      )}

      {/* Reset */}
      <button onClick={resetGame} style={{
        marginTop: 12, padding: '8px 20px', background: 'transparent',
        color: colors.textMuted, border: `1px solid ${colors.borderSubtle}`,
        borderRadius: 8, fontSize: 12, fontFamily: fonts.mono, cursor: 'pointer',
      }}>
        🔄 Neu starten
      </button>
    </div>
  );
}
