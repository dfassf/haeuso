from __future__ import annotations

from collections import Counter
from datetime import date
from enum import Enum
import json
import logging
import re
from time import perf_counter
from uuid import uuid4

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.config import settings
from app.llm_client import LLMNotConfiguredError, LLMRequestError, generate_comfort_line, generate_period_comment
from app.pii_guard import mask_pii


class Emotion(str, Enum):
    calm = "calm"
    sad = "sad"
    angry = "angry"
    anxious = "anxious"
    happy = "happy"


EMOTION_KO_LABEL: dict[Emotion, str] = {
    Emotion.calm: "괜찮음",
    Emotion.sad: "슬픔",
    Emotion.angry: "화남",
    Emotion.anxious: "불안",
    Emotion.happy: "기쁨",
}


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


CRISIS_KEYWORDS = [
    "죽고 싶",
    "자해",
    "끝내고 싶",
    "사라지고 싶",
    "극단적 선택",
    "해치고 싶",
]

MEDICAL_RISK_PATTERNS = [
    re.compile(r"진단"),
    re.compile(r"처방"),
    re.compile(r"병명"),
    re.compile(r"입원"),
    re.compile(r"약(?:물)?\s*(복용|드시|먹)"),
    re.compile(r"(우울증|불안장애|조현병|양극성)"),
    re.compile(r"치료\s*(가|를|받)"),
]

FALLBACK_COMFORT: dict[Emotion, list[str]] = {
    Emotion.calm: [
        "지금의 고요함을 잘 지켜내고 계시네요.",
        "조용한 숨 하나가 마음을 단단하게 붙잡아줄 거예요.",
    ],
    Emotion.sad: [
        "슬픔을 말로 꺼내는 데 이미 큰 용기가 필요했을 거예요.",
        "오늘은 버틴 자신을 조금 더 부드럽게 대해주셔도 됩니다.",
    ],
    Emotion.angry: [
        "화가 올라온 마음에는 그만한 이유가 있었을 거예요.",
        "잠깐 멈춰 선 지금이, 마음을 다치지 않게 지키는 시간입니다.",
    ],
    Emotion.anxious: [
        "불안한 마음을 혼자 붙잡고 있지 않아도 괜찮습니다.",
        "지금 이 순간 하나만 천천히 건너가도 충분합니다.",
    ],
    Emotion.happy: [
        "기쁜 마음을 오래 붙잡고 싶은 하루였겠네요.",
        "지금의 밝은 감정이 오래 남아 주면 좋겠습니다.",
    ],
}

STUB_COMFORT: dict[Emotion, str] = {
    Emotion.calm: "테스트 모드 응답입니다. 지금의 차분함을 그대로 지켜도 괜찮습니다.",
    Emotion.sad: "테스트 모드 응답입니다. 오늘의 무거움을 잠시 내려놓아도 괜찮습니다.",
    Emotion.angry: "테스트 모드 응답입니다. 올라온 감정을 여기서 잠깐 비워내셔도 됩니다.",
    Emotion.anxious: "테스트 모드 응답입니다. 불안이 큰 날일수록 한 호흡씩 천천히 가도 됩니다.",
    Emotion.happy: "테스트 모드 응답입니다. 오늘의 밝은 감정을 충분히 느끼셔도 좋습니다.",
}

LOCAL_ORIGIN_REGEX = r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$"

app = FastAPI(title="Haeuso API", version="0.2.0")
logger = logging.getLogger("haeuso.api")
logger.setLevel(logging.INFO)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_origin_regex=LOCAL_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def is_crisis_text(text: str) -> bool:
    lowered = text.lower()
    return any(keyword in lowered for keyword in CRISIS_KEYWORDS)


def has_medical_risk(text: str) -> bool:
    lowered = text.lower()
    return any(pattern.search(lowered) for pattern in MEDICAL_RISK_PATTERNS)


def log_event(event: str, **fields: object) -> None:
    payload = {"event": event, **fields}
    logger.info(json.dumps(payload, ensure_ascii=False))


def fallback_comfort_message(text: str, emotion: Emotion | None) -> str:
    target_emotion = emotion or Emotion.calm
    lines = FALLBACK_COMFORT[target_emotion]
    index = len(text.strip()) % len(lines)
    return f"{lines[index]} 지금 여기까지 오신 것만으로도 충분히 잘하고 계십니다."


def fallback_insight_comment(period_days: int, dominant: str, total: int) -> str:
    if total == 0:
        return "기록이 없어 해석을 만들 수 없습니다. 짧은 한 줄부터 시작해 보셔도 좋습니다."

    if dominant in {"anxious", "sad", "angry"}:
        return (
            f"최근 {period_days}일은 소진 감정이 상대적으로 많았습니다. "
            "해야 할 일을 줄이고, 회복 루틴을 먼저 챙기는 것이 도움이 됩니다."
        )

    return (
        f"최근 {period_days}일은 버티는 힘과 회복 감정이 함께 보입니다. "
        "잘 맞았던 휴식 방식은 다음 주에도 이어가 보세요."
    )


def stub_comfort_message(emotion: Emotion) -> str:
    return STUB_COMFORT[emotion]


