# AGENTS.md — Complete Codebase Handoff

> **Read this first.** This file is the single source of truth for any AI agent
> or developer working on this project. Contains: architecture, current state,
> all known bugs, every task (done and pending), precise file-by-file code maps,
> and coding standards.
>
> Last updated: 2026-10-11 | Current module: **6 (Done) → 7 (Next)**
> Research basis: Competitive analysis of Simplify, Teal, Jobscan, LazyApply.

---

## 1. Project Purpose

**Job Application Assistant** — a multi-tenant SaaS platform that automates the
full job application lifecycle end-to-end:

1. **Search** — query 10+ job portals via DuckDuckGo (Module 4 ✅)
2. **Score** — compute Sentence-BERT semantic embeddings (`all-MiniLM-L6-v2`) + Supabase pgvector match % (Module 7)
3. **Tailor** — generate cover letters + resume bullets via Groq/Llama 3 (Module 4 ✅)
4. **Review** — human-in-loop approval before submission (Module 8)
5. **Submit** — headless Playwright automation (Module 9)
6. **Track** — Kanban dashboard for all applications (Module 7)
7. **Monetize** — Stripe Free/Pro tiers (Module 10)

**Competitive moat:** No single competitor (Simplify, Teal, Jobscan, LazyApply)
combines all four pillars — Search, Score, Tailor, Submit — in one product.

---

## 2. Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| AI Agent | LangGraph | ≥1.2 |
| LLM | Groq / llama3-8b-8192 | via langchain-groq ≥1.1 |
| Job Search | DuckDuckGo Search | duckduckgo-search ≥8.1 |
| Backend | FastAPI + Uvicorn | ≥0.143 / ≥0.54 |
| Database | Supabase (PostgreSQL + RLS + pgvector) | supabase-py ≥2.32 |
| Semantic Matching | Sentence-BERT (`all-MiniLM-L6-v2`) + pgvector | Module 7 |
| Task Queue | Celery + Redis | celery ≥5.3, redis ≥5.0 |
| Headless Browser | Playwright + playwright-stealth | Module 9 |
| Frontend | Next.js TypeScript + Tailwind | in `/frontend` |
| UI Components | shadcn/ui + @dnd-kit/core | Module 7 |
| Auth | Supabase Auth (OAuth + Email) | Module 6 |
| Payments | Stripe | Module 10 |
| Chrome Extension | Manifest V3 | Module 12 |
| Python | 3.11+ | |
| Node | 18+ | |

---

## 3. Repository Structure

