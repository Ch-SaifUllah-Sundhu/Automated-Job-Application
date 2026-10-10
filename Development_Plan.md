# Development Plan

## Phase 1: Foundation ✅ Complete
- Set up Supabase DB, Next.js frontend, FastAPI backend.
- Configured environment variables and `.gitignore`.

## Phase 2: Core Agent Engine ✅ Complete (Module 4)
- Built LangGraph workflow: Search → Draft → Save → END.
- DuckDuckGo job search with 3-attempt retry + exponential back-off.
- Groq / Llama 3 cover letter and resume bullet generation.
- Supabase job row persistence via upsert.
- Full test suite: unit tests, mocked smoke test, real integration tests.

### Phase 2 Known Bugs
| ID | Issue | Status |
|----|-------|--------|
| B1 | DDG rate-limit retry | ✅ Fixed in `agent.py` |
| B2 | No auth on `/search-jobs` | 🔴 Fix in Phase 3 |
| B3 | Application row not saved (no user_id) | 🔴 Fix in Phase 3 |
| B4 | Resume/JD truncated at 500 chars | 🟡 Acceptable for MVP |

## Phase 3: FastAPI Routes 🏃 Next
- Full REST endpoints with Pydantic validation.
- Supabase JWT auth middleware.
- Link endpoints to LangGraph agent with authenticated user context.
- Swagger UI testing.

## Phase 4: Frontend Integration
- Dashboard, Supabase Auth in Next.js.
- Connect frontend to FastAPI.
- Human-in-the-loop review modal.

## Phase 5: Automation
- Playwright scripts for actual job form submission.
- Integrate as final LangGraph node.
- Graceful failure handling (CAPTCHAs, unknown fields).
