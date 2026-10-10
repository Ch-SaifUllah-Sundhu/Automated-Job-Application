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
# Node 1 — Search  (multi-portal, multi-query, deduplication)
# ---------------------------------------------------------------------------

# Job portals searched in order of popularity.
# Split into separate queries because DuckDuckGo's multi-site OR is unreliable.
_JOB_PORTALS: List[Dict[str, str]] = [
    {"name": "LinkedIn",     "site": "linkedin.com/jobs"},
    {"name": "Indeed",       "site": "indeed.com"},
    {"name": "Glassdoor",    "site": "glassdoor.com/job"},
    {"name": "Greenhouse",   "site": "greenhouse.io"},
    {"name": "Lever",        "site": "jobs.lever.co"},
    {"name": "Wellfound",    "site": "wellfound.com/jobs"},
    {"name": "Remoteok",     "site": "remoteok.com"},
    {"name": "We Work Remotely", "site": "weworkremotely.com"},
    {"name": "Himalayas",    "site": "himalayas.app"},
    {"name": "Workable",     "site": "apply.workable.com"},
]

_MAX_PER_PORTAL = 3    # results fetched per portal query
_MAX_TOTAL      = 15   # cap on total jobs returned
_MAX_RETRIES    = 3    # DDG retries per query
_RETRY_DELAY    = 2    # seconds (doubles each retry)


def search_jobs(state: AgentState) -> Dict[str, Any]:
    """
    Search 10+ job portals via DuckDuckGo text search.

    Strategy:
    1. Run a site-specific query per portal (e.g. site:linkedin.com/jobs).
    2. Deduplicate results by URL across all portals.
    3. If total results < 3, run a fallback open query (no site filter).
    4. Each DDG call retries up to 3× with exponential back-off.

    Returns up to ``_MAX_TOTAL`` unique jobs.
    """
    keywords, location = state["keywords"], state["location"]
    log.info("[Node 1] Searching '%s' in '%s' across %d portals.",
             keywords, location, len(_JOB_PORTALS))

    seen_urls: set = set()
    all_jobs: List[Dict[str, Any]] = []
    last_error: str = ""

    # ── Pass 1: portal-specific queries ──────────────────────────────────
    for portal in _JOB_PORTALS:
        if len(all_jobs) >= _MAX_TOTAL:
            break

        query = (
            f'{keywords} jobs {location} site:{portal["site"]}'
        )
        results = _ddg_search(query, _MAX_PER_PORTAL)

        if isinstance(results, str):          # error string returned
            last_error = results
            log.warning("Portal '%s' failed: %s", portal["name"], results)
            continue

        new = 0
        for r in results:
            url = r.get("href", "")
            if url and url not in seen_urls:
                seen_urls.add(url)
                job = _parse_ddg_result(r, source=portal["name"])
                all_jobs.append(job)
                new += 1

        log.info("  %-20s → %d new result(s)", portal["name"], new)
        time.sleep(0.8)   # be polite between portal queries

    # ── Pass 2: open fallback if portals returned too little ─────────────
    if len(all_jobs) < 3:
        log.info("Too few results (%d). Running open fallback query.", len(all_jobs))
        fallback_queries = [
            f"{keywords} job openings {location}",
            f"{keywords} remote job hiring",
            f"{keywords} developer job {location} apply",
        ]
        for fq in fallback_queries:
            if len(all_jobs) >= _MAX_TOTAL:
                break
            results = _ddg_search(fq, _MAX_PER_PORTAL)
            if isinstance(results, str):
                last_error = results
                continue
            for r in results:
                url = r.get("href", "")
                if url and url not in seen_urls:
                    seen_urls.add(url)
                    all_jobs.append(_parse_ddg_result(r, source="Web"))
            time.sleep(0.8)

    total = len(all_jobs)
    log.info("Search complete. Total unique jobs: %d", total)

    if total == 0:
        return {
            "found_jobs": [],
            "status": "Search Failed",
            "error": last_error or "No jobs found across all portals and fallback queries.",
        }

    return {"found_jobs": all_jobs[:_MAX_TOTAL], "status": "Jobs Found", "error": None}


def _ddg_search(query: str, max_results: int) -> List[Dict[str, Any]] | str:
    """
    Run a single DuckDuckGo text search with retry + back-off.
    Returns the result list on success, or an error string on total failure.
    """
    for attempt in range(1, _MAX_RETRIES + 1):
        try:
            raw = DDGS().text(query, max_results=max_results)
            return raw or []
        except Exception as exc:  # noqa: BLE001
            if attempt < _MAX_RETRIES:
                time.sleep(_RETRY_DELAY ** attempt)
            else:
                return str(exc)
    return []


def _parse_ddg_result(r: Dict[str, Any], source: str = "DuckDuckGo") -> Dict[str, Any]:
    """Map a raw DDGS result dict to our internal job schema."""
    title: str = r.get("title", "Unknown")
    # Try to extract company from common 'Title - Company' or 'Title at Company' formats
    if " - " in title:
        company = title.split(" - ")[-1].strip()
    elif " at " in title.lower():
        company = title.lower().split(" at ")[-1].strip().title()
    else:
        company = "Unknown"
    return {
        "title": title,
        "url": r.get("href", ""),
        "description": r.get("body", ""),
        "company": company,
        "source": source,
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
