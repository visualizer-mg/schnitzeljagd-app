import React, { useState, useEffect, useRef } from 'react';
import { colors, fonts } from '../theme';

// ─── Correct mapping (column index = turtle) ───
// 0: Michelangelo, 1: Leonardo, 2: Donatello, 3: Raphael
const TURTLES = [
  { name: 'Michelangelo', head: '/assets/turtles/michelangelo.png', weapon: '/assets/turtles/nuchackos.png', weaponName: 'Nunchaku' },
  { name: 'Leonardo',     head: '/assets/turtles/leonardo.png',     weapon: '/assets/turtles/katana.png',    weaponName: 'Twin Katana' },
  { name: 'Donatello',    head: '/assets/turtles/dontatello.png',   weapon: '/assets/turtles/stab.png',      weaponName: 'Bō' },
  { name: 'Raphael',      head: '/assets/turtles/raphael.png',      weapon: '/assets/turtles/twinsai.png',   weaponName: 'Twin Sai' },
];

const SFX_WIN = '/assets/horse-sounds/winning.mp3';
const MUSIC_BG = '/assets/turtles/turtles.mpeg';

// Fisher-Yates shuffle
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Make sure at least one row is not in correct order
function shuffleRow() {
  let arr;
  do {
    arr = shuffle([0, 1, 2, 3]);
  } while (arr.every((v, i) => v === i));
  return arr;
}

function playSound(src, vol = 0.5) {
  try { const a = new Audio(src); a.volume = vol; a.play().catch(() => {}); } catch (e) {}
}

