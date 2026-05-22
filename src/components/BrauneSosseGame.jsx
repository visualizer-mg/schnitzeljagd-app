import React, { useRef, useEffect, useState, useCallback } from 'react';

// ═══════════════════════════════════════════════════════
// Braune Soße — Fruit-Ninja-Style Kochspiel für Beate
// Wische über Zutaten um sie zu schneiden/sammeln.
// 3 Levels + Topf-Level. Bomben = Leben verlieren.
// ═══════════════════════════════════════════════════════

const ASSET_BASE = '/assets/braune-sosse/';

// ─── Zutaten-Definitionen ───
const CORRECT_INGREDIENTS = [
  { key: 'fleisch',     label: 'Fleisch & Knochen', img: 'fleisch.png' },
  { key: 'zwiebel',     label: 'Zwiebel',           img: 'onion.png' },
  { key: 'karotte',     label: 'Karotte',            img: 'karotte2.png' },
  { key: 'sellerie',    label: 'Sellerie',           img: 'celery.png' },
  { key: 'tomatenmark', label: 'Tomatenmark',        img: 'tomatenmark.png' },
  { key: 'mehl',        label: 'Mehl',               img: 'mehl.png' },
  { key: 'butter',      label: 'Butter',             img: 'butter.png' },
  { key: 'lorbeer',     label: 'Lorbeer',            img: 'lorbeer.png' },
  { key: 'pfeffer',     label: 'Pfeffer',            img: 'pfeffer.png' },
  { key: 'bruehe',      label: 'Brühe',              img: 'bruehe.png' },
  { key: 'wein',        label: 'Rotwein',            img: 'wein.png' },
];

const WRONG_INGREDIENTS = [
  { key: 'banane',      label: 'Banane',             img: 'banane.png' },
  { key: 'apfel',       label: 'Apfel',              img: 'apfel.png' },
  { key: 'schokolade',  label: 'Schokolade',         img: 'chocolate2.png' },
  { key: 'fisch',       label: 'Fisch',              img: 'fish.png' },
];

const ALL_INGREDIENTS = [...CORRECT_INGREDIENTS, ...WRONG_INGREDIENTS];

const LEVEL_TARGETS = { 1: 5, 2: 7, 3: 10 };
const MAX_LIVES = 3;

// ─── Canvas sizing ───
const CANVAS_W = 480;
const CANVAS_H = 700;   // tall for mobile fullscreen feel
const ITEM_SIZE = 80;    // sprite draw size
const SPAWN_INTERVAL_BASE = 800; // ms between spawns
const SPAWN_INTERVAL_MIN = 400;

// Physics
const LAUNCH_VY_MIN = -15;
const LAUNCH_VY_MAX = -11;
const GRAVITY = 0.18;
const LAUNCH_VX_RANGE = 2;

// Swipe detection
const SWIPE_RADIUS = 50; // px — how close swipe must be to item center

