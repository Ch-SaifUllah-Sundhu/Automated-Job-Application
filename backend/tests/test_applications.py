"""
backend/tests/test_applications.py
==================================
Unit tests for application pipeline routes:
- GET   /applications            (Auth check + listing)
- POST  /applications/apply      (Create application + 404 on missing job)
- PATCH /applications/{id}/status (Status transitions + invalid state validation)
"""

from __future__ import annotations

import os
import sys
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

# Ensure backend root is on PYTHONPATH
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dependencies import get_current_user, get_supabase_client
from main import app

client = TestClient(app)


def test_list_applications_unauthorized():
    """B2 compliance: /applications returns 401 without auth token."""
    resp = client.get("/applications")
    assert resp.status_code == 401


def test_list_applications_success():
    """Happy path: /applications returns list of user applications."""
    mock_user = {"id": "user-456", "email": "dev@example.com"}
    mock_sb = MagicMock()
    mock_sb.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value.data = [
        {
            "id": "app-001",
            "job_id": "job-101",
            "status": "Found",
            "review_status": "pending",
            "cover_letter": "I am eager to apply...",
            "tailored_resume": "• Built high scale APIs",
            "applied_at": None,
            "created_at": "2026-10-11T12:00:00Z",
            "jobs": {
                "title": "Backend Engineer",
                "company": "TechCorp",
                "url": "https://example.com/job-101",
            },
        }
    ]

    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_supabase_client] = lambda: mock_sb
    try:
        resp = client.get("/applications")
        assert resp.status_code == 200
        items = resp.json()
        assert len(items) == 1
        assert items[0]["job_title"] == "Backend Engineer"
        assert items[0]["company"] == "TechCorp"
        assert items[0]["status"] == "Found"
    finally:
        app.dependency_overrides.clear()


def test_apply_job_not_found():
    """Applying to non-existent job returns 404."""
    mock_user = {"id": "user-456", "email": "dev@example.com"}
    mock_sb = MagicMock()
    # Job select returns empty data
    mock_sb.table.return_value.select.return_value.eq.return_value.limit.return_value.execute.return_value.data = []

    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_supabase_client] = lambda: mock_sb
    try:
        payload = {"job_id": "non-existent-job"}
        resp = client.post("/applications/apply", json=payload)
        assert resp.status_code == 404
        assert "not found" in resp.json()["detail"]
    finally:
        app.dependency_overrides.clear()


