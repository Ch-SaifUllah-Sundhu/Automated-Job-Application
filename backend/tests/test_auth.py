"""
backend/tests/test_auth.py
==========================
Unit and integration tests for authentication and health endpoints:
- GET  /            (Health check)
- GET  /auth/me     (Auth failure + happy path)
- POST /auth/logout (Session logout)
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


def test_health_check():
    """Root health check returns 200 with status ok."""
    resp = client.get("/")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "version" in data


def test_auth_me_unauthorized():
    """B2 compliance: /auth/me returns 401 without Bearer token."""
    resp = client.get("/auth/me")
    assert resp.status_code == 401
    assert "detail" in resp.json()


def test_auth_me_success():
    """Happy path: /auth/me returns user profile with mock dependency."""
    mock_user = {"id": "user-123", "email": "test@example.com"}
    mock_sb = MagicMock()
    mock_sb.table.return_value.select.return_value.eq.return_value.limit.return_value.execute.return_value.data = [
        {
            "id": "user-123",
            "full_name": "Test User",
            "phone": "+1234567890",
            "linkedin_url": "https://linkedin.com/in/test",
            "github_url": "https://github.com/test",
            "base_resume_text": "Experienced Python Engineer",
        }
    ]

    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_supabase_client] = lambda: mock_sb
    try:
        resp = client.get("/auth/me")
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == "user-123"
        assert data["email"] == "test@example.com"
        assert data["full_name"] == "Test User"
    finally:
        app.dependency_overrides.clear()


def test_logout():
    """POST /auth/logout succeeds with authenticated user."""
    mock_user = {"id": "user-123", "email": "test@example.com"}
    app.dependency_overrides[get_current_user] = lambda: mock_user
    try:
        resp = client.post("/auth/logout")
        assert resp.status_code == 200
        assert "Successfully logged out" in resp.json()["message"]
    finally:
        app.dependency_overrides.clear()
