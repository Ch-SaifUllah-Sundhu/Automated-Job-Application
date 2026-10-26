"""
backend/tests/test_match.py
===========================
Module 7: Semantic Match Scoring & Skill Gap Tests

Verifies:
- 0–100 calibrated match scoring
- Synonym and alias equivalence (JS vs JavaScript, Postgres vs PostgreSQL)
- High relevance for aligned roles, low score for unrelated roles
- Explainable skill gap extraction
- LangGraph detect_missing_skills node integration
- GET /jobs endpoint match_score calculation and sorting
"""

from __future__ import annotations

from typing import Any, Dict
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from agent import detect_missing_skills
from main import create_app
from services.embedding_service import (
    chunk_text,
    compute_cosine_similarity,
    embed_text,
)
from services.match_service import (
    are_skills_equivalent,
    calibrate_similarity_score,
    compute_match_score,
    extract_skills_from_text,
    identify_skill_gaps,
)


# ── Scoring & Calibration Tests ─────────────────────────────────────────────

def test_calibrate_similarity_score_boundaries():
    """Verify calibrated score stays strictly within [0.0, 100.0]."""
    assert calibrate_similarity_score(-1.0) == 0.0
    assert calibrate_similarity_score(0.0) == 0.0
    assert calibrate_similarity_score(0.10) <= 10.0
    assert calibrate_similarity_score(0.50) > 40.0
    assert calibrate_similarity_score(0.85) >= 99.0
    assert calibrate_similarity_score(1.0) == 100.0


def test_chunk_text_splits_long_content():
    """Ensure long resume / JD is chunked cleanly without losing words."""
    short_text = "Experienced Python developer with 5 years building APIs."
    chunks = chunk_text(short_text, max_chars=100)
    assert len(chunks) == 1
    assert chunks[0] == short_text

    long_text = "\n\n".join([f"Section {i}: Technical expertise in building scalable cloud backends." for i in range(15)])
    long_chunks = chunk_text(long_text, max_chars=150)
    assert len(long_chunks) > 1
    for c in long_chunks:
        assert len(c) <= 250


def test_embed_text_dimensions():
    """Verify embedding vector length is always 384 dimensions."""
    vec = embed_text("Senior Full Stack Engineer React TypeScript FastAPI")
    assert isinstance(vec, list)
    assert len(vec) == 384
    for val in vec:
        assert isinstance(val, float)


def test_cosine_similarity_identical_vectors():
    """A normalized vector compared with itself should have cosine similarity near 1.0."""
    vec = embed_text("Python FastAPI Developer")
    sim = compute_cosine_similarity(vec, vec)
    assert 0.99 <= sim <= 1.0


# ── Skill Alias & Gap Tests ──────────────────────────────────────────────────

def test_skill_aliases_recognized():
    """Verify known acronyms and aliases match seamlessly."""
    assert are_skills_equivalent("JS", "JavaScript") is True
    assert are_skills_equivalent("javascript", "js") is True
    assert are_skills_equivalent("Postgres", "PostgreSQL") is True
    assert are_skills_equivalent("AWS", "Amazon Web Services") is True
    assert are_skills_equivalent("K8s", "Kubernetes") is True
    assert are_skills_equivalent("Python", "Java") is False


def test_identify_skill_gaps_finds_missing():
    """Candidate with Python & SQL should flag Docker & Kubernetes as missing."""
    cand = ["Python", "FastAPI", "Postgres"]
    job_reqs = ["Python", "PostgreSQL", "Docker", "Kubernetes"]

    matched, missing = identify_skill_gaps(cand, job_reqs)
    assert "Python" in matched
    assert "PostgreSQL" in matched  # via Postgres alias
    assert "Docker" in missing
    assert "Kubernetes" in missing


def test_semantic_match_relevance_differentiation():
    """High-relevance job should score significantly higher than unrelated role."""
    candidate_resume = (
        "Senior Backend Engineer with 5+ years experience in Python, FastAPI, "
        "PostgreSQL, Redis, Docker, and designing REST microservices."
    )
    relevant_job = (
        "Seeking a Senior Python Backend Developer with deep expertise in "
        "FastAPI, relational databases (PostgreSQL), and Docker containerization."
    )
    unrelated_job = (
        "Executive Pastry Chef needed for luxury French bakery. Must have 5 years "
        "artisan sourdough baking, croissant laminating, and confectionery skills."
    )

    rel_score = compute_match_score(candidate_resume, relevant_job)
    unrel_score = compute_match_score(candidate_resume, unrelated_job)

    assert rel_score["match_score"] >= 45.0
    assert unrel_score["match_score"] <= 25.0
    assert rel_score["match_score"] > unrel_score["match_score"] + 20.0


