# Project Tracker & Task Breakdown

> **Project:** Job Application Assistant (SaaS)  
> **Source of Truth:** [AGENTS.md](file:///D:/Personal%20Projects/Automated%20Job%20Application/AGENTS.md) & [Architecture.md](file:///D:/Personal%20Projects/Automated%20Job%20Application/Architecture.md)  
> **Last Updated:** 2026-10-24  
> **Current Focus:** Module 9 (Playwright Automation Engine) 🏃

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
- [x] **Tests**: Comprehensive test suite (40 tests passing cleanly across `test_auth.py`, `test_applications.py`, `test_profile.py`, `test_jobs.py`, and `test_agent.py`).

### Module 6: Frontend Auth & Enterprise Identity [✅ Completed]
- [x] Install Supabase client dependencies (`@supabase/supabase-js`, `@supabase/ssr`, `lucide-react`).
- [x] Create `frontend/src/lib/supabase/client.ts` (`createBrowserClient()`).
- [x] Create `frontend/src/lib/supabase/server.ts` (`createServerClient()` with cookie store).
- [x] Add Next.js auth middleware `frontend/src/middleware.ts` to protect `/dashboard/**` and `/onboarding`.
- [x] Build `frontend/src/app/(auth)/login/page.tsx` (Email/password + Google & GitHub SSO + Forgot password).
- [x] Build `frontend/src/app/(auth)/signup/page.tsx` (Registration with terms checkbox + Google & GitHub SSO).
- [x] Build `frontend/src/app/(auth)/forgot-password/page.tsx` (Password recovery email dispatch).
- [x] Build `frontend/src/app/(auth)/reset-password/page.tsx` (Token-based credential reset flow).
- [x] Build `frontend/src/app/onboarding/page.tsx` (3-step onboarding wizard: basic info, resume upload/parse, confirmation).
- [x] Implement `frontend/src/hooks/useAuth.ts` hook for global auth state management (`signIn`, `signUp`, `signOut`, `signInWithOAuth`, `resetPassword`, `updatePassword`).
- [x] Implement `frontend/src/lib/api.ts` centralized client for backend communication.
- [x] Enhance `frontend/src/app/auth/callback/route.ts` with error redirection and `next` parameter support.
- [x] Verify production build (`npm run build` completed with 0 errors).

### Module 7: Job Dashboard & Semantic Match Scoring [✅ Done]

> **Design change (2026-10-24):** TF-IDF + NLTK replaced by embedding-based semantic matching (Sentence-BERT) stored in Supabase pgvector. TF-IDF only sees shared words, so it misses synonyms and paraphrases; SBERT outperformed it in resume–job ranking studies. A lightweight skill-overlap score is kept as a secondary signal for explainability.

**7A. Vector storage (pgvector)**
- [x] **Migration**: Enable the `vector` extension; add `embedding vector(384)` to `profiles` and `jobs`; add `match_score` (numeric), `missing_skills` (text[] / jsonb) to `applications` (or a `job_matches` table). Update `schema.sql`.
- [x] **Index**: Create HNSW index with `vector_cosine_ops` on `jobs.embedding`; verify RLS policies still scope rows per user.
- [x] **Re-embed trigger**: Recompute the profile embedding whenever a resume is uploaded or the profile is updated (hook into `POST /profile/resume`).

**7B. Embedding & match services**
- [x] **Embedding Service**: Create `backend/services/embedding_service.py` using `sentence-transformers` (`all-MiniLM-L6-v2`, 384 dims). Load the model once at startup, batch-encode, and chunk resumes/JDs by section (the model truncates long inputs). Run heavy encoding in the worker, not the request path.
- [x] **Match Scorer**: Create `backend/services/match_service.py` — cosine similarity between resume and JD chunk embeddings, aggregated and calibrated to a 0–100 score; optional weighted blend with a skill-overlap score.
- [x] **Match API**: Update `GET /jobs` to return `match_score` per job for the authenticated user; support `sort=match_score`.
- [x] **Dependencies**: Add `sentence-transformers` to `requirements.txt` (use CPU-only PyTorch to keep the install small); remove `nltk`/`scikit-learn` unless still needed.

**7C. Agent: missing skills**
- [x] **Missing Skills Node**: Add `detect_missing_skills` node to the LangGraph pipeline — Groq extracts JD skills as structured output, then each is compared to the candidate's skills by embedding similarity (threshold) so "JS" vs "JavaScript" is not flagged as a gap. Returns `missing_skills[]` into `AgentState`.
- [x] **Naming note**: Keep `detect_missing_fields` (form fields) reserved for Module 8's Missing Data Modal; do not reuse it here.

**7D. Frontend**
- [x] **Job Listing Page**: Build `frontend/src/app/dashboard/jobs/page.tsx` with debounced keyword, location, and portal filters (applied server-side) and sort by match score.
- [x] **Job Card Component**: Build `frontend/src/components/jobs/JobCard.tsx` with color-coded match score SVG ring and missing-skills chips.
- [x] **Kanban Package Decision**: Use `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` for smooth drag-and-drop.
- [x] **Kanban Board**: Build `frontend/src/app/dashboard/page.tsx` with 5 drag-and-drop columns (Discovered, Applied, Interview, Offer, Rejected), mapped one-to-one to the `applications` status enum.
- [x] **Status Persistence**: Wire drops to `PATCH /applications/{id}/status` with optimistic updates and rollback on error.

**7E. Tests & verification**
- [x] **Scoring tests**: Synonym pairs score high, unrelated job scores low, score stays within calibrated 0–100 range.
- [x] **Skill-gap tests**: Alias handling ("JS"/"JavaScript"), truly missing skill is flagged.
- [x] **API tests**: `GET /jobs` returns `match_score`, sorting works, RLS prevents cross-user access.
- [x] **Frontend**: `npm run build` passes with 0 errors; manual Kanban drag test on desktop and touch.

### Module 8: Dynamic Application + Human-in-Loop Review [✅ Done]
- [x] **Celery App**: Setup `backend/workers/celery_app.py` with Redis broker and result backend.
- [x] **Automation Task Skeleton**: Create `backend/workers/tasks/automation_task.py` with Supabase data loading, missing field validation, and logging.
- [x] **Approve Endpoint**: Implement `PATCH /applications/{id}/approve` to update status, write audit log, and trigger Celery task with graceful offline fallback.
- [x] **Review API Endpoints**: Implement `GET /applications/{id}`, `PATCH /applications/{id}/review`, and `GET /applications/{id}/logs`.
- [x] **Review Page**: Build `frontend/src/app/dashboard/review/[id]/page.tsx` (side-by-side JD vs tailored document editing with cover letter & bullet point editor).
- [x] **Missing Data Quick-Fix**: Interactive quick-fix fields on review page to prompt user for missing submission fields and save to profile.
- [x] **Automation Audit Trail**: Live sync timeline displaying events from `automation_logs` on the review page.
- [x] **Kanban Integration**: Wire "Review & Submit" CTA directly into Kanban card and detail modal on `/dashboard`.
- [x] **Verification**: All 55 backend unit/integration tests passing; `npm run build` succeeds with 0 errors.

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
