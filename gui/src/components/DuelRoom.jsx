import React, { useState, useEffect } from 'react';
import Timer from './Timer';
import CommentaryFeed from './CommentaryFeed';
import { runTests } from '../api.js';

export default function DuelRoom({ duel, myPlayerId, socket, onEnd, isSpectator = false }) {
  const [answer, setAnswer] = useState('');
  const [remaining, setRemaining] = useState(duel.duration || 300);
  const [lines, setLines] = useState([]);
  const [opponentStatus, setOpponentStatus] = useState('idle');
  const [result, setResult] = useState(null);
  const [submitFlash, setSubmitFlash] = useState(null);

  // Test Sandbox state
  const [testResults, setTestResults] = useState(null);
  const [runningTests, setRunningTests] = useState(false);

  useEffect(() => {
    if (duel.problem && duel.language?.includes('java') && duel.problem.type?.includes('code')) {
      setAnswer(`import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // YOUR CODE HERE\n    }\n}`);
    }
  }, [duel]);

  useEffect(() => {
    duel.onTick = (data) => setRemaining(data.remaining);
    duel.onCommentary = (data) => setLines(prev => [...prev, data.message || data.line]);
    duel.onOpponentProgress = (data) => {
      setOpponentStatus('active');
      setTimeout(() => setOpponentStatus('idle'), 2500);
    };
    duel.onSubmissionResult = (data) => {
      setSubmitFlash(data.correct ? 'correct' : 'wrong');
      setTimeout(() => setSubmitFlash(null), 800);
    };
    duel.onDuelEnd = (data) => {
      setResult(data);
      if (data.winner_id === myPlayerId && window.confetti) {
        window.confetti({ particleCount: 180, spread: 80, origin: { y: 0.6 } });
      }
    };
  }, [duel, myPlayerId]);

  const handleSubmit = async (ans = answer) => {
    if (isSpectator) return;
    if (socket && socket.readyState === WebSocket.OPEN && !duel.isPractice) {
      socket.send(JSON.stringify({
        action: 'submit_answer',
        room_id: duel.room_id,
        answer: ans
      }));
    } else {
      // Practice mode or fallback: HTTP grading
      try {
        const res = await runTests(duel.problem, ans);
        setSubmitFlash(res.success ? 'correct' : 'wrong');
        setTimeout(() => setSubmitFlash(null), 800);
        if (res.success) {
          setResult({
            winner_id: myPlayerId,
            timed_out: false,
            solo: true,
            rating_delta: 5,
            post_mortem: {
              optimal_complexity: "Optimal Practice Execution",
              key_insight: "Great job! All test cases passed successfully.",
              pro_tip: "Keep practicing to boost your algorithmic speed in 1v1 duels!"
            }
          });
          if (window.confetti) {
            window.confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
          }
        }
      } catch (err) {
        setSubmitFlash('wrong');
        setTimeout(() => setSubmitFlash(null), 800);
      }
    }
  };

  const handleRunTests = async () => {
    if (!answer.trim() || runningTests) return;
    setRunningTests(true);
    setTestResults(null);
    try {
      const res = await runTests(duel.problem, answer);
      setTestResults(res);
    } catch (err) {
      setTestResults({ success: false, error: err.message, test_results: [] });
    } finally {
      setRunningTests(false);
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
      {/* Header */}
      <div className="duel-header-card">
        {isSpectator ? (
          <div className="solo-banner" style={{ color: 'var(--accent-purple)' }}>👁️ SPECTATOR MODE</div>
        ) : duel.solo ? (
          <div className="solo-banner">SOLO CHALLENGE</div>
        ) : (
          <div className="vs-matchup">
            <span>🛡️ {duel.you}</span>
            <span className="vs">VS</span>
            <span>⚔️ {duel.opponent}</span>
          </div>
        )}
        <Timer remaining={remaining} total={duel.duration || 300} solo={duel.solo} />
      </div>

      {!duel.solo && !isSpectator && (
        <div className="opponent-bar">
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Opponent Status:</span>
          <div className={`status-dot ${opponentStatus === 'active' ? 'active' : ''}`}></div>
          <span style={{ fontSize: '0.85rem' }}>{opponentStatus === 'active' ? '⚡ Attempt submitted!' : 'Thinking...'}</span>
        </div>
      )}

      {/* Grid */}
      <div className="duel-grid">
        <div className="problem-panel">
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span className="category-tag">🎯 {duel.problem.category}</span>
            <span className="category-tag" style={{ background: 'rgba(0, 242, 254, 0.15)', color: 'var(--accent-cyan)' }}>
              {duel.difficulty || 'medium'}
            </span>
          </div>
          <div className="problem-prompt">{duel.problem.prompt}</div>

          {isMcq && (
            <div className="mcq-choices">
              {duel.problem.choices?.map((c, i) => (
                <button
                  key={i}
                  className={`choice-btn ${answer === c ? 'selected' : ''}`}
                  onClick={() => !isSpectator && setAnswer(c)}
                  disabled={isSpectator || !!result}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="workspace-panel">
          {submitFlash && <div className={`submit-flash-overlay ${submitFlash}`}></div>}
          <div className="lang-badge">{duel.language || 'python'}</div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {!isMcq && (
              <>
                <div className="code-signature">
                  {isSpectator ? 'Spectating user code...' : 'Write solution below (Ctrl+Enter to submit)'}
                </div>
                <textarea
                  className={`code-textarea ${duel.language?.includes('java') ? 'java-mode' : ''}`}
                  value={answer}
                  onChange={(e) => !isSpectator && setAnswer(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={duel.problem.type === 'short_answer' ? 'Type solution...' : '// Write solution...'}
                  disabled={isSpectator || !!result}
                />
              </>
            )}

            {!isSpectator && (
              <div style={{ display: 'flex', gap: '1rem', marginTop: 'auto' }}>
                {!isMcq && (
                  <button
                    className="btn-secondary"
                    onClick={handleRunTests}
                    disabled={runningTests || !!result || !answer}
                    style={{ flex: 1 }}
                  >
                    {runningTests ? '🧪 Running...' : '🧪 Run Tests'}
                  </button>
                )}
                <button
                  className="btn-primary"
                  onClick={() => handleSubmit()}
                  disabled={!!result || !answer}
                  style={{ flex: isMcq ? 1 : 2 }}
                >
                  🚀 SUBMIT SOLUTION
                </button>
              </div>
            )}

            {/* Test Sandbox Drawer */}
            {testResults && (
              <div className="sandbox-output-drawer">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <strong style={{ color: testResults.success ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                    {testResults.success ? '✅ All Tests Passed!' : '❌ Test Output / Errors'}
                  </strong>
                  <button className="profile-close-btn" style={{ position: 'static' }} onClick={() => setTestResults(null)}>×</button>
                </div>
                {testResults.error ? (
                  <pre className="test-error-pre">{testResults.error}</pre>
                ) : (
                  <div className="test-case-list">
                    {testResults.test_results?.map((tr, idx) => (
                      <div key={idx} className={`test-case-item ${tr.passed ? 'pass' : 'fail'}`}>
                        <span>Case #{tr.test_case}: {tr.passed ? 'PASSED' : 'FAILED'}</span>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          Expected: {tr.expected} | Actual: {tr.actual}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <CommentaryFeed lines={lines} />

      {/* Result Banner */}
      {result && (
        <div className={`result-banner ${result.winner_id === myPlayerId ? 'win' : result.timed_out ? 'timeout' : 'loss'}`}>
          <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
            {result.winner_id === myPlayerId
              ? '🏆 VICTORY IS YOURS!'
              : result.timed_out
              ? '⏱️ TIME EXPIRED'
              : '💀 MATCH LOST'}
          </h2>
          <p style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>
            {result.timed_out
              ? "Neither competitor solved in time."
              : result.winner_id === myPlayerId
              ? "Your solution passed all test cases!"
              : "Opponent solved first."}
          </p>

          {result.rating_delta !== undefined && (
            <div className={`rating-delta ${result.rating_delta >= 0 ? 'positive' : 'negative'}`}>
              Rating: {result.rating_delta >= 0 ? '+' : ''}{result.rating_delta} ELO
            </div>
          )}

          {/* AI Post-Mortem Solution Breakdown */}
          {result.post_mortem && (
            <div className="post-mortem-card">
              <h4 style={{ color: 'var(--accent-cyan)', margin: '0 0 0.5rem', fontSize: '1rem' }}>
                🤖 AI Solution Analysis
              </h4>
              <p style={{ margin: '0 0 0.3rem', fontSize: '0.9rem' }}>
                <strong>Complexity:</strong> {result.post_mortem.optimal_complexity}
              </p>
              <p style={{ margin: '0 0 0.3rem', fontSize: '0.9rem' }}>
                <strong>Key Insight:</strong> {result.post_mortem.key_insight}
              </p>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                💡 <em>{result.post_mortem.pro_tip}</em>
              </p>
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem' }}>
            <button className="btn-primary" onClick={onEnd}>🔥 Play Again</button>
            <button className="btn-secondary" onClick={onEnd}>🏠 Lobby</button>
          </div>
        </div>
      )}
    </div>
  );
}
