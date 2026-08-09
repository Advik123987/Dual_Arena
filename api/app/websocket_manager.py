"""Connection registry + duel-room lifecycle (timer, submissions, commentary).

Flow:
  1. Client opens WS at /ws/{player_id} and sends {"action": "join_queue"}.
  2. matchmaking.enqueue() pairs two waiting players. Once paired, this
     module starts a DuelRoom: generates the problem, stores room state in
     Valkey, and pushes "duel_start" to both sockets (using the live
     ConnectionManager, since the *other* player may already be connected).
  3. DuelRoom.run() ticks a synced countdown every second, broadcasting
     "tick"; on submit_answer it judges the answer and broadcasts progress;
     on correct answer / timeout it finalizes, persists results, and
     broadcasts "duel_end".
"""
import asyncio
import time
from datetime import datetime

from fastapi import WebSocket

from app import cache
from app.commentary import generate_commentary
from app.config import settings
from app.db import AsyncSessionLocal
from app.judge import judge_submission
from app.models import Match, Player
from app.problem_gen import generate_problem


class ConnectionManager:
    def __init__(self) -> None:
        self.active: dict[str, WebSocket] = {}

    async def connect(self, player_id: str, ws: WebSocket) -> None:
        await ws.accept()
        self.active[player_id] = ws

    def disconnect(self, player_id: str) -> None:
        self.active.pop(player_id, None)

    async def send(self, player_id: str, message: dict) -> None:
        ws = self.active.get(player_id)
        if ws is not None:
            await ws.send_json(message)

    async def broadcast(self, player_ids: list[str], message: dict) -> None:
        for pid in player_ids:
            await self.send(pid, message)


manager = ConnectionManager()
_active_rooms: dict[str, "DuelRoom"] = {}


async def _get_weak_areas(player_id: str) -> dict:
    async with AsyncSessionLocal() as db:
        player = await db.get(Player, player_id)
        return player.weak_areas if player else {}


async def start_duel(room_id: str, player_a: dict, player_b: dict) -> None:
    weak_a = await _get_weak_areas(player_a["player_id"])
    weak_b = await _get_weak_areas(player_b["player_id"])
    problem = await generate_problem(weak_a, weak_b)

    state = {
        "room_id": room_id,
        "player_a": player_a,
        "player_b": player_b,
        "problem": problem,
        "started_at": time.time(),
        "duration": settings.DUEL_DURATION_SECONDS,
        "results": {},  # player_id -> {"correct": bool, "time_seconds": float}
    }
    await cache.set_room_state(room_id, state)

    # public_problem strips the answer/test-case fields before it goes to clients
    public_problem = {k: v for k, v in problem.items() if k not in ("correct_answer", "test_cases", "_generation_error")}
    start_payload = {
        "type": "duel_start",
        "room_id": room_id,
        "duration": settings.DUEL_DURATION_SECONDS,
        "problem": public_problem,
        "opponent": None,  # filled per-recipient below
    }
    await manager.send(player_a["player_id"], {**start_payload, "opponent": player_b["nickname"], "you": player_a["nickname"]})
    await manager.send(player_b["player_id"], {**start_payload, "opponent": player_a["nickname"], "you": player_b["nickname"]})

    room = DuelRoom(room_id, state)
    _active_rooms[room_id] = room
    asyncio.create_task(room.run())


class DuelRoom:
    def __init__(self, room_id: str, state: dict) -> None:
        self.room_id = room_id
        self.state = state
        self.player_ids = [state["player_a"]["player_id"], state["player_b"]["player_id"]]
        self.finished = False

    async def run(self) -> None:
        duration = self.state["duration"]
        elapsed = 0
        while elapsed < duration and not self.finished:
            await asyncio.sleep(1)
            elapsed += 1
            remaining = duration - elapsed
            await manager.broadcast(self.player_ids, {"type": "tick", "remaining": remaining})
            if remaining in (60, 30, 10) and not self.finished:
                line = await generate_commentary(f"{remaining} seconds left in the duel, no winner yet.")
                if line:
                    await manager.broadcast(self.player_ids, {"type": "commentary", "line": line})
        if not self.finished:
            await self._finalize(winner_id=None, timed_out=True)

    async def handle_submission(self, player_id: str, answer: str) -> None:
        if self.finished:
            return
        correct = await judge_submission(self.state["problem"], answer)
        elapsed = time.time() - self.state["started_at"]
        self.state["results"][player_id] = {"correct": correct, "time_seconds": elapsed}
        await cache.set_room_state(self.room_id, self.state)

        opponent_id = next(pid for pid in self.player_ids if pid != player_id)
        await manager.send(opponent_id, {"type": "opponent_progress", "correct": correct})

        line = await generate_commentary(
            f"A player just {'nailed it' if correct else 'submitted a wrong answer'} at {elapsed:.0f}s in."
        )
        if line:
            await manager.broadcast(self.player_ids, {"type": "commentary", "line": line})

        if correct:
            await self._finalize(winner_id=player_id, timed_out=False)

    async def _finalize(self, winner_id: str | None, timed_out: bool) -> None:
        self.finished = True
        pa, pb = self.state["player_a"], self.state["player_b"]
        results = self.state["results"]

        await manager.broadcast(self.player_ids, {
            "type": "duel_end",
            "winner_id": winner_id,
            "timed_out": timed_out,
        })

        async with AsyncSessionLocal() as db:
            match = Match(
                id=self.room_id,
                player_a_id=pa["player_id"],
                player_b_id=pb["player_id"],
                winner_id=winner_id,
                problem_category=self.state["problem"].get("category", "unknown"),
                problem_payload=self.state["problem"],
                ended_at=datetime.utcnow(),
                player_a_correct=results.get(pa["player_id"], {}).get("correct", False),
                player_b_correct=results.get(pb["player_id"], {}).get("correct", False),
                player_a_time_seconds=results.get(pa["player_id"], {}).get("time_seconds"),
                player_b_time_seconds=results.get(pb["player_id"], {}).get("time_seconds"),
            )
            db.add(match)

            category = self.state["problem"].get("category", "unknown")
            for pid in self.player_ids:
                player = await db.get(Player, pid)
                if player is None:
                    continue
                got_it_right = results.get(pid, {}).get("correct", False)
                # weak_areas tracks a rolling wrong-rate per category (EMA-ish
                # nudge, not a full stats model — good enough to bias the next
                # problem generation call toward real gaps).
                prev = player.weak_areas.get(category, 0.5)
                delta = -0.1 if got_it_right else 0.15
                player.weak_areas = {**player.weak_areas, category: max(0.0, min(1.0, prev + delta))}

                if pid == winner_id:
                    player.wins += 1
                    player.rating += 15
                elif winner_id is not None:
                    player.losses += 1
                    player.rating = max(0, player.rating - 10)
            await db.commit()

        await cache.delete_room_state(self.room_id)
        _active_rooms.pop(self.room_id, None)


def get_room(room_id: str) -> DuelRoom | None:
    return _active_rooms.get(room_id)
