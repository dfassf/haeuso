# 해우소 API

해우소 백엔드(FastAPI)입니다.

- `POST /api/v1/comfort`: 공감 문구 생성
- `POST /api/v1/insight`: 기간 감정 분포 요약

## 기본 LLM 모델

- 기본값: `gemini-2.5-flash`

## 환경 변수

- `GEMINI_API_KEY`
- `GEMINI_MODEL` (선택, 기본 `gemini-2.5-flash`)
- `LLM_REQUEST_TIMEOUT_SEC` (선택)
- `LLM_MODE` (선택, `live` | `stub`, 기본 `live`)

### 테스트 모드 (`LLM_MODE=stub`)

비즈니스 로직 테스트 시 외부 LLM 호출 없이 하드코딩 응답을 반환합니다.

- `POST /api/v1/comfort`: 감정별 고정 문구
- `POST /api/v1/insight`: 집계 결과 기반 고정 코멘트

## 개인정보/안전 처리

- `POST /api/v1/comfort`는 LLM 호출 전에 룰베이스 정규식으로 PII를 마스킹합니다.
  - 이메일, 휴대전화, 주민번호, 사업자번호, 카드번호
- PII가 탐지되어도 요청을 실패시키지 않고, 마스킹된 텍스트만 LLM으로 전달합니다.
- LLM 응답이 진단/처방 같은 의료적 단정 톤을 포함하면 fallback 문구로 자동 치환합니다.
- `mode`, `fallback_used`, `guardrail_triggered`, `pii_detected`, `duration_ms` 등의 구조화 로그를 기록합니다.

## 테스트 실행

```bash
cd backend
pip install -e ".[dev]"
LLM_MODE=stub pytest -q
```

현재 스캐폴딩에는 서버 측 영구 저널 DB 저장 기능이 포함되어 있지 않습니다.
