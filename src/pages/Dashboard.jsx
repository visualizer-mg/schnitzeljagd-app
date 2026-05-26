import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import TreasureChest from '../components/TreasureChest';
import XWingGame from '../components/XWingGame';
import CheeseGame from '../components/CheeseGame';
import HorseGame from '../components/HorseGame';
import ScooterGame from '../components/ScooterGame';
import BrauneSosseGame from '../components/BrauneSosseGame';
import MemoryGame from '../components/MemoryGame';
import PuzzleGame from '../components/PuzzleGame';
import PeriodensystemGame from '../components/PeriodensystemGame';

// Puzzles per player — first chest = game
// chained: true → needs password before chest can be opened
// password: case-insensitive password to break the chain
const PLAYER_PUZZLES = {
  andreas: [
    { id: 'andreas-1', label: 'Klavier / Indiana Jones', chained: true, password: 'indiana jones', taunt: 'Krame, so einfach isses net! Erstmal korrektes Passwort eingeben!' },
    { id: 'andreas-2', label: 'Elephant Scooter Run', chained: true, password: 'wohnwagen', taunt: 'Erstmal das richtige Passwort eingeben, Krame!', game: 'scooter', matrixClue: 'D5: 8 - 6 - 3 - 0' },
    { id: 'andreas-3', label: 'Rätsel 3', chained: true, password: '' },
  ],
  mark: [
    { id: 'mark-1', label: 'Rätsel 1', solvedLabel: 'X-Wing Assault', chained: true, password: 'star wars', taunt: 'Mark, so einfach isses net! Erstmal korrektes Passwort eingeben!', game: 'xwing', matrixClue: 'C10: 5 - 0 - 2 - 8 - 4' },
    { id: 'mark-2', label: 'Rätsel 2', solvedLabel: 'Periodensystem', game: 'periodensystem', replayLabel: '📋 Ergebnis nochmal ansehen' },
  ],
  ellen: [
    { id: 'ellen-1', label: 'Käse-Jagd', game: 'cheese', matrixClue: 'C1: 3 - 8 - 4 - 6 - 1 - 2' },
  ],
  theresa: [
    { id: 'theresa-1', label: 'Himmelsritt', game: 'horse', matrixClue: 'C6: 7 - 8 - 2 - 6' },
  ],
  beate: [
    { id: 'beate-1', label: 'Braune Soße Memory', game: 'braune-sosse', matrixClue: 'C5: 2 - 6 - 5 - 4 - 1 - 3' },
  ],
  andrea: [
    { id: 'andrea-1', label: 'Memory-Spiel', game: 'memory', matrixClue: 'D2: 7 - 8 - 1 - 2' },
  ],
  rowena: [
    { id: 'rowena-1', label: 'Foto-Puzzle', game: 'puzzle', matrixClue: 'C11: 2 - 0 - 5 - 9 - 3' },
  ],
};

