import React, { useRef, useEffect, useState, useCallback } from 'react';
import { colors, fonts } from '../theme';

// ─── Config ───
const CANVAS_W = 400;
const CANVAS_H = 600;
const HORSE_W = 38;
const HORSE_H = 36;
const GRAVITY = 0.032;          // slightly snappier for mobile 60fps
const BOUNCE_FORCE = -2.9;      // compensate for stronger gravity — similar height
const HAY_BOUNCE = -4.8;        // super bounce — adjusted for mobile 60fps
const PLATFORM_W = 60;
const PLATFORM_H = 12;
const TARGET_HEIGHT = 15000;
const PLATFORM_COUNT = 12;      // visible platforms on screen at once
const MOVE_SPEED = 5.5;         // keyboard/touch horizontal speed

// Platform types
const PLAT_NORMAL = 'normal';
const PLAT_BREAK = 'break';     // breaks after landing
const PLAT_MOVE = 'move';       // moves horizontally
const PLAT_ICE = 'ice';         // slippery
const PLAT_HAY = 'hay';         // super bounce

// ─── Draw Horse (reused sprite, facing right, compact) ───
function drawHorse(ctx, x, y, frame, facingLeft) {
  ctx.save();
  ctx.translate(x, y);
  if (facingLeft) { ctx.scale(-1, 1); }

  const legPhase = frame * 0.2;
  const fl = Math.sin(legPhase) * 4;
  const bl = Math.sin(legPhase + Math.PI) * 4;

  // Legs
  ctx.strokeStyle = '#5C3317'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(-9, 6); ctx.lineTo(-11 + bl, 16); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-6, 6); ctx.lineTo(-8 + bl * 0.8, 16); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(8, 5); ctx.lineTo(10 + fl, 16); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(11, 5); ctx.lineTo(13 + fl * 0.8, 16); ctx.stroke();

  // Body
  ctx.fillStyle = '#8B5E3C';
  ctx.beginPath(); ctx.ellipse(0, 0, 16, 9, 0, 0, Math.PI * 2); ctx.fill();

  // Saddle
  ctx.fillStyle = '#C41E3A';
  ctx.beginPath(); ctx.ellipse(-1, -5, 7, 4, -0.1, Math.PI, 0); ctx.fill();

  // Neck
  ctx.fillStyle = '#8B5E3C';
  ctx.beginPath();
  ctx.moveTo(10, -3); ctx.quadraticCurveTo(16, -13, 18, -18);
  ctx.lineTo(13, -16); ctx.quadraticCurveTo(12, -9, 7, -1);
  ctx.fill();

  // Head
  ctx.fillStyle = '#9B6E4C';
  ctx.beginPath(); ctx.ellipse(19, -19, 7, 5, 0.4, 0, Math.PI * 2); ctx.fill();

  // Eye
  ctx.fillStyle = '#222';
  ctx.beginPath(); ctx.arc(22, -20, 1.3, 0, Math.PI * 2); ctx.fill();

  // Ear
  ctx.fillStyle = '#8B5E3C';
  ctx.beginPath(); ctx.moveTo(17, -23); ctx.lineTo(16, -29); ctx.lineTo(20, -25); ctx.fill();

  // Mane
  ctx.strokeStyle = '#3C1F0A'; ctx.lineWidth = 1.5;
  for (let i = 0; i < 4; i++) {
    const mx = 10 + i * 1.5, my = -4 - i * 3;
    ctx.beginPath(); ctx.moveTo(mx, my);
    ctx.quadraticCurveTo(mx - 5, my - 1, mx - 6, my + 3); ctx.stroke();
  }

  // Tail
  ctx.strokeStyle = '#3C1F0A'; ctx.lineWidth = 2;
  const ts = Math.sin(frame * 0.1) * 4;
  ctx.beginPath(); ctx.moveTo(-16, 1);
  ctx.quadraticCurveTo(-24 + ts, -3, -26 + ts, 6); ctx.stroke();

  ctx.restore();
}

