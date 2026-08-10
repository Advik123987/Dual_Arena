import React, { useState, useEffect } from 'react';
import { fetchOnlinePlayers } from '../api';

export default function OnlinePlayers({ myPlayerId, difficulty, language, mode, socket, myNickname, onChallenge }) {
  const [players, setPlayers] = useState([]);
  const [challengedIds, setChallengedIds] = useState(new Set());

  useEffect(() => {
    const loadPlayers = async () => {
      try {
        const data = await fetchOnlinePlayers();
        const cleanMyNick = myNickname ? myNickname.trim().toLowerCase() : '';
        const filtered = (data || []).filter(p => {
          if (p.player_id === myPlayerId) return false;
          if (cleanMyNick && p.nickname?.trim().toLowerCase() === cleanMyNick) return false;
          return true;
        });
        setPlayers(filtered);
      } catch (err) {
        console.error(err);
      }
    };
    loadPlayers();
    const interval = setInterval(loadPlayers, 4000);
    return () => clearInterval(interval);
  }, [myPlayerId, myNickname]);

  const handleChallengeClick = (player) => {
    if (onChallenge) {
      onChallenge(player);
    } else if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        action: "challenge",
        target_player_id: player.player_id,
        from_nickname: myNickname,
        difficulty,
        language,
        mode
      }));
    }

    setChallengedIds(prev => new Set(prev).add(player.player_id));
    setTimeout(() => {
      setChallengedIds(prev => {
        const next = new Set(prev);
        next.delete(player.player_id);
        return next;
      });
    }, 4000);
  };

  return (
    <div className="online-players">
      <h3 style={{ marginBottom: '1.5rem' }}>🌐 Competitors Online</h3>

      {players.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No other players online right now. Practice in Solo Mode or invite a friend!</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {players.map((p) => (
            <div key={p.player_id} className="online-player-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-green)' }}></span>
                <strong>{p.nickname}</strong>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>({p.rating || 1000})</span>
                {p.win_streak >= 2 && <span title="Win Streak">🔥{p.win_streak}</span>}
              </div>
              <button
                className="btn-secondary"
                style={{ padding: '0.35rem 0.8rem', fontSize: '0.82rem' }}
                onClick={() => handleChallengeClick(p)}
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
