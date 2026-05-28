import React, { useState, useEffect, useCallback, useRef } from 'react';

// ═══════════════════════════════════════════════════════
// SNAKE GAME — Mark (Standalone)
// 32×48 Grid, swipe-only, 64 food items
// Matrix-Clue D4: 0, 5, 3, 9, 7, 4
// ═══════════════════════════════════════════════════════

const SNAKE_COLS = 32;
const SNAKE_ROWS = 48;
const SNAKE_TICK_MS = 120;
const SNAKE_TOTAL_FOOD = 64;
const SNAKE_VISIBLE_FOOD = 2;
const SNAKE_COLOR = '#f9c318';
const SNAKE_HEAD_IMG = './assets/memory-cards/snake_head.png';
const FOOD_MIN_DIST = 6;

const SFX = {
  eat: './assets/memory-cards/eat.wav',
  winning: './assets/memory-cards/winning.mp3',
  sneaky: './assets/memory-cards/sneaky_snakes.mp3',
};

const SFX_VOLUME = 0.6;
const MUSIC_VOLUME = 0.6;

function playSound(src, volume) {
  try {
    const audio = new Audio(src);
    audio.volume = volume != null ? volume : SFX_VOLUME;
    audio.play().catch(() => {});
  } catch {}
}

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

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function SnakeGame({ matrixClue, onWin, onBack }) {
  const [phase, setPhase] = useState('start'); // 'start' | 'playing' | 'won'

  if (phase === 'start') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        paddingTop: 'max(70px, calc(env(safe-area-inset-top) + 56px))',
      }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🐍</div>
        <div style={{
          fontSize: 28, fontWeight: 800, color: SNAKE_COLOR,
          marginBottom: 8, fontFamily: 'monospace', letterSpacing: 2,
        }}>
          SNAKE
        </div>
        <div style={{
          fontSize: 14, color: 'rgba(255,255,255,0.5)',
          marginBottom: 32, textAlign: 'center', maxWidth: 300, lineHeight: 1.6,
        }}>
          Steuere die Schlange durch Wischen und friss alle 64 Bilder!
          Je mehr du frisst, desto kleiner werden sie...
        </div>

        <div style={{
          background: 'rgba(249, 195, 24, 0.08)',
          border: '1px solid rgba(249, 195, 24, 0.25)',
          borderRadius: 12, padding: '16px 24px', marginBottom: 24,
          textAlign: 'center', maxWidth: 280,
        }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 8, letterSpacing: 1 }}>
            SPIELREGELN
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.7 }}>
            Wische um die Richtung zu ändern.
            Berühre keine Wände und beiße dich nicht selbst!
          </div>
        </div>

        <button
          onClick={() => setPhase('playing')}
          style={{
            padding: '16px 48px',
            background: `linear-gradient(135deg, ${SNAKE_COLOR}, #e6a800)`,
            border: 'none', borderRadius: 14,
            color: '#000', fontSize: 18, fontWeight: 800,
            cursor: 'pointer', letterSpacing: 1,
            boxShadow: '0 4px 20px rgba(249, 195, 24, 0.35)',
          }}
        >
          LOS GEHT'S!
        </button>
      </div>
    );
  }

  if (phase === 'won') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px 16px',
        paddingTop: 'max(24px, env(safe-area-inset-top))',
      }}>
        <div style={{
          fontSize: 48, marginBottom: 8,
          animation: 'snakeBounce 0.6s ease',
        }}>
          🎉
        </div>
        <div style={{
          fontSize: 22, fontWeight: 700, color: '#4ade80', marginBottom: 4,
        }}>
          GESCHAFFT!
        </div>
        <div style={{
          fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 24,
        }}>
          Alle 64 Bilder gefressen!
        </div>

        <div style={{
          fontSize: 64, marginBottom: 24,
        }}>
          🐍🏆
        </div>

        {matrixClue && (
          <div style={{
            background: 'rgba(74, 222, 128, 0.1)',
            border: '1px solid rgba(74, 222, 128, 0.3)',
            borderRadius: 12, padding: '16px 24px',
            marginBottom: 24, textAlign: 'center',
            width: '100%', maxWidth: 500,
          }}>
            <div style={{
              fontSize: 11, letterSpacing: 2,
              color: 'rgba(74, 222, 128, 0.7)',
              marginBottom: 8, fontWeight: 600,
            }}>
              MATRIX CLUE
            </div>
            <div style={{
              fontSize: 28, fontWeight: 700,
              fontFamily: 'monospace', color: '#4ade80',
              letterSpacing: 4,
            }}>
              {matrixClue}
            </div>
          </div>
        )}

        <button
          onClick={onBack}
          style={{
            padding: '14px 32px',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 12, color: '#fff',
            fontSize: 16, fontWeight: 600, cursor: 'pointer',
          }}
        >
          ← WEITER
        </button>

        <style>{`
          @keyframes snakeBounce {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.3); }
          }
        `}</style>
      </div>
    );
  }

  // phase === 'playing'
  return (
    <SnakeCanvas
      onWin={() => {
        setPhase('won');
        if (onWin) onWin();
      }}
    />
  );
}


// ═══════════════════════════════════════════════════════
// SNAKE CANVAS — the actual game
// ═══════════════════════════════════════════════════════

