"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import {
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
  AlertCircle,
  ExternalLink,
  Shield,
  Layers,
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
  const [resumePreview, setResumePreview] = useState<string | null>(null);
  const [manualResumeText, setManualResumeText] = useState("");
  const [useManualText, setUseManualText] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user?.user_metadata?.full_name) {
      setFullName(user.user_metadata.full_name);
    }
  }, [user]);

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
        setError("Failed to save profile specifications.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.endsWith(".pdf") && !file.name.endsWith(".docx")) {
        setError("Unsupported format. Please upload a standard PDF or DOCX file.");
        return;
      }
      setResumeFile(file);
      setError(null);
    }
  };

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
        setStep(3);
      } else if (resumeFile) {
        const result = await api.uploadResume(token, resumeFile);
        setResumePreview(result.preview);
        setStep(3);
      } else {
        setError("Please attach a resume document or enter text manually.");
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Resume parsing ingestion failed.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#2563EB]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#0B0F19] text-[#E2E8F0] flex flex-col font-sans">
      {/* Top Header */}
      <header className="w-full border-b border-[#1F2937] bg-[#0B0F19]/90 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded bg-[#2563EB] flex items-center justify-center font-bold text-white text-xs tracking-wider">
            JP
          </div>
          <span className="text-sm font-semibold tracking-tight text-white">
            JobPilot <span className="text-xs font-normal text-[#94A3B8]">Talent Operations</span>
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
          <span className="text-[11px] text-[#94A3B8]">Candidate Configuration Wizard</span>
          <span>·</span>
          <span className="text-[#CBD5E1] font-mono">Stage {step}/3</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-[560px]">
          {/* Stepper Indicator */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            <div
              className={`h-1.5 rounded-full transition-colors ${
                step >= 1 ? "bg-[#2563EB]" : "bg-[#1F2937]"
              }`}
            />
            <div
              className={`h-1.5 rounded-full transition-colors ${
                step >= 2 ? "bg-[#2563EB]" : "bg-[#1F2937]"
              }`}
            />
            <div
              className={`h-1.5 rounded-full transition-colors ${
                step === 3 ? "bg-[#2563EB]" : "bg-[#1F2937]"
              }`}
            />
          </div>

          {/* Wizard Card */}
          <div className="bg-[#111827] border border-[#1F2937] rounded-lg p-8 shadow-xl">
            {error && (
              <div className="mb-5 p-3 rounded bg-red-950/40 border border-red-800/80 flex items-start gap-2.5 text-red-300 text-xs">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {/* STEP 1: Details */}
            {step === 1 && (
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div>
                  <h1 className="text-lg font-semibold tracking-tight text-white">
                    Step 1: Candidate Baseline Specifications
                  </h1>
                  <p className="mt-1 text-xs text-[#94A3B8]">
                    Configure your professional parameters used by the LangGraph agent for job search filtering.
                  </p>
                </div>

                <div className="space-y-3.5 pt-2">
                  <div>
                    <label className="block text-xs font-medium text-[#CBD5E1] mb-1.5">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Saif Ullah"
                        className="w-full h-9 pl-9 pr-3 bg-[#0B0F19] border border-[#1F2937] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] rounded text-xs text-white placeholder-[#64748B] outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#CBD5E1] mb-1.5">
                      Contact Phone
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+1 (555) 012-3456"
                        className="w-full h-9 pl-9 pr-3 bg-[#0B0F19] border border-[#1F2937] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] rounded text-xs text-white placeholder-[#64748B] outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[#CBD5E1] mb-1.5">
                        Target Job Title
                      </label>
                      <div className="relative">
                        <Briefcase className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          value={targetTitle}
                          onChange={(e) => setTargetTitle(e.target.value)}
                          placeholder="Full Stack Engineer"
                          className="w-full h-9 pl-9 pr-3 bg-[#0B0F19] border border-[#1F2937] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] rounded text-xs text-white placeholder-[#64748B] outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#CBD5E1] mb-1.5">
                        Target Location
                      </label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          placeholder="Remote / US / Global"
                          className="w-full h-9 pl-9 pr-3 bg-[#0B0F19] border border-[#1F2937] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] rounded text-xs text-white placeholder-[#64748B] outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#CBD5E1] mb-1.5">
                      Seniority Level
                    </label>
                    <select
                      value={experienceLevel}
                      onChange={(e) => setExperienceLevel(e.target.value)}
                      className="w-full h-9 px-3 bg-[#0B0F19] border border-[#1F2937] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] rounded text-xs text-white outline-none cursor-pointer"
                    >
                      <option value="Entry-Level">Entry-Level (0-2 years)</option>
                      <option value="Mid-Level">Mid-Level (2-5 years)</option>
                      <option value="Senior">Senior (5-8 years)</option>
                      <option value="Lead/Staff">Lead / Staff (8+ years)</option>
                      <option value="Executive">Executive / Director</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-9 rounded bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] text-white text-xs font-semibold tracking-wide flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving parameters...</span>
                      </>
                    ) : (
                      <>
                        <span>Continue to Resume Ingestion</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: Resume Upload */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <h1 className="text-lg font-semibold tracking-tight text-white">
                    Step 2: Resume Ingestion & Parsing
                  </h1>
                  <p className="mt-1 text-xs text-[#94A3B8]">
                    Upload your baseline resume. The backend parser extracts your technical qualifications for Llama 3 tailoring.
                  </p>
                </div>

                {!useManualText ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`border border-dashed rounded p-6 flex flex-col items-center justify-center cursor-pointer transition-colors ${
                      resumeFile
                        ? "border-emerald-600 bg-emerald-950/20"
                        : "border-[#1F2937] hover:border-[#374151] bg-[#0B0F19]"
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
                      <div className="text-center">
                        <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                        <p className="text-xs font-semibold text-emerald-300">
                          {resumeFile.name}
                        </p>
                        <p className="text-[11px] text-[#94A3B8] mt-0.5">
                          {(resumeFile.size / 1024).toFixed(1)} KB · File ready for server-side extraction
                        </p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="w-8 h-8 rounded bg-[#111827] border border-[#1F2937] flex items-center justify-center mx-auto mb-2 text-[#94A3B8]">
                          <Upload className="w-4 h-4 text-[#2563EB]" />
                        </div>
                        <p className="text-xs font-medium text-[#CBD5E1]">
                          Click to select or drag and drop resume
                        </p>
                        <p className="text-[11px] text-[#64748B] mt-1">
                          Supported formats: PDF, DOCX (Max: 10MB)
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-[#CBD5E1] mb-1.5">
                      Plain Text Resume Payload
                    </label>
                    <textarea
                      rows={7}
                      value={manualResumeText}
                      onChange={(e) => setManualResumeText(e.target.value)}
                      placeholder="Paste your resume sections, technical skills, employment history, and education..."
                      className="w-full p-3 bg-[#0B0F19] border border-[#1F2937] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] rounded text-xs text-white placeholder-[#64748B] outline-none font-mono"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-[#94A3B8]">
                  <button
                    type="button"
                    onClick={() => setUseManualText(!useManualText)}
                    className="text-[#2563EB] hover:underline cursor-pointer"
                  >
                    {useManualText ? "← Switch to file upload" : "Or input plain text resume manually"}
                  </button>
                </div>

                <div className="flex items-center gap-2.5 pt-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="h-9 px-3.5 rounded bg-[#0B0F19] hover:bg-[#172033] border border-[#1F2937] text-xs font-medium text-[#CBD5E1] flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResumeSubmit}
                    disabled={submitting || (!resumeFile && !manualResumeText.trim())}
                    className="flex-1 h-9 rounded bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] text-white text-xs font-semibold tracking-wide flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Extracting & Ingesting...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit Document</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Setup Complete */}
            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <div className="w-10 h-10 rounded bg-emerald-950/60 border border-emerald-800/80 flex items-center justify-center mb-3 text-emerald-400">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <h1 className="text-lg font-semibold tracking-tight text-white">
                    Setup Complete: {fullName || "User"}
                  </h1>
                  <p className="mt-1 text-xs text-[#94A3B8]">
                    Your candidate profile and resume have been indexed into Supabase PostgreSQL. The autonomous agent pipeline is ready for execution.
                  </p>
                </div>

                {resumePreview && (
                  <div className="p-3.5 rounded bg-[#0B0F19] border border-[#1F2937]">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8] mb-1">
                      Parsed Text Extracted
                    </div>
                    <p className="text-xs text-[#CBD5E1] line-clamp-3 font-mono">
                      {resumePreview}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded bg-[#0B0F19] border border-[#1F2937]">
                    <div className="text-[11px] text-[#94A3B8]">Target Role</div>
                    <div className="font-medium text-white mt-0.5">{targetTitle || "Full Stack Engineer"}</div>
                  </div>
                  <div className="p-3 rounded bg-[#0B0F19] border border-[#1F2937]">
                    <div className="text-[11px] text-[#94A3B8]">Target Location</div>
                    <div className="font-medium text-white mt-0.5">{location || "Remote / US"}</div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => router.push("/dashboard")}
                    className="w-full h-9 rounded bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] text-white text-xs font-semibold tracking-wide flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>Launch Talent Dashboard</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex items-center justify-center gap-4 text-[11px] text-[#64748B]">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              <span>SOC 2 Type II Architecture</span>
            </span>
            <span>·</span>
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>Zero PII Leakage Policy</span>
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
