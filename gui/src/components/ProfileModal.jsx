import React, { useState, useEffect } from 'react';
import { fetchProfile } from '../api.js';

const BADGE_MAP = {
  first_blood: { title: "⚡ First Blood", desc: "Solved a duel in under 60 seconds" },
  streak_master: { title: "🔥 Streak Master", desc: "Achieved a 3+ win streak" },
  polyglot: { title: "☕ Polyglot", desc: "Won duels using Java" },
  hardcore: { title: "💀 Hardcore", desc: "Victory in Hard mode" },
  solo_champion: { title: "🤖 Solo Champion", desc: "Won 3+ Solo Challenges" },
};

export default function ProfileModal({ playerId, onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!playerId) return;
    fetchProfile(playerId)
      .then(data => { setProfile(data); setLoading(false); })
      .catch(err => { console.error(err); setLoading(false); });
  }, [playerId]);

  if (!playerId) return null;

  return (
    <div className="challenge-modal-overlay" onClick={onClose}>
      <div className="challenge-modal profile-modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', textAlign: 'left' }}>
        <button className="profile-close-btn" onClick={onClose}>×</button>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div className="auth-spinner" style={{ margin: '0 auto 1rem' }} />
            <p style={{ color: 'var(--text-muted)' }}>Loading competitor profile...</p>
          </div>
        ) : !profile ? (
          <p style={{ color: 'var(--accent-red)', textAlign: 'center' }}>Failed to load profile.</p>
        ) : (
          <>
            {/* Header */}
            <div className="profile-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <span style={{ fontSize: '2.2rem' }}>{profile.tier?.badge || '👤'}</span>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.6rem' }}>{profile.nickname}</h2>
                  <span className="profile-tier-tag" style={{ color: profile.tier?.color || 'var(--accent-cyan)' }}>
                    {profile.tier?.name || 'Unranked'} ({profile.rating} ELO)
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="profile-stats-grid">
              <div className="profile-stat-box">
                <span className="label">Wins / Losses</span>
                <span className="value" style={{ color: 'var(--accent-green)' }}>{profile.wins}W <span style={{ color: 'var(--text-muted)' }}>/ {profile.losses}L</span></span>
              </div>
              <div className="profile-stat-box">
                <span className="label">Win Rate</span>
                <span className="value" style={{ color: 'var(--accent-cyan)' }}>{profile.win_rate}%</span>
              </div>
              <div className="profile-stat-box">
                <span className="label">Win Streak</span>
                <span className="value" style={{ color: 'var(--accent-orange)' }}>🔥 {profile.win_streak}</span>
              </div>
            </div>

            {/* Achievements */}
            <div className="profile-section">
              <h4 className="profile-section-title">🎖️ Achievements ({profile.achievements?.length || 0})</h4>
              {(!profile.achievements || profile.achievements.length === 0) ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No achievements unlocked yet.</p>
              ) : (
                <div className="profile-badges-list">
                  {profile.achievements.map(key => {
                    const b = BADGE_MAP[key] || { title: key, desc: "Unlocked" };
                    return (
                      <div key={key} className="achievement-badge" title={b.desc}>
                        <span>{b.title}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Category Weakness Progress */}
            {profile.weak_areas && Object.keys(profile.weak_areas).length > 0 && (
              <div className="profile-section">
                <h4 className="profile-section-title">📊 Targeted Category Proficiency</h4>
                <div className="weakness-bars">
                  {Object.entries(profile.weak_areas).slice(0, 5).map(([cat, score]) => {
                    const proficiency = Math.round((1 - score) * 100);
                    return (
                      <div key={cat} className="weakness-row">
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '3px' }}>
                          <span style={{ textTransform: 'capitalize' }}>{cat.replace('_', ' ')}</span>
                          <span style={{ color: proficiency > 60 ? 'var(--accent-green)' : 'var(--accent-orange)' }}>{proficiency}%</span>
                        </div>
                        <div className="progress-bar-track">
                          <div
                            className="progress-bar-fill"
                            style={{
                              width: `${proficiency}%`,
                              background: proficiency > 60 ? 'var(--accent-green)' : 'var(--accent-orange)',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Match History */}
            {profile.match_history && profile.match_history.length > 0 && (
              <div className="profile-section">
                <h4 className="profile-section-title">📜 Recent Matches</h4>
                <div className="profile-match-list">
                  {profile.match_history.map(m => (
                    <div key={m.id} className={`profile-match-item ${m.is_win ? 'win' : 'loss'}`}>
                      <span>{m.is_win ? '🏆 VICTORY' : '💀 DEFEAT'}</span>
                      <span style={{ textTransform: 'capitalize', color: 'var(--text-muted)' }}>{m.category} ({m.language})</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.is_solo ? 'Solo' : 'PvP'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
