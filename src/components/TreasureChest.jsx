import React, { useState, useRef, useEffect } from 'react';

// Sparkle particle system
function SparkleExplosion({ active }) {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
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

    // Create particles
    const colors = ['#f59e0b', '#fbbf24', '#fcd34d', '#fff', '#4ade80', '#fb923c', '#f97316'];
    const particles = [];
    for (let i = 0; i < 40; i++) {
      const angle = (Math.PI * 2 * i) / 40 + (Math.random() - 0.5) * 0.5;
      const speed = 2 + Math.random() * 5;
      const size = 2 + Math.random() * 4;
      particles.push({
        x: cw,
        y: ch * 0.6,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        size,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1,
        decay: 0.01 + Math.random() * 0.02,
        gravity: 0.05 + Math.random() * 0.03,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.3,
        type: Math.random() > 0.5 ? 'star' : 'circle',
      });
    }
    particlesRef.current = particles;

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
          // Draw a 4-point star
          ctx.fillStyle = p.color;
          ctx.beginPath();
          for (let i = 0; i < 8; i++) {
            const r = i % 2 === 0 ? p.size : p.size * 0.4;
            const a = (Math.PI * 2 * i) / 8;
            if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
            else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          }
          ctx.closePath();
          ctx.fill();
        } else {
          // Draw glowing circle
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

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
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

export default function TreasureChest({ label, locked, onOpen }) {
  const [opened, setOpened] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [showSparkles, setShowSparkles] = useState(false);
  const audioRef = useRef(null);

  const handleClick = () => {
    if (opened || locked || animating) return;

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

      // Remove sparkles after animation
      setTimeout(() => setShowSparkles(false), 2000);
    }, 600);
  };

  return (
    <div
      onClick={handleClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        cursor: locked ? 'not-allowed' : opened ? 'default' : 'pointer',
        opacity: locked ? 0.4 : 1,
        transition: 'opacity 0.3s ease',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* Chest Image */}
      <div style={{
        position: 'relative',
        width: 'clamp(120px, 30vw, 160px)',
        height: 'clamp(120px, 30vw, 160px)',
        animation: animating ? 'chestShake 0.6s ease' : 'none',
      }}>
        {/* Sparkle Explosion */}
        <SparkleExplosion active={showSparkles} />

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

      {/* Label */}
      <div style={{
        padding: '8px 20px',
        background: opened
          ? 'rgba(74, 222, 128, 0.1)'
          : locked
          ? 'rgba(255,255,255,0.03)'
          : 'rgba(96, 165, 250, 0.08)',
        border: `1px solid ${
          opened ? 'rgba(74, 222, 128, 0.25)'
          : locked ? 'rgba(255,255,255,0.06)'
          : 'rgba(96, 165, 250, 0.2)'
        }`,
        borderRadius: 12,
        fontSize: 'clamp(13px, 3.2vw, 15px)',
        fontWeight: 500,
        color: opened ? '#4ade80' : locked ? 'rgba(255,255,255,0.3)' : '#fff',
        textAlign: 'center',
        minWidth: 'clamp(140px, 35vw, 180px)',
      }}>
        {locked ? '🔒 ' : opened ? '✅ ' : ''}{label}
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
      `}</style>
    </div>
  );
}
