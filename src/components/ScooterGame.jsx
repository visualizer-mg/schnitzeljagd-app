import React, { useRef, useEffect, useState, useCallback } from 'react';

// Inline theme for spieler-app (no shared theme file)
const colors = {
  bgPrimary: '#0a0a0a',
  bgSecondary: '#111',
  text: '#e2e8f0',
  textMuted: '#94a3b8',
  textSubtle: '#64748b',
  accent: '#6cb6ff',
  green: '#4ade80',
  red: '#f87171',
  yellow: '#fbbf24',
  border: 'rgba(255,255,255,0.1)',
};
const fonts = {
  sans: "'Inter', -apple-system, sans-serif",
  mono: "'JetBrains Mono', 'SF Mono', monospace",
};

// ═══════════════════════════════════════════════════════
// Elephant Scooter Run — 3-lane side-scroller
// Swipe up/down to change lanes, tap to jump
// 10 km goal, difficulty increases each km
// ═══════════════════════════════════════════════════════

const CANVAS_W = 480;
const CANVAS_H = 380;

// Lanes — road at bottom of canvas
// LANE_Y = where the bottom of the elephant/obstacle sits (road surface for that lane)
const ROAD_TOP = 250;
const ROAD_BOTTOM = 380;
const LANE_H = (ROAD_BOTTOM - ROAD_TOP) / 3; // ~42px per lane
const LANE_Y = [
  ROAD_TOP + LANE_H * 0.5,   // top lane — center line
  ROAD_TOP + LANE_H * 1.5,   // mid lane — center line
  ROAD_TOP + LANE_H * 2.5,   // bottom lane — center line
];
const LANE_COUNT = 3;

// Elephant
const ELEPH_W = 70;
const ELEPH_H = 65;
const ELEPH_X = 60; // fixed X position
const JUMP_FORCE = -8;
const GRAVITY = 0.35;
const JUMP_DURATION = 45; // frames

// Game
const TARGET_KM = 150;
const PIXELS_PER_METER = 0.15; // how fast distance accumulates
const BASE_SPEED = 3;
const MAX_SPEED = 6;
const LIFE_DROP_INTERVAL = 60; // every 60 km a life pickup appears
const MAX_LIVES = 3;

// Obstacles — vehicles use sprite images (auto1-4.webp)
const OBS_TYPES = [
  { type: 'auto1',      w: 74, h: 35, canJump: true,  img: 'auto1' },  // school bus
  { type: 'auto2',      w: 66, h: 36, canJump: true,  img: 'auto2' },  // blue van
  { type: 'auto3',      w: 92, h: 28, canJump: true,  img: 'auto3' },  // sports car
  { type: 'auto4',      w: 75, h: 32, canJump: true,  img: 'auto4' },  // compact
  { type: 'auto5',      w: 225, h: 54, canJump: false, img: 'auto5', hitH: 36 }, // SUV mit Anhänger (visual oversize, hitbox = 1 lane)
  { type: 'pothole',    w: 40, h: 12, canJump: true },
  { type: 'barrier',    w: 45, h: 38, canJump: true, img: 'barrier' },
  { type: 'cone',       w: 20, h: 28, canJump: true },
];

// ─── Draw obstacle sprites ───
function drawObstacle(ctx, obs, images) {
  const { type, x, y, w, h } = obs;
  ctx.save();

  // Sprite-based obstacles (vehicles + barrier)
  if (obs.img) {
    const img = images[obs.img];
    if (img && img.complete) {
      ctx.drawImage(img, x, y, w, h);
    }
    ctx.restore();
    return;
  }

  if (type === 'pothole') {
    // Dark hole in road
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Crack lines
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x + 5, y + 2); ctx.lineTo(x + w / 2, y + h / 2);
    ctx.moveTo(x + w - 5, y + 3); ctx.lineTo(x + w / 2, y + h / 2);
    ctx.stroke();
  } else if (type === 'cone') {
    // Traffic cone
    ctx.fillStyle = '#ea580c';
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y);
    ctx.lineTo(x + w - 2, y + h);
    ctx.lineTo(x + 2, y + h);
    ctx.closePath();
    ctx.fill();
    // White stripes
    ctx.fillStyle = '#fff';
    ctx.fillRect(x + 5, y + h * 0.35, w - 10, 3);
    ctx.fillRect(x + 3, y + h * 0.6, w - 6, 3);
    // Base
    ctx.fillStyle = '#ea580c';
    ctx.fillRect(x - 2, y + h - 4, w + 4, 4);
  }

  ctx.restore();
}

