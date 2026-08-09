"""Tournament Knockout Bracket Manager.

Supports 4-player or 8-player single-elimination brackets.
Manages rounds (Quarterfinals -> Semifinals -> Finals), match pairings, and winner advancement.
"""
import uuid
from datetime import datetime

_tournaments: dict[str, dict] = {}


def create_tournament(title: str, max_players: int = 4, difficulty: str = "medium", language: str = "python") -> dict:
    t_id = str(uuid.uuid4())
    t = {
        "id": t_id,
        "title": title,
        "max_players": max_players if max_players in (4, 8) else 4,
        "difficulty": difficulty,
        "language": language,
        "status": "recruiting",  # recruiting | in_progress | completed
        "players": [],  # list of {player_id, nickname}
        "rounds": [],
        "created_at": datetime.utcnow().isoformat(),
        "winner": None,
    }
    _tournaments[t_id] = t
    return t


def join_tournament(tournament_id: str, player_id: str, nickname: str) -> dict:
    t = _tournaments.get(tournament_id)
    if not t:
        return {"error": "Tournament not found"}
    if t["status"] != "recruiting":
        return {"error": "Tournament already in progress"}
    if any(p["player_id"] == player_id for p in t["players"]):
        return {"error": "Already joined"}
    if len(t["players"]) >= t["max_players"]:
        return {"error": "Tournament is full"}

    t["players"].append({"player_id": player_id, "nickname": nickname})

    # If full, start Round 1 automatically!
    if len(t["players"]) == t["max_players"]:
        _start_tournament(t)

    return t


def _start_tournament(t: dict) -> None:
    t["status"] = "in_progress"
    players = t["players"]
    r1_matches = []
    for i in range(0, len(players), 2):
        pa = players[i]
        pb = players[i + 1]
        r1_matches.append({
            "match_index": len(r1_matches) + 1,
            "player_a": pa,
            "player_b": pb,
            "winner": None,
            "status": "pending",
        })
    round_name = "Quarterfinals" if t["max_players"] == 8 else "Semifinals"
    t["rounds"].append({
        "round_number": 1,
        "name": round_name,
        "matches": r1_matches,
    })


def advance_tournament_winner(tournament_id: str, round_num: int, match_idx: int, winner_player_id: str) -> dict:
    t = _tournaments.get(tournament_id)
    if not t or t["status"] != "in_progress":
        return {"error": "Invalid tournament"}

    current_round = next((r for r in t["rounds"] if r["round_number"] == round_num), None)
    if not current_round:
        return {"error": "Round not found"}

    match = next((m for m in current_round["matches"] if m["match_index"] == match_idx), None)
    if not match:
        return {"error": "Match not found"}

    match["winner"] = winner_player_id
    match["status"] = "completed"

    # Check if all matches in round are complete
    if all(m["status"] == "completed" for m in current_round["matches"]):
        round_winners = [
            next(p for p in (m["player_a"], m["player_b"]) if p["player_id"] == m["winner"])
            for m in current_round["matches"]
        ]
        if len(round_winners) == 1:
            t["status"] = "completed"
            t["winner"] = round_winners[0]
        else:
            # Create next round
            next_round_matches = []
            for i in range(0, len(round_winners), 2):
                next_round_matches.append({
                    "match_index": len(next_round_matches) + 1,
                    "player_a": round_winners[i],
                    "player_b": round_winners[i + 1],
                    "winner": None,
                    "status": "pending",
                })
            t["rounds"].append({
                "round_number": round_num + 1,
                "name": "Finals" if len(next_round_matches) == 1 else "Semifinals",
                "matches": next_round_matches,
            })

    return t


def list_tournaments() -> list[dict]:
    return list(_tournaments.values())


def get_tournament(t_id: str) -> dict | None:
    return _tournaments.get(t_id)
