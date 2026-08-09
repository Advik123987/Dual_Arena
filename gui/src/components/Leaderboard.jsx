import React, { useState, useEffect } from 'react';
import { fetchLeaderboard } from '../api.js';

export default function Leaderboard({ onChallenge, onSelectPlayer }) {
  const [entries, setEntries] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    setRefreshing(true);
    try {
      const data = await fetchLeaderboard();
      setEntries(data);
    } catch (err) {
      console.error(err);
    }
    setTimeout(() => setRefreshing(false), 500);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="leaderboard-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3>🏆 Global Arena Rankings</h3>
        <button
          className="btn-secondary"
          style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
          onClick={loadData}
          disabled={refreshing}
        >
          {refreshing ? 'Refreshing...' : '↻ Refresh'}
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Competitor</th>
              <th>Tier</th>
              <th>Rating</th>
              <th>W/L</th>
              <th>Win Rate</th>
              <th>Streak</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  No rankings yet. Be the first to claim #1!
                </td>
              </tr>
            ) : (
              entries.map((entry, index) => {
                const total = entry.wins + entry.losses;
                const winRate = total > 0 ? ((entry.wins / total) * 100).toFixed(1) + '%' : 'N/A';

                return (
                  <tr
                    key={entry.player_id || entry.nickname || index}
                    style={{ cursor: 'pointer' }}
                    onClick={() => onSelectPlayer && onSelectPlayer(entry.player_id)}
                  >
                    <td style={{ fontSize: '1.2rem' }}>
                      {index === 0 ? '🥇 #1' : index === 1 ? '🥈 #2' : index === 2 ? '🥉 #3' : `#${index + 1}`}
                    </td>
                    <td style={{ fontWeight: 'bold' }}>
                      {entry.nickname}
                    </td>
                    <td>
                      <span style={{ color: entry.tier?.color || 'var(--accent-cyan)', fontWeight: 600, fontSize: '0.9rem' }}>
                        {entry.tier?.badge} {entry.tier?.name}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{Math.floor(entry.rating)}</td>
                    <td>
                      <span style={{ color: 'var(--accent-green)' }}>{entry.wins}W</span> - <span style={{ color: 'var(--accent-red)' }}>{entry.losses}L</span>
                    </td>
                    <td>{winRate}</td>
                    <td>
                      {entry.win_streak >= 2 ? (
                        <span className="streak-badge">🔥{entry.win_streak}</span>
                      ) : entry.win_streak}
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <button
                        className="btn-secondary"
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                        onClick={() => onChallenge && onChallenge(entry)}
                        title={`Challenge ${entry.nickname}`}
                      >
                        ⚔️
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
