"use client";

import { useAuth } from "@/hooks/useAuth";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import {
  api,
  ApplicationDetailItem,
  AutomationLogItem,
} from "@/lib/api";
import { MatchRing } from "@/components/jobs/JobCard";
import {
  ArrowLeft,
  Building,
  ExternalLink,
  Sparkles,
  FileText,
  Send,
  Save,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Loader2,
  RefreshCw,
  Copy,
  Check,
  XCircle,
  Eye,
  ShieldCheck,
  Terminal,
  ChevronDown,
  ChevronUp,
  MapPin,
  HelpCircle,
} from "lucide-react";

function ReviewApplicationContent() {
  const params = useParams();
  const applicationId = params?.id as string;
  const router = useRouter();
  const { user, loading: authLoading, getAccessToken } = useAuth();

  // ── States ────────────────────────────────────────────────────────────────
  const [appData, setAppData] = useState<ApplicationDetailItem | null>(null);
  const [logs, setLogs] = useState<AutomationLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Editable documents
  const [coverLetter, setCoverLetter] = useState("");
  const [tailoredResume, setTailoredResume] = useState("");
  const [activeTab, setActiveTab] = useState<"cover_letter" | "resume">("cover_letter");

  // Missing data quick fix inputs
  const [missingInputs, setMissingInputs] = useState<Record<string, string>>({});
  const [savingMissing, setSavingMissing] = useState(false);

  // Action states
  const [isSaving, setIsSaving] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedDoc, setCopiedDoc] = useState<string | null>(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  // ── Load Application Details ──────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!applicationId) return;
    try {
      const token = await getAccessToken();
      if (!token) return;

      const data = await api.getApplication(token, applicationId);
      setAppData(data);
      setCoverLetter(data.cover_letter || "");
      setTailoredResume(data.tailored_resume || "");
      if (data.logs) {
        setLogs(data.logs);
      }

      // Initialize missing field inputs
      if (data.missing_fields && data.missing_fields.length > 0) {
        const initInputs: Record<string, string> = {};
        data.missing_fields.forEach((f) => {
          initInputs[f] = "";
        });
        setMissingInputs(initInputs);
      }
    } catch (err: unknown) {
      console.error("Failed to load application:", err);
      setError(err instanceof Error ? err.message : "Failed to load application details");
    } finally {
      setLoading(false);
    }
  }, [applicationId, getAccessToken]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (user && applicationId) {
      loadData();
    }
  }, [user, authLoading, applicationId, loadData, router]);

  // Periodic polling for automation logs if currently approving or pending
  useEffect(() => {
    if (!applicationId || !user) return;
    const interval = setInterval(async () => {
      try {
        const token = await getAccessToken();
        if (!token) return;
        const freshLogs = await api.getApplicationLogs(token, applicationId);
        if (freshLogs && freshLogs.length > 0) {
          setLogs(freshLogs);
        }
      } catch {
        // Silently catch background poll error
      }
    }, 6000);

    return () => clearInterval(interval);
  }, [applicationId, user, getAccessToken]);

  // ── Save Draft Action ─────────────────────────────────────────────────────
  const handleSaveDraft = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Authentication required");

      const updated = await api.updateReview(token, applicationId, {
        cover_letter: coverLetter,
        tailored_resume: tailoredResume,
      });
      setAppData(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Approve & Submit Action ───────────────────────────────────────────────
  const handleApprove = async () => {
    setIsApproving(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Authentication required");

      // First save any unsaved text edits
      await api.updateReview(token, applicationId, {
        cover_letter: coverLetter,
        tailored_resume: tailoredResume,
      });

      // Then trigger approve endpoint (which dispatches Celery background task)
      const approved = await api.approveApplication(token, applicationId);
      setAppData(approved);
      if (approved.logs) {
        setLogs(approved.logs);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Approval failed");
    } finally {
      setIsApproving(false);
    }
  };

  // ── Reject Action ─────────────────────────────────────────────────────────
  const handleReject = async () => {
    if (!confirm("Are you sure you want to reject and close this opportunity?")) return;
    setIsSaving(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Authentication required");

      const updated = await api.updateReview(token, applicationId, {
        review_status: "rejected",
      });
      setAppData(updated);
      await api.updateApplicationStatus(token, applicationId, "Rejected");
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to reject application");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Quick-Fix Missing Fields ──────────────────────────────────────────────
  const handleSaveMissingFields = async () => {
    setSavingMissing(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Authentication required");

      // Update profile with missing values
      await api.updateProfile(token, missingInputs);
      // Reload application
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update profile information");
    } finally {
      setSavingMissing(false);
    }
  };

  // ── Copy to Clipboard ─────────────────────────────────────────────────────
  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDoc(type);
    setTimeout(() => setCopiedDoc(null), 2500);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" />
        <p className="text-sm text-[#94A3B8]">Loading application intelligence...</p>
      </div>
    );
  }

  if (error && !appData) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white p-6 max-w-4xl mx-auto flex flex-col items-center justify-center gap-4 text-center">
        <AlertTriangle className="w-12 h-12 text-rose-500" />
        <h2 className="text-xl font-bold">Application Not Found</h2>
        <p className="text-sm text-[#94A3B8] max-w-md">{error}</p>
        <Link
          href="/dashboard"
          className="mt-2 px-4 py-2 rounded-lg bg-[#2563EB] text-white text-sm font-semibold hover:bg-blue-500 transition-colors"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const isApproved = appData?.review_status === "approved";
  const isRejected = appData?.review_status === "rejected";

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white pb-16">
      {/* ── Top Navigation Bar ──────────────────────────────────────────────── */}
      <header className="border-b border-[#1F2937] bg-[#111827]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="p-2 rounded-lg hover:bg-[#1F2937] text-[#94A3B8] hover:text-white transition-colors"
              title="Return to Kanban Board"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#64748B] font-mono">Module 8</span>
                <span className="text-xs text-[#64748B]">/</span>
                <span className="text-xs text-[#94A3B8] font-medium">Human-in-Loop Review</span>
              </div>
              <h1 className="text-sm sm:text-base font-bold text-white leading-tight truncate max-w-md">
                {appData?.job_title || "Application Review"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Status Pills */}
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#1F2937] text-[#94A3B8] border border-[#374151]">
                Status: <strong className="text-white">{appData?.status}</strong>
              </span>

              {isApproved && (
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Approved
                </span>
              )}
              {isRejected && (
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5" />
                  Rejected
                </span>
              )}
              {!isApproved && !isRejected && (
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1.5 animate-pulse">
                  <Clock className="w-3.5 h-3.5" />
                  Review Pending
                </span>
              )}
            </div>

            {/* Quick Action Button in Header */}
            {!isApproved && (
              <button
                disabled={isApproving}
                onClick={handleApprove}
                className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-50"
              >
                {isApproving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>Approve & Submit</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Main Content Container ─────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Error notification bar */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-xs hover:underline text-rose-400"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Success toast bar */}
        {saveSuccess && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>Changes successfully saved to database!</span>
          </div>
        )}

        {/* ── Side-by-Side Review Grid ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ══════════════════════════════════════════════════════════════════
              LEFT COLUMN: Opportunity & Match Intelligence (5 cols)
             ══════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-5 space-y-5">
            {/* Job Header Card */}
            <div className="p-5 rounded-2xl bg-[#111827] border border-[#1F2937] shadow-xl space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-white leading-snug">
                    {appData?.job_title}
                  </h2>
                  <p className="text-sm text-[#94A3B8] flex items-center gap-1.5 mt-1">
                    <Building className="w-4 h-4 text-[#64748B]" />
                    <span>{appData?.company || "Company Confidential"}</span>
                  </p>
                  {appData?.job_location && (
                    <p className="text-xs text-[#64748B] flex items-center gap-1.5 mt-1">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{appData?.job_location}</span>
                    </p>
                  )}
                </div>

                {appData?.match_score !== null && appData?.match_score !== undefined && (
                  <div className="shrink-0 flex flex-col items-center gap-1">
                    <MatchRing score={appData.match_score} size={54} strokeWidth={5} />
                    <span className="text-[10px] text-[#94A3B8] font-medium">Match</span>
                  </div>
                )}
              </div>

              {/* External Posting Link */}
              {appData?.url && (
                <div className="pt-2 border-t border-[#1F2937]">
                  <a
                    href={appData.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-[#60A5FA] hover:text-white transition-colors"
                  >
                    <span>View original job posting</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>

            {/* Semantic Skill Gap Intelligence */}
            {appData?.missing_skills && appData.missing_skills.length > 0 && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                <div className="flex items-center gap-2 text-amber-300">
                  <AlertTriangle className="w-4 h-4" />
                  <h3 className="text-xs font-bold uppercase tracking-wider">
                    SBERT Skill Gap Detection
                  </h3>
                </div>
                <p className="text-xs text-amber-200/80 leading-relaxed">
                  Sentence-BERT semantic matching identified the following skills in the job
                  description that are missing or under-emphasized in your profile:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {appData.missing_skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-md text-xs font-medium bg-amber-500/20 text-amber-200 border border-amber-500/30"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Missing Profile Fields Alert (Module 8 Human-in-Loop) */}
            {appData?.missing_fields && appData.missing_fields.length > 0 && (
              <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 space-y-3">
                <div className="flex items-center gap-2 text-blue-300">
                  <ShieldCheck className="w-4 h-4" />
                  <h3 className="text-xs font-bold uppercase tracking-wider">
                    Required Fields For Auto-Submission
                  </h3>
                </div>
                <p className="text-xs text-[#94A3B8]">
                  The automation engine requires these profile fields before submitting this form:
                </p>

                <div className="space-y-2">
                  {appData.missing_fields.map((field) => (
                    <div key={field} className="space-y-1">
                      <label className="text-[11px] font-semibold text-[#CBD5E1] capitalize">
                        {field.replace(/_/g, " ")}
                      </label>
                      <input
                        type="text"
                        value={missingInputs[field] || ""}
                        onChange={(e) =>
                          setMissingInputs({ ...missingInputs, [field]: e.target.value })
                        }
                        placeholder={`Enter your ${field.replace(/_/g, " ")}`}
                        className="w-full px-3 py-1.5 rounded-lg bg-[#0B0F19] border border-[#374151] text-xs text-white placeholder-[#64748B] focus:outline-none focus:border-[#2563EB]"
                      />
                    </div>
                  ))}

                  <button
                    disabled={savingMissing}
                    onClick={handleSaveMissingFields}
                    className="mt-2 w-full py-1.5 rounded-lg bg-[#2563EB] hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {savingMissing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    <span>Save & Update Profile</span>
                  </button>
                </div>
              </div>
            )}

            {/* Job Description Reader */}
            {appData?.job_description && (
              <div className="p-5 rounded-2xl bg-[#111827] border border-[#1F2937] space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
                    Job Description
                  </h3>
                  <button
                    onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                    className="text-xs text-[#60A5FA] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>{isDescriptionExpanded ? "Collapse" : "Expand"}</span>
                    {isDescriptionExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <div
                  className={`text-xs text-[#CBD5E1] leading-relaxed whitespace-pre-line transition-all ${
                    isDescriptionExpanded ? "max-h-none" : "max-h-48 overflow-hidden relative"
                  }`}
                >
                  {appData.job_description}
                  {!isDescriptionExpanded && (
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#111827] to-transparent pointer-events-none" />
                  )}
                </div>
              </div>
            )}

            {/* Required Skills Chips */}
            {appData?.required_skills && (
              <div className="p-4 rounded-2xl bg-[#111827] border border-[#1F2937] space-y-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">
                  Targeted Keywords
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {appData.required_skills.split(",").map((req, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded text-[11px] bg-[#1F2937] text-[#CBD5E1] border border-[#374151]"
                    >
                      {req.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              RIGHT COLUMN: Tailored Documents Editor & Approval (7 cols)
             ══════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-7 space-y-5">
            {/* Editor Container Card */}
            <div className="rounded-2xl bg-[#111827] border border-[#1F2937] shadow-xl overflow-hidden flex flex-col">
              {/* Document Tabs */}
              <div className="flex items-center justify-between border-b border-[#1F2937] bg-[#0B0F19]/50 px-4 pt-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab("cover_letter")}
                    className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer border-t-2 ${
                      activeTab === "cover_letter"
                        ? "bg-[#111827] text-white border-[#2563EB]"
                        : "text-[#94A3B8] border-transparent hover:text-white"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      Cover Letter
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveTab("resume")}
                    className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer border-t-2 ${
                      activeTab === "resume"
                        ? "bg-[#111827] text-white border-[#2563EB]"
                        : "text-[#94A3B8] border-transparent hover:text-white"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Tailored Resume Bullets
                    </span>
                  </button>
                </div>

                <div className="flex items-center gap-2 pb-2">
                  <button
                    onClick={() =>
                      handleCopy(
                        activeTab === "cover_letter" ? coverLetter : tailoredResume,
                        activeTab
                      )
                    }
                    className="p-1.5 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#1F2937] transition-colors cursor-pointer text-xs flex items-center gap-1"
                    title="Copy document to clipboard"
                  >
                    {copiedDoc === activeTab ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Editor Workspace */}
              <div className="p-5 space-y-4">
                {activeTab === "cover_letter" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-[#94A3B8]">
                      <span>Generated by Llama-3 / Groq — fully editable</span>
                      <span className="font-mono">
                        {coverLetter.trim().split(/\s+/).filter(Boolean).length} words ·{" "}
                        {coverLetter.length} chars
                      </span>
                    </div>

                    <textarea
                      value={coverLetter}
                      onChange={(e) => setCoverLetter(e.target.value)}
                      rows={14}
                      placeholder="Write or review your customized cover letter here..."
                      className="w-full p-4 rounded-xl bg-[#0B0F19] border border-[#1F2937] text-sm text-[#E2E8F0] leading-relaxed focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] resize-y font-sans transition-all"
                    />
                  </div>
                )}

                {activeTab === "resume" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-[#94A3B8]">
                      <span>AI tailored bullet points matching job keywords</span>
                      <span className="font-mono">
                        {tailoredResume.trim().split("\n").filter(Boolean).length} bullets
                      </span>
                    </div>

                    <textarea
                      value={tailoredResume}
                      onChange={(e) => setTailoredResume(e.target.value)}
                      rows={14}
                      placeholder="• Engineered scalable microservices..."
                      className="w-full p-4 rounded-xl bg-[#0B0F19] border border-[#1F2937] text-sm text-[#E2E8F0] leading-relaxed focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] resize-y font-mono transition-all"
                    />
                  </div>
                )}

                {/* Human-in-Loop Bottom Action Bar */}
                <div className="pt-4 border-t border-[#1F2937] flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      disabled={isSaving || isApproving}
                      onClick={handleSaveDraft}
                      className="px-4 py-2 rounded-xl bg-[#1F2937] hover:bg-[#374151] text-xs font-semibold text-white transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isSaving ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      <span>Save Changes</span>
                    </button>

                    {!isRejected && (
                      <button
                        disabled={isSaving || isApproving}
                        onClick={handleReject}
                        className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      disabled={isApproving}
                      onClick={handleApprove}
                      className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-50 ${
                        isApproved
                          ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20"
                          : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/30"
                      }`}
                    >
                      {isApproving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      <span>
                        {isApproved ? "Re-submit to Automation Queue" : "Approve & Submit Automatically"}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════════
                AUTOMATION AUDIT TRAIL & LOGS TIMELINE
               ══════════════════════════════════════════════════════════════════ */}
            <div className="p-5 rounded-2xl bg-[#111827] border border-[#1F2937] shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-[#2563EB]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                    Automation Audit Trail
                  </h3>
                </div>
                <span className="text-[11px] text-[#64748B] flex items-center gap-1 font-mono">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Live Sync
                </span>
              </div>

              {logs.length === 0 ? (
                <div className="p-4 rounded-xl bg-[#0B0F19] border border-[#1F2937] text-center text-xs text-[#64748B]">
                  No automation events logged yet. Click &quot;Approve & Submit&quot; to begin headless submission.
                </div>
              ) : (
                <div className="space-y-3 relative pl-4 border-l-2 border-[#1F2937]">
                  {logs.map((log, index) => (
                    <div key={log.id || index} className="space-y-1 relative group">
                      {/* Timeline dot */}
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[#2563EB] group-last:bg-emerald-500 ring-4 ring-[#111827]" />

                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white capitalize">
                          {log.event.replace(/_/g, " ")}
                        </span>
                        {log.created_at && (
                          <span className="text-[10px] text-[#64748B] font-mono">
                            {new Date(log.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-[#94A3B8] leading-relaxed">
                        {log.detail || "Event logged"}
                      </p>

                      {log.screenshot_url && (
                        <a
                          href={log.screenshot_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-[#60A5FA] hover:underline pt-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View audit screenshot</span>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ReviewApplicationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" />
          <p className="text-sm text-[#94A3B8]">Loading application intelligence...</p>
        </div>
      }
    >
      <ReviewApplicationContent />
    </Suspense>
  );
}
