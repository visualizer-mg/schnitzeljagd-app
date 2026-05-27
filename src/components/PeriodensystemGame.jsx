import React, { useState } from 'react';
import { colors, fonts } from '../theme';

// ═══════════════════════════════════════════════════════
// PERIODENSYSTEM-RÄTSEL — Mark
// 3 Passwörter: SNACK, GENIUS, BAUM
// Elemente als "nah dran"-Trigger
// Hint: Die 3 Geschichten mit versteckten Element-Hinweisen
// Matrix-Clue C2 (noch definieren)
// ═══════════════════════════════════════════════════════

const MATRIX_CLUE = 'C2: 4 - 7 - 1 - 9 - 3';

// Die drei korrekten Lösungswörter
const CORRECT_ANSWERS = ['snack', 'genius', 'baum'];

// Elemente und Symbole die "nah dran" triggern
const ELEMENT_NAMES = [
  'zinn', 'sn', 'actinium', 'ac', 'kalium', 'k',
  'germanium', 'ge', 'nickel', 'ni', 'uran', 'u', 'schwefel', 's',
  'bor', 'b', 'gold', 'au', 'magnesium', 'mg',
  // auch englische Namen
  'tin', 'potassium', 'uranium', 'sulfur', 'boron',
];

const HINT_TEXT = 'Ein monatlicher, blutiger Besuch, den keine Frau bestellt hat + das Gegenteil von Durcheinander/Chaos = dein Schlüssel zum Lösen 🔑';

// Wrong-answer messages
const WRONG_MESSAGES = [
  'Komplett falsch!!! Try again! 💀',
  'Nope! Nicht mal in der Nähe! 🙈',
  'Haha, schön wär\'s! Nochmal! 😂',
  'Das war nix! Weiter versuchen! 💪',
];

const CLOSE_MESSAGES = [
  'Leider auch falsch... aber schon nah dran! 🔥',
  'Warm, wärmer... aber noch nicht richtig! 🤏',
  'Du bist auf der richtigen Spur... aber das ist es noch nicht! 👀',
];

