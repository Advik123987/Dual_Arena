import React, { useState, useEffect } from 'react';
import { fetchTournaments, createTournament, joinTournament } from '../api.js';

export default function TournamentModal({ playerId, nickname, difficulty, language, onClose }) {
  const [tournaments, setTournaments] = useState([]);
  const [selectedT, setSelectedT] = useState(null);
  const [title, setTitle] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadTournaments = async () => {
    try {
      const list = await fetchTournaments();
      setTournaments(list);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadTournaments();
    const interval = setInterval(loadTournaments, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setLoading(true);
    setError('');
    try {
      const t = await createTournament(title.trim(), maxPlayers, difficulty, language);
      setTitle('');
      loadTournaments();
      setSelectedT(t);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (tId) => {
    setLoading(true);
    setError('');
    try {
      const updated = await joinTournament(tId, playerId, nickname);
      setSelectedT(updated);
      loadTournaments();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="challenge-modal-overlay" onClick={onClose}>
      <div className="challenge-modal tournament-modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '680px', textAlign: 'left' }}>
        <button className="profile-close-btn" onClick={onClose}>×</button>

        <h2 style={{ margin: '0 0 0.4rem', fontSize: '1.6rem', color: 'var(--accent-gold)' }}>
          🏆 Tournament Bracket Knockouts
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
          Single-elimination 4-player &amp; 8-player knockout duels. Survive to become Champion!
        </p>

        {error && <div className="auth-error" style={{ marginBottom: '1rem' }}>⚠️ {error}</div>}

        {!selectedT ? (
          <div>
            {/* Create Tournament Box */}
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid var(--border-dim)' }}>
              <h4 style={{ margin: '0 0 0.8rem', fontSize: '0.95rem' }}>➕ Create Knockout Tournament</h4>
              <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Tournament Title (e.g. Speed Slayers Cup)"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  style={{ flex: 2, minWidth: '200px' }}
                />
                <select
                  className="input-field"
                  value={maxPlayers}
                  onChange={e => setMaxPlayers(Number(e.target.value))}
                  style={{ flex: 1, minWidth: '120px' }}
                >
                  <option value={4}>4 Players</option>
                  <option value={8}>8 Players</option>
                </select>
                <button className="btn-primary" onClick={handleCreate} disabled={loading || !title.trim()}>
                  {loading ? 'Creating...' : 'Create Cup'}
                </button>
              </div>
            </div>

            {/* Active Tournaments List */}
            <h4 style={{ margin: '0 0 0.8rem', fontSize: '1rem' }}>⚔️ Active Tournaments</h4>
            {tournaments.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>No active tournaments right now. Create one above!</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {tournaments.map(t => (
                  <div key={t.id} className="tournament-list-item">
                    <div>
                      <strong style={{ fontSize: '1.05rem' }}>{t.title}</strong>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        {t.max_players} Players Knockout · Status: <span style={{ color: t.status === 'completed' ? 'var(--accent-gold)' : 'var(--accent-green)', fontWeight: 600 }}>{t.status.toUpperCase()}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)' }}>{t.players.length}/{t.max_players} Players</span>
                      {t.status === 'recruiting' && !t.players.some(p => p.player_id === playerId) && (
                        <button className="btn-primary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }} onClick={() => handleJoin(t.id)}>
                          Join Bracket
                        </button>
                      )}
                      <button className="btn-secondary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }} onClick={() => setSelectedT(t)}>
                        View Bracket
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Bracket Tree Visualization */
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <button className="btn-secondary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }} onClick={() => setSelectedT(null)}>
                ← Back to List
              </button>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--accent-gold)' }}>{selectedT.title}</h3>
            </div>

            {selectedT.winner && (
              <div className="result-banner win" style={{ padding: '1rem', margin: '0 0 1.5rem', textAlign: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.4rem' }}>👑 TOURNAMENT CHAMPION: {selectedT.winner.nickname}</h3>
              </div>
            )}

            {/* Rounds rendering */}
            <div className="bracket-tree-container">
              {selectedT.rounds?.map(r => (
                <div key={r.round_number} className="bracket-round">
                  <h4 className="bracket-round-title">{r.name}</h4>
                  <div className="bracket-matches">
                    {r.matches?.map((m, idx) => (
                      <div key={idx} className="bracket-match-box">
                        <div className={`bracket-player ${m.winner === m.player_a.player_id ? 'winner' : ''}`}>
                          <span>{m.player_a.nickname}</span>
                          {m.winner === m.player_a.player_id && <span>👑</span>}
                        </div>
                        <div className="bracket-vs">VS</div>
                        <div className={`bracket-player ${m.winner === m.player_b.player_id ? 'winner' : ''}`}>
                          <span>{m.player_b.nickname}</span>
                          {m.winner === m.player_b.player_id && <span>👑</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