def test_apply_job_success():
    """Happy path: user applies to an existing job."""
    mock_user = {"id": "user-456", "email": "dev@example.com"}
    mock_sb = MagicMock()
    # Job exists
    mock_sb.table.return_value.select.return_value.eq.return_value.limit.return_value.execute.return_value.data = [
        {"id": "job-101", "title": "Senior Python Engineer", "company": "Acme", "url": "https://example.com/acme"}
    ]
    # Application upsert succeeds
    mock_sb.table.return_value.upsert.return_value.execute.return_value.data = [
        {
            "id": "app-002",
            "job_id": "job-101",
            "status": "Applied",
            "review_status": "pending",
            "cover_letter": "My cover letter",
            "tailored_resume": "• Python specialist",
            "applied_at": "2026-10-11T12:30:00Z",
            "created_at": "2026-10-11T12:30:00Z",
        }
    ]

    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_supabase_client] = lambda: mock_sb
    try:
        payload = {
            "job_id": "job-101",
            "cover_letter": "My cover letter",
            "tailored_resume": "• Python specialist",
        }
        resp = client.post("/applications/apply", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["job_title"] == "Senior Python Engineer"
        assert data["status"] == "Applied"
        assert data["cover_letter"] == "My cover letter"
    finally:
        app.dependency_overrides.clear()


def test_update_status_invalid_choice():
    """Reject invalid statuses not matching Kanban columns."""
    mock_user = {"id": "user-456", "email": "dev@example.com"}
    app.dependency_overrides[get_current_user] = lambda: mock_user
    try:
        resp = client.patch(
            "/applications/app-001/status",
            json={"status": "NonExistentStatus"},
        )
        assert resp.status_code == 400
        assert "Invalid status" in resp.json()["detail"]
    finally:
        app.dependency_overrides.clear()


def test_update_status_success():
    """Updating valid status succeeds."""
    mock_user = {"id": "user-456", "email": "dev@example.com"}
    mock_sb = MagicMock()
    mock_sb.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value.data = [
        {
            "id": "app-001",
            "job_id": "job-101",
            "status": "Interview",
            "review_status": "approved",
            "cover_letter": None,
            "tailored_resume": None,
            "applied_at": "2026-10-11T12:00:00Z",
            "created_at": "2026-10-11T12:00:00Z",
        }
    ]

    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_supabase_client] = lambda: mock_sb
    try:
        resp = client.patch(
            "/applications/app-001/status",
            json={"status": "Interview"},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "Interview"
    finally:
        app.dependency_overrides.clear()


def test_get_application_details_success():
    """Module 8: retrieve application with full job and log telemetry."""
    mock_user = {"id": "user-456", "email": "dev@example.com"}
    mock_sb = MagicMock()
    mock_sb.table.return_value.select.return_value.eq.return_value.eq.return_value.limit.return_value.execute.return_value.data = [
        {
            "id": "app-001",
            "job_id": "job-101",
            "status": "Found",
            "review_status": "pending",
            "cover_letter": "Tailored cover letter text",
            "tailored_resume": "• Bullet 1",
            "applied_at": None,
            "created_at": "2026-10-11T12:00:00Z",
            "match_score": 88.5,
            "missing_skills": ["Kubernetes"],
            "missing_fields": ["phone"],
            "jobs": {
                "title": "Backend Architect",
                "company": "CloudCorp",
                "url": "https://example.com/job-101",
                "description": "Looking for a seasoned architect...",
                "required_skills": "Python, FastAPI, AWS",
            },
        }
    ]
    # For logs select
    mock_sb.table.return_value.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value.data = [
        {
            "id": "log-001",
            "event": "started",
            "detail": "Automation scheduled",
            "created_at": "2026-10-11T12:01:00Z",
        }
    ]

    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_supabase_client] = lambda: mock_sb
    try:
        resp = client.get("/applications/app-001")
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == "app-001"
        assert data["job_title"] == "Backend Architect"
        assert data["match_score"] == 88.5
        assert data["missing_skills"] == ["Kubernetes"]
    finally:
        app.dependency_overrides.clear()


