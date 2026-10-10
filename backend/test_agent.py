"""
backend/test_agent.py
=====================
Test suite — Module 4: Core LangGraph Agent

Run (unit + smoke only, no real API calls):
    pytest -m "not integration" -v

Run everything (requires valid .env keys):
    pytest -v

Test tiers
----------
Tier 1 — Unit       : individual node functions, all deps mocked
Tier 2 — Smoke      : full pipeline, all external deps mocked
Tier 3 — Integration: real DuckDuckGo + Groq + Supabase (skipped in CI)

Bug coverage
------------
B1  test_search_rate_limit_retry  — DDG retries on first failure
B1  test_search_all_retries_fail  — DDG gives up after 3 attempts
B2  (documented, not testable here — requires HTTP auth middleware)
B3  test_save_skips_when_no_url   — upsert skipped when job has no URL
"""

from __future__ import annotations

import os
import sys
from unittest.mock import MagicMock, call, patch

import pytest

# Allow running from project root or backend/
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


# ---------------------------------------------------------------------------
# Fixtures & helpers
# ---------------------------------------------------------------------------
def _state(**overrides) -> dict:
    """Return a minimal valid AgentState dict, with optional overrides."""
    return {
        "keywords": "Python Developer",
        "location": "Remote",
        "user_resume": (
            "3 years building REST APIs with FastAPI and Django. "
            "Proficient in PostgreSQL, Docker, and CI/CD."
        ),
        "found_jobs": [],
        "selected_job": None,
        "tailored_resume": "",
        "cover_letter": "",
        "status": "",
        "error": None,
        **overrides,
    }


def _fake_job(n: int = 1) -> dict:
    return {
        "title": f"Senior Python Developer - Corp{n}",
        "url": f"https://example.com/jobs/{n}",
        "description": "FastAPI, PostgreSQL, Docker required.",
        "company": f"Corp{n}",
        "source": "DuckDuckGo",
    }


def _fake_ddg_raw(n: int = 1) -> dict:
    return {
        "title": f"Python Dev - Corp{n}",
        "href": f"https://linkedin.com/jobs/{n}",
        "body": "We need Python skills.",
    }


# ---------------------------------------------------------------------------
# Tier 1 — Unit: search_jobs
# ---------------------------------------------------------------------------
class TestSearchJobs:

    def test_returns_mapped_jobs(self):
        """_ddg_search results are correctly mapped to our job schema."""
        from agent import search_jobs

        with patch("agent._ddg_search") as mock_search:
            mock_search.return_value = [_fake_ddg_raw()]
            result = search_jobs(_state())

        assert result["status"] == "Jobs Found"
        assert result["error"] is None
        jobs = result["found_jobs"]
        assert len(jobs) >= 1
        assert jobs[0]["url"] == "https://linkedin.com/jobs/1"

    def test_empty_results_falls_back(self):
        """When all portal queries return empty, fallback queries are tried."""
        from agent import search_jobs

        with patch("agent._ddg_search") as mock_search:
            # portals all return empty, fallback returns 1 result
            mock_search.side_effect = [
                [] for _ in range(10)   # 10 portals
            ] + [[_fake_ddg_raw()], [], []]  # 3 fallback queries
            result = search_jobs(_state())

        assert result["status"] == "Jobs Found"
        assert len(result["found_jobs"]) >= 1

    def test_all_portals_and_fallbacks_fail(self):
        """If all DDG calls return error strings, status is Search Failed."""
        from agent import search_jobs

        with patch("agent._ddg_search") as mock_search:
            mock_search.return_value = "Network error"
            result = search_jobs(_state())

        assert result["status"] == "Search Failed"
        assert result["found_jobs"] == []

    def test_rate_limit_retry_succeeds(self):
        """B1: _ddg_search retries internally; first call raises, second succeeds."""
        from agent import _ddg_search

        attempts = {"n": 0}

        def flaky(*args, **kwargs):
            attempts["n"] += 1
            if attempts["n"] == 1:
                raise Exception("RateLimitException")
            return [_fake_ddg_raw()]

        with patch("agent.DDGS") as MockDDGS:
            with patch("agent.time.sleep"):
                MockDDGS.return_value.text.side_effect = flaky
                result = _ddg_search("test query", 3)

        assert isinstance(result, list)
        assert len(result) == 1
        assert attempts["n"] == 2

    def test_all_retries_exhausted(self):
        """B1: All 3 DDG attempts fail → returns error string."""
        from agent import _ddg_search

        with patch("agent.DDGS") as MockDDGS:
            with patch("agent.time.sleep"):
                MockDDGS.return_value.text.side_effect = Exception("Network error")
                result = _ddg_search("test", 3)

        assert isinstance(result, str)
        assert "Network error" in result

    def test_company_extracted_from_title(self):
        """Company is parsed from 'Title - Company' formatted titles."""
        from agent import _parse_ddg_result

        job = _parse_ddg_result({"title": "Python Dev - Acme Corp", "href": "https://x.com", "body": ""})
        assert job["company"] == "Acme Corp"

    def test_company_extracted_from_at_format(self):
        """Company is parsed from 'Title at Company' formatted titles."""
        from agent import _parse_ddg_result

        job = _parse_ddg_result({"title": "Python Dev at Acme Corp", "href": "https://x.com", "body": ""})
        assert job["company"] == "Acme Corp"

    def test_company_fallback_when_no_dash(self):
        """Company defaults to 'Unknown' when title has no separator."""
        from agent import _parse_ddg_result

        job = _parse_ddg_result({"title": "Python Dev", "href": "https://x.com", "body": ""})
        assert job["company"] == "Unknown"

    def test_source_label_set_correctly(self):
        """Source label is passed through from the portal name."""
        from agent import _parse_ddg_result

        job = _parse_ddg_result({"title": "Dev", "href": "https://x.com", "body": ""}, source="LinkedIn")
        assert job["source"] == "LinkedIn"


