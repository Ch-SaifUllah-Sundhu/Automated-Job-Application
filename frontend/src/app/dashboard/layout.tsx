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
  return <AuthenticatedAppLayout>{children}</AuthenticatedAppLayout>;
}