def test_update_review_success():
    """Module 8: human-in-loop edits cover letter and marks review status."""
    mock_user = {"id": "user-456", "email": "dev@example.com"}
    mock_sb = MagicMock()
    # update call succeeds
    mock_sb.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value.data = [{"id": "app-001"}]
    # subsequent get_application_details call succeeds
    mock_sb.table.return_value.select.return_value.eq.return_value.eq.return_value.limit.return_value.execute.return_value.data = [
        {
            "id": "app-001",
            "job_id": "job-101",
            "status": "Found",
            "review_status": "pending",
            "workflow_status": "awaiting_approval",
            "cover_letter": "Edited human-approved letter",
            "tailored_resume": "• Edited bullet",
            "applied_at": None,
            "created_at": "2026-10-11T12:00:00Z",
            "jobs": {"title": "Engineer", "company": "Co", "url": "https://example.com"},
        }
    ]
    mock_sb.table.return_value.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value.data = []

    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_supabase_client] = lambda: mock_sb
    try:
        resp = client.patch(
            "/applications/app-001/review",
            json={
                "cover_letter": "Edited human-approved letter",
                "review_status": "pending",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["cover_letter"] == "Edited human-approved letter"
        assert data["review_status"] == "pending"
    finally:
        app.dependency_overrides.clear()


def test_update_review_prohibits_direct_approval():
    """Module 8 / P0 audit: setting review_status='approved' on review endpoint is prohibited."""
    mock_user = {"id": "user-456", "email": "dev@example.com"}
    app.dependency_overrides[get_current_user] = lambda: mock_user
    try:
        resp = client.patch(
            "/applications/app-001/review",
            json={"review_status": "approved"},
        )
        assert resp.status_code == 400
        assert "Direct approval via review update endpoint is prohibited" in resp.json()["detail"]
    finally:
        app.dependency_overrides.clear()


def test_manual_complete_application_success():
    """Module 8 / P0 audit: candidate self-reports manual external submission."""
    mock_user = {"id": "user-456", "email": "dev@example.com"}
    mock_sb = MagicMock()
    mock_sb.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value.data = [{"id": "app-001"}]
    mock_sb.table.return_value.insert.return_value.execute.return_value.data = [{"id": "log-003"}]
    mock_sb.table.return_value.select.return_value.eq.return_value.eq.return_value.limit.return_value.execute.return_value.data = [
        {
            "id": "app-001",
            "job_id": "job-101",
            "status": "Applied",
            "review_status": "approved",
            "workflow_status": "submitted",
            "submission_mode": "manual_confirmed",
            "submission_reference": "REF-12345",
            "cover_letter": "My Letter",
            "tailored_resume": "My Resume",
            "applied_at": "2026-10-11T12:00:00Z",
            "created_at": "2026-10-11T12:00:00Z",
            "jobs": {"title": "DevOps Engineer", "company": "SaaS Inc", "url": "https://example.com"},
        }
    ]
    mock_sb.table.return_value.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value.data = []

    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_supabase_client] = lambda: mock_sb
    try:
        resp = client.post(
            "/applications/app-001/manual-complete",
            json={"submission_reference": "REF-12345"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "Applied"
        assert data["workflow_status"] == "submitted"
        assert data["submission_mode"] == "manual_confirmed"
        assert data["submission_reference"] == "REF-12345"
    finally:
        app.dependency_overrides.clear()


def test_approve_application_success():
    """Module 8: approving validates draft, sets review_status='approved', workflow_status='queued'."""
    mock_user = {"id": "user-456", "email": "dev@example.com"}
    mock_sb = MagicMock()
    mock_sb.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value.data = [
        {"id": "app-001", "job_id": "job-101", "status": "Found", "review_status": "approved", "workflow_status": "queued"}
    ]
    mock_sb.table.return_value.insert.return_value.execute.return_value.data = [{"id": "log-002"}]
    mock_sb.table.return_value.select.return_value.eq.return_value.eq.return_value.limit.return_value.execute.return_value.data = [
        {
            "id": "app-001",
            "job_id": "job-101",
            "status": "Found",
            "review_status": "approved",
            "workflow_status": "queued",
            "cover_letter": "Approved letter",
            "tailored_resume": "• Approved bullet",
            "applied_at": None,
            "created_at": "2026-10-11T12:00:00Z",
            "jobs": {"title": "DevOps Engineer", "company": "SaaS Inc", "url": "https://example.com"},
        }
    ]
    mock_sb.table.return_value.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value.data = []

    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_supabase_client] = lambda: mock_sb
    try:
        resp = client.patch("/applications/app-001/approve")
        assert resp.status_code == 200
        data = resp.json()
        assert data["review_status"] == "approved"
        assert data["workflow_status"] == "queued"
    finally:
        app.dependency_overrides.clear()


def test_approve_application_rejects_empty_draft():
    """Module 8 / P0 audit: approving an application with no tailored documents returns 400."""
    mock_user = {"id": "user-456", "email": "dev@example.com"}
    mock_sb = MagicMock()
    mock_sb.table.return_value.select.return_value.eq.return_value.eq.return_value.limit.return_value.execute.return_value.data = [
        {
            "id": "app-001",
            "job_id": "job-101",
            "status": "Found",
            "review_status": "pending",
            "cover_letter": None,
            "tailored_resume": "",
            "jobs": {"title": "DevOps", "company": "SaaS", "url": "https://example.com"},
        }
    ]

    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_supabase_client] = lambda: mock_sb
    try:
        resp = client.patch("/applications/app-001/approve")
        assert resp.status_code == 400
        assert "Cannot approve an empty application" in resp.json()["detail"]
    finally:
        app.dependency_overrides.clear()
