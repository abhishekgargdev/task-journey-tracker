import React, { Suspense } from "react";
import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import { Loader2 } from "lucide-react";

import dbConnect from "@/lib/mongodb";
import { Sprint } from "@/models/Sprint";
import { UserStory } from "@/models/UserStory";
import { StoryStage } from "@/models/StoryStage";
import { getSession } from "@/lib/session";
import { pageMetadata } from "@/lib/site-metadata";
import SprintDetailClient from "@/components/sprints/SprintDetailClient";
import { Card } from "@/components/ui/card";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    await dbConnect();
    const sprint = await Sprint.findById(id).select("name").lean();
    if (sprint) {
      return pageMetadata(sprint.name, `Sprint details, hold history, and stories for ${sprint.name}.`);
    }
  } catch {
    // fall through to default
  }
  return pageMetadata("Sprint Detail", "View sprint details, hold history, and linked user stories.");
}

export default async function SprintDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const { id } = await params;

  await dbConnect();

  const sprintRaw = await Sprint.findById(id)
    .populate("holdHistory.heldBy", "name email")
    .lean();

  if (!sprintRaw) {
    notFound();
  }

  const storiesRaw = await UserStory.find({ sprint: id })
    .populate("task")
    .populate("sprint")
    .populate("stagePlan.stage")
    .sort({ createdAt: -1 })
    .lean();

  const storyIds = storiesRaw.map((s) => s._id);
  const storyStagesRaw = await StoryStage.find({ story: { $in: storyIds } })
    .populate("assignedTo", "name email")
    .lean();

  const sprint = JSON.parse(JSON.stringify(sprintRaw));
  const stories = JSON.parse(JSON.stringify(storiesRaw));
  const storyStages = JSON.parse(JSON.stringify(storyStagesRaw));

  return (
    <Suspense fallback={<SprintDetailSkeleton />}>
      <SprintDetailClient sprint={sprint} stories={stories} storyStages={storyStages} />
    </Suspense>
  );
}

function SprintDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Card className="h-24 animate-pulse bg-muted/20 border-border" />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 h-[200px] animate-pulse bg-muted/20 border-border" />
        <Card className="h-[200px] animate-pulse bg-muted/20 border-border" />
      </div>
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Loading sprint details...
      </div>
    </div>
  );
}
