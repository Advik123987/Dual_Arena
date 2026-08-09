"""FastAPI entrypoint: HTTP routers + the /ws/{player_id} duel socket."""
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app import matchmaking
from app.config import settings
from app.db import init_models
from app.routers.leaderboard import router as leaderboard_router
from app.websocket_manager import (
    check_and_send_active_room, get_room, manager,
    send_challenge, accept_challenge, decline_challenge,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_models()
    yield


app = FastAPI(title="Duel Arena API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(",") if settings.CORS_ORIGINS != "*" else ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(leaderboard_router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.websocket("/ws/{player_id}")
async def duel_socket(websocket: WebSocket, player_id: str):
    # We'll update online meta after getting player info from the request header
    nickname = websocket.query_params.get("nickname", "Unknown")
    rating = int(websocket.query_params.get("rating", "1000"))
    win_streak = int(websocket.query_params.get("win_streak", "0"))

    await manager.connect(player_id, websocket, meta={
        "nickname": nickname,
        "rating": rating,
        "win_streak": win_streak,
    })
    await check_and_send_active_room(player_id)

    try:
        while True:
            msg = await websocket.receive_json()
            action = msg.get("action")

            if action == "join_queue":
                await check_and_send_active_room(player_id)

            elif action == "submit_answer":
                room = get_room(msg.get("room_id"))
                if room is not None:
                    await room.handle_submission(player_id, msg.get("answer", ""))

            elif action == "ping":
                await websocket.send_json({"type": "pong"})

            elif action == "challenge":
                target_id = msg.get("target_player_id")
                from_nick = msg.get("from_nickname", nickname)
                if target_id:
                    await send_challenge(
                        player_id, from_nick, target_id,
                        difficulty=msg.get("difficulty", "medium"),
                        language=msg.get("language", "python"),
                        mode=msg.get("mode", "full_battle"),
                    )

            elif action == "accept_challenge":
                from_id = msg.get("from_player_id")
                accepting_nick = msg.get("accepting_nickname", nickname)
                if from_id:
                    await accept_challenge(player_id, accepting_nick, from_id)

            elif action == "decline_challenge":
                from_id = msg.get("from_player_id")
                declining_nick = msg.get("declining_nickname", nickname)
                if from_id:
                    await decline_challenge(player_id, declining_nick, from_id)

    except WebSocketDisconnect:
        manager.disconnect(player_id)
        await matchmaking.dequeue(player_id)
