# JobPilot — Autonomous Job Application Assistant

> **Enterprise AI Platform** for multi-portal job discovery, automated document tailoring, and end-to-end application tracking.

[![FastAPI](https://img.shields.io/badge/FastAPI-0.143+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-16.4+-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![Python Tests](https://img.shields.io/badge/Pytest-40%20Passed-brightgreen?logo=pytest)](https://docs.pytest.org)

---

## 🚀 Key Capabilities

1. **Multi-Portal Job Search**: Autonomous search across 10+ job platforms (LinkedIn, Indeed, Greenhouse, Lever, etc.) using DuckDuckGo Search API with 3x retry exponential back-off.
2. **AI Document Tailoring**: Llama 3 (via Groq API) crafts bespoke cover letters and targeted resume bullets matching specific job descriptions.
3. **Semantic Match Scoring (SBERT + pgvector)**: Dense vector embeddings (`all-MiniLM-L6-v2`, 384 dimensions) with HNSW cosine similarity ranking opportunities against the candidate's resume and identifying missing skills.
4. **Enterprise Identity & Auth**:
   - Google & GitHub Single Sign-On (SSO) with Supabase Auth.
   - Corporate Email/Password authentication.
   - 6-Digit Email OTP verification flow on first-time registration.
   - Token-based self-service Password Reset (`/forgot-password` & `/reset-password`).
5. **Hardened Security**:
   - Zero-trust route protection in Next.js Middleware blocking all unauthenticated access to workspace pages.
   - Pure key isolation (zero secret or LLM API keys exposed in client bundles).
   - Supabase PostgreSQL Row Level Security (RLS) across all user tables.
6. **Interactive Telemetry Dashboard**:
   - Dynamic Kanban board with 5 pipeline stages (Discovered, Applied, Interview, Offer, Rejected).
   - Real-time application metrics, quota counters, and user session controls.
   - Danger Zone account termination with full cascade data deletion.

---

## 🛠️ Tech Stack

| Layer | Technology | Details |
|---|---|---|
| **Frontend** | Next.js 16 (App Router), React, TypeScript | Dark-mode Enterprise UI |
| **Backend** | FastAPI + Uvicorn | Python 3.11+, Pydantic Settings |
| **AI Engine** | LangGraph + LangChain Groq | Llama 3-8B model inference |
| **Semantic Matching** | Sentence-BERT + pgvector | `all-MiniLM-L6-v2` (384-dim), HNSW Cosine Index |
| **Database** | Supabase (PostgreSQL 15+) | RLS, JWT Auth, pgvector, Cascade Triggers |
| **Search** | DuckDuckGo Search (`ddgs`) | Deduplication + Rate-limit protection |
| **Testing** | Pytest | 40 Unit, Smoke, & Integration tests |

---

## 📊 Modules Status

| Module | Description | Status |
|---|---|---|
| **Module 1** | Monorepo Setup & Architecture | ✅ Completed |
| **Module 2** | Supabase Database Schema & RLS | ✅ Completed |
| **Module 3** | Environment Variables & Secrets | ✅ Completed |
| **Module 4** | Core LangGraph AI Pipeline | ✅ Completed |
| **Module 5** | FastAPI Backend Auth & Modular Routers | ✅ Completed (40/40 Tests Pass) |
| **Module 6** | Frontend Auth, OTP, OAuth, & Onboarding | ✅ Completed (Build 0 Errors) |
| **Module 7** | Semantic Match Scoring (SBERT + pgvector) & Kanban | 🏃 In Progress |
| **Module 8** | Human-in-Loop Review & Celery Tasks | ⬜ Planned |
| **Module 9** | Playwright Automation Engine | ⬜ Planned |
| **Module 10** | Stripe Subscriptions & Usage Quotas | ⬜ Planned |
| **Module 11** | Mock Interview Prep Flashcards | ⬜ Planned |
| **Module 12** | Chrome Extension Autofill | ⬜ Planned |

---

## 💻 Quick Start Guide

### 1. Prerequisites
- Python 3.11+
- Node.js 18+
- Supabase Project (`URL` & `ANON_KEY`)
- Groq API Key (`GROQ_API_KEY`)

### 2. Environment Setup

**Root `.env` (Backend):**
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key
GROQ_API_KEY=gsk_your-groq-key
```

**Frontend `.env.local` (`frontend/.env.local`):**
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3. Run Backend

```bash
# Activate virtual environment
venv\Scripts\activate

# Start FastAPI server
cd backend
uvicorn main:app --reload --port 8000
```
- API Documentation (Swagger UI): [http://localhost:8000/docs](http://localhost:8000/docs)

### 4. Run Frontend

```bash
cd frontend
npm install
npm run dev
```
- Web Application: [http://localhost:3000](http://localhost:3000)

---

## 🧪 Testing Suite

Run full backend test suite:
```bash
# Run all 40 tests
pytest -v

# Run non-integration unit tests only
pytest -m "not integration" -v
```

Run frontend production compilation check:
```bash
cd frontend
npm run build
```

---

## 📁 Repository Directory Structure

```
├── backend/
│   ├── main.py              # Application factory & router registration
│   ├── agent.py             # LangGraph state machine & search nodes
│   ├── config.py            # Pydantic BaseSettings validation
│   ├── dependencies.py      # JWT authentication dependencies
│   ├── routers/             # auth, jobs, applications, profile
│   ├── services/            # resume parser, match scoring
│   ├── test_agent.py        # LangGraph engine unit tests
│   └── tests/               # Route & endpoint unit tests
│
├── frontend/
│   ├── public/logo.jpg      # Official brand logo
│   └── src/
│       ├── middleware.ts    # Route protection & backdoor lockdown
│       ├── app/
│       │   ├── page.tsx     # Hero landing page
│       │   ├── dashboard/   # Authenticated command center
│       │   ├── onboarding/  # Candidate profile setup wizard
│       │   ├── not-found.tsx# Custom branded 404
│       │   └── (auth)/      # login, signup, forgot-password, reset-password
│       ├── hooks/useAuth.ts # Global session & auth provider
│       └── lib/api.ts       # Backend REST client
│
├── schema.sql               # Supabase PostgreSQL tables & RLS policies
└── requirements.txt         # Python pinned dependencies
```
