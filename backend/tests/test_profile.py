"""
backend/tests/test_profile.py
=============================
Tests for user profile routes and resume document parsing:
- GET  /profile
- PUT  /profile
- POST /profile/resume
- services.resume_parser (PDF, DOCX, TXT)
"""

from __future__ import annotations

import io
import os
import sys
from unittest.mock import MagicMock

import pytest
from docx import Document
from fastapi.testclient import TestClient

# Ensure backend root is on PYTHONPATH
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dependencies import get_current_user, get_supabase_client
from main import app
from services.resume_parser import parse_docx, parse_pdf, parse_resume

client = TestClient(app)


def test_get_profile_unauthorized():
    """GET /profile returns 401 without auth token."""
    resp = client.get("/profile")
    assert resp.status_code == 401


def test_get_profile_success():
    """GET /profile returns user profile fields."""
    mock_user = {"id": "user-789", "email": "engineer@example.com"}
    mock_sb = MagicMock()
    mock_sb.table.return_value.select.return_value.eq.return_value.limit.return_value.execute.return_value.data = [
        {
            "id": "user-789",
            "full_name": "Jane Doe",
            "phone": "555-0199",
            "linkedin_url": "https://linkedin.com/in/janedoe",
            "github_url": "https://github.com/janedoe",
            "base_resume_text": "Experienced Systems Architect",
        }
    ]

    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_supabase_client] = lambda: mock_sb
    try:
        resp = client.get("/profile")
        assert resp.status_code == 200
        data = resp.json()
        assert data["full_name"] == "Jane Doe"
        assert data["github_url"] == "https://github.com/janedoe"
    finally:
        app.dependency_overrides.clear()


def test_update_profile_success():
    """PUT /profile updates fields and returns updated object."""
    mock_user = {"id": "user-789", "email": "engineer@example.com"}
    mock_sb = MagicMock()
    mock_sb.table.return_value.upsert.return_value.execute.return_value.data = [
        {
            "id": "user-789",
            "full_name": "Jane Smith",
            "phone": "555-0100",
            "linkedin_url": "https://linkedin.com/in/janesmith",
            "github_url": "https://github.com/janesmith",
            "base_resume_text": "Updated Resume Text",
        }
    ]

    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_supabase_client] = lambda: mock_sb
    try:
        payload = {
            "full_name": "Jane Smith",
            "phone": "555-0100",
            "linkedin_url": "https://linkedin.com/in/janesmith",
            "github_url": "https://github.com/janesmith",
        }
        resp = client.put("/profile", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["full_name"] == "Jane Smith"
    finally:
        app.dependency_overrides.clear()


def test_update_profile_preferences():
    """Module 8 / P0 audit: target_role, location, and experience preferences persist."""
    mock_user = {"id": "user-789", "email": "engineer@example.com"}
    mock_sb = MagicMock()
    mock_sb.table.return_value.upsert.return_value.execute.return_value.data = [
        {
            "id": "user-789",
            "full_name": "Jane Smith",
            "target_role": "Staff Backend Engineer",
            "target_location": "San Francisco, CA",
            "experience_level": "Senior",
            "job_type": "remote",
            "skills": ["Python", "PostgreSQL", "Docker"],
        }
    ]

    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_supabase_client] = lambda: mock_sb
    try:
        payload = {
            "target_role": "Staff Backend Engineer",
            "target_location": "San Francisco, CA",
            "experience_level": "Senior",
            "job_type": "remote",
            "skills": ["Python", "PostgreSQL", "Docker"],
        }
        resp = client.put("/profile", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["target_role"] == "Staff Backend Engineer"
        assert data["target_location"] == "San Francisco, CA"
        assert data["job_type"] == "remote"
        assert "Python" in data["skills"]
    finally:
        app.dependency_overrides.clear()


def test_resume_parser_docx():
    """Verify DOCX parsing generates clean text."""
    doc = Document()
    doc.add_paragraph("First Section: Senior Developer")
    doc.add_paragraph("Key Skills: Python, FastAPI, Docker, Kubernetes")
    bio = io.BytesIO()
    doc.save(bio)
    bio.seek(0)

    extracted = parse_docx(bio.getvalue())
    assert "Senior Developer" in extracted
    assert "FastAPI" in extracted


def test_resume_parser_txt():
    """Verify TXT parsing works properly."""
    content = b"Candidate Name: Alice\nSkill set: LangGraph, PostgreSQL"
    extracted = parse_resume(content, "resume.txt")
    assert "Alice" in extracted
    assert "LangGraph" in extracted


def test_resume_parser_unsupported():
    """Unsupported extension raises ValueError."""
    with pytest.raises(ValueError, match="Unsupported resume format"):
        parse_resume(b"some content", "resume.exe")


def test_upload_resume_endpoint():
    """POST /profile/resume extracts text and updates profile."""
    mock_user = {"id": "user-789", "email": "engineer@example.com"}
    mock_sb = MagicMock()
    mock_sb.table.return_value.upsert.return_value.execute.return_value.data = [{"id": "user-789"}]

    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_supabase_client] = lambda: mock_sb
    try:
        file_content = b"Alice Developer\nExperienced in Python & cloud architecture."
        files = {"file": ("my_resume.txt", file_content, "text/plain")}
        resp = client.post("/profile/resume", files=files)
        assert resp.status_code == 200
        data = resp.json()
        assert data["filename"] == "my_resume.txt"
        assert "Alice Developer" in data["base_resume_text"]
    finally:
        app.dependency_overrides.clear()


def test_update_profile_retry_without_embedding_when_missing_column():
    """Verify PUT /profile retries without 'embedding' if Supabase lacks the column."""
    mock_user = {"id": "user-456", "email": "dev@example.com"}
    mock_sb = MagicMock()

    # First call with embedding fails, second call without embedding succeeds
    mock_sb.table.return_value.upsert.return_value.execute.side_effect = [
        Exception("column profiles.embedding does not exist"),
        MagicMock(data=[{"id": "user-456", "full_name": "Jane Smith", "base_resume_text": "Skills: Python"}]),
    ]

    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_supabase_client] = lambda: mock_sb
    try:
        resp = client.put(
            "/profile",
            json={"full_name": "Jane Smith", "base_resume_text": "Skills: Python"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["full_name"] == "Jane Smith"
        assert data["base_resume_text"] == "Skills: Python"
    finally:
        app.dependency_overrides.clear()


def test_update_profile_handles_string_vector():
    """Verify PUT /profile correctly parses pgvector's string output '[0.123, -0.456]'."""
    mock_user = {"id": "user-456", "email": "dev@example.com"}
    mock_sb = MagicMock()
    mock_sb.table.return_value.upsert.return_value.execute.return_value.data = [
        {"id": "user-456", "full_name": "Jane Smith", "embedding": "[0.123, -0.456]"}
    ]

    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_supabase_client] = lambda: mock_sb
    try:
        resp = client.put(
            "/profile",
            json={"full_name": "Jane Smith"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["embedding"] == [0.123, -0.456]
    finally:
        app.dependency_overrides.clear()

