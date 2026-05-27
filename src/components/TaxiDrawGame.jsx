import React, { useRef, useEffect, useState, useCallback } from 'react';
import { colors, fonts } from '../theme';

// ─── Base strokes (parts of T, A, X, i) — centered with good padding ───
// Canvas logical size: 350 x 400
const BASE_STROKES = [
  // "7" shape — top bar of T + left leg of A (shifted left so bottom aligns with A's right leg)
  { points: [{ x: 35, y: 140 }, { x: 155, y: 140 }, { x: 85, y: 320 }], width: 7 },
  // "V" shape — right leg of A + first diagonal of X
  { points: [{ x: 155, y: 145 }, { x: 210, y: 320 }, { x: 265, y: 145 }], width: 7 },
  // "i" stem (same width as other strokes, no dot)
  { points: [{ x: 290, y: 140 }, { x: 290, y: 320 }], width: 7 },
];

const MAX_STROKES = 3;
const SFX_ERROR = '/assets/error-buzz.mp3';
const SFX_WIN = '/assets/chest-open.wav';
const MUSIC_INTRO = './assets/taxi-sounds/intro.wav';
const MUSIC_DRAW = './assets/taxi-sounds/jeo.mp3';

// ─── Validation zones for the 3 missing strokes ───
// Zone T: vertical stem (left area, x ~80-140, tall)
// Zone A: horizontal crossbar (middle, y ~210-270)
// Zone X: diagonal crossing the V (right area, x ~160-280)

function analyzeStroke(points) {
  if (points.length < 3) return null;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  let sumX = 0, sumY = 0;
  points.forEach(p => {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
    sumX += p.x; sumY += p.y;
  });
  const w = maxX - minX;
  const h = maxY - minY;
  const cx = sumX / points.length;
  const cy = sumY / points.length;
  return { minX, maxX, minY, maxY, w, h, cx, cy };
}

function matchZone(info, scale) {
  if (!info) return null;
  // Scale-adjusted thresholds
  const s = scale;
  const minLen = 50 * s;

  // Zone T: vertical stroke in left area
  if (info.h > minLen && info.h > info.w * 1.5 && info.cx < 140 * s && info.cx > 40 * s) {
    return 'T';
  }
  // Zone A: horizontal stroke in middle area
  if (info.w > minLen * 0.6 && info.w > info.h * 1.3 && info.cy > 190 * s && info.cy < 290 * s && info.cx > 70 * s && info.cx < 210 * s) {
    return 'A';
  }
  // Zone X: diagonal stroke in right area
  if (info.w > minLen * 0.5 && info.h > minLen * 0.5 && info.cx > 150 * s && info.cx < 290 * s) {
    // Check it's actually diagonal (not too horizontal or vertical)
    const ratio = Math.min(info.w, info.h) / Math.max(info.w, info.h);
    if (ratio > 0.25) return 'X';
  }
  return null;
}

function validateStrokes(strokes, scale) {
  const matched = new Set();
  strokes.forEach(s => {
    const info = analyzeStroke(s.points);
    const zone = matchZone(info, scale);
    if (zone) matched.add(zone);
  });
  return matched.has('T') && matched.has('A') && matched.has('X');
}

