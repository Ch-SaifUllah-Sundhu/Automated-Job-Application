# Project Tracker & Task Breakdown

> **Project:** Job Application Assistant (SaaS)  
> **Source of Truth:** [AGENTS.md](file:///D:/Personal%20Projects/Automated%20Job%20Application/AGENTS.md) & [Architecture.md](file:///D:/Personal%20Projects/Automated%20Job%20Application/Architecture.md)  
> **Last Updated:** 2026-10-11  

---

## Completed Milestones ✅

### Module 1: Project Setup [✅ Done]
- [x] Create monorepo directory structure (`frontend/`, `backend/`).
- [x] Initialize Next.js frontend with Tailwind CSS.
- [x] Initialize Python FastAPI backend and virtual environment.

### Module 2: Database Schema & Security [✅ Done]
- [x] Design core Supabase tables (`profiles`, `jobs`, `applications`).
- [x] Design new SaaS tables (`subscriptions`, `automation_logs`, `interview_sessions`, `notifications`).
- [x] Write `schema.sql` with full table DDL, alterations, and Row Level Security (RLS) policies.
- [x] Document manual update steps in Supabase Dashboard SQL Editor.

### Module 3: Environment & Configuration [✅ Done]
- [x] Create `.env` configuration file with Supabase and Groq keys.
- [x] Update `.gitignore` to prevent secret leakage.
- [x] Consolidate dependencies in `requirements.txt`.

### Module 4: Core Agent Engine (Backend) [✅ Done]
- [x] Connect Python script to Supabase client.
- [x] Implement DuckDuckGo Search API for fetching jobs with 3-attempt exponential back-off retry (Bug B1 fixed).
- [x] Implement Groq API (Llama 3) for generating tailored cover letters and resume bullets.
- [x] Build LangGraph state machine (`search_jobs` → `draft_documents` → `save_to_database` → `END`).
- [x] Implement test suite (18 unit/smoke tests passing cleanly).
- [x] Wire initial `/search-jobs` stub in FastAPI `main.py`.

---

## SaaS Architecture Blueprint Roadmap (Modules 5 – 12) 🏃

### Module 5: FastAPI Auth & Core Routes [✅ Done]
- [x] **Config**: Create `backend/config.py` with `pydantic-settings` to validate `.env` at startup.
- [x] **Dependencies**: Create `backend/dependencies.py` with `get_current_user()` (Supabase JWT verification).
- [x] **Auth Router**: Create `backend/routers/auth.py` (`GET /auth/me`, `POST /auth/logout`).
- [x] **Jobs Router**: Create `backend/routers/jobs.py` (migrated `/search-jobs`, added paginated `GET /jobs`).
- [x] **Applications Router**: Create `backend/routers/applications.py` (`POST /apply`, `GET /applications`, `PATCH /status`).
- [x] **Profile Router**: Create `backend/routers/profile.py` (`GET/PUT /profile`, `POST /profile/resume`).
- [x] **Resume Parser Service**: Create `backend/services/resume_parser.py` (PDF & DOCX parsing via `pdfminer.six` and `python-docx`).
- [x] **Main App Refactor**: Refactor `backend/main.py` into application factory registering modular routers.
- [x] **Bug B2 Fix**: Enforce `get_current_user` auth dependency across all private endpoints.
- [x] **Bug B3 Fix**: Pass authenticated `user_id` into `AgentState` and save `applications` row in agent.
- [x] **Tests**: Comprehensive test suite (39 tests passing cleanly across `test_auth.py`, `test_applications.py`, `test_profile.py`, `test_jobs.py`, and `test_agent.py`).

### Module 6: Frontend Auth & Onboarding [⬜ Planned]
- [ ] Install Supabase client dependencies (`@supabase/supabase-js`, `@supabase/ssr`).
- [ ] Create `frontend/src/lib/supabase/client.ts` (`createBrowserClient()`).
- [ ] Create `frontend/src/lib/supabase/server.ts` (`createServerClient()` with cookie store).
- [ ] Add Next.js auth middleware `frontend/src/middleware.ts` to protect `/dashboard/**`.
- [ ] Build `frontend/src/app/(auth)/login/page.tsx` (Email/password + Google & LinkedIn OAuth).
- [ ] Build `frontend/src/app/(auth)/signup/page.tsx` (Registration with terms checkbox).
- [ ] Build `frontend/src/app/onboarding/page.tsx` (3-step onboarding wizard: basic info, resume upload, confirmation).
- [ ] Implement `frontend/src/hooks/useAuth.ts` hook for global auth state management.

### Module 7: Job Dashboard & Smart Match Scoring [⬜ Planned]
- [ ] **Match Scorer**: Create `backend/services/match_service.py` using TF-IDF + Cosine Similarity (`scikit-learn` & `nltk`).
- [ ] **Match API**: Update `GET /jobs` to calculate and return `match_score` per job against user's resume.
- [ ] **Missing Skills Node**: Add `detect_missing_fields` node to LangGraph pipeline.
- [ ] **Job Listing Page**: Build `frontend/src/app/dashboard/jobs/page.tsx` with search filters and sorting.
- [ ] **Job Card Component**: Build `frontend/src/components/jobs/JobCard.tsx` with color-coded match score SVG ring.
- [ ] **Kanban Board**: Build `frontend/src/app/dashboard/page.tsx` with `@dnd-kit` drag-and-drop columns (Found, Applied, Interview, Offer, Rejected).

### Module 8: Dynamic Application + Human-in-Loop Review [⬜ Planned]
- [ ] **LangGraph Interrupt**: Configure checkpointer breakpoint after `draft_documents` awaiting human approval.
- [ ] **Celery App**: Setup `backend/workers/celery_app.py` with Redis broker.
- [ ] **Automation Task Skeleton**: Create `backend/workers/tasks/automation_task.py`.
- [ ] **Approve Endpoint**: Implement `PATCH /applications/{id}/approve` to trigger Celery task.
- [ ] **Review Page**: Build `frontend/src/app/dashboard/review/[id]/page.tsx` (side-by-side JD vs tailored document editing).
- [ ] **Missing Data Modal**: Modal to prompt user for missing fields (manual input or Groq auto-generate).
- [ ] **Supabase Realtime**: Live updates on application status changes in frontend.

### Module 9: Playwright Automation Engine [⬜ Planned]
- [ ] Install Playwright and Chromium dependencies (`playwright`, `playwright-stealth`).
- [ ] Implement robust field detection algorithm (aria-label > placeholder > name > id priority with `FIELD_MAP`).
- [ ] Implement stealth automation execution in `backend/workers/tasks/automation_task.py`.
- [ ] Audit trail screenshots uploaded to Supabase Storage bucket `automation-screenshots`.
- [ ] Execution events logging to `automation_logs` table.
- [ ] CAPTCHA detection and graceful user pause/notification handler.
- [ ] Write automation tests in `backend/tests/test_automation.py`.

### Module 10: Subscriptions & Business (Stripe) [⬜ Planned]
- [ ] Create `backend/services/stripe_service.py` (Checkout sessions, customer portal, webhook verification).
- [ ] Create `backend/routers/subscriptions.py` (`/billing/checkout`, `/billing/portal`, `/billing/webhook`).
- [ ] Add `require_pro_tier()` dependency and Redis-backed daily usage rate limiters.
- [ ] Process Stripe webhook events (`checkout.session.completed`, `customer.subscription.*`).
- [ ] Build `frontend/src/app/billing/page.tsx` with plan comparisons, upgrade buttons, and billing portal link.

### Module 11: Interview Prep Module [⬜ Planned]
- [ ] Create `backend/routers/interview.py` (`POST /interview-prep`).
- [ ] Groq prompt template for 13 tailored questions (5 behavioral, 5 technical, 3 situational with answer keys).
- [ ] Persist sessions in `interview_sessions` table.
- [ ] Build `frontend/src/app/interview/[id]/page.tsx` with 3D flip flashcards and practice timer mode.

### Module 12: Chrome Extension (Pro Tier) [⬜ Planned]
- [ ] Configure `extension/manifest.json` (Manifest V3 with permissions for LinkedIn, Greenhouse, Lever, Workday).
- [ ] Create `extension/service-worker.js` for token storage and background communication.
- [ ] Create `extension/content.js` with DOM form detection and autofill execution.
- [ ] Create `extension/popup/` React popup interface for 1-click filling and field preview.
