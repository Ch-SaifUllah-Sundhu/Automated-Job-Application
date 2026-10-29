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
    status: Optional[str] = Field(None, description="Initial status, defaults to 'Found'")
    workflow_status: Optional[str] = Field(None, description="Workflow status (discovered, drafting, awaiting_review)")
    mode: Optional[str] = Field("automatic", description="Application mode: automatic or manual")


class StatusUpdateRequest(BaseModel):
    status: str = Field(..., description="New status (Found, Applied, Interview, Offer, Rejected, Manual Required)")


class ReviewUpdateRequest(BaseModel):
    cover_letter: Optional[str] = Field(None, description="Edited cover letter text")
    tailored_resume: Optional[str] = Field(None, description="Edited tailored resume text")
    review_status: Optional[str] = Field(None, description="'pending', 'changes_requested', or 'rejected'")


class ManualCompleteRequest(BaseModel):
    submission_reference: Optional[str] = Field(None, description="Optional portal confirmation code or reference ID")
    notes: Optional[str] = Field(None, description="Optional candidate notes on manual submission")


class AutomationLogItem(BaseModel):
    id: Optional[str] = None
    event: str
    detail: Optional[str] = None
    screenshot_url: Optional[str] = None
    created_at: Optional[str] = None


class ApplicationItem(BaseModel):
    id: str
    job_id: str
    job_title: Optional[str] = None
    company: Optional[str] = None
    url: Optional[str] = None
    status: str
    review_status: Optional[str] = "pending"
    workflow_status: Optional[str] = "discovered"
    draft_version: Optional[int] = 1
    mode: Optional[str] = "automatic"
    submission_mode: Optional[str] = None
    submission_reference: Optional[str] = None
    failure_reason: Optional[str] = None
    cover_letter: Optional[str] = None
    tailored_resume: Optional[str] = None
    applied_at: Optional[str] = None
    last_submitted_at: Optional[str] = None
    created_at: Optional[str] = None
    match_score: Optional[float] = None
    missing_skills: Optional[List[str]] = None


class ApplicationDetailItem(ApplicationItem):
    job_description: Optional[str] = None
    job_location: Optional[str] = None
    required_skills: Optional[str] = None
    missing_fields: Optional[List[str]] = None
    logs: Optional[List[AutomationLogItem]] = None


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
        initial_status = req.status or "Found"
        is_already_applied = (initial_status == "Applied")

        app_row: Dict[str, Any] = {
            "user_id": user_id,
            "job_id": req.job_id,
            "status": initial_status,
            "workflow_status": req.workflow_status or ("awaiting_review" if (req.cover_letter or req.tailored_resume) else "discovered"),
            "mode": req.mode or "automatic",
            "cover_letter": req.cover_letter or "",
            "tailored_resume": req.tailored_resume or "",
            "applied_at": now_iso if is_already_applied else None,
        }

        # Upsert application on (user_id, job_id)
        try:
            res = supabase.table("applications").upsert(app_row, on_conflict="user_id,job_id").execute()
        except Exception as up_exc:
            # Fallback if workflow_status / mode columns are not yet in Supabase table
            retry_row = dict(app_row)
            retry_row.pop("workflow_status", None)
            retry_row.pop("mode", None)
            res = supabase.table("applications").upsert(retry_row, on_conflict="user_id,job_id").execute()

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
            status=saved.get("status", initial_status),
            review_status=saved.get("review_status", "pending"),
            workflow_status=saved.get("workflow_status", "discovered"),
            draft_version=saved.get("draft_version", 1),
            mode=saved.get("mode", "automatic"),
            submission_mode=saved.get("submission_mode"),
            submission_reference=saved.get("submission_reference"),
            failure_reason=saved.get("failure_reason"),
            cover_letter=saved.get("cover_letter"),
            tailored_resume=saved.get("tailored_resume"),
            applied_at=saved.get("applied_at"),
            last_submitted_at=saved.get("last_submitted_at"),
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
                    workflow_status=row.get("workflow_status", "discovered"),
                    draft_version=row.get("draft_version", 1),
                    mode=row.get("mode", "automatic"),
                    submission_mode=row.get("submission_mode"),
                    submission_reference=row.get("submission_reference"),
                    failure_reason=row.get("failure_reason"),
                    cover_letter=row.get("cover_letter"),
                    tailored_resume=row.get("tailored_resume"),
                    applied_at=row.get("applied_at"),
                    last_submitted_at=row.get("last_submitted_at"),
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
    valid_statuses = {"Found", "Applied", "Interview", "Offer", "Rejected", "Manual Required"}
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
            workflow_status=updated.get("workflow_status", "discovered"),
            draft_version=updated.get("draft_version", 1),
            mode=updated.get("mode", "automatic"),
            submission_mode=updated.get("submission_mode"),
            submission_reference=updated.get("submission_reference"),
            failure_reason=updated.get("failure_reason"),
            cover_letter=updated.get("cover_letter"),
            tailored_resume=updated.get("tailored_resume"),
            applied_at=updated.get("applied_at"),
            last_submitted_at=updated.get("last_submitted_at"),
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


