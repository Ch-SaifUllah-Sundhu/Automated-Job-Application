"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Upload,
  FileText,
  CheckCircle,
  Briefcase,
  MapPin,
  Phone,
  User,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Rocket,
} from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading: authLoading, getAccessToken } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Profile form state
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [targetTitle, setTargetTitle] = useState("");
  const [location, setLocation] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("Mid-Level");

  // Step 2: Resume state
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [resumePreview, setResumePreview] = useState<string | null>(null);
  const [manualResumeText, setManualResumeText] = useState("");
  const [useManualText, setUseManualText] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-fill user name if available in auth metadata
  useEffect(() => {
    if (user?.user_metadata?.full_name) {
      setFullName(user.user_metadata.full_name);
    }
  }, [user]);

  // Handle Step 1 Save
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const token = await getAccessToken();
      if (token) {
        await api.updateProfile(token, {
          full_name: fullName,
          phone,
          target_title: targetTitle,
          location,
          experience_level: experienceLevel,
        });
      }
      setStep(2);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to save profile details.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Handle file drop / change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.endsWith(".pdf") && !file.name.endsWith(".docx")) {
        setError("Please upload a PDF or DOCX file.");
        return;
      }
      setResumeFile(file);
      setError(null);
    }
  };

  // Handle Step 2 Upload
  const handleResumeSubmit = async () => {
    setError(null);
    setSubmitting(true);

    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Authentication token not found.");

      if (useManualText && manualResumeText.trim()) {
        await api.updateProfile(token, {
          resume_text: manualResumeText,
        });
        setUploadSuccess(true);
        setStep(3);
      } else if (resumeFile) {
        const result = await api.uploadResume(token, resumeFile);
        setResumePreview(result.preview);
        setUploadSuccess(true);
        setStep(3);
      } else {
        setError("Please select a resume file or enter resume text.");
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to parse and upload resume.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0B1326] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#0B1326] text-[#DAE2FD] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden font-sans">
      {/* Background glow effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-600/15 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-600/15 rounded-full blur-[160px] pointer-events-none" />

      {/* Header */}
      <div className="mb-8 flex flex-col items-center text-center z-10">
        <div className="flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 shadow-lg backdrop-blur-md mb-4">
          <div className="p-1 rounded-md bg-gradient-to-tr from-indigo-500 to-purple-500">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-xs font-semibold tracking-wide uppercase text-indigo-300">
            Fast-Track Setup Wizard
          </span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
          Configure Your Career Copilot
        </h1>
        <p className="mt-2 text-sm text-slate-400 max-w-md">
          Step {step} of 3 — Let AI analyze your qualifications to automate tailored applications.
        </p>

        {/* Stepper Progress */}
        <div className="flex items-center gap-3 mt-6">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
              step === 1
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : step > 1
                ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/40"
                : "bg-slate-800 text-slate-500"
            }`}
          >
            <span>1</span>
            <span>Profile</span>
          </div>

          <div className="w-6 h-0.5 bg-slate-800" />

          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
              step === 2
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : step > 2
                ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/40"
                : "bg-slate-800 text-slate-500"
            }`}
          >
            <span>2</span>
            <span>Resume</span>
          </div>

          <div className="w-6 h-0.5 bg-slate-800" />

          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
              step === 3
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "bg-slate-800 text-slate-500"
            }`}
          >
            <span>3</span>
            <span>Launch</span>
          </div>
        </div>
      </div>

      {/* Wizard Content Card */}
      <div className="w-full max-w-xl bg-slate-900/80 backdrop-blur-xl border border-slate-800/90 rounded-2xl p-8 shadow-2xl relative z-10">
        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-red-300 text-xs">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Personal & Target Role */}
        {step === 1 && (
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-400" /> Professional Details
            </h2>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Saif Ullah"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Phone Number (for auto-filling job forms)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Target Job Title
                </label>
                <div className="relative">
                  <Briefcase className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={targetTitle}
                    onChange={(e) => setTargetTitle(e.target.value)}
                    placeholder="Full Stack Engineer"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Preferred Location / Remote
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Remote, US or Global"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Experience Level
              </label>
              <select
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="Entry-Level">Entry-Level (0-2 years)</option>
                <option value="Mid-Level">Mid-Level (2-5 years)</option>
                <option value="Senior">Senior (5-8 years)</option>
                <option value="Lead/Staff">Lead / Staff (8+ years)</option>
                <option value="Executive">Executive / Director</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-4 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium text-sm shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span>Next: Upload Resume</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 2: Resume Upload & Parsing */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-400" /> Resume & Qualifications
            </h2>

            <p className="text-xs text-slate-400">
              Upload your existing resume (PDF or DOCX). Our parser extracts your skills and projects so Groq & Llama 3 can draft high-impact cover letters.
            </p>

            {!useManualText ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${
                  resumeFile
                    ? "border-emerald-500/60 bg-emerald-500/5"
                    : "border-slate-700/80 hover:border-indigo-500/60 bg-slate-950/40"
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.docx"
                  className="hidden"
                />

                {resumeFile ? (
                  <div className="flex flex-col items-center text-center">
                    <CheckCircle className="w-10 h-10 text-emerald-400 mb-2" />
                    <p className="text-sm font-medium text-emerald-300">
                      {resumeFile.name}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {(resumeFile.size / 1024).toFixed(1)} KB — Ready to parse
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-center">
                    <div className="p-3 rounded-full bg-slate-800 text-indigo-400 mb-3">
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-medium text-slate-200">
                      Click to browse or drag and drop
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Supports PDF or DOCX (up to 10MB)
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Paste Resume Content
                </label>
                <textarea
                  rows={8}
                  value={manualResumeText}
                  onChange={(e) => setManualResumeText(e.target.value)}
                  placeholder="Paste your resume summary, work history, skills, and projects here..."
                  className="w-full p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-slate-400">
              <button
                type="button"
                onClick={() => setUseManualText(!useManualText)}
                className="text-indigo-400 hover:underline cursor-pointer"
              >
                {useManualText ? "← Upload file instead" : "Or paste resume text manually"}
              </button>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="py-3 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 font-medium text-sm flex items-center gap-2 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={handleResumeSubmit}
                disabled={submitting || (!resumeFile && !manualResumeText.trim())}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium text-sm shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Parsing & Ingesting...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm & Finish Setup</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Complete & Launch */}
        {step === 3 && (
          <div className="text-center py-4 space-y-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-500 to-indigo-500 mx-auto flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Rocket className="w-8 h-8 text-white" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white">
                You&apos;re All Set, {fullName || "Pilot"}!
              </h2>
              <p className="mt-2 text-sm text-slate-400 max-w-sm mx-auto">
                Your profile is active and your qualifications are indexed. You are ready to search, match, and tailor applications.
              </p>
            </div>

            {resumePreview && (
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-left">
                <span className="text-[11px] font-semibold uppercase text-indigo-400 tracking-wider">
                  Indexed Snippet Preview
                </span>
                <p className="mt-1 text-xs text-slate-300 line-clamp-3">
                  {resumePreview}
                </p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3 text-left py-2">
              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 mb-1" />
                <p className="text-xs font-semibold text-slate-200">Autonomous Search</p>
                <p className="text-[11px] text-slate-500">10+ sites ready</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800">
                <CheckCircle2 className="w-4 h-4 text-indigo-400 mb-1" />
                <p className="text-xs font-semibold text-slate-200">AI Tailoring</p>
                <p className="text-[11px] text-slate-500">Llama 3 tuned</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800">
                <CheckCircle2 className="w-4 h-4 text-purple-400 mb-1" />
                <p className="text-xs font-semibold text-slate-200">Kanban Board</p>
                <p className="text-[11px] text-slate-500">Real-time status</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Launch Dashboard Cockpit</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
