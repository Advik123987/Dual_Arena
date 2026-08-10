"""Auth utilities: password hashing (SHA256, no external C deps) + JWT tokens (PyJWT, pure Python).

Token payload: {"sub": player_id, "nickname": nickname, "exp": ...}
"""
import hashlib
import hmac
from datetime import datetime, timedelta, timezone

import jwt  # PyJWT — pure Python, no Rust/C deps

from app.config import settings

ALGORITHM = "HS256"


# ── Password helpers (SHA-256 HMAC — no bcrypt/cryptography C dep) ─────────────

def _hmac_hash(plain: str) -> str:
    """HMAC-SHA256 password hash using SECRET_KEY as salt."""
    return "hmac256$" + hmac.new(
        settings.SECRET_KEY.encode("utf-8"),
        plain.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def hash_password(plain: str) -> str:
    return _hmac_hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    if not hashed:
        return False
    # Support legacy sha256$ prefix from old fallback
    if hashed.startswith("sha256$"):
        salt = settings.SECRET_KEY[:16]
        legacy = "sha256$" + hashlib.sha256((salt + plain).encode("utf-8")).hexdigest()
        return hmac.compare_digest(legacy, hashed)
    if hashed.startswith("hmac256$"):
        return hmac.compare_digest(_hmac_hash(plain), hashed)
    # Passlib bcrypt hash from old deployments — try passlib if available
    try:
        from passlib.context import CryptContext
        ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
        return ctx.verify(plain, hashed)
    except Exception:
        pass
    return False


# ── JWT helpers (PyJWT — pure Python) ────────────────────────────────────────

def create_access_token(player_id: str, nickname: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=settings.ACCESS_TOKEN_EXPIRE_HOURS)
    payload = {"sub": player_id, "nickname": nickname, "exp": expire}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict | None:
    """Returns payload dict or None if invalid / expired."""
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        return None
