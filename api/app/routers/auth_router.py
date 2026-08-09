"""Auth endpoints: register, login, /me (token verification)."""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import create_access_token, hash_password, verify_password
from app.db import get_db
from app.models import Player

router = APIRouter(prefix="/api/auth", tags=["auth"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    nickname: str
    password: str


class LoginRequest(BaseModel):
    nickname: str
    password: str


class AuthResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    player_id: str
    nickname: str
    rating: int
    win_streak: int
    token: str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Create a new account. Nickname must be unique; password must be ≥6 chars."""
    if len(req.nickname.strip()) < 2:
        raise HTTPException(400, "Nickname must be at least 2 characters.")
    if len(req.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters.")

    # Check nickname taken
    result = await db.execute(select(Player).where(Player.nickname == req.nickname.strip()))
    existing = result.scalar_one_or_none()
    if existing is not None:
        raise HTTPException(409, "Nickname already taken. Choose another or log in.")

    player = Player(
        nickname=req.nickname.strip(),
        password_hash=hash_password(req.password),
    )
    db.add(player)
    await db.commit()
    await db.refresh(player)

    token = create_access_token(player.id, player.nickname)
    return AuthResponse(
        player_id=player.id,
        nickname=player.nickname,
        rating=player.rating,
        win_streak=player.win_streak,
        token=token,
    )


@router.post("/login", response_model=AuthResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Login with nickname + password. Returns a JWT token."""
    result = await db.execute(select(Player).where(Player.nickname == req.nickname.strip()))
    player = result.scalar_one_or_none()

    if player is None:
        raise HTTPException(401, "Nickname not found. Register first.")

    # Players created before auth was added have no password_hash — force them to re-register
    if player.password_hash is None:
        raise HTTPException(401, "Account has no password set. Please register a new account.")

    if not verify_password(req.password, player.password_hash):
        raise HTTPException(401, "Incorrect password.")

    token = create_access_token(player.id, player.nickname)
    return AuthResponse(
        player_id=player.id,
        nickname=player.nickname,
        rating=player.rating,
        win_streak=player.win_streak,
        token=token,
    )


@router.get("/me")
async def get_me(token: str, db: AsyncSession = Depends(get_db)):
    """Verify a token and return the player info. Used by frontend on app load."""
    from app.auth import decode_access_token
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(401, "Token invalid or expired. Please log in again.")

    player = await db.get(Player, payload["sub"])
    if player is None:
        raise HTTPException(404, "Player not found.")

    wins = player.wins
    losses = player.losses
    total = wins + losses
    return {
        "player_id": player.id,
        "nickname": player.nickname,
        "rating": player.rating,
        "win_streak": player.win_streak,
        "wins": wins,
        "losses": losses,
        "win_rate": round(wins / total * 100, 1) if total > 0 else 0.0,
    }