function drawPlatform(ctx, p) {
  const x = p.x - p.w / 2;
  const y = p.y;

  if (p.type === PLAT_HAY) {
    // Hay bale — golden cylinder
    ctx.fillStyle = '#DAA520';
    ctx.beginPath();
    ctx.ellipse(p.x, y + 4, p.w / 2 + 2, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#C8961E';
    ctx.beginPath();
    ctx.ellipse(p.x, y, p.w / 2 + 2, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    // Straw lines
    ctx.strokeStyle = '#B8860B'; ctx.lineWidth = 1;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(p.x + i * 6, y - 6);
      ctx.lineTo(p.x + i * 6, y + 6);
      ctx.stroke();
    }
    // Rope
    ctx.strokeStyle = '#8B7355'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(p.x, y, p.w / 2 - 2, 6, 0, 0, Math.PI * 2);
    ctx.stroke();
    return;
  }

  if (p.type === PLAT_BREAK) {
    if (p.broken) {
      // Breaking animation — fragments
      ctx.fillStyle = `rgba(139, 90, 43, ${1 - (p.breakProgress || 0)})`;
      const segs = 4;
      for (let i = 0; i < segs; i++) {
        const sx = x + (p.w / segs) * i;
        const offY = (p.breakProgress || 0) * 30 * (i % 2 === 0 ? 1 : 0.6);
        const offX = (p.breakProgress || 0) * (i - 1.5) * 8;
        ctx.fillRect(sx + offX, y + offY, p.w / segs - 2, PLATFORM_H - 2);
      }
      return;
    }
    // Cracked look
    ctx.fillStyle = '#8B5A2B';
    ctx.fillRect(x, y, p.w, PLATFORM_H);
    ctx.strokeStyle = '#5C3317'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + p.w * 0.3, y); ctx.lineTo(x + p.w * 0.5, y + PLATFORM_H);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + p.w * 0.7, y); ctx.lineTo(x + p.w * 0.6, y + PLATFORM_H);
    ctx.stroke();
    // Warning cracks on top
    ctx.strokeStyle = '#3C1F0A'; ctx.lineWidth = 0.8;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(x + 2, y + 2); ctx.lineTo(x + p.w - 2, y + 2); ctx.stroke();
    ctx.setLineDash([]);
    return;
  }

  if (p.type === PLAT_ICE) {
    // Icy blue
    ctx.fillStyle = '#6CB6FF';
    ctx.fillRect(x, y, p.w, PLATFORM_H);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillRect(x + 4, y + 2, p.w * 0.3, 3);
    ctx.fillRect(x + p.w * 0.6, y + 2, p.w * 0.25, 3);
    ctx.strokeStyle = '#A5D6FF'; ctx.lineWidth = 1;
    ctx.strokeRect(x, y, p.w, PLATFORM_H);
    return;
  }

  if (p.type === PLAT_MOVE) {
    // Moving — has arrows
    ctx.fillStyle = '#4a7a3d';
    ctx.fillRect(x, y, p.w, PLATFORM_H);
    ctx.fillStyle = '#3d6830';
    ctx.fillRect(x, y + PLATFORM_H - 3, p.w, 3);
    // Arrow indicator
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '8px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('◄►', p.x, y + 9);
    return;
  }

  // Normal green platform
  ctx.fillStyle = '#4a7a3d';
  ctx.fillRect(x, y, p.w, PLATFORM_H);
  // Top highlight
  ctx.fillStyle = '#5a9a4d';
  ctx.fillRect(x, y, p.w, 3);
  // Grass tufts
  ctx.strokeStyle = '#6ab85d'; ctx.lineWidth = 1;
  for (let gx = x + 5; gx < x + p.w - 5; gx += 10) {
    ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx - 2, y - 4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(gx + 3, y); ctx.lineTo(gx + 5, y - 3); ctx.stroke();
  }
}