# ---------------------------------------------------------------------------
# Tier 1 — Unit: draft_documents
# ---------------------------------------------------------------------------
class TestDraftDocuments:

    def test_fails_without_api_key(self, monkeypatch):
        """Missing GROQ_API_KEY → Drafting Failed immediately."""
        from agent import draft_documents

        monkeypatch.delenv("GROQ_API_KEY", raising=False)
        result = draft_documents(_state(found_jobs=[_fake_job()]))

        assert result["status"] == "Drafting Failed"
        assert "GROQ_API_KEY" in result["error"]
        assert result["cover_letter"] == ""

    def test_short_circuits_when_no_jobs(self, monkeypatch):
        """B2-adjacent: no jobs → No Jobs Found, Groq is never called."""
        from agent import draft_documents

        monkeypatch.setenv("GROQ_API_KEY", "fake-key")

        with patch("agent.ChatGroq") as MockLLM:
            result = draft_documents(_state(found_jobs=[]))

        assert result["status"] == "No Jobs Found"
        MockLLM.assert_not_called()

    def test_success_path(self, monkeypatch):
        """Happy path: Groq returns content, state is updated correctly."""
        from agent import draft_documents

        monkeypatch.setenv("GROQ_API_KEY", "fake-key")

        mock_llm = MagicMock()
        mock_llm.invoke.side_effect = [
            MagicMock(content="Cover letter text."),
            MagicMock(content="• Bullet 1\n• Bullet 2\n• Bullet 3"),
        ]

        with patch("agent.ChatGroq", return_value=mock_llm):
            result = draft_documents(_state(found_jobs=[_fake_job()]))

        assert result["status"] == "Drafting Complete"
        assert result["cover_letter"] == "Cover letter text."
        assert "Bullet 1" in result["tailored_resume"]
        assert result["selected_job"] == _fake_job()
        assert result["error"] is None
        assert mock_llm.invoke.call_count == 2  # cover letter + resume

    def test_groq_exception_is_caught(self, monkeypatch):
        """Groq SDK raising an error → Drafting Failed, not an unhandled exception."""
        from agent import draft_documents

        monkeypatch.setenv("GROQ_API_KEY", "fake-key")

        mock_llm = MagicMock()
        mock_llm.invoke.side_effect = RuntimeError("Groq 503")

        with patch("agent.ChatGroq", return_value=mock_llm):
            result = draft_documents(_state(found_jobs=[_fake_job()]))

        assert result["status"] == "Drafting Failed"
        assert "Groq 503" in result["error"]


