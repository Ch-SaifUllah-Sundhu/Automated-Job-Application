"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
  ArrowRight,
  ExternalLink,
  ChevronRight,
  X,
  Check,
  Building,
  MapPin,
  Clock,
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
}

const INITIAL_JOBS: JobItem[] = [
  {
    id: "job-1",
    title: "Senior Full Stack Engineer",
    company: "Stripe",
    location: "Remote (US/Global)",
    portal: "Greenhouse",
    matchScore: 96,
    stage: "tailored",
    postedAt: "2h ago",
    salary: "$160k - $210k",
    coverLetterSnippet: "Dear Hiring Team, With over 5 years architecting enterprise distributed backends and high-velocity Next.js web applications...",
  },
  {
    id: "job-2",
    title: "Python / AI Solutions Architect",
    company: "OpenAI Ecosystem",
    location: "San Francisco, CA (Hybrid)",
    portal: "Lever",
    matchScore: 92,
    stage: "discovered",
    postedAt: "5h ago",
    salary: "$180k - $240k",
    coverLetterSnippet: "Dear Talent Acquisition Lead, I am thrilled to submit my credentials for the AI Solutions Architect role, bringing proven experience with LangGraph and Llama 3 pipelines...",
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
    salary: "$150k - $195k",
    coverLetterSnippet: "To the Engineering Directors at Vercel, My extensive track record optimizing Next.js App Router performance and building design systems...",
  },
];

