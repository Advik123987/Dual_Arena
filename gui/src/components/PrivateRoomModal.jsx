import React, { useState } from 'react';
import { createPrivateRoom, joinPrivateRoom } from '../api.js';

export default function PrivateRoomModal({
  playerId, nickname, difficulty, language, mode,
  onRoomJoined, onClose
}) {
  const [tab, setTab] = useState('create'); // 'create' | 'join'
  const [createdCode, setCreatedCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await createPrivateRoom(playerId, nickname, difficulty, language, mode);
      setCreatedCode(data.room_code);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setLoading(true);
    setError('');
    try {
      const data = await joinPrivateRoom(playerId, nickname, joinCode.trim());
      onRoomJoined(data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="challenge-modal-overlay" onClick={onClose}>
      <div className="challenge-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
        <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.6rem' }}>🔑 Private Match Room</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Battle a specific friend with custom settings using a room code.
        </p>

        <div className="auth-tabs" style={{ marginBottom: '1.5rem' }}>
          <button
            className={`auth-tab ${tab === 'create' ? 'active' : ''}`}
            onClick={() => { setTab('create'); setError(''); }}
          >
            ➕ Create Room
          </button>
          <button
            className={`auth-tab ${tab === 'join' ? 'active' : ''}`}
            onClick={() => { setTab('join'); setError(''); }}
          >
            🔗 Join Code
          </button>
        </div>

        {tab === 'create' ? (
          <div>
            {!createdCode ? (
              <div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  Room will use your selected settings: <strong>{difficulty}</strong> difficulty, <strong>{language}</strong>, <strong>{mode.replace('_', ' ')}</strong> mode.
                </p>
                <button className="btn-primary" onClick={handleCreate} disabled={loading} style={{ width: '100%' }}>
                  {loading ? 'Generating Code...' : '⚡ Generate Room Code'}
                </button>
              </div>
            ) : (
              <div style={{ background: 'rgba(0,0,0,0.4)', padding: '1.5rem', borderRadius: '12px', border: '1px border-glow' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>Share this code with your opponent:</p>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-cyan)', letterSpacing: '4px', margin: '0.8rem 0' }}>
                  {createdCode}
                </div>
                <button
                  className="btn-secondary"
                  style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                  onClick={() => navigator.clipboard.writeText(createdCode)}
                >
                  📋 Copy Code
                </button>
                <p style={{ fontSize: '0.8rem', color: 'var(--accent-orange)', marginTop: '1rem' }}>
                  ⏳ Waiting for opponent to enter code...
                </p>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input
              type="text"
              className="input-field"
              placeholder="Enter Code (e.g. DUEL-A8F9)"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value)}
              style={{ textTransform: 'uppercase', letterSpacing: '2px', textAlign: 'center', fontWeight: 700 }}
              autoFocus
            />
            <button className="btn-primary" type="submit" disabled={loading || !joinCode.trim()}>
              {loading ? 'Joining...' : '🚀 Join Duel'}
            </button>
          </form>
        )}

        {error && (
          <div className="auth-error" style={{ marginTop: '1rem' }}>
            ⚠️ {error}
          </div>
        )}

        <button className="btn-secondary" onClick={onClose} style={{ marginTop: '1.5rem', width: '100%' }}>
          Cancel
        </button>
      </div>
    </div>
  );
}
