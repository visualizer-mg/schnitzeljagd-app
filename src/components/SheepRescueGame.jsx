import React, { useState, useRef, useEffect, useCallback } from 'react';

// ═══════════════════════════════════════════════════════
// SHEEP RESCUE — Rowena
// Level 1: Finger-Trace Maze (find the lost sheep)
// Level 2: TBD
// Matrix-Clue C8: 8, 9, 5, 3, 6
// ═══════════════════════════════════════════════════════

// ── Maze Definition (1 = wall, 0 = path) ──
// 15x15 grid — entrance top-left, exit bottom-right
const MAZE = [
  [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [0,0,0,0,0,0,1,0,0,0,1,0,0,0,1],
  [1,1,1,1,1,0,1,0,1,0,1,0,1,0,1],
  [1,0,0,0,0,0,0,0,1,0,0,0,1,0,1],
  [1,0,1,1,1,1,1,1,1,1,1,1,1,0,1],
  [1,0,1,0,0,0,0,0,0,0,0,0,1,0,1],
  [1,0,1,0,1,1,1,1,1,1,1,0,1,0,1],
  [1,0,0,0,1,0,0,0,0,0,1,0,0,0,1],
  [1,1,1,0,1,0,1,1,1,0,1,1,1,1,1],
  [1,0,0,0,1,0,0,0,1,0,0,0,0,0,1],
  [1,0,1,1,1,1,1,0,1,1,1,1,1,0,1],
  [1,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,0,1,1,1,1,1,0,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
];

const ROWS = MAZE.length;
const COLS = MAZE[0].length;
const START = { r: 0, c: 0 };
const END = { r: ROWS - 1, c: COLS - 1 };

export default function SheepRescueGame({ matrixClue, onWin, onBack }) {
  const [phase, setPhase] = useState('start'); // 'start' | 'maze' | 'won'
  const canvasRef = useRef(null);
  const [cellSize, setCellSize] = useState(22);
  const [trail, setTrail] = useState([{ r: START.r, c: START.c }]);
  const [mazeComplete, setMazeComplete] = useState(false);
  const [failFlash, setFailFlash] = useState(false);
  const touchActive = useRef(false);

  // Calculate cell size based on screen width
  useEffect(() => {
    if (phase === 'maze') {
      const maxWidth = Math.min(window.innerWidth - 40, 400);
      setCellSize(Math.floor(maxWidth / COLS));
    }
  }, [phase]);

  // Draw maze
  const drawMaze = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const cs = cellSize;
    canvas.width = COLS * cs;
    canvas.height = ROWS * cs;

    // Background
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Walls
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (MAZE[r][c] === 1) {
          ctx.fillStyle = '#2d333b';
          ctx.fillRect(c * cs, r * cs, cs, cs);
          // Wall border
          ctx.strokeStyle = '#444c56';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(c * cs, r * cs, cs, cs);
        } else {
          // Path cell subtle grid
          ctx.strokeStyle = '#161b22';
          ctx.lineWidth = 0.3;
          ctx.strokeRect(c * cs, r * cs, cs, cs);
        }
      }
    }

    // Start marker
    ctx.fillStyle = '#3fb95040';
    ctx.fillRect(START.c * cs, START.r * cs, cs, cs);
    ctx.font = `${cs * 0.6}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('▶', START.c * cs + cs / 2, START.r * cs + cs / 2);

    // End marker (sheep!)
    ctx.fillStyle = '#ffa65730';
    ctx.fillRect(END.c * cs, END.r * cs, cs, cs);
    ctx.font = `${cs * 0.7}px sans-serif`;
    ctx.fillText('🐑', END.c * cs + cs / 2, END.r * cs + cs / 2);

    // Trail
    if (trail.length > 0) {
      ctx.strokeStyle = '#3fb950';
      ctx.lineWidth = cs * 0.35;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(trail[0].c * cs + cs / 2, trail[0].r * cs + cs / 2);
      for (let i = 1; i < trail.length; i++) {
        ctx.lineTo(trail[i].c * cs + cs / 2, trail[i].r * cs + cs / 2);
      }
      ctx.stroke();

      // Current position dot
      const last = trail[trail.length - 1];
      ctx.fillStyle = '#7ee787';
      ctx.beginPath();
      ctx.arc(last.c * cs + cs / 2, last.r * cs + cs / 2, cs * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [cellSize, trail]);

  useEffect(() => {
    if (phase === 'maze') drawMaze();
  }, [phase, drawMaze]);

  // Get grid cell from touch position
  const getCellFromTouch = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    const c = Math.floor(x / cellSize);
    const r = Math.floor(y / cellSize);
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null;
    return { r, c };
  };

  // Check if two cells are adjacent
  const isAdjacent = (a, b) => {
    return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;
  };

  // Handle touch/move
  const handleMove = (e) => {
    e.preventDefault();
    if (!touchActive.current || mazeComplete) return;
    const cell = getCellFromTouch(e);
    if (!cell) return;

    const last = trail[trail.length - 1];
    if (cell.r === last.r && cell.c === last.c) return; // Same cell

    // Check if backtracking (going back on trail)
    if (trail.length >= 2) {
      const prev = trail[trail.length - 2];
      if (cell.r === prev.r && cell.c === prev.c) {
        setTrail(t => t.slice(0, -1));
        return;
      }
    }

    if (!isAdjacent(last, cell)) return; // Must be adjacent

    // Hit a wall = reset
    if (MAZE[cell.r][cell.c] === 1) {
      setFailFlash(true);
      setTrail([{ r: START.r, c: START.c }]);
      setTimeout(() => setFailFlash(false), 300);
      return;
    }

    // Already visited (not backtracking) = ignore
    if (trail.some(t => t.r === cell.r && t.c === cell.c)) return;

    const newTrail = [...trail, cell];
    setTrail(newTrail);

    // Check win
    if (cell.r === END.r && cell.c === END.c) {
      setMazeComplete(true);
      touchActive.current = false;
      setTimeout(() => {
        setPhase('won');
        if (onWin) onWin();
      }, 800);
    }
  };

  const handleTouchStart = (e) => {
    e.preventDefault();
    if (mazeComplete) return;
    const cell = getCellFromTouch(e);
    if (!cell) return;
    // Must start from current trail end or from start
    const last = trail[trail.length - 1];
    if (cell.r === last.r && cell.c === last.c) {
      touchActive.current = true;
    } else if (cell.r === START.r && cell.c === START.c) {
      setTrail([{ r: START.r, c: START.c }]);
      touchActive.current = true;
    }
  };

  const handleTouchEnd = (e) => {
    e.preventDefault();
    touchActive.current = false;
  };

  const restart = () => {
    setTrail([{ r: START.r, c: START.c }]);
    setMazeComplete(false);
    touchActive.current = false;
  };

  // ═══ START SCREEN ═══
  if (phase === 'start') {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '80vh', padding: 24, textAlign: 'center',
      }}>
        <div style={{ fontSize: 64, marginBottom: 24 }}>🐑🚨</div>
        <div style={{
          fontSize: 24, fontWeight: 800, color: '#ffa657',
          letterSpacing: 2, marginBottom: 12, fontFamily: 'monospace',
        }}>
          OPERATION SHEEP RESCUE
        </div>
        <div style={{
          fontSize: 15, color: '#e6edf3', lineHeight: 1.8, maxWidth: 320, marginBottom: 8,
        }}>
          A sheep has gone missing and needs your help!
        </div>
        <div style={{
          fontSize: 14, color: '#8b949e', lineHeight: 1.7, maxWidth: 320, marginBottom: 32,
          fontStyle: 'italic',
        }}>
          Navigate through the maze to find and rescue the lost sheep. Use your finger to trace the path from start to finish!
        </div>
        {/* TODO: Video placeholder */}
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
          <button
            onClick={onBack}
            onTouchEnd={(e) => { e.stopPropagation(); onBack(); }}
            style={{
              marginTop: 16, padding: '8px 20px', background: 'transparent',
              color: '#8b949e', border: '1px solid #30363d', borderRadius: 8,
              fontSize: 13, cursor: 'pointer',
            }}
          >
            ← Back
          </button>
        )}
      </div>
    );
  }

  // ═══ MAZE LEVEL ═══
  if (phase === 'maze') {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '16px 12px', minHeight: '100%',
      }}>
        <div style={{
          fontSize: 16, fontWeight: 700, color: '#ffa657',
          marginBottom: 4, fontFamily: 'monospace', letterSpacing: 1,
        }}>
          🐑 FIND THE SHEEP!
        </div>
        <div style={{
          fontSize: 11, color: '#8b949e', marginBottom: 12,
          fontFamily: 'monospace',
        }}>
          Trace the path with your finger
        </div>

        <div style={{
          border: `2px solid ${failFlash ? '#f47067' : '#30363d'}`,
          borderRadius: 8, overflow: 'hidden',
          transition: 'border-color 0.2s',
          touchAction: 'none',
        }}>
          <canvas
            ref={canvasRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleTouchStart}
            onMouseMove={(e) => { if (touchActive.current) handleMove(e); }}
            onMouseUp={handleTouchEnd}
            style={{ display: 'block' }}
          />
        </div>

        <button
          onClick={restart}
          onTouchEnd={(e) => { e.stopPropagation(); restart(); }}
          style={{
            marginTop: 12, padding: '8px 20px', background: 'rgba(245, 158, 11, 0.1)',
            color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'monospace',
          }}
        >
          ↻ RESTART
        </button>

        {onBack && (
          <button
            onClick={onBack}
            onTouchEnd={(e) => { e.stopPropagation(); onBack(); }}
            style={{
              marginTop: 8, padding: '6px 16px', background: 'transparent',
              color: '#8b949e', border: '1px solid #30363d', borderRadius: 8,
              fontSize: 11, cursor: 'pointer',
            }}
          >
            ← Back
          </button>
        )}
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
        <div style={{ fontSize: 60, marginBottom: 16 }}>🐑🎉</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#7ee787', marginBottom: 12 }}>
          SHEEP RESCUED!
        </div>
        <div style={{ fontSize: 15, color: '#e6edf3', lineHeight: 1.8, marginBottom: 24 }}>
          You found the lost sheep!<br/>
          Well done, Rowena! 🏆
        </div>
        <div style={{ fontSize: 13, color: '#8b949e', marginBottom: 8 }}>
          You unlocked a Matrix Clue:
        </div>
        <div style={{
          padding: '16px 24px', background: 'rgba(108, 182, 255, 0.1)',
          border: '2px solid #6cb6ff', borderRadius: 12, marginBottom: 24,
        }}>
          <div style={{ fontSize: 10, color: '#8b949e', letterSpacing: 2, marginBottom: 4 }}>MATRIX CLUE</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#6cb6ff', letterSpacing: 2, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
            {matrixClue || 'C8: 8 - 9 - 5 - 3 - 6'}
          </div>
        </div>
        <button
          onClick={onBack}
          onTouchEnd={(e) => { e.stopPropagation(); if (onBack) onBack(); }}
          style={{
            padding: '14px 32px', background: 'linear-gradient(135deg, #6cb6ff, #4a9eff)',
            color: '#fff', border: 'none', borderRadius: 10, fontSize: 16,
            fontWeight: 700, cursor: 'pointer',
          }}
        >
          ← CONTINUE
        </button>
      </div>
    );
  }

  return null;
}
