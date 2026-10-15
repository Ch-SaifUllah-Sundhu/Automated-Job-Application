"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowLeft,
  Mail,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Shield,
  KeyRound,
} from "lucide-react";

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await resetPassword(email);
      setSubmitted(true);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to dispatch password recovery email. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0B0F19] text-[#E2E8F0] flex flex-col font-sans selection:bg-[#2563EB]/30 selection:text-white">
      {/* Top Header */}
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
        <Link
          href="/login"
          className="text-xs text-[#94A3B8] hover:text-white flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to sign in</span>
        </Link>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-12 relative">
        <div className="w-full max-w-[440px]">
          <div className="bg-[#111827] border border-[#1F2937] rounded-lg p-8 shadow-xl">
            <div className="mb-6">
              <h1 className="text-xl font-semibold tracking-tight text-white">
                Reset your password
              </h1>
              <p className="mt-1 text-xs text-[#94A3B8]">
                Enter the work email associated with your account to receive a secure recovery link.
              </p>
            </div>

            {error && (
              <div className="mb-5 p-3 rounded bg-red-950/40 border border-red-800/80 flex items-start gap-2.5 text-red-300 text-xs">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {submitted ? (
              <div className="space-y-4">
                <div className="p-4 rounded bg-emerald-950/30 border border-emerald-800/80 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-emerald-200">
                    <p className="font-semibold text-emerald-300">Recovery email sent</p>
                    <p className="mt-1 text-emerald-200/90 leading-relaxed">
                      We have sent a secure password reset link to <strong className="text-white">{email}</strong>. Please check your inbox and spam folder.
                    </p>
                  </div>
                </div>

                <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                  The link will expire in 60 minutes for security purposes. If you do not receive an email, ensure your corporate SMTP settings are active or try again.
                </p>

                <div className="pt-2">
                  <Link
                    href="/login"
                    className="w-full h-9 rounded bg-[#1F2937] hover:bg-[#374151] text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>Return to Sign In</span>
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#CBD5E1] mb-1.5">
                    Account Email Address
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

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-9 mt-2 rounded bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] text-white text-xs font-semibold tracking-wide flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending Recovery Link...</span>
                    </>
                  ) : (
                    <span>Send Password Reset Link</span>
                  )}
                </button>

                <div className="pt-2 text-center">
                  <Link
                    href="/login"
                    className="text-xs text-[#94A3B8] hover:text-[#60A5FA] transition-colors"
                  >
                    Remember your password? Sign in
                  </Link>
                </div>
              </form>
            )}
          </div>

          {/* Compliance & Security Strip */}
          <div className="mt-6 flex items-center justify-center gap-4 text-[11px] text-[#64748B]">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              <span>TLS 1.3 Encryption</span>
            </span>
            <span>·</span>
            <span className="flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>Time-limited Token</span>
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
