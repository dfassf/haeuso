from fastapi.testclient import TestClient

from app import main
from app.config import Settings
from app.pii_guard import mask_pii


def _live_settings() -> Settings:
    return Settings(
        gemini_api_key="dummy",
        gemini_model="gemini-2.5-flash",
        llm_request_timeout_sec=30,
        llm_mode="live",
    )


def test_mask_pii_replaces_major_patterns() -> None:
    text = "연락처 010-1234-5678, 메일 hello@test.com, 주민번호 900101-1234567"
    result = mask_pii(text)

    assert result.replacements >= 3
    assert "phone" in result.detected_types
    assert "email" in result.detected_types
    assert "rrn" in result.detected_types
    assert "[휴대전화]" in result.masked_text
    assert "[이메일]" in result.masked_text
    assert "[주민번호]" in result.masked_text
    assert "010-1234-5678" not in result.masked_text
    assert "hello@test.com" not in result.masked_text


def test_mask_pii_handles_korean_suffix_after_phone() -> None:
    text = "핸드폰번호가 010-1234-5555인데 화가 납니다."
    result = mask_pii(text)

    assert "phone" in result.detected_types
    assert "[휴대전화]인데" in result.masked_text
    assert "010-1234-5555" not in result.masked_text


def test_comfort_masks_pii_before_llm(monkeypatch) -> None:
    captured: dict[str, str] = {}

    async def fake_generate(*, emotion_label: str, content: str) -> str:
        captured["emotion_label"] = emotion_label
        captured["content"] = content
        return "공감합니다. 오늘도 스스로를 지켜내고 계십니다."

    monkeypatch.setattr(main, "settings", _live_settings())
    monkeypatch.setattr(main, "generate_comfort_line", fake_generate)

    client = TestClient(main.app)
    response = client.post(
        "/api/v1/comfort",
        json={
            "content": "제 이메일은 hello@test.com 이고 번호는 010-1234-5678 입니다.",
            "emotion": "anxious",
        },
    )

    assert response.status_code == 200
    assert "[이메일]" in captured["content"]
    assert "[휴대전화]" in captured["content"]
    assert "hello@test.com" not in captured["content"]
    assert "010-1234-5678" not in captured["content"]


def test_comfort_guardrail_falls_back_on_medical_tone(monkeypatch) -> None:
    async def unsafe_generate(*, emotion_label: str, content: str) -> str:
        return "이건 우울증 진단이며 약 복용이 필요합니다."

    monkeypatch.setattr(main, "settings", _live_settings())
    monkeypatch.setattr(main, "generate_comfort_line", unsafe_generate)

    client = TestClient(main.app)
    response = client.post(
        "/api/v1/comfort",
        json={"content": "오늘은 많이 가라앉아요.", "emotion": "sad"},
    )

    assert response.status_code == 200
    body = response.json()
    assert "진단" not in body["message"]
    assert "약 복용" not in body["message"]
    assert body["message"].endswith("충분히 잘하고 계십니다.")


def test_insight_guardrail_falls_back_on_medical_tone(monkeypatch) -> None:
    async def unsafe_generate(*, period_days: int, emotion_counts: dict[str, int], total: int) -> str:
        return "불안장애 진단 가능성이 높아 보이며 처방이 필요해 보입니다."

    monkeypatch.setattr(main, "settings", _live_settings())
    monkeypatch.setattr(main, "generate_period_comment", unsafe_generate)

    client = TestClient(main.app)
    response = client.post(
        "/api/v1/insight",
        json={
            "periodDays": 7,
            "entries": [
                {"date": "2026-02-20", "emotion": "anxious"},
                {"date": "2026-02-21", "emotion": "anxious"},
            ],
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert "진단" not in body["comment"]
    assert "처방" not in body["comment"]
