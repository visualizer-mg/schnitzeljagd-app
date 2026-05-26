import React, { useRef, useEffect, useState, useCallback } from 'react';
import { colors, fonts } from '../theme';

// ─── Config ───
const CANVAS_W = 480;
const CANVAS_H = 640;
const XWING_W = 52;
const XWING_H = 60;
const TIE_W = 40;
const TIE_H = 36;
const LASER_W = 2;
const LASER_H = 14;
const STAR_COUNT = 120;
const KILL_TARGET = 200;
const FIRE_RATE = 170;
const TIE_SPAWN_INITIAL = 800;
const TIE_SPAWN_MIN = 180;
const TIE_SPEED_INITIAL = 1.8;
const TIE_SPEED_MAX = 6.0;
const TIE_FIRE_CHANCE = 0.006;   // slightly toned down from 0.008
const TIE_LASER_SPEED = 4.2;     // slightly slower (was 5)
const EXPLOSION_DURATION = 350;
const HEALTH_DROP_INTERVAL = 50;  // every 50 kills
const HEALTH_SIZE = 20;
const HEALTH_SPEED = 1.2;
const MAX_LIVES = 3;

// ─── Preload sprites ───
function loadImg(src) {
  const img = new Image();
  img.src = src;
  return img;
}

// ─── Explosion draw (still canvas — looks great as VFX) ───
function drawExplosion(ctx, x, y, progress) {
  ctx.save();
  ctx.translate(x, y);
  const maxR = 22;
  const r = maxR * progress;
  const alpha = 1 - progress;
  // Outer ring
  ctx.strokeStyle = `rgba(255, 166, 87, ${alpha})`;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  // Inner flash
  ctx.fillStyle = `rgba(244, 112, 103, ${alpha * 0.8})`;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
  ctx.fill();
  // Orange core
  ctx.fillStyle = `rgba(255, 200, 50, ${alpha * 0.6})`;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.25, 0, Math.PI * 2);
  ctx.fill();
  // Sparks
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 / 8) * i + progress * 3;
    const sx = Math.cos(angle) * r * 1.3;
    const sy = Math.sin(angle) * r * 1.3;
    ctx.fillStyle = `rgba(210, 169, 34, ${alpha})`;
    ctx.fillRect(sx - 1.5, sy - 1.5, 3, 3);
  }
  ctx.restore();
}

