import { useRef, useState } from "react";
import { joinQueue, openDuelSocket } from "./api.js";
import DuelRoom from "./components/DuelRoom.jsx";
import Leaderboard from "./components/Leaderboard.jsx";

export default function App() {
  const [nickname, setNickname] = useState("");
  const [status, setStatus] = useState("idle"); // idle | queueing | in_duel | ended
  const [duel, setDuel] = useState(null);
  const socketRef = useRef(null);

  const startQueue = async () => {
    if (!nickname.trim()) return;
    setStatus("queueing");
    const { player_id } = await joinQueue(nickname);

    // duelRef mutated in place by DuelRoom's onTick/onCommentary/etc; kept
    // as one stable object so DuelRoom's per-render callback assignment
    // doesn't fight with React re-renders.
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
      onError: (e) => console.error("ws error", e),
    });
  };

  return (
    <div className="app">
      <h1>⚔️ Duel Arena</h1>

      {status === "idle" && (
        <div className="join-panel">
          <input
            placeholder="Pick a nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
          <button onClick={startQueue}>Join Queue</button>
        </div>
      )}

      {status === "queueing" && <p>Waiting for an opponent…</p>}

      {status === "in_duel" && duel && (
        <DuelRoom
          duel={duel}
          socket={socketRef.current}
          onEnd={() => setStatus("ended")}
        />
      )}

      {status === "ended" && (
        <div>
          <p>Duel over.</p>
          <button onClick={() => setStatus("idle")}>Queue again</button>
        </div>
      )}

      <Leaderboard />
    </div>
  );
}
