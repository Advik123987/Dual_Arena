import React, { useState, useEffect, useRef } from 'react';
import Timer from './Timer';
import CommentaryFeed from './CommentaryFeed';

export default function DuelRoom({ duel, myPlayerId, socket, onEnd }) {
  const [answer, setAnswer] = useState('');
  const [remaining, setRemaining] = useState(duel.duration || 300);
  const [lines, setLines] = useState([]);
  const [opponentStatus, setOpponentStatus] = useState('active');
  const [result, setResult] = useState(null);
  const [submitFlash, setSubmitFlash] = useState(null);

  useEffect(() => {
    if (duel.problem && duel.language.includes('java') && duel.problem.type.includes('code')) {
      setAnswer(`import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // YOUR CODE HERE\n    }\n}`);
    }
  }, [duel]);

  useEffect(() => {
    duel.onTick = (data) => setRemaining(data.remaining);
    duel.onCommentary = (data) => setLines(prev => [...prev, data.message]);
    duel.onOpponentProgress = (data) => {
      setOpponentStatus('active');
      setTimeout(() => setOpponentStatus('idle'), 2000);
    };
    duel.onSubmissionResult = (data) => {
      setSubmitFlash(data.correct ? 'correct' : 'wrong');
      setTimeout(() => setSubmitFlash(null), 800);
    };
    duel.onDuelEnd = (data) => {
      setResult(data);
      if (data.winner_id === myPlayerId && window.confetti) {
        window.confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      }
    };
  }, [duel, myPlayerId]);

  const handleSubmit = (ans = answer) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        action: 'submit',
        room_id: duel.room_id,
        player_id: myPlayerId,
        answer: ans
      }));
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      setAnswer(answer.substring(0, start) + '    ' + answer.substring(end));
      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = start + 4;
      }, 0);
    }
    if (e.ctrlKey && e.key === 'Enter') {
      handleSubmit();
    }
  };

  const isMcq = duel.problem.type === 'mcq';

  return (
    <div className="duel-room">
      <div className="duel-header-card">
        {duel.solo ? (
          <div className="solo-banner">SOLO CHALLENGE</div>
        ) : (
          <div className="vs-matchup">
            <span>{duel.you}</span>
            <span className="vs">VS</span>
            <span>{duel.opponent}</span>
          </div>
        )}
        <Timer remaining={remaining} total={duel.duration || 300} solo={duel.solo} />
      </div>

      {!duel.solo && (
        <div className="opponent-bar">
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Opponent Status:</span>
          <div className={`status-dot ${opponentStatus === 'active' ? 'active' : ''}`}></div>
          <span style={{ fontSize: '0.85rem' }}>{opponentStatus === 'active' ? 'Typing...' : 'Thinking...'}</span>
        </div>
      )}

      <div className="duel-grid">
        <div className="problem-panel">
          <div>
            <span className="category-tag">{duel.problem.category}</span>
          </div>
          <div className="problem-prompt">{duel.problem.prompt}</div>
          
          {isMcq && (
            <div className="mcq-choices">
              {duel.problem.choices.map((c, i) => (
                <button 
                  key={i}
                  className={`choice-btn ${answer === c ? 'selected' : ''}`}
                  onClick={() => setAnswer(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="workspace-panel">
          {submitFlash && <div className={`submit-flash-overlay ${submitFlash}`}></div>}
          <div className="lang-badge">{duel.language}</div>
          
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {!isMcq && (
              <>
                <div className="code-signature">Write your solution below (Ctrl+Enter to submit)</div>
                <textarea 
                  className={`code-textarea ${duel.language.includes('java') ? 'java-mode' : ''}`}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={duel.problem.type === 'short_answer' ? 'Enter your answer here...' : '// Write code here...'}
                  disabled={!!result}
                />
              </>
            )}
            
            <button 
              className="btn-primary" 
              onClick={() => handleSubmit()}
              disabled={!!result || !answer}
              style={{ marginTop: 'auto' }}
            >
              Submit Answer
            </button>
          </div>
        </div>
      </div>

      <CommentaryFeed lines={lines} />

      {result && (
        <div className={`result-banner ${result.winner_id === myPlayerId ? 'win' : result.reason === 'timeout' ? 'timeout' : 'loss'}`}>
          <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>
            {result.winner_id === myPlayerId ? '🏆 YOU WIN!' : result.reason === 'timeout' ? '⏳ TIME IS UP!' : '💀 YOU LOSE!'}
          </h2>
          <p style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--text-muted)' }}>
            {result.reason === 'timeout' ? "Nobody solved the problem in time." : 
             result.winner_id === myPlayerId ? "You solved it first!" : "Your opponent solved it first."}
          </p>
          
          {result.rating_deltas && result.rating_deltas[myPlayerId] && (
            <div className={`rating-delta ${result.rating_deltas[myPlayerId] > 0 ? 'positive' : 'negative'}`}>
              Rating: {result.rating_deltas[myPlayerId] > 0 ? '+' : ''}{result.rating_deltas[myPlayerId]}
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem' }}>
            <button className="btn-primary" onClick={onEnd}>Play Again</button>
            <button className="btn-secondary" onClick={onEnd}>Back to Lobby</button>
          </div>
        </div>
      )}
    </div>
  );
}
