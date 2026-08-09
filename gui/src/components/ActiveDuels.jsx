import React, { useState, useEffect } from 'react';
import { fetchActiveDuels } from '../api';

export default function ActiveDuels() {
  const [duels, setDuels] = useState([]);

  useEffect(() => {
    const loadDuels = async () => {
      try {
        const data = await fetchActiveDuels();
        setDuels(data);
      } catch (err) {
        console.error(err);
      }
    };
    loadDuels();
    const interval = setInterval(loadDuels, 5000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="active-duels">
      <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center' }}>
        <span className="live-dot" style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-green)', marginRight: '10px', animation: 'livePulse 2s infinite' }}></span>
        Live Arena Matches
      </h3>
      
      {duels.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>The Arena is quiet. Be the first to battle! 🤺</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {duels.map((duel) => (
            <div key={duel.room_id} className="duel-card-live">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <strong style={{ fontSize: '1.1rem' }}>
                  {duel.solo ? 'Solo Challenge' : `${duel.player_a} vs ${duel.player_b}`}
                </strong>
                <span style={{ color: 'var(--accent-cyan)' }}>{formatTime(duel.remaining)}</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.85rem' }}>
                <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '12px' }}>{duel.category}</span>
                <span style={{ background: 'rgba(255,140,0,0.1)', color: 'var(--accent-orange)', padding: '2px 8px', borderRadius: '12px' }}>{duel.difficulty}</span>
                <span style={{ background: 'rgba(0,242,254,0.1)', color: 'var(--accent-cyan)', padding: '2px 8px', borderRadius: '12px' }}>{duel.language}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
