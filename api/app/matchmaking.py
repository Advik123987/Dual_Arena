"""In-memory waiting queue — pairs players into duel rooms."""
import asyncio
import uuid

_waiting: list[dict] = []
_lock = asyncio.Lock()


async def enqueue(
    player_id: str, nickname: str, weak_areas: dict,
    difficulty: str = "medium", language: str = "python", mode: str = "full_battle"
) -> dict | None:
    """Adds player to queue. Returns match dict if paired, else None."""
    async with _lock:
        entry = {
            "player_id": player_id,
            "nickname": nickname,
            "weak_areas": weak_areas,
            "difficulty": difficulty,
            "language": language,
            "mode": mode,
        }
        _waiting.append(entry)

        # Prefer exact language + mode match
        for i, other in enumerate(_waiting[:-1]):
            if other["language"] == language and other["mode"] == mode:
                _waiting.pop(i)
                _waiting.pop()   # remove self (now last)
                return _make_match(other, entry)

        # Fallback: match any two
        if len(_waiting) >= 2:
            a = _waiting.pop(0)
            b = _waiting.pop(0)
            return _make_match(a, b)

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


async def dequeue(player_id: str) -> None:
    async with _lock:
        _waiting[:] = [p for p in _waiting if p["player_id"] != player_id]
