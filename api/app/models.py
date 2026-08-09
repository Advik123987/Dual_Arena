"""SQLAlchemy models: players, matches, weak-area tracking, leaderboard."""
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, Integer, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class Player(Base):
    __tablename__ = "players"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    nickname: Mapped[str] = mapped_column(String, unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    rating: Mapped[int] = mapped_column(Integer, default=1000)
    wins: Mapped[int] = mapped_column(Integer, default=0)
    losses: Mapped[int] = mapped_column(Integer, default=0)

    # {"arrays": 0.7, "dp": 0.3, "percentages": 0.5, ...} — higher score = weaker
    # (measured as historical wrong-rate on that category). Read/written by
    # app/matchmaking.py and app/problem_gen.py.
    weak_areas: Mapped[dict] = mapped_column(JSON, default=dict)


class Match(Base):
    __tablename__ = "matches"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    player_a_id: Mapped[str] = mapped_column(String, ForeignKey("players.id"))
    player_b_id: Mapped[str] = mapped_column(String, ForeignKey("players.id"))
    winner_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    problem_category: Mapped[str] = mapped_column(String)
    problem_payload: Mapped[dict] = mapped_column(JSON)

    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    player_a_correct: Mapped[bool] = mapped_column(default=False)
    player_b_correct: Mapped[bool] = mapped_column(default=False)
    player_a_time_seconds: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    player_b_time_seconds: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