# ── Agent Node Integration ───────────────────────────────────────────────────

def test_detect_missing_skills_node():
    """Verify LangGraph detect_missing_skills node sets missing_skills and match_score."""
    state: Dict[str, Any] = {
        "user_resume": "Senior Developer with Python and FastAPI expertise.",
        "found_jobs": [
            {
                "title": "Backend Engineer",
                "description": "Looking for Python, FastAPI, and Kubernetes developer.",
                "required_skills": "Python, FastAPI, Kubernetes",
                "url": "https://example.com/job/backend",
            }
        ],
    }

    result = detect_missing_skills(state)
    assert "missing_skills" in result
    assert "Kubernetes" in result["missing_skills"]
    assert result["match_score"] is not None
    assert result["match_score"] > 0.0


# ── API Endpoint Tests ───────────────────────────────────────────────────────

@pytest.fixture
def api_client():
    from dependencies import get_current_user, get_supabase_client

    app = create_app()

    mock_user = {"id": "user-module7-test", "email": "candidate@example.com"}
    mock_supabase = MagicMock()

    # Mock user profile with resume
    mock_profile_res = MagicMock()
    mock_profile_res.data = [
        {
            "id": "user-module7-test",
            "base_resume_text": "Experienced Python and FastAPI backend engineer.",
            "embedding": embed_text("Experienced Python and FastAPI backend engineer."),
        }
    ]

    # Mock jobs listing
    mock_jobs_res = MagicMock()
    mock_jobs_res.data = [
        {
            "id": "job-1",
            "title": "Python FastAPI Developer",
            "company": "Tech Corp",
            "url": "https://example.com/job-1",
            "description": "We need a Python FastAPI developer to build APIs.",
            "source": "LinkedIn",
            "created_at": "2026-10-26T10:00:00Z",
        },
        {
            "id": "job-2",
            "title": "Graphic Designer",
            "company": "Creative Agency",
            "url": "https://example.com/job-2",
            "description": "Adobe Photoshop, Figma, Illustrator brand identity expert.",
            "source": "Indeed",
            "created_at": "2026-10-25T10:00:00Z",
        },
    ]
    mock_jobs_res.count = 2

    def table_router(table_name):
        mock_table = MagicMock()
        if table_name == "profiles":
            mock_table.select.return_value.eq.return_value.limit.return_value.execute.return_value = mock_profile_res
        elif table_name == "jobs":
            # Chain: select -> order -> range -> execute
            range_mock = MagicMock()
            range_mock.execute.return_value = mock_jobs_res
            order_mock = MagicMock()
            order_mock.range.return_value = range_mock
            mock_table.select.return_value.order.return_value = order_mock
            mock_table.select.return_value.ilike.return_value.order.return_value = order_mock
        return mock_table

    mock_supabase.table.side_effect = table_router

    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_supabase_client] = lambda: mock_supabase

    yield TestClient(app)
    app.dependency_overrides.clear()


def test_list_jobs_returns_match_score(api_client):
    """GET /jobs should enrich job items with match_score and missing_skills."""
    response = api_client.get("/jobs")
    assert response.status_code == 200
    data = response.json()

    assert "jobs" in data
    assert len(data["jobs"]) == 2

    job1 = next(j for j in data["jobs"] if j["id"] == "job-1")
    job2 = next(j for j in data["jobs"] if j["id"] == "job-2")

    # The Python job should match well with the Python candidate
    assert job1["match_score"] is not None
    assert job2["match_score"] is not None
    assert job1["match_score"] > job2["match_score"]


def test_list_jobs_sort_by_match_score(api_client):
    """GET /jobs?sort=match_score should sort jobs in descending order of match_score."""
    response = api_client.get("/jobs?sort=match_score")
    assert response.status_code == 200
    data = response.json()

    jobs = data["jobs"]
    assert len(jobs) == 2
    assert jobs[0]["match_score"] >= jobs[1]["match_score"]
    assert jobs[0]["id"] == "job-1"