// ─── Generate platforms ───
function generatePlatform(y, heightMeter, prevX) {
  const progress = Math.min(1, heightMeter / TARGET_HEIGHT);

  // Platform width shrinks with height
  const w = Math.max(35, PLATFORM_W - progress * 20);

  // X position — keep reachable from previous platform
  let x;
  if (prevX !== null) {
    const maxJump = 120 + (1 - progress) * 40;
    x = prevX + (Math.random() - 0.5) * maxJump * 2;
    x = Math.max(w / 2 + 5, Math.min(CANVAS_W - w / 2 - 5, x));
  } else {
    x = CANVAS_W / 2;
  }

  // Type selection — fully random from the start, every run different
  let type = PLAT_NORMAL;
  const roll = Math.random();

  if (roll < 0.05) {
    type = PLAT_HAY;          // 5% hay bale (super bounce)
  } else if (roll < 0.15) {
    type = PLAT_ICE;          // 10% ice (slippery)
  } else if (roll < 0.28) {
    type = PLAT_MOVE;         // 13% moving
  } else if (roll < 0.42) {
    type = PLAT_BREAK;        // 14% breakable
  }
  // remaining 58% = normal

  return {
    x, y, w,
    type,
    broken: false,
    breakProgress: 0,
    moveDir: Math.random() < 0.5 ? 1 : -1,
    moveSpeed: 0.5 + progress * 1.5,
  };
}

