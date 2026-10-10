"""
Module 4: Core LangGraph Agent
================================
Task 1: Connect to Supabase
Task 2: Search jobs via DuckDuckGo
Task 3: Generate tailored cover letter + resume via Groq (Llama 3)
Task 4: Save results to Supabase
Task 5: Full LangGraph state machine (Search -> Draft -> Save -> END)

Known Bugs / Limitations:
- DuckDuckGo rate-limits aggressive queries; retries with back-off are included.
- Groq llama3-8b-8192 has a ~8 192 token context; long resumes/JDs are truncated to 500 chars.
- Supabase upsert requires the `url` column to have a UNIQUE constraint (already in schema.sql).
- save_to_database stores only the job row, NOT the application row (no user_id in agent scope).
"""

from __future__ import annotations

import os
import time

# Top-level imports so unittest.mock.patch("agent.DDGS") and
# patch("agent.ChatGroq") can intercept them in unit tests.
from duckduckgo_search import DDGS  # type: ignore
from langchain_groq import ChatGroq  # type: ignore
import logging
from typing import TypedDict, List, Dict, Any, Optional

from dotenv import load_dotenv
from langgraph.graph import StateGraph, END

# ---------------------------------------------------------------------------
# Bootstrap: load .env from project root (one level above /backend)
# ---------------------------------------------------------------------------
_ENV_PATH = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(_ENV_PATH)

logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Task 1 — Supabase Client Setup
# ---------------------------------------------------------------------------
SUPABASE_URL: str | None = os.environ.get("SUPABASE_URL")
SUPABASE_KEY: str | None = os.environ.get("SUPABASE_KEY")

try:
    from supabase import create_client, Client as SupabaseClient  # type: ignore
    if SUPABASE_URL and SUPABASE_KEY:
        supabase: SupabaseClient | None = create_client(SUPABASE_URL, SUPABASE_KEY)
        log.info("✅ Supabase connected successfully!")
    else:
        supabase = None
        log.warning("⚠️  Supabase not connected — SUPABASE_URL or SUPABASE_KEY missing.")
except ImportError:
    supabase = None
    log.warning("⚠️  supabase-py not installed. DB saves will be skipped.")


# ---------------------------------------------------------------------------
# Agent State Definition
# ---------------------------------------------------------------------------
class AgentState(TypedDict):
    """Shared state passed between every LangGraph node."""
    keywords: str                         # Job search query
    location: str                         # Target location / "Remote"
    user_resume: str                      # Candidate's base resume text
    found_jobs: List[Dict[str, Any]]      # Raw results from DuckDuckGo
    selected_job: Optional[Dict[str, Any]]  # The first job chosen for drafting
    tailored_resume: str                  # AI-rewritten resume bullets
    cover_letter: str                     # AI-generated cover letter
    status: str                           # Human-readable pipeline status
    error: Optional[str]                  # Last error message, or None


# ---------------------------------------------------------------------------
# Task 2 — Node: Search Jobs via DuckDuckGo
# ---------------------------------------------------------------------------
def search_jobs(state: AgentState) -> Dict:
    """
    Search for jobs using DuckDuckGo text search.
    No API key required — uses duckduckgo_search library.

    Bug note: DDGS().text() will raise RatelimitException if called too
    rapidly. We retry up to 3 times with exponential back-off.

    Patchable in tests via: patch("agent.DDGS")
    """
    keywords = state["keywords"]
    location = state["location"]
    log.info("🔍 [Node 1 — search_jobs] Searching: '%s' in '%s'", keywords, location)

    query = (
        f"{keywords} job openings in {location} "
        "site:linkedin.com OR site:indeed.com OR site:greenhouse.io"
    )

    max_attempts = 3
    for attempt in range(1, max_attempts + 1):
        try:
            results = DDGS().text(query, max_results=5)
            break
        except Exception as exc:
            log.warning("DuckDuckGo attempt %d/%d failed: %s", attempt, max_attempts, exc)
            if attempt == max_attempts:
                return {
                    "found_jobs": [],
                    "status": "Search Failed",
                    "error": str(exc),
                }
            time.sleep(2 ** attempt)  # 2s, 4s back-off

    jobs: List[Dict[str, Any]] = []
    if results:
        for r in results:
            raw_title: str = r.get("title", "Unknown")
            company = raw_title.split(" - ")[-1] if " - " in raw_title else "Unknown"
            jobs.append(
                {
                    "title": raw_title,
                    "url": r.get("href", ""),
                    "description": r.get("body", ""),
                    "company": company,
                    "source": "DuckDuckGo",
                }
            )

    log.info("✅ Found %d job(s).", len(jobs))
    return {"found_jobs": jobs, "status": "Jobs Found", "error": None}


