import React, { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { pageMetadata } from "@/lib/site-metadata";
import DailyStatusWorkspace from "@/components/daily-status/DailyStatusWorkspace";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = pageMetadata(
  "Daily Standup",
  "Log daily reports, automate standups, review team boards, and track productivity dashboards."
);

export default async function DailyStatusPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <Suspense fallback={<div className="h-64 w-full animate-pulse bg-muted/10 rounded-xl border border-border" />}>
      <DailyStatusWorkspace currentUserId={session.userId} currentUserName={session.name} />
    </Suspense>
  );
}
