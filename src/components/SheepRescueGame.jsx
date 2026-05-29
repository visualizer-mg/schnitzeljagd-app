import React, { useState, useEffect, useCallback, useRef } from 'react';

// ═══════════════════════════════════════════════════════
// SHEEP RESCUE — Rowena
// D-Pad controlled maze: sheep slides to next junction
// Matrix-Clue C8: 8, 9, 5, 3, 6
// ═══════════════════════════════════════════════════════

const MAZE_IMG = './assets/sheep/sheep.jpg';
const SHEEP_SFX = './assets/sheep/sheep.mp3';

function playSound(src, vol = 0.6) {
  try { const a = new Audio(src); a.volume = vol; a.play().catch(() => {}); } catch {}
}

// ── Maze grid: 0=path, 1=wall ──
// 31 wide x 31 tall — DFS generated, solution path = 79 steps
const MAZE = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,0,0,1],
  [1,0,1,0,1,1,1,1,1,0,1,1,1,1,1,0,1,1,1,1,1,0,1,0,1,0,1,0,1,0,1],
  [1,0,0,0,1,0,0,0,0,0,1,0,0,0,1,0,1,0,0,0,0,0,1,0,1,0,0,0,1,0,1],
  [1,1,1,1,1,0,1,1,1,1,1,0,1,0,1,1,1,0,1,1,1,1,1,0,1,0,1,1,1,0,1],
  [1,0,1,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,1,0,1,0,1,0,0,0,1],
  [1,0,1,0,1,1,1,0,1,0,1,1,1,1,1,1,1,1,1,0,1,1,1,0,1,1,1,0,1,0,1],
  [1,0,1,0,0,0,1,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,1,0,0,0,1,0,1],
  [1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,0,1,0,1,0,1,0,1,1,1,0,1,1,1,1,1],
  [1,0,0,0,1,0,0,0,1,0,1,0,0,0,1,0,1,0,1,0,1,0,1,0,0,0,0,0,0,0,1],
  [1,0,1,1,1,1,1,0,1,0,1,0,1,1,1,1,1,0,1,1,1,0,1,0,1,1,1,1,1,0,1],
  [1,0,0,0,0,0,1,0,1,0,1,0,0,0,0,0,1,0,0,0,1,0,1,0,1,0,0,0,1,0,1],
  [1,0,1,0,1,0,1,0,1,0,1,1,1,1,1,0,1,0,1,0,1,0,1,1,1,0,1,0,1,0,1],
  [1,0,1,0,1,0,1,0,1,0,1,0,0,0,1,0,1,0,1,0,0,0,0,0,0,0,1,0,0,0,1],
  [1,0,1,0,1,1,1,0,1,0,1,0,1,0,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1],
  [1,0,1,0,1,0,0,0,1,0,1,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,1],
  [1,0,1,0,1,0,1,1,1,1,1,0,1,0,1,0,1,1,1,1,1,1,1,1,1,0,1,0,1,0,1],
  [1,0,1,0,0,0,1,0,0,0,0,0,1,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1],
  [1,0,1,1,1,1,1,0,1,0,1,1,1,0,1,1,1,1,1,0,1,0,1,0,1,1,1,0,1,1,1],
  [1,0,0,0,1,0,0,0,1,0,1,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,1,0,1,0,1],
  [1,1,1,0,1,1,1,1,1,0,1,0,1,1,1,0,1,0,1,1,1,1,1,1,1,0,1,0,1,0,1],
  [1,0,1,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,0,1,0,1,0,1,0,1],
  [1,0,1,1,1,1,1,1,1,1,1,0,1,0,1,1,1,1,1,0,1,1,1,0,1,0,1,0,1,0,1],
  [1,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,1,0,0,0,0,0,1,0,0,0,1],
  [1,0,1,0,1,1,1,1,1,1,1,1,1,1,1,0,1,0,1,0,1,0,1,1,1,1,1,1,1,0,1],
  [1,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,1,0,1,0,1,0,1,0,0,0,1,0,0,0,1],
  [1,0,1,1,1,0,1,1,1,1,1,1,1,0,1,0,1,0,1,0,1,1,1,0,1,0,1,0,1,1,1],
  [1,0,1,0,1,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,1,0,1,0,1,0,1],
  [1,0,1,0,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,0,1,0,1,0,1],
  [1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

const ROWS = MAZE.length;
const COLS = MAZE[0].length;
const START = { r: 0, c: 15 };  // entrance top center
const EXIT = { r: 30, c: 15 };  // exit bottom center

export default function SheepRescueGame({ matrixClue, onWin, onBack }) {
  const [phase, setPhase] = useState('start');
  const [sheep, setSheep] = useState({ r: START.r, c: START.c });
  const [moving, setMoving] = useState(false);
  const [moveCount, setMoveCount] = useState(0);
  const [trail, setTrail] = useState([]);
  const animRef = useRef(null);

  // Calculate cell size
  const maxW = typeof window !== 'undefined' ? Math.min(window.innerWidth - 32, 400) : 350;
  const cellSize = Math.floor(maxW / COLS);
  const mazeW = cellSize * COLS;
  const mazeH = cellSize * ROWS;

  // Check if cell is a junction (3+ open neighbors) or dead end (1 open neighbor)
  const isJunction = useCallback((r, c) => {
    let openDirs = 0;
    if (r > 0 && MAZE[r-1][c] === 0) openDirs++;
    if (r < ROWS-1 && MAZE[r+1][c] === 0) openDirs++;
    if (c > 0 && MAZE[r][c-1] === 0) openDirs++;
    if (c < COLS-1 && MAZE[r][c+1] === 0) openDirs++;
    return openDirs >= 3 || openDirs === 1; // junction or dead end
  }, []);

  // Move sheep in a direction until junction/wall
  const moveSheep = useCallback((dr, dc) => {
    if (moving) return;

    let r = sheep.r;
    let c = sheep.c;
    let nr = r + dr;
    let nc = c + dc;

    // Can't move into wall
    if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || MAZE[nr][nc] === 1) return;

    setMoving(true);
    setMoveCount(prev => prev + 1);

    const newTrail = [...trail];
    const steps = [];

    // Slide until junction, dead end, or wall
    while (
      nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS &&
      MAZE[nr][nc] === 0
    ) {
      steps.push({ r: nr, c: nc });
      // Stop at junction or dead end
      if (isJunction(nr, nc)) break;
      // Check if we can continue in same direction
      const nnr = nr + dr;
      const nnc = nc + dc;
      if (nnr < 0 || nnr >= ROWS || nnc < 0 || nnc >= COLS || MAZE[nnr][nnc] === 1) break;
      nr = nnr;
      nc = nnc;
    }

    if (steps.length === 0) {
      setMoving(false);
      return;
    }

    // Animate step by step
    let i = 0;
    const animate = () => {
      if (i < steps.length) {
        const s = steps[i];
        setSheep(s);
        newTrail.push(s);
        i++;
        animRef.current = setTimeout(animate, 50);
      } else {
        setTrail(newTrail);
        setMoving(false);

        // Check win
        const final = steps[steps.length - 1];
        if (final.r === EXIT.r && final.c === EXIT.c) {
          setTimeout(() => {
            setPhase('won');
            if (onWin) onWin();
          }, 500);
        }
      }
    };
    animate();
  }, [sheep, moving, trail, isJunction, onWin]);

  // Cleanup animation on unmount
  useEffect(() => {
    return () => { if (animRef.current) clearTimeout(animRef.current); };
  }, []);

  // Play sheep sound on start
  useEffect(() => {
    if (phase !== 'start') return;
    const t = setTimeout(() => playSound(SHEEP_SFX, 0.7), 2000);
    return () => clearTimeout(t);
  }, [phase]);

  const restart = () => {
    setSheep({ r: START.r, c: START.c });
    setTrail([]);
    setMoveCount(0);
    setMoving(false);
    if (animRef.current) clearTimeout(animRef.current);
  };

  // D-Pad button style
  const dpadBtn = (emoji, dr, dc) => (
    <button
      onTouchStart={(e) => { e.preventDefault(); moveSheep(dr, dc); }}
      onClick={() => moveSheep(dr, dc)}
      style={{
        width: 56, height: 56, fontSize: 22,
        background: 'rgba(255, 166, 87, 0.15)',
        border: '2px solid rgba(255, 166, 87, 0.4)',
        borderRadius: 12, color: '#ffa657',
        cursor: 'pointer', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        userSelect: 'none', WebkitUserSelect: 'none',
      }}
    >
      {emoji}
    </button>
  );

  // ═══ START SCREEN ═══
  if (phase === 'start') {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '80vh', padding: 24, textAlign: 'center',
      }}>
        <div style={{ fontSize: 64, marginBottom: 24 }}>🐑🚨</div>
        <div style={{
          fontSize: 22, fontWeight: 800, color: '#ffa657',
          letterSpacing: 2, marginBottom: 16, fontFamily: 'monospace',
        }}>
          OPERATION SHEEP RESCUE
        </div>
        <div style={{
          fontSize: 15, color: '#e6edf3', lineHeight: 1.8, maxWidth: 320, marginBottom: 8,
        }}>
          A sheep has gone missing!<br/>We need to rescue it!
        </div>
        <div style={{
          fontSize: 13, color: '#8b949e', lineHeight: 1.7, maxWidth: 320, marginBottom: 32,
          padding: '12px 16px', background: 'rgba(255, 166, 87, 0.08)',
          border: '1px solid rgba(255, 166, 87, 0.2)', borderRadius: 10,
        }}>
          Guide the sheep through the maze using the arrow buttons.
          The sheep will slide until it reaches the next crossroad!
        </div>
        <button
          onClick={() => setPhase('maze')}
          onTouchEnd={(e) => { e.stopPropagation(); setPhase('maze'); }}
          style={{
            padding: '16px 40px',
            background: 'linear-gradient(135deg, #ffa657, #f78166)',
            color: '#fff', border: 'none', borderRadius: 12, fontSize: 18,
            fontWeight: 700, cursor: 'pointer', letterSpacing: 1,
          }}
        >
          🐑 LET'S GO!
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

  // ═══ MAZE LEVEL ═══
  if (phase === 'maze') {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '8px 8px', minHeight: '100%',
      }}>
        <div style={{
          fontSize: 13, fontWeight: 700, color: '#ffa657',
          marginBottom: 2, fontFamily: 'monospace',
        }}>
          🐑 FIND THE EXIT!
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <span style={{ fontSize: 10, color: '#8b949e', fontFamily: 'monospace' }}>
            Moves: {moveCount}
          </span>
          <button onClick={restart}
            onTouchEnd={(e) => { e.stopPropagation(); restart(); }}
            style={{
              padding: '4px 12px', background: 'rgba(245, 158, 11, 0.1)',
              color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: 6, fontSize: 10, cursor: 'pointer', fontFamily: 'monospace',
            }}>↻ RESET</button>
        </div>

        {/* Maze grid */}
        <div style={{
          width: mazeW, height: mazeH,
          position: 'relative',
          border: '2px solid #30363d',
          borderRadius: 4,
          overflow: 'hidden',
          background: '#0d1117',
        }}>
          {/* Render cells */}
          {MAZE.map((row, r) => row.map((cell, c) => {
            const isPath = cell === 0;
            const isExit = r === EXIT.r && c === EXIT.c;
            const isSheep = r === sheep.r && c === sheep.c;
            return (
              <div key={`${r}-${c}`} style={{
                position: 'absolute',
                left: c * cellSize,
                top: r * cellSize,
                width: cellSize,
                height: cellSize,
                background: isPath ? 'rgba(255, 255, 255, 0.95)' : '#1a1a2e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: cellSize * 0.7,
                boxSizing: 'border-box',
                border: isPath ? '0.5px solid rgba(0,0,0,0.05)' : 'none',
                transition: isSheep ? 'none' : undefined,
              }}>
                {isSheep && (
                  <img src="./assets/sheep/blacksheep.jpg" alt="sheep" style={{
                    width: cellSize * 1.4, height: cellSize * 1.4,
                    objectFit: 'contain', position: 'absolute',
                    zIndex: 10, pointerEvents: 'none',
                    borderRadius: '50%',
                  }} />
                )}
                {isExit && !isSheep && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'absolute', zIndex: 5 }}>
                    <span style={{ fontSize: cellSize * 0.5, opacity: 0.6 }}>🏁</span>
                    <span style={{ fontSize: Math.max(6, cellSize * 0.3), color: '#f47067', fontWeight: 800, fontFamily: 'monospace', lineHeight: 1 }}>EXIT</span>
                  </div>
                )}
              </div>
            );
          }))}
        </div>

        {/* D-Pad */}
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div>{dpadBtn('⬆️', -1, 0)}</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {dpadBtn('⬅️', 0, -1)}
            <div style={{ width: 56, height: 56 }} />
            {dpadBtn('➡️', 0, 1)}
          </div>
          <div>{dpadBtn('⬇️', 1, 0)}</div>
        </div>

      </div>
    );
  }

  // ═══ WIN SCREEN ═══
  if (phase === 'won') {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '80vh', padding: 24, textAlign: 'center',
      }}>
        <div style={{ fontSize: 60, marginBottom: 24 }}>🐑✅</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#ffa657', marginBottom: 12, fontFamily: 'monospace', letterSpacing: 1 }}>
          OPERATION SHEEP RESCUE
        </div>
        <div style={{ fontSize: 15, color: '#7ee787', lineHeight: 1.8, marginBottom: 16, fontWeight: 600 }}>
          You mastered the first step!<br/>You are getting closer.
        </div>
        <div style={{
          padding: '16px 20px', background: 'rgba(255, 166, 87, 0.08)',
          border: '2px solid rgba(255, 166, 87, 0.3)', borderRadius: 12, marginBottom: 24,
          maxWidth: 320,
        }}>
          <div style={{ fontSize: 10, color: '#ffa657', letterSpacing: 2, marginBottom: 8 }}>🔍 NEXT CLUE</div>
          <div style={{ fontSize: 14, color: '#e6edf3', lineHeight: 1.7 }}>
            Maybe have a look at the <strong style={{ color: '#ffa657' }}>copper scales</strong> in the entrance area of the house...
          </div>
        </div>
        <button onClick={onBack}
          onTouchEnd={(e) => { e.stopPropagation(); if (onBack) onBack(); }}
          style={{
            padding: '14px 32px', background: 'linear-gradient(135deg, #6cb6ff, #4a9eff)',
            color: '#fff', border: 'none', borderRadius: 10, fontSize: 16,
            fontWeight: 700, cursor: 'pointer',
          }}>← CONTINUE</button>
      </div>
    );
  }

  return null;
}