def stub_insight_comment(period_days: int, dominant: str, total: int) -> str:
    if total == 0:
        return "테스트 모드 응답입니다. 기록이 없어 분석 코멘트를 만들 수 없습니다."

    if dominant == "none":
        return f"테스트 모드 응답입니다. 최근 {period_days}일 감정 흐름을 다시 모아보세요."

    return f"테스트 모드 응답입니다. 최근 {period_days}일의 대표 감정은 {dominant}입니다."


def apply_comfort_guardrail(message: str, *, text: str, emotion: Emotion) -> tuple[str, bool]:
    if not has_medical_risk(message):
        return message, False

    return fallback_comfort_message(text=text, emotion=emotion), True


def apply_insight_guardrail(comment: str, *, period_days: int, dominant: str, total: int) -> tuple[str, bool]:
    if not has_medical_risk(comment):
        return comment, False

    return fallback_insight_comment(period_days=period_days, dominant=dominant, total=total), True


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/v1/comfort", response_model=ComfortResponse)
async def comfort(payload: ComfortRequest) -> ComfortResponse:
    request_id = uuid4().hex
    started_at = perf_counter()
    pii_result = mask_pii(payload.content)

    if is_crisis_text(payload.content):
        log_event(
            "comfort_processed",
            request_id=request_id,
            mode=settings.llm_mode,
            category="crisis",
            pii_detected=bool(pii_result.detected_types),
            pii_types=pii_result.detected_types,
            pii_replacements=pii_result.replacements,
            fallback_used=False,
            guardrail_triggered=False,
            duration_ms=int((perf_counter() - started_at) * 1000),
        )
        return ComfortResponse(
            category="crisis",
            message=(
                "이곳이 담기에는 너무 무거운 이야기일 수 있습니다. "
                "혼자 버티지 않으셔도 됩니다. 지금 바로 도움을 받을 수 있는 곳에 연락해 주세요."
            ),
            resources=[
                "자살예방상담전화 1393",
                "정신건강위기상담전화 1577-0199",
                "생명의전화 1588-9191",
            ],
        )

    emotion = payload.emotion or Emotion.calm
    emotion_label = EMOTION_KO_LABEL[emotion]
    fallback_used = False
    guardrail_triggered = False

    if settings.llm_mode == "stub":
        message = stub_comfort_message(emotion)
    else:
        try:
            message = await generate_comfort_line(emotion_label=emotion_label, content=pii_result.masked_text)
        except (LLMNotConfiguredError, LLMRequestError):
            message = fallback_comfort_message(payload.content, emotion)
            fallback_used = True

    message, guardrail_triggered = apply_comfort_guardrail(message, text=payload.content, emotion=emotion)
    if guardrail_triggered:
        fallback_used = True

    log_event(
        "comfort_processed",
        request_id=request_id,
        mode=settings.llm_mode,
        category="normal",
        pii_detected=bool(pii_result.detected_types),
        pii_types=pii_result.detected_types,
        pii_replacements=pii_result.replacements,
        llm_input_masked=pii_result.masked_text != payload.content,
        fallback_used=fallback_used,
        guardrail_triggered=guardrail_triggered,
        duration_ms=int((perf_counter() - started_at) * 1000),
    )

    return ComfortResponse(category="normal", message=message, resources=[])


def default_emotion_counter() -> dict[str, int]:
    return {emotion.value: 0 for emotion in Emotion}


@app.post("/api/v1/insight", response_model=InsightResponse)
async def insight(payload: InsightRequest) -> InsightResponse:
    request_id = uuid4().hex
    started_at = perf_counter()
    period_days = 7 if payload.periodDays not in {7, 30} else payload.periodDays
    counts = default_emotion_counter()

    for entry in payload.entries:
        counts[entry.emotion.value] += 1

    total = sum(counts.values())
    if total == 0:
        dominant = "none"
    else:
        dominant = Counter(counts).most_common(1)[0][0]

    fallback_used = False
    guardrail_triggered = False

    if settings.llm_mode == "stub":
        comment = stub_insight_comment(period_days=period_days, dominant=dominant, total=total)
    else:
        try:
            comment = await generate_period_comment(
                period_days=period_days,
                emotion_counts=counts,
                total=total,
            )
        except (LLMNotConfiguredError, LLMRequestError):
            comment = fallback_insight_comment(period_days=period_days, dominant=dominant, total=total)
            fallback_used = True

    comment, guardrail_triggered = apply_insight_guardrail(
        comment,
        period_days=period_days,
        dominant=dominant,
        total=total,
    )
    if guardrail_triggered:
        fallback_used = True

    log_event(
        "insight_processed",
        request_id=request_id,
        mode=settings.llm_mode,
        period_days=period_days,
        total_entries=total,
        dominant_emotion=dominant,
        fallback_used=fallback_used,
        guardrail_triggered=guardrail_triggered,
        duration_ms=int((perf_counter() - started_at) * 1000),
    )

    return InsightResponse(
        periodDays=period_days,
        dominantEmotion=dominant,
        emotionCounts=counts,
        comment=comment,
    )