// ─── Health pickup draw ───
function drawHealthPickup(ctx, x, y, time) {
  ctx.save();
  ctx.translate(x, y);
  // Pulsing glow
  const pulse = 0.7 + Math.sin(time * 0.008) * 0.3;
  ctx.shadowColor = '#3fb950';
  ctx.shadowBlur = 10 * pulse;
  // Background circle
  ctx.fillStyle = `rgba(46, 160, 67, ${0.3 * pulse})`;
  ctx.beginPath();
  ctx.arc(0, 0, HEALTH_SIZE * 0.7, 0, Math.PI * 2);
  ctx.fill();
  // Cross
  ctx.fillStyle = '#3fb950';
  ctx.fillRect(-3, -10, 6, 20);
  ctx.fillRect(-10, -3, 20, 6);
  ctx.shadowBlur = 0;
  // Border
  ctx.strokeStyle = '#7ee787';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, HEALTH_SIZE * 0.65, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// ── Background music ──
let bgMusic = null;
function startMusic() {
  if (bgMusic && !bgMusic.paused) return;
  bgMusic = new Audio('./assets/starwars.mp3');
  bgMusic.loop = true;
  bgMusic.volume = 0.5;
  bgMusic.play().catch(() => {});
}
function stopMusic() {
  if (bgMusic) { bgMusic.pause(); bgMusic.currentTime = 0; bgMusic = null; }
}

// ─── Main Component ───
export default function XWingGame({ onWin, matrixClue }) {
  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const imgRef = useRef({ xwing: null, tie: null });
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState('start');
  const [lives, setLives] = useState(3);
  const [imgsLoaded, setImgsLoaded] = useState(false);

  // Preload images once
  useEffect(() => {
    const xwImg = loadImg('./assets/xwing.png');
    const tieImg = loadImg('./assets/tiefighter.png');
    let loaded = 0;
    const onLoad = () => { loaded++; if (loaded >= 2) { setImgsLoaded(true); } };
    xwImg.onload = onLoad;
    tieImg.onload = onLoad;
    xwImg.onerror = onLoad; // fallback gracefully
    tieImg.onerror = onLoad;
    imgRef.current = { xwing: xwImg, tie: tieImg };
  }, []);

  const initGame = useCallback(() => {
    const stars = Array.from({ length: STAR_COUNT }, () => ({
      x: Math.random() * CANVAS_W,
      y: Math.random() * CANVAS_H,
      speed: 0.3 + Math.random() * 1.5,
      size: Math.random() < 0.3 ? 2 : 1,
      brightness: 0.3 + Math.random() * 0.7,
    }));

    gameRef.current = {
      player: { x: CANVAS_W / 2, y: CANVAS_H - 60 },
      lasers: [],
      ties: [],
      explosions: [],
      healthDrops: [],
      stars,
      score: 0,
      lives: 3,
      lastFire: 0,
      lastSpawn: 0,
      spawnRate: TIE_SPAWN_INITIAL,
      tieSpeed: TIE_SPEED_INITIAL,
      mouseX: CANVAS_W / 2,
      mouseY: CANVAS_H - 60,
      running: true,
      startTime: Date.now(),
      tieLasers: [],
      nextHealthAt: HEALTH_DROP_INTERVAL,
      invincibleUntil: 0, // brief invincibility after hit
    };
  }, []);

  const startGame = useCallback(() => {
    initGame();
    setScore(0);
    setLives(3);
    setGameState('playing');
    startMusic();
  }, [initGame]);

  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const g = gameRef.current;
    const imgs = imgRef.current;
    let animId;

    // ─── Input handlers ───
    const onMove = (e) => {
      if (e.cancelable) e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_W / rect.width;
      const scaleY = CANVAS_H / rect.height;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      g.mouseX = (clientX - rect.left) * scaleX;
      g.mouseY = (clientY - rect.top) * scaleY;
    };

    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('touchmove', onMove, { passive: false });
    canvas.addEventListener('touchstart', onMove, { passive: false });

    // ─── Game loop ───
    const loop = () => {
      if (!g.running) return;

      const now = Date.now();
      const elapsed = (now - g.startTime) / 1000;

      // Difficulty ramp
      g.spawnRate = Math.max(TIE_SPAWN_MIN, TIE_SPAWN_INITIAL - elapsed * 8);
      g.tieSpeed = Math.min(TIE_SPEED_MAX, TIE_SPEED_INITIAL + elapsed * 0.04);
      const fireChance = Math.min(0.016, TIE_FIRE_CHANCE + elapsed * 0.00006);

      const isInvincible = now < g.invincibleUntil;

      // ─── Update player ───
      const dx = g.mouseX - g.player.x;
      const dy = g.mouseY - g.player.y;
      g.player.x += dx * 0.12;
      g.player.y += dy * 0.08;
      g.player.x = Math.max(28, Math.min(CANVAS_W - 28, g.player.x));
      g.player.y = Math.max(CANVAS_H * 0.35, Math.min(CANVAS_H - 35, g.player.y));

      // ─── Auto-fire ───
      if (now - g.lastFire > FIRE_RATE) {
        g.lasers.push(
          { x: g.player.x - 20, y: g.player.y - 24, speed: 7 },
          { x: g.player.x + 20, y: g.player.y - 24, speed: 7 }
        );
        g.lastFire = now;
      }

      // ─── Spawn TIEs ───
      if (now - g.lastSpawn > g.spawnRate) {
        const formation = Math.random();
        const spd = g.tieSpeed;
        if (formation < 0.15 && elapsed > 10) {
          const cx = 60 + Math.random() * (CANVAS_W - 120);
          g.ties.push(
            { x: cx, y: -20, speed: spd, hp: 1 },
            { x: cx - 35, y: -45, speed: spd, hp: 1 },
            { x: cx + 35, y: -45, speed: spd, hp: 1 }
          );
        } else if (formation < 0.25 && elapsed > 30) {
          const count = 4 + (elapsed > 60 ? 1 : 0);
          const startX = 40;
          const gap = (CANVAS_W - 80) / (count - 1);
          for (let i = 0; i < count; i++) {
            g.ties.push({ x: startX + i * gap, y: -20, speed: spd * 0.9, hp: 1 });
          }
        } else if (formation < 0.35 && elapsed > 45) {
          g.ties.push({
            x: g.player.x + (Math.random() - 0.5) * 80,
            y: -20, speed: spd * 1.5, hp: 1, diver: true,
          });
        } else {
          g.ties.push({
            x: 20 + Math.random() * (CANVAS_W - 40),
            y: -20,
            speed: spd * (0.8 + Math.random() * 0.4),
            hp: 1,
            wobble: Math.random() * Math.PI * 2,
          });
        }
        g.lastSpawn = now;
      }

      // ─── Update lasers ───
      g.lasers = g.lasers.filter((l) => { l.y -= l.speed; return l.y > -20; });

      // ─── Update TIEs ───
      g.ties = g.ties.filter((t) => {
        t.y += t.speed;
        if (t.wobble !== undefined) {
          t.x += Math.sin(t.wobble + t.y * 0.03) * 0.6;
        }
        if (!t.fired && Math.random() < fireChance && t.y > 40 && t.y < CANVAS_H - 80) {
          const aimDx = (g.player.x - t.x) * 0.012;
          g.tieLasers.push({ x: t.x, y: t.y + 16, speed: TIE_LASER_SPEED, dx: aimDx });
          t.fired = true;
        }
        return t.y <= CANVAS_H + 30;
      });

      // ─── Update TIE lasers ───
      g.tieLasers = g.tieLasers.filter((l) => {
        l.y += l.speed;
        l.x += (l.dx || 0);
        return l.y < CANVAS_H + 20 && l.x > -10 && l.x < CANVAS_W + 10;
      });

      // ─── Update health drops ───
      g.healthDrops = g.healthDrops.filter((h) => {
        h.y += HEALTH_SPEED;
        return h.y < CANVAS_H + 30;
      });

      // ─── Collision: lasers → TIEs ───
      g.lasers = g.lasers.filter((l) => {
        let hit = false;
        g.ties = g.ties.filter((t) => {
          if (Math.abs(l.x - t.x) < TIE_W * 0.55 && Math.abs(l.y - t.y) < TIE_H * 0.55) {
            hit = true;
            g.explosions.push({ x: t.x, y: t.y, start: now });
            g.score++;
            setScore(g.score);
            // Spawn health pickup?
            if (g.score >= g.nextHealthAt) {
              g.healthDrops.push({ x: t.x, y: t.y });
              g.nextHealthAt += HEALTH_DROP_INTERVAL;
            }
            if (g.score >= KILL_TARGET) {
              g.running = false;
              stopMusic();
              setGameState('won');
            }
            return false;
          }
          return true;
        });
        return !hit;
      });

      // ─── Collision: health drops → player ───
      g.healthDrops = g.healthDrops.filter((h) => {
        if (Math.abs(h.x - g.player.x) < 30 && Math.abs(h.y - g.player.y) < 30) {
          if (g.lives < MAX_LIVES) {
            g.lives++;
            setLives(g.lives);
          }
          return false;
        }
        return true;
      });

      // ─── Collision: TIE lasers → player ───
      if (!isInvincible) {
        g.tieLasers = g.tieLasers.filter((l) => {
          if (Math.abs(l.x - g.player.x) < XWING_W * 0.4 && Math.abs(l.y - g.player.y) < XWING_H * 0.4) {
            g.lives--;
            setLives(g.lives);
            g.invincibleUntil = now + 800; // brief invincibility
            g.explosions.push({ x: g.player.x, y: g.player.y, start: now });
            if (g.lives <= 0) { g.running = false; stopMusic(); setGameState('lost'); }
            return false;
          }
          return true;
        });
      }

      // ─── Collision: TIEs → player (ram) ───
      if (!isInvincible) {
        g.ties = g.ties.filter((t) => {
          if (Math.abs(t.x - g.player.x) < (XWING_W + TIE_W) * 0.3 && Math.abs(t.y - g.player.y) < (XWING_H + TIE_H) * 0.3) {
            g.lives--;
            setLives(g.lives);
            g.invincibleUntil = now + 800;
            g.explosions.push({ x: t.x, y: t.y, start: now });
            if (g.lives <= 0) { g.running = false; stopMusic(); setGameState('lost'); }
            return false;
          }
          return true;
        });
      }

      // ─── Update explosions ───
      g.explosions = g.explosions.filter((e) => now - e.start < EXPLOSION_DURATION);

      // ─── Update stars ───
      g.stars.forEach((s) => {
        s.y += s.speed;
        if (s.y > CANVAS_H) { s.y = 0; s.x = Math.random() * CANVAS_W; }
      });

      // ═══════════════════ DRAW ═══════════════════

      // Background
      ctx.fillStyle = '#0d1117';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Stars
      g.stars.forEach((s) => {
        ctx.fillStyle = `rgba(201, 209, 217, ${s.brightness * 0.6})`;
        ctx.fillRect(s.x, s.y, s.size, s.size);
      });

      // Green lasers (X-Wing)
      ctx.fillStyle = '#3fb950';
      ctx.shadowColor = '#3fb950';
      ctx.shadowBlur = 8;
      g.lasers.forEach((l) => {
        ctx.fillRect(l.x - LASER_W / 2, l.y - LASER_H / 2, LASER_W, LASER_H);
      });

      // Red lasers (TIE)
      ctx.fillStyle = '#F47067';
      ctx.shadowColor = '#F47067';
      ctx.shadowBlur = 8;
      g.tieLasers.forEach((l) => {
        ctx.fillRect(l.x - LASER_W / 2, l.y - LASER_H / 2, LASER_W, LASER_H);
      });
      ctx.shadowBlur = 0;

      // TIE Fighters (PNG sprite)
      if (imgs.tie && imgs.tie.complete && imgs.tie.naturalWidth > 0) {
        g.ties.forEach((t) => {
          ctx.drawImage(imgs.tie, t.x - TIE_W / 2, t.y - TIE_H / 2, TIE_W, TIE_H);
        });
      } else {
        // Fallback rectangles
        ctx.fillStyle = '#30363d';
        g.ties.forEach((t) => {
          ctx.fillRect(t.x - TIE_W / 2, t.y - TIE_H / 2, TIE_W, TIE_H);
        });
      }

      // Explosions
      g.explosions.forEach((e) => {
        const progress = (now - e.start) / EXPLOSION_DURATION;
        drawExplosion(ctx, e.x, e.y, progress);
      });

      // Health pickups
      g.healthDrops.forEach((h) => drawHealthPickup(ctx, h.x, h.y, now));

      // Player X-Wing (PNG sprite) — blink if invincible
      const showPlayer = !isInvincible || Math.floor(now / 80) % 2 === 0;
      if (showPlayer) {
        if (imgs.xwing && imgs.xwing.complete && imgs.xwing.naturalWidth > 0) {
          ctx.drawImage(imgs.xwing, g.player.x - XWING_W / 2, g.player.y - XWING_H / 2, XWING_W, XWING_H);
        } else {
          // Fallback
          ctx.fillStyle = '#c9d1d9';
          ctx.fillRect(g.player.x - XWING_W / 2, g.player.y - XWING_H / 2, XWING_W, XWING_H);
        }
      }

      // Engine glow (drawn behind sprite — subtle orange dots)
      if (showPlayer) {
        ctx.fillStyle = `rgba(255, 166, 87, ${0.5 + Math.random() * 0.3})`;
        ctx.beginPath();
        ctx.arc(g.player.x - 6, g.player.y + XWING_H * 0.42, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(g.player.x + 6, g.player.y + XWING_H * 0.42, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // ─── HUD ───
      ctx.fillStyle = 'rgba(13, 17, 23, 0.85)';
      ctx.fillRect(0, 0, CANVAS_W, 38);
      ctx.strokeStyle = '#30363d';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, 38); ctx.lineTo(CANVAS_W, 38); ctx.stroke();

      // Kill count
      ctx.font = `bold 14px ${fonts.mono}`;
      ctx.fillStyle = colors.green;
      ctx.textAlign = 'left';
      ctx.fillText(`KILLS ${g.score} / ${KILL_TARGET}`, 12, 25);

      // Progress bar
      const barX = 175;
      const barW = 180;
      const barH = 10;
      const barY = 15;
      const progress = Math.min(1, g.score / KILL_TARGET);
      ctx.fillStyle = '#21262d';
      ctx.fillRect(barX, barY, barW, barH);
      if (progress > 0) {
        const gradient = ctx.createLinearGradient(barX, 0, barX + barW * progress, 0);
        gradient.addColorStop(0, '#238636');
        gradient.addColorStop(1, '#3fb950');
        ctx.fillStyle = gradient;
        ctx.fillRect(barX, barY, barW * progress, barH);
      }
      ctx.strokeStyle = '#30363d';
      ctx.strokeRect(barX, barY, barW, barH);

      // Lives — draw as small hearts
      ctx.textAlign = 'right';
      ctx.font = `16px ${fonts.sans}`;
      let livesStr = '';
      for (let i = 0; i < MAX_LIVES; i++) {
        livesStr += i < g.lives ? '❤️' : '🖤';
      }
      ctx.fillText(livesStr, CANVAS_W - 10, 26);

      // Next health drop indicator
      const killsToHealth = g.nextHealthAt - g.score;
      if (killsToHealth > 0 && killsToHealth <= 10 && g.lives < MAX_LIVES) {
        ctx.font = `10px ${fonts.mono}`;
        ctx.fillStyle = colors.green;
        ctx.textAlign = 'right';
        ctx.fillText(`+HP in ${killsToHealth}`, CANVAS_W - 10, 37);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('touchmove', onMove);
      canvas.removeEventListener('touchstart', onMove);
      if (g) g.running = false;
      stopMusic();
    };
  }, [gameState]);

  // ─── Screens ───
  const overlay = (content) => (
    <div style={{
      position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(13, 17, 23, 0.92)', zIndex: 10,
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
          }}
        />

        {/* ─── Start Screen ─── */}
        {gameState === 'start' && overlay(
          <>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🚀</div>
            <div style={{
              fontFamily: fonts.mono, fontSize: 22, color: colors.yellow,
              fontWeight: 'bold', letterSpacing: 3, marginBottom: 4,
            }}>
              X-WING ASSAULT
            </div>
            <div style={{
              fontFamily: fonts.mono, fontSize: 11, color: colors.textSubtle,
              letterSpacing: 1, marginBottom: 16,
            }}>
              ━━━ STAR WARS EDITION ━━━
            </div>
            <div style={{
              fontFamily: fonts.mono, fontSize: 13, color: colors.textMuted,
              textAlign: 'center', lineHeight: 1.7, maxWidth: 340, marginBottom: 24,
            }}>
              Zerstöre {KILL_TARGET} TIE Fighter um den<br />
              Matrix-Clue zu entschlüsseln!<br /><br />
              Bewege den X-Wing mit Maus / Finger.<br />
              Er feuert automatisch. Du hast {MAX_LIVES} Leben.<br />
              Alle {HEALTH_DROP_INTERVAL} Kills droppt ein Medkit.
            </div>
            <button
              onClick={startGame}
              style={{
                fontFamily: fonts.mono, fontSize: 16, fontWeight: 'bold',
                color: '#fff', background: colors.greenDark,
                border: `1px solid ${colors.green}`, borderRadius: 6,
                padding: '12px 40px', cursor: 'pointer', letterSpacing: 1,
              }}
              onMouseEnter={(e) => e.target.style.background = colors.greenHover}
              onMouseLeave={(e) => e.target.style.background = colors.greenDark}
            >
              ▶ START MISSION
            </button>
          </>
        )}

        {/* ─── Won Screen ─── */}
        {gameState === 'won' && overlay(
          <>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🎯</div>
            <div style={{
              fontFamily: fonts.mono, fontSize: 20, color: colors.green,
              fontWeight: 'bold', letterSpacing: 2, marginBottom: 8,
            }}>
              MISSION COMPLETE!
            </div>
            <div style={{
              fontFamily: fonts.mono, fontSize: 13, color: colors.textMuted,
              marginBottom: 20,
            }}>
              {KILL_TARGET} TIE Fighter zerstört. Die Macht ist mit dir.
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
                Trage diese Zahlen in Clue <span style={{ color: colors.orange, fontWeight: 'bold' }}>C2</span> der Matrix ein:
              </div>
              <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                {(matrixClue || '5 7 1 9 6').split(' ').map((d, i) => (
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
                  onClick={() => onWin(matrixClue || '5 7 1 9 6')}
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
            <div style={{ fontSize: 48, marginBottom: 8 }}>💥</div>
            <div style={{
              fontFamily: fonts.mono, fontSize: 20, color: colors.red,
              fontWeight: 'bold', letterSpacing: 2, marginBottom: 8,
            }}>
              MISSION FAILED
            </div>
            <div style={{
              fontFamily: fonts.mono, fontSize: 13, color: colors.textMuted,
              marginBottom: 6,
            }}>
              {score} / {KILL_TARGET} TIE Fighter zerstört.
            </div>
            <div style={{
              fontFamily: fonts.mono, fontSize: 12, color: colors.textSubtle,
              marginBottom: 20, fontStyle: 'italic',
            }}>
              "Do. Or do not. There is no try."
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
              ↻ RETRY
            </button>
          </>
        )}
      </div>
    </div>
  );
}
