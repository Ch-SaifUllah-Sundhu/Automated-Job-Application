"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import {
  LogOut,
  User,
  Shield,
  Briefcase,
  FileText,
  Search,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  Loader2,
  Bell,
  Sparkles,
  Zap,
  Filter,
  Plus,
  ArrowUpRight,
  ExternalLink,
  ChevronRight,
  X,
  Check,
  Building,
  MapPin,
  Clock,
  Layers,
  BarChart3,
  Settings,
  HelpCircle,
  FolderKanban,
  Target,
  ArrowRight,
  Copy,
  Edit3,
  RefreshCw,
} from "lucide-react";

interface JobItem {
  id: string;
  title: string;
  company: string;
  location: string;
  portal: string;
  matchScore: number;
  stage: "discovered" | "tailored" | "applied" | "interview";
  postedAt: string;
  salary: string;
  coverLetterSnippet: string;
  skills: string[];
}

const INITIAL_JOBS: JobItem[] = [
  {
    id: "job-1",
    title: "Senior Full Stack Engineer",
    company: "Stripe",
    location: "Remote (Global)",
    portal: "Greenhouse",
    matchScore: 96,
    stage: "tailored",
    postedAt: "2h ago",
    salary: "$165,000 - $215,000",
    skills: ["Next.js", "TypeScript", "FastAPI", "PostgreSQL", "Tailwind CSS"],
    coverLetterSnippet:
      "Dear Stripe Engineering Directors, With extensive experience architecting distributed backends and high-velocity Next.js web applications, I have consistently delivered robust zero-downtime platforms. My technical background in PostgreSQL schema design, API security, and high-throughput transaction flows aligns closely with Stripe's payments scalability standards.",
  },
  {
    id: "job-2",
    title: "AI Solutions Architect",
    company: "Anthropic Ecosystem",
    location: "San Francisco, CA (Hybrid)",
    portal: "Lever",
    matchScore: 93,
    stage: "discovered",
    postedAt: "4h ago",
    salary: "$180,000 - $240,000",
    skills: ["LangGraph", "Python", "Llama 3", "Vector DBs", "RAG"],
    coverLetterSnippet:
      "Dear Talent Acquisition Lead, I am thrilled to submit my credentials for the AI Solutions Architect role. Bringing proven experience orchestrating LangGraph multi-agent pipelines, custom tool abstractions, and real-time LLM inference, I engineer mission-critical autonomous agents with deterministic guardrails.",
  },
  {
    id: "job-3",
    title: "Lead Frontend Engineer",
    company: "Vercel",
    location: "Remote",
    portal: "LinkedIn",
    matchScore: 89,
    stage: "applied",
    postedAt: "1d ago",
    salary: "$150,000 - $190,000",
    skills: ["React 19", "Next.js App Router", "SSR", "Design Systems"],
    coverLetterSnippet:
      "To the Engineering Team at Vercel, Having built enterprise Next.js App Router applications with strict SSR optimization, fluid glassmorphic micro-interactions, and custom design systems, I thrive on crafting frictionless developer experiences and high-performance web products.",
  },
  {
    id: "job-4",
    title: "Backend Cloud Specialist",
    company: "Datadog",
    location: "New York, NY",
    portal: "Indeed",
    matchScore: 84,
    stage: "interview",
    postedAt: "3d ago",
    salary: "$170,000 - $220,000",
    skills: ["FastAPI", "Redis", "Celery", "PostgreSQL", "Docker"],
    coverLetterSnippet:
      "Dear Hiring Team, I specialize in high-throughput FastAPI and PostgreSQL architectures, managing complex caching tiers and automated asynchronous task queues. My experience building resilient telemetry pipelines directly fits Datadog's infrastructure requirements.",
  },
];