@router.get("/{application_id}", response_model=ApplicationDetailItem, summary="Get application details")
async def get_application_details(
    application_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
) -> ApplicationDetailItem:
    """Returns single application with full job details, missing fields, and automation logs."""
    user_id = current_user["id"]
    try:
        res = (
            supabase.table("applications")
            .select("*, jobs(title, company, url, description, required_skills)")
            .eq("id", application_id)
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        if not res or not res.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Application not found or not owned by user",
            )
        row = res.data[0]
        job_info = row.get("jobs") or {}

        # Fetch recent automation logs
        logs_res = (
            supabase.table("automation_logs")
            .select("*")
            .eq("application_id", application_id)
            .order("created_at", desc=False)
            .limit(30)
            .execute()
        )
        log_items = [
            AutomationLogItem(
                id=str(lg.get("id")),
                event=lg.get("event", "info"),
                detail=lg.get("detail"),
                screenshot_url=lg.get("screenshot_url"),
                created_at=lg.get("created_at"),
            )
            for lg in (logs_res.data or [])
        ] if logs_res and logs_res.data else []

        return ApplicationDetailItem(
            id=str(row.get("id")),
            job_id=str(row.get("job_id")),
            job_title=job_info.get("title"),
            company=job_info.get("company"),
            url=job_info.get("url"),
            job_description=job_info.get("description"),
            job_location=job_info.get("location") or "Remote",
            required_skills=job_info.get("required_skills"),
            status=row.get("status", "Found"),
            review_status=row.get("review_status", "pending"),
            workflow_status=row.get("workflow_status", "discovered"),
            draft_version=row.get("draft_version", 1),
            mode=row.get("mode", "automatic"),
            submission_mode=row.get("submission_mode"),
            submission_reference=row.get("submission_reference"),
            failure_reason=row.get("failure_reason"),
            cover_letter=row.get("cover_letter"),
            tailored_resume=row.get("tailored_resume"),
            applied_at=row.get("applied_at"),
            last_submitted_at=row.get("last_submitted_at"),
            created_at=row.get("created_at"),
            match_score=row.get("match_score"),
            missing_skills=row.get("missing_skills"),
            missing_fields=row.get("missing_fields"),
            logs=log_items,
        )
    except HTTPException:
        raise
    except Exception as exc:
        log.error("Failed to get application %s: %s", application_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve application details",
        ) from exc


@router.patch("/{application_id}/review", response_model=ApplicationDetailItem, summary="Update review state and documents")
async def update_review(
    application_id: str,
    req: ReviewUpdateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
) -> ApplicationDetailItem:
    """Updates tailored cover letter / resume bullets and review status."""
    user_id = current_user["id"]
    update_data: Dict[str, Any] = {}
    if req.cover_letter is not None:
        update_data["cover_letter"] = req.cover_letter
    if req.tailored_resume is not None:
        update_data["tailored_resume"] = req.tailored_resume
    if req.review_status is not None:
        if req.review_status == "approved":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Direct approval via review update endpoint is prohibited. Call PATCH /applications/{id}/approve to formally approve submission.",
            )
        if req.review_status not in {"pending", "changes_requested", "rejected"}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="review_status must be 'pending', 'changes_requested', or 'rejected'",
            )
        update_data["review_status"] = req.review_status

    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields provided to update",
        )

    # When draft documents are edited, update workflow status to awaiting_approval
    update_data["workflow_status"] = "awaiting_approval"

    try:
        try:
            res = (
                supabase.table("applications")
                .update(update_data)
                .eq("id", application_id)
                .eq("user_id", user_id)
                .execute()
            )
        except Exception as up_exc:
            # Fallback if workflow_status column is not yet migrated
            update_data.pop("workflow_status", None)
            res = (
                supabase.table("applications")
                .update(update_data)
                .eq("id", application_id)
                .eq("user_id", user_id)
                .execute()
            )

        if not res or not res.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Application not found or not owned by user",
            )
        return await get_application_details(application_id, current_user, supabase)
    except HTTPException:
        raise
    except Exception as exc:
        log.error("Failed to update review for %s: %s", application_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update application review",
        ) from exc


