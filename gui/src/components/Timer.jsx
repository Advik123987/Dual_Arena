import React from 'react';

export default function Timer({ remaining, total, solo }) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(1, remaining / total));
  const offset = circumference - progress * circumference;

  let color = 'var(--accent-cyan)';
  if (progress <= 0.2) color = 'var(--accent-red)';
  else if (progress <= 0.5) color = 'var(--accent-orange)';

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isCritical = remaining <= 10 && remaining > 0;

  return (
    <div className={`timer-ring ${isCritical ? 'timer-shake' : ''}`}>
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle className="bg" cx="60" cy="60" r={radius} />
        <circle 
          className="progress" 
          cx="60" cy="60" r={radius} 
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="timer-text" style={{ color: isCritical ? 'var(--accent-red)' : 'inherit' }}>
        {formatTime(remaining)}
        {solo && <div style={{ fontSize: '0.6rem', color: 'var(--accent-gold)' }}>SOLO</div>}
      </div>
    </div>
  );
}
