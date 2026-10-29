import { Suspense } from "react";
import { AuthenticatedAppLayout } from "@/components/layout/AuthenticatedAppLayout";

export const metadata = {
  title: "JobPilot Dashboard — Automated Job Application Workspace",
  description: "End-to-end job discovery, SBERT semantic match scoring, tailored documents, and human-in-loop application approval.",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0B0F19] text-[#E2E8F0] flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <AuthenticatedAppLayout>{children}</AuthenticatedAppLayout>
    </Suspense>
  );
}

