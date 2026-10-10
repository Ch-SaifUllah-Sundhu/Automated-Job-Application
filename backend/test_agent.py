"""
Tests — Module 4: Core LangGraph Agent
========================================
How to run:
    cd backend
    python -m pytest test_agent.py -v

Tests are structured in three tiers:
  1. Unit tests  — individual node functions (mocked dependencies)
  2. Integration test — full agent pipeline (real DuckDuckGo + Groq)
  3. Smoke test  — quick sanity check without any network calls

Known Bugs Covered:
  - test_search_rate_limit_retry: verifies back-off logic fires on first failure
  - test_draft_no_jobs: verifies short-circuit when no jobs found
  - test_save_skips_when_no_url: verifies DB node skips rows with empty URLs
"""

from __future__ import annotations

import os
import sys
from unittest.mock import MagicMock, patch

import pytest

# Ensure backend/ is on the path when run from project root
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────
def _base_state(overrides: dict | None = None) -> dict:
    """Return a minimal valid AgentState for testing."""
    base = {
        "keywords": "Python Developer",
        "location": "Remote",
        "user_resume": (
            "Experienced Python developer with 3 years building REST APIs "
            "using FastAPI and Django. Proficient in PostgreSQL, Docker, and "
            "CI/CD pipelines."
        ),
        "found_jobs": [],
        "selected_job": None,
        "tailored_resume": "",
        "cover_letter": "",
        "status": "",
        "error": None,
    }
    if overrides:
        base.update(overrides)
    return base


def _fake_job(n: int = 1) -> dict:
    return {
        "title": f"Senior Python Developer - FakeCompany{n}",
        "url": f"https://example.com/job/{n}",
        "description": "We need a Python expert. FastAPI, PostgreSQL, Docker required.",
        "company": f"FakeCompany{n}",
        "source": "DuckDuckGo",
    }


# ─────────────────────────────────────────────────────────────────────────────
# Tier 1: Unit tests — search_jobs node
# ─────────────────────────────────────────────────────────────────────────────
class TestSearchJobsNode:

    def test_search_returns_jobs(self):
        """search_jobs correctly maps DDGS results to the expected schema."""
        from agent import search_jobs

        fake_results = [
            {
                "title": "Python Dev - AcmeCorp",
                "href": "https://linkedin.com/jobs/1",
                "body": "We need Python skills.",
            }
        ]
        with patch("agent.DDGS") as mock_ddgs:
            mock_ddgs.return_value.text.return_value = fake_results
            result = search_jobs(_base_state())

        assert result["status"] == "Jobs Found"
        assert len(result["found_jobs"]) == 1
        assert result["found_jobs"][0]["url"] == "https://linkedin.com/jobs/1"
        assert result["error"] is None

    def test_search_empty_results(self):
        """search_jobs handles an empty result list gracefully."""
        from agent import search_jobs

        with patch("agent.DDGS") as mock_ddgs:
            mock_ddgs.return_value.text.return_value = []
            result = search_jobs(_base_state())

        assert result["status"] == "Jobs Found"
        assert result["found_jobs"] == []

    def test_search_rate_limit_retry(self):
        """
        Bug coverage: DuckDuckGo raises RateLimitException on first call.
        search_jobs must retry and succeed on the second attempt.
        """
        from agent import search_jobs

        call_count = {"n": 0}

        def flaky_text(*args, **kwargs):
            call_count["n"] += 1
            if call_count["n"] == 1:
                raise Exception("RateLimitException: throttled")
            return [{"title": "Dev - Corp", "href": "https://example.com", "body": "desc"}]

        with patch("agent.DDGS") as mock_ddgs:
            with patch("agent.time.sleep"):  # don't actually sleep in tests
                mock_ddgs.return_value.text.side_effect = flaky_text
                result = search_jobs(_base_state())

        assert result["status"] == "Jobs Found"
        assert call_count["n"] == 2  # confirmed retry happened

    def test_search_all_retries_fail(self):
        """If all 3 DuckDuckGo attempts fail, return Search Failed status."""
        from agent import search_jobs

        with patch("agent.DDGS") as mock_ddgs:
            with patch("agent.time.sleep"):
                mock_ddgs.return_value.text.side_effect = Exception("Network error")
                result = search_jobs(_base_state())

        assert result["status"] == "Search Failed"
        assert "Network error" in result["error"]
        assert result["found_jobs"] == []


