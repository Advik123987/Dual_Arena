export const API_HTTP_URL = import.meta.env.VITE_API_HTTP_URL || "http://localhost:8000";
export const API_WS_URL = import.meta.env.VITE_API_WS_URL || "ws://localhost:8000";

export async function joinQueue(nickname, difficulty = "medium", language = "python", mode = "full_battle") {
    const res = await fetch(`${API_HTTP_URL}/api/queue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname, difficulty, language, mode })
    });
    if (!res.ok) throw new Error("Failed to join queue");
    return res.json();
}

export async function leaveQueue(playerId) {
    const res = await fetch(`${API_HTTP_URL}/api/queue/${playerId}`, {
        method: "DELETE"
    });
    if (!res.ok) throw new Error("Failed to leave queue");
    return res.json();
}

export async function startSolo(playerId, nickname, difficulty, language, mode) {
    const res = await fetch(`${API_HTTP_URL}/api/solo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player_id: playerId, nickname, difficulty, language, mode })
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
    const res = await fetch(`${API_HTTP_URL}/api/duels`);
    if (!res.ok) throw new Error("Failed to fetch active duels");
    return res.json();
}

export async function fetchOnlinePlayers() {
    const res = await fetch(`${API_HTTP_URL}/api/players`);
    if (!res.ok) throw new Error("Failed to fetch online players");
    return res.json();
}

export async function fetchProfile(playerId) {
    const res = await fetch(`${API_HTTP_URL}/api/players/${playerId}`);
    if (!res.ok) throw new Error("Failed to fetch profile");
    return res.json();
}

export function openDuelSocket(playerId, nickname, rating, winStreak, handlers) {
    const params = new URLSearchParams({
        nickname,
        rating: rating || 1000,
        win_streak: winStreak || 0
    });
    const socket = new WebSocket(`${API_WS_URL}/ws/${playerId}?${params.toString()}`);
    
    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (handlers[data.type]) {
                handlers[data.type](data);
            }
        } catch (err) {
            console.error("WebSocket message error:", err);
        }
    };
    
    return socket;
}
