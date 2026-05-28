import React, { useState } from 'react';

const CORRECT_ANSWER = 'triceratops';
const NEAR_MISS = ['dino', 'dinosaurier', 'dinosaurus', 'saurier'];
const OBVIOUS = ['stein', 'steine', 'geröll', 'mauer', 'wand', 'felsen', 'steine'];

export default function MagicEyeGame({ matrixClue, onWin, onBack }) {
  const [phase, setPhase] = useState('puzzle'); // 'puzzle' | 'input' | 'solved'
  const [guess, setGuess] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [shaking, setShaking] = useState(false);

  const handleSubmit = () => {
    const g = guess.trim().toLowerCase();
    if (!g) return;

    if (g === CORRECT_ANSWER) {
      setFeedback(null);
      setPhase('solved');
      if (onWin) onWin();
      return;
    }

    if (NEAR_MISS.includes(g)) {
      setFeedback('nah-dran');
    } else if (OBVIOUS.includes(g)) {
      setFeedback('obvious');
    } else {
      setFeedback('wrong');
    }

    setShaking(true);
    setTimeout(() => setShaking(false), 500);
    setGuess('');
  };

  // ─── SOLVED SCREEN ───
  if (phase === 'solved') {
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
        {/* Celebration */}
        <div style={{
          fontSize: 48,
          marginBottom: 8,
          animation: 'bounce 0.6s ease',
        }}>
          🎉
        </div>
        <div style={{
          fontSize: 22,
          fontWeight: 700,
          color: '#4ade80',
          marginBottom: 4,
        }}>
          TRICERATOPS!
        </div>
        <div style={{
          fontSize: 14,
          color: 'rgba(255,255,255,0.5)',
          marginBottom: 24,
        }}>
          Richtig erkannt!
        </div>

        {/* Solution image */}
        <div style={{
          width: '100%',
          maxWidth: 500,
          borderRadius: 16,
          overflow: 'hidden',
          border: '2px solid rgba(74, 222, 128, 0.3)',
          boxShadow: '0 0 40px rgba(74, 222, 128, 0.15)',
          marginBottom: 24,
        }}>
          <img
            src="/assets/magic-eye-solution.jpg"
            alt="Triceratops"
            style={{ width: '100%', display: 'block' }}
          />
        </div>

        {/* Matrix Clue */}
        {matrixClue && (
          <div style={{
            background: 'rgba(74, 222, 128, 0.1)',
            border: '1px solid rgba(74, 222, 128, 0.3)',
            borderRadius: 12,
            padding: '16px 24px',
            marginBottom: 24,
            textAlign: 'center',
            width: '100%',
            maxWidth: 500,
          }}>
            <div style={{
              fontSize: 11,
              letterSpacing: 2,
              color: 'rgba(74, 222, 128, 0.7)',
              marginBottom: 8,
              fontWeight: 600,
            }}>
              MATRIX CLUE
            </div>
            <div style={{
              fontSize: 28,
              fontWeight: 700,
              fontFamily: 'monospace',
              color: '#4ade80',
              letterSpacing: 4,
            }}>
              {matrixClue}
            </div>
          </div>
        )}

        {/* Back button */}
        <button
          onClick={onBack}
          style={{
            padding: '14px 32px',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 12,
            color: '#fff',
            fontSize: 16,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          ← WEITER
        </button>

        <style>{`
          @keyframes bounce {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.3); }
          }
        `}</style>
      </div>
    );
  }

  // ─── PUZZLE SCREEN ───
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
      {/* Intro text */}
      <div style={{
        textAlign: 'center',
        marginBottom: 20,
        maxWidth: 500,
      }}>
        <div style={{
          fontSize: 20,
          fontWeight: 600,
          color: '#e2e8f0',
          marginBottom: 8,
          lineHeight: 1.4,
        }}>
          Die Lösung liegt im Auge des Betrachters...
        </div>
        <div style={{
          fontSize: 14,
          color: 'rgba(255,255,255,0.45)',
          fontStyle: 'italic',
        }}>
          Eventuell hilft es wenn du das Handy um 90° drehst.
        </div>
      </div>

      {/* Magic Eye Image */}
      <div style={{
        width: '100%',
        maxWidth: 600,
        borderRadius: 12,
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
        marginBottom: 24,
      }}>
        <img
          src="/assets/magic-eye-puzzle.webp"
          alt="Rätsel"
          style={{ width: '100%', display: 'block' }}
        />
      </div>

      {/* Input area */}
      {phase === 'puzzle' && (
        <button
          onClick={() => setPhase('input')}
          style={{
            padding: '16px 40px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            border: 'none',
            borderRadius: 14,
            color: '#fff',
            fontSize: 17,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(99, 102, 241, 0.35)',
            transition: 'transform 0.15s',
          }}
        >
          🔍 Lösung eingeben
        </button>
      )}

      {phase === 'input' && (
        <div style={{
          width: '100%',
          maxWidth: 500,
          animation: shaking ? 'shake 0.4s ease' : 'none',
        }}>
          {/* Password prompt */}
          <div style={{
            textAlign: 'center',
            fontSize: 14,
            color: 'rgba(255,255,255,0.5)',
            marginBottom: 12,
          }}>
            Bitte das korrekte Passwort eingeben zum Lösen dieses Rätsels...
          </div>

          {/* Input + Button */}
          <div style={{
            display: 'flex',
            gap: 8,
            marginBottom: 16,
          }}>
            <input
              type="text"
              value={guess}
              onChange={e => setGuess(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="Lösung..."
              autoFocus
              style={{
                flex: 1,
                padding: '14px 18px',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 12,
                color: '#fff',
                fontSize: 16,
                outline: 'none',
              }}
            />
            <button
              onClick={handleSubmit}
              style={{
                padding: '14px 24px',
                background: '#6366f1',
                border: 'none',
                borderRadius: 12,
                color: '#fff',
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              Prüfen
            </button>
          </div>

          {/* Feedback messages */}
          {feedback === 'nah-dran' && (
            <div style={{
              padding: '14px 18px',
              background: 'rgba(251, 191, 36, 0.12)',
              border: '1px solid rgba(251, 191, 36, 0.3)',
              borderRadius: 12,
              color: '#fbbf24',
              fontSize: 15,
              textAlign: 'center',
              fontWeight: 500,
            }}>
              🤏 Nah dran aber nicht präzise genug!
            </div>
          )}
          {feedback === 'obvious' && (
            <div style={{
              padding: '14px 18px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 12,
              color: '#f87171',
              fontSize: 15,
              textAlign: 'center',
              fontWeight: 500,
            }}>
              😏 Jaja immer erstmal das Offensichtliche eingeben. Aber du könntest nicht falscher liegen!!!
            </div>
          )}
          {feedback === 'wrong' && (
            <div style={{
              padding: '14px 18px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 12,
              color: '#f87171',
              fontSize: 15,
              textAlign: 'center',
              fontWeight: 500,
            }}>
              ❌ Leider falsch! Versuch's nochmal...
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-10px); }
          40% { transform: translateX(10px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}
