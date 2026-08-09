"""REST endpoints: queue join, leaderboard, per-player profile."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

import asyncio

from app import matchmaking
from app.db import get_db
from app.models import Player
from app.schemas import JoinQueueRequest, JoinQueueResponse, LeaderboardEntry
from app.websocket_manager import start_duel

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

    match = await matchmaking.enqueue(player.id, player.nickname, player.weak_areas)
    if match is not None:
        # Don't block this HTTP response on problem generation (a Groq round
        # trip) — start the duel in the background; both clients get
        # "duel_start" pushed over their already-open WebSockets once ready.
        asyncio.create_task(start_duel(match["room_id"], match["player_a"], match["player_b"]))

    return JoinQueueResponse(player_id=player.id, nickname=player.nickname, rating=player.rating)


@router.get("/leaderboard", response_model=list[LeaderboardEntry])
async def leaderboard(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Player).order_by(Player.rating.desc()).limit(50))
    return result.scalars().all()


@router.get("/players/{player_id}/profile")
async def profile(player_id: str, db: AsyncSession = Depends(get_db)):
    player = await db.get(Player, player_id)
    if player is None:
        raise HTTPException(status_code=404, detail="player not found")
    return {
        "nickname": player.nickname,
        "rating": player.rating,
        "wins": player.wins,
        "losses": player.losses,
        "weak_areas": player.weak_areas,
    }
