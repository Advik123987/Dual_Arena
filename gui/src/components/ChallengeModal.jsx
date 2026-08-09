import React, { useState, useEffect } from 'react';

export default function ChallengeModal({ challenge, onAccept, onDecline, myNickname, socket }) {
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleDecline();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAccept = () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        action: "accept_challenge",
        from_player_id: challenge.from_player_id,
        accepting_nickname: myNickname
      }));
    }
    onAccept(challenge.from_player_id);
  };

  const handleDecline = () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        action: "decline_challenge",
        from_player_id: challenge.from_player_id,
        declining_nickname: myNickname
      }));
    }
    onDecline(challenge.from_player_id);
  };

  return (
    <div className="challenge-modal-overlay">
      <div className="challenge-modal">
        <h2 style={{ color: 'var(--accent-purple)', marginBottom: '1rem' }}>⚔️ Challenge Received!</h2>
        <p style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>
          <strong>{challenge.from_nickname}</strong> wants to duel you!
        </p>
        
        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', textAlign: 'left' }}>
          <p><strong>Difficulty:</strong> {challenge.difficulty}</p>
          <p><strong>Language:</strong> {challenge.language}</p>
          <p><strong>Mode:</strong> {challenge.mode}</p>
        </div>

        <p style={{ color: 'var(--accent-red)', marginBottom: '1rem' }}>Auto-declining in {timeLeft}s</p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button className="btn-primary" style={{ background: 'var(--accent-green)' }} onClick={handleAccept}>
            Accept
          </button>
          <button className="btn-danger" onClick={handleDecline}>
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}
