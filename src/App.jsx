import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MastermindDashboard from './pages/MastermindDashboard';

function App() {
  const [player, setPlayer] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('player');
    if (saved) {
      try {
        setPlayer(JSON.parse(saved));
      } catch {
        localStorage.removeItem('player');
      }
    }
  }, []);

  const handleLogin = (playerData) => {
    setPlayer(playerData);
  };

  const handleLogout = () => {
    localStorage.removeItem('player');
    setPlayer(null);
  };

  if (!player) {
    return <Login onLogin={handleLogin} />;
  }

  // Mastermind gets the admin dashboard
  if (player.role === 'mastermind') {
    return <MastermindDashboard player={player} onLogout={handleLogout} />;
  }

  return <Dashboard player={player} onLogout={handleLogout} />;
}

export default App;
