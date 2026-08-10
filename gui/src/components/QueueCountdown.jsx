import React, { useState, useEffect } from 'react';
import Timer from './Timer';
import { startSolo } from '../api';

export default function QueueCountdown({ onSolo, onKeepWaiting, onCancel, difficulty, language, mode, nickname, playerId }) {
  const [timeLeft, setTimeLeft] = useState(45);
  const [elapsed, setElapsed] = useState(0);
  const [dots, setDots] = useState(0);
  const [startingSolo, setStartingSolo] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1));
      setElapsed(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev + 1) % 3);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const statuses = ["Scanning active arena...", "Matching competitors...", "Connecting to duel room..."];

  const handleSoloClick = async () => {
    if (startingSolo) return;
    setStartingSolo(true);
    try {
      const data = await startSolo(playerId, nickname, difficulty, language, mode);
      if (onSolo) onSolo(data);
    } catch (err) {
      console.error("Solo start error:", err);
      setStartingSolo(false);
    }
  };

  const handleKeepWaiting = () => {
    setTimeLeft(45);
    if (onKeepWaiting) onKeepWaiting();
  };

  const formatElapsed = (sec) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="queue-countdown">
      <h2 style={{ marginBottom: '0.5rem', color: 'var(--accent-cyan)' }}>Searching for Opponent...</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
        Difficulty: <strong style={{ color: '#fff', textTransform: 'capitalize' }}>{difficulty}</strong> | Language: <strong style={{ color: '#fff', textTransform: 'capitalize' }}>{language}</strong> | Mode: <strong style={{ color: '#fff' }}>{mode.replace('_', ' ')}</strong>
      </p>

      <div style={{ transform: 'scale(1.2)', marginBottom: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Timer remaining={timeLeft} total={45} solo={false} />
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.8rem' }}>
          Time in queue: {formatElapsed(elapsed)}
        </span>
      </div>

      <div style={{ fontSize: '1.1rem', marginBottom: '2rem', minHeight: '30px', color: 'var(--accent-gold)', fontWeight: 600 }}>
        {statuses[dots]}
      </div>

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          className="btn-solo"
          onClick={handleSoloClick}
          disabled={startingSolo}
          style={{ padding: '0.7rem 1.5rem', fontSize: '0.95rem' }}
        >
          {startingSolo ? '🚀 Starting Solo Battle...' : '⚡ Play Solo Now'}
        </button>

        {timeLeft === 0 && (
          <button
            className="btn-secondary"
            onClick={handleKeepWaiting}
            style={{ padding: '0.7rem 1.5rem', fontSize: '0.95rem' }}
          >
            ⏳ Keep Waiting
          </button>
        )}

        <button
          className="btn-danger"
          onClick={onCancel}
          style={{ padding: '0.7rem 1.5rem', fontSize: '0.95rem' }}
        >
          ❌ Cancel Queue
        </button>
      </div>
    </div>
  );
}
