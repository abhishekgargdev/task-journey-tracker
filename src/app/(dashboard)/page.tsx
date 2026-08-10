import React, { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import dbConnect from "@/lib/mongodb";
import { Sprint } from "@/models/Sprint";
import { UserStory } from "@/models/UserStory";
import { StoryStage } from "@/models/StoryStage";
import { getSession } from "@/lib/session";
import { pageMetadata } from "@/lib/site-metadata";
import DashboardClient from "@/components/dashboard/DashboardClient";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export const metadata: Metadata = pageMetadata(
  "Dashboard",
  "Overview of active stories, sprint progress, and delivery pipeline metrics."
);

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  // Fetch all metrics data on the server side
  await dbConnect();

  const sprintsRaw = await Sprint.find({}).lean();
  const storiesRaw = await UserStory.find({})
    .populate("task")
    .populate("sprint")
    .populate("stagePlan.stage")
    .lean();
  const storyStagesRaw = await StoryStage.find({})
    .populate("assignedTo")
    .lean();

  // Safely serialize database documents to plain objects for hydration
  const sprints = JSON.parse(JSON.stringify(sprintsRaw));
  const stories = JSON.parse(JSON.stringify(storiesRaw));
  const storyStages = JSON.parse(JSON.stringify(storyStagesRaw));

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardClient
        stories={stories}
        sprints={sprints}
        storyStages={storyStages}
        userName={session.name || "Developer"}
      />
    </Suspense>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Welcome banner loading */}
      <Card className="h-28 animate-pulse bg-muted/20 border-border" />
      {/* KPIs loading */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, idx) => (
          <Card key={idx} className="h-24 animate-pulse bg-muted/20 border-border" />
        ))}
      </div>
      {/* Charts loading */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 h-[250px] animate-pulse bg-muted/20 border-border" />
        <Card className="h-[250px] animate-pulse bg-muted/20 border-border" />
      </div>
    </div>
  );
}
