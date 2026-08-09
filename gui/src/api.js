// Build-time env vars injected by Zerops (see gui/zerops.yaml) or by
// Vite's .env locally. Fall back to localhost so `npm run dev` just works.
export const API_HTTP_URL = import.meta.env.VITE_API_HTTP_URL || "http://localhost:8000";
export const API_WS_URL = import.meta.env.VITE_API_WS_URL || "ws://localhost:8000";

export async function joinQueue(nickname) {
  const res = await fetch(`${API_HTTP_URL}/api/queue/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nickname }),
  });
  if (!res.ok) throw new Error("Failed to join queue");
  return res.json();
}

export async function fetchLeaderboard() {
  const res = await fetch(`${API_HTTP_URL}/api/leaderboard`);
  if (!res.ok) throw new Error("Failed to fetch leaderboard");
  return res.json();
}

export async function fetchProfile(playerId) {
  const res = await fetch(`${API_HTTP_URL}/api/players/${playerId}/profile`);
  if (!res.ok) throw new Error("Failed to fetch profile");
  return res.json();
}

export function openDuelSocket(playerId, handlers) {
  const ws = new WebSocket(`${API_WS_URL}/ws/${playerId}`);
  ws.onopen = () => ws.send(JSON.stringify({ action: "join_queue" }));
  ws.onmessage = (evt) => {
    const msg = JSON.parse(evt.data);
    handlers[msg.type]?.(msg);
  };
  ws.onclose = handlers.onClose;
  ws.onerror = handlers.onError;
  return ws;
}