function SnakeCanvas({ onWin }) {
  const [containerW, setContainerW] = useState(Math.min(window.innerWidth, 400));
  const cellPx = Math.floor(containerW / SNAKE_COLS);
  const canvasPixelW = cellPx * SNAKE_COLS;
  const canvasPixelH = cellPx * SNAKE_ROWS;

  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);
  const headImgRef = useRef(null);
  const foodImgsRef = useRef({});
  const allFoodImages = useRef([...CARD_IMAGES, ...CARD_IMAGES, ...CARD_IMAGES, ...CARD_IMAGES]);

  const INIT_SNAKE = [{ x: 16, y: 24 }, { x: 15, y: 24 }, { x: 14, y: 24 }];
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

  // Measure container
  useEffect(() => {
    const measure = () => setContainerW(Math.min(window.innerWidth - 16, 400));
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // Prevent scroll
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

  // Background music
  useEffect(() => {
    switchMusic(SFX.sneaky);
    return () => stopBgMusic();
  }, []);

  // Preload images
  useEffect(() => {
    const img = new Image();
    img.src = SNAKE_HEAD_IMG;
    headImgRef.current = img;
    CARD_IMAGES.forEach(src => {
      if (!foodImgsRef.current[src]) {
        const i = new Image();
        i.src = `./assets/memory-cards/${src}`;
        foodImgsRef.current[src] = i;
      }
    });
  }, []);

  function getRandomFreePos(occupied, activeFood) {
    const margin = 2;
    for (let attempts = 0; attempts < 300; attempts++) {
      const x = margin + Math.floor(Math.random() * (SNAKE_COLS - margin * 2));
      const y = margin + Math.floor(Math.random() * (SNAKE_ROWS - margin * 2));
      let blocked = false;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (occupied.has(`${x + dx},${y + dy}`)) { blocked = true; break; }
        }
        if (blocked) break;
      }
      if (blocked) continue;
      const tooClose = activeFood.some(f =>
        Math.abs(f.x - x) < FOOD_MIN_DIST && Math.abs(f.y - y) < FOOD_MIN_DIST
      );
      if (tooClose) continue;
      return { x, y };
    }
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

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const c = cellPx;

    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid
    ctx.strokeStyle = 'rgba(108, 182, 255, 0.04)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= SNAKE_COLS; x++) {
      ctx.beginPath(); ctx.moveTo(x * c, 0); ctx.lineTo(x * c, canvasPixelH); ctx.stroke();
    }
    for (let y = 0; y <= SNAKE_ROWS; y++) {
      ctx.beginPath(); ctx.moveTo(0, y * c); ctx.lineTo(canvasPixelW, y * c); ctx.stroke();
    }

    // Food
    const eaten = eatenCountRef.current;
    const foodCells = eaten >= 42 ? 1 : eaten >= 20 ? 2 : 3;
    const foodSize = c * foodCells;
    const foodOffset = Math.floor(foodCells / 2);
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
      const ec = eatenCountRef.current;
      const hitRadius = ec >= 42 ? 0 : 1;
      const foodIdx = active.findIndex(f =>
        Math.abs(f.x - nh.x) <= hitRadius && Math.abs(f.y - nh.y) <= hitRadius
      );

      let newSnake;
      if (foodIdx >= 0) {
        // Grow +3 per food (add head + 2 tail duplicates)
        const tail = snake[snake.length - 1];
        newSnake = [nh, ...snake, tail, tail];
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

  // Swipe only (no keyboard, no d-pad)
  const handleTouchStart = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);

  const handleTouchMove = useCallback((e) => {
    e.preventDefault();
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
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '8px 8px',
        paddingTop: 'max(70px, calc(env(safe-area-inset-top) + 56px))',
        touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none',
      }}
    >
      {/* Stats */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: 340,
        marginBottom: 8, padding: '6px 12px',
        background: 'rgba(255,255,255,0.04)', borderRadius: 8,
        border: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>GEFRESSEN</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: SNAKE_COLOR, fontFamily: 'monospace' }}>
            {eatenCount}/{SNAKE_TOTAL_FOOD}
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>LÄNGE</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0', fontFamily: 'monospace' }}>{snakeLen}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>STATUS</div>
          <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'monospace',
            color: gameOver ? '#f87171' : (started ? SNAKE_COLOR : 'rgba(255,255,255,0.4)'),
          }}>
            {gameOver ? 'CRASH' : (started ? 'LIVE' : 'BEREIT')}
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden' }}>
        <canvas
          ref={canvasRef}
          width={canvasPixelW}
          height={canvasPixelH}
          style={{ display: 'block', touchAction: 'none', borderRadius: 8 }}
        />
        {!started && !gameOver && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', background: 'rgba(1,4,9,0.6)', zIndex: 5,
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🐍</div>
            <div style={{ fontSize: 14, color: '#e2e8f0', fontFamily: 'monospace', marginBottom: 6 }}>
              Wische zum Starten!
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>
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
            <div style={{ fontSize: 14, color: '#f87171', fontFamily: 'monospace', marginBottom: 12 }}>
              Crash! {eatenCount}/{SNAKE_TOTAL_FOOD} gefressen
            </div>
            <button onClick={restart} style={{
              padding: '8px 20px', background: SNAKE_COLOR, color: '#000',
              border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
              cursor: 'pointer',
            }}>Nochmal</button>
          </div>
        )}
      </div>
    </div>
  );
}
