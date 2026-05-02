import React, { useState, useRef, useEffect } from 'react';

// ═══════════════════════════════════════════════════════
// Sparkle particle system — now fires from BOTH sides
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

    // Create particles from TWO origins (left + right)
    const origins = [
      { x: cw * 0.3, y: ch * 0.5 },  // left
      { x: cw * 1.7, y: ch * 0.5 },  // right
    ];

    origins.forEach(origin => {
      for (let i = 0; i < 35; i++) {
        const angle = (Math.PI * 2 * i) / 35 + (Math.random() - 0.5) * 0.5;
        const speed = 2 + Math.random() * 5;
        const size = 2 + Math.random() * 4;
        particles.push({
          x: origin.x,
          y: origin.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2,
          size,
          color: sparkColors[Math.floor(Math.random() * sparkColors.length)],
          life: 1,
          decay: 0.01 + Math.random() * 0.02,
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

        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= 0.98;
        p.life -= p.decay;
        p.rotation += p.rotSpeed;

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
          ctx.closePath();
          ctx.fill();
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

      if (alive) {
        animFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animate();
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: '-30%',
        left: '-30%',
        width: '160%',
        height: '160%',
        pointerEvents: 'none',
        zIndex: 10,
      }}
    />
  );
}

// ═══════════════════════════════════════════════════════
// Chain-break particle system — metal shards flying out
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

    // Particles from center (the lock breaking)
    for (let i = 0; i < 50; i++) {
      const angle = (Math.PI * 2 * i) / 50 + (Math.random() - 0.5) * 0.8;
      const speed = 3 + Math.random() * 7;
      const size = 2 + Math.random() * 5;
      particles.push({
        x: cw,
        y: ch * 0.55,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        size,
        color: metalColors[Math.floor(Math.random() * metalColors.length)],
        life: 1,
        decay: 0.012 + Math.random() * 0.02,
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

        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= 0.97;
        p.life -= p.decay;
        p.rotation += p.rotSpeed;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = Math.max(0, p.life);

        if (p.type === 'shard') {
          // Metal chain shard
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size * 0.6, -p.size * 0.3, p.size * 1.2, p.size * 0.6);
          ctx.strokeStyle = 'rgba(0,0,0,0.3)';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(-p.size * 0.6, -p.size * 0.3, p.size * 1.2, p.size * 0.6);
        } else {
          // Flying spark
          ctx.fillStyle = p.color;
          ctx.shadowColor = '#ffd700';
          ctx.shadowBlur = p.size * 3;
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.6, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      });

      if (alive) {
        animFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animate();
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: '-30%',
        left: '-30%',
        width: '160%',
        height: '160%',
        pointerEvents: 'none',
        zIndex: 15,
      }}
    />
  );
}

