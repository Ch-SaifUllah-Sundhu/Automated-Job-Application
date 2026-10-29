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

  // ── Save / Prepare Application Action ──────────────────────────────────────
  const handleApply = async (job: JobItem) => {
    setApplyingJobId(job.id);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Authentication required");

      await api.applyToJob(token, job.id, {
        status: "Found",
      });

      setAppliedJobIds((prev) => new Set(prev).add(job.id));
      showToast(`Saved ${job.title} at ${job.company} to your pipeline! Review tailored draft before submitting.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Saving application failed";
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

  // ── 1-Click Direct Crawl ──────────────────────────────────────────────────
  const handleDirectCrawl = async (role: string, loc = "Remote") => {
    const target = role.trim() || "Python Developer";
    setAgentRunning(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Authentication required");

      showToast(`Scraping LinkedIn, Indeed & Glassdoor for "${target}"...`);
      const res: JobSearchResponse = await api.searchJobs(token, target, loc);
      showToast(
        `Crawled ${res.jobs_found} live roles for "${target}"! Added to database & pipeline.`
      );
      setPage(1);
      await fetchJobs();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Live crawl failed";
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
    <div className="w-full text-[#E2E8F0] p-6 lg:p-8 font-sans selection:bg-[#2563EB]/30 selection:text-white max-w-7xl mx-auto">
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

      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#1F2937] mb-6">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Compass className="w-5 h-5 text-[#38BDF8]" />
            <span>Find Jobs &amp; Semantic Match</span>
          </h1>
          <p className="text-xs text-[#94A3B8] mt-1">
            Real-time Sentence-BERT <span className="font-mono text-emerald-400">all-MiniLM-L6-v2</span> dense vector scoring across verified job openings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSearchModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold shadow-md shadow-[#2563EB]/25 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Crawl Portals with AI</span>
          </button>
          <button
            onClick={fetchJobs}
            title="Refresh list"
            className="p-2 rounded-lg bg-[#111827] border border-[#1F2937] text-[#94A3B8] hover:text-white hover:bg-[#1F2937] transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#2563EB]" : ""}`} />
          </button>
        </div>
      </div>

      {/* Content Body */}
      <div className="space-y-6">
          {/* Controls Bar */}
          <div className="p-4 rounded-xl bg-[#0E131F] border border-[#1F2937] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md flex items-center">
              <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter stored roles or type to live crawl…"
                className="w-full bg-[#111827] border border-[#1F2937] focus:border-[#2563EB] focus:outline-none rounded-lg pl-9 pr-24 py-2 text-xs text-white placeholder-[#64748B] transition-colors"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {searchQuery.trim().length >= 2 && (
                  <button
                    onClick={() => handleDirectCrawl(searchQuery.trim())}
                    disabled={agentRunning}
                    title={`Live scrape 10+ portals for "${searchQuery}"`}
                    className="px-2 py-1 rounded bg-[#2563EB] hover:bg-[#1D4ED8] text-[10px] font-semibold text-white flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    {agentRunning ? (
                      <Loader2 className="w-2.5 h-2.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-2.5 h-2.5" />
                    )}
                    <span>Live Crawl</span>
                  </button>
                )}
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="text-[#64748B] hover:text-white p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
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
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <button
                  disabled={agentRunning}
                  onClick={() => handleDirectCrawl(searchQuery.trim() || "Python Developer")}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold shadow-md shadow-[#2563EB]/25 cursor-pointer disabled:opacity-60 transition-all"
                >
                  {agentRunning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Crawling 10+ Portals for &ldquo;{searchQuery.trim() || "Python Developer"}&rdquo;…</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>
                        {searchQuery.trim()
                          ? `1-Click Crawl 10+ Portals for "${searchQuery.trim()}"`
                          : "1-Click Crawl 15 Python Developer Roles"}
                      </span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAgentRole(searchQuery.trim() || "Python Developer");
                    setShowSearchModal(true);
                  }}
                  className="px-4 py-2.5 rounded-lg border border-[#1F2937] hover:bg-[#111827] text-xs font-medium text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
                >
                  Custom Location Crawl…
                </button>
              </div>
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
