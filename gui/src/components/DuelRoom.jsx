import { useState } from "react";
import Timer from "./Timer.jsx";
import CommentaryFeed from "./CommentaryFeed.jsx";

export default function DuelRoom({ duel, socket, onEnd }) {
  const [answer, setAnswer] = useState("");
  const [remaining, setRemaining] = useState(duel.duration);
  const [lines, setLines] = useState([]);
  const [opponentStatus, setOpponentStatus] = useState(null);
  const [result, setResult] = useState(null);

  duel.onTick = (msg) => setRemaining(msg.remaining);
  duel.onCommentary = (msg) => setLines((prev) => [...prev.slice(-7), msg.line]);
  duel.onOpponentProgress = (msg) => setOpponentStatus(msg.correct ? "Solved!" : "Wrong attempt");
  duel.onDuelEnd = (msg) => {
    setResult(msg);
    onEnd?.(msg);
  };

  const submit = () => {
    if (!answer.trim() || result) return;
    socket.send(JSON.stringify({ action: "submit_answer", room_id: duel.room_id, answer: answer.trim() }));
  };

  const p = duel.problem;

  return (
    <div className="duel-room">
      <div className="duel-header-card">
        <div className="vs-matchup">
          <span className="player-name player-you">🛡️ {duel.you}</span>
          <span className="vs-badge">VS</span>
          <span className="player-name">⚔️ {duel.opponent}</span>
        </div>
        <Timer remaining={remaining} />
      </div>

      {opponentStatus && (
        <div className="opponent-bar">
          <span className={`status-dot ${opponentStatus === "Solved!" ? "correct" : ""}`}></span>
          Opponent <strong>{duel.opponent}</strong>: {opponentStatus}
        </div>
      )}

      <div className="duel-grid">
        {/* Left Column: Problem Statement */}
        <div className="problem-panel">
          <span className="category-tag">🎯 Category: {p.category || "Algorithmic"} ({p.type})</span>
          <h3 className="problem-title">Challenge Statement</h3>
          <div className="problem-prompt">{p.prompt}</div>
        </div>

        {/* Right Column: Code Editor / Interactive Answers */}
        <div className="workspace-panel">
          <h3 className="problem-title">Submission Console</h3>

          {p.type === "mcq" && (
            <div className="mcq-choices">
              {p.choices?.map((c) => (
                <button
                  key={c}
                  className={`choice-btn ${answer === c ? "selected" : ""}`}
                  onClick={() => setAnswer(c)}
                  disabled={!!result}
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          {p.type === "short_answer" && (
            <input
              className="input-field"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your exact solution here..."
              disabled={!!result}
            />
          )}

          {p.type === "code" && (
            <div className="code-editor-container">
              {p.function_signature && (
                <pre className="code-signature">{p.function_signature}</pre>
              )}
              <textarea
                className="code-textarea"
                rows={12}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder={`${p.function_signature || 'def solve(...):'}\n    # Write python solution code here\n    pass`}
                disabled={!!result}
              />
            </div>
          )}

          <button
            className="btn-primary"
            style={{ marginTop: "16px" }}
            onClick={submit}
            disabled={!answer.trim() || !!result}
          >
            🚀 SUBMIT SOLUTION
          </button>
        </div>
      </div>

      <CommentaryFeed lines={lines} />

      {result && (
        <div className={`result-banner ${result.timed_out ? "timeout" : ""}`}>
          <h2>
            {result.winner_id
              ? result.winner_id === duel.you
                ? "🏆 VICTORY IS YOURS!"
                : "💀 MATCH LOST"
              : "⏱️ TIME EXPIRED"}
          </h2>
          <p>
            {result.winner_id ? "Match completed. Ratings updated." : "Neither player solved in time."}
          </p>
        </div>
      )}
    </div>
  );
}
