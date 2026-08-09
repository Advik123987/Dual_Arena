export const API_HTTP_URL = import.meta.env.VITE_API_HTTP_URL || "http://localhost:8000";
export const API_WS_URL = import.meta.env.VITE_API_WS_URL || "ws://localhost:8000";

// ── Token storage ────────────────────────────────────────────────────────────
const TOKEN_KEY = "duel_arena_token";
const PLAYER_KEY = "duel_arena_player";

export function saveSession(token, player) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(PLAYER_KEY, JSON.stringify(player));
}

export function loadSession() {
  const token = localStorage.getItem(TOKEN_KEY);
  const raw = localStorage.getItem(PLAYER_KEY);
  if (!token || !raw) return null;
  try { return { token, player: JSON.parse(raw) }; } catch { return null; }
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(PLAYER_KEY);
}

export function getToken() { return localStorage.getItem(TOKEN_KEY); }

// ── Auth endpoints ───────────────────────────────────────────────────────────

export async function register(nickname, password) {
  const res = await fetch(`${API_HTTP_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nickname, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Registration failed");
  return data; // {player_id, nickname, rating, win_streak, token}
}

export async function login(nickname, password) {
  const res = await fetch(`${API_HTTP_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nickname, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Login failed");
  return data; // {player_id, nickname, rating, win_streak, token}
}

export async function verifyToken(token) {
  const res = await fetch(`${API_HTTP_URL}/api/auth/me?token=${encodeURIComponent(token)}`);
  if (!res.ok) return null;
  return res.json();
}

// ── Game endpoints ───────────────────────────────────────────────────────────

export async function joinQueue(nickname, difficulty = "medium", language = "python", mode = "full_battle") {
  const res = await fetch(`${API_HTTP_URL}/api/queue/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nickname, difficulty, language, mode }),
  });
  if (!res.ok) throw new Error("Failed to join queue");
  return res.json();
}

export async function leaveQueue(playerId) {
  const res = await fetch(`${API_HTTP_URL}/api/queue/leave?player_id=${playerId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to leave queue");
  return res.json();
}

export async function startSolo(playerId, nickname, difficulty, language, mode) {
  const res = await fetch(`${API_HTTP_URL}/api/solo/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ player_id: playerId, nickname, difficulty, language, mode }),
  });
  if (!res.ok) throw new Error("Failed to start solo match");
  return res.json();
}

export async function fetchLeaderboard() {
  const res = await fetch(`${API_HTTP_URL}/api/leaderboard`);
  if (!res.ok) throw new Error("Failed to fetch leaderboard");
  return res.json();
}

export async function fetchActiveDuels() {
  const res = await fetch(`${API_HTTP_URL}/api/rooms/active`);
  if (!res.ok) throw new Error("Failed to fetch active duels");
  return res.json();
}

export async function fetchOnlinePlayers() {
  const res = await fetch(`${API_HTTP_URL}/api/players/online`);
  if (!res.ok) throw new Error("Failed to fetch online players");
  return res.json();
}

export async function fetchProfile(playerId) {
  const res = await fetch(`${API_HTTP_URL}/api/players/${playerId}/profile`);
  if (!res.ok) throw new Error("Failed to fetch profile");
  return res.json();
}

// ── WebSocket ────────────────────────────────────────────────────────────────

export function openDuelSocket(playerId, nickname, rating, winStreak, handlers) {
  const token = getToken();
  const params = new URLSearchParams({
    nickname,
    rating: rating || 1000,
    win_streak: winStreak || 0,
    ...(token ? { token } : {}),
  });
  const socket = new WebSocket(`${API_WS_URL}/ws/${playerId}?${params.toString()}`);

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (handlers[data.type]) handlers[data.type](data);
    } catch (err) {
      console.error("WebSocket message error:", err);
    }
  };

  return socket;
}