// ═══════════════════════════════════════════════════════
// TreasureChest — now with chain lock + password system
// ═══════════════════════════════════════════════════════
//
// Props:
//   label       — display name
//   locked      — fully locked (greyed out, no interaction)
//   chained     — has chain overlay, needs password to unlock
//   password    — the password to break the chain (case-insensitive)
//   onOpen      — called when chest is opened
//   onUnchain   — called when chain is broken
//
export default function TreasureChest({ label, locked, chained, password, onOpen, onUnchain }) {
  const [opened, setOpened] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [showSparkles, setShowSparkles] = useState(false);

  // Chain states: 'chained' → 'breaking' → 'unchained'
  const [chainState, setChainState] = useState(chained ? 'chained' : 'unchained');
  const [showChainBreak, setShowChainBreak] = useState(false);
  const [pwInput, setPwInput] = useState('');
  const [pwError, setPwError] = useState(false);
  const [showPwInput, setShowPwInput] = useState(false);

  const audioRef = useRef(null);
  const inputRef = useRef(null);

  // Focus input when shown
  useEffect(() => {
    if (showPwInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showPwInput]);

  const handleChainClick = () => {
    if (chainState !== 'chained') return;
    setShowPwInput(true);
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (!password) return;

    if (pwInput.trim().toLowerCase() === password.trim().toLowerCase()) {
      // Correct! Break the chain
      setPwError(false);
      setShowPwInput(false);
      setChainState('breaking');
      setShowChainBreak(true);

      // After break animation, remove chain
      setTimeout(() => {
        setChainState('unchained');
        setShowChainBreak(false);
        if (onUnchain) onUnchain();
      }, 1200);
    } else {
      setPwError(true);
      setPwInput('');
      setTimeout(() => setPwError(false), 1500);
    }
  };

  const handleChestClick = () => {
    if (opened || locked || animating) return;
    if (chainState !== 'unchained') return;

    setAnimating(true);

    // Play sound
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio('/assets/chest-open.wav');
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    } catch (e) {}

    // Shake animation, then open with sparkles
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
    if (chainState === 'chained') {
      handleChainClick();
    } else if (chainState === 'unchained') {
      handleChestClick();
    }
  };

  const isInteractive = !locked && !opened && chainState !== 'breaking';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        cursor: locked ? 'not-allowed' : !isInteractive ? 'default' : 'pointer',
        opacity: locked ? 0.4 : 1,
        transition: 'opacity 0.3s ease',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
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
        {/* Sparkle Explosion (chest opening — from both sides) */}
        <SparkleExplosion active={showSparkles} />

        {/* Chain Break Explosion (metal shards) */}
        <ChainBreakExplosion active={showChainBreak} />

        {/* The chest image */}
        <img
          src={opened ? '/assets/treasure-opened.webp' : '/assets/treasure-closed.webp'}
          alt={opened ? 'Offene Truhe' : 'Geschlossene Truhe'}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            filter: opened
              ? 'drop-shadow(0 0 20px rgba(245, 158, 11, 0.4))'
              : 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))',
            transition: 'filter 0.3s ease',
            position: 'relative',
            zIndex: 1,
          }}
        />

        {/* Chain overlay */}
        {chainState !== 'unchained' && (
          <img
            src="/assets/treasure-chain.webp"
            alt="Kette"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              zIndex: 2,
              pointerEvents: 'none',
              opacity: chainState === 'breaking' ? 0 : 1,
              transform: chainState === 'breaking' ? 'scale(1.3)' : 'scale(1)',
              transition: 'opacity 0.5s ease, transform 0.5s ease',
              filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.6))',
            }}
          />
        )}

        {/* Glow when opened */}
        {opened && (
          <div style={{
            position: 'absolute',
            top: '20%',
            left: '10%',
            right: '10%',
            bottom: '30%',
            background: 'radial-gradient(ellipse, rgba(245, 158, 11, 0.3) 0%, transparent 70%)',
            pointerEvents: 'none',
            animation: 'glowPulse 2s ease infinite',
            zIndex: 0,
          }} />
        )}
      </div>

      {/* Password Input (shown when chain is clicked) */}
      {showPwInput && chainState === 'chained' && (
        <form
          onSubmit={handlePasswordSubmit}
          onClick={e => e.stopPropagation()}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            animation: 'fadeSlideIn 0.3s ease',
          }}
        >
          <div style={{
            fontSize: 'clamp(10px, 2.5vw, 12px)',
            color: 'rgba(255,255,255,0.5)',
            textAlign: 'center',
          }}>
            🔐 Passwort eingeben:
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              ref={inputRef}
              type="text"
              value={pwInput}
              onChange={e => setPwInput(e.target.value)}
              placeholder="Lösung..."
              style={{
                padding: '8px 14px',
                fontSize: 'clamp(13px, 3.2vw, 15px)',
                background: pwError ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${pwError ? 'rgba(239, 68, 68, 0.5)' : 'rgba(255,255,255,0.15)'}`,
                borderRadius: 10,
                color: '#fff',
                outline: 'none',
                textAlign: 'center',
                width: 'clamp(140px, 40vw, 200px)',
                transition: 'border-color 0.3s, background 0.3s',
                animation: pwError ? 'inputShake 0.4s ease' : 'none',
              }}
            />
            <button
              type="submit"
              style={{
                padding: '8px 14px',
                fontSize: 'clamp(13px, 3.2vw, 15px)',
                background: 'rgba(245, 158, 11, 0.2)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                borderRadius: 10,
                color: '#fbbf24',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              🔓
            </button>
          </div>
          {pwError && (
            <div style={{
              fontSize: 'clamp(10px, 2.5vw, 12px)',
              color: '#ef4444',
              animation: 'fadeSlideIn 0.2s ease',
            }}>
              Falsches Passwort!
            </div>
          )}
        </form>
      )}

      {/* Label */}
      <div style={{
        padding: '8px 20px',
        background: opened
          ? 'rgba(74, 222, 128, 0.1)'
          : locked
          ? 'rgba(255,255,255,0.03)'
          : chainState === 'chained'
          ? 'rgba(245, 158, 11, 0.06)'
          : 'rgba(96, 165, 250, 0.08)',
        border: `1px solid ${
          opened ? 'rgba(74, 222, 128, 0.25)'
          : locked ? 'rgba(255,255,255,0.06)'
          : chainState === 'chained' ? 'rgba(245, 158, 11, 0.2)'
          : 'rgba(96, 165, 250, 0.2)'
        }`,
        borderRadius: 12,
        fontSize: 'clamp(13px, 3.2vw, 15px)',
        fontWeight: 500,
        color: opened ? '#4ade80'
          : locked ? 'rgba(255,255,255,0.3)'
          : chainState === 'chained' ? '#fbbf24'
          : '#fff',
        textAlign: 'center',
        minWidth: 'clamp(140px, 35vw, 180px)',
      }}>
        {locked ? '🔒 ' : opened ? '✅ ' : chainState === 'chained' ? '⛓️ ' : ''}{label}
      </div>

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
        @keyframes glowPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
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
