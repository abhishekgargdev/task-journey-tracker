import React, { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { User } from "@/models/User";
import { getSession } from "@/lib/session";
import dbConnect from "@/lib/mongodb";
import { pageMetadata } from "@/lib/site-metadata";
import { fetchAllStoriesWithStages } from "@/lib/story-queries";
import DashboardClient from "@/components/dashboard/DashboardClient";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = pageMetadata(
  "Dashboard",
  "Overview of active stories, development metrics, and pipeline tracking."
);

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const [stories, usersRaw] = await Promise.all([
    fetchAllStoriesWithStages(),
    dbConnect().then(() =>
      User.find({ status: "active" })
        .lean()
        .then((users) => JSON.parse(JSON.stringify(users)))
    ),
  ]);

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardClient
        stories={stories}
        developers={usersRaw}
        userName={session.name || "Developer"}
      />
    </Suspense>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Card className="h-28 animate-pulse bg-muted/20 border-border" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, idx) => (
          <Card key={idx} className="h-24 animate-pulse bg-muted/20 border-border" />
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 h-[250px] animate-pulse bg-muted/20 border-border" />
        <Card className="h-[250px] animate-pulse bg-muted/20 border-border" />
      </div>
    </div>
  );
}
