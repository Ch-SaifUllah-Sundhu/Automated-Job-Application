"""
Module 5 (Stub): FastAPI REST API
====================================
Routes planned:
  GET  /              → health check
  POST /search-jobs   → trigger agent search
  POST /apply         → trigger full pipeline (search + draft + save)

NOTE: Full implementation is Module 5. This file currently exposes only
the health-check endpoint and a wired-up /search-jobs stub so that the
agent can be triggered from the API layer right now.
"""

from __future__ import annotations

import os
import logging

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

# Load .env from project root
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

log = logging.getLogger(__name__)

try:
    from supabase import create_client, Client as SupabaseClient  # type: ignore
    if SUPABASE_URL and SUPABASE_KEY:
        supabase: SupabaseClient | None = create_client(SUPABASE_URL, SUPABASE_KEY)
        log.info("✅ Supabase connected.")
    else:
        supabase = None
        log.warning("⚠️  Supabase keys missing.")
except ImportError:
    supabase = None

app = FastAPI(
    title="Job Application Assistant API",
    description="AI-powered job search, cover letter drafting, and application tracking.",
    version="0.4.0",
)


# ─────────────────────────────────────────────────────────────────────────────
# Pydantic Models
# ─────────────────────────────────────────────────────────────────────────────
class JobSearchRequest(BaseModel):
    keywords: str
    location: str = "Remote"
    user_resume: str = ""


# ─────────────────────────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/", summary="Health Check")
def read_root():
    """Returns API status — useful for load-balancer pings."""
    return {"message": "Job Application Assistant API is running!", "version": "0.4.0"}


@app.post("/search-jobs", summary="Run full agent pipeline")
def search_jobs_endpoint(req: JobSearchRequest):
    """
    Triggers the LangGraph agent:
      1. Searches DuckDuckGo for jobs matching keywords + location.
      2. Drafts a cover letter and tailored resume via Groq / Llama 3.
      3. Saves the job to Supabase.

    Returns the complete agent state as JSON.

    BUG (Module 5 TODO): No authentication — any caller can trigger the pipeline.
    This will be fixed when Supabase Auth middleware is added in Module 6.
    """
    try:
        from agent import agent_app, AgentState  # type: ignore  # noqa: PLC0415

        initial_state: AgentState = {
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
        result = agent_app.invoke(initial_state)
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