// ─── Draw road markings ───
function drawRoad(ctx, frame, speed) {
  // Road surface
  ctx.fillStyle = '#374151';
  ctx.fillRect(0, ROAD_TOP, CANVAS_W, ROAD_BOTTOM - ROAD_TOP);

  // Road edge lines
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(0, ROAD_TOP + 1); ctx.lineTo(CANVAS_W, ROAD_TOP + 1);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, ROAD_BOTTOM - 1); ctx.lineTo(CANVAS_W, ROAD_BOTTOM - 1);
  ctx.stroke();

  // Lane divider lines (dashed, scrolling — sparse, every 4th)
  ctx.strokeStyle = '#9ca3af';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([16, 64]); // short dash, long gap
  const offset = (frame * speed * 1.8) % 80;
  ctx.lineDashOffset = offset;

  // Line between lane 0 and 1
  const y01 = (LANE_Y[0] + LANE_Y[1]) / 2;
  ctx.beginPath();
  ctx.moveTo(0, y01); ctx.lineTo(CANVAS_W, y01);
  ctx.stroke();

  // Line between lane 1 and 2
  const y12 = (LANE_Y[1] + LANE_Y[2]) / 2;
  ctx.beginPath();
  ctx.moveTo(0, y12); ctx.lineTo(CANVAS_W, y12);
  ctx.stroke();

  ctx.setLineDash([]);
}

// ─── Preload images ───
function loadImg(src) {
  const img = new Image();
  img.src = src;
  return img;
}