export default function BrauneSosseGame({ matrixClue = '???', onWin }) {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const rafRef = useRef(null);
  const [screen, setScreen] = useState('title'); // title | playing | pot | password | win
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(MAX_LIVES);
  const [collected, setCollected] = useState({}); // { key: count }
  const [potItems, setPotItems] = useState([]); // items thrown in pot
  const [potCorrect, setPotCorrect] = useState(0);
  const [potWrong, setPotWrong] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [showLevelComplete, setShowLevelComplete] = useState(false);
  const [levelCompleteText, setLevelCompleteText] = useState('');

  // ─── Image loading ───
  const imagesRef = useRef({});
  const imagesLoadedRef = useRef(false);

  useEffect(() => {
    const allAssets = [
      ...ALL_INGREDIENTS.map(i => i.img),
      'bomb.png', 'topf.png', 'right.png', 'wrong2.png',
    ];
    let loaded = 0;
    allAssets.forEach(name => {
      const img = new Image();
      img.src = ASSET_BASE + name;
      img.onload = () => {
        loaded++;
        if (loaded === allAssets.length) imagesLoadedRef.current = true;
      };
      imagesRef.current[name] = img;
    });
  }, []);

  // ─── Game state (mutable for rAF loop) ───
  const initGameState = useCallback((lvl) => {
    return {
      items: [],          // flying items on screen
      sliceTrail: [],     // visual trail of swipe
      collected: {},      // { key: count } — for this level
      totalCollected: {}, // running total across all levels
      spawnTimer: 0,
      lastTs: 0,
      level: lvl,
      lives: MAX_LIVES,
      gameOver: false,
      levelDone: false,
      bombFlash: 0,
      missFlash: 0,       // X flash when missing ingredient
      slicedItems: [],    // recently sliced items floating away
      comboText: [],      // floating "+1" texts
    };
  }, []);

  // ─── Start game / level ───
  const startLevel = useCallback((lvl, keepState = false) => {
    const s = initGameState(lvl);
    if (keepState && stateRef.current) {
      s.totalCollected = { ...stateRef.current.totalCollected };
      s.lives = stateRef.current.lives;
    }
    stateRef.current = s;
    setLevel(lvl);
    setLives(s.lives);
    setCollected({});
    setScreen('playing');
    setShowLevelComplete(false);
  }, [initGameState]);

  const startGame = useCallback(() => {
    const s = initGameState(1);
    stateRef.current = s;
    setLevel(1);
    setLives(MAX_LIVES);
    setCollected({});
    setPotItems([]);
    setPotCorrect(0);
    setPotWrong(false);
    setPasswordInput('');
    setPasswordError(false);
    setScreen('playing');
    setShowLevelComplete(false);
  }, [initGameState]);

  // ─── Spawn items ───
  const spawnItem = useCallback((s) => {
    const target = LEVEL_TARGETS[s.level] || 10;
    // Decide what to spawn: correct, wrong, or bomb
    const r = Math.random();
    let ingredient;
    let isBomb = false;

    if (r < 0.15) {
      // 15% chance bomb
      isBomb = true;
    } else if (r < 0.35) {
      // 20% chance wrong ingredient
      ingredient = WRONG_INGREDIENTS[Math.floor(Math.random() * WRONG_INGREDIENTS.length)];
    } else {
      // 65% correct — prefer under-collected ones
      const underCollected = CORRECT_INGREDIENTS.filter(
        ing => (s.collected[ing.key] || 0) < target
      );
      if (underCollected.length > 0) {
        ingredient = underCollected[Math.floor(Math.random() * underCollected.length)];
      } else {
        ingredient = CORRECT_INGREDIENTS[Math.floor(Math.random() * CORRECT_INGREDIENTS.length)];
      }
    }

    const x = 40 + Math.random() * (CANVAS_W - 80);
    const vy = LAUNCH_VY_MIN + Math.random() * (LAUNCH_VY_MAX - LAUNCH_VY_MIN);
    const vx = (Math.random() - 0.5) * LAUNCH_VX_RANGE * 2;

    s.items.push({
      x,
      y: CANVAS_H + 20,
      vx,
      vy,
      rotation: 0,
      rotSpeed: (Math.random() - 0.5) * 0.1,
      isBomb,
      ingredient: isBomb ? null : ingredient,
      sliced: false,
      id: Date.now() + Math.random(),
    });
  }, []);

  // ─── Touch / Swipe handling ───
  useEffect(() => {
    if (screen !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let touching = false;
    let lastTouchPos = null;

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_W / rect.width;
      const scaleY = CANVAS_H / rect.height;
      const t = e.touches ? e.touches[0] : e;
      return {
        x: (t.clientX - rect.left) * scaleX,
        y: (t.clientY - rect.top) * scaleY,
      };
    };

    const checkSlice = (pos) => {
      const s = stateRef.current;
      if (!s || s.gameOver || s.levelDone) return;

      for (const item of s.items) {
        if (item.sliced) continue;
        const dx = pos.x - item.x;
        const dy = pos.y - item.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < SWIPE_RADIUS) {
          item.sliced = true;

          if (item.isBomb) {
            // Bomb hit! Lose a life
            s.lives--;
            s.bombFlash = 20;
            setLives(s.lives);
            if (s.lives <= 0) {
              s.gameOver = true;
            }
          } else {
            // Collect ingredient
            const key = item.ingredient.key;
            s.collected[key] = (s.collected[key] || 0) + 1;
            s.totalCollected[key] = (s.totalCollected[key] || 0) + 1;
            setCollected({ ...s.collected });

            // Floating text
            s.comboText.push({
              x: item.x, y: item.y,
              text: `+1 ${item.ingredient.label}`,
              alpha: 1,
              vy: -2,
            });

            // Sliced item animation
            s.slicedItems.push({
              x: item.x, y: item.y,
              vx: -3 + Math.random() * 6,
              vy: -4 + Math.random() * 2,
              img: item.ingredient.img,
              alpha: 1,
              rotation: item.rotation,
              rotSpeed: (Math.random() - 0.5) * 0.3,
            });
          }
        }
      }

      // Add trail
      s.sliceTrail.push({ x: pos.x, y: pos.y, alpha: 1 });
      if (s.sliceTrail.length > 30) s.sliceTrail.shift();
    };

    const onTouchStart = (e) => {
      if (e.cancelable) e.preventDefault();
      touching = true;
      lastTouchPos = getPos(e);
      checkSlice(lastTouchPos);
    };
    const onTouchMove = (e) => {
      if (e.cancelable) e.preventDefault();
      if (!touching) return;
      const pos = getPos(e);
      checkSlice(pos);
      lastTouchPos = pos;
    };
    const onTouchEnd = (e) => {
      if (e.cancelable) e.preventDefault();
      touching = false;
      lastTouchPos = null;
    };

    // Mouse fallback for dev
    const onMouseDown = (e) => {
      touching = true;
      const pos = getPos(e);
      checkSlice(pos);
    };
    const onMouseMove = (e) => {
      if (!touching) return;
      const pos = getPos(e);
      checkSlice(pos);
    };
    const onMouseUp = () => { touching = false; };

    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);

    return () => {
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseup', onMouseUp);
    };
  }, [screen]);

  // ─── Game loop ───
  useEffect(() => {
    if (screen !== 'playing') {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const loop = (timestamp) => {
      const s = stateRef.current;
      if (!s) return;
      if (!s.lastTs) s.lastTs = timestamp;
      const rawDt = timestamp - s.lastTs;
      s.lastTs = timestamp;
      const dt = Math.min(rawDt, 33.3) / 16.667;

      // ── Spawn ──
      s.spawnTimer += rawDt;
      const interval = Math.max(SPAWN_INTERVAL_MIN, SPAWN_INTERVAL_BASE - (s.level - 1) * 100);
      if (s.spawnTimer >= interval && !s.gameOver && !s.levelDone) {
        spawnItem(s);
        s.spawnTimer = 0;
      }

      // ── Update items ──
      for (const item of s.items) {
        item.vy += GRAVITY * dt;
        item.y += item.vy * dt;
        item.x += item.vx * dt;
        item.rotation += item.rotSpeed * dt;
      }
      // Remove items that fell below screen — penalty for missed correct ingredients
      const survived = [];
      for (const item of s.items) {
        if (item.y >= CANVAS_H + 60) {
          // Item fell off — if it was a correct ingredient and not sliced, penalty!
          if (!item.sliced && !item.isBomb && item.ingredient &&
              CORRECT_INGREDIENTS.some(c => c.key === item.ingredient.key)) {
            // Deduct 5 from a random collected ingredient
            const collectedKeys = Object.keys(s.collected).filter(k => s.collected[k] > 0);
            let deducted = 0;
            while (deducted < 5 && collectedKeys.length > 0) {
              const rk = collectedKeys[Math.floor(Math.random() * collectedKeys.length)];
              if (s.collected[rk] > 0) {
                s.collected[rk]--;
                s.totalCollected[rk] = Math.max(0, (s.totalCollected[rk] || 0) - 1);
                deducted++;
              }
              if (s.collected[rk] <= 0) {
                collectedKeys.splice(collectedKeys.indexOf(rk), 1);
              }
            }
            if (deducted > 0) {
              s.missFlash = 15;
              s.comboText.push({
                x: CANVAS_W / 2, y: CANVAS_H / 2,
                text: `−${deducted} Zutaten verpasst!`,
                alpha: 1,
                vy: -1.5,
              });
              setCollected({ ...s.collected });
            }
          }
        } else {
          survived.push(item);
        }
      }
      s.items = survived;

      // ── Update sliced items ──
      for (const si of s.slicedItems) {
        si.vy += 0.3 * dt;
        si.y += si.vy * dt;
        si.x += si.vx * dt;
        si.alpha -= 0.02 * dt;
        si.rotation += si.rotSpeed * dt;
      }
      s.slicedItems = s.slicedItems.filter(si => si.alpha > 0);

      // ── Update combo text ──
      for (const ct of s.comboText) {
        ct.y += ct.vy * dt;
        ct.alpha -= 0.015 * dt;
      }
      s.comboText = s.comboText.filter(ct => ct.alpha > 0);

      // ── Slice trail fade ──
      for (const t of s.sliceTrail) t.alpha -= 0.05 * dt;
      s.sliceTrail = s.sliceTrail.filter(t => t.alpha > 0);

      // ── Bomb flash ──
      if (s.bombFlash > 0) s.bombFlash -= 1 * dt;
      if (s.missFlash > 0) s.missFlash -= 1 * dt;

      // ── Check level completion ──
      if (!s.levelDone && !s.gameOver) {
        const target = LEVEL_TARGETS[s.level];
        const allDone = CORRECT_INGREDIENTS.every(
          ing => (s.collected[ing.key] || 0) >= target
        );
        if (allDone) {
          s.levelDone = true;
          // Show level complete message
          if (s.level < 3) {
            setShowLevelComplete(true);
            setLevelCompleteText(`Level ${s.level} geschafft!`);
            setTimeout(() => {
              startLevel(s.level + 1, true);
            }, 2000);
          } else {
            // Level 3 done → go to pot phase
            setShowLevelComplete(true);
            setLevelCompleteText('Alle Zutaten gesammelt! Ab in den Topf!');
            setTimeout(() => {
              goToPot(s.totalCollected);
            }, 2500);
          }
        }
      }

      // ── Draw ──
      // Background — dark kitchen gradient
      ctx.fillStyle = '#1a0a00';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Subtle cutting board pattern
      ctx.fillStyle = 'rgba(80, 40, 10, 0.3)';
      for (let i = 0; i < CANVAS_W; i += 40) {
        ctx.fillRect(i, 0, 1, CANVAS_H);
      }
      for (let j = 0; j < CANVAS_H; j += 40) {
        ctx.fillRect(0, j, CANVAS_W, 1);
      }

      // ── Draw slice trail ──
      for (let i = 1; i < s.sliceTrail.length; i++) {
        const prev = s.sliceTrail[i - 1];
        const curr = s.sliceTrail[i];
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(curr.x, curr.y);
        ctx.strokeStyle = `rgba(255, 220, 100, ${curr.alpha * 0.8})`;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      // ── Draw items ──
      for (const item of s.items) {
        if (item.sliced) continue;
        ctx.save();
        ctx.translate(item.x, item.y);
        ctx.rotate(item.rotation);

        const imgKey = item.isBomb ? 'bomb.png' : item.ingredient.img;
        const img = imagesRef.current[imgKey];
        if (img && img.complete) {
          ctx.drawImage(img, -ITEM_SIZE / 2, -ITEM_SIZE / 2, ITEM_SIZE, ITEM_SIZE);
        } else {
          // Fallback
          ctx.fillStyle = item.isBomb ? '#333' : '#8B4513';
          ctx.fillRect(-ITEM_SIZE / 2, -ITEM_SIZE / 2, ITEM_SIZE, ITEM_SIZE);
          ctx.fillStyle = '#fff';
          ctx.font = '12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(item.isBomb ? '💣' : item.ingredient.label, 0, 5);
        }
        ctx.restore();
      }

      // ── Draw sliced items (half opacity, falling) ──
      for (const si of s.slicedItems) {
        ctx.save();
        ctx.globalAlpha = si.alpha;
        ctx.translate(si.x, si.y);
        ctx.rotate(si.rotation);
        const img = imagesRef.current[si.img];
        if (img && img.complete) {
          ctx.drawImage(img, -ITEM_SIZE / 2, -ITEM_SIZE / 2, ITEM_SIZE, ITEM_SIZE);
        }
        ctx.restore();
      }

      // ── Combo text ──
      for (const ct of s.comboText) {
        ctx.save();
        ctx.globalAlpha = ct.alpha;
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(ct.text, ct.x, ct.y);
        ctx.restore();
      }

      // ── Bomb flash overlay ──
      if (s.bombFlash > 0) {
        ctx.fillStyle = `rgba(255, 0, 0, ${s.bombFlash / 40})`;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      }

      // ── Miss flash (orange X) ──
      if (s.missFlash > 0) {
        ctx.fillStyle = `rgba(255, 140, 0, ${s.missFlash / 30})`;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.save();
        ctx.globalAlpha = s.missFlash / 15;
        ctx.fillStyle = '#ff4444';
        ctx.font = 'bold 80px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✗', CANVAS_W / 2, CANVAS_H / 2);
        ctx.restore();
      }

      // ── HUD ──
      // Level + Lives at top
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, CANVAS_W, 50);

      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`Level ${s.level}`, 15, 33);

      // Lives
      ctx.textAlign = 'right';
      ctx.fillStyle = '#f87171';
      let heartsText = '';
      for (let i = 0; i < MAX_LIVES; i++) {
        heartsText += i < s.lives ? '❤️ ' : '🖤 ';
      }
      ctx.font = '22px sans-serif';
      ctx.fillText(heartsText, CANVAS_W - 10, 35);

      // Progress bar at bottom
      const target = LEVEL_TARGETS[s.level];
      const totalNeeded = CORRECT_INGREDIENTS.length * target;
      const totalGot = CORRECT_INGREDIENTS.reduce(
        (sum, ing) => sum + Math.min(s.collected[ing.key] || 0, target), 0
      );
      const progress = totalGot / totalNeeded;

      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, CANVAS_H - 30, CANVAS_W, 30);
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(10, CANVAS_H - 22, CANVAS_W - 20, 14);
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(10, CANVAS_H - 22, (CANVAS_W - 20) * progress, 14);

      ctx.fillStyle = '#fff';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${totalGot} / ${totalNeeded}`, CANVAS_W / 2, CANVAS_H - 11);

      // ── Level complete overlay ──
      if (s.levelDone) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      }

      // ── Game over overlay ──
      if (s.gameOver) {
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = '#f87171';
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Game Over!', CANVAS_W / 2, CANVAS_H / 2 - 30);
        ctx.fillStyle = '#fff';
        ctx.font = '18px sans-serif';
        ctx.fillText('Tippe um neu zu starten', CANVAS_W / 2, CANVAS_H / 2 + 20);
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [screen, spawnItem, startLevel]);

  // ─── Game Over tap to restart ───
  useEffect(() => {
    if (screen !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleRestart = (e) => {
      const s = stateRef.current;
      if (s && s.gameOver) {
        if (e.cancelable) e.preventDefault();
        startGame();
      }
    };

    canvas.addEventListener('touchstart', handleRestart, { passive: false });
    canvas.addEventListener('click', handleRestart);
    return () => {
      canvas.removeEventListener('touchstart', handleRestart);
      canvas.removeEventListener('click', handleRestart);
    };
  }, [screen, startGame]);

  // ─── Pot phase ───
  const goToPot = useCallback((totalCollected) => {
    // Build list of collected items for the pot screen
    const items = [];
    for (const ing of ALL_INGREDIENTS) {
      const count = totalCollected[ing.key] || 0;
      if (count > 0) {
        items.push({
          ...ing,
          count,
          isCorrect: CORRECT_INGREDIENTS.some(c => c.key === ing.key),
          inPot: false,
          rejected: false,
        });
      }
    }
    // Shuffle
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    setPotItems(items);
    setPotCorrect(0);
    setPotWrong(false);
    setScreen('pot');
  }, []);

  const handlePotTap = useCallback((index) => {
    setPotItems(prev => {
      const items = [...prev];
      const item = items[index];
      if (item.inPot || item.rejected) return prev;

      if (item.isCorrect) {
        items[index] = { ...item, inPot: true };
        const newCorrectCount = items.filter(i => i.isCorrect && i.inPot).length;
        setPotCorrect(newCorrectCount);

        // All correct in pot?
        if (newCorrectCount === CORRECT_INGREDIENTS.length) {
          setTimeout(() => setScreen('password'), 1500);
        }
        return items;
      } else {
        // Wrong ingredient! Reset pot
        items[index] = { ...item, rejected: true };
        setPotWrong(true);
        setTimeout(() => {
          setPotItems(prev2 => prev2.map(it => ({
            ...it,
            inPot: false,
            rejected: false,
          })));
          setPotCorrect(0);
          setPotWrong(false);
        }, 1500);
        return items;
      }
    });
  }, []);

  // ─── Password check ───
  const handlePasswordSubmit = useCallback(() => {
    const answer = passwordInput.trim().toLowerCase();
    if (answer === 'braune soße' || answer === 'braune sosse' || answer === 'braune sauce') {
      setScreen('win');
      if (onWin) onWin();
    } else {
      setPasswordError(true);
      setTimeout(() => setPasswordError(false), 2000);
    }
  }, [passwordInput, onWin]);

  // ─── Shared fullscreen wrapper ───
  const fullscreen = {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    width: '100vw',
    height: '100vh',
    height: '100dvh',
    background: '#1a0a00',
    zIndex: 100,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Inter', -apple-system, sans-serif",
    color: '#fff',
    overflow: 'hidden',
    touchAction: 'none',
    userSelect: 'none',
    WebkitUserSelect: 'none',
  };

  // ═══════════════════════════════════════════
  // TITLE SCREEN
  // ═══════════════════════════════════════════
  if (screen === 'title') {
    return (
      <div style={fullscreen} onClick={startGame}
        onTouchStart={(e) => { if (e.cancelable) e.preventDefault(); startGame(); }}>
        <div style={{ textAlign: 'center', padding: 30 }}>
          <div style={{ fontSize: 60, marginBottom: 20 }}>🍲</div>
          <h1 style={{
            fontSize: 'clamp(28px, 7vw, 42px)',
            fontWeight: 800,
            color: '#fbbf24',
            margin: '0 0 10px',
            textShadow: '2px 2px 8px rgba(0,0,0,0.8)',
          }}>
            Braune Soße
          </h1>
          <p style={{
            fontSize: 'clamp(14px, 3.5vw, 18px)',
            color: 'rgba(255,255,255,0.7)',
            margin: '0 0 30px',
            lineHeight: 1.6,
          }}>
            Wische über die Zutaten um sie zu schneiden!<br />
            Vorsicht vor Bomben! 💣
          </p>
          <div style={{
            display: 'inline-block',
            padding: '14px 40px',
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            borderRadius: 16,
            fontSize: 20,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(245,158,11,0.4)',
          }}>
            🔪 Los geht's!
          </div>
          <div style={{
            marginTop: 25,
            fontSize: 13,
            color: 'rgba(255,255,255,0.4)',
            lineHeight: 1.8,
          }}>
            Level 1–3: Zutaten einsammeln<br />
            Level 4: Die richtigen in den Topf werfen<br />
            3 Leben — Bomben kosten ein Leben
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // PLAYING SCREEN (Canvas)
  // ═══════════════════════════════════════════
  if (screen === 'playing') {
    return (
      <div style={fullscreen}>
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{
            width: '100%',
            maxWidth: 480,
            height: '100%',
            maxHeight: '100dvh',
            objectFit: 'contain',
            touchAction: 'none',
          }}
        />
        {showLevelComplete && (
          <div style={{
            position: 'absolute',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(0,0,0,0.85)',
            padding: '30px 50px',
            borderRadius: 20,
            textAlign: 'center',
            zIndex: 200,
            border: '2px solid #fbbf24',
          }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>✅</div>
            <div style={{
              fontSize: 22,
              fontWeight: 700,
              color: '#fbbf24',
            }}>
              {levelCompleteText}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // POT SCREEN (Level 4)
  // ═══════════════════════════════════════════
  if (screen === 'pot') {
    return (
      <div style={{
        ...fullscreen,
        justifyContent: 'flex-start',
        overflow: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}>
        <div style={{
          padding: 'max(20px, env(safe-area-inset-top)) 20px 20px',
          width: '100%',
          maxWidth: 480,
        }}>
          {/* Pot header */}
          <div style={{ textAlign: 'center', marginBottom: 15 }}>
            <div style={{ fontSize: 50 }}>🍲</div>
            <h2 style={{
              fontSize: 22,
              fontWeight: 700,
              color: '#fbbf24',
              margin: '5px 0',
            }}>
              Level 4 — Der Topf
            </h2>
            <p style={{
              fontSize: 14,
              color: 'rgba(255,255,255,0.6)',
              margin: 0,
            }}>
              Tippe nur die richtigen Zutaten für braune Soße!
            </p>
            <div style={{
              marginTop: 10,
              fontSize: 16,
              color: '#4ade80',
              fontWeight: 600,
            }}>
              {potCorrect} / {CORRECT_INGREDIENTS.length} im Topf
            </div>
          </div>

          {/* Wrong ingredient flash */}
          {potWrong && (
            <div style={{
              background: 'rgba(248, 113, 113, 0.2)',
              border: '2px solid #f87171',
              borderRadius: 12,
              padding: '12px 20px',
              textAlign: 'center',
              marginBottom: 15,
              fontSize: 16,
              color: '#f87171',
              fontWeight: 600,
            }}>
              ❌ Falsche Zutat! Topf wird geleert...
            </div>
          )}

          {/* Ingredient grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 10,
          }}>
            {potItems.map((item, idx) => (
              <div
                key={item.key}
                onClick={() => !item.inPot && !item.rejected && !potWrong && handlePotTap(idx)}
                style={{
                  background: item.inPot
                    ? 'rgba(74, 222, 128, 0.2)'
                    : item.rejected
                    ? 'rgba(248, 113, 113, 0.3)'
                    : 'rgba(255,255,255,0.08)',
                  border: item.inPot
                    ? '2px solid #4ade80'
                    : item.rejected
                    ? '2px solid #f87171'
                    : '2px solid rgba(255,255,255,0.15)',
                  borderRadius: 14,
                  padding: 10,
                  textAlign: 'center',
                  cursor: item.inPot ? 'default' : 'pointer',
                  opacity: item.inPot ? 0.6 : 1,
                  transition: 'all 0.3s',
                  minHeight: 100,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src={ASSET_BASE + item.img}
                  alt={item.label}
                  style={{
                    width: 55,
                    height: 55,
                    objectFit: 'contain',
                    marginBottom: 6,
                  }}
                />
                <div style={{
                  fontSize: 11,
                  color: item.inPot ? '#4ade80' : '#fff',
                  fontWeight: 600,
                }}>
                  {item.label}
                </div>
                {item.inPot && (
                  <div style={{ color: '#4ade80', fontSize: 18, marginTop: 4 }}>✓</div>
                )}
                {item.rejected && (
                  <div style={{ color: '#f87171', fontSize: 18, marginTop: 4 }}>✗</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // PASSWORD SCREEN
  // ═══════════════════════════════════════════
  if (screen === 'password') {
    return (
      <div style={{
        ...fullscreen,
        justifyContent: 'center',
      }}>
        <div style={{
          padding: 30,
          textAlign: 'center',
          width: '100%',
          maxWidth: 400,
        }}>
          <div style={{ fontSize: 60, marginBottom: 15 }}>🍲</div>
          <h2 style={{
            fontSize: 24,
            fontWeight: 700,
            color: '#fbbf24',
            margin: '0 0 10px',
          }}>
            Alle Zutaten im Topf!
          </h2>
          <p style={{
            fontSize: 16,
            color: 'rgba(255,255,255,0.7)',
            margin: '0 0 25px',
            lineHeight: 1.5,
          }}>
            Was kommt raus, wenn man diese Zutaten zusammen kocht?
          </p>

          <input
            type="text"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
            placeholder="Deine Antwort..."
            autoFocus
            style={{
              width: '100%',
              padding: '14px 20px',
              fontSize: 18,
              borderRadius: 14,
              border: passwordError ? '2px solid #f87171' : '2px solid rgba(255,255,255,0.2)',
              background: 'rgba(255,255,255,0.1)',
              color: '#fff',
              outline: 'none',
              textAlign: 'center',
              boxSizing: 'border-box',
              marginBottom: 15,
            }}
          />

          {passwordError && (
            <div style={{
              color: '#f87171',
              fontSize: 14,
              marginBottom: 15,
            }}>
              Das ist leider nicht richtig... Versuch es nochmal!
            </div>
          )}

          <button
            onClick={handlePasswordSubmit}
            style={{
              padding: '14px 40px',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              border: 'none',
              borderRadius: 14,
              fontSize: 18,
              fontWeight: 700,
              color: '#fff',
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(245,158,11,0.4)',
            }}
          >
            Antwort prüfen
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // WIN SCREEN
  // ═══════════════════════════════════════════
  if (screen === 'win') {
    return (
      <div style={{
        ...fullscreen,
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a0a00 0%, #2d1810 50%, #1a0a00 100%)',
      }}>
        <div style={{
          padding: 30,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 70, marginBottom: 15 }}>🎉</div>
          <h2 style={{
            fontSize: 28,
            fontWeight: 800,
            color: '#4ade80',
            margin: '0 0 10px',
          }}>
            Perfekt, Beate!
          </h2>
          <p style={{
            fontSize: 18,
            color: 'rgba(255,255,255,0.8)',
            margin: '0 0 25px',
          }}>
            Du hast die perfekte braune Soße gekocht! 🍲
          </p>
          <div style={{
            background: 'rgba(74, 222, 128, 0.15)',
            border: '2px solid #4ade80',
            borderRadius: 16,
            padding: '20px 30px',
            marginBottom: 20,
          }}>
            <div style={{
              fontSize: 14,
              color: 'rgba(255,255,255,0.5)',
              marginBottom: 8,
            }}>
              Dein Matrix-Code:
            </div>
            <div style={{
              fontSize: 32,
              fontWeight: 800,
              color: '#fbbf24',
              letterSpacing: 4,
            }}>
              🔑 {matrixClue}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
