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

from fastapi import APIRouter, Depends, HTTPException, Query, Security, status
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from supabase import Client

from agent import AgentState, agent_app
from dependencies import get_current_user, get_supabase_client, security
from services.match_service import compute_match_score

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
    match_score: Optional[float] = None
    missing_skills: Optional[List[str]] = None
    matched_skills: Optional[List[str]] = None


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
    credentials: HTTPAuthorizationCredentials | None = Security(security),
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

    token_str = credentials.credentials if credentials else None
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
        "user_token": token_str,
        "supabase_client": supabase,
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


def _parse_embedding(val: Any) -> Optional[List[float]]:
    if val is None:
        return None
    if isinstance(val, list):
        return [float(x) for x in val]
    if isinstance(val, str):
        s = val.strip()
        if s.startswith("[") and s.endswith("]"):
            try:
                import json
                return [float(x) for x in json.loads(s)]
            except Exception:
                pass
    return None


@router.get(
    "/jobs",
    response_model=JobListResponse,
    summary="Get paginated list of jobs with semantic match scoring",
)
async def list_jobs(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    query: Optional[str] = Query(None, description="Optional keyword filter"),
    portal: Optional[str] = Query(None, description="Filter by portal / source"),
    sort: Optional[str] = Query(None, description="Sort field: 'match_score' or 'created_at'"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
) -> JobListResponse:
    """Returns paginated jobs enriched with candidate Sentence-BERT match score and skill gaps."""
    try:
        offset = (page - 1) * limit
        req_query = supabase.table("jobs").select("*", count="exact")

        if query:
            clean_q = query.strip()
            req_query = req_query.or_(
                f"title.ilike.%{clean_q}%,company.ilike.%{clean_q}%,description.ilike.%{clean_q}%"
            )
        if portal:
            req_query = req_query.ilike("source", f"%{portal}%")

        res = req_query.order("created_at", desc=True).range(offset, offset + limit - 1).execute()

        jobs_data = res.data or []
        total = res.count if res.count is not None else len(jobs_data)

        # Retrieve candidate profile resume and embedding for real-time match scoring
        user_profile = None
        try:
            prof_res = (
                supabase.table("profiles")
                .select("base_resume_text, embedding")
                .eq("id", current_user["id"])
                .limit(1)
                .execute()
            )
            if prof_res and prof_res.data and len(prof_res.data) > 0:
                user_profile = prof_res.data[0]
        except Exception as p_exc:
            log.warning("Could not fetch profile with embedding (%s); querying base_resume_text only", p_exc)
            try:
                prof_res = (
                    supabase.table("profiles")
                    .select("base_resume_text")
                    .eq("id", current_user["id"])
                    .limit(1)
                    .execute()
                )
                if prof_res and prof_res.data and len(prof_res.data) > 0:
                    user_profile = prof_res.data[0]
            except Exception:
                pass

        resume_text = (user_profile or {}).get("base_resume_text") or ""
        resume_emb = _parse_embedding((user_profile or {}).get("embedding"))

        items: List[JobItem] = []
        for j in jobs_data:
            match_res = None
            if resume_text or resume_emb:
                job_desc = j.get("description") or j.get("title") or ""
                job_emb = _parse_embedding(j.get("embedding"))
                match_res = compute_match_score(
                    resume_text=resume_text,
                    job_description=job_desc,
                    resume_embedding=resume_emb,
                    job_embedding=job_emb,
                    job_required_skills=j.get("required_skills"),
                )

            items.append(
                JobItem(
                    id=str(j.get("id")),
                    title=j.get("title", ""),
                    company=j.get("company", ""),
                    url=j.get("url", ""),
                    description=j.get("description"),
                    source=j.get("source"),
                    created_at=j.get("created_at"),
                    match_score=match_res["match_score"] if match_res else None,
                    missing_skills=match_res["missing_skills"] if match_res else None,
                    matched_skills=match_res["matched_skills"] if match_res else None,
                )
            )

        if sort in ("match_score", "-match_score"):
            items.sort(key=lambda x: (x.match_score is not None, x.match_score or 0.0), reverse=True)

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