// ─── Background drawing ───
function drawBackground(ctx, cameraY, heightMeter) {
  const progress = Math.min(1, heightMeter / TARGET_HEIGHT);

  // Sky gradient shifts with altitude
  const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  if (progress < 0.3) {
    grad.addColorStop(0, '#4a90d9');
    grad.addColorStop(1, '#87ceeb');
  } else if (progress < 0.6) {
    grad.addColorStop(0, '#2a5a9a');
    grad.addColorStop(1, '#6aadda');
  } else if (progress < 0.85) {
    grad.addColorStop(0, '#1a2a5a');
    grad.addColorStop(1, '#3a6a9a');
  } else {
    grad.addColorStop(0, '#0a0a2a');
    grad.addColorStop(1, '#1a2a5a');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Clouds — parallax based on camera
  const cloudAlpha = Math.max(0.05, 0.25 - progress * 0.2);
  ctx.fillStyle = `rgba(255, 255, 255, ${cloudAlpha})`;
  for (let i = 0; i < 5; i++) {
    const seed = i * 137.5;
    const cx = ((seed * 7) % CANVAS_W);
    const cy = ((seed * 13 + cameraY * 0.05 * (i * 0.3 + 0.5)) % (CANVAS_H + 100)) - 50;
    const cw = 30 + (i * 11) % 20;
    ctx.beginPath(); ctx.ellipse(cx, cy, cw, 10 + i * 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx - cw * 0.4, cy + 3, cw * 0.6, 8, 0, 0, Math.PI * 2); ctx.fill();
  }

  // Stars appear at high altitude
  if (progress > 0.6) {
    const starAlpha = (progress - 0.6) * 2;
    ctx.fillStyle = `rgba(255, 255, 255, ${starAlpha * 0.7})`;
    for (let i = 0; i < 30; i++) {
      const sx = (i * 73.7) % CANVAS_W;
      const sy = (i * 131.3 + cameraY * 0.02) % CANVAS_H;
      const ss = 1 + (i % 3) * 0.5;
      ctx.fillRect(sx, sy, ss, ss);
    }
  }

  // Height markers every 500m
  ctx.font = `9px ${fonts.mono}`;
  ctx.fillStyle = `rgba(255,255,255,0.15)`;
  ctx.textAlign = 'right';
  const startMark = Math.floor(heightMeter / 500) * 500;
  for (let m = startMark; m <= startMark + 1000; m += 500) {
    if (m <= 0) continue;
    const markerScreenY = CANVAS_H - (m * (CANVAS_H / 600) - cameraY * (CANVAS_H / 600));
    if (markerScreenY > 0 && markerScreenY < CANVAS_H) {
      ctx.fillText(`${m}m ─`, CANVAS_W - 8, markerScreenY);
    }
  }
}

// ─── Main Component ───
export default function HorseGame({ onWin, matrixClue }) {
  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const [height, setHeight] = useState(0);
  const [gameState, setGameState] = useState('start');

  const initGame = useCallback(() => {
    // Generate initial platforms
    const platforms = [];
    let lastX = CANVAS_W / 2;
    // Ground platform
    platforms.push({ x: CANVAS_W / 2, y: CANVAS_H - 40, w: CANVAS_W, type: PLAT_NORMAL, broken: false, breakProgress: 0, moveDir: 1, moveSpeed: 0 });
    // First few safe platforms
    for (let i = 1; i <= PLATFORM_COUNT; i++) {
      const py = CANVAS_H - 40 - i * 45;
      const p = generatePlatform(py, 0, lastX);
      p.type = PLAT_NORMAL; // first screen always normal
      platforms.push(p);
      lastX = p.x;
    }

    gameRef.current = {
      horse: { x: CANVAS_W / 2, y: CANVAS_H - 60, vx: 0, vy: 0 },
      platforms,
      cameraY: 0,
      maxHeight: 0,
      heightMeter: 0,
      frame: 0,
      running: true,
      facingLeft: false,
      keys: { left: false, right: false },
      touchX: null,
      lastPlatY: platforms[platforms.length - 1].y,
      lastPlatX: lastX,
      particles: [],
    };
  }, []);

  const startGame = useCallback(() => {
    initGame();
    setHeight(0);
    setGameState('playing');
  }, [initGame]);

  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const g = gameRef.current;
    let animId;

    // ─── Input ───
    const onKeyDown = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') { g.keys.left = true; e.preventDefault(); }
      if (e.key === 'ArrowRight' || e.key === 'd') { g.keys.right = true; e.preventDefault(); }
    };
    const onKeyUp = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') g.keys.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd') g.keys.right = false;
    };
    const onTouchMove = (e) => {
      if (e.cancelable) e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_W / rect.width;
      g.touchX = (e.touches[0].clientX - rect.left) * scaleX;
    };
    const onTouchStart = (e) => {
      if (e.cancelable) e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_W / rect.width;
      g.touchX = (e.touches[0].clientX - rect.left) * scaleX;
    };
    const onTouchEnd = () => { g.touchX = null; };
    const onMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_W / rect.width;
      g.touchX = (e.clientX - rect.left) * scaleX;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);
    canvas.addEventListener('mousemove', onMouseMove);

    // ─── Game Loop ───
    const loop = () => {
      if (!g.running) return;
      g.frame++;

      const h = g.horse;

      // ─── Horizontal movement ───
      if (g.keys.left) {
        h.vx = -MOVE_SPEED;
        g.facingLeft = true;
      } else if (g.keys.right) {
        h.vx = MOVE_SPEED;
        g.facingLeft = false;
      } else if (g.touchX !== null) {
        const diff = g.touchX - h.x;
        if (Math.abs(diff) > 5) {
          h.vx = Math.sign(diff) * Math.min(MOVE_SPEED, Math.abs(diff) * 0.15);
          g.facingLeft = diff < 0;
        } else {
          h.vx *= 0.8;
        }
      } else {
        h.vx *= 0.85; // friction
      }

      h.x += h.vx;

      // Wrap around edges
      if (h.x < -HORSE_W / 2) h.x = CANVAS_W + HORSE_W / 2;
      if (h.x > CANVAS_W + HORSE_W / 2) h.x = -HORSE_W / 2;

      // ─── Gravity ───
      h.vy += GRAVITY;
      h.y += h.vy;

      // ─── Platform collision (only when falling) ───
      if (h.vy > 0) {
        for (const p of g.platforms) {
          if (p.broken && p.breakProgress > 0.3) continue;

          const horseBottom = h.y + HORSE_H / 2;
          const horseLeft = h.x - HORSE_W / 2 + 4;
          const horseRight = h.x + HORSE_W / 2 - 4;
          const platLeft = p.x - p.w / 2;
          const platRight = p.x + p.w / 2;

          if (horseBottom >= p.y && horseBottom <= p.y + PLATFORM_H + h.vy &&
              horseRight > platLeft && horseLeft < platRight) {

            if (p.type === PLAT_BREAK) {
              // Bounce then break
              h.vy = BOUNCE_FORCE;
              h.y = p.y - HORSE_H / 2;
              p.broken = true;
              // Crack particles
              for (let i = 0; i < 4; i++) {
                g.particles.push({
                  x: p.x + (Math.random() - 0.5) * p.w,
                  y: p.y,
                  vx: (Math.random() - 0.5) * 3,
                  vy: -Math.random() * 2,
                  life: 1, color: '#8B5A2B',
                });
              }
            } else if (p.type === PLAT_HAY) {
              h.vy = HAY_BOUNCE;
              h.y = p.y - HORSE_H / 2;
              // Golden burst
              for (let i = 0; i < 8; i++) {
                g.particles.push({
                  x: p.x + (Math.random() - 0.5) * 20,
                  y: p.y,
                  vx: (Math.random() - 0.5) * 4,
                  vy: -2 - Math.random() * 3,
                  life: 1, color: '#DAA520',
                });
              }
            } else if (p.type === PLAT_ICE) {
              h.vy = BOUNCE_FORCE;
              h.y = p.y - HORSE_H / 2;
              // Slide — add horizontal velocity based on movement
              h.vx += (h.vx > 0 ? 1.5 : h.vx < 0 ? -1.5 : (Math.random() - 0.5) * 2);
            } else {
              h.vy = BOUNCE_FORCE;
              h.y = p.y - HORSE_H / 2;
            }
            break;
          }
        }
      }

      // ─── Update moving platforms ───
      g.platforms.forEach((p) => {
        if (p.type === PLAT_MOVE) {
          p.x += p.moveDir * p.moveSpeed;
          if (p.x - p.w / 2 < 5 || p.x + p.w / 2 > CANVAS_W - 5) {
            p.moveDir *= -1;
          }
        }
        if (p.broken) {
          p.breakProgress = Math.min(1, (p.breakProgress || 0) + 0.03);
        }
      });

      // ─── Camera ───
      const targetCamY = Math.max(g.cameraY, -(h.y - CANVAS_H * 0.38));
      g.cameraY += (targetCamY - g.cameraY) * 0.1;

      // ─── Track height ───
      const currentHeight = Math.max(0, -(h.y - (CANVAS_H - 60)));
      if (currentHeight > g.maxHeight) {
        g.maxHeight = currentHeight;
        g.heightMeter = Math.floor(g.maxHeight * 1.0);  // 1 pixel ≈ 1 meter
        setHeight(g.heightMeter);
      }

      // ─── Win condition ───
      if (g.heightMeter >= TARGET_HEIGHT) {
        g.running = false;
        setGameState('won');
      }

      // ─── Lose condition — fell below camera ───
      const screenY = h.y + g.cameraY;
      if (screenY > CANVAS_H + 60) {
        g.running = false;
        setGameState('lost');
      }

      // ─── Generate new platforms above ───
      const highestScreen = -g.cameraY - 100;
      while (g.lastPlatY > highestScreen) {
        const gap = 38 + Math.random() * 30 + Math.min(20, g.heightMeter / 200);
        g.lastPlatY -= gap;
        const np = generatePlatform(g.lastPlatY, g.heightMeter, g.lastPlatX);
        g.platforms.push(np);
        g.lastPlatX = np.x;
      }

      // ─── Remove platforms far below ───
      g.platforms = g.platforms.filter((p) => {
        const sy = p.y + g.cameraY;
        return sy < CANVAS_H + 100;
      });

      // ─── Update particles ───
      g.particles = g.particles.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.025;
        p.life -= 0.025;
        return p.life > 0;
      });

      // ═══════════════════ DRAW ═══════════════════

      drawBackground(ctx, g.cameraY, g.heightMeter);

      ctx.save();
      ctx.translate(0, g.cameraY);

      // Platforms
      g.platforms.forEach((p) => drawPlatform(ctx, p));

      // Particles
      g.particles.forEach((p) => {
        ctx.fillStyle = `rgba(${p.color === '#DAA520' ? '218,165,32' : '139,90,43'}, ${p.life})`;
        ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
      });

      // Horse
      drawHorse(ctx, h.x, h.y, g.frame, g.facingLeft);

      ctx.restore();

      // ─── HUD ───
      ctx.fillStyle = 'rgba(13, 17, 23, 0.7)';
      ctx.fillRect(0, 0, CANVAS_W, 36);
      ctx.strokeStyle = '#30363d'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, 36); ctx.lineTo(CANVAS_W, 36); ctx.stroke();

      // Height counter
      ctx.font = `bold 14px ${fonts.mono}`;
      ctx.fillStyle = colors.green;
      ctx.textAlign = 'left';
      ctx.fillText(`🐴 ${g.heightMeter}m / ${TARGET_HEIGHT}m`, 10, 24);

      // Progress bar
      const barX = 220;
      const barW = 140;
      const barH = 10;
      const barY = 13;
      const prog = Math.min(1, g.heightMeter / TARGET_HEIGHT);
      ctx.fillStyle = '#21262d';
      ctx.fillRect(barX, barY, barW, barH);
      if (prog > 0) {
        const gradient = ctx.createLinearGradient(barX, 0, barX + barW * prog, 0);
        gradient.addColorStop(0, '#4a7a3d');
        gradient.addColorStop(1, '#7ee787');
        ctx.fillStyle = gradient;
        ctx.fillRect(barX, barY, barW * prog, barH);
      }
      ctx.strokeStyle = '#30363d';
      ctx.strokeRect(barX, barY, barW, barH);

      // Percentage
      ctx.font = `bold 10px ${fonts.mono}`;
      ctx.fillStyle = colors.textMuted;
      ctx.textAlign = 'right';
      ctx.fillText(`${Math.floor(prog * 100)}%`, CANVAS_W - 8, 24);

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchend', onTouchEnd);
      canvas.removeEventListener('mousemove', onMouseMove);
      if (g) g.running = false;
    };
  }, [gameState]);

  const overlay = (content) => (
    <div style={{
      position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(13, 17, 23, 0.90)', zIndex: 10, borderRadius: 8,
    }}>
      {content}
    </div>
  );

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100%', background: colors.bgPrimary,
    }}>
      <div style={{ position: 'relative', width: CANVAS_W, maxWidth: '100%' }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{
            display: 'block', width: '100%', height: 'auto',
            border: `1px solid ${colors.border}`, borderRadius: 8,
            cursor: gameState === 'playing' ? 'none' : 'default',
            touchAction: 'none',
          }}
        />

        {/* ─── Start Screen ─── */}
        {gameState === 'start' && overlay(
          <>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🐴</div>
            <div style={{
              fontFamily: fonts.mono, fontSize: 22, color: '#D2691E',
              fontWeight: 'bold', letterSpacing: 2, marginBottom: 4,
            }}>
              HIMMELSRITT
            </div>
            <div style={{
              fontFamily: fonts.mono, fontSize: 11, color: colors.textSubtle,
              letterSpacing: 1, marginBottom: 16,
            }}>
              ━━━ SPRING BIS ZUM HIMMEL ━━━
            </div>
            <div style={{
              fontFamily: fonts.mono, fontSize: 13, color: colors.textMuted,
              textAlign: 'center', lineHeight: 1.8, maxWidth: 340, marginBottom: 24,
            }}>
              Erreiche {TARGET_HEIGHT}m Höhe!<br />
              Steuere mit Maus, Finger oder ←→ / A/D<br /><br />
              <span style={{ color: '#4a7a3d' }}>🟩 Normal</span>{' · '}
              <span style={{ color: '#8B5A2B' }}>🟫 Zerbricht!</span>{' · '}
              <span style={{ color: '#6CB6FF' }}>🟦 Glatt!</span><br />
              <span style={{ color: '#4a7a3d' }}>◄► Bewegt sich</span>{' · '}
              <span style={{ color: '#DAA520' }}>🌾 Heuballen = Super-Sprung!</span><br /><br />
              <span style={{ color: colors.orange }}>⚠️ Nicht runterfallen!</span>
            </div>
            <button
              onClick={startGame}
              style={{
                fontFamily: fonts.mono, fontSize: 16, fontWeight: 'bold',
                color: '#fff', background: '#5a3a1a',
                border: '1px solid #D2691E', borderRadius: 6,
                padding: '12px 40px', cursor: 'pointer', letterSpacing: 1,
              }}
              onMouseEnter={(e) => e.target.style.background = '#7a4a2a'}
              onMouseLeave={(e) => e.target.style.background = '#5a3a1a'}
            >
              ▶ LOS SPRINGEN!
            </button>
          </>
        )}

        {/* ─── Won Screen ─── */}
        {gameState === 'won' && overlay(
          <>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🏆</div>
            <div style={{
              fontFamily: fonts.mono, fontSize: 20, color: colors.green,
              fontWeight: 'bold', letterSpacing: 2, marginBottom: 8,
            }}>
              GIPFEL ERREICHT!
            </div>
            <div style={{
              fontFamily: fonts.mono, fontSize: 13, color: colors.textMuted,
              marginBottom: 20,
            }}>
              {TARGET_HEIGHT}m — Das Pferd fliegt! 🐴✨
            </div>
            <div style={{
              background: 'rgba(46, 160, 67, 0.15)',
              border: `1px solid ${colors.green}`,
              borderRadius: 8, padding: '16px 32px',
              textAlign: 'center', marginBottom: 20,
            }}>
              <div style={{
                fontFamily: fonts.mono, fontSize: 11, color: colors.green,
                marginBottom: 6, letterSpacing: 2,
              }}>
                ★ DEIN MATRIX-CODE ★
              </div>
              <div style={{
                fontFamily: fonts.mono, fontSize: 12, color: colors.textMuted,
                marginBottom: 8,
              }}>
                Trage diese Zahlen in Clue <span style={{ color: colors.orange, fontWeight: 'bold' }}>C6</span> der Matrix ein:
              </div>
              <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                {(matrixClue || '7 8 2 6').split(' ').map((d, i) => (
                  <span key={i} style={{
                    width: 36, height: 40,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, fontFamily: fonts.mono, fontWeight: 'bold',
                    background: 'rgba(46, 160, 67, 0.15)',
                    border: `2px solid ${colors.green}`,
                    borderRadius: 6, color: colors.yellow,
                  }}>
                    {d}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={startGame}
                style={{
                  fontFamily: fonts.mono, fontSize: 13,
                  color: colors.text, background: colors.bgSecondary,
                  border: `1px solid ${colors.border}`, borderRadius: 6,
                  padding: '8px 20px', cursor: 'pointer',
                }}
              >
                ↻ NOCHMAL
              </button>
              {onWin && (
                <button
                  onClick={() => onWin(matrixClue || '7 8 2 6')}
                  style={{
                    fontFamily: fonts.mono, fontSize: 13, fontWeight: 'bold',
                    color: '#fff', background: colors.greenDark,
                    border: `1px solid ${colors.green}`, borderRadius: 6,
                    padding: '8px 20px', cursor: 'pointer',
                  }}
                >
                  ✓ WEITER
                </button>
              )}
            </div>
          </>
        )}

        {/* ─── Lost Screen ─── */}
        {gameState === 'lost' && overlay(
          <>
            <div style={{ fontSize: 48, marginBottom: 8 }}>💨</div>
            <div style={{
              fontFamily: fonts.mono, fontSize: 20, color: colors.red,
              fontWeight: 'bold', letterSpacing: 2, marginBottom: 8,
            }}>
              ABGESTÜRZT!
            </div>
            <div style={{
              fontFamily: fonts.mono, fontSize: 13, color: colors.textMuted,
              marginBottom: 6,
            }}>
              Höhe: {height}m von {TARGET_HEIGHT}m
            </div>
            <div style={{
              fontFamily: fonts.mono, fontSize: 12, color: colors.textSubtle,
              marginBottom: 20, fontStyle: 'italic',
            }}>
              Hoch hinaus und wieder runter...
            </div>
            <button
              onClick={startGame}
              style={{
                fontFamily: fonts.mono, fontSize: 16, fontWeight: 'bold',
                color: '#fff', background: '#6e2a2a',
                border: `1px solid ${colors.red}`, borderRadius: 6,
                padding: '12px 36px', cursor: 'pointer', letterSpacing: 1,
              }}
              onMouseEnter={(e) => e.target.style.background = '#8b3030'}
              onMouseLeave={(e) => e.target.style.background = '#6e2a2a'}
            >
              ↻ NOCHMAL SPRINGEN
            </button>
          </>
        )}
      </div>
    </div>
  );
}
