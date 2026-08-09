import React, { useState, useEffect } from 'react';
import { fetchLeaderboard } from '../api';

export default function Leaderboard({ onChallenge }) {
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
                <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  No rankings yet. Be the first to claim #1!
                </td>
              </tr>
            ) : (
              entries.map((entry, index) => {
                const total = entry.wins + entry.losses;
                const winRate = total > 0 ? ((entry.wins / total) * 100).toFixed(1) + '%' : 'N/A';
                
                return (
                  <tr key={entry.nickname || index} style={{ animation: refreshing ? 'rowHighlight 1s ease-out' : 'none' }}>
                    <td style={{ fontSize: '1.2rem' }}>#{index + 1}</td>
                    <td style={{ fontWeight: 'bold' }}>{entry.nickname}</td>
                    <td>{Math.floor(entry.rating)}</td>
                    <td><span style={{color:'var(--accent-green)'}}>{entry.wins}W</span> - <span style={{color:'var(--accent-red)'}}>{entry.losses}L</span></td>
                    <td>{winRate}</td>
                    <td>
                      {entry.win_streak >= 2 ? (
                        <span className="streak-badge">🔥{entry.win_streak}</span>
                      ) : entry.win_streak}
                    </td>
                    <td>
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
