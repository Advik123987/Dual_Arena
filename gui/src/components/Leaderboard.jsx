import { useEffect, useState } from "react";
import { fetchLeaderboard } from "../api.js";

export default function Leaderboard() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadLeaderboard = () => {
    fetchLeaderboard()
      .then((data) => {
        setEntries(data || []);
        setLoading(false);
      })
      .catch(() => {
        setEntries([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadLeaderboard();
    const interval = setInterval(loadLeaderboard, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="leaderboard-section">
      <div className="leaderboard-header">
        <h3 className="leaderboard-title">🏆 Global Standings</h3>
        <button className="badge" style={{ cursor: "pointer" }} onClick={loadLeaderboard}>
          🔄 Refresh
        </button>
      </div>

      {loading ? (
        <p style={{ color: "var(--text-muted)", textAlign: "center" }}>Loading rankings...</p>
      ) : entries.length === 0 ? (
        <p style={{ color: "var(--text-muted)", textAlign: "center" }}>No matches played yet. Be the first to duel!</p>
      ) : (
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Competitor</th>
              <th>Rating</th>
              <th>Wins</th>
              <th>Losses</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e, idx) => (
              <tr key={e.nickname || idx}>
                <td>
                  <span className={`rank-pill rank-${idx + 1}`}>
                    {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : idx + 1}
                  </span>
                </td>
                <td style={{ fontWeight: 600 }}>{e.nickname}</td>
                <td><span className="rating-tag">{e.rating}</span></td>
                <td style={{ color: "var(--accent-green)", fontWeight: 600 }}>{e.wins}</td>
                <td style={{ color: "var(--text-muted)" }}>{e.losses}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
