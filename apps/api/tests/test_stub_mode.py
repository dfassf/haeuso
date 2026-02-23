from fastapi.testclient import TestClient

from app import main
from app.config import Settings


def _stub_settings() -> Settings:
    return Settings(
        gemini_api_key="",
        gemini_model="gemini-2.5-flash",
        llm_request_timeout_sec=30,
        llm_mode="stub",
    )


def test_comfort_uses_stub_response_without_llm(monkeypatch) -> None:
    async def fail_if_called(*args, **kwargs):  # noqa: ANN002, ANN003
        raise AssertionError("stub 모드에서는 LLM 함수가 호출되면 안 됩니다.")

    monkeypatch.setattr(main, "settings", _stub_settings())
    monkeypatch.setattr(main, "generate_comfort_line", fail_if_called)

    client = TestClient(main.app)
    response = client.post(
        "/api/v1/comfort",
        json={"content": "오늘은 조금 지쳤어요.", "emotion": "sad"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["category"] == "normal"
    assert body["resources"] == []
    assert body["message"].startswith("테스트 모드 응답입니다.")


def test_insight_uses_stub_response_without_llm(monkeypatch) -> None:
    async def fail_if_called(*args, **kwargs):  # noqa: ANN002, ANN003
        raise AssertionError("stub 모드에서는 LLM 함수가 호출되면 안 됩니다.")

    monkeypatch.setattr(main, "settings", _stub_settings())
    monkeypatch.setattr(main, "generate_period_comment", fail_if_called)

    client = TestClient(main.app)
    response = client.post(
        "/api/v1/insight",
        json={
            "periodDays": 7,
            "entries": [
                {"date": "2026-02-20", "emotion": "angry"},
                {"date": "2026-02-21", "emotion": "angry"},
            ],
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["dominantEmotion"] == "angry"
    assert body["comment"].startswith("테스트 모드 응답입니다.")
