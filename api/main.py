"""FastAPI entrypoint: HTTP routers + the /ws/{player_id} duel socket."""
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app import matchmaking
from app.config import settings
from app.db import init_models
from app.routers.leaderboard import router as leaderboard_router
from app.websocket_manager import get_room, manager


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
    await manager.connect(player_id, websocket)
    try:
        while True:
            msg = await websocket.receive_json()
            action = msg.get("action")

            if action == "submit_answer":
                room = get_room(msg.get("room_id"))
                if room is not None:
                    await room.handle_submission(player_id, msg.get("answer", ""))

            elif action == "ping":
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        manager.disconnect(player_id)
        await matchmaking.dequeue(player_id)
        # NOTE: an in-duel disconnect currently just drops the socket — the
        # opponent won't be told. A production version would push
        # "opponent_disconnected" via the room and start a grace-period
        # timer before auto-forfeiting. Flagged as a known gap, not solved
        # in this 48h build.
