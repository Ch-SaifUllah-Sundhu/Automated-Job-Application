import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Search, Shield } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full bg-[#0B0F19] text-[#E2E8F0] flex flex-col font-sans selection:bg-[#2563EB]/30 selection:text-white">
      {/* Header */}
      <header className="w-full border-b border-[#1F2937] bg-[#0B0F19]/90 px-6 py-3.5 flex items-center justify-between">
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

      {/* Main 404 Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-[#111827] border border-[#1F2937] flex items-center justify-center mx-auto mb-6 text-[#2563EB]">
            <Search className="w-8 h-8 text-[#2563EB]" />
          </div>

          <span className="text-xs font-bold uppercase tracking-widest text-[#2563EB] bg-[#2563EB]/10 px-3 py-1 rounded-full border border-[#2563EB]/20">
            Error 404
          </span>

          <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">
            Page Not Found
          </h1>

          <p className="mt-2 text-xs text-[#94A3B8] leading-relaxed">
            The workspace URL or pipeline resource you requested does not exist or has been relocated to another endpoint.
          </p>

          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 h-9 px-4 rounded bg-[#2563EB] hover:bg-[#1D4ED8] text-xs font-semibold text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Dashboard</span>
            </Link>

            <Link
              href="/login"
              className="flex items-center gap-2 h-9 px-4 rounded bg-[#111827] hover:bg-[#1F2937] border border-[#1F2937] text-xs font-medium text-[#CBD5E1] transition-colors"
            >
              <span>Sign In</span>
            </Link>
          </div>

          <div className="mt-12 flex items-center justify-center gap-2 text-[11px] text-[#64748B]">
            <Shield className="w-3.5 h-3.5 text-emerald-500" />
            <span>JobPilot Secure Enterprise Gateway</span>
          </div>
        </div>
      </main>
    </div>
  );
}