```
/
├── AGENTS.md              ← THIS FILE — always update when done with a module
├── README.md
├── .env                   ← Secrets (gitignored — never commit)
├── .gitignore
├── schema.sql             ← Full Supabase table DDL + RLS policies
├── requirements.txt       ← Python dependencies
├── pytest.ini             ← Pytest config (marks: integration)
│
├── backend/
│   ├── main.py            ← FastAPI app factory (EXISTING, refactor in Module 5)
│   ├── agent.py           ← LangGraph pipeline (EXISTING, expand in Modules 7/8)
│   ├── config.py          ← pydantic-settings (Module 5)
│   ├── dependencies.py    ← get_current_user(), require_pro_tier() (Module 5)
│   │
│   ├── routers/           ← One file per route group (Module 5+)
│   │   ├── auth.py
│   │   ├── jobs.py
│   │   ├── applications.py
│   │   ├── profile.py
│   │   ├── subscriptions.py
│   │   └── interview.py
│   │
│   ├── services/          ← Business logic, no HTTP concerns (Module 5+)
│   │   ├── agent_service.py
│   │   ├── embedding_service.py   ← SBERT vectorizer (Module 7)
│   │   ├── match_service.py       ← Semantic cosine similarity scorer (Module 7)
│   │   ├── resume_parser.py
│   │   ├── stripe_service.py
│   │   └── notification_service.py
│   │
│   ├── workers/           ← Celery background tasks (Module 8/9)
│   │   ├── celery_app.py
│   │   └── tasks/
│   │       ├── automation_task.py
│   │       └── search_task.py
│   │
│   ├── test_agent.py      ← Existing 15-test suite (Module 4)
│   └── tests/             ← New tests per module (Module 5+)
│       ├── test_auth.py
│       ├── test_match.py
│       ├── test_applications.py
│       └── test_automation.py
│
├── frontend/              ← Next.js TypeScript (EXISTING, build out Modules 6-12)
│   └── src/
│       ├── app/
│       │   ├── (auth)/login/ and /signup/    ← Module 6
│       │   ├── onboarding/                   ← Module 6
│       │   ├── dashboard/                    ← Modules 7-9
│       │   │   ├── page.tsx (Kanban board)
│       │   │   ├── jobs/page.tsx
│       │   │   ├── applications/page.tsx
│       │   │   └── review/[id]/page.tsx
│       │   ├── interview/[id]/page.tsx       ← Module 11
│       │   └── billing/page.tsx             ← Module 10
│       ├── components/
│       │   ├── jobs/ (JobCard, MatchBadge, ApplyButton)
│       │   ├── applications/ (KanbanBoard, ReviewModal)
│       │   └── layout/ (Sidebar, Navbar)
│       ├── lib/
│       │   ├── supabase/ (client.ts, server.ts)
│       │   ├── api.ts
│       │   └── utils.ts
│       └── hooks/ (useAuth, useJobs, useApplications)
│
└── extension/             ← Chrome Extension MV3 (Module 12)
    ├── manifest.json
    ├── service-worker.js
    ├── content.js
    └── popup/
```

---

## 4. Environment Variables (`.env`)

```env
# ── Supabase ──────────────────────────────────────────────────
SUPABASE_URL=https://evrvzmmkpyecetubcsdu.supabase.co
SUPABASE_KEY=<anon key>
NEXT_PUBLIC_SUPABASE_URL=https://evrvzmmkpyecetubcsdu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>

# ── Groq ─────────────────────────────────────────────────────
GROQ_API_KEY=gsk_...

# ── Stripe (add when starting Module 10) ─────────────────────
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...

# ── Redis (add when starting Module 8) ───────────────────────
REDIS_URL=redis://localhost:6379/0

# ── Next.js (add when starting Module 6) ─────────────────────
NEXT_PUBLIC_API_URL=http://localhost:8000
```

All consumed via `python-dotenv`. Path: `load_dotenv("../.env")` from inside `backend/`.

---

## 5. Database Schema

### Existing Tables (Module 1-4)

**`profiles`** — user personal info + base resume text
**`jobs`** — deduplicated job listings from DDG search (upsert on `url`)
**`applications`** — links user → job, stores generated documents + status

### New Tables (add to Supabase — see full SQL in schema.sql)

**`subscriptions`** — synced from Stripe webhooks
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| user_id | UUID | FK → profiles(id), UNIQUE |
| stripe_customer_id | TEXT | UNIQUE |
| stripe_sub_id | TEXT | UNIQUE |
| plan | TEXT | 'free' \| 'pro' |
| status | TEXT | 'active' \| 'canceled' \| 'past_due' |
| current_period_end | TIMESTAMPTZ | check this for access control |

**`automation_logs`** — per-attempt Playwright execution logs
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| application_id | UUID | FK → applications(id) |
| event | TEXT | 'started' \| 'captcha_detected' \| 'submitted' \| 'failed' |
| detail | TEXT | human-readable description |
| screenshot_url | TEXT | Supabase Storage path |

**`interview_sessions`** — generated mock interview questions
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| user_id | UUID | FK → profiles(id) |
| job_id | UUID | FK → jobs(id) |
| questions | JSONB | array of {question, category, ideal_answer_points} |

**`notifications`** — in-app real-time notifications
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| user_id | UUID | FK → profiles(id) |
| type | TEXT | 'application_ready' \| 'submitted' \| 'missing_data' |
| payload | JSONB | |
| is_read | BOOLEAN | default false |

### Vector & Semantic Matching Schema (Module 7)
```sql
-- Enable PostgreSQL Vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Dense 384-dimensional embeddings (Sentence-BERT all-MiniLM-L6-v2)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS embedding vector(384);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS embedding vector(384);

-- Application match tracking & missing skill gaps
ALTER TABLE applications ADD COLUMN IF NOT EXISTS match_score     NUMERIC(5,2);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS missing_skills  JSONB;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS missing_fields  JSONB; -- Module 8 form fields
ALTER TABLE applications ADD COLUMN IF NOT EXISTS review_status   TEXT DEFAULT 'pending';
-- review_status: 'pending' | 'approved' | 'rejected'

-- High-performance HNSW vector index for cosine distance
CREATE INDEX IF NOT EXISTS idx_jobs_embedding ON jobs USING hnsw (embedding vector_cosine_ops);
```

**RLS:** All tables have RLS enabled. Full policy SQL in `schema.sql`.

---

## 6. Module 4 — Core Agent (`backend/agent.py`) — COMPLETE

### Current LangGraph Pipeline
```
search_jobs → draft_documents → save_to_database → END
```

### Module 7 & 8 Expanded Pipeline
```
search_jobs → detect_missing_skills → draft_documents
           → [HUMAN INTERRUPT (Module 8)] → save_to_database → END
```

The interrupt uses LangGraph's built-in checkpointing. Pipeline pauses after
`draft_documents`, waits for `PATCH /applications/{id}/approve` to resume.

---

## 7. FastAPI API Surface (Planned — Modules 5-11)

| Method | Path | Module | Auth | Description |
|--------|------|--------|------|-------------|
| GET | `/` | 4 | No | Health check |
| GET | `/auth/me` | 5 | Yes | Current user profile |
| POST | `/auth/logout` | 5 | Yes | Revoke session |
| POST | `/search-jobs` | 5 | Yes | Run LangGraph pipeline |
| GET | `/jobs` | 5 | Yes | Paginated job list |
| POST | `/apply` | 5 | Yes | Create application + trigger draft |
| GET | `/applications` | 5 | Yes | List user's applications |
| PATCH | `/applications/{id}/approve` | 8 | Yes | Approve → queue Celery task |
| PATCH | `/applications/{id}/status` | 7 | Yes | Update Kanban column |
| GET | `/profile` | 5 | Yes | Get user profile |
| PUT | `/profile` | 5 | Yes | Update profile fields |
| POST | `/profile/resume` | 5 | Yes | Upload + parse resume file |
| POST | `/billing/checkout` | 10 | Yes | Get Stripe checkout URL |
| POST | `/billing/portal` | 10 | Yes | Get Stripe portal URL |
| POST | `/billing/webhook` | 10 | No* | Stripe webhook (sig verify) |
| POST | `/interview-prep` | 11 | Pro | Generate mock questions |

---

## 8. Bug Tracker

| ID | Description | File | Severity | Status |
|----|-------------|------|----------|--------|
| B1 | DuckDuckGo rate-limits | `agent.py:search_jobs` | Medium | ✅ Fixed — 3× retry + back-off |
| B2 | No auth on `/search-jobs` | `main.py` / `routers/jobs.py` | 🔴 High | ✅ Fixed — get_current_user required |
| B3 | Application row not saved (no user_id) | `agent.py:save_to_database` | 🔴 High | ✅ Fixed — user_id in AgentState |
| B4 | Resume/JD truncated at 500 chars | `agent.py:draft_documents` | 🟡 Low | Acceptable for MVP |
| B5 | Supabase RLS policies not written | `schema.sql` | 🔴 High | ✅ Full SQL written in schema.sql |

---

## 9. Complete Task List

### ✅ Done (Modules 1–5)

- [x] **Module 1** — Project structure: Next.js + FastAPI init
- [x] **Module 2** — Supabase schema (profiles, jobs, applications + RLS enable)
- [x] **Module 3** — `.env` setup, `.gitignore`, secrets secured
- [x] **Module 4** — LangGraph agent: search → draft → save
  - [x] DuckDuckGo search across 10 portals with 3× retry back-off (B1 fixed)
  - [x] Groq cover letter + resume bullet generation
  - [x] Supabase upsert on `jobs` table
  - [x] 18-test suite: unit + smoke + integration tier
  - [x] FastAPI `/search-jobs` stub wired to agent
