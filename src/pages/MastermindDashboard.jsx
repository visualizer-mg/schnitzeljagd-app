import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import TreasureChest from '../components/TreasureChest';

// Same puzzle config as Dashboard — keep in sync
const PLAYER_PUZZLES = {
  mark: [
    { id: 'mark-1', label: 'X-Wing Assault', game: 'xwing' },
    { id: 'mark-2', label: 'Rätsel 2' },
    { id: 'mark-3', label: 'Rätsel 3' },
  ],
  ellen: [
    { id: 'ellen-1', label: 'Käse-Jagd', game: 'cheese' },
  ],
  theresa: [
    { id: 'theresa-1', label: 'Himmelsritt', game: 'horse' },
  ],
};

export default function MastermindDashboard({ player, onLogout }) {
  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [progress, setProgress] = useState([]);
  const [clues, setClues] = useState([]);
  const [events, setEvents] = useState([]);
  const [allProgress, setAllProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('players'); // 'players' or 'overview'

  // Load all players on mount
  useEffect(() => {
    loadPlayers();
  }, []);

  // Load data when selected player changes
  useEffect(() => {
    if (selectedPlayer) {
      loadPlayerData(selectedPlayer.id);
    }
  }, [selectedPlayer]);

  const loadPlayers = async () => {
    const { data } = await supabase
      .from('players')
      .select('*')
      .neq('role', 'mastermind')
      .order('name');
    setPlayers(data || []);
    if (data && data.length > 0) {
      setSelectedPlayer(data[0]);
    }

    // Load all progress for overview
    const { data: allProg } = await supabase.from('progress').select('*, players(name, emoji, display_name)');
    setAllProgress(allProg || []);
    setLoading(false);
  };

  const loadPlayerData = async (playerId) => {
    const [progressRes, cluesRes, eventsRes] = await Promise.all([
      supabase.from('progress').select('*').eq('player_id', playerId).order('created_at'),
      supabase.from('matrix_clues').select('*').eq('player_id', playerId).order('unlocked_at'),
      supabase.from('event_log').select('*').eq('player_id', playerId).order('created_at', { ascending: false }).limit(20),
    ]);
    setProgress(progressRes.data || []);
    setClues(cluesRes.data || []);
    setEvents(eventsRes.data || []);
  };

  // Admin actions
  const unlockPuzzle = async (puzzleId) => {
    if (!selectedPlayer) return;
    const { error } = await supabase.from('progress').upsert({
      player_id: selectedPlayer.id,
      puzzle_id: puzzleId,
      status: 'unlocked',
    }, { onConflict: 'player_id,puzzle_id' });
    if (!error) {
      await supabase.from('event_log').insert({
        player_id: selectedPlayer.id,
        event_type: 'puzzle_unlocked',
        event_data: { puzzle_id: puzzleId, by: 'mastermind' },
      });
      loadPlayerData(selectedPlayer.id);
    }
  };

  const addClue = async () => {
    if (!selectedPlayer) return;
    const key = prompt('Clue-Key (z.B. "matrix-1"):');
    if (!key) return;
    const value = prompt('Clue-Wert (z.B. "E"):');
    if (!value) return;
    const source = prompt('Quelle (z.B. Rätsel-ID oder leer):') || null;

    await supabase.from('matrix_clues').upsert({
      player_id: selectedPlayer.id,
      clue_key: key,
      clue_value: value,
      source_puzzle: source,
    }, { onConflict: 'player_id,clue_key' });
    loadPlayerData(selectedPlayer.id);
  };

  const solvePuzzle = async (puzzleId) => {
    if (!selectedPlayer) return;
    await supabase.from('progress').update({
      status: 'solved',
      solved_at: new Date().toISOString(),
    }).eq('player_id', selectedPlayer.id).eq('puzzle_id', puzzleId);
    loadPlayerData(selectedPlayer.id);
  };

  const deletePuzzle = async (progressId) => {
    if (!confirm('Wirklich löschen?')) return;
    await supabase.from('progress').delete().eq('id', progressId);
    loadPlayerData(selectedPlayer.id);
  };

  const deleteClue = async (clueId) => {
    if (!confirm('Hinweis löschen?')) return;
    await supabase.from('matrix_clues').delete().eq('id', clueId);
    loadPlayerData(selectedPlayer.id);
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontFamily: "'Inter', sans-serif",
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎩</div>
          <div style={{ color: 'rgba(255,255,255,0.5)' }}>Lade Mastermind...</div>
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
      {/* Header */}
      <header style={{
        padding: 'clamp(10px, 2.5vw, 14px) clamp(12px, 3vw, 20px)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 22 }}>🎩</span>
            <div>
              <div style={{
                fontWeight: 700,
                fontSize: 'clamp(13px, 3.5vw, 16px)',
                color: '#f59e0b',
              }}>
                MASTERMIND
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.5px' }}>
                Command Center
              </div>
            </div>
          </div>
          <button
            onClick={onLogout}
            style={{
              padding: '6px 12px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 8,
              color: 'rgba(255,255,255,0.5)',
              fontSize: 12,
              cursor: 'pointer',
              minHeight: 36,
            }}
          >
            Logout
          </button>
        </div>

        {/* Main Tabs: Spieler / Übersicht */}
        <div style={{
          display: 'flex',
          gap: 4,
          marginBottom: 8,
        }}>
          {[
            { key: 'players', label: '👥 Spieler' },
            { key: 'overview', label: '📋 Übersicht' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                flex: 1,
                padding: '8px',
                background: tab === t.key ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${tab === t.key ? 'rgba(245, 158, 11, 0.3)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 8,
                color: tab === t.key ? '#f59e0b' : 'rgba(255,255,255,0.5)',
                fontSize: 'clamp(12px, 3vw, 13px)',
                fontWeight: tab === t.key ? 600 : 400,
                cursor: 'pointer',
                minHeight: 38,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Player Tabs (only in players view) */}
        {tab === 'players' && (
          <div style={{
            display: 'flex',
            gap: 4,
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            paddingBottom: 4,
            scrollbarWidth: 'none',
          }}>
            {players.map(p => {
              const isActive = selectedPlayer?.id === p.id;
              const playerProgress = allProgress.filter(pr => pr.player_id === p.id);
              const solved = playerProgress.filter(pr => pr.status === 'solved').length;
              const total = playerProgress.length;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPlayer(p)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 2,
                    padding: 'clamp(6px, 1.5vw, 8px) clamp(8px, 2vw, 14px)',
                    background: isActive ? 'rgba(96, 165, 250, 0.15)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${isActive ? 'rgba(96, 165, 250, 0.3)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: 10,
                    color: isActive ? '#fff' : 'rgba(255,255,255,0.5)',
                    cursor: 'pointer',
                    flexShrink: 0,
                    minWidth: 'clamp(52px, 13vw, 72px)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span style={{ fontSize: 'clamp(18px, 5vw, 24px)', lineHeight: 1 }}>{p.emoji}</span>
                  <span style={{
                    fontSize: 'clamp(9px, 2.2vw, 11px)',
                    fontWeight: isActive ? 600 : 400,
                    whiteSpace: 'nowrap',
                  }}>
                    {p.name.charAt(0).toUpperCase() + p.name.slice(1)}
                  </span>
                  {total > 0 && (
                    <span style={{
                      fontSize: 8,
                      color: solved === total ? '#4ade80' : 'rgba(255,255,255,0.3)',
                    }}>
                      {solved}/{total}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* Content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}>
        {tab === 'players' ? (
          <PlayerView
            player={selectedPlayer}
            progress={progress}
            clues={clues}
            events={events}
            onUnlockPuzzle={unlockPuzzle}
            onSolvePuzzle={solvePuzzle}
            onDeletePuzzle={deletePuzzle}
            onAddClue={addClue}
            onDeleteClue={deleteClue}
            onRefresh={() => loadPlayerData(selectedPlayer.id)}
          />
        ) : (
          <OverviewView allProgress={allProgress} players={players} />
        )}
      </div>
    </div>
  );
}

// ─── Player View ───────────────────────────────────────
function PlayerView({ player, progress, clues, events, onUnlockPuzzle, onSolvePuzzle, onDeletePuzzle, onAddClue, onDeleteClue, onRefresh }) {
  const [newPuzzleId, setNewPuzzleId] = useState('');

  if (!player) return null;

  const solvedCount = progress.filter(p => p.status === 'solved').length;
  const unlockedCount = progress.filter(p => p.status === 'unlocked').length;

  return (
    <div style={{
      maxWidth: 600,
      margin: '0 auto',
      padding: 'clamp(12px, 3vw, 24px) clamp(12px, 3vw, 20px) clamp(32px, 8vw, 80px)',
    }}>
      {/* Player Header Card */}
      <div style={{
        padding: 'clamp(16px, 4vw, 24px)',
        background: 'rgba(96, 165, 250, 0.08)',
        border: '1px solid rgba(96, 165, 250, 0.2)',
        borderRadius: 16,
        marginBottom: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}>
        <span style={{ fontSize: 'clamp(36px, 10vw, 48px)', lineHeight: 1 }}>{player.emoji}</span>
        <div style={{ flex: 1 }}>
          <div style={{
            fontWeight: 700,
            fontSize: 'clamp(16px, 4vw, 20px)',
            marginBottom: 4,
          }}>
            {player.display_name}
          </div>
          <div style={{
            display: 'flex',
            gap: 12,
            fontSize: 'clamp(11px, 2.8vw, 13px)',
            color: 'rgba(255,255,255,0.5)',
          }}>
            <span>✅ {solvedCount} gelöst</span>
            <span>🔓 {unlockedCount} offen</span>
            <span>💡 {clues.length} Hinweise</span>
          </div>
        </div>
        <button
          onClick={onRefresh}
          style={{
            padding: 8,
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8,
            color: '#fff',
            cursor: 'pointer',
            fontSize: 18,
            minWidth: 40,
            minHeight: 40,
          }}
        >
          🔄
        </button>
      </div>

      {/* Spieler-Vorschau: Truhen */}
      {PLAYER_PUZZLES[player.name] && (
        <div style={{
          padding: 'clamp(16px, 4vw, 24px)',
          background: 'rgba(245, 158, 11, 0.05)',
          border: '1px solid rgba(245, 158, 11, 0.15)',
          borderRadius: 16,
          marginBottom: 16,
        }}>
          <div style={{
            fontSize: 'clamp(11px, 2.8vw, 12px)',
            color: '#f59e0b',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginBottom: 16,
            textAlign: 'center',
            fontWeight: 600,
          }}>
            👁️ Spieler-Vorschau
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 'clamp(16px, 4vw, 32px)',
            flexWrap: 'wrap',
          }}>
            {PLAYER_PUZZLES[player.name].map(puzzle => {
              const prog = progress.find(p => p.puzzle_id === puzzle.id);
              const isSolved = prog?.status === 'solved';
              const isLocked = prog?.status === 'locked';

              return (
                <TreasureChest
                  key={puzzle.id}
                  label={puzzle.label}
                  locked={isLocked}
                  onOpen={() => {}}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div style={{
        display: 'flex',
        gap: 8,
        marginBottom: 'clamp(16px, 4vw, 24px)',
        flexWrap: 'wrap',
      }}>
        {/* Unlock new puzzle */}
        <div style={{
          display: 'flex',
          gap: 6,
          flex: '1 1 250px',
        }}>
          <input
            type="text"
            value={newPuzzleId}
            onChange={(e) => setNewPuzzleId(e.target.value)}
            placeholder="Rätsel-ID eingeben..."
            style={{
              flex: 1,
              padding: '10px 14px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 10,
              color: '#fff',
              fontSize: '16px',
              outline: 'none',
              minHeight: 44,
            }}
          />
          <button
            onClick={() => {
              if (newPuzzleId.trim()) {
                onUnlockPuzzle(newPuzzleId.trim());
                setNewPuzzleId('');
              }
            }}
            style={{
              padding: '10px 16px',
              background: 'linear-gradient(135deg, #60a5fa, #3b82f6)',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              minHeight: 44,
            }}
          >
            🔓 Freischalten
          </button>
        </div>
        <button
          onClick={onAddClue}
          style={{
            padding: '10px 16px',
            background: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 10,
            color: '#f59e0b',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            minHeight: 44,
          }}
        >
          💡 Hinweis geben
        </button>
      </div>

      {/* Puzzle Progress */}
      <h3 style={{
        fontSize: 'clamp(11px, 2.8vw, 13px)',
        color: 'rgba(255,255,255,0.4)',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        marginBottom: 10,
      }}>
        Rätsel-Fortschritt
      </h3>

      {progress.length === 0 ? (
        <div style={{
          padding: 'clamp(24px, 6vw, 36px)',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 14,
          textAlign: 'center',
          color: 'rgba(255,255,255,0.3)',
          fontSize: 'clamp(12px, 3vw, 14px)',
          marginBottom: 16,
        }}>
          Noch keine Rätsel zugewiesen
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
          {progress.map(p => (
            <div key={p.id} style={{
              padding: 'clamp(10px, 2.5vw, 14px) clamp(12px, 3vw, 16px)',
              background: p.status === 'solved'
                ? 'rgba(74, 222, 128, 0.06)'
                : p.status === 'unlocked'
                ? 'rgba(96, 165, 250, 0.06)'
                : 'rgba(255,255,255,0.03)',
              border: `1px solid ${
                p.status === 'solved' ? 'rgba(74, 222, 128, 0.15)'
                : p.status === 'unlocked' ? 'rgba(96, 165, 250, 0.15)'
                : 'rgba(255,255,255,0.06)'
              }`,
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
            }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{
                  fontWeight: 500,
                  fontSize: 'clamp(12px, 3vw, 14px)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {p.status === 'solved' ? '✅' : p.status === 'unlocked' ? '🔓' : '🔒'} {p.puzzle_id}
                </div>
                {p.solved_at && (
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                    {new Date(p.solved_at).toLocaleDateString('de-DE')} {new Date(p.solved_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                {p.status === 'unlocked' && (
                  <button
                    onClick={() => onSolvePuzzle(p.puzzle_id)}
                    style={{
                      padding: '6px 10px',
                      background: 'rgba(74, 222, 128, 0.15)',
                      border: '1px solid rgba(74, 222, 128, 0.3)',
                      borderRadius: 8,
                      color: '#4ade80',
                      fontSize: 11,
                      cursor: 'pointer',
                      minHeight: 34,
                    }}
                  >
                    ✓ Lösen
                  </button>
                )}
                <button
                  onClick={() => onDeletePuzzle(p.id)}
                  style={{
                    padding: '6px 8px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: 8,
                    color: '#ef4444',
                    fontSize: 11,
                    cursor: 'pointer',
                    minHeight: 34,
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Clues */}
      <h3 style={{
        fontSize: 'clamp(11px, 2.8vw, 13px)',
        color: 'rgba(255,255,255,0.4)',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        marginBottom: 10,
      }}>
        Hinweise ({clues.length})
      </h3>

      {clues.length === 0 ? (
        <div style={{
          padding: '20px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 14,
          textAlign: 'center',
          color: 'rgba(255,255,255,0.3)',
          fontSize: 'clamp(12px, 3vw, 14px)',
          marginBottom: 16,
        }}>
          Keine Hinweise
        </div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
          {clues.map(c => (
            <div key={c.id} style={{
              padding: '8px 12px',
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <span style={{ fontSize: 'clamp(12px, 3vw, 13px)', color: '#f59e0b', fontWeight: 500 }}>
                {c.clue_key}: {c.clue_value}
              </span>
              <button
                onClick={() => onDeleteClue(c.id)}
                style={{
                  padding: '2px 6px',
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(239, 68, 68, 0.6)',
                  cursor: 'pointer',
                  fontSize: 12,
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Recent Events */}
      {events.length > 0 && (
        <>
          <h3 style={{
            fontSize: 'clamp(11px, 2.8vw, 13px)',
            color: 'rgba(255,255,255,0.4)',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginBottom: 10,
          }}>
            Letzte Aktivitäten
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {events.slice(0, 10).map(e => (
              <div key={e.id} style={{
                padding: '8px 12px',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: 8,
                fontSize: 'clamp(10px, 2.5vw, 12px)',
                color: 'rgba(255,255,255,0.4)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span>
                  {e.event_type === 'login' ? '🟢 Login' :
                   e.event_type === 'puzzle_unlocked' ? '🔓 Freigeschaltet' :
                   e.event_type === 'puzzle_solved' ? '✅ Gelöst' :
                   e.event_type}
                  {e.event_data?.puzzle_id ? ` — ${e.event_data.puzzle_id}` : ''}
                </span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>
                  {new Date(e.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Overview View ─────────────────────────────────────
function OverviewView({ allProgress, players }) {
  // Group progress by puzzle
  const puzzleMap = {};
  allProgress.forEach(p => {
    if (!puzzleMap[p.puzzle_id]) puzzleMap[p.puzzle_id] = [];
    puzzleMap[p.puzzle_id].push(p);
  });

  const puzzleIds = Object.keys(puzzleMap).sort();

  return (
    <div style={{
      maxWidth: 600,
      margin: '0 auto',
      padding: 'clamp(12px, 3vw, 24px) clamp(12px, 3vw, 20px) clamp(32px, 8vw, 80px)',
    }}>
      <h2 style={{
        fontSize: 'clamp(16px, 4vw, 20px)',
        fontWeight: 700,
        color: '#f59e0b',
        marginBottom: 16,
      }}>
        📋 Gesamtübersicht
      </h2>

      {/* Player Summary */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(140px, 35vw, 170px), 1fr))',
        gap: 8,
        marginBottom: 24,
      }}>
        {players.map(p => {
          const playerProg = allProgress.filter(pr => pr.player_id === p.id);
          const solved = playerProg.filter(pr => pr.status === 'solved').length;
          const unlocked = playerProg.filter(pr => pr.status === 'unlocked').length;
          const total = playerProg.length;
          const pct = total > 0 ? Math.round((solved / total) * 100) : 0;

          return (
            <div key={p.id} style={{
              padding: 'clamp(12px, 3vw, 16px)',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 'clamp(24px, 6vw, 32px)', marginBottom: 4 }}>{p.emoji}</div>
              <div style={{ fontWeight: 600, fontSize: 'clamp(12px, 3vw, 14px)', marginBottom: 6 }}>
                {p.name.charAt(0).toUpperCase() + p.name.slice(1)}
              </div>
              {/* Progress bar */}
              <div style={{
                height: 4,
                background: 'rgba(255,255,255,0.1)',
                borderRadius: 2,
                overflow: 'hidden',
                marginBottom: 6,
              }}>
                <div style={{
                  height: '100%',
                  width: `${pct}%`,
                  background: 'linear-gradient(90deg, #4ade80, #22c55e)',
                  borderRadius: 2,
                  transition: 'width 0.3s ease',
                }} />
              </div>
              <div style={{ fontSize: 'clamp(10px, 2.5vw, 11px)', color: 'rgba(255,255,255,0.4)' }}>
                {solved} gelöst · {unlocked} offen · {total} total
              </div>
            </div>
          );
        })}
      </div>

      {/* Puzzle Matrix */}
      {puzzleIds.length > 0 && (
        <>
          <h3 style={{
            fontSize: 'clamp(11px, 2.8vw, 13px)',
            color: 'rgba(255,255,255,0.4)',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginBottom: 12,
          }}>
            Rätsel-Status
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {puzzleIds.map(puzzleId => {
              const entries = puzzleMap[puzzleId];
              return (
                <div key={puzzleId} style={{
                  padding: 'clamp(10px, 2.5vw, 14px)',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 12,
                }}>
                  <div style={{
                    fontWeight: 500,
                    fontSize: 'clamp(12px, 3vw, 14px)',
                    marginBottom: 8,
                  }}>
                    {puzzleId}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {entries.map(e => (
                      <span key={e.id} style={{
                        padding: '3px 8px',
                        background: e.status === 'solved'
                          ? 'rgba(74, 222, 128, 0.1)'
                          : e.status === 'unlocked'
                          ? 'rgba(96, 165, 250, 0.1)'
                          : 'rgba(255,255,255,0.05)',
                        borderRadius: 6,
                        fontSize: 11,
                        color: e.status === 'solved' ? '#4ade80'
                          : e.status === 'unlocked' ? '#60a5fa'
                          : 'rgba(255,255,255,0.4)',
                      }}>
                        {e.players?.emoji} {e.status === 'solved' ? '✅' : e.status === 'unlocked' ? '🔓' : '🔒'}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {puzzleIds.length === 0 && (
        <div style={{
          padding: 'clamp(28px, 7vw, 44px)',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 14,
          textAlign: 'center',
          color: 'rgba(255,255,255,0.3)',
          fontSize: 'clamp(13px, 3.2vw, 15px)',
        }}>
          Noch keine Rätsel im System.<br />
          Schalte bei einem Spieler das erste Rätsel frei!
        </div>
      )}
    </div>
  );
}
