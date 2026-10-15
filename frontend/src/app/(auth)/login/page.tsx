"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowRight,
  Mail,
  Lock,
  AlertCircle,
  Loader2,
  Shield,
  CheckCircle2,
  KeyRound,
  ExternalLink,
  Info,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { signIn, signInWithOAuth } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "github" | "linkedin" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [oauthNotice, setOauthNotice] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Check URL parameters for error or success messages from redirects
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlError = params.get("error");
      const urlMsg = params.get("message");
      if (urlError) setError(decodeURIComponent(urlError));
      if (urlMsg) setSuccessNotice(decodeURIComponent(urlMsg));
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setOauthNotice(null);
    setLoading(true);

    try {
      await signIn(email, password);
      router.push("/dashboard");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Invalid email or password. Please verify credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: "google" | "github" | "linkedin_oidc") => {
    setError(null);
    setOauthNotice(null);
    setOauthLoading(provider === "google" ? "google" : provider === "github" ? "github" : "linkedin");
    try {
      await signInWithOAuth(provider);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      const providerName = provider === "google" ? "Google" : provider === "github" ? "GitHub" : "LinkedIn";
      if (
        msg.includes("provider is not enabled") ||
        msg.includes("validation_failed") ||
        msg.includes("Unsupported provider")
      ) {
        setOauthNotice(
          `${providerName} OAuth provider is currently disabled in your Supabase project settings. Please sign in with your corporate email/password below or enable the provider in your Supabase dashboard (Authentication > Providers).`
        );
      } else {
        setError(msg || "OAuth authentication failed.");
      }
      setOauthLoading(null);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0B0F19] text-[#E2E8F0] flex flex-col font-sans selection:bg-[#2563EB]/30 selection:text-white">
      {/* Top Enterprise Header */}
      <header className="w-full border-b border-[#1F2937] bg-[#0B0F19]/90 px-6 py-3.5 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="relative w-7 h-7 rounded overflow-hidden border border-[#2563EB]/40">
              <Image src="/logo.jpg" alt="JobPilot" fill className="object-cover" />
            </div>
            <span className="text-sm font-semibold tracking-tight text-white">
              JobPilot <span className="text-xs font-normal text-[#94A3B8]">Talent Operations</span>
            </span>
          </Link>
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
        <div className="w-full max-w-[440px]">
          {/* Card */}
          <div className="bg-[#111827] border border-[#1F2937] rounded-lg p-8 shadow-xl">
            <div className="mb-6">
              <h1 className="text-xl font-semibold tracking-tight text-white">
                Sign in to workspace
              </h1>
              <p className="mt-1 text-xs text-[#94A3B8]">
                Access automated job search, candidate profiling, and pipeline telemetry.
              </p>
            </div>

            {/* Success Banner */}
            {successNotice && (
              <div className="mb-5 p-3 rounded bg-emerald-950/40 border border-emerald-800/80 flex items-start gap-2.5 text-emerald-200 text-xs">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-400" />
                <span>{successNotice}</span>
              </div>
            )}

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
                onClick={() => handleOAuth("github")}
                disabled={loading || oauthLoading !== null}
                className="flex items-center justify-center gap-2 h-9 px-3 rounded bg-[#0B0F19] hover:bg-[#172033] border border-[#1F2937] hover:border-[#374151] text-xs font-medium text-[#E2E8F0] transition-colors cursor-pointer disabled:opacity-50"
              >
                {oauthLoading === "github" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#2563EB]" />
                ) : (
                  <svg className="w-3.5 h-3.5 shrink-0 fill-current text-white" viewBox="0 0 24 24">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                )}
                <span>GitHub SSO</span>
              </button>
            </div>

            <div className="relative flex items-center justify-center my-5">
              <div className="border-t border-[#1F2937] w-full" />
              <span className="bg-[#111827] px-2.5 text-[10px] font-semibold tracking-wider uppercase text-[#64748B] absolute">
                or corporate email
              </span>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#CBD5E1] mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full h-9 pl-9 pr-3 bg-[#0B0F19] border border-[#1F2937] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] rounded text-xs text-white placeholder-[#64748B] outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-[#CBD5E1]">
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-[11px] text-[#2563EB] hover:text-[#60A5FA] transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full h-9 pl-9 pr-3 bg-[#0B0F19] border border-[#1F2937] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] rounded text-xs text-white placeholder-[#64748B] outline-none transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || oauthLoading !== null}
                className="w-full h-9 mt-2 rounded bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] text-white text-xs font-semibold tracking-wide flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-[#1F2937] flex items-center justify-between text-xs text-[#94A3B8]">
              <span>New organization?</span>
              <Link
                href="/signup"
                className="text-[#2563EB] hover:text-[#60A5FA] font-medium transition-colors"
              >
                Register workspace →
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
