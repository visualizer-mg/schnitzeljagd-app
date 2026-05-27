import React, { useRef, useEffect, useState, useCallback } from 'react';
import { colors, fonts } from '../theme';

// ─── Base strokes that form the puzzle image (parts of T, A, X, i) ───
// These are the strokes the player sees BEFORE drawing.
// Canvas is 350x400 logical pixels.
const BASE_STROKES = [
  // Stroke 1: "7" shape — top bar of T flowing into left leg of A
  { points: [{ x: 55, y: 135 }, { x: 205, y: 135 }, { x: 115, y: 340 }], width: 7 },
  // Stroke 2: "V" shape — right leg of A + first diagonal of X
  { points: [{ x: 195, y: 145 }, { x: 255, y: 340 }, { x: 305, y: 145 }], width: 7 },
  // Stroke 3: "i" — vertical stem
  { points: [{ x: 330, y: 160 }, { x: 330, y: 340 }], width: 6 },
];
// The dot on the i
const I_DOT = { x: 330, y: 130, radius: 5 };

const MAX_STROKES = 3;
const ANSWER = 'taxi';

export default function TaxiDrawGame({ matrixClue, onWin, onBack }) {
  const canvasRef = useRef(null);
  const [strokes, setStrokes] = useState([]);       // completed user strokes
  const [currentStroke, setCurrentStroke] = useState(null); // stroke being drawn
  const [phase, setPhase] = useState('intro');       // intro → drawing → guessing → won
  const [guess, setGuess] = useState('');
  const [error, setError] = useState('');
  const [winSaved, setWinSaved] = useState(false);
  const containerRef = useRef(null);

  // ─── Canvas dimensions (responsive) ───
  const getCanvasSize = useCallback(() => {
    const maxW = Math.min(380, window.innerWidth - 32);
    const scale = maxW / 350;
    return { w: Math.round(350 * scale), h: Math.round(400 * scale), scale };
  }, []);

  const [canvasSize, setCanvasSize] = useState(getCanvasSize);

  useEffect(() => {
    const onResize = () => setCanvasSize(getCanvasSize());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [getCanvasSize]);

  // ─── Draw everything ───
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { w, h, scale } = canvasSize;
    canvas.width = w * 2;  // retina
    canvas.height = h * 2;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.scale(2, 2);

    // Background
    ctx.fillStyle = '#f5f0e8';
    ctx.fillRect(0, 0, w, h);

    // Light grid texture
    ctx.strokeStyle = 'rgba(0,0,0,0.04)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < w; i += 20 * scale) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke();
    }
    for (let i = 0; i < h; i += 20 * scale) {
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(w, i); ctx.stroke();
    }

    // Draw base strokes
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1a1a1a';
    BASE_STROKES.forEach(s => {
      ctx.lineWidth = s.width * scale;
      ctx.beginPath();
      s.points.forEach((p, i) => {
        const px = p.x * scale, py = p.y * scale;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      });
      ctx.stroke();
    });

    // Dot on i
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(I_DOT.x * scale, I_DOT.y * scale, I_DOT.radius * scale, 0, Math.PI * 2);
    ctx.fill();

    // Draw user strokes
    const allStrokes = currentStroke ? [...strokes, { points: currentStroke }] : strokes;
    allStrokes.forEach(s => {
      if (s.points.length < 2) return;
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 7 * scale;
      ctx.beginPath();
      s.points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
    });

    // Stroke counter
    const remaining = MAX_STROKES - strokes.length;
    if (phase === 'drawing' && remaining > 0) {
      ctx.font = `bold ${12 * scale}px ${fonts.mono}`;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.textAlign = 'right';
      ctx.fillText(`${remaining} Strich${remaining === 1 ? '' : 'e'} übrig`, w - 10 * scale, h - 10 * scale);
    }
  }, [canvasSize, strokes, currentStroke, phase]);

  useEffect(() => { draw(); }, [draw]);

  // ─── Touch/Mouse drawing handlers ───
  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvasSize.w / rect.width;
    const scaleY = canvasSize.h / rect.height;
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleStart = (e) => {
    if (phase !== 'drawing' || strokes.length >= MAX_STROKES) return;
    e.preventDefault();
    const pos = getPos(e);
    setCurrentStroke([pos]);
  };

  const handleMove = (e) => {
    if (!currentStroke) return;
    e.preventDefault();
    const pos = getPos(e);
    setCurrentStroke(prev => [...prev, pos]);
  };

  const handleEnd = (e) => {
    if (!currentStroke || currentStroke.length < 2) {
      setCurrentStroke(null);
      return;
    }
    e?.preventDefault();
    const newStrokes = [...strokes, { points: currentStroke }];
    setStrokes(newStrokes);
    setCurrentStroke(null);

    // Auto-transition to guessing after 3 strokes
    if (newStrokes.length >= MAX_STROKES) {
      setTimeout(() => setPhase('guessing'), 600);
    }
  };

  const handleUndo = () => {
    if (strokes.length > 0) {
      setStrokes(prev => prev.slice(0, -1));
      if (phase === 'guessing') setPhase('drawing');
      setError('');
    }
  };

  const handleGuess = () => {
    const cleaned = guess.trim().toLowerCase();
    if (cleaned === ANSWER) {
      setPhase('won');
      if (onWin && !winSaved) {
        onWin(matrixClue);
        setWinSaved(true);
      }
    } else if (cleaned.length === 0) {
      setError('Gib ein Wort ein!');
    } else if (cleaned === 'auto' || cleaned === 'car' || cleaned === 'wagen') {
      setError('Fast! Aber welches Auto genau? 🚗');
    } else if (cleaned === 'tax') {
      setError('Noch ein Buchstabe... 👀');
    } else {
      setError('❌ Nope! Schau nochmal genau hin...');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleGuess();
  };

  // ─── Styles ───
  const overlay = (children) => (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'rgba(13, 17, 23, 0.92)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 24, zIndex: 10,
    }}>
      {children}
    </div>
  );

  return (
    <div ref={containerRef} style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100%', padding: 16,
      fontFamily: fonts.mono, color: colors.text, position: 'relative',
    }}>

      {/* ─── Intro Screen ─── */}
      {phase === 'intro' && overlay(
        <>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✏️</div>
          <div style={{
            fontSize: 'clamp(16px, 5vw, 22px)', color: colors.blue,
            fontWeight: 'bold', letterSpacing: 2, marginBottom: 16,
            textAlign: 'center',
          }}>
            3-STRICHE-RÄTSEL
          </div>
          <div style={{
            fontSize: 'clamp(12px, 3.5vw, 14px)', color: colors.textMuted,
            textAlign: 'center', lineHeight: 1.8, maxWidth: 320, marginBottom: 24,
          }}>
            Du siehst eine Zeichnung.<br />
            <span style={{ color: colors.yellow }}>Kannst du mit nur 3 Strichen<br />daraus ein Auto malen?</span><br /><br />
            <span style={{ color: colors.textSubtle, fontSize: 'clamp(11px, 3vw, 12px)' }}>
              Zeichne mit dem Finger oder der Maus.
            </span>
          </div>
          <button
            onClick={() => setPhase('drawing')}
            style={{
              fontFamily: fonts.mono, fontSize: 16, fontWeight: 'bold',
              color: '#fff', background: colors.blue,
              border: 'none', borderRadius: 8,
              padding: '14px 40px', cursor: 'pointer', letterSpacing: 1,
              minHeight: 48,
            }}
          >
            ✏️ ZEICHNEN
          </button>
        </>
      )}

      {/* ─── Drawing Canvas ─── */}
      {phase !== 'intro' && (
        <>
          {/* Header */}
          <div style={{
            fontSize: 'clamp(13px, 4vw, 16px)', color: colors.blue,
            fontWeight: 'bold', marginBottom: 10, letterSpacing: 1,
            textAlign: 'center',
          }}>
            {phase === 'drawing' && '✏️ Zeichne 3 Striche — mach ein Auto draus!'}
            {phase === 'guessing' && '🤔 Was steht da jetzt?'}
            {phase === 'won' && '🎉 Richtig!'}
          </div>

          {/* Canvas */}
          <canvas
            ref={canvasRef}
            style={{
              borderRadius: 12,
              border: `2px solid ${phase === 'won' ? colors.green : colors.border}`,
              touchAction: 'none',
              cursor: phase === 'drawing' && strokes.length < MAX_STROKES ? 'crosshair' : 'default',
              maxWidth: '100%',
            }}
            onMouseDown={handleStart}
            onMouseMove={handleMove}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={handleStart}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
          />

          {/* Controls below canvas */}
          <div style={{
            display: 'flex', gap: 10, marginTop: 12,
            alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center',
          }}>
            {phase === 'drawing' && strokes.length > 0 && (
              <button onClick={handleUndo} style={{
                fontFamily: fonts.mono, fontSize: 13, color: colors.text,
                background: colors.bgSecondary, border: `1px solid ${colors.border}`,
                borderRadius: 6, padding: '8px 16px', cursor: 'pointer', minHeight: 40,
              }}>
                ↩ Rückgängig
              </button>
            )}
            {phase === 'drawing' && strokes.length >= MAX_STROKES && (
              <button onClick={() => setPhase('guessing')} style={{
                fontFamily: fonts.mono, fontSize: 13, fontWeight: 'bold',
                color: '#fff', background: colors.blue,
                border: 'none', borderRadius: 6, padding: '8px 20px',
                cursor: 'pointer', minHeight: 40,
              }}>
                ✓ Fertig — Was ist es?
              </button>
            )}
          </div>

          {/* ─── Guessing Phase ─── */}
          {phase === 'guessing' && (
            <div style={{
              marginTop: 16, display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 10, width: '100%', maxWidth: 320,
            }}>
              <input
                type="text"
                value={guess}
                onChange={(e) => { setGuess(e.target.value); setError(''); }}
                onKeyDown={handleKeyDown}
                placeholder="Welches Wort siehst du?"
                autoFocus
                autoComplete="off"
                autoCapitalize="off"
                style={{
                  fontFamily: fonts.mono, fontSize: 18, fontWeight: 'bold',
                  textAlign: 'center', width: '100%', padding: '12px 16px',
                  background: colors.bgSecondary, color: colors.text,
                  border: `2px solid ${error ? colors.red : colors.border}`,
                  borderRadius: 8, outline: 'none', letterSpacing: 3,
                }}
              />
              {error && (
                <div style={{
                  fontSize: 13, color: colors.red, textAlign: 'center',
                }}>
                  {error}
                </div>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={handleUndo} style={{
                  fontFamily: fonts.mono, fontSize: 13, color: colors.text,
                  background: colors.bgSecondary, border: `1px solid ${colors.border}`,
                  borderRadius: 6, padding: '8px 16px', cursor: 'pointer', minHeight: 40,
                }}>
                  ↩ Strich löschen
                </button>
                <button onClick={handleGuess} style={{
                  fontFamily: fonts.mono, fontSize: 13, fontWeight: 'bold',
                  color: '#fff', background: colors.blue,
                  border: 'none', borderRadius: 6, padding: '8px 20px',
                  cursor: 'pointer', minHeight: 40,
                }}>
                  Prüfen
                </button>
              </div>
            </div>
          )}

          {/* ─── Win Screen ─── */}
          {phase === 'won' && (
            <div style={{
              marginTop: 20, display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 12, width: '100%', maxWidth: 340,
            }}>
              <div style={{
                fontSize: 'clamp(18px, 5vw, 24px)', color: colors.green,
                fontWeight: 'bold', letterSpacing: 2,
              }}>
                🚕 TAXI! 🚕
              </div>
              <div style={{
                fontSize: 13, color: colors.textMuted, textAlign: 'center',
                lineHeight: 1.6,
              }}>
                Genau! Die Striche ergeben das Wort TAXI.
              </div>
              <div style={{
                background: 'rgba(46, 160, 67, 0.15)',
                border: `1px solid ${colors.green}`,
                borderRadius: 8, padding: '16px 24px',
                textAlign: 'center', width: '100%',
              }}>
                <div style={{
                  fontSize: 13, color: colors.textSecondary,
                  marginBottom: 10, lineHeight: 1.5,
                }}>
                  Du hast einen Matrix Clue freigeschaltet:
                </div>
                <div style={{
                  fontSize: 18, fontWeight: 'bold',
                  color: colors.yellow, letterSpacing: 1, whiteSpace: 'nowrap',
                }}>
                  {matrixClue || 'MATRIX CLUE'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                {onBack && (
                  <button onClick={onBack} style={{
                    fontFamily: fonts.mono, fontSize: 13, fontWeight: 'bold',
                    color: '#fff', background: colors.greenDark,
                    border: `1px solid ${colors.green}`, borderRadius: 6,
                    padding: '10px 24px', cursor: 'pointer', minHeight: 44,
                  }}>
                    ← Zurück
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
