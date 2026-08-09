"""Connection registry + duel-room lifecycle.

New features:
- Solo mode (no opponent, vs the clock)
- Challenge system (player A challenges player B directly)
- Win streak tracking
- Rating delta in duel_end message
- Active rooms listing
- Language/mode/difficulty stored in room state
"""
import asyncio
import time
from datetime import datetime

from fastapi import WebSocket

from app import cache
from app.commentary import generate_commentary
from app.config import settings, MODE_DURATIONS
from app.db import AsyncSessionLocal
from app.judge import judge_submission
from app.models import Match, Player
from app.problem_gen import generate_problem


class ConnectionManager:
    def __init__(self) -> None:
        self.active: dict[str, WebSocket] = {}
        # player_id -> {nickname, rating, win_streak}
        self.online_meta: dict[str, dict] = {}

    async def connect(self, player_id: str, ws: WebSocket, meta: dict | None = None) -> None:
        await ws.accept()
        self.active[player_id] = ws
        if meta:
            self.online_meta[player_id] = meta

    def disconnect(self, player_id: str) -> None:
        self.active.pop(player_id, None)
        self.online_meta.pop(player_id, None)

    async def send(self, player_id: str, message: dict) -> None:
        ws = self.active.get(player_id)
        if ws is not None:
            try:
                await ws.send_json(message)
            except Exception:
                pass

    async def broadcast(self, player_ids: list[str], message: dict) -> None:
        for pid in player_ids:
            await self.send(pid, message)

    def get_online_players(self) -> list[dict]:
        return [
            {"player_id": pid, **meta}
            for pid, meta in self.online_meta.items()
        ]


manager = ConnectionManager()
_active_rooms: dict[str, "DuelRoom"] = {}
# Pending direct challenges: challenger_id -> {target_id, difficulty, language, mode, from_nickname}
_pending_challenges: dict[str, dict] = {}


async def _get_player_info(player_id: str) -> dict:
    async with AsyncSessionLocal() as db:
        player = await db.get(Player, player_id)
        if player:
            return {"weak_areas": player.weak_areas, "rating": player.rating, "win_streak": player.win_streak}
        return {"weak_areas": {}, "rating": 1000, "win_streak": 0}


async def start_duel(
    room_id: str, player_a: dict, player_b: dict,
    difficulty: str = "medium", language: str = "python", mode: str = "full_battle",
    solo: bool = False,
) -> None:
    info_a = await _get_player_info(player_a["player_id"])
    info_b = await _get_player_info(player_b["player_id"]) if not solo else info_a

    problem = await generate_problem(
        info_a["weak_areas"], info_b["weak_areas"],
        difficulty=difficulty, language=language, mode=mode,
    )

    duration = MODE_DURATIONS.get(mode, settings.DUEL_DURATION_SECONDS)

    state = {
        "room_id": room_id,
        "player_a": player_a,
        "player_b": player_b,
        "problem": problem,
        "started_at": time.time(),
        "duration": duration,
        "difficulty": difficulty,
        "language": language,
        "mode": mode,
        "solo": solo,
        "results": {},
    }
    await cache.set_room_state(room_id, state)

    public_problem = {
        k: v for k, v in problem.items()
        if k not in ("correct_answer", "test_cases", "_generation_error")
    }
    base_payload = {
        "type": "duel_start",
        "room_id": room_id,
        "duration": duration,
        "problem": public_problem,
        "difficulty": difficulty,
        "language": language,
        "mode": mode,
        "solo": solo,
    }

    if solo:
        await manager.send(player_a["player_id"], {
            **base_payload,
            "opponent": None,
            "you": player_a["nickname"],
        })
    else:
        await manager.send(player_a["player_id"], {
            **base_payload,
            "opponent": player_b["nickname"],
            "you": player_a["nickname"],
        })
        await manager.send(player_b["player_id"], {
            **base_payload,
            "opponent": player_a["nickname"],
            "you": player_b["nickname"],
        })

    room = DuelRoom(room_id, state)
    _active_rooms[room_id] = room
    asyncio.create_task(room.run())