export default function TurtleGame({ onWin, onBack, matrixClue, showResult }) {
  const [phase, setPhase] = useState(showResult ? 'won' : 'start');
  const [nameOrder, setNameOrder] = useState(() => shuffleRow());
  const [headOrder, setHeadOrder] = useState(() => shuffleRow());
  const [weaponOrder, setWeaponOrder] = useState(() => shuffleRow());
  const [weaponNameOrder, setWeaponNameOrder] = useState(() => shuffleRow());
  const [selected, setSelected] = useState(null); // { row, index }
  const [flash, setFlash] = useState(null); // { row, indices: [i, j] }
  const hasWonRef = useRef(false);
  const musicRef = useRef(null);

  // ─── Music ───
  const startMusic = () => {
    try {
      if (musicRef.current) { musicRef.current.pause(); musicRef.current = null; }
      const m = new Audio(MUSIC_BG); m.loop = true; m.volume = 0.4;
      m.play().catch(() => {}); musicRef.current = m;
    } catch (e) {}
  };
  const stopMusic = () => {
    if (musicRef.current) { musicRef.current.pause(); musicRef.current = null; }
  };

  // Start music on mount (intro screen)
  useEffect(() => {
    if (!showResult) startMusic();
    return () => stopMusic();
  }, []);

  // Check if all rows are correct
  useEffect(() => {
    if (phase !== 'playing' || hasWonRef.current) return;

    const rows = [nameOrder, headOrder, weaponOrder, weaponNameOrder];
    const allCorrect = rows.every(row => row.every((v, i) => v === i));

    if (allCorrect) {
      hasWonRef.current = true;
      playSound(SFX_WIN, 0.6);
      if (onWin) onWin();
      setTimeout(() => setPhase('won'), 800);
    }
  }, [nameOrder, headOrder, weaponOrder, weaponNameOrder, phase]);

  const handleTap = (row, index) => {
    if (phase !== 'playing') return;

    if (!selected) {
      setSelected({ row, index });
    } else if (selected.row === row) {
      if (selected.index === index) {
        setSelected(null); // deselect
      } else {
        // Swap
        const setters = [setNameOrder, setHeadOrder, setWeaponOrder, setWeaponNameOrder];
        const orders = [nameOrder, headOrder, weaponOrder, weaponNameOrder];
        const newOrder = [...orders[row]];
        [newOrder[selected.index], newOrder[index]] = [newOrder[index], newOrder[selected.index]];
        setters[row](newOrder);

        // Flash animation
        setFlash({ row, indices: [selected.index, index] });
        setTimeout(() => setFlash(null), 300);

        setSelected(null);
      }
    } else {
      // Different row — just switch selection
      setSelected({ row, index });
    }
  };

  const startGame = () => {
    setNameOrder(shuffleRow());
    setHeadOrder(shuffleRow());
    setWeaponOrder(shuffleRow());
    setWeaponNameOrder(shuffleRow());
    setSelected(null);
    hasWonRef.current = false;
    setPhase('playing');
  };

  const isSelected = (row, index) => selected && selected.row === row && selected.index === index;
  const isFlashing = (row, index) => flash && flash.row === row && flash.indices.includes(index);

  const cellStyle = (row, index) => ({
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
    borderRadius: 8,
    cursor: 'pointer',
    border: isSelected(row, index)
      ? '2px solid #4ade80'
      : '2px solid rgba(255,255,255,0.1)',
    background: isFlashing(row, index)
      ? 'rgba(74, 222, 128, 0.2)'
      : isSelected(row, index)
        ? 'rgba(74, 222, 128, 0.1)'
        : 'rgba(255,255,255,0.03)',
    transition: 'all 0.2s ease',
    minHeight: 44,
  });

  // ─── Start Screen ───
  if (phase === 'start') {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100%', background: colors.bgPrimary,
        padding: 20, boxSizing: 'border-box',
      }}>
        <img
          src="/assets/turtles/ninjaturtles.png"
          alt="Ninja Turtles"
          style={{ width: 180, height: 'auto', marginBottom: 16 }}
        />
        <div style={{
          fontFamily: fonts.mono, fontSize: 22, color: '#4CAF50',
          fontWeight: 'bold', letterSpacing: 2, marginBottom: 4,
        }}>
          TURTLE MATCH
        </div>
        <div style={{
          fontFamily: fonts.mono, fontSize: 11, color: colors.textSubtle,
          letterSpacing: 1, marginBottom: 16,
        }}>
          ━━━ ORDNE RICHTIG ZU ━━━
        </div>
        <div style={{
          fontFamily: fonts.mono, fontSize: 13, color: colors.textMuted,
          textAlign: 'center', lineHeight: 1.8, maxWidth: 340, marginBottom: 24,
        }}>
          Alle Turtles sind durcheinander!<br />
          Tippe zwei Elemente in derselben Zeile an um sie zu tauschen.<br /><br />
          <span style={{ color: '#4CAF50' }}>Ordne alle Turtles richtig zu!</span>
        </div>
        <button
          onClick={startGame}
          style={{
            fontFamily: fonts.mono, fontSize: 16, fontWeight: 'bold',
            color: '#fff', background: '#2E7D32',
            border: '1px solid #4CAF50', borderRadius: 6,
            padding: '12px 40px', cursor: 'pointer', letterSpacing: 1,
          }}
        >
          ▶ LOS GEHT'S
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
          fontFamily: fonts.mono, fontSize: 20, color: colors.green,
          fontWeight: 'bold', letterSpacing: 2, marginBottom: 8,
        }}>
          COWABUNGA!
        </div>
        <div style={{
          fontFamily: fonts.mono, fontSize: 'clamp(12px, 3.5vw, 14px)', color: colors.textMuted,
          textAlign: 'center', lineHeight: 1.8, maxWidth: 340, marginBottom: 20,
          padding: '0 12px',
        }}>
          Alle Turtles richtig zugeordnet! 🐢✨<br /><br />
          Du kennst deine Ninjas!<br /><br />
          <span style={{ color: colors.yellow }}>Aber damit hast du leider immer noch keinen Matrix Clue freigeschaltet... 😎</span><br /><br />
          <span style={{ color: colors.textSubtle, fontStyle: 'italic' }}>
            Da die Turtles bekanntlich ja in der Kanalisation leben, solltest du vielleicht auch mal ein Stockwerk tiefer gehen und dich in der Werkstatt umschauen... Es könnte gut sein, dass du den Matrix-Clue dort findest...
          </span>
        </div>
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
            ↻ NOCHMAL SPIELEN
          </button>
          {onBack && (
            <button
              onClick={() => { stopMusic(); if (onBack) onBack(); }}
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

  // ─── Playing Screen ───
  const rowLabel = (text) => (
    <div style={{
      fontFamily: fonts.mono, fontSize: 9, color: colors.textSubtle,
      textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, marginTop: 8,
    }}>
      {text}
    </div>
  );

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      height: '100%', background: colors.bgPrimary,
      padding: '12px 8px', boxSizing: 'border-box',
      overflowY: 'auto',
    }}>
      {/* Title */}
      <div style={{
        fontFamily: fonts.mono, fontSize: 14, fontWeight: 'bold',
        color: '#4CAF50', marginBottom: 2, letterSpacing: 1,
      }}>
        🐢 TURTLE MATCH
      </div>
      <div style={{
        fontFamily: fonts.mono, fontSize: 9, color: colors.textSubtle, marginBottom: 10,
      }}>
        Tippe 2 in gleicher Zeile → Tauschen
      </div>

      {/* Row 1: Names */}
      {rowLabel('Namen')}
      <div style={{ display: 'flex', gap: 4, width: '100%', maxWidth: 400 }}>
        {nameOrder.map((ti, i) => (
          <div key={`name-${i}`} style={cellStyle(0, i)} onClick={() => handleTap(0, i)}>
            <span style={{
              fontFamily: fonts.mono, fontSize: 'clamp(8px, 2.5vw, 11px)',
              fontWeight: 'bold', color: '#fff', textAlign: 'center',
              wordBreak: 'break-word',
            }}>
              {TURTLES[ti].name}
            </span>
          </div>
        ))}
      </div>

      {/* Row 2: Heads */}
      {rowLabel('Köpfe')}
      <div style={{ display: 'flex', gap: 4, width: '100%', maxWidth: 400 }}>
        {headOrder.map((ti, i) => (
          <div key={`head-${i}`} style={cellStyle(1, i)} onClick={() => handleTap(1, i)}>
            <img
              src={TURTLES[ti].head}
              alt={TURTLES[ti].name}
              style={{ width: '100%', maxWidth: 75, height: 'auto', objectFit: 'contain' }}
            />
          </div>
        ))}
      </div>

      {/* Row 3: Weapons */}
      {rowLabel('Waffen')}
      <div style={{ display: 'flex', gap: 4, width: '100%', maxWidth: 400, alignItems: 'center' }}>
        {weaponOrder.map((ti, i) => (
          <div key={`weapon-${i}`} style={{ ...cellStyle(2, i), minHeight: 80 }} onClick={() => handleTap(2, i)}>
            <img
              src={TURTLES[ti].weapon}
              alt={TURTLES[ti].weaponName}
              style={{ width: '60%', maxHeight: 80, objectFit: 'contain' }}
            />
          </div>
        ))}
      </div>

      {/* Row 4: Weapon Names */}
      {rowLabel('Waffennamen')}
      <div style={{ display: 'flex', gap: 4, width: '100%', maxWidth: 400 }}>
        {weaponNameOrder.map((ti, i) => (
          <div key={`wname-${i}`} style={cellStyle(3, i)} onClick={() => handleTap(3, i)}>
            <span style={{
              fontFamily: fonts.mono, fontSize: 'clamp(8px, 2.5vw, 11px)',
              fontWeight: 'bold', color: '#fff', textAlign: 'center',
            }}>
              {TURTLES[ti].weaponName}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
