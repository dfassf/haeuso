from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
LOCAL_ENV_PATH = PROJECT_ROOT / ".env"


def _read_env_file_value(path: Path, key: str) -> str:
    if not path.exists():
        return ""

    try:
        for raw_line in path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue

            current_key, current_value = line.split("=", 1)
            if current_key.strip() != key:
                continue

            return current_value.strip().strip('"').strip("'")
    except OSError:
        return ""

    return ""


@dataclass(frozen=True)
class Settings:
    gemini_api_key: str
    gemini_model: str
    llm_request_timeout_sec: int
    llm_mode: str


def _resolve_gemini_api_key() -> str:
    direct = os.getenv("GEMINI_API_KEY", "").strip()
    if direct:
        return direct

    return _read_env_file_value(LOCAL_ENV_PATH, "GEMINI_API_KEY")


def _resolve_int(name: str, default: int) -> int:
    raw = os.getenv(name, "").strip()
    if not raw:
        return default

    try:
        parsed = int(raw)
    except ValueError:
        return default

    return max(1, parsed)


def _resolve_llm_mode() -> str:
    direct = os.getenv("LLM_MODE", "").strip().lower()
    if not direct:
        direct = _read_env_file_value(LOCAL_ENV_PATH, "LLM_MODE").strip().lower()

    if direct in {"live", "stub"}:
        return direct

    return "live"


def get_settings() -> Settings:
    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip() or "gemini-2.5-flash"
    timeout_sec = _resolve_int("LLM_REQUEST_TIMEOUT_SEC", 30)

    return Settings(
        gemini_api_key=_resolve_gemini_api_key(),
        gemini_model=model,
        llm_request_timeout_sec=timeout_sec,
        llm_mode=_resolve_llm_mode(),
    )


settings = get_settings()