- [x] **Module 5** — FastAPI Auth & Core Routes
  - [x] `backend/config.py` — pydantic-settings BaseSettings
  - [x] `backend/dependencies.py` — `get_current_user()` dependency (Supabase JWT verification)
  - [x] `backend/routers/auth.py` — `GET /auth/me`, `POST /auth/logout`
  - [x] `backend/routers/jobs.py` — `/search-jobs`, paginated `GET /jobs`
  - [x] `backend/routers/applications.py` — `POST /apply`, `GET /applications`, `PATCH /status`
  - [x] `backend/routers/profile.py` — `GET/PUT /profile`, `POST /profile/resume`
  - [x] `backend/services/resume_parser.py` — PDF + DOCX parser
  - [x] `backend/main.py` — refactored application factory with modular routers
  - [x] 40 tests passing cleanly across all suites (`pytest -v`)
  - [x] Updated `requirements.txt` with: `pydantic-settings`, `pdfminer.six`, `python-docx`, `python-multipart`
  - [x] Comprehensive test suites: `backend/tests/test_auth.py`, `test_applications.py`, `test_jobs.py`, `test_profile.py`

---

### ✅ Module 6 — Frontend Auth & Onboarding (COMPLETE)

- [x] `npm install @supabase/supabase-js @supabase/ssr`
- [x] `frontend/src/lib/supabase/client.ts` — `createBrowserClient()`
- [x] `frontend/src/lib/supabase/server.ts` — `createServerClient()` with cookie adapter
- [x] `frontend/src/middleware.ts` — zero-trust route protection closing all unauthenticated backdoors to `/dashboard/**`, `/onboarding`, etc.
- [x] `frontend/src/app/(auth)/login/page.tsx` — Email/password + Google & GitHub SSO + Forgot password
- [x] `frontend/src/app/(auth)/signup/page.tsx` — Registration + Google & GitHub SSO + 6-digit OTP verification flow
- [x] `frontend/src/app/(auth)/forgot-password/page.tsx` — Password recovery email dispatch
- [x] `frontend/src/app/(auth)/reset-password/page.tsx` — Token-based credential reset flow
- [x] `frontend/src/app/dashboard/page.tsx` — Authenticated workspace dashboard with session telemetry, real sign out, and danger zone account deletion
- [x] `frontend/src/app/page.tsx` — High-conversion enterprise hero landing page with brand logo
- [x] `frontend/src/app/not-found.tsx` — Branded dark-mode custom 404 page
- [x] `frontend/src/hooks/useAuth.ts` — `user`, `session`, `signIn`, `signUp`, `signOut`, `signInWithOAuth`, `resetPassword`, `updatePassword`, `verifyOtp`, `resendOtp`
- [x] `frontend/src/lib/api.ts` — centralized API client for backend communication
- [x] `frontend/src/app/auth/callback/route.ts` — OAuth callback & recovery token handler
- [x] Verified full build with `npm run build` (0 TypeScript / Next.js errors)
- [x] 40/40 backend tests passing cleanly (`pytest -v`)

---

### 🏃 Module 7 — Job Dashboard & Semantic Match Scoring

> **Design change (2026-10-24):** TF-IDF + NLTK replaced by embedding-based semantic matching (Sentence-BERT `all-MiniLM-L6-v2`) stored in Supabase pgvector. SBERT captures semantic context, synonyms, and paraphrasing that word-frequency models miss. A secondary skill-overlap score provides explainability.

**7A. Vector storage (pgvector)**
- [ ] **Migration**: Enable `vector` extension; add `embedding vector(384)` to `profiles` and `jobs`; add `match_score` (numeric), `missing_skills` (jsonb) to `applications`. Update `schema.sql`.
- [ ] **Index**: Create HNSW index with `vector_cosine_ops` on `jobs.embedding`; verify RLS policies scope rows per user.
- [ ] **Re-embed trigger**: Recompute profile embedding whenever a resume is uploaded or profile is updated (hook into `POST /profile/resume`).

