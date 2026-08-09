import React, { useEffect, useRef } from 'react';

export default function CommentaryFeed({ lines }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [lines]);

  const getColor = (text) => {
    const lower = text.toLowerCase();
    if (lower.includes('time')) return 'var(--accent-gold)';
    if (lower.includes('correct')) return 'var(--accent-green)';
    if (lower.includes('wrong')) return 'var(--accent-red)';
    return 'var(--accent-pink)';
  };

  const displayLines = lines.slice(-8);

  return (
    <div className="commentary-card">
      <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>🎙️ Live Commentary</h3>
      <div ref={containerRef} style={{ maxHeight: '150px', overflowY: 'auto' }}>
        {displayLines.map((line, index) => (
          <div 
            key={index} 
            className="commentary-item"
            style={{ 
              animationDelay: `${index * 0.05}s`,
              color: getColor(line)
            }}
          >
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}
