"""Valkey (Redis-protocol-compatible) client for live match state.

Why this exists at all: WebSocket connections are pinned to whichever api
container the player is on. If we ever scale api to >1 replica, one
container's in-process dict wouldn't be visible to the other. Storing live
duel-room state here means any replica can read/update it, and a
reconnecting player doesn't lose their match state just because they
dropped the socket.
"""
import json
import logging
from typing import Any, Optional

import redis.asyncio as redis

from app.config import settings

logger = logging.getLogger(__name__)

_client: Optional[redis.Redis] = None
_in_memory_cache: dict[str, str] = {}


def get_client() -> redis.Redis:
    global _client
    if _client is None:
        _client = redis.from_url(settings.CACHE_URL, decode_responses=True)
    return _client


async def set_room_state(room_id: str, state: dict, ttl_seconds: int = 3600) -> None:
    data = json.dumps(state)
    try:
        await get_client().set(f"room:{room_id}", data, ex=ttl_seconds)
    except Exception as e:
        logger.warning(f"Valkey/Redis set failed (using in-memory fallback): {e}")
        _in_memory_cache[f"room:{room_id}"] = data


async def get_room_state(room_id: str) -> Optional[dict]:
    try:
        raw = await get_client().get(f"room:{room_id}")
    except Exception as e:
        logger.warning(f"Valkey/Redis get failed (using in-memory fallback): {e}")
        raw = _in_memory_cache.get(f"room:{room_id}")
    return json.loads(raw) if raw else None


async def delete_room_state(room_id: str) -> None:
    try:
        await get_client().delete(f"room:{room_id}")
    except Exception as e:
        logger.warning(f"Valkey/Redis delete failed (using in-memory fallback): {e}")
        _in_memory_cache.pop(f"room:{room_id}", None)

