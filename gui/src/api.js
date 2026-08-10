const PROD_HTTP_URL = "https://api-2d4c-8000.prg1.zerops.app";
const PROD_WS_URL = "wss://api-2d4c-8000.prg1.zerops.app";

const isProductionDomain = typeof window !== 'undefined' &&
  window.location.hostname !== 'localhost' &&
  window.location.hostname !== '127.0.0.1';

export const API_HTTP_URL = import.meta.env.VITE_API_HTTP_URL || (isProductionDomain ? PROD_HTTP_URL : "http://localhost:8000");
export const API_WS_URL = import.meta.env.VITE_API_WS_URL || (isProductionDomain ? PROD_WS_URL : "ws://localhost:8000");

// ── Smart HTTP Fetcher with automatic production fallback ─────────────────────

async function smartFetch(path, options = {}) {
  const primaryUrl = `${API_HTTP_URL}${path}`;
  try {
    const res = await fetch(primaryUrl, options);
    if (res.ok || res.status < 500) return res;
  } catch (err) {
    // Primary failed (e.g. localhost not running), try Zerops prod cloud backend
  }

  if (API_HTTP_URL !== PROD_HTTP_URL) {
    const fallbackUrl = `${PROD_HTTP_URL}${path}`;
    try {
      return await fetch(fallbackUrl, options);
    } catch (e) {
      // Both failed
    }
  }

  throw new Error("Unable to connect to Dual Arena server. Make sure API server is running.");
}

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
  const res = await smartFetch(`/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nickname, password }),
  });
  let data;
  try {
    data = await res.json();
  } catch (e) {
    throw new Error("API server connection failed.");
  }
  if (!res.ok) {
    throw new Error(data?.detail || "Registration failed");
  }
  return data;
}

export async function login(nickname, password) {
  const res = await smartFetch(`/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nickname, password }),
  });
  let data;
  try {
    data = await res.json();
  } catch (e) {
    throw new Error("API server connection failed.");
  }
  if (!res.ok) {
    throw new Error(data?.detail || "Login failed");
  }
  return data;
}

