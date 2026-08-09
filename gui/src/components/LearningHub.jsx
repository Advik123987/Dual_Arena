import React, { useState, useEffect } from 'react';
import { fetchRecommendations } from '../api.js';

export default function LearningHub({ playerId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!playerId) return;
    setLoading(true);
    fetchRecommendations(playerId)
      .then(res => { setData(res); setLoading(false); })
      .catch(err => { console.error(err); setLoading(false); });
  }, [playerId]);

  return (
    <div className="learning-hub-container">
      <div className="learning-hub-header">
        <div>
          <h2>💡 AI Learning Coach & Resource Engine</h2>
          <p style={{ color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
            Personalized study plans & curated algorithm tutorials based on your actual 1v1 battle data.
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="auth-spinner" style={{ margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--text-muted)' }}>Analyzing performance data & crafting AI recommendations...</p>
        </div>
      ) : !data ? (
        <p style={{ color: 'var(--accent-red)', textAlign: 'center' }}>Failed to generate recommendations.</p>
      ) : (
        <div className="learning-grid">
          {/* Summary Box */}
          <div className="learning-card summary-card">
            <h3>🤖 AI Skill Evaluation</h3>
            <p style={{ fontSize: '1rem', lineHeight: '1.6', color: 'var(--text-main)' }}>
              {data.custom_summary}
            </p>
            <div style={{ marginTop: '1rem' }}>
              <strong style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Target Priority Focus Areas:</strong>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                {data.focus_areas?.map(cat => (
                  <span key={cat} className="category-tag" style={{ textTransform: 'capitalize' }}>
                    🎯 {cat.replace('_', ' ')}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Recommendations Cards */}
          <div className="recommendations-list">
            <h3 style={{ margin: '0 0 1rem', fontSize: '1.2rem' }}>📖 Recommended Resources & Action Steps</h3>
            {data.recommendations?.map((item, idx) => (
              <div key={idx} className="learning-card rec-item-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <span className="category-tag" style={{ textTransform: 'capitalize' }}>{item.category}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--accent-gold)', fontWeight: 600 }}>Recommended</span>
                </div>
                <h4 style={{ margin: '0 0 0.4rem', fontSize: '1.1rem', color: 'var(--accent-cyan)' }}>{item.topic}</h4>
                <p style={{ margin: '0 0 0.8rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  <strong>Action Step:</strong> {item.action_step}
                </p>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.6rem 0.8rem', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{item.resource_title}</span>
                  {item.resource_url && (
                    <a
                      href={item.resource_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary"
                      style={{ padding: '0.25rem 0.6rem', fontSize: '0.78rem', textDecoration: 'none' }}
                    >
                      🔗 Open Tutorial
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