class DuelRoom:
    def __init__(self, room_id: str, state: dict) -> None:
        self.room_id = room_id
        self.state = state
        self.solo: bool = state.get("solo", False)
        if self.solo:
            self.player_ids = [state["player_a"]["player_id"]]
        else:
            self.player_ids = [
                state["player_a"]["player_id"],
                state["player_b"]["player_id"],
            ]
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
                line = await generate_commentary(
                    f"{remaining} seconds left in the duel, {'no winner' if not self.solo else 'still unsolved'}."
                )
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

        # Notify opponent (if not solo)
        if not self.solo:
            opponent_id = next((pid for pid in self.player_ids if pid != player_id), None)
            if opponent_id:
                await manager.send(opponent_id, {"type": "opponent_progress", "correct": correct})

        # Send result feedback to the submitter
        await manager.send(player_id, {"type": "submission_result", "correct": correct})

        line = await generate_commentary(
            f"A player just {'nailed it' if correct else 'submitted a wrong answer'} at {elapsed:.0f}s."
        )
        if line:
            await manager.broadcast(self.player_ids, {"type": "commentary", "line": line})

        if correct:
            await self._finalize(winner_id=player_id, timed_out=False)

    async def _finalize(self, winner_id: str | None, timed_out: bool) -> None:
        self.finished = True
        pa = self.state["player_a"]
        pb = self.state["player_b"]
        results = self.state["results"]

        # Compute rating deltas before persisting
        rating_deltas: dict[str, int] = {}
        async with AsyncSessionLocal() as db:
            match = Match(
                id=self.room_id,
                player_a_id=pa["player_id"],
                player_b_id=None if self.solo else pb["player_id"],
                winner_id=winner_id,
                problem_category=self.state["problem"].get("category", "unknown"),
                problem_payload=self.state["problem"],
                difficulty=self.state.get("difficulty"),
                language=self.state.get("language", "python"),
                mode=self.state.get("mode", "full_battle"),
                is_solo=self.solo,
                ended_at=datetime.utcnow(),
                player_a_correct=results.get(pa["player_id"], {}).get("correct", False),
                player_b_correct=results.get(pb["player_id"], {}).get("correct", False) if not self.solo else False,
                player_a_time_seconds=results.get(pa["player_id"], {}).get("time_seconds"),
                player_b_time_seconds=results.get(pb["player_id"], {}).get("time_seconds") if not self.solo else None,
            )
            db.add(match)

            category = self.state["problem"].get("category", "unknown")
            for pid in self.player_ids:
                player = await db.get(Player, pid)
                if player is None:
                    continue
                got_it_right = results.get(pid, {}).get("correct", False)

                # Update weak-areas EMA
                prev = player.weak_areas.get(category, 0.5)
                delta = -0.1 if got_it_right else 0.15
                player.weak_areas = {**player.weak_areas, category: max(0.0, min(1.0, prev + delta))}

                old_rating = player.rating
                if self.solo:
                    # Solo mode: +10 for correct, 0 for timeout
                    if got_it_right:
                        player.wins += 1
                        player.rating += 10
                        player.win_streak += 1
                    else:
                        player.win_streak = 0
                    rating_deltas[pid] = player.rating - old_rating
                else:
                    if pid == winner_id:
                        player.wins += 1
                        player.rating += 15
                        player.win_streak += 1
                    elif winner_id is not None:
                        player.losses += 1
                        player.rating = max(0, player.rating - 10)
                        player.win_streak = 0
                    else:
                        # Timeout: both lose streak, no rating change
                        player.win_streak = 0
                    rating_deltas[pid] = player.rating - old_rating

            await db.commit()

        # Broadcast result with per-player rating delta
        for pid in self.player_ids:
            await manager.send(pid, {
                "type": "duel_end",
                "winner_id": winner_id,
                "timed_out": timed_out,
                "solo": self.solo,
                "rating_delta": rating_deltas.get(pid, 0),
            })

        await cache.delete_room_state(self.room_id)
        _active_rooms.pop(self.room_id, None)


