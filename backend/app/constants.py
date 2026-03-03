from __future__ import annotations

import re
from enum import Enum


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