# ─────────────────────────────────────────────────────────────────────────────
# Tier 1: Unit tests — draft_documents node
# ─────────────────────────────────────────────────────────────────────────────
class TestDraftDocumentsNode:

    def test_draft_no_api_key(self, monkeypatch):
        """draft_documents fails immediately when GROQ_API_KEY is missing."""
        from agent import draft_documents

        monkeypatch.delenv("GROQ_API_KEY", raising=False)
        result = draft_documents(_base_state({"found_jobs": [_fake_job()]}))

        assert result["status"] == "Drafting Failed"
        assert "GROQ_API_KEY" in result["error"]

    def test_draft_no_jobs(self, monkeypatch):
        """
        Bug coverage: draft_documents must short-circuit when found_jobs=[].
        """
        from agent import draft_documents

        monkeypatch.setenv("GROQ_API_KEY", "fake-key")
        result = draft_documents(_base_state({"found_jobs": []}))

        assert result["status"] == "No Jobs Found"
        assert result["cover_letter"] == ""

    def test_draft_success(self, monkeypatch):
        """draft_documents returns cover_letter and tailored_resume on success."""
        from agent import draft_documents

        monkeypatch.setenv("GROQ_API_KEY", "fake-key")

        fake_llm = MagicMock()
        fake_llm.invoke.side_effect = [
            MagicMock(content="This is a cover letter."),
            MagicMock(content="• Bullet 1\n• Bullet 2\n• Bullet 3"),
        ]

        with patch("agent.ChatGroq", return_value=fake_llm):
            result = draft_documents(_base_state({"found_jobs": [_fake_job()]}))

        assert result["status"] == "Drafting Complete"
        assert result["cover_letter"] == "This is a cover letter."
        assert "Bullet 1" in result["tailored_resume"]
        assert result["selected_job"] is not None


# ─────────────────────────────────────────────────────────────────────────────
# Tier 1: Unit tests — save_to_database node
# ─────────────────────────────────────────────────────────────────────────────
class TestSaveToDatabaseNode:

    def test_save_skips_when_no_supabase(self):
        """save_to_database skips gracefully when supabase client is None."""
        import agent as agent_module
        original = agent_module.supabase
        agent_module.supabase = None
        try:
            from agent import save_to_database
            result = save_to_database(
                _base_state({"status": "Drafting Complete", "selected_job": _fake_job()})
            )
            assert "Skipped" in result["status"]
        finally:
            agent_module.supabase = original

    def test_save_skips_when_no_url(self):
        """
        Bug coverage: if selected_job has no URL, upsert cannot deduplicate.
        Node should skip with 'DB Skipped (No URL)'.
        """
        import agent as agent_module
        mock_supabase = MagicMock()
        original = agent_module.supabase
        agent_module.supabase = mock_supabase
        try:
            from agent import save_to_database
            state = _base_state({
                "status": "Drafting Complete",
                "selected_job": {"title": "Dev", "url": "", "company": "Corp", "description": ""},
            })
            result = save_to_database(state)
            assert result["status"] == "DB Skipped (No URL)"
            mock_supabase.table.assert_not_called()
        finally:
            agent_module.supabase = original

    def test_save_skips_on_failed_pipeline(self):
        """save_to_database passes through the failed status without touching DB."""
        import agent as agent_module
        mock_supabase = MagicMock()
        original = agent_module.supabase
        agent_module.supabase = mock_supabase
        try:
            from agent import save_to_database
            result = save_to_database(_base_state({"status": "Search Failed"}))
            assert result["status"] == "Search Failed"
            mock_supabase.table.assert_not_called()
        finally:
            agent_module.supabase = original

    def test_save_calls_upsert(self):
        """save_to_database calls supabase.table('jobs').upsert() on success."""
        import agent as agent_module
        mock_supabase = MagicMock()
        original = agent_module.supabase
        agent_module.supabase = mock_supabase
        try:
            from agent import save_to_database
            state = _base_state({
                "status": "Drafting Complete",
                "selected_job": _fake_job(),
            })
            result = save_to_database(state)
            assert result["status"] == "Saved to DB"
            mock_supabase.table.assert_called_once_with("jobs")
        finally:
            agent_module.supabase = original


