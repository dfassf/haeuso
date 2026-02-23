# Haeuso Monorepo

Haeuso(해우소) MVP scaffold with:
- `apps/web`: Vite + React (mobile-first UI)
- `apps/api`: FastAPI (comfort line + period insight API)

## 1) Web (Vite + React)

```bash
cd /Users/test/Desktop/private_repo/haeuso
npm install
npm run dev:web
```

Default web URL: `http://localhost:5173`

### Web runtime modes

`apps/web/.env`에 아래 값을 넣으면 동작 모드를 분리할 수 있습니다.

```bash
VITE_API_BASE_URL=http://localhost:8000
VITE_COMFORT_SOURCE=api   # api | local
VITE_JOURNAL_STORE=local  # local | memory
```

- `VITE_COMFORT_SOURCE=api`: 백엔드 `/comfort` 호출
- `VITE_COMFORT_SOURCE=local`: 프런트 로컬 템플릿 응답 사용(테스트용)
- `VITE_JOURNAL_STORE=local`: 감정 기록을 `localStorage`에 저장
- `VITE_JOURNAL_STORE=memory`: 새로고침 시 사라지는 메모리 저장

## 2) API (FastAPI)

```bash
cd /Users/test/Desktop/private_repo/haeuso/apps/api
python3 -m venv .venv
source .venv/bin/activate
pip install -e .
uvicorn app.main:app --reload --port 8000
```

Default API URL: `http://localhost:8000`

## Product direction in this scaffold

- Public comments/feeds/DM are not included.
- Personal records keep only `emotion` metadata in local browser storage for 24 hours.
- Journal entries are deletable by the user.
- Weekly/monthly aggregate insight is supported via API call, without server-side persistence.
- In API mode, free-text input is not stored and is PII-masked before LLM calls.
