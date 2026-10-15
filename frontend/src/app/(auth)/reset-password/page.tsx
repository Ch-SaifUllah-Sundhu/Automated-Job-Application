"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  Lock,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Shield,
  KeyRound,
  ArrowRight,
} from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { updatePassword } = useAuth();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters in length.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    setLoading(true);

    try {
      await updatePassword(password);
      setSuccess(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unable to update password. Your recovery link may have expired.");
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
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-12 relative">
        <div className="w-full max-w-[440px]">
          <div className="bg-[#111827] border border-[#1F2937] rounded-lg p-8 shadow-xl">
            <div className="mb-6">
              <h1 className="text-xl font-semibold tracking-tight text-white">
                Set new credentials
              </h1>
              <p className="mt-1 text-xs text-[#94A3B8]">
                Please enter your new password to regain access to your workspace.
              </p>
            </div>

            {error && (
              <div className="mb-5 p-3 rounded bg-red-950/40 border border-red-800/80 flex items-start gap-2.5 text-red-300 text-xs">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {success ? (
              <div className="space-y-4">
                <div className="p-4 rounded bg-emerald-950/30 border border-emerald-800/80 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-emerald-200">
                    <p className="font-semibold text-emerald-300">Password successfully updated</p>
                    <p className="mt-1 text-emerald-200/90 leading-relaxed">
                      Your credentials have been securely refreshed. Redirecting you to your dashboard...
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <Link
                    href="/dashboard"
                    className="w-full h-9 rounded bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>Go to Dashboard</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#CBD5E1] mb-1.5">
                    New Password
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

                <div>
                  <label className="block text-xs font-medium text-[#CBD5E1] mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••••"
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
                      <span>Updating Credentials...</span>
                    </>
                  ) : (
                    <span>Update Password</span>
                  )}
                </button>
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
              <span>Bcrypt / Argon2 Salted</span>
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