export default function PeriodensystemGame({ matrixClue, onWin, onBack, showResult }) {
  const [answers, setAnswers] = useState(['', '', '']);
  const [solved, setSolved] = useState([false, false, false]);
  const [feedback, setFeedback] = useState([null, null, null]);
  const [showHint, setShowHint] = useState(false);
  const [won, setWon] = useState(showResult || false);
  const [shakeIdx, setShakeIdx] = useState(null);
  const [winSaved, setWinSaved] = useState(showResult || false);

  const clue = matrixClue || MATRIX_CLUE;

  const handleSubmit = (idx) => {
    const val = answers[idx].trim().toLowerCase();
    if (!val) return;

    if (CORRECT_ANSWERS.includes(val)) {
      // Correct!
      const newSolved = [...solved];
      newSolved[idx] = true;
      setSolved(newSolved);

      const newFeedback = [...feedback];
      newFeedback[idx] = { type: 'correct', text: 'Richtig! ✅' };
      setFeedback(newFeedback);

      // Check if all solved
      if (newSolved.every(Boolean)) {
        setTimeout(() => {
          setWon(true);
          setWinSaved(false); // needs saving when going back
        }, 800);
      }
    } else if (val === 'baumn') {
      const newFeedback = [...feedback];
      newFeedback[idx] = { type: 'close', text: 'Lass das N weg! 😂' };
      setFeedback(newFeedback);
      triggerShake(idx);
    } else if (ELEMENT_NAMES.includes(val)) {
      // Close — it's an element name
      const msg = CLOSE_MESSAGES[Math.floor(Math.random() * CLOSE_MESSAGES.length)];
      const newFeedback = [...feedback];
      newFeedback[idx] = { type: 'close', text: msg };
      setFeedback(newFeedback);
      triggerShake(idx);
    } else {
      // Completely wrong
      const msg = WRONG_MESSAGES[Math.floor(Math.random() * WRONG_MESSAGES.length)];
      const newFeedback = [...feedback];
      newFeedback[idx] = { type: 'wrong', text: msg };
      setFeedback(newFeedback);
      triggerShake(idx);
    }
  };

  const triggerShake = (idx) => {
    setShakeIdx(idx);
    setTimeout(() => setShakeIdx(null), 500);
  };

  const handleKeyDown = (e, idx) => {
    if (e.key === 'Enter') handleSubmit(idx);
  };

  const updateAnswer = (idx, val) => {
    // Don't allow editing solved fields
    if (solved[idx]) return;
    const newAnswers = [...answers];
    newAnswers[idx] = val;
    setAnswers(newAnswers);
    // Clear feedback on new input
    const newFeedback = [...feedback];
    newFeedback[idx] = null;
    setFeedback(newFeedback);
  };

  // ── Win Screen ──
  if (won) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at center, #1a2a1a 0%, #0a0a0a 70%)',
        padding: 20,
      }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🏆</div>
        <div style={{
          fontFamily: fonts.mono,
          fontSize: 'clamp(14px, 3.5vw, 16px)',
          color: colors.textSecondary,
          marginBottom: 12,
          lineHeight: 1.8,
          textAlign: 'center',
          maxWidth: 380,
        }}>
          Herzlichen Glückwunsch, du hast das Rätsel gelöst, <span style={{ color: colors.yellow, fontWeight: 'bold' }}>GENIUS</span>.
          Ich würde dir empfehlen den <span style={{ color: colors.yellow, fontWeight: 'bold' }}>SNACK</span> auf die Seite zu legen
          und im Garten in der Nähe des Mähroboters den <span style={{ color: colors.yellow, fontWeight: 'bold' }}>BAUM</span> abzusuchen.
          Vermutlich findest du dort den Matrix-Clue 😊
        </div>
        <button
          onClick={() => {
            if (!winSaved && onWin) onWin();
            if (onBack) onBack();
          }}
          style={{
            marginTop: 32,
            padding: '12px 28px',
            background: colors.yellow,
            border: 'none',
            borderRadius: 10,
            color: '#000',
            fontFamily: fonts.mono,
            fontSize: 14,
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          ← Zurück zu den Rätseltruhen
        </button>
      </div>
    );
  }

  // ── Main UI ──
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0d1117 0%, #161b22 50%, #0d1117 100%)',
      padding: 'clamp(16px, 4vw, 32px)',
      paddingTop: 'clamp(60px, 10vw, 80px)',
    }}>
      {/* Title */}
      <div style={{ fontSize: 40, marginBottom: 8 }}>🔬</div>
      <h2 style={{
        fontFamily: fonts.heading,
        color: colors.yellow,
        fontSize: 'clamp(18px, 5vw, 24px)',
        marginBottom: 6,
        textAlign: 'center',
      }}>
        Rätselkiste 2
      </h2>
      <p style={{
        fontFamily: fonts.mono,
        color: colors.textSecondary,
        fontSize: 'clamp(12px, 3vw, 14px)',
        marginBottom: 'clamp(24px, 5vw, 36px)',
        textAlign: 'center',
        maxWidth: 400,
        lineHeight: 1.6,
      }}>
        Drei Passwörter. Drei Rätsel. Finde die Lösung!
      </p>

      {/* Progress */}
      <div style={{
        display: 'flex',
        gap: 8,
        marginBottom: 'clamp(20px, 4vw, 32px)',
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: solved[i] ? colors.yellow : 'rgba(255,255,255,0.15)',
            border: solved[i] ? 'none' : '1px solid rgba(255,255,255,0.2)',
            transition: 'all 0.3s ease',
          }} />
        ))}
      </div>

      {/* Input Fields */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'clamp(16px, 4vw, 24px)',
        width: '100%',
        maxWidth: 400,
      }}>
        {[0, 1, 2].map(idx => (
          <div
            key={idx}
            style={{
              background: solved[idx]
                ? 'rgba(34, 197, 94, 0.1)'
                : 'rgba(255,255,255,0.04)',
              border: `1px solid ${
                solved[idx]
                  ? 'rgba(34, 197, 94, 0.4)'
                  : feedback[idx]?.type === 'close'
                    ? 'rgba(255, 165, 0, 0.4)'
                    : feedback[idx]?.type === 'wrong'
                      ? 'rgba(239, 68, 68, 0.4)'
                      : 'rgba(255,255,255,0.1)'
              }`,
              borderRadius: 12,
              padding: 'clamp(12px, 3vw, 16px)',
              animation: shakeIdx === idx ? 'shake 0.5s ease-in-out' : 'none',
            }}
          >
            <div style={{
              fontFamily: fonts.mono,
              fontSize: 12,
              color: colors.textSecondary,
              marginBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}>
              Passwort {idx + 1}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={solved[idx] ? answers[idx].toUpperCase() : answers[idx]}
                onChange={e => updateAnswer(idx, e.target.value)}
                onKeyDown={e => handleKeyDown(e, idx)}
                disabled={solved[idx]}
                placeholder="Antwort eingeben..."
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  background: solved[idx] ? 'rgba(34, 197, 94, 0.15)' : 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  color: solved[idx] ? '#22c55e' : '#fff',
                  fontFamily: fonts.mono,
                  fontSize: 16,
                  fontWeight: solved[idx] ? 'bold' : 'normal',
                  outline: 'none',
                }}
              />
              {!solved[idx] && (
                <button
                  onClick={() => handleSubmit(idx)}
                  style={{
                    padding: '10px 16px',
                    background: colors.yellow,
                    border: 'none',
                    borderRadius: 8,
                    color: '#000',
                    fontFamily: fonts.mono,
                    fontSize: 14,
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  ✓
                </button>
              )}
            </div>

            {/* Feedback */}
            {feedback[idx] && (
              <div style={{
                marginTop: 8,
                fontFamily: fonts.mono,
                fontSize: 13,
                color: feedback[idx].type === 'correct'
                  ? '#22c55e'
                  : feedback[idx].type === 'close'
                    ? '#f59e0b'
                    : '#ef4444',
                lineHeight: 1.4,
              }}>
                {feedback[idx].text}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Hint Button */}
      {!showHint && (
        <button
          onClick={() => setShowHint(true)}
          style={{
            marginTop: 'clamp(24px, 5vw, 36px)',
            padding: '12px 24px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 10,
            color: colors.textSecondary,
            fontFamily: fonts.mono,
            fontSize: 13,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          💡 Brauchst du einen Hinweis?
        </button>
      )}

      {/* Hint */}
      {showHint && (
        <div style={{
          marginTop: 'clamp(24px, 5vw, 36px)',
          padding: '16px 20px',
          background: 'rgba(255, 165, 0, 0.08)',
          border: '1px solid rgba(255, 165, 0, 0.2)',
          borderRadius: 12,
          maxWidth: 400,
          width: '100%',
        }}>
          <div style={{
            fontFamily: fonts.mono,
            fontSize: 'clamp(14px, 3.5vw, 16px)',
            color: 'rgba(255, 165, 0, 0.9)',
            textAlign: 'center',
            lineHeight: 1.7,
          }}>
            💡 {HINT_TEXT}
          </div>
        </div>
      )}

      {/* Shake animation */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}
