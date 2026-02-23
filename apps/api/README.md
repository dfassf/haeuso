# Haeuso API

FastAPI backend for:
- `POST /api/v1/comfort`
- `POST /api/v1/insight`

## LLM model
- Default: `gemini-2.5-flash`

## Environment variables
- `GEMINI_API_KEY`
- `GEMINI_MODEL` (optional, default `gemini-2.5-flash`)
- `LLM_REQUEST_TIMEOUT_SEC` (optional)
- `LLM_MODE` (optional, `live` | `stub`, default `live`)

### Test mode (`LLM_MODE=stub`)

비즈니스 로직 테스트 시 외부 LLM 호출 없이 하드코딩 응답을 반환합니다.

- `POST /api/v1/comfort`: 감정별 고정 문구 반환
- `POST /api/v1/insight`: 집계 결과 기반 고정 코멘트 반환

## Privacy & Safety

- `POST /api/v1/comfort`는 LLM 호출 전에 룰베이스 정규식으로 PII를 마스킹합니다.
  - 이메일, 휴대전화, 주민번호, 사업자번호, 카드번호
- PII 탐지 시 요청을 실패시키지 않고, 마스킹된 텍스트만 LLM에 전달합니다.
- LLM 응답이 진단/처방 같은 의료적 단정 톤을 포함하면 fallback 문구로 자동 치환합니다.
- API는 `mode`, `fallback_used`, `guardrail_triggered`, `pii_detected`, `duration_ms` 등의 구조화 로그를 남깁니다.

## Testing

`stub` 모드로 외부 LLM 의존성 없이 비즈니스 로직 테스트를 수행할 수 있습니다.

```bash
cd /Users/test/Desktop/private_repo/haeuso/apps/api
pip install -e ".[dev]"
LLM_MODE=stub pytest -q
```

No server-side journal persistence is included in this scaffold.