# ---------------------------------------------------------------------------
# Tier 1 — Unit: save_to_database
# ---------------------------------------------------------------------------
class TestSaveToDatabase:

    def _with_mock_supabase(self, mock_sb):
        """Context manager: temporarily replace the module-level supabase client."""
        import agent as _agent
        original = _agent.supabase
        _agent.supabase = mock_sb
        return original

    def _restore(self, original):
        import agent as _agent
        _agent.supabase = original

    def test_skips_when_not_configured(self):
        """Supabase=None → DB Skipped (No Connection), no exception."""
        import agent as _agent
        original = _agent.supabase
        _agent.supabase = None
        try:
            from agent import save_to_database
            result = save_to_database(_state(status="Drafting Complete", selected_job=_fake_job()))
        finally:
            _agent.supabase = original

        assert "Skipped" in result["status"]

    def test_skips_on_pipeline_failure(self):
        """Upstream failure statuses propagate without touching the DB."""
        import agent as _agent
        mock_sb = MagicMock()
        original = self._with_mock_supabase(mock_sb)
        try:
            from agent import save_to_database

            for bad_status in ("Search Failed", "No Jobs Found", "Drafting Failed"):
                result = save_to_database(_state(status=bad_status))
                assert result["status"] == bad_status

        finally:
            self._restore(original)

        mock_sb.table.assert_not_called()

    def test_skips_when_no_url(self):
        """B3: Job without URL → DB Skipped (No URL), upsert never called."""
        import agent as _agent
        mock_sb = MagicMock()
        original = self._with_mock_supabase(mock_sb)
        try:
            from agent import save_to_database
            state = _state(
                status="Drafting Complete",
                selected_job={"title": "Dev", "url": "", "company": "Corp", "description": ""},
            )
            result = save_to_database(state)
        finally:
            self._restore(original)

        assert result["status"] == "DB Skipped (No URL)"
        mock_sb.table.assert_not_called()

    def test_upsert_called_with_correct_data(self):
        """Happy path: upsert is called once with the expected row dict."""
        import agent as _agent
        mock_sb = MagicMock()
        original = self._with_mock_supabase(mock_sb)
        try:
            from agent import save_to_database
            result = save_to_database(
                _state(status="Drafting Complete", selected_job=_fake_job())
            )
        finally:
            self._restore(original)

        assert result["status"] == "Saved to DB"
        mock_sb.table.assert_called_once_with("jobs")
        upsert_call = mock_sb.table.return_value.upsert
        upsert_call.assert_called_once()
        row = upsert_call.call_args[0][0]
        assert row["url"] == "https://example.com/jobs/1"
        assert row["source"] == "DuckDuckGo"


# ---------------------------------------------------------------------------
# Tier 2 — Smoke: full pipeline (all deps mocked)
# ---------------------------------------------------------------------------
class TestPipelineSmoke:

    def test_full_pipeline_mocked(self, monkeypatch):
        """
        End-to-end smoke: verifies all 3 nodes run and state is correct.
        No real network calls — DuckDuckGo, Groq, and Supabase all mocked.
        """
        import agent as _agent
        monkeypatch.setenv("GROQ_API_KEY", "fake-key")

        mock_sb = MagicMock()
        _agent.supabase = mock_sb

        mock_llm = MagicMock()
        mock_llm.invoke.side_effect = [
            MagicMock(content="Great cover letter."),
            MagicMock(content="• A\n• B\n• C"),
        ]

        with patch("agent._ddg_search", return_value=[_fake_ddg_raw()]):
            with patch("agent.ChatGroq", return_value=mock_llm):
                result = _agent.agent_app.invoke(_state())

        assert result["status"] == "Saved to DB"
        assert len(result["found_jobs"]) == 1
        assert result["cover_letter"] == "Great cover letter."
        assert result["error"] is None
        mock_sb.table.assert_called_once_with("jobs")


# ---------------------------------------------------------------------------
# Tier 3 — Integration (real APIs, skipped in CI)
# ---------------------------------------------------------------------------
@pytest.mark.integration
class TestIntegration:
    """
    Calls real DuckDuckGo and Groq APIs.
    Run with:  pytest -m integration -v
    Skip with: pytest -m "not integration"
    Requires valid .env in project root.
    """

    def test_real_search_and_draft(self):
        """Real pipeline — validates status is set and no unhandled exception."""
        import agent as _agent

        result = _agent.agent_app.invoke(
            _state(keywords="Python Backend Developer", location="Remote")
        )

        print(f"\nStatus     : {result.get('status')}")
        print(f"Jobs Found : {len(result.get('found_jobs', []))}")
        if result.get("cover_letter"):
            print(f"Cover (200): {result['cover_letter'][:200]}...")
        if result.get("error"):
            print(f"Error      : {result['error']}")

        assert result.get("status") not in (None, ""), "Status must always be set."


# ---------------------------------------------------------------------------
# Quick smoke when run directly (no pytest)
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    print("Running quick smoke test (mocked)...")
    t = TestPipelineSmoke()

    class _MP:  # minimal monkeypatch shim
        def setenv(self, k, v):
            os.environ[k] = v

    t.test_full_pipeline_mocked(_MP())
    print("✅ Smoke test passed.")
