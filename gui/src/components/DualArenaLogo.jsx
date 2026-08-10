import React from 'react';

export default function DualArenaLogo({ size = 'medium', animated = true, onClick }) {
  const sizeMap = {
    small: { fontSize: '1.4rem', iconSize: '1.6rem', gap: '0.4rem' },
    medium: { fontSize: '2.5rem', iconSize: '2.8rem', gap: '0.8rem' },
    large: { fontSize: '3.8rem', iconSize: '4.2rem', gap: '1rem' },
  };

  const dim = sizeMap[size] || sizeMap.medium;

  return (
    <div
      className={`dual-arena-logo ${animated ? 'animated' : ''}`}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: dim.gap,
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none',
      }}
    >
      <div className="logo-emblem-wrapper" style={{ position: 'relative' }}>
        <div className="logo-glow-ring"></div>
        <span className="logo-icon" style={{ fontSize: dim.iconSize }}>
          ⚔️
        </span>
      </div>
      <span className="logo-text" style={{ fontSize: dim.fontSize }}>
        DUAL<span className="logo-text-accent">ARENA</span>
      </span>
    </div>
  );
}
