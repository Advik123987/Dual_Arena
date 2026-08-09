import React, { useState, useEffect } from 'react';
import Timer from './Timer';
import { startSolo } from '../api';

export default function QueueCountdown({ onSolo, onKeepWaiting, difficulty, language, mode, nickname, playerId }) {
  const [timeLeft, setTimeLeft] = useState(45);
  const [dots, setDots] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev + 1) % 3);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const statuses = ["Scanning...", "Matching...", "Connecting..."];

  const handleSolo = async () => {
    try {
      await startSolo(playerId, nickname, difficulty, language, mode);
      onSolo();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="queue-countdown">
      <h2 style={{ marginBottom: '1rem', color: 'var(--accent-cyan)' }}>Searching for Opponent...</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
        Difficulty: {difficulty} | Language: {language} | Mode: {mode}
      </p>
      
      <div style={{ transform: 'scale(1.5)', marginBottom: '3rem' }}>
        <Timer remaining={timeLeft} total={45} solo={false} />
      </div>
      
      <div style={{ fontSize: '1.2rem', marginBottom: '2rem', minHeight: '30px' }}>
        {statuses[dots]}
      </div>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <button className="btn-solo" onClick={handleSolo}>
          ⚡ Play Solo Now
        </button>
        {(timeLeft === 0) && (
          <button className="btn-secondary" onClick={onKeepWaiting}>
            ⏳ Keep Waiting
          </button>
        )}
      </div>
    </div>
  );
}
