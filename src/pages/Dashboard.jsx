import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function Dashboard({ player, onLogout }) {
  const [progress, setProgress] = useState([]);
  const [clues, setClues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [progressRes, cluesRes] = await Promise.all([
      supabase.from('progress').select('*').eq('player_id', player.id),
      supabase.from('matrix_clues').select('*').eq('player_id', player.id),
    ]);
    setProgress(progressRes.data || []);
    setClues(cluesRes.data || []);
    setLoading(false);
  };

  const solvedCount = progress.filter(p => p.status === 'solved').length;

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
            marginBottom: 'clamp(16px, 4vw, 24px)',
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

          {/* Stats */}
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
              <div style={{ fontSize: 28, marginBottom: 8, animation: 'pulse 1.5s ease infinite' }}>🔍</div>
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
                  cursor: p.status === 'unlocked' ? 'pointer' : 'default',
                  transition: 'transform 0.15s ease',
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
