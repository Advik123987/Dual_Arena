"""Async SQLAlchemy engine/session + base model.

Uses SQLite (aiosqlite — pure Python) as primary DB on Zerops since asyncpg
requires C compilation. Falls back to SQLite on any connection error.
If DATABASE_URL points to PostgreSQL but asyncpg is unavailable, we catch
the ImportError and always use SQLite.
"""
import logging
from sqlalchemy import inspect, text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from app.config import normalized_database_url

logger = logging.getLogger(__name__)

_SQLITE_URL = "sqlite+aiosqlite:///./duelarena.db"


def _build_engine():
    """Try to build engine from DATABASE_URL; fall back to SQLite if asyncpg missing."""
    raw_url = normalized_database_url()
    if raw_url.startswith("sqlite"):
        return create_async_engine(raw_url, connect_args={"check_same_thread": False})
    # Try PostgreSQL — but asyncpg is an optional compiled dep
    try:
        import asyncpg  # noqa: F401
        return create_async_engine(raw_url, pool_pre_ping=True, pool_size=5, max_overflow=5)
    except ImportError:
        logger.warning("asyncpg not installed — using SQLite instead of PostgreSQL")
        return create_async_engine(_SQLITE_URL, connect_args={"check_same_thread": False})


engine = _build_engine()
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

# Always-available SQLite fallback engine
_fallback_engine = create_async_engine(_SQLITE_URL, connect_args={"check_same_thread": False})
_FallbackSessionLocal = async_sessionmaker(_fallback_engine, expire_on_commit=False, class_=AsyncSession)


class Base(DeclarativeBase):
    pass


def _migrate_db(sync_conn):
    """Run ALTER TABLE statements if columns are missing from existing DB tables."""
    inspector = inspect(sync_conn)
    tables = inspector.get_table_names()

    if "players" in tables:
        cols = [c["name"] for c in inspector.get_columns("players")]
        if "password_hash" not in cols:
            try: sync_conn.execute(text("ALTER TABLE players ADD COLUMN password_hash VARCHAR"))
            except Exception: pass
        if "daily_streak" not in cols:
            try: sync_conn.execute(text("ALTER TABLE players ADD COLUMN daily_streak INTEGER DEFAULT 0"))
            except Exception: pass
        if "last_daily_date" not in cols:
            try: sync_conn.execute(text("ALTER TABLE players ADD COLUMN last_daily_date VARCHAR"))
            except Exception: pass
        if "achievements" not in cols:
            try: sync_conn.execute(text("ALTER TABLE players ADD COLUMN achievements JSON DEFAULT '[]'"))
            except Exception: pass

    if "matches" in tables:
        cols = [c["name"] for c in inspector.get_columns("matches")]
        if "room_code" not in cols:
            try: sync_conn.execute(text("ALTER TABLE matches ADD COLUMN room_code VARCHAR"))
            except Exception: pass


async def get_db():
    try:
        async with AsyncSessionLocal() as session:
            yield session
    except Exception as e:
        logger.warning(f"Primary DB session failed ({e}), using SQLite fallback")
        async with _fallback_engine.begin() as conn:
            import app.models  # noqa: F401
            await conn.run_sync(Base.metadata.create_all)
            await conn.run_sync(_migrate_db)
        async with _FallbackSessionLocal() as session:
            yield session


async def init_models():
    """Create tables on startup if they don't exist and run column migrations."""
    import app.models  # noqa: F401
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            await conn.run_sync(_migrate_db)
        logger.info("Database initialized successfully.")
    except Exception as e:
        logger.warning(f"Primary init_models failed ({e}), initializing SQLite fallback tables")
        try:
            async with _fallback_engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
                await conn.run_sync(_migrate_db)
            logger.info("SQLite fallback database initialized.")
        except Exception as exc:
            logger.error(f"Fallback init_models failed: {exc}")
