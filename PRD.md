# Product Requirements Document (PRD)
## Job Application Assistant

### 1. Problem Statement
Job hunting is a tedious, manual process. Candidates spend hours tailoring resumes and cover
letters for each job.

### 2. Goals
Automate job discovery, resume/cover letter tailoring, and application submission using AI.

### 3. Features

| Feature | Status | Module |
|---------|--------|--------|
| **Job Search** — DuckDuckGo integration to find recent jobs | ✅ Done | 4 |
| **AI Tailoring** — Llama 3 (Groq API) cover letters + resume bullets | ✅ Done | 4 |
| **Job Persistence** — Save found jobs to Supabase | ✅ Done | 4 |
| **REST API** — FastAPI endpoints for frontend integration | ✅ Done | 5 |
| **Auth** — Supabase Auth, Google/GitHub SSO, OTP & Password Reset | ✅ Done | 6 |
| **Semantic Scoring** — Sentence-BERT (`all-MiniLM-L6-v2`) + pgvector match % | 🏃 Next | 7 |
| **Kanban Dashboard** — Dynamic 5-stage drag-and-drop tracking (@dnd-kit) | 🏃 Next | 7 |
| **Automation** — Playwright scripts to submit applications | ⬜ Planned | 8-9 |

### 4. Non-Functional Requirements
- **Security**: `.env` excluded from git. API routes protected by Supabase JWT (Module 6).
- **Reliability**: DuckDuckGo search retries 3× with back-off before failing.
- **Observability**: Python `logging` module throughout agent pipeline.
- **Testability**: Unit + smoke + integration test layers in `backend/test_agent.py`.

### 5. Known Constraints
- Groq `llama3-8b-8192` has an 8 192-token context window; long inputs are truncated.
- DuckDuckGo has undocumented rate limits; heavy usage may trigger throttling.
- Playwright automation cannot handle all CAPTCHA types.
