import React, { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import AdhocTasksWorkspace from "@/components/adhoc-tasks/AdhocTasksWorkspace";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdhocTasksPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <Suspense fallback={<div className="h-64 w-full animate-pulse bg-muted/10 rounded-xl border border-border" />}>
      <AdhocTasksWorkspace />
    </Suspense>
  );
}
