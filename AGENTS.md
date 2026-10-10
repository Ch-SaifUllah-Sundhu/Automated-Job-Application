# AGENTS.md — Complete Codebase Handoff

> **Read this first.** This file is the single source of truth for any AI agent
> working on this project. It contains: architecture, current state, all known bugs,
> every task (done and pending), and precise file-by-file code maps.
>
> Last updated: 2026-10-10 | Current module: **4 (Done) → 5 (Next)**

---

## 1. Project Purpose

Automate the job application process end-to-end:
1. Search for jobs matching user's keywords (DuckDuckGo)
2. Draft tailored cover letters and resume bullets (Groq / Llama 3)
3. Save job data to Supabase
4. Show a dashboard for tracking application status (Module 7)
5. Auto-submit applications via Playwright (Module 8)

---

## 2. Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| AI Agent | LangGraph | ≥1.2 |
| LLM | Groq / llama3-8b-8192 | via langchain-groq ≥1.1 |
| Job Search | DuckDuckGo Search | duckduckgo-search ≥8.1 |
| Backend | FastAPI + Uvicorn | ≥0.143 / ≥0.54 |
| Database | Supabase (PostgreSQL + RLS) | supabase-py ≥2.32 |
| Frontend | Next.js (TypeScript) | in `/frontend` |
| Automation | Playwright | planned Module 8 |
| Python | 3.11+ | |
| Node | 18+ | |

---

## 3. Repository Structure

```
/
├── README.md              ← User-facing setup guide
├── AGENTS.md              ← THIS FILE — agent handoff doc
├── .env                   ← Secrets (gitignored — never commit)
├── .gitignore
├── schema.sql             ← Supabase table DDL
├── requirements.txt       ← Python dependencies
├── pytest.ini             ← Pytest config (marks: integration)
│
├── backend/
│   ├── agent.py           ← Module 4: LangGraph pipeline (CORE)
│   ├── main.py            ← Module 5 stub: FastAPI app
│   └── test_agent.py      ← Full test suite (15 tests)
│
├── frontend/              ← Next.js app (Modules 6–7, not yet built)
│   ├── src/app/
│   ├── package.json
│   └── next.config.ts
│
└── venv/                  ← Python virtualenv (gitignored)
```

---

## 4. Environment Variables (`.env`)

```env
SUPABASE_URL=https://evrvzmmkpyecetubcsdu.supabase.co
SUPABASE_KEY=<anon key>
NEXT_PUBLIC_SUPABASE_URL=https://evrvzmmkpyecetubcsdu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
GROQ_API_KEY=gsk_...
```

All consumed via `python-dotenv`. Path: `load_dotenv("../.env")` from inside `backend/`.

---

## 5. Database Schema (`schema.sql`)

### `profiles`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | FK → auth.users (PK) |
| full_name | TEXT | |
| phone | TEXT | |
| linkedin_url | TEXT | |
| github_url | TEXT | |
| base_resume_text | TEXT | Used by agent to draft cover letter |
| created_at | TIMESTAMPTZ | |

### `jobs`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK auto |
| title | TEXT | NOT NULL |
| company | TEXT | NOT NULL |
| url | TEXT | UNIQUE NOT NULL — used for upsert dedup |
| description | TEXT | |
| required_skills | TEXT | |
| source | TEXT | e.g. "DuckDuckGo" |
| created_at | TIMESTAMPTZ | |

### `applications`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK auto |
| user_id | UUID | FK → profiles(id) |
| job_id | UUID | FK → jobs(id) |
| status | TEXT | Default: 'Found' |
| tailored_resume_text | TEXT | |
| cover_letter_text | TEXT | |
| applied_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |

**RLS:** All 3 tables have Row Level Security enabled. Policies not yet written (Module 6 task).

---

## 6. Module 4 — Core Agent (`backend/agent.py`)

### Architecture: LangGraph Pipeline

```
search_jobs  →  draft_documents  →  save_to_database  →  END
```

### AgentState (TypedDict)

```python
class AgentState(TypedDict):
    keywords: str           # e.g. "Python Developer"
    location: str           # e.g. "Remote"
    user_resume: str        # candidate's resume text
    found_jobs: list        # raw DuckDuckGo results
    selected_job: dict|None # first job, chosen for drafting
    tailored_resume: str    # AI-rewritten resume bullets
    cover_letter: str       # AI-generated cover letter
    status: str             # human-readable pipeline status
    error: str|None         # last error, or None
```