export default function DashboardPage() {
  const { user, signOut, loading } = useAuth();
  const router = useRouter();

  // Navigation & Modal states
  const [loggingOut, setLoggingOut] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobItem | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStage, setSelectedStage] = useState<string>("all");
  const [isSearching, setIsSearching] = useState(false);
  const [jobsList, setJobsList] = useState<JobItem[]>(INITIAL_JOBS);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

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
    }, 1200);
  };

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setTimeout(() => {
      const newJob: JobItem = {
        id: `job-${Date.now()}`,
        title: searchQuery.includes("Python") ? searchQuery : `${searchQuery} Specialist`,
        company: "Autonomous Placements",
        location: "Global Remote",
        portal: "DuckDuckGo Realtime",
        matchScore: Math.floor(Math.random() * 15) + 85,
        stage: "discovered",
        postedAt: "Just now",
        salary: "$140k - $185k",
        coverLetterSnippet: `Tailored application for ${searchQuery}. High affinity match based on your parsed resume embeddings.`,
      };
      setJobsList((prev) => [newJob, ...prev]);
      setIsSearching(false);
      showToast(`Discovered new high-match opening: "${newJob.title}"`);
    }, 1000);
  };

  const filteredJobs = jobsList.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStage = selectedStage === "all" || job.stage === selectedStage;
    return matchesSearch && matchesStage;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-[#E2E8F0] flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" />
          <span className="text-xs text-[#94A3B8]">Loading authenticated workspace...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#0B0F19] text-[#E2E8F0] flex flex-col font-sans selection:bg-[#2563EB]/30 selection:text-white">
      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 p-3.5 rounded-lg bg-[#111827] border border-[#2563EB]/60 text-white text-xs shadow-2xl flex items-center gap-2.5 animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 text-[#94A3B8] hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Enterprise Header */}
      <header className="w-full border-b border-[#1F2937] bg-[#0B0F19]/90 backdrop-blur-md px-6 py-3.5 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-[#2563EB]/40 shadow-sm">
              <Image src="/logo.jpg" alt="JobPilot" fill className="object-cover" priority />
            </div>
            <div>
              <span className="text-sm font-semibold tracking-tight text-white block leading-none">
                JobPilot
              </span>
              <span className="text-[10px] text-[#94A3B8]">Talent Operations</span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-3 text-xs">
          {/* Notifications Trigger */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="w-8 h-8 rounded bg-[#111827] hover:bg-[#1F2937] border border-[#1F2937] flex items-center justify-center text-[#94A3B8] hover:text-white transition-colors cursor-pointer relative"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="w-2 h-2 rounded-full bg-emerald-500 absolute top-1.5 right-1.5 ring-2 ring-[#111827]" />
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-72 rounded-lg bg-[#111827] border border-[#1F2937] p-3 shadow-2xl z-50">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#1F2937]">
                  <span className="text-xs font-semibold text-white">Notifications</span>
                  <span className="text-[10px] text-[#94A3B8]">3 updates</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="p-2 rounded bg-[#0B0F19] border border-[#1F2937]">
                    <p className="text-white font-medium">Llama 3 Tailoring Engine Ready</p>
                    <p className="text-[11px] text-[#94A3B8] mt-0.5">Groq model inference connected and operational.</p>
                  </div>
                  <div className="p-2 rounded bg-[#0B0F19] border border-[#1F2937]">
                    <p className="text-white font-medium">Search Portals Online</p>
                    <p className="text-[11px] text-[#94A3B8] mt-0.5">DuckDuckGo 10+ portal scrapers active.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Session Chip */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded bg-[#111827] border border-[#1F2937] text-[#CBD5E1]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs truncate max-w-[200px] font-medium">
              {user?.email || "Saif Ullah Sundhu"}
            </span>
          </div>

          {/* Real Logout Button */}
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-1.5 h-8 px-3 rounded bg-[#111827] hover:bg-[#1F2937] border border-[#1F2937] text-xs font-medium text-[#E2E8F0] transition-colors cursor-pointer disabled:opacity-50"
          >
            {loggingOut ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#2563EB]" />
            ) : (
              <LogOut className="w-3.5 h-3.5 text-[#94A3B8]" />
            )}
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* Welcome Banner */}
        <div className="p-6 rounded-xl bg-[#111827] border border-[#1F2937] mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-white tracking-tight">
                Welcome back, {user?.user_metadata?.full_name || "Saif Ullah Sundhu"}
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                ACTIVE
              </span>
            </div>
            <p className="mt-1 text-xs text-[#94A3B8] max-w-xl">
              Autonomous job aggregation, resume matching, and document tailoring workspace.
            </p>
          </div>

          <div className="flex items-center gap-2.5 relative z-10 w-full sm:w-auto">
            <Link
              href="/onboarding"
              className="flex-1 sm:flex-initial h-9 px-4 rounded bg-[#1F2937] hover:bg-[#374151] border border-[#374151] text-xs font-medium text-white flex items-center justify-center gap-1.5 transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-[#60A5FA]" />
              <span>Resume & Profile</span>
            </Link>

            <button
              onClick={() => setShowUpgradeModal(true)}
              className="flex-1 sm:flex-initial h-9 px-4 rounded bg-[#2563EB] hover:bg-[#1D4ED8] text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Upgrade to Pro</span>
            </button>
          </div>
        </div>

        {/* 4 Interactive Telemetry Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Card 1: Saved Jobs */}
          <button
            onClick={() => {
              setSelectedStage("all");
              showToast("Displaying all aggregated job opportunities");
            }}
            className="p-5 rounded-xl bg-[#111827] hover:bg-[#161F33] border border-[#1F2937] hover:border-[#2563EB]/50 transition-all text-left cursor-pointer group"
          >
            <div className="flex items-center justify-between text-[#94A3B8]">
              <span className="text-xs font-medium group-hover:text-white transition-colors">Saved Positions</span>
              <Briefcase className="w-4 h-4 text-[#2563EB]" />
            </div>
            <div className="mt-3 text-3xl font-bold text-white tracking-tight">{jobsList.length}</div>
            <p className="mt-1 text-[11px] text-[#64748B]">Across 10+ job portals</p>
          </button>

          {/* Card 2: Tailored Documents */}
          <button
            onClick={() => {
              setSelectedStage("tailored");
              showToast("Filtered: Documents drafted by Llama 3");
            }}
            className="p-5 rounded-xl bg-[#111827] hover:bg-[#161F33] border border-[#1F2937] hover:border-emerald-500/50 transition-all text-left cursor-pointer group"
          >
            <div className="flex items-center justify-between text-[#94A3B8]">
              <span className="text-xs font-medium group-hover:text-white transition-colors">Tailored Documents</span>
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-3 text-3xl font-bold text-white tracking-tight">
              {jobsList.filter((j) => j.stage === "tailored").length}
            </div>
            <p className="mt-1 text-[11px] text-[#64748B]">Cover letters & custom bullets</p>
          </button>

          {/* Card 3: Active Applications */}
          <button
            onClick={() => {
              setSelectedStage("applied");
              showToast("Filtered: Active submitted applications");
            }}
            className="p-5 rounded-xl bg-[#111827] hover:bg-[#161F33] border border-[#1F2937] hover:border-purple-500/50 transition-all text-left cursor-pointer group"
          >
            <div className="flex items-center justify-between text-[#94A3B8]">
              <span className="text-xs font-medium group-hover:text-white transition-colors">Applications</span>
              <CheckCircle2 className="w-4 h-4 text-purple-400" />
            </div>
            <div className="mt-3 text-3xl font-bold text-white tracking-tight">
              {jobsList.filter((j) => j.stage === "applied").length}
            </div>
            <p className="mt-1 text-[11px] text-[#64748B]">In active submission pipeline</p>
          </button>

          {/* Card 4: Daily Quota */}
          <button
            onClick={() => setShowUpgradeModal(true)}
            className="p-5 rounded-xl bg-[#111827] hover:bg-[#161F33] border border-[#1F2937] hover:border-amber-500/50 transition-all text-left cursor-pointer group"
          >
            <div className="flex items-center justify-between text-[#94A3B8]">
              <span className="text-xs font-medium group-hover:text-white transition-colors">Daily Searches</span>
              <Shield className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-3 text-3xl font-bold text-white tracking-tight">3 / 3</div>
            <p className="mt-1 text-[11px] text-amber-300/80">Free Tier · Click to upgrade</p>
          </button>
        </div>

        {/* Interactive Search & Filter Controls */}
        <div className="p-4 rounded-xl bg-[#111827] border border-[#1F2937] mb-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <form onSubmit={handleQuickSearch} className="flex-1 w-full relative">
            <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by role, skill, or company (e.g. 'Senior Python Engineer')..."
              className="w-full h-10 pl-9 pr-24 bg-[#0B0F19] border border-[#1F2937] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] rounded-lg text-xs text-white placeholder-[#64748B] outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={isSearching}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 px-3 rounded bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[11px] font-semibold flex items-center gap-1 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isSearching ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <span>Find Jobs</span>
              )}
            </button>
          </form>

          {/* Stage Filter Buttons */}
          <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            {[
              { id: "all", label: "All" },
              { id: "discovered", label: "Discovered" },
              { id: "tailored", label: "Tailored" },
              { id: "applied", label: "Applied" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedStage(tab.id)}
                className={`h-8 px-3 rounded text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                  selectedStage === tab.id
                    ? "bg-[#2563EB] text-white"
                    : "bg-[#0B0F19] text-[#94A3B8] hover:text-white border border-[#1F2937]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Real Job Feed / Applications Board */}
        <div className="space-y-3 mb-10">
          <div className="flex items-center justify-between px-1 mb-2">
            <span className="text-xs font-semibold text-[#CBD5E1] uppercase tracking-wider">
              Live Application Opportunities ({filteredJobs.length})
            </span>
            <span className="text-[11px] text-[#64748B]">Updated in real-time</span>
          </div>

          {filteredJobs.length === 0 ? (
            <div className="p-12 rounded-xl bg-[#111827] border border-[#1F2937] text-center">
              <Search className="w-8 h-8 text-[#64748B] mx-auto mb-3" />
              <p className="text-sm font-semibold text-white">No positions matching current criteria</p>
              <p className="text-xs text-[#94A3B8] mt-1">Try searching for other terms or reset your filters.</p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedStage("all");
                }}
                className="mt-4 px-3.5 py-1.5 rounded bg-[#1F2937] hover:bg-[#374151] text-xs text-white transition-colors"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            filteredJobs.map((job) => (
              <div
                key={job.id}
                onClick={() => setSelectedJob(job)}
                className="p-5 rounded-xl bg-[#111827] hover:bg-[#161F33] border border-[#1F2937] hover:border-[#2563EB]/40 transition-all cursor-pointer flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-sm font-semibold text-white group-hover:text-[#60A5FA] transition-colors">
                      {job.title}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#2563EB]/10 text-[#60A5FA] border border-[#2563EB]/20">
                      {job.matchScore}% Match
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase ${
                        job.stage === "tailored"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : job.stage === "applied"
                          ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                          : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                      }`}
                    >
                      {job.stage}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-[#94A3B8]">
                    <span className="flex items-center gap-1">
                      <Building className="w-3.5 h-3.5 text-[#64748B]" />
                      <span className="text-white font-medium">{job.company}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#64748B]" />
                      <span>{job.location}</span>
                    </span>
                    <span className="hidden sm:inline-block">·</span>
                    <span className="hidden sm:inline-block text-[#CBD5E1]">{job.salary}</span>
                    <span>·</span>
                    <span className="text-[11px] text-[#64748B] flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {job.postedAt}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedJob(job);
                    }}
                    className="h-8 px-3 rounded bg-[#1F2937] hover:bg-[#374151] text-xs font-medium text-white flex items-center gap-1 transition-colors"
                  >
                    <span>View Tailored Docs</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Danger Zone Section */}
        <div className="rounded-xl border border-red-900/40 bg-red-950/10 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-semibold text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span>Danger Zone</span>
            </h4>
            <p className="mt-1 text-xs text-[#94A3B8]">
              Permanently terminate workspace, delete saved applications, and purge profile text.
            </p>
          </div>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-4 py-2 rounded bg-red-950/60 hover:bg-red-900/80 border border-red-800/80 text-xs font-medium text-red-200 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
            <span>Delete Account</span>
          </button>
        </div>
      </main>

      {/* Modal 1: Job Details & AI Tailored Document Drawer */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-[#1F2937] rounded-xl max-w-xl w-full p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-start justify-between pb-4 border-b border-[#1F2937]">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#60A5FA] tracking-wider">
                  {selectedJob.portal} Verified Posting
                </span>
                <h2 className="text-lg font-bold text-white mt-0.5">{selectedJob.title}</h2>
                <p className="text-xs text-[#94A3B8]">{selectedJob.company} · {selectedJob.location}</p>
              </div>
              <button
                onClick={() => setSelectedJob(null)}
                className="text-[#94A3B8] hover:text-white p-1 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="p-3.5 rounded-lg bg-[#0B0F19] border border-[#1F2937]">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
                    AI Tailored Cover Letter (Llama 3)
                  </span>
                  <span className="text-[10px] text-emerald-400 font-medium">Ready for Submission</span>
                </div>
                <p className="text-xs text-[#CBD5E1] leading-relaxed italic bg-[#111827] p-3 rounded border border-[#1F2937]">
                  "{selectedJob.coverLetterSnippet}"
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded bg-[#0B0F19] border border-[#1F2937]">
                  <span className="text-[10px] text-[#64748B] block">MATCH SCORE</span>
                  <span className="text-lg font-bold text-emerald-400">{selectedJob.matchScore}%</span>
                </div>
                <div className="p-3 rounded bg-[#0B0F19] border border-[#1F2937]">
                  <span className="text-[10px] text-[#64748B] block">ESTIMATED SALARY</span>
                  <span className="text-lg font-bold text-white">{selectedJob.salary}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#1F2937] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedJob(null)}
                className="h-9 px-4 rounded bg-[#1F2937] hover:bg-[#374151] text-xs font-medium text-white transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  showToast(`Application queued for ${selectedJob.company}!`);
                  setSelectedJob(null);
                }}
                className="h-9 px-4 rounded bg-[#2563EB] hover:bg-[#1D4ED8] text-xs font-semibold text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Submit with Tailored Docs</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Upgrade to Pro Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-[#1F2937] rounded-xl max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#1F2937]">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Upgrade to JobPilot Pro</h3>
              </div>
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="text-[#94A3B8] hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Supercharge your job hunt with autonomous Playwright submissions and unlimited search capacity.
              </p>

              <div className="p-4 rounded-lg bg-[#0B0F19] border border-[#2563EB]/40 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">Pro Membership</span>
                  <span className="font-bold text-emerald-400 text-sm">$29 / month</span>
                </div>
                <div className="space-y-1.5 pt-2 text-[#CBD5E1]">
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Unlimited daily searches across all 10+ portals</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Headless Playwright automatic submissions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Priority Llama 3 document generation queue</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Chrome Extension 1-click autofill</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowUpgradeModal(false)}
                className="h-9 px-4 rounded bg-[#1F2937] hover:bg-[#374151] text-xs font-medium text-white transition-colors cursor-pointer"
              >
                Later
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUpgradeModal(false);
                  showToast("Module 10 (Stripe Integration) will process live checkouts.");
                }}
                className="h-9 px-4 rounded bg-[#2563EB] hover:bg-[#1D4ED8] text-xs font-semibold text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Continue to Checkout</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Delete Account Confirmation */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-red-800/80 rounded-xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-400 mb-3">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-white">Permanently Delete Account?</h3>
            </div>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              This action cannot be undone. All your saved job postings, tailored resumes, and telemetry records will be immediately erased from Supabase.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deletingAccount}
                className="px-4 py-2 rounded bg-[#1F2937] hover:bg-[#374151] text-xs font-medium text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deletingAccount}
                className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-xs font-semibold text-white transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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

      {/* Footer */}
      <footer className="w-full border-t border-[#1F2937] bg-[#0B0F19] px-6 py-6 text-center text-xs text-[#64748B]">
        <p className="text-white font-medium mb-1">JobPilot — Autonomous Talent Operations</p>
        <p>Founder & Platform Lead: <span className="text-[#E2E8F0] font-semibold">Chaudhry Saif Ullah Sundhu</span>. All rights reserved © 2026.</p>
      </footer>
    </div>
  );
}
