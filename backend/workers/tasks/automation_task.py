"""
backend/workers/tasks/automation_task.py
=========================================
Module 8 — Celery background task: skeleton for Playwright form submission.
Full Playwright implementation is Module 9.

This module defines the Celery task that:
1. Loads the application + user profile from Supabase
2. Logs each step to the automation_logs table
3. (Module 9) Launches headless Playwright to submit the form
4. Updates application.status on success/failure
5. Notifies the user via Supabase Realtime

The task is triggered by PATCH /applications/{id}/approve.
"""

from __future__ import annotations

import logging
import os
import sys
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from dotenv import load_dotenv

# Ensure the backend/ directory is in path when running as Celery worker
_backend_dir = os.path.join(os.path.dirname(__file__), "..", "..")
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

load_dotenv(os.path.join(_backend_dir, "..", ".env"))

from workers.celery_app import celery_app

log = logging.getLogger("workers.automation")


def _get_supabase():
    """
    Supabase client factory for server-side background workers.
    Prefers SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY to safely bypass RLS in trusted worker tasks.
    Falls back to SUPABASE_KEY if service-role credential is not configured.
    """
    from supabase import create_client
    url = os.environ.get("SUPABASE_URL", "")
    key = (
        os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        or os.environ.get("SUPABASE_SERVICE_KEY")
        or os.environ.get("SUPABASE_KEY", "")
    )
    if not url or not key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_KEY must be set")
    return create_client(url, key)


def _log_automation_event(
    supabase,
    application_id: str,
    event: str,
    detail: str,
    screenshot_url: Optional[str] = None,
) -> None:
    """Writes a row to automation_logs table."""
    try:
        supabase.table("automation_logs").insert({
            "application_id": application_id,
            "event": event,
            "detail": detail,
            "screenshot_url": screenshot_url,
        }).execute()
    except Exception as exc:
        log.warning("Failed to write automation log: %s", exc)


@celery_app.task(
    name="workers.tasks.automation_task.submit_application",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def submit_application(self, application_id: str, user_id: str) -> Dict[str, Any]:
    """
    Celery task: submits a job application via headless browser automation.

    Args:
        application_id: UUID of the application row in Supabase.
        user_id: UUID of the authenticated user (for profile lookup).

    Returns:
        Dict with 'status' and 'detail' keys.

    Module 9 will fill in the full Playwright implementation.
    For now, this skeleton: loads the data, logs events, and simulates the flow.
    """
    log.info("[Task] submit_application started: app_id=%s user_id=%s", application_id, user_id)

    try:
        supabase = _get_supabase()

        # ── Step 1: Load application ──────────────────────────────────────
        _log_automation_event(supabase, application_id, "started",
                              "Automation task picked up by Celery worker")

        app_res = (
            supabase.table("applications")
            .select("*, jobs(title, company, url, description)")
            .eq("id", application_id)
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        if not app_res or not app_res.data:
            raise ValueError(f"Application {application_id} not found for user {user_id}")

        app_data = app_res.data[0]
        job_data = app_data.get("jobs") or {}
        job_url = job_data.get("url", "")
        job_title = job_data.get("title", "Unknown Role")
        company = job_data.get("company", "Unknown Company")

        # Idempotency check: don't double-process already submitted applications
        if app_data.get("status") == "Applied" or app_data.get("workflow_status") == "submitted":
            log.info("[Task] Application %s already submitted — skipping duplicate run", application_id)
            return {"status": "already_submitted", "detail": "Application was previously submitted."}

        # Mark application as actively submitting
        try:
            supabase.table("applications").update({
                "workflow_status": "submitting",
            }).eq("id", application_id).execute()
        except Exception:
            pass

        log.info("[Task] Loaded application for '%s' at '%s'", job_title, company)

        # ── Step 2: Load user profile ─────────────────────────────────────
        profile_res = (
            supabase.table("profiles")
            .select("full_name, phone, linkedin_url, github_url, base_resume_text")
            .eq("id", user_id)
            .limit(1)
            .execute()
        )
        profile = (profile_res.data[0] if profile_res and profile_res.data else {})

        # ── Step 3: Validate we have enough data ──────────────────────────
        missing_fields = []
        if not profile.get("full_name"):
            missing_fields.append("full_name")
        if not profile.get("phone"):
            missing_fields.append("phone")

        if missing_fields:
            detail = f"Missing profile fields required for submission: {', '.join(missing_fields)}"
            _log_automation_event(supabase, application_id, "missing_data", detail)
            # Update application to mark missing data
            supabase.table("applications").update({
                "missing_fields": missing_fields,
                "review_status": "pending",
                "workflow_status": "awaiting_review",
            }).eq("id", application_id).execute()
            log.warning("[Task] Missing fields: %s", missing_fields)
            return {"status": "missing_data", "detail": detail, "missing_fields": missing_fields}

        # ── Step 4: Browser Automation State ─────────────────────────────
        # Module 9 will implement the full browser adapter engine.
        # Until headless submission is executed with verified confirmation, we NEVER emit a false "submitted" event.
        log.info("[Task] Direct portal submission pending Module 9 adapter. Routing to manual_required workflow.")
        _log_automation_event(
            supabase, application_id, "manual_required",
            f"Automated portal submission for {company} is awaiting Module 9 browser integration. Application packet ready for manual submission."
        )

        # ── Step 5: Mark application as Manual Required ──────────────────
        supabase.table("applications").update({
            "review_status": "approved",
            "status": "Manual Required",
            "workflow_status": "manual_required",
            "failure_reason": "Automated portal adapter for this domain is scheduled for Module 9. Please complete submission manually via the portal link.",
        }).eq("id", application_id).execute()

        log.info("[Task] submit_application complete with manual_required: app_id=%s", application_id)
        return {
            "status": "manual_required",
            "detail": f"Application prepared for '{job_title}' at {company}. Manual submission on portal required.",
        }

    except Exception as exc:
        log.error("[Task] submit_application failed: %s", exc)
        try:
            supabase = _get_supabase()
            _log_automation_event(
                supabase, application_id, "failed",
                f"Task error: {exc}"
            )
        except Exception:
            pass
        # Retry on transient errors
        raise self.retry(exc=exc) from exc