@router.post("/{application_id}/manual-complete", response_model=ApplicationDetailItem, summary="Confirm manual external submission")
async def manual_complete_application(
    application_id: str,
    req: Optional[ManualCompleteRequest] = None,
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
) -> ApplicationDetailItem:
    """
    Allows the candidate to self-report external submission on the job portal.
    Accurately sets status='Applied', workflow_status='submitted', and submission_mode='manual_confirmed'.
    """
    user_id = current_user["id"]
    now_iso = datetime.now(timezone.utc).isoformat()
    ref = req.submission_reference if req else None

    update_payload: Dict[str, Any] = {
        "status": "Applied",
        "workflow_status": "submitted",
        "submission_mode": "manual_confirmed",
        "submission_reference": ref,
        "applied_at": now_iso,
        "last_submitted_at": now_iso,
    }

    try:
        try:
            res = (
                supabase.table("applications")
                .update(update_payload)
                .eq("id", application_id)
                .eq("user_id", user_id)
                .execute()
            )
        except Exception as m_exc:
            # Fallback if extended columns are not yet migrated
            retry_payload = {
                "status": "Applied",
                "applied_at": now_iso,
            }
            res = (
                supabase.table("applications")
                .update(retry_payload)
                .eq("id", application_id)
                .eq("user_id", user_id)
                .execute()
            )

        if not res or not res.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Application not found or not owned by user",
            )

        # Audit log entry
        try:
            detail_msg = "Candidate confirmed manual external submission on portal."
            if ref:
                detail_msg += f" Reference: {ref}"
            supabase.table("automation_logs").insert({
                "application_id": application_id,
                "event": "submitted",
                "detail": detail_msg,
            }).execute()
        except Exception as l_err:
            log.warning("Could not write automation log for manual-complete: %s", l_err)

        return await get_application_details(application_id, current_user, supabase)
    except HTTPException:
        raise
    except Exception as exc:
        log.error("Failed to complete manual submission for %s: %s", application_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to record manual submission",
        ) from exc


@router.patch("/{application_id}/approve", response_model=ApplicationDetailItem, summary="Approve application for submission")
async def approve_application(
    application_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
) -> ApplicationDetailItem:
    """
    Module 8 Human-in-Loop: Approves tailored documents and queues
    background automation worker to prepare/submit the application.
    Does NOT falsely mark status as 'Applied' before verified submission.
    """
    user_id = current_user["id"]
    try:
        # 1. Fetch current application to validate ownership and draft completeness
        existing_res = (
            supabase.table("applications")
            .select("*, jobs(title, company, url)")
            .eq("id", application_id)
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        if not existing_res or not existing_res.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Application not found or not owned by user",
            )
        app_data = existing_res.data[0]

        # Verify that draft documents exist
        has_draft = bool(app_data.get("cover_letter") or app_data.get("tailored_resume"))
        if not has_draft:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot approve an empty application. Please prepare cover letter or resume bullets first.",
            )

        # 2. Update review_status to 'approved', workflow_status to 'queued'
        # NOTE: DO NOT set status to 'Applied' or applied_at to now. Status remains awaiting external verification.
        try:
            res = (
                supabase.table("applications")
                .update({
                    "review_status": "approved",
                    "workflow_status": "queued",
                })
                .eq("id", application_id)
                .eq("user_id", user_id)
                .execute()
            )
        except Exception:
            res = (
                supabase.table("applications")
                .update({
                    "review_status": "approved",
                })
                .eq("id", application_id)
                .eq("user_id", user_id)
                .execute()
            )

        if not res or not res.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Application not found or not owned by user",
            )

        # 3. Log approval event in automation_logs
        try:
            supabase.table("automation_logs").insert({
                "application_id": application_id,
                "event": "approved",
                "detail": "Application approved by user. Queued for background automation processing.",
            }).execute()
        except Exception as log_err:
            log.warning("Could not write automation log for approve: %s", log_err)

        # 4. Trigger Celery worker (gracefully fall back if Redis is offline)
        try:
            from workers.tasks.automation_task import submit_application
            submit_application.delay(application_id=application_id, user_id=user_id)
            log.info("Celery task enqueued for application %s", application_id)
        except Exception as celery_err:
            log.warning("Celery/Redis worker offline (%s) — recording queue_failed status.", celery_err)
            try:
                supabase.table("applications").update({
                    "workflow_status": "queue_failed",
                    "failure_reason": f"Background worker dispatch failed: {celery_err}. Manual submission required.",
                }).eq("id", application_id).execute()
            except Exception:
                pass
        except Exception as celery_err:
            log.warning("Celery/Redis worker offline (%s) — application approved in database.", celery_err)

        return await get_application_details(application_id, current_user, supabase)
    except HTTPException:
        raise
    except Exception as exc:
        log.error("Failed to approve application %s: %s", application_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Approval failed: {exc}",
        ) from exc


@router.get("/{application_id}/logs", response_model=List[AutomationLogItem], summary="Get automation logs")
async def get_automation_logs(
    application_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
) -> List[AutomationLogItem]:
    """Retrieves execution audit logs for an application."""
    user_id = current_user["id"]
    try:
        # Verify ownership
        app_check = (
            supabase.table("applications")
            .select("id")
            .eq("id", application_id)
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        if not app_check or not app_check.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Application not found or not owned by user",
            )

        res = (
            supabase.table("automation_logs")
            .select("*")
            .eq("application_id", application_id)
            .order("created_at", desc=False)
            .execute()
        )
        return [
            AutomationLogItem(
                id=str(row.get("id")),
                event=row.get("event", "info"),
                detail=row.get("detail"),
                screenshot_url=row.get("screenshot_url"),
                created_at=row.get("created_at"),
            )
            for row in (res.data or [])
        ]
    except HTTPException:
        raise
    except Exception as exc:
        log.error("Failed to retrieve logs for %s: %s", application_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve automation logs",
        ) from exc
