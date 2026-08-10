"""In-memory waiting queue — pairs distinct players into duel rooms."""
import asyncio
import uuid

_waiting: list[dict] = []
_lock = asyncio.Lock()


async def enqueue(
    player_id: str, nickname: str, weak_areas: dict,
    difficulty: str = "medium", language: str = "python", mode: str = "full_battle"
) -> dict | None:
    """Adds player to queue. Returns match dict if paired with another player, else None."""
    async with _lock:
        # Remove any stale/existing queue entry for this player or nickname
        clean_nick = nickname.strip().lower()
        _waiting[:] = [
            p for p in _waiting
            if p["player_id"] != player_id and p["nickname"].strip().lower() != clean_nick
        ]

        entry = {
            "player_id": player_id,
            "nickname": nickname,
            "weak_areas": weak_areas,
            "difficulty": difficulty,
            "language": language,
            "mode": mode,
        }

        # Look for another player (different player_id AND different nickname)
        for i, other in enumerate(_waiting):
            if other["player_id"] != player_id and other["nickname"].strip().lower() != clean_nick:
                # Prefer exact language + mode match
                if other["language"] == language and other["mode"] == mode:
                    opponent = _waiting.pop(i)
                    return _make_match(opponent, entry)

        # Fallback: match any other distinct waiting player
        for i, other in enumerate(_waiting):
            if other["player_id"] != player_id and other["nickname"].strip().lower() != clean_nick:
                opponent = _waiting.pop(i)
                return _make_match(opponent, entry)

        # No opponent yet -> stay in queue
        _waiting.append(entry)

    return None


def _make_match(a: dict, b: dict) -> dict:
    return {
        "room_id": str(uuid.uuid4()),
        "player_a": a,
        "player_b": b,
        "difficulty": a.get("difficulty", "medium"),
        "language": a.get("language", "python"),
        "mode": a.get("mode", "full_battle"),
    }


async def dequeue(player_id: str | None = None, nickname: str | None = None) -> None:
    async with _lock:
        clean_nick = nickname.strip().lower() if nickname else None
        _waiting[:] = [
            p for p in _waiting
            if (player_id and p["player_id"] == player_id) or
               (clean_nick and p["nickname"].strip().lower() == clean_nick)
        ]
