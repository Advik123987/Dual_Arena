"""SQLAlchemy models."""
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, Integer, Float, DateTime, ForeignKey, JSON, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class Player(Base):
    __tablename__ = "players"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    nickname: Mapped[str] = mapped_column(String, unique=True, index=True)
    password_hash: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    rating: Mapped[int] = mapped_column(Integer, default=1000)
    wins: Mapped[int] = mapped_column(Integer, default=0)
    losses: Mapped[int] = mapped_column(Integer, default=0)
    win_streak: Mapped[int] = mapped_column(Integer, default=0)
    weak_areas: Mapped[dict] = mapped_column(JSON, default=dict)
    achievements: Mapped[list] = mapped_column(JSON, default=list)


class Match(Base):
    __tablename__ = "matches"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    player_a_id: Mapped[str] = mapped_column(String, ForeignKey("players.id"))
    player_b_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    winner_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    problem_category: Mapped[str] = mapped_column(String)
    problem_payload: Mapped[dict] = mapped_column(JSON)
    difficulty: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    language: Mapped[Optional[str]] = mapped_column(String, nullable=True, default="python")
    mode: Mapped[Optional[str]] = mapped_column(String, nullable=True, default="full_battle")
    is_solo: Mapped[bool] = mapped_column(Boolean, default=False)
    room_code: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    player_a_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    player_b_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    player_a_time_seconds: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    player_b_time_seconds: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
