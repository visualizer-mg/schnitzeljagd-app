import React, { useState, useRef } from 'react';

export default function TreasureChest({ label, locked, onOpen }) {
  const [opened, setOpened] = useState(false);
  const [animating, setAnimating] = useState(false);
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

    // Shake animation, then open
    setTimeout(() => {
      setOpened(true);
      setAnimating(false);
      if (onOpen) onOpen();
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
