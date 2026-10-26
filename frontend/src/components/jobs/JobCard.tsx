"use client";

import React from "react";
import { JobItem } from "@/lib/api";
import {
  Building2,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  Share2,
} from "lucide-react";

interface JobCardProps {
  job: JobItem;
  onApply?: (job: JobItem) => void;
  isApplying?: boolean;
  applied?: boolean;
}

export function MatchRing({ score, size = 48, strokeWidth = 4 }: { score: number | null | undefined; size?: number; strokeWidth?: number }) {
  if (score === null || score === undefined) {
    return (
      <div
        className="rounded-full bg-[#1F2937]/50 border border-[#374151] flex items-center justify-center text-[10px] font-mono text-[#94A3B8]"
        style={{ width: size, height: size }}
        title="Score computing or not available"
      >
        N/A
      </div>
    );
  }

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  let colorClass = "text-blue-400";
  let strokeColor = "#3B82F6";
  let glowColor = "rgba(59, 130, 246, 0.25)";

  if (clampedScore >= 75) {
    colorClass = "text-emerald-400";
    strokeColor = "#10B981";
    glowColor = "rgba(16, 185, 129, 0.25)";
  } else if (clampedScore >= 50) {
    colorClass = "text-amber-400";
    strokeColor = "#F59E0B";
    glowColor = "rgba(245, 158, 11, 0.25)";
  }

  return (
    <div
      className="relative flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
      title={`Sentence-BERT Semantic Match: ${clampedScore}%`}
    >
      <svg className="w-full h-full -rotate-90 transform" viewBox={`0 0 ${size} ${size}`}>
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#1F2937"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          style={{
            transition: "stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
            filter: `drop-shadow(0 0 6px ${glowColor})`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className={`text-[11px] font-bold font-mono tracking-tight ${colorClass}`}>
          {clampedScore}%
        </span>
      </div>
    </div>
  );
}

function timeAgo(dateStr?: string | null): string {
  if (!dateStr) return "Recently";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function getPortalBadge(source?: string | null) {
  const src = (source || "").toLowerCase();
  if (src.includes("linkedin")) {
    return { label: "LinkedIn", color: "bg-[#0A66C2]/15 text-[#70B5F9] border-[#0A66C2]/30" };
  }
  if (src.includes("indeed")) {
    return { label: "Indeed", color: "bg-[#2164f3]/15 text-[#85b0ff] border-[#2164f3]/30" };
  }
  if (src.includes("greenhouse")) {
    return { label: "Greenhouse", color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" };
  }
  if (src.includes("lever")) {
    return { label: "Lever", color: "bg-purple-500/15 text-purple-300 border-purple-500/30" };
  }
  if (src.includes("glassdoor")) {
    return { label: "Glassdoor", color: "bg-teal-500/15 text-teal-300 border-teal-500/30" };
  }
  return { label: source || "Direct ATS", color: "bg-blue-500/10 text-blue-300 border-blue-500/20" };
}

export function JobCard({ job, onApply, isApplying = false, applied = false }: JobCardProps) {
  const portal = getPortalBadge(job.source);

  return (
    <div className="group relative rounded-xl bg-[#0E131F]/90 backdrop-blur-sm border border-[#1F2937] hover:border-[#2563EB]/60 hover:shadow-xl hover:shadow-[#2563EB]/5 p-5 transition-all duration-200 flex flex-col justify-between gap-4">
      {/* Top Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase border ${portal.color}`}
            >
              {portal.label}
            </span>
            <span className="text-[11px] text-[#64748B] flex items-center gap-1 font-mono">
              <Clock className="w-3 h-3" />
              {timeAgo(job.created_at)}
            </span>
          </div>

          <h3 className="text-base font-semibold text-white group-hover:text-[#60A5FA] transition-colors truncate">
            {job.title}
          </h3>

          <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
            <Building2 className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
            <span className="font-medium text-[#CBD5E1] truncate">{job.company}</span>
          </div>
        </div>

        {/* Semantic Match Percentage Ring */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <MatchRing score={job.match_score} />
          <span className="text-[9px] uppercase tracking-wider text-[#64748B] font-mono">
            SBERT Match
          </span>
        </div>
      </div>

      {/* Description Snippet */}
      {job.description && (
        <p className="text-xs text-[#94A3B8] line-clamp-2 leading-relaxed">
          {job.description}
        </p>
      )}

      {/* Skills Analysis */}
      {((job.matched_skills && job.matched_skills.length > 0) ||
        (job.missing_skills && job.missing_skills.length > 0)) && (
        <div className="space-y-2 pt-2 border-t border-[#1F2937]/70">
          {/* Matched Skills */}
          {job.matched_skills && job.matched_skills.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1 shrink-0">
                <CheckCircle2 className="w-3 h-3" /> Matched:
              </span>
              {job.matched_skills.slice(0, 4).map((skill, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/25"
                >
                  {skill}
                </span>
              ))}
              {job.matched_skills.length > 4 && (
                <span className="text-[10px] text-[#64748B] font-mono">
                  +{job.matched_skills.length - 4} more
                </span>
              )}
            </div>
          )}

          {/* Missing Skills */}
          {job.missing_skills && job.missing_skills.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-semibold text-rose-400 flex items-center gap-1 shrink-0">
                <AlertCircle className="w-3 h-3" /> Missing:
              </span>
              {job.missing_skills.slice(0, 4).map((skill, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-500/10 text-rose-300 border border-rose-500/25"
                >
                  {skill}
                </span>
              ))}
              {job.missing_skills.length > 4 && (
                <span className="text-[10px] text-[#64748B] font-mono">
                  +{job.missing_skills.length - 4} more
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Card Actions */}
      <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#1F2937]">
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-[#94A3B8] hover:text-white transition-colors py-1.5 px-2.5 rounded-lg hover:bg-[#1F2937]/50"
        >
          <span>View ATS Posting</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>

        {applied ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Applied
          </span>
        ) : (
          <button
            type="button"
            disabled={isApplying}
            onClick={() => onApply && onApply(job)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.98] transition-all px-3.5 py-1.5 rounded-lg shadow-sm shadow-[#2563EB]/25 disabled:opacity-50 cursor-pointer"
          >
            {isApplying ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Tailoring…</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Tailor & Apply</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
