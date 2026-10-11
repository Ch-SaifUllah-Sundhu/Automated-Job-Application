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