### Node 1 — `search_jobs`
- Queries DuckDuckGo: `"{keywords} job openings in {location} site:linkedin.com OR ..."`
- Max 5 results, 3× retry with exponential back-off (2s, 4s)
- Helper: `_parse_ddg_result(r)` maps raw result → job dict
- Returns `status = "Jobs Found"` or `"Search Failed"`

### Node 2 — `draft_documents`
- Short-circuits if no GROQ_API_KEY → `"Drafting Failed"`
- Short-circuits if no found_jobs → `"No Jobs Found"`
- Calls `ChatGroq(model="llama3-8b-8192")` twice:
  1. Cover letter prompt (3 paragraphs, ≤300 words)
  2. Resume bullets (3 bullets starting with •)
- Inputs truncated to 500 chars (Groq 8k context guard)
- Returns `status = "Drafting Complete"` or `"Drafting Failed"`

### Node 3 — `save_to_database`
- Skips gracefully if: Supabase=None | upstream failed | job has no URL
- Calls `supabase.table("jobs").upsert(row, on_conflict="url")`
- **Does NOT save application row** — no user_id in agent scope (fix: Module 5)
- Returns `status = "Saved to DB"` or `"DB Skipped (...)"`

### Public API
```python
from agent import agent_app, AgentState
result = agent_app.invoke(initial_state)
```

---

## 7. Module 5 Stub — FastAPI (`backend/main.py`)

### Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Health check → `{"status": "ok", "version": "0.4.0"}` |
| POST | `/search-jobs` | Runs full LangGraph pipeline |

### Request / Response schemas

```python
class JobSearchRequest(BaseModel):
    keywords: str          # required, min_length=2
    location: str = "Remote"
    user_resume: str = ""

class JobSearchResponse(BaseModel):
    status: str
    jobs_found: int
    selected_job: dict | None
    cover_letter: str
    tailored_resume: str
    error: str | None
```

### Run the API
```bash
cd backend
uvicorn main:app --reload
# Swagger UI: http://localhost:8000/docs
```

---

## 8. Tests (`backend/test_agent.py`)

### How to run
```bash
pytest -m "not integration" -v    # unit + smoke (no network)
pytest -v                          # all tests (needs .env)
```

### Test inventory (15 total)

| Class | Test | Tier | What it covers |
|-------|------|------|----------------|
| TestSearchJobs | test_returns_mapped_jobs | Unit | DDG result → job schema |
| TestSearchJobs | test_empty_results_is_ok | Unit | Zero results, no error |
| TestSearchJobs | test_rate_limit_retry_succeeds | Unit | **B1** retry logic |
| TestSearchJobs | test_all_retries_exhausted | Unit | **B1** all 3 attempts fail |
| TestSearchJobs | test_company_extracted_from_title | Unit | "Title - Company" parsing |
| TestSearchJobs | test_company_fallback_when_no_dash | Unit | No dash → "Unknown" |
| TestDraftDocuments | test_fails_without_api_key | Unit | Missing GROQ_API_KEY |
| TestDraftDocuments | test_short_circuits_when_no_jobs | Unit | Empty found_jobs |
| TestDraftDocuments | test_success_path | Unit | Happy path, 2 LLM calls |
| TestDraftDocuments | test_groq_exception_is_caught | Unit | Groq raises RuntimeError |
| TestSaveToDatabase | test_skips_when_not_configured | Unit | supabase=None |
| TestSaveToDatabase | test_skips_on_pipeline_failure | Unit | Bad status passthrough |
| TestSaveToDatabase | test_skips_when_no_url | Unit | **B3** empty URL guard |
| TestSaveToDatabase | test_upsert_called_with_correct_data | Unit | Row data + call count |
| TestPipelineSmoke | test_full_pipeline_mocked | Smoke | End-to-end, all mocked |
| TestIntegration | test_real_search_and_draft | Integration | Real APIs (skipped in CI) |

---

## 9. Bug Tracker