export default function TaxiDrawGame({ matrixClue, onWin, onBack }) {
  const canvasRef = useRef(null);
  const [strokes, setStrokes] = useState([]);
  const [currentStroke, setCurrentStroke] = useState(null);
  const [phase, setPhase] = useState('intro'); // intro → drawing → won
  const [feedback, setFeedback] = useState(null); // { type: 'error', msg: '...' }
  const [winSaved, setWinSaved] = useState(false);
  const errorAudioRef = useRef(null);
  const musicRef = useRef(null);

  // ─── Music controls ───
  const playMusic = (src) => {
    try {
      if (musicRef.current) { musicRef.current.pause(); musicRef.current = null; }
      const music = new Audio(src);
      music.loop = true;
      music.volume = 0.4;
      music.play().catch(() => {});
      musicRef.current = music;
    } catch (e) {}
  };

  const stopMusic = () => {
    if (musicRef.current) { musicRef.current.pause(); musicRef.current = null; }
  };

  // Start intro music on mount
  useEffect(() => {
    playMusic(MUSIC_INTRO);
    return () => stopMusic();
  }, []);

  // ─── Canvas dimensions (responsive) ───
  const getCanvasSize = useCallback(() => {
    const maxW = Math.min(340, window.innerWidth - 48);
    const scale = maxW / 350;
    return { w: Math.round(350 * scale), h: Math.round(400 * scale), scale };
  }, []);

  const [canvasSize, setCanvasSize] = useState(getCanvasSize);

  useEffect(() => {
    const onResize = () => setCanvasSize(getCanvasSize());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [getCanvasSize]);

  // ─── Play error sound ───
  const playError = () => {
    try {
      if (!errorAudioRef.current) {
        errorAudioRef.current = new Audio(SFX_ERROR);
      }
      errorAudioRef.current.currentTime = 0;
      errorAudioRef.current.play().catch(() => {});
    } catch (e) {}
  };

  // ─── Draw everything ───
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { w, h, scale } = canvasSize;
    canvas.width = w * 2;
    canvas.height = h * 2;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.scale(2, 2);

    // Background — warm paper
    ctx.fillStyle = '#f5f0e8';
    ctx.fillRect(0, 0, w, h);

    // Subtle paper texture lines
    ctx.strokeStyle = 'rgba(0,0,0,0.03)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < w; i += 25 * scale) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke();
    }
    for (let i = 0; i < h; i += 25 * scale) {
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

    // Draw user strokes (red if error feedback active, else black)
    const strokeColor = feedback?.type === 'error' ? '#ff3333' : '#1a1a1a';
    const allStrokes = currentStroke ? [...strokes, { points: currentStroke }] : strokes;
    allStrokes.forEach(s => {
      if (s.points.length < 2) return;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 7 * scale;
      ctx.beginPath();
      s.points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
    });

    // Stroke counter (bottom right, subtle)
    if (phase === 'drawing' && !feedback) {
      const remaining = MAX_STROKES - strokes.length;
      if (remaining > 0) {
        ctx.font = `bold ${11 * scale}px ${fonts.mono}`;
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`${remaining} Strich${remaining === 1 ? '' : 'e'} übrig`, w - 12 * scale, h - 8 * scale);
      }
    }
  }, [canvasSize, strokes, currentStroke, phase, feedback]);

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
    if (phase !== 'drawing' || strokes.length >= MAX_STROKES || feedback) return;
    e.preventDefault();
    setCurrentStroke([getPos(e)]);
  };

  const handleMove = (e) => {
    if (!currentStroke) return;
    e.preventDefault();
    setCurrentStroke(prev => [...prev, getPos(e)]);
  };

  const handleEnd = (e) => {
    if (!currentStroke || currentStroke.length < 3) {
      setCurrentStroke(null);
      return;
    }
    e?.preventDefault();
    const newStrokes = [...strokes, { points: currentStroke }];
    setStrokes(newStrokes);
    setCurrentStroke(null);

    // After 3 strokes → validate
    if (newStrokes.length >= MAX_STROKES) {
      setTimeout(() => {
        const correct = validateStrokes(newStrokes, canvasSize.scale);
        if (correct) {
          setPhase('won');
          // Play win sound
          try { new Audio(SFX_WIN).play().catch(() => {}); } catch (e) {}
          if (onWin && !winSaved) {
            onWin(matrixClue);
            setWinSaved(true);
          }
        } else {
          // Wrong! Error sound + red flash + clear strokes
          playError();
          setFeedback({ type: 'error', msg: 'Sieht das für dich wie ein Auto aus? 🤔' });
          setTimeout(() => {
            setStrokes([]);
            setFeedback(null);
          }, 1800);
        }
      }, 400);
    }
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
    <div style={{
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
            fontWeight: 'bold', letterSpacing: 2, marginBottom: 20,
            textAlign: 'center',
          }}>
            3-STRICHE-RÄTSEL
          </div>
          <div style={{
            fontSize: 'clamp(12px, 3.5vw, 14px)', color: colors.textMuted,
            textAlign: 'center', lineHeight: 1.8, maxWidth: 320, marginBottom: 28,
          }}>
            Du siehst eine Zeichnung.<br /><br />
            <span style={{ color: colors.yellow, fontSize: 'clamp(14px, 4vw, 17px)', fontWeight: 'bold' }}>
              Male mit 3 Strichen ein Auto!
            </span><br /><br />
            <span style={{ color: colors.textSubtle, fontSize: 'clamp(11px, 3vw, 12px)' }}>
              Zeichne mit dem Finger oder der Maus.
            </span>
          </div>
          <button
            onClick={() => { setPhase('drawing'); playMusic(MUSIC_DRAW); }}
            style={{
              fontFamily: fonts.mono, fontSize: 16, fontWeight: 'bold',
              color: '#fff', background: colors.blue,
              border: 'none', borderRadius: 8,
              padding: '14px 40px', cursor: 'pointer', letterSpacing: 1,
              minHeight: 48,
            }}
          >
            ✏️ LOS GEHT'S
          </button>
        </>
      )}

      {/* ─── Drawing / Won Phase ─── */}
      {phase !== 'intro' && (
        <>
          {/* Header */}
          <div style={{
            fontSize: 'clamp(14px, 4.5vw, 18px)', color: phase === 'won' ? colors.green : colors.yellow,
            fontWeight: 'bold', marginBottom: 14, letterSpacing: 1,
            textAlign: 'center',
          }}>
            {phase === 'drawing' && '✏️ Male mit 3 Strichen ein Auto!'}
            {phase === 'won' && '🚕 Sehr gut! 🚕'}
          </div>

          {/* Canvas */}
          <canvas
            ref={canvasRef}
            style={{
              borderRadius: 12,
              border: `2px solid ${
                feedback?.type === 'error' ? colors.red :
                phase === 'won' ? colors.green : colors.border
              }`,
              touchAction: 'none',
              cursor: phase === 'drawing' && strokes.length < MAX_STROKES && !feedback ? 'crosshair' : 'default',
              maxWidth: '100%',
              transition: 'border-color 0.3s',
            }}
            onMouseDown={handleStart}
            onMouseMove={handleMove}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={handleStart}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
          />

          {/* Error feedback message */}
          {feedback?.type === 'error' && (
            <div style={{
              marginTop: 14, fontSize: 'clamp(13px, 3.5vw, 15px)',
              color: colors.red, fontWeight: 'bold', textAlign: 'center',
              animation: 'fadeIn 0.3s ease',
            }}>
              {feedback.msg}
            </div>
          )}

          {/* ─── Win Screen ─── */}
          {phase === 'won' && (
            <div style={{
              marginTop: 20, display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 12, width: '100%', maxWidth: 340,
            }}>
              <div style={{
                fontSize: 14, color: colors.textMuted, textAlign: 'center',
                lineHeight: 1.6,
              }}>
                Die 3 Striche ergeben das Wort <span style={{ color: colors.yellow, fontWeight: 'bold' }}>TAXI</span> 🚕<br />
                Ein Auto!
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
              {onBack && (
                <button onClick={() => { stopMusic(); onBack(); }} style={{
                  fontFamily: fonts.mono, fontSize: 13, fontWeight: 'bold',
                  color: '#fff', background: colors.greenDark,
                  border: `1px solid ${colors.green}`, borderRadius: 6,
                  padding: '10px 24px', cursor: 'pointer', minHeight: 44,
                  marginTop: 8,
                }}>
                  ← Zurück zu den Rätseltruhen
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
