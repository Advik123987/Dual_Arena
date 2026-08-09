"""Pydantic request/response models."""
from pydantic import BaseModel, ConfigDict


class JoinQueueRequest(BaseModel):
    nickname: str


class JoinQueueResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    player_id: str
    nickname: str
    rating: int


class LeaderboardEntry(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    nickname: str
    rating: int
    wins: int
    losses: int


class SubmitAnswerRequest(BaseModel):
    match_id: str
    player_id: str
    answer: str
