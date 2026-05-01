import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Login({ onLogin }) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { data, error: dbError } = await supabase
      .from('players')
      .select('*')
      .eq('name', name.toLowerCase().trim())
      .eq('password_hash', password)
      .single();

    if (dbError || !data) {
      setError('Name oder Passwort falsch');
      setLoading(false);
      return;
    }

    // Log the login event
    await supabase.from('event_log').insert({
      player_id: data.id,
      event_type: 'login',
      event_data: { timestamp: new Date().toISOString() },
    });

    localStorage.setItem('player', JSON.stringify(data));
    onLogin(data);
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>
      <div style={{
        width: '100%',
        maxWidth: 380,
        padding: '40px 32px',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: 16,
        border: '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(20px)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🥩</div>
          <h1 style={{
            fontSize: 24,
            fontWeight: 700,
            color: '#4ade80',
            margin: 0,
            letterSpacing: '-0.5px',
          }}>
            SCHNITZELJAGD
          </h1>
          <p style={{
            fontSize: 13,
            color: 'rgba(255,255,255,0.4)',
            marginTop: 4,
          }}>
            Ellens Geburtstags-Abenteuer
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block',
              fontSize: 12,
              color: 'rgba(255,255,255,0.5)',
              marginBottom: 6,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              Dein Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. andreas"
              style={{
                width: '100%',
                padding: '12px 14px',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 8,
                color: '#fff',
                fontSize: 15,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{
              display: 'block',
              fontSize: 12,
              color: 'rgba(255,255,255,0.5)',
              marginBottom: 6,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              Passwort
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              style={{
                width: '100%',
                padding: '12px 14px',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 8,
                color: '#fff',
                fontSize: 15,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {error && (
            <div style={{
              padding: '10px 14px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 8,
              color: '#ef4444',
              fontSize: 13,
              marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !name || !password}
            style={{
              width: '100%',
              padding: '12px',
              background: loading ? 'rgba(74, 222, 128, 0.3)' : 'linear-gradient(135deg, #4ade80, #22c55e)',
              color: '#000',
              border: 'none',
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 600,
              cursor: loading ? 'wait' : 'pointer',
              transition: 'all 0.2s',
              opacity: (!name || !password) ? 0.5 : 1,
            }}
          >
            {loading ? 'Lade...' : 'Eintreten 🚪'}
          </button>
        </form>
      </div>
    </div>
  );
}