**7B. Embedding & match services**
- [ ] **Embedding Service**: Create `backend/services/embedding_service.py` using `sentence-transformers` (`all-MiniLM-L6-v2`, 384 dims). Batch-encode and chunk resumes/JDs by section.
- [ ] **Match Scorer**: Create `backend/services/match_service.py` — cosine similarity between resume and JD chunk embeddings, aggregated to a calibrated 0–100 score; weighted blend with skill-overlap score.
- [ ] **Match API**: Update `GET /jobs` to return `match_score` per job for authenticated user; support `sort=match_score`.
- [ ] **Dependencies**: Add `sentence-transformers` to `requirements.txt`.

**7C. Agent: missing skills**
- [ ] **Missing Skills Node**: Add `detect_missing_skills` node to LangGraph pipeline — Groq extracts JD skills, compared to candidate skills by embedding similarity threshold (e.g. "JS" vs "JavaScript"). Emits `missing_skills[]` to `AgentState`.
- [ ] **Naming distinction**: Keep `detect_missing_fields` (form input fields) reserved for Module 8's review modal.

**7D. Frontend**
- [ ] **Job Listing Page**: Build `frontend/src/app/dashboard/jobs/page.tsx` with debounced keyword, location, and portal filters with `sort=match_score`.
- [ ] **Job Card Component**: Build `frontend/src/components/jobs/JobCard.tsx` with color-coded match score SVG ring and missing-skills chips.
- [ ] **Kanban Board**: Build dynamic drag-and-drop Kanban in `frontend/src/app/dashboard/page.tsx` across 5 stages (Discovered, Applied, Interview, Offer, Rejected) using `@dnd-kit`.
- [ ] **Status Persistence**: Wire column transitions to `PATCH /applications/{id}/status` with optimistic updates and error rollback.

**7E. Tests & verification**
- [ ] **Scoring tests**: Synonym pairs score high, unrelated job scores low, 0–100 calibration verified.
- [ ] **Skill-gap tests**: Alias handling and missing skill detection verified.
- [ ] **API tests**: `GET /jobs` returns `match_score`, sorting verified, RLS isolation confirmed.
- [ ] **Frontend**: `npm run build` passes with 0 errors.

---

### ⬜ Module 8 — Human-in-Loop Review + Background Workers

- [ ] LangGraph Interrupt checkpoint — after `draft_documents`; resume on `/approve`
- [ ] `backend/workers/celery_app.py` — Celery instance, Redis broker
- [ ] `backend/workers/tasks/automation_task.py` — Playwright task skeleton
- [ ] `PATCH /applications/{id}/approve` — triggers Celery automation task
- [ ] `frontend/src/app/dashboard/review/[id]/page.tsx` — review page (side-by-side, editable)
- [ ] Missing Data Modal — per-field auto-generate vs manual input
- [ ] Supabase Realtime subscription on `applications` table for live status updates
- [ ] Update `requirements.txt`: `celery>=5.3.0`, `redis>=5.0.0`
- [ ] Add `REDIS_URL` to `.env`

---

### ⬜ Module 9 — Playwright Automation Engine

- [ ] `pip install playwright playwright-stealth && playwright install chromium`
- [ ] `backend/workers/tasks/automation_task.py` — full implementation:
  - Load application + profile from Supabase
  - Launch Playwright with stealth config + realistic user-agent
  - Field detection algorithm: aria-label > placeholder > name > id priority
  - Fill form using FIELD_MAP
  - Screenshot before/after submit → Supabase Storage
  - Log all events to `automation_logs`
  - CAPTCHA detection → pause + notify user
  - Update `application.status = 'Applied'` on success
- [ ] Supabase Storage bucket: `automation-screenshots` (create in dashboard)
- [ ] Tests: `backend/tests/test_automation.py`

---

