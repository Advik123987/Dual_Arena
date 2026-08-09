import { useEffect, useState } from "react";
import { fetchLeaderboard } from "../api.js";

export default function Leaderboard() {
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    fetchLeaderboard().then(setEntries).catch(() => setEntries([]));
  }, []);

  return (
    <div className="leaderboard">
      <h3>Leaderboard</h3>
      <table>
        <thead>
          <tr><th>#</th><th>Player</th><th>Rating</th><th>W</th><th>L</th></tr>
        </thead>
        <tbody>
          {entries.map((e, i) => (
            <tr key={e.nickname}>
              <td>{i + 1}</td><td>{e.nickname}</td><td>{e.rating}</td><td>{e.wins}</td><td>{e.losses}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
