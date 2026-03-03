from __future__ import annotations

from app.constants import CRISIS_KEYWORDS, MEDICAL_RISK_PATTERNS, Emotion
from app.services.messages import fallback_comfort_message, fallback_insight_comment


def is_crisis_text(text: str) -> bool:
    lowered = text.lower()
    return any(keyword in lowered for keyword in CRISIS_KEYWORDS)


def has_medical_risk(text: str) -> bool:
    lowered = text.lower()
    return any(pattern.search(lowered) for pattern in MEDICAL_RISK_PATTERNS)


def apply_comfort_guardrail(message: str, *, text: str, emotion: Emotion) -> tuple[str, bool]:
    if not has_medical_risk(message):
        return message, False

    return fallback_comfort_message(text=text, emotion=emotion), True


def apply_insight_guardrail(comment: str, *, period_days: int, dominant: str, total: int) -> tuple[str, bool]:
    if not has_medical_risk(comment):
        return comment, False

    return fallback_insight_comment(period_days=period_days, dominant=dominant, total=total), True
