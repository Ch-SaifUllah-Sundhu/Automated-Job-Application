"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { api, ApplicationItem, JobItem } from "@/lib/api";
import { MatchRing } from "@/components/jobs/JobCard";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  DragEndEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  LogOut,
  User,
  Briefcase,
  FileText,
  Search,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  Loader2,
  Bell,
  Sparkles,
  Zap,
  Plus,
  ArrowUpRight,
  X,
  Check,
  Building,
  MapPin,
  Clock,
  Layers,
  BarChart3,
  FolderKanban,
  ArrowRight,
  Copy,
  Edit3,
  RefreshCw,
  ChevronRight,
  ExternalLink,
  Compass,
  GripVertical,
} from "lucide-react";

// ── Kanban 5-Stage Config ───────────────────────────────────────────────────
const STAGE_CONFIG: {
  id: string;
  label: string;
  colorClass: string;
  badgeClass: string;
  apiStatus: string; // maps to backend application.status
}[] = [
  {
    id: "Found",
    label: "Discovered",
    apiStatus: "Found",
    colorClass: "border-blue-500/40 text-blue-400 bg-blue-500/10",
    badgeClass: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  },
  {
    id: "Applied",
    label: "Applied",
    apiStatus: "Applied",
    colorClass: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10",
    badgeClass: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  },
  {
    id: "Interview",
    label: "Interviewing",
    apiStatus: "Interview",
    colorClass: "border-purple-500/40 text-purple-400 bg-purple-500/10",
    badgeClass: "bg-purple-500/15 text-purple-400 border border-purple-500/30",
  },
  {
    id: "Offer",
    label: "Offer",
    apiStatus: "Offer",
    colorClass: "border-amber-500/40 text-amber-400 bg-amber-500/10",
    badgeClass: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  },
  {
    id: "Rejected",
    label: "Closed / Rejected",
    apiStatus: "Rejected",
    colorClass: "border-rose-500/40 text-rose-400 bg-rose-500/10",
    badgeClass: "bg-rose-500/15 text-rose-400 border border-rose-500/30",
  },
];

// ── Helpers ─────────────────────────────────────────────────────────────────
function timeAgo(dateStr?: string | null): string {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Droppable Column Component ──────────────────────────────────────────────
function DroppableColumn({
  col,
  count,
  children,
  onAdd,
}: {
  col: (typeof STAGE_CONFIG)[number];
  count: number;
  children: React.ReactNode;
  onAdd: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: col.apiStatus,
  });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl bg-[#0E131F] border p-3 flex flex-col min-h-[480px] transition-colors ${
        isOver
          ? "border-[#2563EB] bg-[#161F33]/60 shadow-lg shadow-[#2563EB]/10"
          : "border-[#1F2937]"
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[#1F2937]">
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${col.colorClass}`}
          >
            {col.label}
          </span>
          <span className="text-xs text-[#94A3B8] font-mono">({count})</span>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="text-[#64748B] hover:text-white p-1 rounded transition-colors"
          title={`Add opportunity to ${col.label}`}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Cards container */}
      <div className="space-y-2.5 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}

// ── Draggable Card Component ────────────────────────────────────────────────
function DraggableCard({
  app,
  col,
  movingId,
  onOpenModal,
  onMoveStatus,
}: {
  app: ApplicationItem;
  col: (typeof STAGE_CONFIG)[number];
  movingId: string | null;
  onOpenModal: (app: ApplicationItem) => void;
  onMoveStatus: (appId: string, newStatus: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: app.id,
      data: { app, status: app.status },
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-3 rounded-lg bg-[#111827] border transition-all select-none space-y-2.5 group shadow-sm ${
        isDragging
          ? "opacity-30 border-dashed border-[#2563EB] z-50"
          : "border-[#1F2937] hover:border-[#2563EB]/50 hover:bg-[#161F33]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 -m-1 text-[#64748B] hover:text-[#94A3B8] transition-colors rounded shrink-0"
          title="Drag card to move stage"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>

        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => onOpenModal(app)}
        >
          <h3 className="text-xs font-semibold text-white group-hover:text-[#60A5FA] transition-colors leading-snug truncate">
            {app.job_title || "Untitled Role"}
          </h3>
          <p className="text-[11px] text-[#94A3B8] flex items-center gap-1 mt-0.5 truncate">
            <Building className="w-3 h-3 text-[#64748B] shrink-0" />
            <span className="truncate">{app.company || "—"}</span>
          </p>
        </div>

        {app.match_score !== null && app.match_score !== undefined && (
          <div className="shrink-0" title={`Semantic Match: ${Math.round(app.match_score)}%`}>
            <MatchRing score={app.match_score} size={30} strokeWidth={3} />
          </div>
        )}
      </div>

      {app.missing_skills && app.missing_skills.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap pt-0.5">
          {app.missing_skills.slice(0, 2).map((s, idx) => (
            <span
              key={idx}
              className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-rose-500/10 text-rose-300 border border-rose-500/20"
            >
              Missing: {s}
            </span>
          ))}
          {app.missing_skills.length > 2 && (
            <span className="text-[9px] text-[#64748B] font-mono">
              +{app.missing_skills.length - 2}
            </span>
          )}
        </div>
      )}

      {app.url && (
        <a
          href={app.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-[10px] text-[#2563EB] hover:underline flex items-center gap-0.5 mt-0.5"
        >
          View posting <ExternalLink className="w-2.5 h-2.5" />
        </a>
      )}

      <div
        className="flex items-center justify-between text-[10px] text-[#64748B] pt-2 border-t border-[#1F2937] cursor-pointer"
        onClick={() => onOpenModal(app)}
      >
        <span>Applied {timeAgo(app.applied_at || app.created_at)}</span>
        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${col.badgeClass}`}>
          {app.review_status || "pending"}
        </span>
      </div>

      {/* Stage Action Buttons */}
      <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
        {col.id === "Found" && (
          <button
            disabled={movingId === app.id}
            onClick={() => onMoveStatus(app.id, "Applied")}
            className="w-full h-7 rounded bg-[#0B0F19] hover:bg-[#2563EB] border border-[#1F2937] hover:border-[#2563EB] text-[10px] font-medium text-white transition-colors cursor-pointer flex items-center justify-center gap-1 disabled:opacity-50"
          >
            {movingId === app.id ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>Mark Applied →</span>
              </>
            )}
          </button>
        )}
        {col.id === "Applied" && (
          <button
            disabled={movingId === app.id}
            onClick={() => onMoveStatus(app.id, "Interview")}
            className="w-full h-7 rounded bg-purple-950/40 hover:bg-purple-600 border border-purple-800/80 text-[10px] font-medium text-purple-300 hover:text-white transition-colors cursor-pointer flex items-center justify-center gap-1 disabled:opacity-50"
          >
            {movingId === app.id ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <>
                <Briefcase className="w-3 h-3" />
                <span>Move to Interview →</span>
              </>
            )}
          </button>
        )}
        {col.id === "Interview" && (
          <button
            disabled={movingId === app.id}
            onClick={() => onMoveStatus(app.id, "Offer")}
            className="w-full h-7 rounded bg-amber-950/40 hover:bg-amber-600 border border-amber-800/80 text-[10px] font-medium text-amber-300 hover:text-white transition-colors cursor-pointer flex items-center justify-center gap-1 disabled:opacity-50"
          >
            {movingId === app.id ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <>
                <Zap className="w-3 h-3" />
                <span>Mark Offer Received →</span>
              </>
            )}
          </button>
        )}
        {col.id === "Offer" && (
          <button
            disabled={movingId === app.id}
            onClick={() => onMoveStatus(app.id, "Rejected")}
            className="w-full h-7 rounded bg-rose-950/30 hover:bg-rose-900/50 border border-rose-900/40 text-[10px] font-medium text-rose-300 transition-colors cursor-pointer flex items-center justify-center gap-1 disabled:opacity-50"
          >
            {movingId === app.id ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <span>Close / Archive</span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}


// ── Component ───────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user, signOut, loading: authLoading, getAccessToken } = useAuth();
  const router = useRouter();

  // ── UI States ──────────────────────────────────────────────────────────
  const [loggingOut, setLoggingOut] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");

  // ── Application Pipeline State ─────────────────────────────────────────
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<ApplicationItem | null>(null);
  const [editingCoverLetter, setEditingCoverLetter] = useState(false);
  const [coverLetterDraft, setCoverLetterDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const [savingCoverLetter, setSavingCoverLetter] = useState(false);

  // ── Search & Filter ────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [newSearchRole, setNewSearchRole] = useState("");
  const [newSearchLocation, setNewSearchLocation] = useState("Remote");
  const [searchingRemote, setSearchingRemote] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [activeDragApp, setActiveDragApp] = useState<ApplicationItem | null>(null);

  // ── Notifications (static for now — Module 8 adds Supabase Realtime) ──
  const [notificationsList] = useState([
    {
      id: "n-1",
      title: "Llama 3 Tailoring Engine Active",
      desc: "Ready to synthesize bespoke documents for any opening.",
      time: "System",
      read: false,
    },
    {
      id: "n-2",
      title: "10+ ATS Portals Ready",
      desc: "DuckDuckGo aggregator configured with exponential back-off.",
      time: "System",
      read: false,
    },
  ]);

  const tokenRef = useRef<string | null>(null);

  // ── Toast helper ───────────────────────────────────────────────────────
  const showToast = useCallback((msg: string, type: "success" | "error" = "success") => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 3800);
  }, []);

  // ── Fetch data ─────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoadingData(true);
    setDataError(null);
    try {
      const token = await getAccessToken();
      tokenRef.current = token;
      if (!token) return;

      const [appsRes, jobsRes] = await Promise.all([
        api.getApplications(token),
        api.getJobs(token, 1, 50),
      ]);

      setApplications(Array.isArray(appsRes) ? appsRes : []);
      setJobs(Array.isArray(jobsRes.jobs) ? jobsRes.jobs : []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load pipeline data";
      setDataError(msg);
    } finally {
      setLoadingData(false);
    }
  }, [getAccessToken]);

  useEffect(() => {
    if (!authLoading) {
      fetchData();
    }
  }, [authLoading, fetchData]);

  // ── Event handlers ─────────────────────────────────────────────────────
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
    try {
      await signOut();
      router.push("/signup?message=Account+successfully+deleted");
    } catch (err) {
      console.error("Delete account error:", err);
    } finally {
      setDeletingAccount(false);
      setShowDeleteModal(false);
    }
  };

  /** Trigger LangGraph job search + document generation pipeline */
  const handleTriggerSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSearchRole.trim()) return;
    setSearchingRemote(true);
    setSearchError(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Session expired — please log in again.");
      const result = await api.searchJobs(token, newSearchRole.trim(), newSearchLocation || "Remote");
      setShowSearchModal(false);
      setNewSearchRole("");
      showToast(`AI agent found ${result.jobs_found} matching opportunities!`);
      // Refresh both applications and jobs lists
      await fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Search failed";
      setSearchError(msg);
      showToast(msg, "error");
    } finally {
      setSearchingRemote(false);
    }
  };

  /** Move an application to a new Kanban status and persist to backend */
  const moveAppStatus = useCallback(
    async (appId: string, newStatus: string) => {
      setMovingId(appId);
      // Optimistic update
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status: newStatus } : a))
      );
      try {
        const token = await getAccessToken();
        if (!token) throw new Error("Session expired");
        await api.updateApplicationStatus(token, appId, newStatus);
        showToast(`Moved to ${newStatus} stage`);
      } catch (err: unknown) {
        // Rollback on failure
        await fetchData();
        const msg = err instanceof Error ? err.message : "Status update failed";
        showToast(msg, "error");
      } finally {
        setMovingId(null);
      }
    },
    [getAccessToken, fetchData, showToast]
  );

  // ── Drag & Drop Handlers ───────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const found = applications.find((a) => a.id === String(active.id));
    if (found) {
      setActiveDragApp(found);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragApp(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // Is overId a column status?
    let targetStatus: string | null = null;
    const isColumn = STAGE_CONFIG.some((col) => col.apiStatus === overId);
    if (isColumn) {
      targetStatus = overId;
    } else {
      const targetApp = applications.find((a) => a.id === overId);
      if (targetApp) {
        targetStatus = targetApp.status;
      }
    }

    if (targetStatus) {
      const sourceApp = applications.find((a) => a.id === activeId);
      if (sourceApp && sourceApp.status !== targetStatus) {
        moveAppStatus(activeId, targetStatus);
      }
    }
  };

  const handleOpenAppModal = (app: ApplicationItem) => {
    setSelectedApp(app);
    setCoverLetterDraft(app.cover_letter || "");
    setEditingCoverLetter(false);
    setCopied(false);
  };

  const handleCopyCoverLetter = () => {
    if (!coverLetterDraft) return;
    navigator.clipboard.writeText(coverLetterDraft);
    setCopied(true);
    showToast("Cover letter copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  /** Save edited cover letter back to the application record */
  const handleSaveCoverLetter = async () => {
    if (!selectedApp) return;
    setSavingCoverLetter(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Session expired");
      // We update via the applyToJob upsert so cover_letter is persisted
      await api.applyToJob(token, selectedApp.job_id, {
        cover_letter: coverLetterDraft,
        status: selectedApp.status,
      });
      setApplications((prev) =>
        prev.map((a) =>
          a.id === selectedApp.id ? { ...a, cover_letter: coverLetterDraft } : a
        )
      );
      setSelectedApp((prev) =>
        prev ? { ...prev, cover_letter: coverLetterDraft } : null
      );
      setEditingCoverLetter(false);
      showToast("Cover letter saved successfully.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Save failed";
      showToast(msg, "error");
    } finally {
      setSavingCoverLetter(false);
    }
  };

  // ── Derived data ───────────────────────────────────────────────────────
  const filteredApps = applications.filter((app) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (app.job_title?.toLowerCase().includes(q) ?? false) ||
      (app.company?.toLowerCase().includes(q) ?? false)
    );
  });

  const countByStatus = (status: string) =>
    filteredApps.filter((a) => a.status === status).length;

  const totalApps = applications.length;
  const appliedCount = applications.filter((a) =>
    ["Applied", "Interview", "Offer"].includes(a.status)
  ).length;

  // ── Loading / Auth gate ────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-[#E2E8F0] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-[#2563EB]" />
          <span className="text-xs text-[#94A3B8]">Loading authenticated workspace…</span>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen w-full bg-[#0B0F19] text-[#E2E8F0] flex font-sans selection:bg-[#2563EB]/30 selection:text-white">

      {/* Toast */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 p-3 rounded border text-white text-xs shadow-xl flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2 ${
            toastType === "error"
              ? "bg-[#1a0808] border-red-700"
              : "bg-[#111827] border-[#2563EB]"
          }`}
        >
          {toastType === "error" ? (
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-[#94A3B8] hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Left Sidebar ──────────────────────────────────────────────────── */}
      <aside className="w-60 border-r border-[#1F2937] bg-[#0B0F19] flex flex-col justify-between shrink-0 hidden md:flex">
        <div>
          {/* Brand */}
          <div className="p-4 border-b border-[#1F2937] flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded bg-[#2563EB] flex items-center justify-center font-bold text-white text-xs tracking-wider">
                JP
              </div>
              <div>
                <span className="text-sm font-semibold tracking-tight text-white block leading-none">
                  JobPilot
                </span>
                <span className="text-[10px] text-[#94A3B8]">Talent Operations</span>
              </div>
            </Link>
          </div>

          {/* Nav */}
          <nav className="p-3 space-y-1">
            <Link
              href="/dashboard"
              className="w-full flex items-center gap-2.5 px-3 h-9 rounded text-xs font-semibold bg-[#161F33] text-white border-l-2 border-[#2563EB] cursor-pointer"
            >
              <FolderKanban className="w-4 h-4 text-[#2563EB]" />
              <span>Job Pipeline</span>
            </Link>

            <Link
              href="/dashboard/jobs"
              className="w-full flex items-center gap-2.5 px-3 h-9 rounded text-xs font-medium text-[#94A3B8] hover:text-white hover:bg-[#111827] transition-colors"
            >
              <Compass className="w-4 h-4 text-[#94A3B8]" />
              <span>Jobs &amp; Match Scoring</span>
            </Link>

            <Link
              href="/onboarding"
              className="w-full flex items-center gap-2.5 px-3 h-9 rounded text-xs font-medium text-[#94A3B8] hover:text-white hover:bg-[#111827] transition-colors"
            >
              <FileText className="w-4 h-4 text-[#94A3B8]" />
              <span>Resume &amp; Profile</span>
            </Link>

            <button
              onClick={() => setShowUpgradeModal(true)}
              className="w-full flex items-center justify-between px-3 h-9 rounded text-xs font-medium text-[#94A3B8] hover:text-white hover:bg-[#111827] transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2.5">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Pro Membership</span>
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-400/10 text-amber-300 border border-amber-400/20">
                PRO
              </span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-[#1F2937] bg-[#0B0F19]">
          <div className="p-2.5 rounded bg-[#111827] border border-[#1F2937] mb-2.5">
            <div className="text-[10px] uppercase font-bold text-[#64748B] tracking-wider mb-0.5">
              Platform Architect
            </div>
            <p className="text-xs font-medium text-white">Chaudhry Saif Ullah Sundhu</p>
            <p className="text-[10px] text-[#94A3B8]">Founder &amp; Lead Engineer</p>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2 truncate">
              <div className="w-7 h-7 rounded bg-[#2563EB] flex items-center justify-center font-bold text-white text-[11px]">
                {user?.email ? user.email.slice(0, 2).toUpperCase() : "JP"}
              </div>
              <div className="truncate">
                <p className="text-[11px] font-medium text-white truncate">
                  {user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User"}
                </p>
                <p className="text-[10px] text-[#64748B] truncate">{user?.email || ""}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              title="Sign Out"
              className="p-1.5 rounded hover:bg-[#1F2937] text-[#94A3B8] hover:text-red-400 transition-colors cursor-pointer"
            >
              {loggingOut ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#2563EB]" />
              ) : (
                <LogOut className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Workspace ────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">

        {/* Top Header */}
        <header className="h-14 border-b border-[#1F2937] bg-[#0B0F19]/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter pipeline by role or company…"
                className="w-full h-8 pl-8 pr-3 bg-[#111827] border border-[#1F2937] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] rounded text-xs text-white placeholder-[#64748B] outline-none transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => fetchData()}
              disabled={loadingData}
              title="Refresh pipeline"
              className="w-8 h-8 rounded bg-[#111827] hover:bg-[#1F2937] border border-[#1F2937] flex items-center justify-center text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? "animate-spin" : ""}`} />
            </button>

            <button
              onClick={() => setShowSearchModal(true)}
              className="h-8 px-3 rounded bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Search Opportunities</span>
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="w-8 h-8 rounded bg-[#111827] hover:bg-[#1F2937] border border-[#1F2937] flex items-center justify-center text-[#94A3B8] hover:text-white transition-colors cursor-pointer relative"
              >
                <Bell className="w-3.5 h-3.5" />
                <span className="w-2 h-2 rounded-full bg-emerald-500 absolute top-1.5 right-1.5 ring-2 ring-[#111827]" />
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 rounded-lg bg-[#111827] border border-[#1F2937] p-3 shadow-xl z-50">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#1F2937]">
                    <span className="text-xs font-semibold text-white">System Events</span>
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="text-[10px] text-[#2563EB] hover:underline"
                    >
                      Dismiss
                    </button>
                  </div>
                  <div className="space-y-2 text-xs">
                    {notificationsList.map((n) => (
                      <div key={n.id} className="p-2.5 rounded bg-[#0B0F19] border border-[#1F2937]">
                        <div className="flex items-center justify-between">
                          <p className="text-white font-medium text-xs">{n.title}</p>
                          <span className="text-[10px] text-[#64748B]">{n.time}</span>
                        </div>
                        <p className="text-[11px] text-[#94A3B8] mt-0.5">{n.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="p-6 space-y-6">

          {/* KPI Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-lg bg-[#111827] border border-[#1F2937] flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-[#94A3B8]">Total Applications</span>
                <div className="text-xl font-bold text-white mt-1">
                  {loadingData ? <Loader2 className="w-4 h-4 animate-spin text-[#2563EB]" /> : totalApps}
                </div>
                <span className="text-[10px] text-emerald-400 font-medium block mt-0.5">
                  {jobs.length} jobs in database
                </span>
              </div>
              <div className="w-9 h-9 rounded bg-[#2563EB]/15 border border-[#2563EB]/30 flex items-center justify-center text-[#2563EB]">
                <Briefcase className="w-4 h-4" />
              </div>
            </div>

            <div className="p-4 rounded-lg bg-[#111827] border border-[#1F2937] flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-[#94A3B8]">Active Pipeline</span>
                <div className="text-xl font-bold text-white mt-1">
                  {loadingData ? <Loader2 className="w-4 h-4 animate-spin text-[#2563EB]" /> : appliedCount}
                </div>
                <span className="text-[10px] text-emerald-400 font-medium block mt-0.5">Applied + Interviewing</span>
              </div>
              <div className="w-9 h-9 rounded bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>

            <div className="p-4 rounded-lg bg-[#111827] border border-[#1F2937] flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-[#94A3B8]">Interviews</span>
                <div className="text-xl font-bold text-white mt-1">
                  {loadingData ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#2563EB]" />
                  ) : (
                    applications.filter((a) => a.status === "Interview").length
                  )}
                </div>
                <span className="text-[10px] text-purple-400 font-medium block mt-0.5">In-progress interviews</span>
              </div>
              <div className="w-9 h-9 rounded bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <BarChart3 className="w-4 h-4" />
              </div>
            </div>

            <button
              onClick={() => setShowUpgradeModal(true)}
              className="p-4 rounded-lg bg-[#111827] hover:bg-[#161F33] border border-[#1F2937] hover:border-amber-400/40 transition-colors flex items-center justify-between text-left cursor-pointer group"
            >
              <div>
                <span className="text-xs font-medium text-[#94A3B8] group-hover:text-white transition-colors">Daily Searches</span>
                <div className="text-xl font-bold text-white mt-1">3 / 3 Used</div>
                <span className="text-[10px] text-amber-300 font-medium block mt-0.5">Unlock Unlimited Pro →</span>
              </div>
              <div className="w-9 h-9 rounded bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400">
                <Zap className="w-4 h-4" />
              </div>
            </button>
          </div>

          {/* Pipeline Section */}
          <div className="space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-white">Application Pipeline</h2>
                <p className="text-xs text-[#94A3B8]">
                  {loadingData
                    ? "Loading your live pipeline…"
                    : dataError
                    ? `Error: ${dataError}`
                    : `${totalApps} applications tracked across all stages.`}
                </p>
              </div>
            </div>

            {/* Data Error Banner */}
            {dataError && !loadingData && (
              <div className="p-3 rounded bg-red-950/20 border border-red-800/50 text-xs text-red-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>
                  Backend connection issue: {dataError}.{" "}
                  <button onClick={fetchData} className="underline hover:text-red-200">
                    Retry
                  </button>
                </span>
              </div>
            )}

            {/* Dynamic DnD-Kit 5-Stage Kanban Board */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
                {STAGE_CONFIG.map((col) => {
                  const colApps = filteredApps.filter((a) => a.status === col.apiStatus);
                  return (
                    <DroppableColumn
                      key={col.id}
                      col={col}
                      count={loadingData ? 0 : colApps.length}
                      onAdd={() => setShowSearchModal(true)}
                    >
                      {loadingData ? (
                        <div className="h-24 flex items-center justify-center">
                          <Loader2 className="w-4 h-4 animate-spin text-[#64748B]" />
                        </div>
                      ) : colApps.length === 0 ? (
                        <div className="h-32 rounded-lg border border-dashed border-[#1F2937] flex flex-col items-center justify-center text-center p-3">
                          <span className="text-xs text-[#64748B]">No items in {col.label}</span>
                          {col.id === "Found" && (
                            <button
                              onClick={() => setShowSearchModal(true)}
                              className="mt-2 text-[10px] text-[#2563EB] hover:underline"
                            >
                              + Search opportunities
                            </button>
                          )}
                        </div>
                      ) : (
                        colApps.map((app) => (
                          <DraggableCard
                            key={app.id}
                            app={app}
                            col={col}
                            movingId={movingId}
                            onOpenModal={handleOpenAppModal}
                            onMoveStatus={moveAppStatus}
                          />
                        ))
                      )}
                    </DroppableColumn>
                  );
                })}
              </div>

              {/* Drag Overlay */}
              <DragOverlay>
                {activeDragApp ? (
                  <div className="p-3 rounded-lg bg-[#161F33] border border-[#2563EB] shadow-2xl opacity-95 w-64 pointer-events-none space-y-1.5">
                    <h3 className="text-xs font-semibold text-white truncate">
                      {activeDragApp.job_title || "Untitled Role"}
                    </h3>
                    <p className="text-[11px] text-[#94A3B8] flex items-center gap-1">
                      <Building className="w-3 h-3 text-[#64748B]" />
                      <span className="truncate">{activeDragApp.company}</span>
                    </p>
                    <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#2563EB]/20 text-[#60A5FA] border border-[#2563EB]/40">
                      Moving stage…
                    </span>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>

          {/* Danger Zone */}
          <div className="rounded-lg border border-red-900/40 bg-red-950/10 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-semibold text-red-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Account Purge &amp; Compliance</span>
              </h4>
              <p className="mt-0.5 text-xs text-[#94A3B8]">
                Permanently purge your candidate specifications, ingested resume, and all application records.
              </p>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-3 h-8 rounded bg-red-950/60 hover:bg-red-900/80 border border-red-800/80 text-xs font-medium text-red-200 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
              <span>Delete Account</span>
            </button>
          </div>
        </main>
      </div>

      {/* ── MODAL: Search Opportunities ──────────────────────────────────── */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-[#1F2937] rounded-lg max-w-md w-full p-6 shadow-xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#1F2937]">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Search className="w-4 h-4 text-[#2563EB]" />
                <span>Run AI Job Search</span>
              </h3>
              <button onClick={() => setShowSearchModal(false)} className="text-[#94A3B8] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#94A3B8] mt-3 mb-4 leading-relaxed">
              The Llama 3 agent will search 10+ portals via DuckDuckGo, select the best match, and generate a tailored cover letter and resume — saved directly to your pipeline.
            </p>

            {searchError && (
              <div className="mb-3 p-2.5 rounded bg-red-950/30 border border-red-800/60 text-xs text-red-300 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <span>{searchError}</span>
              </div>
            )}

            <form onSubmit={handleTriggerSearch} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-[#CBD5E1] mb-1.5">
                  Target Role / Tech Stack *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newSearchRole}
                  onChange={(e) => setNewSearchRole(e.target.value)}
                  placeholder="e.g. Senior React Engineer, Python Backend Developer…"
                  className="w-full h-9 px-3 bg-[#0B0F19] border border-[#1F2937] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] rounded text-xs text-white placeholder-[#64748B] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#CBD5E1] mb-1.5">
                  Location
                </label>
                <input
                  type="text"
                  value={newSearchLocation}
                  onChange={(e) => setNewSearchLocation(e.target.value)}
                  placeholder="Remote, US, Pakistan, Global…"
                  className="w-full h-9 px-3 bg-[#0B0F19] border border-[#1F2937] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] rounded text-xs text-white placeholder-[#64748B] outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1F2937]">
                <button
                  type="button"
                  onClick={() => { setShowSearchModal(false); setSearchError(null); }}
                  className="h-8 px-3.5 rounded bg-[#0B0F19] hover:bg-[#1F2937] border border-[#1F2937] text-xs font-medium text-[#CBD5E1] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={searchingRemote}
                  className="h-8 px-4 rounded bg-[#2563EB] hover:bg-[#1D4ED8] text-xs font-semibold text-white flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
                >
                  {searchingRemote ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Searching Portals…</span>
                    </>
                  ) : (
                    <>
                      <span>Run AI Search</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Application Detail ─────────────────────────────────────── */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-[#1F2937] rounded-lg max-w-xl w-full p-6 shadow-xl animate-in zoom-in-95">
            <div className="flex items-start justify-between pb-3.5 border-b border-[#1F2937]">
              <div>
                <h2 className="text-base font-semibold text-white">{selectedApp.job_title || "Application"}</h2>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  {selectedApp.company || "—"}
                  {selectedApp.url && (
                    <a
                      href={selectedApp.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 text-[#2563EB] hover:underline inline-flex items-center gap-0.5"
                    >
                      View Posting <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </p>
              </div>
              <button onClick={() => setSelectedApp(null)} className="text-[#94A3B8] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5">
              {/* Cover Letter */}
              <div className="p-3.5 rounded bg-[#0B0F19] border border-[#1F2937]">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-semibold text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Llama 3 Tailored Cover Letter</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingCoverLetter(!editingCoverLetter)}
                      className="text-[11px] text-[#2563EB] hover:text-[#60A5FA] font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>{editingCoverLetter ? "Preview" : "Edit"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyCoverLetter}
                      className="text-[11px] text-[#CBD5E1] hover:text-white font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copied ? "Copied!" : "Copy"}</span>
                    </button>
                  </div>
                </div>

                {editingCoverLetter ? (
                  <div className="space-y-2">
                    <textarea
                      rows={6}
                      value={coverLetterDraft}
                      onChange={(e) => setCoverLetterDraft(e.target.value)}
                      className="w-full p-2.5 bg-[#111827] border border-[#1F2937] focus:border-[#2563EB] rounded text-xs text-white font-mono outline-none"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        disabled={savingCoverLetter}
                        onClick={handleSaveCoverLetter}
                        className="h-7 px-3 rounded bg-[#2563EB] text-white text-xs font-medium cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
                      >
                        {savingCoverLetter ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : null}
                        Save Draft
                      </button>
                    </div>
                  </div>
                ) : coverLetterDraft ? (
                  <p className="text-xs text-[#CBD5E1] leading-relaxed italic bg-[#111827] p-3 rounded border border-[#1F2937]">
                    &ldquo;{coverLetterDraft.slice(0, 400)}{coverLetterDraft.length > 400 ? "…" : ""}&rdquo;
                  </p>
                ) : (
                  <p className="text-xs text-[#64748B] italic p-3">
                    No cover letter generated yet. Run a job search to generate tailored documents.
                  </p>
                )}
              </div>

              {/* Tailored Resume Bullets */}
              {selectedApp.tailored_resume && (
                <div className="p-3.5 rounded bg-[#0B0F19] border border-[#1F2937]">
                  <span className="text-xs font-semibold text-white flex items-center gap-1.5 mb-2">
                    <FileText className="w-3.5 h-3.5 text-[#60A5FA]" />
                    <span>Tailored Resume Bullets</span>
                  </span>
                  <p className="text-xs text-[#CBD5E1] leading-relaxed whitespace-pre-wrap">
                    {selectedApp.tailored_resume.slice(0, 600)}
                    {selectedApp.tailored_resume.length > 600 ? "…" : ""}
                  </p>
                </div>
              )}

              {/* Stage selector */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[#94A3B8]">Move stage:</span>
                <select
                  value={selectedApp.status}
                  onChange={(e) => {
                    const newStatus = e.target.value;
                    moveAppStatus(selectedApp.id, newStatus);
                    setSelectedApp({ ...selectedApp, status: newStatus });
                  }}
                  className="h-7 px-2 rounded bg-[#0B0F19] border border-[#1F2937] text-xs text-white outline-none cursor-pointer"
                >
                  <option value="Found">Discovered</option>
                  <option value="Applied">Applied</option>
                  <option value="Interview">Interviewing</option>
                  <option value="Offer">Offer</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>

            <div className="mt-5 pt-3.5 border-t border-[#1F2937] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                className="h-8 px-3.5 rounded bg-[#0B0F19] hover:bg-[#1F2937] border border-[#1F2937] text-xs font-medium text-[#CBD5E1] transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                disabled={movingId === selectedApp.id}
                onClick={async () => {
                  await moveAppStatus(selectedApp.id, "Applied");
                  setSelectedApp(null);
                }}
                className="h-8 px-3.5 rounded bg-[#2563EB] hover:bg-[#1D4ED8] text-xs font-semibold text-white flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
              >
                <span>Mark as Applied</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Upgrade to Pro ──────────────────────────────────────────── */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-[#1F2937] rounded-lg max-w-lg w-full p-6 shadow-xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#1F2937]">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-semibold text-white">Upgrade to JobPilot Pro</h3>
              </div>
              <button onClick={() => setShowUpgradeModal(false)} className="text-[#94A3B8] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <p className="text-[#94A3B8] leading-relaxed">
                Unlock autonomous Playwright submissions, unlimited daily job searches, and custom interview prep — powered by Llama 3.
              </p>

              <div className="p-4 rounded bg-[#0B0F19] border border-[#2563EB]/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white text-sm">Pro Membership</span>
                  <span className="font-bold text-emerald-400 text-sm">$29 / month</span>
                </div>
                <div className="space-y-2 text-[#CBD5E1]">
                  {[
                    "Unlimited daily searches across 10+ job portals",
                    "Autonomous Playwright headless application submissions",
                    "Unlimited Groq Llama 3 document tailoring",
                    "Mock interview prep with 13 tailored questions",
                    "Chrome Extension 1-click autofill (LinkedIn, Greenhouse, Lever)",
                  ].map((feat, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2 pt-3 border-t border-[#1F2937]">
              <button
                type="button"
                onClick={() => setShowUpgradeModal(false)}
                className="h-8 px-3.5 rounded bg-[#0B0F19] hover:bg-[#1F2937] border border-[#1F2937] text-xs font-medium text-[#CBD5E1] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUpgradeModal(false);
                  showToast("Stripe integration arriving in Module 10 — billing system coming soon!");
                }}
                className="h-8 px-4 rounded bg-[#2563EB] hover:bg-[#1D4ED8] text-xs font-semibold text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Continue to Checkout</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Delete Account ──────────────────────────────────────────── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-red-800/80 rounded-lg max-w-md w-full p-6 shadow-xl animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-400 mb-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-semibold text-white">Permanently Delete Account?</h3>
            </div>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              This action cannot be undone. All candidate specifications, tailored resumes, and application records will be permanently removed from the database.
            </p>

            <div className="mt-5 flex items-center justify-end gap-2 pt-3 border-t border-[#1F2937]">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deletingAccount}
                className="h-8 px-3.5 rounded bg-[#0B0F19] hover:bg-[#1F2937] border border-[#1F2937] text-xs font-medium text-[#CBD5E1] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deletingAccount}
                className="h-8 px-4 rounded bg-red-600 hover:bg-red-700 text-xs font-semibold text-white transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {deletingAccount ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting…</span>
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
