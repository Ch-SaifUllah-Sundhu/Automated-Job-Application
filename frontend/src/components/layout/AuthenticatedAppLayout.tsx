"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import {
  FolderKanban,
  Compass,
  FileText,
  Zap,
  Menu,
  X,
  LogOut,
  Trash2,
  Bell,
  User,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  ChevronRight,
  Shield,
  Sparkles,
} from "lucide-react";

interface AuthenticatedAppLayoutProps {
  children: React.ReactNode;
}

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Job Pipeline",
    icon: FolderKanban,
    exact: true,
  },
  {
    href: "/dashboard/jobs",
    label: "Find Jobs & Match",
    icon: Compass,
    exact: false,
  },
  {
    href: "/dashboard/profile",
    label: "Resume & Profile",
    icon: FileText,
    exact: false,
  },
];

export function AuthenticatedAppLayout({ children }: AuthenticatedAppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut, loading: authLoading, getAccessToken } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProModal, setShowProModal] = useState(false);

  // Close mobile drawer on route transition
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut();
      router.push("/login");
    } catch (err) {
      console.error("Sign out error:", err);
    } finally {
      setLoggingOut(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    setDeleteError(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Authentication session expired.");
      
      // Real backend cascade deletion via admin service
      await api.deleteAccount(token);
      await signOut();
      router.push("/signup?message=Account+and+all+personal+data+permanently+deleted");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete account. Please try again.";
      setDeleteError(msg);
      setDeletingAccount(false);
    }
  };

  const userInitial = user?.email ? user.email.slice(0, 2).toUpperCase() : "JP";
  const userDisplayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Candidate";

  return (
    <div className="flex h-screen bg-[#080B11] text-[#E2E8F0] overflow-hidden antialiased">
      {/* ── Left Sidebar (Desktop) ─────────────────────────────────────────── */}
      <aside className="w-64 border-r border-[#1F2937] bg-[#0B0F19] flex-col justify-between shrink-0 hidden md:flex z-20">
        <div>
          {/* Brand */}
          <div className="h-16 px-5 border-b border-[#1F2937] flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <div className="w-8 h-8 rounded-lg bg-[#2563EB] flex items-center justify-center font-bold text-white text-sm shadow-md shadow-blue-500/20 group-hover:bg-[#1D4ED8] transition-colors">
                JP
              </div>
              <div>
                <span className="text-base font-bold tracking-tight text-white block leading-none">
                  JobPilot
                </span>
                <span className="text-[11px] text-[#64748B] font-medium">Application Assistant</span>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? "bg-[#1E293B] text-white font-semibold shadow-sm border border-slate-700/60"
                      : "text-[#94A3B8] hover:text-white hover:bg-[#111827]"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-[#3B82F6]" : "text-[#64748B]"}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            {/* Pro Tier Item */}
            <button
              onClick={() => setShowProModal(true)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium text-[#94A3B8] hover:text-white hover:bg-[#111827] transition-colors cursor-pointer text-left"
            >
              <span className="flex items-center gap-3">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Pro Membership</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400/10 text-amber-300 border border-amber-400/20">
                PRO
              </span>
            </button>
          </nav>
        </div>

        {/* User Account / Footer */}
        <div className="p-4 border-t border-[#1F2937] bg-[#0A0E17]/80">
          <div className="flex items-center justify-between">
            <Link
              href="/dashboard/profile"
              className="flex items-center gap-3 truncate group hover:opacity-90 transition-opacity"
            >
              <div className="w-8 h-8 rounded-full bg-[#1E293B] border border-slate-700 flex items-center justify-center font-bold text-xs text-[#38BDF8]">
                {userInitial}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
                  {userDisplayName}
                </p>
                <p className="text-[11px] text-[#64748B] truncate">{user?.email || ""}</p>
              </div>
            </Link>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowDeleteModal(true)}
                title="Account Settings &amp; Deletion"
                className="p-1.5 rounded-md hover:bg-red-500/10 text-[#64748B] hover:text-red-400 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                title="Sign Out"
                className="p-1.5 rounded-md hover:bg-[#1F2937] text-[#64748B] hover:text-white transition-colors cursor-pointer"
              >
                {loggingOut ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#2563EB]" />
                ) : (
                  <LogOut className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Mobile Navigation Drawer ───────────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer Content */}
          <div className="relative w-72 max-w-[85%] bg-[#0B0F19] border-r border-[#1F2937] h-full flex flex-col justify-between z-10 p-5 shadow-2xl">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#1F2937]">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded bg-[#2563EB] flex items-center justify-center font-bold text-white text-xs">
                    JP
                  </div>
                  <span className="font-bold text-white text-base">JobPilot</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-md text-[#94A3B8] hover:text-white hover:bg-[#1F2937]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="mt-5 space-y-2">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-[#1E293B] text-white font-semibold border border-slate-700"
                          : "text-[#94A3B8] hover:text-white hover:bg-[#111827]"
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? "text-[#3B82F6]" : "text-[#64748B]"}`} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setShowProModal(true);
                  }}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium text-[#94A3B8] hover:text-white hover:bg-[#111827] text-left"
                >
                  <span className="flex items-center gap-3">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>Pro Membership</span>
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-400/10 text-amber-300 border border-amber-400/20">
                    PRO
                  </span>
                </button>
              </nav>
            </div>

            {/* Mobile Account Details */}
            <div className="pt-4 border-t border-[#1F2937]">
              <div className="flex items-center justify-between mb-3">
                <div className="truncate">
                  <p className="text-xs font-semibold text-white truncate">{userDisplayName}</p>
                  <p className="text-[11px] text-[#64748B] truncate">{user?.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setShowDeleteModal(true);
                  }}
                  className="flex items-center justify-center gap-1.5 py-2 rounded-md bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-1.5 py-2 rounded-md bg-[#1F2937] text-white text-xs font-medium hover:bg-[#374151]"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Content Container ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 border-b border-[#1F2937] bg-[#0A0E17]/90 backdrop-blur px-4 md:px-8 flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#1F2937] md:hidden cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white capitalize">
                {pathname.replace("/dashboard", "").replace("/", "") || "Overview"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Find Jobs CTA (if not on jobs page) */}
            {pathname !== "/dashboard/jobs" && (
              <Link
                href="/dashboard/jobs"
                className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1E293B] hover:bg-[#334155] text-xs font-medium text-slate-200 border border-slate-700 transition-colors"
              >
                <Compass className="w-3.5 h-3.5 text-[#38BDF8]" />
                <span>Search Opportunities</span>
              </Link>
            )}

            {/* Notifications Indicator */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#1F2937] transition-colors relative cursor-pointer"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#2563EB] rounded-full" />
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-[#0F172A] border border-[#1F2937] rounded-xl shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between pb-3 border-b border-[#1F2937] mb-3">
                    <span className="text-xs font-bold text-white">Application Notifications</span>
                    <span className="text-[10px] text-[#64748B]">Real-time audit</span>
                  </div>
                  <div className="py-4 text-center">
                    <CheckCircle2 className="w-7 h-7 text-emerald-400 mx-auto mb-2 opacity-80" />
                    <p className="text-xs font-medium text-slate-300">All applications up to date</p>
                    <p className="text-[11px] text-[#64748B] mt-0.5">
                      Task updates and submission audits will appear here automatically.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* User Avatar Pill */}
            <div className="flex items-center gap-2 pl-2 border-l border-[#1F2937]">
              <div className="w-8 h-8 rounded-full bg-[#1E293B] border border-slate-700 flex items-center justify-center font-bold text-xs text-[#38BDF8]">
                {userInitial}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto min-w-0 bg-[#080B11]">
          {children}
        </main>
      </div>

      {/* ── Permanent Account Deletion Modal (P0 Fix) ──────────────────────── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0F172A] border border-red-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-400 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Account &amp; Personal Data</h3>
                <p className="text-xs text-red-400/90">This action is permanent and cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-[#94A3B8] leading-relaxed mb-4">
              Deleting your account will permanently purge your profile, uploaded resume documents,
              tailored cover letters, application tracking history, and authentication credentials
              from our database.
            </p>

            {deleteError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs mb-4">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1F2937]">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteError(null);
                }}
                disabled={deletingAccount}
                className="px-4 py-2 rounded-lg text-xs font-medium text-[#94A3B8] hover:text-white hover:bg-[#1E293B] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deletingAccount}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-500 text-white flex items-center gap-2 shadow-lg shadow-red-600/20 transition-all cursor-pointer"
              >
                {deletingAccount ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting Data...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Permanently Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Pro Membership Modal ──────────────────────────────────────────── */}
      {showProModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0F172A] border border-amber-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <Zap className="w-5 h-5" />
                <span>JobPilot Pro (Module 10)</span>
              </div>
              <button
                onClick={() => setShowProModal(false)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Stripe billing integration is part of Module 10. Pro tier unlocks unlimited AI document
              drafting, automated headless submissions via Playwright, and Chrome Extension autofill.
            </p>
            <div className="p-3 rounded-lg bg-amber-400/10 border border-amber-400/20 text-amber-200 text-xs mb-4">
              ✨ Currently in Free Beta: All core pipeline features (Discovery, SBERT Semantic Scoring, Tailoring, and Manual Submission) are fully accessible.
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowProModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#1E293B] hover:bg-[#334155] text-white"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

