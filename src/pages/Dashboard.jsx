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
  const totalPuzzles = progress.length || 1;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
      fontFamily: "'Inter', -apple-system, sans-serif",
      color: '#fff',
    }}>
      {/* Header */}
      <header style={{
        padding: '16px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(0,0,0,0.3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 28 }}>{player.emoji}</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>{player.display_name}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
              Schnitzeljagd 2026
            </div>
          </div>
        </div>
        <button
          onClick={onLogout}
          style={{
            padding: '8px 16px',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 8,
            color: 'rgba(255,255,255,0.6)',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Abmelden
        </button>
      </header>

      {/* Content */}
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 20px' }}>
        {/* Welcome Card */}
        <div style={{
          padding: '28px',
          background: 'rgba(74, 222, 128, 0.08)',
          border: '1px solid rgba(74, 222, 128, 0.2)',
          borderRadius: 16,
          marginBottom: 24,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🎂</div>
          <h2 style={{ margin: '0 0 8px', fontSize: 20, color: '#4ade80' }}>
            Willkommen zur Schnitzeljagd!
          </h2>
          <p style={{
            margin: 0,
            fontSize: 14,
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
          gap: 12,
          marginBottom: 24,
        }}>
          <div style={{
            padding: '20px 16px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#4ade80' }}>
              {solvedCount}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
              Gelöst
            </div>
          </div>
          <div style={{
            padding: '20px 16px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#60a5fa' }}>
              {clues.length}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
              Hinweise
            </div>
          </div>
          <div style={{
            padding: '20px 16px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#f59e0b' }}>
              {progress.filter(p => p.status === 'unlocked').length}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
              Offen
            </div>
          </div>
        </div>

        {/* Puzzle List */}
        <h3 style={{
          fontSize: 14,
          color: 'rgba(255,255,255,0.5)',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          marginBottom: 12,
        }}>
          Deine Rätsel
        </h3>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.4)' }}>
            Lade...
          </div>
        ) : progress.length === 0 ? (
          <div style={{
            padding: '40px 20px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12,
            textAlign: 'center',
            color: 'rgba(255,255,255,0.4)',
            fontSize: 14,
          }}>
            Noch keine Rätsel freigeschaltet. Bald geht's los! 🎉
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {progress.map(p => (
              <div key={p.id} style={{
                padding: '16px 20px',
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
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{p.puzzle_id}</div>
                  {p.solved_at && (
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                      Gelöst am {new Date(p.solved_at).toLocaleDateString('de-DE')}
                    </div>
                  )}
                </div>
                <span style={{ fontSize: 18 }}>
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
              fontSize: 14,
              color: 'rgba(255,255,255,0.5)',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              margin: '32px 0 12px',
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
                  padding: '8px 14px',
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  borderRadius: 8,
                  fontSize: 13,
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
  );
}
