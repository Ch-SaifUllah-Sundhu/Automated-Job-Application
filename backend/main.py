"""
backend/main.py
===============
Module 5 (stub) — FastAPI REST API

Current routes
--------------
GET  /              Health check
POST /search-jobs   Run full LangGraph pipeline and return results

TODO (Module 5)
---------------
- Add Supabase JWT auth middleware to protect /search-jobs
- POST /apply  — save application row with authenticated user_id
- Proper HTTP error codes per failure status
"""

from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from typing import Any, Dict, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

log = logging.getLogger("main")

# ---------------------------------------------------------------------------
# Supabase (optional — API works without it)
# ---------------------------------------------------------------------------
_SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
_SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")

try:
    from supabase import Client as _SupabaseClient
    from supabase import create_client as _create_client

    supabase: _SupabaseClient | None = (
        _create_client(_SUPABASE_URL, _SUPABASE_KEY)
        if _SUPABASE_URL and _SUPABASE_KEY
        else None
    )
except ImportError:
    supabase = None


# ---------------------------------------------------------------------------
# App lifecycle
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(_: FastAPI):
    log.info("Job Application Assistant API starting up...")
    yield
    log.info("Shutting down.")


app = FastAPI(
    title="Job Application Assistant API",
    description=(
        "AI-powered job search, cover letter drafting, and application tracking.\n\n"
        "**Stack:** FastAPI · LangGraph · Groq (Llama 3) · Supabase · DuckDuckGo"
    ),
    version="0.4.0",
    lifespan=lifespan,
)


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------
class JobSearchRequest(BaseModel):
    keywords: str = Field(..., min_length=2, example="Python Developer")
    location: str = Field("Remote", example="Remote")
    user_resume: str = Field(
        "",
        description="Candidate's resume text — used by Groq to tailor the cover letter.",
    )


class JobSearchResponse(BaseModel):
    status: str
    jobs_found: int
    selected_job: Optional[Dict[str, Any]]
    cover_letter: str
    tailored_resume: str
    error: Optional[str]


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.get("/", summary="Health check", tags=["System"])
def health_check() -> Dict[str, str]:
    """Returns API version and running status for load-balancer pings."""
    return {"status": "ok", "version": app.version}


@app.post(
    "/search-jobs",
    response_model=JobSearchResponse,
    summary="Run the full AI agent pipeline",
    tags=["Agent"],
)
def search_jobs(req: JobSearchRequest) -> JobSearchResponse:
    """
    Triggers the LangGraph agent:

    1. **search_jobs** — DuckDuckGo job search (3× retry)
    2. **draft_documents** — Groq / Llama 3 cover letter + resume bullets
    3. **save_to_database** — Supabase upsert on jobs table

    Returns the complete pipeline result as structured JSON.

    > ⚠️ **No authentication yet** (Module 5 TODO — B2).
    """
    try:
        # Import here to avoid circular import at module load
        from agent import AgentState, agent_app  # noqa: PLC0415

        initial: AgentState = {
            "keywords": req.keywords,
            "location": req.location,
            "user_resume": req.user_resume,
            "found_jobs": [],
            "selected_job": None,
            "tailored_resume": "",
            "cover_letter": "",
            "status": "",
            "error": None,
        }

        result = agent_app.invoke(initial)

        return JobSearchResponse(
            status=result.get("status", ""),
            jobs_found=len(result.get("found_jobs", [])),
            selected_job=result.get("selected_job"),
            cover_letter=result.get("cover_letter", ""),
            tailored_resume=result.get("tailored_resume", ""),
            error=result.get("error"),
        )

    except Exception as exc:  # noqa: BLE001
        log.error("Agent pipeline error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc
