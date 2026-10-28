"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { api, ProfileData } from "@/lib/api";
import {
  FolderKanban,
  FileText,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  LogOut,
  Compass,
  Upload,
  User,
  Phone,
  Briefcase,
  Sparkles,
  Save,
  Check,
  Shield,
  Layers,
  ArrowRight,
} from "lucide-react";

export default function ProfilePage() {
  const { user, signOut, loading: authLoading, getAccessToken } = useAuth();
  const router = useRouter();

  // ── States ────────────────────────────────────────────────────────────────
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [loggingOut, setLoggingOut] = useState(false);

  // Form fields
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const showToast = useCallback((msg: string, type: "success" | "error" = "success") => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 3800);
  }, []);

  // ── Fetch Profile ─────────────────────────────────────────────────────────
  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) return;
      const data = await api.getProfile(token);
      setProfile(data);
      setFullName(data.full_name || "");
      setPhone(data.phone || "");
      setLinkedinUrl(data.linkedin_url || "");
      setGithubUrl(data.github_url || "");
      setResumeText(data.base_resume_text || "");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load candidate profile";
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  }, [getAccessToken, showToast]);

  useEffect(() => {
    if (!authLoading) {
      fetchProfile();
    }
  }, [authLoading, fetchProfile]);

  // ── Save Profile Details ──────────────────────────────────────────────────
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Authentication required");

      const updated = await api.updateProfile(token, {
        full_name: fullName.trim(),
        phone: phone.trim(),
        linkedin_url: linkedinUrl.trim(),
        github_url: githubUrl.trim(),
        base_resume_text: resumeText.trim(),
      });

      setProfile(updated);
      showToast("Profile & resume text updated and re-indexed with Sentence-BERT!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Save failed";
      showToast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  // ── Upload & Parse Resume File ────────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];

    if (!file.name.endsWith(".pdf") && !file.name.endsWith(".docx") && !file.name.endsWith(".txt")) {
      showToast("Only PDF, DOCX, or TXT formats are supported.", "error");
      return;
    }

    setSelectedFile(file);
    setUploadingResume(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Authentication required");

      const res = await api.uploadResume(token, file);
      setResumeText(res.base_resume_text);
      showToast(`Extracted ${res.characters_extracted} characters from ${res.filename}!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Resume upload failed";
      showToast(msg, "error");
    } finally {
      setUploadingResume(false);
      setSelectedFile(null);
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

  // Extracted skills preview
  const extractedSkills = (resumeText.match(
    /\b(Python|JavaScript|TypeScript|React|Next\.js|Node\.js|FastAPI|Django|Flask|Docker|Kubernetes|AWS|GCP|PostgreSQL|MySQL|MongoDB|Redis|GraphQL|REST|Git|CI\/CD|Linux|Java|Go|SQL|PyTorch|TensorFlow|Celery|Supabase)\b/gi
  ) || []).filter((v, i, a) => a.findIndex((t) => t.toLowerCase() === v.toLowerCase()) === i);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-[#E2E8F0] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-[#2563EB]" />
          <span className="text-xs text-[#94A3B8]">Loading candidate profile…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#0B0F19] text-[#E2E8F0] flex font-sans selection:bg-[#2563EB]/30 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 p-3 rounded-lg border text-white text-xs shadow-2xl flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2 ${
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
        </div>
      )}

      {/* ── Left Sidebar ──────────────────────────────────────────────────── */}
      <aside className="w-60 border-r border-[#1F2937] bg-[#0B0F19] flex flex-col justify-between shrink-0 hidden md:flex">
        <div>
          {/* Brand Logo */}
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

          {/* Navigation Links */}
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
              className="w-full flex items-center gap-2.5 px-3 h-9 rounded text-xs font-medium text-[#94A3B8] hover:text-white hover:bg-[#111827] transition-colors"
            >
              <Compass className="w-4 h-4 text-[#94A3B8]" />
              <span>Jobs &amp; Match Scoring</span>
            </Link>

            <Link
              href="/dashboard/profile"
              className="w-full flex items-center gap-2.5 px-3 h-9 rounded text-xs font-semibold bg-[#161F33] text-white border-l-2 border-[#2563EB]"
            >
              <FileText className="w-4 h-4 text-[#2563EB]" />
              <span>Resume &amp; Profile</span>
            </Link>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-[#1F2937] bg-[#0B0F19]">
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2 truncate">
              <div className="w-7 h-7 rounded bg-[#2563EB] flex items-center justify-center font-bold text-white text-[11px]">
                {user?.email ? user.email.slice(0, 2).toUpperCase() : "JP"}
              </div>
              <div className="truncate">
                <p className="text-[11px] font-medium text-white truncate">
                  {fullName || user?.email?.split("@")[0] || "Candidate"}
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

      {/* ── Main Profile Workspace ────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header */}
        <header className="h-16 border-b border-[#1F2937] bg-[#0B0F19]/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#2563EB]/10 border border-[#2563EB]/30 flex items-center justify-center text-[#60A5FA]">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white">Candidate Profile &amp; Resume Intelligence</h1>
              <p className="text-[11px] text-[#94A3B8]">
                Sentence-BERT embeddings synced to Supabase PostgreSQL pgvector
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold shadow-md shadow-[#2563EB]/25 transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Changes…</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div className="p-6 max-w-5xl w-full mx-auto space-y-6">
          {/* Quick Stats Ribbon */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="p-4 rounded-xl bg-[#111827] border border-[#1F2937] flex items-center justify-between">
              <div>
                <span className="text-[11px] text-[#94A3B8] block">Parsed Skills Detected</span>
                <span className="text-xl font-bold text-white mt-0.5 block">{extractedSkills.length}</span>
                <span className="text-[10px] text-emerald-400 font-medium">Automatic Regex &amp; Alias</span>
              </div>
              <div className="w-9 h-9 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#111827] border border-[#1F2937] flex items-center justify-between">
              <div>
                <span className="text-[11px] text-[#94A3B8] block">Vector Embedding</span>
                <span className="text-xl font-bold text-white mt-0.5 block">384-Dim</span>
                <span className="text-[10px] text-blue-400 font-medium">all-MiniLM-L6-v2 SBERT</span>
              </div>
              <div className="w-9 h-9 rounded bg-[#2563EB]/15 border border-[#2563EB]/30 flex items-center justify-center text-[#2563EB]">
                <Layers className="w-4 h-4" />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#111827] border border-[#1F2937] flex items-center justify-between">
              <div>
                <span className="text-[11px] text-[#94A3B8] block">Resume Characters</span>
                <span className="text-xl font-bold text-white mt-0.5 block">{resumeText.length}</span>
                <span className="text-[10px] text-[#94A3B8] font-medium">Chunked by Paragraphs</span>
              </div>
              <div className="w-9 h-9 rounded bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Shield className="w-4 h-4" />
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-6">
            {/* 1. Contact & Social Profiles */}
            <div className="p-5 rounded-2xl bg-[#0E131F] border border-[#1F2937] space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-[#1F2937]">
                <User className="w-4 h-4 text-[#2563EB]" />
                <h2 className="text-xs font-semibold text-white uppercase tracking-wider">
                  Contact &amp; Identification Details
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-medium text-[#94A3B8] block mb-1">
                    Full Legal Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. CH Saifullah Sundhu"
                    className="w-full bg-[#111827] border border-[#1F2937] focus:border-[#2563EB] focus:outline-none rounded-lg px-3.5 py-2 text-xs text-white placeholder-[#64748B]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-[#94A3B8] block mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +92 306 9727242"
                    className="w-full bg-[#111827] border border-[#1F2937] focus:border-[#2563EB] focus:outline-none rounded-lg px-3.5 py-2 text-xs text-white placeholder-[#64748B]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-[#94A3B8] block mb-1 flex items-center gap-1.5">
                    <svg className="w-3 h-3 fill-current text-[#0A66C2]" viewBox="0 0 24 24">
                      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.2a1.66 1.66 0 1 0 0 3.32 1.66 1.66 0 0 0 0-3.32Z" />
                    </svg>
                    <span>LinkedIn Profile URL</span>
                  </label>
                  <input
                    type="url"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    placeholder="https://linkedin.com/in/username"
                    className="w-full bg-[#111827] border border-[#1F2937] focus:border-[#2563EB] focus:outline-none rounded-lg px-3.5 py-2 text-xs text-white placeholder-[#64748B]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-[#94A3B8] block mb-1 flex items-center gap-1.5">
                    <svg className="w-3 h-3 fill-current text-white" viewBox="0 0 24 24">
                      <path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.1-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2Z" />
                    </svg>
                    <span>GitHub Profile URL</span>
                  </label>
                  <input
                    type="url"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/username"
                    className="w-full bg-[#111827] border border-[#1F2937] focus:border-[#2563EB] focus:outline-none rounded-lg px-3.5 py-2 text-xs text-white placeholder-[#64748B]"
                  />
                </div>
              </div>
            </div>

            {/* 2. Resume Text & File Upload */}
            <div className="p-5 rounded-2xl bg-[#0E131F] border border-[#1F2937] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#1F2937]">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <h2 className="text-xs font-semibold text-white uppercase tracking-wider">
                    Master Resume Text &amp; File Ingestion
                  </h2>
                </div>

                {/* Upload Button */}
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111827] hover:bg-[#1F2937] border border-[#1F2937] text-xs font-medium text-white transition-colors cursor-pointer">
                  {uploadingResume ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#2563EB]" />
                  ) : (
                    <Upload className="w-3.5 h-3.5 text-[#2563EB]" />
                  )}
                  <span>{uploadingResume ? "Parsing File…" : "Upload New PDF/DOCX"}</span>
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt"
                    onChange={handleFileUpload}
                    disabled={uploadingResume}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Extracted Skills Chips */}
              {extractedSkills.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase font-bold text-[#64748B] tracking-wider mb-2">
                    Detected Core Competencies &amp; Technologies
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {extractedSkills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#2563EB]/15 text-[#93C5FD] border border-[#2563EB]/30 flex items-center gap-1"
                      >
                        <Check className="w-2.5 h-2.5 text-emerald-400" />
                        <span>{skill}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Resume Text Editor */}
              <div>
                <label className="text-[11px] font-medium text-[#94A3B8] block mb-1.5">
                  Base Plain-Text Resume (Used for SBERT Semantic Matching &amp; Cover Letter Tailoring)
                </label>
                <textarea
                  rows={14}
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  placeholder="Paste or edit your comprehensive resume text here (experience, skills, achievements, education)..."
                  className="w-full bg-[#111827] border border-[#1F2937] focus:border-[#2563EB] focus:outline-none rounded-xl p-4 text-xs text-[#CBD5E1] font-mono leading-relaxed resize-y"
                />
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-2">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 text-xs text-[#94A3B8] hover:text-white transition-colors"
              >
                <span>← Back to Kanban Pipeline</span>
              </Link>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold shadow-lg shadow-[#2563EB]/30 transition-all cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Profile &amp; Re-embedding…</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Profile &amp; Re-embed Skills</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
