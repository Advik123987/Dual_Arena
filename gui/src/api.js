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
  let data;
  try {
    data = await res.json();
  } catch (e) {
    if (!res.ok) throw new Error("API server connection failed. Please ensure backend is running.");
  }
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error("Auth server endpoint not found. Ensure API server is running on port 8000.");
    }
    throw new Error(data?.detail || "Registration failed");
  }
  return data;
}

export async function login(nickname, password) {
  const res = await fetch(`${API_HTTP_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nickname, password }),
  });
  let data;
  try {
    data = await res.json();
  } catch (e) {
    if (!res.ok) throw new Error("API server connection failed. Please ensure backend is running.");
  }
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error("Auth server endpoint not found. Ensure API server is running on port 8000.");
    }
    throw new Error(data?.detail || "Login failed");
  }
  return data;
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

export async function createPrivateRoom(playerId, nickname, difficulty, language, mode) {
  const res = await fetch(`${API_HTTP_URL}/api/rooms/private/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ player_id: playerId, nickname, difficulty, language, mode }),
  });
  if (!res.ok) throw new Error("Failed to create private room");
  return res.json();
}

export async function joinPrivateRoom(playerId, nickname, roomCode) {
  const res = await fetch(`${API_HTTP_URL}/api/rooms/private/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ player_id: playerId, nickname, room_code: roomCode }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to join private room");
  return data;
}

export async function runTests(problem, answer) {
  const res = await fetch(`${API_HTTP_URL}/api/run-tests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ problem, answer }),
  });
  if (!res.ok) throw new Error("Failed to run tests");
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

export async function fetchProblems(filters = {}) {
  const params = new URLSearchParams();
  if (filters.category) params.append("category", filters.category);
  if (filters.difficulty) params.append("difficulty", filters.difficulty);
  if (filters.language) params.append("language", filters.language);
  if (filters.search) params.append("search", filters.search);

  const res = await fetch(`${API_HTTP_URL}/api/problems?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch problem bank");
  return res.json();
}

export async function fetchProblemById(problemId) {
  const res = await fetch(`${API_HTTP_URL}/api/problems/${problemId}`);
  if (!res.ok) throw new Error("Failed to fetch problem detail");
  return res.json();
}

export async function fetchRecommendations(playerId) {
  const res = await fetch(`${API_HTTP_URL}/api/recommendations/${playerId}`);
  if (!res.ok) throw new Error("Failed to fetch learning recommendations");
  return res.json();
}

export async function fetchDailyChallenge() {
  const res = await fetch(`${API_HTTP_URL}/api/daily-challenge`);
  if (!res.ok) throw new Error("Failed to fetch daily challenge");
  return res.json();
}

export async function submitDailyChallenge(problem, answer, playerId) {
  const res = await fetch(`${API_HTTP_URL}/api/daily-challenge/submit?player_id=${playerId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ problem, answer }),
  });
  if (!res.ok) throw new Error("Failed to submit daily challenge");
  return res.json();
}

export async function fetchTournaments() {
  const res = await fetch(`${API_HTTP_URL}/api/tournaments`);
  if (!res.ok) throw new Error("Failed to fetch tournaments");
  return res.json();
}

export async function createTournament(title, maxPlayers = 4, difficulty = "medium", language = "python") {
  const params = new URLSearchParams({ title, max_players: maxPlayers, difficulty, language });
  const res = await fetch(`${API_HTTP_URL}/api/tournaments/create?${params.toString()}`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to create tournament");
  return res.json();
}

export async function joinTournament(tournamentId, playerId, nickname) {
  const params = new URLSearchParams({ tournament_id: tournamentId, player_id: playerId, nickname });
  const res = await fetch(`${API_HTTP_URL}/api/tournaments/join?${params.toString()}`, {
    method: "POST",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to join tournament");
  return data;
}

export async function fetchTournamentById(tournamentId) {
  const res = await fetch(`${API_HTTP_URL}/api/tournaments/${tournamentId}`);
  if (!res.ok) throw new Error("Failed to fetch tournament details");
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
