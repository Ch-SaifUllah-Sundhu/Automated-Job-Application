"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { api, JobItem, JobSearchResponse } from "@/lib/api";
import { JobCard } from "@/components/jobs/JobCard";
import {
  FolderKanban,
  FileText,
  Zap,
  Search,
  Filter,
  ArrowUpDown,
  Sparkles,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  X,
  LogOut,
  Briefcase,
  Compass,
  Building,
  RefreshCw,
  Plus,
  ChevronLeft,
  ChevronRight,
  Layers,
} from "lucide-react";

const PORTALS = [
  { id: "all", label: "All Sources" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "indeed", label: "Indeed" },
  { id: "greenhouse", label: "Greenhouse" },
  { id: "lever", label: "Lever" },
  { id: "glassdoor", label: "Glassdoor" },
];

export default function JobsPage() {
  const { user, signOut, loading: authLoading, getAccessToken } = useAuth();
  const router = useRouter();

  // ── States ────────────────────────────────────────────────────────────────
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedPortal, setSelectedPortal] = useState("all");
  const [sortBy, setSortBy] = useState<"match_score" | "created_at">("match_score");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalJobs, setTotalJobs] = useState(0);

  // Applying state
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);

  // Agent Search Modal
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [agentRole, setAgentRole] = useState("");
  const [agentLocation, setAgentLocation] = useState("Remote");
  const [agentRunning, setAgentRunning] = useState(false);

  // Upgrades & Toasts
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [loggingOut, setLoggingOut] = useState(false);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const showToast = useCallback((msg: string, type: "success" | "error" = "success") => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 3800);
  }, []);

  // ── Fetch Jobs ────────────────────────────────────────────────────────────
  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) return;

      const [jobsData, appsData] = await Promise.all([
        api.getJobs(
          token,
          page,
          18,
          debouncedQuery || undefined,
          selectedPortal === "all" ? undefined : selectedPortal,
          sortBy
        ),
        api.getApplications(token).catch(() => []),
      ]);

      setJobs(jobsData.jobs || []);
      setTotalJobs(jobsData.total || 0);
      setTotalPages(Math.max(1, Math.ceil((jobsData.total || 0) / (jobsData.limit || 18))));

      const appliedIds = new Set(
        (appsData || []).map((a) => a.job_id).filter(Boolean)
      );
      setAppliedJobIds(appliedIds);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load opportunities";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [getAccessToken, page, debouncedQuery, selectedPortal, sortBy]);

  useEffect(() => {
    if (!authLoading) {
      fetchJobs();
    }
  }, [authLoading, fetchJobs]);

  // ── Apply Action ──────────────────────────────────────────────────────────
  const handleApply = async (job: JobItem) => {
    setApplyingJobId(job.id);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Authentication required");

      await api.applyToJob(token, job.id, {
        status: "Applied",
      });

      setAppliedJobIds((prev) => new Set(prev).add(job.id));
      showToast(`Applied to ${job.company}! Added to your Kanban pipeline.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Application failed";
      showToast(msg, "error");
    } finally {
      setApplyingJobId(null);
    }
  };

  // ── Trigger AI Agent Search ───────────────────────────────────────────────
  const handleTriggerAgentSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentRole.trim()) return;
    setAgentRunning(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Authentication required");

      const res: JobSearchResponse = await api.searchJobs(
        token,
        agentRole.trim(),
        agentLocation.trim() || "Remote"
      );

      setShowSearchModal(false);
      setAgentRole("");
      showToast(
        `AI agent crawled DuckDuckGo across 10 portals & added ${res.jobs_found} matching roles!`
      );
      setPage(1);
      await fetchJobs();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Search agent failed";
      showToast(msg, "error");
    } finally {
      setAgentRunning(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut();
    } catch (err) {
      console.error(err);
    } finally {
      setLoggingOut(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-[#E2E8F0] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#2563EB]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#0B0F19] text-[#E2E8F0] flex font-sans selection:bg-[#2563EB]/30 selection:text-white">
      {/* Toast */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 p-3.5 rounded-lg border text-white text-xs shadow-2xl flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2 ${
            toastType === "error"
              ? "bg-[#1a0808] border-red-700"
              : "bg-[#111827] border-[#2563EB]"
          }`}
        >
          {toastType === "error" ? (
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 text-[#94A3B8] hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Left Sidebar ──────────────────────────────────────────────────── */}
      <aside className="w-60 border-r border-[#1F2937] bg-[#0B0F19] flex flex-col justify-between shrink-0 hidden md:flex">
        <div>
          {/* Brand */}
          <div className="p-4 border-b border-[#1F2937] flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded bg-[#2563EB] flex items-center justify-center font-bold text-white text-xs tracking-wider">
                JP
              </div>
              <div>
                <span className="text-sm font-semibold tracking-tight text-white block leading-none">
                  JobPilot
                </span>
                <span className="text-[10px] text-[#94A3B8]">Talent Operations</span>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="p-3 space-y-1">
            <Link
              href="/dashboard"
              className="w-full flex items-center gap-2.5 px-3 h-9 rounded text-xs font-medium text-[#94A3B8] hover:text-white hover:bg-[#111827] transition-colors"
            >
              <FolderKanban className="w-4 h-4 text-[#94A3B8]" />
              <span>Job Pipeline</span>
            </Link>

            <Link
              href="/dashboard/jobs"
              className="w-full flex items-center gap-2.5 px-3 h-9 rounded text-xs font-semibold bg-[#161F33] text-white border-l-2 border-[#2563EB]"
            >
              <Compass className="w-4 h-4 text-[#2563EB]" />
              <span>Jobs &amp; Match Scoring</span>
            </Link>

            <Link
              href="/onboarding"
              className="w-full flex items-center gap-2.5 px-3 h-9 rounded text-xs font-medium text-[#94A3B8] hover:text-white hover:bg-[#111827] transition-colors"
            >
              <FileText className="w-4 h-4 text-[#94A3B8]" />
              <span>Resume &amp; Profile</span>
            </Link>

            <button
              onClick={() => setShowUpgradeModal(true)}
              className="w-full flex items-center justify-between px-3 h-9 rounded text-xs font-medium text-[#94A3B8] hover:text-white hover:bg-[#111827] transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2.5">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Pro Membership</span>
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-400/10 text-amber-300 border border-amber-400/20">
                PRO
              </span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-[#1F2937] bg-[#0B0F19]">
          <div className="p-2.5 rounded bg-[#111827] border border-[#1F2937] mb-2.5">
            <div className="text-[10px] uppercase font-bold text-[#64748B] tracking-wider mb-0.5">
              Platform Architect
            </div>
            <p className="text-xs font-medium text-white">Chaudhry Saif Ullah Sundhu</p>
            <p className="text-[10px] text-[#94A3B8]">Founder &amp; Lead Engineer</p>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2 truncate">
              <div className="w-7 h-7 rounded bg-[#2563EB] flex items-center justify-center font-bold text-white text-[11px]">
                {user?.email ? user.email.slice(0, 2).toUpperCase() : "JP"}
              </div>
              <div className="truncate">
                <p className="text-[11px] font-medium text-white truncate">
                  {user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User"}
                </p>
                <p className="text-[10px] text-[#64748B] truncate">{user?.email || ""}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              title="Sign Out"
              className="p-1.5 rounded hover:bg-[#1F2937] text-[#94A3B8] hover:text-red-400 transition-colors cursor-pointer"
            >
              {loggingOut ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#2563EB]" />
              ) : (
                <LogOut className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Content Area ─────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header */}
        <header className="h-16 border-b border-[#1F2937] bg-[#0B0F19]/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#2563EB]/10 border border-[#2563EB]/30 flex items-center justify-center text-[#60A5FA]">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white">Jobs &amp; Semantic Match Scoring</h1>
              <p className="text-[11px] text-[#94A3B8]">
                Real-time Sentence-BERT <span className="font-mono text-emerald-400">all-MiniLM-L6-v2</span> dense vector match
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSearchModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold shadow-md shadow-[#2563EB]/25 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Opportunity Search</span>
            </button>
            <button
              onClick={fetchJobs}
              title="Refresh list"
              className="p-2 rounded-lg bg-[#111827] border border-[#1F2937] text-[#94A3B8] hover:text-white hover:border-[#374151] transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div className="p-6 max-w-7xl w-full mx-auto space-y-6">
          {/* Controls Bar */}
          <div className="p-4 rounded-xl bg-[#0E131F] border border-[#1F2937] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by title, keywords or technology…"
                className="w-full bg-[#111827] border border-[#1F2937] focus:border-[#2563EB] focus:outline-none rounded-lg pl-9 pr-3.5 py-2 text-xs text-white placeholder-[#64748B] transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Portal Filters & Sorting */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Portal Selector */}
              <div className="flex items-center bg-[#111827] rounded-lg p-0.5 border border-[#1F2937] overflow-x-auto">
                {PORTALS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedPortal(p.id);
                      setPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors shrink-0 ${
                      selectedPortal === p.id
                        ? "bg-[#2563EB] text-white shadow-sm"
                        : "text-[#94A3B8] hover:text-white"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-2 bg-[#111827] border border-[#1F2937] rounded-lg px-2.5 py-1.5">
                <ArrowUpDown className="w-3.5 h-3.5 text-[#64748B]" />
                <span className="text-xs text-[#94A3B8]">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "match_score" | "created_at")}
                  className="bg-transparent text-xs font-medium text-white focus:outline-none cursor-pointer"
                >
                  <option value="match_score" className="bg-[#111827] text-white">
                    Highest Match Score
                  </option>
                  <option value="created_at" className="bg-[#111827] text-white">
                    Newest Discovered
                  </option>
                </select>
              </div>
            </div>
          </div>

          {/* Results Summary */}
          <div className="flex items-center justify-between text-xs text-[#94A3B8]">
            <p>
              Showing <span className="font-semibold text-white">{jobs.length}</span> of{" "}
              <span className="font-semibold text-white">{totalJobs}</span> total indexed opportunities
            </p>
            <p className="font-mono text-[11px] text-[#64748B]">
              Embeddings: 384-d Cosine Similarity + Skill-Overlap Calibration
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-4 rounded-xl bg-red-950/20 border border-red-800/50 text-xs text-red-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>
                Backend communication error: {error}.{" "}
                <button onClick={fetchJobs} className="underline hover:text-red-200">
                  Retry
                </button>
              </span>
            </div>
          )}

          {/* Jobs Grid */}
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" />
              <p className="text-xs text-[#94A3B8]">
                Computing Sentence-BERT semantic vectors &amp; skill gaps…
              </p>
            </div>
          ) : jobs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#1F2937] p-12 text-center flex flex-col items-center justify-center space-y-4 max-w-xl mx-auto">
              <div className="w-12 h-12 rounded-xl bg-[#111827] border border-[#1F2937] flex items-center justify-center text-[#64748B]">
                <Briefcase className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-white">No job openings found</h3>
                <p className="text-xs text-[#94A3B8]">
                  {searchQuery || selectedPortal !== "all"
                    ? "Try adjusting your search terms or selecting another portal filter."
                    : "No jobs have been crawled yet. Use the AI search engine to discover opportunities."}
                </p>
              </div>
              <button
                onClick={() => setShowSearchModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold shadow-md shadow-[#2563EB]/25 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Search ATS Opportunities Now</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {jobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onApply={handleApply}
                  isApplying={applyingJobId === job.id}
                  applied={appliedJobIds.has(job.id)}
                />
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-[#1F2937]">
              <button
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#1F2937] bg-[#111827] text-xs font-medium text-[#94A3B8] hover:text-white disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous
              </button>
              <span className="text-xs text-[#64748B] font-mono">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#1F2937] bg-[#111827] text-xs font-medium text-[#94A3B8] hover:text-white disabled:opacity-40 transition-colors"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </main>

      {/* ── Search Opportunities Modal ────────────────────────────────────── */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0E131F] border border-[#1F2937] rounded-xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded bg-[#2563EB]/15 border border-[#2563EB]/40 flex items-center justify-center text-[#60A5FA]">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-white">
                  Crawl ATS Job Portals
                </h3>
              </div>
              <button
                onClick={() => setShowSearchModal(false)}
                className="text-[#64748B] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#94A3B8] leading-relaxed">
              LangGraph agent will query 10+ portals (LinkedIn, Greenhouse, Lever, Workday, Indeed)
              via DuckDuckGo with exponential back-off, embed each role using Sentence-BERT, and calculate match scores.
            </p>

            <form onSubmit={handleTriggerAgentSearch} className="space-y-4">
              <div>
                <label className="text-[11px] font-medium text-[#94A3B8] block mb-1">
                  Target Role / Keywords *
                </label>
                <input
                  type="text"
                  required
                  value={agentRole}
                  onChange={(e) => setAgentRole(e.target.value)}
                  placeholder="e.g. Full Stack Engineer, Python Developer"
                  className="w-full bg-[#111827] border border-[#1F2937] focus:border-[#2563EB] focus:outline-none rounded-lg px-3 py-2 text-xs text-white placeholder-[#64748B]"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-[#94A3B8] block mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={agentLocation}
                  onChange={(e) => setAgentLocation(e.target.value)}
                  placeholder="e.g. Remote, San Francisco, New York"
                  className="w-full bg-[#111827] border border-[#1F2937] focus:border-[#2563EB] focus:outline-none rounded-lg px-3 py-2 text-xs text-white placeholder-[#64748B]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSearchModal(false)}
                  className="px-3.5 py-2 rounded-lg border border-[#1F2937] text-xs font-medium text-[#94A3B8] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={agentRunning || !agentRole.trim()}
                  className="px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-xs font-semibold text-white shadow-md shadow-[#2563EB]/25 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {agentRunning ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Crawling Portals…</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Launch Pipeline</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Upgrade Modal ────────────────────────────────────────────────── */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0E131F] border border-[#1F2937] rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-semibold text-white">JobPilot Pro Membership</h3>
              </div>
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="text-[#64748B] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[#94A3B8]">
              Upgrade to Pro for unlimited AI searches, unlimited headless Playwright submissions,
              and interview preparation flashcards.
            </p>
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="px-4 py-2 rounded-lg bg-[#2563EB] text-white text-xs font-semibold"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
