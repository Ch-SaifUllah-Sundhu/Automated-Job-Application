# Project Tracker & Task Breakdown

## 1. Project Setup [✅ Done]
- [x] Create project directory structure.
- [x] Initialize Next.js frontend with Tailwind.
- [x] Initialize Python FastAPI backend and virtual environment.

## 2. Database Schema [✅ Done]
- [x] Design Supabase tables (Profiles, Jobs, Applications).
- [x] Write `schema.sql` for table creation.
- [x] Configure Row Level Security (RLS) policies.

## 3. Environment Variables [✅ Done]
- [x] Create `.env` files.
- [x] Securely store Supabase URL and Anon Key.
- [x] Securely store Groq API (Llama 3) Key.
- [x] Update `.gitignore` to protect sensitive data.

## 4. Core Agent (Backend) [✅ Done]
- [x] Connect Python script to Supabase client.
- [x] Implement DuckDuckGo Search API for fetching jobs (with 3-attempt retry + back-off).
- [x] Implement Groq API (Llama 3) for generating tailored cover letters and resume bullets.
- [x] Build LangGraph state machine (Search → Draft → Save → END).
- [x] Write full test suite: unit, smoke (mocked), and integration tests.
- [x] Wire `/search-jobs` stub in FastAPI `main.py`.

### Known Bugs / Limitations (Module 4)
| # | Description | Location | Severity | Fix Planned In |
|---|-------------|----------|----------|----------------|
| B1 | DuckDuckGo rate-limits: DDGS().text() throws RateLimitException under rapid calls | `agent.py:search_jobs` | Medium | ✅ Fixed — 3-retry with exponential back-off |
| B2 | No auth on `/search-jobs` endpoint — any caller can trigger the pipeline | `main.py` | High | Module 6 (Supabase Auth middleware) |
| B3 | `save_to_database` saves job only, NOT application row (no user_id in agent scope) | `agent.py:save_to_database` | Medium | Module 5 (FastAPI auth context) |
| B4 | Groq context window: long resumes/JDs truncated to 500 chars | `agent.py:draft_documents` | Low | Module 5 (chunking strategy) |

## 5. FastAPI Routes [🏃 Next Up]
- [ ] Set up full REST API endpoints (`/search-jobs`, `/apply`).
- [ ] Create Pydantic models for request/response validation.
- [ ] Link API endpoints to LangGraph agent execution with user context.
- [ ] Add Supabase JWT auth middleware to protect routes.
- [ ] Test APIs using Swagger UI (`/docs`).

## 6. Supabase Auth (Frontend) [⬜ Null]
- [ ] Install Supabase JS client in Next.js.
- [ ] Create Sign Up / Log In pages.
- [ ] Implement session management.
- [ ] Protect dashboard routes (redirect unauthenticated users).

## 7. Frontend Dashboard [⬜ Null]
- [ ] Build Profile Settings page (resume upload).
- [ ] Build Kanban board UI for job tracking.
- [ ] Connect frontend API calls to FastAPI backend.
- [ ] Build review modal for human-in-the-loop approval.

## 8. Web Automation (Playwright) [⬜ Null]
- [ ] Write Python Playwright script to fill basic application forms.
- [ ] Integrate Playwright script into LangGraph as the final node.
- [ ] Handle failures (e.g., CAPTCHAs, unknown fields) gracefully.
