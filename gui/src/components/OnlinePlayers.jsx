import React, { useState, useEffect } from 'react';
import { fetchOnlinePlayers } from '../api';

export default function OnlinePlayers({ myPlayerId, difficulty, language, mode, socket, myNickname }) {
  const [players, setPlayers] = useState([]);
  const [challengedIds, setChallengedIds] = useState(new Set());

  useEffect(() => {
    const loadPlayers = async () => {
      try {
        const data = await fetchOnlinePlayers();
        setPlayers(data.filter(p => p.player_id !== myPlayerId));
      } catch (err) {
        console.error(err);
      }
    };
    loadPlayers();
    const interval = setInterval(loadPlayers, 5000);
    return () => clearInterval(interval);
  }, [myPlayerId]);

  const handleChallenge = (targetId) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    
    socket.send(JSON.stringify({
      action: "challenge",
      target_player_id: targetId,
      from_nickname: myNickname,
      difficulty,
      language,
      mode
    }));
    
    setChallengedIds(prev => new Set(prev).add(targetId));
    setTimeout(() => {
      setChallengedIds(prev => {
        const next = new Set(prev);
        next.delete(targetId);
        return next;
      });
    }, 3000);
  };

  return (
    <div className="online-players">
      <h3 style={{ marginBottom: '1.5rem' }}>🌐 Players Online</h3>
      
      {players.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>No other players online. Invite a friend!</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {players.map((p) => (
            <div key={p.player_id} className="online-player-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-green)' }}></span>
                <strong>{p.nickname}</strong>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>({p.rating})</span>
                {p.win_streak >= 2 && <span title="Win Streak">🔥{p.win_streak}</span>}
              </div>
              <button 
                className="btn-secondary" 
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                onClick={() => handleChallenge(p.player_id)}
                disabled={challengedIds.has(p.player_id)}
              >
                {challengedIds.has(p.player_id) ? 'Challenged!' : '⚔️ Challenge'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
