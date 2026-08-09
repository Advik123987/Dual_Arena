import { useRef, useState } from "react";
import { joinQueue, openDuelSocket } from "./api.js";
import DuelRoom from "./components/DuelRoom.jsx";
import Leaderboard from "./components/Leaderboard.jsx";

export default function App() {
  const [nickname, setNickname] = useState("");
  const [status, setStatus] = useState("idle"); // idle | queueing | in_duel | ended
  const [duel, setDuel] = useState(null);
  const socketRef = useRef(null);

  const startQueue = async (e) => {
    e?.preventDefault();
    if (!nickname.trim()) return;
    try {
      setStatus("queueing");
      const { player_id } = await joinQueue(nickname.trim());

      const duelRef = { room_id: null };

      const socket = openDuelSocket(player_id, {
        duel_start: (msg) => {
          Object.assign(duelRef, msg);
          socketRef.current = socket;
          setDuel(duelRef);
          setStatus("in_duel");
        },
        tick: (msg) => duelRef.onTick?.(msg),
        commentary: (msg) => duelRef.onCommentary?.(msg),
        opponent_progress: (msg) => duelRef.onOpponentProgress?.(msg),
        duel_end: (msg) => duelRef.onDuelEnd?.(msg),
        onClose: () => {},
        onError: (err) => console.error("WebSocket error:", err),
      });
    } catch (err) {
      console.error("Queue join failed:", err);
      setStatus("idle");
      alert("Failed to join queue. Make sure API server is running.");
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">⚔️ DUEL ARENA</h1>
        <p className="app-subtitle">Real-Time AI 1v1 Algorithmic Battle Ground</p>
        <div className="hero-badges">
          <span className="badge">Groq Adaptive AI</span>
          <span className="badge">Live WebSocket Sync</span>
          <span className="badge">Zerops Cloud</span>
        </div>
      </header>

      {status === "idle" && (
        <div className="lobby-container">
          <h2 className="lobby-title">Enter the Arena</h2>
          <p className="lobby-desc">Pick your callsign and queue up against real competitors.</p>
          <form className="join-form" onSubmit={startQueue}>
            <input
              className="input-field"
              placeholder="Enter Call Sign / Nickname..."
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              autoFocus
            />
            <button className="btn-primary" type="submit" disabled={!nickname.trim()}>
              ⚡ FIND MATCH
            </button>
          </form>
        </div>
      )}

      {status === "queueing" && (
        <div className="queue-status">
          <div className="spinner"></div>
          <h3>Matchmaking in Progress...</h3>
          <p>Analyzing competitor profiles & targeted weak areas.</p>
        </div>
      )}

      {status === "in_duel" && duel && (
        <DuelRoom
          duel={duel}
          socket={socketRef.current}
          onEnd={() => setStatus("ended")}
        />
      )}

      {status === "ended" && (
        <div className="lobby-container">
          <h2 className="lobby-title">Match Completed</h2>
          <p className="lobby-desc">Your rating and targeted weak areas have been recalculated.</p>
          <button className="btn-primary" onClick={() => setStatus("idle")}>
            🔥 Play Again
          </button>
        </div>
      )}

      <Leaderboard />
    </div>
  );
}
