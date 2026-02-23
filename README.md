# 해우소 모노레포

해우소 MVP 프로젝트입니다.

- `apps/web`: Vite + React 기반 모바일 친화 UI
- `apps/api`: FastAPI 기반 공감 문구/감정 요약 API

## 웹 실행

```bash
cd /Users/test/Desktop/private_repo/haeuso
npm install
npm run dev:web
```

- 기본 주소: `http://localhost:5173`

### 웹 런타임 모드

`/Users/test/Desktop/private_repo/haeuso/apps/web/.env`에 아래 값을 설정하면 동작 모드를 분리할 수 있습니다.

```bash
VITE_API_BASE_URL=http://localhost:8000
VITE_COMFORT_SOURCE=api   # api | local
VITE_JOURNAL_STORE=local  # local | memory
```

- `VITE_COMFORT_SOURCE=api`: 백엔드 `/api/v1/comfort` 호출
- `VITE_COMFORT_SOURCE=local`: 프런트 로컬 템플릿 응답 사용(테스트용)
- `VITE_JOURNAL_STORE=local`: 감정 기록을 브라우저 `localStorage`에 저장
- `VITE_JOURNAL_STORE=memory`: 새로고침 시 사라지는 메모리 저장

## API 실행

```bash
cd /Users/test/Desktop/private_repo/haeuso/apps/api
python3 -m venv .venv
source .venv/bin/activate
pip install -e .
uvicorn app.main:app --reload --port 8000
```

- 기본 주소: `http://localhost:8000`

## 현재 제품 방향

- 공개 피드/댓글/DM 기능은 제외
- 사용자가 입력한 원문 텍스트는 저장하지 않음
- 감정 메타데이터만 24시간 보관 후 자동 만료
- 감정 기록은 사용자 삭제 가능
- 주간/월간 감정 흐름 요약은 API로 계산(서버 DB 영구 저장 없음)
- API 모드에서는 LLM 호출 전 PII를 마스킹하여 전달
