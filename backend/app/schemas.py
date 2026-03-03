from __future__ import annotations

from datetime import date

from pydantic import BaseModel, Field

from app.constants import Emotion


class ComfortRequest(BaseModel):
    content: str = Field(min_length=1, max_length=1000)
    emotion: Emotion | None = None


class ComfortResponse(BaseModel):
    category: str
    message: str
    resources: list[str]


class JournalEntryIn(BaseModel):
    date: date
    emotion: Emotion


class InsightRequest(BaseModel):
    periodDays: int = Field(default=7)
    entries: list[JournalEntryIn]


class InsightResponse(BaseModel):
    periodDays: int
    dominantEmotion: str
    emotionCounts: dict[str, int]
    comment: str