// ─── Main Component ───
export default function ScooterGame({ onWin, matrixClue }) {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const animRef = useRef(null);
  const musicRef = useRef(null);       // title music
  const engineRef = useRef(null);      // scooter engine loop
  const gameplayMusicRef = useRef(null); // gameplay music
  const [phase, setPhase] = useState('title'); // title | playing | dead | win

  // Preload images
  const imagesRef = useRef({
    elephant: loadImg('/assets/elephant-scooter.webp'),
    bg1: loadImg('/assets/scooter-bg1.webp'),
    bg2: loadImg('/assets/scooter-bg2.webp'),
    bg3: loadImg('/assets/scooter-bg3.webp'),
    auto1: loadImg('/assets/auto1.webp'),
    auto2: loadImg('/assets/auto2.webp'),
    auto3: loadImg('/assets/auto3.webp'),
    auto4: loadImg('/assets/auto4.webp'),
    auto5: loadImg('/assets/auto5.webp'),
    barrier: loadImg('/assets/barrier.webp'),
  });

  const initState = useCallback(() => {
    return {
      lane: 1, // middle
      targetLane: 1,
      laneY: LANE_Y[1],
      jumping: false,
      jumpVel: 0,
      jumpOffsetY: 0,
      distance: 0, // meters
      speed: BASE_SPEED,
      frame: 0,
      obstacles: [],
      pickups: [], // life pickups
      lastSpawn: 0,
      spawnInterval: 90, // frames between spawns
      lives: 3,
      invincible: 0,
      bgScroll: 0,
      shakeFrames: 0,
      gameOver: false,
      kmReached: 0,
      lastLifeDrop: 0, // km at which last life was dropped
      bgZone: 0, // 0=bg1, 1=bg2, 2=bg3
      bgFade: 0, // 0 = no fade, >0 = fading (counts up to BG_FADE_FRAMES)
    };
  }, []);

  // ─── Audio management per phase ───
  useEffect(() => {
    const stopAll = () => {
      [musicRef, engineRef, gameplayMusicRef].forEach(ref => {
        if (ref.current) { ref.current.pause(); ref.current.currentTime = 0; ref.current = null; }
      });
    };

    if (phase === 'title') {
      stopAll();
      const audio = new Audio('/assets/scooter-music.wav');
      audio.loop = true;
      audio.volume = 0.4;
      audio.play().catch(() => {});
      musicRef.current = audio;
    } else if (phase === 'playing') {
      stopAll();
      // Engine sound loop
      const engine = new Audio('/assets/scooter-engine.wav');
      engine.loop = true;
      engine.volume = 0.5;
      engine.play().catch(() => {});
      engineRef.current = engine;
      // Gameplay music
      const music = new Audio('/assets/scooter-gameplay-music.wav');
      music.loop = true;
      music.volume = 0.35;
      music.play().catch(() => {});
      gameplayMusicRef.current = music;
    } else {
      // dead or win — stop everything
      stopAll();
    }

    return () => stopAll();
  }, [phase]);

  const startGame = useCallback(() => {
    stateRef.current = initState();
    setPhase('playing');
  }, [initState]);

  // ─── Touch / Keyboard controls ───
  useEffect(() => {
    if (phase !== 'playing') return;

    const touchStart = { x: 0, y: 0, time: 0 };

    const handleTouchStart = (e) => {
      const t = e.touches[0];
      touchStart.x = t.clientX;
      touchStart.y = t.clientY;
      touchStart.time = Date.now();
    };

    const handleTouchEnd = (e) => {
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStart.x;
      const dy = t.clientY - touchStart.y;
      const dt = Date.now() - touchStart.time;
      const s = stateRef.current;
      if (!s) return;

      // If it's a quick tap (not a swipe)
      if (Math.abs(dx) < 20 && Math.abs(dy) < 20 && dt < 300) {
        // Jump!
        if (!s.jumping) {
          s.jumping = true;
          s.jumpVel = JUMP_FORCE;
          const sfx = new Audio('/assets/scooter-jump.wav');
          sfx.volume = 0.6;
          sfx.play().catch(() => {});
        }
        return;
      }

      // Swipe detection
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 30) {
        if (dy < 0 && s.targetLane > 0) {
          s.targetLane--;
        } else if (dy > 0 && s.targetLane < LANE_COUNT - 1) {
          s.targetLane++;
        }
      }
    };

    const handleKeyDown = (e) => {
      const s = stateRef.current;
      if (!s) return;
      if (e.key === 'ArrowUp' && s.targetLane > 0) {
        s.targetLane--;
      } else if (e.key === 'ArrowDown' && s.targetLane < LANE_COUNT - 1) {
        s.targetLane++;
      } else if (e.key === ' ' && !s.jumping) {
        s.jumping = true;
        s.jumpVel = JUMP_FORCE;
        const sfx = new Audio('/assets/scooter-jump.wav');
        sfx.volume = 0.6;
        sfx.play().catch(() => {});
        e.preventDefault();
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [phase]);

  // ─── Game loop ───
  useEffect(() => {
    if (phase !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const imgs = imagesRef.current;

    const loop = () => {
      const s = stateRef.current;
      if (!s) return;

      s.frame++;

      // ── Speed increases with distance (slower ramp for 500km) ──
      const km = s.distance / 1000;
      s.speed = Math.min(BASE_SPEED + km * 0.02, MAX_SPEED);
      s.spawnInterval = Math.max(80 - km * 0.35, 22);

      // ── Distance ──
      s.distance += s.speed * PIXELS_PER_METER * 10;

      // ── Background scroll ──
      s.bgScroll += s.speed * 0.5;

      // ── Lane movement (smooth) ──
      const targetY = LANE_Y[s.targetLane];
      s.laneY += (targetY - s.laneY) * 0.15;
      s.lane = s.targetLane;

      // ── Jumping ──
      if (s.jumping) {
        s.jumpOffsetY += s.jumpVel;
        s.jumpVel += GRAVITY;
        if (s.jumpOffsetY >= 0) {
          s.jumpOffsetY = 0;
          s.jumping = false;
          s.jumpVel = 0;
        }
      }

      // ── Spawn obstacles ──
      if (s.frame - s.lastSpawn > s.spawnInterval) {
        const pickType = () => {
          const idx = Math.floor(Math.random() * OBS_TYPES.length);
          // No sports car (auto3) in early game
          return km < 15 && OBS_TYPES[idx].type === 'auto3' ? OBS_TYPES[3] : OBS_TYPES[idx];
        };

        const lane = Math.floor(Math.random() * LANE_COUNT);
        const obsType = pickType();

        s.obstacles.push({
          ...obsType,
          x: CANVAS_W + 20,
          y: LANE_Y[lane] - obsType.h,
          lane,
        });
        if (obsType.type === 'auto5') {
          setTimeout(() => {
            const sfx = new Audio('/assets/cowboy-yeah.wav');
            sfx.volume = 0.7;
            sfx.play().catch(() => {});
          }, 300);
        }
        s.lastSpawn = s.frame;

        // ── Multi-spawn patterns to force lane changes ──
        const roll = Math.random();

        if (km > 60 && roll < 0.15) {
          // Triple: block 2 lanes + stagger 3rd → must dodge carefully
          const lanes = [0, 1, 2].filter(l => l !== lane);
          lanes.forEach(l => {
            const t = pickType();
            s.obstacles.push({
              ...t,
              x: CANVAS_W + 20 + Math.random() * 20,
              y: LANE_Y[l] - t.h,
              lane: l,
            });
          });
        } else if (km > 20 && roll < 0.4) {
          // Double: second obstacle on different lane (same x or slightly offset)
          const lane2 = (lane + 1 + Math.floor(Math.random() * 2)) % LANE_COUNT;
          const type2 = pickType();
          s.obstacles.push({
            ...type2,
            x: CANVAS_W + 20 + Math.random() * 30,
            y: LANE_Y[lane2] - type2.h,
            lane: lane2,
          });
        }

        // Back-to-back: sometimes spawn a follow-up on SAME lane (can't just stay, must jump or move)
        if (km > 40 && Math.random() < 0.25) {
          const t = pickType();
          s.obstacles.push({
            ...t,
            x: CANVAS_W + 100 + Math.random() * 60,
            y: LANE_Y[lane] - t.h,
            lane,
          });
        }
      }

      // ── Spawn life pickups ──
      const nextLifeKm = s.lastLifeDrop + LIFE_DROP_INTERVAL;
      if (km >= nextLifeKm && s.lives < MAX_LIVES) {
        const lane = Math.floor(Math.random() * LANE_COUNT);
        s.pickups.push({
          type: 'life',
          x: CANVAS_W + 50,
          y: LANE_Y[lane] - 12,
          lane,
          w: 24, h: 24,
        });
        s.lastLifeDrop = Math.floor(km / LIFE_DROP_INTERVAL) * LIFE_DROP_INTERVAL;
      }

      // ── Move obstacles ──
      s.obstacles.forEach(o => {
        const isVehicle = o.type.startsWith('auto');
        o.x -= s.speed * (isVehicle ? 2.28 : 1.8);
      });
      s.obstacles = s.obstacles.filter(o => o.x + o.w > -20);

      // ── Move & collect pickups ──
      s.pickups.forEach(p => { p.x -= s.speed * 1.44; });
      const elephYForPickup = s.laneY + s.jumpOffsetY;
      s.pickups = s.pickups.filter(p => {
        // Check if elephant collects it
        if (
          p.x < ELEPH_X + ELEPH_W - 8 && p.x + p.w > ELEPH_X + 8 &&
          Math.abs(p.y - (elephYForPickup - ELEPH_H / 2)) < 25
        ) {
          if (p.type === 'life' && s.lives < MAX_LIVES) {
            s.lives++;
          }
          return false; // consumed
        }
        return p.x + p.w > -20;
      });

      // ── Collision detection ──
      if (s.invincible > 0) {
        s.invincible--;
      } else {
        const elephY = s.laneY + s.jumpOffsetY;
        const elephRect = {
          x: ELEPH_X + 10,
          y: elephY - ELEPH_H + 5,
          w: ELEPH_W - 20,
          h: ELEPH_H - 8,
        };

        for (const o of s.obstacles) {
          // Only collide if in same lane area
          if (Math.abs(LANE_Y[o.lane] - s.laneY) > LANE_H * 0.6) continue;

          const oHitH = o.hitH || o.h;
          const oRect = { x: o.x, y: o.y + (o.h - oHitH), w: o.w, h: oHitH };

          // Can jump over?
          if (o.canJump && s.jumpOffsetY < -20) continue;

          // AABB collision
          if (
            elephRect.x < oRect.x + oRect.w &&
            elephRect.x + elephRect.w > oRect.x &&
            elephRect.y < oRect.y + oRect.h &&
            elephRect.y + elephRect.h > oRect.y
          ) {
            // Wohnwagen: if jumping and landing on it → bounce off (double-jump)
            if (o.type === 'auto5' && s.jumping && s.jumpVel > 0 && !o._bounced) {
              o._bounced = true;
              s.jumpVel = JUMP_FORCE * 2;
              const sfx = new Audio('/assets/scooter-jump.wav');
              sfx.volume = 0.8;
              sfx.playbackRate = 0.7;
              sfx.play().catch(() => {});
              continue;
            }

            s.lives--;
            s.shakeFrames = 15;
            s.invincible = 60;

            if (s.lives <= 0) {
              s.gameOver = true;
              setPhase('dead');
              return;
            }
            break;
          }
        }
      }

      // ── Win check ──
      if (s.distance >= TARGET_KM * 1000) {
        setPhase('win');
        return;
      }

      // ── RENDER ──
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      // Screen shake
      if (s.shakeFrames > 0) {
        const sx = (Math.random() - 0.5) * 6;
        const sy = (Math.random() - 0.5) * 6;
        ctx.save();
        ctx.translate(sx, sy);
        s.shakeFrames--;
      }

      // ── Background with fade transitions ──
      const BG_FADE_FRAMES = 180; // ~3 sec at 60fps
      const bgList = [imgs.bg1, imgs.bg2, imgs.bg3];
      const newZone = km < 50 ? 0 : km < 100 ? 1 : 2;

      // Detect zone change → start fade
      if (newZone !== s.bgZone && s.bgFade === 0) {
        s.bgFade = 1; // start fading
        s.bgZoneOld = s.bgZone;
        s.bgZone = newZone;
      }

      // Progress fade
      if (s.bgFade > 0 && s.bgFade < BG_FADE_FRAMES) {
        s.bgFade++;
      } else if (s.bgFade >= BG_FADE_FRAMES) {
        s.bgFade = 0; // fade complete
      }

      const drawBg = (img, alpha) => {
        if (!img.complete || img.naturalWidth === 0) return;
        ctx.globalAlpha = alpha;
        const bgW = img.naturalWidth;
        const bgH = img.naturalHeight;
        const scale = CANVAS_H / bgH;
        const drawW = bgW * scale;
        const scrollX = -(s.bgScroll % drawW);
        ctx.drawImage(img, scrollX, 0, drawW, CANVAS_H);
        ctx.drawImage(img, scrollX + drawW, 0, drawW, CANVAS_H);
        if (scrollX + drawW * 2 < CANVAS_W) {
          ctx.drawImage(img, scrollX + drawW * 2, 0, drawW, CANVAS_H);
        }
        ctx.globalAlpha = 1;
      };

      if (s.bgFade > 0) {
        // Cross-fade: old bg fades out, new bg fades in
        const fadeProgress = s.bgFade / BG_FADE_FRAMES;
        drawBg(bgList[s.bgZoneOld], 1 - fadeProgress);
        drawBg(bgList[s.bgZone], fadeProgress);
      } else {
        drawBg(bgList[s.bgZone], 1);
      }

      // ── Road ──
      drawRoad(ctx, s.frame, s.speed);

      // ── Obstacles behind elephant (upper lanes = further from viewer) ──
      const elephLane = s.targetLane;
      s.obstacles.filter(o => o.lane <= elephLane).forEach(o => drawObstacle(ctx, o, imgs));

      // ── Life pickups ──
      s.pickups.forEach(p => {
        const cx = p.x + p.w / 2;
        const cy = p.y + p.h / 2;
        const pulse = Math.sin(s.frame * 0.1) * 0.3 + 0.7;
        ctx.globalAlpha = pulse;
        // Draw green "+" cross
        ctx.fillStyle = '#22c55e';
        ctx.strokeStyle = '#166534';
        ctx.lineWidth = 1.5;
        const armW = 5, armL = 12;
        // Vertical bar
        ctx.fillRect(cx - armW, cy - armL, armW * 2, armL * 2);
        ctx.strokeRect(cx - armW, cy - armL, armW * 2, armL * 2);
        // Horizontal bar
        ctx.fillRect(cx - armL, cy - armW, armL * 2, armW * 2);
        ctx.strokeRect(cx - armL, cy - armW, armL * 2, armW * 2);
        ctx.globalAlpha = 1;
      });

      // ── Elephant ──
      // Bottom of scooter wheels sits at lane center
      const ey = s.laneY + s.jumpOffsetY;
      const elephDrawY = ey - ELEPH_H; // draw from top, so bottom aligns with lane center

      // Shadow — always visible, shrinks when jumping (max 33% smaller)
      {
        const jumpRatio = Math.min(Math.abs(s.jumpOffsetY) / 40, 1); // 0=ground, 1=max height
        const shadowScale = 1 - jumpRatio * 0.33;
        const shadowAlpha = 0.25 - jumpRatio * 0.1;
        ctx.fillStyle = `rgba(0,0,0,${shadowAlpha})`;
        ctx.beginPath();
        ctx.ellipse(ELEPH_X + ELEPH_W / 2, s.laneY, 25 * shadowScale, 6 * shadowScale, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Invincibility flash
      if (s.invincible > 0 && s.frame % 6 < 3) {
        ctx.globalAlpha = 0.4;
      }

      // Draw elephant sprite
      if (imgs.elephant.complete) {
        ctx.drawImage(imgs.elephant, ELEPH_X, elephDrawY, ELEPH_W, ELEPH_H);
      }
      ctx.globalAlpha = 1;

      // ── Obstacles in front of elephant (lower lanes = closer to viewer) ──
      s.obstacles.filter(o => o.lane > elephLane).forEach(o => drawObstacle(ctx, o, imgs));

      // ── HUD ──
      // Distance bar
      const progress = Math.min(s.distance / (TARGET_KM * 1000), 1);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(10, 10, CANVAS_W - 20, 16);
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(10, 10, (CANVAS_W - 20) * progress, 16);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.strokeRect(10, 10, CANVAS_W - 20, 16);

      // KM markers on bar (every 50km)
      for (let i = 50; i < TARGET_KM; i += 50) {
        const mx = 10 + (CANVAS_W - 20) * (i / TARGET_KM);
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.moveTo(mx, 10); ctx.lineTo(mx, 26);
        ctx.stroke();
      }

      // Distance text
      const kmDisplay = Math.min(km, TARGET_KM).toFixed(0);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${kmDisplay} / ${TARGET_KM} km`, CANVAS_W / 2, 22);

      // Lives
      ctx.textAlign = 'left';
      ctx.font = '14px serif';
      for (let i = 0; i < 3; i++) {
        ctx.fillText(i < s.lives ? '❤️' : '🖤', 12 + i * 18, 44);
      }

      // Speed indicator
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${Math.floor(s.speed * 20)} km/h`, CANVAS_W - 12, 42);

      // BG zone indicator
      const zone = ['BERGLAND', 'WALDRAND', 'TIEFER WALD'][s.bgZone];
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '8px monospace';
      ctx.fillText(zone, CANVAS_W - 12, 54);

      if (s.shakeFrames > 0 || s.shakeFrames === 0) {
        ctx.restore();
      }

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [phase]);

  // ─── Wohnwagen animation + sound on title screen ───
  const wohnwagenRef = useRef(null);
  useEffect(() => {
    if (phase !== 'title') return;
    // Animation: 12s total, car goes from right edge (+50vw+400px) to left edge (-50vw-400px)
    // Mid-screen = 50% of animation = 6s. "Kurz davor" = ~5s
    const playPassSound = () => {
      const sfx = new Audio('/assets/car-passes.wav');
      sfx.volume = 0.5;
      sfx.play().catch(() => {});
    };
    const firstTimeout = setTimeout(playPassSound, 6200);
    const interval = setInterval(playPassSound, 15000);
    return () => { clearTimeout(firstTimeout); clearInterval(interval); };
  }, [phase]);

  // ─── UI SCREENS ───
  if (phase === 'title') {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: 400,
        background: colors.bgPrimary, padding: 20,
        overflow: 'hidden', position: 'relative',
      }}>
        <style>{`
          @keyframes wohnwagen-drive {
            0%   { transform: translateX(calc(50vw + 400px)); opacity: 1; }
            90%  { transform: translateX(calc(-50vw - 400px)); opacity: 1; }
            90.1% { opacity: 0; }
            99.9% { transform: translateX(calc(50vw + 400px)); opacity: 0; }
            100% { transform: translateX(calc(50vw + 400px)); opacity: 1; }
          }
        `}</style>
        <img
          src="/assets/elephant-scooter.webp"
          alt="Elephant Scooter"
          style={{ width: 140, height: 'auto', marginBottom: 20 }}
        />
        <div style={{
          fontFamily: fonts.mono, fontSize: 22, fontWeight: 'bold',
          color: colors.yellow, marginBottom: 8, textAlign: 'center',
        }}>
          🛵 ELEPHANT SCOOTER RUN
        </div>
        <div style={{
          fontFamily: fonts.mono, fontSize: 11, color: colors.textMuted,
          textAlign: 'center', maxWidth: 300, marginBottom: 24, lineHeight: 1.6,
        }}>
          Weiche Autos, Schlaglöchern und Absperrungen aus!<br />
          ↕ Wischen = Spur wechseln · Tippen = Springen<br />
          <span style={{ color: colors.accent, fontWeight: 'bold' }}>
            Schaffe {TARGET_KM} km um Geheimcode freizuschalten!
          </span><br />
          Alle {LIFE_DROP_INTERVAL} km gibt's ein Extra-Leben ❤️
        </div>
        <button
          onClick={startGame}
          style={{
            fontFamily: fonts.mono, fontSize: 16, fontWeight: 'bold',
            color: '#fff', background: colors.green,
            border: 'none', borderRadius: 10,
            padding: '14px 40px', cursor: 'pointer',
            marginBottom: 24,
          }}
        >
          ▶ LOS GEHT'S
        </button>
        {/* Animated Wohnwagen driving across */}
        <div style={{
          width: '100%', height: 160, position: 'relative',
          overflow: 'hidden', marginBottom: 8,
        }}>
          <img
            ref={wohnwagenRef}
            src="/assets/auto5.webp"
            alt="Wohnwagen"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: 500,
              height: 'auto',
              marginTop: -60,
              animation: 'wohnwagen-drive 15s linear infinite',
            }}
          />
        </div>
        <div style={{
          fontFamily: fonts.mono, fontSize: 12, color: '#f59e0b',
          fontStyle: 'italic', textAlign: 'center',
        }}>
          Und nimm dich in Acht vor Wohnwagen!!!
        </div>
      </div>
    );
  }

  if (phase === 'dead') {
    const s = stateRef.current;
    const km = s ? (s.distance / 1000).toFixed(1) : '0';
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: 400,
        background: colors.bgPrimary, padding: 20,
      }}>
        <div style={{
          fontSize: 48, marginBottom: 12,
        }}>💥</div>
        <div style={{
          fontFamily: fonts.mono, fontSize: 18, fontWeight: 'bold',
          color: colors.red, marginBottom: 8,
        }}>
          GAME OVER
        </div>
        <div style={{
          fontFamily: fonts.mono, fontSize: 13, color: colors.textMuted,
          marginBottom: 24,
        }}>
          Du hast {km} km geschafft
        </div>
        <button
          onClick={startGame}
          style={{
            fontFamily: fonts.mono, fontSize: 14, fontWeight: 'bold',
            color: '#fff', background: colors.orange,
            border: 'none', borderRadius: 10,
            padding: '12px 36px', cursor: 'pointer',
          }}
        >
          ↻ NOCHMAL
        </button>
      </div>
    );
  }

  if (phase === 'win') {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: 400,
        background: colors.bgPrimary, padding: 20,
      }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🏆</div>
        <div style={{
          fontFamily: fonts.mono, fontSize: 18, fontWeight: 'bold',
          color: colors.green, marginBottom: 8,
        }}>
          {TARGET_KM} KM GESCHAFFT!
        </div>
        <div style={{
          background: `${colors.green}15`, border: `1px solid ${colors.green}40`,
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
            fontFamily: fonts.mono, fontSize: 12, color: colors.textSecondary,
            marginBottom: 8,
          }}>
            Trage diese Zahlen in die Matrix ein:
          </div>
          <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
            {(matrixClue || '? ? ?').split(' ').map((d, i) => (
              <span key={i} style={{
                width: 36, height: 40,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, fontFamily: fonts.mono, fontWeight: 'bold',
                background: 'rgba(46, 160, 67, 0.15)',
                border: `2px solid ${colors.green}`,
                borderRadius: 6, color: colors.yellow,
              }}>{d}</span>
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
      </div>
    );
  }

  // ─── Playing state — show canvas ───
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      background: '#000', padding: 0,
    }}>
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        style={{
          width: '100%',
          height: 'auto',
          imageRendering: 'auto',
          touchAction: 'none',
        }}
      />
      <div style={{
        display: 'flex', gap: 20, padding: '10px 0',
        fontFamily: fonts.mono, fontSize: 10, color: colors.textSubtle,
      }}>
        <span>↑↓ Spur wechseln</span>
        <span>SPACE Springen</span>
      </div>
    </div>
  );
}
