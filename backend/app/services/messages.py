from __future__ import annotations

from app.constants import Emotion, FALLBACK_COMFORT, STUB_COMFORT


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


def default_emotion_counter() -> dict[str, int]:
    return {emotion.value: 0 for emotion in Emotion}
