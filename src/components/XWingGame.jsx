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
const KILL_TARGET = 250;
const FIRE_RATE = 170;
const TIE_SPAWN_INITIAL = 800;
const TIE_SPAWN_MIN = 180;
const TIE_SPEED_INITIAL = 1.8;
const TIE_SPEED_MAX = 4.5;          // 75% of original 6.0
const TIE_FIRE_CHANCE = 0.0045;     // 75% of original 0.006
const TIE_LASER_SPEED = 3.15;       // 75% of original 4.2
const EXPLOSION_DURATION = 350;
const HEALTH_DROP_INTERVAL = 50;  // every 50 kills
const HEALTH_SIZE = 20;
const HEALTH_SPEED = 1.2;
const MAX_LIVES = 3;
const BLAST_WALL_SPEED = CANVAS_H / 60; // crosses screen in ~1 sec at 60fps
const BLAST_WALL_H = 30; // height of the fire wall

// ─── Boss config ───
const BOSS_HP = 600;
const BOSS_SIZE = 160;
const BOSS_FIRE_INTERVAL = 800;  // ms between boss shots (faster)
const BOSS_LASER_SPEED = 3.8;   // faster but still dodgeable
const BOSS_BLAST_DAMAGE = 300;  // rocket does half HP

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
  const imgRef = useRef({ xwing: null, tie: null, boss: null });
  const bossMusicRef = useRef(null);
  const blasterRef = useRef(null);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState('start');
  const [lives, setLives] = useState(3);
  const [imgsLoaded, setImgsLoaded] = useState(false);
  const [blastAvailable, setBlastAvailable] = useState(true);

  // Preload images once
  useEffect(() => {
    const xwImg = loadImg('./assets/xwing.png');
    const tieImg = loadImg('./assets/tiefighter.png');
    const bossImg = loadImg('./assets/kopf.png');
    let loaded = 0;
    const onLoad = () => { loaded++; if (loaded >= 3) { setImgsLoaded(true); } };
    xwImg.onload = onLoad;
    tieImg.onload = onLoad;
    bossImg.onload = onLoad;
    xwImg.onerror = onLoad;
    tieImg.onerror = onLoad;
    bossImg.onerror = onLoad;
    imgRef.current = { xwing: xwImg, tie: tieImg, boss: bossImg };
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
      blastWall: null, // { y } — active fire wall moving upward
      blastUsed: false,
      // Boss fight
      bossPhase: null,       // null | 'clearing' | 'approaching' | 'fighting' | 'dying'
      bossTimer: 0,          // timer for clearing phase
      boss: null,            // { x, y, hp, maxHp, lastFire, targetX }
      bossLasers: [],        // boss projectiles
      bossHitFlash: 0,       // flash timer when boss is hit
    };
  }, []);

  const startGame = useCallback(() => {
    initGame();
    setScore(0);
    setLives(3);
    setGameState('playing');
    setBlastAvailable(true);
    startMusic();
    // Start blaster loop
    try {
      if (blasterRef.current) { blasterRef.current.pause(); blasterRef.current = null; }
      const bl = new Audio('./assets/blaster.mp3');
      bl.loop = true;
      bl.volume = 0.6;
      bl.play().catch(() => {});
      blasterRef.current = bl;
    } catch(e) {}
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
      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_W / rect.width;
      const scaleY = CANVAS_H / rect.height;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      g.mouseX = (clientX - rect.left) * scaleX;
      g.mouseY = (clientY - rect.top) * scaleY;
    };

    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('touchmove', onMove, { passive: true });
    canvas.addEventListener('touchstart', onMove, { passive: true });

    // ─── Game loop ───
    const loop = () => {
      if (!g.running) return;

      const now = Date.now();
      const elapsed = (now - g.startTime) / 1000;

      // Difficulty ramp
      g.spawnRate = Math.max(TIE_SPAWN_MIN, TIE_SPAWN_INITIAL - elapsed * 6);    // 75% of original 8
      g.tieSpeed = Math.min(TIE_SPEED_MAX, TIE_SPEED_INITIAL + elapsed * 0.03);  // 75% of original 0.04
      const fireChance = Math.min(0.012, TIE_FIRE_CHANCE + elapsed * 0.000045);   // 75% of original

      const isInvincible = now < g.invincibleUntil;

      // ─── Update player ───
      const dx = g.mouseX - g.player.x;
      const dy = g.mouseY - g.player.y;
      g.player.x += dx * 0.12;
      g.player.y += dy * 0.08;
      g.player.x = Math.max(28, Math.min(CANVAS_W - 28, g.player.x));
      g.player.y = Math.max(CANVAS_H * 0.35, Math.min(CANVAS_H - 35, g.player.y));

      // ─── Auto-fire (pause during clearing phase) ───
      if (now - g.lastFire > FIRE_RATE && g.bossPhase !== 'clearing') {
        g.lasers.push(
          { x: g.player.x - 20, y: g.player.y - 24, speed: 7 },
          { x: g.player.x + 20, y: g.player.y - 24, speed: 7 }
        );
        g.lastFire = now;
      }

      // ─── Spawn TIEs (not during boss) ───
      if (now - g.lastSpawn > g.spawnRate && !g.bossPhase) {
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
            if (g.score >= KILL_TARGET && !g.bossPhase) {
              g.bossPhase = 'clearing';
              g.bossTimer = Date.now();
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
            if (g.lives <= 0) { g.running = false; stopMusic(); if (blasterRef.current) { blasterRef.current.pause(); blasterRef.current = null; } if (bossMusicRef.current) { bossMusicRef.current.pause(); bossMusicRef.current = null; } setGameState('lost'); }
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
            if (g.lives <= 0) { g.running = false; stopMusic(); if (blasterRef.current) { blasterRef.current.pause(); blasterRef.current = null; } if (bossMusicRef.current) { bossMusicRef.current.pause(); bossMusicRef.current = null; } setGameState('lost'); }
            return false;
          }
          return true;
        });
      }

      // ─── Update explosions ───
      g.explosions = g.explosions.filter((e) => now - e.start < EXPLOSION_DURATION);

      // ─── Update blast wall ───
      if (g.blastWall) {
        g.blastWall.y -= BLAST_WALL_SPEED;
        // Destroy all TIEs the wall passes through
        g.ties = g.ties.filter((t) => {
          if (t.y >= g.blastWall.y - BLAST_WALL_H / 2 && t.y <= g.blastWall.y + BLAST_WALL_H) {
            g.explosions.push({ x: t.x, y: t.y, start: now });
            g.score++;
            setScore(g.score);
            if (g.score >= g.nextHealthAt) {
              g.healthDrops.push({ x: t.x, y: t.y });
              g.nextHealthAt += HEALTH_DROP_INTERVAL;
            }
            if (g.score >= KILL_TARGET && !g.bossPhase) {
              g.bossPhase = 'clearing';
              g.bossTimer = Date.now();
            }
            return false;
          }
          return true;
        });
        // Also destroy TIE lasers in the wall's path
        g.tieLasers = g.tieLasers.filter((l) => {
          return !(l.y >= g.blastWall.y - BLAST_WALL_H / 2 && l.y <= g.blastWall.y + BLAST_WALL_H);
        });
        // Remove wall when off screen
        if (g.blastWall.y + BLAST_WALL_H < 0) {
          g.blastWall = null;
        }
      }

      // ─── Boss Fight Logic ───
      if (g.bossPhase === 'clearing') {
        // Clear all enemies, stop spawning, stop blaster
        g.ties = [];
        g.tieLasers = [];
        if (blasterRef.current && !g._blasterStopped) {
          blasterRef.current.pause(); blasterRef.current = null;
          g._blasterStopped = true;
        }
        const elapsed_boss = now - g.bossTimer;
        // After 3 seconds, start boss music
        if (elapsed_boss >= 3000 && !g._bossMusicStarted) {
          g._bossMusicStarted = true;
          stopMusic();
          try {
            const bm = new Audio('./assets/boss-music.mpeg');
            bm.loop = true;
            bm.volume = 0.6;
            bm.play().catch(() => {});
            bossMusicRef.current = bm;
          } catch(e) {}
        }
        // After 7 seconds, boss appears
        if (elapsed_boss >= 7000) {
          g.bossPhase = 'approaching';
          g.boss = {
            x: CANVAS_W / 2,
            y: -BOSS_SIZE,
            hp: BOSS_HP,
            maxHp: BOSS_HP,
            lastFire: now,
            targetX: CANVAS_W / 2,
          };
        }
      }

      if (g.bossPhase === 'approaching') {
        // Boss slides down into view
        g.boss.y += 1.2;
        if (g.boss.y >= 80) {
          g.boss.y = 80;
          g.bossPhase = 'fighting';
          // Restart blaster sound for boss fight
          try {
            const bl = new Audio('./assets/blaster.mp3');
            bl.loop = true; bl.volume = 0.6;
            bl.play().catch(() => {});
            blasterRef.current = bl;
          } catch(e) {}
        }
      }

      if (g.bossPhase === 'fighting' && g.boss) {
        // Boss slowly moves side to side, tracking player loosely
        const bDx = g.player.x - g.boss.x;
        g.boss.x += bDx * 0.008;
        g.boss.x = Math.max(BOSS_SIZE / 2 + 10, Math.min(CANVAS_W - BOSS_SIZE / 2 - 10, g.boss.x));

        // Boss fires regularly
        if (now - g.boss.lastFire > BOSS_FIRE_INTERVAL) {
          g.boss.lastFire = now;
          // Fire 3 spread shots
          const angles = [-0.15, 0, 0.15];
          angles.forEach(a => {
            g.bossLasers.push({
              x: g.boss.x + Math.sin(a) * 30,
              y: g.boss.y + BOSS_SIZE / 2,
              dx: Math.sin(a) * 2.5,
              dy: BOSS_LASER_SPEED,
            });
          });
        }

        // Boss hit flash countdown
        if (g.bossHitFlash > 0) g.bossHitFlash--;

        // Collision: player lasers → boss
        g.lasers = g.lasers.filter((l) => {
          const hitX = Math.abs(l.x - g.boss.x) < BOSS_SIZE * 0.45;
          const hitY = Math.abs(l.y - g.boss.y) < BOSS_SIZE * 0.45;
          if (hitX && hitY) {
            g.boss.hp--;
            g.bossHitFlash = 5;
            if (g.boss.hp <= 0) {
              g.bossPhase = 'dying';
              g.bossTimer = now;
              g.explosions.push({ x: g.boss.x, y: g.boss.y, start: now });
            }
            return false;
          }
          return true;
        });

        // Collision: blast wall → boss (half HP damage!)
        if (g.blastWall && g.boss) {
          if (g.blastWall.y <= g.boss.y + BOSS_SIZE / 2) {
            g.boss.hp -= BOSS_BLAST_DAMAGE;
            g.bossHitFlash = 15;
            g.explosions.push({ x: g.boss.x - 40, y: g.boss.y, start: now });
            g.explosions.push({ x: g.boss.x + 40, y: g.boss.y, start: now });
            g.explosions.push({ x: g.boss.x, y: g.boss.y - 30, start: now });
            if (g.boss.hp <= 0) {
              g.bossPhase = 'dying';
              g.bossTimer = now;
            }
          }
        }
      }

      // Update boss lasers
      g.bossLasers = g.bossLasers.filter((l) => {
        l.x += l.dx;
        l.y += l.dy;
        return l.y < CANVAS_H + 20 && l.x > -10 && l.x < CANVAS_W + 10;
      });

      // Collision: boss lasers → player
      if (!isInvincible && g.bossPhase === 'fighting') {
        g.bossLasers = g.bossLasers.filter((l) => {
          if (Math.abs(l.x - g.player.x) < XWING_W * 0.4 && Math.abs(l.y - g.player.y) < XWING_H * 0.4) {
            g.lives--;
            setLives(g.lives);
            g.invincibleUntil = now + 800;
            g.explosions.push({ x: g.player.x, y: g.player.y, start: now });
            if (g.lives <= 0) {
              g.running = false;
              if (bossMusicRef.current) { bossMusicRef.current.pause(); bossMusicRef.current = null; }
              if (blasterRef.current) { blasterRef.current.pause(); blasterRef.current = null; }
              stopMusic();
              setGameState('lost');
            }
            return false;
          }
          return true;
        });
      }

      // Boss dying — explosion sequence then win
      if (g.bossPhase === 'dying') {
        const dyingElapsed = now - g.bossTimer;
        // Multiple explosions over 2 seconds
        if (dyingElapsed < 2000 && Math.random() < 0.3) {
          g.explosions.push({
            x: g.boss.x + (Math.random() - 0.5) * BOSS_SIZE,
            y: g.boss.y + (Math.random() - 0.5) * BOSS_SIZE,
            start: now,
          });
        }
        if (dyingElapsed >= 2000) {
          g.running = false;
          if (bossMusicRef.current) { bossMusicRef.current.pause(); bossMusicRef.current = null; }
          if (blasterRef.current) { blasterRef.current.pause(); blasterRef.current = null; }
          stopMusic();
          setGameState('won');
        }
      }

      // During boss, no TIE spawning
      if (g.bossPhase) {
        g.ties = g.ties || [];
      }

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

      // Blast wall
      if (g.blastWall) {
        const wy = g.blastWall.y;
        const gradient = ctx.createLinearGradient(0, wy - BLAST_WALL_H, 0, wy + BLAST_WALL_H);
        gradient.addColorStop(0, 'rgba(255, 100, 50, 0)');
        gradient.addColorStop(0.3, 'rgba(255, 180, 50, 0.9)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 100, 1)');
        gradient.addColorStop(0.7, 'rgba(255, 180, 50, 0.9)');
        gradient.addColorStop(1, 'rgba(255, 100, 50, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, wy - BLAST_WALL_H, CANVAS_W, BLAST_WALL_H * 2);
        // Bright core line
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillRect(0, wy - 1, CANVAS_W, 2);
        // Glow
        ctx.shadowColor = '#FFA500';
        ctx.shadowBlur = 20;
        ctx.fillStyle = 'rgba(255, 200, 50, 0.4)';
        ctx.fillRect(0, wy - 2, CANVAS_W, 4);
        ctx.shadowBlur = 0;
      }

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

      // ─── Boss drawing ───
      if (g.boss && g.bossPhase !== 'dying') {
        ctx.save();
        // Red glow behind boss
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 30 + Math.sin(now * 0.005) * 10;
        // Hit flash
        if (g.bossHitFlash > 0) {
          ctx.globalAlpha = 0.5 + Math.random() * 0.5;
        }
        // Draw the Kopf as Death Star
        if (imgs.boss && imgs.boss.complete) {
          ctx.drawImage(imgs.boss,
            g.boss.x - BOSS_SIZE / 2, g.boss.y - BOSS_SIZE / 2,
            BOSS_SIZE, BOSS_SIZE
          );
        }
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        // HP bar above boss
        if (g.bossPhase === 'fighting') {
          const barW = BOSS_SIZE * 1.2;
          const barH = 8;
          const barX = g.boss.x - barW / 2;
          const barY = g.boss.y - BOSS_SIZE / 2 - 18;
          const hpPct = Math.max(0, g.boss.hp / g.boss.maxHp);
          // Background
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.fillRect(barX, barY, barW, barH);
          // HP fill
          const hpColor = hpPct > 0.5 ? '#f44336' : hpPct > 0.25 ? '#ff9800' : '#ff1744';
          ctx.fillStyle = hpColor;
          ctx.fillRect(barX, barY, barW * hpPct, barH);
          // Border
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1;
          ctx.strokeRect(barX, barY, barW, barH);
          // Label
          ctx.font = `bold 9px ${fonts.mono}`;
          ctx.fillStyle = '#fff';
          ctx.textAlign = 'center';
          ctx.fillText(`MOSTKOPF  ${g.boss.hp}/${g.boss.maxHp}`, g.boss.x, barY - 4);
        }
        ctx.restore();
      }
      // Boss dying — draw shrinking boss
      if (g.boss && g.bossPhase === 'dying') {
        const dyingPct = Math.min(1, (now - g.bossTimer) / 2000);
        const shrink = BOSS_SIZE * (1 - dyingPct);
        ctx.save();
        ctx.globalAlpha = 1 - dyingPct;
        if (imgs.boss && imgs.boss.complete && shrink > 5) {
          ctx.drawImage(imgs.boss,
            g.boss.x - shrink / 2, g.boss.y - shrink / 2,
            shrink, shrink
          );
        }
        ctx.restore();
      }

      // Boss lasers (red/orange, bigger than TIE lasers)
      if (g.bossLasers.length > 0) {
        ctx.fillStyle = '#ff6600';
        ctx.shadowColor = '#ff4400';
        ctx.shadowBlur = 12;
        g.bossLasers.forEach((l) => {
          ctx.fillRect(l.x - 3, l.y - 8, 6, 16);
        });
        ctx.shadowBlur = 0;
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
      if (bossMusicRef.current) { bossMusicRef.current.pause(); bossMusicRef.current = null; }
      if (blasterRef.current) { blasterRef.current.pause(); blasterRef.current = null; }
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
      width: '100vw', maxWidth: '100vw', overflow: 'hidden',
      boxSizing: 'border-box',
    }}>
      <div style={{ position: 'relative', width: '100%', maxWidth: CANVAS_W, overflow: 'hidden' }}>
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

        {/* ─── Blast Wall Button ─── */}
        {gameState === 'playing' && (
          <button
            onClick={() => {
              const g = gameRef.current;
              if (g && !g.blastUsed && !g.blastWall) {
                g.blastWall = { y: g.player.y - 30 };
                g.blastUsed = true;
                setBlastAvailable(false);
              }
            }}
            style={{
              position: 'absolute',
              bottom: 12,
              left: 12,
              zIndex: 20,
              width: 60,
              height: 60,
              borderRadius: '50%',
              border: blastAvailable ? '2px solid rgba(255, 166, 87, 0.8)' : '2px solid rgba(100,100,100,0.3)',
              background: blastAvailable ? 'rgba(255, 100, 50, 0.25)' : 'rgba(50,50,50,0.3)',
              color: blastAvailable ? '#FFA657' : '#555',
              fontSize: 24,
              cursor: blastAvailable ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: blastAvailable ? 1 : 0.4,
              boxShadow: blastAvailable ? '0 0 12px rgba(255, 166, 87, 0.4)' : 'none',
              transition: 'all 0.3s ease',
              pointerEvents: blastAvailable ? 'auto' : 'none',
            }}
            title="Blaster Wall — einmalig!"
          >
            🚀
          </button>
        )}

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
              Bewege den X-Wing mit dem Finger.<br />
              Er feuert automatisch. Du hast {MAX_LIVES} Leben.<br />
              Alle {HEALTH_DROP_INTERVAL} Kills droppt ein Medkit.<br /><br />
              <span style={{ color: '#ff6600', fontWeight: 'bold' }}>
                Vorsicht vor dem Todeshonk!
              </span>
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
                fontFamily: fonts.mono, fontSize: 14, color: colors.textSecondary,
                marginBottom: 12, lineHeight: 1.5,
              }}>
                Herzlichen Glückwunsch!<br />Du hast einen Matrix Clue freigeschaltet:
              </div>
              <div style={{
                fontSize: 24, fontFamily: fonts.mono, fontWeight: 'bold',
                color: colors.yellow, letterSpacing: 2,
              }}>
                {matrixClue || 'C10: 5 - 0 - 2 - 8 - 4'}
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
                  onClick={() => onWin(matrixClue)}
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
