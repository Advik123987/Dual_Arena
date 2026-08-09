"""REST endpoints: queue join/leave, leaderboard, profile, solo, active rooms, online players, challenges."""
import asyncio

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app import matchmaking
from app.db import get_db
from app.models import Player
from app.schemas import JoinQueueRequest, JoinQueueResponse, LeaderboardEntry, SoloStartRequest
from app.websocket_manager import (
    get_active_rooms, manager, start_duel,
    send_challenge, accept_challenge, decline_challenge,
)

router = APIRouter()


@router.post("/queue/join", response_model=JoinQueueResponse)
async def join_queue(req: JoinQueueRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Player).where(Player.nickname == req.nickname))
    player = result.scalar_one_or_none()
    if player is None:
        player = Player(nickname=req.nickname)
        db.add(player)
        await db.commit()
        await db.refresh(player)

    match = await matchmaking.enqueue(
        player.id, player.nickname, player.weak_areas,
        difficulty=req.difficulty, language=req.language, mode=req.mode,
    )
    if match is not None:
        asyncio.create_task(start_duel(
            match["room_id"], match["player_a"], match["player_b"],
            difficulty=match["difficulty"],
            language=match["language"],
            mode=match["mode"],
        ))

    return JoinQueueResponse(
        player_id=player.id,
        nickname=player.nickname,
        rating=player.rating,
        win_streak=player.win_streak,
    )


@router.delete("/queue/leave")
async def leave_queue(player_id: str):
    await matchmaking.dequeue(player_id)
    return {"status": "removed"}


@router.post("/solo/start")
async def solo_start(req: SoloStartRequest, db: AsyncSession = Depends(get_db)):
    """Start a solo challenge immediately (no opponent)."""
    result = await db.execute(select(Player).where(Player.nickname == req.nickname))
    player = result.scalar_one_or_none()
    if player is None:
        player = Player(nickname=req.nickname, id=req.player_id)
        db.add(player)
        await db.commit()
        await db.refresh(player)

    import uuid
    room_id = str(uuid.uuid4())
    player_entry = {"player_id": req.player_id, "nickname": req.nickname}

    asyncio.create_task(start_duel(
        room_id, player_entry, player_entry,
        difficulty=req.difficulty, language=req.language, mode=req.mode,
        solo=True,
    ))
    return {"room_id": room_id, "status": "started"}


@router.get("/rooms/active")
async def active_rooms():
    return get_active_rooms()


@router.get("/players/online")
async def online_players():
    return manager.get_online_players()


@router.get("/leaderboard", response_model=list[LeaderboardEntry])
async def leaderboard(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Player).order_by(Player.rating.desc()).limit(50)
    )
    return result.scalars().all()


@router.get("/players/{player_id}/profile")
async def profile(player_id: str, db: AsyncSession = Depends(get_db)):
    player = await db.get(Player, player_id)
    if player is None:
        raise HTTPException(status_code=404, detail="player not found")
    wins = player.wins
    losses = player.losses
    total = wins + losses
    return {
        "nickname": player.nickname,
        "rating": player.rating,
        "wins": wins,
        "losses": losses,
        "win_streak": player.win_streak,
        "win_rate": round(wins / total * 100, 1) if total > 0 else 0.0,
        "weak_areas": player.weak_areas,
    }


@router.post("/challenge/send")
async def challenge_player(from_player_id: str, from_nickname: str, to_player_id: str,
                           difficulty: str = "medium", language: str = "python",
                           mode: str = "full_battle"):
    ok = await send_challenge(from_player_id, from_nickname, to_player_id, difficulty, language, mode)
    if not ok:
        raise HTTPException(status_code=404, detail="Player not online")
    return {"status": "challenge_sent"}


@router.post("/challenge/accept")
async def challenge_accept(accepting_player_id: str, accepting_nickname: str, from_player_id: str):
    ok = await accept_challenge(accepting_player_id, accepting_nickname, from_player_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Challenge not found")
    return {"status": "duel_starting"}


@router.post("/challenge/decline")
async def challenge_decline(declining_player_id: str, declining_nickname: str, from_player_id: str):
    await decline_challenge(declining_player_id, declining_nickname, from_player_id)
    return {"status": "declined"}