# ---------------------------------------------------------------------------
# Task 3 — Node: Draft Documents via Groq / Llama 3
# ---------------------------------------------------------------------------
def draft_documents(state: AgentState) -> Dict:
    """
    Uses Groq (llama3-8b-8192) to produce:
      • A 3-paragraph cover letter tailored to the first found job.
      • 3 rewritten resume bullet points matching the JD keywords.

    Bug note: If no jobs were found in the previous node, this node
    short-circuits with status='No Jobs Found'.
    """
    log.info("✍️  [Node 2 — draft_documents] Drafting with Groq (Llama 3)...")

    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        return {
            "cover_letter": "",
            "tailored_resume": "",
            "status": "Drafting Failed",
            "error": "GROQ_API_KEY not set in .env",
        }

    if not state.get("found_jobs"):
        return {
            "cover_letter": "",
            "tailored_resume": "",
            "status": "No Jobs Found",
            "error": "No jobs were returned by the search node — cannot draft.",
        }

    try:
        llm = ChatGroq(model="llama3-8b-8192", api_key=api_key, temperature=0.7)

        job = state["found_jobs"][0]
        job_title = job.get("title", "Software Engineer")
        # Truncate to stay inside Groq's 8k-token window
        job_desc = job.get("description", "")[:500]
        user_resume = state.get("user_resume", "Experienced professional with relevant skills.")[:500]

        # ── Cover Letter ──────────────────────────────────────────────────
        cover_letter_prompt = f"""You are an expert career coach. Write a compelling, professional cover letter.

Job Title: {job_title}
Job Description: {job_desc}

Candidate's Resume Summary:
{user_resume}

Instructions:
- Write exactly 3 paragraphs.
- Paragraph 1: Express enthusiasm for the role and company.
- Paragraph 2: Highlight 2-3 most relevant skills matching the job.
- Paragraph 3: Strong closing statement.
- Keep it under 300 words.
- Do NOT include placeholders like [Your Name] or [Date].
"""
        cover_letter = llm.invoke(cover_letter_prompt).content

        # ── Tailored Resume Bullets ───────────────────────────────────────
        resume_prompt = f"""Given this job description:
{job_desc[:400]}

And this resume:
{user_resume[:400]}

Rewrite 3 bullet points from the resume to better match the job description keywords.
Return only the 3 bullet points, one per line, starting with '•'.
"""
        tailored_resume = llm.invoke(resume_prompt).content

        log.info("✅ Cover letter and tailored resume bullets generated.")
        return {
            "cover_letter": cover_letter,
            "tailored_resume": tailored_resume,
            "selected_job": job,
            "status": "Drafting Complete",
            "error": None,
        }

    except Exception as exc:
        log.error("❌ Drafting failed: %s", exc)
        return {
            "cover_letter": "",
            "tailored_resume": "",
            "status": "Drafting Failed",
            "error": str(exc),
        }


# ---------------------------------------------------------------------------
# Task 4 — Node: Save to Supabase
# ---------------------------------------------------------------------------
def save_to_database(state: AgentState) -> Dict:
    """
    Persists the selected job into the `jobs` table.
    Uses upsert on `url` to avoid duplicate rows.

    Bug note: This node stores the job only — NOT the application row —
    because we have no authenticated user_id in the agent's scope.
    The FastAPI layer (Module 5) will create the applications row after
    user authentication.
    """
    log.info("💾 [Node 3 — save_to_database] Saving job to Supabase...")

    if not supabase:
        log.warning("⚠️  Supabase not connected — skipping DB save.")
        return {"status": "DB Skipped (No Connection)"}

    failed_statuses = {"Failed", "Search Failed", "No Jobs Found", "Drafting Failed"}
    if state.get("status") in failed_statuses:
        log.warning("Pipeline in failed state ('%s') — skipping DB save.", state.get("status"))
        return {"status": state.get("status", "Failed")}

    try:
        job = state.get("selected_job") or {}
        job_url = job.get("url", "")

        if not job_url:
            log.warning("No job URL available — cannot upsert into jobs table.")
            return {"status": "DB Skipped (No URL)"}

        job_row = {
            "title": job.get("title", "Unknown"),
            "company": job.get("company", "Unknown"),
            "url": job_url,
            "description": job.get("description", ""),
            "source": "DuckDuckGo",
        }
        supabase.table("jobs").upsert(job_row, on_conflict="url").execute()
        log.info("✅ Job saved to DB: %s", job.get("title"))
        return {"status": "Saved to DB"}

    except Exception as exc:
        log.error("❌ DB save failed: %s", exc)
        return {"status": "DB Save Failed", "error": str(exc)}


# ---------------------------------------------------------------------------
# Task 5 — Compile LangGraph State Machine
# ---------------------------------------------------------------------------
workflow = StateGraph(AgentState)

workflow.add_node("search",  search_jobs)
workflow.add_node("draft",   draft_documents)
workflow.add_node("save_db", save_to_database)

workflow.set_entry_point("search")
workflow.add_edge("search",  "draft")
workflow.add_edge("draft",   "save_db")
workflow.add_edge("save_db", END)

# Compiled, reusable app object imported by FastAPI (main.py) and tests
agent_app = workflow.compile()
log.info("✅ LangGraph agent compiled and ready!")
