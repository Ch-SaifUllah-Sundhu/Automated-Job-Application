"""
backend/agent.py
================
Module 4 — Core LangGraph Agent

Pipeline:  search_jobs  →  draft_documents  →  save_to_database  →  END

External dependencies:
  - DuckDuckGo Search  (no API key needed)
  - Groq / Llama 3     (GROQ_API_KEY in .env)
  - Supabase           (SUPABASE_URL + SUPABASE_KEY in .env)

Known limitations
-----------------
B1 [FIXED]  DuckDuckGo rate-limits — handled with 3× exponential back-off.
B2 [TODO-5] /search-jobs endpoint has no auth — fix in Module 5.
B3 [TODO-5] Application row not persisted (no user_id in agent scope) — fix in Module 5.
B4 [LOW]    Resume/JD truncated to 500 chars due to Groq 8k context window.
"""

from __future__ import annotations

import logging
import os
import time
from typing import Any, Dict, List, Optional, TypedDict

from dotenv import load_dotenv
from duckduckgo_search import DDGS
from langchain_groq import ChatGroq
from langgraph.graph import END, StateGraph

# ---------------------------------------------------------------------------
# Environment
# ---------------------------------------------------------------------------
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("agent")

# ---------------------------------------------------------------------------
# Supabase client (optional — pipeline continues gracefully without it)
# ---------------------------------------------------------------------------
_SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
_SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")

try:
    from supabase import Client as _SupabaseClient
    from supabase import create_client as _create_client

    if _SUPABASE_URL and _SUPABASE_KEY:
        supabase: _SupabaseClient | None = _create_client(_SUPABASE_URL, _SUPABASE_KEY)
        log.info("Supabase connected.")
    else:
        supabase = None
        log.warning("Supabase skipped — URL or KEY missing in .env.")
except ImportError:
    supabase = None
    log.warning("supabase-py not installed. DB saves will be skipped.")


# ---------------------------------------------------------------------------
# State schema
# ---------------------------------------------------------------------------
class AgentState(TypedDict):
    """Shared mutable state that flows through every LangGraph node."""

    keywords: str                           # Job search query (e.g. "Python Developer")
    location: str                           # Location / "Remote"
    user_resume: str                        # Candidate's base resume text
    found_jobs: List[Dict[str, Any]]        # Raw DuckDuckGo results
    selected_job: Optional[Dict[str, Any]]  # First job chosen for drafting
    tailored_resume: str                    # AI-rewritten resume bullets
    cover_letter: str                       # AI-generated cover letter
    status: str                             # Human-readable pipeline status
    error: Optional[str]                    # Last error message, or None


# ---------------------------------------------------------------------------
# Node 1 — Search
# ---------------------------------------------------------------------------
_SEARCH_SITES = "site:linkedin.com OR site:indeed.com OR site:greenhouse.io"
_MAX_RESULTS = 5
_MAX_RETRIES = 3


def search_jobs(state: AgentState) -> Dict[str, Any]:
    """
    Search for jobs via DuckDuckGo (no API key required).

    Retries up to 3× with exponential back-off to survive rate-limit spikes.
    Returns at most ``_MAX_RESULTS`` jobs, or an empty list on total failure.
    """
    keywords, location = state["keywords"], state["location"]
    log.info("[Node 1] Searching: '%s' in '%s'", keywords, location)

    query = f"{keywords} job openings in {location} {_SEARCH_SITES}"
    last_error: str = ""

    for attempt in range(1, _MAX_RETRIES + 1):
        try:
            raw = DDGS().text(query, max_results=_MAX_RESULTS)
            jobs = [_parse_ddg_result(r) for r in (raw or [])]
            log.info("Found %d job(s).", len(jobs))
            return {"found_jobs": jobs, "status": "Jobs Found", "error": None}
        except Exception as exc:  # noqa: BLE001
            last_error = str(exc)
            log.warning("DuckDuckGo attempt %d/%d failed: %s", attempt, _MAX_RETRIES, exc)
            if attempt < _MAX_RETRIES:
                time.sleep(2 ** attempt)  # 2s → 4s back-off

    log.error("All DuckDuckGo retries exhausted.")
    return {"found_jobs": [], "status": "Search Failed", "error": last_error}


def _parse_ddg_result(r: Dict[str, Any]) -> Dict[str, Any]:
    """Map a raw DDGS result dict to our internal job schema."""
    title: str = r.get("title", "Unknown")
    company = title.split(" - ")[-1] if " - " in title else "Unknown"
    return {
        "title": title,
        "url": r.get("href", ""),
        "description": r.get("body", ""),
        "company": company,
        "source": "DuckDuckGo",
    }


# ---------------------------------------------------------------------------
# Node 2 — Draft
# ---------------------------------------------------------------------------
_MODEL = "llama3-8b-8192"
_MAX_INPUT_CHARS = 500   # Groq 8k-token context guard (B4)
_TEMP = 0.7