### ⬜ Module 10 — Stripe Subscriptions

- [ ] `backend/services/stripe_service.py` — checkout session, portal session, webhook handler
- [ ] `backend/routers/subscriptions.py` — `/billing/checkout`, `/billing/portal`, `/billing/webhook`
- [ ] `backend/dependencies.py` — add `require_pro_tier()` dependency
- [ ] Redis rate limiting per user per day in `dependencies.py`
- [ ] Webhook events: `checkout.session.completed`, `subscription.updated`, `subscription.deleted`
- [ ] `frontend/src/app/billing/page.tsx` — plan display, upgrade CTA, portal link
- [ ] Usage quota indicators on dashboard header
- [ ] Update `requirements.txt`: `stripe>=10.0.0`
- [ ] Add `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_PRICE_ID` to `.env`

---

### ⬜ Module 11 — Interview Prep

- [ ] `backend/routers/interview.py` — `POST /interview-prep`
- [ ] Groq prompt: generate 13 questions (5 behavioral, 5 technical, 3 situational) as JSON
- [ ] Save to `interview_sessions` table
- [ ] `frontend/src/app/interview/[id]/page.tsx` — flashcard UI with flip animation + practice mode

---

### ⬜ Module 12 — Chrome Extension (Pro Tier)

- [ ] `extension/manifest.json` — Manifest V3 with host permissions for LinkedIn, Greenhouse, Lever, Workday
- [ ] `extension/service-worker.js` — auth token storage, FastAPI communication, message routing
- [ ] `extension/content.js` — DOM field detection, autofill using FIELD_MAP
- [ ] `extension/popup/` — React mini-app: login state, autofill trigger, field preview

---

## 10. Free vs Pro Tier

| Feature | Free | Pro |
|---------|------|-----|
| Job searches / day | 3 | Unlimited |
| Document drafts (total) | 5 | Unlimited |
| Automated submissions | 0 | Unlimited |
| Match scoring | Basic Keyword | Full Semantic SBERT + pgvector |
| Interview prep | 0 | Unlimited |
| Chrome Extension | ✗ | ✓ |

---

## 11. Coding Rules & Standards

### Python
- PEP 8 + Black (line length 88)
- Type hints on ALL function signatures
- Google-style docstrings on all public functions
- All routes `async def`
- Never bare `except:` — always `except Exception as exc:`
- Services NEVER import from routers (one-way dependency)
- DB calls ONLY inside `services/`, never inline in route handlers
- Every route: ≥1 happy-path test + ≥1 auth-failure test

### TypeScript
- Strict mode enabled in `tsconfig.json`
- No `any` types
- Functional components only (no class components)
- `PascalCase.tsx` for components, `camelCase.ts` for utilities
- All API calls via `lib/api.ts` — never inline `fetch()` in components
- SWR or React Query for all server data

### Git Commit Format
```
feat(module-N): what was added
fix(module-N): what was fixed
refactor(module-N): what was restructured
test(module-N): what tests were added
docs(module-N): what docs changed
```

---

## 12. Commands Reference

```bash
# Install all Python deps
pip install -r requirements.txt

# Run backend API
cd backend && uvicorn main:app --reload

# Run Celery worker (Module 8+)
cd backend && celery -A workers.celery_app worker --loglevel=info

# Run frontend
cd frontend && npm run dev

# Run tests (unit + smoke only)
pytest -m "not integration" -v

# Run all tests (requires real .env)
pytest -v

# Git workflow
git add -A
git commit -m "feat(module-N): description"
git push origin main
```

---

## 13. How to Start a New Agent Session

1. Read this file (`AGENTS.md`) in full — do not skip
2. Check Section 9 for which module is currently active
3. Check Section 8 for open bugs before touching those areas
4. Run `pytest -m "not integration" -v` — confirm all 15 tests pass
5. Work on the FIRST unchecked task in the current module
6. Update Section 9 checkboxes when done
7. Update Section 8 bug statuses if applicable
8. Commit: `git add -A && git commit -m "feat(module-N): description"`
9. Push: `git push origin main`