def get_room(room_id: str) -> "DuelRoom | None":
    return _active_rooms.get(room_id)


def get_active_rooms() -> list[dict]:
    """Returns public summaries of all active duel rooms."""
    rooms = []
    for room in _active_rooms.values():
        if room.finished:
            continue
        elapsed = time.time() - room.state["started_at"]
        remaining = max(0, int(room.state["duration"] - elapsed))
        pa = room.state["player_a"]
        pb = room.state["player_b"]
        rooms.append({
            "room_id": room.room_id,
            "player_a": pa.get("nickname", "?"),
            "player_b": pb.get("nickname", "Bot") if not room.solo else None,
            "solo": room.solo,
            "remaining": remaining,
            "category": room.state["problem"].get("category", "?"),
            "difficulty": room.state.get("difficulty", "medium"),
            "language": room.state.get("language", "python"),
            "mode": room.state.get("mode", "full_battle"),
        })
    return rooms


async def check_and_send_active_room(player_id: str) -> None:
    for room in list(_active_rooms.values()):
        if player_id in room.player_ids and not room.finished:
            pa = room.state["player_a"]
            pb = room.state["player_b"]
            is_a = (player_id == pa["player_id"])
            you_nick = pa["nickname"] if is_a else pb["nickname"]
            opp_nick = (pb["nickname"] if is_a else pa["nickname"]) if not room.solo else None

            problem = room.state["problem"]
            public_problem = {
                k: v for k, v in problem.items()
                if k not in ("correct_answer", "test_cases", "_generation_error")
            }
            elapsed = time.time() - room.state["started_at"]
            remaining = max(0, int(room.state["duration"] - elapsed))

            await manager.send(player_id, {
                "type": "duel_start",
                "room_id": room.room_id,
                "duration": remaining,
                "problem": public_problem,
                "opponent": opp_nick,
                "you": you_nick,
                "difficulty": room.state.get("difficulty", "medium"),
                "language": room.state.get("language", "python"),
                "mode": room.state.get("mode", "full_battle"),
                "solo": room.solo,
            })
            break


async def send_challenge(
    from_player_id: str, from_nickname: str,
    to_player_id: str,
    difficulty: str, language: str, mode: str,
) -> bool:
    """Sends a challenge invite to to_player_id. Returns False if player is offline."""
    if to_player_id not in manager.active:
        return False
    _pending_challenges[from_player_id] = {
        "target_id": to_player_id,
        "difficulty": difficulty,
        "language": language,
        "mode": mode,
        "from_nickname": from_nickname,
    }
    await manager.send(to_player_id, {
        "type": "challenge_received",
        "from_player_id": from_player_id,
        "from_nickname": from_nickname,
        "difficulty": difficulty,
        "language": language,
        "mode": mode,
    })
    return True


async def accept_challenge(accepting_player_id: str, accepting_nickname: str, from_player_id: str) -> bool:
    """Accepts a pending challenge and starts the duel."""
    challenge = _pending_challenges.pop(from_player_id, None)
    if challenge is None or challenge["target_id"] != accepting_player_id:
        return False

    import uuid
    room_id = str(uuid.uuid4())
    player_a = {"player_id": from_player_id, "nickname": challenge["from_nickname"]}
    player_b = {"player_id": accepting_player_id, "nickname": accepting_nickname}

    asyncio.create_task(start_duel(
        room_id, player_a, player_b,
        difficulty=challenge["difficulty"],
        language=challenge["language"],
        mode=challenge["mode"],
    ))
    return True


async def decline_challenge(declining_player_id: str, declining_nickname: str, from_player_id: str) -> None:
    """Declines a pending challenge and notifies the challenger."""
    _pending_challenges.pop(from_player_id, None)
    await manager.send(from_player_id, {
        "type": "challenge_declined",
        "by_nickname": declining_nickname,
    })