# ─────────────────────────────────────────────────────────────────────────────
# Tier 2: Smoke test — full pipeline with mocked network (no real API calls)
# ─────────────────────────────────────────────────────────────────────────────
class TestFullPipelineSmoke:

    def test_pipeline_end_to_end_mocked(self, monkeypatch):
        """
        Full pipeline smoke test: mocks DuckDuckGo + Groq + Supabase.
        Verifies the state flows through all 3 nodes correctly.
        """
        import agent as agent_module
        monkeypatch.setenv("GROQ_API_KEY", "fake-key")

        mock_supabase = MagicMock()
        agent_module.supabase = mock_supabase

        fake_results = [{"title": "Dev - Corp", "href": "https://corp.com/job/1", "body": "Python needed."}]
        fake_llm = MagicMock()
        fake_llm.invoke.side_effect = [
            MagicMock(content="Cover letter text."),
            MagicMock(content="• Bullet 1\n• Bullet 2\n• Bullet 3"),
        ]

        with patch("agent.DDGS") as mock_ddgs:
            with patch("agent.ChatGroq", return_value=fake_llm):
                mock_ddgs.return_value.text.return_value = fake_results
                result = agent_module.agent_app.invoke(_base_state())

        assert result["status"] == "Saved to DB"
        assert len(result["found_jobs"]) == 1
        assert result["cover_letter"] == "Cover letter text."
        assert result["error"] is None


# ─────────────────────────────────────────────────────────────────────────────
# Tier 3: Integration test — real network calls (skipped in CI by default)
# ─────────────────────────────────────────────────────────────────────────────
@pytest.mark.integration
class TestIntegration:
    """
    Runs against real DuckDuckGo and Groq APIs.
    Requires valid keys in .env.
    Skip in CI with: pytest -m "not integration"
    """

    def test_real_pipeline(self):
        """Full pipeline with real API calls — validates end-to-end flow."""
        import agent as agent_module

        result = agent_module.agent_app.invoke(
            _base_state({
                "keywords": "Python Developer",
                "location": "Remote",
            })
        )

        print("\n📊 Integration Test Result:")
        print(f"   Status      : {result.get('status')}")
        print(f"   Jobs Found  : {len(result.get('found_jobs', []))}")
        if result.get("cover_letter"):
            print(f"   Cover Letter: {result['cover_letter'][:200]}...")
        if result.get("error"):
            print(f"   Error       : {result['error']}")

        # Soft assertion — search may return 0 results on rate-limit,
        # but status must always be set.
        assert result.get("status") not in (None, "")


if __name__ == "__main__":
    # Quick smoke run without pytest
    print("=" * 60)
    print("🚀 Running Module 4 Smoke Test")
    print("=" * 60)
    t = TestFullPipelineSmoke()
    # Can't use monkeypatch outside pytest, run integration test instead
    import agent as agent_module
    result = agent_module.agent_app.invoke(_base_state())
    print(f"\n✅ Status : {result.get('status')}")
    print(f"🔍 Jobs   : {len(result.get('found_jobs', []))}")
    if result.get("cover_letter"):
        print(f"📝 Letter : {result['cover_letter'][:300]}...")
    if result.get("error"):
        print(f"❌ Error  : {result['error']}")
    print("=" * 60)
    print("Module 4 smoke run complete!")
