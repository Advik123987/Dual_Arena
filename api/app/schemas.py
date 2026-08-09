"""Pydantic request/response models."""
from pydantic import BaseModel


class JoinQueueRequest(BaseModel):
    nickname: str


class JoinQueueResponse(BaseModel):
    player_id: str
    nickname: str
    rating: int


class LeaderboardEntry(BaseModel):
    nickname: str
    rating: int
    wins: int
    losses: int

    class Config:
        from_attributes = True


class SubmitAnswerRequest(BaseModel):
    match_id: str
    player_id: str
    answer: str
