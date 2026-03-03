from __future__ import annotations

from collections import Counter
import json
import logging
from time import perf_counter
from uuid import uuid4

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.constants import Emotion, EMOTION_KO_LABEL
from app.llm_client import LLMNotConfiguredError, LLMRequestError, generate_comfort_line, generate_period_comment
from app.pii_guard import mask_pii
from app.schemas import ComfortRequest, ComfortResponse, InsightRequest, InsightResponse
from app.services.guardrail import apply_comfort_guardrail, apply_insight_guardrail, is_crisis_text
from app.services.messages import (
    default_emotion_counter,
    fallback_comfort_message,
    fallback_insight_comment,
    stub_comfort_message,
    stub_insight_comment,
)

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


def log_event(event: str, **fields: object) -> None:
    payload = {"event": event, **fields}
    logger.info(json.dumps(payload, ensure_ascii=False))


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
