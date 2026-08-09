"""Auth utilities: password hashing (bcrypt + sha256 fallback) + JWT tokens (python-jose).

Token payload: {"sub": player_id, "nickname": nickname, "exp": ...}
"""
import hashlib
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
ALGORITHM = "HS256"


# ── Password helpers ──────────────────────────────────────────────────────────

def _fallback_hash(plain: str) -> str:
    salt = settings.SECRET_KEY[:16]
    return "sha256$" + hashlib.sha256((salt + plain).encode("utf-8")).hexdigest()


def hash_password(plain: str) -> str:
    try:
        return _pwd_context.hash(plain)
    except Exception:
        return _fallback_hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    if not hashed:
        return False
    if hashed.startswith("sha256$"):
        return _fallback_hash(plain) == hashed
    try:
        return _pwd_context.verify(plain, hashed)
    except Exception:
        return _fallback_hash(plain) == hashed


# ── JWT helpers ───────────────────────────────────────────────────────────────

def create_access_token(player_id: str, nickname: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=settings.ACCESS_TOKEN_EXPIRE_HOURS)
    payload = {"sub": player_id, "nickname": nickname, "exp": expire}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict | None:
    """Returns payload dict or None if invalid / expired."""
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None
