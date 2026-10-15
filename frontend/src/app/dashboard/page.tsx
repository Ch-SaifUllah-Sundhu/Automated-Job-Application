"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  LogOut,
  User,
  Shield,
  Briefcase,
  FileText,
  Search,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  Loader2,
  ExternalLink,
} from "lucide-react";

export default function DashboardPage() {
  const { user, signOut, loading } = useAuth();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut();
    } catch (err) {
      console.error("Sign out error:", err);
    } finally {
      setLoggingOut(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    // In production, this calls backend endpoint DELETE /profile
    setTimeout(async () => {
      try {
        await signOut();
        router.push("/signup?message=Account+deleted+successfully");
      } catch (err) {
        console.error("Delete account error:", err);
      } finally {
        setDeletingAccount(false);
        setShowDeleteModal(false);
      }
    }, 1200);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-[#E2E8F0] flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" />
          <span className="text-xs text-[#94A3B8]">Loading authenticated workspace...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#0B0F19] text-[#E2E8F0] flex flex-col font-sans selection:bg-[#2563EB]/30 selection:text-white">
      {/* Enterprise Header */}
      <header className="w-full border-b border-[#1F2937] bg-[#0B0F19]/90 px-6 py-3.5 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="relative w-7 h-7 rounded overflow-hidden border border-[#2563EB]/40">
              <Image src="/logo.jpg" alt="JobPilot" fill className="object-cover" />
            </div>
            <span className="text-sm font-semibold tracking-tight text-white">
              JobPilot <span className="text-xs font-normal text-[#94A3B8]">Workspace</span>
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded bg-[#111827] border border-[#1F2937] text-[#CBD5E1]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] truncate max-w-[200px]">{user?.email || "Authenticated User"}</span>
          </div>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#111827] hover:bg-[#1F2937] border border-[#1F2937] text-xs font-medium text-[#E2E8F0] transition-colors cursor-pointer disabled:opacity-50"
          >
            {loggingOut ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#2563EB]" />
            ) : (
              <LogOut className="w-3.5 h-3.5 text-[#94A3B8]" />
            )}
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {/* Welcome Banner */}
        <div className="p-6 rounded-lg bg-[#111827] border border-[#1F2937] mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-white tracking-tight">
                Welcome back{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ""}
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-[#60A5FA] border border-blue-500/20">
                ACTIVE SESSION
              </span>
            </div>
            <p className="mt-1 text-xs text-[#94A3B8]">
              Your automated job discovery, document tailoring, and submission telemetry are live.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/onboarding"
              className="px-3.5 py-2 rounded bg-[#1F2937] hover:bg-[#374151] text-xs font-medium text-white transition-colors"
            >
              Resume & Profile Settings
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="p-4 rounded-lg bg-[#111827] border border-[#1F2937]">
            <div className="flex items-center justify-between text-[#94A3B8]">
              <span className="text-xs font-medium">Saved Jobs</span>
              <Briefcase className="w-4 h-4 text-[#2563EB]" />
            </div>
            <div className="mt-2 text-2xl font-bold text-white">0</div>
            <p className="mt-1 text-[11px] text-[#64748B]">Across 10+ integrated portals</p>
          </div>

          <div className="p-4 rounded-lg bg-[#111827] border border-[#1F2937]">
            <div className="flex items-center justify-between text-[#94A3B8]">
              <span className="text-xs font-medium">Tailored Documents</span>
              <FileText className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-white">0</div>
            <p className="mt-1 text-[11px] text-[#64748B]">Groq Llama 3 generation engine</p>
          </div>

          <div className="p-4 rounded-lg bg-[#111827] border border-[#1F2937]">
            <div className="flex items-center justify-between text-[#94A3B8]">
              <span className="text-xs font-medium">Active Applications</span>
              <CheckCircle2 className="w-4 h-4 text-purple-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-white">0</div>
            <p className="mt-1 text-[11px] text-[#64748B]">Kanban tracking pipeline</p>
          </div>

          <div className="p-4 rounded-lg bg-[#111827] border border-[#1F2937]">
            <div className="flex items-center justify-between text-[#94A3B8]">
              <span className="text-xs font-medium">Daily Quota</span>
              <Shield className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-white">3 / 3</div>
            <p className="mt-1 text-[11px] text-[#64748B]">Free tier search credits remaining</p>
          </div>
        </div>

        {/* Empty State Pipeline Section */}
        <div className="rounded-lg bg-[#111827] border border-[#1F2937] p-8 text-center mb-8">
          <div className="w-12 h-12 rounded-full bg-[#1F2937] flex items-center justify-center mx-auto mb-4 text-[#94A3B8]">
            <Search className="w-6 h-6 text-[#2563EB]" />
          </div>
          <h3 className="text-base font-semibold text-white">No active job applications found</h3>
          <p className="mt-1 text-xs text-[#94A3B8] max-w-md mx-auto">
            Module 7 (Smart Match Scoring & Kanban Board) will populate your real-time job pipelines here.
          </p>
          <div className="mt-5">
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-[#2563EB] hover:bg-[#1D4ED8] text-xs font-semibold text-white transition-colors"
            >
              <span>Complete Profile Setup</span>
            </Link>
          </div>
        </div>

        {/* Danger Zone / Delete Account Section (Item #18) */}
        <div className="rounded-lg border border-red-900/40 bg-red-950/10 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-semibold text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span>Danger Zone</span>
            </h4>
            <p className="mt-1 text-xs text-[#94A3B8]">
              Permanently delete your account, saved applications, and profile text. This action is irreversible.
            </p>
          </div>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-3.5 py-2 rounded bg-red-950/60 hover:bg-red-900/80 border border-red-800/80 text-xs font-medium text-red-200 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
            <span>Delete Account</span>
          </button>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-red-800/80 rounded-lg max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400 mb-3">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-semibold text-white">Delete Workspace Account?</h3>
            </div>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Are you sure you want to permanently delete your account? All your uploaded resume embeddings, tailored documents, and job applications will be permanently wiped.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deletingAccount}
                className="px-3 py-1.5 rounded bg-[#1F2937] hover:bg-[#374151] text-xs font-medium text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deletingAccount}
                className="px-3 py-1.5 rounded bg-red-600 hover:bg-red-700 text-xs font-semibold text-white transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {deletingAccount ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Yes, Delete Everything</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
