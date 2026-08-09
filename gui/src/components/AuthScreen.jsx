import React, { useState } from 'react';
import { register, login, saveSession } from '../api.js';

export default function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!nickname.trim()) return setError('Nickname is required.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    if (mode === 'register' && password !== confirmPassword)
      return setError('Passwords do not match.');

    setLoading(true);
    try {
      const data = mode === 'register'
        ? await register(nickname.trim(), password)
        : await login(nickname.trim(), password);

      saveSession(data.token, {
        player_id: data.player_id,
        nickname: data.nickname,
        rating: data.rating,
        win_streak: data.win_streak,
      });
      onAuth(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <span className="auth-logo-icon">⚔️</span>
          <h1 className="auth-title">DUAL ARENA</h1>
          <p className="auth-subtitle">1v1 Competitive Coding Battles</p>
        </div>

        {/* Tab Toggle */}
        <div className="auth-tabs">
          <button
            className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => { setMode('login'); setError(''); }}
          >
            🔑 Login
          </button>
          <button
            className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => { setMode('register'); setError(''); }}
          >
            🚀 Register
          </button>
        </div>

        {/* Form */}
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label className="auth-label">Competitor Nickname</label>
            <input
              className="input-field"
              type="text"
              placeholder="e.g. CodeSlayer99"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              maxLength={24}
              autoFocus
              autoComplete="username"
            />
          </div>

          <div className="auth-field">
            <label className="auth-label">Password</label>
            <input
              className="input-field"
              type="password"
              placeholder="Min 6 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            />
          </div>

          {mode === 'register' && (
            <div className="auth-field">
              <label className="auth-label">Confirm Password</label>
              <input
                className="input-field"
                type="password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          )}

          {error && (
            <div className="auth-error">
              ⚠️ {error}
            </div>
          )}

          <button
            className="btn-primary auth-submit"
            type="submit"
            disabled={loading || !nickname.trim() || !password}
          >
            {loading
              ? <span className="auth-spinner" />
              : mode === 'login' ? '⚡ Enter the Arena' : '🚀 Create Account'}
          </button>
        </form>

        {/* Footnote */}
        <p className="auth-footer">
          {mode === 'login'
            ? <>No account? <button className="auth-link" onClick={() => { setMode('register'); setError(''); }}>Register here</button></>
            : <>Already a fighter? <button className="auth-link" onClick={() => { setMode('login'); setError(''); }}>Log in</button></>
          }
        </p>

        {/* Feature bullets */}
        <div className="auth-features">
          <span>🏆 Persistent Rankings</span>
          <span>🔥 Win Streak Tracking</span>
          <span>☕ Python &amp; Java</span>
          <span>⚔️ Direct Challenges</span>
        </div>
      </div>
    </div>
  );
}
