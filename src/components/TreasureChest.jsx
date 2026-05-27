import React, { useState, useRef, useEffect } from 'react';

// ═══════════════════════════════════════════════════════
// Sparkle particle system — fires from BOTH sides
// ═══════════════════════════════════════════════════════
function SparkleExplosion({ active }) {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);

  useEffect(() => {
    if (!active || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const w = canvas.width = canvas.offsetWidth * 2;
    const h = canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);
    const cw = w / 2;
    const ch = h / 2;

    const sparkColors = ['#f59e0b', '#fbbf24', '#fcd34d', '#fff', '#4ade80', '#fb923c', '#f97316'];
    const particles = [];

    // Two origins: left + right
    [{ x: cw * 0.3, y: ch * 0.5 }, { x: cw * 1.7, y: ch * 0.5 }].forEach(origin => {
      for (let i = 0; i < 35; i++) {
        const angle = (Math.PI * 2 * i) / 35 + (Math.random() - 0.5) * 0.5;
        const speed = 2 + Math.random() * 5;
        const size = 2 + Math.random() * 4;
        particles.push({
          x: origin.x, y: origin.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2,
          size,
          color: sparkColors[Math.floor(Math.random() * sparkColors.length)],
          life: 1, decay: 0.01 + Math.random() * 0.02,
          gravity: 0.05 + Math.random() * 0.03,
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.3,
          type: Math.random() > 0.5 ? 'star' : 'circle',
        });
      }
    });

    const animate = () => {
      ctx.clearRect(0, 0, cw, ch);
      let alive = false;
      particles.forEach(p => {
        if (p.life <= 0) return;
        alive = true;
        p.x += p.vx; p.y += p.vy;
        p.vy += p.gravity; p.vx *= 0.98;
        p.life -= p.decay; p.rotation += p.rotSpeed;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = Math.max(0, p.life);
        if (p.type === 'star') {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          for (let j = 0; j < 8; j++) {
            const r = j % 2 === 0 ? p.size : p.size * 0.4;
            const a = (Math.PI * 2 * j) / 8;
            if (j === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
            else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          }
          ctx.closePath(); ctx.fill();
        } else {
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = p.size * 2;
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });
      if (alive) animFrameRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [active]);

  if (!active) return null;
  return (
    <canvas ref={canvasRef} style={{
      position: 'absolute', top: '-30%', left: '-30%',
      width: '160%', height: '160%', pointerEvents: 'none', zIndex: 10,
    }} />
  );
}

// ═══════════════════════════════════════════════════════
// Chain-break particle system — metal shards
// ═══════════════════════════════════════════════════════
function ChainBreakExplosion({ active }) {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);

  useEffect(() => {
    if (!active || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const w = canvas.width = canvas.offsetWidth * 2;
    const h = canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);
    const cw = w / 2;
    const ch = h / 2;

    const metalColors = ['#d4a017', '#c9960c', '#b8860b', '#ffd700', '#e6be44', '#fff8dc', '#ff8c00'];
    const particles = [];
    for (let i = 0; i < 50; i++) {
      const angle = (Math.PI * 2 * i) / 50 + (Math.random() - 0.5) * 0.8;
      const speed = 3 + Math.random() * 7;
      const size = 2 + Math.random() * 5;
      particles.push({
        x: cw, y: ch * 0.55,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        size, color: metalColors[Math.floor(Math.random() * metalColors.length)],
        life: 1, decay: 0.012 + Math.random() * 0.02,
        gravity: 0.08 + Math.random() * 0.05,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.5,
        type: Math.random() > 0.3 ? 'shard' : 'spark',
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, cw, ch);
      let alive = false;
      particles.forEach(p => {
        if (p.life <= 0) return;
        alive = true;
        p.x += p.vx; p.y += p.vy;
        p.vy += p.gravity; p.vx *= 0.97;
        p.life -= p.decay; p.rotation += p.rotSpeed;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = Math.max(0, p.life);
        if (p.type === 'shard') {
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size * 0.6, -p.size * 0.3, p.size * 1.2, p.size * 0.6);
          ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 0.5;
          ctx.strokeRect(-p.size * 0.6, -p.size * 0.3, p.size * 1.2, p.size * 0.6);
        } else {
          ctx.fillStyle = p.color;
          ctx.shadowColor = '#ffd700'; ctx.shadowBlur = p.size * 3;
          ctx.beginPath(); ctx.arc(0, 0, p.size * 0.6, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      });
      if (alive) animFrameRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [active]);

  if (!active) return null;
  return (
    <canvas ref={canvasRef} style={{
      position: 'absolute', top: '-30%', left: '-30%',
      width: '160%', height: '160%', pointerEvents: 'none', zIndex: 15,
    }} />
  );
}

// ═══════════════════════════════════════════════════════
// TreasureChest — Chain lock + password popup system
// ═══════════════════════════════════════════════════════
//
// Flow:
//   1. Chained → click chain → chain shakes ~1s → error buzz → popup appears
//   2. Popup: taunt message + password input
//   3. Wrong password → error buzz + shake input
//   4. Correct password → chain explodes → chest unlockable
//   5. Click chest → shake → open with dual sparkles
//
export default function TreasureChest({ label, locked, chained, password, taunt, onOpen, onUnchain, alreadyOpened, solved, game, onReplay, replayLabel, matrixClue, caseSensitive, nearMiss }) {
  const [opened, setOpened] = useState(alreadyOpened || solved || false);
  const [animating, setAnimating] = useState(false);
  const [showSparkles, setShowSparkles] = useState(false);

  // Chain states
  const [chainState, setChainState] = useState((chained && !alreadyOpened && !solved) ? 'chained' : 'unchained');
  const [chainShaking, setChainShaking] = useState(false);
  const [showChainBreak, setShowChainBreak] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [pwInput, setPwInput] = useState('');
  const [pwError, setPwError] = useState(false);
  const [pwErrorMsg, setPwErrorMsg] = useState('');

  const audioRef = useRef(null);
  const errorAudioRef = useRef(null);
  const chainBreakAudioRef = useRef(null);
  const inputRef = useRef(null);

  // Sync opened state when props change (e.g. after async loadData)
  useEffect(() => {
    if (alreadyOpened || solved) {
      setOpened(true);
      setChainState('unchained');
    }
  }, [alreadyOpened, solved]);

  // Focus input when popup appears
  useEffect(() => {
    if (showPopup && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [showPopup]);

  const playErrorSound = () => {
    try {
      if (!errorAudioRef.current) {
        errorAudioRef.current = new Audio('/assets/error-buzz.mp3');
      }
      errorAudioRef.current.currentTime = 0;
      errorAudioRef.current.play().catch(() => {});
    } catch (e) {}
  };

  const handleChainClick = () => {
    if (chainState !== 'chained' || chainShaking || showPopup) return;

    // Step 1: chain shakes for ~1s
    setChainShaking(true);
    playErrorSound();

    // Step 2: after shake, show popup
    setTimeout(() => {
      setChainShaking(false);
      setShowPopup(true);
    }, 1000);
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (!password) return;

    const match = caseSensitive
      ? pwInput.trim() === password.trim()
      : pwInput.trim().toLowerCase() === password.trim().toLowerCase();
    if (match) {
      // Correct! Close popup first, wait 1s, then break chain with sound
      setPwError(false);
      setShowPopup(false);

      // Wait 1 second before chain breaks
      setTimeout(() => {
        // Play chain break sound
        try {
          if (!chainBreakAudioRef.current) {
            chainBreakAudioRef.current = new Audio('/assets/chain-break.wav');
          }
          chainBreakAudioRef.current.currentTime = 0;
          chainBreakAudioRef.current.play().catch(() => {});
        } catch (e) {}

        setChainState('breaking');
        setShowChainBreak(true);

        setTimeout(() => {
          setChainState('unchained');
          setShowChainBreak(false);
          if (onUnchain) onUnchain();
        }, 1200);
      }, 1000);
    } else {
      // Check near miss first
      const inputLower = pwInput.trim().toLowerCase();
      let nearMsg = '';
      if (nearMiss) {
        Object.entries(nearMiss).forEach(([key, msg]) => {
          if (inputLower === key.toLowerCase()) nearMsg = msg;
        });
      }
      setPwError(true);
      setPwErrorMsg(nearMsg || '❌ Falsches Passwort! Versuch\'s nochmal...');
      setPwInput('');
      playErrorSound();
      setTimeout(() => { setPwError(false); setPwErrorMsg(''); }, 2000);
    }
  };

  const handleClosePopup = () => {
    setShowPopup(false);
    setPwInput('');
    setPwError(false);
    setPwErrorMsg('');
  };

  const handleChestClick = () => {
    if (opened || locked || animating) return;
    if (chainState !== 'unchained') return;

    setAnimating(true);
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio('/assets/chest-open.wav');
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    } catch (e) {}

    setTimeout(() => {
      setOpened(true);
      setShowSparkles(true);
      setAnimating(false);
      if (onOpen) onOpen();
      setTimeout(() => setShowSparkles(false), 2000);
    }, 600);
  };

  const handleClick = () => {
    if (locked) return;
    if (chainState === 'chained' && !showPopup) {
      handleChainClick();
    } else if (chainState === 'unchained') {
      handleChestClick();
    }
  };

  const defaultTaunt = 'Krame, so einfach isses net! Erstmal korrektes Passwort eingeben!';
  const displayTaunt = taunt || defaultTaunt;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
      cursor: locked ? 'not-allowed' : opened ? 'default' : 'pointer',
      opacity: locked ? 0.4 : 1,
      transition: 'opacity 0.3s ease',
      WebkitTapHighlightColor: 'transparent',
      position: 'relative',
    }}>

      {/* Chest Image with Chain Overlay */}
      <div
        onClick={handleClick}
        style={{
          position: 'relative',
          width: 'clamp(120px, 30vw, 160px)',
          height: 'clamp(120px, 30vw, 160px)',
          animation: animating ? 'chestShake 0.6s ease'
            : chainState === 'breaking' ? 'chestShake 0.4s ease 2' : 'none',
        }}
      >
        <SparkleExplosion active={showSparkles} />
        <ChainBreakExplosion active={showChainBreak} />

        {/* Chest image */}
        <img
          src={opened ? '/assets/treasure-opened.webp' : '/assets/treasure-closed.webp'}
          alt={opened ? 'Offene Truhe' : 'Geschlossene Truhe'}
          style={{
            width: '100%', height: '100%', objectFit: 'contain',
            filter: opened
              ? 'drop-shadow(0 0 20px rgba(245, 158, 11, 0.4))'
              : 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))',
            transition: 'filter 0.3s ease',
            position: 'relative', zIndex: 1,
          }}
        />

        {/* Chain overlay */}
        {chainState !== 'unchained' && (
          <img
            src="/assets/treasure-chain.webp"
            alt="Kette"
            style={{
              position: 'absolute', top: 0, left: 0,
              width: '100%', height: '100%', objectFit: 'contain',
              zIndex: 2, pointerEvents: 'none',
              opacity: chainState === 'breaking' ? 0 : 1,
              transform: chainState === 'breaking' ? 'scale(1.3)' : 'scale(1)',
              transition: 'opacity 0.5s ease, transform 0.5s ease',
              filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.6))',
              animation: chainShaking ? 'chainRattle 0.12s ease infinite' : 'none',
            }}
          />
        )}

        {/* Glow when opened */}
        {opened && (
          <div style={{
            position: 'absolute', top: '20%', left: '10%', right: '10%', bottom: '30%',
            background: 'radial-gradient(ellipse, rgba(245, 158, 11, 0.3) 0%, transparent 70%)',
            pointerEvents: 'none', animation: 'glowPulse 2s ease infinite', zIndex: 0,
          }} />
        )}
      </div>

      {/* ─── Password Popup ─── */}
      {showPopup && chainState === 'chained' && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 50,
            width: 'clamp(260px, 75vw, 340px)',
            animation: 'popupAppear 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          {/* Backdrop blur overlay */}
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            zIndex: -1,
          }} onClick={handleClosePopup} />

          {/* Popup card */}
          <div style={{
            background: 'linear-gradient(145deg, rgba(30,30,40,0.97), rgba(20,20,28,0.98))',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 16,
            padding: 'clamp(20px, 5vw, 28px)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 30px rgba(245, 158, 11, 0.1)',
          }}>
            {/* Close button */}
            <button
              onClick={handleClosePopup}
              style={{
                position: 'absolute', top: 10, right: 14,
                background: 'none', border: 'none',
                color: 'rgba(255,255,255,0.3)', fontSize: 20,
                cursor: 'pointer', lineHeight: 1,
              }}
            >×</button>

            {/* Lock icon */}
            <div style={{
              textAlign: 'center', fontSize: 36, marginBottom: 12,
            }}>🔐</div>

            {/* Taunt message */}
            <div style={{
              fontSize: 'clamp(13px, 3.5vw, 15px)',
              color: '#fbbf24',
              textAlign: 'center',
              lineHeight: 1.5,
              marginBottom: 20,
              fontStyle: 'italic',
            }}>
              {displayTaunt}
            </div>

            {/* Password form */}
            <form onSubmit={handlePasswordSubmit}>
              <input
                ref={inputRef}
                type="text"
                value={pwInput}
                onChange={e => setPwInput(e.target.value)}
                placeholder="Passwort eingeben..."
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: 'clamp(14px, 3.5vw, 16px)',
                  background: pwError ? 'rgba(239, 68, 68, 0.12)' : 'rgba(255,255,255,0.06)',
                  border: `2px solid ${pwError ? 'rgba(239, 68, 68, 0.5)' : 'rgba(245, 158, 11, 0.25)'}`,
                  borderRadius: 12,
                  color: '#fff',
                  outline: 'none',
                  textAlign: 'center',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.3s, background 0.3s',
                  animation: pwError ? 'inputShake 0.4s ease' : 'none',
                }}
              />

              {pwError && (
                <div style={{
                  fontSize: 'clamp(11px, 2.8vw, 13px)',
                  color: '#ef4444',
                  textAlign: 'center',
                  marginTop: 8,
                  animation: 'fadeSlideIn 0.2s ease',
                }}>
                  {pwErrorMsg}
                </div>
              )}

              <button
                type="submit"
                style={{
                  width: '100%',
                  marginTop: 14,
                  padding: '12px',
                  fontSize: 'clamp(13px, 3.2vw, 15px)',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(245, 158, 11, 0.15))',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  borderRadius: 12,
                  color: '#fbbf24',
                  cursor: 'pointer',
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                }}
              >
                🔓 Entfesseln
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Label */}
      <div style={{
        padding: '8px 20px',
        background: solved
          ? 'rgba(74, 222, 128, 0.1)'
          : (opened && game) ? 'rgba(245, 158, 11, 0.08)'
          : opened ? 'rgba(74, 222, 128, 0.1)'
          : locked ? 'rgba(255,255,255,0.03)'
          : chainState === 'chained' ? 'rgba(245, 158, 11, 0.06)'
          : 'rgba(96, 165, 250, 0.08)',
        border: `1px solid ${
          solved ? 'rgba(74, 222, 128, 0.25)'
          : (opened && game) ? 'rgba(245, 158, 11, 0.25)'
          : opened ? 'rgba(74, 222, 128, 0.25)'
          : locked ? 'rgba(255,255,255,0.06)'
          : chainState === 'chained' ? 'rgba(245, 158, 11, 0.2)'
          : 'rgba(96, 165, 250, 0.2)'
        }`,
        borderRadius: 12,
        fontSize: 'clamp(13px, 3.2vw, 15px)',
        fontWeight: 500,
        color: solved ? '#4ade80'
          : (opened && game) ? '#fbbf24'
          : opened ? '#4ade80'
          : locked ? 'rgba(255,255,255,0.3)'
          : chainState === 'chained' ? '#fbbf24' : '#fff',
        textAlign: 'center',
        minWidth: 'clamp(140px, 35vw, 180px)',
      }}>
        {locked ? '🔒 ' : solved ? '✅ ' : (opened && game) ? '🎮 ' : opened ? '✅ ' : chainState === 'chained' ? '⛓️ ' : ''}{label}
      </div>

      {/* Game status + actions for opened game chests */}
      {opened && game && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        }}>
          {solved ? (
            <>
              {/* Matrix clue revealed */}
              {matrixClue && (
                <div style={{
                  padding: '6px 16px',
                  background: 'rgba(74, 222, 128, 0.08)',
                  border: '1px solid rgba(74, 222, 128, 0.2)',
                  borderRadius: 10,
                  fontSize: 'clamp(11px, 2.8vw, 13px)',
                  color: '#4ade80',
                  fontWeight: 600,
                  letterSpacing: 1,
                }}>
                  🔑 Matrix-Code: {matrixClue}
                </div>
              )}
              {onReplay && (
                <button
                  onClick={onReplay}
                  style={{
                    padding: '5px 14px',
                    background: 'rgba(96, 165, 250, 0.08)',
                    border: '1px solid rgba(96, 165, 250, 0.2)',
                    borderRadius: 10,
                    color: '#60a5fa',
                    fontSize: 'clamp(10px, 2.5vw, 12px)',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  {replayLabel || '🎮 Nochmal spielen'}
                </button>
              )}
            </>
          ) : (
            <>
              {/* Game not yet beaten */}
              <div style={{
                fontSize: 'clamp(10px, 2.5vw, 12px)',
                color: 'rgba(245, 158, 11, 0.7)',
                fontStyle: 'italic',
              }}>
                ❌ Spiel noch nicht geschafft
              </div>
              {onReplay && (
                <button
                  onClick={onReplay}
                  style={{
                    padding: '6px 16px',
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: 10,
                    color: '#fbbf24',
                    fontSize: 'clamp(11px, 2.8vw, 13px)',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  🎮 Spiel starten
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes chestShake {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          10% { transform: translateX(-4px) rotate(-2deg); }
          20% { transform: translateX(4px) rotate(2deg); }
          30% { transform: translateX(-6px) rotate(-3deg); }
          40% { transform: translateX(6px) rotate(3deg); }
          50% { transform: translateX(-4px) rotate(-2deg); }
          60% { transform: translateX(4px) rotate(2deg); }
          70% { transform: translateX(-3px) rotate(-1deg); }
          80% { transform: translateX(3px) rotate(1deg); }
          90% { transform: translateX(-1px) rotate(0deg); }
        }
        @keyframes chainRattle {
          0% { transform: translateX(-3px) rotate(-1deg); }
          25% { transform: translateX(3px) rotate(1deg); }
          50% { transform: translateX(-2px) rotate(-0.5deg); }
          75% { transform: translateX(2px) rotate(0.5deg); }
          100% { transform: translateX(-3px) rotate(-1deg); }
        }
        @keyframes glowPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes popupAppear {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes inputShake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}