export default function DashboardPage() {
  const { user, signOut, loading } = useAuth();
  const router = useRouter();

  // Navigation states
  const [activeNav, setActiveNav] = useState<"pipeline" | "documents" | "settings">("pipeline");
  const [loggingOut, setLoggingOut] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationsList, setNotificationsList] = useState([
    {
      id: "n-1",
      title: "Llama 3 Tailoring Engine Active",
      desc: "Ready to synthesize bespoke documents for any opening.",
      time: "Just now",
      read: false,
    },
    {
      id: "n-2",
      title: "10+ ATS Portals Synchronized",
      desc: "DuckDuckGo scraper rate limits configured with back-off.",
      time: "10m ago",
      read: false,
    },
  ]);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Job Board state
  const [jobsList, setJobsList] = useState<JobItem[]>(INITIAL_JOBS);
  const [selectedJob, setSelectedJob] = useState<JobItem | null>(null);
  const [editingCoverLetter, setEditingCoverLetter] = useState(false);
  const [coverLetterDraft, setCoverLetterDraft] = useState("");
  const [copied, setCopied] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPortal, setSelectedPortal] = useState("all");
  const [newSearchRole, setNewSearchRole] = useState("");
  const [newSearchLocation, setNewSearchLocation] = useState("Remote");
  const [searchingRemote, setSearchingRemote] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut();
    } catch (err) {
      console.error("Sign out error:", err);
    } finally {
      setLoggingOut(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    setTimeout(async () => {
      try {
        await signOut();
        router.push("/signup?message=Account+successfully+deleted");
      } catch (err) {
        console.error("Delete account error:", err);
      } finally {
        setDeletingAccount(false);
        setShowDeleteModal(false);
      }
    }, 1000);
  };

  const handleTriggerSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSearchRole.trim()) return;

    setSearchingRemote(true);
    setTimeout(() => {
      const created: JobItem = {
        id: `job-${Date.now()}`,
        title: newSearchRole,
        company: "Remote Placements Tech",
        location: newSearchLocation || "Global Remote",
        portal: "DuckDuckGo Aggregator",
        matchScore: Math.floor(Math.random() * 10) + 89,
        stage: "discovered",
        postedAt: "Just now",
        salary: "$145,000 - $195,000",
        skills: ["TypeScript", "Full Stack", "APIs", "Cloud"],
        coverLetterSnippet: `Dear Hiring Team, I am submitting my candidacy for the ${newSearchRole} position. With a strong track record building robust full-stack software and autonomous workflows, I look forward to contributing immediately to your engineering goals.`,
      };
      setJobsList((prev) => [created, ...prev]);
      setSearchingRemote(false);
      setShowSearchModal(false);
      setNewSearchRole("");
      showToast(`Discovered new opening: "${created.title}"`);
    }, 1200);
  };

  const moveJobStage = (jobId: string, nextStage: JobItem["stage"]) => {
    setJobsList((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, stage: nextStage } : j))
    );
    showToast(`Application moved to ${nextStage.toUpperCase()} stage`);
  };

  const handleOpenJobModal = (job: JobItem) => {
    setSelectedJob(job);
    setCoverLetterDraft(job.coverLetterSnippet);
    setEditingCoverLetter(false);
    setCopied(false);
  };

  const handleSaveCoverLetter = () => {
    if (!selectedJob) return;
    setJobsList((prev) =>
      prev.map((j) => (j.id === selectedJob.id ? { ...j, coverLetterSnippet: coverLetterDraft } : j))
    );
    setSelectedJob((prev) => prev ? { ...prev, coverLetterSnippet: coverLetterDraft } : null);
    setEditingCoverLetter(false);
    showToast("Tailored cover letter saved successfully.");
  };

  const handleCopyCoverLetter = () => {
    if (!coverLetterDraft) return;
    navigator.clipboard.writeText(coverLetterDraft);
    setCopied(true);
    showToast("Cover letter copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredJobs = jobsList.filter((job) => {
    const query = searchQuery.toLowerCase();
    const matchesQuery =
      job.title.toLowerCase().includes(query) ||
      job.company.toLowerCase().includes(query) ||
      job.skills.some((s) => s.toLowerCase().includes(query));
    const matchesPortal = selectedPortal === "all" || job.portal.toLowerCase() === selectedPortal.toLowerCase();
    return matchesQuery && matchesPortal;
  });

  const stages: { id: JobItem["stage"]; label: string; count: number; colorClass: string; badgeClass: string }[] = [
    {
      id: "discovered",
      label: "Discovered",
      count: filteredJobs.filter((j) => j.stage === "discovered").length,
      colorClass: "border-blue-500/40 text-blue-400 bg-blue-500/10",
      badgeClass: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
    },
    {
      id: "tailored",
      label: "AI Tailored",
      count: filteredJobs.filter((j) => j.stage === "tailored").length,
      colorClass: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10",
      badgeClass: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
    },
    {
      id: "applied",
      label: "Applied",
      count: filteredJobs.filter((j) => j.stage === "applied").length,
      colorClass: "border-purple-500/40 text-purple-400 bg-purple-500/10",
      badgeClass: "bg-purple-500/15 text-purple-400 border border-purple-500/30",
    },
    {
      id: "interview",
      label: "Interviewing",
      count: filteredJobs.filter((j) => j.stage === "interview").length,
      colorClass: "border-amber-500/40 text-amber-400 bg-amber-500/10",
      badgeClass: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-[#E2E8F0] flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-[#2563EB]" />
          <span className="text-xs text-[#94A3B8]">Loading authenticated workspace...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#0B0F19] text-[#E2E8F0] flex font-sans selection:bg-[#2563EB]/30 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 p-3 rounded bg-[#111827] border border-[#2563EB] text-white text-xs shadow-xl flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-[#94A3B8] hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Left Sidebar Navigation */}
      <aside className="w-60 border-r border-[#1F2937] bg-[#0B0F19] flex flex-col justify-between shrink-0 hidden md:flex">
        <div>
          {/* Brand Header */}
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

          {/* Nav List */}
          <nav className="p-3 space-y-1">
            <button
              onClick={() => setActiveNav("pipeline")}
              className={`w-full flex items-center gap-2.5 px-3 h-9 rounded text-xs font-medium transition-colors cursor-pointer ${
                activeNav === "pipeline"
                  ? "bg-[#161F33] text-white font-semibold border-l-2 border-[#2563EB]"
                  : "text-[#94A3B8] hover:text-white hover:bg-[#111827]"
              }`}
            >
              <FolderKanban className="w-4 h-4 text-[#2563EB]" />
              <span>Job Pipeline</span>
            </button>

            <Link
              href="/onboarding"
              className="w-full flex items-center gap-2.5 px-3 h-9 rounded text-xs font-medium text-[#94A3B8] hover:text-white hover:bg-[#111827] transition-colors"
            >
              <FileText className="w-4 h-4 text-[#94A3B8]" />
              <span>Resume & Profile</span>
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

        {/* Sidebar Footer - Real User & Owner Attribution */}
        <div className="p-3 border-t border-[#1F2937] bg-[#0B0F19]">
          <div className="p-2.5 rounded bg-[#111827] border border-[#1F2937] mb-2.5">
            <div className="text-[10px] uppercase font-bold text-[#64748B] tracking-wider mb-0.5">
              Platform Architect
            </div>
            <p className="text-xs font-medium text-white">Chaudhry Saif Ullah Sundhu</p>
            <p className="text-[10px] text-[#94A3B8]">Founder & Lead Engineer</p>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2 truncate">
              <div className="w-7 h-7 rounded bg-[#2563EB] flex items-center justify-center font-bold text-white text-[11px]">
                {user?.email ? user.email.slice(0, 2).toUpperCase() : "CS"}
              </div>
              <div className="truncate">
                <p className="text-[11px] font-medium text-white truncate">
                  {user?.user_metadata?.full_name || "Saif Ullah"}
                </p>
                <p className="text-[10px] text-[#64748B] truncate">{user?.email || "saif@example.com"}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              title="Sign Out"
              className="p-1.5 rounded hover:bg-[#1F2937] text-[#94A3B8] hover:text-red-400 transition-colors cursor-pointer"
            >
              {loggingOut ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#2563EB]" /> : <LogOut className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header Bar */}
        <header className="h-14 border-b border-[#1F2937] bg-[#0B0F19]/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search pipeline by role, company, or tech stack..."
                className="w-full h-8 pl-8 pr-3 bg-[#111827] border border-[#1F2937] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] rounded text-xs text-white placeholder-[#64748B] outline-none transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Search Jobs Trigger */}
            <button
              onClick={() => setShowSearchModal(true)}
              className="h-8 px-3 rounded bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Search Opportunities</span>
            </button>

            {/* Notifications Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="w-8 h-8 rounded bg-[#111827] hover:bg-[#1F2937] border border-[#1F2937] flex items-center justify-center text-[#94A3B8] hover:text-white transition-colors cursor-pointer relative"
              >
                <Bell className="w-3.5 h-3.5" />
                <span className="w-2 h-2 rounded-full bg-emerald-500 absolute top-1.5 right-1.5 ring-2 ring-[#111827]" />
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 rounded-lg bg-[#111827] border border-[#1F2937] p-3 shadow-xl z-50">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#1F2937]">
                    <span className="text-xs font-semibold text-white">System Events</span>
                    <button
                      onClick={() => {
                        setNotificationsList((prev) => prev.map((n) => ({ ...n, read: true })));
                        showToast("All notifications marked as read.");
                      }}
                      className="text-[10px] text-[#2563EB] hover:underline"
                    >
                      Mark all as read
                    </button>
                  </div>
                  <div className="space-y-2 text-xs">
                    {notificationsList.map((n) => (
                      <div key={n.id} className="p-2.5 rounded bg-[#0B0F19] border border-[#1F2937]">
                        <div className="flex items-center justify-between">
                          <p className="text-white font-medium text-xs">{n.title}</p>
                          <span className="text-[10px] text-[#64748B]">{n.time}</span>
                        </div>
                        <p className="text-[11px] text-[#94A3B8] mt-0.5">{n.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="p-6 space-y-6">
          {/* Metric KPI Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-lg bg-[#111827] border border-[#1F2937] flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-[#94A3B8]">Scraped Jobs</span>
                <div className="text-xl font-bold text-white mt-1">{jobsList.length}</div>
                <span className="text-[10px] text-emerald-400 font-medium block mt-0.5">Live Portal Opportunities</span>
              </div>
              <div className="w-9 h-9 rounded bg-[#2563EB]/15 border border-[#2563EB]/30 flex items-center justify-center text-[#2563EB]">
                <Briefcase className="w-4 h-4" />
              </div>
            </div>

            <div className="p-4 rounded-lg bg-[#111827] border border-[#1F2937] flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-[#94A3B8]">Tailored Documents</span>
                <div className="text-xl font-bold text-white mt-1">
                  {jobsList.filter((j) => j.stage === "tailored").length}
                </div>
                <span className="text-[10px] text-emerald-400 font-medium block mt-0.5">Llama 3 Synthesized</span>
              </div>
              <div className="w-9 h-9 rounded bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>

            <div className="p-4 rounded-lg bg-[#111827] border border-[#1F2937] flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-[#94A3B8]">Active Pipeline</span>
                <div className="text-xl font-bold text-white mt-1">
                  {jobsList.filter((j) => j.stage === "applied" || j.stage === "interview").length}
                </div>
                <span className="text-[10px] text-purple-400 font-medium block mt-0.5">Applied & Interviewing</span>
              </div>
              <div className="w-9 h-9 rounded bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>

            <button
              onClick={() => setShowUpgradeModal(true)}
              className="p-4 rounded-lg bg-[#111827] hover:bg-[#161F33] border border-[#1F2937] hover:border-amber-400/40 transition-colors flex items-center justify-between text-left cursor-pointer group"
            >
              <div>
                <span className="text-xs font-medium text-[#94A3B8] group-hover:text-white transition-colors">Daily Searches</span>
                <div className="text-xl font-bold text-white mt-1">3 / 3 Used</div>
                <span className="text-[10px] text-amber-300 font-medium block mt-0.5">Unlock Unlimited Pro →</span>
              </div>
              <div className="w-9 h-9 rounded bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400">
                <Zap className="w-4 h-4" />
              </div>
            </button>
          </div>

          {/* Kanban Section Header & Filters */}
          <div className="space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-white">Candidate Application Board</h2>
                <p className="text-xs text-[#94A3B8]">Review match scores, tailored documents, and track pipeline status.</p>
              </div>

              {/* Portal Source Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#94A3B8]">Portal Filter:</span>
                <select
                  value={selectedPortal}
                  onChange={(e) => setSelectedPortal(e.target.value)}
                  className="h-8 px-2.5 rounded bg-[#111827] border border-[#1F2937] text-xs text-white outline-none cursor-pointer"
                >
                  <option value="all">All Portals</option>
                  <option value="greenhouse">Greenhouse</option>
                  <option value="lever">Lever</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="indeed">Indeed</option>
                  <option value="duckduckgo aggregator">DuckDuckGo</option>
                </select>
              </div>
            </div>

            {/* 4 Stage Kanban Columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {stages.map((col) => {
                const colJobs = filteredJobs.filter((j) => j.stage === col.id);
                return (
                  <div
                    key={col.id}
                    className="rounded-lg bg-[#0E131F] border border-[#1F2937] p-3 flex flex-col min-h-[480px]"
                  >
                    {/* Column Header */}
                    <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[#1F2937]">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${col.colorClass}`}>
                          {col.label}
                        </span>
                        <span className="text-xs text-[#94A3B8] font-mono">({colJobs.length})</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowSearchModal(true)}
                        className="text-[#64748B] hover:text-white p-1 rounded transition-colors"
                        title="Add opportunity"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Cards Container */}
                    <div className="space-y-2.5 flex-1 overflow-y-auto">
                      {colJobs.length === 0 ? (
                        <div className="h-32 rounded border border-dashed border-[#1F2937] flex flex-col items-center justify-center text-center p-3">
                          <span className="text-xs text-[#64748B]">No items in {col.label}</span>
                        </div>
                      ) : (
                        colJobs.map((job) => (
                          <div
                            key={job.id}
                            onClick={() => handleOpenJobModal(job)}
                            className="p-3 rounded bg-[#111827] hover:bg-[#161F33] border border-[#1F2937] hover:border-[#2563EB]/50 transition-colors cursor-pointer space-y-2.5 group shadow-sm"
                          >
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] uppercase font-bold text-[#60A5FA]">
                                  {job.portal}
                                </span>
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#2563EB]/15 text-[#60A5FA] border border-[#2563EB]/30">
                                  {job.matchScore}% Match
                                </span>
                              </div>
                              <h3 className="text-xs font-semibold text-white group-hover:text-[#60A5FA] transition-colors leading-snug">
                                {job.title}
                              </h3>
                              <p className="text-[11px] text-[#94A3B8] flex items-center gap-1 mt-0.5">
                                <Building className="w-3 h-3 text-[#64748B]" />
                                {job.company}
                              </p>
                            </div>

                            {/* Skills Chips */}
                            <div className="flex flex-wrap gap-1">
                              {job.skills.slice(0, 3).map((skill, idx) => (
                                <span
                                  key={idx}
                                  className="px-1.5 py-0.5 rounded text-[9px] bg-[#0B0F19] border border-[#1F2937] text-[#94A3B8]"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-[#64748B] pt-2 border-t border-[#1F2937]">
                              <span>{job.salary}</span>
                              <div className="flex items-center gap-1 text-[#94A3B8]">
                                <Clock className="w-3 h-3" />
                                <span>{job.postedAt}</span>
                              </div>
                            </div>

                            {/* Column Transition Action Button */}
                            <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                              {job.stage === "discovered" && (
                                <button
                                  type="button"
                                  onClick={() => moveJobStage(job.id, "tailored")}
                                  className="w-full h-7 rounded bg-[#0B0F19] hover:bg-[#2563EB] border border-[#1F2937] hover:border-[#2563EB] text-[10px] font-medium text-white transition-colors cursor-pointer flex items-center justify-center gap-1"
                                >
                                  <Sparkles className="w-3 h-3 text-emerald-400" />
                                  <span>Tailor with Llama 3 →</span>
                                </button>
                              )}
                              {job.stage === "tailored" && (
                                <button
                                  type="button"
                                  onClick={() => moveJobStage(job.id, "applied")}
                                  className="w-full h-7 rounded bg-emerald-950/40 hover:bg-emerald-600 border border-emerald-800/80 text-[10px] font-medium text-emerald-300 hover:text-white transition-colors cursor-pointer flex items-center justify-center gap-1"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Submit Application →</span>
                                </button>
                              )}
                              {job.stage === "applied" && (
                                <button
                                  type="button"
                                  onClick={() => moveJobStage(job.id, "interview")}
                                  className="w-full h-7 rounded bg-purple-950/40 hover:bg-purple-600 border border-purple-800/80 text-[10px] font-medium text-purple-300 hover:text-white transition-colors cursor-pointer flex items-center justify-center gap-1"
                                >
                                  <Briefcase className="w-3 h-3" />
                                  <span>Move to Interview →</span>
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Account Danger Zone */}
          <div className="rounded-lg border border-red-900/40 bg-red-950/10 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-semibold text-red-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Account Purge & Compliance</span>
              </h4>
              <p className="mt-0.5 text-xs text-[#94A3B8]">
                Permanently purge your candidate specifications, ingested resume embeddings, and application records.
              </p>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-3 h-8 rounded bg-red-950/60 hover:bg-red-900/80 border border-red-800/80 text-xs font-medium text-red-200 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
              <span>Delete Account</span>
            </button>
          </div>
        </main>
      </div>

      {/* MODAL 1: Search Opportunities Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-[#1F2937] rounded-lg max-w-md w-full p-6 shadow-xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#1F2937]">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Search className="w-4 h-4 text-[#2563EB]" />
                <span>Query Job Opportunities</span>
              </h3>
              <button onClick={() => setShowSearchModal(false)} className="text-[#94A3B8] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleTriggerSearch} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-[#CBD5E1] mb-1.5">
                  Target Role Title or Tech Stack
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newSearchRole}
                  onChange={(e) => setNewSearchRole(e.target.value)}
                  placeholder="e.g. Lead React Engineer, Cloud Architect..."
                  className="w-full h-9 px-3 bg-[#0B0F19] border border-[#1F2937] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] rounded text-xs text-white placeholder-[#64748B] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#CBD5E1] mb-1.5">
                  Target Geographic Location
                </label>
                <input
                  type="text"
                  value={newSearchLocation}
                  onChange={(e) => setNewSearchLocation(e.target.value)}
                  placeholder="e.g. Remote, US, Global..."
                  className="w-full h-9 px-3 bg-[#0B0F19] border border-[#1F2937] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] rounded text-xs text-white placeholder-[#64748B] outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1F2937]">
                <button
                  type="button"
                  onClick={() => setShowSearchModal(false)}
                  className="h-8 px-3.5 rounded bg-[#0B0F19] hover:bg-[#1F2937] border border-[#1F2937] text-xs font-medium text-[#CBD5E1] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={searchingRemote}
                  className="h-8 px-4 rounded bg-[#2563EB] hover:bg-[#1D4ED8] text-xs font-semibold text-white flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {searchingRemote ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Scraping Portals...</span>
                    </>
                  ) : (
                    <>
                      <span>Run Search</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Tailored Document & Application Details Drawer */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-[#1F2937] rounded-lg max-w-xl w-full p-6 shadow-xl animate-in zoom-in-95">
            <div className="flex items-start justify-between pb-3.5 border-b border-[#1F2937]">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#60A5FA] tracking-wider">
                  {selectedJob.portal} Verified Position
                </span>
                <h2 className="text-base font-semibold text-white mt-0.5">{selectedJob.title}</h2>
                <p className="text-xs text-[#94A3B8]">{selectedJob.company} · {selectedJob.location}</p>
              </div>
              <button onClick={() => setSelectedJob(null)} className="text-[#94A3B8] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5">
              {/* Document Tailoring Area */}
              <div className="p-3.5 rounded bg-[#0B0F19] border border-[#1F2937]">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-semibold text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Llama 3 Tailored Cover Letter</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingCoverLetter(!editingCoverLetter)}
                      className="text-[11px] text-[#2563EB] hover:text-[#60A5FA] font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>{editingCoverLetter ? "Preview" : "Edit"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyCoverLetter}
                      className="text-[11px] text-[#CBD5E1] hover:text-white font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copied ? "Copied!" : "Copy"}</span>
                    </button>
                  </div>
                </div>

                {editingCoverLetter ? (
                  <div className="space-y-2">
                    <textarea
                      rows={6}
                      value={coverLetterDraft}
                      onChange={(e) => setCoverLetterDraft(e.target.value)}
                      className="w-full p-2.5 bg-[#111827] border border-[#1F2937] focus:border-[#2563EB] rounded text-xs text-white font-mono outline-none"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleSaveCoverLetter}
                        className="h-7 px-3 rounded bg-[#2563EB] text-white text-xs font-medium cursor-pointer"
                      >
                        Save Draft
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-[#CBD5E1] leading-relaxed italic bg-[#111827] p-3 rounded border border-[#1F2937]">
                    "{selectedJob.coverLetterSnippet}"
                  </p>
                )}
              </div>

              {/* Match Score & Metrics */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded bg-[#0B0F19] border border-[#1F2937]">
                  <span className="text-[10px] text-[#64748B] block">SEMANTIC MATCH</span>
                  <span className="text-lg font-bold text-emerald-400">{selectedJob.matchScore}%</span>
                </div>
                <div className="p-3 rounded bg-[#0B0F19] border border-[#1F2937]">
                  <span className="text-[10px] text-[#64748B] block">COMPENSATION</span>
                  <span className="text-lg font-bold text-white">{selectedJob.salary}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3.5 border-t border-[#1F2937] flex items-center justify-between">
              {/* Move Stage Selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-[#94A3B8]">Move to:</span>
                <select
                  value={selectedJob.stage}
                  onChange={(e) => {
                    const stg = e.target.value as JobItem["stage"];
                    moveJobStage(selectedJob.id, stg);
                    setSelectedJob({ ...selectedJob, stage: stg });
                  }}
                  className="h-7 px-2 rounded bg-[#0B0F19] border border-[#1F2937] text-xs text-white outline-none cursor-pointer"
                >
                  <option value="discovered">Discovered</option>
                  <option value="tailored">AI Tailored</option>
                  <option value="applied">Applied</option>
                  <option value="interview">Interviewing</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedJob(null)}
                  className="h-8 px-3.5 rounded bg-[#0B0F19] hover:bg-[#1F2937] border border-[#1F2937] text-xs font-medium text-[#CBD5E1] transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    moveJobStage(selectedJob.id, "applied");
                    setSelectedJob(null);
                  }}
                  className="h-8 px-3.5 rounded bg-[#2563EB] hover:bg-[#1D4ED8] text-xs font-semibold text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Submit Application</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Upgrade to Pro Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-[#1F2937] rounded-lg max-w-lg w-full p-6 shadow-xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#1F2937]">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-semibold text-white">Upgrade to JobPilot Pro</h3>
              </div>
              <button onClick={() => setShowUpgradeModal(false)} className="text-[#94A3B8] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <p className="text-[#94A3B8] leading-relaxed">
                Unlock autonomous Playwright submissions, unlimited daily job searches, and custom interview prep.
              </p>

              <div className="p-4 rounded bg-[#0B0F19] border border-[#2563EB]/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white text-sm">Pro Membership</span>
                  <span className="font-bold text-emerald-400 text-sm">$29 / month</span>
                </div>
                <div className="space-y-2 text-[#CBD5E1]">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Unlimited daily searches across 10+ job portals</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Autonomous Playwright headless submissions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Unlimited Groq Llama 3 document tailoring</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Chrome Extension 1-click autofill integration</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2 pt-3 border-t border-[#1F2937]">
              <button
                type="button"
                onClick={() => setShowUpgradeModal(false)}
                className="h-8 px-3.5 rounded bg-[#0B0F19] hover:bg-[#1F2937] border border-[#1F2937] text-xs font-medium text-[#CBD5E1] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUpgradeModal(false);
                  showToast("Module 10 (Stripe Integration) will process live checkouts.");
                }}
                className="h-8 px-4 rounded bg-[#2563EB] hover:bg-[#1D4ED8] text-xs font-semibold text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Continue to Checkout</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Delete Account Confirmation */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-red-800/80 rounded-lg max-w-md w-full p-6 shadow-xl animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-400 mb-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-semibold text-white">Permanently Delete Account?</h3>
            </div>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              This action cannot be undone. All candidate specifications, tailored resumes, and telemetry records will be permanently removed.
            </p>

            <div className="mt-5 flex items-center justify-end gap-2 pt-3 border-t border-[#1F2937]">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deletingAccount}
                className="h-8 px-3.5 rounded bg-[#0B0F19] hover:bg-[#1F2937] border border-[#1F2937] text-xs font-medium text-[#CBD5E1] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deletingAccount}
                className="h-8 px-4 rounded bg-red-600 hover:bg-red-700 text-xs font-semibold text-white transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {deletingAccount ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Yes, Delete Everything</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
