"""Valkey (Redis-protocol-compatible) client for live match state.

Why this exists at all: WebSocket connections are pinned to whichever api
container the player is on. If we ever scale api to >1 replica, one
container's in-process dict wouldn't be visible to the other. Storing live
duel-room state here means any replica can read/update it, and a
reconnecting player doesn't lose their match state just because they
dropped the socket.
"""
import json
from typing import Any, Optional

import redis.asyncio as redis

from app.config import settings

_client: Optional[redis.Redis] = None


def get_client() -> redis.Redis:
    global _client
    if _client is None:
        _client = redis.from_url(settings.CACHE_URL, decode_responses=True)
    return _client


async def set_room_state(room_id: str, state: dict, ttl_seconds: int = 3600) -> None:
    await get_client().set(f"room:{room_id}", json.dumps(state), ex=ttl_seconds)


async def get_room_state(room_id: str) -> Optional[dict]:
    raw = await get_client().get(f"room:{room_id}")
    return json.loads(raw) if raw else None


async def delete_room_state(room_id: str) -> None:
    await get_client().delete(f"room:{room_id}")
