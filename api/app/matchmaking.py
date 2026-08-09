"""In-memory waiting queue -> pairs players into a duel room.

The waiting queue itself is process-local (fine: matchmaking is a quick
handshake, not something that needs to survive a restart). Once a match is
formed, its live state moves into Valkey (app/cache.py) so it *does* survive
a container hiccup / supports multi-replica.
"""
import asyncio
import uuid

_waiting: list[dict] = []
_lock = asyncio.Lock()


async def enqueue(player_id: str, nickname: str, weak_areas: dict) -> dict | None:
    """Adds player to queue; returns a match dict {room_id, player_a, player_b}
    immediately if this completes a pair, else None (caller keeps waiting)."""
    async with _lock:
        _waiting.append({"player_id": player_id, "nickname": nickname, "weak_areas": weak_areas})
        if len(_waiting) >= 2:
            a = _waiting.pop(0)
            b = _waiting.pop(0)
            return {"room_id": str(uuid.uuid4()), "player_a": a, "player_b": b}
    return None


async def dequeue(player_id: str) -> None:
    async with _lock:
        _waiting[:] = [p for p in _waiting if p["player_id"] != player_id]
