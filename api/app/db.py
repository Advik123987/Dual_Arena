"""Async SQLAlchemy engine/session + base model with automatic SQLite fallback & auto-migration."""
import logging
from sqlalchemy import inspect, text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from app.config import normalized_database_url

logger = logging.getLogger(__name__)

url = normalized_database_url()


def _create_engine(target_url: str):
    if target_url.startswith("sqlite"):
        return create_async_engine(target_url, connect_args={"check_same_thread": False})
    return create_async_engine(target_url, pool_pre_ping=True, pool_size=5, max_overflow=5)


engine = _create_engine(url)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

# Fallback SQLite engine if PostgreSQL is not running locally
_fallback_engine = create_async_engine("sqlite+aiosqlite:///./duelarena.db", connect_args={"check_same_thread": False})
_FallbackSessionLocal = async_sessionmaker(_fallback_engine, expire_on_commit=False, class_=AsyncSession)


class Base(DeclarativeBase):
    pass


def _migrate_db(sync_conn):
    """Run ALTER TABLE statements if columns are missing from existing DB tables."""
    inspector = inspect(sync_conn)
    tables = inspector.get_table_names()

    if "players" in tables:
        cols = [c["name"] for c in inspector.get_columns("players")]
        with sync_conn.begin():
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
        with sync_conn.begin():
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
    import app.models  # noqa: F401 ensure models are registered on Base.metadata
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            await conn.run_sync(_migrate_db)
    except Exception as e:
        logger.warning(f"Primary init_models failed ({e}), initializing SQLite fallback tables")
        try:
            async with _fallback_engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
                await conn.run_sync(_migrate_db)
        except Exception as exc:
            logger.error(f"Fallback init_models failed: {exc}")
