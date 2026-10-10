# Automated Job Application Assistant

> AI-powered job search, cover letter drafting, and application tracking.

## What it does

1. **Searches** DuckDuckGo for relevant job postings (no API key needed)
2. **Drafts** a tailored cover letter and rewritten resume bullets using Groq / Llama 3
3. **Saves** job data to Supabase
4. **Tracks** every application in a dashboard (Module 7 — coming soon)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| AI Agent | LangGraph + Groq (Llama 3) |
| Job Search | DuckDuckGo Search |
| Backend API | FastAPI + Uvicorn |
| Database | Supabase (PostgreSQL + Auth) |
| Frontend | Next.js (TypeScript) |
| Automation | Playwright (Module 8 — planned) |

---

## Project Status

| Module | Description | Status |
|--------|-------------|--------|
| 1 | Project setup | ✅ Done |
| 2 | Database schema | ✅ Done |
| 3 | Environment variables | ✅ Done |
| 4 | Core LangGraph agent | ✅ Done |
| 5 | FastAPI routes + auth | 🏃 Next |
| 6 | Supabase Auth (frontend) | ⬜ Planned |
| 7 | Dashboard UI | ⬜ Planned |
| 8 | Playwright automation | ⬜ Planned |

---

## Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [Groq](https://console.groq.com) API key

### 1. Clone and install

```bash
git clone https://github.com/Ch-SaifUllah-Sundhu/Automated-Job-Application.git
cd Automated-Job-Application
```

**Backend:**
```bash
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
```

**Frontend:**
```bash
cd frontend
npm install
```

### 2. Configure environment

Copy and fill in your keys:
```bash
cp .env.example .env
```

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
GROQ_API_KEY=gsk_...
```

### 3. Set up the database

Run `schema.sql` in your Supabase SQL editor to create the tables.

### 4. Run

**Backend:**
```bash
cd backend
uvicorn main:app --reload
# API docs: http://localhost:8000/docs
```

**Frontend:**
```bash
cd frontend
npm run dev
# App: http://localhost:3000
```

---

## Testing

```bash
# Unit + smoke tests only (no real API calls)
pytest -m "not integration" -v

# All tests including real API calls (requires valid .env)
pytest -v
```

---

## Project Files

```
backend/
├── agent.py        ← LangGraph pipeline (Module 4)
├── main.py         ← FastAPI app (Module 5 stub)
└── test_agent.py   ← Full test suite

frontend/           ← Next.js app (Modules 6–7)
schema.sql          ← Supabase table definitions
requirements.txt    ← Python dependencies
```

---

> **For AI agents:** Read `AGENTS.md` first — it has complete codebase context, bug status, and next tasks.