def draft_documents(state: AgentState) -> Dict[str, Any]:
    """
    Use Groq (Llama 3) to produce a tailored cover letter and resume bullets.

    Short-circuits with an appropriate status when:
    - GROQ_API_KEY is missing
    - No jobs were found by the previous node
    """
    log.info("[Node 2] Drafting with Groq (%s)...", _MODEL)

    api_key = os.environ.get("GROQ_API_KEY", "")
    if not api_key:
        return _draft_failure("GROQ_API_KEY not set in .env — cannot call Groq.")

    if not state.get("found_jobs"):
        return _draft_failure("No jobs returned by search node.", status="No Jobs Found")

    job = state["found_jobs"][0]
    job_title = job.get("title", "Software Engineer")
    job_desc = job.get("description", "")[:_MAX_INPUT_CHARS]
    resume = state.get("user_resume", "Experienced professional.")[:_MAX_INPUT_CHARS]

    try:
        llm = ChatGroq(model=_MODEL, api_key=api_key, temperature=_TEMP)
        cover_letter = llm.invoke(_cover_letter_prompt(job_title, job_desc, resume)).content
        tailored_bullets = llm.invoke(_resume_prompt(job_desc, resume)).content

        log.info("Documents generated successfully.")
        return {
            "cover_letter": cover_letter,
            "tailored_resume": tailored_bullets,
            "selected_job": job,
            "status": "Drafting Complete",
            "error": None,
        }
    except Exception as exc:  # noqa: BLE001
        log.error("Groq call failed: %s", exc)
        return _draft_failure(str(exc))


def _draft_failure(msg: str, status: str = "Drafting Failed") -> Dict[str, Any]:
    return {"cover_letter": "", "tailored_resume": "", "status": status, "error": msg}


def _cover_letter_prompt(title: str, description: str, resume: str) -> str:
    return f"""You are an expert career coach. Write a professional cover letter.

Job Title: {title}
Job Description: {description}
Candidate Resume Summary: {resume}

Rules:
- Exactly 3 paragraphs.
- Paragraph 1: Enthusiasm for the role.
- Paragraph 2: 2–3 relevant skills from the resume that match the JD.
- Paragraph 3: Strong closing statement.
- Under 300 words. No placeholders like [Your Name] or [Date].
"""


def _resume_prompt(description: str, resume: str) -> str:
    return f"""Job Description:
{description}

Resume:
{resume}

Rewrite 3 resume bullet points to better match the job description keywords.
Return only the 3 bullets, one per line, each starting with '•'.
"""


# ---------------------------------------------------------------------------
# Node 3 — Save
# ---------------------------------------------------------------------------
_FAILED_STATUSES = {"Failed", "Search Failed", "No Jobs Found", "Drafting Failed"}


def save_to_database(state: AgentState) -> Dict[str, Any]:
    """
    Persist the selected job into Supabase ``jobs`` table via upsert on ``url``.

    Skips silently when:
    - Supabase client is not configured
    - The pipeline already failed upstream
    - The selected job has no URL (cannot deduplicate without it)

    NOTE (B3): Only the job row is saved here. The applications row
    (with user_id + cover_letter) will be saved by the FastAPI layer in Module 5
    once an authenticated user context is available.
    """
    log.info("[Node 3] Saving to Supabase...")

    if not supabase:
        log.warning("Supabase not configured — skipping DB save.")
        return {"status": "DB Skipped (No Connection)"}

    if state.get("status") in _FAILED_STATUSES:
        log.warning("Pipeline failed ('%s') — skipping DB save.", state.get("status"))
        return {"status": state.get("status", "Failed")}

    job = state.get("selected_job") or {}
    url = job.get("url", "")
    if not url:
        log.warning("Job has no URL — cannot upsert.")
        return {"status": "DB Skipped (No URL)"}

    try:
        row = {
            "title": job.get("title", "Unknown"),
            "company": job.get("company", "Unknown"),
            "url": url,
            "description": job.get("description", ""),
            "source": job.get("source", "DuckDuckGo"),
        }
        supabase.table("jobs").upsert(row, on_conflict="url").execute()
        log.info("Job saved: %s", job.get("title"))
        return {"status": "Saved to DB"}
    except Exception as exc:  # noqa: BLE001
        log.error("DB save failed: %s", exc)
        return {"status": "DB Save Failed", "error": str(exc)}


# ---------------------------------------------------------------------------
# LangGraph compilation
# ---------------------------------------------------------------------------
_workflow = StateGraph(AgentState)
_workflow.add_node("search",  search_jobs)
_workflow.add_node("draft",   draft_documents)
_workflow.add_node("save_db", save_to_database)

_workflow.set_entry_point("search")
_workflow.add_edge("search",  "draft")
_workflow.add_edge("draft",   "save_db")
_workflow.add_edge("save_db", END)

# Public API — imported by main.py and test_agent.py
agent_app = _workflow.compile()
log.info("LangGraph agent compiled.")