export async function verifyToken(token) {
  try {
    const res = await smartFetch(`/api/auth/me?token=${token}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ── Queue endpoints ──────────────────────────────────────────────────────────

export async function joinQueue(nickname, difficulty = "medium", language = "python", mode = "full_battle") {
  const res = await smartFetch("/api/queue/join", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nickname, difficulty, language, mode }),
  });
  if (!res.ok) throw new Error("Failed to join queue");
  return res.json();
}

export async function leaveQueue(playerId, nickname) {
  const params = new URLSearchParams();
  if (playerId) params.append("player_id", playerId);
  if (nickname) params.append("nickname", nickname);
  try {
    await smartFetch(`/api/queue/leave?${params.toString()}`, { method: "POST" });
  } catch (err) {
    console.warn("leaveQueue warning:", err);
  }
}

export async function startSoloMatch(playerId, nickname, difficulty = "medium", language = "python", mode = "full_battle") {
  const res = await smartFetch("/api/solo/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ player_id: playerId, nickname, difficulty, language, mode }),
  });
  if (!res.ok) throw new Error("Failed to start solo match");
  return res.json();
}
export const startSolo = startSoloMatch;

export async function fetchLeaderboard() {
  const res = await smartFetch("/api/leaderboard");
  if (!res.ok) throw new Error("Failed to fetch leaderboard");
  return res.json();
}

export async function fetchPlayerProfile(playerId) {
  const res = await smartFetch(`/api/players/${playerId}/profile`);
  if (!res.ok) throw new Error("Failed to fetch player profile");
  return res.json();
}
export const fetchProfile = fetchPlayerProfile;

export async function fetchActiveRooms() {
  const res = await smartFetch("/api/rooms/active");
  if (!res.ok) throw new Error("Failed to fetch active rooms");
  return res.json();
}
export const fetchActiveDuels = fetchActiveRooms;

export async function fetchOnlinePlayers() {
  try {
    const res = await smartFetch("/api/players/online");
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function createPrivateRoom(playerId, nickname, difficulty = "medium", language = "python", mode = "full_battle") {
  const params = new URLSearchParams({ player_id: playerId, nickname, difficulty, language, mode });
  const res = await smartFetch(`/api/rooms/private/create?${params.toString()}`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to create private room");
  return res.json();
}

export async function joinPrivateRoom(roomCode, playerId, nickname) {
  const params = new URLSearchParams({ room_code: roomCode, player_id: playerId, nickname });
  const res = await smartFetch(`/api/rooms/private/join?${params.toString()}`, { method: "POST" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to join private room");
  return data;
}

export async function runTests(problem, answer) {
  const res = await smartFetch("/api/run-tests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ problem, answer }),
  });
  if (!res.ok) throw new Error("Failed to run tests");
  return res.json();
}

export async function fetchProblems(filters = {}) {
  const params = new URLSearchParams();
  if (filters.category) params.append("category", filters.category);
  if (filters.difficulty) params.append("difficulty", filters.difficulty);
  if (filters.language) params.append("language", filters.language);
  if (filters.search) params.append("search", filters.search);

  const res = await smartFetch(`/api/problems?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch problem bank");
  return res.json();
}

export async function fetchProblemById(problemId) {
  const res = await smartFetch(`/api/problems/${problemId}`);
  if (!res.ok) throw new Error("Failed to fetch problem detail");
  return res.json();
}

export async function fetchRecommendations(playerId) {
  const res = await smartFetch(`/api/recommendations/${playerId}`);
  if (!res.ok) throw new Error("Failed to fetch learning recommendations");
  return res.json();
}

export async function fetchDailyChallenge() {
  const res = await smartFetch(`/api/daily-challenge`);
  if (!res.ok) throw new Error("Failed to fetch daily challenge");
  return res.json();
}

export async function submitDailyChallenge(problem, answer, playerId) {
  const res = await smartFetch(`/api/daily-challenge/submit?player_id=${playerId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ problem, answer }),
  });
  if (!res.ok) throw new Error("Failed to submit daily challenge");
  return res.json();
}

export async function fetchTournaments() {
  const res = await smartFetch(`/api/tournaments`);
  if (!res.ok) throw new Error("Failed to fetch tournaments");
  return res.json();
}

export async function createTournament(title, maxPlayers = 4, difficulty = "medium", language = "python") {
  const params = new URLSearchParams({ title, max_players: maxPlayers, difficulty, language });
  const res = await smartFetch(`/api/tournaments/create?${params.toString()}`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to create tournament");
  return res.json();
}

export async function joinTournament(tournamentId, playerId, nickname) {
  const params = new URLSearchParams({ tournament_id: tournamentId, player_id: playerId, nickname });
  const res = await smartFetch(`/api/tournaments/join?${params.toString()}`, {
    method: "POST",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to join tournament");
  return data;
}

export async function fetchTournamentById(tournamentId) {
  const res = await smartFetch(`/api/tournaments/${tournamentId}`);
  if (!res.ok) throw new Error("Failed to fetch tournament details");
  return res.json();
}

// ── WebSocket ────────────────────────────────────────────────────────────────

export function openDuelSocket(playerId, nickname, rating = 1000, winStreak = 0, callbacks = {}) {
  const token = getToken();
  let wsUrl = `${API_WS_URL}/ws/${playerId}?nickname=${encodeURIComponent(nickname)}&rating=${rating}&win_streak=${winStreak}`;
  if (token) wsUrl += `&token=${encodeURIComponent(token)}`;

  let ws;
  try {
    ws = new WebSocket(wsUrl);
  } catch (e) {
    const fallbackWsUrl = `${PROD_WS_URL}/ws/${playerId}?nickname=${encodeURIComponent(nickname)}&rating=${rating}&win_streak=${winStreak}${token ? `&token=${encodeURIComponent(token)}` : ''}`;
    ws = new WebSocket(fallbackWsUrl);
  }

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      const type = msg.type;
      if (callbacks[type]) callbacks[type](msg);
    } catch (err) {
      console.error("WS parse error:", err);
    }
  };

  ws.onerror = (err) => {
    console.error("WS error:", err);
  };

  return ws;
}
