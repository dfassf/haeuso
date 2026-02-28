from __future__ import annotations

import asyncio
from functools import lru_cache

from google import genai
from google.genai import types

from app.config import settings


class LLMNotConfiguredError(RuntimeError):
    pass


class LLMRequestError(RuntimeError):
    pass


@lru_cache(maxsize=1)
def _client() -> genai.Client:
    if not settings.gemini_api_key:
        raise LLMNotConfiguredError("GEMINI_API_KEY가 설정되지 않았습니다.")

    return genai.Client(api_key=settings.gemini_api_key)


async def _generate_text(
    *,
    system_instruction: str,
    prompt: str,
    temperature: float,
    max_output_tokens: int,
    thinking_budget: int,
) -> str:
    try:
        coro = _client().aio.models.generate_content(
            model=settings.gemini_model,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=temperature,
                max_output_tokens=max_output_tokens,
                thinking_config=types.ThinkingConfig(thinking_budget=thinking_budget),
            ),
        )
        response = await asyncio.wait_for(coro, timeout=settings.llm_request_timeout_sec)
    except LLMNotConfiguredError:
        raise
    except asyncio.TimeoutError as exc:
        raise LLMRequestError("LLM 응답 시간이 초과되었습니다.") from exc
    except Exception as exc:  # pragma: no cover - provider/network runtime errors
        raise LLMRequestError("LLM 요청 중 오류가 발생했습니다.") from exc

    text = (response.text or "").strip()
    if not text:
        raise LLMRequestError("LLM 빈 응답")

    return text


async def generate_comfort_line(*, emotion_label: str, content: str) -> str:
    system_instruction = (
        "당신은 한국어 공감 메시지를 짧게 전하는 도우미입니다. "
        "해결책/조언/훈계/진단을 하지 말고 감정을 먼저 알아주세요. "
        "응답은 반드시 2문장, 총 120자 이내로 작성하세요. "
        "클리셰 표현(예: 힘내세요) 사용을 피하세요."
    )
    prompt = (
        "[사용자 입력]\n"
        f"감정: {emotion_label}\n"
        f"내용: {content}\n\n"
        "조건:\n"
        "- 공감 중심, 따뜻한 톤\n"
        "- 의학적 판단 금지\n"
        "- 한국어만 사용\n"
        "- 결과는 순수 문장만 반환"
    )

    return await _generate_text(
        system_instruction=system_instruction,
        prompt=prompt,
        temperature=0.6,
        max_output_tokens=160,
        thinking_budget=0,
    )


async def generate_period_comment(*, period_days: int, emotion_counts: dict[str, int], total: int) -> str:
    system_instruction = (
        "당신은 감정 기록을 다정하게 요약하는 도우미입니다. "
        "판단/진단/치료 권고를 하지 말고, 관찰과 자기돌봄 힌트만 제시하세요. "
        "응답은 2~3문장, 총 180자 이내의 한국어로 작성하세요."
    )

    counts_text = ", ".join(f"{k}:{v}" for k, v in emotion_counts.items())
    prompt = (
        f"최근 {period_days}일 기록 수: {total}\n"
        f"감정 분포: {counts_text}\n\n"
        "조건:\n"
        "- 분포에서 보이는 흐름을 부드럽게 설명\n"
        "- 자기돌봄 힌트 1개 포함\n"
        "- 의료적 표현/확정적 진단 금지\n"
        "- 한국어만 사용"
    )

    return await _generate_text(
        system_instruction=system_instruction,
        prompt=prompt,
        temperature=0.4,
        max_output_tokens=220,
        thinking_budget=0,
    )