| ID | Description | File | Severity | Status |
|----|-------------|------|----------|--------|
| B1 | DuckDuckGo rate-limits under rapid calls | `agent.py:search_jobs` | Medium | ✅ Fixed — 3× retry + back-off |
| B2 | `/search-jobs` has no authentication | `main.py` | 🔴 High | Open — fix in Module 5 |
| B3 | Application row not saved (no user_id) | `agent.py:save_to_database` | 🔴 High | Open — fix in Module 5 |
| B4 | Resume/JD truncated at 500 chars | `agent.py:draft_documents` | 🟡 Low | Acceptable for MVP |
| B5 | Supabase RLS policies not written | `schema.sql` | 🔴 High | Open — fix in Module 6 |

---

## 10. Complete Task List

### ✅ Done

- [x] **Module 1** — Project structure, Next.js + FastAPI init
- [x] **Module 2** — Supabase schema (profiles, jobs, applications tables + RLS enable)
- [x] **Module 3** — `.env` setup, `.gitignore`, secrets secured
- [x] **Module 4** — LangGraph agent: search → draft → save
  - [x] Supabase client with graceful fallback
  - [x] DuckDuckGo search with 3× retry + back-off (B1 fixed)
  - [x] Groq cover letter + resume bullet generation
  - [x] Supabase upsert on `jobs` table
  - [x] 15-test suite: unit + smoke + integration tier
  - [x] FastAPI `/search-jobs` stub wired to agent
- [x] Repository cleaned: GSD framework files removed from disk and git
- [x] `README.md` created with full setup guide
- [x] `AGENTS.md` created (this file)

---

### 🏃 Module 5 — FastAPI Routes (NEXT)

- [ ] `POST /apply` endpoint — save application row with authenticated user_id
- [ ] Supabase JWT auth middleware — protect all routes (fixes B2)
- [ ] Save `applications` row in `save_to_database` node with user context (fixes B3)
- [ ] Proper HTTP error codes per pipeline status (400 vs 500)
- [ ] Pydantic response models for all routes
- [ ] Test all endpoints with Swagger UI (`/docs`)
- [ ] `GET /applications` — list user's applications

---

### ⬜ Module 6 — Supabase Auth (Frontend)

- [ ] Install `@supabase/supabase-js` in Next.js
- [ ] Build Sign Up page (`/signup`)
- [ ] Build Log In page (`/login`)
- [ ] Implement session management (SSR cookies)
- [ ] Protect `/dashboard` — redirect unauthenticated users
- [ ] Write Supabase RLS policies for all 3 tables (fixes B5)

---

### ⬜ Module 7 — Dashboard UI

- [ ] Profile Settings page — resume upload, LinkedIn/GitHub links
- [ ] Kanban board — columns: Found / Applied / Interview / Offer / Rejected
- [ ] Connect frontend to FastAPI (React Query / fetch)
- [ ] Review modal — show cover letter, allow human edit before applying
- [ ] Application status updates

---

### ⬜ Module 8 — Playwright Automation

- [ ] Write Playwright script to fill standard job application forms
- [ ] Add as final LangGraph node: `apply_with_playwright`
- [ ] Handle CAPTCHAs gracefully (pause + notify user)
- [ ] Handle unknown form fields (log + skip)
- [ ] Retry logic for flaky page loads

---

## 11. How to Add a New Agent Session

When starting a new AI agent session on this project:

1. **Read this file (`AGENTS.md`) first** — do not start coding without it
2. Check Section 10 for current task status
3. Check Section 9 for open bugs before touching those areas
4. Run tests to confirm baseline: `pytest -m "not integration" -v`
5. Work on the first unchecked task in the current module
6. Update Section 10 checkboxes + Section 9 bug status when done
7. Commit: `git add -A && git commit -m "type(module-N): description"`
8. Push: `git push origin main`

---

## 12. Commands Reference

```bash
# Install all Python deps
pip install -r requirements.txt

# Run backend API
cd backend && uvicorn main:app --reload

# Run frontend
cd frontend && npm run dev

# Run tests (unit + smoke)
pytest -m "not integration" -v

# Run all tests (real APIs)
pytest -v

# Check git status
git status

# Push to GitHub
git add -A
git commit -m "feat(module-N): description"
git push origin main
```
