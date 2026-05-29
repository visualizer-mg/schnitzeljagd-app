import React, { useState, useEffect, useRef, useCallback } from 'react';
import { colors, fonts } from '../theme';

const ROWS = 9;
const COLS = 5;
const TOTAL = ROWS * COLS;
const MATRIX_CLUE = 'C11: 2 - 0 - 5 - 9 - 3';
const GLOW_COLOR = '#FFE000';
const GLOW_RGBA = 'rgba(255,224,0,0.6)';

const HEARTS = ['❤️', '🧡', '💛', '💚', '💙', '💜', '🩷', '🩵', '🤍', '💖', '💗', '💕'];

// ── Sound helpers ──
const SFX = {
  swipe: './assets/memory-cards/swipe.wav',
  match: './assets/memory-cards/plip_and_plop2.mp3',
  winning: './assets/memory-cards/winning.mp3',
};
const SFX_VOLUME = 0.6;
function playSound(src, volume) {
  try {
    const audio = new Audio(src);
    audio.volume = volume != null ? volume : SFX_VOLUME;
    audio.play().catch(() => {});
  } catch {}
}

function shuffleTiles() {
  const indices = Array.from({ length: TOTAL }, (_, i) => i);
  let shuffled;
  do {
    shuffled = [...indices];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
  } while (shuffled.some((val, idx) => val === idx));
  return shuffled;
}

function tileToRowCol(index) {
  return { row: Math.floor(index / COLS), col: index % COLS };
}

// Compute which edges of each cell should have a glowing border
// Only cells that are part of a cluster of 2+ correct neighbors get borders
function computeClusterBorders(tiles) {
  const isCorrect = tiles.map((val, idx) => val === idx);

  // BFS to find connected components, only mark clusters with size >= 2
  const clusterOf = new Array(TOTAL).fill(-1);
  const clusterSizes = [];
  let clusterId = 0;

  for (let i = 0; i < TOTAL; i++) {
    if (!isCorrect[i] || clusterOf[i] >= 0) continue;
    const queue = [i];
    clusterOf[i] = clusterId;
    const members = [i];
    while (queue.length > 0) {
      const pos = queue.shift();
      const row = Math.floor(pos / COLS);
      const col = pos % COLS;
      const neighbors = [];
      if (row > 0) neighbors.push(pos - COLS);
      if (row < ROWS - 1) neighbors.push(pos + COLS);
      if (col > 0) neighbors.push(pos - 1);
      if (col < COLS - 1) neighbors.push(pos + 1);
      for (const n of neighbors) {
        if (isCorrect[n] && clusterOf[n] < 0) {
          clusterOf[n] = clusterId;
          queue.push(n);
          members.push(n);
        }
      }
    }
    clusterSizes.push(members.length);
    clusterId++;
  }

  const borders = Array.from({ length: TOTAL }, () => ({
    top: false, right: false, bottom: false, left: false, isInCluster: false,
  }));

  for (let pos = 0; pos < TOTAL; pos++) {
    if (!isCorrect[pos]) continue;
    if (clusterOf[pos] < 0 || clusterSizes[clusterOf[pos]] < 2) continue;

    const row = Math.floor(pos / COLS);
    const col = pos % COLS;
    borders[pos].isInCluster = true;

    borders[pos].top = (row === 0) || !isCorrect[pos - COLS];
    borders[pos].bottom = (row === ROWS - 1) || !isCorrect[pos + COLS];
    borders[pos].left = (col === 0) || !isCorrect[pos - 1];
    borders[pos].right = (col === COLS - 1) || !isCorrect[pos + 1];
  }

  return borders;
}

// Count clusters (connected components of correct tiles)
function countClusters(tiles) {
  const isCorrect = tiles.map((val, idx) => val === idx);
  const visited = new Array(TOTAL).fill(false);
  let clusters = 0;

  for (let i = 0; i < TOTAL; i++) {
    if (!isCorrect[i] || visited[i]) continue;
    clusters++;
    const queue = [i];
    visited[i] = true;
    while (queue.length > 0) {
      const pos = queue.shift();
      const row = Math.floor(pos / COLS);
      const col = pos % COLS;
      const neighbors = [];
      if (row > 0) neighbors.push(pos - COLS);
      if (row < ROWS - 1) neighbors.push(pos + COLS);
      if (col > 0) neighbors.push(pos - 1);
      if (col < COLS - 1) neighbors.push(pos + 1);
      for (const n of neighbors) {
        if (!visited[n] && isCorrect[n]) {
          visited[n] = true;
          queue.push(n);
        }
      }
    }
  }
  return clusters;
}

