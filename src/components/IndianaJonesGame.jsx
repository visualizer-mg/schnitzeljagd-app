import React, { useState, useEffect, useRef } from 'react';
import { colors, fonts } from '../theme';

const SFX_WIN = '/assets/horse-sounds/winning.mp3';
const SFX_ERROR = '/assets/error-buzz.mp3';

const QUESTIONS = [
  {
    question: 'Wieviele Filme gibt es eigentlich von Indy?',
    answers: ['5'],
    type: 'number',
  },
  {
    question: 'Wer spielte seinen Vater?',
    answers: ['sean connery'],
    type: 'text',
  },
  {
    question: 'Was sucht Indy mit seinem Vater beim letzten Kreuzzug?',
    answers: ['der heilige gral', 'den heiligen gral', 'heiliger gral', 'heilige gral', 'holy grail', 'gral'],
    type: 'text',
  },
];

function playSound(src, vol = 0.5) {
  try { const a = new Audio(src); a.volume = vol; a.play().catch(() => {}); } catch (e) {}
}

export default function IndianaJonesGame({ onWin, onBack, matrixClue, showResult }) {
  const [phase, setPhase] = useState(showResult ? 'won' : 'start');
  const [questionIdx, setQuestionIdx] = useState(0);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (phase === 'playing' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [phase, questionIdx]);

  const startGame = () => {
    setQuestionIdx(0);
    setInput('');
    setError('');
    setPhase('playing');
  };

  const checkAnswer = () => {
    const q = QUESTIONS[questionIdx];
    const cleaned = input.trim().toLowerCase();
    if (!cleaned) return;

    if (q.answers.includes(cleaned)) {
      // Correct!
      setError('');
      setInput('');
      if (questionIdx < QUESTIONS.length - 1) {
        setQuestionIdx(questionIdx + 1);
      } else {
        // All done!
        playSound(SFX_WIN, 0.6);
        if (onWin) onWin();
        setPhase('won');
      }
    } else {
      playSound(SFX_ERROR, 0.4);
      setError('Falsch! Versuch es nochmal...');
      setTimeout(() => setError(''), 2000);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') checkAnswer();
  };

  // ─── Start Screen ───
  if (phase === 'start') {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100%', background: colors.bgPrimary,
        padding: 20, boxSizing: 'border-box',
      }}>
        <img
          src="/assets/indiana-jones.jpg"
          alt="Indiana Jones"
          style={{ width: 220, height: 'auto', borderRadius: 12, marginBottom: 16 }}
        />
        <div style={{
          fontFamily: fonts.mono, fontSize: 22, color: '#D4A843',
          fontWeight: 'bold', letterSpacing: 2, marginBottom: 4,
        }}>
          INDIANA JONES
        </div>
        <div style={{
          fontFamily: fonts.mono, fontSize: 11, color: colors.textSubtle,
          letterSpacing: 1, marginBottom: 16,
        }}>
          ━━━ QUIZ ━━━
        </div>
        <div style={{
          fontFamily: fonts.mono, fontSize: 13, color: colors.textMuted,
          textAlign: 'center', lineHeight: 1.8, maxWidth: 340, marginBottom: 24,
        }}>
          Beantworte 3 Fragen über Indiana Jones<br />
          um den Matrix-Clue freizuschalten!
        </div>
        <button
          onClick={startGame}
          style={{
            fontFamily: fonts.mono, fontSize: 16, fontWeight: 'bold',
            color: '#fff', background: '#8B6914',
            border: '1px solid #D4A843', borderRadius: 6,
            padding: '12px 40px', cursor: 'pointer', letterSpacing: 1,
          }}
        >
          ▶ LOS GEHT'S
        </button>
      </div>
    );
  }

  // ─── Playing Screen ───
  if (phase === 'playing') {
    const q = QUESTIONS[questionIdx];
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100%', background: colors.bgPrimary,
        padding: 20, boxSizing: 'border-box',
      }}>
        <img
          src="/assets/indiana-jones.jpg"
          alt="Indiana Jones"
          style={{ width: 160, height: 'auto', borderRadius: 12, marginBottom: 16 }}
        />
        <div style={{
          fontFamily: fonts.mono, fontSize: 11, color: colors.textSubtle,
          marginBottom: 16,
        }}>
          Frage {questionIdx + 1} von {QUESTIONS.length}
        </div>
        <div style={{
          fontFamily: fonts.mono, fontSize: 'clamp(14px, 4vw, 16px)', color: '#D4A843',
          fontWeight: 'bold', textAlign: 'center', lineHeight: 1.6,
          maxWidth: 340, marginBottom: 20,
        }}>
          {q.question}
        </div>
        <input
          ref={inputRef}
          type={q.type === 'number' ? 'number' : 'text'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Antwort eingeben..."
          style={{
            fontFamily: fonts.mono, fontSize: 16,
            color: '#fff', background: 'rgba(255,255,255,0.08)',
            border: error ? '2px solid #f44336' : '2px solid rgba(255,255,255,0.2)',
            borderRadius: 8, padding: '12px 16px',
            width: '100%', maxWidth: 300,
            textAlign: 'center', marginBottom: 12,
            outline: 'none',
          }}
        />
        {error && (
          <div style={{
            fontFamily: fonts.mono, fontSize: 12, color: '#f44336',
            marginBottom: 8,
          }}>
            {error}
          </div>
        )}
        <button
          onClick={checkAnswer}
          style={{
            fontFamily: fonts.mono, fontSize: 14, fontWeight: 'bold',
            color: '#fff', background: '#8B6914',
            border: '1px solid #D4A843', borderRadius: 6,
            padding: '10px 32px', cursor: 'pointer',
            minHeight: 44,
          }}
        >
          ✓ PRÜFEN
        </button>
      </div>
    );
  }

  // ─── Won Screen ───
  if (phase === 'won') {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100%', background: colors.bgPrimary,
        padding: 20, boxSizing: 'border-box', overflowY: 'auto',
      }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🏆</div>
        <div style={{
          fontFamily: fonts.mono, fontSize: 20, color: '#D4A843',
          fontWeight: 'bold', letterSpacing: 2, marginBottom: 12,
        }}>
          RICHTIG!
        </div>
        <img
          src="/assets/indiana-jones.jpg"
          alt="Indiana Jones"
          style={{ width: 180, height: 'auto', borderRadius: 12, marginBottom: 16 }}
        />
        {matrixClue && (
          <div style={{
            background: 'rgba(212, 168, 67, 0.1)', border: '1px solid rgba(212, 168, 67, 0.3)',
            borderRadius: 8, padding: '12px 24px', marginBottom: 20, textAlign: 'center',
          }}>
            <div style={{ fontFamily: fonts.mono, fontSize: 11, color: colors.textSubtle, marginBottom: 6 }}>
              Matrix Clue:
            </div>
            <div style={{ fontFamily: fonts.mono, fontSize: 18, fontWeight: 'bold', color: '#D4A843', letterSpacing: 2, whiteSpace: 'nowrap' }}>
              {matrixClue}
            </div>
          </div>
        )}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={startGame}
            style={{
              fontFamily: fonts.mono, fontSize: 13,
              color: colors.text, background: colors.bgSecondary,
              border: `1px solid ${colors.border}`, borderRadius: 6,
              padding: '8px 20px', cursor: 'pointer', minHeight: 44,
            }}
          >
            ↻ NOCHMAL
          </button>
          {onBack && (
            <button
              onClick={() => onBack()}
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
      </div>
    );
  }

  return null;
}
