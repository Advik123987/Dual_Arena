"""Async SQLAlchemy engine/session + base model with automatic SQLite fallback."""
import logging
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


async def get_db():
    try:
        async with AsyncSessionLocal() as session:
            yield session
    except Exception as e:
        logger.warning(f"Primary DB session failed ({e}), using SQLite fallback")
        async with _fallback_engine.begin() as conn:
            import app.models  # noqa: F401
            await conn.run_sync(Base.metadata.create_all)
        async with _FallbackSessionLocal() as session:
            yield session


async def init_models():
    """Create tables on startup if they don't exist."""
    import app.models  # noqa: F401 ensure models are registered on Base.metadata
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception as e:
        logger.warning(f"Primary init_models failed ({e}), initializing SQLite fallback tables")
        try:
            async with _fallback_engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
        except Exception as exc:
            logger.error(f"Fallback init_models failed: {exc}")
