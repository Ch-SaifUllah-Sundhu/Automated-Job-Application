"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowRight,
  Mail,
  Lock,
  User,
  AlertCircle,
  Loader2,
  Shield,
  CheckCircle2,
  KeyRound,
  ExternalLink,
  Info,
} from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const { signUp, signInWithOAuth } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "linkedin" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [oauthNotice, setOauthNotice] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setOauthNotice(null);

    if (!termsAccepted) {
      setError("Please accept the terms of service and compliance agreement to register.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      const data = await signUp(email, password, fullName);
      if (data.session) {
        router.push("/onboarding");
      } else {
        router.push("/onboarding?registered=true");
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Account creation failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: "google" | "linkedin_oidc") => {
    setError(null);
    setOauthNotice(null);
    setOauthLoading(provider === "google" ? "google" : "linkedin");
    try {
      await signInWithOAuth(provider);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (
        msg.includes("provider is not enabled") ||
        msg.includes("validation_failed") ||
        msg.includes("Unsupported provider")
      ) {
        setOauthNotice(
          `${provider === "google" ? "Google" : "LinkedIn"} OAuth provider is currently disabled in your Supabase project settings. Please sign up using your email and password below or enable the provider in your Supabase dashboard (Authentication > Providers).`
        );
      } else {
        setError(msg || "OAuth registration failed.");
      }
      setOauthLoading(null);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0B0F19] text-[#E2E8F0] flex flex-col font-sans selection:bg-[#2563EB]/30 selection:text-white">
      {/* Top Enterprise Header */}
      <header className="w-full border-b border-[#1F2937] bg-[#0B0F19]/90 px-6 py-3.5 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded bg-[#2563EB] flex items-center justify-center font-bold text-white text-xs tracking-wider">
            JP
          </div>
          <span className="text-sm font-semibold tracking-tight text-white">
            JobPilot <span className="text-xs font-normal text-[#94A3B8]">Talent Operations</span>
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs text-[#94A3B8]">
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded bg-[#111827] border border-[#1F2937]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] text-[#CBD5E1]">Operational · API v0.5</span>
          </div>
          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noreferrer"
            className="hover:text-white flex items-center gap-1 transition-colors"
          >
            <span>API Docs</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-12 relative">
        <div className="w-full max-w-[460px]">
          {/* Card */}
          <div className="bg-[#111827] border border-[#1F2937] rounded-lg p-8 shadow-xl">
            <div className="mb-6">
              <h1 className="text-xl font-semibold tracking-tight text-white">
                Register enterprise workspace
              </h1>
              <p className="mt-1 text-xs text-[#94A3B8]">
                Setup your profile to begin automated pipeline discovery and document tailoring.
              </p>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="mb-5 p-3 rounded bg-red-950/40 border border-red-800/80 flex items-start gap-2.5 text-red-300 text-xs">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {/* OAuth Notice Banner */}
            {oauthNotice && (
              <div className="mb-5 p-3 rounded bg-amber-950/40 border border-amber-800/80 flex items-start gap-2.5 text-amber-200 text-xs">
                <Info className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />
                <div className="space-y-1">
                  <p className="font-medium text-amber-300">Provider Notice</p>
                  <p className="text-[11px] leading-relaxed text-amber-200/90">{oauthNotice}</p>
                </div>
              </div>
            )}

            {/* SSO / OAuth Buttons */}
            <div className="grid grid-cols-2 gap-2.5 mb-5">
              <button
                type="button"
                onClick={() => handleOAuth("google")}
                disabled={loading || oauthLoading !== null}
                className="flex items-center justify-center gap-2 h-9 px-3 rounded bg-[#0B0F19] hover:bg-[#172033] border border-[#1F2937] hover:border-[#374151] text-xs font-medium text-[#E2E8F0] transition-colors cursor-pointer disabled:opacity-50"
              >
                {oauthLoading === "google" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#2563EB]" />
                ) : (
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.6 14.8c-.3-.8-.4-1.8-.4-2.8s.2-2 .4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"
                    />
                  </svg>
                )}
                <span>Google SSO</span>
              </button>

              <button
                type="button"
                onClick={() => handleOAuth("linkedin_oidc")}
                disabled={loading || oauthLoading !== null}
                className="flex items-center justify-center gap-2 h-9 px-3 rounded bg-[#0B0F19] hover:bg-[#172033] border border-[#1F2937] hover:border-[#374151] text-xs font-medium text-[#E2E8F0] transition-colors cursor-pointer disabled:opacity-50"
              >
                {oauthLoading === "linkedin" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#2563EB]" />
                ) : (
                  <svg className="w-3.5 h-3.5 shrink-0 fill-[#0A66C2]" viewBox="0 0 24 24">
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76c.86 0 1.55-.7 1.55-1.55s-.7-1.55-1.55-1.55a1.56 1.56 0 0 0-1.56 1.55c0 .86.7 1.55 1.56 1.55m1.39 9.74v-8.37H5.07v8.37h2.78z" />
                  </svg>
                )}
                <span>LinkedIn SSO</span>
              </button>
            </div>

            <div className="relative flex items-center justify-center my-5">
              <div className="border-t border-[#1F2937] w-full" />
              <span className="bg-[#111827] px-2.5 text-[10px] font-semibold tracking-wider uppercase text-[#64748B] absolute">
                or account credentials
              </span>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
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
                    className="w-full h-9 pl-9 pr-3 bg-[#0B0F19] border border-[#1F2937] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] rounded text-xs text-white placeholder-[#64748B] outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#CBD5E1] mb-1.5">
                  Work Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="developer@company.com"
                    className="w-full h-9 pl-9 pr-3 bg-[#0B0F19] border border-[#1F2937] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] rounded text-xs text-white placeholder-[#64748B] outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#CBD5E1] mb-1.5">
                  Password (minimum 6 characters)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full h-9 pl-9 pr-3 bg-[#0B0F19] border border-[#1F2937] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] rounded text-xs text-white placeholder-[#64748B] outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-start gap-2 pt-1">
                <input
                  id="terms"
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 w-3.5 h-3.5 rounded bg-[#0B0F19] border-[#1F2937] text-[#2563EB] focus:ring-[#2563EB] cursor-pointer"
                />
                <label htmlFor="terms" className="text-[11px] text-[#94A3B8] leading-tight cursor-pointer">
                  I agree to the Terms of Service, Acceptable Use Policy, and Data Protection terms.
                </label>
              </div>

              <button
                type="submit"
                disabled={loading || oauthLoading !== null}
                className="w-full h-9 mt-3 rounded bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] text-white text-xs font-semibold tracking-wide flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Creating workspace...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-[#1F2937] flex items-center justify-between text-xs text-[#94A3B8]">
              <span>Existing account?</span>
              <Link
                href="/login"
                className="text-[#2563EB] hover:text-[#60A5FA] font-medium transition-colors"
              >
                Sign in to workspace →
              </Link>
            </div>
          </div>

          {/* Compliance & Security Trust Strip */}
          <div className="mt-6 flex items-center justify-center gap-4 text-[11px] text-[#64748B]">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              <span>TLS 1.3 / AES-256</span>
            </span>
            <span>·</span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>Supabase RLS Protected</span>
            </span>
            <span>·</span>
            <span className="flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-[#94A3B8]" />
              <span>Role-Based Access</span>
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
