"""Async SQLAlchemy engine/session + base model."""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from app.config import normalized_database_url

engine = create_async_engine(normalized_database_url(), pool_pre_ping=True, pool_size=5, max_overflow=5)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


async def init_models():
    """Create tables on startup if they don't exist. Fine for a 48h hackathon;
    a real project would use Alembic migrations instead."""
    import app.models  # noqa: F401 ensure models are registered on Base.metadata
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
