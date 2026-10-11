"""
backend/tests/test_jobs.py
==========================
Tests for job listing and pipeline search routes:
- GET  /jobs        (Auth check + pagination)
- POST /search-jobs (Auth check - Bug B2 fix verification)
"""

from __future__ import annotations

import os
import sys
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

# Ensure backend root is on PYTHONPATH
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dependencies import get_current_user, get_supabase_client
from main import app

client = TestClient(app)


def test_list_jobs_unauthorized():
    """B2 compliance: /jobs returns 401 without auth token."""
    resp = client.get("/jobs")
    assert resp.status_code == 401


def test_search_jobs_unauthorized():
    """B2 compliance: /search-jobs returns 401 without auth token."""
    resp = client.post("/search-jobs", json={"keywords": "Python"})
    assert resp.status_code == 401


def test_list_jobs_success():
    """GET /jobs returns paginated response."""
    mock_user = {"id": "user-999", "email": "dev@example.com"}
    mock_sb = MagicMock()
    mock_res = MagicMock()
    mock_res.data = [
        {
            "id": "job-001",
            "title": "Staff Software Engineer",
            "company": "NextGen AI",
            "url": "https://example.com/job/001",
            "description": "Building next gen AI tools",
            "source": "DuckDuckGo",
            "created_at": "2026-10-11T10:00:00Z",
        }
    ]
    mock_res.count = 1

    (
        mock_sb.table.return_value.select.return_value
        .order.return_value
        .range.return_value
        .execute.return_value
    ) = mock_res

    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_supabase_client] = lambda: mock_sb
    try:
        resp = client.get("/jobs?page=1&limit=10")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert len(data["jobs"]) == 1
        assert data["jobs"][0]["title"] == "Staff Software Engineer"
    finally:
        app.dependency_overrides.clear()


def test_search_jobs_invokes_agent():
    """POST /search-jobs passes authenticated user_id to agent (Bug B2 & B3 fix)."""
    mock_user = {"id": "user-999", "email": "dev@example.com"}
    mock_sb = MagicMock()
    mock_sb.table.return_value.select.return_value.eq.return_value.limit.return_value.execute.return_value.data = [
        {"base_resume_text": "Experienced Python Backend Engineer"}
    ]

    mock_agent_result = {
        "status": "Saved to DB",
        "found_jobs": [{"title": "FastAPI Developer", "url": "https://example.com/fastapi"}],
        "selected_job": {"title": "FastAPI Developer", "company": "API Corp", "url": "https://example.com/fastapi"},
        "cover_letter": "Dear Hiring Team...",
        "tailored_resume": "• Master of FastAPI",
        "error": None,
    }

    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_supabase_client] = lambda: mock_sb
    with patch("routers.jobs.agent_app.invoke", return_value=mock_agent_result) as mock_invoke:
        try:
            payload = {"keywords": "FastAPI Developer", "location": "Remote"}
            resp = client.post("/search-jobs", json=payload)
            assert resp.status_code == 200
            data = resp.json()
            assert data["status"] == "Saved to DB"
            assert data["jobs_found"] == 1
            assert data["selected_job"]["title"] == "FastAPI Developer"

            # Verify agent was invoked with user_id
            mock_invoke.assert_called_once()
            passed_state = mock_invoke.call_args[0][0]
            assert passed_state["user_id"] == "user-999"
            assert passed_state["user_resume"] == "Experienced Python Backend Engineer"
        finally:
            app.dependency_overrides.clear()
