import React, { useState, useEffect } from 'react';

// ═══════════════════════════════════════════════════════
// FRUIT PUZZLE — Andrea
// Level 1: Frucht-Gleichungen (Emoji-Algebra)
// Level 2: Obstwaage (Gewichts-Logik)
// Level 3: Marktstand-Rätsel (Gleichungssystem)
// Matrix-Clue C7 → physisch im Briefing (UV-Tinte)
// ═══════════════════════════════════════════════════════

export default function FruitPuzzleGame({ onWin, onBack, showResult }) {
  const [level, setLevel] = useState(showResult ? 4 : 0); // 0=start, 4=win
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [showTransition, setShowTransition] = useState(false);

  const checkAnswer = (correct) => {
    const val = input.trim();
    if (val === '' ) return;
    if (val === String(correct)) {
      if (level < 3) {
        setShowTransition(true);
        setInput('');
        setError('');
        setTimeout(() => {
          setLevel(level + 1);
          setShowTransition(false);
        }, 1500);
      } else {
        // Won all 3 levels
        setLevel(4); // win screen
        if (onWin) onWin();
      }
    } else {
      setError('❌ Falsch! Versuch\'s nochmal...');
      setTimeout(() => setError(''), 2000);
    }
  };

  const inputStyle = {
    width: '80px', padding: '10px 12px', fontSize: 24, fontWeight: 700,
    textAlign: 'center', background: 'rgba(255,255,255,0.08)',
    border: '2px solid rgba(255, 166, 87, 0.4)', borderRadius: 10,
    color: '#fff', outline: 'none', fontFamily: 'monospace',
  };

  const submitBtn = (onClick) => (
    <button
      onClick={onClick}
      onTouchEnd={(e) => { e.stopPropagation(); onClick(); }}
      style={{
        padding: '10px 28px', background: 'linear-gradient(135deg, #ffa657, #f78166)',
        color: '#fff', border: 'none', borderRadius: 10, fontSize: 16,
        fontWeight: 700, cursor: 'pointer',
      }}
    >
      Prüfen ✓
    </button>
  );

  const eqLine = (text, fontSize = 20) => (
    <div style={{ fontSize, marginBottom: 8, color: '#e6edf3', lineHeight: 1.6 }}>
      {text}
    </div>
  );

  // ═══ START SCREEN ═══
  if (level === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '80vh', padding: 24, textAlign: 'center',
      }}>
        <div style={{ fontSize: 56, marginBottom: 20 }}>🍎🍌🍊</div>
        <div style={{
          fontSize: 22, fontWeight: 800, color: '#ffa657',
          letterSpacing: 1, marginBottom: 16, fontFamily: 'monospace',
        }}>
          Das Markträtsel
        </div>
        <div style={{
          fontSize: 15, color: '#e6edf3', lineHeight: 1.8, maxWidth: 320, marginBottom: 24,
        }}>
          Herzlich willkommen auf dem Wochenmarkt!
        </div>
        <div style={{
          fontSize: 13, color: '#8b949e', lineHeight: 1.7, maxWidth: 320, marginBottom: 32,
          padding: '12px 16px', background: 'rgba(255, 166, 87, 0.08)',
          border: '1px solid rgba(255, 166, 87, 0.2)', borderRadius: 10,
        }}>
          Um das Rätsel dieser Truhe zu lösen, musst du ein paar kleine Aufgaben bewältigen...
        </div>
        <button
          onClick={() => { setLevel(1); setInput(''); }}
          onTouchEnd={(e) => { e.stopPropagation(); setLevel(1); setInput(''); }}
          style={{
            padding: '16px 40px',
            background: 'linear-gradient(135deg, #ffa657, #f78166)',
            color: '#fff', border: 'none', borderRadius: 12, fontSize: 18,
            fontWeight: 700, cursor: 'pointer', letterSpacing: 1,
          }}
        >
          🍎 Los geht's!
        </button>
        {onBack && (
          <button onClick={onBack}
            onTouchEnd={(e) => { e.stopPropagation(); if (onBack) onBack(); }}
            style={{
              marginTop: 16, padding: '8px 20px', background: 'transparent',
              color: '#8b949e', border: '1px solid #30363d', borderRadius: 8,
              fontSize: 13, cursor: 'pointer',
            }}>← Zurück</button>
        )}
      </div>
    );
  }

  // ═══ TRANSITION ═══
  if (showTransition) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '60vh', textAlign: 'center', padding: 24,
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#7ee787' }}>
          Richtig!
        </div>
        <div style={{ fontSize: 14, color: '#8b949e', marginTop: 8 }}>
          Weiter zu Level {level + 1}...
        </div>
      </div>
    );
  }

  // ═══ LEVEL 1: Frucht-Gleichungen ═══
  if (level === 1) {
    // 🍎=4, 🍌=2, 🍊=1 → 4 + 2×1 = 6
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: 24, textAlign: 'center', minHeight: '80vh', justifyContent: 'center',
      }}>
        <div style={{ fontSize: 11, color: '#ffa657', fontFamily: 'monospace', letterSpacing: 2, marginBottom: 4 }}>
          LEVEL 1 / 3
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#ffa657', marginBottom: 20, fontFamily: 'monospace' }}>
          🍎 Frucht-Gleichungen
        </div>

        <div style={{
          padding: '20px 24px', background: 'rgba(0,0,0,0.3)',
          borderRadius: 12, marginBottom: 20, minWidth: 280,
        }}>
          {eqLine('🍎 + 🍎 + 🍎 = 12')}
          {eqLine('🍎 + 🍌 + 🍌 = 8')}
          {eqLine('🍌 + 🍊 = 3')}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '12px 0' }} />
          {eqLine('🍎 + 🍌 × 🍊 = ?', 22)}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <input
            type="number"
            inputMode="numeric"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="?"
            style={inputStyle}
          />
          {submitBtn(() => checkAnswer(6))}
        </div>

        {error && <div style={{ color: '#f47067', fontSize: 13, marginTop: 4 }}>{error}</div>}
      </div>
    );
  }

  // ═══ LEVEL 2: Obstwaage ═══
  if (level === 2) {
    // 3🍎 = 2🍌, 1🍌 = 4🍒 → 6🍎 = 4🍌 = 16🍒
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: 24, textAlign: 'center', minHeight: '80vh', justifyContent: 'center',
      }}>
        <div style={{ fontSize: 11, color: '#ffa657', fontFamily: 'monospace', letterSpacing: 2, marginBottom: 4 }}>
          LEVEL 2 / 3
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#ffa657', marginBottom: 20, fontFamily: 'monospace' }}>
          ⚖️ Obstwaage
        </div>

        <div style={{
          padding: '20px 24px', background: 'rgba(0,0,0,0.3)',
          borderRadius: 12, marginBottom: 20, minWidth: 280,
          textAlign: 'left',
        }}>
          <div style={{ fontSize: 15, color: '#e6edf3', lineHeight: 1.8 }}>
            3 Äpfel 🍎 wiegen so viel wie 2 Bananen 🍌
          </div>
          <div style={{ fontSize: 15, color: '#e6edf3', lineHeight: 1.8 }}>
            1 Banane 🍌 wiegt so viel wie 4 Kirschen 🍒
          </div>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '12px 0' }} />
          <div style={{ fontSize: 16, color: '#ffa657', lineHeight: 1.8, fontWeight: 600 }}>
            Wie viele Kirschen 🍒 braucht man für 6 Äpfel 🍎?
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <input
            type="number"
            inputMode="numeric"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="?"
            style={inputStyle}
          />
          {submitBtn(() => checkAnswer(16))}
        </div>

        {error && <div style={{ color: '#f47067', fontSize: 13, marginTop: 4 }}>{error}</div>}
      </div>
    );
  }

  // ═══ LEVEL 3: Marktstand-Rätsel ═══
  if (level === 3) {
    // 5🍎+3🍐=11, 3🍎+5🍐=13 → 🍎=1
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: 24, textAlign: 'center', minHeight: '80vh', justifyContent: 'center',
      }}>
        <div style={{ fontSize: 11, color: '#ffa657', fontFamily: 'monospace', letterSpacing: 2, marginBottom: 4 }}>
          LEVEL 3 / 3
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#ffa657', marginBottom: 20, fontFamily: 'monospace' }}>
          🏪 Marktstand-Rätsel
        </div>

        <div style={{
          padding: '20px 24px', background: 'rgba(0,0,0,0.3)',
          borderRadius: 12, marginBottom: 20, minWidth: 280,
          textAlign: 'left',
        }}>
          <div style={{ fontSize: 15, color: '#e6edf3', lineHeight: 1.8 }}>
            Auf dem Markt kosten 5 Äpfel 🍎 und 3 Birnen 🍐 zusammen 11 €
          </div>
          <div style={{ fontSize: 15, color: '#e6edf3', lineHeight: 1.8 }}>
            3 Äpfel 🍎 und 5 Birnen 🍐 kosten zusammen 13 €
          </div>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '12px 0' }} />
          <div style={{ fontSize: 16, color: '#ffa657', lineHeight: 1.8, fontWeight: 600 }}>
            Was kostet 1 Apfel 🍎?
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <input
            type="number"
            inputMode="numeric"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="?"
            style={inputStyle}
          />
          {submitBtn(() => checkAnswer(1))}
        </div>

        {error && <div style={{ color: '#f47067', fontSize: 13, marginTop: 4 }}>{error}</div>}
      </div>
    );
  }

  // ═══ WIN SCREEN ═══
  if (level === 4) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '80vh', padding: 24, textAlign: 'center',
      }}>
        <div style={{ fontSize: 56, marginBottom: 20 }}>🍎🎉🍌</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#7ee787', marginBottom: 16 }}>
          Herzlichen Glückwunsch!
        </div>
        <div style={{
          fontSize: 14, color: '#e6edf3', lineHeight: 1.8, maxWidth: 320, marginBottom: 20,
        }}>
          Du kennst dich mit Obst und Mathe wirklich hervorragend aus! Top!
        </div>

        <div style={{
          padding: '16px 20px', background: 'rgba(255, 166, 87, 0.08)',
          border: '2px solid rgba(255, 166, 87, 0.3)', borderRadius: 12,
          maxWidth: 340, marginBottom: 20, textAlign: 'left',
        }}>
          <div style={{ fontSize: 14, color: '#ffa657', fontWeight: 600, marginBottom: 8 }}>
            Leider hast du damit noch nicht den Matrix-Clue freigeschaltet.
          </div>
          <div style={{ fontSize: 13, color: '#e6edf3', lineHeight: 1.7 }}>
            Diesen findest du auf <strong style={{ color: '#ffa657' }}>Seite 3</strong> in deinem Briefing...
          </div>
        </div>

        <div style={{
          padding: '16px 20px', background: 'rgba(108, 182, 255, 0.06)',
          border: '1px solid rgba(108, 182, 255, 0.2)', borderRadius: 12,
          maxWidth: 340, marginBottom: 24, textAlign: 'left',
        }}>
          <div style={{ fontSize: 13, color: '#8b949e', lineHeight: 1.7, fontStyle: 'italic' }}>
            Du wirst dich jetzt vermutlich fragen... wo soll da was stehen...
          </div>
          <div style={{ fontSize: 13, color: '#8b949e', lineHeight: 1.7, marginTop: 6 }}>
            Sehr berechtigte Frage...
          </div>
          <div style={{ fontSize: 13, color: '#e6edf3', lineHeight: 1.7, marginTop: 8 }}>
            Es gibt etwas das dir helfen wird. Irgendwo ganz in der Nähe hält ein <strong style={{ color: '#6cb6ff' }}>Bus</strong>, welcher normalerweise zum <strong style={{ color: '#6cb6ff' }}>Markt</strong> fährt!
          </div>
          <div style={{ fontSize: 13, color: '#e6edf3', lineHeight: 1.7, marginTop: 6 }}>
            Schau dich da mal um. Vielleicht findest du einen Gegenstand der dir helfen wird.
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
          ← Weiter
        </button>
      </div>
    );
  }

  return null;
}