export default function Dashboard({ player, onLogout }) {
  const [progress, setProgress] = useState([]);
  const [clues, setClues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openedChests, setOpenedChests] = useState(new Set());
  const [activeGame, setActiveGame] = useState(null); // { game: 'xwing', puzzleId: 'mark-1' } or null

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [progressRes, cluesRes] = await Promise.all([
      supabase.from('progress').select('*').eq('player_id', player.id),
      supabase.from('matrix_clues').select('*').eq('player_id', player.id),
    ]);
    if (progressRes.error) console.error('❌ Load progress failed:', progressRes.error);
    if (cluesRes.error) console.error('❌ Load clues failed:', cluesRes.error);

    const progressData = progressRes.data || [];
    setProgress(progressData);
    setClues(cluesRes.data || []);
    console.log('📦 Loaded progress:', progressData);

    // Mark already-opened puzzles (unlocked or solved) as opened
    const opened = new Set();
    progressData.forEach(p => {
      if (p.status === 'unlocked' || p.status === 'solved') opened.add(p.puzzle_id);
    });
    setOpenedChests(opened);
    console.log('🔓 Opened chests:', [...opened]);
    setLoading(false);
  };

  const handleChestOpen = async (puzzleId, game) => {
    setOpenedChests(prev => new Set([...prev, puzzleId]));

    // Save progress to Supabase — mark as unlocked (or solved if no game)
    const status = game ? 'unlocked' : 'solved';
    const { error } = await supabase.from('progress').upsert({
      player_id: player.id,
      puzzle_id: puzzleId,
      status,
    }, { onConflict: 'player_id,puzzle_id' });
    if (error) console.error('❌ Progress upsert failed:', error);
    else console.log('✅ Progress saved:', puzzleId, status);

    // Log the event
    await supabase.from('event_log').insert({
      player_id: player.id,
      event_type: 'chest_opened',
      event_data: { puzzle_id: puzzleId },
    });

    // Reload progress
    await loadData();

    // If this chest has a game, launch it after a short delay
    if (game) {
      setTimeout(() => setActiveGame({ game, puzzleId }), 1500);
    }
  };

  const handleGameWin = async (puzzleId) => {
    // Mark the puzzle as solved in Supabase
    if (puzzleId) {
      const { error } = await supabase.from('progress').upsert({
        player_id: player.id,
        puzzle_id: puzzleId,
        status: 'solved',
      }, { onConflict: 'player_id,puzzle_id' });
      if (error) console.error('❌ Game win upsert failed:', error);
      else console.log('✅ Game solved:', puzzleId);
    }

    setActiveGame(null);
    // Reload data
    await loadData();
  };

  const solvedCount = progress.filter(p => p.status === 'solved').length;
  const puzzles = PLAYER_PUZZLES[player.name] || null;

  // ─── Fullscreen Game Mode ───
  if (activeGame) {
    return (
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: '#000',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Back button */}
        <button
          onClick={() => setActiveGame(null)}
          style={{
            position: 'absolute',
            top: 'max(12px, env(safe-area-inset-top))',
            left: 12,
            zIndex: 10000,
            padding: '8px 14px',
            background: 'rgba(0,0,0,0.7)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 10,
            color: '#fff',
            fontSize: 13,
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
          }}
        >
          ← Zurück
        </button>
        <div style={{ flex: 1, overflow: 'auto' }}>
          {activeGame.game === 'xwing' && (
            <XWingGame matrixClue="C10: 5 - 0 - 2 - 8 - 4" onWin={() => handleGameWin(activeGame.puzzleId)} />
          )}
          {activeGame.game === 'cheese' && (
            <CheeseGame matrixClue="C1: 3 - 8 - 4 - 6 - 1 - 2" onWin={() => handleGameWin(activeGame.puzzleId)} />
          )}
          {activeGame.game === 'horse' && (
            <HorseGame matrixClue="C6: 7 - 8 - 2 - 6" onWin={() => handleGameWin(activeGame.puzzleId)} />
          )}
          {activeGame.game === 'scooter' && (
            <ScooterGame matrixClue="D5: 8 - 6 - 3 - 0" onWin={() => handleGameWin(activeGame.puzzleId)} />
          )}
          {activeGame.game === 'braune-sosse' && (
            <BrauneSosseGame matrixClue="C5: 2 - 6 - 5 - 4 - 1 - 3" onWin={() => handleGameWin(activeGame.puzzleId)} />
          )}
          {activeGame.game === 'memory' && (
            <MemoryGame matrixClue="D2: 7 - 8 - 1 - 2" onWin={() => handleGameWin(activeGame.puzzleId)} />
          )}
          {activeGame.game === 'puzzle' && (
            <PuzzleGame matrixClue="C11: 2 - 0 - 5 - 9 - 3" onWin={() => handleGameWin(activeGame.puzzleId)} />
          )}
          {activeGame.game === 'periodensystem' && (
            <PeriodensystemGame onWin={() => handleGameWin(activeGame.puzzleId)} onBack={() => setActiveGame(null)} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      minHeight: '100dvh',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
      fontFamily: "'Inter', -apple-system, sans-serif",
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header - sticky on mobile */}
      <header style={{
        padding: 'clamp(12px, 3vw, 16px) clamp(16px, 4vw, 24px)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <span style={{ fontSize: 'clamp(24px, 6vw, 32px)', flexShrink: 0 }}>{player.emoji}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontWeight: 600,
              fontSize: 'clamp(14px, 3.5vw, 16px)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {player.display_name}
            </div>
            <div style={{ fontSize: 'clamp(10px, 2.5vw, 11px)', color: 'rgba(255,255,255,0.4)' }}>
              Schnitzeljagd 2026
            </div>
          </div>
        </div>
        <button
          onClick={onLogout}
          style={{
            padding: '8px 14px',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 10,
            color: 'rgba(255,255,255,0.6)',
            fontSize: 13,
            cursor: 'pointer',
            flexShrink: 0,
            minHeight: 40,
          }}
        >
          Abmelden
        </button>
      </header>

      {/* Scrollable Content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}>
        <div style={{
          maxWidth: 600,
          margin: '0 auto',
          padding: 'clamp(16px, 4vw, 32px) clamp(12px, 3vw, 20px) clamp(32px, 8vw, 80px)',
        }}>
          {/* Welcome Card */}
          <div style={{
            padding: 'clamp(20px, 5vw, 28px)',
            background: 'rgba(74, 222, 128, 0.08)',
            border: '1px solid rgba(74, 222, 128, 0.2)',
            borderRadius: 16,
            marginBottom: 'clamp(24px, 6vw, 36px)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 'clamp(28px, 8vw, 40px)', marginBottom: 8, lineHeight: 1 }}>🎂</div>
            <h2 style={{
              margin: '0 0 8px',
              fontSize: 'clamp(17px, 4.5vw, 22px)',
              color: '#4ade80',
              lineHeight: 1.3,
            }}>
              Willkommen zur Schnitzeljagd!
            </h2>
            <p style={{
              margin: 0,
              fontSize: 'clamp(13px, 3.2vw, 15px)',
              color: 'rgba(255,255,255,0.6)',
              lineHeight: 1.6,
            }}>
              Ellens Geburtstags-Abenteuer wartet auf dich.
              Löse Rätsel, sammle Hinweise und hilf mit, das große Geheimnis zu lüften!
            </p>
          </div>

          {/* Treasure Chests (for players with puzzles) */}
          {puzzles ? (
            <>
              <h3 style={{
                fontSize: 'clamp(12px, 3vw, 14px)',
                color: 'rgba(255,255,255,0.5)',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: 'clamp(16px, 4vw, 24px)',
                textAlign: 'center',
              }}>
                Deine Rätseltruhen
              </h3>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 'clamp(24px, 6vw, 40px)',
                marginBottom: 'clamp(24px, 6vw, 36px)',
              }}>
                {puzzles.map(puzzle => {
                  const prog = progress.find(p => p.puzzle_id === puzzle.id);
                  const isLocked = prog ? prog.status === 'locked' : false;
                  const isSolved = prog ? prog.status === 'solved' : false;
                  const isUnlocked = prog ? prog.status === 'unlocked' : false;
                  const alreadyOpened = openedChests.has(puzzle.id);

                  return (
                    <TreasureChest
                      key={puzzle.id}
                      label={(isSolved && puzzle.solvedLabel) ? puzzle.solvedLabel : puzzle.label}
                      locked={isLocked}
                      chained={alreadyOpened ? false : (puzzle.chained || false)}
                      password={puzzle.password || ''}
                      taunt={puzzle.taunt || ''}
                      alreadyOpened={alreadyOpened}
                      solved={isSolved}
                      game={puzzle.game}
                      matrixClue={puzzle.matrixClue}
                      onOpen={() => handleChestOpen(puzzle.id, puzzle.game)}
                      onReplay={puzzle.game ? () => setActiveGame({ game: puzzle.game, puzzleId: puzzle.id }) : null}
                      replayLabel={puzzle.replayLabel}
                    />
                  );
                })}
              </div>
            </>
          ) : (
            <>
              {/* Stats for players without chest view yet */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: 'clamp(8px, 2vw, 12px)',
                marginBottom: 'clamp(20px, 5vw, 28px)',
              }}>
                {[
                  { value: solvedCount, label: 'Gelöst', color: '#4ade80' },
                  { value: clues.length, label: 'Hinweise', color: '#60a5fa' },
                  { value: progress.filter(p => p.status === 'unlocked').length, label: 'Offen', color: '#f59e0b' },
                ].map(stat => (
                  <div key={stat.label} style={{
                    padding: 'clamp(14px, 3.5vw, 20px) clamp(8px, 2vw, 16px)',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 14,
                    textAlign: 'center',
                  }}>
                    <div style={{
                      fontSize: 'clamp(22px, 6vw, 32px)',
                      fontWeight: 700,
                      color: stat.color,
                      lineHeight: 1,
                    }}>
                      {stat.value}
                    </div>
                    <div style={{
                      fontSize: 'clamp(10px, 2.5vw, 12px)',
                      color: 'rgba(255,255,255,0.4)',
                      marginTop: 'clamp(4px, 1vw, 6px)',
                    }}>
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Puzzle List */}
              <h3 style={{
                fontSize: 'clamp(12px, 3vw, 14px)',
                color: 'rgba(255,255,255,0.5)',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: 12,
              }}>
                Deine Rätsel
              </h3>

              {loading ? (
                <div style={{
                  textAlign: 'center',
                  padding: 'clamp(30px, 8vw, 50px)',
                  color: 'rgba(255,255,255,0.4)',
                }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
                  Lade...
                </div>
              ) : progress.length === 0 ? (
                <div style={{
                  padding: 'clamp(28px, 7vw, 44px) clamp(16px, 4vw, 24px)',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 14,
                  textAlign: 'center',
                  color: 'rgba(255,255,255,0.4)',
                  fontSize: 'clamp(13px, 3.2vw, 15px)',
                  lineHeight: 1.6,
                }}>
                  Noch keine Rätsel freigeschaltet.<br />
                  Bald geht's los! 🎉
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {progress.map(p => (
                    <div key={p.id} style={{
                      padding: 'clamp(14px, 3.5vw, 18px) clamp(14px, 3.5vw, 20px)',
                      background: p.status === 'solved'
                        ? 'rgba(74, 222, 128, 0.08)'
                        : p.status === 'unlocked'
                        ? 'rgba(96, 165, 250, 0.08)'
                        : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${
                        p.status === 'solved' ? 'rgba(74, 222, 128, 0.2)'
                        : p.status === 'unlocked' ? 'rgba(96, 165, 250, 0.2)'
                        : 'rgba(255,255,255,0.08)'
                      }`,
                      borderRadius: 14,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      minHeight: 56,
                    }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{
                          fontWeight: 500,
                          fontSize: 'clamp(13px, 3.2vw, 15px)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          {p.puzzle_id}
                        </div>
                        {p.solved_at && (
                          <div style={{
                            fontSize: 'clamp(10px, 2.5vw, 11px)',
                            color: 'rgba(255,255,255,0.3)',
                            marginTop: 2,
                          }}>
                            Gelöst am {new Date(p.solved_at).toLocaleDateString('de-DE')}
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize: 'clamp(16px, 4vw, 20px)', flexShrink: 0, marginLeft: 8 }}>
                        {p.status === 'solved' ? '✅' : p.status === 'unlocked' ? '🔓' : '🔒'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Matrix Clues */}
          {clues.length > 0 && (
            <>
              <h3 style={{
                fontSize: 'clamp(12px, 3vw, 14px)',
                color: 'rgba(255,255,255,0.5)',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                margin: 'clamp(24px, 6vw, 36px) 0 12px',
              }}>
                Gesammelte Hinweise
              </h3>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
              }}>
                {clues.map(c => (
                  <div key={c.id} style={{
                    padding: '10px 16px',
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.25)',
                    borderRadius: 10,
                    fontSize: 'clamp(12px, 3vw, 14px)',
                    color: '#f59e0b',
                    fontWeight: 500,
                  }}>
                    {c.clue_value}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