// Heart particle component
function HeartParticles() {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    // Spawn hearts in waves
    const spawnWave = (delay) => {
      setTimeout(() => {
        const newHearts = Array.from({ length: 8 }, (_, i) => ({
          id: delay + i,
          heart: HEARTS[Math.floor(Math.random() * HEARTS.length)],
          x: 10 + Math.random() * 80, // % from left
          startY: 100 + Math.random() * 20, // start below screen
          endY: -20 - Math.random() * 30, // fly above screen
          drift: (Math.random() - 0.5) * 40, // horizontal drift in px
          size: 18 + Math.random() * 20,
          duration: 1.5 + Math.random() * 1.5,
          delay: Math.random() * 0.3,
        }));
        setParticles(prev => [...prev, ...newHearts]);
      }, delay);
    };

    spawnWave(0);
    spawnWave(600);
    spawnWave(1200);

    // Cleanup after animation
    const cleanup = setTimeout(() => setParticles([]), 4000);
    return () => clearTimeout(cleanup);
  }, []);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      pointerEvents: 'none', zIndex: 1001, overflow: 'hidden',
    }}>
      {particles.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            fontSize: p.size,
            animation: `heartFloat ${p.duration}s ease-out ${p.delay}s forwards`,
            opacity: 0,
          }}
        >
          {p.heart}
        </div>
      ))}
      <style>{`
        @keyframes heartFloat {
          0% { transform: translateY(100vh) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          70% { opacity: 1; }
          100% { transform: translateY(-30vh) rotate(${Math.random() > 0.5 ? '' : '-'}25deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export default function PuzzleGame({ matrixClue, onWin, onBack }) {
  const [phase, setPhase] = useState('intro'); // 'intro' | 'playing'
  const [tiles, setTiles] = useState(() => shuffleTiles());
  const [solved, setSolved] = useState(false);
  const [moves, setMoves] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [showHearts, setShowHearts] = useState(false);

  const [dragFrom, setDragFrom] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [dragImg, setDragImg] = useState(null);
  const gridRef = useRef(null);
  const timerRef = useRef(null);
  const touchStartRef = useRef(null);

  useEffect(() => {
    if (startTime && !solved) {
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [startTime, solved]);

  useEffect(() => {
    if (moves > 0 && tiles.every((val, idx) => val === idx)) {
      setSolved(true);
      setShowHearts(true);
      playSound(SFX.winning, 1.0);
      clearInterval(timerRef.current);
      if (onWin) onWin();
      // Hide hearts after animation
      setTimeout(() => setShowHearts(false), 4500);
    }
  }, [tiles, moves]);

  const getGridPosFromPoint = useCallback((clientX, clientY) => {
    if (!gridRef.current) return null;
    const rect = gridRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const cellW = rect.width / COLS;
    const cellH = rect.height / ROWS;
    const col = Math.floor(x / cellW);
    const row = Math.floor(y / cellH);
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return null;
    return row * COLS + col;
  }, []);

  const prevCorrectRef = useRef(0);

  const swapTiles = useCallback((from, to) => {
    if (from === null || to === null || from === to || solved) return;
    if (!startTime) setStartTime(Date.now());
    playSound(SFX.swipe, 0.5);
    setTiles(prev => {
      const next = [...prev];
      [next[from], next[to]] = [next[to], next[from]];
      // Check if new correct positions were created
      const oldCorrect = prevCorrectRef.current;
      const newCorrect = next.filter((val, idx) => val === idx).length;
      prevCorrectRef.current = newCorrect;
      if (newCorrect > oldCorrect) {
        setTimeout(() => playSound(SFX.match, 0.5), 150);
      }
      return next;
    });
    setMoves(m => m + 1);
  }, [solved, startTime]);

  // Mouse handlers
  const handleMouseDown = (gridPos, e) => {
    if (solved) return;
    e.preventDefault();
    setDragFrom(gridPos);
    setDragOver(gridPos);
    setDragImg({ tileIdx: tiles[gridPos], x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = useCallback((e) => {
    if (dragFrom === null) return;
    setDragImg(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);
    const pos = getGridPosFromPoint(e.clientX, e.clientY);
    setDragOver(pos);
  }, [dragFrom, getGridPosFromPoint]);

  const handleMouseUp = useCallback(() => {
    if (dragFrom !== null && dragOver !== null && dragFrom !== dragOver) {
      swapTiles(dragFrom, dragOver);
    }
    setDragFrom(null);
    setDragOver(null);
    setDragImg(null);
  }, [dragFrom, dragOver, swapTiles]);

  useEffect(() => {
    if (dragFrom !== null) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragFrom, handleMouseMove, handleMouseUp]);

  // Touch handlers
  const handleTouchStart = (gridPos, e) => {
    if (solved) return;
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, gridPos };
    setDragFrom(gridPos);
    setDragOver(gridPos);
    setDragImg({ tileIdx: tiles[gridPos], x: touch.clientX, y: touch.clientY });
  };

  const handleTouchMove = useCallback((e) => {
    if (dragFrom === null) return;
    e.preventDefault();
    const touch = e.touches[0];
    setDragImg(prev => prev ? { ...prev, x: touch.clientX, y: touch.clientY } : null);
    const pos = getGridPosFromPoint(touch.clientX, touch.clientY);
    setDragOver(pos);
  }, [dragFrom, getGridPosFromPoint]);

  const handleTouchEnd = useCallback(() => {
    if (dragFrom !== null && dragOver !== null && dragFrom !== dragOver) {
      swapTiles(dragFrom, dragOver);
    }
    setDragFrom(null);
    setDragOver(null);
    setDragImg(null);
    touchStartRef.current = null;
  }, [dragFrom, dragOver, swapTiles]);

  useEffect(() => {
    if (dragFrom !== null) {
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
      return () => {
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [dragFrom, handleTouchMove, handleTouchEnd]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  const correctCount = tiles.filter((val, idx) => val === idx).length;
  const clusterBorders = computeClusterBorders(tiles);
  const clusterCount = countClusters(tiles);
  const BORDER_W = 2;

  // ═══ INTRO SCREEN ═══
  if (phase === 'intro') {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '80vh', padding: 24, textAlign: 'center',
        color: colors.text,
      }}>
        <div style={{ fontSize: 56, marginBottom: 20 }}>🧩📸</div>
        <div style={{
          fontSize: 22, fontWeight: 800, color: '#ffa657',
          letterSpacing: 1, marginBottom: 16, fontFamily: 'monospace',
        }}>
          PHOTO PUZZLE
        </div>
        <div style={{
          fontSize: 15, color: '#e6edf3', lineHeight: 1.8, maxWidth: 320, marginBottom: 8,
        }}>
          Welcome to the Photo Puzzle!<br/>
          Are you ready for some serious brainwork?
        </div>
        <div style={{
          fontSize: 13, color: '#8b949e', lineHeight: 1.7, maxWidth: 320, marginBottom: 20,
          padding: '12px 16px', background: 'rgba(255, 166, 87, 0.08)',
          border: '1px solid rgba(255, 166, 87, 0.2)', borderRadius: 10,
          textAlign: 'left',
        }}>
          <strong style={{ color: '#ffa657' }}>How it works:</strong><br/>
          • Find the correct picture by arranging all 45 tiles<br/>
          • Drag a tile onto another to swap them<br/>
          • Tiles in the correct position get a <span style={{ color: '#FFE000', fontWeight: 700 }}>yellow border</span><br/>
          • Arrange all tiles correctly to win!
        </div>
        <div style={{
          fontSize: 12, color: '#6cb6ff', lineHeight: 1.6, maxWidth: 320, marginBottom: 28,
          fontStyle: 'italic',
        }}>
          Hint: Maybe the solution has something to do with "chickens"... 🐔
        </div>
        <button
          onClick={() => setPhase('playing')}
          onTouchEnd={(e) => { e.stopPropagation(); setPhase('playing'); }}
          style={{
            padding: '16px 40px',
            background: 'linear-gradient(135deg, #ffa657, #f78166)',
            color: '#fff', border: 'none', borderRadius: 12, fontSize: 18,
            fontWeight: 700, cursor: 'pointer', letterSpacing: 1,
          }}
        >
          🧩 LET'S GO!
        </button>
        {onBack && (
          <button onClick={onBack}
            onTouchEnd={(e) => { e.stopPropagation(); if (onBack) onBack(); }}
            style={{
              marginTop: 16, padding: '8px 20px', background: 'transparent',
              color: '#8b949e', border: '1px solid #30363d', borderRadius: 8,
              fontSize: 13, cursor: 'pointer',
            }}>← Back</button>
        )}
      </div>
    );
  }

  return (
    <div style={{
      padding: '48px 12px 12px', color: colors.text,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      maxWidth: 500, margin: '0 auto', userSelect: 'none',
    }}>
      {/* Heart animation on win */}
      {showHearts && <HeartParticles />}

      {/* Drag ghost — sized to match actual tile */}
      {dragImg && dragFrom !== null && (() => {
        const rect = gridRef.current?.getBoundingClientRect();
        const ghostW = rect ? rect.width / COLS : 70;
        const ghostH = rect ? rect.height / ROWS : 70;
        const { row, col } = tileToRowCol(dragImg.tileIdx);
        return (
          <div style={{
            position: 'fixed',
            left: dragImg.x - ghostW / 2, top: dragImg.y - ghostH / 2,
            width: ghostW, height: ghostH, zIndex: 999,
            pointerEvents: 'none', opacity: 0.85,
            borderRadius: 4, overflow: 'hidden',
            border: `2px solid ${GLOW_COLOR}`,
            boxShadow: `0 8px 24px rgba(0,0,0,0.5), 0 0 16px ${GLOW_RGBA}`,
            transform: 'scale(1.08)',
          }}>
            <img
              src={`assets/puzzle-tiles/tile_${row}_${col}.jpg`} alt="dragging"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>
        );
      })()}

      {/* Puzzle Grid */}
      <div
        ref={gridRef}
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gap: 0,
          width: '85%',
          maxWidth: 340,
          aspectRatio: `${COLS} / ${ROWS}`,
          borderRadius: 6,
          overflow: 'hidden',
          touchAction: 'none',
          boxShadow: solved
            ? `0 0 30px ${GLOW_RGBA}, 0 0 60px rgba(255,224,0,0.3)`
            : '0 4px 20px rgba(0,0,0,0.3)',
          transition: 'box-shadow 0.6s ease',
        }}
      >
        {tiles.map((tileIdx, gridPos) => {
          const { row, col } = tileToRowCol(tileIdx);
          const isDragSource = dragFrom === gridPos;
          const isDragTarget = dragOver === gridPos && dragFrom !== null && dragFrom !== gridPos;
          const cb = clusterBorders[gridPos];
          const showBorders = cb.isInCluster && moves > 0 && !solved;

          return (
            <div
              key={gridPos}
              onMouseDown={(e) => handleMouseDown(gridPos, e)}
              onTouchStart={(e) => handleTouchStart(gridPos, e)}
              style={{
                padding: 0,
                border: 'none',
                cursor: solved ? 'default' : 'grab',
                overflow: 'hidden',
                position: 'relative',
                opacity: isDragSource ? 0.3 : 1,
              }}
            >
              <img
                src={`assets/puzzle-tiles/tile_${row}_${col}.jpg`}
                alt={`Tile ${row}-${col}`}
                draggable={false}
                style={{
                  width: '100%', height: '100%',
                  objectFit: 'cover', display: 'block',
                  pointerEvents: 'none',
                }}
              />
              {/* Border overlay — sits ON TOP of image */}
              {(showBorders || isDragTarget) && (
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  pointerEvents: 'none',
                  borderTop: showBorders && cb.top ? `${BORDER_W}px solid ${GLOW_COLOR}` : 'none',
                  borderBottom: showBorders && cb.bottom ? `${BORDER_W}px solid ${GLOW_COLOR}` : 'none',
                  borderLeft: showBorders && cb.left ? `${BORDER_W}px solid ${GLOW_COLOR}` : 'none',
                  borderRight: showBorders && cb.right ? `${BORDER_W}px solid ${GLOW_COLOR}` : 'none',
                  boxShadow: isDragTarget && !showBorders ? `inset 0 0 8px ${GLOW_RGBA}` : 'none',
                }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Win screen */}
      {solved && (
        <div style={{
          marginTop: 24, padding: 24, borderRadius: 12,
          background: 'rgba(255,224,0,0.06)', border: `1px solid rgba(255,224,0,0.3)`,
          textAlign: 'center', width: '100%', maxWidth: 400,
        }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
          <h3 style={{ fontFamily: fonts.heading, color: GLOW_COLOR, marginBottom: 8 }}>
            Congratulations!
          </h3>
          <p style={{ color: colors.text, fontSize: 13, marginBottom: 16 }}>
            You unlocked a Matrix Clue:
          </p>
          <div style={{
            padding: 16, borderRadius: 10,
            background: 'rgba(108,182,255,0.1)', border: '1px solid rgba(108,182,255,0.2)',
          }}>
            <div style={{ fontFamily: fonts.mono, fontSize: 11, color: colors.textSubtle, marginBottom: 4 }}>
              MATRIX CLUE
            </div>
            <div style={{ fontFamily: fonts.mono, fontSize: 20, fontWeight: 700, color: colors.blue }}>
              {matrixClue || MATRIX_CLUE}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
