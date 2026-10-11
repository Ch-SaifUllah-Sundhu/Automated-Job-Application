"""
backend/routers/jobs.py
=======================
Job discovery and listing endpoints:
- POST /search-jobs  Run LangGraph search & tailoring pipeline (authenticated, Bug B2 fix)
- GET  /jobs         Paginated list of saved jobs
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from supabase import Client

from agent import AgentState, agent_app
from dependencies import get_current_user, get_supabase_client

log = logging.getLogger("routers.jobs")
router = APIRouter(tags=["Jobs"])


class JobSearchRequest(BaseModel):
    keywords: str = Field(..., min_length=2, json_schema_extra={"example": "Python Developer"})
    location: str = Field("Remote", json_schema_extra={"example": "Remote"})
    user_resume: Optional[str] = Field(
        None,
        description="Candidate's resume text. If omitted, uses base_resume_text from user profile.",
    )


class JobSearchResponse(BaseModel):
    status: str
    jobs_found: int
    selected_job: Optional[Dict[str, Any]]
    cover_letter: str
    tailored_resume: str
    error: Optional[str]


class JobItem(BaseModel):
    id: str
    title: str
    company: str
    url: str
    description: Optional[str] = None
    source: Optional[str] = None
    created_at: Optional[str] = None


class JobListResponse(BaseModel):
    jobs: List[JobItem]
    total: int
    page: int
    limit: int


@router.post(
    "/search-jobs",
    response_model=JobSearchResponse,
    summary="Run AI agent search & document generation pipeline",
)
async def search_jobs(
    req: JobSearchRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
) -> JobSearchResponse:
    """
    Executes the LangGraph search and document generation pipeline.
    Requires authenticated user (Bug B2 fixed).
    Persists application row with user_id context (Bug B3 fixed).
    """
    resume_text = req.user_resume
    # If resume text is not supplied in the request body, load from user profile
    if not resume_text:
        try:
            prof_res = (
                supabase.table("profiles")
                .select("base_resume_text")
                .eq("id", current_user["id"])
                .limit(1)
                .execute()
            )
            if prof_res and prof_res.data and len(prof_res.data) > 0:
                resume_text = prof_res.data[0].get("base_resume_text") or ""
        except Exception as exc:
            log.warning("Could not fetch user profile resume: %s", exc)
            resume_text = ""

    initial_state: AgentState = {
        "keywords": req.keywords,
        "location": req.location,
        "user_resume": resume_text or "",
        "found_jobs": [],
        "selected_job": None,
        "tailored_resume": "",
        "cover_letter": "",
        "status": "",
        "error": None,
        "user_id": current_user["id"],
    }

    try:
        result = agent_app.invoke(initial_state)
        return JobSearchResponse(
            status=result.get("status", ""),
            jobs_found=len(result.get("found_jobs", [])),
            selected_job=result.get("selected_job"),
            cover_letter=result.get("cover_letter", ""),
            tailored_resume=result.get("tailored_resume", ""),
            error=result.get("error"),
        )
    except Exception as exc:
        log.error("Job search pipeline execution failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Agent pipeline failed: {exc}",
        ) from exc


@router.get(
    "/jobs",
    response_model=JobListResponse,
    summary="Get paginated list of jobs",
)
async def list_jobs(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    query: Optional[str] = Query(None, description="Optional keyword filter"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
) -> JobListResponse:
    """Returns paginated jobs from the Supabase jobs table."""
    try:
        offset = (page - 1) * limit
        req_query = supabase.table("jobs").select("*", count="exact")

        if query:
            req_query = req_query.ilike("title", f"%{query}%")

        res = req_query.order("created_at", desc=True).range(offset, offset + limit - 1).execute()

        jobs_data = res.data or []
        total = res.count if res.count is not None else len(jobs_data)

        items = [
            JobItem(
                id=str(j.get("id")),
                title=j.get("title", ""),
                company=j.get("company", ""),
                url=j.get("url", ""),
                description=j.get("description"),
                source=j.get("source"),
                created_at=j.get("created_at"),
            )
            for j in jobs_data
        ]

        return JobListResponse(
            jobs=items,
            total=total,
            page=page,
            limit=limit,
        )
    except Exception as exc:
        log.error("Failed to fetch jobs: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve jobs list",
        ) from exc
