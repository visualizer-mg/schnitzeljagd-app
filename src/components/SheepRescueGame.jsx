import React, { useState, useRef, useEffect, useCallback } from 'react';

// ═══════════════════════════════════════════════════════
// SHEEP RESCUE — Rowena
// Draw-on-maze: sheep.jpg as background, finger-trace path
// Must pass through 7 checkpoints in order to win
// Matrix-Clue C8: 8, 9, 5, 3, 6
// ═══════════════════════════════════════════════════════

const MAZE_IMG = './assets/sheep/sheep.jpg';
const SHEEP_SFX = './assets/sheep/sheep.mp3';

// Checkpoints as % of maze image dimensions (from Lösung2.jpg)
// Must be hit in order: 1→2→3→4→5→6→7
const CHECKPOINTS = [
  { id: 1, x: 52, y: 11, label: '1' },
  { id: 2, x: 22, y: 11, label: '2' },
  { id: 3, x: 12, y: 17, label: '3' },
  { id: 4, x: 8,  y: 34, label: '4' },
  { id: 5, x: 8,  y: 67, label: '5' },
  { id: 6, x: 12, y: 90, label: '6' },
  { id: 7, x: 58, y: 92, label: '7' },
];

const HIT_RADIUS = 8; // % of image width — how close you need to get

function playSound(src, volume = 0.6) {
  try {
    const a = new Audio(src);
    a.volume = volume;
    a.play().catch(() => {});
  } catch {}
}

export default function SheepRescueGame({ matrixClue, onWin, onBack }) {
  const [phase, setPhase] = useState('start'); // 'start' | 'maze' | 'won'
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [canvasW, setCanvasW] = useState(350);
  const [canvasH, setCanvasH] = useState(420);
  const [strokes, setStrokes] = useState([]);
  const [currentStroke, setCurrentStroke] = useState(null);
  const [hitCheckpoints, setHitCheckpoints] = useState([]);
  const [lastHitFlash, setLastHitFlash] = useState(null);
  const [solved, setSolved] = useState(false);

  // Load image and set canvas size
  useEffect(() => {
    if (phase !== 'maze') return;
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      // Fit to screen width
      const maxW = Math.min(window.innerWidth - 24, 420);
      const ratio = img.height / img.width;
      const w = maxW;
      const h = Math.round(w * ratio);
      setCanvasW(w);
      setCanvasH(h);
      setImgLoaded(true);
    };
    img.src = MAZE_IMG;
  }, [phase]);

  // Draw
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');

    // HiDPI
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasW * dpr;
    canvas.height = canvasH * dpr;
    canvas.style.width = canvasW + 'px';
    canvas.style.height = canvasH + 'px';
    ctx.scale(dpr, dpr);

    // Draw maze image
    ctx.drawImage(img, 0, 0, canvasW, canvasH);

    // Draw checkpoint zones (subtle)
    CHECKPOINTS.forEach((cp, i) => {
      const cx = (cp.x / 100) * canvasW;
      const cy = (cp.y / 100) * canvasH;
      const r = (HIT_RADIUS / 100) * canvasW;
      const isHit = hitCheckpoints.includes(cp.id);
      const isNext = !isHit && hitCheckpoints.length === i;

      if (isHit) {
        ctx.fillStyle = 'rgba(63, 185, 80, 0.25)';
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#3fb950';
        ctx.font = `bold ${Math.round(canvasW * 0.035)}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✓', cx, cy);
      } else if (isNext) {
        // Pulsing next checkpoint
        ctx.strokeStyle = 'rgba(255, 166, 87, 0.6)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(255, 166, 87, 0.8)';
        ctx.font = `bold ${Math.round(canvasW * 0.03)}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(cp.label, cx, cy);
      }
    });

    // Draw all strokes
    const allStrokes = currentStroke ? [...strokes, currentStroke] : strokes;
    allStrokes.forEach(stroke => {
      if (stroke.length < 2) return;
      ctx.strokeStyle = 'rgba(255, 80, 80, 0.7)';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i].x, stroke[i].y);
      }
      ctx.stroke();
    });
  }, [canvasW, canvasH, strokes, currentStroke, hitCheckpoints, imgLoaded]);

  useEffect(() => {
    if (phase === 'maze' && imgLoaded) draw();
  }, [phase, imgLoaded, draw]);

  // Get position from touch/mouse event
  const getPos = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    return {
      x: ((touch.clientX - rect.left) / rect.width) * canvasW,
      y: ((touch.clientY - rect.top) / rect.height) * canvasH,
    };
  };

  // Check if point hits a checkpoint
  const checkCheckpointHit = useCallback((pos) => {
    if (solved) return;
    const nextIdx = hitCheckpoints.length;
    if (nextIdx >= CHECKPOINTS.length) return;

    const cp = CHECKPOINTS[nextIdx];
    const cx = (cp.x / 100) * canvasW;
    const cy = (cp.y / 100) * canvasH;
    const r = (HIT_RADIUS / 100) * canvasW;

    const dist = Math.sqrt((pos.x - cx) ** 2 + (pos.y - cy) ** 2);
    if (dist <= r) {
      const newHits = [...hitCheckpoints, cp.id];
      setHitCheckpoints(newHits);
      setLastHitFlash(cp.id);
      setTimeout(() => setLastHitFlash(null), 500);

      // All checkpoints hit?
      if (newHits.length === CHECKPOINTS.length) {
        setSolved(true);
        setTimeout(() => {
          setPhase('won');
          if (onWin) onWin();
        }, 1000);
      }
    }
  }, [hitCheckpoints, canvasW, canvasH, solved, onWin]);

  const handleStart = (e) => {
    if (solved) return;
    e.preventDefault();
    const pos = getPos(e);
    if (pos) setCurrentStroke([pos]);
  };

  const handleMove = (e) => {
    if (!currentStroke || solved) return;
    e.preventDefault();
    const pos = getPos(e);
    if (pos) {
      setCurrentStroke(prev => [...prev, pos]);
      checkCheckpointHit(pos);
    }
  };

  const handleEnd = (e) => {
    if (!currentStroke) return;
    e?.preventDefault();
    if (currentStroke.length >= 2) {
      setStrokes(prev => [...prev, currentStroke]);
    }
    setCurrentStroke(null);
  };

  const restart = () => {
    setStrokes([]);
    setCurrentStroke(null);
    setHitCheckpoints([]);
    setSolved(false);
  };

  // Play sheep sound on start screen after 2 seconds
  useEffect(() => {
    if (phase !== 'start') return;
    const timer = setTimeout(() => playSound(SHEEP_SFX, 0.7), 2000);
    return () => clearTimeout(timer);
  }, [phase]);

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
          letterSpacing: 2, marginBottom: 16, fontFamily: 'monospace',
        }}>
          OPERATION SHEEP RESCUE
        </div>
        <div style={{
          fontSize: 16, color: '#e6edf3', lineHeight: 1.8, maxWidth: 320, marginBottom: 8,
        }}>
          A sheep has gone missing!<br/>
          We need to rescue it!
        </div>
        <div style={{
          fontSize: 13, color: '#8b949e', lineHeight: 1.7, maxWidth: 320, marginBottom: 32,
          padding: '12px 16px', background: 'rgba(255, 166, 87, 0.08)',
          border: '1px solid rgba(255, 166, 87, 0.2)', borderRadius: 10,
        }}>
          Navigate through the maze by drawing a path with your finger.
          Pass through all checkpoints to rescue the sheep!
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
            onTouchEnd={(e) => { e.stopPropagation(); if (onBack) onBack(); }}
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
        padding: '8px 8px', minHeight: '100%',
      }}>
        <div style={{
          fontSize: 14, fontWeight: 700, color: '#ffa657',
          marginBottom: 2, fontFamily: 'monospace', letterSpacing: 1,
        }}>
          🐑 RESCUE THE SHEEP!
        </div>
        <div style={{
          fontSize: 10, color: '#8b949e', marginBottom: 6,
          fontFamily: 'monospace',
        }}>
          Draw through all {CHECKPOINTS.length} checkpoints
        </div>

        {/* Checkpoint progress */}
        <div style={{
          display: 'flex', gap: 4, marginBottom: 8,
        }}>
          {CHECKPOINTS.map((cp, i) => (
            <div key={cp.id} style={{
              width: 24, height: 24, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, fontFamily: 'monospace',
              background: hitCheckpoints.includes(cp.id) ? '#3fb950' :
                          hitCheckpoints.length === i ? '#ffa657' : '#30363d',
              color: hitCheckpoints.includes(cp.id) || hitCheckpoints.length === i ? '#fff' : '#8b949e',
              transition: 'all 0.3s',
              transform: lastHitFlash === cp.id ? 'scale(1.3)' : 'scale(1)',
            }}>
              {hitCheckpoints.includes(cp.id) ? '✓' : cp.label}
            </div>
          ))}
        </div>

        {/* Canvas */}
        <div style={{
          border: `2px solid ${solved ? '#3fb950' : '#30363d'}`,
          borderRadius: 6, overflow: 'hidden',
          transition: 'border-color 0.3s',
        }}>
          {imgLoaded ? (
            <canvas
              ref={canvasRef}
              onTouchStart={handleStart}
              onTouchMove={handleMove}
              onTouchEnd={handleEnd}
              onMouseDown={handleStart}
              onMouseMove={(e) => { if (currentStroke) handleMove(e); }}
              onMouseUp={handleEnd}
              style={{ display: 'block', touchAction: 'none' }}
            />
          ) : (
            <div style={{
              width: canvasW, height: canvasH,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#8b949e', fontSize: 13,
            }}>
              Loading maze...
            </div>
          )}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button
            onClick={restart}
            onTouchEnd={(e) => { e.stopPropagation(); restart(); }}
            style={{
              padding: '8px 20px', background: 'rgba(245, 158, 11, 0.1)',
              color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'monospace',
            }}
          >
            ↻ RESET
          </button>
          {onBack && (
            <button
              onClick={onBack}
              onTouchEnd={(e) => { e.stopPropagation(); if (onBack) onBack(); }}
              style={{
                padding: '8px 20px', background: 'transparent',
                color: '#8b949e', border: '1px solid #30363d', borderRadius: 8,
                fontSize: 12, cursor: 'pointer',
              }}
            >
              ← Back
            </button>
          )}
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
        <div style={{ fontSize: 60, marginBottom: 24 }}>🐑🎉🏆</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#7ee787', marginBottom: 12 }}>
          SHEEP RESCUED!
        </div>
        <div style={{ fontSize: 15, color: '#e6edf3', lineHeight: 1.8, marginBottom: 24 }}>
          You found the lost sheep!<br/>
          Well done, Rowena!
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
