import { useState } from "react";
import Timer from "./Timer.jsx";
import CommentaryFeed from "./CommentaryFeed.jsx";

export default function DuelRoom({ duel, socket, onEnd }) {
  const [answer, setAnswer] = useState("");
  const [remaining, setRemaining] = useState(duel.duration);
  const [lines, setLines] = useState([]);
  const [opponentStatus, setOpponentStatus] = useState(null);
  const [result, setResult] = useState(null);

  // Parent (App.jsx) forwards socket messages down via duel.eventBus-style
  // callbacks it registers on the same socket instance — see App.jsx's
  // openDuelSocket handlers, which call these setters through duel.on*.
  duel.onTick = (msg) => setRemaining(msg.remaining);
  duel.onCommentary = (msg) => setLines((prev) => [...prev.slice(-9), msg.line]);
  duel.onOpponentProgress = (msg) => setOpponentStatus(msg.correct ? "correct" : "wrong-attempt");
  duel.onDuelEnd = (msg) => {
    setResult(msg);
    onEnd?.(msg);
  };

  const submit = () => {
    if (!answer.trim()) return;
    socket.send(JSON.stringify({ action: "submit_answer", room_id: duel.room_id, answer }));
  };

  const p = duel.problem;

  return (
    <div className="duel-room">
      <div className="duel-header">
        <span>{duel.you} vs {duel.opponent}</span>
        <Timer remaining={remaining} />
      </div>

      {opponentStatus && <div className="opponent-status">Opponent: {opponentStatus}</div>}

      <div className="problem-panel">
        <h3>[{p.category}] {p.type}</h3>
        <p>{p.prompt}</p>

        {p.type === "mcq" && (
          <div className="choices">
            {p.choices.map((c) => (
              <button key={c} className={answer === c ? "selected" : ""} onClick={() => setAnswer(c)}>
                {c}
              </button>
            ))}
          </div>
        )}

        {p.type === "short_answer" && (
          <input value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Your answer" />
        )}

        {p.type === "code" && (
          <>
            <pre className="signature">{p.function_signature}</pre>
            <textarea
              rows={10}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder={`${p.function_signature}\n    # your code here`}
            />
          </>
        )}

        <button className="submit-btn" onClick={submit} disabled={!!result}>Submit</button>
      </div>

      <CommentaryFeed lines={lines} />

      {result && (
        <div className="duel-result">
          {result.winner_id ? "Duel finished — check the leaderboard." : "Time's up — no winner."}
        </div>
      )}
    </div>
  );
}
