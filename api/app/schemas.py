"""Pydantic request/response models."""
from typing import Optional
from pydantic import BaseModel, ConfigDict


class JoinQueueRequest(BaseModel):
    nickname: str
    difficulty: str = "medium"     # easy | medium | hard
    language: str = "python"       # python | java
    mode: str = "full_battle"      # rapid_fire | sprint | full_battle | marathon


class JoinQueueResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    player_id: str
    nickname: str
    rating: int
    win_streak: int = 0


class LeaderboardEntry(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    nickname: str
    rating: int
    wins: int
    losses: int
    win_streak: int = 0


class SoloStartRequest(BaseModel):
    player_id: str
    nickname: str
    difficulty: str = "medium"
    language: str = "python"
    mode: str = "full_battle"


class SubmitAnswerRequest(BaseModel):
    match_id: str
    player_id: str
    answer: str
