"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowRight,
  ArrowLeft,
  Mail,
  Lock,
  User,
  AlertCircle,
  Loader2,
  Shield,
  CheckCircle2,
  KeyRound,
  RotateCcw,
  Layers,
  Sparkles,
} from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const { signUp, signInWithOAuth, verifyOtp, resendOtp } = useAuth();

  const [step, setStep] = useState<1 | 2>(1);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "github" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [oauthNotice, setOauthNotice] = useState<string | null>(null);

  // 6-Digit OTP State
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpNotice, setOtpNotice] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resendNotice, setResendNotice] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const digitRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // Read URL parameters on mount and handle popstate navigation
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlEmail = params.get("email");
      const urlStep = params.get("step");
      const urlVerify = params.get("verify");

      if (urlEmail) setEmail(urlEmail);
      if (urlStep === "2" || urlVerify === "true") {
        setStep(2);
        setOtpNotice("Enter your 6-digit confirmation code below.");
      }

      const handlePopState = () => {
        const currentParams = new URLSearchParams(window.location.search);
        const currentStep = currentParams.get("step");
        if (currentStep === "2") {
          setStep(2);
        } else {
          setStep(1);
        }
      };

      window.addEventListener("popstate", handlePopState);
      return () => window.removeEventListener("popstate", handlePopState);
    }
  }, []);

  const advanceToStep = (newStep: 1 | 2) => {
    setStep(newStep);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("step", String(newStep));
      if (email) url.searchParams.set("email", email);
      window.history.pushState({ step: newStep }, "", url.toString());
    }
  };

  const handleBackToStep1 = () => {
    if (typeof window !== "undefined" && window.location.search.includes("step=2")) {
      window.history.back();
    } else {
      setStep(1);
    }
  };

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setOauthNotice(null);

    if (!termsAccepted) {
      setError("Please accept the terms of service and acceptable use agreement to register.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters in length.");
      return;
    }

    setLoading(true);

    try {
      await signUp(email, password, fullName);
      // Advance to Step 2 with proper browser history entry
      advanceToStep(2);
      setCooldown(60);
      setOtpNotice(`A 6-digit verification code has been dispatched to ${email}. Check your inbox or spam folder.`);
      setTimeout(() => {
        digitRefs[0].current?.focus();
      }, 100);
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message.toLowerCase().includes("already registered")) {
          // Allow existing user to verify code directly
          advanceToStep(2);
          setCooldown(60);
          setOtpNotice(`An account already exists for ${email}. Enter the 6-digit confirmation code to verify, or sign in.`);
          setTimeout(() => {
            digitRefs[0].current?.focus();
          }, 100);
        } else {
          setError(err.message);
        }
      } else {
        setError("Account registration failed. Please verify your credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDigitChange = (index: number, val: string) => {
    // Only accept numeric digit
    const cleaned = val.replace(/\D/g, "");
    if (!cleaned) {
      const nextDigits = [...otpDigits];
      nextDigits[index] = "";
      setOtpDigits(nextDigits);
      return;
    }

    // If user pasted multi digits into one box
    if (cleaned.length > 1) {
      const nextDigits = [...otpDigits];
      for (let i = 0; i < 6; i++) {
        if (i < cleaned.length) {
          nextDigits[i] = cleaned[i];
        }
      }
      setOtpDigits(nextDigits);
      const nextIndex = Math.min(cleaned.length, 5);
      digitRefs[nextIndex].current?.focus();
      return;
    }

    // Single digit
    const nextDigits = [...otpDigits];
    nextDigits[index] = cleaned[cleaned.length - 1];
    setOtpDigits(nextDigits);

    // Auto focus next input
    if (index < 5 && cleaned) {
      digitRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      digitRefs[index - 1].current?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "");
    if (pasted) {
      const nextDigits = [...otpDigits];
      for (let i = 0; i < 6; i++) {
        if (i < pasted.length) {
          nextDigits[i] = pasted[i];
        }
      }
      setOtpDigits(nextDigits);
      const nextIndex = Math.min(pasted.length, 5);
      digitRefs[nextIndex].current?.focus();
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError(null);
    setResendNotice(null);

    const fullCode = otpDigits.join("");
    if (fullCode.length < 6) {
      setOtpError("Please enter all 6 digits of your confirmation code.");
      return;
    }

    setOtpLoading(true);

    try {
      await verifyOtp(email, fullCode, "signup");
      router.push("/onboarding");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setOtpError(err.message);
      } else {
        setOtpError("Invalid verification code. Please check your inbox or request a new code.");
      }
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0) return;
    setResending(true);
    setOtpError(null);
    setResendNotice(null);

    try {
      await resendOtp(email, "signup");
      setResendNotice("A new 6-digit confirmation code has been dispatched to your email.");
      setCooldown(60);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setOtpError(err.message);
      } else {
        setOtpError("Unable to resend confirmation code. Please try again shortly.");
      }
    } finally {
      setResending(false);
    }
  };

  const handleOAuth = async (provider: "google" | "github") => {
    setError(null);
    setOauthNotice(null);
    setOauthLoading(provider);
    try {
      await signInWithOAuth(provider);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      const providerName = provider === "google" ? "Google" : "GitHub";
      if (
        msg.includes("provider is not enabled") ||
        msg.includes("validation_failed") ||
        msg.includes("Unsupported provider")
      ) {
        setOauthNotice(
          `${providerName} SSO provider is not yet active in Supabase. Please sign up with email and password below.`
        );
      } else {
        setError(msg || "OAuth registration failed.");
      }
      setOauthLoading(null);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0B0F19] text-[#E2E8F0] flex flex-col font-sans selection:bg-[#2563EB]/30 selection:text-white">
      {/* Top Header - Consistent with Onboarding */}
      <header className="w-full border-b border-[#1F2937] bg-[#0B0F19]/90 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-7 h-7 rounded bg-[#2563EB] flex items-center justify-center font-bold text-white text-xs tracking-wider">
              JP
            </div>
            <span className="text-sm font-semibold tracking-tight text-white">
              JobPilot <span className="text-xs font-normal text-[#94A3B8]">Talent Operations</span>
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-3 text-xs text-[#94A3B8]">
          <span className="text-[11px] text-[#94A3B8]">Candidate Registration</span>
          <span>·</span>
          <span className="text-[#CBD5E1] font-mono">Stage {step}/2</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-[560px]">
          {/* Stepper Indicator - Exact Onboarding Style */}
          <div className="grid grid-cols-2 gap-2 mb-6">
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
          </div>

          {/* Wizard Card */}
          <div className="bg-[#111827] border border-[#1F2937] rounded-lg p-8 shadow-xl">
            {step === 1 ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h1 className="text-lg font-semibold tracking-tight text-white">
                      Step 1: Create Candidate Account
                    </h1>
                    <p className="mt-1 text-xs text-[#94A3B8]">
                      Establish your credentials to access automated job search and resume tailoring.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!email) {
                        setError("Please enter your email above first to access the OTP verification step.");
                      } else {
                        setStep(2);
                      }
                    }}
                    className="text-[11px] text-[#2563EB] hover:text-[#60A5FA] font-medium transition-colors cursor-pointer"
                  >
                    Have OTP code? →
                  </button>
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="mb-5 p-3 rounded bg-red-950/40 border border-red-800/80 flex items-start gap-2.5 text-red-300 text-xs">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
                    <span>{error}</span>
                  </div>
                )}

                {/* OAuth Notice */}
                {oauthNotice && (
                  <div className="mb-5 p-3 rounded bg-amber-950/40 border border-amber-800/80 flex items-start gap-2.5 text-amber-200 text-xs">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />
                    <span>{oauthNotice}</span>
                  </div>
                )}

                {/* SSO Buttons */}
                <div className="grid grid-cols-2 gap-2.5 mb-5">
                  <button
                    type="button"
                    onClick={() => handleOAuth("google")}
                    disabled={loading || oauthLoading !== null}
                    className="flex items-center justify-center gap-2 h-9 px-3 rounded bg-[#0B0F19] hover:bg-[#161F33] border border-[#1F2937] hover:border-[#374151] text-xs font-medium text-[#E2E8F0] transition-colors cursor-pointer disabled:opacity-50"
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
                    className="flex items-center justify-center gap-2 h-9 px-3 rounded bg-[#0B0F19] hover:bg-[#161F33] border border-[#1F2937] hover:border-[#374151] text-xs font-medium text-[#E2E8F0] transition-colors cursor-pointer disabled:opacity-50"
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
                  <span className="bg-[#111827] px-3 text-[10px] font-semibold tracking-wider uppercase text-[#64748B] absolute">
                    or register with email
                  </span>
                </div>

                {/* Form */}
                <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
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
                        placeholder="Chaudhry Saif Ullah"
                        className="w-full h-9 pl-9 pr-3 bg-[#0B0F19] border border-[#1F2937] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] rounded text-xs text-white placeholder-[#64748B] outline-none transition-colors"
                      />
                    </div>
                  </div>

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
                        placeholder="saif@example.com"
                        className="w-full h-9 pl-9 pr-3 bg-[#0B0F19] border border-[#1F2937] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] rounded text-xs text-white placeholder-[#64748B] outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#CBD5E1] mb-1.5">
                      Password (min. 6 characters)
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
                      I accept the Terms of Service, Acceptable Use Policy, and Candidate Data Protection standards.
                    </label>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading || oauthLoading !== null}
                      className="w-full h-9 rounded bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] text-white text-xs font-semibold tracking-wide flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Generating Verification OTP...</span>
                        </>
                      ) : (
                        <>
                          <span>Continue to OTP Verification</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </form>

                <div className="mt-5 pt-4 border-t border-[#1F2937] flex items-center justify-between text-xs text-[#94A3B8]">
                  <span>Existing account?</span>
                  <Link
                    href="/login"
                    className="text-[#2563EB] hover:text-[#60A5FA] font-medium transition-colors"
                  >
                    Sign in to workspace →
                  </Link>
                </div>
              </div>
            ) : (
              /* STEP 2: MANDATORY 6-DIGIT OTP VERIFICATION */
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleBackToStep1}
                    className="text-[#94A3B8] hover:text-white transition-colors p-1 rounded cursor-pointer"
                    title="Back to details"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs text-[#94A3B8]">Step 2 of 2: Security Verification</span>
                </div>

                <div>
                  <h1 className="text-lg font-semibold tracking-tight text-white">
                    Enter 6-Digit Verification Code
                  </h1>
                  <p className="mt-1 text-xs text-[#94A3B8] leading-relaxed">
                    A confirmation code was dispatched to <strong className="text-white">{email}</strong>. Enter the 6 digits below to verify your account.
                  </p>
                </div>

                {/* Error Banner */}
                {otpError && (
                  <div className="p-3 rounded bg-red-950/40 border border-red-800/80 flex items-start gap-2.5 text-red-300 text-xs">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
                    <span>{otpError}</span>
                  </div>
                )}

                {/* Info / Notice */}
                {otpNotice && !otpError && (
                  <div className="p-3 rounded bg-[#0B0F19] border border-[#2563EB]/40 flex items-start gap-2.5 text-[#94A3B8] text-xs">
                    <Sparkles className="w-4 h-4 mt-0.5 shrink-0 text-[#2563EB]" />
                    <span>{otpNotice}</span>
                  </div>
                )}

                {/* Resend Notice */}
                {resendNotice && (
                  <div className="p-3 rounded bg-emerald-950/40 border border-emerald-800/80 flex items-start gap-2.5 text-emerald-200 text-xs">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-400" />
                    <span>{resendNotice}</span>
                  </div>
                )}

                <form onSubmit={handleVerifyOtp} className="space-y-5 pt-2">
                  <div>
                    <label className="block text-xs font-medium text-[#CBD5E1] mb-2.5 text-center">
                      6-Digit Confirmation PIN
                    </label>
                    
                    {/* 6 High-Fidelity Discrete OTP Digit Boxes */}
                    <div className="flex items-center justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
                      {otpDigits.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={digitRefs[idx]}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleDigitChange(idx, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(idx, e)}
                          className="w-10 h-12 sm:w-11 sm:h-12 text-center text-lg sm:text-xl font-bold font-mono bg-[#0B0F19] border border-[#1F2937] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] rounded text-white outline-none transition-colors"
                        />
                      ))}
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={otpLoading || otpDigits.join("").length < 6}
                      className="w-full h-9 rounded bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] text-white text-xs font-semibold tracking-wide flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {otpLoading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Verifying Account...</span>
                        </>
                      ) : (
                        <>
                          <span>Verify & Proceed to Onboarding</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </form>

                <div className="mt-4 pt-4 border-t border-[#1F2937] flex items-center justify-between text-xs text-[#94A3B8]">
                  <span>Didn't receive code?</span>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resending || cooldown > 0}
                    className="text-[#2563EB] hover:text-[#60A5FA] font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>
                      {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Compliance & Security Strip - Exact Onboarding Style */}
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
              <Layers className="w-3.5 h-3.5 text-[#94A3B8]" />
              <span>Zero-Trust Auth</span>
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
