"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowRight,
  Shield,
  Search,
  Sparkles,
  Zap,
  Lock,
  BarChart3,
  CheckCircle2,
} from "lucide-react";

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen w-full bg-[#0B0F19] text-[#E2E8F0] flex flex-col font-sans selection:bg-[#2563EB]/30 selection:text-white">
      {/* Top Navigation */}
      <header className="w-full border-b border-[#1F2937] bg-[#0B0F19]/90 backdrop-blur-md sticky top-0 z-50 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-[#2563EB]/40 shadow-sm">
              <Image
                src="/logo.jpg"
                alt="JobPilot Logo"
                fill
                className="object-cover"
                priority
              />
            </div>
            <div>
              <span className="text-sm font-semibold tracking-tight text-white block leading-none">
                JobPilot
              </span>
              <span className="text-[10px] text-[#94A3B8]">Talent Operations</span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-4 text-xs">
          {user ? (
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 h-8 px-3.5 rounded bg-[#2563EB] hover:bg-[#1D4ED8] text-xs font-semibold text-white transition-colors"
            >
              <span>Go to Workspace</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          ) : (
            <div className="flex items-center gap-2.5">
              <Link
                href="/login"
                className="h-8 px-3.5 rounded bg-[#111827] hover:bg-[#1F2937] border border-[#1F2937] text-xs font-medium text-[#CBD5E1] flex items-center transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="h-8 px-3.5 rounded bg-[#2563EB] hover:bg-[#1D4ED8] text-xs font-semibold text-white flex items-center gap-1 transition-colors"
              >
                <span>Get Started</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-20 text-center relative overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#2563EB]/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-3xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#111827] border border-[#1F2937] text-[11px] text-[#94A3B8] mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>AI-Driven Career Placement Platform</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight">
            Automate Job Search. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#60A5FA] via-[#3B82F6] to-[#2563EB]">
              Accelerate Career Placement.
            </span>
          </h1>

          <p className="mt-5 text-sm sm:text-base text-[#94A3B8] max-w-xl mx-auto leading-relaxed">
            Multi-portal intelligent job discovery, semantic resume matching, bespoke cover letter tailoring, and real-time application tracking—all unified in one intuitive workspace.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={user ? "/dashboard" : "/signup"}
              className="w-full sm:w-auto h-11 px-6 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] text-white text-xs font-semibold tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-[#2563EB]/25 transition-all"
            >
              <span>{user ? "Open Workspace" : "Start Job Assistant Free"}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/login"
              className="w-full sm:w-auto h-11 px-6 rounded-lg bg-[#111827] hover:bg-[#1F2937] border border-[#1F2937] text-xs font-medium text-[#E2E8F0] flex items-center justify-center transition-colors"
            >
              Sign In to Account
            </Link>
          </div>
        </div>

        {/* 3 Pillars Feature Grid */}
        <div className="max-w-5xl w-full mx-auto mt-24 grid grid-cols-1 md:grid-cols-3 gap-5 text-left relative z-10 px-2">
          <div className="p-6 rounded-xl bg-[#111827]/80 border border-[#1F2937] backdrop-blur-sm">
            <div className="w-10 h-10 rounded-lg bg-[#2563EB]/10 border border-[#2563EB]/20 flex items-center justify-center text-[#2563EB] mb-4">
              <Search className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-white">Multi-Portal Search</h3>
            <p className="mt-2 text-xs text-[#94A3B8] leading-relaxed">
              Automated queries across 10+ job portals with automatic deduplication, intelligent salary filtering, and real-time listings.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-[#111827]/80 border border-[#1F2937] backdrop-blur-sm">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-white">AI Document Tailoring</h3>
            <p className="mt-2 text-xs text-[#94A3B8] leading-relaxed">
              Generates customized cover letters and tailored resume bullet points calibrated precisely to target job descriptions.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-[#111827]/80 border border-[#1F2937] backdrop-blur-sm">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-white">Application Pipeline</h3>
            <p className="mt-2 text-xs text-[#94A3B8] leading-relaxed">
              Track applications end-to-end from Discovered to Interview and Offer with human-in-the-loop review.
            </p>
          </div>
        </div>

        {/* Security & Compliance Strip */}
        <div className="mt-16 flex items-center justify-center gap-6 text-xs text-[#64748B]">
          <span className="flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-emerald-500" />
            <span>Encrypted Data Storage</span>
          </span>
          <span>·</span>
          <span className="flex items-center gap-1.5">
            <Lock className="w-4 h-4 text-[#2563EB]" />
            <span>Zero-Trust Privacy</span>
          </span>
          <span>·</span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-blue-400" />
            <span>Enterprise TLS 1.3</span>
          </span>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[#1F2937] bg-[#0B0F19] px-6 py-6 text-center text-xs text-[#64748B]">
        <p className="text-white font-medium mb-1">JobPilot — Autonomous Talent Operations</p>
        <p>Founder & Platform Lead: <span className="text-[#E2E8F0] font-semibold">Chaudhry Saif Ullah Sundhu</span>. All rights reserved © 2026.</p>
      </footer>
    </div>
  );
}
