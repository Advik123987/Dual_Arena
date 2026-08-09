import React, { useState } from 'react';
import { register, login, saveSession } from '../api.js';

export default function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState('register'); // Default to 'register' for new competitors
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!nickname.trim()) return setError('Please enter a nickname.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    if (mode === 'register' && password !== confirmPassword)
      return setError('Passwords do not match. Please re-type your password.');

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
          <p className="auth-subtitle">Real-Time AI 1v1 Coding Battle Platform</p>
        </div>

        {/* Tab Toggle */}
        <div className="auth-tabs">
          <button
            className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => { setMode('register'); setError(''); }}
          >
            🚀 Register Account
          </button>
          <button
            className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => { setMode('login'); setError(''); }}
          >
            🔑 Login
          </button>
        </div>

        {/* Form */}
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label className="auth-label">Competitor Callsign / Nickname</label>
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
              {error.includes("not found") && mode === 'login' && (
                <div style={{ marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    className="auth-link"
                    onClick={() => { setMode('register'); setError(''); }}
                    style={{ color: '#fff', fontWeight: 700 }}
                  >
                    👉 Click here to Register as '{nickname}'
                  </button>
                </div>
              )}
              {error.includes("already registered") && mode === 'register' && (
                <div style={{ marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    className="auth-link"
                    onClick={() => { setMode('login'); setError(''); }}
                    style={{ color: '#fff', fontWeight: 700 }}
                  >
                    👉 Click here to Login as '{nickname}'
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            className="btn-primary auth-submit"
            type="submit"
            disabled={loading || !nickname.trim() || !password}
          >
            {loading
              ? <span className="auth-spinner" />
              : mode === 'register' ? '🚀 Create Account & Enter Arena' : '⚡ Login & Enter Arena'}
          </button>
        </form>

        {/* Footnote */}
        <p className="auth-footer">
          {mode === 'register'
            ? <>Already registered? <button className="auth-link" onClick={() => { setMode('login'); setError(''); }}>Log in here</button></>
            : <>New competitor? <button className="auth-link" onClick={() => { setMode('register'); setError(''); }}>Create account</button></>
          }
        </p>

        {/* Feature bullets */}
        <div className="auth-features">
          <span>🏆 Reserved Username</span>
          <span>🔥 Rating &amp; Streak Tracking</span>
          <span>☕ Python &amp; Java</span>
          <span>⚔️ Direct PvP Challenges</span>
        </div>
      </div>
    </div>
  );
}
