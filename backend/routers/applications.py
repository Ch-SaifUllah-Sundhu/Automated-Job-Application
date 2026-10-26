"""
backend/routers/applications.py
================================
Application management endpoints:
- POST  /applications/apply      Submit an application for a specific job
- GET   /applications            List all applications for the authenticated user
- PATCH /applications/{id}/status Update application lifecycle status (Kanban column)
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from supabase import Client

from dependencies import get_current_user, get_supabase_client

log = logging.getLogger("routers.applications")
router = APIRouter(prefix="/applications", tags=["Applications"])


class ApplyRequest(BaseModel):
    job_id: str = Field(..., description="Target job UUID")
    cover_letter: Optional[str] = Field(None, description="Tailored cover letter text")
    tailored_resume: Optional[str] = Field(None, description="Tailored resume bullets")
    status: Optional[str] = Field("Applied", description="Initial status")


class StatusUpdateRequest(BaseModel):
    status: str = Field(..., description="New status (Found, Applied, Interview, Offer, Rejected)")


class ApplicationItem(BaseModel):
    id: str
    job_id: str
    job_title: Optional[str] = None
    company: Optional[str] = None
    url: Optional[str] = None
    status: str
    review_status: Optional[str] = "pending"
    cover_letter: Optional[str] = None
    tailored_resume: Optional[str] = None
    applied_at: Optional[str] = None
    created_at: Optional[str] = None
    match_score: Optional[float] = None
    missing_skills: Optional[List[str]] = None


@router.post("/apply", response_model=ApplicationItem, summary="Apply to a job")
async def apply_to_job(
    req: ApplyRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
) -> ApplicationItem:
    """
    Creates or updates an application row for the authenticated user and job.
    """
    user_id = current_user["id"]
    try:
        # Verify job exists
        job_res = supabase.table("jobs").select("id, title, company, url").eq("id", req.job_id).limit(1).execute()
        if not job_res or not job_res.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Job with ID '{req.job_id}' not found",
            )
        job_data = job_res.data[0]

        now_iso = datetime.now(timezone.utc).isoformat()
        app_row = {
            "user_id": user_id,
            "job_id": req.job_id,
            "status": req.status or "Applied",
            "cover_letter": req.cover_letter or "",
            "tailored_resume": req.tailored_resume or "",
            "applied_at": now_iso,
        }

        # Upsert application on (user_id, job_id)
        res = supabase.table("applications").upsert(app_row, on_conflict="user_id,job_id").execute()
        if not res or not res.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to record application",
            )
        saved = res.data[0]

        return ApplicationItem(
            id=str(saved.get("id")),
            job_id=req.job_id,
            job_title=job_data.get("title"),
            company=job_data.get("company"),
            url=job_data.get("url"),
            status=saved.get("status", "Applied"),
            review_status=saved.get("review_status", "pending"),
            cover_letter=saved.get("cover_letter"),
            tailored_resume=saved.get("tailored_resume"),
            applied_at=saved.get("applied_at"),
            created_at=saved.get("created_at"),
            match_score=saved.get("match_score"),
            missing_skills=saved.get("missing_skills"),
        )
    except HTTPException:
        raise
    except Exception as exc:
        log.error("Failed to apply for job %s: %s", req.job_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Application recording failed: {exc}",
        ) from exc


@router.get("", response_model=List[ApplicationItem], summary="List user applications")
async def list_applications(
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
) -> List[ApplicationItem]:
    """Returns all applications belonging to the authenticated user."""
    user_id = current_user["id"]
    try:
        res = (
            supabase.table("applications")
            .select("*, jobs(title, company, url)")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        items: List[ApplicationItem] = []
        for row in res.data or []:
            job_info = row.get("jobs") or {}
            items.append(
                ApplicationItem(
                    id=str(row.get("id")),
                    job_id=str(row.get("job_id")),
                    job_title=job_info.get("title"),
                    company=job_info.get("company"),
                    url=job_info.get("url"),
                    status=row.get("status", "Found"),
                    review_status=row.get("review_status", "pending"),
                    cover_letter=row.get("cover_letter"),
                    tailored_resume=row.get("tailored_resume"),
                    applied_at=row.get("applied_at"),
                    created_at=row.get("created_at"),
                    match_score=row.get("match_score"),
                    missing_skills=row.get("missing_skills"),
                )
            )
        return items
    except Exception as exc:
        log.error("Failed to list applications for %s: %s", user_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve applications",
        ) from exc


@router.patch("/{application_id}/status", response_model=ApplicationItem, summary="Update status")
async def update_status(
    application_id: str,
    req: StatusUpdateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
) -> ApplicationItem:
    """Updates the status of an application (e.g. for Kanban column movement)."""
    user_id = current_user["id"]
    valid_statuses = {"Found", "Applied", "Interview", "Offer", "Rejected"}
    if req.status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status '{req.status}'. Must be one of: {', '.join(sorted(valid_statuses))}",
        )

    try:
        res = (
            supabase.table("applications")
            .update({"status": req.status})
            .eq("id", application_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not res or not res.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Application not found or not owned by user",
            )
        updated = res.data[0]
        return ApplicationItem(
            id=str(updated.get("id")),
            job_id=str(updated.get("job_id")),
            status=updated.get("status"),
            review_status=updated.get("review_status"),
            cover_letter=updated.get("cover_letter"),
            tailored_resume=updated.get("tailored_resume"),
            applied_at=updated.get("applied_at"),
            created_at=updated.get("created_at"),
            match_score=updated.get("match_score"),
            missing_skills=updated.get("missing_skills"),
        )
    except HTTPException:
        raise
    except Exception as exc:
        log.error("Failed to update status for application %s: %s", application_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update application status",
        ) from exc
